# Data

Four files, three different origins, three different licences. Read this
before you redistribute any of them, and before you trust any of them.

---

## `rit_buildings.geojson` — 277 building footprints

**Source:** OpenStreetMap contributors
**Licence:** [ODbL 1.0](https://opendatacommons.org/licenses/odbl/1-0/)
**Fetched:** 2026-10-29

Polygons, heights and names for every building in a box around the Henrietta
campus. Heights come from `height` where a surveyor recorded one, otherwise
from `building:levels × 3.6 m`, otherwise a 7 m default so the block still
reads as a block.

The ODbL is **share-alike for the data**. If you publish a modified version of
these footprints, the derived database must also be ODbL. That obligation
stops at the data — it does not reach the MIT-licensed code that draws it.
The attribution has to stay visible on any map that uses it; that is a licence
condition, not a courtesy.

Re-fetch it with:

```bash
python3 tools/fetch_buildings.py
```

---

## `campus.json` — the routing graph

**Source:** NSBE RIT Chapter #103, surveyed on foot
**Licence:** MIT, with the rest of the project

40 nodes and 49 edges. Every edge is tagged `outdoor`, `indoor`, `portal` or
`tunnel`, which is what lets the router answer "get me there without going
outside". 1.07 km of tunnel is digitised so far; the full network is about
2.4 km, so there is real surveying left to do.

Also carries `FMS_BUILDINGS` (hand-traced polygons), `TUNNEL_PORTALS`,
`INDOOR_CLASSROOMS` and `RIT_LOCATIONS`.

This is the most valuable file in the repository and the hardest to replace.
It was measured by students walking the tunnels.

---

## `campus_life.json` — clubs and office hours

**Source:** invented
**Licence:** MIT

**Every club, person, room assignment and time in this file is fictional.**

An earlier draft used the real RIT chapters — NSBE, SHPE, SWE, RITSEC and
others — with schedules made up to build the feature. On a public URL that is
a trap: a student finds a plausible time for a club they actually belong to
and turns up to an empty room. The names were replaced with obvious
placeholders so no invented schedule can be mistaken for a real one.

If you are adding real schedules, get them from the club, not from here, and
delete the `_SAMPLE_DATA` key when none of it is invented any more.

Validate after editing — a wrong node key leaves the entry looking perfectly
fine while routing to it silently fails:

```bash
python3 tools/check_campus_life.py
```

---

## `assets/map-*.jpg` — map captures

Screenshots of this project's own map, which is rendered from OpenStreetMap
data over OpenFreeMap tiles. Treat them as OSM-derived: credit OpenStreetMap
contributors if you reuse them.

---

## Logos

`nsbe_logo.svg` and `rit_logo.svg` are the trademarks of the National Society
of Black Engineers and the Rochester Institute of Technology. They are in this
repository because it is a chapter project built with the chapter and the
university. **They are not covered by the MIT licence and you should not ship
them in a fork** unless you have your own permission to use them.
