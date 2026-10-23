// ---------- RAGDOLL: XPBD particle skeleton for the drop, mapped back onto the mocap rig ----------
// particles sit on joints; [name, bone, kg, collision radius]
const RAG_P = [
  ["hips", "Hips", 11, 0.13], ["spine", "Spine1", 8, 0.13], ["chest", "Spine2", 12, 0.14], ["neck", "Neck", 2, 0.06], ["head", "Head", 4.5, 0.1], ["top", "HeadTop_End", 1, 0.1],
  ["lsh", "LeftArm", 3, 0.07], ["rsh", "RightArm", 3, 0.07], ["lel", "LeftForeArm", 1.8, 0.05], ["rel", "RightForeArm", 1.8, 0.05], ["lwr", "LeftHand", 0.7, 0.05], ["rwr", "RightHand", 0.7, 0.05],
  ["lhip", "LeftUpLeg", 7, 0.09], ["rhip", "RightUpLeg", 7, 0.09], ["lkn", "LeftLeg", 4.5, 0.06], ["rkn", "RightLeg", 4.5, 0.06], ["lan", "LeftFoot", 1.6, 0.06], ["ran", "RightFoot", 1.6, 0.06]
];
// [a, b] rigid; [a, b, lo, hi] range as a multiple of the starting distance; ["reach", a, mid, b, lo, hi] range as a multiple of the limb length
const RAG_C = [
  ["hips", "spine"], ["hips", "lhip"], ["hips", "rhip"], ["lhip", "rhip"], ["spine", "lhip"], ["spine", "rhip"],
  ["chest", "lsh"], ["chest", "rsh"], ["lsh", "rsh"], ["neck", "lsh"], ["neck", "rsh"], ["chest", "neck"], ["spine", "chest"],
  ["hips", "chest", 0.93, 1.01], ["lhip", "lsh", 0.9, 1.03], ["rhip", "rsh", 0.9, 1.03], ["lhip", "rsh", 0.93, 1.03], ["rhip", "lsh", 0.93, 1.03],
  ["neck", "head"], ["head", "top"], ["neck", "top", 0.94, 1.0], ["chest", "head", 0.93, 1.02], ["lsh", "top", 0.85, 1.18], ["rsh", "top", 0.85, 1.18],
  ["lsh", "lel"], ["lel", "lwr"], ["reach", "lsh", "lel", "lwr", 0.42, 0.995], ["rsh", "rel"], ["rel", "rwr"], ["reach", "rsh", "rel", "rwr", 0.42, 0.995], ["lwr", "rwr"],
  ["lhip", "lkn"], ["lkn", "lan"], ["reach", "lhip", "lkn", "lan", 0.66, 0.998], ["rhip", "rkn"], ["rkn", "ran"], ["reach", "rhip", "rkn", "ran", 0.66, 0.998],
  ["lkn", "rkn", 0.8, 2.0], ["lan", "ran", 0.7, 2.4],
  ["lwr", "hips", 0.8, 9], ["rwr", "hips", 0.8, 9], ["lwr", "lhip", 0.7, 9], ["rwr", "rhip", 0.7, 9], ["lel", "spine", 0.85, 9], ["rel", "spine", 0.85, 9]
];
// untied hands: how close a hand or elbow may come to the body (m), instead of the tied man's limits measured from how he stood
const RAG_HANDS = { "lwr-hips": 0.16, "rwr-hips": 0.16, "lwr-lhip": 0.14, "rwr-rhip": 0.14, "lel-spine": 0.13, "rel-spine": 0.13 };
// how a dead weight on a hemp rope moves and settles (values tuned against measured drops, shoves and lifts)
const RAG_TUNE = { ropeK: 140000, vStretch: 45, vSlack: 0.9, vSlackPlay: 0.2, rel: 3.5, relPlay: 3.2, swing: 0.32, swingPlay: 0.28, twist: 5, twistPlay: 1.6,
  lat: 3.5, latPlay: 0.22, flopTop: 5, flopHead: 2, drag: 0.1, iters: 2, mass: 1.3,
  snapWhip: 4, snapLoose: 0.82, snapKick: 1.5, flopBack: 3, // the neck breaking: head whip (m/s), how far over it may then hang, leg jerk (m/s), roll back off the rope
  // a hand on him: he follows it on a slow lag; dragging is slow, lifting slower, slower again once the rope no longer carries him
  grabKg: 40, grabTau: 0.2, grabV: 1.0, grabUp: 0.6, grabDown: 1.6, liftLoad: 0.7,
  // a body with no rope (shot, or cut down): how fast the limbs stop flailing, ground friction per substep
  freeRel: 2.4, friction: 0.16, freeTol: 0.04, freeJmax: 0.002, settle: [1.4, 5, 14] }; // (and how far a loose limb may lie straight, the most a joint limit moves it per pass, when and how hard a loose body settles)
const _kQ = [new THREE.Quaternion(), new THREE.Quaternion(), new THREE.Quaternion(), new THREE.Quaternion()], _kM = new THREE.Matrix4();
const _kA = new THREE.Vector3(), _kB = new THREE.Vector3(), _kC = new THREE.Vector3(), _kD = new THREE.Vector3(), _kE = new THREE.Vector3();
const _kJ = [0, 1, 2, 3, 4, 5].map(() => new THREE.Vector3());
function ragFrame(lat, up, out) { // orthonormal frame: x = lateral, y = up (orthogonalised), z = x × y
  const X = _kA.copy(lat).normalize(), Z = _kC.crossVectors(X, up).normalize(), Y = _kB.crossVectors(Z, X);
  _kM.makeBasis(X, Y, Z); return out.setFromRotationMatrix(_kM);
}
class Ragdoll {
  constructor(actor, anchor, len) {
    const B = actor.ch.bones, n = RAG_P.length; this.actor = actor; this.n = n;
    this.x = new Float32Array(n * 3); this.p = new Float32Array(n * 3); this.v = new Float32Array(n * 3); this.w = new Float32Array(n); this.rad = new Float32Array(n); this.m = new Float32Array(n);
    this.I = {}; this.mass = 0;
    RAG_P.forEach(([nm, bone, kg, r], i) => { kg *= RAG_TUNE.mass; this.I[nm] = i; B[bone].getWorldPosition(_kA); this.x[i * 3] = _kA.x; this.x[i * 3 + 1] = _kA.y; this.x[i * 3 + 2] = _kA.z; this.w[i] = 1 / kg; this.m[i] = kg; this.rad[i] = r; this.mass += kg; });
    this.p.set(this.x); this.wb = this.w.slice();
    const d = (a, b) => Math.hypot(this.x[a * 3] - this.x[b * 3], this.x[a * 3 + 1] - this.x[b * 3 + 1], this.x[a * 3 + 2] - this.x[b * 3 + 2]);
    // the condemned man's wrists are tied: the hands stay together and off his belly. Anyone else's hands are free (a gun arm held out
    // stays no further from the body than it has to, and the two hands are never linked)
    const tied = !!actor.bound;
    this.C = RAG_C.filter(c => tied || !(c[0] === "lwr" && c[1] === "rwr")).map(c => {
      if (c[0] === "reach") { const a = this.I[c[1]], m = this.I[c[2]], b = this.I[c[3]], L = d(a, m) + d(m, b); return { a, b, lo: c[4] * L, hi: c[5] * L }; }
      const a = this.I[c[0]], b = this.I[c[1]], r = d(a, b), free = !tied && RAG_HANDS[c[0] + "-" + c[1]];
      return { a, b, lo: free ? Math.min((c[2] ?? 1) * r, free) : (c[2] ?? 1) * r, hi: (c[3] ?? 1) * r };
    });
    this.free = !anchor; // no rope at all: a body that drops where it stands
    this.anchor = anchor ? anchor.clone() : null; this.len = len; this.ropeT = 0.6; this.taut = false; this.stretch = 0; this.onTaut = null; this.onCatch = null; this.caught = false; this.cPrev = 0;
    this.grabs = []; this.kicks = []; this.play = this.free ? 1 : 0; this.slackT = 0; this.onRetaut = null; this.onHit = null; this.hitT = 0; this.pivot = anchor ? anchor.clone() : null;
    this.calm = 0; this.asleep = false; this.tFree = 0;
    // horizontal swing plane: from the anchor toward where he stands
    if (anchor) { const q = this.ropePt(_kD); this.swing = V3(q.x - anchor.x, 0, q.z - anchor.z); if (this.swing.lengthSq() < 1e-4) this.swing.set(0, 0, 1); this.swing.normalize(); }
    else this.swing = actor.root.localToWorld(V3(0, 0, 1)).sub(actor.root.getWorldPosition(V3())).setY(0).normalize();
    this.flop = actor.root.localToWorld(V3(-1, 0, 0)).sub(actor.root.getWorldPosition(V3())).normalize(); // head falls away from the knot (worn on his left)
    // starting frames + world rotations for every driven bone
    this.F0P = this.frameP(new THREE.Quaternion()); this.F0C = this.frameC(new THREE.Quaternion());
    this.bones = {}; for (const nm of RAG_BONES) { const b = B[nm]; this.bones[nm] = { b, q0: b.getWorldQuaternion(new THREE.Quaternion()), q: new THREE.Quaternion(), d: new THREE.Quaternion() }; }
    this.aim0 = {}; for (const [nm, a, b] of RAG_AIM) this.aim0[nm] = this.dir(a, b, new THREE.Vector3());
    this.armQ = B.Hips.parent.getWorldQuaternion(new THREE.Quaternion());
    this.pf = 0; this.t = 0;
  }
  P(nm, out) { const i = this.I[nm] * 3; return out.set(this.x[i], this.x[i + 1], this.x[i + 2]); }
  dir(a, b, out) { return this.P(b, out).sub(this.P(a, _kE)).normalize(); }
  ropePt(out) { const n = this.I.neck * 3, h = this.I.head * 3, t = this.ropeT; return out.set(lerp(this.x[n], this.x[h], t), lerp(this.x[n + 1], this.x[h + 1], t), lerp(this.x[n + 2], this.x[h + 2], t)); }
  frameP(out) { const l = this.P("lhip", _v1).sub(this.P("rhip", _v2)), u = this.P("spine", _v3).sub(this.P("hips", _v4)); return ragFrame(l, u, out); }
  frameC(out) { const l = this.P("lsh", _v1).sub(this.P("rsh", _v2)), u = this.P("neck", _v3).sub(this.P("chest", _v4)); return ragFrame(l, u, out); }
  step(dt) {
    if (!(dt > 1e-6)) return; // held still (the menu is open): nothing moves, and a zero step would divide by zero
    this.t += dt; const nsub = clamp(Math.ceil(dt / (1 / 480)), 1, 48), h = dt / nsub;
    for (let i = this.kicks.length - 1; i >= 0; i--) { const [at, nm, dv, r] = this.kicks[i]; if (this.t >= at) { this.kick(this.I[nm], dv, r); this.kicks.splice(i, 1); } }
    if (this.asleep) return; // a body at rest on the ground stays put (and costs nothing) until something moves it
    if (this.free && !this.grabs.length && !this.kicks.length) { let ke = 0; for (let i = 0; i < this.n * 3; i++) ke += this.v[i] * this.v[i];
      this.calm = ke < 0.06 ? this.calm + dt : 0; if (this.calm > 1.4) { this.asleep = true; this.v.fill(0); if (this.onRest) this.onRest(this); return; } }
    for (let s = 0; s < nsub; s++) this.substep(h);
    this.capSpeed(14); // a safety net: nothing on a hanged man moves faster than this
    if (this.hitS > 1.3 && this.onHit && this.t - this.hitT > 0.15) { this.hitT = this.t; this.onHit(this.hitAt, this.hitS); } this.hitS = 0;
  }
  substep(h) {
    const x = this.x, p = this.p, v = this.v, w = this.w, n = this.n, g = 9.81;
    const after = this.taut ? 1 : 0, ht = this.I.top * 3, hh = this.I.head * 3;
    for (let i = 0; i < n; i++) { const k = i * 3; v[k + 1] -= g * h;
      p[k] = x[k]; p[k + 1] = x[k + 1]; p[k + 2] = x[k + 2]; }
    // once the neck is broken the head lolls away from the knot (toward his right shoulder, wherever he has turned)
    if (after) { const T = RAG_TUNE, f = this.P("rsh", _kD).sub(this.P("lsh", _kE)).setY(0).normalize();
      for (const [k, a] of [[ht, T.flopTop], [hh, T.flopHead]]) { v[k] += f.x * a * h; v[k + 2] += f.z * a * h; }
      if (T.flopBack) { const b = T.flopBack * h; v[ht] -= f.z * b; v[ht + 2] += f.x * b; } } // (up × f: toward his back) the head rolls a little back, clear of the rope
    if (RAG_TUNE.drag) { const kd = Math.exp(-h * RAG_TUNE.drag); for (let i = 0; i < n * 3; i++) v[i] *= kd; } // air and clothing drag
    for (let i = 0; i < n; i++) { const k = i * 3; x[k] += v[k] * h; x[k + 1] += v[k + 1] * h; x[k + 2] += v[k + 2] * h; }
    // a finger holding a grab point: from where it was at the start of this substep, the point eases toward the finger at a lifting pace
    // (driven, not pushed: its own momentum is not added on top, or it would keep accelerating). It is made heavy while held, so the body hangs off it.
    for (const g of this.grabs) { const T = RAG_TUNE, k = g.i * 3, b = 1 - Math.exp(-h / T.grabTau);
      let dx = (g.tgt.x - p[k]) * b, dy = (g.tgt.y - p[k + 1]) * b, dz = (g.tgt.z - p[k + 2]) * b;
      const carry = this.stretch > 0 ? 1 : T.liftLoad, vh = T.grabV * carry * h, hd = Math.hypot(dx, dz);
      if (hd > vh) { dx *= vh / hd; dz *= vh / hd; } dy = clamp(dy, -T.grabDown * h, T.grabUp * carry * h);
      x[k] = p[k] + dx; x[k + 1] = p[k + 1] + dy; x[k + 2] = p[k + 2] + dz; }
    for (let it = 0; it < RAG_TUNE.iters; it++) { this.solveBody(); this.solveJoints(); }
    this.solveRope(h);
    this.collide(h);
    for (let i = 0; i < n; i++) { const k = i * 3; v[k] = (x[k] - p[k]) / h; v[k + 1] = (x[k + 1] - p[k + 1]) / h; v[k + 2] = (x[k + 2] - p[k + 2]) / h; }
    this.damp(h);
  }
  solveBody() {
    const x = this.x, w = this.w;
    for (const c of this.C) {
      const a = c.a * 3, b = c.b * 3, dx = x[b] - x[a], dy = x[b + 1] - x[a + 1], dz = x[b + 2] - x[a + 2], L = Math.hypot(dx, dy, dz) || 1e-6;
      const tgt = L < c.lo ? c.lo : L > c.hi ? c.hi : L; if (tgt === L) continue;
      const ws = w[c.a] + w[c.b], k = (L - tgt) / L / ws;
      x[a] += dx * k * w[c.a]; x[a + 1] += dy * k * w[c.a]; x[a + 2] += dz * k * w[c.a];
      x[b] -= dx * k * w[c.b]; x[b + 1] -= dy * k * w[c.b]; x[b + 2] -= dz * k * w[c.b];
    }
  }
  solveJoints() { // hinge limits: knees only bend forward, elbows only bend back, thighs barely extend
    const f = this.frameP(_kQ[0]), fw = _kD.set(0, 0, 1).applyQuaternion(f), lat = _kE.set(1, 0, 0).applyQuaternion(f), x = this.x, [H, K, A, ax, off] = _kJ;
    const push = (i, dir, amt) => { const k = i * 3; amt *= this.w[i] / this.wb[i]; x[k] += dir.x * amt; x[k + 1] += dir.y * amt; x[k + 2] += dir.z * amt; }; // a held point barely yields
    const w = this.w, free = this.free, mv = (i, dir, s) => { const k = i * 3; x[k] += dir.x * s; x[k + 1] += dir.y * s; x[k + 2] += dir.z * s; };
    // move joint m along dir by amt, measured from the line a-b it sits on (t: how far along from a). On the rope only the joint moves. A body
    // lying loose shares it with its neighbours instead, so a limb that can't straighten against the ground never shoves the whole body
    // along or up into the air (momentum is kept), and no single correction is violent.
    const bend = (m, a, b, t, dir, amt) => { if (!free) { push(m, dir, amt); return; }
      amt = Math.sign(amt) * Math.min(Math.abs(amt), RAG_TUNE.freeJmax); const l = amt / (w[m] + w[a] * (1 - t) * (1 - t) + w[b] * t * t);
      mv(m, dir, w[m] * l); mv(a, dir, -w[a] * l * (1 - t)); if (b !== a) mv(b, dir, -w[b] * l * t); };
    let lt = 0; const lineOff = (a, m, b) => { this.P(a, H); this.P(m, K); this.P(b, A); ax.subVectors(A, H); const t = lt = clamp(off.subVectors(K, H).dot(ax) / (ax.lengthSq() || 1e-6), 0, 1); return off.addScaledVector(ax, -t); };
    const tol = free ? RAG_TUNE.freeTol ?? 0 : 0; // lying loose, a limb may lie straight (or a touch past it) without a fight with the ground
    for (const [hip, kn, an, side] of RAG_LEGS) { const ih = this.I[hip], ik = this.I[kn], ia = this.I[an];
      let d = lineOff(hip, kn, an).dot(fw); if (d < 0.012 - tol) bend(ik, ih, ia, lt, fw, 0.012 - tol - d);
      this.P(hip, H); this.P(kn, K); const th = off.subVectors(K, H), tl = th.length() || 1e-6, e = th.dot(fw) / tl;
      if (e < -0.2) bend(ik, ih, ih, 0, fw, (-0.2 - e) * tl);
      const ab = th.dot(lat) * side / tl; if (ab > 0.45) bend(ik, ih, ih, 0, lat, -side * (ab - 0.45) * tl); else if (ab < -0.15) bend(ik, ih, ih, 0, lat, side * (-0.15 - ab) * tl);
    }
    for (const [sh, el, wr] of RAG_ARMS) { const d = lineOff(sh, el, wr).dot(fw); if (d > -0.01 + tol) bend(this.I[el], this.I[sh], this.I[wr], lt, fw, -0.01 + tol - d); }
  }
  rub(k) { const f = RAG_TUNE.friction, x = this.x, p = this.p; x[k] = lerp(x[k], p[k], f); x[k + 2] = lerp(x[k + 2], p[k + 2], f); } // sliding on the ground or the deck
  // the rope is cut: from here on he is a free body (the noose stays round his neck)
  cutRope() { this.free = true; this.stretch = 0; this.play = 1; this.calm = 0; this.asleep = false; this.tFree = this.t; }
  solveRope(h) { // elastic, damped rope: a one-sided distance constraint on the noose point
    if (this.free) { this.stretch = 0; return; }
    const n = this.I.neck, hd = this.I.head, t = this.ropeT, x = this.x, v = this.v, q = this.ropePt(_v1), A = this.anchor, P = this.pivot;
    // the rope comes down through the trap; when he swings out under the deck it bends round the joists framing the opening
    let pre = 0; P.copy(A); const yb = LAY.plat.h - 0.28;
    if (q.y < yb - 0.01) { const T = LAY.trap, m = 0.03, k = (A.y - yb) / (A.y - q.y), cx = A.x + (q.x - A.x) * k, cz = A.z + (q.z - A.z) * k;
      const ex = clamp(cx, T.x - T.w / 2 + m, T.x + T.w / 2 - m), ez = clamp(cz, T.z - T.d / 2 + m, T.z + T.d / 2 - m);
      if (ex !== cx || ez !== cz) { P.set(ex, yb, ez); pre = P.distanceTo(A); } }
    const dx = q.x - P.x, dy = q.y - P.y, dz = q.z - P.z, L = Math.hypot(dx, dy, dz) || 1e-6, C = L + pre - this.len;
    // the end of the fall: the rope has stretched as far as it will and starts to give him back
    if (this.taut && !this.caught && C < this.cPrev) { this.caught = true; this.tCatch = this.t; if (this.onCatch) this.onCatch(); } this.cPrev = C;
    if (C <= 0) { this.stretch = 0; if (this.taut) this.slackT += h; return; }
    const nx = dx / L, ny = dy / L, nz = dz / L;
    if (!this.taut) { this.taut = true; this.slackT = 0; this.snapNeck(); if (this.onTaut) this.onTaut(); }
    else if (this.slackT > 0.12) { // caught again after he was lifted or bounced: how hard the rope bites
      const sp = lerp(v[n * 3] * nx + v[n * 3 + 1] * ny + v[n * 3 + 2] * nz, v[hd * 3] * nx + v[hd * 3 + 1] * ny + v[hd * 3 + 2] * nz, t);
      if (this.onRetaut) this.onRetaut(sp); }
    this.slackT = 0;
    (this.rn || (this.rn = new THREE.Vector3())).set(nx, ny, nz);
    const wn = this.w[n] * (1 - t) * (1 - t) + this.w[hd] * t * t, alpha = 1 / RAG_TUNE.ropeK / (h * h), dl = -C / (wn + alpha);
    const an = (1 - t) * this.w[n] * dl, ah = t * this.w[hd] * dl;
    x[n * 3] += nx * an; x[n * 3 + 1] += ny * an; x[n * 3 + 2] += nz * an; x[hd * 3] += nx * ah; x[hd * 3 + 1] += ny * ah; x[hd * 3 + 2] += nz * ah;
    this.stretch = C;
  }
  collide(h) { // the deck (a thick slab with the trap opening cut in it), the open leaves, the ground: inelastic contacts that never add speed
    const T = LAY.trap, Pl = LAY.plat, H = Pl.h, x0 = T.x - T.w / 2, x1 = T.x + T.w / 2, z0 = T.z - T.d / 2, z1 = T.z + T.d / 2, x = this.x, p = this.p;
    const X0 = Pl.x - Pl.w / 2, X1 = Pl.x + Pl.w / 2, Z0 = Pl.z - Pl.d / 2, Z1 = Pl.z + Pl.d / 2, yb = H - 0.28, yt = H + 0.03, leafB = H - 0.58; let hit = 0, hk = -1;
    // move particle k by (dx,dy,dz) along a contact normal; its velocity into the surface is dropped, nothing is added
    const shove = (k, dx, dy, dz) => { const d = Math.hypot(dx, dy, dz); if (d < 1e-9) return; const nx = dx / d, ny = dy / d, nz = dz / d;
      x[k] += dx; x[k + 1] += dy; x[k + 2] += dz; p[k] += dx; p[k + 1] += dy; p[k + 2] += dz;
      const vn = (x[k] - p[k]) * nx + (x[k + 1] - p[k + 1]) * ny + (x[k + 2] - p[k + 2]) * nz; if (vn < 0) { p[k] += nx * vn; p[k + 1] += ny * vn; p[k + 2] += nz * vn; if (-vn / h > hit) { hit = -vn / h; hk = k; } } };
    for (let i = 0; i < this.n; i++) { const k = i * 3, r = this.rad[i]; let px = x[k], py = x[k + 1], pz = x[k + 2];
      // the deck: solid everywhere except the opening; push out the shortest way (up, down, or sideways into the opening)
      if (py > yb - r && py < yt + r && px > X0 - r && px < X1 + r && pz > Z0 - r && pz < Z1 + r) {
        const ex = px < x0 + r ? x0 + r - px : px > x1 - r ? x1 - r - px : 0, ez = pz < z0 + r ? z0 + r - pz : pz > z1 - r ? z1 - r - pz : 0;
        if (ex || ez) { const hor = Math.hypot(ex, ez), up = yt + r - py, dn = py - (yb - r);
          // (or off the nearest outer edge: a limb hanging over the side is pushed clear of it, not lifted onto the deck or dropped through it)
          const ox = px - (X0 - r) < X1 + r - px ? X0 - r - px : X1 + r - px, oz = pz - (Z0 - r) < Z1 + r - pz ? Z0 - r - pz : Z1 + r - pz, out = Math.min(Math.abs(ox), Math.abs(oz));
          if (out < hor && out < up && out < dn) { if (Math.abs(ox) < Math.abs(oz)) shove(k, ox, 0, 0); else shove(k, 0, 0, oz); }
          else if (hor <= up && hor <= dn) shove(k, ex, 0, ez); else if (up < dn) { shove(k, 0, up, 0); if (this.free) this.rub(k); } else shove(k, 0, -dn, 0); }
        px = x[k]; py = x[k + 1]; pz = x[k + 2]; }
      // the open leaves: thin walls hanging from the opening's side edges; whatever side a limb is on, it stays there
      if (py > leafB - r && py < yb && pz > z0 && pz < z1) for (const xw of [x0, x1]) { if (Math.abs(px - xw) >= r) continue; const side = (p[k] - xw) >= 0 ? 1 : -1; shove(k, xw + side * r - px, 0, 0); px = x[k]; }
      if (this.solids) for (const S of this.solids) { // a building's walls, roof and porch (a gunman shot off a roof): out through the face it came in by
        const U = S.u, E = S.h, cx = x[k] - S.c.x, cy = x[k + 1] - S.c.y, cz = x[k + 2] - S.c.z;
        const L0 = cx * U[0].x + cy * U[0].y + cz * U[0].z, L1 = cx * U[1].x + cy * U[1].y + cz * U[1].z, L2 = cx * U[2].x + cy * U[2].y + cz * U[2].z;
        if (Math.abs(L0) >= E[0] + r || Math.abs(L1) >= E[1] + r || Math.abs(L2) >= E[2] + r) continue;
        const qx = p[k] - S.c.x, qy = p[k + 1] - S.c.y, qz = p[k + 2] - S.c.z, L = [L0, L1, L2];
        const Q = [qx * U[0].x + qy * U[0].y + qz * U[0].z, qx * U[1].x + qy * U[1].y + qz * U[1].z, qx * U[2].x + qy * U[2].y + qz * U[2].z];
        let best = -1, bd = Infinity, sg = 1;
        for (let a = 0; a < 3; a++) if (Math.abs(Q[a]) >= E[a] + r - 2e-3) { const g = Math.sign(Q[a]) || 1, dd = E[a] + r - g * L[a]; if (dd < bd) { bd = dd; best = a; sg = g; } }
        if (best < 0) for (let a = 0; a < 3; a++) { const g = Math.sign(L[a]) || 1, dd = E[a] + r - g * L[a]; if (dd < bd) { bd = dd; best = a; sg = g; } }
        const u = U[best]; shove(k, u.x * sg * bd, u.y * sg * bd, u.z * sg * bd); if (this.free && u.y * sg > 0.5) this.rub(k); }
      const gy = (this.solids ? groundHeight(x[k], x[k + 2]) : 0) + (this.free ? r * 0.8 : 0.05); // a free body lies on the ground on its full girth; the hanged man's toes only ever brush it
      if (x[k + 1] < gy) { shove(k, 0, gy - x[k + 1], 0); if (this.free) this.rub(k); } }
    if (hit > (this.hitS || 0)) { this.hitS = hit; (this.hitAt || (this.hitAt = new THREE.Vector3())).set(x[hk], x[hk + 1], x[hk + 2]); }
  }
  // ---- hands-on: grab points the player can drag, and slaps from a swipe ----
  grab(i, tgt) { const g = { i, tgt: tgt.clone(), w0: this.w[i] }; this.w[i] = Math.min(this.w[i], 1 / RAG_TUNE.grabKg); this.grabs.push(g); this.play = 1; return g; }
  release(g) { const k = this.grabs.indexOf(g); if (k < 0) return; this.grabs.splice(k, 1); this.w[g.i] = g.w0; this.capSpeed(4.5); }
  capSpeed(vmax) { const v = this.v; for (let i = 0; i < this.n; i++) { const k = i * 3, s = Math.hypot(v[k], v[k + 1], v[k + 2]); if (s > vmax) { const f = vmax / s; v[k] *= f; v[k + 1] *= f; v[k + 2] *= f; } } }
  releaseAll() { for (const g of [...this.grabs]) this.release(g); }
  // the moment the rope bites: the neck gives way (the head can loll further over), the head whips across, the legs and bound arms jerk,
  // and a spasm runs down one leg and then the other. Applied at the start of the next steps (velocities set mid-substep would be overwritten).
  snapNeck() {
    for (const c of this.C) { const nm = RAG_P[c.a][0] + "-" + RAG_P[c.b][0];
      if (nm === "rsh-top") { c.lo *= RAG_TUNE.snapLoose; c.hi *= 1 + (1 - RAG_TUNE.snapLoose) * 0.67; } } // over toward the shoulder away from the knot
    const t = this.t, L = this.P("lsh", V3()).sub(this.P("rsh", V3())).setY(0).normalize(), fw = V3().crossVectors(L, V_UP).normalize(), s = Math.random() < 0.5 ? 1 : -1;
    const T = RAG_TUNE, k = T.snapKick / 1.5, up = y => V3(0, y, 0), F = (a, b, c) => fw.clone().multiplyScalar(a).addScaledVector(L, b).add(up(c));
    this.kicks.push([t, "top", F(0, -T.snapWhip, 0), 0.1], [t, "lan", F(1.5 * k, 0.5 * s * k, 0.6 * k), 0.16], [t, "ran", F(1.2 * k, -0.4 * s * k, 0.5 * k), 0.16], [t, "lwr", up(1.1), 0.08], [t, "rwr", up(1.1), 0.08],
      [t + 0.55, s > 0 ? "lan" : "ran", F(0.9, 0, 0.45), 0.14], [t + 0.95, s > 0 ? "ran" : "lan", F(0.55, 0, 0.25), 0.14]);
  }
  push(i, dv, radius = 0.32) { this.play = 1; this.kick(i, dv, radius); } // a player's shove: from here on he swings freely
  kick(i, dv, radius = 0.32) { // a velocity kick centred on particle i, fading with distance across the body
    const x = this.x, v = this.v, k0 = i * 3; this.asleep = false; this.calm = 0;
    for (let j = 0; j < this.n; j++) { const k = j * 3, d2 = (x[k] - x[k0]) ** 2 + (x[k + 1] - x[k0 + 1]) ** 2 + (x[k + 2] - x[k0 + 2]) ** 2, f = Math.exp(-d2 / (radius * radius));
      v[k] += dv.x * f; v[k + 1] += dv.y * f; v[k + 2] += dv.z * f; }
  }
  damp(h) { // limbs settle, the swing decays slowly (in one plane until he is handled), the rope's stretch and recoil die fast
    const v = this.v, x = this.x, m = this.m, n = this.n; let M = 0, cx = 0, cz = 0, vx = 0, vy = 0, vz = 0;
    for (let i = 0; i < n; i++) { const k = i * 3; M += m[i]; cx += m[i] * x[k]; cz += m[i] * x[k + 2]; vx += m[i] * v[k]; vy += m[i] * v[k + 1]; vz += m[i] * v[k + 2]; }
    cx /= M; cz /= M; vx /= M; vy /= M; vz /= M;
    let L = 0, Iy = 0; for (let i = 0; i < n; i++) { const k = i * 3, rx = x[k] - cx, rz = x[k + 2] - cz; L += m[i] * (rz * (v[k] - vx) - rx * (v[k + 2] - vz)); Iy += m[i] * (rx * rx + rz * rz); }
    // once the player starts handling him the swing is free in every direction and he can turn on the rope (still damped, like a real dead weight)
    const T = RAG_TUNE, pl = this.play, wy = Iy > 1e-6 ? L / Iy : 0, kTw = 1 - Math.exp(-h * lerp(T.twist, T.twistPlay, pl)), kRel = 1 - Math.exp(-h * (this.free ? T.freeRel : this.taut ? lerp(T.rel, T.relPlay, pl) : 0.5)), kG = Math.exp(-h * lerp(T.swing, T.swingPlay, pl));
    const s = this.swing, latX = -s.z, latZ = s.x, vl = vx * latX + vz * latZ, kLat = 1 - Math.exp(-h * lerp(T.lat, T.latPlay, pl));
    let nvx = (vx - latX * vl * kLat) * kG, nvy = vy, nvz = (vz - latZ * vl * kLat) * kG, ks = 1;
    if (this.free) { nvx = vx; nvz = vz; // no rope: nothing steers or slows the body as a whole (contacts and friction do that)...
      const S = T.settle, tf = this.t - this.tFree; if (S && tf > S[0]) { ks = Math.exp(-h * Math.min(S[2], (tf - S[0]) * S[1])); nvx *= ks; nvz *= ks; if (nvy > 0) nvy *= ks; } } // ...until it has been down a while: then it settles
    else if (this.stretch > 0 && this.rn) { // taut: stretch and recoil along the rope die quickly (hemp is lossy); the swing across it is left alone
      const r = this.rn, vr = nvx * r.x + nvy * r.y + nvz * r.z, k = 1 - Math.exp(-h * T.vStretch); nvx -= r.x * vr * k; nvy -= r.y * vr * k; nvz -= r.z * vr * k; }
    else if (this.taut) nvy *= Math.exp(-h * lerp(T.vSlack, T.vSlackPlay, pl));
    for (let i = 0; i < n; i++) { const k = i * 3, rx = x[k] - cx, rz = x[k + 2] - cz;
      let ux = v[k] - vx - wy * rz * kTw, uz = v[k + 2] - vz + wy * rx * kTw, uy = v[k + 1] - vy;
      const kr = (1 - kRel) * ks; ux *= kr; uy *= kr; uz *= kr;
      v[k] = nvx + ux; v[k + 1] = nvy + uy; v[k + 2] = nvz + uz; }
  }
  // drive the skeleton: each bone = (parent's change) then the swing that points it at its child particle
  pose(dt) {
    const S = this.bones, dP = this.frameP(_kQ[0]).multiply(_kQ[1].copy(this.F0P).invert()), dC = this.frameC(_kQ[2]).multiply(_kQ[3].copy(this.F0C).invert());
    const set = (nm, d) => { const e = S[nm]; e.d.copy(d); e.q.copy(d).multiply(e.q0); };
    const aimed = (nm, parent, a, b) => { const e = S[nm], pd = typeof parent === "string" ? S[parent].d : parent;
      const from = _v1.copy(this.aim0[nm]).applyQuaternion(pd), to = this.dir(a, b, _v2); _q1.setFromUnitVectors(from, to);
      e.d.copy(_q1).multiply(pd); e.q.copy(e.d).multiply(e.q0); };
    set("Hips", dP); set("Spine", _q2.copy(dP).slerp(dC, 0.33)); set("Spine1", _q2.copy(dP).slerp(dC, 0.67)); set("Spine2", dC);
    set("LeftShoulder", dC); set("RightShoulder", dC);
    aimed("Neck", dC, "neck", "head"); aimed("Head", "Neck", "head", "top");
    aimed("LeftArm", dC, "lsh", "lel"); aimed("LeftForeArm", "LeftArm", "lel", "lwr"); set("LeftHand", S.LeftForeArm.d);
    aimed("RightArm", dC, "rsh", "rel"); aimed("RightForeArm", "RightArm", "rel", "rwr"); set("RightHand", S.RightForeArm.d);
    aimed("LeftUpLeg", dP, "lhip", "lkn"); aimed("LeftLeg", "LeftUpLeg", "lkn", "lan");
    aimed("RightUpLeg", dP, "rhip", "rkn"); aimed("RightLeg", "RightUpLeg", "rkn", "ran");
    // feet hang limp: follow the shin, toes relaxing downward (never spinning on their own)
    this.pf += ((this.taut ? 0.62 : 0.15) - this.pf) * Math.min(1, dt * (this.taut ? 2.2 : 4));
    for (const s of ["Left", "Right"]) { const sh = S[s + "Leg"].d, ax = _v3.set(1, 0, 0).applyQuaternion(this.F0P).applyQuaternion(sh);
      _q1.setFromAxisAngle(ax.normalize(), this.pf); set(s + "Foot", _q2.copy(_q1).multiply(sh)); }
    // world -> local, parents first
    for (const nm of RAG_BONES) { const e = S[nm], par = e.b.parent, pq = S[par.name.replace("mixamorig", "")]; const pw = pq ? pq.q : this.armQ;
      e.b.quaternion.copy(_q3.copy(pw).invert().multiply(e.q)); }
    const hb = S.Hips.b; hb.position.copy(hb.parent.worldToLocal(this.P("hips", _v1)));
    this.actor.root.updateMatrixWorld(true);
  }
}
// two loose bodies that come to lie on each other: their particles keep apart (a resting contact, no bounce). Run once a frame after both
// have stepped; a body that has gone to sleep is solid ground for the other.
function ragTouch(A, B) {
  if (A.asleep && B.asleep) return; const xa = A.x, xb = B.x, va = A.v, vb = B.v;
  for (let i = 0; i < A.n; i++) { const ki = i * 3, wa = A.asleep ? 0 : A.w[i];
    for (let j = 0; j < B.n; j++) { const kj = j * 3, dx = xa[ki] - xb[kj], dy = xa[ki + 1] - xb[kj + 1], dz = xa[ki + 2] - xb[kj + 2], r = (A.rad[i] + B.rad[j]) * 0.85, d2 = dx * dx + dy * dy + dz * dz;
      if (d2 >= r * r) continue; const wb = B.asleep ? 0 : B.w[j], ws = wa + wb; if (!ws) continue;
      const d = Math.sqrt(d2), nx = d > 1e-6 ? dx / d : 0, ny = d > 1e-6 ? dy / d : 1, nz = d > 1e-6 ? dz / d : 0, pen = r - d, sa = pen * wa / ws, sb = pen * wb / ws;
      xa[ki] += nx * sa; xa[ki + 1] += ny * sa; xa[ki + 2] += nz * sa; xb[kj] -= nx * sb; xb[kj + 1] -= ny * sb; xb[kj + 2] -= nz * sb;
      const rv = (va[ki] - vb[kj]) * nx + (va[ki + 1] - vb[kj + 1]) * ny + (va[ki + 2] - vb[kj + 2]) * nz;
      if (rv < 0) { const ka = rv * wa / ws, kb = rv * wb / ws; va[ki] -= nx * ka; va[ki + 1] -= ny * ka; va[ki + 2] -= nz * ka; vb[kj] += nx * kb; vb[kj + 1] += ny * kb; vb[kj + 2] += nz * kb; } } }
}
const RAG_LEGS = [["lhip", "lkn", "lan", 1], ["rhip", "rkn", "ran", -1]], RAG_ARMS = [["lsh", "lel", "lwr"], ["rsh", "rel", "rwr"]];
const RAG_BONES = ["Hips", "Spine", "Spine1", "Spine2", "Neck", "Head", "LeftShoulder", "LeftArm", "LeftForeArm", "LeftHand", "RightShoulder", "RightArm", "RightForeArm", "RightHand",
  "LeftUpLeg", "LeftLeg", "LeftFoot", "RightUpLeg", "RightLeg", "RightFoot"];
const RAG_AIM = [["Neck", "neck", "head"], ["Head", "head", "top"], ["LeftArm", "lsh", "lel"], ["LeftForeArm", "lel", "lwr"], ["RightArm", "rsh", "rel"], ["RightForeArm", "rel", "rwr"],
  ["LeftUpLeg", "lhip", "lkn"], ["LeftLeg", "lkn", "lan"], ["RightUpLeg", "rhip", "rkn"], ["RightLeg", "rkn", "ran"]];
