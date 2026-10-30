// ---------- HORSES SHOT, AND MEAT (v36) ----------
// A horse hit by a bullet goes down: the loose horse that bolts through town (in the shootout it comes through every 9–16 s, across the
// street behind the gallows) and, on the getaway, a posse rider's horse, which throws its rider. It cries out, its forelegs fold, it pitches
// nose-first and rolls onto its side, slides to a stop and lies there in its blood. Hit by the laser (12k) a horse is gone in a flash and a
// steak drops out of the air where it was; a crow comes down as a chicken leg. The meat bounces, lies where it lands and steams.
const MEAT = { list: [], steakGeo: null, steakMats: null, legGeo: null, legMat: null, zaps: [], blue: null };
const _mt1 = new THREE.Vector3(), _mt2 = new THREE.Vector3(), _mt3 = new THREE.Vector3(), _mtq = new THREE.Quaternion(), _mte = new THREE.Euler(), _mtc = new THREE.Color();
// the horse for a shot, in its own frame (metres): the body, the neck and head, the forelegs, the hind legs
const HORSE_CAPS = [[V3(0, 1.22, 0.85), V3(0, 1.17, -0.9), 0.42], [V3(0, 1.45, 0.92), V3(0, 1.95, 1.38), 0.22], [V3(0, 0.95, 0.6), V3(0, 0.15, 0.62), 0.11], [V3(0, 0.95, -0.72), V3(0, 0.15, -0.8), 0.11]];
const HORSE_HC = 1.15; // (the height of the middle of its body: what it rolls about as it goes down)

function horseRayOne(H, ro, rd) {
  if (!H || !H.grp.visible || H.meat) return -1; H.grp.updateMatrixWorld(); let best = -1;
  HORSE_CAPS.forEach(([a, b, r], k) => { _mt1.copy(a); _mt2.copy(b);
    if (k === 1 && H.stand && H.neckA) { const np = HORSE.stand.neckP; for (const [q, w] of [[_mt1, 0.35], [_mt2, 1]]) { const ang = H.neckA * w, dy = q.y - np.x, dz = q.z - np.y; q.y = np.x + dy * Math.cos(ang) - dz * Math.sin(ang); q.z = np.y + dy * Math.sin(ang) + dz * Math.cos(ang); } } // (a horse grazing: its head is down)
    const t = rayCapsule(ro, rd, _mt1.applyMatrix4(H.grp.matrixWorld), _mt2.applyMatrix4(H.grp.matrixWorld), r); if (t > 0 && (best < 0 || t < best)) best = t; });
  return best;
}
// the town's horse, for a shot in the shootout
function townHorseRay(ro, rd) { const H = LIFE.horse, t = H && (H.run || H.dead) ? horseRayOne(H, ro, rd) : -1, h = herdRay(ro, rd); // (and the horses about the town: 12n)
  return t > 0 && (!h || t < h.t) ? { t, H } : h; }

// ---- going down ----
// the pose part way through the fall (t seconds in): forelegs folding and the nose going down, then over onto its side, the body dropping
// to the ground and settling. base: where its feet are; side: which way it rolls
function horseFallPose(H, base, yaw, t, side) {
  const k1 = smoothstep(0, 0.32, t), k2 = Ease.inOut(smoothstep(0.22, 0.85, t)), bounce = t > 0.85 ? Math.exp(-(t - 0.85) * 9) * Math.sin((t - 0.85) * 22) * 0.05 : 0;
  const pitch = 0.42 * k1 * (1 - smoothstep(0.4, 0.95, t)) + 0.06 * k2, roll = side * 1.42 * k2, drop = (HORSE_HC - 0.44) * k2 + bounce;
  _mtq.setFromEuler(_mte.set(pitch, yaw, roll, "YXZ")); H.grp.quaternion.copy(_mtq);
  H.grp.position.copy(base).add(_mt1.set(0, HORSE_HC - drop, 0)).add(_mt2.set(0, -HORSE_HC, 0).applyQuaternion(_mtq));
}
function horseDown(H, at, rd, v, dir, yaw) { // (common to the town horse and a posse horse)
  bloodBurst(at, rd, false); Sound.clip(siegePick("horse", 3), at, 1.35, 0, 0.3, rnd(0.95, 1.06), 9); crowsStartle(at, 30, 1);
  return { t: 0, v, dir: dir.clone(), yaw, side: Math.random() < 0.5 ? -1 : 1, ts: H.act.timeScale, landed: false, base: H.grp.position.clone() };
}
function horseLanded(H, D) { // the body meets the ground: a heavy thump, dust, and the blood spreads under it
  D.landed = true; const c = H.grp.localToWorld(_mt3.set(0, HORSE_HC, 0)).clone(); c.y = groundVis(c.x, c.z);
  Sound.thud(c, 1); Sound.thud(c, 0.8); puff(c.clone().add(_mt1.set(0, 0.2, 0)), 30, 1.6, 0.5, 2.4, 0.5); CAM.shake = Math.max(CAM.shake, reduceMotion() ? 0 : 0.25);
  if (SIEGE.bloodMat) { const m = new THREE.Mesh(SIEGE.poolGeo || (SIEGE.poolGeo = new THREE.PlaneGeometry(2, 2)), SIEGE.bloodMat); m.rotation.x = -Math.PI / 2; m.rotation.z = Math.random() * TAU;
    m.position.set(c.x, groundVis(c.x, c.z) + 0.006 + SIEGE.pools.length * 0.0004, c.z); m.scale.set(0.01, 0.01, 1); m.receiveShadow = true; R.scene.add(m); SIEGE.pools.push({ m, t: 0, r: rnd(1.0, 1.4) }); }
}
// the town horse, shot with the revolver
function horseShot(H, at, rd) {
  if (H.dead) { bloodBurst(at, rd, false); Sound.thud(at, 0.5); return; } // (already down: it's dead)
  const v = H.run ? H.run.v : H.walk ? 1.2 : 0, dir = V3(Math.sin(H.yaw || 0), 0, Math.cos(H.yaw || 0)); H.dead = horseDown(H, at, rd, v, dir, H.yaw || 0); H.run = null; H.walk = null;
}
function horseFallStep(H, dt) { // (each frame while it's down: 10 updateHorse)
  const D = H.dead; D.t += dt; D.v = Math.max(0, D.v - dt * (D.t < 0.5 ? 3 : 9)); D.base.addScaledVector(D.dir, D.v * dt); D.base.y = groundVis(D.base.x, D.base.z);
  H.act.timeScale = D.ts * Math.max(0, 1 - D.t / 0.35); H.mixer.update(dt); // (its legs stop where they were)
  horseFallPose(H, D.base, D.yaw, Math.min(D.t, 1.6), D.side); H.grp.updateMatrixWorld(true); horseTackUpdate(H, dt);
  if (!D.landed && D.t > 0.72) horseLanded(H, D);
}
// a posse horse in the getaway, shot: its rider goes off (12g riderHit) and it goes down where it was, sliding on along the trail
function chaseHorseRay(ro, rd) { let best = null; for (const R0 of CHASE.riders || []) { if (!R0.alive || !R0.H.grp.visible) continue; const t = horseRayOne(R0.H, ro, rd); if (t > 0 && (!best || t < best.t)) best = { t, R0 }; } return best; }
function chaseHorseShot(R0, at, rd) {
  const C = CHASE, H = R0.H; R0.hp = 1; riderHit(R0, ["Hips", "Spine", 0.2, "hips", "Hips"], at, rd); if (!R0.free) return;
  R0.free.down = horseDown(H, at, rd, C.speed, V3(Math.sin(H.yaw), 0, Math.cos(H.yaw)), H.yaw); R0.free.v = C.speed;
}
function chaseHorseFallStep(R0, dt) {
  const F = R0.free, D = F.down, H = R0.H; D.t += dt; F.v = Math.max(0, F.v - dt * (D.t < 0.5 ? 4 : 12)); F.s += F.v * dt;
  const p = trailAt(F.s, F.l, _mt3); H.act.timeScale = D.ts * Math.max(0, 1 - D.t / 0.35); H.mixer.update(dt);
  horseFallPose(H, _mt1.set(p.x, p.y, p.z).clone(), p.yaw, Math.min(D.t, 1.6), D.side); H.grp.updateMatrixWorld(true); horseTackUpdate(H, dt);
  if (!D.landed && D.t > 0.72) { horseLanded(H, D); kickDust(H.grp.position, 10, 1.4, 1.2, 1, 1.4); }
  if (F.s < CHASE.s - 90) { H.grp.visible = false; horseTackShow(H, false); }
}

// ---- the laser: a flash, and meat ----
function zapTex() { const c = document.createElement("canvas"); c.width = c.height = 128; const g = c.getContext("2d"), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.25, "rgba(190,230,255,0.85)"); gr.addColorStop(0.6, "rgba(70,150,255,0.3)"); gr.addColorStop(1, "rgba(20,60,255,0)"); g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  g.strokeStyle = "rgba(220,245,255,0.8)"; g.lineWidth = 3; g.beginPath(); g.arc(64, 64, 52, 0, TAU); g.stroke(); return canvasTex(c); }
function zapFx(at, size) {
  if (!MEAT.blue) { const tex = zapTex(); for (let i = 0; i < 4; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: false }));
      s.visible = false; s.renderOrder = 8; R.scene.add(s); MEAT.zaps.push({ s, t: 1, size: 1 }); } MEAT.blue = pointPool(260, 0.06, 0x9fdcff, true); }
  const z = MEAT.zaps.find(q => q.t >= 1) || MEAT.zaps[0]; z.t = 0; z.size = size; z.s.position.copy(at); z.s.visible = true;
  for (let i = 0; i < 40 * size; i++) emit(MEAT.blue, at, _mt1.set(rnd(-1, 1), rnd(-0.6, 1.4), rnd(-1, 1)).normalize().multiplyScalar(rnd(1, 4) * Math.sqrt(size)), rnd(0.25, 0.6));
  puff(at, 10, 0.5 * size, 0.3 * size, 1.4, 0.45, 0xe8eef2); Sound.zap(at, size);
}
// a crow hit by the beam
function crowLaser(c, at, rd) {
  if (c.state === "meat" || c.state === "away") return; const was = c.state, v = was === "fly" && c.fl ? _mt1.subVectors(c.pos, c.fl.prev).divideScalar(Math.max(LASER.dtNow || 0.016, 0.005)).clone() : V3();
  const ctr = c.body.getWorldPosition(V3()); c.state = "meat"; c.meatT = 0; c.fl = null; c.hop = null; c.act = null; c.perch = null; c.meatAt = ctr.clone();
  zapFx(ctr, 0.6); spawnMeat("leg", ctr, v.clampLength(0, 6).add(V3(rnd(-0.5, 0.5), 1.8, rnd(-0.5, 0.5))), c.s * 2.4); // (v37: a big drumstick, about 0.6 m)
  if (was !== "dead") { crowsStartle(at, 40, 1.3); SIEGE.crowKills = (SIEGE.crowKills || 0) + 1; }
}
function crowMeatStep(c, dt) { c.meatT += dt; const k = 1 - smoothstep(0, 0.1, c.meatT); c.root.scale.setScalar(c.s * Math.max(0.001, k)); c.root.position.lerpVectors(c.meatAt, c.pos, k); if (c.meatT > 0.1) c.root.visible = false; }
// the town horse hit by the beam
function horseLaser(H, at, rd) {
  if (H.meat) return; const ctr = H.grp.localToWorld(V3(0, HORSE_HC, 0)), v = H.run ? V3(Math.sin(H.yaw), 0, Math.cos(H.yaw)).multiplyScalar(H.run.v) : V3();
  H.meat = { t: 0, c: ctr, p0: H.grp.position.clone() }; H.run = null; H.dead = null; horseTackShow(H, false);
  zapFx(ctr, 1.5); spawnMeat("steak", ctr, v.multiplyScalar(0.6).add(V3(rnd(-0.4, 0.4), 2.4, rnd(-0.4, 0.4))), 1); crowsStartle(at, 30, 1);
}
function horseMeatStep(H, dt) { const M = H.meat; M.t += dt; const k = 1 - smoothstep(0, 0.12, M.t); H.grp.scale.setScalar(Math.max(0.001, k)); H.grp.position.lerpVectors(M.c, M.p0, k); if (M.t > 0.12) H.grp.visible = false; }

// ---- the meat ----
function steakTex() { // a grilled steak seen from above: seared brown, marbled, darker grill bars, a rim of fat along one edge (laid out to fit steakGeo's outline)
  const c = document.createElement("canvas"); c.width = c.height = 256; const g = c.getContext("2d"), r = rng(23);
  const gr = g.createRadialGradient(128, 120, 16, 128, 128, 150); gr.addColorStop(0, "#7e3b1e"); gr.addColorStop(0.62, "#64301a"); gr.addColorStop(1, "#3a170a"); g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 70; i++) { g.strokeStyle = `rgba(${215 + r() * 30},${160 + r() * 35},${130 + r() * 30},${0.05 + r() * 0.11})`; g.lineWidth = 0.8 + r() * 2; g.beginPath(); const x = r() * 256, y = r() * 230; // (marbling)
    g.moveTo(x, y); g.bezierCurveTo(x + r() * 40 - 20, y + r() * 40 - 20, x + r() * 60 - 30, y + r() * 60 - 30, x + r() * 70 - 35, y + r() * 70 - 35); g.stroke(); }
  for (let i = 0; i < 45; i++) { g.fillStyle = `rgba(28,11,4,${0.08 + r() * 0.18})`; g.beginPath(); g.ellipse(r() * 256, r() * 256, 4 + r() * 14, 3 + r() * 8, r() * 3, 0, TAU); g.fill(); } // (the sear, uneven)
  const fg = g.createLinearGradient(0, 196, 0, 240); fg.addColorStop(0, "rgba(226,196,140,0)"); fg.addColorStop(0.4, "rgba(226,196,140,0.92)"); fg.addColorStop(1, "rgba(142,84,38,0.95)"); // (the fat, browned at its edge)
  g.fillStyle = fg; g.beginPath(); g.ellipse(128, 244, 124, 46, 0, Math.PI, TAU); g.fill();
  g.save(); g.shadowColor = "rgba(18,7,2,0.9)"; g.shadowBlur = 7; g.strokeStyle = "rgba(20,8,3,0.82)"; g.lineWidth = 10;
  for (let i = -3; i <= 4; i++) { g.beginPath(); g.moveTo(i * 44 - 40, 0); g.lineTo(i * 44 + 120, 256); g.stroke(); } g.restore(); // (the grill)
  return canvasTex(c);
}
function buildMeat() {
  // a big steak: a rounded slab, bevelled edges, seared top and bottom, crust round the side
  const pts = []; for (let i = 0; i < 28; i++) { const a = i / 28 * TAU, k = 1 + 0.1 * Math.sin(2 * a + 0.6) + 0.05 * Math.sin(3 * a + 1.2) - 0.08 * Math.max(0, Math.cos(a - 1.9)) ** 6; pts.push(new THREE.Vector2(Math.cos(a) * 0.3 * k, Math.sin(a) * 0.21 * k)); }
  const sg = new THREE.ExtrudeGeometry(new THREE.Shape(pts), { depth: 0.05, bevelEnabled: true, bevelThickness: 0.016, bevelSize: 0.018, bevelSegments: 3, curveSegments: 4 });
  const uv = sg.attributes.uv, P = sg.attributes.position; for (let i = 0; i < uv.count; i++) uv.setXY(i, P.getX(i) / 0.7 + 0.5, P.getY(i) / 0.5 + 0.5);
  sg.translate(0, 0, -0.025); sg.rotateX(-Math.PI / 2); sg.computeVertexNormals(); MEAT.steakGeo = sg;
  const top = new THREE.MeshStandardMaterial({ map: steakTex(), roughness: 0.55, metalness: 0 }), crust = new THREE.MeshStandardMaterial({ color: 0x2c1207, roughness: 0.8 }); MEAT.steakMats = [top, crust];
  // a chicken leg: knob and bone, then the roasted meat
  const prof = [[0, 0], [0.012, 0.002], [0.016, 0.011], [0.011, 0.022], [0.0075, 0.03], [0.0075, 0.07], [0.016, 0.085], [0.032, 0.12], [0.042, 0.16], [0.04, 0.19], [0.028, 0.214], [0, 0.226]].map(([x, y]) => new THREE.Vector2(x, y));
  const lg = new THREE.LatheGeometry(prof, 14), col = new Float32Array(lg.attributes.position.count * 3), cb = new THREE.Color(0xeadcc4).convertSRGBToLinear(), cm = new THREE.Color(0xb06a2c).convertSRGBToLinear(), cd = new THREE.Color(0x6a3612).convertSRGBToLinear();
  for (let i = 0; i < lg.attributes.position.count; i++) { const y = lg.attributes.position.getY(i), x = lg.attributes.position.getX(i), z = lg.attributes.position.getZ(i), n = 0.5 + 0.5 * Math.sin(x * 160 + y * 90) * Math.cos(z * 140 - y * 50);
    const c = y < 0.076 ? cb : _mtc.copy(cm).lerp(cd, n * 0.6); col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; }
  lg.setAttribute("color", new THREE.BufferAttribute(col, 3)); lg.translate(0, -0.113, 0); MEAT.legGeo = lg; MEAT.legMat = new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: 0.42, metalness: 0 });
}
function spawnMeat(kind, at, v, s) {
  if (!MEAT.steakGeo) buildMeat(); const steak = kind === "steak", m = new THREE.Mesh(steak ? MEAT.steakGeo : MEAT.legGeo, steak ? MEAT.steakMats : MEAT.legMat);
  m.castShadow = m.receiveShadow = true; m.userData.dyn = true; m.position.copy(at); m.scale.setScalar(0.001); m.rotation.set(rnd(-1, 1), Math.random() * TAU, rnd(-1, 1)); R.scene.add(m);
  MEAT.list.push({ m, steak, v: v.clone(), w: V3(rnd(-7, 7), rnd(-4, 4), rnd(-7, 7)), t: 0, rest: false, s, half: (steak ? 0.041 : 0.036) * s, steamT: 0, bounced: 0 });
}
function updateMeat(dt) {
  for (const M of MEAT.list) { const m = M.m; M.t += dt;
    const pop = M.t < 0.14 ? 1.2 * Ease.out(M.t / 0.14) : 1.2 - 0.2 * smoothstep(0.14, 0.26, M.t); m.scale.setScalar(M.s * pop); // (it pops out of the flash)
    if (!M.rest) { M.v.y -= 9.81 * dt; m.position.addScaledVector(M.v, dt); _mtq.setFromEuler(_mte.set(M.w.x * dt, M.w.y * dt, M.w.z * dt)); m.quaternion.multiply(_mtq);
      const fl = (typeof goreFloor === "function" ? goreFloor(m.position.x, m.position.z, m.position.y + 0.1) : surfaceAt(m.position.x, m.position.z, m.position.y + 0.1)) + M.half;
      if (m.position.y <= fl) { m.position.y = fl;
        if (M.v.y < -1.6 && M.bounced < 2) { M.bounced++; M.v.y = -M.v.y * 0.3; M.v.x *= 0.5; M.v.z *= 0.5; M.w.multiplyScalar(0.45); Sound.slap(m.position, M.steak ? 1 : 0.5); }
        else { M.rest = true; const yaw = Math.random() * TAU; if (M.steak) m.rotation.set(0, yaw, 0); else m.rotation.set(Math.PI / 2 - 0.12, yaw, 0, "YXZ"); Sound.sizzle(m.position, M.steak ? 0.7 : 0.4); } } }
    if (M.t < 5) { M.steamT -= dt; if (M.steamT <= 0) { M.steamT = 0.3; puff(m.position.clone().add(_mt1.set(rnd(-0.1, 0.1) * M.s, 0.05, rnd(-0.1, 0.1) * M.s)), 2, 0.1, (M.steak ? 0.18 : 0.08), 1.5, 0.22, 0xf2f2f2); } } }
  for (const z of MEAT.zaps) { if (z.t >= 1) continue; z.t = Math.min(1, z.t + dt / 0.28); z.s.scale.setScalar(z.size * (0.4 + 2.2 * Ease.out(z.t))); z.s.material.opacity = 1 - z.t * z.t; if (z.t >= 1) z.s.visible = false; }
  if (MEAT.blue) updatePoints(MEAT.blue, dt, true, 0.8);
}
// the shootout's begun: the horse comes through soon
function horseHurry() { const H = LIFE.horse; if (H && !H.run && !H.dead && !H.meat) H.wait = Math.min(H.wait, 4 + Math.random() * 4); }
// a new round: the meat's cleared away, and the town horse is up and gone again (it'll come through later)
function resetMeat() {
  for (const M of MEAT.list) R.scene.remove(M.m); MEAT.list = []; resetHerd();
  for (const z of MEAT.zaps) { z.t = 1; z.s.visible = false; } if (MEAT.blue) { MEAT.blue.life.fill(0); MEAT.blue.pts.visible = false; }
  const H = LIFE.horse; if (H && (H.dead || H.meat)) { H.dead = H.meat = null; H.run = null; H.grp.visible = false; H.grp.scale.setScalar(1); H.grp.rotation.set(0, 0, 0); horseTackShow(H, false); H.act.timeScale = 1; H.wait = 25 + Math.random() * 20; }
}
