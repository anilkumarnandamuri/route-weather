'use strict';
(function (root) {
  const pad = n => String(n).padStart(2, '0');
  const isoLocal = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

  function parseTrip(search) {
    const q = new URLSearchParams(search);
    let mode = q.get('mode'), time = q.get('t') || q.get('depart');
    if (!mode && time) mode = 'depart';
    const timed = (mode === 'depart' || mode === 'arrive') && time && !isNaN(new Date(time));
    return {from:q.get('from') || '', to:q.get('to') || '', mode:timed ? mode : 'now', time:timed ? time : null};
  }

  function serializeTrip(trip) {
    const q = new URLSearchParams({from:trip.from, to:trip.to});
    if (trip.mode !== 'now') {
      q.set('mode', trip.mode);
      q.set('t', isoLocal(new Date(trip.time)));
    }
    return '?' + q;
  }

  function snapTarget(heights, visible, velocity) {
    const names = ['peek', 'half', 'full'];
    const projected = clamp(visible + velocity * 180, heights.peek, heights.full);
    let best = names.reduce((a, b) => Math.abs(heights[b]-projected) < Math.abs(heights[a]-projected) ? b : a);
    if (Math.abs(velocity) > .45) {
      const candidates = velocity > 0 ? names.filter(n => heights[n] > visible+4) : names.filter(n => heights[n] < visible-4).reverse();
      if (candidates.length) best = candidates[0];
    }
    return best;
  }

  function velocity(samples, now) {
    const recent = samples.filter(s => now-s.t <= 100);
    if (recent.length < 2) return 0;
    const a = recent[0], b = recent.at(-1);
    return (a.y-b.y) / Math.max(1, b.t-a.t);
  }

  function advanceGesture(height, scroll, delta, heights, maxScroll) {
    let remaining = delta;
    if (remaining > 0 && scroll > 0) {
      const used = Math.min(scroll, remaining);
      scroll -= used;
      remaining -= used;
    }
    if (remaining < 0 && height < heights.full) {
      const used = Math.min(heights.full-height, -remaining);
      height += used;
      remaining += used;
    }
    if (height >= heights.full && remaining < 0) scroll = clamp(scroll-remaining, 0, maxScroll);
    else height = clamp(height-remaining, heights.peek, heights.full);
    return {height, scroll};
  }

  function routePosition(track, duration, elapsed) {
    const fraction = duration > 0 ? clamp(elapsed/duration, 0, 1) : 0;
    const target = track.T.at(-1) * fraction;
    let hi = track.T.findIndex(t => t >= target);
    if (hi < 0) hi = track.T.length-1;
    const lo = Math.max(0, hi-1), span = track.T[hi]-track.T[lo];
    const f = span > 0 ? (target-track.T[lo])/span : 0;
    return {coordinate:track.c[lo].map((v,i) => v+(track.c[hi][i]-v)*f), distance:track.D[lo]+(track.D[hi]-track.D[lo])*f};
  }

  function nearestSample(points, ms) {
    return points.reduce((best,p,i) => Math.abs(p.ms-ms) < Math.abs(points[best].ms-ms) ? i : best, 0);
  }

  function validTrip(t) {
    return t && typeof t.from === 'string' && t.from.trim() && t.from.length <= 500 &&
      typeof t.to === 'string' && t.to.trim() && t.to.length <= 500 &&
      ['now','depart','arrive'].includes(t.mode) &&
      (t.mode === 'now' ? t.time === null : typeof t.time === 'string' && !isNaN(new Date(t.time)));
  }

  function readLibrary(raw) {
    try {
      const data = JSON.parse(raw);
      if (data?.version !== 1) return {version:1, saved:[], recent:[]};
      const records = (list, limit) => Array.isArray(list) ? list.filter(t => validTrip(t) && typeof t.id === 'string' && typeof t.name === 'string' && t.name.length <= 120).slice(0,limit) : [];
      return {version:1, saved:records(data.saved,30), recent:records(data.recent,10)};
    } catch { return {version:1, saved:[], recent:[]}; }
  }

  function addRecent(library, trip, id, updatedAt) {
    const key = t => serializeTrip(t);
    return {...library, recent:[{...trip,id,name:`${trip.from} → ${trip.to}`.slice(0,120),updatedAt}, ...library.recent.filter(t => key(t) !== key(trip))].slice(0,10)};
  }

  const api = {isoLocal,clamp,parseTrip,serializeTrip,snapTarget,velocity,advanceGesture,routePosition,nearestSample,validTrip,readLibrary,addRecent};
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.RouteCore = api;
})(globalThis);
