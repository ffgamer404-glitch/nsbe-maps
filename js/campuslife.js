/* ═══════════════════════════════════════════════════════════════════
   CAMPUS LIFE — clubs and office hours, and the way to them.

   A list of meetings is only half useful. The half that matters is
   "it starts in forty minutes and here is how to get there without
   going outside", so every entry hands its location to the router.

   The data is invented. It says so in the file, it says so on screen,
   and it says so here: nobody should turn up to a room on its word.
   ═══════════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday',
                'Thursday', 'Friday', 'Saturday'];

  /* "18:00" → 1080. Comparing minutes-since-midnight beats comparing
     strings the moment you need "is it on now". */
  function mins(hhmm) {
    const [h, m] = hhmm.split(':').map(Number);
    return h * 60 + m;
  }

  function pretty(hhmm) {
    const [h, m] = hhmm.split(':').map(Number);
    const ampm = h < 12 ? 'am' : 'pm';
    const hour = h % 12 === 0 ? 12 : h % 12;
    return m === 0 ? `${hour}${ampm}` : `${hour}:${String(m).padStart(2, '0')}${ampm}`;
  }

  /* How far off is this, in days, counting from now? Used for sorting
     and for the "today / tomorrow / Thursday" label. */
  function daysAway(day, now) {
    return (DAYS.indexOf(day) - now.getDay() + 7) % 7;
  }

  function whenLabel(day, start, end, now) {
    const away = daysAway(day, now);
    const nowM = now.getHours() * 60 + now.getMinutes();

    if (away === 0) {
      if (nowM >= mins(start) && nowM < mins(end)) return { text: 'on now', state: 'now' };
      if (nowM < mins(start)) {
        const left = mins(start) - nowM;
        if (left <= 90) return { text: `in ${left} min`, state: 'soon' };
        return { text: `today, ${pretty(start)}`, state: 'today' };
      }
      /* Already finished: the next one is a week out. */
      return { text: `${day}s, ${pretty(start)}`, state: 'later' };
    }
    if (away === 1) return { text: `tomorrow, ${pretty(start)}`, state: 'today' };
    return { text: `${day}, ${pretty(start)}`, state: 'later' };
  }

  /* Sort key: things happening now first, then soonest. An entry that
     has already finished today sorts as seven days out, which is when it
     actually next happens. */
  function sortKey(day, start, end, now) {
    const away = daysAway(day, now);
    const nowM = now.getHours() * 60 + now.getMinutes();
    if (away === 0) {
      if (nowM >= mins(start) && nowM < mins(end)) return -1;      /* live */
      if (nowM < mins(start)) return mins(start) - nowM;
      return 7 * 1440;
    }
    return away * 1440 + mins(start) - nowM;
  }

  function CampusLife(data, opts) {
    this.clubs = data.clubs || [];
    this.faculty = data.faculty || [];
    this.onGo = (opts && opts.onGo) || function () {};
    this.nodes = (opts && opts.nodes) || {};
  }

  /* Flatten clubs and office hours into one list of "things with a time
     and a place", so one search and one sort covers both. */
  CampusLife.prototype.entries = function (now) {
    const out = [];

    this.clubs.forEach(c => {
      out.push({
        kind: 'club',
        id: c.id,
        title: c.abbr + ' · ' + c.event,
        full: c.name,
        detail: c.about,
        room: c.room,
        at: c.at,
        day: c.day,
        start: c.start,
        end: c.end,
        when: whenLabel(c.day, c.start, c.end, now),
        sort: sortKey(c.day, c.start, c.end, now),
        search: (c.name + ' ' + c.abbr + ' ' + c.event + ' ' + c.room + ' ' + c.about).toLowerCase()
      });
    });

    this.faculty.forEach(f => {
      (f.hours || []).forEach((h, i) => {
        out.push({
          kind: 'faculty',
          id: f.id + '-' + i,
          title: f.name,
          full: f.dept,
          detail: 'Office hours · ' + f.teaches,
          room: f.room,
          at: f.at,
          day: h.day,
          start: h.start,
          end: h.end,
          when: whenLabel(h.day, h.start, h.end, now),
          sort: sortKey(h.day, h.start, h.end, now),
          search: (f.name + ' ' + f.dept + ' ' + f.teaches + ' ' + f.room).toLowerCase()
        });
      });
    });

    return out.sort((a, b) => a.sort - b.sort);
  };

  CampusLife.prototype.search = function (query, filter, now) {
    const q = (query || '').trim().toLowerCase();
    return this.entries(now || new Date())
      .filter(e => filter === 'all' || e.kind === filter)
      .filter(e => !q || e.search.includes(q));
  };

  /* Render into a list element. Each row carries its destination, so the
     "Take me there" button can hand it straight to the router. */
  CampusLife.prototype.render = function (list, results) {
    list.innerHTML = '';

    if (!results.length) {
      const li = document.createElement('li');
      li.className = 'life-empty';
      li.textContent = 'Nothing matches that.';
      list.appendChild(li);
      return;
    }

    results.forEach(e => {
      const li = document.createElement('li');
      li.className = 'life-row';

      const head = document.createElement('div');
      head.className = 'life-head';

      const title = document.createElement('span');
      title.className = 'life-title';
      title.textContent = e.title;

      const when = document.createElement('span');
      when.className = 'life-when is-' + e.when.state;
      when.textContent = e.when.text;

      head.appendChild(title);
      head.appendChild(when);

      const sub = document.createElement('div');
      sub.className = 'life-sub';
      sub.textContent = e.room + ' · ' + e.full;

      const go = document.createElement('button');
      go.className = 'life-go';
      go.textContent = 'Take me there';
      go.addEventListener('click', () => this.onGo(e));

      li.appendChild(head);
      li.appendChild(sub);
      li.appendChild(go);
      list.appendChild(li);
    });
  };

  CampusLife.pretty = pretty;
  global.CampusLife = CampusLife;
})(window);
