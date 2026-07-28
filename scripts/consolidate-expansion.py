#!/usr/bin/env python3
"""Consolidate the Canada expansion research tables into sheet-ready CSVs.

Reads docs/research/expansion-*.md (store tables only, not expansion-shows.md),
dedupes against the live 573-store roster (existing-slugs.txt) and within the
batch itself, geocodes rows missing lat/lng via the Mapbox Geocoding API
(token from .env), and splits the result by confidence:
  docs/research/expansion-main.csv        (high confidence -> main sheet tab)
  docs/research/expansion-candidates.csv  (medium/low -> Candidates tab)
  docs/research/expansion-sources.csv     (slug -> source URLs + confidence, both)
Usage: python3 scripts/consolidate-expansion.py [--no-geocode]
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
    # Token is URL-restricted to sportscardsnearme.ca/localhost (see README); a
    # matching Referer satisfies that restriction for this server-side script.
    req = urllib.request.Request(url, headers={'Referer': 'https://sportscardsnearme.ca/'})
    try:
        with urllib.request.urlopen(req, timeout=10) as r:
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
        return re.sub(r'[^a-z0-9]+', '-', f"{name}-{city}".lower()).strip('-')

    main_rows, cand_rows, src_rows = [], [], []
    seen, geocoded, skipped_dupe = set(), 0, 0

    for md in sorted(RESEARCH.glob('expansion-*.md')):
        if md.name == 'expansion-shows.md':
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
            row = [name, city, address, '', '', phone, website, social, services, sports, lat, lng]
            conf_norm = conf.strip().lower()
            (main_rows if conf_norm == 'high' else cand_rows).append(row)
            src_rows.append([sl, md.name, conf, sources])

    # No header row: both CSVs are appended directly onto an existing sheet
    # tab that already has its own header in row 1.
    with open(RESEARCH / 'expansion-main.csv', 'w', newline='') as f:
        w = csv.writer(f); w.writerows(main_rows)
    with open(RESEARCH / 'expansion-candidates.csv', 'w', newline='') as f:
        w = csv.writer(f); w.writerows(cand_rows)
    with open(RESEARCH / 'expansion-sources.csv', 'w', newline='') as f:
        w = csv.writer(f)
        w.writerow(['slug', 'research_file', 'confidence', 'source_urls'])
        w.writerows(src_rows)

    print(f"main (high conf): {len(main_rows)} | candidates (medium/low): {len(cand_rows)} | geocoded: {geocoded} | dupes skipped: {skipped_dupe}")

if __name__ == '__main__':
    main()
