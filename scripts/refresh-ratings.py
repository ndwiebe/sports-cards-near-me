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

    rows, misses, closures, calls = [], [], [], 0
    for i, s in enumerate(targets, 1):
        place = search_place(api_key, s['name'], s.get('address', ''), s['city'], s['province'])
        calls += 1
        rating = place.get('rating') if place else None
        count = place.get('userRatingCount') if place else None
        hours = format_hours(place)
        # Closure detection, scan-only (Plan 14, Part A). CLOSED_PERMANENTLY goes
        # to a review CSV for a human to check — never auto-unlisted, and never
        # written as a `status` field anywhere. Google's flag is wrong often
        # enough (a moved or rebranded shop reads the same) that treating it as
        # ground truth would be the worst error this directory can make.
        # OPERATIONAL and CLOSED_TEMPORARILY are both no-ops: temporary closures
        # aren't actionable, and unlisting on one would be wrong too.
        if place and place.get('businessStatus') == 'CLOSED_PERMANENTLY':
            closures.append([s['slug'], s['name'], s['city'], s['province'], s.get('address', ''),
                              rating if rating is not None else '', count if count is not None else '',
                              place.get('formattedAddress') or '', place.get('id') or ''])
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
    with CLOSURES.open('w', newline='') as f:
        w = csv.writer(f)
        w.writerow(['slug', 'Store Name', 'City', 'Province', 'Address', 'Rating', 'Review Count',
                     'Google formattedAddress', 'Google Place ID'])
        w.writerows(closures)

    print(f'\ncalls used: {calls} (cap {limit})')
    print(f'  {len(rows)} ratings  -> {OUT.relative_to(ROOT)}')
    print(f'  {len(misses)} unmatched -> {UNMATCHED.relative_to(ROOT)}')
    if closures:
        print(f'  {len(closures)} CLOSED_PERMANENTLY -> {CLOSURES.relative_to(ROOT)} — review before touching the sheet, do not unlist on this alone')
    print('  billing: businessStatus is expected to ride free on this call (Essentials tier) — confirm against the actual bill on this first real run, don\'t just trust the comment')
    print('\nNext: spot-check the "Google address" column against each store\'s own address')
    print('before importing — Text Search can match a nearby business of a similar name.')
    print('Rating pastes into the sheet\'s Rating column; Hours pastes into the Hours column.')


if __name__ == '__main__':
    main()
