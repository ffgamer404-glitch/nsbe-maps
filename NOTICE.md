# Notice — what the MIT licence does not cover

The [LICENSE](LICENSE) file is MIT and it covers **the code**. Several files
in this repository are not code and carry their own terms. Read this before
redistributing them.

| File | Origin | Terms |
|---|---|---|
| `data/rit_buildings.geojson` | OpenStreetMap contributors | [ODbL 1.0](https://opendatacommons.org/licenses/odbl/1-0/) |
| `assets/map-*.jpg`, `docs/map-*.jpg` | Captures of OSM-derived rendering | Credit OpenStreetMap contributors |
| `assets/nsbe_logo.svg` | National Society of Black Engineers | Trademark — not licensed here |
| `assets/rit_logo.svg` | Rochester Institute of Technology | Trademark — not licensed here |
| `data/campus.json` | NSBE RIT Chapter #103, surveyed on foot | MIT, with the code |
| `data/campus_life.json` | Invented placeholder content | MIT, but see below |

## The OpenStreetMap data

The ODbL is **share-alike for the database**. If you publish a modified
version of the building footprints, that derived database has to be offered
under the ODbL too. That obligation applies to the data and does not travel
into this project's MIT-licensed code.

The attribution must stay visible on any map drawn from it. That is a licence
condition, not a courtesy. It is currently rendered in the map's bottom-right
corner and in the GeoJSON's own `attribution` field.

## The logos

The NSBE and RIT marks are in this repository because this is a chapter
project built with the chapter and with the university, as a non-commercial
prototype for Imagine RIT. **They are not licensed to you.** If you fork this,
replace them with your own.

## The club and faculty listings

`data/campus_life.json` is MIT like the rest of the code, but everything in it
is fictional — invented to build the feature, and labelled as such in the file
and in the interface. It is not a fact about RIT. See
[`data/README.md`](data/README.md).
