// ---------- SPARE ROUNDS (v53) ----------
// A box of cartridges leans against the front of the hangman board, by its left leg: an open wooden box, the brass of the rounds showing.
// It glimmers: light runs across the brass every couple of seconds and small sparks twinkle over it (brighter in the town shootout, when
// it can be taken). In the shootout, tap it and you have one more reload (a speedloader of seven) for that shootout only: the speedloader
// shows beside the cylinder with the other. If the revolver's already dry and they're closing in, it's back to the fight: the gun reloads
// at once. Taken, it's gone until the next shootout. (It isn't the getaway's: that gun has its nine and no more.)
const AMMO = { box: null, brass: null, glow: { value: 0 }, sparks: [], taken: false, sheenT: 0, burst: [], tipSaid: false, at: new THREE.Vector3(), extra: 0 };
const AMMO_CFG = { reloads: 1, tapR: 52 };
const _am1 = new THREE.Vector3(), _am2 = new THREE.Vector3();
function buildAmmo() {
  const B = LAY.board, grp = new THREE.Group(), W = 0.27, D = 0.17, H = 0.085; // (the box: 27 x 17 cm, 8.5 deep)
  const wood = MAT.woodDark, add = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; grp.add(m); return m; };
  add(new THREE.BoxGeometry(W, 0.012, D), wood, 0, 0.006, 0); // the bottom
  for (const s of [-1, 1]) { add(new THREE.BoxGeometry(W, H, 0.012), wood, 0, H / 2, s * (D / 2 - 0.006)); add(new THREE.BoxGeometry(0.012, H, D - 0.024), wood, s * (W / 2 - 0.006), H / 2, 0); }
  const lid = add(new THREE.BoxGeometry(W, 0.01, D), wood, 0, H + 0.035, -D / 2 - 0.03); lid.rotation.x = -1.15; // (the lid, open, hanging back)
  // the rounds: standing in rows bullet-down as they're packed, their brass bases and primers up; the brass carries the glimmer (AMMO.glow)
  const brass = new THREE.MeshStandardMaterial({ color: 0xd2a446, metalness: 1, roughness: 0.24, emissive: 0xffd27a, emissiveIntensity: 0 }), primer = new THREE.MeshStandardMaterial({ color: 0x9a7a5a, metalness: 1, roughness: 0.35 });
  brass.onBeforeCompile = q => { q.uniforms.ammoGlow = AMMO.glow; q.fragmentShader = q.fragmentShader.replace("#include <common>", "#include <common>\nuniform float ammoGlow;").replace("#include <emissivemap_fragment>", "#include <emissivemap_fragment>\ntotalEmissiveRadiance *= 0.0; totalEmissiveRadiance += vec3(1.0, 0.82, 0.48) * ammoGlow;"); };
  brass.customProgramCacheKey = () => "ammoBrass";
  const caseG = new THREE.CylinderGeometry(0.0078, 0.0078, 0.052, 8), noseG = new THREE.CylinderGeometry(0.0028, 0.0028, 0.002, 8), rows = 5, cols = 9;
  const cases = new THREE.InstancedMesh(caseG, brass, rows * cols), noses = new THREE.InstancedMesh(noseG, primer, rows * cols), m4 = new THREE.Matrix4();
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) { const i = r * cols + c, x = -W / 2 + 0.024 + c * (W - 0.048) / (cols - 1), z = -D / 2 + 0.026 + r * (D - 0.052) / (rows - 1);
    m4.makeTranslation(x, 0.012 + 0.026, z); cases.setMatrixAt(i, m4); m4.makeTranslation(x, 0.012 + 0.0525, z); noses.setMatrixAt(i, m4); }
  cases.castShadow = noses.castShadow = true; grp.add(cases, noses);
  // leaning back against the front of the board's left leg, on the ground in front of it, toward the covers
  const bg = BOARD.group; bg.updateMatrixWorld(true); const lx = -(B.w / 2 - 0.25) + 0.02, at = bg.localToWorld(V3(lx, 0, 0.13));
  grp.position.set(at.x, groundHeight(at.x, at.z), at.z); grp.rotation.set(-0.42, B.yaw, 0, "YXZ"); grp.position.y += Math.sin(0.42) * D / 2 * 0.2;
  grp.traverse(o => { if (o.isMesh) o.userData.dyn = true; }); R.scene.add(grp); AMMO.box = grp; AMMO.brass = brass; grp.updateMatrixWorld(true);
  AMMO.at.copy(grp.localToWorld(V3(0, H * 0.6, 0)));
  // sparks twinkling over it, and a burst of them as it's taken
  const tex = starTex(), spr = c => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ fog: false, map: tex, color: new THREE.Color(c, c * 0.92, c * 0.7), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0 }));
    s.visible = false; s.renderOrder = 5; R.scene.add(s); return s; };
  AMMO.sparks = Array.from({ length: 4 }, () => ({ s: spr(1.4), t: 1, life: 0.4, wait: Math.random() * 0.8, x: 0, z: 0 }));
  AMMO.burst = Array.from({ length: 10 }, () => ({ s: spr(1.5), t: 1, v: new THREE.Vector3() }));
}
// in the town shootout, while it's still there and the fight's on (or they're closing in on an empty gun)
function ammoLive() { const S = SIEGE; return !!AMMO.box && !AMMO.taken && S.on && (S.phase === "fight" || S.phase === "doomed" || S.phase === "cleared") && !S.run; }
function ammoTap(e) {
  if (!ammoLive()) return false;
  const r = $("scene").getBoundingClientRect(), p = _am1.copy(AMMO.at).project(R.camera); if (p.z > 1 || Math.abs(p.x) > 1.05 || Math.abs(p.y) > 1.05) return false;
  const sx = r.left + (p.x * 0.5 + 0.5) * r.width, sy = r.top + (-p.y * 0.5 + 0.5) * r.height, rad = Math.max(AMMO_CFG.tapR, 0.14 / Math.max(0.3, AMMO.at.distanceTo(R.camera.position)) * r.height);
  if (Math.hypot(e.clientX - sx, e.clientY - sy) > rad) return false;
  ammoTake(); return true;
}
function ammoTake() {
  const S = SIEGE, d = armsDef(), n = d ? d.box : AMMO_CFG.reloads; if (AMMO.taken) return; AMMO.taken = true; AMMO.box.visible = false; AMMO.extra += n; S.reloads += n; gunHud.key = null; ARMS.hudKey = ""; // (v54: a weapon from the range gets its own: 12t box)
  Sound.ammoBox(AMMO.at); setTimeout(() => Sound.clip(siegePick("cock", 2), null, 0.7, 0, 0.05), 260);
  for (const b of AMMO.burst) { b.t = 0; b.s.visible = true; b.s.position.copy(AMMO.at); b.v.set(rnd(-1, 1), rnd(0.6, 1.6), rnd(-1, 1)).multiplyScalar(rnd(0.5, 1.1)); }
  for (const p of AMMO.sparks) { p.t = 1; p.s.visible = false; }
  const m = $("hitMsg"); m.textContent = d ? `+${d.mag * n} ${d.mag * n === 1 ? d.unit1 || d.unit.replace(/s$/, "") : d.unit}` : `+${SIEGE_ROUNDS * AMMO_CFG.reloads} rounds`; m.classList.add("ammo"); m.hidden = false; m.classList.remove("pop"); void m.offsetWidth; m.classList.add("pop"); S.hitT = 1.6;
  if (S.phase === "doomed") { S.phase = "fight"; $("doomMsg").hidden = true; S.nextShot = 1.8; S.doomFirst = S.doomGap = null; S.flanker = null; // (back in it: they hold off while it reloads)
    for (const E of S.enemies) { E.flank = null; if (E.alive && E.state === "pause" && E.t > 50) E.t = rnd(0.6, 1.4); }
    if (LASER.awake) { LASER.awake = false; Sound.laserWake(null, false); } }
  if (S.bullets <= 0 && !laserHeld()) siegeReload();
  siegeHud();
}
// the glimmer: a band of light runs over the brass every 2 s; sparks pop over the box. Brighter in the shootout, when it can be taken
function updateAmmo(rdt) {
  if (!AMMO.box) return; const S = SIEGE, live = ammoLive(), show = AMMO.box.visible && !AMMO.taken, k = live ? 1 : 0.45;
  if (show) { AMMO.sheenT = (AMMO.sheenT + rdt) % 2.0; const u = AMMO.sheenT / 0.7; AMMO.glow.value = (u < 1 ? Math.sin(u * Math.PI) * 1.6 : 0) * k + 0.06 * k; }
  for (const p of AMMO.sparks) {
    if (!show) { p.s.visible = false; continue; }
    if (p.t < 1) { p.t = Math.min(1, p.t + rdt / p.life); const e = Math.sin(p.t * Math.PI); p.s.material.opacity = e * k; p.s.scale.setScalar((0.05 + 0.2 * e) * (live ? 1 : 0.7)); p.s.material.rotation += rdt * 3;
      p.s.position.copy(AMMO.box.localToWorld(_am2.set(p.x, 0.075, p.z))); if (p.t >= 1) { p.s.visible = false; p.wait = rnd(0.2, live ? 0.7 : 1.6); } }
    else if ((p.wait -= rdt) <= 0) { p.t = 0; p.life = rnd(0.3, 0.5); p.x = rnd(-0.12, 0.12); p.z = rnd(-0.07, 0.07); p.s.visible = true; } }
  for (const b of AMMO.burst) { if (b.t >= 1) continue; b.t = Math.min(1, b.t + rdt / 0.6); b.v.y -= 2.5 * rdt; b.s.position.addScaledVector(b.v, rdt); const e = 1 - b.t; b.s.material.opacity = e; b.s.scale.setScalar(0.05 + 0.12 * e); if (b.t >= 1) b.s.visible = false; }
  // the last load in the gun and the box still there: say so, once a shootout
  if (live && !AMMO.tipSaid && S.phase === "fight" && S.reloads <= 0 && !laserHeld() && S.tip <= 0) { AMMO.tipSaid = true; const t = $("siegeTip"); t.textContent = "Spare rounds glint by the board: tap them"; t.hidden = false; S.tip = 3.2; }
}
// a new shootout: the box is back
function ammoReset() { AMMO.taken = false; AMMO.extra = 0; AMMO.tipSaid = false; if (AMMO.box) AMMO.box.visible = true; for (const b of AMMO.burst) { b.t = 1; b.s.visible = false; } }
