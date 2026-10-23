// ---------- HANDS-ON: once he hangs, the player can grab him anywhere (the nearest joint, or along a limb; nothing is drawn on him),
// lift him up through the trap and let him drop, drag him around, swipe across him to shove him, or tap to poke ----------
const PLAY = { on: false, t: 0, ptrs: new Map(), used: false, ray: new THREE.Raycaster(), ndc: new THREE.Vector2() };
// a touch anywhere along these counts too (it takes the nearer end)
const PLAY_SEGS = [["top", "head"], ["head", "neck"], ["neck", "chest"], ["chest", "spine"], ["spine", "hips"], ["lsh", "rsh"], ["lhip", "rhip"], ["lsh", "lel"], ["lel", "lwr"],
  ["rsh", "rel"], ["rel", "rwr"], ["lhip", "lkn"], ["lkn", "lan"], ["rhip", "rkn"], ["rkn", "ran"], ["lsh", "lhip"], ["rsh", "rhip"]];
const _pv = new THREE.Vector3(), _pw = new THREE.Vector3(), _pr = new THREE.Vector3(), _pu = new THREE.Vector3();
function playPx(i, out) { const H = MAN.hang, k = i * 3; _pv.set(H.x[k], H.x[k + 1], H.x[k + 2]).project(R.camera); out[0] = (_pv.x * 0.5 + 0.5) * R.w; out[1] = (-_pv.y * 0.5 + 0.5) * R.h; out[2] = _pv.z; return out; }
function playPxPerM(p) { const d = Math.max(0.5, _pw.copy(p).sub(R.camera.position).dot(R.camera.getWorldDirection(_pr))); return R.h / (2 * d * Math.tan(THREE.MathUtils.degToRad(R.camera.fov) / 2)); }
function playLocal(e) { const r = $("scene").getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; }
function playPick(sx, sy) {
  const H = MAN.hang; if (!H) return null; const pts = [], taken = i => H.grabs.some(g => g.i === i);
  for (let i = 0; i < H.n; i++) pts.push(playPx(i, [0, 0, 0]));
  const scale = playPxPerM(H.P("hips", _pu)); let best = -1, bd = 1e9;
  for (let i = 0; i < H.n; i++) { if (pts[i][2] > 1 || taken(i)) continue; const d = Math.hypot(pts[i][0] - sx, pts[i][1] - sy); if (d < bd) { bd = d; best = i; } }
  if (best >= 0 && bd <= Math.max(36, 0.2 * scale)) return best;
  let sd = 1e9, si = -1;
  for (const [a, b] of PLAY_SEGS) { const ia = H.I[a], ib = H.I[b], A = pts[ia], B = pts[ib], dx = B[0] - A[0], dy = B[1] - A[1], L2 = dx * dx + dy * dy || 1;
    const t = clamp(((sx - A[0]) * dx + (sy - A[1]) * dy) / L2, 0, 1), d = Math.hypot(A[0] + dx * t - sx, A[1] + dy * t - sy), i = t < 0.5 ? ia : ib;
    if (d < sd && !taken(i)) { sd = d; si = i; } }
  return si >= 0 && sd <= Math.max(28, 0.12 * scale) ? si : null;
}
function playRay(sx, sy, plane, out) { PLAY.ndc.set(sx / R.w * 2 - 1, -(sy / R.h) * 2 + 1); PLAY.ray.setFromCamera(PLAY.ndc, R.camera); return PLAY.ray.ray.intersectPlane(plane, out); }
// where a held point may be taken: up through the trap (not through the deck), not far out from under it, not into the ground
function playClamp(t) {
  const T = LAY.trap, H = LAY.plat.h; t.y = clamp(t.y, 0.15, H + 0.45); // lifted, he comes up through the trap far enough to drop hard, never out onto the deck
  const dx = t.x - T.x, dz = t.z - T.z, d = Math.hypot(dx, dz), m = 1.15; if (d > m) { t.x = T.x + dx / d * m; t.z = T.z + dz / d * m; }
  if (t.y > H - 0.4) { t.x = clamp(t.x, T.x - T.w / 2 + 0.14, T.x + T.w / 2 - 0.14); t.z = clamp(t.z, T.z - T.d / 2 + 0.14, T.z + T.d / 2 - 0.14); }
  return t;
}
function playUsed() { PLAY.used = true; }
function playDown(e) {
  const H = MAN.hang; if (!PLAY.on || !H) return false;
  const [sx, sy] = playLocal(e), i = playPick(sx, sy), now = performance.now();
  const P = { sx, sy, x0: sx, y0: sy, t0: now, lt: now, vx: 0, vy: 0, g: null, plane: null, off: new THREE.Vector3(), hits: new Map() };
  if (i !== null) {
    const p = H.P(RAG_P[i][0], new THREE.Vector3()); P.plane = new THREE.Plane().setFromNormalAndCoplanarPoint(R.camera.getWorldDirection(_pr), p);
    const hp = playRay(sx, sy, P.plane, _pw); if (hp) P.off.subVectors(p, hp);
    P.g = H.grab(i, p); Sound.rustle(p, 0.7); playUsed();
  }
  PLAY.ptrs.set(e.pointerId, P); try { $("scene").setPointerCapture(e.pointerId); } catch (err) {}
  if (e.cancelable) e.preventDefault(); return true;
}
function playMove(e) {
  const P = PLAY.ptrs.get(e.pointerId), H = MAN.hang; if (!P || !H) return;
  const [sx, sy] = playLocal(e), now = performance.now(), dt = Math.max(4, now - P.lt) / 1000;
  P.vx += ((sx - P.sx) / dt - P.vx) * 0.6; P.vy += ((sy - P.sy) / dt - P.vy) * 0.6;
  if (P.g) { const hp = playRay(sx, sy, P.plane, _pw); if (hp) P.g.tgt.copy(playClamp(hp.add(P.off))); }
  else playSwipe(P, P.sx, P.sy, sx, sy, now);
  P.sx = sx; P.sy = sy; P.lt = now; if (e.cancelable) e.preventDefault();
}
function playUp(e) {
  const P = PLAY.ptrs.get(e.pointerId); if (!P) return; PLAY.ptrs.delete(e.pointerId); const H = MAN.hang; if (!H) return;
  if (P.g) { const quick = performance.now() - P.t0 < 230 && Math.hypot(P.sx - P.x0, P.sy - P.y0) < 9, i = P.g.i; H.release(P.g);
    if (quick) { // a tap: a poke that pushes him away from you
      const fw = R.camera.getWorldDirection(_pr); H.push(i, _pu.copy(fw).multiplyScalar(0.7).add(_pw.set(0, 0.1, 0)), 0.4); Sound.thud(H.P(RAG_P[i][0], _pv), 0.35); } }
}
// a swipe across him shoves whatever it passes over, in the direction and at roughly the speed of the finger
function playSwipe(P, ax, ay, bx, by, now) {
  const H = MAN.hang, sp = Math.hypot(P.vx, P.vy); if (sp < 140) return;
  const dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy || 1, pt = [0, 0, 0];
  const cam = R.camera, right = new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 0), up = new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 1), p = new THREE.Vector3(), dv = new THREE.Vector3();
  let first = true;
  for (let i = 0; i < H.n; i++) { playPx(i, pt); if (pt[2] > 1) continue;
    const t = clamp(((pt[0] - ax) * dx + (pt[1] - ay) * dy) / L2, 0, 1), d = Math.hypot(ax + dx * t - pt[0], ay + dy * t - pt[1]);
    H.P(RAG_P[i][0], p); const ppm = playPxPerM(p); if (d > Math.max(22, 0.12 * ppm) || now - (P.hits.get(i) || -1e9) < 260) continue;
    P.hits.set(i, now); const k = Math.min(1, 2 / (sp / ppm)) * 0.5; // the finger's speed in m/s at his depth, capped at 2, and he only takes half of it: he is heavy
    dv.copy(right).multiplyScalar(P.vx / ppm * k).addScaledVector(up, -P.vy / ppm * k);
    H.push(i, dv, 0.36); if (first) { first = false; Sound.thud(p, clamp(dv.length() / 5, 0.25, 0.9)); playUsed(); } }
}
function startBodyPlay() {
  const H = MAN.hang; if (PLAY.on || !H) return; PLAY.on = true; PLAY.t = 0; PLAY.used = false; STATE.ts = 1; $("skip").hidden = true;
  H.onRetaut = sp => { if (sp < 1.2) return; const k = clamp(sp / 5, 0.3, 1); Sound.ropeCreak(GAL.anchor, k); Sound.thud(H.P("neck", _pv), k * 0.7); CAM.shake = Math.max(CAM.shake, k * 0.45);
    if (sp > 3 && PLAY.t - (PLAY.gaspT || -99) > 8) { PLAY.gaspT = PLAY.t; setTimeout(() => Sound.gasp(crowdCenter()), 150); } }; // a hard drop still turns the crowd's stomach
  H.onHit = (at, sp) => Sound.knock(at, clamp(sp / 7, 0.12, 0.7));
  $("stage").style.touchAction = "none"; // nothing on screen says he can be handled: that's for the player to find
}
function stopBodyPlay() {
  if (MAN && MAN.hang) MAN.hang.releaseAll(); PLAY.ptrs.clear(); PLAY.on = false;
  $("stage").style.touchAction = "";
}
function updatePlay(dt) {
  if (!PLAY.on) return; if (!MAN.hang) { stopBodyPlay(); return; }
  PLAY.t += dt;
}
