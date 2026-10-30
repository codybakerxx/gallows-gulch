// ---------- PROPS: gallows, trap, lever, rope + noose, easel whiteboard, set dressing ----------
const GAL = { group: null, doors: [], lever: null, leverPivot: null, rope: null, anchor: new THREE.Vector3(), lanterns: [] };
function place(m, x, y, z, parent) { m.position.set(x, y, z); (parent || GAL.group).add(m); return m; }
function buildGallows() {
  const P = LAY.plat, g = new THREE.Group(); GAL.group = g; R.scene.add(g);
  const x0 = P.x - P.w / 2, x1 = P.x + P.w / 2, z0 = P.z - P.d / 2, z1 = P.z + P.d / 2, H = P.h;
  const T = LAY.trap, tx0 = T.x - T.w / 2, tx1 = T.x + T.w / 2, tz0 = T.z - T.d / 2, tz1 = T.z + T.d / 2;
  // legs + joists
  for (const x of [x0 + 0.08, P.x - 0.95, P.x + 0.95, x1 - 0.08]) for (const z of [z0 + 0.08, z1 - 0.08]) place(woodBox(0.16, H - 0.06, 0.16), x, (H - 0.06) / 2, z);
  for (const z of [z0 + 0.08, tz0 - 0.08, tz1 + 0.08, z1 - 0.08]) place(woodBox(P.w, 0.2, 0.12, MAT.woodDark, true), P.x, H - 0.16, z);
  for (const x of [tx0 - 0.07, tx1 + 0.07]) place(woodBox(0.12, 0.2, P.d, MAT.woodDark), x, H - 0.16, P.z);
  // X braces between legs (front pair outside the drop zone, sides)
  const brace = (ax, az, bx, bz) => { const len = Math.hypot(bx - ax, bz - az, H - 0.5); const m = woodBox(0.09, len, 0.06, MAT.woodDark);
    m.position.set((ax + bx) / 2, H / 2 - 0.1, (az + bz) / 2); m.lookAt(bx, H - 0.35, bz); m.rotateX(Math.PI / 2); g.add(m); };
  brace(x0 + 0.08, z0 + 0.08, x0 + 0.08, z1 - 0.08); brace(x0 + 0.08, z1 - 0.08, x0 + 0.08, z0 + 0.08);
  brace(x0 + 0.08, z0 + 0.08, P.x - 0.95, z0 + 0.08); brace(P.x - 0.95, z0 + 0.08, x0 + 0.08, z0 + 0.08);
  // skirt on back + left sides
  for (let x = x0; x < x1; x += 0.2) place(woodBox(0.19, H - 0.4, 0.04, MAT.woodDark), x + 0.1, (H - 0.4) / 2, z0 - 0.02).rotation.z = (Math.random() - 0.5) * 0.01;
  for (let z = z0; z < z1; z += 0.2) place(woodBox(0.04, H - 0.4, 0.19, MAT.woodDark), x0 - 0.02, (H - 0.4) / 2, z + 0.1);
  // deck planks running along x, with the trap opening cut out
  const pw = 0.19, rr = rng(3);
  for (let z = z0 + pw / 2; z < z1; z += pw + 0.006) {
    const shade = rr() < 0.3 ? MAT.woodDark : MAT.wood, dy = (rr() - 0.5) * 0.008;
    if (z > tz0 && z < tz1) {
      place(woodBox(tx0 - x0, 0.055, pw, shade, true), (x0 + tx0) / 2, H + dy, z); place(woodBox(x1 - tx1, 0.055, pw, shade, true), (x1 + tx1) / 2, H + dy, z);
    } else place(woodBox(P.w, 0.055, pw, shade, true), P.x, H + dy, z);
  }
  // trap doors: two leaves hinged on their outer edges
  for (const side of [-1, 1]) {
    const pivot = new THREE.Group(); pivot.position.set(side < 0 ? tx0 : tx1, H + 0.0, T.z); g.add(pivot);
    for (let z = -T.d / 2 + pw / 2; z < T.d / 2; z += pw + 0.006) { const b = woodBox(T.w / 2 - 0.01, 0.055, pw, MAT.wood, true); b.position.set(-side * (T.w / 4), 0, z); pivot.add(b); }
    const hinge = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.06, 0.14), MAT.iron); hinge.position.set(0, 0, -0.3); pivot.add(hinge); const h2 = hinge.clone(); h2.position.z = 0.3; pivot.add(h2);
    GAL.doors.push({ pivot, side, ang: 0, vel: 0, slams: 0 });
  }
  // uprights, crossbeam, knee braces
  for (const x of LAY.postX) place(woodBox(0.24, LAY.beamY + 0.35, 0.24), x, (LAY.beamY + 0.35) / 2, P.z);
  place(woodBox(4.0, 0.26, 0.26, MAT.wood, true), P.x, LAY.beamY, P.z);
  for (const [x, s] of [[LAY.postX[0], 1], [LAY.postX[1], -1]]) { const b = woodBox(0.14, 1.05, 0.14, MAT.woodDark); b.position.set(x + s * 0.37, LAY.beamY - 0.42, P.z); b.rotation.z = -s * Math.PI / 4; g.add(b); }
  // rope coils round the beam
  GAL.anchor.set(P.x, LAY.beamY - 0.14, P.z);
  for (let i = 0; i < 3; i++) { const c = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.022, 8, 20), MAT.rope); c.rotation.y = Math.PI / 2; c.position.set(P.x - 0.05 + i * 0.05, LAY.beamY, P.z); c.scale.set(1, 1.05, 1); g.add(c); }
  // stairs
  const S = LAY.stairs, rise = H / S.n, run = (S.zBot - S.zTop) / S.n;
  for (let i = 1; i < S.n; i++) place(woodBox(S.w, 0.05, run + 0.04, MAT.wood), S.x, i * rise, S.zBot - (i - 0.5) * run);
  for (const sx of [-1, 1]) { const len = Math.hypot(H, S.zBot - S.zTop); const s = woodBox(0.06, 0.28, len, MAT.woodDark); s.position.set(S.x + sx * (S.w / 2 + 0.03), H / 2 - 0.1, (S.zBot + S.zTop) / 2); s.rotation.x = Math.atan2(H, S.zBot - S.zTop); g.add(s); }
  const rpb = place(woodBox(0.08, 1.0, 0.08, MAT.woodDark), S.x + 0.56, 0.5, S.zBot - 0.1), rpt = place(woodBox(0.08, 1.0, 0.08, MAT.woodDark), S.x + 0.56, H + 0.5, S.zTop + 0.05);
  { const len = Math.hypot(H, S.zBot - S.zTop - 0.15); const rail = woodBox(0.07, 0.07, len, MAT.wood); rail.position.set(S.x + 0.56, H / 2 + 0.98, (S.zBot + S.zTop) / 2); rail.rotation.x = Math.atan2(H, S.zBot - S.zTop - 0.15); g.add(rail); }
  // back railing
  for (let x = x0 + 0.1; x <= x1; x += 0.85) place(woodBox(0.08, 1.0, 0.08, MAT.woodDark), x, H + 0.5, z0 + 0.1);
  place(woodBox(P.w, 0.07, 0.07, MAT.wood, true), P.x, H + 1.0, z0 + 0.1);
  // lever
  const L = LAY.lever, base = place(woodBox(0.3, 0.16, 0.3, MAT.woodDark), L.x, H + 0.08, L.z);
  const lp = new THREE.Group(); lp.position.set(L.x, H + 0.16, L.z); g.add(lp); GAL.leverPivot = lp;
  const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.028, 1.0, 10), MAT.iron); bar.position.y = 0.5; bar.castShadow = true; lp.add(bar);
  const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.2, 12), MAT.woodDark); grip.position.y = 1.02; lp.add(grip);
  GAL.leverTip = grip; lp.rotation.z = -0.35; GAL.lever = 0;
  // wanted poster on the right upright
  const pc = document.createElement("canvas"); pc.width = 256; pc.height = 340; const pg = pc.getContext("2d");
  pg.fillStyle = "#d9c49a"; pg.fillRect(0, 0, 256, 340); pg.fillStyle = "#2a1a10"; pg.textAlign = "center"; pg.font = '64px "Sancreek",Georgia,serif'; pg.fillText("WANTED", 128, 70);
  pg.fillStyle = "#5a4630"; pg.fillRect(58, 92, 140, 150); pg.fillStyle = "#2a1a10"; pg.font = '700 26px "Zilla Slab",Georgia,serif'; pg.fillText("DEAD OR ALIVE", 128, 278); pg.font = '700 38px "Zilla Slab",Georgia,serif'; pg.fillText("$500", 128, 322);
  const poster = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.56), new THREE.MeshStandardMaterial({ map: canvasTex(pc), roughness: 0.95 })); poster.position.set(LAY.postX[1], 1.65, P.z + 0.125); poster.rotation.z = 0.04; g.add(poster);
  // lanterns hung from the uprights
  GAL.lanternGroups = [];
  for (const x of LAY.postX) {
    const lg = new THREE.Group(); GAL.lanternGroups.push(lg); lg.position.set(x, 4.25, P.z + 0.3); g.add(lg);
    const pv = new THREE.Group(); pv.position.set(0, 0.24, 0); lg.add(pv); // the hook: the lantern swings from here
    const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.2, 12), new THREE.MeshStandardMaterial({ color: 0x2a1c0c, emissive: 0xffa040, emissiveIntensity: 0.5, roughness: 0.1 })); glass.position.y = -0.24; pv.add(glass);
    const cap = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.09, 12), MAT.iron); cap.position.y = -0.1; pv.add(cap);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.1, 0.03, 12), MAT.iron); base.position.y = -0.355; pv.add(base);
    for (const a of [0, 1, 2, 3]) { const wire = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.22, 4), MAT.iron); wire.position.set(Math.cos(a * Math.PI / 2) * 0.085, -0.24, Math.sin(a * Math.PI / 2) * 0.085); pv.add(wire); }
    const bail = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.005, 6, 14), MAT.iron); bail.position.y = -0.03; pv.add(bail);
    const arm = woodBox(0.04, 0.04, 0.32, MAT.iron); arm.position.set(0, 0.22, -0.15); lg.add(arm);
    const hook = new THREE.Mesh(new THREE.TorusGeometry(0.02, 0.005, 6, 10, Math.PI * 1.4), MAT.iron); hook.position.set(0, 0.215, 0); hook.rotation.y = Math.PI / 2; lg.add(hook);
    GAL.lanterns.push(glass.material); (GAL.swingers = GAL.swingers || []).push({ pv, ax: 0, az: 0, vx: 0, vz: 0, k: 0.12 });
    if (x === LAY.postX[1] || tierAtLeast("high")) { const pl = new THREE.PointLight(0xff9a40, 0, 9, 2); pl.position.set(0, -0.24, 0.05); pv.add(pl); GAL.lanterns.push(pl); }
  }
  g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  GAL.doors.forEach(d => d.pivot.userData.dyn = true); lp.userData.dyn = true; GAL.lanternGroups.forEach(l => l.userData.dyn = true);
  bakeGroup(g, o => { for (let p = o; p; p = p.parent) if (p.userData.dyn) return true; return false; });
  buildRope(); buildSetDressing();
}
function setLanterns(d) { const k = smoothstep(0.1, 0.8, d); for (const l of GAL.lanterns) { if (l.isLight) l.intensity = k * 2.6 * (0.92 + 0.08 * Math.sin(performance.now() * 0.013)); else l.emissiveIntensity = 0.3 + k * 4; } }
// ---- the hanging rope: simulated (07b), with the slack coiled between the anchor and a twine tie that parts when the trap drops ----
// a long drop: he falls ~2.1 m, so he hangs clear below the deck (head under the joists, feet off the ground)
const DROP = 2.1;
function buildRope() {
  const A = GAL.anchor, P = LAY.plat, H = P.h, Tr = LAY.trap;
  const L = A.y - (H + 1.5) + DROP - 0.12, D = 1.42, S = L - D;   // anchor to the knot; noose drop below the last tie; the slack is coiled in three lashed loops
  const n = 52, sim = new RopeSim(n, L, 0.42, 0.6), NT = 3, ties = [];
  for (let t = 1; t <= NT; t++) ties.push({ i: Math.round(S / sim.rest * t / NT), at: V3(A.x + 0.125 * t, A.y, A.z) });
  const j = ties[NT - 1].i, T = ties[NT - 1].at;
  for (let i = 0; i < n; i++) { const k = i * 3;
    if (i <= j) { const t = ties.findIndex(q => i <= q.i), i0 = t ? ties[t - 1].i : 0, a = t ? ties[t - 1].at : A, b = ties[t].at, u = (i - i0) / (ties[t].i - i0), s = S / NT;
      sim.x[k] = lerp(a.x, b.x, u); sim.x[k + 1] = A.y - Math.sin(u * Math.PI) * s * 0.42; sim.x[k + 2] = A.z + Math.sin(u * Math.PI) * (0.02 + 0.015 * t); }
    else { sim.x[k] = T.x; sim.x[k + 1] = T.y - (i - j) * sim.rest; sim.x[k + 2] = T.z; } }
  sim.p.set(sim.x); sim.pin(0, A); for (const q of ties) sim.pin(q.i, q.at);
  sim.boxes.push({ min: V3(P.x - 2.0, LAY.beamY - 0.13, P.z - 0.13), max: V3(P.x + 2.0, LAY.beamY + 0.13, P.z + 0.13) });
  // the deck round the trap opening, down to the joists that frame it: once he hangs below, the rope bends round its edges
  const dy0 = H - 0.28, dy1 = H + 0.03, tx0 = Tr.x - Tr.w / 2, tx1 = Tr.x + Tr.w / 2, tz0 = Tr.z - Tr.d / 2, tz1 = Tr.z + Tr.d / 2, X0 = P.x - P.w / 2, X1 = P.x + P.w / 2, Z0 = P.z - P.d / 2, Z1 = P.z + P.d / 2;
  for (const [a, b] of [[[X0, Z0], [X1, tz0]], [[X0, tz1], [X1, Z1]], [[X0, tz0], [tx0, tz1]], [[tx1, tz0], [X1, tz1]]]) sim.boxes.push({ min: V3(a[0], dy0, a[1]), max: V3(b[0], dy1, b[1]) });
  // the closed leaves are a floor too; nothing below the deck is ever lifted up through it
  sim.floor = (x, z, py) => { const overTrap = Math.abs(x - Tr.x) < Tr.w / 2 && Math.abs(z - Tr.z) < Tr.d / 2;
    return overTrap && !STATE.trap && py > H - 0.05 ? H + 0.03 : groundHeight(x, z); };
  for (let k = 0; k < 300; k++) { updateWind(1 / 60); sim.step(1 / 60); } // settle into its hang
  const rope = { sim, tie: j, tieAt: T, ties, rest: sim.save(), onNeck: false, loopR: 0.1, side: new THREE.Vector3(1, 0, 0), yaw: 0.4, yawV: 0 };
  rope.tube = new RopeTube(n, 2, 8, 0.019, MAT.rope); R.scene.add(rope.tube.mesh);
  const kg = new THREE.CylinderGeometry(0.022, 0.022, KNOT_LEN, 12, 10); { const p = kg.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i), k = 1 + 0.2 * Math.abs(Math.sin(y * 95)); p.setX(i, p.getX(i) * k); p.setZ(i, p.getZ(i) * k); } kg.computeVertexNormals(); }
  rope.knot = new THREE.Mesh(kg, MAT.rope); rope.knot.castShadow = true; R.scene.add(rope.knot);
  rope.loop = new THREE.Mesh(new THREE.TorusGeometry(1, 0.13, 8, 28), MAT.rope); rope.loop.castShadow = true; R.scene.add(rope.loop);
  // the twine lashings that hold the coils up
  const twM = new THREE.MeshStandardMaterial({ color: 0x9a8a68, roughness: 1 }); rope.twines = [];
  for (const q of ties) { const tw = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.006, 5, 18), twM); tw.position.set(q.at.x, LAY.beamY, q.at.z); tw.rotation.y = Math.PI / 2; tw.scale.set(1, 0.95, 1); tw.castShadow = true; R.scene.add(tw); rope.twines.push(tw); }
  GAL.rope = rope; updateRope(0, 0, null);
}
function resetRope() { const r = GAL.rope, s = r.sim; s.load(r.rest); s.pins = []; s.pin(0, GAL.anchor); for (const q of r.ties) s.pin(q.i, q.at); r.twines.forEach(t => t.visible = true); r.onNeck = false; r.neckLocal = null; s.scale = 1; r.held = null; }
function releaseRopeCoil() { const r = GAL.rope; if (!r.sim.pinned(r.tie)) return; for (const q of r.ties) r.sim.free(q.i); r.twines.forEach(t => t.visible = false); }
const _rc = new THREE.Vector3(), _rd = new THREE.Vector3(), _re = new THREE.Vector3(), _rq = new THREE.Quaternion(), _rm = new THREE.Matrix4(), _rq2 = new THREE.Quaternion();
const KNOT_LEN = 0.12;
// where the noose sits, fixed in the neck bone's frame (captured in the standing pose): ring under the jaw, tilted up toward the knot under his left ear
function noosePose(actor) {
  const r = GAL.rope, B = actor.ch.bones, nb = B.Neck;
  if (!r.neckLocal) {
    const n = nb.getWorldPosition(V3()), h = B.Head.getWorldPosition(V3()), q = actor.root.quaternion, up = V3(0, 1, 0), fw = V3(0, 0, 1).applyQuaternion(q), side = V3(1, 0, 0).applyQuaternion(q);
    const c = n.clone().lerp(h, 0.5).addScaledVector(fw, 0.016).addScaledVector(up, 0.014), R = 0.08;
    const ringN = up.clone().addScaledVector(side, -0.3).addScaledVector(fw, 0.1).normalize(); // knot side and back sit higher than the throat
    const ringQ = new THREE.Quaternion().setFromUnitVectors(V3(0, 0, 1), ringN);
    const attach = c.clone().addScaledVector(side, R + 0.012).addScaledVector(up, R * 0.38 + 0.01), top = attach.clone().addScaledVector(up, KNOT_LEN).addScaledVector(side, 0.012);
    nb.updateWorldMatrix(true, false); const inv = _rm.copy(nb.matrixWorld).invert(), nq = nb.getWorldQuaternion(new THREE.Quaternion());
    r.neckLocal = { c: c.applyMatrix4(inv), attach: attach.applyMatrix4(inv), top: top.applyMatrix4(inv), q: nq.invert().multiply(ringQ), R };
  }
  const L = r.neckLocal; nb.updateWorldMatrix(true, false); const M = nb.matrixWorld, nq = nb.getWorldQuaternion(_rq2);
  return { c: _rc.copy(L.c).applyMatrix4(M), attach: _rd.copy(L.attach).applyMatrix4(M), top: _re.copy(L.top).applyMatrix4(M), q: _rq.copy(nq).multiply(L.q), R: L.R };
}
const _rk = new THREE.Vector3(), _rk2 = new THREE.Vector3();
// a noose pose: ring centre c, orientation q (ring in its local XY plane), radius R; the knot runs from attach (on the ring) up to top
const newPose = () => ({ c: new THREE.Vector3(), attach: new THREE.Vector3(), top: new THREE.Vector3(), q: new THREE.Quaternion(), R: 0.1 });
const copyPose = (o, p) => { o.c.copy(p.c); o.attach.copy(p.attach); o.top.copy(p.top); o.q.copy(p.q); o.R = p.R; return o; };
const mixPose = (o, a, b, t) => { o.c.lerpVectors(a.c, b.c, t); o.attach.lerpVectors(a.attach, b.attach, t); o.top.lerpVectors(a.top, b.top, t); o.q.copy(a.q).slerp(b.q, t); o.R = lerp(a.R, b.R, t); return o; };
const _freeP = newPose();
// hanging free: knot and ring hang on below the rope's end, the ring turning slowly in the breeze
function freeNoosePose(dt) {
  const r = GAL.rope, sim = r.sim, n = sim.n, E = sim.P(n - 1, _rk), dir = _rk2.subVectors(E, sim.P(n - 4, _rd)).normalize(), P = _freeP;
  r.yawV += (-(r.yaw - 0.4 - WIND.v.z * 0.6) * 3 - r.yawV * 1.2 + (Math.random() - 0.5) * 2 * WIND.gust) * dt; r.yaw += r.yawV * dt;
  _rq.setFromUnitVectors(_rd.set(0, -1, 0), dir); P.q.setFromAxisAngle(dir, r.yaw).multiply(_rq);
  P.top.copy(E); P.attach.copy(E).addScaledVector(dir, KNOT_LEN); P.c.copy(E).addScaledVector(dir, KNOT_LEN + r.loopR - 0.01); P.R = r.loopR; return P;
}
function updateRope(dt, t, np) {
  const r = GAL.rope, sim = r.sim, n = sim.n, c = sim.cut;
  if (c < 0) { r.tube.update((i, out) => sim.P(i, out)); if (r.tube2) r.tube2.mesh.visible = false; }
  else { // cut through: the upper length hangs from the beam, the short piece below stays with the noose
    r.tube.update((i, out) => sim.P(Math.min(i, c), out));
    if (!r.tube2) { r.tube2 = new RopeTube(n, 2, 8, 0.019, MAT.rope); R.scene.add(r.tube2.mesh); }
    r.tube2.mesh.visible = !r.lowHidden; r.tube2.update((i, out) => sim.P(Math.min(n - 1, c + 1 + i), out)); }
  r.knot.visible = r.loop.visible = !r.lowHidden; // (gone with the man once he's back on his feet: the shootout is seen through his eyes)
  const P = np || freeNoosePose(dt), E = np ? sim.P(n - 1, _rk) : P.top;
  // the knot runs from the ring up to where the rope leaves it
  const d = _rk2.subVectors(E, P.attach); const len = d.length() || 1e-6; d.divideScalar(len);
  r.knot.position.copy(P.attach).addScaledVector(d, len / 2); r.knot.quaternion.setFromUnitVectors(V_UP, d); r.knot.scale.set(1, len / KNOT_LEN, 1);
  r.loop.position.copy(P.c); r.loop.quaternion.copy(P.q); r.loop.scale.set(P.R, P.R, 0.11);
  copyPose(r.drawn || (r.drawn = newPose()), P);
}
// ---- easel + whiteboard with live marker canvas ----
const BOARD = { group: null, canvas: null, ctx: null, tex: null, W: 2048, H: 1024, slots: [], wrongSlots: [], font: 140, wfont: 90 };
function buildBoard() {
  const B = LAY.board, grp = new THREE.Group(); grp.position.set(B.x, 0, B.z); grp.rotation.y = B.yaw; R.scene.add(grp); BOARD.group = grp;
  if (R.tier === "low") { BOARD.W = 1024; BOARD.H = 512; }
  const c = document.createElement("canvas"); c.width = BOARD.W; c.height = BOARD.H; BOARD.canvas = c; BOARD.ctx = c.getContext("2d");
  BOARD.tex = canvasTex(c); BOARD.tex.anisotropy = 8;
  const surf = new THREE.Mesh(new THREE.PlaneGeometry(B.w, B.h), new THREE.MeshPhysicalMaterial({ map: BOARD.tex, emissiveMap: BOARD.tex, emissive: 0xffffff, emissiveIntensity: 0.3, roughness: 0.88, envMapIntensity: 0.35, sheen: 0.3, sheenRoughness: 0.8, sheenColor: new THREE.Color(0.55, 0.5, 0.4) })); // (a sheet of old newsprint: matte, the faint sheen of paper fibres)
  surf.position.set(0, B.y, 0.035); surf.receiveShadow = true; grp.add(surf); BOARD.surface = surf;
  const back = new THREE.Mesh(new THREE.BoxGeometry(B.w, B.h, 0.03), new THREE.MeshStandardMaterial({ color: 0x6d6a66, roughness: 0.6, metalness: 0.4 })); back.position.set(0, B.y, 0.015); grp.add(back);
  const al = new THREE.MeshStandardMaterial({ color: 0xc9c7c2, roughness: 0.3, metalness: 1 });
  for (const [w, h, x, y] of [[B.w + 0.06, 0.04, 0, B.y + B.h / 2], [B.w + 0.06, 0.04, 0, B.y - B.h / 2], [0.04, B.h, -B.w / 2, B.y], [0.04, B.h, B.w / 2, B.y]]) { const f = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.06), al); f.position.set(x, y, 0.03); grp.add(f); }
  const tray = new THREE.Mesh(new THREE.BoxGeometry(B.w * 0.9, 0.025, 0.09), al); tray.position.set(0, B.y - B.h / 2 - 0.02, 0.08); grp.add(tray);
  for (const [col, x] of [[0x23305e, -0.6], [0xa3241b, -0.45]]) { const mk = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.13, 10), new THREE.MeshStandardMaterial({ color: col, roughness: 0.4 })); mk.rotation.z = Math.PI / 2; mk.position.set(x, B.y - B.h / 2 + 0.005, 0.09); grp.add(mk); }
  // easel legs
  const legH = B.y + B.h / 2 + 0.25;
  for (const sx of [-1, 1]) { const l = woodBox(0.06, legH + 0.1, 0.05, MAT.wood); l.position.set(sx * (B.w / 2 - 0.25), legH / 2, -0.04); l.rotation.z = sx * 0.06; l.rotation.x = 0.05; grp.add(l); }
  const bl = woodBox(0.06, legH, 0.05, MAT.wood); bl.position.set(0, legH / 2 - 0.05, -0.45); bl.rotation.x = 0.28; grp.add(bl);
  const shelf = woodBox(B.w * 0.98, 0.04, 0.12, MAT.wood); shelf.position.set(0, B.y - B.h / 2 - 0.05, -0.02); grp.add(shelf);
  grp.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  surf.castShadow = false; surf.userData.dyn = true;
  bakeGroup(grp, o => o === surf);
  boardLayout("", ""); boardDraw();
}
// board-local metres -> world point (slightly in front of the surface)
function boardWorld(lx, ly, out) { return BOARD.group.localToWorld((out || new THREE.Vector3()).set(lx, LAY.board.y + ly, 0.05)); }
function boardLayout(word) {
  const W = BOARD.W, H = BOARD.H, n = word.length || 1, mx = W * 0.06, rowW = W - mx * 2;
  let rows = 1, per = n, sw = Math.min(rowW / n, H * 0.2);
  if (n > 9) { rows = 2; per = Math.ceil(n / 2); sw = Math.min(rowW / per, H * 0.16); }
  BOARD.font = sw * 0.92; BOARD.slots = [];
  for (let i = 0; i < n; i++) {
    const r = rows === 2 && i >= per ? 1 : 0, j = r ? i - per : i, cnt = rows === 2 ? (r ? n - per : per) : n;
    const x = W / 2 + (j - (cnt - 1) / 2) * sw, y = rows === 1 ? H * 0.47 : H * (r ? 0.6 : 0.37);
    BOARD.slots.push({ x, y, w: sw });
  }
  BOARD.wfont = H * 0.12; BOARD.wy = H * 0.86; BOARD.wx0 = W * 0.26; BOARD.wstep = Math.min(BOARD.wfont * 1.05, (W * 0.7) / Math.max(8, (STATE && STATE.maxWrong) || 8));
}
const px2board = (x, y) => [(x / BOARD.W - 0.5) * LAY.board.w, (0.5 - y / BOARD.H) * LAY.board.h];
// the sheet the words are written on: old newsprint, yellowed to a warm off-white, darker toward its edges, with fibres, a few foxing spots
// and the ghost of the print on its other side showing through. Drawn once; each boardDraw starts from it
function boardPaper(W, H) {
  if (BOARD.paper) return BOARD.paper; const c = document.createElement("canvas"); c.width = W; c.height = H; const g = c.getContext("2d"), r = rng(1888), k = W / 2048;
  g.fillStyle = "#e9d9b2"; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 70; i++) { const x = r() * W, y = r() * H, rad = (80 + r() * 380) * k, gr = g.createRadialGradient(x, y, 0, x, y, rad), dk = r() < 0.55;
    gr.addColorStop(0, dk ? `rgba(160,120,60,${0.03 + r() * 0.05})` : `rgba(255,250,235,${0.04 + r() * 0.06})`); gr.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = gr; g.fillRect(x - rad, y - rad, rad * 2, rad * 2); }
  g.fillStyle = "rgba(60,50,40,0.022)"; // (the print on the back: column rules and lines of type, faint and reversed)
  const cols = 5, cw = W / cols; for (let cI = 0; cI < cols; cI++) { const x0 = cI * cw + 28 * k; g.fillRect(cI * cw, 0, 2 * k, H);
    for (let y = 40 * k; y < H - 20 * k; y += 21 * k) { if (r() < 0.12) { y += 24 * k; continue; } g.fillRect(x0, y, (cw - 56 * k) * (r() < 0.15 ? 0.35 + r() * 0.5 : 1), 9 * k); } }
  for (let i = 0; i < 2600; i++) { g.strokeStyle = `rgba(${110 + r() * 50 | 0},${90 + r() * 40 | 0},${60 + r() * 20 | 0},${0.04 + r() * 0.07})`; g.lineWidth = (0.6 + r()) * k; // (fibres)
    const x = r() * W, y = r() * H, a = r() * Math.PI, l = (4 + r() * 14) * k; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); }
  for (let i = 0; i < 26; i++) { const x = r() * W, y = r() * H, rad = (2 + r() * 9) * k; g.fillStyle = `rgba(140,90,40,${0.12 + r() * 0.2})`; g.beginPath(); g.arc(x, y, rad, 0, TAU); g.fill(); } // (foxing)
  const vg = g.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, W * 0.62); vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(120,80,30,0.32)"); g.fillStyle = vg; g.fillRect(0, 0, W, H);
  const eg = 26 * k; for (const [x0, y0, x1, y1] of [[0, 0, 0, eg], [0, H, 0, H - eg], [0, 0, eg, 0], [W, 0, W - eg, 0]]) { // (the edges browned)
    const lg = g.createLinearGradient(x0, y0, x1, y1); lg.addColorStop(0, "rgba(110,70,25,0.28)"); lg.addColorStop(1, "rgba(110,70,25,0)"); g.fillStyle = lg; g.fillRect(0, 0, W, H); }
  BOARD.paper = c; return c;
}
function boardDraw() {
  const g = BOARD.ctx, W = BOARD.W, H = BOARD.H;
  g.drawImage(boardPaper(W, H), 0, 0);
  const S = STATE; if (!S || !S.word) { g.fillStyle = "rgba(60,70,90,0.18)"; g.font = `${H * 0.16}px "Permanent Marker",cursive`; g.textAlign = "center"; g.fillText("GALLOWS GULCH", W / 2, H * 0.56); BOARD.tex.needsUpdate = true; return; }
  g.textAlign = "left"; g.textBaseline = "alphabetic"; g.font = `${H * 0.07}px "Permanent Marker",cursive`;
  g.fillStyle = "rgba(90,90,100,0.45)"; g.fillText(S.word.length + " LETTERS", W * 0.05, H * 0.12);
  g.textAlign = "center"; g.font = `${BOARD.font}px "Permanent Marker",cursive`;
  BOARD.slots.forEach((sl, i) => {
    g.strokeStyle = "#1b2246"; g.lineWidth = BOARD.font * 0.06; g.lineCap = "round";
    g.beginPath(); g.moveTo(sl.x - sl.w * 0.36, sl.y + BOARD.font * 0.14); g.lineTo(sl.x + sl.w * 0.36, sl.y + BOARD.font * 0.14); g.stroke();
    const p = S.prog[i]; if (p <= 0) return;
    g.save(); g.beginPath(); g.rect(sl.x - sl.w / 2, sl.y - BOARD.font, sl.w * p, BOARD.font * 1.3); g.clip();
    g.fillStyle = S.lostReveal[i] ? "#a82a1e" : "#18204a"; g.fillText(S.word[i], sl.x, sl.y); g.restore();
  });
  g.textAlign = "left"; g.font = `${BOARD.wfont * 0.5}px "Permanent Marker",cursive`; g.fillStyle = "rgba(90,90,100,0.6)"; g.fillText("MISSED", W * 0.05, BOARD.wy);
  g.textAlign = "center"; g.font = `${BOARD.wfont}px "Permanent Marker",cursive`;
  S.wrong.forEach((w, i) => { const x = BOARD.wx0 + i * BOARD.wstep + BOARD.wstep / 2; g.save(); g.beginPath(); g.rect(x - BOARD.wstep / 2, BOARD.wy - BOARD.wfont, BOARD.wstep * w.prog, BOARD.wfont * 1.3); g.clip(); g.fillStyle = "#a82a1e"; g.fillText(w.ch, x, BOARD.wy); g.restore(); });
  BOARD.tex.needsUpdate = true;
}
function slotBoardPos(i) { const s = BOARD.slots[i]; return { a: px2board(s.x - s.w * 0.35, s.y - BOARD.font * 0.35), b: px2board(s.x + s.w * 0.35, s.y - BOARD.font * 0.35), h: BOARD.font / BOARD.H * LAY.board.h }; }
function wrongBoardPos(i) { const x = BOARD.wx0 + i * BOARD.wstep + BOARD.wstep / 2; return { a: px2board(x - BOARD.wstep * 0.4, BOARD.wy - BOARD.wfont * 0.35), b: px2board(x + BOARD.wstep * 0.4, BOARD.wy - BOARD.wfont * 0.35), h: BOARD.wfont / BOARD.H * LAY.board.h }; }
// ---- set dressing ----
function barrel(x, z, s = 1) { const b = barrelMesh(s); b.position.set(x, 0, z); R.scene.add(b); } // (07c)
function buildSetDressing() {
  const G0 = new THREE.Group(); R.scene.add(G0); const add0 = R.scene.add.bind(R.scene); R.scene.add = o => G0.add(o);
  try { buildSetDressingInner(); } finally { R.scene.add = add0; }
  bakeGroup(G0, o => o.material && o.material.roughness < 0.1); for (const c of [...G0.children]) R.scene.add(c); R.scene.remove(G0);
}
function buildSetDressingInner() {
  barrel(-6.0, -3.9); barrel(-6.5, -4.4, 0.95); barrel(-5.95, -4.75, 1.02);
  for (const [x, z, s, ry] of [[0.2, -6.9, 0.7, 0.3], [0.75, -7.25, 0.55, 1.1], [-6.4, -7.6, 0.8, 0.2]]) { const c = woodBox(s, s, s, MAT.woodDark); c.position.set(x, s / 2, z); c.rotation.y = ry; R.scene.add(c); }
  // pine coffin leaning on the platform
  const sh = new THREE.Shape([[-0.22, -1], [0.22, -1], [0.3, 0.45], [0.2, 1], [-0.2, 1], [-0.3, 0.45]].map(p => new THREE.Vector2(p[0], p[1])));
  const cg = new THREE.ExtrudeGeometry(sh, { depth: 0.32, bevelEnabled: false }); cg.translate(0, 0, -0.16);
  const uv = cg.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 0.9, uv.getY(i) * 0.9);
  const coffin = new THREE.Mesh(cg, MAT.wood); coffin.position.set(-5.35, 1.0, -3.85); coffin.rotation.set(-0.12, 0.35, 0); coffin.castShadow = coffin.receiveShadow = true; R.scene.add(coffin);
  // water trough + hitching rail near the street
  const tr = woodBox(2.2, 0.5, 0.6, MAT.woodDark); tr.position.set(6.5, 0.25, -7.5); R.scene.add(tr);
  const wtr = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 0.45), new THREE.MeshStandardMaterial({ color: 0x1a2226, roughness: 0.05, metalness: 0.1 })); wtr.rotation.x = -Math.PI / 2; wtr.position.set(6.5, 0.46, -7.5); R.scene.add(wtr);
  for (const x of [5.2, 7.8]) { const p = woodBox(0.14, 1.1, 0.14, MAT.woodDark); p.position.set(x, 0.55, -8.4); R.scene.add(p); }
  const rail = woodBox(2.9, 0.1, 0.1, MAT.wood, true); rail.position.set(6.5, 1.05, -8.4); R.scene.add(rail);
  // wagon wheel leaning against a crate
  const wheel = new THREE.Group(); const rim = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.035, 8, 32), MAT.woodDark); wheel.add(rim);
  for (let i = 0; i < 12; i++) { const s = woodBox(0.03, 1.05, 0.025, MAT.wood); s.rotation.z = i * Math.PI / 12; wheel.add(s); }
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.14, 12), MAT.iron); hub.rotation.x = Math.PI / 2; wheel.add(hub);
  wheel.position.set(0.35, 0.56, -6.35); wheel.rotation.set(0, 0.6, 0.12); R.scene.add(wheel);
  wheel.traverse(o => { if (o.isMesh) o.castShadow = true; });
  { const [x, z] = streetPt(7, 6.8); wagon(x, z, Math.atan2(STREET.a[0], STREET.a[1]) + 0.25); }
  { const [x, z] = streetPt(33, -7.2); wagon(x, z, Math.atan2(-STREET.a[0], -STREET.a[1]) - 0.15, true); }
  // hay and sacks by the livery, barrels and crates along the boardwalks
  for (const [al, sd] of [[36.5, 8.9], [37.6, 9.3]]) { const [x, z] = streetPt(al, sd); const hb = woodBox(1.0, 0.5, 0.6, MAT.hay); hb.position.set(x, 0.25, z); hb.rotation.y = Math.random(); R.scene.add(hb); }
  for (const [al, sd] of [[12.5, -9.2], [19.8, 8.6], [27.2, -8.8], [22.6, -9.1]]) { const [x, z] = streetPt(al, sd); barrel(x, z, 0.95 + Math.random() * 0.1); }
  for (const [al, sd, s] of [[13.4, -9.3, 0.6], [20.8, 8.9, 0.5], [21.3, 8.7, 0.42]]) { const [x, z] = streetPt(al, sd); const c = woodBox(s, s, s, MAT.woodDark); c.position.set(x, s / 2, z); c.rotation.y = Math.random() * 2; R.scene.add(c); }
}
// a wagon: plank bed, spoked wheels on iron axles, tongue resting on the ground; some carry a canvas bonnet over hoops
function wagon(x, z, ry, covered) {
  const g = new THREE.Group(), add = m => { g.add(m); return m; };
  add(woodBox(1.25, 0.1, 3.1, MAT.plank, true)).position.set(0, 0.98, 0);
  for (const e of [-1, 1]) { add(woodBox(0.05, 0.42, 3.1, MAT.wood, true)).position.set(e * 0.62, 1.24, 0); add(woodBox(0.08, 0.08, 3.1, MAT.woodDark, true)).position.set(e * 0.5, 0.88, 0); }
  for (const e of [-1, 1]) add(woodBox(1.29, 0.42, 0.05, MAT.wood)).position.set(0, 1.24, e * 1.53);
  const wheel = (r, n) => { const w = new THREE.Group(); const rim = new THREE.Mesh(new THREE.TorusGeometry(r, 0.032, 8, 36), MAT.woodDark); w.add(rim);
    const tire = new THREE.Mesh(new THREE.TorusGeometry(r + 0.025, 0.012, 6, 36), MAT.iron); w.add(tire);
    for (let i = 0; i < n; i++) { const sp = woodBox(0.035, r * 2 - 0.04, 0.03, MAT.wood); sp.rotation.z = i * Math.PI / n; w.add(sp); }
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.2, 12), MAT.woodDark); hub.rotation.x = Math.PI / 2; w.add(hub); w.rotation.y = Math.PI / 2; return w; };
  for (const [zz, r] of [[1.05, 0.45], [-1.05, 0.62]]) { for (const e of [-1, 1]) { const w = wheel(r, r > 0.5 ? 14 : 12); w.position.set(e * 0.78, r, zz); w.children.forEach(c => c.rotation.z += Math.random()); add(w); }
    const ax = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.7, 8), MAT.iron); ax.rotation.z = Math.PI / 2; ax.position.set(0, r, zz); add(ax); }
  const tg = add(woodBox(0.08, 0.08, 2.3, MAT.woodDark, true)); tg.position.set(0, 0.5, 2.6); tg.rotation.x = 0.36;
  add(woodBox(1.1, 0.06, 0.38, MAT.woodDark)).position.set(0, 1.62, 1.25); for (const e of [-1, 1]) add(woodBox(0.05, 0.42, 0.05, MAT.woodDark)).position.set(e * 0.5, 1.4, 1.25);
  if (covered) { // canvas over five hoops, sagging between them and gathered at the ends
    const cg = new THREE.CylinderGeometry(0.72, 0.72, 2.9, 28, 20, true, -Math.PI / 2, Math.PI), p = cg.attributes.position;
    for (let i = 0; i < p.count; i++) { const y = p.getY(i), t = y / 1.45, hoop = Math.abs(Math.cos(t * Math.PI * 2)), k = 1 - 0.05 * (1 - hoop) * Math.min(1, Math.abs(p.getX(i)) * 3 + 0.4) + 0.12 * Math.pow(Math.abs(t), 6);
      p.setXYZ(i, p.getX(i) * k, y, p.getZ(i) * k); }
    cg.computeVertexNormals(); const cv = new THREE.Mesh(cg, MAT.canvas); cv.rotation.x = Math.PI / 2; cv.rotation.z = Math.PI; cv.position.set(0, 1.42, 0); cv.scale.set(0.88, 1, 1.05); cv.castShadow = cv.receiveShadow = true; add(cv); }
  g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  g.position.set(x, groundHeight(x, z), z); g.rotation.y = ry; R.scene.add(g);
}
