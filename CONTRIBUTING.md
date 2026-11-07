# Contributing

This started as a chapter project and it stays useful only if people who
actually walk the campus keep correcting it. You do not need to be in NSBE,
or at RIT, to send a patch.

## Getting it running

```bash
python3 -m http.server 8787
```

Open <http://localhost:8787/mapa3d.html>. That is the whole setup. No build,
no package manager, no keys.

## The shape of the thing

Plain HTML, CSS and JavaScript. No framework, no bundler, no transpiler. That
is deliberate: a student should be able to open a file, read it, change it and
see the result without learning a toolchain first. Please keep it that way
unless there is a reason that survives being said out loud.

Each `js/` file is one self-contained concern attached to `window`. They are
loaded in order by `mapa3d.html` and `js/map3d.js` wires them together.

## What is most worth doing

**Map more tunnel.** About 1.07 km of the roughly 2.4 km network is in the
graph. This is the single most valuable contribution and it requires walking
around with a phone, not writing code. Add nodes and edges to
`CAMPUS_GRAPH` in `data/campus.json`, tag the edges honestly, and say in the
PR how you measured.

**Find Tiger Transit data.** Bus routing is unbuilt because we could not find
a public GTFS feed. If one exists, the graph already supports new edge types.

**Replace the placeholder club data.** Every entry in `data/campus_life.json`
is invented. Real schedules are welcome — confirmed with the club, not
guessed. Delete the `_SAMPLE_DATA` key when nothing in the file is made up
any more.

## Rules that matter

**Do not invent data and ship it unlabelled.** This project tells people
where to walk. A plausible wrong answer is worse than no answer. If something
is a guess, a placeholder or a sample, say so in the file and on screen — the
existing `_SAMPLE_DATA` pattern is there to copy.

**Do not scrape RIT's restricted floor plans.** They are behind a login
because the university put them there. Getting the interiors in is a
conversation with Facilities Management, and someone has to have it.

**Keep the OpenStreetMap attribution on the map.** It is a condition of the
ODbL, not a politeness.

**Do not add a tracker.** No analytics, no pixels, no third-party scripts
that watch people. The only location this app handles is the user's own, it
never leaves their browser, and that should stay true.

## Before you open a PR

Validate any data you touched:

```bash
python3 tools/check_campus_life.py
```

A wrong node key is the nastiest bug in this codebase: the entry renders
perfectly and routing to it fails silently. The validator catches it.

Then open the map and use the thing you changed. Click it. Route through it.
Resize the window. Try it with `prefers-reduced-motion` on — every animation
here has a reduced-motion path and new ones should too.

## Style

Match the file you are in. Beyond that:

- Comment the *why*, not the *what*. `// increment i` helps nobody; "the last
  chapter is short enough that its top never crosses the reading line" does.
- Animate `transform` and `opacity`. Anything else costs layout.
- Controls under 250 ms. Scene transitions can be long and cinematic;
  a button that lags feels broken.
- Gate `:hover` behind `@media (hover: hover)` so touch taps do not stick.
- Nothing readable below 14 px.

## Reporting something wrong with the map

Open an issue and say where you were and what it told you. "It routed me
outside between Gosnell and Gleason when I asked to stay in" is a perfect bug
report. Screenshots help. So does the time of day, if it is about the clubs
panel.
