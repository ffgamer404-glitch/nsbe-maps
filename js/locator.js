/* ═══════════════════════════════════════════════════════════════════
   LOCATOR — where you are, as a green ball.

   And, once the Konami code has been entered, as a tiger. The marker is
   the same object either way; only its face changes, so your position
   never jumps or re-anchors when it transforms.

   Geolocation needs a secure context: it works on localhost and on
   https, and is silently unavailable on a plain http deployment.
   ═══════════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  const ORANGE = '#f76902';
  const DARK = '#1a1a1a';
  const CREAM = '#ffeedd';

  /* ── The tiger face ───────────────────────────────────────────── */
  /* Small, flat and front-on: at marker size anything more is mud. */
  function drawTiger(canvas, size) {
    const dpr = Math.min(global.devicePixelRatio || 1, 2);
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = size + 'px';
    canvas.style.height = size + 'px';

    const c = canvas.getContext('2d');
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.clearRect(0, 0, size, size);

    const m = size / 2;
    const r = size * 0.40;

    /* Ears first, so the head overlaps them. */
    c.fillStyle = ORANGE;
    [[-0.62, -0.62], [0.62, -0.62]].forEach(function (e) {
      c.beginPath();
      c.arc(m + e[0] * r, m + e[1] * r, r * 0.40, 0, Math.PI * 2);
      c.fill();
    });
    c.fillStyle = DARK;
    [[-0.62, -0.62], [0.62, -0.62]].forEach(function (e) {
      c.beginPath();
      c.arc(m + e[0] * r, m + e[1] * r, r * 0.19, 0, Math.PI * 2);
      c.fill();
    });

    /* Head */
    c.fillStyle = ORANGE;
    c.beginPath();
    c.arc(m, m, r, 0, Math.PI * 2);
    c.fill();

    /* Muzzle */
    c.fillStyle = CREAM;
    c.beginPath();
    c.ellipse(m, m + r * 0.30, r * 0.52, r * 0.40, 0, 0, Math.PI * 2);
    c.fill();

    /* Stripes */
    c.strokeStyle = DARK;
    c.lineWidth = Math.max(1.4, r * 0.13);
    c.lineCap = 'round';
    [-1, 1].forEach(function (s) {
      for (let i = 0; i < 2; i++) {
        c.beginPath();
        c.moveTo(m + s * r * (0.52 + i * 0.26), m - r * 0.52);
        c.lineTo(m + s * r * (0.40 + i * 0.26), m - r * 0.14);
        c.stroke();
      }
    });

    /* Eyes */
    c.fillStyle = DARK;
    [-0.34, 0.34].forEach(function (x) {
      c.beginPath();
      c.ellipse(m + x * r, m - r * 0.12, r * 0.13, r * 0.16, 0, 0, Math.PI * 2);
      c.fill();
    });

    /* Nose and mouth */
    c.beginPath();
    c.moveTo(m - r * 0.15, m + r * 0.14);
    c.lineTo(m + r * 0.15, m + r * 0.14);
    c.lineTo(m, m + r * 0.32);
    c.closePath();
    c.fill();

    c.strokeStyle = DARK;
    c.lineWidth = Math.max(1.2, r * 0.09);
    c.beginPath();
    c.moveTo(m, m + r * 0.32);
    c.lineTo(m, m + r * 0.46);
    c.moveTo(m - r * 0.26, m + r * 0.56);
    c.quadraticCurveTo(m, m + r * 0.72, m + r * 0.26, m + r * 0.56);
    c.stroke();
  }

  /* ── The marker ───────────────────────────────────────────────── */
  function Locator(map, opts) {
    this.map = map;
    this.opts = opts || {};
    this.watch = null;
    this.marker = null;
    this.coords = null;        /* [lng, lat] once we know */
    this.isTiger = false;
    this.onMove = this.opts.onMove || function () {};

    const host = document.createElement('div');
    host.className = 'locator';
    host.setAttribute('role', 'img');
    host.setAttribute('aria-label', 'Your position on campus');

    const ball = document.createElement('div');
    ball.className = 'locator-ball';

    const ring = document.createElement('div');
    ring.className = 'locator-ring';

    const tiger = document.createElement('canvas');
    tiger.className = 'locator-tiger';
    drawTiger(tiger, 34);

    host.appendChild(ring);
    host.appendChild(ball);
    host.appendChild(tiger);

    this.host = host;
    this.marker = new maplibregl.Marker({ element: host, anchor: 'center' });
  }

  Locator.prototype.start = function () {
    if (!navigator.geolocation) {
      this.fail('This browser has no geolocation.');
      return;
    }
    /* Secure context only. On plain http the API exists but never fires. */
    if (!global.isSecureContext) {
      this.fail('Location needs https (or localhost).');
      return;
    }

    this.watch = navigator.geolocation.watchPosition(
      (pos) => {
        const lngLat = [pos.coords.longitude, pos.coords.latitude];
        const first = !this.coords;
        this.coords = lngLat;

        this.marker.setLngLat(lngLat);
        if (first) this.marker.addTo(this.map);

        this.host.classList.add('is-live');
        this.onMove(lngLat, pos.coords.accuracy, first);
      },
      (err) => {
        this.fail(err.code === 1
          ? 'Location permission denied.'
          : 'Could not get a fix.');
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 20000 }
    );
  };

  Locator.prototype.fail = function (msg) {
    this.error = msg;
    if (this.opts.onError) this.opts.onError(msg);
  };

  Locator.prototype.stop = function () {
    if (this.watch !== null) navigator.geolocation.clearWatch(this.watch);
    this.watch = null;
  };

  /* The Konami transformation. Same marker, same position — only the
     face changes, so the dot never jumps. */
  Locator.prototype.becomeTiger = function () {
    if (this.isTiger) return;
    this.isTiger = true;
    this.host.classList.add('is-tiger');
    this.host.setAttribute('aria-label', 'Your position on campus, as Ritchie');
  };

  Locator.prototype.becomeBall = function () {
    this.isTiger = false;
    this.host.classList.remove('is-tiger');
    this.host.setAttribute('aria-label', 'Your position on campus');
  };

  global.Locator = Locator;
})(window);
