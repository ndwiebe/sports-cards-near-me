#!/usr/bin/env python3
"""Consolidate Plan 3 research tables into a sheet-ready CSV.

Reads docs/research/plan3-*.md markdown tables, normalizes to the Google
Sheet's column order, geocodes rows missing lat/lng via the Mapbox
Geocoding API (token from .env), and writes:
  docs/research/consolidated-candidates.csv  (paste-ready, sheet column order)
  docs/research/consolidated-sources.csv     (slug -> source URLs + confidence)
Usage: python3 scripts/consolidate-candidates.py [--no-geocode]
"""
import csv, json, pathlib, re, sys, time, urllib.parse, urllib.request

ROOT = pathlib.Path(__file__).resolve().parent.parent
RESEARCH = ROOT / 'docs/research'
TOKEN = ''
env = ROOT / '.env'
if env.exists():
    for line in env.read_text().splitlines():
        if line.startswith('PUBLIC_MAPBOX_TOKEN='):
            TOKEN = line.split('=', 1)[1].strip()

def rows_from(md_path):
    rows = []
    for line in md_path.read_text().splitlines():
        # accept pipe tables with or without leading/trailing pipes
        if line.count('|') < 12:
            continue
        cells = [c.strip() for c in line.strip().strip('|').split('|')]
        if len(cells) < 13 or cells[0] in ('Name', '') or set(cells[0]) <= {'-', ' ', ':'}:
            continue
        rows.append(cells[:13])
    return rows

def geocode(address, city, province):
    if not TOKEN:
        return '', ''
    q = urllib.parse.quote(f"{address}, {city}, {province}, Canada")
    url = f"https://api.mapbox.com/geocoding/v5/mapbox.places/{q}.json?country=CA&limit=1&access_token={TOKEN}"
    try:
        with urllib.request.urlopen(url, timeout=10) as r:
            d = json.load(r)
        feats = d.get('features') or []
        if feats:
            lng, lat = feats[0]['center']
            return f"{lat:.5f}", f"{lng:.5f}"
    except Exception:
        pass
    return '', ''

def main():
    do_geo = '--no-geocode' not in sys.argv
    existing = set((RESEARCH / 'existing-slugs.txt').read_text().strip().split(';'))
    def slug(name, city):
        s = re.sub(r'[^a-z0-9]+', '-', f"{name}-{city}".lower()).strip('-')
        return s
    out_rows, src_rows, seen, geocoded, skipped_dupe = [], [], set(), 0, 0
    for md in sorted(RESEARCH.glob('plan3-*.md')):
        if md.name == 'plan3-audit.md':
            continue
        for c in rows_from(md):
            name, city, address, province, phone, website, social, services, sports, lat, lng, sources, conf = c
            sl = slug(name, city)
            if sl in existing or sl in seen:
                skipped_dupe += 1
                continue
            seen.add(sl)
            if do_geo and (not lat or not lng) and address:
                lat, lng = geocode(address, city, province)
                if lat:
                    geocoded += 1
                time.sleep(0.12)
            out_rows.append([name, city, address, '', '', phone, website, social, services, sports, lat, lng])
            src_rows.append([sl, md.name, conf, sources])
    with open(RESEARCH / 'consolidated-candidates.csv', 'w', newline='') as f:
        w = csv.writer(f)
        w.writerow(['Store Name', 'City', 'Address', 'Rating', 'Hours', 'Phone', 'Website', 'Social Media Links', 'Services', 'Sports/TCG Available', 'lat', 'lng'])
        w.writerows(out_rows)
    with open(RESEARCH / 'consolidated-sources.csv', 'w', newline='') as f:
        w = csv.writer(f)
        w.writerow(['slug', 'research_file', 'confidence', 'source_urls'])
        w.writerows(src_rows)
    print(f"candidates: {len(out_rows)} | geocoded: {geocoded} | dupes skipped: {skipped_dupe}")

if __name__ == '__main__':
    main()
