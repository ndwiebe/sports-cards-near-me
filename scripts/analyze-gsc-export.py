#!/usr/bin/env python3
"""Turn a Search Console export into the numbers that decide what to build next.

Written 2026-08-07 after a week of reading Search Console through its web UI,
which shows ten rows per table. Two things went wrong on that diet, and this
script exists to stop both recurring:

  1. The headline impressions figure was read as a weekly RATE. It was a
     nine-day TOTAL, and those nine days were a spike (3,139 on Aug 1, 587 by
     Aug 5). A plan was approved on the wrong denominator. -> `run rate` below
     always reports the settled last-3-days figure, never the window total.

  2. Page types were ranked by impressions-per-page, which flattered guides.
     Ranking by CLICKS-per-page reversed the order and rewrote the roadmap:
     guides earn double the reach of anything else and sit at median position
     16.5 (page two), so they collect impressions and convert almost none.
     -> both columns are always printed side by side.

Usage:
    python3 scripts/analyze-gsc-export.py <export.xlsx | export-dir>

Accepts the .xlsx straight from Search Console's "Download Excel", or a
directory of the CSVs it contains. Prints the report; writes nothing.
"""
import csv
import os
import re
import sys
from collections import defaultdict

SETTLED_DAYS = 3  # trailing days used for the run rate, to skip a discovery spike
STRIKING = (5.0, 15.0)  # position band where a title rewrite can realistically move a page


def load_sheets(path):
    """Return {sheet_name_lower: [row dicts]} from an .xlsx or a directory of CSVs."""
    if os.path.isdir(path):
        out = {}
        for name in os.listdir(path):
            if name.endswith('.csv'):
                with open(os.path.join(path, name), encoding='utf-8') as f:
                    out[name[:-4].lower()] = list(csv.DictReader(f))
        return out
    import openpyxl
    wb = openpyxl.load_workbook(path, read_only=True, data_only=True)
    out = {}
    for name in wb.sheetnames:
        rows = list(wb[name].iter_rows(values_only=True))
        if not rows:
            continue
        header = [str(h) for h in rows[0]]
        out[name.lower()] = [dict(zip(header, r)) for r in rows[1:]]
    return out


def num(value):
    try:
        return float(str(value).replace('%', '').replace(',', ''))
    except (TypeError, ValueError):
        return 0.0


def page_kind(url):
    for segment in ('shows', 'guides', 'store', 'sell', 'pokemon'):
        if f'/{segment}/' in url:
            return 'stores' if segment == 'store' else segment
    if re.search(r'\.ca/[a-z-]+/[a-z0-9-]+/$', url):
        return 'cities'
    if re.search(r'\.ca/[a-z-]+/$', url):
        return 'provinces'
    return 'home'


def report(sheets):
    chart = sheets.get('chart', [])
    pages = sheets.get('pages', [])
    queries = sheets.get('queries', [])

    if chart:
        rows = [(r.get('Date'), num(r.get('Clicks')), num(r.get('Impressions')), num(r.get('Position')))
                for r in chart]
        print('DAILY')
        peak = max(r[2] for r in rows) or 1
        for date, clicks, impr, pos in rows:
            bar = '#' * int(impr / peak * 40)
            print(f'  {date}  {int(impr):>6} impr  {int(clicks):>4} clk  pos {pos:>4.1f}  {bar}')
        tail = rows[-SETTLED_DAYS:]
        ti = sum(r[2] for r in tail)
        tc = sum(r[1] for r in tail)
        print(f'\n  window total : {int(sum(r[2] for r in rows)):,} impressions over {len(rows)} days'
              f'  <- NOT a weekly rate')
        print(f'  run rate     : {ti/len(tail):,.0f} impr/day = {ti/len(tail)*7:,.0f}/week,'
              f' {tc/len(tail)*7:,.0f} clicks/week, CTR {tc/ti*100 if ti else 0:.2f}%')
        settled = ti / len(tail)
        change = (settled / peak - 1) * 100
        direction = 'DOWN' if change < 0 else 'up'
        print(f'  vs peak day  : {int(peak):,} -> {settled:,.0f}  ({direction} {abs(change):.0f}%)')

    if pages:
        agg = defaultdict(lambda: {'n': 0, 'i': 0.0, 'c': 0.0, 'pos': []})
        for r in pages:
            url = str(r.get('Top pages') or '')
            a = agg[page_kind(url)]
            a['n'] += 1
            a['i'] += num(r.get('Impressions'))
            a['c'] += num(r.get('Clicks'))
            if num(r.get('Impressions')) >= 5:
                a['pos'].append(num(r.get('Position')))
        print(f'\nPAGE TYPES  (ordered by clicks/page — the column that decides priority)')
        print(f'  {"type":<10}{"pages":>6}{"impr/pg":>9}{"clicks/pg":>11}{"CTR":>8}{"med pos":>9}')
        for kind, a in sorted(agg.items(), key=lambda kv: -(kv[1]['c'] / kv[1]['n'])):
            med = sorted(a['pos'])[len(a['pos']) // 2] if a['pos'] else 0
            ctr = a['c'] / a['i'] * 100 if a['i'] else 0
            print(f'  {kind:<10}{a["n"]:>6}{a["i"]/a["n"]:>9.1f}{a["c"]/a["n"]:>11.2f}{ctr:>7.2f}%{med:>9.1f}')
        total_clicks = sum(a['c'] for a in agg.values())
        print(f'\n  {int(total_clicks)} clicks total across all pages. Below ~200, every per-type')
        print('  figure here rests on single digits — read it as direction, not measurement.')

        band = [r for r in pages
                if STRIKING[0] <= num(r.get('Position')) <= STRIKING[1] and num(r.get('Impressions')) >= 20]
        by_kind = defaultdict(lambda: {'i': 0.0, 'c': 0.0, 'n': 0})
        for r in band:
            k = by_kind[page_kind(str(r.get('Top pages') or ''))]
            k['i'] += num(r.get('Impressions'))
            k['c'] += num(r.get('Clicks'))
            k['n'] += 1
        print(f'\nSTRIKING DISTANCE  (position {STRIKING[0]:.0f}-{STRIKING[1]:.0f}, 20+ impressions)')
        for kind, v in sorted(by_kind.items(), key=lambda kv: -kv[1]['i']):
            ctr = v['c'] / v['i'] * 100 if v['i'] else 0
            print(f'  {kind:<10}{v["n"]:>4} pages{v["i"]:>7.0f} impr{v["c"]:>5.0f} clk   CTR {ctr:>5.2f}%')
        store_share = by_kind.get('stores', {'i': 0})['i'] / (sum(v['i'] for v in by_kind.values()) or 1)
        if store_share > 0.5:
            print(f'\n  WARNING: store pages are {store_share*100:.0f}% of this pool. Those are largely')
            print('  shop-NAME searches, where the shop\'s own site and Google listing outrank a')
            print('  directory and should. Treat that share as structurally unwinnable, not as')
            print('  headroom a title rewrite will recover.')

    if queries:
        print(f'\nTOP QUERIES BY IMPRESSIONS')
        rows = sorted(queries, key=lambda r: -num(r.get('Impressions')))[:12]
        for r in rows:
            print(f'  {num(r.get("Impressions")):>5.0f}i {num(r.get("Clicks")):>3.0f}c '
                  f'pos {num(r.get("Position")):>5.1f}  {str(r.get("Top queries"))[:52]}')
        print(f'\n  NOTE: the queries sheet is capped at 1,000 rows and Google withholds rare')
        print('  queries entirely, so query impressions will not reconcile with the daily total.')


if __name__ == '__main__':
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    report(load_sheets(sys.argv[1]))
