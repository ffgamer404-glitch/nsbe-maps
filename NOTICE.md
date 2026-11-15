# Notice — what the MIT licence does not cover

The [LICENSE](LICENSE) file is MIT and it covers **the code**. Several files in
this repository are not code and carry their own terms. Read this before
redistributing them.

| File | Origin | Terms |
|---|---|---|
| `data/rit_buildings.geojson` | OpenStreetMap contributors | [ODbL 1.0](https://opendatacommons.org/licenses/odbl/1-0/) |
| `data/outdoor_paths.json` | Footpaths derived from OpenStreetMap | ODbL 1.0 — kept apart from `campus.json` on purpose |
| `data/campus.json` | NSBE RIT Chapter #103 | MIT, with the code. A schematic; provenance not documented |
| `assets/nsbe_logo.png`, `assets/nsbe_logo@2x.png` | The RIT NSBE chapter logo, supplied by the chapter | Not licensed here — see below |
| `assets/rit_logo.svg` | Rochester Institute of Technology | Trademark — not licensed here |
| `assets/render-*.jpg`, `docs/*.jpg` | Renders of this project's own map | Credit OpenStreetMap contributors |

## The OpenStreetMap data

The ODbL is **share-alike for the database**. If you publish a modified version
of the building footprints or the footpath geometry, that derived database has
to be offered under the ODbL too. That obligation applies to the data and does
not travel into this project's MIT-licensed code.

This is why the footpath geometry lives in its own file. `campus.json` is the
chapter's own data and should not inherit the ODbL by being mixed with it.

The attribution must stay visible on any map drawn from it. That is a licence
condition, not a courtesy. It is rendered in the map's bottom-right corner,
inside every picture exported from the map, and in the GeoJSON's own
`attribution` field.

## The logos

The chapter logo and the RIT wordmark are in this repository because this is a
chapter project built with the chapter and with the university, as a
non-commercial prototype for Imagine RIT. **They are not licensed to you.** The
tiger imagery belongs to RIT. If you fork this, replace them with your own.

The logo in use is the RIT NSBE chapter's, not the national organisation's.
The chapter is not affiliated with national NSBE for the purposes of this
project, and the national mark was removed from the site and the repository for
that reason.

## What was removed, and why

An earlier version of this project loaded Google satellite tiles in a Leaflet
map and used screenshots of them as pictures. That was not permitted, and an
earlier version of this notice described those pictures as OpenStreetMap
derivatives, which was wrong. The Leaflet map and every picture made from it
have been removed. The pictures on the site now are renders of this project's
own map.

## Not used

RIT Facilities Management's floor plans and tunnel plans require an RIT
account and are restricted. They were not used, scraped or copied. See
[`sources.html`](sources.html).
