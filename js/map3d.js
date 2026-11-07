/* ═══════════════════════════════════════════════════════════════════
   NSBEMAPS 3D

   The campus as extruded blocks, in the flat-toy register of a Monopoly
   board: one fill, one edge, no texture, no gradient. Detail comes from
   the footprints being real, not from shading.

   Building geometry: OpenStreetMap contributors, ODbL.
   Tunnel graph and portals: NSBE RIT Chapter #103, hand-surveyed.
   ═══════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  const RIT = [-77.6765, 43.0844];           /* lng, lat - MapLibre order */

  /* A Monopoly board is light pieces on a dark field. The blocks have to
     carry real weight against the ground or 277 of them read as one grey
     mass, which is exactly what the first build did. */
  const COLOUR = {
    ground:   '#070a08',
    building: '#cfd8d0',   /* the piece: bone, not grey */
    shade:    '#8c9a91',   /* its shaded side, at ground level */
    roof:     '#eef2ee',   /* the lit roofline */
    named:    '#e4e9e4',   /* buildings RIT has actually named */
    hot:      '#00ff66',
    tunnel:   '#ff2a4b',
    label:    '#f4f6f4'
  };

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const el = (id) => document.getElementById(id);
  const arrival = el('arrival');
  const bar = el('arrival-bar');
  const word = el('arrival-word');

  let loaded = 0;
  const STAGES = 4;
  function progress(label) {
    loaded++;
    bar.parentElement.style.setProperty('--load', Math.min(loaded / STAGES, 1));
    if (label) word.textContent = label;
  }

  /* ── The map ──────────────────────────────────────────────────── */
  /* Start high and flat: this is the view from above the weather, before
     the fall begins. */
  const map = new maplibregl.Map({
    container: 'map',
    style: 'https://tiles.openfreemap.org/styles/dark',
    center: RIT,
    zoom: reduced ? 15.4 : 10.2,
    pitch: reduced ? 50 : 0,
    bearing: reduced ? -18 : 0,
    attributionControl: { compact: false },
    antialias: true,
    maxPitch: 75
  });

  map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'bottom-right');

  /* ── The fall ─────────────────────────────────────────────────── */
  const clouds = reduced ? null : new Clouds(arrival);

  function descend() {
    /* Logo first, alone, on black. Nothing moves for a beat. */
    const mark = el('arrival-mark');
    requestAnimationFrame(() => {
      mark.style.transition = 'opacity 0.9s var(--ease-reveal), transform 1.2s var(--ease-reveal)';
      mark.style.opacity = '1';
      mark.style.transform = 'scale(1)';
    });

    if (reduced) {
      setTimeout(land, 900);
      return;
    }

    const HOLD = 1500;          /* the logo gets its moment */
    const FALL = 3400;          /* through the decks */

    setTimeout(() => {
      word.textContent = 'Descending';

      /* The camera and the sky run off the same clock, so the ground
         arrives exactly as the last deck sweeps past. */
      map.flyTo({
        center: RIT,
        zoom: 16.4,
        pitch: 58,
        bearing: -18,
        duration: FALL + 900,
        essential: true,
        curve: 1.5
      });

      const t0 = performance.now();
      const voidLayer = el('arrival-void');

      (function fall(now) {
        const p = Math.min((now - t0) / FALL, 1);
        clouds.setProgress(p);

        /* The night dissolves early and gradually, so the campus is
           already glimpsed between the decks rather than switched on at
           the end. This is the difference between falling through cloud
           and watching a black screen. */
        const night = Math.max(0, 1 - p / 0.45);
        voidLayer.style.opacity = night.toFixed(3);

        /* The mark fades as the first deck reaches it. */
        if (p > 0.1) {
          const f = Math.max(0, 1 - (p - 0.1) / 0.25);
          mark.style.opacity = f.toFixed(3);
          mark.style.transform = 'scale(' + (1 + (1 - f) * 0.5).toFixed(3) + ')';
        }

        if (p < 1) requestAnimationFrame(fall);
        else land();
      })(t0);
    }, HOLD);
  }

  function land() {
    arrival.classList.add('is-gone');
    setTimeout(() => { arrival.style.display = 'none'; }, 1000);
    el('topbar').classList.add('is-in');
    el('readout').classList.add('is-in');
    el('radio').classList.add('is-in');
  }

  /* Remove layers before their sources: MapLibre refuses to drop a source
     that something is still drawing from. */
  function scrub(layers, sources) {
    layers.forEach(id => { if (map.getLayer(id)) map.removeLayer(id); });
    sources.forEach(id => { if (map.getSource(id)) map.removeSource(id); });
  }

  /* ── Buildings ────────────────────────────────────────────────── */
  let buildingsGeo = null;

  function addBuildings(geojson) {
    buildingsGeo = geojson;
    el('ro-count').textContent = geojson.features.length;

    /* Re-entrant: a style swap wipes every source and layer, so this runs
       again on the far side and must not trip over its own leftovers. */
    scrub(['rit-buildings-3d'], ['rit-buildings']);

    map.addSource('rit-buildings', { type: 'geojson', data: geojson, promoteId: 'name' });

    /* The block. A single flat fill - the Monopoly house is readable
       because of its silhouette, not its material. */
    map.addLayer({
      id: 'rit-buildings-3d',
      type: 'fill-extrusion',
      source: 'rit-buildings',
      paint: {
        /* The board inverts with the field: bone pieces on near-black at
           night, black pieces on paper by day. Either way the silhouette
           is what you read, which is the whole idea of the toy. */
        'fill-extrusion-color': [
          'case',
          ['boolean', ['feature-state', 'hover'], false],
            (isDay ? '#0d7a3a' : COLOUR.hot),
          /* A named building is one RIT uses; give it the stronger face so
             the campus proper stands out from its sheds and garages. */
          ['!=', ['get', 'name'], ''],
            (isDay ? '#0b0f0c' : COLOUR.named),
          (isDay ? '#2a322c' : COLOUR.building)
        ],
        'fill-extrusion-height': [
          'interpolate', ['linear'], ['zoom'],
          /* Flat at altitude, full height once you are down among them:
             the blocks grow as you land, which is the arrival. */
          13, 0,
          15.6, ['get', 'height']
        ],
        'fill-extrusion-base': 0,
        'fill-extrusion-opacity': 1,
        /* The one shading we keep: it darkens each block toward its base,
           which is what makes a flat fill read as a solid rather than a
           sticker. */
        'fill-extrusion-vertical-gradient': true
      }
    });

    wireHover();
  }

  /* ── Hover ────────────────────────────────────────────────────── */
  function wireHover() {
    let hot = null;
    const title = el('ro-title');
    const sub = el('ro-sub');

    map.on('mousemove', 'rit-buildings-3d', (e) => {
      if (!e.features.length) return;
      const f = e.features[0];

      if (hot !== null) {
        map.setFeatureState({ source: 'rit-buildings', id: hot }, { hover: false });
      }
      hot = f.id;
      map.setFeatureState({ source: 'rit-buildings', id: hot }, { hover: true });

      map.getCanvas().style.cursor = 'pointer';

      const p = f.properties;
      title.textContent = p.name || 'Unnamed structure';
      const bits = [];
      if (p.ritnum) bits.push('Building ' + p.ritnum);
      if (p.levels) bits.push(p.levels + (p.levels === '1' ? ' floor' : ' floors'));
      sub.textContent = bits.length ? bits.join(' · ') : 'No record in the open data.';
    });

    map.on('mouseleave', 'rit-buildings-3d', () => {
      if (hot !== null) {
        map.setFeatureState({ source: 'rit-buildings', id: hot }, { hover: false });
      }
      hot = null;
      map.getCanvas().style.cursor = '';
      title.textContent = 'Rochester Institute of Technology';
      sub.textContent = 'Henrietta, New York. Hover a building to read it.';
    });
  }

  /* ── Tunnels ──────────────────────────────────────────────────── */
  let tunnelSegments = [];

  /* For now the tunnels are drawn on the surface: where they run and what
     they join, not their true depth. Sub-grade geometry comes later. */
  function addTunnels(campus) {
    const nodes = campus.CAMPUS_GRAPH.nodes;
    const edges = campus.CAMPUS_GRAPH.edges || [];

    /* Report the length actually in the graph, not the length of the
       network as a whole. The chapter's 2.4 km claim covers tunnels that
       are not digitized yet; showing it here would credit the map with
       work it has not done. */
    let metres = 0;
    for (const e of edges) {
      if (e.type !== 'tunnel') continue;
      const a = nodes[e.from], b = nodes[e.to];
      if (!a || !b) continue;
      const dy = (a.coords[0] - b.coords[0]) * 111000;
      const dx = (a.coords[1] - b.coords[1]) * 111000 *
                 Math.cos(a.coords[0] * Math.PI / 180);
      metres += Math.hypot(dx, dy);
    }
    el('ro-tunnel').textContent = (metres / 1000).toFixed(2) + ' km';

    scrub(['tunnel-lines', 'portal-dots'], ['tunnels', 'portals']);

    /* Kept in lng/lat so the reveal can project it through whatever the
       camera happens to be doing when the button is pressed. */
    tunnelSegments = edges
      .filter(e => e.type === 'tunnel')
      .map(e => {
        const a = nodes[e.from], b = nodes[e.to];
        if (!a || !b) return null;
        return [[a.coords[1], a.coords[0]], [b.coords[1], b.coords[0]]];
      })
      .filter(Boolean);

    const lines = edges
      .filter(e => e.type === 'tunnel' || e.type === 'portal')
      .map(e => {
        const a = nodes[e.from], b = nodes[e.to];
        if (!a || !b) return null;
        return {
          type: 'Feature',
          properties: { kind: e.type },
          geometry: {
            type: 'LineString',
            /* stored [lat, lng]; GeoJSON wants [lng, lat] */
            coordinates: [[a.coords[1], a.coords[0]], [b.coords[1], b.coords[0]]]
          }
        };
      })
      .filter(Boolean);

    const portals = Object.values(campus.TUNNEL_PORTALS || {}).map(p => ({
      type: 'Feature',
      properties: { name: p.name, level: p.level },
      geometry: { type: 'Point', coordinates: [p.coords[1], p.coords[0]] }
    }));

    map.addSource('tunnels', {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: lines }
    });

    map.addSource('portals', {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: portals }
    });

    map.addLayer({
      id: 'tunnel-lines',
      type: 'line',
      source: 'tunnels',
      layout: { 'line-cap': 'round', 'line-join': 'round', visibility: 'none' },
      paint: {
        'line-color': ['case', ['==', ['get', 'kind'], 'portal'], COLOUR.hot, COLOUR.tunnel],
        'line-width': ['interpolate', ['linear'], ['zoom'], 14, 2, 18, 7],
        'line-opacity': 0.9,
        'line-dasharray': [2, 1.4]
      }
    });

    map.addLayer({
      id: 'portal-dots',
      type: 'circle',
      source: 'portals',
      layout: { visibility: 'none' },
      paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 14, 3, 18, 8],
        'circle-color': COLOUR.hot,
        'circle-stroke-color': '#04120a',
        'circle-stroke-width': 1.5
      }
    });

  }

  /* Bound once at boot, not inside addTunnels — that runs again on every
     style swap and would stack a new listener each time. */
  let revealing = false;

  function wireTunnelToggle() {
    const reveal = new TunnelReveal(el('reveal-canvas'));
    const overlay = el('reveal');

    function showTunnels(on) {
      map.setLayoutProperty('tunnel-lines', 'visibility', on ? 'visible' : 'none');
      map.setLayoutProperty('portal-dots', 'visibility', on ? 'visible' : 'none');
    }

    el('btn-tunnels').addEventListener('click', function () {
      if (!map.getLayer('tunnel-lines') || revealing) return;

      const on = this.getAttribute('aria-pressed') === 'true';

      /* Switching off is just switching off. The ceremony is for
         arriving, not for leaving. */
      if (on) {
        showTunnels(false);
        this.setAttribute('aria-pressed', 'false');
        return;
      }

      this.setAttribute('aria-pressed', 'true');

      /* Reduced motion gets the tunnels, not the show. */
      if (reduced) { showTunnels(true); return; }

      revealing = true;
      overlay.hidden = false;
      requestAnimationFrame(() => overlay.classList.add('is-dark'));

      /* The mark folds into the line just as the line starts growing. */
      setTimeout(() => {
        overlay.classList.remove('is-dark');
        overlay.classList.add('is-folding');
        /* Keep the field dark while the particles fly; only the mark is
           leaving at this point. */
        el('reveal-void').style.opacity = '0.88';
      }, TunnelReveal.T_LOGO - 150);

      reveal.play(
        tunnelSegments,
        (lngLat) => map.project(lngLat),
        {
          /* The particles have landed: switch the real layer on
             underneath them, so the handover is invisible. */
          onArrive: () => {
            showTunnels(true);
            overlay.classList.add('is-clearing');
            el('reveal-void').style.opacity = '';
          },
          onDone: () => {
            overlay.hidden = true;
            overlay.classList.remove('is-dark', 'is-folding', 'is-clearing');
            revealing = false;
          }
        }
      );
    });
  }

  /* ── Controls ─────────────────────────────────────────────────── */
  function wireControls() {
    el('btn-reset').addEventListener('click', () => {
      stopSpin();
      map.flyTo({ center: RIT, zoom: 16.4, pitch: 58, bearing: -18, duration: 1600 });
    });

    const labels = el('btn-labels');
    labels.addEventListener('click', function () {
      const on = this.getAttribute('aria-pressed') === 'true';
      /* Every symbol layer in the base style, flipped at once. */
      map.getStyle().layers
        .filter(l => l.type === 'symbol')
        .forEach(l => map.setLayoutProperty(l.id, 'visibility', on ? 'none' : 'visible'));
      this.setAttribute('aria-pressed', String(!on));
    });

    wireRotation();
    wireDaylight();
  }

  /* ── Rotation ─────────────────────────────────────────────────── */
  /* Dragging with the right button already rotates — that is MapLibre's
     default and almost nobody discovers it. So: arrow keys, a Q/E pair,
     and a continuous orbit for when you just want to look. */
  let spinRAF = null;

  function stopSpin() {
    if (spinRAF) cancelAnimationFrame(spinRAF);
    spinRAF = null;
    const b = el('btn-spin');
    if (b) b.setAttribute('aria-pressed', 'false');
  }

  function wireRotation() {
    const btn = el('btn-spin');

    btn.addEventListener('click', function () {
      if (spinRAF) { stopSpin(); return; }

      this.setAttribute('aria-pressed', 'true');
      let last = performance.now();

      (function orbit(now) {
        const dt = (now - last) / 1000;
        last = now;
        /* Six degrees a second: a full turn in a minute. Slow enough to
           read the buildings as you pass them. */
        map.setBearing(map.getBearing() + 6 * dt);
        spinRAF = requestAnimationFrame(orbit);
      })(last);
    });

    /* Any direct interaction cancels the orbit — the user taking hold of
       the map always wins over an animation. */
    ['mousedown', 'touchstart', 'wheel'].forEach(ev =>
      map.getCanvas().addEventListener(ev, stopSpin, { passive: true }));

    window.addEventListener('keydown', (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const tag = (e.target.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;

      let handled = true;
      switch (e.key) {
        case 'q': case 'Q': map.easeTo({ bearing: map.getBearing() - 30, duration: 420 }); break;
        case 'e': case 'E': map.easeTo({ bearing: map.getBearing() + 30, duration: 420 }); break;
        case 'r': case 'R': map.easeTo({ pitch: Math.min(map.getPitch() + 10, 75), duration: 380 }); break;
        case 'f': case 'F': map.easeTo({ pitch: Math.max(map.getPitch() - 10, 0), duration: 380 }); break;
        default: handled = false;
      }
      if (handled) { stopSpin(); e.preventDefault(); }
    });
  }

  /* ── Daylight ─────────────────────────────────────────────────── */
  /* Swapping the basemap style tears down every layer we added, so the
     overlays have to be rebuilt on the far side of the swap. */
  let isDay = false;
  let campusCache = null;

  function wireDaylight() {
    el('btn-daylight').addEventListener('click', function () {
      isDay = !isDay;
      this.setAttribute('aria-pressed', String(isDay));
      this.textContent = isDay ? 'Night' : 'Day';
      document.body.classList.toggle('is-day', isDay);

      const tunnelsOn = el('btn-tunnels').getAttribute('aria-pressed') === 'true';
      const camera = {
        center: map.getCenter(), zoom: map.getZoom(),
        pitch: map.getPitch(), bearing: map.getBearing()
      };

      map.setStyle('https://tiles.openfreemap.org/styles/' +
                   (isDay ? 'positron' : 'dark'));

      map.once('styledata', () => {
        map.jumpTo(camera);
        flattenBasemap();
        if (buildingsGeo) addBuildings(buildingsGeo);
        if (campusCache) {
          addTunnels(campusCache);
          if (tunnelsOn) {
            map.setLayoutProperty('tunnel-lines', 'visibility', 'visible');
            map.setLayoutProperty('portal-dots', 'visibility', 'visible');
            el('btn-tunnels').setAttribute('aria-pressed', 'true');
          }
        }
        /* The route went with the old style. Put it back where it was,
           without re-framing the camera. */
        if (lastRoute) drawRoute(lastRoute, false);
      });
    });
  }

  /* ── WITR 89.7 ────────────────────────────────────────────────── */
  /* The station's own Icecast. The mount moved off port 8000 at some
     point — the old player in the Leaflet map still points there and has
     been silently dead. This uses the current HTTPS mount, which matters:
     an http stream is blocked as mixed content the moment this page is
     served over https. */
  const WITR_STREAM = 'https://streaming.witr.rit.edu/live-mp3';
  const WITR_STATUS = 'https://streaming.witr.rit.edu/status-json.xsl';

  function wireRadio() {
    const dock = el('radio');
    const btn = el('radio-play');
    const track = el('radio-track');
    const live = el('radio-live');

    dock.hidden = false;

    let audio = null;
    let poll = null;

    /* The station's Icecast serves its status JSON without an
       Access-Control-Allow-Origin header, so a browser on another origin
       cannot read it. The stream itself is unaffected — <audio> playback
       is not gated by CORS — so the dock plays fine and simply has no
       track name to show. If WITR ever adds the header, this starts
       working on its own with no change here. */
    let metadataBlocked = false;

    function nowPlaying() {
      if (metadataBlocked) return;

      fetch(WITR_STATUS, { cache: 'no-store' })
        .then(r => r.json())
        .then(d => {
          let src = d.icestats && d.icestats.source;
          if (!src) return;
          if (!Array.isArray(src)) src = [src];
          /* Several mounts carry the same programme; the busiest one is
             the main feed. */
          const main = src.filter(s => /live/.test(s.listenurl || ''))
                          .sort((a, b) => (b.listeners || 0) - (a.listeners || 0))[0];
          if (!main) return;
          if (main.title) track.textContent = main.title;
          live.textContent = (main.listeners || 0) + ' listening';
        })
        .catch(() => {
          /* Stop asking, and stop claiming to be tuning in. */
          metadataBlocked = true;
          clearInterval(poll);
          if (dock.classList.contains('is-playing')) {
            track.textContent = 'Live from campus';
          }
        });
    }

    btn.addEventListener('click', () => {
      if (!audio) {
        audio = new Audio(WITR_STREAM);
        audio.preload = 'none';
        audio.volume = 0.7;

        audio.addEventListener('playing', () => {
          dock.classList.add('is-playing');
          if (metadataBlocked) {
            /* Already know we cannot read the track name. Say what is
               true — it is live — instead of tuning in forever. */
            track.textContent = 'Live from campus';
            live.textContent = 'on air';
          } else {
            nowPlaying();
            poll = setInterval(nowPlaying, 20000);
          }
        });

        const quiet = () => {
          dock.classList.remove('is-playing');
          clearInterval(poll);
        };
        audio.addEventListener('pause', quiet);

        audio.addEventListener('error', () => {
          quiet();
          track.textContent = 'Stream unreachable';
          live.textContent = 'off air?';
        });
      }

      if (audio.paused) {
        track.textContent = 'Tuning in…';
        audio.play().catch(() => {
          track.textContent = 'Blocked by the browser';
        });
      } else {
        audio.pause();
        track.textContent = 'Paused';
        live.textContent = 'RIT student radio';
      }
    });

    /* Show what is on before anyone presses play. */
    nowPlaying();
  }

  /* ── Where you are ────────────────────────────────────────────── */
  let locator = null;
  let router = null;
  let originKey = null;       /* the graph node you are nearest to */
  let mode = 'comfort';       /* inside by default: this is Rochester */

  /* Anything past this and you are not on the mapped part of campus, so
     routing from the nearest node would be a polite fiction. */
  const SNAP_LIMIT_M = 400;

  function startLocator(campus) {
    const fromLine = el('trip-from');
    const originLabel = el('trip-origin');

    locator = new Locator(map, {
      onMove: (lngLat, accuracy, first) => {
        const snap = router.nearest(lngLat);

        if (snap.metres > SNAP_LIMIT_M) {
          originKey = null;
          fromLine.classList.remove('is-fixed');
          originLabel.textContent = 'off campus';
        } else {
          originKey = snap.key;
          fromLine.classList.add('is-fixed');
          originLabel.textContent = campus.CAMPUS_GRAPH.nodes[snap.key].name;
        }

        refreshGo();

        /* Only chase the camera on the very first fix. After that the
           map is yours — nothing is more annoying than a map that keeps
           yanking itself back while you are reading it. */
        if (first) {
          map.easeTo({ center: lngLat, zoom: 17, duration: 2000 });
        }
      },
      onError: (msg) => {
        originKey = null;
        fromLine.classList.remove('is-fixed');
        originLabel.textContent = msg;
        refreshGo();
      }
    });

    locator.start();
  }

  /* ── Trip planning ────────────────────────────────────────────── */
  function wireTrip(campus) {
    router = new Router(campus.CAMPUS_GRAPH);

    const nodes = campus.CAMPUS_GRAPH.nodes;
    const dest = el('trip-dest');
    const go = el('trip-go');

    /* Only places worth naming as a destination — not every corridor
       junction in the graph. */
    Object.keys(nodes)
      .filter(k => ['building', 'landmark', 'classroom'].includes(nodes[k].type))
      .sort((a, b) => nodes[a].name.localeCompare(nodes[b].name))
      .forEach(k => {
        const o = document.createElement('option');
        o.value = k;
        o.textContent = nodes[k].name;
        dest.appendChild(o);
      });

    dest.addEventListener('change', refreshGo);

    [['mode-comfort', 'comfort'], ['mode-best', 'best'], ['mode-fastest', 'fastest']]
      .forEach(([id, key]) => {
        el(id).addEventListener('click', function () {
          mode = key;
          ['mode-comfort', 'mode-best', 'mode-fastest'].forEach(other =>
            el(other).setAttribute('aria-pressed', String(other === id)));
          /* Re-run straight away if a route is already on screen: the
             point of the modes is comparing them. */
          if (el('trip-result').classList.contains('is-shown')) plot();
        });
      });

    go.addEventListener('click', plot);
    el('trip').classList.add('is-in');
  }

  function refreshGo() {
    const dest = el('trip-dest').value;
    el('trip-go').disabled = !(dest && originKey);
  }

  function plot() {
    const destKey = el('trip-dest').value;
    if (!destKey || !originKey) return;

    const result = router.route(originKey, destKey, mode);
    const box = el('trip-result');

    if (!result) {
      box.classList.add('is-shown');
      el('trip-steps').innerHTML = '';
      el('trip-mins').textContent = '—';
      el('trip-dist').textContent = '—';
      el('trip-exposed').textContent = '—';
      el('trip-note').textContent =
        'No path between those two in the mapped graph yet.';
      return;
    }

    el('trip-mins').textContent = result.minutes + ' min';
    el('trip-dist').textContent = Math.round(result.metres) + ' m';
    el('trip-exposed').textContent = Math.round(result.exposure * 100) + '%';

    const steps = router.describe(result);
    el('trip-steps').innerHTML = steps.map(s => '<li>' + s + '</li>').join('');

    const notes = [];
    if (result.portals) {
      notes.push(result.portals + (result.portals === 1 ? ' portal' : ' portals') + ' on the way.');
    }
    if (result.exposure === 0) notes.push('Entirely under cover.');
    el('trip-note').textContent = notes.join(' ');

    box.classList.add('is-shown');
    drawRoute(result);
  }

  /* Kept so the route can be redrawn after a style swap, which destroys
     every source and layer on the map including this one. */
  let lastRoute = null;

  function drawRoute(result, refit) {
    lastRoute = result;
    const line = {
      type: 'FeatureCollection',
      features: [{
        type: 'Feature',
        properties: {},
        geometry: { type: 'LineString', coordinates: result.coordinates }
      }]
    };

    if (map.getSource('route')) {
      map.getSource('route').setData(line);
    } else {
      map.addSource('route', { type: 'geojson', data: line });

      /* A soft under-stroke so the route stays legible where it crosses
         a bright roof. */
      map.addLayer({
        id: 'route-halo',
        type: 'line',
        source: 'route',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          /* The halo is whatever the route is not, so the line stays
             legible crossing a black roof or a white one. */
          'line-color': isDay ? '#ffffff' : '#04120a',
          'line-width': ['interpolate', ['linear'], ['zoom'], 14, 7, 18, 16],
          'line-opacity': isDay ? 0.85 : 0.55
        }
      });

      map.addLayer({
        id: 'route-line',
        type: 'line',
        source: 'route',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          /* Neon green vanishes on paper; the day route takes the deeper
             green that the day chrome already uses. */
          'line-color': isDay ? '#0d7a3a' : COLOUR.hot,
          'line-width': ['interpolate', ['linear'], ['zoom'], 14, 3, 18, 8]
        }
      });
    }

    /* Only frame the route when it is newly computed. Redrawing it after
       a style swap must not yank the camera out from under the reader. */
    if (refit === false) return;

    const b = result.coordinates.reduce(
      (acc, c) => acc.extend(c),
      new maplibregl.LngLatBounds(result.coordinates[0], result.coordinates[0]));
    map.fitBounds(b, { padding: { top: 120, bottom: 160, left: 380, right: 120 }, duration: 1400 });
  }

  /* ── Campus life ──────────────────────────────────────────────── */
  function wireLife(data, campus) {
    const panel = el('life');
    const list = el('life-list');
    const query = el('life-q');
    const btn = el('btn-life');

    let filter = 'all';

    const life = new CampusLife(data, {
      nodes: campus.CAMPUS_GRAPH.nodes,
      /* The whole point: a meeting hands its room to the router, so the
         answer to "where is NSBE" is a way there, not a room number. */
      onGo: (entry) => {
        const dest = el('trip-dest');
        const option = [...dest.options].find(o => o.value === entry.at);

        if (!option) {
          /* The room is not a routable node. Say so rather than doing
             nothing when the button is pressed. */
          el('trip-note').textContent =
            entry.room + ' is not in the routing graph yet.';
          el('trip-result').classList.add('is-shown');
          return;
        }

        dest.value = entry.at;
        dest.dispatchEvent(new Event('change'));

        if (originKey) {
          plot();
          close();
        } else {
          /* No fix yet: leave the destination set so it routes the
             moment the locator reports in. */
          el('trip-note').textContent =
            'Destination set. Waiting for your location.';
          el('trip-result').classList.add('is-shown');
        }
      }
    });

    function draw() {
      life.render(list, life.search(query.value, filter, new Date()));
    }

    function open() {
      panel.hidden = false;
      /* Let the browser apply `hidden: false` before the transition, or
         the panel appears instead of arriving. */
      requestAnimationFrame(() => panel.classList.add('is-open'));
      btn.setAttribute('aria-pressed', 'true');
      draw();
      query.focus();
    }

    function close() {
      panel.classList.remove('is-open');
      btn.setAttribute('aria-pressed', 'false');
      setTimeout(() => { panel.hidden = true; }, 400);
    }

    btn.addEventListener('click', () =>
      btn.getAttribute('aria-pressed') === 'true' ? close() : open());

    el('life-close').addEventListener('click', close);

    query.addEventListener('input', draw);

    [...document.querySelectorAll('.life-filter')].forEach(f => {
      f.addEventListener('click', function () {
        filter = this.dataset.filter;
        document.querySelectorAll('.life-filter').forEach(o =>
          o.setAttribute('aria-pressed', String(o === this)));
        draw();
      });
    });

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !panel.hidden) close();
    });

    /* Redraw on open rather than on a timer, but keep the "in 40 min"
       labels honest if the panel is left open. */
    setInterval(() => { if (!panel.hidden) draw(); }, 60000);
  }

  /* ── Konami ───────────────────────────────────────────────────── */
  /* ↑ ↑ ↓ ↓ ← → ← → B A */
  function wireKonami() {
    const SEQ = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown',
                 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
    let at = 0;

    const flock = new Ritchie(el('balloons'));
    const note = el('konami-note');

    /* The fight song is RIT's and is not shipped with this project.
       Drop an audio file at assets/go-tigers.mp3 and it plays; without
       one the balloons simply fly in silence. */
    let song = null;
    function play() {
      if (!song) {
        song = new Audio('assets/go-tigers.mp3');
        song.volume = 0.65;
      }
      song.currentTime = 0;
      song.play().catch(() => { /* no file, or autoplay refused: fine */ });
    }

    window.addEventListener('keydown', (e) => {
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      at = (k === SEQ[at]) ? at + 1 : (k === SEQ[0] ? 1 : 0);
      if (at < SEQ.length) return;

      at = 0;
      play();
      flock.release(10);

      /* The ball you are standing on becomes the tiger, and stays one. */
      if (locator) locator.becomeTiger();

      note.classList.add('is-in');
      setTimeout(() => note.classList.remove('is-in'), 3200);

      /* A slow turn around the campus while they rise. */
      if (!reduced) {
        map.easeTo({ bearing: map.getBearing() + 150, pitch: 62, duration: 7000 });
      }
    });
  }

  /* ── Boot ─────────────────────────────────────────────────────── */
  descend();

  /* Flatten the stock basemap into a board. The toy look comes from
     taking things away: a board has a field, a few roads and the pieces,
     and nothing else competing with them. Runs again after a style swap. */
  function flattenBasemap() {
    map.getStyle().layers.forEach(l => {
      if (l.type === 'fill-extrusion') {
        /* The base style ships its own buildings; ours replace them. */
        map.setLayoutProperty(l.id, 'visibility', 'none');
        return;
      }
      if (l.type === 'fill' && /landuse|landcover|park|wood|grass|pitch|sand/.test(l.id)) {
        map.setPaintProperty(l.id, 'fill-opacity', 0.14);
      }
      /* Roads stay, but as faint grooves in the board, not as a network
         that outshines the buildings. */
      if (l.type === 'line' && /road|street|highway|transport|bridge/.test(l.id)) {
        map.setPaintProperty(l.id, 'line-opacity', 0.3);
      }
      /* Place labels for other towns are noise at campus scale. */
      if (l.type === 'symbol' && /place|country|state|continent/.test(l.id)) {
        map.setLayoutProperty(l.id, 'visibility', 'none');
      }
    });

    /* Give the board its own field so the pieces have something to sit
       on: near-black at night, paper at midday. */
    if (map.getLayer('background')) {
      map.setPaintProperty('background', 'background-color',
                           isDay ? '#e9ede9' : COLOUR.ground);
    }
  }

  map.on('load', async () => {
    progress('Reading the campus');
    flattenBasemap();

    try {
      const [b, c, life] = await Promise.all([
        fetch('data/rit_buildings.geojson').then(r => r.json()),
        fetch('data/campus.json').then(r => r.json()),
        /* Campus life is a nicety: if it fails, the map still maps. */
        fetch('data/campus_life.json').then(r => r.json()).catch(() => null)
      ]);
      progress('Raising ' + b.features.length + ' buildings');
      addBuildings(b);
      progress('Tracing the tunnels');
      campusCache = c;
      /* A deliberate handle for the console: this map is a student
         project and the graph is the interesting part of it. */
      window.__campus = c;
      addTunnels(c);
      wireTrip(c);
      startLocator(c);

      if (life) {
        wireLife(life, c);
      } else {
        el('btn-life').disabled = true;
        el('btn-life').title = 'Club and office-hour data failed to load';
      }
    } catch (err) {
      /* The map is still a map without our overlays. Say so, do not
         leave the arrival screen hanging. */
      console.error('campus data failed to load:', err);
      el('ro-sub').textContent = 'Campus data unavailable — base map only.';
    }

    wireControls();
    wireTunnelToggle();
    wireRadio();
    wireKonami();
    progress('Ready');
  });

  map.on('error', (e) => console.error('maplibre:', e && e.error));
})();
