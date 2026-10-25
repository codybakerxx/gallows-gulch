// ---------- DIRECTOR: game state, scaled-time tasks, camera, cutscenes ----------
const DIFF = {
  easy: { max: 10, seq: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], hint: "last", name: "Greenhorn", note: "10 misses before the drop. Familiar everyday words. A clue appears on your last chance." },
  medium: { max: 7, seq: [2, 4, 5, 6, 7, 9, 10], hint: "last", name: "Gunhand", note: "7 misses. Sharper vocabulary words. A clue appears on your last chance." },
  hard: { max: 5, seq: [3, 5, 6, 9, 10], hint: "none", name: "Outlaw", note: "5 misses. Rare, high-level vocabulary. No hints, no mercy." }
};
const LEN_NAME = { short: "Short words", medium: "Medium words", long: "Long words", any: "Any length" };
const STATE = { word: "", hint: "", len: "medium", diff: "medium", prog: [], lostReveal: [], wrong: [], guessed: new Set(), maxWrong: 7, misses: 0, streak: 0, best: 0,
  hintShown: false, locked: false, over: true, ts: 1, dusk: 0, duskT: 0, bubble: null, trap: false, mood: 0 };
let HOST, MAN, EXEC;
const TASKS = [];
function tween(dur, f) { return new Promise(res => { let t = 0; TASKS.push(dt => { t += dt; const p = Math.min(1, t / dur); f(p); if (p >= 1) { res(); return true; } return false; }); }); }
const wait = s => tween(s, () => {});
function runTasks(dt) { for (let i = TASKS.length - 1; i >= 0; i--) if (TASKS[i] && TASKS[i](dt)) TASKS.splice(i, 1); }
// ---- camera ----
const SHOTS = {
  P: { wide: [[5.85, 2.75, 2.75], [-2.9, 2.75, -5.2], 60], board: [[4.25, 1.8, 1.25], [1.2, 1.45, -1.0], 56], gallows: [[0.3, 3.4, -0.4], [-3.1, 3.3, -5.5], 58],
       drop: [[-3.95, 2.0, 2.4], [-3.25, 1.7, -5.5], 56], win: [[2.2, 2.1, 2.7], [-2.0, 1.6, -1.6], 58], intro: [[9, 4, 9], [-2.5, 3, -6], 55], stairs: [[0.4, 2.2, 1.8], [-2.2, 1.6, -2.6], 58] },
  L: { wide: [[4.7, 2.35, 2.1], [-2.6, 2.55, -5.4], 46], board: [[4.4, 1.85, 1.8], [1.0, 1.45, -1.0], 40], gallows: [[0.2, 3.3, 0.2], [-3.2, 3.2, -5.5], 40],
       drop: [[-3.7, 2.05, 1.7], [-3.2, 1.85, -5.5], 42], win: [[2.4, 2.0, 3.5], [-2.0, 1.4, -1.6], 40], intro: [[9, 4, 10], [-2.5, 2.8, -6], 40], stairs: [[0.9, 2.0, 2.2], [-2.2, 1.5, -2.4], 42] }
};
const CAM = { pos: V3(4.6, 2.6, 4.2), tgt: V3(-1.6, 2.4, -4.2), fov: 42, from: null, to: null, t: 1, dur: 1, name: "wide", shake: 0, follow: null, key: 0, ky: 0, kv: 0 };
// a moment of slow motion (real seconds since it began): held at a crawl, then eased back to full speed
const SLOW = { t: 99, hold: 0.32, ease: 0.7, k: 0.25 };
function slowK(rdt) { SLOW.t += rdt; const S = SLOW; return S.t < S.hold ? S.k : S.t < S.hold + S.ease ? lerp(S.k, 1, Ease.inOut((S.t - S.hold) / S.ease)) : 1; }
function shotSet() { return R.w / R.h < 1 ? SHOTS.P : SHOTS.L; }
function shot(name, dur = 1.2) {
  const S = shotSet()[name]; if (!S) return; CAM.name = name; CAM.follow = null; // (a camera someone else drives, like the getaway's: a resize leaves it alone)
  if (dur <= 0) { CAM.pos.set(...S[0]); CAM.tgt.set(...S[1]); CAM.fov = S[2]; CAM.to = null; return; }
  CAM.from = { pos: CAM.pos.clone(), tgt: CAM.tgt.clone(), fov: CAM.fov }; CAM.to = { pos: V3(...S[0]), tgt: V3(...S[1]), fov: S[2] }; CAM.t = 0; CAM.dur = dur;
}
// a shot that tracks a moving subject; fn() returns { pos, tgt, fov }
function follow(name, fn, dur = 1.0) { CAM.name = name; CAM.to = null; CAM.follow = fn; CAM.from = { pos: CAM.pos.clone(), tgt: CAM.tgt.clone(), fov: CAM.fov }; CAM.t = 0; CAM.dur = dur; }
function faceShot() { // close-up on the condemned man's face, a little off his right cheek
  const B = MAN.ch.bones, h = B.Head.getWorldPosition(new THREE.Vector3()), f = V3(Math.sin(MAN.yaw), 0, Math.cos(MAN.yaw)), r = V3(-f.z, 0, f.x), P = R.w / R.h < 1;
  return { pos: h.clone().addScaledVector(f, P ? 0.78 : 0.74).addScaledVector(r, 0.24).add(V3(0, 0.02, 0)), tgt: h.clone().add(V3(0, P ? 0.0 : 0.03, 0)).addScaledVector(r, 0.02), fov: P ? 36 : 27 };
}
function nooseShot() { // wider: both men in frame while the executioner works
  const B = MAN.ch.bones, h = B.Head.getWorldPosition(new THREE.Vector3()), f = V3(Math.sin(MAN.yaw), 0, Math.cos(MAN.yaw)), r = V3(-f.z, 0, f.x), P = R.w / R.h < 1;
  return { pos: h.clone().addScaledVector(f, P ? 2.0 : 1.7).addScaledVector(r, 0.55).add(V3(0, 0.05, 0)), tgt: h.clone().add(V3(0, P ? -0.05 : 0.02, 0)), fov: P ? 46 : 36 };
}
const _cf = { pos: new THREE.Vector3(), tgt: new THREE.Vector3() };
function updateCamera(rdt, t, sdt) { // sdt: scene time, so camera moves keep pace with the action when the player taps to skip
  const dt = sdt ?? rdt;
  if (CAM.follow) { const f = CAM.follow();
    if (CAM.t < 1) { CAM.t = Math.min(1, CAM.t + dt / CAM.dur); const e = Ease.inOut(CAM.t); CAM.pos.lerpVectors(CAM.from.pos, f.pos, e); CAM.tgt.lerpVectors(CAM.from.tgt, f.tgt, e); CAM.fov = lerp(CAM.from.fov, f.fov, e); }
    else { const k = 1 - Math.exp(-dt * 7); CAM.pos.lerp(f.pos, k); CAM.tgt.lerp(f.tgt, 1 - Math.exp(-dt * 10)); CAM.fov = f.fov; } }
  else if (CAM.to) { CAM.t = Math.min(1, CAM.t + dt / CAM.dur); const e = Ease.inOut(CAM.t); CAM.pos.lerpVectors(CAM.from.pos, CAM.to.pos, e); CAM.tgt.lerpVectors(CAM.from.tgt, CAM.to.tgt, e); CAM.fov = lerp(CAM.from.fov, CAM.to.fov, e); if (CAM.t >= 1) CAM.to = null; }
  const close = CAM.name === "face" ? 0.35 : CAM.name === "siege" ? 0.1 : 1, n = 0.014 * close, s = CAM.shake * 0.06 * (STATE.reduceMotion ? 0.25 : 1); CAM.shake = Math.max(0, CAM.shake - rdt * 2.5);
  if (CAM.flash > 0) { CAM.flash = Math.max(0, CAM.flash - rdt * 0.9); R.grade.uniforms.flash.value = CAM.flash * CAM.flash / 0.38; }
  if (CAM.kv || CAM.ky) { const h = Math.min(rdt, 1 / 30); CAM.kv += (-CAM.ky * 110 - CAM.kv * 10) * h; CAM.ky += CAM.kv * h; if (Math.abs(CAM.ky) < 2e-4 && Math.abs(CAM.kv) < 2e-3) CAM.ky = CAM.kv = 0; } // a jolt: dips and springs back
  R.camera.position.set(CAM.pos.x + Math.sin(t * 0.7) * n + (Math.random() - 0.5) * s, CAM.pos.y + CAM.ky + Math.sin(t * 0.9 + 1) * n * 0.7 + (Math.random() - 0.5) * s, CAM.pos.z + Math.sin(t * 0.5 + 2) * n);
  R.camera.lookAt(CAM.tgt.x + Math.sin(t * 0.6) * n, CAM.tgt.y + CAM.ky * 1.6 + Math.sin(t * 0.8) * n * 0.5, CAM.tgt.z);
  if (Math.abs(R.camera.fov - CAM.fov) > 0.01) { R.camera.fov = CAM.fov; R.camera.updateProjectionMatrix(); }
  // soft key light for face close-ups (the sun is behind him)
  const want = CAM.name === "face" || CAM.name === "noose" || CAM.name === "hang" ? 1 : 0; CAM.key += (want - CAM.key) * Math.min(1, dt * 3);
  if (R.post) { // shallow focus on the condemned man's face in close-ups; ambient occlusion everywhere else
    const D = R.post.uniforms, close = CAM.name === "face" || CAM.name === "noose", cineDof = CAM.name === "chase" && CAM.dof && R.tier !== "low", k = Math.min(1, dt * 4); // (cineDof: a filmed shot that sets its own focus, 12i)
    // shallow focus only on the face close-ups; everything else stays sharp
    D.amount.value += ((close && R.tier !== "low" || cineDof ? 1 : 0) - D.amount.value) * k;
    if (cineDof) { D.focus.value = CAM.dof.focus; D.aperture.value = CAM.dof.ap; } else { D.aperture.value = 2.0; if (D.amount.value > 0.02) { MAN.ch.eyes[0].getWorldPosition(A1); D.focus.value = A1.distanceTo(R.camera.position); } }
    D.near.value = R.camera.near; D.far.value = R.camera.far;
    if (R.ao) { const cd = CAM.pos.distanceTo(CAM.tgt), far = smoothstep(2.5, 6.0, cd); R.ao.strength += ((close || R.lite || !TIERS[R.tier].ao ? 0 : 0.8 * far) - R.ao.strength) * k; R.ao.enabled = R.ao.strength > 0.02; D.aoStrength.value = R.ao.enabled ? R.ao.strength : 0;
      R.ao.aoMat.uniforms.radius.value = 0.6 * clamp(cd / 8, 0.35, 1); }
    const sh = updateShafts(SKY.dusk);
    D.sssAmt.value = TIERS[R.tier].sss && !R.lite ? (R.tier === "high" ? 0.7 : 0.55) : 0; D.projScale.value = D.res.value.y / (2 * Math.tan(THREE.MathUtils.degToRad(R.camera.fov) / 2));
    R.post.enabled = D.amount.value > 0.02 || D.aoStrength.value > 0.001 || sh > 0.001 || D.sssAmt.value > 0; }
  if (MAN && MAN.ch.shells) MAN.ch.shells.visible = MAN.ch.bones.Head.getWorldPosition(A2).distanceTo(R.camera.position) < 5.5; // hair shells only where they can be seen
  if (KEY_LIGHT && !SIEGE.on) { KEY_LIGHT.intensity = CAM.key * 1.1; _kl.set(0.65, 0.45, 0.1).applyQuaternion(R.camera.quaternion); KEY_LIGHT.position.copy(R.camera.position).add(_kl); }
}
let KEY_LIGHT = null; const _kl = new THREE.Vector3();
// ---- places ----
function boardSpot(lx, dist = 0.55) { return BOARD.group.localToWorld(V3(lx, 0, dist)); }
const boardYaw = () => LAY.board.yaw + Math.PI;
function hostIdle() { const p = boardSpot(LAY.board.w / 2 + 0.55, 0.65); return [p.x, p.z]; }
// where he stands along the way: 0 the street, 1 the foot of the stairs, 2 a third of the way up (tread 4), 3 two-thirds (tread 9),
// 4 the top (deck), 5 on the trap (bound hands clear of its front edge)
const MAN_PATH = [[-2.15, 0.75], [-2.15, LAY.stairs.zBot + 0.3], null, null, null, [-3.14, -5.43]], TRAP_I = 5;
const STEP_K = { 1: 0, 2: 4, 3: 9, 4: 13 };
function trapYaw() { return Math.atan2(LAY.board.x - LAY.trap.x, LAY.board.z - LAY.trap.z) - 0.25; }
// the noose in the executioner's fists. mode "one": hanging from his left fist, which holds the knot; "two": opened between both fists
// (left on the knot, right on the far side of the ring); "cinch": the ring closing round the neck as the knot is drawn up under the left ear
const ROPE = { held: false, mode: null, blend: 0, snap: null, from: null, fromT: 1 };
const _hp = { gL: V3(), gR: V3(), a: V3(), n: V3(), f: V3(), y: V3(), m: new THREE.Matrix4(), pose: newPose(), mix: newPose(), mix2: newPose() };
function heldNoosePose() {
  const P = _hp.pose, gL = gripPt(EXEC, "L", _hp.gL), gR = gripPt(EXEC, "R", _hp.gR);
  P.top.copy(gL).addScaledVector(V_UP, KNOT_LEN / 2); P.attach.copy(gL).addScaledVector(V_UP, -KNOT_LEN / 2); // the left fist closes round the knot
  const a = _hp.a.subVectors(gR, P.attach), w = a.length() || 1e-6; a.divideScalar(w);
  P.c.addVectors(P.attach, gR).multiplyScalar(0.5); P.R = clamp(w / 2, 0.07, 0.17);
  // the ring's plane holds the line between the fists and lies as flat as it can (hanging, it faces him; opened, it can pass over a head)
  const fw = _hp.f.set(Math.sin(EXEC.yaw), 0, Math.cos(EXEC.yaw)), n = _hp.n.copy(V_UP).addScaledVector(fw, 0.35).normalize(); n.addScaledVector(a, -n.dot(a)).normalize();
  _hp.m.makeBasis(a, _hp.y.crossVectors(n, a), n); P.q.setFromRotationMatrix(_hp.m);
  return P;
}
function ropeMode(mode) { ROPE.from = copyPose(ROPE.from || newPose(), GAL.rope.drawn); ROPE.fromT = 0; ROPE.mode = mode; ROPE.held = !!mode; }
function updateRopeState(t, dt) {
  const r = GAL.rope, sim = r.sim, n = sim.n, B = MAN.ch.bones, H = MAN.hang;
  // the condemned man's skull, neck and body push the rope aside (the last few links ride against him by the knot)
  if (!sim.spheres.length) for (let i = 0; i < 4; i++) sim.spheres.push({ c: new THREE.Vector3(), r: [0.085, 0.055, 0.16, 0.15][i], skip: i < 2 ? 5 : 0 });
  const S = sim.spheres; B.Head.getWorldPosition(S[0].c); S[0].c.y += 0.07; B.Neck.getWorldPosition(S[1].c); B.Spine2.getWorldPosition(S[2].c); B.Hips.getWorldPosition(S[3].c);
  let np = null, free = false;
  if (r.onNeck || H) { np = noosePose(MAN); sim.pin(n - 1, np.top, H || ROPE.fromT < 1 ? 0 : 0.05); sim.scale = H && H.taut ? 1 + (Math.max(0, H.stretch) + 0.02) / sim.L : 1; }
  else if (ROPE.held && ROPE.mode === "one") { gripPt(EXEC, "L", A5).addScaledVector(V_UP, KNOT_LEN / 2); sim.pin(n - 1, A5, 0); }
  else if (ROPE.held) { np = heldNoosePose(); if (ROPE.mode === "cinch") np = mixPose(_hp.mix, ROPE.snap, noosePose(MAN), Ease.inOut(ROPE.blend)); sim.pin(n - 1, np.top, 0); }
  else { sim.free(n - 1); free = true; }
  // a change of hands (or letting go) eases over instead of jumping
  if (ROPE.fromT < 1) { ROPE.fromT = Math.min(1, ROPE.fromT + dt / 0.25); const to = np || (free ? freeNoosePose(dt) : null);
    if (to) { np = mixPose(_hp.mix2, ROPE.from, to, Ease.inOut(ROPE.fromT)); if (!free) sim.pin(n - 1, np.top, 0); } }
  sim.step(dt);
  updateRope(dt, t, np);
}
// the host speaks: subtitle bubble + his recorded line, panned toward where he stands on screen
function say(k, txt, silent) {
  const text = txt || pickQuip(k), v = VOICE_LINES[text]; if (!text) return null;
  STATE.bubble = { text, t: Math.max(2.6, (v ? v[1] : 0) + 1.0) };
  if (v && !silent) { HOST.ch.bones.Head.getWorldPosition(A1).project(R.camera); Sound.speak(v[0], { pan: A1.z < 1 ? clamp(A1.x, -1, 1) * 0.4 : 0 }); HOST.talkT = (v[1] || 1.5) + 0.2; }
  return text;
}
// ---- host writing on the board ----
async function hostWrite(pos, setP, dur = 0.34, wig = 14) {
  const lx = (pos.a[0] + pos.b[0]) / 2, spot = boardSpot(lx - 0.4, 0.5);
  HOST.lookPt = null; await HOST.walkTo([[spot.x, spot.z]], 1.45); HOST.face(boardYaw() + 0.25);
  HOST.ch.marker.visible = true; const n = BOARD.group.localToWorld(V3(0, 0, 1)).sub(BOARD.group.position).normalize();
  const tip = (x, y) => boardWorld(x, y).addScaledVector(n, 0.07);
  HOST.setIK("R", tip(pos.a[0], pos.a[1]), 1, null); HOST.lookPt = tip(lx, pos.a[1]);
  await wait(0.28); Sound.cap(HOST.lookPt); Sound.squeak(HOST.lookPt, (dur - 0.02) / STATE.ts);
  await tween(dur, p => { setP(p); const x = lerp(pos.a[0], pos.b[0], p), y = pos.a[1] + Math.sin(p * wig) * pos.h * 0.22; HOST.ik.R.t.copy(tip(x, y)); HOST.lookPt = tip(x, pos.a[1]); boardDraw(); });
}
async function hostReturn() { HOST.setIK("R", null, 0); HOST.ch.marker.visible = false; const [x, z] = hostIdle(); HOST.lookPt = null; await HOST.walkTo([[x, z]], 1.45); HOST.faceTo(CAM.pos.x, CAM.pos.z); }
// ---- the condemned man moves between stations; stairs are climbed tread by tread ----
async function manTo(idx) {
  let cur = MAN.pathIdx || 0;
  while (cur !== idx) {
    const nx = cur + Math.sign(idx - cur);
    if (cur >= 1 && cur <= 4 && nx >= 1 && nx <= 4) { await MAN.climbStairs(STEP_K[cur], STEP_K[nx], nx > cur ? 0.5 : 0.44); }
    else if (cur === 4 && nx === TRAP_I) await MAN.walkTo([MAN_PATH[TRAP_I]], 0.85);
    else if (cur === TRAP_I && nx === 4) { const [y, z] = treadAt(13); await MAN.walkTo([[LAY.stairs.x, z]], 0.9); }
    else await MAN.walkTo([MAN_PATH[nx]], nx === 0 ? 1.05 : 0.95);
    cur = nx; MAN.pathIdx = cur;
  }
}
// ---- panic: glances, breathing, fear on the face ----
function setPanic(p) { MAN.panic = Math.max(MAN.panic || 0, p); MAN.lookT = 0; }
function updatePanic(dt) {
  if (!MAN || !MAN.panic || MAN.hang) return;
  MAN.lookT = (MAN.lookT || 0) - dt;
  if (MAN.lookT <= 0) { MAN.lookT = 0.5 + Math.random() * (1.4 - MAN.panic * 0.7);
    const h = MAN.ch.bones.Head.getWorldPosition(new THREE.Vector3()), r = Math.random();
    MAN.lookPt = r < 0.22 ? R.camera.position.clone() : r < 0.42 ? V3(-6.5, 1.6, -3.0) : r < 0.6 ? V3(HOST.pos.x, 1.7, HOST.pos.z) : r < 0.8 ? GAL.anchor.clone() : h.clone().add(V3(Math.random() - 0.5, -2.2, 0.8)); }
}
// the executioner steps in behind the prisoner, takes the knot in his left fist and the far side of the loop in his right, opens it,
// lifts it up over the man's head, lowers it round his neck, and draws the knot up snug under the left ear
function execHand(side, G) { EXEC.setIK(side, wristFor(EXEC, side, G, V3()), 1); }
async function execNoose() {
  const B = MAN.ch.bones, f = () => V3(Math.sin(MAN.yaw), 0, Math.cos(MAN.yaw)), lf = () => V3(Math.cos(MAN.yaw), 0, -Math.sin(MAN.yaw));
  const spot = MAN.pos.clone().addScaledVector(f(), -0.38).addScaledVector(lf(), 0.2), sim = GAL.rope.sim;
  const knot = () => sim.P(sim.n - 1, V3()).addScaledVector(V_UP, -KNOT_LEN / 2); // the knot's middle, wherever the swaying rope has it
  EXEC.setIK("R", null, 0); EXEC.setIK("L", null, 0); EXEC.lookPt = knot(); follow("noose", nooseShot, 1.2);
  await EXEC.walkTo([[spot.x, spot.z]], 0.9); EXEC.face(MAN.yaw); await wait(0.25);
  // 1) his left hand goes to the knot (following it as it sways) and closes on it
  EXEC.ik.L.fast = true; await tween(0.6, p => { EXEC.lookPt = knot(); execHand("L", knot()); });
  for (let i = 0; i < 12 && gripPt(EXEC, "L", V3()).distanceTo(knot()) > 0.02; i++) await tween(0.05, () => execHand("L", knot()));
  EXEC.setGrip("L", 1); ropeMode("one"); Sound.ropeCreak(knot(), 0.5); MAN.gesture("shake");
  // 2) he draws the noose in beside the man's left shoulder; the loop swings below his fist
  const eF = () => V3(Math.sin(EXEC.yaw), 0, Math.cos(EXEC.yaw)), eL = () => V3(Math.cos(EXEC.yaw), 0, -Math.sin(EXEC.yaw));
  const k0 = gripPt(EXEC, "L", V3()), side = () => EXEC.ch.bones.LeftArm.getWorldPosition(V3()).addScaledVector(eF(), 0.32).addScaledVector(eL(), 0.02).add(V3(0, 0.06, 0));
  await tween(0.45, p => execHand("L", k0.clone().lerp(side(), Ease.inOut(p))));
  // 3) his right hand takes the bottom of the loop
  const ringLow = () => { const d = GAL.rope.drawn; return d.c.clone().sub(d.attach).normalize().multiplyScalar(d.R).add(d.c); };
  EXEC.ik.R.fast = true; EXEC.lookPt = ringLow(); await tween(0.5, p => { execHand("L", side()); execHand("R", ringLow()); });
  for (let i = 0; i < 10 && gripPt(EXEC, "R", V3()).distanceTo(ringLow()) > 0.025; i++) await tween(0.05, () => { execHand("L", side()); execHand("R", ringLow()); });
  EXEC.setGrip("R", 1); ropeMode("two"); await wait(0.15);
  // 4) opens it and lifts it up and over his head
  const top = () => B.HeadTop_End.getWorldPosition(V3()), Rw = 0.15, gL0 = gripPt(EXEC, "L", V3()), gR0 = gripPt(EXEC, "R", V3());
  const over = s => top().add(V3(0, 0.1, 0)).addScaledVector(lf(), s * Rw).addScaledVector(f(), -0.02);
  EXEC.lookPt = top(); MAN.lookPt = top().add(V3(0, 0.5, 0)).addScaledVector(f(), 0.4); setPanic(0.45);
  await tween(0.8, p => { const e = Ease.inOut(p), lift = V3(0, 0.1 * Math.sin(Math.PI * e), 0); execHand("L", gL0.clone().lerp(over(1), e).add(lift)); execHand("R", gR0.clone().lerp(over(-1), e).add(lift)); });
  // 5) down round his head to his neck, the loop drawing in as it goes
  const neckC = () => noosePose(MAN).c.clone();
  await tween(0.85, p => { const e = Ease.inOut(p), c = top().add(V3(0, 0.1, 0)).addScaledVector(f(), -0.02).lerp(neckC(), e), w = lerp(Rw, 0.095, e);
    execHand("L", c.clone().addScaledVector(lf(), w).addScaledVector(V_UP, KNOT_LEN / 2 * e)); execHand("R", c.clone().addScaledVector(lf(), -w)); });
  // 6) the right hand lets go; the left draws the knot round under his left ear and snugs it
  ROPE.snap = copyPose(ROPE.snap || newPose(), GAL.rope.drawn); ROPE.mode = "cinch"; ROPE.blend = 0; EXEC.setGrip("R", 0); EXEC.setIK("R", null, 0); EXEC.ik.R.fast = false;
  Sound.squeak(neckC(), 0.35); MAN.lookPt = null;
  const knotMid = () => { const np = noosePose(MAN); return np.attach.clone().lerp(np.top, 0.5); };
  await tween(0.5, p => { ROPE.blend = p; const np = noosePose(MAN), a = ROPE.snap.attach.clone().lerp(np.attach, Ease.inOut(p)), tp = ROPE.snap.top.clone().lerp(np.top, Ease.inOut(p)); execHand("L", a.lerp(tp, 0.5)); });
  GAL.rope.onNeck = true; ROPE.held = false; ROPE.mode = null; Sound.ropeCreak(neckC(), 0.9); Sound.breath(B.Head.getWorldPosition(V3()), 1);
  await tween(0.3, p => execHand("L", knotMid().addScaledVector(V_UP, 0.035 * Math.sin(p * Math.PI)))); // a tug upward to seat it
  EXEC.setGrip("L", 0); EXEC.setIK("L", null, 0); EXEC.ik.L.fast = false; setPanic(0.6);
  follow("face", faceShot, 0.8); await wait(1.6);
  EXEC.walkTo([[LAY.exec.x, LAY.exec.z]], 0.9).then(() => { EXEC.face(Math.PI / 2); EXEC.lookPt = MAN.ch.bones.Head.getWorldPosition(V3()); });
}
async function faceBeat(sec, panic) { setPanic(panic); follow("face", faceShot, 0.9); await wait(sec); }
// one beat per miss: 1 to the foot of the stairs, 2-4 up them (a third, two-thirds, the top), 5 onto the trap, 6 the noose,
// 7 the sweat, 8 the shakes, 9 the executioner's hand on the lever, 10 the drop (easier levels walk every beat, harder ones skip some)
async function goToStage(n) {
  Sound.setLevel(STATE.misses / STATE.maxWrong); STATE.mood = STATE.misses / STATE.maxWrong;
  if (n <= TRAP_I) {
    shot(n <= 3 ? "stairs" : "gallows", 1.0); MAN.lookPt = null;
    await manTo(n); if (n === TRAP_I) MAN.face(trapYaw());
    Sound.creak(V3(LAY.plat.x, LAY.plat.h, LAY.plat.z), 0.6); await wait(0.3); return;
  }
  if ((MAN.pathIdx || 0) < TRAP_I) { shot("gallows", 1.0); await manTo(TRAP_I); MAN.face(trapYaw()); await wait(0.35); }
  if (!GAL.rope.onNeck) await execNoose();
  if (n >= 7 && !MAN.sweating) { MAN.sweating = true; tween(2, p => MAN.ch.skin.userData.U.sweat.value = p * 0.85); MAN.setSad(0.6); }
  if (n >= 8) MAN.tremble = 1;
  if (n >= 9 && !EXEC.gripping) { EXEC.gripping = true; shot("gallows", 0.9); await gripLever(); }
  if (n >= 10) { await faceBeat(1.3, 1); return lose(); }
  await faceBeat(n === 6 ? 0.6 : 1.8, n >= 9 ? 1 : n >= 8 ? 0.85 : n >= 7 ? 0.72 : 0.6);
}
async function gripLever() { const tip = () => GAL.leverTip.getWorldPosition(V3()); EXEC.lookPt = tip(); EXEC.setIK("R", tip(), 1); await wait(0.45); EXEC.setGrip("R", 0.9); await wait(0.25); Sound.clank(tip()); EXEC.lookPt = MAN.ch.bones.Head.getWorldPosition(V3()); }
