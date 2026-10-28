// mk_s134: lay out whole courses of the getaway's run (12h) as the game does, seed by seed, and search every way of riding them (a lane change
// or a jump may start on any frame, or only every `every` frames; the horse can be made wider and longer): is there always a clean way through?
// Also: the most of each kind of obstacle a course has out at once (30 m behind to 170 m ahead), against what the game keeps of each
window.__courses = (seeds, opt = {}) => {
  const C = CHASE, H0 = RUN.horse, dt = 1 / 60, ns = Math.round(RUN.shift / dt), nj = Math.round(RUN.jump.dur / dt);
  const half = H0.half + (opt.wide || 0), front = H0.front + (opt.long || 0), back = H0.back + (opt.long || 0), every = opt.every || 1, clearK = opt.clear || 0.7;
  const out = { seeds: seeds.length, fails: [], minRowsPerCourse: 1e9, maxRowsPerCourse: 0, pool: {}, patterns: {} };
  const realPlace = window.placeObstacle;
  for (const seed of seeds) {
    const obs = []; window.placeObstacle = (kind, s, lat, yaw = 0, scale = 1) => { const K = RUN_KINDS[kind]; if (!K) return null; obs.push({ kind, s, lat, halfLat: K.half * scale, halfS: K.depth * scale, low: K.low || 0 }); return { o: { scale: { set() {} } } }; };
    C.rng = rng(seed); C.rowsLaid = 0; C.rows = []; let s = RUN.first; const end = RUN.first + RUN.course;
    try { while (s <= end) { const f = clamp((s - RUN.first) / RUN.course, 0, 1); s += runRow(s, f); } } finally { window.placeObstacle = realPlace; }
    out.minRowsPerCourse = Math.min(out.minRowsPerCourse, C.rows.length); out.maxRowsPerCourse = Math.max(out.maxRowsPerCourse, C.rows.length);
    // the pool: how many of each kind are out at once (the game keeps 30 m behind and sets 170 m ahead)
    for (const k in RUN_KINDS) { let mx = 0; for (const o of obs) { if (o.kind !== k) continue; const n = obs.filter(q => q.kind === k && q.s >= o.s - 0.1 && q.s < o.s + 200).length; mx = Math.max(mx, n); } out.pool[k] = Math.max(out.pool[k] || 0, mx); out.kept = out.kept || {}; out.kept[k] = RUN_KINDS[k].n; }
    // the search: states are [lane, from, k (frames into a lane change), j (frames into a jump)]; every frame keep the ones that hit nothing
    const latOf = (to, from, k) => k === 0 ? RUN.lanes[to + 1] : lerp(RUN.lanes[from + 1], RUN.lanes[to + 1], Ease.inOut(Math.min(1, k / ns)));
    const jyOf = j => { if (!j) return 0; const u = j / nj; return u >= 1 ? 0 : 4 * RUN.jump.up * u * (1 - u); };
    let states = new Map(); states.set('0,0,0,0', [0, 0, 0, 0]); let t = 0, pos = 0, frame = 0, lastOkS = 0;
    obs.sort((a, b) => a.s - b.s); let i0 = 0;
    while (pos < end + 12) {
      const f = clamp((pos - RUN.first) / RUN.course, 0, 1), v = lerp(RUN.speed0, RUN.speed1, f); pos += v * dt; frame++;
      while (i0 < obs.length && obs[i0].s + obs[i0].halfS + back + 2 < pos) i0++;
      const near = []; for (let i = i0; i < obs.length && obs[i].s - obs[i].halfS - front - 2 < pos; i++) near.push(obs[i]);
      const next = new Map(), act = frame % every === 0;
      for (const [to, from, k, j] of states.values()) {
        const k1 = k ? (k + 1 > ns ? 0 : k + 1) : 0, f1 = k1 ? from : to, j1 = j ? (j + 1 > nj ? 0 : j + 1) : 0;
        const opts = [[to, f1, k1, j1]];
        if (act && !k) { for (const d of [-1, 1]) { const t2 = to + d; if (t2 >= -1 && t2 <= 1) opts.push([t2, to, 1, j1]); } }
        if (act && !j) { opts.push([to, f1, k1, 1]); if (!k) for (const d of [-1, 1]) { const t2 = to + d; if (t2 >= -1 && t2 <= 1) opts.push([t2, to, 1, 1]); } }
        for (const st of opts) { const lat = latOf(st[0], st[1], st[2]), jy = jyOf(st[3]); let hit = false;
          for (const o of near) { const ds = o.s - pos; if (ds > front + o.halfS || ds < -back - o.halfS) continue; if (Math.abs(o.lat - lat) > o.halfLat + half) continue; if (o.low && jy > o.low * clearK) continue; hit = true; break; }
          if (!hit) next.set(st.join(','), st); } }
      states = next; if (!states.size) break; lastOkS = pos;
    }
    if (!states.size) { const stuck = obs.filter(o => Math.abs(o.s - lastOkS) < 12).map(o => [o.kind, +o.s.toFixed(1), +o.lat.toFixed(2), o.low]); const row = C.rows.filter(r => Math.abs(r.s - lastOkS) < 14).map(r => [+r.s.toFixed(1), r.cells.join('|'), r.len.toFixed(1)]);
      out.fails.push({ seed, at: +lastOkS.toFixed(1), stuck, row }); }
  }
  return out;
};
1
