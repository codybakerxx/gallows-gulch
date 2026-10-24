// ---------- THE BELL: a brass bell hung off the gallows, and what ringing it sets going ----------
// It hangs from an iron arm at the top of the right-hand upright and stirs in the wind; now and then the brass catches the light. In the
// shootout it can be shot like anything else, and the bullet is spent either way. A hit rings it and marks the round (BELL.unlocked):
// win the fight and the getaway starts (12g). Win without it and the street stays yours, gun in hand, for as long as you like; ring it
// then and the getaway starts on the spot. Nothing on screen says any of this.
const BELL = { pivot: null, ang: 0, angV: 0, ext: 0, gT: 4, glint: null, unlocked: false, pending: false, L: 0.24, r: 0.215, at: new THREE.Vector3(), lastDir: 0, strikes: 0 };
const BELL_CFG = { swingKick: 3.2, damp: 0.35, wind: 0.05, glintEvery: [4, 7], ringAgain: 0.12 }; // (rad/s a hit gives it, how fast the swing dies, the breeze, a glint every 4-7 s, how big a swing still rings)
function buildBell() {
  const x = LAY.postX[1], z = LAY.plat.z, top = LAY.beamY + 0.35, arm = 0.62, iron = MAT.iron;
  const brass = new THREE.MeshStandardMaterial({ color: 0xb48a3a, metalness: 1, roughness: 0.3 }), dark = new THREE.MeshStandardMaterial({ color: 0x3a2a14, metalness: 0.8, roughness: 0.5 });
  const base = new THREE.Group(); base.position.set(x, top - 0.08, z); R.scene.add(base);
  const add = (m, px, py, pz, p = base) => { m.position.set(px, py, pz); m.castShadow = true; m.receiveShadow = true; m.userData.dyn = true; p.add(m); return m; };
  // the bracket: a flat iron arm out from the post toward the stairs side, a diagonal stay under it, a strap round the post
  add(new THREE.Mesh(new THREE.BoxGeometry(arm, 0.045, 0.06), iron), arm / 2 + 0.1, 0, 0);
  const stay = add(new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.03, 0.04), iron), 0.33, -0.17, 0); stay.rotation.z = 0.62;
  add(new THREE.Mesh(new THREE.BoxGeometry(0.27, 0.06, 0.27), iron), 0, 0, 0);
  // the bell: a lathe profile (crown, waist, flared lip, and back up inside), a clapper, the yoke it swings from
  const P = [[0, 0.3], [0.05, 0.3], [0.085, 0.287], [0.105, 0.255], [0.116, 0.2], [0.126, 0.13], [0.145, 0.07], [0.178, 0.01], [0.203, -0.03], [0.214, -0.05], [0.203, -0.056],
    [0.186, -0.04], [0.164, -0.006], [0.132, 0.06], [0.111, 0.13], [0.101, 0.2], [0.09, 0.25], [0.068, 0.272], [0, 0.276]].map(([r, y]) => new THREE.Vector2(r, y));
  const pivot = new THREE.Group(); pivot.position.set(arm + 0.03, -0.03, 0); base.add(pivot); BELL.pivot = pivot;
  const bell = add(new THREE.Mesh(new THREE.LatheGeometry(P, 40), brass), 0, -BELL.L - 0.07, 0, pivot); bell.material.side = THREE.DoubleSide;
  add(new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.012, 6, 14), iron), 0, -0.02, 0, pivot);
  add(new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.08, 0.03), dark), 0, -0.06, 0, pivot);
  add(new THREE.Mesh(new THREE.SphereGeometry(0.035, 12, 8), dark), 0, -BELL.L - 0.07 - 0.03, 0, pivot);
  // a glint that moves over the brass every few seconds (the same star the sword uses)
  const g = new THREE.Sprite(new THREE.SpriteMaterial({ fog: false, map: starTex(), color: new THREE.Color(1.3, 1.2, 0.95), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0 }));
  g.visible = false; g.renderOrder = 5; R.scene.add(g); BELL.glint = { s: g, t: 1, ox: 0, oy: 0 };
}
function bellCentre(out = BELL.at) { return BELL.pivot.localToWorld(out.set(0, -BELL.L - 0.02, 0)); }
// a shot at it: the distance along the ray to the bell, or -1
function bellRay(ro, rd) {
  if (!BELL.pivot) return -1; const c = bellCentre(_s3), ox = ro.x - c.x, oy = ro.y - c.y, oz = ro.z - c.z, b = ox * rd.x + oy * rd.y + oz * rd.z, cc = ox * ox + oy * oy + oz * oz - BELL.r * BELL.r, h = b * b - cc;
  if (h < 0) return -1; const t = -b - Math.sqrt(h); return t > 0 ? t : -1;
}
// hit: it rings and swings, a spark flies off the brass, and the round is marked. In the cleared street, that starts the getaway now
function bellShot(at, rd) {
  const side = rd.x >= 0 ? 1 : -1; BELL.angV += side * BELL_CFG.swingKick; BELL.lastDir = 0; BELL.strikes = 0;
  Sound.bell(bellCentre(), 1); muzzleFlash(at, 0.14); puff(at, 6, 0.4, 0.04, 0.6, 0.5, 0xf0d9a0);
  if (!BELL.unlocked) Sound.preloadClips(CHASE_CLIPS); BELL.unlocked = true;
  if (SIEGE.phase === "cleared" && !BELL.pending) { BELL.pending = true; setTimeout(() => { if (SIEGE.on && SIEGE.phase === "cleared") clearedToGetaway(); else BELL.pending = false; }, 900); }
}
function updateBell(rdt, dt) {
  if (!BELL.pivot) return; const B = BELL, C = BELL_CFG, g0 = 9.81 / (B.L + 0.12);
  // a damped pendulum stirred by the wind; each time it reaches the end of a swing big enough, the clapper strikes again (fainter each time)
  const wind = C.wind * Math.sin(T * 0.7) * (WIND.gust || 0.5);
  B.angV += (-g0 * Math.sin(B.ang) - C.damp * B.angV + wind) * dt; B.ang += B.angV * dt; B.pivot.rotation.z = B.ang;
  const dir = Math.sign(B.angV); if (B.lastDir && dir && dir !== B.lastDir && Math.abs(B.ang) > C.ringAgain && B.strikes < 6) { B.strikes++; Sound.bell(bellCentre(), Math.min(0.75, Math.abs(B.ang) * 1.6) / (1 + B.strikes * 0.4)); }
  if (dir) B.lastDir = dir;
  // the glint: brief, now and then, somewhere on the bell's face
  const G = B.glint; B.gT -= rdt; if (B.gT <= 0) { B.gT = rnd(C.glintEvery[0], C.glintEvery[1]); G.t = 0; G.ox = rnd(-0.12, 0.12); G.oy = rnd(-0.12, 0.05); G.s.visible = true; }
  if (G.t < 1) { G.t = Math.min(1, G.t + rdt / 0.7); const k = Math.sin(G.t * Math.PI); G.s.material.opacity = k * 0.9; G.s.scale.setScalar(0.12 + 0.22 * k); G.s.material.rotation = G.t * 1.5;
    G.s.position.copy(B.pivot.localToWorld(_s1.set(G.ox, -B.L - 0.07 + G.oy, 0.2))); if (G.t >= 1) G.s.visible = false; }
}
// a new shootout: the bell's mark is cleared (and any getaway it had queued)
function bellReset() { BELL.unlocked = false; BELL.pending = false; }

// ---- the cleared street: every gunman down and the bell not rung. You keep the gun and the street; a banner says you survived, and
// Done takes you to the usual sign ----
function enterCleared() {
  const S = SIEGE; S.phase = "cleared"; $("siegeTip").hidden = true; $("doomMsg").hidden = true; $("hitMsg").hidden = true;
  const n = S.enemies.length, N = NUM_WORDS[n] || String(n), m = $("clearMsg");
  $("clearLine").textContent = `${S.shots <= n ? `${N} shots, ${N.toLowerCase()} down` : `${N} down in ${S.shots} shots`} · Streak: ${STATE.streak} · Best: ${STATE.best}`;
  m.hidden = false; m.classList.remove("show"); void m.offsetWidth; m.classList.add("show");
  setTimeout(() => { if (S.on && S.phase === "cleared") { manCough("cough0", 0.7); say(null, SIEGE_LINES.win); } }, 1200);
}
async function finishCleared() { // Done: the old ending, the camera on the cut rope and the sign
  const S = SIEGE; if (S.phase !== "cleared") return; S.phase = "won"; $("clearMsg").hidden = true; showSiegeUI("end"); $("xhair").hidden = true; S.holding = S.keyAim = false;
  const sim = GAL.rope.sim, k = Math.max(0, sim.cut), end = V3(sim.x[k * 3], sim.x[k * 3 + 1], sim.x[k * 3 + 2]), look = GAL.anchor.clone().lerp(end, 0.65);
  camTo(upEye(V3()), look, 50, 1.8); await wait(1.9); if (!S.on || S.phase !== "won") return; showSiegeSign(true);
}
function clearedToGetaway() { const S = SIEGE; if (S.phase !== "cleared") return; $("clearMsg").hidden = true; S.holding = S.keyAim = false; startGetaway(); }
