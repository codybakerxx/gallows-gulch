// ---------- GAME FLOW, UI, BOOT ----------
const $ = id => document.getElementById(id);
const STORE = "gallows-gulch-3d-v1";
function loadPrefs() { try { return JSON.parse(localStorage.getItem(STORE)) || {}; } catch (e) { return {}; } }
function savePrefs() { try { localStorage.setItem(STORE, JSON.stringify({ v: 2, len: STATE.len, diff: STATE.diff, best: STATE.best, vol: +$("vol").value, muted: Sound.muted, gfx: $("gfx").value, motion: !!STATE.reduceMotion, cliff: !!STATE.cliffSeen, ride: STATE.bestRide | 0, rides: STATE.rides | 0 })); } catch (e) {} }
const crowdCenter = () => V3(-3.0, 1.6, -5.0);
async function lose() {
  STATE.over = true; STATE.locked = true; showHintBox(false); hud(); STATE.duskT = 1;
  shot("drop", 1.1); Sound.stinger(); MAN.lookPt = V3(MAN.pos.x, 9, MAN.pos.z - 2); MAN.tremble = 1.4; MAN.panic = 1;
  await wait(1.25);
  const tip = () => GAL.leverTip.getWorldPosition(V3());
  await tween(0.24, p => { GAL.leverPivot.rotation.z = lerp(-0.35, 0.6, Ease.in(p)); EXEC.ik.R.t.copy(tip()); }); Sound.clank(tip());
  STATE.trap = true; releaseRopeCoil(); puff(V3(LAY.trap.x, 0.3, LAY.trap.z), 50, 1.2); // the leaves slam into their stops a moment later (07b)
  { const np = noosePose(MAN), B = MAN.ch.bones; B.Neck.getWorldPosition(A1); B.Head.getWorldPosition(A2); A3.lerpVectors(A1, A2, 0.6);
    MAN.startDrop(GAL.anchor, GAL.rope.sim.L + np.top.distanceTo(A3)); } // the ragdoll's rope runs anchor → knot → noose
  MAN.hang.onCatch = snapMoment;
  await wait(1.6); if (SIEGE.on) return; // he was cut down: the shootout takes over (12d)
  STATE.word.split("").forEach((c, i) => { if (STATE.prog[i] < 1) STATE.lostReveal[i] = true; });
  await tween(0.8, p => { STATE.prog.forEach((v, i) => { if (STATE.lostReveal[i]) STATE.prog[i] = p; }); boardDraw(); }); if (SIEGE.on) return;
  if (SIEGE.phase === "window") { while (SIEGE.phase === "window") await wait(0.03); } else await wait(2.8); if (SIEGE.on) return; // the sign comes up as the sword's four seconds run out
  STATE.streakLost = STATE.streak; STATE.streak = 0; savePrefs(); hud(); Sound.somber(); showSign(false);
}
// the end of the fall, the moment the rope stops him: the neck snaps (the only sound: nothing plays after it), the picture jolts and flashes and
// time stalls for a breath before the crowd silently recoils (the body's own jolt, head whip and leg spasms are in the ragdoll: 09b snapNeck)
function snapMoment() {
  const neck = MAN.ch.bones.Neck.getWorldPosition(V3()), G = R.grade.uniforms;
  Sound.neckSnap(neck, GAL.anchor);
  SLOW.t = 0; CAM.shake = 2.0; CAM.kv = -1.7;
  CAM.flash = 0.38; // fades in real time (12a updateCamera), so the slow motion doesn't hold it on screen
  tween(1.6, p => G.vignette.value = 1 + 0.9 * Math.sin(Math.min(1, p * 4) * Math.PI / 2) * (1 - p)).then(() => G.vignette.value = 1);
  LIFE.crowd.forEach((a, i) => setTimeout(() => a.gesture("shake"), 700 + i * 140)); HOST.gesture("shake");
  wait(1.4).then(() => { if (MAN.hang && !SIEGE.on) startBodyPlay(); });
  swordWindow(); // four seconds to grab the sword before the GAME OVER sign, and it can still be grabbed after (12d)
}
async function win() {
  STATE.over = true; STATE.lastWon = true; STATE.locked = true; showHintBox(false); hud(); STATE.duskT = Math.max(0, STATE.duskT - 0.35);
  Sound.victory(); Sound.applause(crowdCenter()); say("win"); shot("gallows", 1.1); HOST.gesture("agree");
  LIFE.crowd.forEach((a, i) => setTimeout(() => a.gesture("agree"), i * 180));
  if (EXEC.gripping) { EXEC.gripping = false; EXEC.setIK("R", null, 0); EXEC.setGrip("R", 0); }
  MAN.tremble = 0; MAN.setSad(0); MAN.sweating = false; tween(1.2, p => MAN.ch.skin.userData.U.sweat.value *= 1 - p);
  tween(1.5, p => { MAN.panic = Math.max(0, (MAN.panic || 0) * (1 - p)); }).then(() => { MAN.panic = 0; MAN.lookPt = null; });
  if (GAL.rope.onNeck) await execNooseOff();
  shot("win", 1.6); await manTo(0); MAN.faceTo(CAM.pos.x, CAM.pos.z); MAN.gesture("agree");
  await hostTipHat();
  STATE.streak++; STATE.best = Math.max(STATE.best, STATE.streak); savePrefs(); hud(); $("bestOut").textContent = STATE.best;
  await wait(0.3); showSign(true);
}
// a reprieve: the executioner takes the noose back off the same way it went on, opens it, lifts it clear over the head and lets it swing
async function execNooseOff() {
  const B = MAN.ch.bones, f = () => V3(Math.sin(MAN.yaw), 0, Math.cos(MAN.yaw)), lf = () => V3(Math.cos(MAN.yaw), 0, -Math.sin(MAN.yaw));
  const spot = MAN.pos.clone().addScaledVector(f(), -0.38).addScaledVector(lf(), 0.2); follow("noose", nooseShot, 1.0);
  await EXEC.walkTo([[spot.x, spot.z]], 1.0); EXEC.face(MAN.yaw);
  const knotMid = () => { const P = noosePose(MAN); return P.attach.clone().lerp(P.top, 0.5); }, far = () => { const P = noosePose(MAN); return P.c.clone().sub(P.attach).normalize().multiplyScalar(P.R).add(P.c); };
  EXEC.ik.L.fast = EXEC.ik.R.fast = true; EXEC.lookPt = knotMid();
  await tween(0.55, p => { execHand("L", knotMid()); execHand("R", far()); });
  EXEC.setGrip("L", 1); EXEC.setGrip("R", 1); await wait(0.12);
  GAL.rope.onNeck = false; ropeMode("two"); Sound.ropeCreak(knotMid(), 0.6);
  const top = () => B.HeadTop_End.getWorldPosition(V3()), c0 = noosePose(MAN).c.clone(), gL0 = gripPt(EXEC, "L", V3()), gR0 = gripPt(EXEC, "R", V3());
  await tween(0.4, p => { const e = Ease.inOut(p), c = c0.clone(), w = lerp(0.1, 0.15, e); execHand("L", gL0.clone().lerp(c.clone().addScaledVector(lf(), w), e)); execHand("R", gR0.clone().lerp(c.clone().addScaledVector(lf(), -w), e)); });
  const g1L = gripPt(EXEC, "L", V3()), g1R = gripPt(EXEC, "R", V3()); EXEC.lookPt = top();
  await tween(0.7, p => { const e = Ease.inOut(p), o = top().add(V3(0, 0.14, 0)).addScaledVector(f(), -0.02); execHand("L", g1L.clone().lerp(o.clone().addScaledVector(lf(), 0.15), e)); execHand("R", g1R.clone().lerp(o.clone().addScaledVector(lf(), -0.15), e)); });
  ropeMode(null); EXEC.setGrip("L", 0); EXEC.setGrip("R", 0); EXEC.setIK("L", null, 0); EXEC.setIK("R", null, 0); EXEC.ik.L.fast = EXEC.ik.R.fast = false;
  Sound.breath(B.Head.getWorldPosition(V3()), 0.5);
  EXEC.walkTo([[LAY.exec.x, LAY.exec.z]], 1.0).then(() => EXEC.face(Math.PI / 2)); await wait(0.4);
}
async function hostTipHat() {
  if (!HOST.ch.hat) return; const hat = HOST.ch.hat, brim = () => HOST.ch.head.localToWorld(V3(0, 2.9, 3.4));
  HOST.faceTo(MAN.pos.x, MAN.pos.z); await wait(0.4); HOST.setIK("R", brim(), 1);
  await tween(0.35, p => { HOST.ik.R.t.copy(brim()); }); await tween(0.5, p => { hat.rotation.x = -0.15 - Math.sin(p * Math.PI) * 0.35; hat.position.y = 2.86 + Math.sin(p * Math.PI) * 0.4; HOST.ik.R.t.copy(brim()); });
  HOST.setIK("R", null, 0);
}
function showSign(won) {
  STATE.locked = false; STATE.ts = 1; $("skip").hidden = true;
  const t = $("signTitle"); t.textContent = won ? "YOU SAVED HIM" : "GAME OVER"; t.className = won ? "" : "lose"; signAgain(won);
  $("signWord").textContent = STATE.word; signMeaning(STATE.word, won); let line = null; if (!won) { line = pickQuip("lose"); const v = VOICE_LINES[line]; if (v) Sound.speak(v[0], null, 0.35); }
  $("signLine").textContent = won ? `Streak: ${STATE.streak} · Best: ${STATE.best}` : line || "";
  $("sign").hidden = false; $("againBtn").focus({ preventScroll: true });
}
async function guess(L) {
  if (STATE.over || STATE.locked || STATE.guessed.has(L) || !$("menu").hidden) return;
  Sound.resume(); Sound.click(); STATE.guessed.add(L); const key = $("key-" + L); key.disabled = true;
  const idx = [...STATE.word].map((c, i) => c === L ? i : -1).filter(i => i >= 0);
  key.classList.add(idx.length ? "hit" : "miss"); STATE.locked = true; $("skip").hidden = false; hud();
  shot("board", 0.9);
  if (idx.length) {
    for (const i of idx) await hostWrite(slotBoardPos(i), p => STATE.prog[i] = Math.max(STATE.prog[i], p));
    if (STATE.prog.every(p => p >= 1)) { hostReturn(); return win(); }
    say("hit"); HOST.gesture("agree"); await hostReturn(); shot("wide", 1.2); await wait(0.5);
  } else {
    await miss(L); if (STATE.over) return; shot("wide", 1.3); await wait(0.6);
  }
  STATE.locked = false; STATE.ts = 1; $("skip").hidden = true; hud();
}
async function miss(ch) {
  const wi = STATE.wrong.length; STATE.wrong.push({ ch, prog: 0 }); Sound.hammer();
  await hostWrite(wrongBoardPos(wi), q => STATE.wrong[wi].prog = q);
  say("miss"); HOST.gesture("shake");
  STATE.misses++; STATE.duskT = STATE.misses / STATE.maxWrong * 0.85; hud();
  const stage = DIFF[STATE.diff].seq[STATE.misses - 1];
  hostReturn().then(() => { HOST.lookPt = V3(LAY.trap.x, 3.6, LAY.trap.z); });
  await goToStage(stage);
  if (!STATE.over && STATE.misses === STATE.maxWrong - 1 && DIFF[STATE.diff].hint === "last" && !STATE.hintShown) await revealHint();
}
// last chance: a clue describing the word (never the word itself) is pinned up under the HUD
async function revealHint() {
  STATE.hintShown = true; hud(); await wait(0.25);
  showHintBox(true); Sound.rustle(null, 0.9); say("hint"); HOST.gesture("agree"); await wait(1.1);
}
function showHintBox(on) {
  const b = $("hintBox"); if (on) { $("hintText").textContent = STATE.hint; b.style.animation = "none"; void b.offsetWidth; b.style.animation = ""; }
  b.hidden = !on; $("hintBtn").setAttribute("aria-expanded", String(!!on));
}
function resetScene() {
  resetSiege(); stopBodyPlay(); TASKS.length = 0; ROPE.held = false; ROPE.mode = null; ROPE.fromT = 1; STATE.trap = false;
  for (const d of GAL.doors) { d.ang = 0; d.vel = 0; d.slams = 0; d.pivot.rotation.z = 0; }
  GAL.leverPivot.rotation.z = -0.35; resetRope();
  MAN.hang = null; MAN.pathIdx = 0; MAN.tremble = 0; MAN.sweating = false; MAN.setSad(0); MAN.ch.skin.userData.U.sweat.value = 0; MAN.bound = true;
  MAN.ik.L.goal = MAN.ik.R.goal = 0; MAN.lookPt = null; MAN.act.idle.timeScale = 1; MAN.place(MAN_PATH[0][0], MAN_PATH[0][1], Math.PI);
  MAN.panic = 0; MAN.lookT = 0; const U = MAN.ch.skin.userData.U; U.fear.value = 0; U.jaw.value = 0;
  EXEC.gripping = false; EXEC.setIK("R", null, 0); EXEC.setIK("L", null, 0); EXEC.ik.L.fast = EXEC.ik.R.fast = false; if (EXEC.grip) Object.assign(EXEC.grip, { L: 0, R: 0, tL: 0, tR: 0 }); EXEC.place(LAY.exec.x, LAY.exec.z, Math.PI / 2); EXEC.lookPt = V3(LAY.trap.x, 3.9, LAY.trap.z);
  const [hx, hz] = hostIdle(); HOST.place(hx, hz, Math.atan2(CAM.pos.x - hx, CAM.pos.z - hz)); HOST.setIK("R", null, 0); HOST.ch.marker.visible = false; HOST.lookPt = null;
  if (HOST.ch.hat) { HOST.ch.hat.rotation.x = -0.15; HOST.ch.hat.position.y = 2.86; }
}
function newRound() {
  resetScene(); STATE.played = true; STATE.lastWon = false; STATE.streakLost = null; STATE.roundId = (STATE.roundId || 0) + 1; // (from now on the menu's big button says Restart or Try Again, not Ride Out: openMenu)
  const pick = pickWord(STATE.len, STATE.diff), cfg = DIFF[STATE.diff];
  Object.assign(STATE, { word: pick.w, hint: pick.hint, prog: Array(pick.w.length).fill(0), lostReveal: Array(pick.w.length).fill(false), wrong: [], guessed: new Set(),
    maxWrong: cfg.max, misses: 0, hintShown: false, locked: false, over: false, ts: 1, duskT: 0, bubble: null, mood: 0 });
  boardLayout(STATE.word); boardDraw(); resetKeys(); showHintBox(false); hud(); $("skip").hidden = true;
  Sound.setLevel(0); Sound.startMusic(); shot("wide", 1.4);
  $("kb").classList.remove("up"); requestAnimationFrame(() => setTimeout(() => $("kb").classList.add("up"), 60));
  quipNewRound(); const rid = STATE.roundId, first = !STATE.mysterySaid; STATE.mysterySaid = true;
  const later = (s, f) => setTimeout(() => { if (STATE.roundId === rid && !STATE.over) f(); }, s * 1000); // (not into a round that's since been replaced or ended)
  if (first) { later(0.9, () => say(null, MYSTERY_LINE)); later(0.9 + VOICE_LINES[MYSTERY_LINE][1] + 0.7, () => { if (!STATE.guessed.size) say("intro"); }); } // (the first round: the mystery line, then the usual intro)
  else later(0.9, () => say("intro"));
}
// ---- HUD + keyboard ----
const ROWS = ["QWERTYUIOP", "ASDFGHJKL", "ZXCVBNM"];
function buildKeyboard() { ROWS.forEach(r => { const row = document.createElement("div"); row.className = "krow";
  for (const ch of r) { const b = document.createElement("button"); b.type = "button"; b.className = "key"; b.id = "key-" + ch; b.textContent = ch; b.setAttribute("aria-label", "Letter " + ch); b.addEventListener("click", () => guess(ch)); row.appendChild(b); }
  $("kb").appendChild(row); }); }
function resetKeys() { document.querySelectorAll(".key").forEach(k => { k.className = "key"; k.disabled = false; }); }
function hud() {
  const n = STATE.maxWrong, left = n - STATE.misses; let s = `<circle r="46" fill="#3a3430" stroke="#14110f" stroke-width="3"/><circle r="40" fill="none" stroke="#5b524a" stroke-width="1.5"/><g style="transform:rotate(${-STATE.misses * 360 / n}deg)">`;
  const cr = Math.min(11, 27 * Math.sin(Math.PI / n) - 1.3).toFixed(1), pr = (cr * 0.36).toFixed(1); // chambers shrink to fit when there are many
  for (let i = 0; i < n; i++) { const a = i / n * TAU - Math.PI / 2, x = (Math.cos(a) * 27).toFixed(1), y = (Math.sin(a) * 27).toFixed(1), f = i < left;
    s += `<circle cx="${x}" cy="${y}" r="${cr}" fill="${f ? "#d8a246" : "#0e0b09"}" stroke="#6b5a45" stroke-width="2"/>` + (f ? `<circle cx="${x}" cy="${y}" r="${pr}" fill="#9c6f22"/>` : ""); }
  $("cyl").innerHTML = s + `</g><circle r="7" fill="#262120"/>`; $("left").textContent = left;
  $("meta").textContent = `${DIFF[STATE.diff].name} · ${LEN_NAME[STATE.len]}${STATE.streak ? " · Streak " + STATE.streak : ""}`;
  const hb = $("hintBtn"), rule = DIFF[STATE.diff].hint, open = rule !== "none" && STATE.hintShown && !STATE.over; hb.classList.remove("warn"); hb.disabled = !open;
  hb.textContent = rule === "none" ? "No hints" : open ? "Hint" : "Hint \u{1F512}";
  hb.title = rule === "none" ? "No hints on Outlaw" : open ? "Show or hide the clue" : "A clue about the word unlocks on your last chance";
}
function updateBubble(dt) {
  const el = $("bubble"), B = STATE.bubble;
  if (!B) { el.hidden = true; return; } B.t -= dt; if (B.t <= 0) { STATE.bubble = null; el.hidden = true; return; }
  const who = B.who || HOST; // (the host, or a gunman calling out in the shootout: the bubble sits over whoever is talking)
  who.ch.bones.Head.getWorldPosition(A1); A1.y += B.who ? 0.75 : 0.32; A1.project(R.camera); // (a gunman's sits higher, clear of the red mark over him)
  if (A1.z > 1) { el.hidden = true; return; }
  const x = (A1.x * 0.5 + 0.5) * R.w, y = (-A1.y * 0.5 + 0.5) * R.h; el.hidden = false; if (el.textContent !== B.text) el.textContent = B.text;
  const w = el.offsetWidth, bx = clamp(x - w * 0.7, 8, R.w - w - 8); el.style.transform = `translate(${bx}px, ${clamp(y - el.offsetHeight - 12, 56, R.h - 60)}px)`; el.style.opacity = clamp(B.t * 2, 0, 1);
  el.style.setProperty("--tail", clamp(x - bx - 8, 10, w - 26).toFixed(0) + "px"); // the tail points at him, even when the bubble is pushed in from the edge
}
