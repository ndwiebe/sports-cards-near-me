#!/usr/bin/env python3
"""Re-scrape TCDB's Canadian card shows and report what changed since last time.

WHY THIS EXISTS
    TCDB publishes roughly a FOUR-MONTH horizon — verified 2026-08-27, when all four
    provinces carrying shows ended within a week of each other in late December. So the
    calendar decays on its own: today's shows thin to nothing by about January with no
    error and no warning. Shows are the best-converting page type on the site (4.67% CTR
    at the 2026-08-25 read), which makes that decay expensive and silent.

    The 2026-08-27 import was done by hand. This is that method, repeatable.

WHAT IT DOES NOT DO
    It never writes the Google Sheet and never edits src/data/*.json (generated). It emits
    a CSV payload and a markdown report for a human to review. A show that has vanished
    upstream is REPORTED, never deleted — an upstream removal is not proof of cancellation.

USAGE
    python3 scripts/refresh-shows.py            # full run
    python3 scripts/refresh-shows.py --limit 5  # smoke test, 5 detail pages per province
"""
from __future__ import annotations

import argparse
import csv
import html
import json
import re
import subprocess
import sys
import unicodedata
import urllib.parse
import urllib.request
from collections import Counter, defaultdict
from datetime import date, datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SHOWS = ROOT / 'src/data/shows.json'
STORES = ROOT / 'src/data/stores.json'
OUTDIR = ROOT / 'docs/research'
CHROME = 'http://127.0.0.1:9222/json/version'

# Full province names; the query param wants the name, not the code. "Québec" needs its
# accent — ?province=QC style abbreviations silently return zero.
PROVINCES = {
    'Alberta': 'AB', 'British Columbia': 'BC', 'Manitoba': 'MB', 'New Brunswick': 'NB',
    'Newfoundland and Labrador': 'NL', 'Nova Scotia': 'NS', 'Ontario': 'ON',
    'Prince Edward Island': 'PE', 'Québec': 'QC', 'Saskatchewan': 'SK',
}
LIST_URL = 'https://www.tcdb.com/CardShows.cfm?MODE=Location&State={}&Country=Canada'
DATE_RE = re.compile(r'^(Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday),\s+\w+\s+\d{1,2},\s+\d{4}$')


def fail(msg: str) -> None:
    print(f'\nREFRESH-SHOWS FAILED: {msg}', file=sys.stderr)
    sys.exit(1)


def check_chrome() -> None:
    """Fail loudly rather than falling back to a scraper that silently returns nothing.

    tcdb.com 403s curl, fetch and defuddle. dev-browser --connect against the signed-in
    Chrome is the ONLY route that works, so a closed port is a hard stop, not a warning.
    """
    try:
        with urllib.request.urlopen(CHROME, timeout=5) as r:
            if r.status != 200:
                raise RuntimeError(f'status {r.status}')
    except Exception as exc:
        fail(
            f'AI Chrome is not reachable on 127.0.0.1:9222 ({exc}).\n'
            '  Start it, then re-run. tcdb.com 403s every non-browser client, so there is\n'
            '  no fallback — continuing would produce an empty result that looks like\n'
            '  "TCDB has no shows".'
        )
    # A CDP attach also times out when Chrome has accumulated too many targets (68 was
    # enough on 2026-08-28, while the port still answered 200). Warn before it bites.
    try:
        with urllib.request.urlopen('http://127.0.0.1:9222/json/list', timeout=5) as r:
            n = len(json.load(r))
        if n > 40:
            print(f'  warning: Chrome has {n} open targets; dev-browser may time out attaching.')
    except Exception:
        pass


def run_js(script: str, timeout: int = 900) -> str:
    """dev-browser runs a QuickJS sandbox: no fs, no bare `document`.

    All DOM access must sit inside page.evaluate(). Data comes back as JSON printed
    between marker lines and captured from stdout.
    """
    p = subprocess.run(['dev-browser', '--connect'], input=script, capture_output=True,
                       text=True, timeout=timeout)
    if p.returncode != 0:
        fail(f'dev-browser failed:\n{p.stderr.strip()[:900]}')
    return p.stdout


def marked(stdout: str, tag: str) -> list:
    out = []
    for line in stdout.splitlines():
        if line.startswith(tag + ' '):
            out.append(json.loads(line[len(tag) + 1:]))
    return out


# Known upstream misspellings. TCDB writes these; we hold the correct spelling
# (validated against the 689-shop directory). Without the map they never match, so
# every quarter the correctly-spelled rows would be reported GONE while the
# misspelled ones are reported NEW — a phantom on both sides of the diff.
SOURCE_CITY_ALIASES = {
    'stcatherines': 'stcatharines',
    'lloyminster': 'lloydminster',
}


def norm_city(c: str) -> str:
    """Strip accents/punctuation/case for COMPARISON only — never for display.

    Canonicalising by (city, venue) on the RAW string is what let "St. Catharines",
    "St.Catharines" and "St. Catherines" read as three different cities on 2026-08-27,
    so their duplicates survived dedup and shipped. Normalise first, always.
    """
    c = unicodedata.normalize('NFKD', html.unescape(c or ''))
    c = ''.join(ch for ch in c if not unicodedata.combining(ch))
    k = re.sub(r'[^a-z0-9]', '', c.lower())
    return SOURCE_CITY_ALIASES.get(k, k)


def clean(s: str) -> str:
    return re.sub(r'\s+', ' ', html.unescape(s or '')).strip()


def slugify(s: str) -> str:
    s = unicodedata.normalize('NFKD', s or '')
    s = ''.join(ch for ch in s if not unicodedata.combining(ch))
    return re.sub(r'-+', '-', re.sub(r'[^a-z0-9]+', '-', s.lower())).strip('-')


def scrape_lists(limit: int | None) -> tuple[list[dict], dict[str, str]]:
    """One page object, reused, ~1s between fetches. Never a tab per show."""
    provs = json.dumps(list(PROVINCES))
    js = f"""
const provinces = {provs};
const page = await browser.getPage("refresh");
for (const prov of provinces) {{
  const url = "{LIST_URL}".replace("{{}}", encodeURIComponent(prov));
  let rows = [], err = null;
  try {{
    await page.goto(url, {{ waitUntil: "domcontentloaded", timeout: 60000 }});
    await page.waitForTimeout(1100);
    rows = await page.evaluate((prov) => {{
      const first = document.querySelector('li a[href*="MODE=VIEW"]');
      if (!first) return [];
      const box = first.closest("ul").parentElement;
      const out = []; let d = null;
      const RE = /^(Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday),\\s+\\w+\\s+\\d{{1,2}},\\s+\\d{{4}}$/;
      for (const el of box.children) {{
        const t = el.innerText.trim();
        if (el.tagName === "P" && RE.test(t)) {{ d = t; continue; }}
        if (el.tagName === "UL") for (const li of el.querySelectorAll("li")) {{
          const a = li.querySelector('a[href*="MODE=VIEW"]'); if (!a) continue;
          const parts = li.innerHTML.split(/<br\\s*\\/?>/i).map(s => s.replace(/<[^>]*>/g,"").trim()).filter(Boolean);
          out.push({{ province: prov, date: d, name: a.textContent.trim(),
                     url: "https://www.tcdb.com" + a.getAttribute("href").replace(/&amp;/g,"&"),
                     venue: parts[1] || null, cityLine: parts[2] || null, hours: parts[3] || null }});
        }}
      }}
      return out;
    }}, prov);
  }} catch (e) {{ err = String(e).slice(0,200); }}
  console.log("PROV " + JSON.stringify({{ province: prov, count: rows.length, error: err }}));
  for (const r of rows) console.log("ROW " + JSON.stringify(r));
}}
"""
    out = ''
    for i in range(0, len(PROVINCES), 3):          # 30s QuickJS cap — see run_js
        chunk = list(PROVINCES)[i:i + 3]
        out += run_js(js.replace('const provinces = ' + provs, 'const provinces = ' + json.dumps(chunk)))
    status = {}
    for p in marked(out, 'PROV'):
        # A zero is a claim too: distinguish "loaded and genuinely empty" from "failed".
        status[p['province']] = 'error: ' + p['error'] if p['error'] else ('empty' if p['count'] == 0 else f"{p['count']} rows")
    rows = marked(out, 'ROW')
    if limit:
        keep, seen = [], Counter()
        for r in rows:
            if seen[r['province']] < limit:
                keep.append(r); seen[r['province']] += 1
        rows = keep
    return rows, status


def scrape_details(rows: list[dict], cache: Path) -> dict[str, dict]:
    """Fetch detail pages in batches, checkpointing after each one.

    dev-browser terminates any single script at 30 SECONDS. At ~1s per page that is
    about 20 pages per invocation, so a 190-page run MUST be batched — a full run
    died on exactly this. Results are appended to a cache file after every batch, so
    a kill costs one batch rather than the whole run, and a re-run resumes.
    """
    done: dict[str, dict] = {}
    if cache.exists():
        for line in cache.read_text().splitlines():
            if line.strip():
                d = json.loads(line)
                done[d['url']] = d
    todo = [r for r in rows if r['url'] not in done]
    if done:
        print(f'  resuming: {len(done)} already cached, {len(todo)} to fetch')
    # 8, not 18. dev-browser kills any script at 30s; at ~1.5s per page (slower still
    # when Chrome has many targets open) 18 overran it twice. Matches the documented
    # "sequential batches of 5-10" rule.
    BATCH = 8
    for i in range(0, len(todo), BATCH):
        chunk = todo[i:i + BATCH]
        js = _detail_js([r['url'] for r in chunk])
        recs = marked(run_js(js, timeout=180), 'DET')
        with cache.open('a') as f:
            for d in recs:
                done[d['url']] = d
                f.write(json.dumps(d) + '\n')
        print(f'  {min(i + BATCH, len(todo))}/{len(todo)}')
    return done


def _detail_js(urls: list[str]) -> str:
    """Detail pages carry the street address; list pages never do."""
    urls = json.dumps(urls)
    js = f"""
const urls = {urls};
const page = await browser.getPage("refresh");
for (const u of urls) {{
  let rec = {{ url: u, ok: false }};
  try {{
    await page.goto(u, {{ waitUntil: "domcontentloaded", timeout: 60000 }});
    await page.waitForTimeout(700);
    rec = await page.evaluate((u) => {{
      const t = document.body.innerText;
      const i = t.indexOf("Canada");
      const block = i >= 0 ? t.slice(Math.max(0, i - 400), i) : "";
      const lines = block.split("\\n").map(s => s.trim()).filter(Boolean);
      const cityIdx = lines.findIndex(l => /,\\s*(Alberta|British Columbia|Manitoba|New Brunswick|Newfoundland|Nova Scotia|Ontario|Prince Edward|Qu.bec|Saskatchewan)\\b/.test(l));
      const web = (t.match(/Web Address:\\s*\\n?\\s*(\\S+)/) || [])[1] || null;
      return {{ url: u, ok: true,
               cityLine: cityIdx >= 0 ? lines[cityIdx] : null,
               // street = the line(s) between the venue and the "City, Province POSTAL"
               // line. If there is none, it stays null — never inferred.
               street: cityIdx >= 1 ? lines[cityIdx - 1] : null,
               venue: cityIdx >= 2 ? lines[cityIdx - 2] : null,
               website: web }};
    }}, u);
  }} catch (e) {{ rec.error = String(e).slice(0,160); }}
  console.log("DET " + JSON.stringify(rec));
}}
"""
    return js


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument('--limit', type=int, help='detail pages per province (smoke test)')
    args = ap.parse_args()

    check_chrome()
    today = date.today().isoformat()
    ours = json.loads(SHOWS.read_text())
    known_cities = {norm_city(s['city']): s['city'] for s in json.loads(STORES.read_text())}

    print('Fetching province lists...')
    rows, status = scrape_lists(args.limit)
    for p, st in status.items():
        print(f'  {p:<26} {st}')
    if not rows:
        fail('every province returned zero rows — that is a scrape failure, not an empty calendar')

    print(f'\nFetching {len(rows)} detail pages (~1s each)...')
    details = scrape_details(rows, OUTDIR / f'.show-refresh-cache-{today}.jsonl')

    # --- assemble, normalising the city BEFORE any canonicalisation ---------------
    for r in rows:
        d = details.get(r['url'], {})
        r['name'] = clean(r['name'])
        r['venue'] = clean(d.get('venue') or r.get('venue') or '')
        r['city'] = clean((d.get('cityLine') or r.get('cityLine') or '').split(',')[0])
        r['address'] = clean(d.get('street') or '')
        w = d.get('website') or ''
        # A Facebook photo/post permalink is not an organiser website.
        r['website'] = w if w.startswith('http') and 'facebook.com/photo' not in w and '/posts/' not in w else ''
        r['social'] = w if w and not r['website'] else ''
        r['iso'] = datetime.strptime(r['date'], '%A, %B %d, %Y').date().isoformat() if r.get('date') else ''
        r['detail_ok'] = bool(d.get('ok'))

    canon = {}
    for r in rows:
        canon.setdefault((norm_city(r['city']), norm_city(r['venue'])), Counter())[r['name']] += 1
    canon = {k: sorted(c.items(), key=lambda kv: (-kv[1], -len(kv[0])))[0][0] for k, c in canon.items()}
    for r in rows:
        r['canonName'] = canon[(norm_city(r['city']), norm_city(r['venue']))]

    # --- classify ----------------------------------------------------------------
    ours_key = {(norm_city(s['city']), s['startDate']): s for s in ours}
    # Rows we have DELIBERATELY removed before (merged duplicates, folded series) still
    # exist upstream, so they come back as NEW every quarter. redirects.json already
    # records every dead show URL, so use it to flag them rather than re-litigating the
    # same rejections. Caught on 2026-08-28: Calgary "Sports Card Expo" 09-19/09-20,
    # deleted a day earlier as duplicates of the 3-day Sport Card & Memorabilia Expo.
    rejected = set()
    rj = ROOT / 'src/data/redirects.json'
    if rj.exists():
        for frm in json.loads(rj.read_text()):
            m = re.match(r'/shows/(.+?)-(\d{4}-\d{2}-\d{2})/$', frm)
            if m:
                rejected.add((slugify(m.group(1)), m.group(2)))
    tcdb_ours = [s for s in ours if 'tcdb.com' in (s.get('sourceUrl') or '')]
    seen_keys, out = set(), []
    for r in rows:
        k = (norm_city(r['city']), r['iso'])
        seen_keys.add(k)
        mine = ours_key.get(k)
        if mine is None:
            st = 'NEW'
        elif (clean(mine.get('venue') or '') != r['venue'] and r['venue']) or \
             (clean(mine.get('hours') or '') != clean(r.get('hours') or '') and r.get('hours')) or \
             (not mine.get('address') and r['address']):
            st = 'CHANGED'
        else:
            st = 'KNOWN'
        if st == 'NEW' and (slugify(f"{r['canonName']}-{r['city']}"), r['iso']) in rejected:
            st = 'PREVIOUSLY-REJECTED'
        r['_status'] = st
        out.append(r)

    # GONE is only meaningful on a FULL run. Under --limit we deliberately fetch a
    # handful of rows per province, so almost every show we hold looks "missing
    # upstream" — a smoke test reported GONE 148 out of 162 before this guard.
    live_provs = {p for p, s in status.items() if s not in ('empty',) and not s.startswith('error')}
    gone = [] if args.limit else [s for s in tcdb_ours
            if PROVINCES.get(next((k for k, v in PROVINCES.items() if v == s['province']), ''), '') or True
            if s['province'] in {PROVINCES[p] for p in live_provs}
            and (norm_city(s['city']), s['startDate']) not in seen_keys
            and s['startDate'] >= today]
    gone_note = ('not computed on a --limit run' if args.limit else 'full comparison')

    unknown_cities = sorted({r['city'] for r in rows if norm_city(r['city']) not in known_cities})

    # --- emit --------------------------------------------------------------------
    OUTDIR.mkdir(parents=True, exist_ok=True)
    payload = OUTDIR / f'{today}-show-refresh-payload.csv'
    with payload.open('w', newline='') as f:
        w = csv.writer(f)
        w.writerow(['Show Name', 'City', 'Province', 'Venue', 'Address', 'StartDate', 'EndDate',
                    'Hours', 'Admission', 'Website', 'SourceUrl', 'Recurring', '_status'])
        for r in sorted(out, key=lambda x: (x['province'], x['city'], x['iso'])):
            if r['_status'] == 'KNOWN':
                continue
            w.writerow([r['canonName'], r['city'], PROVINCES[r['province']], r['venue'], r['address'],
                        r['iso'], '', r.get('hours') or '', '', r['website'], r['url'], '', r['_status']])

    counts = Counter(r['_status'] for r in out)
    report = OUTDIR / f'{today}-show-refresh-report.md'
    lines = [f'# Show refresh — {today}', '',
             f'- NEW: **{counts["NEW"]}**',
             f'- PREVIOUSLY-REJECTED (deleted before, still upstream): {counts["PREVIOUSLY-REJECTED"]}', f'- CHANGED: **{counts["CHANGED"]}**',
             f'- KNOWN (unchanged): {counts["KNOWN"]}', f'- GONE upstream: **{len(gone)}** ({gone_note})', '',
             '## Province fetch status', '']
    for p, st in status.items():
        lines.append(f'- {p}: {st}')
        if st.endswith('rows') and st.split()[0] == '100':
            lines.append('  - ⚠️ **exactly 100** — the signature of a hidden row cap. Compare this '
                         "province's last date against the others before trusting it; on 2026-08-27 "
                         'the same 100 turned out to be coincidence.')
    lines += ['', '## GONE upstream — reported only, never auto-deleted', '',
              '_An upstream removal is not proof a show was cancelled._', '']
    lines += [f'- `{s["slug"]}` — {s["name"]}, {s["city"]} {s["startDate"]}' for s in gone] or ['- none']
    lines += ['', '## CHANGED', '']
    ch = [r for r in out if r['_status'] == 'CHANGED']
    lines += [f'- {r["canonName"]} — {r["city"]} {r["iso"]}: venue={r["venue"]!r} addr={r["address"]!r}' for r in ch] or ['- none']
    lines += ['', '## Cities not in the shop directory', '',
              '_Not an error — 14 legitimate towns simply have no card shop. Never auto-corrected._', '']
    lines += [f'- {c}' for c in unknown_cities] or ['- none']
    bad = [r for r in out if not r['detail_ok']]
    lines += ['', '## Detail pages that failed to load', ''] + ([f'- {r["url"]}' for r in bad] or ['- none'])
    report.write_text('\n'.join(lines) + '\n')

    print(f'\nNEW {counts["NEW"]} · CHANGED {counts["CHANGED"]} · KNOWN {counts["KNOWN"]} · GONE {len(gone)}')
    print(f'payload: {payload}')
    print(f'report:  {report}')


if __name__ == '__main__':
    main()
