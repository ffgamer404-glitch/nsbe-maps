/* ═══════════════════════════════════════════════════════════════════
   ROUTING — from where you are to where you are going.

   The graph and the profile weights are the chapter's own, ported from
   the Leaflet map: 40 nodes, 49 edges, each edge tagged outdoor, indoor,
   portal or tunnel. The profiles are opinions about February, expressed
   as multipliers — "comfort" makes a metre outdoors cost five, which is
   roughly how it feels crossing the Quarter Mile in a wind.
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

  const WALK_M_PER_MIN = 78;     /* a student late for a lecture */

  function metres(a, b) {
    const dy = (a[0] - b[0]) * 111000;
    const dx = (a[1] - b[1]) * 111000 * Math.cos(a[0] * Math.PI / 180);
    return Math.hypot(dx, dy);
  }

  function Router(graph) {
    this.nodes = graph.nodes;
    this.adj = {};

    /* Undirected: every edge is walkable both ways. */
    (graph.edges || []).forEach(e => {
      const a = this.nodes[e.from], b = this.nodes[e.to];
      if (!a || !b) return;
      const d = metres(a.coords, b.coords);
      (this.adj[e.from] = this.adj[e.from] || []).push({ to: e.to, dist: d, type: e.type, label: e.label });
      (this.adj[e.to] = this.adj[e.to] || []).push({ to: e.from, dist: d, type: e.type, label: e.label });
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
        const mult = w[e.type];
        /* A portal is a fixed penalty (a door), not a scaled distance. */
        const step = (e.type === 'portal') ? (e.dist + w.portal) : e.dist * mult;
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

    return {
      path, legs,
      metres: real,
      minutes: Math.max(1, Math.round(real / WALK_M_PER_MIN)),
      outdoorMetres: outdoor,
      tunnelMetres: tunnel,
      portals,
      /* The number that actually matters in a Rochester winter. */
      exposure: real > 0 ? outdoor / real : 0,
      coordinates: path.map(k => {
        const c = this.nodes[k].coords;
        return [c[1], c[0]];                 /* to GeoJSON order */
      })
    };
  };

  /* Turn-by-turn, in words. One line per edge, merged when consecutive
     legs are the same kind so it does not read like a checklist. */
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
  global.Router = Router;
})(window);
