#!/usr/bin/env python3
"""Scrape store logos into pin-sized webp chips.

Reads src/data/stores.json; for each store with a website and no existing
public/logos/<slug>.webp, fetches the site's apple-touch-icon / favicon /
og:image, normalizes to 64x64 webp, and rewrites src/data/logos.json as the
sorted list of slugs that have a logo file on disk.
Usage: python3 scripts/scrape-logos.py
"""
import json, re, io, pathlib, urllib.request, urllib.parse, concurrent.futures
from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / 'public/logos'
UA = {'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120 Safari/537.36'}

def fetch(url, timeout=6):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read()

def candidates(html, base):
    cands = []
    for m in re.finditer(r'<link[^>]+rel=["\']([^"\']*)["\'][^>]*>', html, re.I):
        rel = m.group(1).lower()
        if 'apple-touch-icon' in rel or rel in ('icon', 'shortcut icon'):
            href = re.search(r'href=["\']([^"\']+)["\']', m.group(0))
            if href:
                cands.append((0 if 'apple-touch-icon' in rel else 1, urllib.parse.urljoin(base, href.group(1))))
    og = re.search(r'<meta[^>]+property=["\']og:image["\'][^>]+content=["\']([^"\']+)["\']', html, re.I)
    if og:
        cands.append((2, urllib.parse.urljoin(base, og.group(1))))
    cands.append((3, urllib.parse.urljoin(base, '/favicon.ico')))
    return [u for _, u in sorted(cands, key=lambda x: x[0])]

def grab(store):
    slug, site = store['slug'], store.get('website')
    if not site or (OUT / f'{slug}.webp').exists():
        return None
    try:
        html = fetch(site).decode('utf-8', 'ignore')
    except Exception:
        return None
    for url in candidates(html, site):
        if url.lower().endswith('.svg'):
            continue
        try:
            img = Image.open(io.BytesIO(fetch(url)))
            img.load()
            if img.size[0] < 24 or img.size[1] < 24:
                continue
            img = img.convert('RGBA')
            img.thumbnail((64, 64), Image.LANCZOS)
            canvas = Image.new('RGBA', (64, 64), (0, 0, 0, 0))
            canvas.paste(img, ((64 - img.size[0]) // 2, (64 - img.size[1]) // 2))
            canvas.save(OUT / f'{slug}.webp', 'WEBP', quality=82)
            return slug
        except Exception:
            continue
    return None

def main():
    OUT.mkdir(exist_ok=True)
    stores = json.load(open(ROOT / 'src/data/stores.json'))
    with concurrent.futures.ThreadPoolExecutor(max_workers=10) as ex:
        new = [s for s in ex.map(grab, stores) if s]
    have = sorted(p.stem for p in OUT.glob('*.webp'))
    json.dump(have, open(ROOT / 'src/data/logos.json', 'w'), indent=1)
    print(f'new logos: {len(new)} | total on disk: {len(have)}')

if __name__ == '__main__':
    main()
