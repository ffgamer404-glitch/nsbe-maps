# Contributing

This started as a chapter project and it stays useful only if people who
actually walk the campus keep correcting it. You do not need to be in NSBE, or
at RIT, to send a patch.

## Getting it running

```bash
python3 -m http.server 8787
```

Open <http://localhost:8787/mapa3d.html>. That is the whole setup. No build, no
package manager, no keys.

## The shape of the thing

Plain HTML, CSS and JavaScript. No framework, no bundler, no transpiler. That
is deliberate: a student should be able to open a file, read it, change it and
see the result without learning a toolchain first. Please keep it that way
unless there is a reason that survives being said out loud.

Each `js/` file is one self-contained concern attached to `window`. They are
loaded in order by `mapa3d.html` and `js/map3d.js` wires them together.

## What is most worth doing

**Make the tunnels accurate.** The tunnel layout is a schematic. It is not
accurate to RIT's current tunnels, and it has not been checked against
RIT's own plans, which are restricted to RIT accounts. Making it real is not a
coding problem: it needs Facilities Management's agreement to use their plans,
or a survey someone is allowed to make. If you can open that conversation, you
will have done more for this project than any pull request.

**Write down where `campus.json` came from.** The origin of the waypoint
coordinates is not documented anywhere. Someone who knows should record it in
`data/README.md`.

**Find Tiger Transit data.** Bus routing is unbuilt because we could not find a
public GTFS feed. If one exists, the graph already supports new edge types.

**Ask WITR.** The map plays their public stream. They have not been asked.

## Rules that matter

**Do not invent data and ship it unlabelled.** This project tells people where
to walk. A plausible wrong answer is worse than no answer. If something is a
guess, a placeholder or a sample, say so in the file and on screen.

**Do not make claims the data cannot back.** An earlier version of this
repository said the graph was "surveyed on foot". Nobody knows that. Say what
you know, and say what you do not.

**Do not scrape RIT's restricted floor plans or tunnel plans.** They are behind
a login because the university put them there.

**Do not use Google imagery or tiles**, or any imagery whose terms forbid it.
An earlier version did, and it had to be removed. Use OpenStreetMap-derived
data, with the attribution.

**Keep the OpenStreetMap attribution on the map.** It is a condition of the
ODbL, not a politeness.

**Do not add a tracker.** No analytics, no pixels, no third-party scripts that
watch people. The only location this app handles is the user's own, it never
leaves their browser, and that should stay true.

## Before you open a PR

If you touched the outdoor edges or the footpath data, regenerate the paths and
read the report it prints:

```bash
python3 tools/snap_outdoor_paths.py
```

Then open the map and use the thing you changed. Click it. Route through it.
Resize the window down to a phone. Try it with `prefers-reduced-motion` on —
every animation here has a reduced-motion path and new ones should too.

## Style

Match the file you are in. Beyond that:

- Comment the *why*, not the *what*. `// increment i` helps nobody; "the last
  chapter is short enough that its top never crosses the reading line" does.
- Animate `transform` and `opacity`. Anything else costs layout.
- Controls under 250 ms. Scene transitions can be long and cinematic; a button
  that lags feels broken.
- Gate `:hover` behind `@media (hover: hover)` so touch taps do not stick.
- Nothing readable below 14 px, and on a phone nothing touchable below 44 px.
- A scrolling card paints wrongly on mobile Chrome. Make the *inside* of a card
  scroll, not the card.

## Reporting something wrong with the map

Open an issue and say where you were and what it told you. "It routed me
outside between Gosnell and Gleason when I asked to stay in" is a perfect bug
report. Screenshots help.
