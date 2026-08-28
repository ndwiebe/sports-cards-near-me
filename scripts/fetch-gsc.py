#!/usr/bin/env python3
"""Pull the monthly Search Console export so `analyze-gsc-export.py` has data to read.

Replaces the human step of downloading CSVs from the Search Console UI by hand.
Drives the account's own signed-in Chrome (`dev-browser --connect`, port 9222) to
the Performance report, triggers the real "Export > Download CSV" action, and lets
Chrome write the resulting export straight into `docs/research/gsc-export-<date>/`
— the same file set a human export produces (see the 2026-08-07 export for the
reference shape), so `analyze-gsc-export.py` needs no translation layer.

The property MUST be the URL-prefix form, `https://sportscardsnearme.ca/`. Two other
forms (`sc-domain:sportscardsnearme.ca`, `http://sportscardsnearme.ca/`) return
"you don't have access" and, probed blind on 2026-08-28, produced a confident and
false "this account has zero properties". A bad property id redirects silently to
`/search-console/not-verified` — this script asserts against that URL after loading,
every run, rather than trusting a 200 status.

Also writes `enhancements.json` alongside the export: the Events report's valid/
invalid counts (Enhancements > Events) and the Search Appearance table's row state
(read from the export itself — "Search appearance.csv" being header-only IS the
finding when there's no enhanced result yet; it is not a failed pull).

Read-only against Search Console: no property setting is ever changed. The one
non-default browser action taken (CDP `Page.setDownloadBehavior`, to force the
download to write into the dated export dir instead of ~/Downloads) is reverted to
`default` before the script exits.

Usage:
    python3 scripts/fetch-gsc.py
"""
import json
import pathlib
import re
import subprocess
import sys
import time
import urllib.error
import urllib.request
import zipfile
from datetime import date, datetime, timezone

ROOT = pathlib.Path(__file__).resolve().parent.parent
RESEARCH = ROOT / 'docs/research'

# URL-prefix form only — see module docstring. Do not change without re-verifying
# access; the other two forms look identical in error output ("you don't have
# access") right up until you've concluded the account has no properties.
PROPERTY_URL = 'https://sportscardsnearme.ca/'

DEBUG_PORT = 9222
PAGE_NAME = 'scnm-gsc-fetch'  # named page, distinct from any sibling worktree's own pages
REQUIRED_SHEETS = ('chart', 'pages', 'queries')  # must match analyze-gsc-export.py's own check


def fail(msg):
    sys.exit(f'\nFETCH-GSC FAILED: {msg}\n')


def check_chrome():
    url = f'http://127.0.0.1:{DEBUG_PORT}/json/version'
    try:
        with urllib.request.urlopen(url, timeout=5) as resp:
            if resp.status != 200:
                fail(f'{url} returned HTTP {resp.status}, not 200. Start AI Chrome and retry.')
            json.loads(resp.read())  # confirm it's really the CDP endpoint, not a stray 200
    except (urllib.error.URLError, OSError) as e:
        fail(
            f'{url} is not reachable ({e}).\n'
            'AI Chrome (the debug-port Chrome dev-browser --connect attaches to) is not running.\n'
            'Start it — Nathan\'s "AI Chrome" Dock app, or:\n'
            '  open -na "Google Chrome" --args --remote-debugging-port=9222 --user-data-dir=$HOME/chrome-debug-profile'
        )


def run_js(script, timeout=90):
    proc = subprocess.run(
        ['dev-browser', '--connect', '--timeout', str(timeout)],
        input=script, capture_output=True, text=True,
    )
    if proc.returncode != 0:
        fail(f'dev-browser script failed:\n{proc.stderr.strip()}')
    return proc.stdout


def extract_marked(stdout, tag):
    m = re.search(rf'==={tag}_START===\n(.*?)\n==={tag}_END===', stdout, re.S)
    if not m:
        fail(f'expected a {tag} block in dev-browser output, got:\n{stdout}')
    return json.loads(m.group(1))


def verify_property():
    resource_id_expr = "encodeURIComponent(%r)" % PROPERTY_URL
    script = f'''
const page = await browser.getPage("{PAGE_NAME}");
const resourceId = {resource_id_expr};
await page.goto(
  `https://search.google.com/search-console/performance/search-analytics?resource_id=${{resourceId}}`,
  {{ waitUntil: "domcontentloaded", timeout: 30000 }}
);
await page.waitForTimeout(4000);
console.log("===META_START===");
console.log(JSON.stringify({{ url: page.url(), title: await page.title() }}));
console.log("===META_END===");
'''
    meta = extract_marked(run_js(script), 'META')
    if '/search-console/not-verified' in meta['url'] or meta['title'].lower().startswith('oops'):
        fail(
            f'landed on the not-verified interstitial for property {PROPERTY_URL!r}.\n'
            f'  url:   {meta["url"]}\n'
            f'  title: {meta["title"]}\n'
            'This is exactly what a wrong property id looks like — a silent redirect, not an\n'
            'error. Confirm PROPERTY_URL is the URL-prefix form and that dominathan@gmail.com\n'
            'is the account signed into AI Chrome.'
        )
    return meta


def download_export(out_dir):
    script = f'''
const page = await browser.getPage("{PAGE_NAME}");
const client = await page.context().newCDPSession(page);
await client.send("Page.setDownloadBehavior", {{
  behavior: "allow",
  downloadPath: {json.dumps(str(out_dir))},
}});
await page.click("text=EXPORT");
await page.waitForTimeout(800);
const [download] = await Promise.all([
  page.waitForEvent("download", {{ timeout: 20000 }}),
  page.click("text=Download CSV"),
]);
await page.waitForTimeout(1500);
await client.send("Page.setDownloadBehavior", {{ behavior: "default" }});
console.log("===DL_START===");
console.log(JSON.stringify({{ suggestedFilename: download.suggestedFilename() }}));
console.log("===DL_END===");
'''
    return extract_marked(run_js(script), 'DL')


def wait_for_stable_file(path, timeout=15):
    deadline = time.time() + timeout
    last_size = -1
    while time.time() < deadline:
        if path.exists():
            size = path.stat().st_size
            if size > 0 and size == last_size:
                return
            last_size = size
        time.sleep(0.5)
    fail(f'{path} never appeared or never finished writing (Chrome download did not land).')


def fetch_events():
    script = f'''
const page = await browser.getPage("{PAGE_NAME}");
const resourceId = encodeURIComponent({PROPERTY_URL!r});
await page.goto(
  `https://search.google.com/search-console/r/events?resource_id=${{resourceId}}`,
  {{ waitUntil: "domcontentloaded", timeout: 30000 }}
);
await page.waitForTimeout(3500);
const text = await page.evaluate(() => document.body.innerText);
console.log("===EVENTS_START===");
console.log(JSON.stringify({{ url: page.url(), title: await page.title(), text }}));
console.log("===EVENTS_END===");
'''
    data = extract_marked(run_js(script), 'EVENTS')
    text = data['text']
    # Scope the search to the stat cards, between "Last update:" and the "Items"
    # chart label — "Valid" reappears later ("View data about valid items") and an
    # unscoped regex would grab the wrong number.
    after_update = text.split('Last update:', 1)
    scoped = after_update[1].split('Items', 1)[0] if len(after_update) > 1 else text
    invalid_m = re.search(r'Invalid\s*\n\s*(\d+)', scoped)
    valid_m = re.search(r'Valid\s*\n\s*(\d+)', scoped)
    last_update_m = re.search(r'^\s*([\d/]+)', after_update[1]) if len(after_update) > 1 else None
    if not invalid_m or not valid_m:
        print('WARNING: could not parse Events valid/invalid counts from the page text — '
              'recording nothing for it rather than a guess.', file=sys.stderr)
        return None
    return {
        'valid': int(valid_m.group(1)),
        'invalid': int(invalid_m.group(1)),
        'last_update': last_update_m.group(1) if last_update_m else None,
        'source_url': data['url'],
    }


def search_appearance_state(out_dir):
    matches = [p for p in out_dir.glob('*.csv') if p.stem.strip().lower() == 'search appearance']
    if not matches:
        print('WARNING: no "Search appearance.csv" in the export — recording nothing for it, '
              'not an empty-table guess.', file=sys.stderr)
        return {'state': 'unknown', 'note': 'file absent from export'}
    path = matches[0]
    with open(path, encoding='utf-8-sig') as f:
        lines = [line for line in f.read().splitlines() if line.strip()]
    rows = lines[1:]  # drop header
    if not rows:
        return {'state': 'empty', 'row_count': 0, 'note': 'No data — matches the 2026-08-28 baseline shape', 'source': path.name}
    return {'state': 'has_data', 'row_count': len(rows), 'rows': rows, 'source': path.name}


def main():
    check_chrome()

    out_dir = RESEARCH / f'gsc-export-{date.today().isoformat()}'

    meta = verify_property()
    print(f'Property verified: {meta["url"]}')

    out_dir.mkdir(parents=True, exist_ok=True)
    dl = download_export(out_dir)
    zip_path = out_dir / dl['suggestedFilename']
    wait_for_stable_file(zip_path)

    with zipfile.ZipFile(zip_path) as zf:
        zf.extractall(out_dir)
    zip_path.unlink()

    found = {p.stem.strip().lower() for p in out_dir.glob('*.csv')}
    missing = [name for name in REQUIRED_SHEETS if name not in found]
    if missing:
        fail(
            f'export landed in {out_dir} but is missing sheets the analyzer requires: '
            f'{", ".join(missing)}. Found: {", ".join(sorted(found)) or "(none)"}.\n'
            'Not deleting what did download — inspect it by hand before re-running.'
        )
    print(f'Export written: {out_dir}  ({", ".join(sorted(found))})')

    events = fetch_events()
    appearance = search_appearance_state(out_dir)

    enhancements = {
        'fetched_at': datetime.now(timezone.utc).isoformat(),
        'property': PROPERTY_URL,
        'events': events,
        'search_appearance': appearance,
    }
    (out_dir / 'enhancements.json').write_text(json.dumps(enhancements, indent=2) + '\n')
    print(f'enhancements.json written: events={events}, search_appearance.state={appearance["state"]}')

    print(f'\nNext: python3 scripts/analyze-gsc-export.py {out_dir}')


if __name__ == '__main__':
    main()
