// ---------- THE REVOLVER IN YOUR HAND, BEFORE ANY SHOOTOUT (v39) ----------
// The revolver on the barrel (12p) can be taken up from the start of a round, not only once it's won: tap it while the host isn't busy
// and you're standing at the barrel with it in your hand, the letters giving way to the Aim | Fire pad and a Put it back button. Look
// round (a drag on the picture or on Aim) and shoot what you like: the crows, a horse, the bell, the town's barrels, crates and lanterns.
// Every shot makes the crowd jump, but nothing more. Shoot one of the townsfolk or the executioner, though, and the whole town draws on
// you: the shootout, from right there, with what's left in the gun. No hangman to finish and no rope to cut; the condemned man slips away
// in the uproar. The host and the condemned man aren't targets: a shot at them whips past. Put it back and the round goes on where it was.
const ARMED = { on: false, t: 0, lift: null, back: null, yaw: 0, pitch: 0, eye: new THREE.Vector3(), from: null, bullets: SIEGE_ROUNDS, reloads: GUN.reloads, reloadT: 0, cool: 0, shots: 0,
  round: -1, tip: 0, tipNext: null, startleT: 0, sign: false, hint: false };
const ARMED_TIP = "Drag to look · Fire to shoot", ARMED_TIP2 = "Shoot one of them and the whole town draws on you";
const _ar1 = new THREE.Vector3(), _ar2 = new THREE.Vector3(), _ar3 = new THREE.Vector3(), _arq = new THREE.Quaternion();

// where you stand: just behind the barrel, the crowd and the gallows beyond it
function armedEye(out) { const G = GUNPROP, d = _ar1.copy(SIEGE_FOCUS).sub(G.at).setY(0).normalize(); out.copy(G.at).addScaledVector(d, -0.8); out.y = groundVis(out.x, out.z) + 1.56; return out; }
const angTo = (a, b, k) => a + (((b - a + Math.PI) % TAU + TAU) % TAU - Math.PI) * k;

// ---- taking it up and putting it back ----
function armedStart() {
  const A = ARMED, G = GUNPROP, S = SIEGE; if (A.on || S.on || CHASE.on || !G.gun) return;
  if (A.round !== STATE.roundId) { A.round = STATE.roundId; A.bullets = SIEGE_ROUNDS; A.reloads = GUN.reloads; A.reloadT = 0; A.shots = 0; } // (a full gun each round; within one, what's fired stays fired)
  A.on = true; A.t = 0; A.cool = 0; A.back = null; LOOK.drag = null; LOOK.yaw = LOOK.pitch = 0; LOOK.ease = false;
  if (FREE.on) { const el = FREE.which; freeReset(); if (el) el.hidden = false; } // (a sign put away: it comes back with the gun put back)
  A.sign = !$("sign").hidden; A.hint = !$("hintBox").hidden; $("sign").hidden = true; $("skip").hidden = true; showHintBox(false); STATE.locked = true; // (no guessing with a gun in your hand)
  R.camera.updateMatrixWorld(); const f = _ar1.set(0, 0, -1).applyQuaternion(R.camera.quaternion);
  A.from = { pos: CAM.pos.clone(), tgt: CAM.tgt.clone(), fov: CAM.fov, name: CAM.name, follow: CAM.follow, cpos: R.camera.position.clone(), yaw: Math.atan2(f.x, f.z), pitch: Math.asin(clamp(f.y, -1, 1)) };
  armedEye(A.eye); const to = _ar2.copy(SIEGE_FOCUS).sub(A.eye); A.yaw = Math.atan2(to.x, to.z); A.pitch = Math.atan2(to.y, Math.hypot(to.x, to.z)) * 0.5;
  A.lift = { t: 0, dur: 0.7, p: G.gun.getWorldPosition(V3()), q: G.gun.getWorldQuaternion(new THREE.Quaternion()) };
  G.gun.visible = false; S.vm.kick = 0; S.recoil = 0; Sound.clip("cock0", A.lift.p, 1.0, 0, 0.1); // (in your hand: the hammer back)
  S.occ = null; showArmedUI(true); armedHud();
}
function armedPutBack() {
  const A = ARMED; if (!A.on || A.back || A.lift) return; const F = A.from, S0 = shotSet()[F.name];
  const home = S0 && !F.follow ? { pos: V3(...S0[0]), tgt: V3(...S0[1]), fov: S0[2] } : { pos: F.pos.clone(), tgt: F.tgt.clone(), fov: F.fov }, d = _ar1.copy(home.tgt).sub(home.pos);
  A.back = { t: 0, dur: 0.65, home, yaw: Math.atan2(d.x, d.z), pitch: Math.atan2(d.y, Math.hypot(d.x, d.z)), cpos: R.camera.position.clone(), yaw0: A.yaw, pitch0: A.pitch, fov0: CAM.fov };
  $("pad").hidden = true; $("armBack").hidden = true; $("xhair").hidden = true; $("siegeTip").hidden = true; SIEGE.aimId = null; peek(false); Sound.clip("cock0", null, 0.6, 0, 0.05, 0.85);
}
function armedDone() { // back on the barrel: the round goes on
  const A = ARMED, B = A.back, F = A.from; A.on = false; A.back = A.lift = null; GUNPROP.gun.visible = true; SIEGE.vm.gun.visible = false;
  CAM.pos.copy(B.home.pos); CAM.tgt.copy(B.home.tgt); CAM.fov = B.home.fov; CAM.name = F.name; CAM.to = null; CAM.follow = F.follow || null; CAM.t = 1;
  showArmedUI(false); STATE.locked = false; STATE.ts = 1; if (A.sign) $("sign").hidden = false; if (A.hint) showHintBox(true);
}
// a new round, or the game restarted from the menu with it in your hand
function armedReset() { const A = ARMED; A.round = -1; if (!A.on) return; A.on = false; A.lift = A.back = null; SIEGE.vm.gun.visible = false; $("xhair").hidden = true; showArmedUI(false); }

// ---- the screen ----
function buildArmedUI() {
  const b = document.createElement("button"); b.id = "armBack"; b.type = "button"; b.hidden = true; b.textContent = "Put it back"; b.setAttribute("aria-label", "Put the revolver back on the barrel");
  b.addEventListener("click", e => { e.stopPropagation(); armedPutBack(); }); $("stage").appendChild(b);
}
function showArmedUI(on) {
  $("pad").hidden = !on; $("kb").classList.toggle("siege", on); $("left").hidden = on; $("hud").classList.toggle("siege", on); $("hintBtn").style.display = on ? "none" : "";
  $("reloads").hidden = !on; $("hp").hidden = true; $("armBack").hidden = !on; $("padAim").classList.remove("on", "nudge"); $("padFire").classList.remove("on"); $("xhair").hidden = !on;
  const t = $("siegeTip"); if (on) { t.textContent = ARMED_TIP; t.hidden = false; ARMED.tip = 3.5; ARMED.tipNext = ARMED_TIP2; } else t.hidden = true;
  if (!on) { gunHud.key = null; $("gun").title = "Guesses left"; $("gun").removeAttribute("aria-label"); hud(); }
}
function armedHud() { const A = ARMED; gunHud(A.bullets, A.reloads, A.reloadT > 0 ? 1 - A.reloadT / GUN.reload : -1, GUN.hearts, GUN.reloads, SIEGE_ROUNDS);
  $("meta").textContent = A.reloadT > 0 ? (narrowHud() ? "" : "Reloading…") : narrowHud() ? "Revolver" : "The revolver from the barrel"; }

// ---- looking and shooting ----
function armedTurn(dx, dy) { const A = ARMED; if (!A.on || A.back) return; const k = SIEGE_CFG.sens * (CAM.fov / 52) * (1 + Math.min(2.5, Math.hypot(dx, dy) / 14));
  A.yaw -= dx * k; A.pitch = clamp(A.pitch - dy * k, -1.35, 1.35); }
const armedFemale = a => { const i = LIFE.crowd.indexOf(a), c = CROWD_SPECS[i]; return !!(c && c.spec.body && c.spec.body.skirt); };
function armedFire() {
  const A = ARMED, S = SIEGE; if (!A.on || A.lift || A.back || !$("menu").hidden || A.reloadT > 0) return;
  if (A.bullets <= 0) { if (A.cool <= 0) { Sound.clip("dry0", null, 0.9, 0, 0.05); A.cool = 0.3; } return; } // (click: empty)
  if (A.cool > 0) return;
  A.bullets--; A.shots++; A.cool = SIEGE_CFG.fireCool; S.recoil = 1; S.vm.kick = 1; Sound.clip(siegePick("shot", 3), null, 1.15, 0, 0.32, rnd(0.97, 1.03)); CAM.shake = Math.max(CAM.shake, 0.35);
  R.camera.updateMatrixWorld(); const ro = R.camera.position.clone(), rd = V3(0, 0, -1).applyQuaternion(R.camera.quaternion).normalize();
  muzzleFlash(S.vm.gun.localToWorld(V3(0, 0.035, 0.22)), 0.32);
  // the townsfolk and the executioner can be shot; the host and the condemned man can't (the bullet whips past them)
  let hit = null, near = null;
  for (const a of [...LIFE.crowd.filter(q => q.root.visible), EXEC]) { const far = a.ch.bones.Spine2.getWorldPosition(_ar1).distanceTo(ro), h = rayActor(a, ro, rd, armedFemale(a), clamp((far - 12) * 0.007, 0, 0.12)); if (h && (!hit || h.t < hit.t)) hit = Object.assign(h, { a }); }
  for (const a of [HOST, MAN]) { if (!a.root.visible) continue; const h = rayActor(a, ro, rd, false, 0.06); if (h && (!near || h.t < near.t)) near = Object.assign(h, { a }); }
  const env = sceneryRay(ro, rd, 80), cr = crowRay(ro, rd), hr = townHorseRay(ro, rd), bt = bellRay(ro, rd), cands = [];
  if (hit) cands.push([hit.t, "man"]); if (cr) cands.push([cr.t, "crow"]); if (hr) cands.push([hr.t, "horse"]); if (bt > 0) cands.push([bt, "bell"]); if (env) cands.push([env.distance, "env"]);
  cands.sort((a, b) => a[0] - b[0]); const first = cands[0], at = first ? ro.clone().addScaledVector(rd, first[0]) : null;
  if (near && (!first || near.t < first[0])) Sound.clip(siegePick("whiz", 3), near.a.ch.bones.Head.getWorldPosition(V3()), 1.0, 0, 0.2, rnd(0.95, 1.05), 4); // (close past him)
  crowsStartle(ro, 30, 0.45); if (at) crowsStartle(at, 5, 1.2);
  if (first && first[1] === "man") { armedShootout(hit.a, hit.part, at, rd); return; } // that's done it
  if (first) { const k = first[1]; if (k === "crow") crowShot(cr.c, at, rd); else if (k === "horse") horseShot(hr.H, at, rd); else if (k === "bell") bellShot(at, rd); else envShot(env, rd); }
  armedStartle();
  if (A.bullets <= 0 && A.reloads > 0) { A.reloads--; A.reloadT = GUN.reload; Sound.cap(null); setTimeout(() => Sound.cap(null), 240); } // (the spare goes in by itself, as in the shootout)
  armedHud();
}
// a gunshot in the square: they all jump and look round
function armedStartle() { const A = ARMED; if (A.startleT > T - 1.2) return; A.startleT = T;
  LIFE.crowd.forEach((a, i) => { if (a.root.visible) setTimeout(() => { if (!SIEGE.on) a.gesture("shake"); }, 80 + i * 60); }); HOST.gesture("shake"); setPanic(0.6); }

// ---- one of them shot: the shootout, from here ----
function armedShootout(victim, part, at, rd) {
  const A = ARMED, S = SIEGE; if (S.on) return;
  A.on = false; A.lift = A.back = null; $("armBack").hidden = true;
  STATE.over = true; STATE.locked = true; STATE.ts = 1; SLOW.t = 99; stopBodyPlay(); swordShine(0, false); // (the round's thrown in: no hangman to finish)
  S.on = true; S.phase = "fight"; S.fromRevolver = !!STATE.lastWon; S.sword.glint.visible = false; S.t = 0; S.used = {}; for (const C of S.covers) C.grp.visible = true; S.props.visible = true;
  resetTargets(); showTargets(true); crowsGather(); resetLaser(); horseHurry(); // (what you shot to pieces from the barrel stays shot: no breakReset)
  S.bullets = A.bullets; S.reloads = A.reloads; S.reloadT = A.reloadT; S.health = GUN.hearts; gunHud.key = null; S.hurt = 0; S.deadT = 0; S.cool = A.cool; S.keyAim = false; S.scanT = 0; S.upT = 0;
  S.shots = A.shots; S.downT = 0; S.aims = 0; S.said.clear(); S.tauntT = 0; S.talkUntil = 0; S.wordsAt = S.lastAt = 0; S.doomT = S.doomI = 0; S.doomSaid = false; S.hitT = 0;
  $("doomMsg").hidden = $("hitMsg").hidden = true; $("skip").hidden = true; showHintBox(false); $("sign").hidden = true;
  // the condemned man slips away in the uproar (out of the noose, if it was on him)
  if (GAL.rope.onNeck) { GAL.rope.onNeck = false; ropeMode(null); } MAN.root.visible = false; if (MAN.tie) MAN.tie.visible = false; MAN.place(MAN_PATH[0][0], MAN_PATH[0][1], Math.PI); MAN.lookPt = null; MAN.panic = 0;
  if (EXEC.gripping) { EXEC.gripping = false; EXEC.setIK("R", null, 0); EXEC.setGrip("R", 0); }
  say(null, REVOLVER_LINE); armEnemies(victim); // (the host: "Shoot that stranger!", and he ducks out of sight)
  const E = S.enemies.find(q => q.a === victim); if (E) shotHits(E, part, at, rd);
  // and you run from the barrel for the nearest cover, a moment after the shot, turning to the street as you go
  const from = R.camera.position.clone(); let bi = 0, bd = 1e9; S.covers.forEach((C, i) => { const d = C.stand.distanceTo(from); if (d < bd) { bd = d; bi = i; } });
  const C = S.covers[bi]; S.cover = bi; S.cv = 0.4; S.crouch = true; S.yaw = C.yaw0; S.pitch = 0.04;
  S.run = { from, to: C.stand.clone(), t: 0, wait: 0.45, dur: Math.max(0.8, bd / SIEGE_CFG.runSpeed), to_i: bi, turn: { y: A.yaw, p: A.pitch } };
  CAM.to = null; CAM.follow = null; S.nextShot = SIEGE_CFG.grace + 1.0; showSiegeUI("fight"); siegeHud();
}

// ---- each frame ----
// before the camera's moved (12a updateCamera): where you're looking from, and the gun's state
function updateArmed(rdt, dt) {
  const A = ARMED, S = SIEGE; if (!A.on) return; A.t += rdt; A.cool = Math.max(0, A.cool - rdt); S.recoil = Math.max(0, S.recoil - rdt * 4.5); S.vm.kick = Math.max(0, S.vm.kick - rdt * 6);
  if (A.reloadT > 0) { A.reloadT -= rdt; if (A.reloadT <= 0) { A.reloadT = 0; A.bullets = SIEGE_ROUNDS; Sound.clip(siegePick("cock", 2), null, 0.75, 0, 0.05); } armedHud(); }
  if (A.tip > 0 && (A.tip -= rdt) <= 0) { const t = $("siegeTip"); if (A.tipNext) { t.textContent = A.tipNext; A.tipNext = null; A.tip = 4; } else t.hidden = true; }
  if (!S.on) updateBlood(dt); // (a crow or a horse shot from the barrel bleeds, before any shootout)
  let pos, yaw, pitch, fov;
  if (A.back) { const B = A.back; B.t = Math.min(1, B.t + rdt / B.dur); const e = Ease.inOut(B.t);
    pos = _ar2.lerpVectors(B.cpos, B.home.pos, e); yaw = angTo(B.yaw0, B.yaw, e); pitch = lerp(B.pitch0, B.pitch, e); fov = lerp(B.fov0, B.home.fov, e); }
  else { const e = A.lift ? Ease.inOut(Math.min(1, A.t / A.lift.dur)) : 1, F = A.from;
    pos = _ar2.lerpVectors(F.cpos, A.eye, e); pos.y += Math.sin(A.t * 1.3) * 0.004 * e; yaw = angTo(F.yaw, A.yaw, e); pitch = lerp(F.pitch, A.pitch, e) + S.recoil * 0.05; fov = lerp(F.fov, 54, e); }
  CAM.pos.copy(pos); CAM.tgt.copy(pos).add(_ar3.set(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch))); CAM.fov = fov; CAM.to = null; CAM.follow = null; CAM.name = "armed";
}
// after the camera's moved: the revolver in your hand (lifted off the barrel, and put back on it), the flash's light
function armedLate(rdt) {
  const A = ARMED, S = SIEGE; if (!A.on) return; const vm = S.vm.gun, cam = R.camera; cam.updateMatrixWorld();
  const th = Math.tan(THREE.MathUtils.degToRad(cam.fov) / 2), hw = d => d * th * cam.aspect, hh = d => d * th, toW = (x, y, z) => _ar1.set(x, y, z).applyMatrix4(cam.matrixWorld);
  const k = S.vm.kick, rl = A.reloadT > 0 ? Math.sin(clamp(1 - A.reloadT / GUN.reload, 0, 1) * Math.PI) : 0;
  vm.scale.setScalar(0.8); vm.position.copy(toW(Math.min(0.2, hw(0.62) * 0.46), -hh(0.62) * 0.56 - rl * 0.12 + k * 0.02, -0.62 + k * 0.04)); vm.lookAt(toW(0, 0, -25)); vm.rotateX(-k * 0.5 + rl * 0.9);
  if (A.lift || A.back) { let p, q, u; // (between the barrel's lid and your hand)
    if (A.lift) { p = A.lift.p; q = A.lift.q; u = Math.min(1, A.t / A.lift.dur); }
    else { if (!A.back.p) { A.back.p = GUNPROP.gun.getWorldPosition(V3()); A.back.q = GUNPROP.gun.getWorldQuaternion(new THREE.Quaternion()); } p = A.back.p; q = A.back.q; u = 1 - A.back.t; }
    const e = Ease.inOut(u); vm.position.lerpVectors(p, _ar2.copy(vm.position), e); vm.quaternion.slerpQuaternions(q, _arq.copy(vm.quaternion), e); vm.scale.setScalar(lerp(1, 0.8, e));
    if (A.lift && u >= 1) A.lift = null;
    if (A.back && A.back.t >= 1) { armedDone(); return; } }
  vm.visible = true; $("xhair").hidden = !!(A.lift || A.back);
  if (KEY_LIGHT) { S.flash = Math.max(0, S.flash - rdt / 0.07); if (S.flash > 0) { KEY_LIGHT.intensity = S.flash * 9; KEY_LIGHT.distance = 9; KEY_LIGHT.color.setRGB(1, 0.72, 0.42); KEY_LIGHT.position.copy(S.flashPos); } else { KEY_LIGHT.distance = 3.5; KEY_LIGHT.color.set(0xffd9b8); } }
}
