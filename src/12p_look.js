// ---------- LOOKING ROUND, AND THE REVOLVER ON THE BARREL (v37) ----------
// In the hangman part a drag on the picture turns your head: all the way round, up and down, from wherever the shot has put you. Each
// new shot the game cuts to (a guess, the drop) turns you back to what's happening. In the shootout a drag on the picture turns you too,
// down behind cover or up (12d siegeTurn); a tap without a drag is still a tap (cover, the laser).
// Off to the side, out of the usual view, a revolver lies on the lid of a barrel, catching the light: a glint that swells and fades,
// sparks winking along the steel. v37: once the round was won, a tap on it started the shootout. v39: it's there for the taking from the
// start of a round, whenever the host isn't busy: tap it and it's in your hand (12q); shoot one of the townsfolk with it and they turn on
// you ("Shoot that stranger!"), the shootout from right there, with no hangman to finish and no rope to cut.
const LOOK = { yaw: 0, pitch: 0, drag: null, ease: false };
const GUNPROP = { grp: null, gun: null, glint: null, sparks: [], mat: null, t: 0, on: false, at: new THREE.Vector3(6.4, 0, -2.6) };
const REVOLVER_LINE = "Shoot that stranger!"; VOICE_LINES[REVOLVER_LINE] = ["siege3", 1.45]; // (the host's own words, cut from the end of his "He cut him down! Shoot that stranger!")
const _lk1 = new THREE.Vector3(), _lk2 = new THREE.Vector3();

// ---- the view ----
// after the director has aimed the camera (12a updateCamera): turn it by how far you've dragged
function lookApply(rdt) {
  if (SIEGE.on || CHASE.on || ARMED.on) { LOOK.yaw = LOOK.pitch = 0; LOOK.ease = false; return; }
  if (LOOK.ease) { const k = Math.exp(-rdt * 6); LOOK.yaw *= k; LOOK.pitch *= k; if (Math.abs(LOOK.yaw) + Math.abs(LOOK.pitch) < 0.002) { LOOK.yaw = LOOK.pitch = 0; LOOK.ease = false; } }
  if (!LOOK.yaw && !LOOK.pitch) return;
  const f = _lk1.set(0, 0, -1).applyQuaternion(R.camera.quaternion), yaw = Math.atan2(f.x, f.z) + LOOK.yaw, pitch = clamp(Math.asin(clamp(f.y, -1, 1)) + LOOK.pitch, -1.4, 1.4);
  R.camera.lookAt(_lk2.copy(R.camera.position).add(_lk1.set(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch))));
}
// the director cut to a new shot: back to it
function lookHome() { if (LOOK.yaw || LOOK.pitch) { LOOK.ease = true; LOOK.yaw = ((LOOK.yaw + Math.PI) % TAU + TAU) % TAU - Math.PI; } } // (the short way round)
// a finger (or the mouse) down on the picture: a drag looks round, a tap is a tap (decided when it lifts)
function lookDown(e, mode) { LOOK.drag = { id: e.pointerId, x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY, moved: false, mode }; }
function lookMove(e) {
  const D = LOOK.drag; if (!D || e.pointerId !== D.id) return false;
  if (!D.moved && Math.hypot(e.clientX - D.x0, e.clientY - D.y0) < 9) return true; D.moved = true;
  const dx = e.clientX - D.x, dy = e.clientY - D.y; D.x = e.clientX; D.y = e.clientY;
  if (D.mode === "siege") { if (SIEGE.on && !SIEGE.run && (SIEGE.phase === "fight" || SIEGE.phase === "doomed" || SIEGE.phase === "cleared")) siegeTurn(dx, dy); }
  else if (D.mode === "armed") armedTurn(dx, dy); // (the revolver from the barrel in your hand: 12q)
  else if (D.mode === "free") freeTurn(dx, dy); // (behind a sign put away: v40)
  else { const k = 0.0042 * (CAM.fov / 52) * (1 + Math.min(2.5, Math.hypot(dx, dy) / 14)); LOOK.ease = false; LOOK.yaw -= dx * k; LOOK.pitch = clamp(LOOK.pitch - dy * k, -1.35, 1.35); }
  if (e.cancelable) e.preventDefault(); return true;
}
function lookUp(e) {
  const D = LOOK.drag; if (!D || e.pointerId !== D.id) return false; LOOK.drag = null; if (D.moved || e.type === "pointercancel") return true;
  if (D.mode === "siege") { if (SIEGE.on) siegeTap(e); } // (a tap in the shootout: the laser, or cover to run to)
  else if (D.mode === "armed") { /* (a tap with the revolver in hand: nothing; Fire shoots) */ }
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
// there for the taking whenever the host isn't busy (v39: from the start of a round; v37: only once it was won), not once he's hanged
const gunPropLive = () => !!GUNPROP.gun && GUNPROP.gun.visible && STATE.played && !STATE.locked && !STATE.trap && (!STATE.over || STATE.lastWon) && !SIEGE.on && !CHASE.on && !ARMED.on && $("menu").hidden;
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
  if (e.cancelable) e.preventDefault(); armedStart(); return true; // (in your hand: 12q)
}

// ---- v40: the end signs put away, and looking round behind them ----
// Each end sign (GAME OVER, YOU SAVED HIM, YOU SURVIVED, and the getaway's results) has a button to hide it. Hidden, a drag anywhere turns
// the view, all the way round and up and down, from wherever the game had it (a touch on a hanging body still handles the body, and the
// revolver on the barrel can still be taken up); Show the sign brings it back and turns you back. The menu has a red X to close it.
const FREE = { on: false, which: null, yaw: 0, pitch: 0, ease: false, hintT: 0 };
function buildFreeLook() {
  const b = document.createElement("button"); b.id = "signShow"; b.type = "button"; b.hidden = true;
  b.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" style="vertical-align:-3px;margin-right:6px"><path d="M6 15l6-6 6 6" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>Show the sign';
  b.addEventListener("click", e => { e.stopPropagation(); signRestore(); }); $("stage").appendChild(b);
  const h = document.createElement("div"); h.id = "lookHint"; h.hidden = true; h.textContent = "Drag to look round"; $("stage").appendChild(h);
  for (const m of document.querySelectorAll(".signMin")) m.addEventListener("click", e => { e.stopPropagation(); signMinimize(m.closest(".overlay")); });
  $("menuClose").addEventListener("click", () => { $("menu").hidden = true; Sound.resume(); });
}
function signMinimize(el) {
  if (!el || el.hidden) return; FREE.on = true; FREE.which = el; FREE.yaw = FREE.pitch = 0; FREE.ease = false; LOOK.drag = null; el.hidden = true;
  const f = $("chaseFade"); if (el.id === "chaseRes" && f && !f.hidden) { FREE.fade = f.style.opacity; f.style.opacity = 0; } // (the getaway's results darken the view behind them: not while you look)
  $("signShow").hidden = false; const h = $("lookHint"); h.hidden = false; h.style.opacity = 1; FREE.hintT = 3;
}
function signRestore() {
  if (!FREE.on) return; const el = FREE.which; FREE.on = false; FREE.which = null; FREE.ease = true; FREE.yaw = ((FREE.yaw + Math.PI) % TAU + TAU) % TAU - Math.PI; /* (the short way back, not unwinding every turn) */ LOOK.drag = null; $("signShow").hidden = true; $("lookHint").hidden = true;
  if (el && el.id === "chaseRes" && FREE.fade != null) { $("chaseFade").style.opacity = FREE.fade; } FREE.fade = null;
  if (el) { el.hidden = false; const b = el.querySelector(".sign-actions button"); if (b) b.focus({ preventScroll: true }); }
}
// a sign coming up (or a new round, a new ride): straight back to the game's view
function freeReset() { FREE.on = false; FREE.which = null; FREE.yaw = FREE.pitch = 0; FREE.ease = false; if ($("signShow")) { $("signShow").hidden = true; $("lookHint").hidden = true; } }
function freeTurn(dx, dy) { const k = 0.0042 * (R.camera.fov / 52) * (1 + Math.min(2.5, Math.hypot(dx, dy) / 14)); FREE.ease = false; FREE.yaw -= dx * k; FREE.pitch = clamp(FREE.pitch - dy * k, -1.45, 1.45); }
// last, after everything that places the camera (12c tick): turn it by as far as you've dragged
function freeApply(rdt) {
  if (FREE.hintT > 0 && (FREE.hintT -= rdt) <= 0.6) { const h = $("lookHint"); h.style.opacity = Math.max(0, FREE.hintT / 0.6).toFixed(2); if (FREE.hintT <= 0) h.hidden = true; }
  if (FREE.ease) { const k = Math.exp(-rdt * 6); FREE.yaw *= k; FREE.pitch *= k; if (Math.abs(FREE.yaw) + Math.abs(FREE.pitch) < 0.002) { FREE.yaw = FREE.pitch = 0; FREE.ease = false; } }
  if (!FREE.yaw && !FREE.pitch) return; const c = R.camera, f = _lk1.set(0, 0, -1).applyQuaternion(c.quaternion);
  const yaw = Math.atan2(f.x, f.z) + FREE.yaw, pitch = clamp(Math.asin(clamp(f.y, -1, 1)) + FREE.pitch, -1.5, 1.5);
  c.up.set(0, 1, 0); c.lookAt(_lk2.copy(c.position).add(_lk1.set(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch)))); c.updateMatrixWorld();
}
// the screen fades in from black (back from the getaway to the town: no flight across the desert to get there)
function fadeIn(sec = 0.7) { const f = $("chaseFade"); if (!f) return; f.hidden = false; f.style.transition = "none"; f.style.opacity = 1; void f.offsetWidth;
  f.style.transition = `opacity ${sec}s ease-out`; f.style.opacity = 0; clearTimeout(fadeIn.t); fadeIn.t = setTimeout(() => { f.hidden = true; f.style.transition = ""; }, sec * 1000 + 80); }
