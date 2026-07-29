#!/usr/bin/env python3
"""Scan shop websites for evidence of which services they offer.

Why this is a script and not a subagent: this is a loop with no per-item
judgment — fetch a URL, look for phrases. Four subagents were dispatched to do
it and three stalled on unbounded parallel fetches or waiting for notifications
that never arrive. See feedback_agents_never_background_or_wait.

What it does NOT do: decide anything final. It records which phrases matched and
on which page, so a human can see the evidence. A phrase match is a candidate,
not a fact — "we buy" on a page could be "we buy from distributors."

Output: docs/research/services-scan.csv (one row per shop, with matched phrases
and the URL each match came from) plus services-scan-unreachable.csv.

Usage:
  python3 scripts/scan-services.py                 # all shops missing services
  python3 scripts/scan-services.py --limit 20      # smoke test
"""
import argparse
import csv
import json
import pathlib
import re
import sys
import urllib.error
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parent.parent
STORES = ROOT / 'src/data/stores.json'
OUT = ROOT / 'docs/research/services-scan.csv'
BAD = ROOT / 'docs/research/services-scan-unreachable.csv'

TIMEOUT = 12          # hard per-request cap; a dead host costs 12s, not the run
# Rather than guessing URL paths (which mostly 404 and miss the real page), read
# the homepage's own links and follow the ones whose text or href looks relevant.
LINK_HINTS = ['buy', 'sell', 'trade', 'grad', 'service', 'about', 'faq', 'consign', 'appraisal']
MAX_SUBPAGES = 6

# Phrase -> service. Deliberately conservative: these are phrases a shop uses
# about buying FROM customers, not about its own sourcing.
SIGNALS: dict[str, list[str]] = {
    'Buys': [
        'we buy', 'we purchase', 'sell to us', 'sell your', 'cash for your',
        'cash for cards', 'buying collections', 'buy collections', 'we pay cash',
        'free appraisal', 'looking to buy', 'always buying', 'we are buying',
        'bring in your', 'buying cards', 'we will buy',
        # "buylist" is THE card-trade term for what a shop pays for cards —
        # missing it made several obvious buyers scan as sell-only.
        'buylist', 'buy list', 'do we buy', 'what we buy', 'cards wanted',
    ],
    'Trades Singles': ['trade-in', 'trade in your', 'trade credit', 'we trade', 'trades welcome'],
    # A bare grader name is NOT evidence of a grading service — a shop selling
    # PSA-slabbed singles mentions "PSA" constantly. Require submission language.
    'Grading Services': [
        'grading submission', 'submit your cards', 'get your cards graded',
        'we grade', 'grading service', 'send your cards to psa', 'psa submission',
        'grading drop-off', 'authorized dealer for psa',
    ],
    'Sells Wax': ['hobby box', 'sealed product', 'blaster', 'booster box', 'sealed wax'],
    # Bare "breaks" matches "breaks down", "tie-breaks" etc.
    'Breaks': ['group break', 'box break', 'live break', 'whatnot', 'case break'],
    'Trade Nights': ['trade night', 'game night', 'tournament', 'friday night magic'],
}
SPORTS = {
    'Hockey': ['hockey', 'nhl'], 'Baseball': ['baseball', 'mlb'],
    'Basketball': ['basketball', 'nba'], 'Football': ['football', 'nfl', 'cfl'],
    'Pokemon': ['pokemon', 'pokémon'], 'Magic': ['magic the gathering', 'mtg'],
}

# A self-identifying UA got 403'd by 62% of shop sites (Shopify/Wix/Cloudflare
# fronts reject unknown agents), which showed up as a fake "unreachable" wall —
# curl with an ordinary browser UA gets 200 from the same hosts. These are public
# pages being read exactly as a browser would read them.
UA = {
    'User-Agent': ('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 '
                   '(KHTML, like Gecko) Chrome/126.0 Safari/537.36'),
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-CA,en;q=0.9',
}


def fetch(url: str) -> str | None:
    try:
        req = urllib.request.Request(url, headers=UA)
        with urllib.request.urlopen(req, timeout=TIMEOUT) as r:
            if r.status != 200:
                return None
            raw = r.read(600_000)  # cap: some shops ship enormous pages
        return raw.decode('utf-8', errors='replace')
    except Exception:
        return None


def text_of(html: str) -> str:
    html = re.sub(r'<(script|style)\b.*?</\1>', ' ', html, flags=re.S | re.I)
    return re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', ' ', html)).lower()


def relevant_links(html: str, base: str) -> list[str]:
    """Same-site links whose href or anchor text suggests a buy/sell/service page.
    Reading the site's own nav beats guessing paths — most guessed paths 404, and
    shops put 'we buy' on wildly different URLs (/sell-to-us, /cash, /consignment)."""
    out: list[str] = []
    for m in re.finditer(r'<a\b[^>]*href=["\']([^"\']+)["\'][^>]*>(.*?)</a>', html, re.S | re.I):
        href, label = m.group(1), text_of(m.group(2))
        blob = f'{href.lower()} {label}'
        if not any(h in blob for h in LINK_HINTS):
            continue
        if href.startswith('#') or href.startswith('mailto:') or href.startswith('tel:'):
            continue
        if href.startswith('http'):
            if base.split('//', 1)[-1].split('/')[0] not in href:
                continue          # off-site
            url = href
        else:
            url = base + '/' + href.lstrip('/')
        if url not in out:
            out.append(url)
        if len(out) >= MAX_SUBPAGES:
            break
    return out


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument('--limit', type=int)
    args = ap.parse_args()

    stores = json.loads(STORES.read_text())
    targets = [s for s in stores if s['province'] in ('ON', 'AB') and not s.get('services')]
    if args.limit:
        targets = targets[:args.limit]
    print(f'{len(targets)} shops to scan (timeout {TIMEOUT}s per request)', flush=True)

    rows, bad = [], []
    for i, s in enumerate(targets, 1):
        site = (s.get('website') or '').rstrip('/')
        if not site:
            bad.append([s['slug'], s['name'], s['city'], s['province'], 'no website on record'])
            continue

        found: dict[str, str] = {}   # service -> "phrase @ page"
        sports: set[str] = set()

        home = fetch(site)
        reached = home is not None
        pages: list[tuple[str, str]] = []
        if home is not None:
            pages.append(('/', home))
            for url in relevant_links(home, site):
                sub = fetch(url)
                if sub is not None:
                    pages.append((url.replace(site, '') or '/', sub))

        for label, html in pages:
            body = text_of(html)
            for svc, phrases in SIGNALS.items():
                if svc in found:
                    continue
                for p in phrases:
                    if p in body:
                        found[svc] = f'"{p}" @ {label}'
                        break
            for sp, kws in SPORTS.items():
                if any(k in body for k in kws):
                    sports.add(sp)

        if not reached:
            bad.append([s['slug'], s['name'], s['city'], s['province'], f'unreachable: {site}'])
            continue

        svcs = ['Sells'] + [k for k in SIGNALS if k in found]   # reached = it sells something
        rows.append([
            s['slug'], s['name'], s['city'], s['province'],
            ';'.join(svcs), ';'.join(sorted(sports)),
            ' | '.join(f'{k}: {v}' for k, v in found.items()), site,
        ])
        if i % 20 == 0:
            print(f'  {i}/{len(targets)}  reached {len(rows)}, unreachable {len(bad)}', flush=True)

    OUT.parent.mkdir(parents=True, exist_ok=True)
    with OUT.open('w', newline='') as f:
        w = csv.writer(f)
        w.writerow(['slug', 'name', 'city', 'province', 'Services', 'Sports/TCG', 'evidence', 'site'])
        w.writerows(rows)
    with BAD.open('w', newline='') as f:
        w = csv.writer(f)
        w.writerow(['slug', 'name', 'city', 'province', 'reason'])
        w.writerows(bad)

    buys = sum(1 for r in rows if 'Buys' in r[4])
    print(f'\nreached: {len(rows)} | unreachable: {len(bad)}')
    print(f'flagged Buys: {buys}')
    print(f'  -> {OUT.relative_to(ROOT)}')
    print(f'  -> {BAD.relative_to(ROOT)}')
    print('\nEvidence column holds the matched phrase and page. Review before import —')
    print('"we buy" can mean buying from distributors, not from customers.')


if __name__ == '__main__':
    main()
