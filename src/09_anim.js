// ---------- ACTORS: locomotion, mocap blending, look-at, two-bone IK, hanging physics ----------
const V_UP = new THREE.Vector3(0, 1, 0), V_Z = new THREE.Vector3(0, 0, 1);
const _coatM = new THREE.Matrix4(); const A1 = new THREE.Vector3(), A2 = new THREE.Vector3(), A3 = new THREE.Vector3(), A4 = new THREE.Vector3(), A5 = new THREE.Vector3();
const Q1 = new THREE.Quaternion(), Q2 = new THREE.Quaternion(), Q3 = new THREE.Quaternion(), Q4 = new THREE.Quaternion();
function floorAt(x, z) {
  const P = LAY.plat, S = LAY.stairs;
  if (x > P.x - P.w / 2 && x < P.x + P.w / 2 && z > P.z - P.d / 2 && z < P.z + P.d / 2 + 0.03) return P.h + 0.028;
  if (Math.abs(x - S.x) < S.w / 2 + 0.08 && z <= S.zBot + 0.1 && z >= S.zTop - 0.05) return P.h * clamp((S.zBot - z) / (S.zBot - S.zTop), 0, 1) + 0.026;
  return groundHeight(x, z);
}
// tread k: 0 = ground at the foot of the stairs, 1..12 = treads, 13 = platform deck
function treadAt(k) {
  const S = LAY.stairs, P = LAY.plat, rise = P.h / S.n, run = (S.zBot - S.zTop) / S.n;
  if (k <= 0) return [groundHeight(S.x, S.zBot + 0.3), S.zBot + 0.3];
  if (k >= S.n) return [P.h + 0.028, S.zTop - 0.24];
  return [k * rise + 0.026, S.zBot - (k - 0.5) * run];
}
function aimBone(bone, child, target, w) {
  bone.getWorldPosition(A1); child.getWorldPosition(A2);
  const cur = A2.sub(A1).normalize(), want = A3.copy(target).sub(A1).normalize();
  Q1.setFromUnitVectors(cur, want); bone.getWorldQuaternion(Q2); Q1.multiply(Q2);
  bone.parent.getWorldQuaternion(Q3).invert(); Q3.multiply(Q1);
  bone.quaternion.slerp(Q3, w); bone.updateMatrixWorld(true);
}
function twoBoneIK(up, mid, end, target, pole, w) {
  const a = up.getWorldPosition(A4), b = mid.getWorldPosition(A5), c = end.getWorldPosition(new THREE.Vector3());
  const la = a.distanceTo(b), lb = b.distanceTo(c);
  const d = new THREE.Vector3().subVectors(target, a), dist = clamp(d.length(), Math.abs(la - lb) + 0.002, la + lb - 0.002); d.normalize();
  const cosA = clamp((la * la + dist * dist - lb * lb) / (2 * la * dist), -1, 1), sinA = Math.sqrt(1 - cosA * cosA);
  const pv = new THREE.Vector3().subVectors(pole, a); pv.addScaledVector(d, -pv.dot(d)).normalize();
  const elbow = new THREE.Vector3().copy(a).addScaledVector(d, la * cosA).addScaledVector(pv, la * sinA);
  const tgt = new THREE.Vector3().copy(a).addScaledVector(d, dist);
  aimBone(up, mid, elbow, w); aimBone(mid, end, tgt, w);
}
// ---- hands that hold things: the grip point sits in the palm (not at the wrist bone), fingers curl round what they hold ----
const _g = [0, 1, 2, 3, 4, 5].map(() => new THREE.Vector3());
function palmNormal(actor, side, out) { // out of the palm, from the finger roots (the rig's palms face down in its bind pose)
  const S = side === "L" ? "Left" : "Right", B = actor.ch.bones, w = B[S + "Hand"].getWorldPosition(_g[0]), m = B[S + "HandMiddle1"].getWorldPosition(_g[1]);
  const d = _g[2].subVectors(m, w), s = _g[3].subVectors(B[S + "HandIndex1"].getWorldPosition(_g[4]), B[S + "HandPinky1"].getWorldPosition(_g[5]));
  return (side === "L" ? out.crossVectors(d, s) : out.crossVectors(s, d)).normalize();
}
function gripPt(actor, side, out) { const S = side === "L" ? "Left" : "Right", B = actor.ch.bones, n = palmNormal(actor, side, new THREE.Vector3());
  return out.copy(B[S + "Hand"].getWorldPosition(_g[0])).lerp(B[S + "HandMiddle1"].getWorldPosition(_g[1]), 0.85).addScaledVector(n, 0.024); }
// the wrist position that puts this hand's grip on G (uses this frame's hand orientation; it settles within a frame or two)
function wristFor(actor, side, G, out) { const S = side === "L" ? "Left" : "Right"; gripPt(actor, side, out); return out.sub(actor.ch.bones[S + "Hand"].getWorldPosition(_g[0])).negate().add(G); }
// finger curl axes, from the bind pose: each joint bends its finger toward the palm
function buildCurl() {
  const C = { Left: [], Right: [] }, M = new THREE.Matrix4(), Q = new THREE.Quaternion(), P = new THREE.Vector3(), Sc = new THREE.Vector3();
  for (const S of ["Left", "Right"]) for (const F of ["Index", "Middle", "Ring", "Pinky", "Thumb"]) for (let j = 1; j <= 3; j++) {
    const nm = S + "Hand" + F + j, ch = S + "Hand" + F + (j + 1); if (!CHAR.boneInv[nm] || !CHAR.bind[ch]) continue;
    const d = CHAR.bind[ch].clone().sub(CHAR.bind[nm]).normalize(), n = F === "Thumb" ? V3(0, -1, -0.7).normalize() : V3(0, -1, 0);
    M.copy(CHAR.boneInv[nm]).invert().decompose(P, Q, Sc); const ax = d.cross(n).normalize().applyQuaternion(Q.invert());
    C[S].push({ nm, ax, k: F === "Thumb" ? [0.28, 0.45, 0.4][j - 1] : [1.0, 1.25, 0.85][j - 1] });
  }
  return C;
}
const _gq = new THREE.Quaternion();
// rotate a bone in world space: yaw about up, pitch about actor's left axis, roll about actor's forward axis
function turnBone(bone, actor, yaw, pitch, roll) {
  const q = actor.root.quaternion;
  Q1.setFromAxisAngle(V_UP, yaw);
  Q2.setFromAxisAngle(A1.set(1, 0, 0).applyQuaternion(q), pitch); Q1.multiply(Q2);
  Q2.setFromAxisAngle(A1.set(0, 0, 1).applyQuaternion(q), roll); Q1.multiply(Q2);
  bone.getWorldQuaternion(Q3); Q1.multiply(Q3);
  bone.parent.getWorldQuaternion(Q4).invert(); bone.quaternion.copy(Q4.multiply(Q1)); bone.updateMatrixWorld(true);
}
class Actor {
  constructor(spec, name) {
    this.name = name; this.ch = buildCharacter(spec); this.root = new THREE.Group(); this.root.add(this.ch.root); R.scene.add(this.root);
    this.mixer = new THREE.AnimationMixer(this.ch.root); this.act = {};
    for (const n of ["idle", "walk"]) { const a = this.mixer.clipAction(CHAR.clips[n]); a.play(); this.act[n] = a; }
    this.act.walk.setEffectiveWeight(0);
    for (const k of ["agree", "shake", "sad"]) { const a = this.mixer.clipAction(CHAR.add[k]); a.blendMode = THREE.AdditiveAnimationBlendMode; if (k !== "sad") { a.setLoop(THREE.LoopOnce, 1); a.clampWhenFinished = false; } this.act[k] = a; }
    this.pos = new THREE.Vector3(); this.yaw = 0; this.yawTarget = 0; this.walkW = 0; this.path = null; this.speed = 1.3;
    this.lookPt = null; this.lookW = 0; this.ik = { R: { w: 0, goal: 0, t: new THREE.Vector3(), pole: null }, L: { w: 0, goal: 0, t: new THREE.Vector3(), pole: null } };
    this.hang = null; this.tremble = 0; this.time = Math.random() * 10; this.prevPh = 0; this.onStep = null; this.bound = false; this.extra = null;
    this.mixer.update(Math.random() * 2.4);
  }
  // a run cycle beside the walk (the gunmen in the shootout dash between spots); the clip's own pace is 2.98 m/s
  addRun() { if (this.act.run) return; const a = this.mixer.clipAction(CHAR.clips.run); a.play(); a.setEffectiveWeight(0); this.act.run = a; this.runK = 0; }
  place(x, z, yaw) { this.stair = null; this.stFeet = null; this.pos.set(x, floorAt(x, z), z); this.yaw = this.yawTarget = yaw; this.path = null; this.walkW = 0; this.root.position.copy(this.pos); this.root.rotation.y = yaw; }
  walkTo(pts, speed = 1.3) { this.stair = null; this.stFeet = null; this.path = pts.map(p => V3(p[0], 0, p[1])); this.speed = speed; return new Promise(res => { this.arrive = res; }); }
  face(yaw) { this.yawTarget = yaw; }
  faceTo(x, z) { this.yawTarget = Math.atan2(x - this.pos.x, z - this.pos.z); }
  gesture(k) { const a = this.act[k]; a.reset(); a.setEffectiveWeight(1); a.play(); }
  setSad(w) { const a = this.act.sad; if (w > 0 && !a.isRunning()) a.play(); a.setEffectiveWeight(w); }
  update(dt) {
    this.time += dt;
    if (this.path) {
      const tg = this.path[0], dx = tg.x - this.pos.x, dz = tg.z - this.pos.z, d = Math.hypot(dx, dz);
      if (d < 0.04) { this.path.shift(); if (!this.path.length) { this.path = null; const r = this.arrive; this.arrive = null; if (r) r(); } }
      else { this.yawTarget = Math.atan2(dx, dz); const mv = Math.min(d, this.speed * Math.max(this.walkW, 0.2) * dt); this.pos.x += dx / d * mv; this.pos.z += dz / d * mv; }
    }
    const moving = !!this.path;
    this.walkW = clamp(this.walkW + (moving ? dt * 3.2 : -dt * 3.6), 0, 1);
    let dy = ((this.yawTarget - this.yaw + Math.PI) % TAU + TAU) % TAU - Math.PI; this.yaw += dy * Math.min(1, dt * 5.5);
    if (this.stair) this.updateStair(dt);
    else if (!this.hang) { const fy = floorAt(this.pos.x, this.pos.z); this.pos.y += (fy - this.pos.y) * Math.min(1, dt * 14); }
    this.root.position.copy(this.pos); this.root.rotation.set(0, this.yaw, 0);
    const run = this.act.run; if (run) this.runK += (clamp((this.speed - 1.9) / 0.9, 0, 1) - this.runK) * Math.min(1, dt * 6);
    const rk = run ? this.runK : 0;
    this.act.idle.setEffectiveWeight(1 - this.walkW); this.act.walk.setEffectiveWeight(this.walkW * (1 - rk)); this.act.walk.timeScale = this.speed / 1.42;
    if (run) { run.setEffectiveWeight(this.walkW * rk); run.timeScale = this.speed / 2.98; }
    if (this.hang) { this.act.idle.timeScale = 0; this.act.walk.setEffectiveWeight(0); if (run) run.setEffectiveWeight(0); }
    this.mixer.update(dt);
    if (this.walkW > 0.35 && this.onStep) { const ph = (this.act.walk.time / CHAR.clips.walk.duration) % 1;
      const p0 = this.prevPh;
      for (const c of [0.31, 0.81]) { const hit = p0 <= ph ? (p0 < c && ph >= c) : (c > p0 || c <= ph); if (hit) this.onStep(this); }
      this.prevPh = ph; }
    if (this.hang) this.updateHang(dt);
    this.root.updateMatrixWorld(true);
    this.procedural(dt);
  }
  procedural(dt) {
    const B = this.ch.bones;
    if (this.hang) { this.updateFace(dt); this.updateTie(); if (this.extra) this.extra(this, dt); return; }
    if (this.stFeet) this.stairIK();
    if (this.pre) this.pre(this, dt); // a stance laid over the clip before the head turns and the arms are solved (the shootout)
    this.updateFace(dt);
    const lw = this.lookPt ? 1 : 0; this.lookW += (lw - this.lookW) * Math.min(1, dt * 4);
    if (this.lookW > 0.02 && this.lookPt) {
      B.Head.getWorldPosition(A5); const d = A4.copy(this.lookPt || A5).sub(A5).applyQuaternion(Q4.copy(this.root.quaternion).invert());
      const yaw = clamp(Math.atan2(d.x, d.z), -1.15, 1.15) * this.lookW, pitch = clamp(Math.atan2(d.y, Math.hypot(d.x, d.z)), -0.6, 0.5) * this.lookW;
      turnBone(B.Neck, this, yaw * 0.4, -pitch * 0.4, 0); turnBone(B.Head, this, yaw * 0.6, -pitch * 0.6, 0);
    }
    if (this.talkAmt > 0.01) { const k = this.talkAmt, t = this.time; // speech: small emphasis nods riding the syllables
      turnBone(B.Neck, this, 0, -0.025 * k, 0); turnBone(B.Head, this, Math.sin(t * 2.1) * 0.025 * k, -(0.045 * k + Math.sin(t * 6.3) * 0.015 * k), Math.sin(t * 1.6) * 0.02 * k); }
    if (this.ch.maskTalk) this.ch.maskTalk.value += ((this.talkAmt || 0) - this.ch.maskTalk.value) * Math.min(1, dt * 18);
    if (this.tremble > 0) { const t = this.time, k = this.tremble;
      for (const s of ["Left", "Right"]) turnBone(B[s + "UpLeg"], this, 0, Math.sin(t * 37 + (s === "Left" ? 0 : 2)) * 0.03 * k, 0);
      turnBone(B.Spine1, this, 0, Math.sin(t * 29) * 0.012 * k, Math.sin(t * 23) * 0.01 * k); }
    if (this.bound) { // wrists tied in front of the belt
      B.Hips.getWorldPosition(A5); const fw = A1.set(0, 0, 1).applyQuaternion(this.root.quaternion), lf = A2.set(1, 0, 0).applyQuaternion(this.root.quaternion);
      for (const [k, s] of [["R", -1], ["L", 1]]) { const ik = this.ik[k]; if (ik.goal === 0 || ik.boundOnly) { ik.boundOnly = true; ik.goal = 1; ik.t.copy(A5).addScaledVector(fw, 0.2).addScaledVector(lf, s * 0.035).add(A3.set(0, -0.02, 0)); } }
    }
    for (const side of ["R", "L"]) {
      const k = this.ik[side]; k.w += (k.goal - k.w) * Math.min(1, dt * (k.fast ? 14 : 7));
      if (k.w > 0.01) { const S = side === "R" ? "Right" : "Left", sh = B[S + "Arm"].getWorldPosition(new THREE.Vector3());
        const pole = k.pole || sh.clone().add(A1.set(side === "R" ? -0.5 : 0.5, -1, -0.4).applyQuaternion(this.root.quaternion));
        twoBoneIK(B[S + "Arm"], B[S + "ForeArm"], B[S + "Hand"], k.t, pole, k.w); }
    }
    if (this.grip) this.applyGrip(dt);
    this.updateTie();
    if (this.ch.coatU) this.updateCoat(dt);
    if (this.extra) this.extra(this, dt);
  }
  // the duster's tails: six damped springs round the hem, anchored to the pelvis; they lag when he starts and stops, swing out
  // on turns and lean with the wind; the offsets go to the body shader, which bends the coat below the waist
  updateCoat(dt) {
    const C = this.coat || (this.coat = { p: [], v: [], m: new THREE.Matrix4(), mi: new THREE.Matrix3(), a: [2.07, 1.07, 3.17, -0.03, 4.17, 5.25] });
    const hips = this.ch.bones.Hips; C.m.multiplyMatrices(hips.matrixWorld, CHAR.boneInv.Hips);
    C.mi.setFromMatrix4(_coatM.copy(this.ch.body.matrixWorld).invert()); const h = Math.min(dt, 0.05), t = this.time;
    for (let k = 0; k < 6; k++) {
      const an = A1.set(Math.cos(C.a[k]) * 0.27, 0.42, Math.sin(C.a[k]) * 0.22).applyMatrix4(C.m);
      if (!C.p[k]) { C.p[k] = an.clone(); C.v[k] = new THREE.Vector3(); }
      const p = C.p[k], v = C.v[k];
      if (p.distanceToSquared(an) > 1) { p.copy(an); v.set(0, 0, 0); } // teleported
      const gust = 1.1 + 0.7 * Math.sin(t * 4.3 + k * 1.7) + 0.4 * Math.sin(t * 9.1 + k);
      v.x += ((an.x - p.x) * 24 - v.x * 2.6 + WIND.v.x * gust * 0.9) * h; v.y += ((an.y - p.y) * 24 - v.y * 2.6) * h; v.z += ((an.z - p.z) * 24 - v.z * 2.6 + WIND.v.z * gust * 0.9) * h;
      p.addScaledVector(v, h);
      const d = A2.subVectors(p, an); const hl = Math.hypot(d.x, d.z); if (hl > 0.22) { d.x *= 0.22 / hl; d.z *= 0.22 / hl; p.x = an.x + d.x; p.z = an.z + d.z; }
      d.y = Math.min(0.05, Math.max(-0.03, d.y)) + (d.x * d.x + d.z * d.z) * 0.9; // a swinging tail rises
      this.ch.coatU[k].copy(d).applyMatrix3(C.mi);
    }
  }
  updateTie() {
    if (!this.ch.spec.bound) return; const B = this.ch.bones;
    if (!this.tie) { this.tie = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 1, 6), MAT.rope); this.tie.castShadow = true; R.scene.add(this.tie); }
    const a = B.LeftHand.getWorldPosition(A1), b = B.RightHand.getWorldPosition(A2), d = A3.subVectors(b, a), len = d.length();
    this.tie.position.copy(a).addScaledVector(d, 0.5); this.tie.scale.set(1, Math.max(0.01, len), 1); this.tie.quaternion.setFromUnitVectors(V_UP, d.normalize());
  }
  // ---- stairs: one tread per step, feet planted with leg IK ----
  climbStairs(k0, k1, T = 0.5) {
    const dir = k1 > k0 ? 1 : -1, yaw = dir > 0 ? Math.PI : 0, lx = Math.cos(yaw), lz = -Math.sin(yaw);
    const fp = (k, f) => { const [y, z] = treadAt(k), sd = f === "L" ? 0.1 : -0.1; return V3(LAY.stairs.x + sd * lx, y, z + sd * lz); };
    const q = []; let k = k0, foot = "R"; while (k !== k1) { k += dir; q.push({ foot, k }); foot = foot === "R" ? "L" : "R"; } q.push({ foot, k: k1 });
    this.path = null; this.yawTarget = yaw;
    this.stair = { yaw, dir, fp, q, cur: null, t: 0, T, feet: { L: fp(k0, "L"), R: fp(k0, "R") }, kf: { L: k0, R: k0 } };
    return new Promise(res => { this.stair.done = res; });
  }
  updateStair(dt) {
    const st = this.stair; this.yawTarget = st.yaw;
    if (!st.cur && st.q.length) { st.cur = st.q.shift(); st.from = st.feet[st.cur.foot].clone(); st.to = st.fp(st.cur.k, st.cur.foot); st.t = 0;
      const other = st.cur.foot === "L" ? "R" : "L"; st.y0 = Math.min(st.feet.L.y, st.feet.R.y); st.y1 = Math.min(st.to.y, st.feet[other].y); }
    let mv = null, s = 0;
    if (st.cur) {
      st.t += dt / st.T; s = Ease.inOut(Math.min(1, st.t)); mv = st.from.clone().lerp(st.to, s); mv.y += (0.06 + Math.abs(st.to.y - st.from.y) * 0.45) * Math.sin(Math.PI * s);
      if (st.t >= 1) { st.feet[st.cur.foot] = st.to.clone(); st.kf[st.cur.foot] = st.cur.k; const f = st.cur.foot; st.cur = null; mv = null;
        if (this.onStep) this.onStep(this, f); if (!st.q.length && st.done) { const d = st.done; st.done = null; d(); } }
    }
    const L = mv && st.cur && st.cur.foot === "L" ? mv : st.feet.L, Rf = mv && st.cur && st.cur.foot === "R" ? mv : st.feet.R;
    const fwd = A1.set(Math.sin(st.yaw), 0, Math.cos(st.yaw)), y = st.cur ? lerp(st.y0, st.y1, s) : Math.min(st.feet.L.y, st.feet.R.y);
    this.pos.set((st.feet.L.x + st.feet.R.x) / 2, y, (L.z + Rf.z) / 2).addScaledVector(fwd, 0.05 * st.dir);
    this.stFeet = { L: L.clone(), R: Rf.clone() };
  }
  stairIK() {
    const B = this.ch.bones, fwd = A1.set(Math.sin(this.yaw), 0, Math.cos(this.yaw)).clone();
    turnBone(B.Spine, this, 0, (this.stair && this.stair.dir > 0 ? 0.1 : -0.04), 0);
    for (const [side, S] of [["L", "Left"], ["R", "Right"]]) {
      const f = this.stFeet[side], ankle = f.clone().add(A2.set(0, 0.085, 0)).addScaledVector(fwd, -0.05);
      const pole = B[S + "UpLeg"].getWorldPosition(new THREE.Vector3()).addScaledVector(fwd, 1.0).add(A3.set(0, 0.2, 0));
      twoBoneIK(B[S + "UpLeg"], B[S + "Leg"], B[S + "Foot"], ankle, pole, 1);
      aimBone(B[S + "Foot"], B[S + "ToeBase"], ankle.clone().addScaledVector(fwd, 0.107).add(A2.set(0, -0.083, 0)), 1);
    }
  }
  // ---- face: blinks, saccades, panic (wide eyes, raised brows, panting, sweat) ----
  updateFace(dt) {
    const ch = this.ch, dead = !!(this.hang && (this.hang.taut || this.hang.dead)), p = dead ? 0 : (this.panic || 0); if (!ch.eyes || !ch.eyes.length) return;
    ch.blink -= dt; let open = dead ? 0 : 1;
    if (ch.blink < 0.14 && !dead) { open = Math.min(1, Math.abs(ch.blink - 0.07) / 0.07); if (ch.blink < 0) ch.blink = (p > 0.3 ? 1.0 : 2.8) + Math.random() * 3; }
    ch.sacc -= dt; if (ch.sacc < 0) { ch.sacc = p > 0.2 ? 0.12 + Math.random() * 0.3 : 0.5 + Math.random() * 1.8; const a = 0.12 + p * 0.38; ch.jit.set((Math.random() - 0.5) * 0.07, (Math.random() - 0.5) * 0.05); ch.gazeT.set((Math.random() - 0.5) * a * 2, (Math.random() - 0.5) * a + p * 0.06, 1).normalize(); }
    if (this.lookPt && !dead) { // eyes find the thing he is looking at, with small saccades around it
      ch.head.updateWorldMatrix(true, false); const lp = ch.head.worldToLocal(A4.copy(this.lookPt)).sub(A5.set(-0.095, 1.655, 1.7)).normalize();
      ch.gazeT.set(lp.x / Math.max(lp.z, 0.3) + ch.jit.x, lp.y / Math.max(lp.z, 0.3) + ch.jit.y, 1); }
    ch.gazeT.set(clamp(ch.gazeT.x / ch.gazeT.z, -0.45, 0.45), clamp(ch.gazeT.y / ch.gazeT.z, -0.32, 0.3), 1).normalize();
    ch.gaze.lerp(ch.gazeT, Math.min(1, dt * 30)).normalize();
    const SU = ch.skin.userData.U; SU.eyeOpen.value = open; SU.eyeGaze.value.copy(ch.gaze); SU.pupil.value = 0.3 + p * 0.1;
    for (const e of ch.eyes) e.quaternion.setFromUnitVectors(V_Z, ch.gaze);
    updateLashes(ch, open, SU.fear.value, ch.gaze);
    if (dead) { const U = ch.skin.userData.U; U.fear.value *= 0.95; U.jaw.value += (0.35 - U.jaw.value) * 0.05; }
    else if (p > 0 || this.breathe) {
      this.brPh = (this.brPh || 0) + dt * (1.4 + 2.6 * p) * TAU; const sn = Math.sin(this.brPh);
      turnBone(this.ch.bones.Spine2, this, 0, -0.03 * sn * (0.3 + p), 0);
      const U = ch.skin.userData.U; U.fear.value = p; U.jaw.value = p * (0.35 + 0.3 * Math.max(0, sn));
      if (this.onBreath && this.prevBr < 0 && sn >= 0) this.onBreath(this, p); this.prevBr = sn;
    }
    if (ch.drops) { const sw = ch.skin.userData.U.sweat.value; for (const d of ch.drops) { const [x, y, z] = d.userData.base, ph = (this.time * 0.06 + d.userData.ph) % 1;
      d.scale.set(0.04, 0.055, 0.03).multiplyScalar(sw > 0.2 ? (0.6 + 0.6 * (1 - ph)) * sw : 0.0001); d.position.set(x, y - ph * 0.45, z + 0.025 - ph * 0.08); } }
  }
  setIK(side, target, goal = 1, pole = null) { const k = this.ik[side]; k.boundOnly = false; if (target) k.t.copy(target); k.goal = goal; k.pole = pole; }
  // close (1) or open (0) a hand round whatever it holds
  setGrip(side, amt) { if (!this.grip) this.grip = { L: 0, R: 0, tL: 0, tR: 0 }; this.grip["t" + side] = amt; }
  applyGrip(dt) {
    const G = this.grip, C = CHAR.curl || (CHAR.curl = buildCurl()), B = this.ch.bones;
    for (const side of ["L", "R"]) { G[side] += (G["t" + side] - G[side]) * Math.min(1, dt * 10); const a = G[side]; if (a < 0.01) continue;
      for (const c of C[side === "L" ? "Left" : "Right"]) { const b = B[c.nm]; if (!b) continue; b.quaternion.multiply(_gq.setFromAxisAngle(c.ax, c.k * a)); }
      B[(side === "L" ? "Left" : "Right") + "Hand"].updateMatrixWorld(true); }
  }
  // hanging: the body becomes a ragdoll on an elastic rope (see Ragdoll)
  startDrop(anchor, ropeLen) {
    this.root.updateMatrixWorld(true); this.hang = new Ragdoll(this, anchor, ropeLen);
    this.panic = 0; this.lookPt = null; this.lookW = 0; this.tremble = 0; this.path = null; this.stFeet = null; this.stair = null;
  }
  updateHang(dt) { this.hang.step(dt); this.hang.pose(dt); }
}
