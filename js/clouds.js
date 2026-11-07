/* ═══════════════════════════════════════════════════════════════════
   CLOUDS — three decks you fall through, in the manner of the Simpsons
   title card.

   Drawn into canvases rather than loaded as images: no asset to ship, no
   request to wait on, and every visit gets a slightly different sky.

   The depth illusion is parallax, not scale alone. Each deck starts at a
   different size and grows at a different rate, so the near deck sweeps
   past while the far one is still approaching.
   ═══════════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  /* A cheap value-noise field. Not Perlin: we need soft blobs, not
     terrain, and this costs a fraction of the code. */
  function puff(ctx, x, y, r, alpha) {
    const g = ctx.createRadialGradient(x, y, r * 0.1, x, y, r);
    /* A cloud is bright and opaque at its core and only soft at the rim.
       Starting the falloff at the centre is what made the first attempt
       read as smudges instead of weather. */
    g.addColorStop(0.00, 'rgba(255,255,255,' + alpha + ')');
    g.addColorStop(0.38, 'rgba(248,251,255,' + (alpha * 0.92) + ')');
    g.addColorStop(0.72, 'rgba(226,236,250,' + (alpha * 0.42) + ')');
    g.addColorStop(1.00, 'rgba(206,222,245,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  /* One deck: a scatter of overlapping puffs with a clear-ish centre, so
     the logo stays legible through the first layer. */
  function paintDeck(canvas, opts) {
    const dpr = Math.min(global.devicePixelRatio || 1, 2);
    const w = canvas.clientWidth || 1200;
    const h = canvas.clientHeight || 900;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);

    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);

    const count = opts.count;
    const cx = w / 2, cy = h / 2;
    const clearR = Math.min(w, h) * opts.clear;

    for (let i = 0; i < count; i++) {
      /* Rejection-sample so clumps avoid the middle of the frame. */
      let x, y, tries = 0;
      do {
        x = Math.random() * w;
        y = Math.random() * h;
        tries++;
      } while (tries < 8 && Math.hypot(x - cx, y - cy) < clearR);

      const r = (opts.rMin + Math.random() * (opts.rMax - opts.rMin)) * Math.min(w, h);

      /* A clump of 3-6 puffs reads as a cloud; a single circle reads as a
         circle. */
      const lobes = 3 + ((Math.random() * 4) | 0);
      for (let j = 0; j < lobes; j++) {
        const a = Math.random() * Math.PI * 2;
        const d = Math.random() * r * 0.6;
        puff(ctx,
             x + Math.cos(a) * d,
             y + Math.sin(a) * d * 0.55,
             r * (0.5 + Math.random() * 0.6),
             opts.alpha * (0.6 + Math.random() * 0.4));
      }
    }
  }

  function Clouds(root) {
    this.decks = [].slice.call(root.querySelectorAll('.deck'));
    this.specs = [
      /* far → near. The near deck is sparser and much larger: by the time
         you reach it you should be passing between clouds, not into a
         wall. */
      { count: 44, rMin: 0.06, rMax: 0.15, alpha: 0.95, clear: 0.22, from: 1.0, to: 3.0 },
      { count: 24, rMin: 0.12, rMax: 0.26, alpha: 1.0,  clear: 0.26, from: 1.3, to: 6.5 },
      { count: 11, rMin: 0.22, rMax: 0.46, alpha: 1.0,  clear: 0.30, from: 1.9, to: 13.0 }
    ];
    this.paint();
  }

  Clouds.prototype.paint = function () {
    this.decks.forEach(function (deck, i) {
      const spec = this.specs[i];
      if (!spec) return;
      paintDeck(deck.querySelector('canvas'), spec);
      deck.style.transform = 'scale(' + spec.from + ')';
    }, this);
  };

  /* Drive the fall from outside, so the camera and the sky stay in step.
     p is 0 (above the weather) to 1 (below it). */
  Clouds.prototype.setProgress = function (p) {
    const t = Math.max(0, Math.min(1, p));

    this.decks.forEach(function (deck, i) {
      const spec = this.specs[i];
      if (!spec) return;

      /* Each deck has its own slice of the fall. The near deck only starts
         rushing once the far one is already behind you. */
      const start = i * 0.22;
      const end = start + 0.62;
      const local = Math.max(0, Math.min(1, (t - start) / (end - start)));

      /* Accelerate into the pass: you speed up as a deck gets close. */
      const eased = local * local * (3 - 2 * local);
      const scale = spec.from + (spec.to - spec.from) * eased;

      /* Fade in on approach, out as it sweeps past the lens. */
      let alpha;
      if (local < 0.18) alpha = local / 0.18;
      else if (local > 0.72) alpha = Math.max(0, 1 - (local - 0.72) / 0.28);
      else alpha = 1;

      deck.style.transform = 'scale(' + scale.toFixed(3) + ')';
      deck.style.opacity = alpha.toFixed(3);
    }, this);
  };

  global.Clouds = Clouds;
})(window);
