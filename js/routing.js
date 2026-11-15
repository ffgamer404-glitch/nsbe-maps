/* ═══════════════════════════════════════════════════════════════════
   ROUTING — from where you are to where you are going.

   The graph is 40 hand-placed waypoints and 49 edges, each tagged outdoor,
   indoor, portal or tunnel. It is a schematic of the campus, not a survey:
   the waypoints are approximate and the tunnel geometry in particular has
   not been verified against RIT's own plans.

   The profiles are opinions about February, expressed as multipliers —
   "inside" makes a metre outdoors cost five, which is roughly how it feels
   crossing the Quarter Mile in a wind.
   ═══════════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  const WEIGHTS = {
    /* Shortest line, whatever the weather does to you. */
    fastest: { outdoor: 1.0, indoor: 1.0, tunnel: 1.0, portal: 0 },
    /* Stay inside. Outdoors is punished; portals cost a flat 15 m for
       the door, the stairs and the wait. */
    comfort: { outdoor: 5.0, indoor: 0.8, tunnel: 0.7, portal: 15 },
    /* A compromise for a day that is merely unpleasant. */
    best:    { outdoor: 2.0, indoor: 0.9, tunnel: 0.9, portal: 8 }
  };

  /* The order the options are offered in, and what each is called. */
  const PROFILES = [
    { key: 'comfort', label: 'Stay inside' },
    { key: 'best',    label: 'Balanced' },
    { key: 'fastest', label: 'Shortest' }
  ];

  const WALK_M_PER_MIN = 78;     /* a student late for a lecture */

  function metres(a, b) {
    const dy = (a[0] - b[0]) * 111000;
    const dx = (a[1] - b[1]) * 111000 * Math.cos(a[0] * Math.PI / 180);
    return Math.hypot(dx, dy);
  }

  /* Length of a [[lng, lat], …] polyline, in metres. */
  function lengthOf(line) {
    let sum = 0;
    for (let i = 0; i < line.length - 1; i++) {
      sum += metres([line[i][1], line[i][0]], [line[i + 1][1], line[i + 1][0]]);
    }
    return sum;
  }

  /* paths: optional { "from>to": [[lng, lat], …] } — footpath geometry for
     outdoor edges. Where there is none the edge is a straight line. */
  function Router(graph, paths) {
    this.nodes = graph.nodes;
    this.adj = {};
    paths = paths || {};

    /* Undirected: every edge is walkable both ways. */
    (graph.edges || []).forEach(e => {
      const a = this.nodes[e.from], b = this.nodes[e.to];
      if (!a || !b) return;

      const straight = [[a.coords[1], a.coords[0]], [b.coords[1], b.coords[0]]];
      const snapped = e.type === 'outdoor' ? paths[e.from + '>' + e.to] : null;
      const geom = (snapped && snapped.length > 1) ? snapped : straight;
      const d = lengthOf(geom);

      (this.adj[e.from] = this.adj[e.from] || [])
        .push({ to: e.to, dist: d, type: e.type, label: e.label, geom: geom });
      (this.adj[e.to] = this.adj[e.to] || [])
        .push({ to: e.from, dist: d, type: e.type, label: e.label, geom: geom.slice().reverse() });
    });
  }

  /* Snap a GPS fix onto the graph. Returns the key of the nearest node
     and how far off it was, so the caller can say "you are not on campus"
     rather than silently routing from somewhere absurd. */
  Router.prototype.nearest = function (lngLat) {
    const here = [lngLat[1], lngLat[0]];     /* graph stores [lat, lng] */
    let best = null, bestD = Infinity;
    for (const k in this.nodes) {
      const d = metres(here, this.nodes[k].coords);
      if (d < bestD) { bestD = d; best = k; }
    }
    return { key: best, metres: bestD };
  };

  Router.prototype.route = function (start, goal, profile) {
    if (start === goal) return null;

    const w = WEIGHTS[profile] || WEIGHTS.fastest;
    const dist = {}, prev = {}, via = {};
    for (const k in this.nodes) dist[k] = Infinity;
    dist[start] = 0;

    /* A sorted array is fine at 40 nodes; a heap would be ceremony. */
    const queue = [{ node: start, cost: 0 }];
    const done = {};

    while (queue.length) {
      queue.sort((a, b) => a.cost - b.cost);
      const { node: curr, cost } = queue.shift();
      if (done[curr]) continue;
      done[curr] = true;
      if (curr === goal) break;

      (this.adj[curr] || []).forEach(e => {
        /* A portal is a fixed penalty (a door), not a scaled distance. */
        const step = (e.type === 'portal') ? (e.dist + w.portal) : e.dist * w[e.type];
        const alt = cost + step;
        if (alt < dist[e.to]) {
          dist[e.to] = alt;
          prev[e.to] = curr;
          via[e.to] = e;
          queue.push({ node: e.to, cost: alt });
        }
      });
    }

    if (dist[goal] === Infinity) return null;

    /* Walk the chain back. */
    const path = [];
    const legs = [];
    let at = goal;
    while (at !== undefined) {
      path.unshift(at);
      if (via[at]) legs.unshift(via[at]);
      at = prev[at];
    }

    let real = 0, outdoor = 0, tunnel = 0, portals = 0;
    legs.forEach(e => {
      real += e.dist;
      if (e.type === 'outdoor') outdoor += e.dist;
      if (e.type === 'tunnel') tunnel += e.dist;
      if (e.type === 'portal') portals++;
    });

    /* One line per leg, tagged with what kind of leg it is, so the map can
       draw outdoors solid and indoors or underground dashed. */
    const segments = legs.map(e => ({ kind: e.type, coordinates: e.geom }));

    return {
      path, legs, segments,
      metres: real,
      minutes: Math.max(1, Math.round(real / WALK_M_PER_MIN)),
      outdoorMetres: outdoor,
      tunnelMetres: tunnel,
      portals,
      /* The number that actually matters in a Rochester winter. */
      exposure: real > 0 ? outdoor / real : 0
    };
  };

  /* Run all three profiles and group the ones that agree.

     Offering three buttons that produce two answers makes two of them look
     broken. If "Balanced" and "Shortest" are the same walk, say so once:
     "Balanced · Shortest". */
  Router.prototype.compare = function (start, goal) {
    const groups = [];

    PROFILES.forEach(p => {
      const result = this.route(start, goal, p.key);
      if (!result) return;

      const signature = result.path.join('>');
      const existing = groups.find(g => g.signature === signature);
      if (existing) {
        existing.labels.push(p.label);
        existing.profiles.push(p.key);
      } else {
        groups.push({
          signature,
          labels: [p.label],
          profiles: [p.key],
          result
        });
      }
    });

    return groups.map(g => ({
      label: g.labels.join(' · '),
      profiles: g.profiles,
      result: g.result
    }));
  };

  /* Turn-by-turn, in words. One line per run of legs of the same kind, so
     it does not read like a checklist. */
  Router.prototype.describe = function (result) {
    if (!result) return [];
    const steps = [];
    let run = null;

    result.legs.forEach((e, i) => {
      const to = this.nodes[result.path[i + 1]];
      const kind = e.type;

      if (run && run.kind === kind) {
        run.metres += e.dist;
        run.to = to;
      } else {
        if (run) steps.push(run);
        run = { kind, metres: e.dist, to, label: e.label };
      }
    });
    if (run) steps.push(run);

    return steps.map(s => {
      const m = Math.round(s.metres);
      const where = s.to ? s.to.name : 'the next point';
      switch (s.kind) {
        case 'tunnel':  return `Follow the tunnel ${m} m to ${where}.`;
        case 'indoor':  return `Continue inside ${m} m to ${where}.`;
        case 'portal':  return `Take the portal into ${where}.`;
        default:        return `Walk outside ${m} m to ${where}.`;
      }
    });
  };

  Router.WEIGHTS = WEIGHTS;
  Router.PROFILES = PROFILES;
  global.Router = Router;
})(window);
