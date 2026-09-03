#!/usr/bin/env python3
"""Read the click-tracker's KV store and print who the site is actually sending shops.

Written 2026-09-03. `worker/click-tracker.js` has been counting "Get Directions" and
"Call" taps since 2026-08-28 (see docs/click-tracking.md) but only ever accepted POST --
there was no way to read a number back. That number is the entire pitch to a shop owner
("we sent you 14 people last month"), and nobody would have found out it was unreadable
until the day it was needed. This script is the readout, run locally, no new public
surface.

Two things this script refuses to do, because the whole point of it is trustworthy
numbers:
  1. It never prints a count it did not read from Cloudflare. If wrangler can't
     authenticate or a value doesn't parse, it fails loudly and exits non-zero -- it does
     not fall back to a guess, a cache, or a zero.
  2. It never prints a bare 0 for a period it has no data for. A month with genuinely no
     clicks and a month nobody has checked look identical as a "0" -- this script always
     says "no clicks recorded" for the latter so the two are never confused.

Usage:
    python3 scripts/click-report.py

Reads the KV namespace id from worker/wrangler.jsonc; that file is a deploy-time
TEMPLATE (id is the literal placeholder __KV_ID__ until deploy-click-tracker.yml fills
it in), so when the template hasn't been filled in locally this looks up the namespace
the same way that workflow does: by its title, "CLICKS", via `wrangler kv namespace
list`. Resolves each slug against src/data/stores.json (read-only) for a shop name and
city; a slug with no match is a real signal -- rows get renamed and reassigned slugs --
so it's printed flagged, never dropped.

Requires the `wrangler` CLI, already authenticated (`npx wrangler whoami` to check).
"""
import csv
import json
import re
import subprocess
import sys
from collections import defaultdict
from datetime import date
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
WRANGLER_CONFIG = REPO_ROOT / 'worker' / 'wrangler.jsonc'
WRANGLER_CWD = REPO_ROOT / 'worker'
STORES_JSON = REPO_ROOT / 'src' / 'data' / 'stores.json'
OUT_DIR = REPO_ROOT / 'docs' / 'research'

# Matches .github/workflows/deploy-click-tracker.yml's own lookup: a bare
# `wrangler kv namespace create CLICKS` titles the namespace exactly "CLICKS", not
# "<worker-name>-CLICKS" as an earlier version of that workflow assumed (see its
# comments). This script has to find the same namespace the worker actually writes to.
KV_NAMESPACE_TITLE = 'CLICKS'

KEY_PREFIX = 'clicks:'
KEY_RE = re.compile(r'^clicks:(?P<slug>[a-z0-9-]+):(?P<method>directions|call):(?P<month>\d{4}-\d{2})$')

# The worker (worker/click-tracker.js) went live 2026-08-28 -- see docs/click-tracking.md
# for the 90-day clock this feeds. Nothing before this month was ever counted.
LAUNCH_MONTH = '2026-08'

# Substrings (checked lowercase) that mean "wrangler couldn't authenticate," seen from two
# real failure modes: an interactive session with a bad/expired token ("Authentication
# error ... code: 10000") and a non-interactive one with no credentials at all ("necessary
# to set a CLOUDFLARE_API_TOKEN"). Confirmed against real wrangler 4.115.0 output
# 2026-09-03.
AUTH_FAILURE_MARKERS = (
    'authentication error',
    'not authenticated',
    'cloudflare_api_token',
)


class ClickReportError(Exception):
    """Something stopped the report. The message is shown to Nathan as-is -- write it
    for a human, including the exact command to fix it where there is one."""


def strip_jsonc_comments(text):
    """Drop whole-line `//` comments. wrangler.jsonc only ever comments on their own
    lines (never trails a value), so this is deliberately not a general JSONC parser."""
    return '\n'.join(line for line in text.splitlines() if not line.strip().startswith('//'))


def run_wrangler(args, cwd=None):
    """Run a wrangler subcommand, return stdout. Raises ClickReportError -- with the exact
    remedy command when it's an auth failure -- on anything else going wrong. This is the
    one place that decides "wrangler couldn't authenticate" vs "something else broke,"
    because guessing instead of failing here is the bug this whole script exists to fix."""
    cmd = ['npx', 'wrangler', *args]
    try:
        result = subprocess.run(
            cmd, cwd=cwd or WRANGLER_CWD, capture_output=True, text=True, timeout=120,
        )
    except FileNotFoundError as exc:
        raise ClickReportError(f"Could not run `{' '.join(cmd)}` -- is npx on PATH? ({exc})") from exc
    except subprocess.TimeoutExpired as exc:
        raise ClickReportError(f"`{' '.join(cmd)}` timed out after 120s.") from exc

    if result.returncode != 0:
        lowered = result.stderr.lower()
        if any(marker in lowered for marker in AUTH_FAILURE_MARKERS):
            raise ClickReportError(
                'Wrangler could not authenticate to Cloudflare. Run this, then re-run the report:\n\n'
                '    npx wrangler login\n'
            )
        raise ClickReportError(f"`{' '.join(cmd)}` failed (exit {result.returncode}):\n{result.stderr.strip()}")
    return result.stdout


def run_wrangler_json(args, cwd=None):
    stdout = run_wrangler(args, cwd=cwd)
    try:
        return json.loads(stdout)
    except json.JSONDecodeError as exc:
        raise ClickReportError(f"`wrangler {' '.join(args)}` did not return JSON we could parse:\n{stdout[:500]}") from exc


def resolve_namespace_id():
    if WRANGLER_CONFIG.exists():
        config = json.loads(strip_jsonc_comments(WRANGLER_CONFIG.read_text()))
        configured = (config.get('kv_namespaces') or [{}])[0].get('id')
        if configured and configured != '__KV_ID__':
            return configured

    namespaces = run_wrangler_json(['kv', 'namespace', 'list'])
    matches = [ns for ns in namespaces if ns.get('title') == KV_NAMESPACE_TITLE]
    if len(matches) == 1:
        return matches[0]['id']
    if len(matches) > 1:
        raise ClickReportError(
            f"Found {len(matches)} KV namespaces titled '{KV_NAMESPACE_TITLE}' -- ambiguous, "
            f"won't guess which one the worker writes to. IDs: {[m['id'] for m in matches]}."
        )
    raise ClickReportError(
        f"No KV namespace titled '{KV_NAMESPACE_TITLE}' exists on this Cloudflare account. "
        'Has deploy-click-tracker.yml ever run? (it creates the namespace on first deploy)'
    )


def list_keys(namespace_id):
    """All `clicks:` keys, read from the real remote store.

    `--remote` is not optional. Verified 2026-09-03: omitting it, even fully
    authenticated, made wrangler silently read the empty LOCAL persistence store instead
    of Cloudflare and return `[]` with no error or warning -- exactly the fabricated-looking
    zero this script exists to prevent.
    """
    data = run_wrangler_json([
        'kv', 'key', 'list', f'--namespace-id={namespace_id}', f'--prefix={KEY_PREFIX}', '--remote',
    ])
    return [item['name'] for item in data]


def get_value(namespace_id, key):
    raw = run_wrangler(['kv', 'key', 'get', f'--namespace-id={namespace_id}', '--remote', key]).strip()
    try:
        return int(raw)
    except ValueError as exc:
        raise ClickReportError(f"Key {key} held a non-integer value ({raw!r}) -- the counter's contract is broken.") from exc


def parse_key(key):
    """Return (slug, method, month) or None if the key doesn't match
    clicks:{slug}:{directions|call}:{YYYY-MM} -- flagged by the caller, never dropped."""
    m = KEY_RE.match(key)
    return (m.group('slug'), m.group('method'), m.group('month')) if m else None


def load_store_index(stores_path=STORES_JSON):
    stores = json.loads(stores_path.read_text())
    return {s['slug']: (s['name'], s['city']) for s in stores}


def build_rows(key_counts, store_index):
    """key_counts: {kv key: int count}. Returns (rows, malformed_keys).

    One row per (slug, month) actually present in the data -- never one row per possible
    (shop x month) combination. KV only holds a key once a tap incremented it, so a
    missing combination has no confirmed reading to report; see docs/click-tracking.md.
    """
    per_store_month = defaultdict(lambda: {'directions': 0, 'call': 0})
    malformed = []
    for key, count in key_counts.items():
        parsed = parse_key(key)
        if parsed is None:
            malformed.append(key)
            continue
        slug, method, month = parsed
        per_store_month[(slug, month)][method] += count

    rows = []
    for (slug, month), counts in per_store_month.items():
        name, city = store_index.get(slug, (None, None))
        rows.append({
            'slug': slug,
            'name': name or slug,
            'city': city or '',
            'orphan': name is None,
            'month': month,
            'directions': counts['directions'],
            'call': counts['call'],
            'combined': counts['directions'] + counts['call'],
        })
    return rows, malformed


def store_totals(rows):
    """One row per store, all months combined, sorted by combined clicks descending --
    ties broken by name so re-runs order identically."""
    totals = defaultdict(lambda: {'directions': 0, 'call': 0, 'name': None, 'city': None, 'orphan': False})
    for r in rows:
        t = totals[r['slug']]
        t['directions'] += r['directions']
        t['call'] += r['call']
        t['name'] = r['name']
        t['city'] = r['city']
        t['orphan'] = r['orphan']
    out = [
        {
            'slug': slug,
            'name': t['name'],
            'city': t['city'],
            'orphan': t['orphan'],
            'directions': t['directions'],
            'call': t['call'],
            'combined': t['directions'] + t['call'],
        }
        for slug, t in totals.items()
    ]
    out.sort(key=lambda r: (-r['combined'], r['name']))
    return out


def month_range(start_month, end_month):
    """Inclusive list of 'YYYY-MM' strings from start_month through end_month."""
    y, m = (int(x) for x in start_month.split('-'))
    ey, em = (int(x) for x in end_month.split('-'))
    out = []
    while (y, m) <= (ey, em):
        out.append(f'{y:04d}-{m:02d}')
        m += 1
        if m > 12:
            m = 1
            y += 1
    return out


def monthly_totals(rows, start_month, end_month):
    """Site-wide totals per month across start_month..end_month inclusive. A month with
    zero recorded keys reports directions=call=combined=None -- the caller must render
    that as "no clicks recorded", never as a 0, per the module docstring."""
    sums = defaultdict(lambda: {'directions': 0, 'call': 0})
    for r in rows:
        sums[r['month']]['directions'] += r['directions']
        sums[r['month']]['call'] += r['call']
    out = []
    for month in month_range(start_month, end_month):
        s = sums.get(month)
        if s is None:
            out.append({'month': month, 'directions': None, 'call': None, 'combined': None})
        else:
            out.append({'month': month, 'directions': s['directions'], 'call': s['call'], 'combined': s['directions'] + s['call']})
    return out


def print_report(rows, malformed, current_month):
    totals = store_totals(rows)
    print('PER-SHOP TOTALS  (sorted by combined clicks, descending)')
    if not totals:
        print('  No clicks recorded yet.')
    else:
        for t in totals:
            flag = '  [ORPHAN -- no matching shop in src/data/stores.json]' if t['orphan'] else ''
            print(
                f"  {t['combined']:>4} combined   dir {t['directions']:>3}  call {t['call']:>3}   "
                f"{t['name']:<32}{(t['city'] or ''):<24}{flag}"
            )

    print('\nPER-SHOP, PER-MONTH DETAIL')
    if not rows:
        print('  No clicks recorded yet.')
    else:
        for r in sorted(rows, key=lambda r: (-r['combined'], r['name'], r['month'])):
            flag = '  [ORPHAN]' if r['orphan'] else ''
            print(
                f"  {r['month']}  {r['combined']:>3} combined   dir {r['directions']:>3}  call {r['call']:>3}   "
                f"{r['name']:<32}{(r['city'] or ''):<24}{flag}"
            )

    print(f'\nMONTHLY TOTALS  (site-wide, since launch {LAUNCH_MONTH} -- worker went live 2026-08-28)')
    for m in monthly_totals(rows, LAUNCH_MONTH, current_month):
        if m['directions'] is None:
            print(f"  {m['month']}  no clicks recorded")
        else:
            print(f"  {m['month']}  {m['combined']:>4} combined  ({m['directions']} directions, {m['call']} call)")

    if malformed:
        print(f"\nMALFORMED KEYS  (did not match clicks:{{slug}}:{{directions|call}}:{{YYYY-MM}} -- not counted, investigate)")
        for k in malformed:
            print(f'  {k}')


def write_csv(rows, out_dir=OUT_DIR):
    out_dir.mkdir(parents=True, exist_ok=True)
    path = out_dir / f'click-report-{date.today().isoformat()}.csv'
    fieldnames = ['slug', 'name', 'city', 'month', 'directions', 'call', 'combined', 'orphan']
    with path.open('w', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for r in sorted(rows, key=lambda r: (-r['combined'], r['name'], r['month'])):
            writer.writerow({k: r[k] for k in fieldnames})
    return path


def main():
    try:
        namespace_id = resolve_namespace_id()
        keys = list_keys(namespace_id)
        key_counts = {key: get_value(namespace_id, key) for key in keys}
        store_index = load_store_index()
        rows, malformed = build_rows(key_counts, store_index)
        current_month = date.today().strftime('%Y-%m')
        print_report(rows, malformed, current_month)
        path = write_csv(rows)
        print(f'\nWrote {path.relative_to(REPO_ROOT)}')
    except ClickReportError as exc:
        print(f'ERROR: {exc}', file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main()
