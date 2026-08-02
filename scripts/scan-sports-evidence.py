#!/usr/bin/env python3
"""Fetch a shop's own website and infer WHICH card categories it evidences.

Sibling of scan-card-evidence.py, which answers "does this sell cards at all".
This one answers the follow-up the ranking tiers actually need: sports cards,
trading-card games, or both. Written 2026-08-01 to backfill the 82 shops
carrying no category data, because tiering on a field with holes punishes a
thin record rather than what a shop sells -- and 27 of those 82 have "sports
cards" in their own business name.

Same hard-won defaults as the card scanner (see RESEARCH-TOOLING-NOTES.md):
browser User-Agent because a self-identifying one is 403'd by most shop sites,
HTTP status recorded separately from evidence so a block never reads as a "no",
and multi-word phrases only -- bare "hockey" matches a hockey-stick retailer,
and every mall shop in Canada mentions "cards" somewhere.

Output is a PROPOSAL per shop with its evidence, never an applied change. A
person reviews it before anything reaches the sheet, and absence of evidence is
recorded as our gap, never as a claim the shop doesn't sell something.
"""
import csv, re, sys
from concurrent.futures import ThreadPoolExecutor
import urllib.request, urllib.error

UA = ('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 '
      '(KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36')

# Per-category phrases. Each must be card-specific: "hockey" alone hits a
# sporting-goods store, "magic" alone hits a magician's supply shop, and
# "football cards" is the only form that proves the category.
CATEGORY_PATTERNS = {
    # French forms are not optional: 123 Quebec shops are in the directory, and
    # calibration showed two of them scored as TCG-only purely because their
    # sites say "cartes de hockey" rather than "hockey cards".
    'Hockey':     [r'hockey\s*cards?', r'cartes?\s*de\s*hockey', r'\bupper\s*deck\b',
                   r'\byoung\s*guns\b', r'\bo-?pee-?chee\b', r'hockey\s*(wax|box|breaks?)'],
    'Baseball':   [r'baseball\s*cards?', r'cartes?\s*de\s*baseball', r'\btopps\b',
                   r'\bbowman\b', r'baseball\s*(wax|box|breaks?)'],
    'Basketball': [r'basketball\s*cards?', r'cartes?\s*de\s*basketball', r'\bprizm\b',
                   r'\bhoops\b', r'basketball\s*(wax|box|breaks?)'],
    'Football':   [r'football\s*cards?', r'cartes?\s*de\s*football', r'\bdonruss\b',
                   r'\bcontenders\b', r'football\s*(wax|box|breaks?)'],
    'Soccer':     [r'soccer\s*cards?', r'cartes?\s*de\s*soccer',
                   r'\bpanini\s*(prizm\s*)?(fifa|world\s*cup|premier)'],
    'Golf':       [r'golf\s*cards?'],
    'Pokemon':    [r'pok[eé]mon\s*(cards?|tcg|singles?|booster|etb)', r'\bpok[eé]mon\s*center\b'],
    'Magic':      [r'magic:?\s*the\s*gathering', r'\bmtg\b', r'\bcommander\s*(night|deck)\b'],
    'Yu-Gi-Oh':   [r'yu-?gi-?oh'],
    'One Piece':  [r'one\s*piece\s*(tcg|cards?|booster)'],
    'Lorcana':    [r'\blorcana\b'],
}

# Generic proof of sports-card retail without naming a sport. Enough to say
# "this is a sports-card shop", not enough to tag a specific sport.
#
# "memorabilia" was here and is deliberately gone: calibration scored Treasure
# Cove Comics as a sports shop on it, and its own site turned out to mean oil
# and gas memorabilia, knives, swords and war medals. One word, one wrong shop.
SPORTS_GENERIC = [r'sports?\s*cards?', r'cartes?\s*sportives?',
                  r'cartes?\s*de\s*sport', r'\bpanini\b', r'\bfanatics\b',
                  r'graded\s*cards?', r'psa\s*(graded|slab|10|9)',
                  r'\brookie\s*cards?\b', r'sports?\s*memorabilia']

SPORT_CATEGORIES = {'Hockey', 'Baseball', 'Basketball', 'Football', 'Soccer', 'Golf'}


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


def plain_text(html):
    text = re.sub(r'<script.*?</script>|<style.*?</style>', ' ', html or '', flags=re.S | re.I)
    return re.sub(r'<[^>]+>', ' ', text).lower()


def categories_in(text):
    hits = {}
    for cat, pats in CATEGORY_PATTERNS.items():
        matched = [p for p in pats if re.search(p, text)]
        if matched:
            hits[cat] = matched
    return hits


def verdict(status, cats, generic):
    """Deliberately coarse. The ranking tiers need sports/TCG/unknown, and a
    finer verdict than the evidence supports is how the last scanner went
    confidently wrong."""
    if status == 'no-website':
        return 'NO-WEBSITE'
    if not status.startswith('2'):
        return 'UNREACHABLE'
    sports = cats.keys() & SPORT_CATEGORIES
    tcg = cats.keys() - SPORT_CATEGORIES
    if sports and tcg:
        return 'BOTH'
    if sports:
        return 'SPORTS'
    if generic and tcg:
        return 'BOTH-GENERIC-SPORTS'
    if generic:
        return 'SPORTS-GENERIC'
    if tcg:
        return 'TCG-ONLY'
    return 'NO-CATEGORY-EVIDENCE'


def run(row):
    html, status = fetch(row.get('website', ''))
    text = plain_text(html)
    cats = categories_in(text)
    generic = sorted({p for p in SPORTS_GENERIC if re.search(p, text)})
    # Name evidence is reported separately and never merged into the proposal:
    # a shop called "Bill Sr's Sports Cards" is strong evidence it sells sports
    # cards, but it is not evidence of hockey specifically.
    name = row.get('name', '').lower()
    name_sports = bool(re.search(r'sports?\s*cards?|hockey|baseball|basketball|football', name))
    return {
        **row,
        'status': status,
        'verdict': verdict(status, cats, generic),
        'proposed_categories': '|'.join(sorted(cats)),
        'evidence': '; '.join(f'{c}: {"/".join(p)}' for c, p in sorted(cats.items()))[:300],
        'generic_sports_hits': '|'.join(generic)[:120],
        'name_suggests_sports': 'yes' if name_sports else '',
    }


if __name__ == '__main__':
    src, out = sys.argv[1], sys.argv[2]
    rows = list(csv.DictReader(open(src, encoding='utf-8')))
    with ThreadPoolExecutor(max_workers=8) as ex:
        results = list(ex.map(run, rows))
    with open(out, 'w', newline='', encoding='utf-8') as f:
        w = csv.DictWriter(f, fieldnames=list(results[0].keys()))
        w.writeheader()
        w.writerows(results)
    from collections import Counter
    for k, v in Counter(r['verdict'] for r in results).most_common():
        print(f'  {v:>4}  {k}')
    print(f'wrote {out}')
