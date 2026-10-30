// ---------- THE LASER (v36): the ARC-09 MK III ----------
// A futuristic pistol, modelled in another chat from a photo of a zip-tie gun (assets/models/ARC09.glb, packed small for the game by
// tools/pack_arc09.py). It lies on its side on the left-hand crate of the middle cover in the town shootout, down by your left hip, where
// you'd have to look down and to the side to see it. While the revolver has rounds it's dark and won't come up. When the last bullet's
// gone it wakes: its charge lights come up and it hums there on the crate, and the gunmen give you a little longer before they finish
// you. Tap it (from the crates; from the other cover a tap runs you over to it) and you take it up. Hold Fire and it throws a blue beam
// with a hum: a man the beam touches goes down in a moment, a crow or a horse comes out as meat (12l); it scorches what it touches.
// It holds 20 s of firing. When that's spent it takes 7 s to charge itself again. It goes back on the crate for the next shootout.
const LASER_CFG = { charge: 20, recharge: 7, kill: 0.08, envGap: 0.28, scorchGap: 0.05, hold: 0.8 };
const LASER = { ready: false, geo: null, mat: null, e0: 3, crate: null, vm: null, state: "crate", lift: null, charge: LASER_CFG.charge, rechargeT: 0, hold: false, firing: false,
  envT: 0, bellT: 0, scorchT: 0, smokeT: 0, beam: null, glowA: null, glowB: null, sparks: null, scorch: null, muz: new THREE.Vector3(), end: new THREE.Vector3(), hudKey: "", awake: false, t: 0, lastSecs: -1 };
const LASER_MUZZLE = new THREE.Vector3(0, 0, 0.246); // (the emitter's mouth, in the gun's own frame once it's turned barrel-forward)
const _l1 = new THREE.Vector3(), _l2 = new THREE.Vector3(), _l3 = new THREE.Vector3(), _l4 = new THREE.Vector3(), _lq = new THREE.Quaternion();

// ---- the model: one mesh, barrel along +z, the grip under the origin ----
function prepLaser(gltf) {
  const parts = []; let mat = null; gltf.scene.updateMatrixWorld(true);
  gltf.scene.traverse(o => { if (!o.isMesh) return; mat = mat || o.material; const src = o.geometry, g = new THREE.BufferGeometry();
    for (const nm of ["position", "normal", "uv"]) { const a = src.attributes[nm], n = a.count, it = a.itemSize, arr = new Float32Array(n * it); // (out of the packed integers into floats)
      for (let i = 0; i < n; i++) { arr[i * it] = a.getX(i); arr[i * it + 1] = a.getY(i); if (it > 2) arr[i * it + 2] = a.getZ(i); } g.setAttribute(nm, new THREE.BufferAttribute(arr, it)); }
    g.setIndex(new THREE.BufferAttribute(new Uint32Array(src.index.array), 1)); g.applyMatrix4(o.matrixWorld); parts.push({ geo: g }); });
  const geo = mergeGeos(parts); geo.clearGroups(); geo.setAttribute("uv2", geo.attributes.uv); geo.translate(-0.05, 0, 0); geo.rotateY(-Math.PI / 2); geo.computeBoundingSphere();
  mat.side = THREE.DoubleSide; LASER.e0 = mat.emissiveIntensity || 3; mat.emissiveIntensity = LASER.e0 * 0.12; LASER.geo = geo; LASER.mat = mat;
  // on the crate: on its side, the barrel toward the street and off to your left
  const crate = LASER.crate = new THREE.Mesh(geo, mat); crate.castShadow = true; crate.receiveShadow = true; crate.userData.dyn = true; crate.visible = false; R.scene.add(crate);
  { const C = SIEGE.covers[1], [cx, cz] = COVERS[1].at, dir = C.side.clone().multiplyScalar(-0.75).addScaledVector(C.away, -0.55).normalize();
    crate.position.set(cx, 0.8 + 0.027, cz).addScaledVector(C.side, -0.5).addScaledVector(C.away, 0.18); crate.rotation.set(0, Math.atan2(dir.x, dir.z), Math.PI / 2, "YXZ"); crate.updateMatrixWorld(true); }
  // in your hand
  const vm = LASER.vm = new THREE.Group(), vmMesh = new THREE.Mesh(geo, mat); vmMesh.frustumCulled = false; vm.add(vmMesh); vm.visible = false; R.scene.add(vm);
  // the beam, the glow at each end of it, blue sparks and scorch marks
  LASER.beam = laserBeamMesh(); const glow = laserGlowTex();
  for (const k of ["glowA", "glowB"]) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, color: 0x9ad8ff, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: false }));
    s.visible = false; s.renderOrder = 8; R.scene.add(s); LASER[k] = s; }
  LASER.glowA.material.depthTest = false;
  LASER.sparks = pointPool(220, 0.045, 0x8fd6ff, true); LASER.scorch = decalPool(140, scorchTex(), false, 0.16); LASER.scorch.im.visible = false; // (drawn only once there is a mark)
  LASER.ready = true; resetLaser();
}
function laserGlowTex() { const c = document.createElement("canvas"); c.width = c.height = 64; const g = c.getContext("2d"), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.2, "rgba(200,235,255,0.9)"); gr.addColorStop(0.5, "rgba(80,160,255,0.35)"); gr.addColorStop(1, "rgba(30,80,255,0)"); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return canvasTex(c); }
function scorchTex() { // a burn: black soot, browner at its ragged edge
  const c = document.createElement("canvas"); c.width = c.height = 64; const g = c.getContext("2d"), r = rng(77);
  for (let i = 0; i < 14; i++) { const a = r() * TAU, d = r() * 9, gr = g.createRadialGradient(32 + Math.cos(a) * d, 32 + Math.sin(a) * d, 0, 32 + Math.cos(a) * d, 32 + Math.sin(a) * d, 14 + r() * 10);
    gr.addColorStop(0, "rgba(10,8,6,0.55)"); gr.addColorStop(0.6, "rgba(40,24,12,0.25)"); gr.addColorStop(1, "rgba(60,40,20,0)"); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); }
  return canvasTex(c);
}
// a ribbon from the muzzle to where it strikes, turned to face the camera: a white-hot core in a blue glow, with light running down it
function laserBeamMesh() {
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(12), 3)); g.setAttribute("uv", new THREE.BufferAttribute(new Float32Array([0, 0, 0, 1, 1, 0, 1, 1]), 2)); g.setIndex([0, 2, 1, 1, 2, 3]);
  const m = new THREE.ShaderMaterial({ uniforms: { t: { value: 0 }, len: { value: 10 }, k: { value: 1 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    vertexShader: "varying vec2 vU; void main() { vU = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
    fragmentShader: `varying vec2 vU; uniform float t, len, k;
      void main() { float x = abs(vU.y - 0.5) * 2.0, core = exp(-x * x * 30.0), glow = exp(-x * x * 3.5);
        float run = 0.7 + 0.3 * sin(vU.x * len * 5.0 - t * 38.0) * sin(vU.x * len * 1.3 + t * 11.0);
        vec3 c = vec3(0.8, 0.95, 1.0) * core * 1.7 + vec3(0.12, 0.45, 1.0) * glow * 0.95 * run;
        gl_FragColor = vec4(c * k * smoothstep(0.0, 0.015, vU.x), 1.0); }` });
  const mesh = new THREE.Mesh(g, m); mesh.frustumCulled = false; mesh.renderOrder = 7; mesh.visible = false; R.scene.add(mesh); return mesh;
}
function setBeam(a, b, k) {
  const B = LASER.beam, P = B.geometry.attributes.position, cam = R.camera.position, d = _l1.subVectors(b, a), len = d.length(); d.divideScalar(Math.max(len, 1e-4));
  const s0 = _l2.crossVectors(d, _l3.subVectors(a, cam)).normalize().multiplyScalar(0.007), s1 = _l4.crossVectors(d, _l3.subVectors(b, cam)).normalize().multiplyScalar(0.025 + len * 0.0022);
  P.setXYZ(0, a.x - s0.x, a.y - s0.y, a.z - s0.z); P.setXYZ(1, a.x + s0.x, a.y + s0.y, a.z + s0.z); P.setXYZ(2, b.x - s1.x, b.y - s1.y, b.z - s1.z); P.setXYZ(3, b.x + s1.x, b.y + s1.y, b.z + s1.z);
  P.needsUpdate = true; B.material.uniforms.len.value = len; B.material.uniforms.k.value = k; B.material.uniforms.t.value = LASER.t; B.visible = true;
}

// ---- states ----
const laserHeld = () => LASER.ready && (LASER.state === "held" || LASER.state === "lift");
const revolverSpent = () => { const S = SIEGE; return S.bullets <= 0 && S.reloads <= 0 && S.reloadT <= 0; };
const laserAvail = () => LASER.ready && LASER.state === "crate" && SIEGE.on && revolverSpent();
function resetLaser() {
  const L = LASER; if (!L.ready) return; L.state = "crate"; L.lift = null; L.charge = LASER_CFG.charge; L.rechargeT = 0; L.hold = L.firing = false; L.awake = false; L.hudKey = "";
  L.vm.visible = false; L.crate.visible = false; L.beam.visible = false; gunHud.key = null; const rb = $("reloads"); if (rb) rb.style.display = ""; L.glowA.visible = L.glowB.visible = false; L.mat.emissiveIntensity = L.e0 * 0.12;
  Sound.laser(false); Sound.laserWake(null, false); Sound.laserCharge(false);
  L.scorch.used = L.scorch.next = 0; L.scorch.im.count = 0; L.scorch.im.visible = false; L.sparks.life.fill(0); L.sparks.pts.visible = false;
}
// the revolver's empty: it wakes on the crate, lights up and hums, so you might hear where it is
function laserWake() { const L = LASER; if (!L.ready || L.state !== "crate" || L.awake) return; L.awake = true; Sound.laserWake(L.crate.position, true); }
// a tap on the stage: was it on the gun lying on the crate? (a generous ring round where it is on screen)
function laserTap(e) {
  const L = LASER, S = SIEGE; if (!L.ready || L.state !== "crate" || !L.crate.visible || S.phase === "won" || S.phase === "dead" || S.phase === "cut") return false;
  const r = $("scene").getBoundingClientRect(), p = _l1.copy(L.crate.position).project(R.camera); if (p.z > 1 || Math.abs(p.x) > 1.05 || Math.abs(p.y) > 1.05) return false;
  const sx = r.left + (p.x * 0.5 + 0.5) * r.width, sy = r.top + (-p.y * 0.5 + 0.5) * r.height, rad = Math.max(46, 0.13 / Math.max(0.3, L.crate.position.distanceTo(R.camera.position)) * r.height);
  if (Math.hypot(e.clientX - sx, e.clientY - sy) > rad) return false;
  if (!revolverSpent()) { const t = $("siegeTip"); t.textContent = "Not while there's a round left in the revolver"; t.hidden = false; S.tip = Math.max(S.tip, 2); return true; }
  if (S.run) return true;
  if (S.cover !== 1) { const C = S.covers[1]; S.run = { from: CAM.pos.clone(), to: C.stand.clone(), t: 0, dur: Math.max(0.5, CAM.pos.distanceTo(C.stand) / SIEGE_CFG.runSpeed), to_i: 1, pick: true }; S.crouch = true; return true; }
  laserTake(); return true;
}
// taking it up: it rises off the crate into your hand, lights up, and the fight's back on
function laserTake() {
  const L = LASER, S = SIEGE; if (L.state !== "crate") return; L.state = "lift"; L.lift = { t: 0, p: L.crate.position.clone(), q: L.crate.quaternion.clone() }; L.crate.visible = false; L.hudKey = "";
  Sound.laserWake(null, false); Sound.laserPick(); S.vm.gun.visible = false;
  if (S.phase === "doomed") { S.phase = "fight"; $("doomMsg").hidden = true; S.nextShot = 1.6; S.doomFirst = S.doomGap = null;
    for (const E of S.enemies) if (E.alive && E.state === "pause" && E.t > 50) E.t = rnd(0.3, 1.2); }
  const t = $("siegeTip"); t.textContent = "Hold Fire for the beam · 20 s, then it charges itself"; t.hidden = false; S.tip = 3.2; siegeHud();
}
function laserTrigger(on) { const L = LASER, S = SIEGE; L.hold = on; if (on && laserHeld() && (S.crouch || S.run || S.cv > 0.5)) nudgeAim(); }

// ---- per frame ----
function updateLaser(rdt, dt) {
  const L = LASER, S = SIEGE; if (!L.ready) return; L.t += rdt;
  const live = S.on && (S.phase === "fight" || S.phase === "doomed" || S.phase === "cleared");
  L.crate.visible = S.on && L.state === "crate" && S.phase !== "chase" && S.covers[1].grp.visible;
  if (L.state === "crate") { if (L.awake) L.mat.emissiveIntensity = L.e0 * (0.55 + 0.35 * Math.sin(L.t * 5.2)); return; } // (awake on the crate: its lights pulse)
  if (L.rechargeT > 0) { L.rechargeT -= dt; L.charge = LASER_CFG.charge * clamp(1 - L.rechargeT / LASER_CFG.recharge, 0, 1);
    if (L.rechargeT <= 0) { L.rechargeT = 0; L.charge = LASER_CFG.charge; Sound.laserCharge(false); Sound.laserReady(); } }
  const up = !S.crouch && !S.run && S.cv < 0.5, on = live && L.state === "held" && L.hold && up && L.rechargeT <= 0 && L.charge > 0 && $("menu").hidden && STATE.ts > 0;
  if (on !== L.firing) { L.firing = on; Sound.laser(on); if (on) S.shots++; }
  L.mat.emissiveIntensity = L.e0 * (L.rechargeT > 0 ? 0.15 + 0.25 * (0.5 + 0.5 * Math.sin(L.t * 9)) : 0.35 + 0.65 * L.charge / LASER_CFG.charge) * (L.firing ? 1.2 + 0.2 * Math.sin(L.t * 47) : 1);
  L.dtNow = dt; if (L.firing) { L.charge = Math.max(0, L.charge - dt); // (the beam itself is drawn and does its work after the camera has moved: laserLate)
    if (L.charge <= 0) { L.firing = false; L.rechargeT = LASER_CFG.recharge; Sound.laser(false); Sound.laserEmpty(); Sound.laserCharge(true);
      const t = $("siegeTip"); t.textContent = "Charge spent · recharging (7 s)"; t.hidden = false; S.tip = 2.4; } }
  updatePoints(L.sparks, dt, true, 0.8);
  laserHud();
}
// the beam this frame: what it touches first, and what that does
function laserBeam(dt) {
  const L = LASER, S = SIEGE; R.camera.updateMatrixWorld(); const ro = R.camera.position.clone(), rd = V3(0, 0, -1).applyQuaternion(R.camera.quaternion).normalize();
  let man = null; for (const E of S.enemies) { if (!E.alive) continue; const far = E.a.ch.bones.Spine2.getWorldPosition(_l1).distanceTo(ro), h = rayActor(E.a, ro, rd, E.female, clamp((far - 12) * 0.007, 0, 0.12)); if (h && (!man || h.t < man.t)) man = Object.assign(h, { E }); }
  const env = sceneryRay(ro, rd, 80), bt = bellRay(ro, rd), cr = crowRay(ro, rd), tg = targetRay(ro, rd), hr = townHorseRay(ro, rd), cands = [];
  if (bt > 0) cands.push([bt, "bell"]); if (man) cands.push([man.t, "man"]); if (cr) cands.push([cr.t, "crow"]); if (tg) cands.push([tg.t, "tgt"]); if (hr) cands.push([hr.t, "horse"]); if (env) cands.push([env.distance, "env"]);
  cands.sort((a, b) => a[0] - b[0]); const first = cands[0], at = first ? ro.clone().addScaledVector(rd, first[0]) : ro.clone().addScaledVector(rd, 80);
  L.bellT -= dt; L.envT -= dt; L.scorchT -= dt; L.smokeT -= dt;
  for (const E of S.enemies) if (E.alive && (!man || man.E !== E)) E.laserT = 0;
  if (first) { const k = first[1];
    if (k === "man") { const E = man.E; E.laserT = (E.laserT || 0) + dt; if (E.laserT >= LASER_CFG.kill) { shotHits(E, man.part, at, rd); Sound.sizzle(at, 0.8); if (!S.enemies.some(q => q.alive) && (S.phase === "fight" || S.phase === "doomed")) siegeWin(); } }
    else if (k === "crow") crowLaser(cr.c, at, rd);
    else if (k === "horse") horseLaser(hr.H, at, rd);
    else if (k === "tgt") { const T = tg.T; if (tg.weed || (T.laserT || 0) <= L.t) { if (T) T.laserT = L.t + 0.3; targetShot(tg, at, rd); } }
    else if (k === "bell") { if (L.bellT <= 0) { L.bellT = 0.7; bellShot(at, rd); } }
    else { const n = env.face ? _l2.copy(env.face.normal).transformDirection(env.object.matrixWorld) : _l2.set(0, 1, 0); if (n.dot(rd) > 0) n.negate();
      if (L.scorchT <= 0 && !(env.object.material === WORLD.winMat)) { L.scorchT = LASER_CFG.scorchGap; decal(L.scorch, at, n, rnd(0.7, 1.2)); L.scorch.im.visible = true; }
      if (L.envT <= 0) { L.envT = LASER_CFG.envGap; envShot(env, rd, true); } } }
  // sparks and smoke where it strikes; the beam itself and its glow
  for (let i = 0; i < 3; i++) emit(L.sparks, at, _l3.copy(rd).multiplyScalar(-rnd(0.6, 2.2)).add(_l4.set(rnd(-1.4, 1.4), rnd(-0.3, 1.8), rnd(-1.4, 1.4))), rnd(0.12, 0.35));
  if (L.smokeT <= 0 && first) { L.smokeT = 0.12; puff(at.clone().addScaledVector(rd, -0.05), 3, 0.25, 0.14, 1.2, 0.35, 0x8a8682); }
  L.muz.copy(LASER_MUZZLE).applyMatrix4(L.vm.matrixWorld); L.end.copy(at); const fl = 0.85 + 0.15 * Math.sin(L.t * 61);
  setBeam(L.muz, L.end, fl); L.glowA.position.copy(L.muz); L.glowA.scale.setScalar(0.07 * fl); L.glowA.visible = true;
  L.glowB.position.copy(at).addScaledVector(rd, -0.04); L.glowB.scale.setScalar((0.32 + 0.12 * Math.sin(L.t * 37)) * Math.max(1, ro.distanceTo(at) * 0.04)); L.glowB.visible = true;
  CAM.shake = Math.max(CAM.shake, reduceMotion() ? 0 : 0.05);
}
// after the camera's moved (after siegeLate): the gun in your hand, and the blue light the beam throws
function laserLate(rdt) {
  const L = LASER, S = SIEGE; if (!L.ready) return;
  const show = laserHeld() && S.on && (S.phase === "fight" || S.phase === "doomed" || S.phase === "cleared") && !S.run;
  if (!laserHeld() || !S.on || S.phase === "chase") { L.vm.visible = false; L.beam.visible = false; L.glowA.visible = L.glowB.visible = false; return; }
  S.vm.gun.visible = false; if (!show) { L.vm.visible = false; L.beam.visible = false; L.glowA.visible = L.glowB.visible = false; return; }
  const cam = R.camera, th = Math.tan(THREE.MathUtils.degToRad(cam.fov) / 2), hw = d => d * th * cam.aspect, hh = d => d * th, toW = (x, y, z) => _l1.set(x, y, z).applyMatrix4(cam.matrixWorld);
  const down = Ease.inOut(clamp(S.cv, 0, 1)) * 0.22, j = L.firing ? 0.004 : 0, vm = L.vm;
  vm.position.copy(toW(Math.min(0.19, hw(0.62) * 0.44) + rnd(-j, j), -hh(0.62) * 0.55 - down + rnd(-j, j), -0.6)); vm.lookAt(toW(0, 0, -25)); vm.rotateY(-0.26); vm.rotateZ(-0.1); vm.scale.setScalar(LASER_CFG.hold); // (turned out a little, so you see its side)
  vm.visible = S.cv < 0.85;
  if (L.state === "lift") { const T = L.lift; T.t = Math.min(1, T.t + rdt / 0.4); const e = Ease.inOut(T.t); // (off the crate and up into your hand)
    _lq.copy(T.q).slerp(vm.quaternion, e); vm.position.lerpVectors(T.p, _l2.copy(vm.position), e); vm.quaternion.copy(_lq); vm.scale.setScalar(lerp(1, LASER_CFG.hold, e)); vm.visible = true;
    if (T.t >= 1) { L.state = "held"; L.lift = null; } }
  vm.updateMatrixWorld(true);
  if (L.firing) laserBeam(L.dtNow || rdt); else { L.beam.visible = false; L.glowA.visible = L.glowB.visible = false; }
  if (L.firing && KEY_LIGHT) { KEY_LIGHT.color.setRGB(0.35, 0.6, 1); KEY_LIGHT.distance = 7; KEY_LIGHT.intensity = 3.2 + Math.sin(L.t * 53) * 0.6; KEY_LIGHT.position.copy(L.muz); }
}
// the charge, where the revolver's cylinder was: a ring of blue running down as you fire; amber filling back up while it recharges
function laserHud() {
  const L = LASER, S = SIEGE; if (!laserHeld()) return; const k = L.charge / LASER_CFG.charge, rech = L.rechargeT > 0, key = `${Math.round(k * 48)}|${rech}`;
  if (L.hudKey !== key) { L.hudKey = key; const col = rech ? "#d8a246" : "#5ec8ff", a = k * TAU, x = Math.sin(a) * 36, y = -Math.cos(a) * 36;
    const arc = k >= 0.999 ? `<circle r="36" fill="none" stroke="${col}" stroke-width="8"/>` : k > 0.004 ? `<path d="M0 -36 A36 36 0 ${k > 0.5 ? 1 : 0} 1 ${x.toFixed(1)} ${y.toFixed(1)}" fill="none" stroke="${col}" stroke-width="8" stroke-linecap="round"/>` : "";
    $("cyl").innerHTML = `<circle r="46" fill="#1b222c" stroke="#0b0e14" stroke-width="3"/><circle r="36" fill="none" stroke="#2c3747" stroke-width="8"/>${arc}<path d="M5 -25 L-13 4 L-1 4 L-5 25 L13 -6 L1 -6 Z" fill="${rech ? "#d8a246" : "#cfefff"}"/>`;
    const rb = $("reloads"); if (rb) rb.style.display = "none"; $("gun").classList.remove("reloading");
    $("gun").title = rech ? "Laser recharging" : `Laser: ${Math.ceil(L.charge)} s of charge`; $("gun").setAttribute("aria-label", $("gun").title); }
  const secs = rech ? -1 : Math.ceil(L.charge - 1e-6); if (secs !== L.lastSecs) { L.lastSecs = secs; siegeHud(); }
}
function laserMeta(n2) { const L = LASER, narrow = narrowHud(); return L.rechargeT > 0 ? (narrow ? "Charging" : "Recharging…") : (narrow ? `${Math.ceil(L.charge)} s · ${n2} left` : `${Math.ceil(L.charge)} s of charge · ${n2} gunm${n2 === 1 ? "a" : "e"}n left`); }
