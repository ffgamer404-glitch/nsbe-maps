/* ═══════════════════════════════════════════════════════════════════
   TUNNEL REVEAL

   The logo collapses into a single line of red, green and white; the
   line shatters; the pieces fly out and become the tunnel network.

   The trick that makes it land: the particles do not scatter at random.
   Each is assigned a real point along a real tunnel segment, projected
   into screen space through the live camera. The shape they form is the
   actual network under RIT, so when the overlay clears, the drawn
   tunnels are already exactly where the particles stopped.

   Red and green are the colours the map already uses for tunnel and
   portal; white is the third because the line needs three.
   ═══════════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  const RED = '#ff2a4b';
  const GREEN = '#00ff66';
  const WHITE = '#ffffff';

  /* Phase boundaries, in ms from the start. */
  const T_LOGO = 900;    /* the mark holds alone */
  const T_LINE = 1750;   /* it has become a line */
  const T_FLY  = 3450;   /* the pieces have arrived */
  const T_END  = 4200;   /* everything has faded */

  function ease(t) { return t * t * (3 - 2 * t); }
  function easeOut(t) { return 1 - Math.pow(1 - t, 3); }

  /* Walk the tunnel polylines and drop a point every `step` pixels, so
     particles spread evenly along the network instead of bunching at the
     vertices. */
  function sampleTargets(segments, project, step) {
    const pts = [];

    segments.forEach(seg => {
      for (let i = 0; i < seg.length - 1; i++) {
        const a = project(seg[i]);
        const b = project(seg[i + 1]);
        const dx = b.x - a.x, dy = b.y - a.y;
        const len = Math.hypot(dx, dy);
        if (!isFinite(len) || len === 0) continue;

        const n = Math.max(1, Math.round(len / step));
        for (let k = 0; k <= n; k++) {
          const t = k / n;
          pts.push({
            x: a.x + dx * t,
            y: a.y + dy * t,
            /* Vertices take the portal colour; the run between them is
               tunnel. The joints then read as the doors they are. */
            colour: (k === 0 || k === n) ? GREEN : RED
          });
        }
      }
    });

    return pts;
  }

  function TunnelReveal(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.raf = null;
    this.w = 0;
    this.h = 0;
    this._resize = this.resize.bind(this);
  }

  TunnelReveal.prototype.resize = function () {
    const dpr = Math.min(global.devicePixelRatio || 1, 2);
    this.w = global.innerWidth;
    this.h = global.innerHeight;
    this.canvas.width = Math.floor(this.w * dpr);
    this.canvas.height = Math.floor(this.h * dpr);
    this.canvas.style.width = this.w + 'px';
    this.canvas.style.height = this.h + 'px';
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  /* segments: arrays of [lng, lat] pairs — the tunnel lines.
     project:  [lng, lat] -> {x, y} in screen pixels.
     opts.onArrive: fired once the pieces are in place, to switch the
                    real tunnel layer on underneath.
     opts.onDone:   fired when the overlay has finished fading. */
  TunnelReveal.prototype.play = function (segments, project, opts) {
    opts = opts || {};
    this.stop();
    this.resize();
    global.addEventListener('resize', this._resize);

    const targets = sampleTargets(segments, project, 9);

    if (!targets.length) {
      /* Nothing to fly to. Do not leave the caller waiting on callbacks
         that will never come. */
      if (opts.onArrive) opts.onArrive();
      if (opts.onDone) opts.onDone();
      return;
    }

    const cx = this.w / 2;
    const cy = this.h / 2;
    const half = Math.min(this.w * 0.26, 290);

    /* One particle per target. Its place along the line is its place
       along the network, so the line unrolls into the map rather than
       exploding out of it. */
    this.bits = targets.map((t, i) => {
      const along = targets.length === 1 ? 0.5 : i / (targets.length - 1);
      return {
        lx: cx + (along - 0.5) * 2 * half,   /* where it sits as a line */
        ly: cy,
        tx: t.x,                              /* where it is going */
        ty: t.y,
        colour: t.colour,
        lineColour: along < 0.34 ? RED : (along < 0.67 ? GREEN : WHITE),
        /* Stagger departure so the line frays rather than snapping. */
        delay: along * 0.22 + Math.random() * 0.1,
        /* A lateral kick, so paths bow instead of being 300 straight
           lines drawn at once. */
        bow: (Math.random() - 0.5) * 120,
        size: 1.3 + Math.random() * 1.1
      };
    });

    this.arrived = false;
    this.opts = opts;
    this.t0 = performance.now();
    this.raf = requestAnimationFrame(this.frame.bind(this));
  };

  TunnelReveal.prototype.frame = function (now) {
    const ms = now - this.t0;
    const c = this.ctx;
    c.clearRect(0, 0, this.w, this.h);

    if (ms < T_LINE) {
      /* ── The line forms ─────────────────────────────────────────
         Before T_LOGO the mark is still on screen above this canvas;
         the line grows out from the centre as the mark fades. */
      const t = Math.max(0, Math.min(1, (ms - T_LOGO) / (T_LINE - T_LOGO)));
      const grow = ease(t);
      const cx = this.w / 2;

      c.globalAlpha = Math.min(1, t * 2.2);
      this.bits.forEach(b => {
        c.fillStyle = b.lineColour;
        c.beginPath();
        c.arc(cx + (b.lx - cx) * grow, b.ly, 1.9, 0, Math.PI * 2);
        c.fill();
      });
      c.globalAlpha = 1;

    } else if (ms < T_FLY) {
      /* ── The line disperses into the network ────────────────────── */
      const span = T_FLY - T_LINE;

      this.bits.forEach(b => {
        const local = Math.max(0, Math.min(1,
          ((ms - T_LINE) / span - b.delay) / (1 - b.delay)));
        const p = easeOut(local);

        /* A quadratic bow: the midpoint is pushed aside so the swarm
           arcs into place. */
        const mx = (b.lx + b.tx) / 2 + b.bow;
        const my = (b.ly + b.ty) / 2 - Math.abs(b.bow) * 0.4;
        const inv = 1 - p;
        const x = inv * inv * b.lx + 2 * inv * p * mx + p * p * b.tx;
        const y = inv * inv * b.ly + 2 * inv * p * my + p * p * b.ty;

        /* Colour crosses from the line's three to the map's two in
           flight, so the arrival already looks like the tunnel layer. */
        c.fillStyle = p > 0.55 ? b.colour : b.lineColour;
        c.globalAlpha = 0.55 + p * 0.45;
        c.beginPath();
        c.arc(x, y, b.size * (1 + inv * 0.8), 0, Math.PI * 2);
        c.fill();
      });
      c.globalAlpha = 1;

    } else {
      /* ── Settled: hand over to the real layer, then fade ────────── */
      if (!this.arrived) {
        this.arrived = true;
        if (this.opts.onArrive) this.opts.onArrive();
      }

      const t = Math.min(1, (ms - T_FLY) / (T_END - T_FLY));
      c.globalAlpha = 1 - ease(t);
      this.bits.forEach(b => {
        c.fillStyle = b.colour;
        c.beginPath();
        c.arc(b.tx, b.ty, b.size, 0, Math.PI * 2);
        c.fill();
      });
      c.globalAlpha = 1;
    }

    if (ms < T_END) {
      this.raf = requestAnimationFrame(this.frame.bind(this));
    } else {
      this.finish();
    }
  };

  TunnelReveal.prototype.finish = function () {
    const opts = this.opts || {};
    const arrived = this.arrived;
    this.stop();
    if (!arrived && opts.onArrive) opts.onArrive();
    if (opts.onDone) opts.onDone();
  };

  TunnelReveal.prototype.stop = function () {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = null;
    if (this.ctx && this.w) this.ctx.clearRect(0, 0, this.w, this.h);
    global.removeEventListener('resize', this._resize);
  };

  TunnelReveal.DURATION = T_END;
  TunnelReveal.T_LOGO = T_LOGO;
  global.TunnelReveal = TunnelReveal;
})(window);
