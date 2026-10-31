// ---------- MENU, INPUT, BOOT, MAIN LOOP ----------
let musicStarted = false;
// the HUD sound button: a speaker with sound waves, or (muted) a speaker inside a circle with a line through it
function soundIcon(on) {
  return on ? '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M3.5 9.5h3.6L12 5.6v12.8l-4.9-3.9H3.5z" fill="currentColor"/><path d="M15.3 9.2a4 4 0 0 1 0 5.6M17.9 6.6a7.6 7.6 0 0 1 0 10.8" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/></svg>'
    : '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M7.3 9.7h3l4.3-3.6v11.8l-4.3-3.6h-3z" fill="currentColor"/><circle cx="12" cy="12" r="9.6" fill="none" stroke="#ef6a52" stroke-width="2"/><path d="M5.3 5.3l13.4 13.4" stroke="#ef6a52" stroke-width="2" stroke-linecap="round"/></svg>';
}
function setSound(on) {
  Sound.setMuted(!on); if (on) { Sound.unlock(); if (!musicStarted) { musicStarted = true; Sound.startMusic(); } }
  for (const b of [$("muteBtn"), $("soundBtn")]) b.setAttribute("aria-pressed", String(on));
  $("muteBtn").innerHTML = soundIcon(on); $("muteBtn").setAttribute("aria-label", on ? "Turn sound off" : "Turn sound on");
  $("soundBtn").textContent = on ? "Sound: On" : "Sound: Off"; savePrefs();
}
function wireUI() {
  document.querySelectorAll("input[name=diff]").forEach(r => r.addEventListener("change", () => $("diffNote").textContent = DIFF[r.value].note));
  $("poster").addEventListener("submit", e => { e.preventDefault();
    STATE.len = document.querySelector("input[name=len]:checked").value; STATE.diff = document.querySelector("input[name=diff]:checked").value;
    STATE.streak = 0; savePrefs(); $("menu").hidden = true; Sound.resume(); newRound(); });
  $("resumeBtn").addEventListener("click", () => { $("menu").hidden = true; Sound.resume(); });
  $("menuBtn").addEventListener("click", () => { $("sign").hidden = true; openMenu(); });
  $("againBtn").addEventListener("click", () => { $("sign").hidden = true; Sound.resume(); newRound(); });
  $("setBtn").addEventListener("click", () => { $("sign").hidden = true; openMenu(); });
  $("muteBtn").addEventListener("click", () => setSound(Sound.muted));
  $("hintBtn").addEventListener("click", () => { if (!$("hintBtn").disabled) showHintBox($("hintBox").hidden); });
  $("hintClose").addEventListener("click", () => showHintBox(false));
  $("soundBtn").addEventListener("click", () => setSound(Sound.muted));
  const unlockAll = () => { Sound.unlock(); if (!Sound.muted && !musicStarted) { musicStarted = true; Sound.startMusic(); } };
  for (const ev of ["pointerdown", "touchend", "click", "keydown"]) document.addEventListener(ev, unlockAll, { capture: true, passive: true });
  $("vol").addEventListener("input", e => { Sound.resume(); Sound.setVolume(e.target.value / 100); savePrefs(); });
  $("gfx").addEventListener("change", e => { setQuality(e.target.value === "auto" ? pickTier() : e.target.value); savePrefs(); });
  $("stage").addEventListener("pointerdown", e => {
    if (e.target.closest("button,#hintBox")) return;
    if (FREE.on) { if (revolverTap(e)) return; if (PLAY.on && MAN.hang) { const [sx, sy] = playLocal(e); if (playPick(sx, sy) !== null) { playDown(e); return; } } lookDown(e, "free"); if (e.cancelable) e.preventDefault(); return; } // (a sign put away: look round, 12p)
    if (chaseTap(e)) return; // the getaway: a drag steers or aims, a click fires (12g)
    if (SIEGE.on) { lookDown(e, "siege"); if (e.cancelable) e.preventDefault(); return; } // the shootout: a drag turns you, a tap takes cover or the laser (12p, 12d)
    if (ARMED.on) { lookDown(e, "armed"); if (e.cancelable) e.preventDefault(); return; } // the revolver from the barrel in your hand: a drag looks round (12q)
    if (siegeTap(e)) return; // the sword, and the shootout that follows (12d)
    if (revolverTap(e)) return; // the revolver on the barrel: take it up (12p, 12q)
    if (PLAY.on) { playDown(e); return; } // once he hangs, touches handle the body instead of skipping
    lookDown(e, "town"); }); // (a drag looks round; a tap hurries the host along: 12p)
  window.addEventListener("pointermove", e => { if (!lookMove(e)) playMove(e); }, { passive: false });
  for (const ev of ["pointerup", "pointercancel"]) window.addEventListener(ev, e => { if (!lookUp(e)) playUp(e); });
  document.addEventListener("keydown", e => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === "Escape") { if (!$("book").hidden) { bookClose(); return; } if ($("menu").hidden) openMenu(); else if (!STATE.over || siegeLive()) { $("menu").hidden = true; Sound.resume(); } return; }
    if (CHASE.on) { chaseKey(e, true); return; } // (the getaway's own keys: 12g)
    if (ARMED.on && $("menu").hidden) { if (e.key === " " || e.key === "Enter") { e.preventDefault(); if (!e.repeat) armedFire(); } return; } // (the revolver from the barrel: 12q)
    if (SIEGE.on && $("menu").hidden) { if (e.key === " " || e.key === "Enter") { e.preventDefault(); if (!e.repeat) fireTap(); } else if (e.key === "Shift" || e.key === "a" || e.key === "A") SIEGE.keyAim = true; return; } // (hold Shift or A to come up)
    if (/^[a-zA-Z]$/.test(e.key) && $("menu").hidden && $("sign").hidden) { e.preventDefault(); guess(e.key.toUpperCase()); }
    else if (e.key === " " && STATE.locked) STATE.ts = 6;
  });
  document.addEventListener("keyup", e => { if (CHASE.on) { chaseKey(e, false); return; } if (e.key === "Shift" || e.key === "a" || e.key === "A") SIEGE.keyAim = false; if (e.key === " " || e.key === "Enter") laserTrigger(false); });
  window.addEventListener("blur", () => { SIEGE.keyAim = false; CHASE.swipe = null; CHASE.drag = null; laserTrigger(false); });
  $("motion").addEventListener("change", e => { STATE.reduceMotion = e.target.checked; savePrefs(); });
  document.addEventListener("visibilitychange", () => { if (document.hidden) Sound.pauseAll(); else Sound.wake(); });
}
// the end sign's button: Try Again after a loss, Play Again after a win
function signAgain(won) { STATE.lastWon = won; $("againBtn").textContent = won ? "Play Again" : "Try Again"; }
function openMenu() {
  $("resumeBtn").hidden = STATE.over && !siegeLive(); $("menuClose").hidden = !STATE.played; $("menu").hidden = false; /* (the red X: shut it, whatever's under it, v40) */ $("bestOut").textContent = STATE.best;
  // the big button: Ride Out the first time; Restart in the middle of a game; Try Again once it's over (Play Again after a win)
  $("startBtn").textContent = !STATE.played ? "Ride Out" : !$("resumeBtn").hidden ? "Restart" : STATE.lastWon ? "Play Again" : "Try Again";
  document.querySelector(`input[name=len][value=${STATE.len}]`).checked = true; document.querySelector(`input[name=diff][value=${STATE.diff}]`).checked = true;
  $("diffNote").textContent = DIFF[STATE.diff].note;
}
function setQuality(tier) {
  if (!TIERS[tier] || tier === R.tier) return; R.tier = tier; const T = TIERS[tier];
  if (R.bloom) R.bloom.enabled = T.bloom;
  const s = SKY.sun.shadow; s.mapSize.set(T.shadow, T.shadow); if (s.map) { s.map.dispose(); s.map = null; }
  for (const rt of [R.composer.renderTarget1, R.composer.renderTarget2]) { rt.samples = R.webgl2 ? T.msaa : 0; rt.dispose(); }
  resizeRenderer(R.w, R.h);
}
function setProgress(p, label) { $("loadBar").style.width = Math.round(p * 100) + "%"; if (label) $("loadText").textContent = label; }
const nextFrame = () => new Promise(r => requestAnimationFrame(() => setTimeout(r, 0)));
async function loadGLB(url) { // models ship as base64 text so the host serves them
  const r = await fetch(url + ".txt"); if (!r.ok) throw new Error("HTTP " + r.status + " for " + url);
  const s = atob((await r.text()).trim()), b = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) b[i] = s.charCodeAt(i);
  return new Promise((res, rej) => new THREE.GLTFLoader().parse(b.buffer, "", res, rej));
}
const ASSETS = window.GULCH_ASSETS || "models/";
async function boot() {
  const prefs = loadPrefs();
  // difficulty picks saved before the vocabulary words arrived are dropped, so everyone starts on the new (harder) default
  if (prefs.len in LEN_RANGE) STATE.len = prefs.len; if (prefs.diff in DIFF && prefs.v >= 2) STATE.diff = prefs.diff; STATE.best = prefs.best | 0;
  if (typeof prefs.vol === "number") { $("vol").value = prefs.vol; Sound.setVolume(prefs.vol / 100); }
  if (prefs.muted) { Sound.setMuted(true); $("muteBtn").innerHTML = soundIcon(false); $("muteBtn").setAttribute("aria-pressed", "false"); $("soundBtn").textContent = "Sound: Off"; $("soundBtn").setAttribute("aria-pressed", "false"); }
  if (prefs.gfx) $("gfx").value = prefs.gfx;
  STATE.reduceMotion = typeof prefs.motion === "boolean" ? prefs.motion : matchMedia("(prefers-reduced-motion: reduce)").matches; $("motion").checked = STATE.reduceMotion;
  STATE.cliffSeen = !!prefs.cliff; STATE.bestRide = prefs.ride | 0; STATE.rides = prefs.rides | 0;
  buildKeyboard(); wireUI(); bookInit(); hud();
  const forced = new URLSearchParams(location.search).get("tier");
  const tier = pickTier(forced || ($("gfx").value === "auto" ? null : $("gfx").value)); TEXQ = TIERS[tier].tex;
  patchFog(SUN_AZ); initRenderer($("scene"), tier); onResize();
  setProgress(0.05, "Loading fonts…");
  try { await Promise.race([Promise.all(['100px "Permanent Marker"', '60px "Sancreek"', '700 30px "Zilla Slab"'].map(f => document.fonts.load(f))), new Promise(r => setTimeout(r, 2500))]); } catch (e) {}
  Sound.loadSong((window.GULCH_AUDIO || "audio/") + "soundtrack.mp3"); Sound.preloadVoices(Object.values(VOICE_LINES).map(v => v[0]));
  const models = Promise.all(["Xbot.glb", "LeePerrySmith.glb", "Horse.glb", "Stork.glb"].map(f => loadGLB(ASSETS + f)));
  const tl = new THREE.TextureLoader(), texs = Promise.all(["Map-COL.jpg", "Infinite-Level_02_Tangent_SmoothUV.jpg", "skin-spec.jpg"].map(f => tl.loadAsync(ASSETS + f)));
  setProgress(0.12, "Weathering the lumber…"); await nextFrame(); buildTextures(); buildMaterials();
  setProgress(0.35, "Raising the town…"); await nextFrame(); initSky(); buildGround(); buildMesas(); buildRocks(); buildCacti(); buildScrub(); buildTown(); buildClutter(); buildTownWeeds(); buildTumbleweeds(); buildWindmill();
  setProgress(0.55, "Building the gallows…"); await nextFrame(); buildGallows(); buildBoard(); buildWeed(); buildDust(); buildSmoke();
  setProgress(0.7, "Waking the townsfolk…");
  let xbot, head, horse, stork, col, nrm, spec;
  try { [[xbot, head, horse, stork], [col, nrm, spec]] = await Promise.all([models, texs]); }
  catch (e) { $("loadText").textContent = "The characters couldn't load. Check your connection and reload the page."; console.error(e); return; }
  await nextFrame(); prepareCharacters(xbot, head, col, nrm, spec);
  HOST = new Actor({ body: { coat: true }, shirt: 0x7d6a54, trousers: 0x3b3129, coat: 0x4a3526, boots: 0x2b1b10, gloves: 0x5a3a22, belt: 0x2a1a10,
    skin: { tint: 0xe2c0a6, hairAmt: 0, stubble: 0.5 }, hat: { color: 0x6e5236, y: 2.86, tilt: -0.15 }, mask: 0x7a2418, gun: true, spurs: true, marker: true }, "host");
  MAN = new Actor({ body: { vest: true, openCollar: true }, openCollar: true, grime: 0.8, bound: true, sweatDrops: true, shells: true, iris: 0x5b6a4a, shirt: 0x7c705d, trousers: 0x4e4034, vest: 0x2e2620, boots: 0x3a2516, bareHands: 0x9a6a50, skin: { tint: 0xeccab4, hair: 0x3a2a1c, stubble: 0.65 } }, "man");
  EXEC = new Actor({ body: {}, shirt: 0x1c1a19, trousers: 0x161413, boots: 0x111111, gloves: 0x141210, belt: 0x0e0d0c, hood: true, skin: {} }, "exec");
  const stepSnd = (spurs, k = 1) => a => { const wood = a.pos.y > 0.2; Sound.step(a.pos, wood ? "wood" : "dirt", spurs && !wood, k); };
  HOST.onStep = stepSnd(true); MAN.onStep = stepSnd(false, 1.25); EXEC.onStep = stepSnd(false, 0.9);
  MAN.onBreath = (a, p) => { if (p > 0.35) Sound.breath(a.ch.bones.Head.getWorldPosition(new THREE.Vector3()), p); };
  KEY_LIGHT = new THREE.PointLight(0xffd9b8, 0, 3.5, 2); R.scene.add(KEY_LIGHT);
  buildCrowd(); prepHorse(horse); buildHerd(); prepBirds(stork); buildSiege(); buildGunProp(); buildArmedUI(); buildBell(); buildChase(); buildFreeLook(); buildCrows(); buildTargets(); buildTownBreakables(); Sound.crowGate = () => !CHASE.on; // (the distant crows are heard about the town, not out on the getaway)
  setProgress(0.95, "Saddling up…"); shot("intro", 0); resetScene(); boardDraw();
  await nextFrame(); siegePrecompile(true); ashPrecompile(true); meatPrecompile(true); try { R.renderer.compile(R.scene, R.camera); } catch (e) { console.warn("precompile", e); } meatPrecompile(false); ashPrecompile(false); siegePrecompile(false);
  Sound.preloadClips(SIEGE_CLIPS);
  for (let i = 0; i < 3; i++) { await nextFrame(); tick(performance.now()); }
  $("loading").hidden = true; openMenu(); shot("wide", 4);
  loadGLB(ASSETS + "ARC09.glb").then(prepLaser).catch(e => console.warn("laser gun unavailable", e)); // (the shootout's laser, 12k: fetched once the game's up)
  last = performance.now(); requestAnimationFrame(loop);
}
function onResize() { const st = $("stage"), w = st.clientWidth, h = st.clientHeight; if (!w || !h || !R.renderer) return; resizeRenderer(w, h); if (CAM && !CAM.to && CAM.name) shot(CAM.name, 0);
  try { renderFrame(T); } catch (e) {} } // (draw straight away: a resized canvas is blank until the next frame, and the getaway's run changes the view's size)
let last = 0, T = 0, perf = { n: 0, acc: 0, steps: 0 };
// if frames run long while playing: 1) switch off AO, light shafts and skin scattering, 2) drop a quality tier (and again), 3) lower the
// resolution a little. What was built at load (textures, the crowd, the clutter) stays; the per-pixel cost is what comes down
function perfStep() {
  perf.steps++;
  if (!R.lite && R.tier !== "low") { R.lite = true; return; }
  if (R.tier !== "low") { R.lite = false; setQuality(TIER_ORDER[TIER_ORDER.indexOf(R.tier) + 1]); if (R.tier === "medium") R.lite = true; return; }
  if ((R.resScale || 1) > 0.8) { R.resScale = 0.85; resizeRenderer(R.w, R.h); }
}
function tick(now) {
  const rdt = Math.min(window.GULCH_MAXDT || 0.05, Math.max(0, (now - last) / 1000)); last = now; const dt = rdt * STATE.ts * slowK(rdt); T += rdt;
  runTasks(dt);
  const d0 = STATE.dusk; STATE.dusk += (STATE.duskT - STATE.dusk) * Math.min(1, rdt * 0.6);
  if (Math.abs(STATE.dusk - (SKY.lastSet ?? -1)) > 0.004) { SKY.lastSet = STATE.dusk; setDusk(STATE.dusk); setTownLights(STATE.dusk); Sound.setDusk(STATE.dusk); }
  setLanterns(STATE.dusk); R.grade.uniforms.dusk.value = STATE.dusk;
  HOST.talkAmt = Sound.ready ? Sound.talk : 0; if (HOST.ch.maskU) { HOST.ch.maskU.time.value = T; HOST.ch.maskU.wind.value = WIND.gust; }
  for (const a of [HOST, MAN, EXEC]) a.update(dt);
  if (EXEC.gripping && !STATE.trap) EXEC.ik.R.t.copy(GAL.leverTip.getWorldPosition(A1));
  updateWind(dt); updateCrowd(dt, STATE.mood); updatePanic(dt); setTrapOpen(dt, STATE.trap); updateRopeState(T, dt); updateLanterns(dt);
  if (MAN.hang && MAN.hang.caught && MAN.hang.t - MAN.hang.tCatch > 2.5 && Math.random() < dt * 0.3) Sound.ropeCreak(GAL.anchor, 0.35); // the odd creak once he hangs still
  updateHorse(dt); updateHerd(dt); updateBirds(dt); updateCrows(dt); updateTargets(dt); updateMeat(dt); updateAsh(dt); updateBreak(dt); updateWeed(dt); updateDust(rdt, T); updateTumbleweeds(dt); updateWindmill(dt); updatePuffs(dt); updateFlag(dt); updateSmoke(dt);
  updateSiege(rdt, dt); updateLaser(rdt, dt); updateGunProp(rdt); updateArmed(rdt, dt); updateBell(rdt, dt); updateChase(rdt, dt); updateCamera(rdt, T, dt); siegeLate(rdt); laserLate(rdt); chaseLate(rdt); armedLate(rdt); freeApply(rdt); updateSky(T, R.camera); Sound.setListener(R.camera); updateBubble(rdt); updatePlay(rdt);
  renderFrame(T);
  if (perf.steps < 7 && $("menu").hidden && $("gfx").value === "auto" && !window.GULCH_PAUSE) { perf.n++; perf.acc += rdt;
    if (perf.n === 150) { const avg = perf.acc / perf.n; perf.n = 0; perf.acc = 0; if (avg > 1 / 27) perfStep(); } }
}
function loop(now) { if (window.GULCH_PAUSE) { last = now; requestAnimationFrame(loop); return; } tick(now); requestAnimationFrame(loop); }
window.addEventListener("resize", onResize);
if (window.ResizeObserver) new ResizeObserver(onResize).observe($("stage"));
boot().catch(e => { console.error(e); const t = $("loadText"); if (t) t.textContent = "Something went wrong starting the game: " + e.message; });
