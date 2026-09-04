#!/usr/bin/env python3
"""Scrape store logos into pin-sized webp chips.

Reads src/data/stores.json; for each store with a website and no existing
public/logos/<slug>.webp, fetches the site's apple-touch-icon / favicon /
og:image, normalizes to 64x64 webp, and rewrites src/data/logos.json as the
sorted list of slugs that have a logo file on disk. Candidates previously
rejected by eye are recorded in src/data/logos-rejected.json (hand-maintained,
not generated) and skipped rather than re-downloaded.
Usage: python3 scripts/scrape-logos.py
"""
import json, re, io, pathlib, hashlib, urllib.request, urllib.parse, concurrent.futures
from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / 'public/logos'
UA = {'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120 Safari/537.36'}

# Hosts whose favicon/apple-touch-icon/og:image is always the PLATFORM's own
# branding, never the store's — a `website` pointed here can only ever yield
# a platform icon, so skip fetching it at all. (Site builders like
# square.site / Google Sites are deliberately NOT here: stores frequently
# upload real logos there, confirmed while cleaning up logos.json.)
PLATFORM_HOSTS = (
    'instagram.com', 'facebook.com', 'fb.com', 'linktr.ee', 'linktree.com',
    'twitter.com', 'x.com', 'tiktok.com', 'youtube.com', 'wa.me',
    'ebay.com', 'ebay.ca', 'etsy.com', 'myshopify.com',
)

# Substrings of *source* candidate URLs that are always a site-builder's own
# default placeholder, never a store's real logo — checked before download.
# These sit on stores' own custom domains (so PLATFORM_HOSTS can't catch
# them), but the CDN path is a fixed platform asset regardless of which
# store's site references it. Found while cleaning up logos.json: three
# different GoDaddy Website Builder stores all served the same
# logo-default.png, and Shopify's own no-image.gif showed up as an og:image
# on stores that hadn't set a real share image. (Byte/pixel hashing these
# doesn't work — GoDaddy's CDN resizes on the fly and returns non-identical
# bytes/pixels per request for the "same" default image.)
PLATFORM_ASSET_URL_PATTERNS = (
    'wsimg.com/isteam/ip/static/pwa-app/logo-default',  # GoDaddy Website Builder default logo
    '/cdn/shopifycloud/storefront/assets/no-image',  # Shopify built-in "no image" placeholder
)

# md5 of decoded RGBA pixel data (not the encoded webp bytes, which vary run
# to run) for known platform-icon renders, found by grouping public/logos/*
# by hash and spotting the same image shared across 3+ unrelated stores.
# Belt-and-suspenders against PLATFORM_HOSTS/PLATFORM_ASSET_URL_PATTERNS
# missing a case.
PLATFORM_ICON_PIXEL_HASHES = {
    '9e214e496b95727995b55eb232be0c94',  # Instagram app icon
    'b76cd8c068aafc6d98e97386fadbf6e4',  # Linktree icon (green square, asterisk)
    'a134bfeb1196e2fb98bac80933de8675',  # Shopify default favicon (light hexagon)
}

# Hand-maintained (never generated) record of scraped candidates a human rejected
# by eye -- see src/data/logos-rejected.json for why this file has to exist at all.
# Keyed on (slug, exact source URL): a slug-only denylist would lock a shop out
# forever, even after it uploads a real logo at a different URL, so we key on the
# URL too and let a changed source re-surface for review.
REJECTED_PATH = ROOT / 'src/data/logos-rejected.json'
REJECTED = set()
if REJECTED_PATH.exists():
    REJECTED = {(r['slug'], r['url']) for r in json.load(open(REJECTED_PATH))['rejected']}
skipped_rejected = []

def is_platform_site(url):
    host = urllib.parse.urlparse(url).netloc.lower()
    if host.startswith('www.'):
        host = host[4:]
    if host == 'google.com' and urllib.parse.urlparse(url).path.startswith('/maps'):
        return True
    return any(host == h or host.endswith('.' + h) for h in PLATFORM_HOSTS)

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
    if not site or is_platform_site(site) or (OUT / f'{slug}.webp').exists():
        return None
    try:
        html = fetch(site).decode('utf-8', 'ignore')
    except Exception:
        return None
    for url in candidates(html, site):
        low = url.lower()
        if low.endswith('.svg') or any(p in low for p in PLATFORM_ASSET_URL_PATTERNS):
            continue
        if (slug, url) in REJECTED:
            skipped_rejected.append(slug)
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
            if hashlib.md5(canvas.tobytes()).hexdigest() in PLATFORM_ICON_PIXEL_HASHES:
                continue
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
    if skipped_rejected:
        print(f'skipped (previously rejected, see logos-rejected.json): {", ".join(sorted(set(skipped_rejected)))}')

if __name__ == '__main__':
    main()
