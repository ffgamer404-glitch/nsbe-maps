#!/usr/bin/env python3
"""Snap the outdoor edges of the campus graph onto real footpaths.

The routing graph joins hand-placed waypoints with straight lines. Drawn on a
map, a straight line between two waypoints cuts across whatever happens to be
between them, buildings included. For indoor and tunnel edges that is fine,
because the route really does go through (or under) the building. For
outdoor edges it is wrong: nobody walks through Gosnell Hall to get to the
Quarter Mile.

This script fetches the footpaths OpenStreetMap knows about, routes each
outdoor edge along them, and writes the resulting polylines to
data/outdoor_paths.json. campus.json is not touched: the paths are derived
from OpenStreetMap and therefore carry the ODbL share-alike obligation, which
the chapter's own survey data should not inherit.

Run it after changing the outdoor edges or when OSM footpaths improve.
Source: OpenStreetMap contributors, ODbL 1.0.
"""
import heapq
import json
import math
import os
import time
import urllib.parse
import urllib.request

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CAMPUS = os.path.join(HERE, 'data', 'campus.json')
OUT = os.path.join(HERE, 'data', 'outdoor_paths.json')

# S, W, N, E — the core of campus, with a margin.
BBOX = (43.0790, -77.6870, 43.0900, -77.6640)

# Footpaths and the service lanes students actually walk. Parking aisles and
# driveways are left out, and so is anything private.
QUERY = f"""
[out:json][timeout:120];
way["highway"~"^(footway|path|pedestrian|steps|living_street|service|cycleway|track|residential)$"]
   ["access"!~"^(private|no)$"]
   ["service"!~"^(parking_aisle|driveway)$"]
   ({BBOX[0]},{BBOX[1]},{BBOX[2]},{BBOX[3]});
out body geom;
"""

ENDPOINTS = [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
]

# An endpoint further than this from any footpath is not on the network; the
# edge keeps its straight line rather than inventing a connector.
MAX_SNAP_M = 90.0
# A detour much longer than the straight line usually means the snap went to
# the wrong side of something. Flag it; the report is for a human to read.
SUSPECT_RATIO = 2.4


def fetch():
    last = None
    for attempt, ep in enumerate([e for e in ENDPOINTS for _ in range(3)]):
        try:
            req = urllib.request.Request(
                ep,
                data=urllib.parse.urlencode({'data': QUERY}).encode(),
                headers={'User-Agent': 'nsbe-maps/1.0 (RIT student project)'})
            with urllib.request.urlopen(req, timeout=150) as r:
                raw = r.read()
            if not raw.startswith(b'{'):
                raise RuntimeError('not json: ' + raw[:100].decode('utf8', 'replace'))
            return json.loads(raw)
        except Exception as e:
            last = e
            wait = 8 * (attempt + 1)
            print(f'  retry in {wait}s after: {str(e)[:80]}')
            time.sleep(wait)
    raise SystemExit(f'overpass unreachable: {last}')


def metres(a, b):
    """a, b are (lat, lon). Equirectangular is exact enough at campus scale."""
    dy = (a[0] - b[0]) * 111000.0
    dx = (a[1] - b[1]) * 111000.0 * math.cos(math.radians(a[0]))
    return math.hypot(dx, dy)


def build_graph(osm):
    pos = {}      # node id -> (lat, lon)
    adj = {}      # node id -> [(neighbour id, metres)]
    for way in osm.get('elements', []):
        ids = way.get('nodes') or []
        geom = way.get('geometry') or []
        if len(ids) != len(geom) or len(ids) < 2:
            continue
        for nid, g in zip(ids, geom):
            pos[nid] = (g['lat'], g['lon'])
        for i in range(len(ids) - 1):
            a, b = ids[i], ids[i + 1]
            d = metres(pos[a], pos[b])
            adj.setdefault(a, []).append((b, d))
            adj.setdefault(b, []).append((a, d))
    return pos, adj


def largest_component(adj):
    """Snap only onto the main connected network, or an orphaned path stub
    next to a waypoint would swallow the snap and leave no route."""
    seen, best = set(), set()
    for start in adj:
        if start in seen:
            continue
        comp, stack = set(), [start]
        while stack:
            n = stack.pop()
            if n in comp:
                continue
            comp.add(n)
            stack.extend(nb for nb, _ in adj[n] if nb not in comp)
        seen |= comp
        if len(comp) > len(best):
            best = comp
    return best


def nearest(pos, nodes, point):
    best, best_d = None, float('inf')
    for nid in nodes:
        d = metres(pos[nid], point)
        if d < best_d:
            best, best_d = nid, d
    return best, best_d


def shortest(adj, src, dst):
    dist = {src: 0.0}
    prev = {}
    heap = [(0.0, src)]
    while heap:
        d, n = heapq.heappop(heap)
        if n == dst:
            break
        if d > dist.get(n, float('inf')):
            continue
        for nb, w in adj[n]:
            nd = d + w
            if nd < dist.get(nb, float('inf')):
                dist[nb] = nd
                prev[nb] = n
                heapq.heappush(heap, (nd, nb))
    if dst not in dist:
        return None
    out, at = [], dst
    while at != src:
        out.append(at)
        at = prev[at]
    out.append(src)
    return out[::-1]


def polyline_len(coords):
    return sum(metres((a[1], a[0]), (b[1], b[0])) for a, b in zip(coords, coords[1:]))


print('loading campus graph...')
graph = json.load(open(CAMPUS))['CAMPUS_GRAPH']
nodes = graph['nodes']
outdoor = [e for e in graph['edges'] if e['type'] == 'outdoor']
print(f'  {len(outdoor)} outdoor edges')

print('querying overpass for footpaths...')
osm = fetch()
pos, adj = build_graph(osm)
main = largest_component(adj)
print(f'  {len(osm.get("elements", []))} ways, {len(pos)} nodes, '
      f'{len(main)} in the main network')

paths, report = {}, []
for e in outdoor:
    a, b = nodes[e['from']], nodes[e['to']]
    pa, pb = tuple(a['coords']), tuple(b['coords'])
    straight = metres(pa, pb)

    sa, da = nearest(pos, main, pa)
    sb, db = nearest(pos, main, pb)
    key = f'{e["from"]}>{e["to"]}'

    row = {'edge': key, 'straight': straight, 'snapA': da, 'snapB': db,
           'path': None, 'note': ''}

    if da > MAX_SNAP_M or db > MAX_SNAP_M:
        row['note'] = f'endpoint off the network ({da:.0f} m / {db:.0f} m): kept straight'
    elif sa == sb:
        row['note'] = 'both ends snap to the same footpath node: kept straight'
    else:
        ids = shortest(adj, sa, sb)
        if not ids:
            row['note'] = 'no footpath route between the snapped ends: kept straight'
        else:
            line = [[pa[1], pa[0]]]
            line += [[round(pos[i][1], 6), round(pos[i][0], 6)] for i in ids]
            line += [[pb[1], pb[0]]]
            length = polyline_len(line)
            ratio = length / straight if straight else 1
            if ratio > SUSPECT_RATIO:
                # Do not make the route worse. A 50 m hop that "snaps" to a
                # 380 m detour is a gap in OSM, not a real path, and the app
                # would then tell people it is 380 m. Keep the straight line.
                row['note'] = (f'REJECTED: footpath route is {ratio:.1f}x the straight '
                               f'line (likely a gap in OSM): kept straight')
            else:
                row['path'] = line
                row['pathLen'] = length
                paths[key] = line
    report.append(row)

with open(OUT, 'w') as f:
    json.dump({
        '_attribution': '© OpenStreetMap contributors (ODbL 1.0). Footpath geometry '
                        'derived from OSM ways; see NOTICE.md.',
        '_generator': 'tools/snap_outdoor_paths.py',
        'paths': paths,
    }, f, separators=(',', ':'))

print(f'\n{"edge":28} {"straight":>8} {"on paths":>9} {"snap A/B":>11}  note')
print('-' * 86)
for r in report:
    pl = f'{r["pathLen"]:.0f} m' if r['path'] else '   -'
    print(f'{r["edge"]:28} {r["straight"]:6.0f} m {pl:>9} '
          f'{r["snapA"]:4.0f}/{r["snapB"]:<4.0f} m  {r["note"]}')

print(f'\nsnapped {len(paths)} of {len(outdoor)} outdoor edges -> {OUT}')
