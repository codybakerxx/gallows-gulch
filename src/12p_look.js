// ---------- LOOKING ROUND, AND THE REVOLVER ON THE BARREL (v37) ----------
// In the hangman part a drag on the picture turns your head: all the way round, up and down, from wherever the shot has put you. Each
// new shot the game cuts to (a guess, the drop) turns you back to what's happening. In the shootout a drag on the picture turns you too,
// down behind cover or up (12d siegeTurn); a tap without a drag is still a tap (cover, the laser).
// Off to the side, out of the usual view, a revolver lies on the lid of a barrel. Win the round and it catches the light: a glint that
// swells and fades, sparks winking along the steel. Tap it and you take it up, and the townsfolk turn on you ("Shoot that stranger!"):
// the shootout, as if you'd cut him down, but you're the stranger, and you run for the nearest cover.
const LOOK = { yaw: 0, pitch: 0, drag: null, ease: false };
const GUNPROP = { grp: null, gun: null, glint: null, sparks: [], mat: null, t: 0, on: false, at: new THREE.Vector3(6.4, 0, -2.6) };
const REVOLVER_LINE = "Shoot that stranger!"; VOICE_LINES[REVOLVER_LINE] = ["siege3", 1.45]; // (the host's own words, cut from the end of his "He cut him down! Shoot that stranger!")
const _lk1 = new THREE.Vector3(), _lk2 = new THREE.Vector3();

// ---- the view ----
// after the director has aimed the camera (12a updateCamera): turn it by how far you've dragged
function lookApply(rdt) {
  if (SIEGE.on || CHASE.on) { LOOK.yaw = LOOK.pitch = 0; LOOK.ease = false; return; }
  if (LOOK.ease) { const k = Math.exp(-rdt * 6); LOOK.yaw *= k; LOOK.pitch *= k; if (Math.abs(LOOK.yaw) + Math.abs(LOOK.pitch) < 0.002) { LOOK.yaw = LOOK.pitch = 0; LOOK.ease = false; } }
  if (!LOOK.yaw && !LOOK.pitch) return;
  const f = _lk1.set(0, 0, -1).applyQuaternion(R.camera.quaternion), yaw = Math.atan2(f.x, f.z) + LOOK.yaw, pitch = clamp(Math.asin(clamp(f.y, -1, 1)) + LOOK.pitch, -1.4, 1.4);
  R.camera.lookAt(_lk2.copy(R.camera.position).add(_lk1.set(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch))));
}
// the director cut to a new shot: back to it
function lookHome() { if (LOOK.yaw || LOOK.pitch) LOOK.ease = true; }
// a finger (or the mouse) down on the picture: a drag looks round, a tap is a tap (decided when it lifts)
function lookDown(e, mode) { LOOK.drag = { id: e.pointerId, x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY, moved: false, mode }; }
function lookMove(e) {
  const D = LOOK.drag; if (!D || e.pointerId !== D.id) return false;
  if (!D.moved && Math.hypot(e.clientX - D.x0, e.clientY - D.y0) < 9) return true; D.moved = true;
  const dx = e.clientX - D.x, dy = e.clientY - D.y; D.x = e.clientX; D.y = e.clientY;
  if (D.mode === "siege") { if (SIEGE.on && !SIEGE.run && (SIEGE.phase === "fight" || SIEGE.phase === "doomed" || SIEGE.phase === "cleared")) siegeTurn(dx, dy); }
  else { const k = 0.0042 * (CAM.fov / 52) * (1 + Math.min(2.5, Math.hypot(dx, dy) / 14)); LOOK.ease = false; LOOK.yaw -= dx * k; LOOK.pitch = clamp(LOOK.pitch - dy * k, -1.35, 1.35); }
  if (e.cancelable) e.preventDefault(); return true;
}
function lookUp(e) {
  const D = LOOK.drag; if (!D || e.pointerId !== D.id) return false; LOOK.drag = null; if (D.moved || e.type === "pointercancel") return true;
  if (D.mode === "siege") { if (SIEGE.on) siegeTap(e); } // (a tap in the shootout: the laser, or cover to run to)
  else if (STATE.locked) STATE.ts = 6; // (a tap while the host is busy hurries him along)
  return true;
}

// ---- the revolver on the barrel ----
function buildGunProp() {
  const G = GUNPROP, grp = G.grp = new THREE.Group(), { x, z } = G.at, y0 = groundVis(x, z); grp.position.set(x, y0, z); R.scene.add(grp);
  const b = barrelMesh(1.02); b.rotation.y = 0.7; grp.add(b); b.traverse(o => { if (o.isMesh) { o.castShadow = o.receiveShadow = true; } });
  // its steel: the game's iron with a band of light that sweeps along it while it's there for the taking
  const shine = G.shine = { k: { value: 0 }, pos: { value: -1 } }, m = G.mat = MAT.iron.clone();
  m.onBeforeCompile = q => { q.uniforms.gShineK = shine.k; q.uniforms.gShinePos = shine.pos;
    q.vertexShader = q.vertexShader.replace("#include <common>", "#include <common>\nvarying vec3 vGp;").replace("#include <begin_vertex>", "#include <begin_vertex>\nvGp = (modelMatrix * vec4(position, 1.0)).xyz;");
    q.fragmentShader = q.fragmentShader.replace("#include <common>", "#include <common>\nvarying vec3 vGp; uniform float gShineK, gShinePos;")
      .replace("#include <emissivemap_fragment>", "#include <emissivemap_fragment>\n{ float b = exp(-pow((dot(vGp, vec3(0.7071, 0.0, 0.7071)) - gShinePos) / 0.035, 2.0)); totalEmissiveRadiance += vec3(1.0, 0.92, 0.75) * (b * 3.0 + 0.12) * gShineK; }"); };
  m.customProgramCacheKey = () => "gunPropShine";
  const gun = G.gun = revolver(true); gun.traverse(o => { if (o.isMesh && o.material === MAT.iron) o.material = m; if (o.isMesh) { o.castShadow = true; o.userData.dyn = true; } });
  gun.position.set(0.02, 0.86 * 1.02 + 0.026, -0.03); gun.rotation.set(0, -0.9, Math.PI / 2); grp.add(gun); // (on its side on the lid)
  const glint = G.glint = new THREE.Sprite(new THREE.SpriteMaterial({ fog: false, map: starTex(), color: new THREE.Color(1.35, 1.28, 1.1), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0 }));
  glint.renderOrder = 5; glint.visible = false; R.scene.add(glint);
  G.sparks = Array.from({ length: 5 }, () => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ fog: false, map: glint.material.map, color: new THREE.Color(1.4, 1.35, 1.2), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0 }));
    s.visible = false; s.renderOrder = 5; R.scene.add(s); return { s, t: 1, life: 0.4, wait: Math.random(), p: new THREE.Vector3() }; });
}
// there for the taking once you've won the round and the sign is up, until the next round
const gunPropLive = () => !!GUNPROP.gun && GUNPROP.gun.visible && STATE.over && STATE.lastWon && !STATE.locked && !SIEGE.on && !CHASE.on;
function updateGunProp(rdt) {
  const G = GUNPROP; if (!G.gun) return; const on = G.on = gunPropLive(); G.shine.k.value += ((on ? 1 : 0) - G.shine.k.value) * Math.min(1, rdt * 3);
  if (!on && G.shine.k.value < 0.01) { G.glint.visible = false; for (const p of G.sparks) { p.t = 1; p.s.visible = false; } return; }
  G.t += rdt; const k = G.shine.k.value, c = G.gun.localToWorld(_lk1.set(0, 0.02, 0.04)), pulse = 0.5 + 0.5 * Math.sin(G.t * 4.2);
  G.shine.pos.value = c.x * 0.7071 + c.z * 0.7071 - 0.16 + ((G.t * 0.9) % 1.6) * 0.32; // (the band runs along the barrel)
  G.glint.visible = true; G.glint.position.copy(c).add(_lk2.set(0, 0.05, 0)); G.glint.material.opacity = k * (0.45 + 0.55 * pulse); G.glint.scale.setScalar(0.3 + 0.35 * pulse); G.glint.material.rotation = G.t * 0.7;
  for (const p of G.sparks) { // (little stars winking along the steel)
    if (p.t < 1) { p.t = Math.min(1, p.t + rdt / p.life); const s = Math.sin(p.t * Math.PI); p.s.material.opacity = s * k; p.s.scale.setScalar(0.03 + 0.12 * s); p.s.material.rotation += rdt * 3; if (p.t >= 1) { p.s.visible = false; p.wait = rnd(0.2, 1.1); } }
    else if ((p.wait -= rdt) <= 0 && on) { p.t = 0; p.life = rnd(0.3, 0.5); p.s.position.copy(G.gun.localToWorld(_lk2.set(rnd(-0.015, 0.015), rnd(0.0, 0.05), rnd(-0.08, 0.2)))); p.s.visible = true; } }
}
// a tap: on the revolver? (a generous ring round where it is on the screen)
function revolverTap(e) {
  const G = GUNPROP; if (!gunPropLive()) return false; const c = G.gun.localToWorld(_lk1.set(0, 0.02, 0.04)), p = c.clone().project(R.camera); if (p.z > 1 || Math.abs(p.x) > 1.05 || Math.abs(p.y) > 1.05) return false;
  const r = $("scene").getBoundingClientRect(), sx = r.left + (p.x * 0.5 + 0.5) * r.width, sy = r.top + (-p.y * 0.5 + 0.5) * r.height, rad = Math.max(48, 0.2 / Math.max(0.3, c.distanceTo(R.camera.position)) * r.height);
  if (Math.hypot(e.clientX - sx, e.clientY - sy) > rad) return false;
  if (e.cancelable) e.preventDefault(); startSiegeFromRevolver(); return true;
}
// you take it up: the townsfolk draw, and you run for the nearest cover
async function startSiegeFromRevolver() {
  const S = SIEGE, G = GUNPROP; if (S.on) return; LOOK.ease = true; bellReset(); swordShine(0, false);
  S.on = true; S.phase = "cut"; S.fromRevolver = true; S.sword.glint.visible = false; S.t = 0; S.used = {}; showSiegeUI("cut"); for (const C of S.covers) C.grp.visible = true; S.props.visible = true;
  resetTargets(); showTargets(true); crowsGather(); resetLaser(); resetMeat(); horseHurry(); breakReset(true);
  S.bullets = SIEGE_ROUNDS; S.reloads = GUN.reloads; S.reloadT = 0; S.health = GUN.hearts; gunHud.key = null; S.hurt = 0; S.deadT = 0; S.cool = 0; S.recoil = 0; S.holding = S.keyAim = false; S.aimId = null; S.scanT = 0; S.upT = 0; S.vm.kick = 0;
  S.shots = 0; S.downT = 0; S.aims = 0; S.said.clear(); S.tauntT = 0; S.talkUntil = 0; S.wordsAt = S.lastAt = 0; S.doomT = S.doomI = 0; S.doomSaid = false; S.hitT = 0;
  $("doomMsg").hidden = $("hitMsg").hidden = true; stopBodyPlay(); STATE.locked = true; STATE.ts = 1; SLOW.t = 99; $("skip").hidden = true; showHintBox(false); $("sign").hidden = true;
  const at = G.gun.getWorldPosition(V3()), C0 = R.camera.position.clone(), side = at.clone().sub(C0).setY(0).normalize();
  camTo(at.clone().addScaledVector(side, -0.9).add(V3(0, 0.75, 0)), at.clone(), 48, 0.5); await wait(0.5);
  G.gun.visible = false; Sound.clip("cock0", at, 1.0, 0, 0.1); // (in your hand: the hammer back)
  say(null, REVOLVER_LINE); armEnemies(); MAN.root.visible = false; if (MAN.tie) MAN.tie.visible = false; // (the man you saved slips away)
  await wait(0.7); if (!S.on) return;
  const from = at.clone().setY(1.4); let bi = 0, bd = 1e9; S.covers.forEach((C, i) => { const d = C.stand.distanceTo(from); if (d < bd) { bd = d; bi = i; } });
  const C = S.covers[bi]; S.cover = bi; S.cv = 0.4; S.crouch = true; S.yaw = C.yaw0; S.pitch = 0.04;
  S.run = { from, to: C.stand.clone(), t: 0, dur: Math.max(0.8, bd / SIEGE_CFG.runSpeed), to_i: bi };
  CAM.to = null; CAM.follow = null; S.phase = "fight"; S.nextShot = SIEGE_CFG.grace + 1.0; showSiegeUI("fight"); siegeHud();
}
