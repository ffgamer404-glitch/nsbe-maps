#!/usr/bin/env python3
"""Pull RIT campus building footprints from OpenStreetMap into GeoJSON.

Writes data/rit_buildings.geojson. Run it when the campus changes — new
construction shows up in OSM long before anyone updates a PDF map.

Source: OpenStreetMap contributors, ODbL 1.0. The attribution is a licence
condition and has to stay visible wherever this data is drawn.
"""
import json
import os
import time
import urllib.parse
import urllib.request

# S, W, N, E around the Henrietta campus.
BBOX = (43.078, -77.690, 43.095, -77.658)

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(HERE, 'data', 'rit_buildings.geojson')

QUERY = f"""
[out:json][timeout:180];
(
  way["building"]({BBOX[0]},{BBOX[1]},{BBOX[2]},{BBOX[3]});
  relation["building"]({BBOX[0]},{BBOX[1]},{BBOX[2]},{BBOX[3]});
);
out body geom;
"""

ENDPOINTS = [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
]


def fetch():
    """Overpass is a shared public service and is often at capacity.
    Back off rather than hammering it."""
    last = None
    for attempt, ep in enumerate([e for e in ENDPOINTS for _ in range(3)]):
        try:
            req = urllib.request.Request(
                ep,
                data=urllib.parse.urlencode({'data': QUERY}).encode(),
                headers={'User-Agent': 'nsbe-maps/1.0 (RIT student project)'})
            with urllib.request.urlopen(req, timeout=200) as r:
                raw = r.read()
            if not raw.startswith(b'{'):
                raise RuntimeError('not json: ' + raw[:120].decode('utf8', 'replace'))
            return json.loads(raw)
        except Exception as e:
            last = e
            wait = 8 * (attempt + 1)
            print(f'  retry in {wait}s after: {str(e)[:90]}')
            time.sleep(wait)
    raise SystemExit(f'overpass unreachable: {last}')


def height_of(tags):
    """Metres. Prefer a surveyed height, then floor count, then a default
    low enough to read as a shed and tall enough to read as a building."""
    h = tags.get('height')
    if h:
        try:
            return float(str(h).replace('m', '').strip())
        except ValueError:
            pass
    levels = tags.get('building:levels')
    if levels:
        try:
            return float(levels) * 3.6
        except ValueError:
            pass
    return 7.0


print('querying overpass...')
data = fetch()
elements = data.get('elements', [])
print(f'  {len(elements)} elements')

features = []
for el in elements:
    geom = el.get('geometry')
    if not geom or len(geom) < 4:
        continue

    ring = [[round(p['lon'], 6), round(p['lat'], 6)] for p in geom]
    if ring[0] != ring[-1]:
        ring.append(ring[0])

    tags = el.get('tags', {})
    name = tags.get('name', '')

    features.append({
        'type': 'Feature',
        'id': el['id'],
        'properties': {
            'name': name,
            'height': height_of(tags),
            'levels': tags.get('building:levels', ''),
            'kind': tags.get('building', 'yes'),
            # RIT writes the building number into the name, as "... (9)".
            'ritnum': (name.split('(')[-1].rstrip(')').strip()
                       if name.endswith(')') and '(' in name else ''),
        },
        'geometry': {'type': 'Polygon', 'coordinates': [ring]},
    })

os.makedirs(os.path.dirname(OUT), exist_ok=True)
with open(OUT, 'w') as f:
    json.dump({
        'type': 'FeatureCollection',
        'attribution': '© OpenStreetMap contributors (ODbL)',
        'features': features,
    }, f, separators=(',', ':'))

named = sum(1 for f in features if f['properties']['name'])
numbered = sum(1 for f in features if f['properties']['ritnum'])
print(f'wrote {len(features)} buildings -> {OUT}')
print(f'  named: {named}   with RIT number: {numbered}')
print(f'  size: {os.path.getsize(OUT) / 1024:.0f} KB')
