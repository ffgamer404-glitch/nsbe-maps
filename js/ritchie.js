/* ═══════════════════════════════════════════════════════════════════
   RITCHIE — the parade balloon.

   Drawn in canvas, deliberately lopsided: a parade balloon is a tiger
   approximated in nylon by someone working from a photograph, and the
   charm is in how wrong it is. Perfect symmetry would read as a logo.

   The wobble is a sum of two sines at unrelated frequencies, so the
   silhouette never repeats on a beat you can count.
   ═══════════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  const ORANGE = '#f76902';   /* RIT orange */
  const DARK   = '#1a1a1a';
  const CREAM  = '#ffeedd';

  function Balloon(w, h) {
    this.x = Math.random() * w;
    this.y = h + 120 + Math.random() * h * 0.7;
    this.scale = 0.55 + Math.random() * 0.75;
    this.rise = 26 + Math.random() * 30;       /* px per second */
    this.drift = (Math.random() - 0.5) * 22;
    this.phase = Math.random() * Math.PI * 2;
    this.spin = (Math.random() - 0.5) * 0.25;
    /* How badly inflated this one is. Each balloon is wrong differently. */
    this.squashA = 0.10 + Math.random() * 0.16;
    this.squashB = 0.07 + Math.random() * 0.13;
  }

  Balloon.prototype.step = function (dt, w, h) {
    this.y -= this.rise * dt;
    this.x += this.drift * dt;
    this.phase += dt * 1.1;
    if (this.x < -160) this.x = w + 160;
    if (this.x > w + 160) this.x = -160;
    return this.y > -260;
  };

  /* A blobby closed curve, radius modulated by two sines. This is the
     "deformed" in deformed balloon. */
  function lumpyCircle(ctx, r, t, a, b, squish) {
    const STEPS = 44;
    ctx.beginPath();
    for (let i = 0; i <= STEPS; i++) {
      const ang = (i / STEPS) * Math.PI * 2;
      const wob = 1
        + Math.sin(ang * 3 + t * 1.7) * a
        + Math.sin(ang * 5 - t * 1.1) * b;
      const rr = r * wob;
      const x = Math.cos(ang) * rr;
      const y = Math.sin(ang) * rr * squish;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
  }

  Balloon.prototype.draw = function (ctx) {
    const t = this.phase;
    const s = this.scale;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(Math.sin(t * 0.6) * this.spin);
    ctx.scale(s, s);

    /* Tether, drawn first so the body covers its top end. */
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, 54);
    ctx.quadraticCurveTo(Math.sin(t * 0.9) * 16, 104, Math.sin(t * 0.5) * 24, 152);
    ctx.stroke();

    /* Body */
    ctx.fillStyle = ORANGE;
    lumpyCircle(ctx, 52, t, this.squashA, this.squashB, 1.12);
    ctx.fill();

    /* Muzzle */
    ctx.fillStyle = CREAM;
    ctx.save();
    ctx.translate(0, 16);
    lumpyCircle(ctx, 23, t * 1.3 + 2, 0.07, 0.05, 0.78);
    ctx.fill();
    ctx.restore();

    /* Ears — different sizes, because they always are. */
    ctx.fillStyle = ORANGE;
    [[-38, -34, 15], [38, -36, 17]].forEach(function (e, i) {
      ctx.save();
      ctx.translate(e[0], e[1] + Math.sin(t * 1.4 + i) * 3);
      lumpyCircle(ctx, e[2], t + i * 2, 0.12, 0.08, 1);
      ctx.fill();
      ctx.restore();
    });

    /* Stripes */
    ctx.strokeStyle = DARK;
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.moveTo(-34 + i * 9, -34 + Math.sin(t + i) * 2);
      ctx.quadraticCurveTo(-20 + i * 9, -20, -32 + i * 9, -8);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(34 + i * 9, -34 + Math.cos(t + i) * 2);
      ctx.quadraticCurveTo(20 + i * 9, -20, 32 + i * 9, -8);
      ctx.stroke();
    }

    /* Eyes, slightly misaligned on purpose. */
    ctx.fillStyle = DARK;
    [[-17, -8, 5.5], [18, -9.5, 5]].forEach(function (e) {
      ctx.beginPath();
      ctx.ellipse(e[0], e[1], e[2], e[2] * 1.18, 0, 0, Math.PI * 2);
      ctx.fill();
    });

    /* Nose and mouth */
    ctx.beginPath();
    ctx.ellipse(0, 9, 7, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = DARK;
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.moveTo(0, 13);
    ctx.lineTo(0, 20);
    ctx.moveTo(-13, 25);
    ctx.quadraticCurveTo(0, 32, 13, 25);
    ctx.stroke();

    ctx.restore();
  };

  /* ── The flock ──────────────────────────────────────────────────── */
  function Ritchie(root, opts) {
    this.root = root;
    this.canvas = root.querySelector('canvas');
    this.ctx = this.canvas.getContext('2d');
    this.balloons = [];
    this.raf = null;
    this.last = 0;
    this.onDone = (opts && opts.onDone) || function () {};
    this._resize = this.resize.bind(this);
  }

  Ritchie.prototype.resize = function () {
    const dpr = Math.min(global.devicePixelRatio || 1, 2);
    this.w = global.innerWidth;
    this.h = global.innerHeight;
    this.canvas.width = Math.floor(this.w * dpr);
    this.canvas.height = Math.floor(this.h * dpr);
    this.canvas.style.width = this.w + 'px';
    this.canvas.style.height = this.h + 'px';
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  Ritchie.prototype.release = function (n) {
    this.resize();
    global.addEventListener('resize', this._resize);
    this.root.classList.add('is-live');

    for (let i = 0; i < (n || 9); i++) {
      this.balloons.push(new Balloon(this.w, this.h));
    }

    if (this.raf) return;           /* already flying; just added more */
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.tick.bind(this));
  };

  Ritchie.prototype.tick = function (now) {
    const dt = Math.min((now - this.last) / 1000, 0.05);
    this.last = now;

    this.ctx.clearRect(0, 0, this.w, this.h);

    this.balloons = this.balloons.filter(function (b) {
      const alive = b.step(dt, this.w, this.h);
      if (alive) b.draw(this.ctx);
      return alive;
    }, this);

    if (this.balloons.length) {
      this.raf = requestAnimationFrame(this.tick.bind(this));
    } else {
      this.stop();
    }
  };

  Ritchie.prototype.stop = function () {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = null;
    this.ctx.clearRect(0, 0, this.w, this.h);
    this.root.classList.remove('is-live');
    global.removeEventListener('resize', this._resize);
    this.onDone();
  };

  global.Ritchie = Ritchie;
})(window);
