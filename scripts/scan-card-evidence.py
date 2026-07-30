#!/usr/bin/env python3
"""Fetch a shop's own website and score how strongly it evidences card retail.

Written 2026-07-30 to replace the earlier services scanner, which produced
clean, confident, wrong data three ways (see RESEARCH-TOOLING-NOTES.md):
  1. a self-identifying User-Agent was 403'd by 62% of shop sites, and the
     failures surfaced as fake "no evidence"
  2. bare "psa" counted as evidence (it matches PSA-the-word anywhere)
  3. "buylist" -- *the* trade term -- was missing entirely

So: browser User-Agent, HTTP status recorded separately from evidence, and
STRONG signals require a card-specific phrase rather than a single word.

Output is a verdict per shop, never a delete list. Unreachable is its own
bucket precisely because it is not evidence of anything.
"""
import csv, json, re, sys, time
from concurrent.futures import ThreadPoolExecutor
from urllib.parse import urlparse
import urllib.request, urllib.error

UA = ('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 '
      '(KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36')

# Multi-word / unambiguous phrases only. "psa" alone is not here on purpose.
STRONG = [
    r'sports?\s*cards?', r'trading\s*cards?', r'hockey\s*cards?', r'baseball\s*cards?',
    r'basketball\s*cards?', r'football\s*cards?', r'\bbuylist\b', r'\bbuy\s*list\b',
    r'graded\s*cards?', r'psa\s*(graded|slab|10|9)', r'\bslabs?\b',
    r'booster\s*(box|pack)', r'\bwax\s*(box|pack)\b', r'singles?\s*(and|&)\s*sealed',
    r'card\s*breaks?', r'group\s*breaks?', r'pok[eé]mon\s*cards?', r'upper\s*deck',
    r'\btopps\b', r'\bpanini\b', r'\bfanatics\b', r'one\s*piece\s*(tcg|cards?)',
    r'magic:?\s*the\s*gathering', r'\bmtg\b', r'yu-?gi-?oh',
]
WEAK = [r'\bcards?\b', r'\btcg\b', r'collectib', r'\bhobby\b', r'\bcomics?\b']

def fetch(url, timeout=20):
    if not url or not url.startswith(('http://', 'https://')):
        return None, 'no-website'
    req = urllib.request.Request(url, headers={
        'User-Agent': UA,
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-CA,en;q=0.9',
    })
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return r.read(400_000).decode('utf-8', 'ignore'), f'{r.status}'
    except urllib.error.HTTPError as e:
        return None, f'http-{e.code}'
    except Exception as e:
        return None, type(e).__name__

def score(html):
    text = re.sub(r'<script.*?</script>|<style.*?</style>', ' ', html or '', flags=re.S | re.I)
    text = re.sub(r'<[^>]+>', ' ', text).lower()
    strong = sorted({p for p in STRONG if re.search(p, text)})
    weak = sorted({p for p in WEAK if re.search(p, text)})
    return strong, weak

def verdict(status, strong, weak):
    if status == 'no-website':      return 'NO-WEBSITE'
    if not status.startswith('2'):  return 'UNREACHABLE'
    if len(strong) >= 2:            return 'CARDS-CONFIRMED'
    if len(strong) == 1:            return 'CARDS-LIKELY'
    if weak:                        return 'AMBIGUOUS'
    return 'NO-CARD-EVIDENCE'

def run(row):
    html, status = fetch(row.get('website', ''))
    strong, weak = score(html)
    return {**row, 'status': status, 'verdict': verdict(status, strong, weak),
            'strong_hits': '|'.join(strong)[:180], 'weak_hits': '|'.join(weak)[:80]}

if __name__ == '__main__':
    src, out = sys.argv[1], sys.argv[2]
    rows = list(csv.DictReader(open(src, encoding='utf-8')))
    with ThreadPoolExecutor(max_workers=8) as ex:
        results = list(ex.map(run, rows))
    keys = list(results[0].keys())
    with open(out, 'w', newline='', encoding='utf-8') as f:
        w = csv.DictWriter(f, fieldnames=keys); w.writeheader(); w.writerows(results)
    from collections import Counter
    for k, v in Counter(r['verdict'] for r in results).most_common():
        print(f'  {v:>4}  {k}')
    print(f'wrote {out}')
