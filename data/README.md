# Data

Three files, two different licences and three different origins. Read this before you
redistribute any of them, and before you trust any of them.

---

## `rit_buildings.geojson` — 277 building footprints

**Source:** OpenStreetMap contributors
**Licence:** [ODbL 1.0](https://opendatacommons.org/licenses/odbl/1-0/)
**Fetched:** 2026-10-29

Polygons, heights and names for every building in a box around the Henrietta
campus. Heights come from `height` where a surveyor recorded one, otherwise from
`building:levels × 3.6 m`, otherwise a 7 m default so the block still reads as
a block.

The ODbL is **share-alike for the data**. If you publish a modified version of
these footprints, the derived database must also be ODbL. That obligation stops
at the data. The attribution has to stay visible on any map that uses it.

```bash
python3 tools/fetch_buildings.py
```

---

## `outdoor_paths.json` — footpaths for the outdoor legs

**Source:** OpenStreetMap contributors, derived
**Licence:** ODbL 1.0
**Generated:** 2026-11-14

The routing graph joins waypoints with straight lines, and on a map a straight
line between two waypoints crosses whatever is between them. For outdoor edges
this file holds a route along the footpaths OpenStreetMap knows about.

10 of the 16 outdoor edges are in it. The other 6 are deliberately absent: the
footpath route between their ends came out 2.9 to 7.6 times longer than the
straight line, which means a gap in the OpenStreetMap footpath network rather
than a real detour, and the app would then have told people a 50 m hop was
380 m. They stay straight until the footpath data improves.

It is kept apart from `campus.json` so the chapter's own data does not inherit
the ODbL.

```bash
python3 tools/snap_outdoor_paths.py
```

The script prints a report of every edge, including the rejected ones.

---

## `campus.json` — the routing graph

**Source:** NSBE RIT Chapter #103
**Licence:** MIT, with the rest of the project

40 waypoints and 49 edges. Every edge is tagged `outdoor`, `indoor`, `portal`
or `tunnel`, which is what lets the router answer "get me there without going
outside". About 1.07 km of tunnel is in the graph; the chapter puts the full
network at about 2.4 km, which has not been verified.

Also carries `FMS_BUILDINGS`, `TUNNEL_PORTALS`, `INDOOR_CLASSROOMS` and
`RIT_LOCATIONS`.

**This is a schematic.** It is not surveyed, it has not been checked against
RIT's plans, and it is known not to match the current tunnels. Where the
coordinates originally came from is **not documented**. Someone who knows
should write it down here — an undocumented data source is the thing a
reviewer is right to ask about.

---

## `assets/render-*.jpg` — pictures of the map

Renders of this project's own 3D map, which is drawn from OpenStreetMap data
over OpenFreeMap tiles. The attribution is inside each picture. Credit
OpenStreetMap contributors if you reuse them.

---

## Logos

`nsbe_logo.png` is the RIT NSBE chapter logo, supplied by the chapter.
`rit_logo.svg` is the RIT wordmark. They are trademarks of their owners. They
are in this repository because it is a chapter project built with the chapter
and the university. **They are not covered by the MIT licence and you should
not ship them in a fork** unless you have your own permission to use them.
