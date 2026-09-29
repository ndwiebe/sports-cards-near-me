#!/usr/bin/env python3
"""Pull Google ratings + review counts for directory stores via the Places API.

Why this exists: only ~10% of the directory carries a rating, and effectively all
of those are Alberta. Ontario (315 shops), Quebec (118) and BC (37) have none, so
every "best shops in [city]" page is unrankable outside one province. This closes
that gap.

The sheet is the source of truth (a scheduled job rebuilds the site from it every
morning), so this script does NOT write to the site's data files. It emits a CSV
that gets imported into the sheet's Rating column, in the sheet's own "4.8 (33)"
format.

Cost: Place Details calls are billed per request, but the free monthly allowance
(5,000-10,000 per SKU depending on plan tier) comfortably covers a full 615-store
refresh many times over. MAX_CALLS below is a hard stop so a bug can never run up
a bill regardless.

Usage:
  export GOOGLE_PLACES_API_KEY=...
  python3 scripts/refresh-ratings.py                # only stores missing a rating
  python3 scripts/refresh-ratings.py --all          # refresh every store
  python3 scripts/refresh-ratings.py --limit 50     # cap this run lower
  python3 scripts/refresh-ratings.py --dry-run      # resolve nothing, just report scope
"""
import argparse
import csv
import json
import os
import pathlib
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parent.parent
STORES = ROOT / 'src/data/stores.json'
OUT = ROOT / 'docs/research/ratings-refresh.csv'
UNMATCHED = ROOT / 'docs/research/ratings-refresh-unmatched.csv'
CLOSURES = ROOT / 'docs/research/closure-review.csv'
# Proposed-change payload for the sheet-change engine
# (`src/lib/sheet-change-engine.ts`, run via
# `npx tsx scripts/sheet-change-engine.ts process <this file>`). A JSON array
# of ProposedChange objects: a closure (Status -> closed) for each
# CLOSED_PERMANENTLY shop that isn't already closed, plus low-risk Rating and
# Hours updates where Google Places now disagrees with the sheet. See
# build_proposed_changes() below and the "Go-live" section of
# docs/superpowers/plans/2026-09-23-q4-sheet-automation.md.
PAYLOAD = ROOT / 'docs/research/ratings-refresh-payload.json'

# Hard ceiling on billable calls per run. The directory is ~615 stores; anything
# far above that means a bug, not a bigger directory. Deliberately not overridable
# above this value — --limit can only lower it.
MAX_CALLS = 800

SEARCH_URL = 'https://places.googleapis.com/v1/places:searchText'
# Google bills a request at the highest SKU tier any requested field belongs to.
# rating and userRatingCount are already Enterprise-tier, and regularOpeningHours
# is Enterprise-tier too — so hours cost nothing extra on a call we are already
# making. Photos and reviews are NOT free: they sit in Enterprise + Atmosphere,
# a higher tier, which is why they stay out of this mask.
# businessStatus sits in a cheaper tier than the Enterprise fields already
# requested above (Essentials, not Enterprise), so it too rides free on this same
# call — added 2026-08-27 for closure detection (see CLOSED_PERMANENTLY handling
# below). "Free" is expected, not verified against a bill yet: confirm on the
# first real run rather than trusting this comment.
FIELD_MASK = (
    'places.id,places.displayName,places.formattedAddress,'
    'places.rating,places.userRatingCount,places.regularOpeningHours,'
    'places.businessStatus'
)


def search_place(api_key: str, name: str, address: str, city: str, province: str) -> dict | None:
    """One Text Search call. Returns the top match, or None when nothing is found."""
    query = f'{name}, {address}' if address else f'{name}, {city}, {province}'
    body = json.dumps({'textQuery': query, 'maxResultCount': 1}).encode()
    req = urllib.request.Request(
        SEARCH_URL,
        data=body,
        headers={
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': api_key,
            'X-Goog-FieldMask': FIELD_MASK,
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            payload = json.load(r)
    except urllib.error.HTTPError as e:
        detail = e.read().decode(errors='replace')[:300]
        print(f'  ! HTTP {e.code}: {detail}', file=sys.stderr)
        # 429/403 usually means quota or key restriction — stop rather than hammer.
        if e.code in (401, 403, 429):
            raise SystemExit(f'Aborting: Places API returned {e.code}. Check the key and its quota.')
        return None
    except Exception as e:  # noqa: BLE001 - network flake shouldn't kill a long run
        print(f'  ! {type(e).__name__}: {e}', file=sys.stderr)
        return None
    places = payload.get('places') or []
    return places[0] if places else None


def format_hours(place: dict | None) -> str:
    """Google's weekday lines collapsed to one sheet cell.

    regularOpeningHours.weekdayDescriptions arrives as
    ["Monday: 11:00 AM - 7:00 PM", ..., "Sunday: Closed"]. The sheet's Hours
    column is free text, so join with "; " and let the page render it verbatim.
    Returns '' when the place has no published hours, which is common for
    appointment-only and home-based shops.
    """
    if not place:
        return ''
    lines = (place.get('regularOpeningHours') or {}).get('weekdayDescriptions') or []
    return '; '.join(str(line).strip() for line in lines if str(line).strip())


def rating_cell_for(rating: float | None, count: int | None) -> str:
    """The sheet's own Rating-column format ("4.8 (33)", or just "4.8" with no
    review count, or '' when there's no rating at all). Shared by the CSV
    output above and by build_proposed_changes() below, so both read the
    number the same way `parseRating` (src/lib/transform.ts) will parse it
    back out of the sheet."""
    if rating is None:
        return ''
    return f'{rating} ({count})' if count is not None else str(rating)


def existing_rating_cell(store: dict) -> str:
    """What the sheet's Rating cell is believed to hold right now, built from
    this script's local copy of stores.json (the last thing baked from the
    real sheet) -- the same "is this actually different" comparison the sheet-
    change engine's own optimistic check re-verifies against the live sheet
    before writing anything."""
    return rating_cell_for(store.get('rating'), store.get('reviewCount'))


def build_proposed_changes(store: dict, place: dict | None) -> list[dict]:
    """Turns one store's Places lookup into zero or more ProposedChange
    payload objects (the shape `src/lib/sheet-change-engine.ts` expects) for
    `PAYLOAD`. Pure -- takes an already-fetched `place` (or None for no
    match) and never touches the network itself, so it's fully testable
    without calling Places (see scripts/test_refresh_ratings.py).

    - A closure (Status -> 'closed') when Google reports CLOSED_PERMANENTLY
      and the store isn't already marked closed. This is the auto-apply
      pathway Nathan approved 2026-09-23 (see the block comment above the
      CLOSED_PERMANENTLY check in the main loop, below, for the full story
      and its known risk) -- the sheet-change engine classifies this exact
      shape as a `closure` and, outside the trial-lock window, auto-applies
      it with a one-command undo, reported in the weekly digest.
    - A low-risk Rating update when Google's rating and/or review count
      (they share one sheet cell, e.g. "4.8 (33)") differs from what's on
      file.
    - A low-risk Hours update when Google has published hours that differ
      from what's on file.

    A store can get more than one of these in the same pass (a shop can be
    freshly closed AND have a stale rating on file from before it closed).
    """
    if place is None:
        return []

    changes: list[dict] = []

    if place.get('businessStatus') == 'CLOSED_PERMANENTLY' and store.get('status') != 'closed':
        changes.append({
            'sheet': 'Stores',
            'rowKey': store['slug'],
            'op': {'kind': 'update', 'column': 'Status', 'oldValue': store.get('status') or '', 'newValue': 'closed'},
            'source': 'refresh-ratings.py',
            'reason': (
                "Google Places reports this business as CLOSED_PERMANENTLY. Auto-closes with a one-command "
                "undo per Nathan's 2026-09-23 decision -- see this week's digest for the undo command. Known "
                "risk: Google also flags moved or rebranded shops this way, so this is worth a second look, "
                "not blind trust."
            ),
        })

    rating = place.get('rating')
    if rating is not None:
        new_cell = rating_cell_for(rating, place.get('userRatingCount'))
        old_cell = existing_rating_cell(store)
        if new_cell != old_cell:
            changes.append({
                'sheet': 'Stores',
                'rowKey': store['slug'],
                'op': {'kind': 'update', 'column': 'Rating', 'oldValue': old_cell, 'newValue': new_cell},
                'source': 'refresh-ratings.py',
                'reason': 'Google Places has a different rating and/or review count than the sheet.',
            })

    hours = format_hours(place)
    old_hours = store.get('hours') or ''
    if hours and hours != old_hours:
        changes.append({
            'sheet': 'Stores',
            'rowKey': store['slug'],
            'op': {'kind': 'update', 'column': 'Hours', 'oldValue': old_hours, 'newValue': hours},
            'source': 'refresh-ratings.py',
            'reason': 'Google Places has updated hours for this shop.',
        })

    return changes


def read_closures() -> list[list[str]]:
    """Existing closure rows, minus the header. Empty when the file isn't there yet."""
    if not CLOSURES.exists():
        return []
    with CLOSURES.open(newline='') as f:
        return [r for r in list(csv.reader(f))[1:] if r]


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument('--all', action='store_true', help='refresh every store, not just unrated ones')
    ap.add_argument('--limit', type=int, default=MAX_CALLS, help=f'cap calls this run (<= {MAX_CALLS})')
    ap.add_argument('--dry-run', action='store_true', help='report scope without calling the API')
    args = ap.parse_args()

    limit = min(args.limit, MAX_CALLS)

    stores = json.loads(STORES.read_text())
    targets = stores if args.all else [s for s in stores if s.get('rating') is None]

    print(f'{len(stores)} stores in directory | {len(targets)} in scope | cap {limit} calls')
    if args.dry_run:
        by_prov: dict[str, int] = {}
        for s in targets:
            by_prov[s['province']] = by_prov.get(s['province'], 0) + 1
        for p, n in sorted(by_prov.items(), key=lambda kv: -kv[1]):
            print(f'  {p}: {n}')
        return

    api_key = os.environ.get('GOOGLE_PLACES_API_KEY')
    if not api_key:
        raise SystemExit('GOOGLE_PLACES_API_KEY is not set.')

    if len(targets) > limit:
        print(f'  (only the first {limit} will be fetched this run)')
        targets = targets[:limit]

    rows, misses, closures, proposed_changes, calls = [], [], [], [], 0
    for i, s in enumerate(targets, 1):
        place = search_place(api_key, s['name'], s.get('address', ''), s['city'], s['province'])
        calls += 1
        rating = place.get('rating') if place else None
        count = place.get('userRatingCount') if place else None
        hours = format_hours(place)
        # Closure detection (Plan 14, Part A; auto-apply added 2026-09-23).
        # CLOSED_PERMANENTLY always goes to a review CSV for a human to see
        # (below) -- but as of Nathan's 2026-09-23 decision
        # (~/jarvis-memory/decisions/2026/2026-09-23-scnm-q4-automation-calls.md),
        # it ALSO now proposes a `Status -> closed` change into PAYLOAD
        # (see build_proposed_changes()), which the sheet-change engine
        # (`src/lib/sheet-change-engine.ts`) auto-applies with a one-command
        # undo once the trial-lock window has passed, and lists in every
        # weekly digest either way. This overrides the 2026-08-27 "never
        # written as a `status` field anywhere" rule that used to live here.
        # Nathan made that call knowingly: Google's flag is wrong often enough
        # (a moved or rebranded shop reads the same) that treating it as
        # ground truth carries a real false-positive risk -- the undo command
        # and the digest's visibility are the safety net for that, not a
        # reason to skip auto-closing.
        # OPERATIONAL and CLOSED_TEMPORARILY are both no-ops for closure
        # purposes: temporary closures aren't actionable, and unlisting on one
        # would be wrong too.
        if place and place.get('businessStatus') == 'CLOSED_PERMANENTLY':
            closures.append([s['slug'], s['name'], s['city'], s['province'], s.get('address', ''),
                              rating if rating is not None else '', count if count is not None else '',
                              place.get('formattedAddress') or '', place.get('id') or ''])
        proposed_changes.extend(build_proposed_changes(s, place))
        if rating is None and hours == '':
            misses.append([s['slug'], s['name'], s['city'], s['province'],
                           'no match' if place is None else 'matched but unrated, no hours'])
        else:
            # Sheet's own format, so this pastes straight into the Rating column.
            rating_cell = ''
            if rating is not None:
                rating_cell = f'{rating} ({count})' if count is not None else str(rating)
            rows.append([s['slug'], s['name'], s['city'], s['province'],
                         rating_cell, hours,
                         (place.get('formattedAddress') or '')])
        if i % 25 == 0:
            print(f'  {i}/{len(targets)}  ({len(rows)} rated, {len(misses)} unmatched)')
        time.sleep(0.05)  # gentle pacing; well inside any rate limit

    OUT.parent.mkdir(parents=True, exist_ok=True)
    with OUT.open('w', newline='') as f:
        w = csv.writer(f)
        w.writerow(['slug', 'Store Name', 'City', 'Province', 'Rating', 'Hours',
                    'Google address (verify match)'])
        w.writerows(rows)
    with UNMATCHED.open('w', newline='') as f:
        w = csv.writer(f)
        w.writerow(['slug', 'Store Name', 'City', 'Province', 'reason'])
        w.writerows(misses)
    CLOSURES.parent.mkdir(parents=True, exist_ok=True)
    # Merge, never overwrite. The closure file is a CENSUS of the whole directory, but
    # this script usually runs incrementally (`targets` defaults to unrated stores only),
    # so most runs look at a small slice. Writing that slice with 'w' silently replaced a
    # 689-store scan's 32 findings with a 52-store scan's 5 on 2026-08-28 — and because the
    # workflow force-pushes its branch, git didn't preserve them either. Nothing failed;
    # the file just quietly got smaller.
    #
    # Semantics: a row is a finding awaiting human review, so it survives until a scan that
    # actually re-checked that store says otherwise. For stores checked THIS run, this run's
    # verdict wins (added if now closed, dropped if Google no longer says so). Stores this
    # run didn't look at keep whatever was already recorded.
    scanned = {s['slug'] for s in targets}
    kept = [r for r in read_closures() if r and r[0] not in scanned]
    merged = kept + closures
    merged.sort(key=lambda r: (r[3], r[2], r[1]))  # province, city, name — stable for review diffs
    with CLOSURES.open('w', newline='') as f:
        w = csv.writer(f)
        w.writerow(['slug', 'Store Name', 'City', 'Province', 'Address', 'Rating', 'Review Count',
                     'Google formattedAddress', 'Google Place ID'])
        w.writerows(merged)
    carried = len(kept)

    # Written unconditionally (even an empty list) so a consumer can always
    # expect the file to exist after a real run, same as OUT/UNMATCHED above.
    PAYLOAD.parent.mkdir(parents=True, exist_ok=True)
    PAYLOAD.write_text(json.dumps(proposed_changes, indent=2) + '\n')

    print(f'\ncalls used: {calls} (cap {limit})')
    print(f'  {len(rows)} ratings  -> {OUT.relative_to(ROOT)}')
    print(f'  {len(misses)} unmatched -> {UNMATCHED.relative_to(ROOT)}')
    if merged:
        scope = 'full directory' if args.all else f'{len(targets)} of {len(stores)} stores'
        print(f'  {len(merged)} CLOSED_PERMANENTLY -> {CLOSURES.relative_to(ROOT)} — the human-readable review record')
        print(f'    ({len(closures)} found in this run\'s scope: {scope}; {carried} carried over from stores this run did not re-check)')
        if not args.all:
            print('    NOTE: this was a partial scan, so the file is a merge, not a fresh census.')
            print('    Run with --all for a directory-wide closure count.')
    closure_count = sum(1 for c in proposed_changes if c['op']['column'] == 'Status')
    other_count = len(proposed_changes) - closure_count
    print(f'  {len(proposed_changes)} proposed changes -> {PAYLOAD.relative_to(ROOT)} '
          f'({closure_count} closure{"s" if closure_count != 1 else ""}, {other_count} rating/hours update{"s" if other_count != 1 else ""})')
    if closure_count:
        print('    Closures auto-apply (with a one-command undo) via the sheet-change engine, outside the')
        print('    trial-lock window -- run: npx tsx scripts/sheet-change-engine.ts process '
              f'{PAYLOAD.relative_to(ROOT)} --mode auto-low-risk [--live]')
        print('    Known risk carried into this same payload: Google also flags moved or rebranded shops')
        print('    as CLOSED_PERMANENTLY -- every auto-closure is listed in the weekly digest with its undo command.')
    print('  billing: businessStatus is expected to ride free on this call (Essentials tier) — confirm against the actual bill on this first real run, don\'t just trust the comment')
    print('\nNext: spot-check the "Google address" column against each store\'s own address')
    print('before importing — Text Search can match a nearby business of a similar name.')
    print('Rating pastes into the sheet\'s Rating column; Hours pastes into the Hours column.')


if __name__ == '__main__':
    main()
