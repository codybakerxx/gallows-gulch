// ---------- THE GUNSMITH'S WEAPONS (v54) ----------
// Picked at the range behind the gunsmith (12u). Nine: a Colt Peacemaker, a Derringer, a Winchester '73, a coach gun, a scoped Sharps
// buffalo rifle, a bow, throwing knives, a Gatling gun and dynamite. The one you leave the range with is yours: it's in your hand back in
// the round (the Aim | Fire pad, as with the revolver from the barrel, 12q: shoot one of the townsfolk and the town draws on you) and it's
// the gun you fight the town shootout with (12d), from there or from the sword. The getaway is still the revolver (or the laser).
//   - ARMS.cur: the weapon in your hand (null: the barrel's revolver, and the code that was there before, untouched). ARMS.own: the one
//     you left the range with, which Draw takes up again.
//   - Each fires its own way: bullets (one, or a shotgun's nine pellets in a spread; the Gatling while Fire's held), arrows and knives
//     that fly and drop, dynamite that's thrown, lands and goes off. What they hit is worked out the same for all, per place: the town
//     with the revolver's rules (armsHit "town"), the shootout's (armsHit "siege"), the range's targets (12u rangeRay).
//   - Its model is put in the first-person gun's place (SIEGE.vm.gun), held its own way (a pistol low on the right, a long gun to the
//     shoulder, the bow upright on the left), and the cylinder at the top left shows its own sign and count.
const ARMS_LIST = ["colt", "derringer", "winchester", "shotgun", "sharps", "bow", "knives", "gatling", "dynamite"];
const ARMS_DEF = {
  colt: { name: "Colt Peacemaker", short: "Colt", blurb: "Six in the cylinder: the gun that won the West", kind: "shot", mag: 6, reloads: 2, reload: 1.6, cool: 0.28, spread: 0.0015, box: 1, unit: "rounds", sound: "pistol", hold: "pistol", muz: [0, 0.035, 0.21] },
  derringer: { name: "Derringer", short: "Derringer", blurb: "Two barrels in your palm: close up, it's enough", kind: "shot", mag: 2, reloads: 6, reload: 0.9, cool: 0.22, spread: 0.01, box: 3, unit: "rounds", sound: "small", hold: "pistol", muz: [0, 0.04, 0.075], view: 1.5, turn: -0.45 },
  winchester: { name: "Winchester '73", short: "Winchester", blurb: "Fourteen in the tube; work the lever between shots", kind: "shot", mag: 14, reloads: 1, reload: 2.8, cool: 0.5, spread: 0.0008, box: 1, unit: "rounds", sound: "rifle", hold: "rifle", muz: [0, 0.035, 0.72] },
  shotgun: { name: "Coach Gun", short: "Shotgun", blurb: "Both barrels of buckshot: close, and wide", kind: "shot", mag: 2, reloads: 6, reload: 1.3, cool: 0.3, pellets: 9, spread: 0.045, range: 38, box: 3, unit: "shells", sound: "shotgun", hold: "rifle", muz: [0, 0.035, 0.56] },
  sharps: { name: "Sharps Buffalo Rifle", short: "Sharps", blurb: "One heavy round at a time, and a long brass scope", kind: "shot", mag: 1, reloads: 11, reload: 1.2, cool: 0.2, spread: 0, zoom: 3.2, box: 5, unit: "rounds", sound: "big", hold: "rifle", muz: [0, 0.035, 0.82] },
  bow: { name: "Bow and Arrows", short: "Bow", blurb: "Silent; the arrow drops as it flies: aim high far off", kind: "arrow", mag: 1, reloads: 14, reload: 0.5, cool: 0.1, speed: 50, grav: 9.8, box: 6, unit: "arrows", hold: "bow", muz: [0, 0, 0.13] },
  knives: { name: "Throwing Knives", short: "Knives", blurb: "End over end: lob them at the far ones", kind: "knife", mag: 1, reloads: 11, reload: 0.35, cool: 0.1, speed: 24, grav: 9.8, box: 6, unit: "knives", unit1: "knife", hold: "knife", muz: [0, 0, 0.17] },
  gatling: { name: "Gatling Gun", short: "Gatling", blurb: "Hold Fire and it cranks: a storm of lead, none of it careful", kind: "shot", auto: true, rate: 9, mag: 50, reloads: 1, reload: 3.2, cool: 0, spread: 0.018, box: 1, unit: "rounds", sound: "gatling", hold: "gatling", muz: [0, 0.04, 0.64] },
  dynamite: { name: "Dynamite", short: "Dynamite", blurb: "Light it, throw it, and it does the rest", kind: "bomb", mag: 1, reloads: 5, reload: 0.7, cool: 0.2, speed: 14, grav: 9.8, fuse: 1.7, radius: 3.8, box: 3, unit: "sticks", hold: "stick", muz: [0, 0.1, 0.02] },
};
const ARMS = { cur: null, own: null, models: {}, revKids: null, trig: false, autoT: 0, spin: 0, proj: [], stuck: [], drawT: 1, zoom: false, mode: "town", hudKey: "", ammo: {} };
const _am3 = new THREE.Vector3(), _am4 = new THREE.Vector3(), _am5 = new THREE.Vector3(), _amq = new THREE.Quaternion();
const armsDef = () => ARMS.cur ? ARMS_DEF[ARMS.cur] : null;
function armsMag() { const d = armsDef(); return d ? d.mag : SIEGE_ROUNDS; }
function armsReloads() { const d = armsDef(); return d ? d.reloads : GUN.reloads; }
function armsReload() { const d = armsDef(); return d ? d.reload : GUN.reload; }

// ---- the models: barrel (or blade, or arrow) along +z, your hand at the origin ----
function armsMats() { if (ARMS.mat) return ARMS.mat; const M = ARMS.mat = {
  iron: MAT.iron, wood: MAT.woodDark, brass: MAT.brass, ivory: new THREE.MeshStandardMaterial({ color: 0xe6dcc4, roughness: 0.45 }),
  steel: new THREE.MeshStandardMaterial({ color: 0xb8bcc0, metalness: 1, roughness: 0.22 }), blued: new THREE.MeshStandardMaterial({ color: 0x23272e, metalness: 0.9, roughness: 0.32 }),
  leather: new THREE.MeshStandardMaterial({ color: 0x4a2c18, roughness: 0.8 }), red: new THREE.MeshStandardMaterial({ color: 0xa8241a, roughness: 0.7 }), paper: new THREE.MeshStandardMaterial({ color: 0xd8c8a0, roughness: 0.9 }),
  feather: new THREE.MeshStandardMaterial({ color: 0xe8e0d0, roughness: 0.9, side: THREE.DoubleSide }), string: new THREE.MeshStandardMaterial({ color: 0xd8d0b8, roughness: 0.9 }), fuse: new THREE.MeshStandardMaterial({ color: 0x3a2e22, roughness: 1 }) }; return M; }
function armsPart(g, geo, mat, x, y, z, rx = 0, ry = 0, rz = 0) { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); m.castShadow = true; g.add(m); return m; }
const CYL = (r, l, n = 10, r2 = r) => new THREE.CylinderGeometry(r2, r, l, n).rotateX(Math.PI / 2); // (along z)
function armsBuild(id) {
  const M = armsMats(), g = new THREE.Group(), P = (geo, mat, x, y, z, rx, ry, rz) => armsPart(g, geo, mat, x, y, z, rx, ry, rz), B = (w, h, d) => new THREE.BoxGeometry(w, h, d);
  if (id === "colt") { const r = revolver(true); r.children[0].material = r.children[1].material = r.children[2].material = M.blued; g.add(r); } // (the barrel's revolver, blued)
  else if (id === "derringer") { for (const y of [0.046, 0.031]) P(CYL(0.0062, 0.075, 10), M.steel, 0, y, 0.035); P(B(0.022, 0.034, 0.05), M.steel, 0, 0.035, -0.012); P(B(0.018, 0.052, 0.022), M.ivory, 0, -0.002, -0.042, -0.65);
    P(B(0.005, 0.014, 0.006), M.steel, 0, 0.058, -0.03, -0.5); P(new THREE.TorusGeometry(0.009, 0.0018, 4, 10, Math.PI), M.steel, 0, 0.012, -0.012, 0, Math.PI / 2, Math.PI); }
  else if (id === "winchester") { P(B(0.03, 0.062, 0.16), M.brass, 0, 0.02, 0.02); P(CYL(0.0095, 0.62, 10), M.blued, 0, 0.037, 0.4); P(CYL(0.0075, 0.52, 10), M.blued, 0, 0.017, 0.36);
    P(B(0.034, 0.03, 0.22), M.wood, 0, 0.016, 0.2); P(B(0.034, 0.072, 0.34), M.wood, 0, -0.022, -0.23, 0.13); P(B(0.036, 0.08, 0.014), M.blued, 0, -0.045, -0.4, 0.13);
    P(new THREE.TorusGeometry(0.026, 0.0045, 5, 14), M.blued, 0, -0.035, 0.01, 0, Math.PI / 2, 0); P(B(0.006, 0.02, 0.012), M.blued, 0, 0.06, -0.04, -0.4); P(B(0.004, 0.012, 0.006), M.brass, 0, 0.05, 0.7); ARMS.lever = g.children[6]; }
  else if (id === "shotgun") { for (const x of [-0.011, 0.011]) P(CYL(0.0105, 0.5, 12), M.blued, x, 0.035, 0.31); P(B(0.012, 0.006, 0.5), M.blued, 0, 0.047, 0.31); P(B(0.044, 0.052, 0.1), M.iron, 0, 0.026, 0.01);
    for (const x of [-0.012, 0.012]) P(B(0.006, 0.022, 0.014), M.iron, x, 0.06, -0.035, -0.5); P(B(0.042, 0.026, 0.17), M.wood, 0, 0.014, 0.13); P(B(0.042, 0.078, 0.31), M.wood, 0, -0.024, -0.2, 0.15); }
  else if (id === "sharps") { P(new THREE.CylinderGeometry(0.0115, 0.0115, 0.78, 8).rotateX(Math.PI / 2), M.blued, 0, 0.035, 0.43); P(B(0.032, 0.062, 0.13), M.iron, 0, 0.02, 0.0); P(B(0.036, 0.076, 0.34), M.wood, 0, -0.024, -0.22, 0.12);
    P(B(0.034, 0.028, 0.26), M.wood, 0, 0.016, 0.17); P(CYL(0.011, 0.6, 12), M.brass, 0, 0.078, 0.22); P(CYL(0.017, 0.06, 12, 0.012), M.brass, 0, 0.078, 0.54); P(CYL(0.015, 0.05, 12), M.brass, 0, 0.078, -0.1);
    for (const z of [0.05, 0.38]) P(B(0.01, 0.034, 0.012), M.iron, 0, 0.057, z); P(B(0.006, 0.02, 0.012), M.iron, 0, 0.058, -0.05, -0.4); }
  else if (id === "bow") { const arc = new THREE.TorusGeometry(0.9, 0.012, 6, 28, 1.31); arc.rotateZ(-0.655); arc.rotateY(-Math.PI / 2); arc.translate(0, 0, -0.9); P(arc, M.wood, 0, 0, 0);
    P(B(0.03, 0.12, 0.034), M.leather, 0, 0, -0.002); const s = g.userData; s.string = [P(CYL(0.0016, 1, 4), M.string, 0, 0, 0), P(CYL(0.0016, 1, 4), M.string, 0, 0, 0)];
    const arrow = new THREE.Group(); armsArrowParts(arrow, M); arrow.position.set(0.012, 0.004, -0.6); g.add(arrow); s.arrow = arrow; armsBowString(g, 1); }
  else if (id === "knives") { const k = armsKnife(M); g.add(k); }
  else if (id === "gatling") { const spin = new THREE.Group(); spin.position.set(0, 0.04, 0.12); g.add(spin); for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; armsPart(spin, CYL(0.0085, 0.52, 8), M.blued, Math.cos(a) * 0.03, Math.sin(a) * 0.03, 0.24); }
    armsPart(spin, CYL(0.05, 0.012, 14), M.brass, 0, 0, 0.47); armsPart(spin, CYL(0.05, 0.012, 14), M.brass, 0, 0, 0.12); P(CYL(0.065, 0.2, 16), M.brass, 0, 0.04, 0.0); P(B(0.06, 0.09, 0.1), M.blued, 0, 0.125, 0.02);
    P(CYL(0.006, 0.08, 6), M.iron, 0.08, 0.04, -0.02, 0, Math.PI / 2, 0); P(B(0.012, 0.06, 0.012), M.iron, 0.12, 0.015, -0.02); P(CYL(0.008, 0.05, 6), M.wood, 0.14, -0.005, -0.02, 0, Math.PI / 2, 0);
    for (const x of [-0.035, 0.035]) P(B(0.018, 0.06, 0.02), M.wood, x, -0.03, -0.12, 0.3); g.userData.spin = spin; }
  else if (id === "dynamite") { const st = armsStick(M); g.add(st); g.userData.stick = st; }
  g.traverse(o => { if (o.isMesh) { o.frustumCulled = false; o.userData.dyn = true; } }); return g;
}
function armsArrowParts(a, M) { armsPart(a, CYL(0.0055, 0.72, 6), M.wood, 0, 0, 0.36); armsPart(a, new THREE.ConeGeometry(0.009, 0.035, 6).rotateX(Math.PI / 2), M.iron, 0, 0, 0.735);
  for (let i = 0; i < 3; i++) { const f = armsPart(a, new THREE.PlaneGeometry(0.014, 0.075), M.feather, 0, 0, 0.06); f.rotation.set(0, 0, i / 3 * TAU); f.position.set(Math.cos(i / 3 * TAU + Math.PI / 2) * 0.009, Math.sin(i / 3 * TAU + Math.PI / 2) * 0.009, 0.06); f.rotateY(Math.PI / 2); } return a; }
function armsKnife(M) { const k = new THREE.Group(), sh = new THREE.Shape([[0, 0], [0.014, 0], [0.012, 0.11], [0, 0.17], [-0.012, 0.11], [-0.014, 0]].map(p => new THREE.Vector2(p[0], p[1])));
  const bl = new THREE.ExtrudeGeometry(sh, { depth: 0.003, bevelEnabled: true, bevelThickness: 0.0012, bevelSize: 0.002, bevelSegments: 1 }); bl.translate(0, 0, -0.0015); bl.rotateX(Math.PI / 2); // (its length along z, flat across y)
  armsPart(k, bl, M.steel, 0, 0, 0.01); armsPart(k, new THREE.BoxGeometry(0.04, 0.008, 0.008), M.iron, 0, 0, 0.005); armsPart(k, CYL(0.009, 0.1, 8), M.leather, 0, 0, -0.05); return k; }
function armsStick(M) { const s = new THREE.Group(); armsPart(s, new THREE.CylinderGeometry(0.017, 0.017, 0.2, 12), M.red, 0, 0.1, 0); for (const y of [0.03, 0.17]) armsPart(s, new THREE.CylinderGeometry(0.0175, 0.0175, 0.02, 12), M.paper, 0, y, 0);
  armsPart(s, new THREE.CylinderGeometry(0.0022, 0.0022, 0.06, 5), M.fuse, 0.004, 0.23, 0, 0, 0, 0.25); return s; }
// the bow's string: straight, or drawn back to the arrow's nock
function armsBowString(g, drawn) { const S = g.userData, tipU = V3(0, 0.548, -0.188), tipD = V3(0, -0.548, -0.188), nock = V3(0, 0, lerp(-0.2, -0.6, drawn));
  [[tipU, nock], [tipD, nock]].forEach(([a, b], i) => { const m = S.string[i], d = _am3.subVectors(b, a), L = d.length(); m.position.copy(a).addScaledVector(d, 0.5); m.scale.set(1, 1, L); m.quaternion.setFromUnitVectors(_am4.set(0, 0, 1), d.divideScalar(L)); });
  if (S.arrow) S.arrow.position.z = lerp(-0.2, -0.6, drawn); }

// ---- taking one up: its model in the first-person gun's place ----
function armsEquip(id) {
  const vm = SIEGE.vm.gun; if (!ARMS.revKids) ARMS.revKids = vm.children.slice();
  for (const c of vm.children.slice()) vm.remove(c);
  if (id) { const m = ARMS.models[id] || (ARMS.models[id] = armsBuild(id)); vm.add(m); if (m.userData.string) { m.updateMatrixWorld(true); armsBowString(m, 1); } }
  else for (const c of ARMS.revKids) vm.add(c);
  ARMS.cur = id || null; ARMS.trig = false; ARMS.zoom = false; ARMS.hudKey = ""; gunHud.key = null; armsScope(false); SIEGE.occ = null;
}
// the revolver back in its place; whatever's flying or stuck in things cleared
function armsReset() { if (ARMS.revKids && ARMS.cur) armsEquip(null); ARMS.cur = null; ARMS.trig = false; armsScope(false);
  for (const p of ARMS.proj) { if (p.mesh) R.scene.remove(p.mesh); if (p.spark) R.scene.remove(p.spark); } ARMS.proj = []; for (const s of ARMS.stuck) R.scene.remove(s.mesh); ARMS.stuck = []; }
// a full load of it (in hand from the range, or drawn, or at the start of a shootout)
function armsLoad(o) { const d = armsDef(); if (!d) return; o.bullets = d.mag; o.reloads = d.reloads; o.reloadT = 0; }
// what's left in it when it's put away (holstered, or the revolver put back on the barrel), for when it's taken up again in the same
// round; each its own (ARMS.ammo: by weapon, "rev" the barrel's revolver). A new round, a full load
function armsStash() { const A = ARMED; ARMS.ammo[ARMS.cur || "rev"] = { b: A.bullets, r: A.reloads, rt: A.reloadT, round: STATE.roundId }; }
function armsUnstash(id) { const A = ARMED, s = ARMS.ammo[id || "rev"];
  if (s && s.round === STATE.roundId) { A.bullets = s.b; A.reloads = s.r; A.reloadT = s.rt; } else if (id) { const d = ARMS_DEF[id]; A.bullets = d.mag; A.reloads = d.reloads; A.reloadT = 0; }
  else { A.bullets = SIEGE_ROUNDS; A.reloads = GUN.reloads; A.reloadT = 0; } }

// ---- where it's held: called after the gun's been placed the revolver's way (12d siegeLate, 12q armedLate) ----
function armsVmPose(vm, cam, k, down, rl) {
  const d = armsDef(); if (!d) return; const th = Math.tan(THREE.MathUtils.degToRad(cam.fov) / 2), hw = q => q * th * cam.aspect, hh = q => q * th, toW = (x, y, z) => _am3.set(x, y, z).applyMatrix4(cam.matrixWorld);
  const draw = 1 - Ease.inOut(clamp(ARMS.drawT, 0, 1)), dip = down + draw * 0.35 + rl * 0.1, m = vm.children[0], H = d.hold;
  // where the hand is: across (a part of the half-width, capped for a wide screen), down (a part of the half-height), how far in front, and how big.
  // A phone held upright has little width: a long gun comes up from the foot of the screen to the sight, so it doesn't stand in front of it
  const P = { pistol: [0.46, 0.2, -0.56, 0.62, 0.8], rifle: [0.55, 0.16, -0.95, 0.5, 1], gatling: [0.4, 0.14, -1.12, 0.62, 0.88], bow: [-0.3, -0.12, -0.18, 0.9, 0.72],
    knife: [0.62, 0.16, -0.75, 0.45, 1.05], stick: [0.55, 0.15, -0.72, 0.48, 0.8] }[H], [sx, cap, sy, z, sc] = P;
  vm.scale.setScalar(sc * (d.view || 1)); const x = sx >= 0 ? Math.min(cap, hw(z) * sx) : Math.max(cap, hw(z) * sx);
  vm.position.copy(toW(x, hh(z) * sy - dip + k * 0.02, -z + k * (H === "rifle" ? 0.05 : 0.04)));
  vm.lookAt(toW(0, 0, -25)); vm.rotateX(-k * (H === "rifle" ? 0.25 : H === "gatling" ? 0.08 : 0.5) + rl * 0.9);
  if (d.turn) vm.rotateY(d.turn); // (the Derringer turned a little, so it's seen as a gun, not the back of one)
  if (H === "bow") vm.rotateZ(-0.2); else if (H === "knife") { vm.rotateX(-0.95); vm.rotateZ(0.5); } else if (H === "stick") { vm.rotateX(-0.9); vm.rotateZ(-0.4); }
  if (m && m.userData.spin) m.userData.spin.rotation.z = ARMS.spin;
  if (m && m.userData.string) { const a = m.userData.arrow; a.visible = armsReady(); armsBowString(m, a.visible ? 1 - Math.max(0, ARMS.snap) : 0); }
  if ((H === "knife" || H === "stick") && m) m.visible = armsReady();
  if (ARMS.zoom) vm.visible = false;
}
// something in hand to throw or loose (not mid-reload)
function armsReady() { const o = armsAmmo(); return !!o && o.bullets > 0 && !(o.reloadT > 0); }
function armsAmmo() { return ARMS.mode === "siege" ? SIEGE : ARMED; }

// ---- firing ----
// Fire pressed (and, for the Gatling, held: armsTrigger)
function armsFire(mode) {
  const d = armsDef(); if (!d) return; if (mode === "range" && (RANGE.pickOpen || !$("rangeRes").hidden)) return; ARMS.mode = mode; // (not with the picker or the score up)
  if (d.auto) { ARMS.trig = true; if (ARMS.autoT <= 0) armsShoot(mode); return; }
  armsShoot(mode);
}
function armsTrigger(on) { if (!on) ARMS.trig = false; }
function armsShoot(mode) {
  const d = armsDef(), o = armsAmmo(), S = SIEGE; if (!d) return false;
  if (o.reloadT > 0) return false;
  if (o.bullets <= 0) { if (o.cool <= 0) { Sound.clip("dry0", null, 0.9, 0, 0.05); o.cool = 0.3; } ARMS.trig = false; return false; }
  if (o.cool > 0) return false;
  o.bullets--; o.shots = (o.shots || 0) + 1; o.cool = d.cool; ARMS.autoT = d.auto ? 1 / d.rate : 0; S.recoil = d.hold === "rifle" ? 1.25 : d.auto ? 0.35 : d.kind === "shot" ? 1 : 0.3; S.vm.kick = d.kind === "shot" ? 1 : 0.4;
  R.camera.updateMatrixWorld(); const ro = R.camera.position.clone(), rd = V3(0, 0, -1).applyQuaternion(R.camera.quaternion).normalize(), vm = S.vm.gun; vm.updateMatrixWorld(true);
  const muz = vm.localToWorld(V3(...d.muz));
  armsSound(d, muz);
  if (d.kind === "shot") { muzzleFlash(muz, d.hold === "pistol" ? (ARMS.cur === "derringer" ? 0.2 : 0.32) : d.pellets ? 0.55 : 0.42); CAM.shake = Math.max(CAM.shake, d.hold === "rifle" ? 0.5 : d.auto ? 0.15 : 0.35);
    const n = d.pellets || 1, killed = new Set();
    for (let i = 0; i < n; i++) { const dir = rd.clone(); if (d.spread) { const a = Math.random() * TAU, r = d.spread * Math.sqrt(Math.random()), u = _am3.set(1, 0, 0).applyQuaternion(R.camera.quaternion), w = _am4.set(0, 1, 0).applyQuaternion(R.camera.quaternion);
        dir.addScaledVector(u, Math.cos(a) * r).addScaledVector(w, Math.sin(a) * r).normalize(); }
      const h = armsHit(mode, ro, dir, d.range || 140, killed); if (h) h.apply(); if (mode === "town" && !ARMED.on) break; } // (a townsman shot: the shootout's begun, the rest of the shot's gone with it)
    if (ARMS.cur === "winchester") setTimeout(() => Sound.clip(siegePick("cock", 2), null, 0.55, 0, 0.05, 1.15), 220);
    if (ARMS.cur === "sharps" || ARMS.cur === "shotgun") setTimeout(() => Sound.hammer(), 260); }
  else { const h = armsHit(mode, ro, rd, 80), aim = ro.clone().addScaledVector(rd, h ? Math.max(3, h.t) : 40); armsThrow(d, mode, muz, aim.sub(muz).normalize()); } // (thrown from the hand at what's under the sight)
  crowsStartle(ro, d.kind === "shot" ? 30 : 8, d.kind === "shot" ? 0.45 : 0.2);
  armsAfterShot(mode); return true;
}
// what happens once it's fired: a reload when it's empty and there's one; the shootout decided; the town startled
function armsAfterShot(mode) {
  const d = armsDef(), S = SIEGE; if (S.on) mode = ARMS.mode = "siege"; const o = armsAmmo(); // (a townsman shot: it's the shootout now, with what's left in the gun)
  if (mode === "town" && ARMED.on && !ARMED.range && d.kind === "shot") armedStartle();
  if (o.bullets <= 0 && o.reloads > 0) { if (mode === "siege") siegeReload(); else { if (!ARMED.range) o.reloads--; o.reloadT = d.reload; Sound.cap(null); } }
  if (mode === "siege") { siegeHud(); armsSiegeCheck(); } else if (ARMED.on) armedHud();
}
function armsSiegeCheck() { const S = SIEGE; if (S.phase !== "fight" && S.phase !== "doomed") return; const left = S.enemies.filter(E => E.alive).length;
  if (!left) { siegeWin(); return; } if (S.bullets <= 0 && S.reloads <= 0 && S.reloadT <= 0 && S.phase === "fight" && !ARMS.proj.some(p => p.live && p.mode === "siege")) siegeDoomed(); }
function armsSound(d, at) {
  const id = ARMS.cur, sh = (r, g, w = 0.32) => Sound.clip(siegePick("shot", 3), null, g, 0, w, r * rnd(0.97, 1.03));
  if (id === "colt") sh(1, 1.15); else if (id === "derringer") sh(1.3, 0.75, 0.2); else if (id === "winchester") { sh(0.86, 1.25, 0.4); Sound.crack(null, 0.5); } else if (id === "shotgun") { sh(0.7, 1.35, 0.45); sh(0.78, 0.8, 0.45); }
  else if (id === "sharps") { sh(0.62, 1.45, 0.55); Sound.crack(null, 0.8); } else if (id === "gatling") { sh(1.12, 0.7, 0.25); Sound.click(); }
  else if (id === "bow") { Sound.swish(at, 0.6, 0.25); Sound.knock(at, 0.25); } else if (id === "knives") Sound.swish(at, 0.9, 0.3); else if (id === "dynamite") { Sound.swish(at, 0.7, 0.35); Sound.sizzle(at, 0.4); }
}
// the first thing a shot along ro + t rd (t up to far) meets, and what to do about it. "town": the round, with the revolver's rules (the
// townsfolk, the executioner and the host start the shootout; the condemned man is never hit); "siege": the shootout; "range": 12u
function armsHit(mode, ro, rd, far, killed) {
  if (mode === "range") return rangeHit(ro, rd, far, killed);
  const S = SIEGE, cands = [], add = (t, f) => { if (t > 0 && t <= far) cands.push([t, f]); };
  if (mode === "siege") { for (const E of S.enemies) { if (!E.alive || (killed && killed.has(E))) continue; const dist = E.a.ch.bones.Spine2.getWorldPosition(_am5).distanceTo(ro), h = rayActor(E.a, ro, rd, E.female, clamp((dist - 12) * 0.007, 0, 0.12));
      if (h) add(h.t, at => { if (killed) killed.add(E); shotHits(E, h.part, at, rd); }); }
    const tg = targetRay(ro, rd); if (tg) add(tg.t, at => targetShot(tg, at, rd)); }
  else { for (const a of [...LIFE.crowd.filter(q => q.root.visible), EXEC, ...(HOST.root.visible && !HOST.hang ? [HOST] : [])]) { const dist = a.ch.bones.Spine2.getWorldPosition(_am5).distanceTo(ro), h = rayActor(a, ro, rd, armedFemale(a), clamp((dist - 12) * 0.007, 0, 0.12));
      if (h) add(h.t, at => { if (ARMED.on) armedShootout(a, h.part, at, rd); }); } }
  const bt = bellRay(ro, rd); add(bt, at => bellShot(at, rd)); const cr = crowRay(ro, rd); if (cr) add(cr.t, at => crowShot(cr.c, at, rd));
  const hr = townHorseRay(ro, rd); if (hr) add(hr.t, at => horseShot(hr.H, at, rd)); const env = sceneryRay(ro, rd, far); if (env) add(env.distance, () => envShot(env, rd));
  cands.sort((a, b) => a[0] - b[0]); const c = cands[0]; if (!c) return null; const at = ro.clone().addScaledVector(rd, c[0]);
  return { t: c[0], at, apply: () => { c[1](at); crowsStartle(at, 5, 1.2); } };
}

// ---- arrows, knives and dynamite: they fly, drop, and strike (or land and go off) ----
function armsThrow(d, mode, muz, rd) {
  const M = armsMats(), mesh = new THREE.Group(); let spinAx = null;
  if (d.kind === "arrow") armsArrowParts(mesh, M); else if (d.kind === "knife") { mesh.add(armsKnife(M)); spinAx = V3(1, 0, 0); } else { mesh.add(armsStick(M)); spinAx = V3(rnd(-1, 1), 1, 0.3).normalize(); }
  mesh.traverse(q => { if (q.isMesh) { q.castShadow = true; q.userData.dyn = true; } }); R.scene.add(mesh);
  const lift = d.kind === "arrow" ? 0.02 : d.kind === "knife" ? 0.06 : 0.18, v = rd.clone().multiplyScalar(d.speed); v.y += d.speed * lift;
  const p = { kind: d.kind, mode, mesh, pos: muz.clone(), vel: v, t: 0, live: true, spinAx, spin: 0, fuse: d.fuse || 0, landed: false, def: d };
  if (d.kind === "bomb") { p.spark = armsSpark(); }
  mesh.position.copy(p.pos); ARMS.proj.push(p); ARMS.snap = 1;
}
function armsSpark() { const s = new THREE.Sprite(new THREE.SpriteMaterial({ fog: false, map: starTex(), color: new THREE.Color(1.6, 1.1, 0.5), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true })); s.renderOrder = 6; R.scene.add(s); return s; }
function armsProjStep(p, dt) {
  const d = p.def; if (!p.live) return; p.t += dt;
  if (p.kind === "bomb") { p.fuse -= dt; if (p.spark) { const tip = p.mesh.localToWorld(_am3.set(0.008, 0.26, 0)); p.spark.position.copy(tip); p.spark.scale.setScalar(rnd(0.06, 0.14)); p.spark.material.rotation += dt * 9; }
    if (p.fuse <= 0) { armsBlast(p.mode, p.pos.clone(), d.radius); armsProjEnd(p); return; } if (p.landed) return; }
  const prev = _am4.copy(p.pos); p.vel.y -= d.grav * dt; p.pos.addScaledVector(p.vel, dt); const seg = _am5.subVectors(p.pos, prev), L = seg.length(); if (L < 1e-6) return; const dir = seg.clone().divideScalar(L);
  let h = p.kind === "bomb" && p.t < 0.06 ? null : armsHit(p.mode, prev.clone(), dir, L);
  const gy = groundVis(p.pos.x, p.pos.z); if (!h && p.pos.y < gy + 0.02) h = { t: L, at: V3(p.pos.x, gy + 0.02, p.pos.z), ground: true, apply: () => {} };
  if (h) { const at = h.at;
    if (p.kind === "bomb") { p.pos.copy(at).addScaledVector(dir, -0.05); p.pos.y = Math.max(p.pos.y, groundVis(p.pos.x, p.pos.z) + 0.03); p.landed = true; p.vel.set(0, 0, 0); Sound.knock(at, 0.4); p.mesh.position.copy(p.pos); p.mesh.rotation.set(0, Math.random() * TAU, Math.PI / 2); return; }
    h.apply(); Sound.thud(at, 0.35); if (p.kind === "knife") Sound.tinTick(at, 0.5);
    p.mesh.position.copy(at).addScaledVector(dir, p.kind === "arrow" ? -0.62 : -0.08); p.mesh.quaternion.setFromUnitVectors(V3(0, 0, 1), dir); ARMS.stuck.push({ mesh: p.mesh, t: 9, mode: p.mode }); p.live = false; p.mesh = null;
    if (p.mode === "siege") armsSiegeCheck(); return; }
  p.mesh.position.copy(p.pos);
  if (p.kind === "arrow") p.mesh.quaternion.setFromUnitVectors(V3(0, 0, 1), dir); else { p.spin += dt * (p.kind === "knife" ? 18 : 7); _amq.setFromUnitVectors(V3(0, 0, 1), dir); p.mesh.quaternion.copy(_amq).multiply(new THREE.Quaternion().setFromAxisAngle(p.spinAx, p.spin)); }
  if (p.t > 6) armsProjEnd(p);
}
// whatever's in the air or stuck in things from one place (the range, left behind): gone
function armsDropProj(mode) { for (const p of ARMS.proj) if (p.mode === mode) { p.live = false; if (p.mesh) R.scene.remove(p.mesh); if (p.spark) R.scene.remove(p.spark); p.mesh = p.spark = null; }
  ARMS.proj = ARMS.proj.filter(p => p.live); for (const s of ARMS.stuck) if (s.mode === mode) { R.scene.remove(s.mesh); s.t = 0; } ARMS.stuck = ARMS.stuck.filter(s => s.t > 0); }
function armsProjEnd(p) { p.live = false; if (p.mesh) R.scene.remove(p.mesh); if (p.spark) R.scene.remove(p.spark); p.mesh = p.spark = null; if (p.mode === "siege") armsSiegeCheck(); }
// dynamite going off: everyone and everything within its reach
function armsBlast(mode, at, rad) {
  Sound.bang(at); Sound.clip(siegePick("shot", 3), at, 1.4, 0, 0.6, 0.5); CAM.shake = Math.max(CAM.shake, clamp(1.6 - at.distanceTo(R.camera.position) / 25, 0.3, 1.4));
  muzzleFlash(at.clone().add(V3(0, 0.4, 0)), 2.6); for (let i = 0; i < 3; i++) puff(at.clone().add(V3(rnd(-0.4, 0.4), 0.2, rnd(-0.4, 0.4))), 30, 1.6, 0.9, 2.6, 0.75, i ? 0x6a5a4a : 0x8a7058);
  const S = SIEGE, dirFrom = p => p.clone().sub(at).setY(0.3).normalize();
  if (mode === "range") { rangeBlast(at, rad); return; }
  if (mode === "town") { const hit = [...LIFE.crowd.filter(q => q.root.visible), EXEC, ...(HOST.root.visible && !HOST.hang ? [HOST] : [])].filter(a => a.ch.bones.Spine2.getWorldPosition(_am3).distanceTo(at) < rad);
    if (hit.length && ARMED.on) { const first = hit.find(a => a !== HOST) || hit[0], sp = first.ch.bones.Spine2.getWorldPosition(V3()); armedShootout(first, SIEGE_PARTS[2], sp, dirFrom(sp)); mode = "siege"; } }
  if (mode === "siege") for (const E of S.enemies) { if (!E.alive) continue; const sp = E.a.ch.bones.Spine2.getWorldPosition(V3()); if (sp.distanceTo(at) < rad) shotHits(E, SIEGE_PARTS[2], sp, dirFrom(sp)); }
  for (const c of CROWS.list) { if (c.state === "away" || c.state === "meat" || !c.root.visible) continue; const cp = c.body.getWorldPosition(V3()); if (cp.distanceTo(at) < rad * 1.3) crowShot(c, cp, dirFrom(cp)); }
  crowsStartle(at, 40, 1.5); if (mode === "siege") armsSiegeCheck();
}
// each frame: projectiles, the Gatling's crank, reloads in the range, what's stuck in things fading, the draw
function updateArms(rdt) {
  const d = armsDef(); ARMS.drawT = Math.min(1, ARMS.drawT + rdt / 0.35); ARMS.snap = Math.max(0, (ARMS.snap || 0) - rdt / 0.3);
  for (const p of ARMS.proj) armsProjStep(p, Math.min(rdt, 0.05)); ARMS.proj = ARMS.proj.filter(p => p.live || p.mesh);
  for (const s of ARMS.stuck) { s.t -= rdt; if (s.t <= 0) R.scene.remove(s.mesh); } ARMS.stuck = ARMS.stuck.filter(s => s.t > 0);
  if (!d) return; const live = (ARMS.mode === "siege" && SIEGE.on) || ARMED.on;
  if (d.auto) { ARMS.autoT -= rdt; const spinning = ARMS.trig && live; ARMS.spinV = lerp(ARMS.spinV || 0, spinning ? 22 : 0, Math.min(1, rdt * (spinning ? 6 : 2))); ARMS.spin += ARMS.spinV * rdt;
    if (spinning && ARMS.autoT <= 0) { if (ARMS.mode === "siege") { const S = SIEGE; if (S.crouch || S.run || S.cv > 0.5) { ARMS.trig = false; nudgeAim(); } else armsShoot("siege"); } else armsShoot(ARMS.mode); } }
}
// the Sharps' scope: a tap of Scope looks down it (the view narrowed, a dark round edge, the gun gone from view)
function armsScope(on) { ARMS.zoom = !!on && ARMS.cur === "sharps"; const sc = $("scope"); if (sc) sc.hidden = !ARMS.zoom; const b = $("scopeBtn"); if (b) b.classList.toggle("on", ARMS.zoom); }
function armsFov(fov) { const d = armsDef(); return ARMS.zoom && d && d.zoom ? fov / d.zoom : fov; }

// ---- the cylinder at the top left: the weapon's own sign and what's in it ----
const ARMS_GLYPH = { colt: "M-26 -6h40v8h-24l-6 18h-10l4-18z", derringer: "M-14 -6h26v7h-14l-4 13h-8l3-13z", winchester: "M-34 -4h68v5h-46l-8 9h-14v-5h10z", shotgun: "M-34 -7h68v4h-68zM-34 -1h68v4h-48l-8 8h-12z",
  sharps: "M-34 -2h68v5h-48l-8 8h-12zM-16 -12h34v5h-34z", bow: "M-6 -32Q22 0 -6 32M-6 -32L-6 32M-14 0h40", knives: "M-28 3h22v-6h-22zM-6 -4l34 4-34 4z", gatling: "M-30 -10h52v20h-52zM22 -6h12M22 0h12M22 6h12", dynamite: "M-24 -8h40v16h-40zM16 0q8-10 16-4" };
function armsHud(o) {
  const d = armsDef(); if (!d || !o) return; const key = `${ARMS.cur}|${o.bullets}|${o.reloads}|${o.reloadT > 0}|${ARMED.range}`; if (ARMS.hudKey === key) return; ARMS.hudKey = key;
  const thin = ARMS.cur === "bow" ? `fill="none" stroke="#e8d8b0" stroke-width="5" stroke-linecap="round"` : `fill="#e8d8b0"`;
  $("cyl").innerHTML = `<circle r="46" fill="#3a3430" stroke="#14110f" stroke-width="3"/><circle r="40" fill="none" stroke="#5b524a" stroke-width="1.5"/><g transform="translate(0 -12) scale(0.8)"><path d="${ARMS_GLYPH[ARMS.cur]}" ${thin}/></g>`
    + `<text y="30" text-anchor="middle" font-size="26" font-weight="700" fill="${o.bullets ? "#d8a246" : "#8a4a3a"}" font-family="system-ui,sans-serif">${o.reloadT > 0 ? "…" : o.bullets}</text>`;
  const rb = $("reloads"); rb.style.display = ""; rb.style.visibility = ""; rb.classList.remove("many", "used"); const spare = ARMED.range && ARMED.on ? "∞" : `+${o.reloads * d.mag}`;
  rb.innerHTML = `<span class="armsSpare">${spare}</span>`; $("gun").classList.toggle("reloading", o.reloadT > 0);
  $("gun").title = `${d.name}: ${o.bullets} loaded, ${ARMED.range && ARMED.on ? "plenty more" : `${o.reloads * d.mag} more ${d.unit}`}`; $("gun").setAttribute("aria-label", $("gun").title);
}
