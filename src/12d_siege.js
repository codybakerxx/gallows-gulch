// ---------- THE SIEGE AT THE GALLOWS ----------
// When he hangs, a sword leaning on a leg of the platform glints, and after four seconds the GAME OVER sign comes up; until you start
// another round it can still be taken up. Tap it and he's cut down, and you are him: the seven who came to watch him die (six townsfolk and
// the executioner) draw on you, and two more come up on the roofs behind the false fronts of the sheriff's office and the general store.
// Six in the gun and one reload (GUN: twelve rounds for the nine of them), and the reload is automatic: the moment the cylinder's empty
// it's open and refilling, and you can't fire till it's done. Every shot spends one, hit or miss. Run dry with the reload spent and any
// of them still standing and they know it (siegeDoomed): they take turns shooting you, a heart a shot, cover or no cover. Five hearts.
// You stay down behind cover except while you hold the left half of the pad (Aim): then you rise and drag to aim, and the right half
// fires. Let go and you duck, and while you've a bullet left nothing can touch you there. Tap a barrel, the crates or the hay to run to
// it. One gunman at a time takes aim, only one with a clear line to you, and nobody can hit you until 0.3 seconds after you come up.
// Most often it's one on your screen; one you can't see takes longer about it, and a red arc round the crosshair points his way. They
// don't stand still long, a few of their spots are behind a trough, crates or barrels (ENEMY_COVER), and the men on the roofs duck out
// of sight between shots. Now and then one of them calls out to you (taunt). Every hit you take shows: the heart breaks in the top bar
// and a banner says how many you've got left.
// your revolver and your hearts: the same in the shootout and in the getaway (12g), and drawn the same way in the top bar (gunHud)
const GUN = { rounds: 6, reloads: 1, reload: 1.6, hearts: 5 }; // (rounds in the cylinder; reloads you get, each automatic when it's empty; seconds a reload takes)
const SIEGE_CFG = { window: 4.0, bullets: GUN.rounds, health: GUN.hearts, grace: 2.5, telegraph: 0.3, gap: [1.8, 3.0], hitUp: 0.5, hitRun: 0.3, react: 0.3,
  speed: [3.0, 3.7], hold: [0.8, 1.9], // how fast they dash between their spots (m/s), and how long they hold each one
  eye: 1.56, crouchEye: 0.72, sens: 0.0042, yawLim: 1.2, pitchLo: -1.0, pitchHi: 0.5, fireCool: 0.4, runSpeed: 4.2,
  doom: [1.3, 0.85], // out of bullets: the first of them takes aim this long after your last shot, and the next every 0.85 s after
  tauntGap: 7, hideTaunt: 8, // at least 7 s between taunts; 8 s down behind cover and they call you out
  offAim: 0.5, // a man taking aim from outside your view takes this much longer about it: the red arc gives you the time to get down
  roofSpeed: 1.5, duck: -1.15 }; // the men on the roofs: how fast they move bent double behind the false front, and how far down that puts them
const SIEGE = { on: false, phase: null, winLeft: 0, bullets: GUN.rounds, reloads: GUN.reloads, reloadT: 0, health: GUN.hearts, holding: false, keyAim: false, scanT: 0, upT: 0, enemies: [], cover: 1, cv: 1, crouch: true, run: null, yaw: 0, pitch: 0,
  recoil: 0, cool: 0, nextShot: 0, t: 0, used: {}, spawned: [], pool: [], hiddenCrowd: [], fx: [], pools: [], drops: [], occ: null, aimId: null, hurt: 0, hbT: 0,
  sword: null, vm: null, swing: -1, coughT: 0, flash: 0, flashPos: new THREE.Vector3(), tip: 0, tipNext: null, deadT: 0,
  shots: 0, downT: 0, aims: 0, said: new Set(), tauntT: 0, talkUntil: 0, wordsAt: 0, lastAt: 0, doomT: 0, doomI: 0, doomSaid: false, hitT: 0 };
const _s1 = new THREE.Vector3(), _s2 = new THREE.Vector3(), _s3 = new THREE.Vector3(), _s4 = new THREE.Vector3(), _sq = new THREE.Quaternion(), _sm = new THREE.Matrix4(), _sm2 = new THREE.Matrix4();
const SIEGE_FOCUS = V3(-2.9, 1.9, -5.4); // what the player faces from cover: the gallows and the crowd round it
// where the player can hide: a pair of barrels, a stack of crates, two hay bales, out in the street facing the gallows
const COVERS = [{ at: [-5.6, 1.55], kind: "barrels" }, { at: [-1.3, 2.1], kind: "crates" }, { at: [3.6, 2.2], kind: "hay" }];
// where the townsfolk fight from, two spots each to move between (index = crowd member), and the executioner on the front of the deck
const SIEGE_SPOTS = [[[-6.8, -2.4], [-7.6, -1.2]], [[-8.0, -4.6], [-7.3, -3.4]], [[1.5, -6.3], [2.6, -6.9]], [[-0.3, -8.4], [1.2, -8.9]],
  [[-7.75, -6.0], [-8.5, -7.5]], [[2.2, -3.3], [3.1, -4.5]]];
const EXEC_SPOTS = [[-4.55, -4.15], [-4.5, -5.95]]; // (up and down the deck beside the lever, clear of the trap: a shot doesn't tip him down through it)
// and two more on the roofs, behind the false fronts of the sheriff's office and the general store. Each has a spot either side of the ridge,
// up near it, where the false front comes no higher than his hips: standing, you see him from the waist up (from the street, looking up and
// across, from the chest up); ducked, he's out of sight (crossing the ridge his hat shows)
const ROOF_MEN = [
  { roof: "SHERIFF", vr: 1.04, spec: { body: { coat: true, kerchief: true }, shirt: 0x7a6a52, trousers: 0x2e2822, coat: 0x4a3c2c, kerchief: 0x6a1e16, skin: { tint: 0xd2a284, hair: 0x2a1c12, stubble: 0.8 }, hat: { color: 0x2c241c, y: 2.93 } } },
  { roof: "GENERAL STORE", vr: 0.95, spec: { body: { vest: true, kerchief: true }, shirt: 0xa89878, trousers: 0x3a3430, vest: 0x2a2018, kerchief: 0x2a3a52, skin: { tint: 0xe0b89c, hair: 0x5a3a22, stubble: 0.5 }, hat: { color: 0x6a5238, y: 2.94, tilt: 0.04 } } }];
const ROOF_SPOT = 1.1; // (how far either side of the ridge, along the front: the roof there sits 0.66 m below the top of the false front)
function roofSpot(Rf, lx, back = 0.32) { const p = roofWorld(Rf, lx, 0, Rf.d / 2 - back); return [p.x, p.z]; }
// cover for the gunmen, set out (like yours) only for the fight: a water trough, a stack of crates and a pair of barrels, each a stride
// in front of one man's near spot, square to your side of the street. From some of your covers it hides his legs or his side; from
// others he's in the open. [kind, x, z, turn]
const ENEMY_COVER = [["trough", 1.56, -2.28, -0.56], ["crates", -5.82, -1.68, 0.92], ["barrels", 1.1, -5.05, -0.3]];
const SIEGE_CLIPS = ["shot0", "shot1", "shot2", "far0", "far1", "far2", "far3", "wood0", "wood1", "wood2", "wood3", "whiz0", "whiz1", "whiz2",
  "painm0", "painm1", "painm2", "painm3", "painm4", "painm5", "painm6", "painf0", "painf1", "painf2", "hurt0", "hurt1", "hurt2", "cough0", "cough1",
  "sword0", "cut0", "dry0", "cock0", "cock1", "taunt0", "taunt1", "taunt2", "taunt3", "taunt4", "taunt5", "taunt6",
  "neck0", "crows", "flap0", "flap1", "glass0", "glass1", "glass2", "pane0", "pane1", "pane2", "tin0", "tin1", "tin2", "ric0", "ric1", "ric2", "keg0", "keg1", "keg2", "horse0", "horse1", "horse2"]; // (v35: the neck, the crows, the things to shoot: 10c, 12j; v36: a horse shot, 12l)
const rnd = (a, b) => a + Math.random() * (b - a);
// a clip from a set, never the same one twice in a siege while any are left unplayed
function siegePick(prefix, n) { const u = SIEGE.used[prefix] || (SIEGE.used[prefix] = new Set()); if (u.size >= n) u.clear();
  let i; do { i = Math.random() * n | 0; } while (u.has(i)); u.add(i); return prefix + i; }

// ---- props: the sword, the cover, the guns, muzzle flashes, blood ----
function starTex() {
  const c = document.createElement("canvas"); c.width = c.height = 128; const g = c.getContext("2d"), r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  r.addColorStop(0, "rgba(255,255,255,1)"); r.addColorStop(0.035, "rgba(255,250,232,0.85)"); r.addColorStop(0.11, "rgba(255,226,170,0.16)"); r.addColorStop(0.32, "rgba(255,210,140,0.03)"); r.addColorStop(1, "rgba(255,200,120,0)");
  g.fillStyle = r; g.fillRect(0, 0, 128, 128); g.globalCompositeOperation = "lighter";
  for (const [w, a, L] of [[1.6, 0, 64], [1.6, Math.PI / 2, 64], [0.9, Math.PI / 4, 34], [0.9, -Math.PI / 4, 34]]) { g.save(); g.translate(64, 64); g.rotate(a);
    const l = g.createLinearGradient(-L, 0, L, 0); l.addColorStop(0, "rgba(255,240,210,0)"); l.addColorStop(0.5, "rgba(255,252,240,1)"); l.addColorStop(1, "rgba(255,240,210,0)");
    g.fillStyle = l; g.beginPath(); g.moveTo(-L, 0); g.lineTo(0, -w); g.lineTo(L, 0); g.lineTo(0, w); g.fill(); g.restore(); }
  return canvasTex(c);
}
function flashTex() { // a ragged burst of flame for muzzle flashes
  const c = document.createElement("canvas"); c.width = c.height = 128; const g = c.getContext("2d");
  for (let k = 0; k < 9; k++) { const a = k / 9 * TAU + Math.random() * 0.3, L = 34 + Math.random() * 28; g.save(); g.translate(64, 64); g.rotate(a);
    const l = g.createLinearGradient(0, 0, L, 0); l.addColorStop(0, "rgba(255,246,210,1)"); l.addColorStop(0.5, "rgba(255,170,60,0.7)"); l.addColorStop(1, "rgba(255,90,20,0)");
    g.fillStyle = l; g.beginPath(); g.moveTo(0, -7); g.lineTo(L, 0); g.lineTo(0, 7); g.fill(); g.restore(); }
  const r = g.createRadialGradient(64, 64, 0, 64, 64, 30); r.addColorStop(0, "rgba(255,255,240,1)"); r.addColorStop(1, "rgba(255,200,100,0)"); g.fillStyle = r; g.fillRect(0, 0, 128, 128);
  return canvasTex(c);
}
function splatTex() { // a pool of blood: an irregular blot with a few satellite drops (alpha only)
  const c = document.createElement("canvas"); c.width = c.height = 256; const g = c.getContext("2d"); g.fillStyle = "#000"; g.fillRect(0, 0, 256, 256); g.fillStyle = "#fff";
  g.beginPath(); for (let k = 0; k <= 40; k++) { const a = k / 40 * TAU, r = 78 + 18 * Math.sin(a * 3 + 1) + 12 * Math.sin(a * 7) + Math.random() * 8; k ? g.lineTo(128 + Math.cos(a) * r, 128 + Math.sin(a) * r) : g.moveTo(128 + Math.cos(a) * r, 128 + Math.sin(a) * r); } g.fill();
  for (let k = 0; k < 9; k++) { const a = Math.random() * TAU, r = 95 + Math.random() * 25; g.beginPath(); g.arc(128 + Math.cos(a) * r, 128 + Math.sin(a) * r, 3 + Math.random() * 7, 0, TAU); g.fill(); }
  const t = new THREE.CanvasTexture(c); return t;
}
function revolver(detail) { // barrel along +z, grip down; the muzzle sits at (0, 0.035, 0.2)
  const g = new THREE.Group(), m = MAT.iron, w = MAT.woodDark;
  const add = (geo, mat, x, y, z, rx = 0) => { const o = new THREE.Mesh(geo, mat); o.position.set(x, y, z); o.rotation.x = rx; o.castShadow = true; g.add(o); return o; };
  add(new THREE.CylinderGeometry(0.011, 0.011, 0.19, detail ? 12 : 7), m, 0, 0.035, 0.1, Math.PI / 2);
  add(new THREE.CylinderGeometry(0.023, 0.023, 0.046, detail ? 14 : 8), m, 0, 0.03, -0.005, Math.PI / 2);
  add(new THREE.BoxGeometry(0.024, 0.05, 0.075), m, 0, 0.026, -0.012);
  add(new THREE.BoxGeometry(0.026, 0.085, 0.036), w, 0, -0.025, -0.068, -0.4);
  if (detail) { add(new THREE.CylinderGeometry(0.0055, 0.0055, 0.12, 8), m, 0, 0.019, 0.08, Math.PI / 2); add(new THREE.BoxGeometry(0.008, 0.022, 0.014), m, 0, 0.06, -0.05, -0.5);
    const tg = add(new THREE.TorusGeometry(0.016, 0.0028, 5, 12, Math.PI), m, 0, 0.002, -0.022); tg.rotation.set(0, Math.PI / 2, Math.PI); add(new THREE.BoxGeometry(0.004, 0.012, 0.006), m, 0, 0.066, 0.19); }
  return g;
}
function buildSiege() {
  // the sword: tip in the dirt, pommel resting on the street side of the front leg left of the trap. A broad, heavy blade that reads from
  // across the street; while it can be taken up a sheen runs up the steel and small sparks twinkle at its edges (swordShine)
  const S = new THREE.Group(), steel = new THREE.MeshStandardMaterial({ color: 0xd8d8d8, metalness: 1, roughness: 0.18 }), shine = { pos: { value: -1 }, k: { value: 0 } };
  steel.onBeforeCompile = q => { q.uniforms.sheenPos = shine.pos; q.uniforms.sheenK = shine.k; // (a band of light at height sheenPos along the blade, plus a faint gleam overall)
    q.vertexShader = q.vertexShader.replace("#include <common>", "#include <common>\nvarying float vSY;").replace("#include <begin_vertex>", "#include <begin_vertex>\nvSY = position.y;");
    q.fragmentShader = q.fragmentShader.replace("#include <common>", "#include <common>\nvarying float vSY; uniform float sheenPos, sheenK;")
      .replace("#include <emissivemap_fragment>", "#include <emissivemap_fragment>\n{ float b = exp(-pow((vSY - sheenPos) / 0.05, 2.0)); totalEmissiveRadiance += vec3(1.0, 0.94, 0.8) * (b * 3.2 + 0.16) * sheenK; }"); };
  steel.customProgramCacheKey = () => "swordSheen";
  const sh = new THREE.Shape([[-0.027, 0], [0.027, 0], [0.024, 0.6], [0, 0.78], [-0.024, 0.6]].map(p => new THREE.Vector2(p[0], p[1])));
  const bg = new THREE.ExtrudeGeometry(sh, { depth: 0.006, bevelEnabled: true, bevelThickness: 0.0025, bevelSize: 0.005, bevelSegments: 1 }); bg.translate(0, 0, -0.003);
  const blade = new THREE.Mesh(bg, steel); S.add(blade);
  const guard = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.022, 0.032), MAT.brass); guard.position.y = -0.01; S.add(guard);
  const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.017, 0.02, 0.13, 10), leatherMat(0x24160d, 0.8)); grip.position.y = -0.085; S.add(grip);
  const pom = new THREE.Mesh(new THREE.SphereGeometry(0.026, 12, 8), MAT.brass); pom.position.y = -0.162; S.add(pom);
  S.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  const th = 0.16, D = V3(0, -Math.cos(th), Math.sin(th)), tip = V3(-4.12, 0.012, -3.84), G = tip.clone().addScaledVector(D, -0.78);
  S.position.copy(G); S.quaternion.setFromUnitVectors(V3(0, 1, 0), D); R.scene.add(S);
  const glint = new THREE.Sprite(new THREE.SpriteMaterial({ fog: false, map: starTex(), color: new THREE.Color(1.35, 1.3, 1.15), blending: THREE.AdditiveBlending, depthTest: false, depthWrite: false, transparent: true, opacity: 0 }));
  glint.renderOrder = 5; glint.visible = false; R.scene.add(glint);
  const sparks = Array.from({ length: 4 }, () => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ fog: false, map: glint.material.map, color: new THREE.Color(1.4, 1.35, 1.2), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0 }));
    s.visible = false; s.renderOrder = 5; R.scene.add(s); return { s, t: 1, life: 0.35, wait: Math.random(), x: 0, y: 0 }; });
  SIEGE.sword = { group: S, rest: { p: S.position.clone(), q: S.quaternion.clone() }, glint, held: false, shine, sparks, sheenT: 0 };
  // cover
  SIEGE.covers = COVERS.map((C, i) => {
    const grp = new THREE.Group(), [cx, cz] = C.at, away = V3(cx - SIEGE_FOCUS.x, 0, cz - SIEGE_FOCUS.z).normalize(), side = V3(away.z, 0, -away.x);
    const add0 = R.scene.add.bind(R.scene); R.scene.add = o => grp.add(o);
    try {
      if (C.kind === "barrels") { for (const s of [-0.33, 0.33]) barrel(cx + side.x * s, cz + side.z * s, 1.08); }
      else if (C.kind === "crates") { for (const [s, h, y, r] of [[-0.42, 0.8, 0.4, 0.06], [0.42, 0.8, 0.4, -0.04], [0.2, 0.5, 1.05, 0.5]]) { const b = woodBox(h, h, h, MAT.woodDark); b.position.set(cx + side.x * s, y, cz + side.z * s); b.rotation.y = Math.atan2(away.x, away.z) + r; grp.add(b); } }
      else { for (const [s, y] of [[-0.3, 0.27], [0.32, 0.27], [0.0, 0.77]]) { const b = woodBox(1.0, 0.5, 0.55, MAT.hay); b.position.set(cx + side.x * s, y, cz + side.z * s); b.rotation.y = Math.atan2(side.x, side.z) + (Math.random() - 0.5) * 0.15; grp.add(b); } }
    } finally { R.scene.add = add0; }
    grp.traverse(o => { if (o.isMesh) { o.castShadow = o.receiveShadow = true; o.userData.cover = i; } }); grp.visible = false; R.scene.add(grp); // (set out only for the fight)
    const stand = V3(cx, 0, cz).addScaledVector(away, 0.78), top = C.kind === "barrels" ? 0.93 : C.kind === "crates" ? 0.8 : 1.02;
    return { grp, stand, away, side, top, yaw0: Math.atan2(SIEGE_FOCUS.x - stand.x, SIEGE_FOCUS.z - stand.z) };
  });
  buildEnemyCover(ENEMY_COVER);
  SIEGE.roofActors = ROOF_MEN.map((m, i) => { const a = new Actor(Object.assign({ boots: 0x2e2016, gloves: 0x6a5038, lod: true }, m.spec), "roof" + i); a.root.visible = false; return a; });
  // the player's revolver, the guns the townsfolk carry, flashes and blood
  const vm = revolver(true); vm.visible = false; vm.traverse(o => { o.castShadow = false; o.frustumCulled = false; }); R.scene.add(vm);
  const fl = new THREE.Sprite(new THREE.SpriteMaterial({ fog: false, map: flashTex(), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0 }));
  fl.visible = false; fl.renderOrder = 6; R.scene.add(fl);
  SIEGE.vm = { gun: vm, flash: fl, kick: 0 };
  SIEGE.flashTex = fl.material.map; SIEGE.flashes = [];
  for (let i = 0; i < 4; i++) { const f = new THREE.Sprite(new THREE.SpriteMaterial({ fog: false, map: SIEGE.flashTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0 })); f.visible = false; R.scene.add(f); SIEGE.flashes.push({ s: f, t: 1 }); }
  buildGore();
  buildSiegeUI();
}
function buildEnemyCover(list) {
  const S = SIEGE; if (S.props) { R.scene.remove(S.props); S.occ = null; }
  const grp = S.props = new THREE.Group(); grp.visible = !!S.on; R.scene.add(grp);
  const add0 = R.scene.add.bind(R.scene); R.scene.add = o => grp.add(o);
  try { for (const [kind, x, z, ry] of list) { const sx = Math.cos(ry), sz = -Math.sin(ry); // (its own left-right)
    if (kind === "trough") { const t = woodBox(1.8, 0.6, 0.56, MAT.woodDark); t.position.set(x, 0.3, z); t.rotation.y = ry; t.userData.trough = true; R.scene.add(t);
      const w = new THREE.Mesh(new THREE.PlaneGeometry(1.64, 0.42), new THREE.MeshStandardMaterial({ color: 0x1a2226, roughness: 0.05, metalness: 0.1 }));
      w.rotation.set(-Math.PI / 2, 0, ry); w.position.set(x, 0.605, z); w.userData.trough = true; R.scene.add(w); } // (the water just over the box's top, so it shows)
    else if (kind === "crates") { for (const [o, h, y, r] of [[-0.37, 0.72, 0.36, 0.05], [0.38, 0.72, 0.36, -0.08], [-0.3, 0.5, 0.97, 0.35]]) {
      const b = woodBox(h, h, h, MAT.woodDark); b.position.set(x + sx * o, y, z + sz * o); b.rotation.y = ry + r; R.scene.add(b); } }
    else for (const o of [-0.31, 0.31]) barrel(x + sx * o, z + sz * o, 1.04); } }
  finally { R.scene.add = add0; }
  grp.traverse(o => { if (o.isMesh) { o.castShadow = o.receiveShadow = true; } });
}
// the steel catching the light: a sheen sweeps hilt to tip in 1.1 s, rests 0.8 s, sweeps again; four sparks pop at the edges at random
function swordShine(rdt, on) {
  const W = SIEGE.sword; W.shine.k.value = on ? 1 : 0;
  if (!on) { W.shine.pos.value = -1; for (const p of W.sparks) { p.t = 1; p.s.visible = false; } return; }
  W.sheenT = (W.sheenT + rdt) % 1.9; W.shine.pos.value = -0.12 + W.sheenT / 1.1 * 1.0;
  for (const p of W.sparks) {
    if (p.t < 1) { p.t = Math.min(1, p.t + rdt / p.life); const k = Math.sin(p.t * Math.PI); p.s.material.opacity = k; p.s.scale.setScalar(0.04 + 0.14 * k); p.s.material.rotation += rdt * 3;
      p.s.position.copy(W.group.localToWorld(_s1.set(p.x, p.y, 0.012))); if (p.t >= 1) { p.s.visible = false; p.wait = rnd(0.15, 0.9); } }
    else if ((p.wait -= rdt) <= 0) { p.t = 0; p.life = rnd(0.25, 0.45); p.y = rnd(0.08, 0.72); p.x = (Math.random() < 0.5 ? -1 : 1) * (0.027 - 0.004 * p.y / 0.6); p.s.visible = true; }
  }
}
// make every new material compile up front (no hitch the moment the shooting starts)
function siegePrecompile(on) { const S = SIEGE, G = S.gore; for (const o of [S.vm.gun, S.vm.flash, S.sword.glint, ...S.sword.sparks.map(p => p.s), ...S.flashes.map(f => f.s), ...G.mist.map(m => m.s), ...G.bursts.map(b => b.s), G.walls[0], S.props]) o.visible = on;
  if (on) { if (!S.preBlood) { S.preBlood = new THREE.Mesh(new THREE.PlaneGeometry(0.01, 0.01), S.bloodMat); S.preBlood.position.set(0, -5, 0); R.scene.add(S.preBlood); } S.preBlood.visible = true;
    G.walls[0].position.set(0, -5, 0); _sm.makeTranslation(0, -5, 0); G.splat.im.setMatrixAt(0, _sm); G.splat.im.count = 1; }
  else { if (S.preBlood) S.preBlood.visible = false; G.splat.im.count = G.splat.used; } }

// ---- the four seconds after the drop (and on, behind the GAME OVER sign) ----
function swordWindow() {
  if (SIEGE.on || !SIEGE.sword) return; SIEGE.phase = "window"; SIEGE.winLeft = SIEGE_CFG.window; SIEGE.gT = 0;
  SIEGE.sword.glint.visible = true; // seen, not heard: nothing rings at the snap
}
function swordScreen(out) { // the sword as a line on screen, hilt to mid-blade
  const S = SIEGE.sword.group; S.updateMatrixWorld(true);
  const a = S.localToWorld(_s1.set(0, -0.12, 0)).project(R.camera), b = S.localToWorld(_s2.set(0, 0.45, 0)).project(R.camera);
  out[0] = (a.x * 0.5 + 0.5) * R.w; out[1] = (-a.y * 0.5 + 0.5) * R.h; out[2] = (b.x * 0.5 + 0.5) * R.w; out[3] = (-b.y * 0.5 + 0.5) * R.h; out[4] = a.z < 1 && b.z < 1; return out;
}
function swordHit(e) {
  const r = $("scene").getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top, s = swordScreen([0, 0, 0, 0, 0]); if (!s[4]) return false;
  const dx = s[2] - s[0], dy = s[3] - s[1], L2 = dx * dx + dy * dy || 1, t = clamp(((x - s[0]) * dx + (y - s[1]) * dy) / L2, 0, 1);
  return Math.hypot(s[0] + dx * t - x, s[1] + dy * t - y) < Math.max(46, Math.sqrt(L2) * 0.45);
}
// every tap on the stage comes here first; true when the siege took it
function siegeTap(e) {
  if (SIEGE.phase === "window" || SIEGE.phase === "late") { if (swordHit(e)) { startSiege(); return true; } return false; } // (late: the GAME OVER sign is up, and he can still be cut down)
  if (!SIEGE.on) return false;
  if (laserTap(e)) { if (e.cancelable) e.preventDefault(); return true; } // (the laser on the crate: 12k)
  if (SIEGE.phase === "fight" || (SIEGE.phase === "doomed" && laserAvail())) coverTap(e);
  if (e.cancelable) e.preventDefault(); return true;
}

// ---- cut him down ----
function camTo(pos, tgt, fov, dur) { CAM.follow = null; CAM.name = "siege"; CAM.from = { pos: CAM.pos.clone(), tgt: CAM.tgt.clone(), fov: CAM.fov }; CAM.to = { pos, tgt, fov }; CAM.t = 0; CAM.dur = dur; }
async function startSiege() {
  const late = SIEGE.phase === "late"; // cut down after the GAME OVER sign came up: the round he lost isn't held against your streak
  if (late && STATE.streakLost != null) { STATE.streak = STATE.streakLost; savePrefs(); } swordShine(0, false);
  bellReset(); // (the bell's mark is for this shootout only: 12f)
  const S = SIEGE; S.on = true; S.phase = "cut"; S.sword.glint.visible = false; S.t = 0; S.used = {}; showSiegeUI("cut"); for (const C of S.covers) C.grp.visible = true; S.props.visible = true; resetTargets(); showTargets(true); crowsGather(); resetLaser(); horseHurry();
  S.bullets = GUN.rounds; S.reloads = GUN.reloads; S.reloadT = 0; S.health = GUN.hearts; gunHud.key = null; S.hurt = 0; S.deadT = 0; S.cool = 0; S.recoil = 0; S.holding = S.keyAim = false; S.aimId = null; S.scanT = 0; S.upT = 0; S.vm.kick = 0;
  S.shots = 0; S.downT = 0; S.aims = 0; S.said.clear(); S.tauntT = 0; S.talkUntil = 0; S.wordsAt = S.lastAt = 0; S.doomT = S.doomI = 0; S.doomSaid = false; S.hitT = 0;
  $("doomMsg").hidden = $("hitMsg").hidden = true;
  stopBodyPlay(); STATE.locked = true; STATE.ts = 1; SLOW.t = 99; $("skip").hidden = true; showHintBox(false); $("sign").hidden = true;
  Sound.clip("sword0", S.sword.group.position, 1.1, 0, 0.2);
  const swordAt = S.sword.group.position, hilt = S.sword.group.localToWorld(V3(0, -0.08, 0));
  camTo(V3(-3.62, 1.32, -3.05), hilt.clone().add(V3(0, -0.15, 0)), 50, 0.42); await wait(0.42);
  S.sword.held = true; S.swing = 0; // in hand: raised, ready
  const H = MAN.hang, head = MAN.ch.bones.Head.getWorldPosition(V3()), cutY = head.y + 0.36, cutAt = V3(LAY.trap.x, cutY, LAY.trap.z);
  if (H) { const sim = GAL.rope.sim; let best = 1e9; for (let i = 0; i < sim.n; i++) { const d = Math.abs(sim.x[i * 3 + 1] - cutY) + Math.hypot(sim.x[i * 3] - head.x, sim.x[i * 3 + 2] - head.z) * 0.5; if (d < best) { best = d; cutAt.set(sim.x[i * 3], sim.x[i * 3 + 1], sim.x[i * 3 + 2]); } } }
  camTo(V3(LAY.trap.x + 0.25, 1.58, -3.62), cutAt.clone().add(V3(0, -0.12, 0)), 56, 0.5); await wait(0.55);
  Sound.clip("cut0", cutAt, 1.1, 0, 0.15); S.swing = 0.001; await wait(0.11);
  cutRopeAt(cutAt); await wait(0.25);
  // the host calls it, the townsfolk draw; the condemned man gasps for air on the ground
  say(null, SIEGE_LINES.start); armEnemies();
  setTimeout(() => { if (S.on && MAN.hang) manCough("cough0", 1.3); }, 450); S.coughT = 4;
  await wait(1.0); if (!S.on) return;
  // from here the shootout is seen through his eyes: he crawls out from under the platform, gets up and runs for the crates
  S.sword.held = false; S.sword.group.visible = false; MAN.root.visible = false; if (MAN.tie) MAN.tie.visible = false; GAL.rope.lowHidden = true;
  S.cover = 1; S.cv = 0.4; S.crouch = true; const C = S.covers[1];
  S.yaw = C.yaw0; S.pitch = 0.04; S.run = { from: V3(LAY.trap.x - 0.15, 0.5, LAY.plat.z + LAY.plat.d / 2 + 0.25), via: V3(-4.0, 1.45, -1.0), to: C.stand.clone(), t: 0, dur: 1.7, to_i: 1, look: true }; // round the stairs, not through them
  manCough("cough1", 0.75);
  CAM.to = null; CAM.follow = null; S.phase = "fight"; S.nextShot = SIEGE_CFG.grace + 1.0; showSiegeUI("fight"); siegeHud();
}
// the man on the ground fights for air: a cough, and his chest heaves with it (he's alive)
function manCough(nm, gain) { const H = MAN.hang; if (!H) return;
  if (!MAN.root.visible) { Sound.clip(nm, null, gain, 0, 0.12, rnd(0.95, 1.05)); return; } // you: your own cough, right here
  Sound.clip(nm, MAN.ch.bones.Head.getWorldPosition(V3()), gain, 0, 0.15, rnd(0.95, 1.05));
  for (const [t, k] of [[0.05, 1], [0.32, 0.7], [0.6, 0.5]]) H.kicks.push([H.t + t, "chest", V3(0, 0.75 * k, 0), 0.3]); H.kicks.push([H.t + 0.08, "head", V3(0, 0.5, 0), 0.12]); }
function cutRopeAt(at) {
  const sim = GAL.rope.sim, n = sim.n, H = MAN.hang; let c = -1;
  for (let i = n - 1; i >= 1; i--) if (sim.x[i * 3 + 1] > at.y) { c = i; break; } // the last link above the blade
  sim.cut = clamp(c < 0 ? n - 6 : c, 1, n - 3);
  if (H) { H.cutRope(); H.onHit = (p, sp) => Sound.thud(p, clamp(sp / 5, 0.3, 1)); H.kick(H.I.head, V3(0, -0.4, 0.3), 0.2); }
  puff(at, 14, 0.5, 0.06, 0.9, 0.5); // a few fibres
}

// ---- the nine ----
function armEnemies() {
  const S = SIEGE; S.enemies = []; S.hiddenCrowd = [];
  // exactly six townsfolk fight, whatever the quality setting put in the crowd: extras slip away, missing ones join
  while (LIFE.crowd.length < 6) { const i = LIFE.crowd.length, c = CROWD_SPECS[i];
    let a = S.pool.find(p => p.name === "crowd" + i); if (!a) { a = new Actor(Object.assign({ boots: 0x2e2016, gloves: 0x6a5038, lod: true }, c.spec), "crowd" + i); S.pool.push(a); }
    a.root.visible = true; a.place(c.pos[0], c.pos[1], Math.atan2(LAY.plat.x - c.pos[0], LAY.plat.z - c.pos[1])); a.gestureT = 99; LIFE.crowd.push(a); S.spawned.push(a); }
  LIFE.crowd.forEach((a, i) => { if (i >= 6) { a.root.visible = false; S.hiddenCrowd.push(a); } });
  const mk = (a, spots, female, vr) => { const gun = revolver(false); gun.visible = true; R.scene.add(gun);
    a.siege = true; a.lookPt = null; a.setGrip("R", 0.85); a.setGrip("L", 0.6); a.ik.R.fast = a.ik.L.fast = false; setDetail(a.ch, true); a.addRun();
    const E = { a, spots, i: 0, state: "move", t: 0, aimW: 0, kick: 0, gun, female, alive: true, gunV: null, P: playerEye(V3()), gdir: V3(0, -0.8, 0.6).normalize(), poleR: V3(), poleL: V3(),
      vr, talkT: 0 }; // (vr: his voice, pitched a little up or down from the recording so no two men sound quite alike)
    a.pre = siegeStance(E); a.walkTo([[spots[0][0], spots[0][1]]], rnd(SIEGE_CFG.speed[0], SIEGE_CFG.speed[1])); return E; };
  for (let i = 0; i < 6; i++) S.enemies.push(mk(LIFE.crowd[i], SIEGE_SPOTS[i], !!(CROWD_SPECS[i].spec.body && CROWD_SPECS[i].spec.body.skirt), [1.0, 1, 1.06, 1, 0.96, 0.92][i]));
  EXEC.gripping = false; EXEC.setGrip("L", 0); EXEC.setIK("L", null, 0); EXEC.lookPt = null; EXEC.ik.L.fast = EXEC.ik.R.fast = false;
  S.enemies.push(mk(EXEC, EXEC_SPOTS, false, 1.0));
  // the two on the roofs come up the back of the roof bent double and make for the false front
  ROOF_MEN.forEach((m, i) => { const Rf = WORLD.roofs.find(q => q.name === m.roof), a = S.roofActors[i]; if (!Rf || !a) return;
    const side = i ? 1 : -1, back = roofSpot(Rf, side * ROOF_SPOT, 2.8); a.root.visible = true; a.yOff = SIEGE_CFG.duck; a.place(back[0], back[1], Math.atan2(Rf.s, Rf.c));
    const E = mk(a, [roofSpot(Rf, side * ROOF_SPOT), roofSpot(Rf, -side * ROOF_SPOT)], false, m.vr); E.roof = Rf; a.walkTo([E.spots[0]], SIEGE_CFG.roofSpeed); S.enemies.push(E); });
  HOST.root.visible = false; HOST.path = null; // the host ducks out of sight behind the store
  S.occ = null;
}
function playerEye(out) { return out.copy(R.camera.position); }
function updateEnemies(dt) {
  const S = SIEGE, P = playerEye(_s4), fighting = S.phase === "fight";
  for (const E of S.enemies) {
    const a = E.a; if (!E.alive) { dropGun(E, dt); continue; }
    if (E.roof) a.yOff = E.state === "move" || E.state === "duck" ? SIEGE_CFG.duck : 0; // (on a roof: bent double behind the false front whenever he isn't up at it)
    // a dash to his other spot, a hold there with the gun ready, and, when it's his turn, he takes aim. A man on a roof ducks out of sight
    // between times, and as often as not comes up again where he went down
    if (E.state === "move") { if (!a.path) { E.state = "pause"; E.t = rnd(SIEGE_CFG.hold[0], SIEGE_CFG.hold[1]); } }
    else if (E.state === "duck") { E.t -= dt; if (E.t <= 0) { E.state = "pause"; E.t = rnd(SIEGE_CFG.hold[0], SIEGE_CFG.hold[1]); } }
    else if (E.state === "pause") { a.faceTo(P.x, P.z); E.t -= dt; if (E.t <= 0 && fighting) {
      if (E.roof && Math.random() < 0.45) { E.state = "duck"; E.t = rnd(1.2, 2.2); }
      else { E.i ^= 1; const [x, z] = E.spots[E.i], j = E.roof ? 0 : 0.35; a.walkTo([[x + rnd(-j, j), z + rnd(-j, j)]], E.roof ? SIEGE_CFG.roofSpeed : rnd(SIEGE_CFG.speed[0], SIEGE_CFG.speed[1])); E.state = "move"; } } }
    else if (E.state === "aim") { a.path = null; a.faceTo(P.x, P.z); E.t -= dt;
      if (E.t <= 0) { const wait = S.phase === "fight" && !S.crouch ? SIEGE_CFG.react - S.upT : 0; // you just came up: he holds his fire until your 0.3 s are up
        if (wait > 0) E.t = wait; else { enemyFire(E); E.state = "recover"; E.t = 0.6; } } }
    else if (E.state === "recover") { E.t -= dt; if (E.t <= 0) { E.state = "pause"; E.t = rnd(0.6, 1.4); } }
    const up = E.state === "aim" || E.state === "recover"; E.aimW += ((up ? 1 : 0) - E.aimW) * Math.min(1, dt * (up ? 7 : 4)); E.kick = Math.max(0, E.kick - dt * 6);
    E.P.copy(P); a.lookPt = (a.lookPt || V3()).copy(P);
    // the gun in his right hand, along the line his stance gives it (siegeStance)
    const hand = a.ch.bones.RightHand.getWorldPosition(_s1), dir = E.gdir;
    E.gun.position.copy(hand).addScaledVector(dir, 0.035).add(_s2.set(0, 0.01, 0)); E.gun.lookAt(_s2.copy(E.gun.position).add(dir));
  }
  if (S.phase !== "fight") return;
  // one gun at a time, from a man with a clear line to where your head comes up: most often one on your screen, but a man you can't see
  // can take aim too, more slowly, and a red arc round the crosshair shows which side he's on (siegeLate)
  S.nextShot -= dt; if (S.nextShot > 0 || S.enemies.some(E => E.alive && E.state === "aim")) return;
  S.scanT -= dt; if (S.scanT > 0) return; S.scanT = 0.2;
  const ready = S.enemies.filter(E => E.alive && (E.state === "move" || E.state === "pause") && canFace(E) && clearShot(E)); if (!ready.length) return;
  const seen = ready.filter(E => onFrame(E)), unseen = ready.filter(E => !seen.includes(E)), pool = seen.length && (!unseen.length || Math.random() < 0.65) ? seen : unseen;
  const E = pool[Math.random() * pool.length | 0], off = !seen.includes(E);
  E.state = "aim"; E.t = SIEGE_CFG.telegraph * (S.t < 8 ? 1.2 : 1) + (off ? SIEGE_CFG.offAim : 0); E.a.path = null; E.tAim = E.t; if (E.roof) E.a.yOff = 0;
  Sound.clip(siegePick("cock", 2), E.gun.position, 0.9, 0.05, 0.1, rnd(0.95, 1.05), 4); // the hammer going back: your cue to get down
  S.nextShot = rnd(SIEGE_CFG.gap[0], SIEGE_CFG.gap[1]) + E.t;
  // as he draws a bead he may call out: the first of the men to take aim jeers at the one who got away, the executioner has his own line
  // for you, and a man who catches you standing lets you know it's coming
  S.aims++;
  if (E.a === EXEC) taunt("time", E); else if (!S.said.has(TAUNTS.getaway[1])) taunt("getaway", E); else if (!S.crouch) taunt("take", E);
}
// ---- the gunmen's taunts: a few lines, each heard at most once a fight, never two close together, never over the host ----
const TAUNTS = { // key: [clip, text, who says it ("man": any of the townsmen, "exec": the executioner), seconds]
  take: ["taunt0", "Take this!", "man", 1.03], getaway: ["taunt1", "Thought you could get away, huh?", "man", 1.78], comeout: ["taunt2", "Come on out and fight!", "man", 1.47],
  last: ["taunt3", "Just you and me now!", "man", 1.75], words: ["taunt4", "Any last words?", "man", 1.43], time: ["taunt5", "Your time has come, kid!", "exec", 1.81],
  wordsX: ["taunt6", "Any last words?", "exec", 1.36] }; // (the townsmen are ElevenLabs' "Rusty Wade", the executioner "Matthew Schmitz, Old Outlaw")
const tauntMan = E => E.alive && !E.female && E.a !== EXEC;
function onScreen(E) { const p = E.a.ch.bones.Head.getWorldPosition(_v6).project(R.camera); return p.z < 1 && Math.abs(p.x) < 0.95 && Math.abs(p.y) < 0.95; }
// someone to say a line of the given kind: a man you can see if there is one
function tauntSpeaker(who) { const L = SIEGE.enemies.filter(who === "exec" ? E => E.alive && E.a === EXEC : tauntMan); if (!L.length) return null;
  const seen = L.filter(onScreen), M = seen.length ? seen : L; return M[Math.random() * M.length | 0]; }
// E says the line now (or the line is let go, if it doesn't suit him or comes too soon after the last one); force skips the gap, not the overlap
function taunt(key, E, force) {
  const S = SIEGE, T = TAUNTS[key]; if (!T || !S.on || (S.phase !== "fight" && S.phase !== "doomed") || S.said.has(T[1])) return false;
  if (!E || !E.alive || (T[2] === "exec" ? E.a !== EXEC : !tauntMan(E))) return false;
  if (STATE.bubble || S.t < S.talkUntil || (!force && S.t < S.tauntT)) return false;
  S.said.add(T[1]); S.tauntT = S.t + T[3] + SIEGE_CFG.tauntGap; S.talkUntil = S.t + T[3] + 0.3;
  Sound.clip(T[0], E.a.ch.bones.Head.getWorldPosition(V3()), 1.5, 0, 0.3, E.vr || 1, 7); E.talkT = T[3] / (E.vr || 1);
  STATE.bubble = { text: T[1], t: T[3] + 1.0, who: E.a }; return true;
}
// "Any last words?": the executioner's to ask if he's still standing
function tauntWords() { const X = tauntSpeaker("exec"); if (X) return taunt("wordsX", X, true); return taunt("words", tauntSpeaker("man"), true); }
// ---- how a gunman holds himself, laid over the idle, walk and run clips before his head turns and his arms are solved ----
const _c = Array.from({ length: 10 }, () => new THREE.Vector3()), _cq = [new THREE.Quaternion(), new THREE.Quaternion(), new THREE.Quaternion()];
function sinkHips(a, sink) { // knees bent: the hips come down, the feet stay where the clip planted them and keep their angle
  const B = a.ch.bones, fw = _c[0].set(Math.sin(a.yaw), 0, Math.cos(a.yaw));
  const fL = B.LeftFoot.getWorldPosition(_c[1]), fR = B.RightFoot.getWorldPosition(_c[2]), qL = B.LeftFoot.getWorldQuaternion(_cq[0]), qR = B.RightFoot.getWorldQuaternion(_cq[1]);
  const h = B.Hips.getWorldPosition(_c[3]); h.y -= sink; B.Hips.position.copy(B.Hips.parent.worldToLocal(h)); B.Hips.updateMatrixWorld(true);
  for (const [S, f, q] of [["Left", fL, qL], ["Right", fR, qR]]) {
    const pole = B[S + "Leg"].getWorldPosition(_c[4]).addScaledVector(fw, 1.0); pole.y += 0.2;
    twoBoneIK(B[S + "UpLeg"], B[S + "Leg"], B[S + "Foot"], f, pole, 1);
    const ft = B[S + "Foot"]; ft.quaternion.copy(ft.parent.getWorldQuaternion(_cq[2]).invert().multiply(q)); ft.updateMatrixWorld(true); }
}
function siegeStance(E) {
  return (a, dt) => { if (!E.alive) return;
    if (E.talkT > 0) { E.talkT -= dt; const U = a.ch.skin.userData.U, on = E.talkT > 0 ? 1 : 0, t = a.time; // calling out: the jaw works and the head nods with the words
      U.jaw.value = on * (0.1 + 0.32 * Math.abs(Math.sin(t * 10.5)) * (0.65 + 0.35 * Math.sin(t * 3.3))); a.talkAmt = on * 0.9; }
    const B = a.ch.bones, P = E.P, aim = Ease.inOut(clamp(E.aimW, 0, 1)), mv = a.walkW, run = (a.runK || 0) * mv;
    sinkHips(a, 0.035 + 0.025 * mv + 0.06 * aim); // knees bent; lower still when he takes aim
    // shoulders turn to you and lean in: square on when he aims, a glance over the shoulder on the run
    const chest = B.Spine2.getWorldPosition(_c[6]); let tw = Math.atan2(P.x - chest.x, P.z - chest.z) - a.yaw; tw = ((tw + Math.PI) % TAU + TAU) % TAU - Math.PI;
    tw = clamp(tw, -1.0, 1.0) * (0.25 + 0.75 * aim) * (1 - 0.6 * mv); const lean = 0.05 + 0.1 * aim + 0.16 * run;
    turnBone(B.Spine, a, tw * 0.3, lean * 0.45, 0); turnBone(B.Spine1, a, tw * 0.35, lean * 0.35, 0); turnBone(B.Spine2, a, tw * 0.35, lean * 0.2, 0);
    // both hands on the gun: low and ready in front of his belly, or out at arm's length on the line to you; it kicks up when he fires
    const ls = B.LeftArm.getWorldPosition(_c[7]), rs = B.RightArm.getWorldPosition(_c[8]), mid = _c[9].addVectors(ls, rs).multiplyScalar(0.5);
    const f = _c[0].set(Math.sin(a.yaw + tw), 0, Math.cos(a.yaw + tw)), rt = _c[1].set(-f.z, 0, f.x), to = _c[2].subVectors(P, mid).normalize();
    const g = _c[3].copy(mid).addScaledVector(f, 0.3).addScaledVector(rt, 0.06); g.y -= 0.3;
    const ga = _c[4].copy(mid).addScaledVector(to, 0.5).addScaledVector(rt, 0.02); ga.y += 0.05;
    g.lerp(ga, aim); g.y += 0.07 * E.kick; g.addScaledVector(to, -0.05 * E.kick);
    E.gdir.copy(f).multiplyScalar(0.75); E.gdir.y -= 0.65; E.gdir.normalize().lerp(to, aim); E.gdir.y += 0.55 * E.kick; E.gdir.normalize();
    const lh = _c[5].copy(g).addScaledVector(rt, -0.045).addScaledVector(E.gdir, -0.015); lh.y -= 0.035; // the left hand cups the right
    E.poleR.copy(rs).addScaledVector(rt, 0.6).addScaledVector(f, -0.3); E.poleR.y -= 0.9;
    E.poleL.copy(ls).addScaledVector(rt, -0.6).addScaledVector(f, -0.3); E.poleL.y -= 0.9;
    a.setIK("R", g, 1, E.poleR); a.setIK("L", lh, 1, E.poleL);
  };
}
// where your head is when you come up from this cover
function upEye(out) { const C = SIEGE.covers[SIEGE.cover]; return out.set(C.stand.x, SIEGE_CFG.eye, C.stand.z).addScaledVector(C.side, 0.08); }
// he is on your screen (in front of you, inside the frame) and nothing solid stands between him and where your head comes up
function inView(E, margin = 0.9) { return onFrame(E, margin) && clearShot(E); }
function onFrame(E, margin = 0.9) { const p = _v6.copy(E.a.ch.bones.Spine2.getWorldPosition(_v5)).project(R.camera); return !(p.z > 1 || p.z < -1 || Math.abs(p.x) > margin || Math.abs(p.y) > 0.96); }
function canFace(E) { // you could turn to him from this cover (the men on the roofs can be off past the edge of what you can turn to)
  const C = SIEGE.covers[SIEGE.cover], c = E.a.ch.bones.Spine2.getWorldPosition(_v5), y = Math.atan2(c.x - C.stand.x, c.z - C.stand.z);
  return Math.abs(((y - C.yaw0 + Math.PI) % TAU + TAU) % TAU - Math.PI) <= SIEGE_CFG.yawLim + 0.05; }
function clearShot(E) { // nothing solid between his chest and where your head comes up (whether or not he's on your screen)
  const c = E.a.ch.bones.Spine2.getWorldPosition(_v5), eye = upEye(_v7), d = _v8.subVectors(c, eye), L = d.length(); d.normalize(); return !sceneryRay(eye, d, L - 0.3);
}
const _v5 = new THREE.Vector3(), _v6 = new THREE.Vector3(), _v7 = new THREE.Vector3(), _v8 = new THREE.Vector3(), _s4q = new THREE.Quaternion();
function muzzleFlash(pos, size) { const f = SIEGE.flashes.find(q => q.t >= 1) || SIEGE.flashes[0]; f.t = 0; f.s.position.copy(pos); f.s.scale.setScalar(size); f.s.visible = true; f.s.material.rotation = Math.random() * TAU;
  SIEGE.flash = 1; SIEGE.flashPos.copy(pos); }
function enemyFire(E) {
  const S = SIEGE, muzzle = E.gun.localToWorld(V3(0, 0.035, 0.21)); muzzleFlash(muzzle, 0.28); E.kick = 1;
  puff(muzzle, 9, 0.35, 0.3, 2.4, 0.36, 0xd8d3c8); // black powder: a cloud of white smoke hangs where he fired
  Sound.clip(siegePick("far", 4), muzzle, 1.0, 0, 0.35, rnd(0.94, 1.06), 7); crowsStartle(muzzle, 28, 0.55);
  const doomed = S.phase === "doomed", exposed = doomed || playerExposed(), p = doomed ? 1 : S.run ? SIEGE_CFG.hitRun : SIEGE_CFG.hitUp;
  const hit = exposed && (doomed || clearShot(E)) && Math.random() < p; // (behind something solid, he can't hit you, unless your gun's empty)
  if (!onFrame(E, 1.0)) S.threat = { E, t: 0.7, hit }; // fired from outside your view: the arc flares on his side (siegeLate)
  if (hit) { playerHit(E, doomed); return; }
  const C = S.covers[S.cover];
  if (exposed) { Sound.clip(siegePick("whiz", 3), playerEye(_s1).addScaledVector(V3().subVectors(muzzle, _s1).normalize(), -0.6).add(V3(rnd(-0.5, 0.5), 0.2, 0)), 0.9, 0.05, 0.05, rnd(0.9, 1.1), 2);
    const g = playerEye(V3()).add(V3(rnd(-1.4, 1.4), 0, rnd(0.6, 1.8))); g.y = 0.05; puff(g, 10, 0.5, 0.12, 0.8, 0.45); }
  else { // into the cover: a thwack and a spray of splinters off the top edge
    const top = V3(C.stand.x, C.top, C.stand.z).addScaledVector(C.away, -0.62).addScaledVector(C.side, rnd(-0.4, 0.4));
    setTimeout(() => { Sound.clip(siegePick("wood", 4), top, 1.0, 0, 0.15, rnd(0.92, 1.08), 3); puff(top, 12, 0.7, 0.05, 0.7, 0.7); }, 60); }
}
// out in the open: up from behind the cover with Aim held (read straight from the input, so the frame you let go you're safe), or on the
// run between covers. Down behind cover, nothing can hit you while you've a bullet left.
function playerExposed() { const S = SIEGE; return !!S.run || (!S.crouch && (S.holding || S.keyAim)); }
function playerHit(E, force) { // force: your gun's empty, and cover won't save you
  const S = SIEGE; if (S.phase !== "fight" && S.phase !== "doomed") return; if (!force && !playerExposed()) return;
  S.health--; S.hurt = 1; S.hbT = 0; CAM.shake = Math.max(CAM.shake, 1.6); CAM.kv = -1.2; S.recoil = Math.max(S.recoil, 0.6);
  Sound.clip(siegePick("hurt", 3), null, 1.0, 0.03, 0.1, rnd(0.96, 1.04)); siegeHud(); screenBlood(S.health <= 2 ? 3 : 2);
  if (S.health <= 0) { siegeDie(); return; }
  // say it plainly: a banner under the top bar with what's left (the heart itself breaks in the bar, heartsHud)
  const m = $("hitMsg"); m.textContent = `Hit! ${S.health} heart${S.health === 1 ? "" : "s"} left`; m.hidden = false; m.classList.remove("pop"); void m.offsetWidth; m.classList.add("pop"); S.hitT = 1.8;
  if (S.health === 1 && S.phase === "fight") S.wordsAt = S.t + 0.9; // one heart left: they smell it (updateSiege)
}

// ---- the player's shot ----
const SIEGE_PARTS = [ // [from bone, to bone, radius, ragdoll particle, bone the wound rides on]
  ["Head", "HeadTop_End", 0.098, "head", "Head"], ["Neck", "Head", 0.062, "neck", "Neck"], ["Spine2", "Neck", 0.15, "chest", "Spine2"], ["Spine1", "Spine2", 0.155, "chest", "Spine1"],
  ["Hips", "Spine1", 0.158, "spine", "Spine"], ["LeftUpLeg", "RightUpLeg", 0.12, "hips", "Hips"],
  ["LeftArm", "LeftForeArm", 0.058, "lel", "LeftArm"], ["LeftForeArm", "LeftHand", 0.048, "lwr", "LeftForeArm"], ["RightArm", "RightForeArm", 0.058, "rel", "RightArm"], ["RightForeArm", "RightHand", 0.048, "rwr", "RightForeArm"],
  ["LeftUpLeg", "LeftLeg", 0.085, "lkn", "LeftUpLeg"], ["LeftLeg", "LeftFoot", 0.062, "lan", "LeftLeg"], ["RightUpLeg", "RightLeg", 0.085, "rkn", "RightUpLeg"], ["RightLeg", "RightFoot", 0.062, "ran", "RightLeg"]];
function rayCapsule(ro, rd, pa, pb, r) { // distance along the ray to a capsule, or -1
  const ba = _s1.subVectors(pb, pa), oa = _s2.subVectors(ro, pa), baba = ba.dot(ba), bard = ba.dot(rd), baoa = ba.dot(oa), rdoa = rd.dot(oa), oaoa = oa.dot(oa);
  let a = baba - bard * bard, b = baba * rdoa - baoa * bard, c = baba * oaoa - baoa * baoa - r * r * baba, h = b * b - a * c;
  if (h >= 0 && a > 1e-9) { const t = (-b - Math.sqrt(h)) / a, y = baoa + t * bard; if (y > 0 && y < baba) return t;
    const oc = y <= 0 ? oa : _s3.subVectors(ro, pb); b = rd.dot(oc); c = oc.dot(oc) - r * r; h = b * b - c; if (h > 0) return -b - Math.sqrt(h); }
  return -1;
}
function rayActor(a, ro, rd, female, pad = 0) { // (pad: a little extra width for a man far off, so the men on the roofs aren't a few pixels to hit)
  const B = a.ch.bones; let best = null; const pa = V3(), pb = V3();
  const parts = female ? SIEGE_PARTS.concat([["Hips", "_skirt", 0.2, "hips", "Hips"]]) : SIEGE_PARTS;
  for (const P of parts) { B[P[0]].getWorldPosition(pa);
    if (P[1] === "_skirt") B.LeftLeg.getWorldPosition(pb).add(B.RightLeg.getWorldPosition(_s4)).multiplyScalar(0.5); else B[P[1]].getWorldPosition(pb);
    const t = rayCapsule(ro, rd, pa, pb, P[2] + pad + (a.ch.coatU && P[2] > 0.14 ? 0.02 : 0)); if (t > 0 && (!best || t < best.t)) best = { t, part: P }; }
  return best;
}
function sceneryRay(ro, rd, far) {
  const S = SIEGE;
  if (!S.occ) { const skip = new Set(); for (const a of [HOST, MAN, EXEC, ...LIFE.crowd, ...S.pool, ...(S.roofActors || [])]) a.root.traverse(o => skip.add(o));
    for (const o of [S.vm.gun, S.sword.group, ...S.enemies.map(E => E.gun)]) o.traverse(q => skip.add(q));
    const shown = o => { for (let q = o; q; q = q.parent) if (!q.visible) return false; return true; };
    S.occ = []; R.scene.traverse(o => { if (o.isMesh && !o.isSkinnedMesh && !o.isInstancedMesh && !o.morphTargetInfluences && !skip.has(o) && shown(o) && o.geometry && !(o.material && (o.material.transparent || o.material.isShaderMaterial || o.material.side === THREE.BackSide)) && !o.userData.dyn) S.occ.push(o); }); } // (not the sky)
  const rc = S.rc || (S.rc = new THREE.Raycaster()); rc.set(ro, rd); rc.far = far; rc.near = 0.05;
  const h = rc.intersectObjects(S.occ, false); return h.length ? h[0] : null;
}
function fireTap() {
  const S = SIEGE; if (S.phase !== "fight" && S.phase !== "doomed" && S.phase !== "cleared") return;
  if (laserHeld()) { laserTrigger(true); return; } // (the laser in hand: Fire held is the beam, 12k)
  if (S.reloadT > 0) return; // (reloading: the cylinder's open)
  if (S.bullets <= 0) { if (S.cool <= 0) { Sound.clip("dry0", null, 0.9, 0, 0.05); S.cool = 0.3; } return; } // click: empty
  if (S.crouch || S.run || S.cv > 0.5) { nudgeAim(); return; } // still behind the cover: hold Aim to come up first
  if (S.cool > 0) return;
  S.bullets--; S.shots++; S.cool = SIEGE_CFG.fireCool; S.recoil = 1; S.vm.kick = 1; siegeHud();
  Sound.clip(siegePick("shot", 3), null, 1.15, 0, 0.32, rnd(0.97, 1.03)); CAM.shake = Math.max(CAM.shake, 0.35);
  R.camera.updateMatrixWorld(); const ro = R.camera.position.clone(), rd = V3(0, 0, -1).applyQuaternion(R.camera.quaternion).normalize();
  muzzleFlash(S.vm.gun.localToWorld(V3(0, 0.035, 0.22)), 0.32);
  let hit = null; for (const E of S.enemies) { if (!E.alive) continue; const far = E.a.ch.bones.Spine2.getWorldPosition(_s3).distanceTo(ro);
    const h = rayActor(E.a, ro, rd, E.female, clamp((far - 12) * 0.007, 0, 0.12)); if (h && (!hit || h.t < hit.t)) hit = Object.assign(h, { E }); }
  // whatever the shot meets first: the bell (12f), a man, a crow (10c), a bottle, a can or a tumbleweed (12j), or the street and the town (12j envShot)
  const env = sceneryRay(ro, rd, 80), bt = bellRay(ro, rd), cr = crowRay(ro, rd), tg = targetRay(ro, rd), hr = townHorseRay(ro, rd), cands = [];
  if (bt > 0) cands.push([bt, "bell"]); if (hit) cands.push([hit.t, "man"]); if (cr) cands.push([cr.t, "crow"]); if (tg) cands.push([tg.t, "tgt"]); if (hr) cands.push([hr.t, "horse"]); if (env) cands.push([env.distance, "env"]);
  cands.sort((a, b) => a[0] - b[0]); const first = cands[0], at = first ? ro.clone().addScaledVector(rd, first[0]) : null;
  if (first) { const k = first[1]; if (k === "bell") bellShot(at, rd); else if (k === "man") shotHits(hit.E, hit.part, at, rd); else if (k === "crow") crowShot(cr.c, at, rd); else if (k === "tgt") targetShot(tg, at, rd); else if (k === "horse") horseShot(hr.H, at, rd); else envShot(env, rd); }
  crowsStartle(ro, 30, 0.45); if (at) crowsStartle(at, 5, 1.2); // (the crack of it puts the crows up, the ones near where it struck most of all)
  const empty = S.bullets <= 0;
  if (S.phase !== "fight" && S.phase !== "doomed") { if (empty) siegeReload(); return; } // (the street already cleared: nothing more to decide)
  const left = S.enemies.filter(E => E.alive).length;
  if (!left) siegeWin(); else if (empty) { if (S.reloads > 0) siegeReload(); else siegeDoomed(); }
}
// the cylinder's empty and there's a reload left: it opens and refills by itself (you can't fire till it's done; you can still duck)
function siegeReload() {
  const S = SIEGE; if (S.reloadT > 0 || S.reloads <= 0) return; S.reloads--; S.reloadT = GUN.reload;
  Sound.cap(null); setTimeout(() => Sound.cap(null), 240); siegeHud();
}
// the last bullet's gone and some of them are still standing: they know it. One calls out, and then they take turns shooting, each shot
// a heart, cover or no cover, until you're down (updateSiege drives it, a gunman at a time, so you see each heart go)
function siegeDoomed() {
  const S = SIEGE; S.phase = "doomed"; S.doomT = 0; S.doomI = 0; S.doomSaid = false; S.nextShot = 99; S.wordsAt = S.lastAt = 0; S.doomFirst = S.doomGap = null;
  if (LASER.ready && LASER.state === "crate") { // (the laser on the crate wakes and hums: they give you longer, if you can find it: 12k)
    S.doomFirst = 5; S.doomGap = 1.15; laserWake(); setTimeout(() => { if (S.phase === "doomed" && LASER.state === "crate") { const t = $("siegeTip"); t.textContent = "Something's humming down by your hip…"; t.hidden = false; S.tip = 3.5; } }, 1700); }
  for (const E of S.enemies) if (E.alive) { E.state = "pause"; E.t = 99; E.a.path = null; }
  $("siegeTip").hidden = true; S.tip = 0; S.tipNext = null;
  const m = $("doomMsg"); m.hidden = false; m.classList.remove("show"); void m.offsetWidth; m.classList.add("show");
}
// what one of them says when your gun clicks empty: the executioner asks for your last words, or reminds you whose time it is
function doomTaunt() { const X = tauntSpeaker("exec"), M = tauntSpeaker("man");
  return (X && (taunt("wordsX", X, true) || taunt("time", X, true))) || (M && (taunt("words", M, true) || taunt("last", M, true))) || false; }
// where the bullet went in, carried into the body's rest pose so the wound rides the skin; the hit is then laid exactly on the mesh
function addWound(a, part, at, rd) {
  const head = part[4] === "Head" || part[4] === "Neck", bone = a.ch.bones[part[4]];
  _sm.copy(CHAR.boneInv[part[4]]).invert().multiply(_sm2.copy(bone.matrixWorld).invert()); // world -> rest pose
  const ro = at.clone().addScaledVector(rd, -0.25).applyMatrix4(_sm), d = rd.clone().transformDirection(_sm);
  const geo = (head ? a.ch.headMesh : a.ch.body).geometry, tmp = SIEGE.tmp || (SIEGE.tmp = new THREE.Mesh(geo, new THREE.MeshBasicMaterial()));
  tmp.geometry = geo; tmp.updateMatrixWorld(true); const rc = SIEGE.rc2 || (SIEGE.rc2 = new THREE.Raycaster()); rc.set(ro, d); rc.far = 0.6;
  const h = rc.intersectObject(tmp, false); const p = h.length ? h[0].point : at.clone().applyMatrix4(_sm);
  const list = a.wounds || (a.wounds = []); if (list.length >= WOUND_MAX) list.shift(); list.push(new THREE.Vector4(p.x, p.y, p.z, WOUND_T.value));
  // and where it came out: the same line, from the far side
  rc.set(_s1.copy(p).addScaledVector(d, 0.7), _s2.copy(d).negate()); rc.far = 0.68; const x = rc.intersectObject(tmp, false);
  if (x.length && x[0].point.distanceTo(p) > 0.04) { if (list.length >= WOUND_MAX) list.shift(); list.push(new THREE.Vector4(x[0].point.x, x[0].point.y, x[0].point.z, WOUND_T.value)); }
  for (const m of [a.ch.body.material.userData.U, a.ch.skin.userData.U]) { list.forEach((w, i) => m.wound.value[i].copy(w)); m.woundN.value = list.length; }
}
function shotHits(E, part, at, rd) {
  const S = SIEGE, a = E.a; E.alive = false; E.state = "dead"; a.path = null; a.arrive = null; a.setIK("R", null, 0); a.setIK("L", null, 0); a.setGrip("R", 0); a.setGrip("L", 0); a.lookPt = null; a.pre = null;
  const head = part[3] === "head" || part[3] === "neck";
  addWound(a, part, at, rd); bloodBurst(at, rd, head); addBleed(a.ch.bones[part[4]], at, part[3]); if (head) knockHat(E, rd);
  if (E.roof && a.yOff) { a.yOff = 0; a.pos.y = floorAt(a.pos.x, a.pos.z); a.root.position.copy(a.pos); } // (shot crossing the ridge: up out of the roof before he falls)
  a.root.updateMatrixWorld(true); const H = a.hang = new Ragdoll(a, null, 0); H.dead = true; if (E.roof) H.solids = E.roof.solids;
  H.onHit = (p, sp) => Sound.thud(p, clamp(sp / 6, 0.2, 0.8)); H.onRest = () => bloodPool(a, head); E.poolT = 0.9; E.headShot = head; a.pooled = false;
  // where it struck decides how he goes down
  const n = part[3], d = rd.clone().setY(Math.max(-0.2, rd.y)).normalize(), I = H.I;
  if (n === "head" || n === "neck") { H.kick(I.head, d.clone().multiplyScalar(3.6).add(V3(0, 0.5, 0)), 0.13); H.kick(I.chest, d.clone().multiplyScalar(0.7), 1.5); }
  else if (n === "chest" || n === "spine") { H.kick(I[n], d.clone().multiplyScalar(2.7), 0.3); H.kick(I.hips, d.clone().multiplyScalar(0.5).add(V3(0, -0.4, 0)), 1.5); }
  else if (n === "hips") { H.kick(I.hips, d.clone().multiplyScalar(2.2).add(V3(0, -0.8, 0)), 0.35); for (const k of ["lkn", "rkn"]) H.kick(I[k], V3(0, -0.3, 0).addScaledVector(d, -0.6), 0.12); }
  else if (/el|wr/.test(n)) { H.kick(I[n], d.clone().multiplyScalar(3.2), 0.13); H.kick(I.chest, d.clone().multiplyScalar(0.9), 0.3); H.kick(I.hips, V3(0, -0.5, 0), 1.4); }
  else { H.kick(I[n], d.clone().multiplyScalar(2.8).add(V3(0, 0.3, 0)), 0.16); H.kick(I.hips, d.clone().multiplyScalar(0.6).add(V3(0, -0.7, 0)), 0.5); }
  // up on a roof, a shot that isn't to the head mostly doubles him over the false front: half the time he pitches right over it and drops to
  // the porch roof or the street, otherwise he folds over the top and hangs there. A shot to the head, or one in four, throws him back out of sight
  const fall = E.roof && !head ? (window.GULCH_ROOFFALL || (Math.random() < 0.5 ? "over" : Math.random() < 0.5 ? "drape" : "back")) : null;
  if (fall === "over" || fall === "drape") { const f = V3(E.roof.s, 0, E.roof.c), k = fall === "over" ? 1 : 0.62;
    H.kick(I.chest, f.clone().multiplyScalar(3.2 * k).add(V3(0, 1.0 * k, 0)), 0.45); H.kick(I.hips, f.clone().multiplyScalar(2.2 * k).add(V3(0, 2.6 * k, 0)), 0.5); }
  // the gun flies out of his hand; he cries out
  E.gunV = d.clone().multiplyScalar(1.4).add(V3(rnd(-0.6, 0.6), 1.6, rnd(-0.6, 0.6))); E.gunW = V3(rnd(-9, 9), rnd(-9, 9), rnd(-9, 9));
  const pain = E.female ? siegePick("painf", 3) : siegePick("painm", 7);
  Sound.clip(pain, a.ch.bones.Head.getWorldPosition(V3()), n === "head" ? 0.8 : 1.25, n === "head" ? 0.02 : 0.06, 0.25, rnd(0.95, 1.05), 4);
  Sound.thud(at, 0.5); siegeHud();
  if (S.enemies.every(q => !q.alive)) { SLOW.t = 0; } // the last one falls in slow motion
  else if (S.enemies.filter(q => q.alive).length === 1) S.lastAt = S.t + 1.4; // and the one left standing knows it (updateSiege)
}
function siegeBodies() { // the fallen (and the man cut down) don't sink into one another
  const L = SIEGE.enemies.filter(E => !E.alive && E.a.hang).map(E => E.a.hang); if (MAN.hang && MAN.hang.free && MAN.root.visible) L.push(MAN.hang);
  for (let i = 0; i < L.length; i++) for (let j = i + 1; j < L.length; j++) { const A = L[i], B = L[j];
    if (Math.hypot(A.x[0] - B.x[0], A.x[1] - B.x[1], A.x[2] - B.x[2]) < 2.2) ragTouch(A, B); }
}
function dropGun(E, dt) { const g = E.gun; if (!E.gunV) return; const floor = surfaceAt(g.position.x, g.position.z, g.position.y) + 0.03;
  E.gunV.y -= 9.81 * dt; g.position.addScaledVector(E.gunV, dt); g.rotation.x += E.gunW.x * dt; g.rotation.y += E.gunW.y * dt; g.rotation.z += E.gunW.z * dt;
  if (g.position.y < floor) { g.position.y = floor; if (Math.abs(E.gunV.y) > 1) Sound.knock(g.position, 0.25); E.gunV.multiplyScalar(0.3); E.gunV.y = Math.abs(E.gunV.y) * 0.3; E.gunW.multiplyScalar(0.3); if (E.gunV.lengthSq() < 0.02) { E.gunV = null; g.rotation.x = Math.PI / 2 * Math.sign(g.rotation.x || 1); } } }
// ---- gore: sprays out of the exit and entry wounds, wounds that pulse and drip, spatter on the ground and on whatever stood behind him,
// spreading pools, a hat shot off, and your own blood on the screen when you're hit ----
function dropTex() { // a landed drop: a blot with a ragged rim and a few flecks (alpha)
  const c = document.createElement("canvas"); c.width = c.height = 64; const g = c.getContext("2d"); g.fillStyle = "#000"; g.fillRect(0, 0, 64, 64); g.fillStyle = "#fff";
  g.beginPath(); for (let k = 0; k <= 24; k++) { const a = k / 24 * TAU, r = 16 + 4 * Math.sin(a * 5 + 1) + Math.random() * 4, x = 32 + Math.cos(a) * r, y = 32 + Math.sin(a) * r; k ? g.lineTo(x, y) : g.moveTo(x, y); } g.fill();
  for (let k = 0; k < 7; k++) { const a = Math.random() * TAU, r = 21 + Math.random() * 9; g.beginPath(); g.arc(32 + Math.cos(a) * r, 32 + Math.sin(a) * r, 0.8 + Math.random() * 2.4, 0, TAU); g.fill(); }
  return new THREE.CanvasTexture(c);
}
function spatterTex() { // blood thrown at a surface: a dense blot breaking into drops and streaks that fan out toward +x (alpha)
  const c = document.createElement("canvas"); c.width = 256; c.height = 128; const g = c.getContext("2d"); g.fillStyle = "#000"; g.fillRect(0, 0, 256, 128); g.fillStyle = "#fff";
  g.beginPath(); for (let k = 0; k <= 30; k++) { const a = k / 30 * TAU, r = 15 + 6 * Math.sin(a * 4) + Math.random() * 6, x = 70 + Math.cos(a) * r * 1.35, y = 64 + Math.sin(a) * r; k ? g.lineTo(x, y) : g.moveTo(x, y); } g.fill();
  for (let k = 0; k < 160; k++) { const t = Math.pow(Math.random(), 0.75), ang = (Math.random() - 0.5) * 1.4 * (1 - 0.35 * t), d = 14 + t * 172, x = 70 + Math.cos(ang) * d, y = 64 + Math.sin(ang) * d * 0.55, r = (1 - t) * 5 + 0.6 + Math.random() * 2;
    g.beginPath(); g.ellipse(x, y, r * (1 + t * 2.2), r, ang * 0.55, 0, TAU); g.fill();
    if (Math.random() < 0.3) { g.beginPath(); g.moveTo(x, y - r * 0.45); g.lineTo(x - 8 - t * 22, y - Math.sin(ang) * 6); g.lineTo(x, y + r * 0.45); g.fill(); } } // the tail points back where it came from
  return new THREE.CanvasTexture(c);
}
function dotTex() { // a drop in flight: a solid core with a soft rim
  const c = document.createElement("canvas"); c.width = c.height = 32; const g = c.getContext("2d"), r = g.createRadialGradient(16, 16, 0, 16, 16, 16);
  r.addColorStop(0, "rgba(255,255,255,1)"); r.addColorStop(0.55, "rgba(255,255,255,0.95)"); r.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = r; g.fillRect(0, 0, 32, 32); return new THREE.CanvasTexture(c);
}
function splashTex() { // the instant a bullet goes in: a burst of blood flung out in petals and drops
  const c = document.createElement("canvas"); c.width = c.height = 128; const g = c.getContext("2d");
  for (let k = 0; k < 13; k++) { const a = k / 13 * TAU + Math.random() * 0.4, L = 30 + Math.random() * 30, w = 5 + Math.random() * 6; g.save(); g.translate(64, 64); g.rotate(a);
    const l = g.createLinearGradient(0, 0, L, 0); l.addColorStop(0, "rgba(255,255,255,1)"); l.addColorStop(0.7, "rgba(255,255,255,0.85)"); l.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = l; g.beginPath(); g.moveTo(0, -w); g.quadraticCurveTo(L * 0.6, -w * 0.8, L, 0); g.quadraticCurveTo(L * 0.6, w * 0.8, 0, w); g.fill();
    g.beginPath(); g.arc(L + 4 + Math.random() * 8, (Math.random() - 0.5) * 6, 2 + Math.random() * 3, 0, TAU); g.fillStyle = "rgba(255,255,255,0.9)"; g.fill(); g.restore(); }
  const r = g.createRadialGradient(64, 64, 0, 64, 64, 26); r.addColorStop(0, "rgba(255,255,255,1)"); r.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = r; g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}
function buildGore() {
  const S = SIEGE, G = S.gore = { bleed: [], walls: [], wallNext: 0, hats: [], bursts: [] };
  const sp = splashTex(); for (let i = 0; i < 6; i++) { const m = new THREE.Sprite(new THREE.SpriteMaterial({ fog: false, map: sp, color: 0x9c0c0c, transparent: true, depthWrite: false, opacity: 0 }));
    m.visible = false; m.renderOrder = 3; R.scene.add(m); G.bursts.push({ s: m, t: 1, size: 0.5 }); }
  const cloud = (N, size, col, k) => { const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(N * 3).fill(-50), 3));
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({ map: G.dot || (G.dot = dotTex()), color: col, size, transparent: true, depthWrite: false, sizeAttenuation: true, alphaTest: 0.02 }));
    pts.frustumCulled = false; R.scene.add(pts); return { pts, v: new Float32Array(N * 3), life: new Float32Array(N), n: N, next: 0, k }; };
  G.fine = cloud(700, 0.045, 0x8e0a0a, 1); G.fat = cloud(200, 0.095, 0x700707, 2);
  const sq = new THREE.PlaneGeometry(1, 1); sq.rotateX(-Math.PI / 2);
  const im = new THREE.InstancedMesh(sq, new THREE.MeshStandardMaterial({ color: 0x700606, roughness: 0.3, metalness: 0, transparent: true, alphaMap: dropTex(), depthWrite: false,
    polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }), 900);
  im.count = 0; im.frustumCulled = false; im.receiveShadow = true; im.instanceMatrix.setUsage(THREE.DynamicDrawUsage); R.scene.add(im); G.splat = { im, n: 900, next: 0, used: 0 };
  const wm = new THREE.MeshStandardMaterial({ color: 0x700606, roughness: 0.3, metalness: 0, transparent: true, alphaMap: spatterTex(), depthWrite: false, side: THREE.DoubleSide,
    polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 });
  for (let i = 0; i < 14; i++) { const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 0.5), wm); m.visible = false; m.userData.dyn = true; R.scene.add(m); G.walls.push(m); }
  G.mist = []; for (let i = 0; i < 12; i++) { const m = new THREE.Sprite(new THREE.SpriteMaterial({ fog: false, map: TEX.dust, color: 0x700909, transparent: true, depthWrite: false, opacity: 0 }));
    m.visible = false; R.scene.add(m); G.mist.push({ s: m, t: 1, v: new THREE.Vector3(), size: 0.4, dur: 0.7 }); }
  S.bloodMat = new THREE.MeshStandardMaterial({ color: 0x640505, roughness: 0.26, metalness: 0, transparent: true, alphaMap: splatTex(), depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
}
const _b1 = new THREE.Vector3(), _b2 = new THREE.Vector3(), _b3 = new THREE.Vector3(), _b4 = new THREE.Vector3(), _bq = new THREE.Quaternion(), _bm = new THREE.Matrix4();
function goreFloor(x, z, y) { const T = LAY.trap; return Math.abs(x - T.x) < T.w / 2 && Math.abs(z - T.z) < T.d / 2 ? groundHeight(x, z) : surfaceAt(x, z, y); } // (through the open trap to the ground; y: from what height, for the porch roofs)
function spray(D, p, v, life) { const j = D.next; D.next = (D.next + 1) % D.n; D.pts.geometry.attributes.position.setXYZ(j, p.x, p.y, p.z); D.v[j * 3] = v.x; D.v[j * 3 + 1] = v.y; D.v[j * 3 + 2] = v.z; D.life[j] = life; D.dirty = true; }
function addSplat(p, size, stretch, ang) { // a drop landed: a blot on the ground, drawn out the way it was going
  const G = SIEGE.gore.splat; _bq.setFromAxisAngle(V_UP, ang); _bm.compose(p, _bq, _b4.set(size * stretch, 1, size)); G.im.setMatrixAt(G.next, _bm);
  G.next = (G.next + 1) % G.n; G.used = Math.min(G.n, G.used + 1); G.im.count = G.used; G.im.instanceMatrix.needsUpdate = true;
}
function bloodBurst(at, rd, head) {
  const G = SIEGE.gore, k = head ? 1.6 : 1;
  for (let i = 0; i < (head ? 2 : 1); i++) { const b = G.bursts.find(q => q.t >= 1) || G.bursts[0]; b.t = 0; b.s.visible = true; b.s.position.copy(at).addScaledVector(rd, -0.12 + i * 0.25);
    b.size = (head ? 0.75 : 0.5) * rnd(0.85, 1.15); b.s.material.rotation = Math.random() * TAU; } // a burst of red you can see from across the street
  for (let i = 0; i < 95 * k; i++) spray(G.fine, at, _b1.copy(rd).multiplyScalar(rnd(1.8, 6.5)).add(_b2.set(rnd(-1.3, 1.3), rnd(-0.3, 1.7), rnd(-1.3, 1.3))), rnd(2, 4)); // out the back, along the shot
  for (let i = 0; i < 28 * k; i++) spray(G.fat, at, _b1.copy(rd).multiplyScalar(rnd(1.2, 4.2)).add(_b2.set(rnd(-0.9, 0.9), rnd(0, 1.9), rnd(-0.9, 0.9))), rnd(2, 4));
  for (let i = 0; i < 40; i++) spray(G.fine, at, _b1.copy(rd).multiplyScalar(-rnd(0.6, 2.6)).add(_b2.set(rnd(-0.7, 0.7), rnd(0, 1.1), rnd(-0.7, 0.7))), rnd(1.5, 3)); // a puff back out of the entry hole, toward you
  for (let i = 0; i < 12; i++) spray(G.fat, at, _b1.set(rnd(-0.6, 0.6), rnd(-0.5, 0.4), rnd(-0.6, 0.6)), 3); // and a gush that falls at his feet
  for (let i = 0; i < (head ? 8 : 4); i++) { const m = G.mist.find(q => q.t >= 1) || G.mist[i]; m.t = 0; m.s.visible = true; m.s.position.copy(at).addScaledVector(rd, rnd(0, 0.3));
    m.v.copy(rd).multiplyScalar(rnd(0.3, 1.3)).add(_b2.set(rnd(-0.3, 0.3), rnd(0, 0.4), rnd(-0.3, 0.3))); m.size = head ? rnd(0.6, 1.05) : rnd(0.35, 0.6); m.dur = head ? rnd(0.8, 1.3) : rnd(0.5, 0.8);
    m.s.material.color.setHex(head ? 0xa01818 : 0x8a0c0c); m.s.material.rotation = Math.random() * TAU; }
  const from = _b3.copy(at).addScaledVector(rd, 0.3), hit = sceneryRay(from, rd, head ? 4.5 : 3.5); // whatever stood behind him gets painted
  if (hit) wallSpatter(hit, rd, head ? rnd(0.9, 1.35) : rnd(0.6, 1.0));
}
function wallSpatter(hit, rd, size) {
  const G = SIEGE.gore, m = G.walls[G.wallNext]; G.wallNext = (G.wallNext + 1) % G.walls.length;
  const n = hit.face ? _b1.copy(hit.face.normal).transformDirection(hit.object.matrixWorld) : _b1.set(0, 1, 0); if (n.dot(rd) > 0) n.negate();
  const t = _b2.copy(rd).addScaledVector(n, -rd.dot(n)); if (t.lengthSq() < 1e-4) t.set(n.y, -n.x, 0); t.normalize(); // the streaks run on along the shot
  const b = _b3.crossVectors(n, t); _bm.makeBasis(t, b, n); m.quaternion.setFromRotationMatrix(_bm);
  m.position.copy(hit.point).addScaledVector(n, 0.012).addScaledVector(t, size * 0.23); m.scale.set(size, size, 1); m.visible = true;
}
// the wound keeps bleeding where it rides on the body: drips, and while his heart still beats, spurts (hard from the head, neck and chest)
function addBleed(bone, at, n) { const art = n === "head" || n === "neck" ? 1.3 : n === "chest" || n === "spine" ? 1 : 0.6;
  SIEGE.gore.bleed.push({ bone, p: bone.worldToLocal(at.clone()), t: 0, life: rnd(8, 12), art, beat: rnd(0.15, 0.4), acc: 0 }); }
function knockHat(E, rd) { const h = E.a.ch.hat; if (!h || E.hatOff) return;
  E.hatOff = { obj: h, parent: h.parent, p: h.position.clone(), q: h.quaternion.clone(), s: h.scale.clone(), v: rd.clone().multiplyScalar(rnd(1.6, 2.6)).add(V3(rnd(-0.4, 0.4), rnd(1.8, 2.8), rnd(-0.4, 0.4))),
    w: V3(rnd(-10, 10), rnd(-6, 6), rnd(-10, 10)), rest: false }; R.scene.attach(h); SIEGE.gore.hats.push(E); }
function updateBlood(dt) {
  const G = SIEGE.gore;
  for (const D of [G.fine, G.fat]) { const pos = D.pts.geometry.attributes.position, a = pos.array; let any = D.dirty; D.dirty = false;
    for (let j = 0; j < D.n; j++) { if (D.life[j] <= 0) continue; any = true; const k = j * 3; D.life[j] -= dt;
      let vx = D.v[k], vy = D.v[k + 1] - 9.81 * dt, vz = D.v[k + 2]; const drag = 1 - 0.35 * dt; vx *= drag; vz *= drag;
      const x = a[k] + vx * dt, y = a[k + 1] + vy * dt, z = a[k + 2] + vz * dt, fy = goreFloor(x, z, a[k + 1]);
      if (y <= fy + 0.004) { // it lands: a splat where it hits, drawn out the way it was going
        if (Math.random() < (D.k === 2 ? 0.95 : 0.45)) { const sp = Math.hypot(vx, vz); addSplat(_b1.set(x, fy + 0.003, z), (D.k === 2 ? rnd(0.1, 0.24) : rnd(0.04, 0.1)) * (0.85 + 0.12 * Math.min(4, -vy)), 1 + Math.min(2.4, sp * 0.5), Math.atan2(-vz, vx)); }
        D.life[j] = 0; a[k + 1] = -50; continue; }
      a[k] = x; a[k + 1] = y; a[k + 2] = z; D.v[k] = vx; D.v[k + 1] = vy; D.v[k + 2] = vz; if (D.life[j] <= 0) a[k + 1] = -50; }
    if (any) pos.needsUpdate = true; }
  for (const m of G.mist) { if (m.t >= 1) continue; m.t = Math.min(1, m.t + dt / m.dur); m.s.position.addScaledVector(m.v, dt); m.v.multiplyScalar(1 - 1.5 * dt); m.v.y -= 0.3 * dt;
    m.s.scale.setScalar(0.1 + Math.sqrt(m.t) * m.size); m.s.material.opacity = 0.8 * (1 - m.t) * (1 - m.t); if (m.t >= 1) m.s.visible = false; }
  for (const b of G.bursts) { if (b.t >= 1) continue; b.t = Math.min(1, b.t + dt / 0.28); b.s.scale.setScalar(b.size * (0.35 + 0.65 * Math.sqrt(b.t))); b.s.material.opacity = 1 - b.t * b.t; if (b.t >= 1) b.s.visible = false; }
  for (const E of SIEGE.enemies) if (!E.alive && E.poolT > 0 && (E.poolT -= dt) <= 0) bloodPool(E.a, E.headShot); // the pool starts as soon as he's down
  for (const b of G.bleed) { if (b.t > b.life) continue; b.t += dt;
    const w = b.bone.localToWorld(_b1.copy(b.p)), n = _b2.subVectors(w, b.bone.getWorldPosition(_b3)).normalize();
    b.acc += dt * (b.t < 3 ? 18 : 6) * (1 - b.t / b.life);
    while (b.acc >= 1) { b.acc -= 1; spray(G.fine, w, _b3.copy(n).multiplyScalar(rnd(0.1, 0.5)).add(_b4.set(rnd(-0.12, 0.12), rnd(-0.25, 0.1), rnd(-0.12, 0.12))), 3); }
    if (b.t < 6) { b.beat -= dt; if (b.beat <= 0) { b.beat = 0.72 + b.t * 0.09; const k = b.art * (1 - b.t / 6);
      for (let i = 0; i < 14 * k; i++) spray(G.fine, w, _b3.copy(n).multiplyScalar(rnd(0.8, 2.6) * k + 0.3).add(_b4.set(rnd(-0.25, 0.25), rnd(0.2, 0.8), rnd(-0.25, 0.25))), 3);
      if (k > 0.4) for (let i = 0; i < 3; i++) spray(G.fat, w, _b3.copy(n).multiplyScalar(rnd(0.6, 1.8) * k + 0.2).add(_b4.set(rnd(-0.15, 0.15), rnd(0.2, 0.6), rnd(-0.15, 0.15))), 3); } } }
  for (const E of G.hats) { const st = E.hatOff; if (!st || st.rest) continue; const h = st.obj, fl = goreFloor(h.position.x, h.position.z, h.position.y) + 0.02;
    st.v.y -= 9.81 * dt; h.position.addScaledVector(st.v, dt); h.rotation.x += st.w.x * dt; h.rotation.y += st.w.y * dt; h.rotation.z += st.w.z * dt;
    if (h.position.y < fl) { h.position.y = fl; st.v.multiplyScalar(0.35); st.v.y = Math.abs(st.v.y) * 0.3; st.w.multiplyScalar(0.35);
      if (st.v.lengthSq() < 0.04) { st.rest = true; h.rotation.set(Math.random() < 0.6 ? 0 : Math.PI, Math.random() * TAU, 0); h.position.y = fl + (h.rotation.x ? 0.12 : 0); } } }
  for (const P of SIEGE.pools) { P.t += dt; const s = P.r * (1 - Math.exp(-P.t / 3.2)); P.m.scale.set(s, s, 1); }
}
function bloodPool(a, head) { // where he lies it spreads, wide and dark; a shot to the head pools round the head as well
  const H = a.hang; if (!H || a.pooled) return; a.pooled = true; const at = (c, r) => { const y = goreFloor(c.x, c.z, c.y) + 0.006 + SIEGE.pools.length * 0.0004;
    const m = new THREE.Mesh(SIEGE.poolGeo || (SIEGE.poolGeo = new THREE.PlaneGeometry(2, 2)), SIEGE.bloodMat); m.rotation.x = -Math.PI / 2; m.rotation.z = Math.random() * TAU;
    m.position.set(c.x, y, c.z); m.scale.set(0.01, 0.01, 1); m.receiveShadow = true; R.scene.add(m); SIEGE.pools.push({ m, t: 0, r }); };
  at(H.P("chest", V3()).lerp(H.P("hips", V3()), 0.4), rnd(1.1, 1.55)); if (head) at(H.P("head", V3()), rnd(0.55, 0.85));
}
// your own blood on the lens when you're hit: blots with runs below them, gone in a few seconds
function screenBlood(n) {
  const box = $("gore"); if (!box) return;
  for (let i = 0; i < n; i++) { const d = document.createElement("div"); d.className = "splat";
    const N = 18, P = []; for (let k = 0; k < N; k++) { const a = k / N * TAU, r = 25 + rnd(-5, 6) + (k % 3 === 0 ? rnd(4, 12) : 0); P.push([50 + Math.cos(a) * r, 45 + Math.sin(a) * r * 0.9]); }
    const mid = (a, b) => ((a[0] + b[0]) / 2).toFixed(1) + " " + ((a[1] + b[1]) / 2).toFixed(1); // a smooth blot: curves through the midpoints
    let path = "M" + mid(P[N - 1], P[0]); for (let k = 0; k < N; k++) path += "Q" + P[k][0].toFixed(1) + " " + P[k][1].toFixed(1) + " " + mid(P[k], P[(k + 1) % N]);
    let runs = ""; for (let k = 0; k < 3; k++) { const x = rnd(30, 70), w = rnd(2.5, 5), l = rnd(25, 80); runs += `<rect x="${(x - w / 2).toFixed(1)}" y="45" width="${w.toFixed(1)}" height="${l.toFixed(1)}" rx="${(w / 2).toFixed(1)}"/>`; }
    d.innerHTML = `<svg viewBox="0 0 100 140" aria-hidden="true"><g fill="#5e0202" fill-opacity=".88"><path d="${path}Z"/>${runs}</g><path d="${path}Z" fill="#2a0000" fill-opacity=".5" transform="translate(50 45) scale(.55) translate(-50 -45)"/></svg>`;
    const edge = Math.random() < 0.5, x = edge ? rnd(-10, 22) : rnd(62, 92), y = rnd(-8, 55), sz = rnd(26, 44);
    d.style.cssText = `left:${x}%;top:${y}%;width:${sz}vmin;transform:rotate(${rnd(-25, 25).toFixed(0)}deg)`; box.appendChild(d); setTimeout(() => d.remove(), 3800); }
}

// ---- the player: cover, aim, run ----
function coverTap(e) {
  const S = SIEGE; if (S.run) return; const r = $("scene").getBoundingClientRect();
  const ndc = new THREE.Vector2((e.clientX - r.left) / r.width * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), rc = S.rc3 || (S.rc3 = new THREE.Raycaster());
  rc.setFromCamera(ndc, R.camera); const hit = rc.intersectObjects(S.covers.map(C => C.grp), true)[0];
  const i = hit ? hit.object.userData.cover : undefined;
  if (i === undefined || i === S.cover) return;
  const C = S.covers[i]; S.run = { from: CAM.pos.clone(), to: C.stand.clone(), t: 0, dur: Math.max(0.5, CAM.pos.distanceTo(C.stand) / SIEGE_CFG.runSpeed), to_i: i }; S.crouch = true;
}
// up from cover only while Aim is held (a finger on the pad, or Shift or A on a keyboard); let go and you're straight back down
function peek(on) { SIEGE.holding = on; }
function nudgeAim() { // Fire pressed while you're down: show where to press first
  const a = $("padAim"); a.classList.remove("nudge"); void a.offsetWidth; a.classList.add("nudge");
  const t = $("siegeTip"); t.textContent = "Hold Aim to come up, then fire"; t.hidden = false; SIEGE.tip = Math.max(SIEGE.tip, 1.8);
}
function aimDown(e) { const S = SIEGE; if (!S.on) return; S.aimId = e.pointerId; S.aimX = e.clientX; S.aimY = e.clientY; peek(true); $("padAim").classList.add("on"); try { e.currentTarget.setPointerCapture(e.pointerId); } catch (er) {} e.preventDefault(); }
function aimMove(e) { const S = SIEGE; if (e.pointerId !== S.aimId || (S.phase !== "fight" && S.phase !== "doomed" && S.phase !== "cleared")) return;
  const k = SIEGE_CFG.sens * (CAM.fov / 52); S.yaw -= (e.clientX - S.aimX) * k; S.pitch -= (e.clientY - S.aimY) * k; S.aimX = e.clientX; S.aimY = e.clientY;
  const C = S.covers[S.cover]; let d = ((S.yaw - C.yaw0 + Math.PI) % TAU + TAU) % TAU - Math.PI; d = clamp(d, -SIEGE_CFG.yawLim, SIEGE_CFG.yawLim); S.yaw = C.yaw0 + d;
  S.pitch = clamp(S.pitch, SIEGE_CFG.pitchLo, SIEGE_CFG.pitchHi); e.preventDefault(); }
function aimUp(e) { if (e.pointerId === SIEGE.aimId) { SIEGE.aimId = null; peek(false); $("padAim").classList.remove("on"); } }
function updatePlayer(rdt, dt) {
  const S = SIEGE, C = S.covers[S.cover];
  S.cool = Math.max(0, S.cool - dt); S.recoil = Math.max(0, S.recoil - dt * 4.5); S.vm.kick = Math.max(0, S.vm.kick - dt * 6);
  let base;
  if (S.phase === "fight" || S.phase === "doomed" || S.phase === "cleared") { const up = (S.holding || S.keyAim) && !S.run;
    S.crouch = !up; S.upT = S.crouch ? 0 : S.upT + dt; // (how long you've been up: nobody fires at you in your first 0.3 s)
    S.downT = S.crouch && !S.run && S.phase === "fight" ? S.downT + dt : 0; } // (how long you've stayed down: too long and they call you out)
  if (S.run) { S.run.t = Math.min(1, S.run.t + dt / S.run.dur); const e = Ease.inOut(S.run.t), R0 = S.run;
    base = R0.via ? V3().copy(R0.from).multiplyScalar((1 - e) * (1 - e)).addScaledVector(R0.via, 2 * e * (1 - e)).addScaledVector(R0.to, e * e) : V3().lerpVectors(R0.from, R0.to, e);
    base.y = lerp(S.run.from.y, 1.42, Math.min(1, S.run.t * (R0.look ? 2.2 : 3))) + Math.abs(Math.sin(S.run.t * Math.PI * 4)) * 0.05;

    if (S.run.t >= 1) { const pick = S.run.pick; S.cover = S.run.to_i; S.run = null; S.cv = 0.6; if (pick) laserTake(); const C2 = S.covers[S.cover], d = ((S.yaw - C2.yaw0 + Math.PI) % TAU + TAU) % TAU - Math.PI; S.yaw = C2.yaw0 + clamp(d, -SIEGE_CFG.yawLim, SIEGE_CFG.yawLim); } }
  if (!S.run) { S.cv += ((S.crouch ? 1 : 0) - S.cv) * Math.min(1, dt * 9); base = V3().copy(S.covers[S.cover].stand); base.y = lerp(SIEGE_CFG.eye, SIEGE_CFG.crouchEye, Ease.inOut(clamp(S.cv, 0, 1)));
    if (S.cv < 0.5) base.addScaledVector(S.covers[S.cover].side, 0.08 * (1 - S.cv)); }
  if (S.phase === "dead") { S.deadT += rdt; const k = Ease.inOut(Math.min(1, S.deadT / 0.9)); base.y = lerp(base.y, 0.32, k); }
  let yaw = S.yaw, pitch = S.pitch + S.recoil * 0.05 + (S.phase === "dead" ? -0.35 * Math.min(1, S.deadT) : 0);
  if (S.run && S.run.look) { // up off the ground: eyes on the gallows he just fell from (up at the cut rope at first), backing away to the crates
    const f = SIEGE_FOCUS, ty = Math.atan2(f.x - base.x, f.z - base.z), k = smoothstep(0.6, 0.97, S.run.t), d = ((S.yaw - ty + Math.PI) % TAU + TAU) % TAU - Math.PI;
    yaw = ty + d * k; pitch = lerp(lerp(0.6, 0.05, smoothstep(0.0, 0.45, S.run.t)), pitch, k); }
  const dir = V3(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch));
  CAM.pos.copy(base); CAM.tgt.copy(base).add(dir); CAM.fov = 54; CAM.to = null; CAM.follow = null; CAM.name = "siege";
  $("xhair").hidden = (S.phase !== "fight" && S.phase !== "doomed" && S.phase !== "cleared") || S.cv > 0.25 || !!S.run;
}

// ---- endings ----
async function siegeDie() {
  const S = SIEGE; if (S.phase === "dead") return; S.phase = "dead"; S.deadT = 0; S.crouch = false; showSiegeUI("dead"); screenBlood(4); $("xhair").hidden = true;
  $("hitMsg").hidden = true; setTimeout(() => { $("doomMsg").hidden = true; }, 900);
  for (const E of S.enemies) if (E.alive) { E.state = "pause"; E.t = 99; }
  Sound.duck(0.05, 1.5); await wait(2.0); if (!S.on) return;
  S.loseLine = ["Dig a hole out back, boys.", "Folks came for a hangin'. They got one."].find(q => !QUIP_SAID.has(q)) || SIEGE_LINES.lose;
  say(null, S.loseLine); await wait(3.2); if (!S.on) return;
  STATE.streak = 0; savePrefs(); showSiegeSign(false);
}
async function siegeWin() {
  const S = SIEGE; if (S.phase !== "fight" && S.phase !== "doomed") return; // (once: from the shot that drops the last of them)
  STATE.lastWon = true; STATE.streak++; STATE.best = Math.max(STATE.best, STATE.streak); savePrefs(); // the win counts now, whatever comes after
  if (BELL.unlocked) { // the bell was rung during the fight: a moment to take in that they're all down, then the getaway (12g)
    S.phase = "won"; showSiegeUI("end"); $("xhair").hidden = true; S.holding = S.keyAim = false;
    const n = S.enemies.length, N = NUM_WORDS[n] || String(n), m = $("clearMsg"); $("clearLine").textContent = `${N} down · Streak: ${STATE.streak} · Best: ${STATE.best}`;
    m.classList.add("brief"); m.hidden = false; m.classList.remove("show"); void m.offsetWidth; m.classList.add("show");
    await wait(1.8); m.hidden = true; m.classList.remove("brief"); if (!S.on || S.phase !== "won") return; startGetaway(); return; }
  enterCleared(); // no bell: the street is yours, gun still in hand (12f)
}
function showSiegeSign(won) {
  STATE.locked = false; STATE.ts = 1; $("skip").hidden = true;
  const t = $("signTitle"); t.textContent = won ? "YOU SURVIVED" : "GAME OVER"; t.className = won ? "" : "lose"; signAgain(won); $("signWord").textContent = STATE.word; signMeaning(STATE.word, false); // (he hanged: the word was missed)
  const n = SIEGE.enemies.length, N = NUM_WORDS[n] || String(n);
  $("signLine").textContent = won ? `${SIEGE.shots <= n ? `${N} shots, ${N.toLowerCase()} down` : `${N} down in ${SIEGE.shots} shots`} · Streak: ${STATE.streak} · Best: ${STATE.best}` : SIEGE.loseLine || SIEGE_LINES.lose;
  $("sign").hidden = false; $("againBtn").focus({ preventScroll: true });
}

// ---- HUD and the touch pad ----
const SIEGE_TIP = "Hold Aim to come up · Fire to shoot · tap cover to move";
// the warning for a man taking aim from outside your view: an arc round the crosshair at twelve o'clock with a small point on its outside,
// fading at both ends, turned to face him (siegeLate)
const THREAT_SVG = '<svg viewBox="0 0 200 200" aria-hidden="true"><defs><linearGradient id="thrG" gradientUnits="userSpaceOnUse" x1="58" y1="0" x2="142" y2="0">'
  + '<stop offset="0" stop-color="#ff2a1a" stop-opacity="0"/><stop offset=".3" stop-color="#ff2a1a"/><stop offset=".7" stop-color="#ff2a1a"/><stop offset="1" stop-color="#ff2a1a" stop-opacity="0"/></linearGradient></defs>'
  + '<path class="u" d="M58.6 24.6A86 86 0 0 1 141.4 24.6" fill="none" stroke="#000" stroke-opacity=".45" stroke-width="9" stroke-linecap="round"/>'
  + '<path class="a" d="M58.6 24.6A86 86 0 0 1 141.4 24.6" fill="none" stroke="url(#thrG)" stroke-width="5.5" stroke-linecap="round"/>'
  + '<path d="M93 11.5L100 3l7 8.5z" fill="#ff2a1a" stroke="#000" stroke-opacity=".45" stroke-width="1.5" stroke-linejoin="round"/></svg>';
function buildSiegeUI() {
  const pad = document.createElement("div"); pad.id = "pad"; pad.hidden = true;
  pad.innerHTML = '<div id="padAim" role="button" aria-label="Aim: drag to look"><svg viewBox="0 0 48 48" width="40" height="40" aria-hidden="true"><circle cx="24" cy="24" r="15" fill="none" stroke="currentColor" stroke-width="2.5"/><path d="M24 3v10M24 35v10M3 24h10M35 24h10" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg><span>Aim</span></div>'
    + '<div id="padFire" role="button" aria-label="Fire"><svg viewBox="0 0 48 48" width="40" height="40" aria-hidden="true"><circle cx="24" cy="24" r="17" fill="currentColor" opacity=".18"/><circle cx="24" cy="24" r="9" fill="currentColor"/></svg><span>Fire</span></div>';
  $("kb").appendChild(pad);
  const aim = $("padAim"); aim.addEventListener("pointerdown", aimDown); aim.addEventListener("pointermove", aimMove); for (const ev of ["pointerup", "pointercancel", "lostpointercapture"]) aim.addEventListener(ev, aimUp);
  $("padFire").addEventListener("pointerdown", e => { e.preventDefault(); $("padFire").classList.add("on"); fireTap(); });
  for (const ev of ["pointerup", "pointercancel", "pointerleave"]) $("padFire").addEventListener(ev, () => { $("padFire").classList.remove("on"); laserTrigger(false); });
  const st = $("stage");
  for (const [id, html] of [["xhair", '<svg viewBox="0 0 40 40" width="40" height="40" aria-hidden="true"><circle cx="20" cy="20" r="11" fill="none" stroke="#000" stroke-opacity=".55" stroke-width="3.2"/><circle cx="20" cy="20" r="11" fill="none" stroke="#f4ead8" stroke-width="1.6"/><circle cx="20" cy="20" r="1.8" fill="#e2483a"/></svg>'],
    ["hurt", ""], ["gore", ""], ["siegeTip", SIEGE_TIP], ["hitMsg", ""], ["doomMsg", "<b>Out of bullets</b><span>They know your gun is empty</span>"], ["warn", '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M4 7l8 9 8-9" fill="none" stroke="#000" stroke-opacity=".5" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/><path d="M4 7l8 9 8-9" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>'],
    ["threat", THREAT_SVG], ["clearMsg", '<b>You survived</b><span id="clearLine"></span><button id="clearDone" type="button">Done</button>']]) { const d = document.createElement("div"); d.id = id; d.hidden = id !== "hurt" && id !== "gore"; d.innerHTML = html; st.appendChild(d); }
  $("clearDone").addEventListener("click", e => { e.stopPropagation(); finishCleared(); });
  const rb = document.createElement("span"); rb.id = "reloads"; rb.hidden = true; $("gun").appendChild(rb); // (the spare speedloader: gunHud)
  const hp = document.createElement("span"); hp.id = "hp"; hp.hidden = true; hp.setAttribute("aria-label", "Health"); $("gun").appendChild(hp);
}
// the bottom panel and top bar: "fight" (the aim | fire pad), "cut" and "end" (nothing to press, the letters stay hidden), "dead" (the pad,
// dimmed under the sign), "off" (back to the letters)
function showSiegeUI(mode) {
  const pad = mode === "fight" || mode === "dead";
  $("pad").hidden = !pad; $("kb").classList.toggle("siege", mode !== "off"); $("hp").hidden = $("reloads").hidden = !(pad || mode === "end"); if (mode === "off") gunHud.key = null;
  $("left").hidden = mode !== "off"; $("hud").classList.toggle("siege", mode !== "off"); // in the shootout the cylinder alone shows what's loaded: no number beside it
  $("hintBtn").style.display = mode === "off" ? "" : "none"; $("siegeTip").hidden = mode !== "fight"; $("padAim").classList.remove("on", "nudge"); // (the hint button: out of the bar altogether, so the count of gunmen left has room)
  if (mode === "fight") { $("siegeTip").textContent = SIEGE_TIP; SIEGE.tip = 5; SIEGE.tipNext = SIEGE_TIP2 = `Six in the gun, one reload · ${siegeMen()} gunmen, two on the roofs`; $("kb").classList.add("up"); }
}
const NUM_WORDS = ["No", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve"];
const siegeMen = () => 7 + ROOF_MEN.filter(m => WORLD.roofs.some(q => q.name === m.roof)).length; // the six townsfolk, the executioner, the men on the roofs
let SIEGE_TIP2 = "";
// the hearts in the top bar: full, or an empty outline once lost; the one you just lost swells, flashes and breaks first
const HEART_D = "M12 21s-7.5-4.6-9.6-9.3C.9 8.3 3 4.6 6.6 4.6c2.2 0 3.6 1.2 5.4 3.2 1.8-2 3.2-3.2 5.4-3.2 3.6 0 5.7 3.7 4.2 7.1C19.5 16.4 12 21 12 21z";
// the hearts: full, or an empty outline once lost; the one you just lost swells, flashes and breaks first
function heartsHud(hp) {
  const el = $("hp"), n = GUN.hearts;
  if (el.children.length !== n) el.innerHTML = Array.from({ length: n }, () => `<svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true"><path d="${HEART_D}"/></svg>`).join("");
  [...el.children].forEach((h, i) => { const gone = i >= hp;
    if (gone && !h.classList.contains("gone")) { h.classList.add("gone", "lost"); h.addEventListener("animationend", () => h.classList.remove("lost"), { once: true }); }
    else if (!gone) h.classList.remove("gone", "lost"); });
  el.setAttribute("aria-label", `Health ${hp} of ${n}`);
}
// the gun in the top bar, the same in the shootout and the getaway: the cylinder (gold chambers loaded; while it reloads they fill one by
// one, reloadK 0 → 1, else -1), and beside it the spare speedloader, there while you've a reload left. Redrawn only when something shows different
function gunHud(loaded, reloads, reloadK, hp, total = GUN.reloads) { // (total: the reloads this section started with: a speedloader for each, gold while it's still there)
  const n = GUN.rounds, shown = reloadK >= 0 ? Math.min(n, Math.floor(reloadK * (n + 1))) : loaded, key = `${shown}|${reloads}|${reloadK >= 0}|${total}`;
  if (gunHud.key !== key) { gunHud.key = key;
    let s = `<circle r="46" fill="#3a3430" stroke="#14110f" stroke-width="3"/><circle r="40" fill="none" stroke="#5b524a" stroke-width="1.5"/><g style="transform:rotate(${-(n - shown) * 360 / n}deg)">`;
    for (let i = 0; i < n; i++) { const a = i / n * TAU - Math.PI / 2, x = (Math.cos(a) * 25).toFixed(1), y = (Math.sin(a) * 25).toFixed(1), f = i < shown;
      s += `<circle cx="${x}" cy="${y}" r="10" fill="${f ? "#d8a246" : "#0e0b09"}" stroke="#6b5a45" stroke-width="2"/>` + (f ? `<circle cx="${x}" cy="${y}" r="3.6" fill="#9c6f22"/>` : ""); }
    $("cyl").innerHTML = s + `</g><circle r="7" fill="#262120"/>`;
    const rb = $("reloads"), spare = reloads > 0, left = reloads === 1 ? "one reload left" : `${reloads} reloads left`; let d = ""; for (let i = 0; i < n; i++) { const a = i / n * TAU - Math.PI / 2; d += `<circle cx="${(12 + Math.cos(a) * 6).toFixed(1)}" cy="${(12 + Math.sin(a) * 6).toFixed(1)}" r="2.5"/>`; }
    const px = total > 1 ? 18 : 22; rb.classList.toggle("many", total > 1);
    rb.innerHTML = Array.from({ length: Math.max(1, total) }, (_, i) => `<svg viewBox="0 0 24 24" width="${px}" height="${px}" aria-hidden="true" class="${i < reloads ? "full" : "spent"}"><circle cx="12" cy="12" r="10.5" fill="#3a3430" stroke="#14110f" stroke-width="1.5"/><g fill="${i < reloads ? "#d8a246" : "#0e0b09"}" stroke="#6b5a45" stroke-width=".8">${d}</g></svg>`).join("");
    rb.classList.toggle("used", !spare); rb.title = spare ? left[0].toUpperCase() + left.slice(1) : "No reloads left"; rb.setAttribute("aria-label", rb.title);
    $("gun").title = reloadK >= 0 ? "Reloading" : `${loaded} round${loaded === 1 ? "" : "s"} loaded, ${spare ? left : "no reloads left"}`; $("gun").setAttribute("aria-label", $("gun").title); }
  $("gun").classList.toggle("reloading", reloadK >= 0); // (the cylinder spins while it refills)
  heartsHud(hp);
}
const narrowHud = () => R.w < 460; // (a phone held upright: shorter words beside the gun and the hearts)
function siegeHud() {
  const S = SIEGE; if (laserHeld()) { laserHud(); heartsHud(S.health); } else gunHud(S.bullets, S.reloads, S.reloadT > 0 ? 1 - S.reloadT / GUN.reload : -1, S.health);
  const n2 = S.enemies.filter(E => E.alive).length; $("meta").textContent = !S.on ? $("meta").textContent : laserHeld() ? laserMeta(n2) : S.reloadT > 0 ? (narrowHud() ? "" : "Reloading…") : narrowHud() ? `${n2} left` : `${n2} gunm${n2 === 1 ? "a" : "e"}n left`;
}

// ---- per frame ----
function updateSiege(rdt, dt) {
  const S = SIEGE; if (!S.sword) return;
  // the sword can be taken up: four seconds, and then (the GAME OVER sign up by now) for as long as the sign stays ("late")
  if (S.phase === "window" || S.phase === "late") {
    if (S.phase === "window") { if ($("menu").hidden) S.winLeft -= rdt; if (S.winLeft <= 0) S.phase = "late"; } // (on the frame clock, unslowed; it stops while the menu is open)
    const g = S.sword.glint, t = (S.gT = (S.gT || 0) + rdt), pulse = 0.55 + 0.45 * Math.sin(t * 7.5); g.visible = true; g.material.opacity = Math.min(1, t * 4) * (0.55 + 0.45 * pulse);
    g.position.copy(S.sword.group.localToWorld(_s1.set(0.004, 0.16 + 0.05 * Math.sin(t * 2.3), 0.01))); g.scale.setScalar(0.26 + 0.2 * pulse); g.material.rotation = t * 0.8;
    swordShine(rdt, true); }
  else if (S.sword.shine.k.value) swordShine(0, false);
  if (!S.on) return;
  WOUND_T.value += dt;
  STATE.ts = $("menu").hidden ? 1 : 0; // the shootout holds still while the menu is open
  if (!$("menu").hidden) return;
  S.t += dt; if (S.tip > 0) { S.tip -= rdt; if (S.tip <= 0) { if (S.tipNext && S.phase === "fight") { $("siegeTip").textContent = S.tipNext; S.tipNext = null; S.tip = 3.5; } else $("siegeTip").hidden = true; } }
  if (S.hitT > 0) { S.hitT -= rdt; if (S.hitT <= 0) $("hitMsg").hidden = true; }
  for (const a of S.roofActors) if (a.root.visible) a.update(dt); // (the crowd and the executioner are updated with the town)
  updateEnemies(dt); updateBlood(dt); siegeBodies();
  if (S.reloadT > 0) { S.reloadT -= dt; if (S.reloadT <= 0) { S.reloadT = 0; S.bullets = GUN.rounds; Sound.clip(siegePick("cock", 2), null, 0.75, 0, 0.05); } siegeHud(); } // (the chambers fill one by one in the top bar)
  if (S.phase === "fight" || S.phase === "doomed" || S.phase === "dead" || S.phase === "cleared") updatePlayer(rdt, dt);
  // out of bullets: a word from one of them, then they take turns, one shot every 0.85 s, each a heart, till you're down
  if (S.phase === "doomed") { S.doomT += dt;
    if (!S.doomSaid && S.doomT > 0.35) S.doomSaid = doomTaunt() || S.doomT > 1.2;
    if (S.doomT >= (S.doomFirst ?? SIEGE_CFG.doom[0]) + S.doomI * (S.doomGap ?? SIEGE_CFG.doom[1])) { const alive = S.enemies.filter(q => q.alive), E = alive[S.doomI % Math.max(1, alive.length)];
      if (E && E.state !== "aim") { E.state = "aim"; E.t = E.tAim = 0.3; E.a.path = null; Sound.clip(siegePick("cock", 2), E.gun.position, 0.9, 0.05, 0.1, rnd(0.95, 1.05), 4); }
      S.doomI++; } }
  // the taunts that wait on a moment rather than on someone taking aim
  if (S.phase === "fight") {
    if (S.t > 6 && !S.said.has(TAUNTS.getaway[1])) taunt("getaway", tauntSpeaker("man")); // the opening jeer, once the host has had his say
    if (S.t > 12 && !S.said.has(TAUNTS.time[1])) { const X = S.enemies.find(q => q.alive && q.a === EXEC); if (X && onScreen(X)) taunt("time", X); } // (and the executioner, if he hasn't taken aim yet, once you see him)
    if (S.wordsAt && S.t >= S.wordsAt && (tauntWords() || S.said.has(TAUNTS.words[1]) || S.t > S.wordsAt + 4)) S.wordsAt = 0;
    if (S.lastAt && S.t >= S.lastAt) { const E = S.enemies.find(q => q.alive); if (!E || E.female || taunt(E.a === EXEC ? "time" : "last", E, true) || S.t > S.lastAt + 5) S.lastAt = 0; }
    if (S.downT > SIEGE_CFG.hideTaunt && !S.said.has(TAUNTS.comeout[1])) taunt("comeout", tauntSpeaker("man"));
  }
  // hurt: a red bloom at the edges that fades, a heartbeat while you're low
  S.hurt = Math.max(0, S.hurt - rdt * 0.9); const low = S.on && S.health === 1 && S.phase !== "won" && S.phase !== "cleared" && S.phase !== "chase" ? 0.35 : 0;
  $("hurt").style.opacity = Math.max(S.hurt, low + (S.phase === "dead" ? Math.min(1, S.deadT * 0.8) : 0)).toFixed(3);
  if ((S.health < SIEGE_CFG.health && (S.phase === "fight" || S.phase === "doomed")) || S.phase === "dead") { S.hbT -= rdt; if (S.hbT <= 0) { S.hbT = S.phase === "dead" ? 1.4 : S.health === 1 ? 0.62 : 0.85; Sound.pulse(S.phase === "dead" ? 0.6 : 0.9); } }
  if (MAN.hang && MAN.hang.free && S.phase === "fight") { S.coughT -= dt; if (S.coughT <= 0) { S.coughT = rnd(5, 9); manCough(siegePick("cough", 2), 0.8); } }
}
// after the camera has moved: the things that sit in front of it, the flash light
function siegeLate(rdt) {
  const S = SIEGE; if (!S.sword) return; R.camera.updateMatrixWorld();
  const cam = R.camera, toW = (x, y, z) => _s1.set(x, y, z).applyMatrix4(cam.matrixWorld), th = Math.tan(THREE.MathUtils.degToRad(cam.fov) / 2), asp = cam.aspect;
  // half the width and height of the view at a given depth, so things held in front of the camera sit right on a tall phone or a wide screen
  const hw = d => d * th * asp, hh = d => d * th;
  // the sword in hand for the cut: raised at the right, then a fast cut across from upper right to lower left
  if (S.sword.held) { const g = S.sword.group; let s = S.swing > 0 ? Math.min(1, (S.swing += rdt / 0.2)) : 0; const e = Ease.inOut(s);
    const grip = V3(lerp(0.5, -0.55, e) * hw(0.8), lerp(-0.7, -1.0, e) * hh(0.8), -0.8).applyMatrix4(cam.matrixWorld);
    const dirC = V3(lerp(0.25, -0.95, e), lerp(0.95, 0.05, e), lerp(-0.35, -0.55, e)).normalize().transformDirection(cam.matrixWorld);
    g.position.copy(grip); g.quaternion.setFromUnitVectors(_s2.set(0, 1, 0), dirC); g.visible = true; }
  // the revolver: lower right, along the line of sight; it kicks up and back when it fires, drops away when you duck
  const vm = S.vm.gun, show = S.on && (S.phase === "fight" || S.phase === "doomed" || S.phase === "cleared") && !S.run;
  vm.visible = show && S.cv < 0.85;
  if (vm.visible) { const k = S.vm.kick, down = Ease.inOut(clamp(S.cv, 0, 1)) * 0.22, rl = S.reloadT > 0 ? Math.sin(clamp(1 - S.reloadT / GUN.reload, 0, 1) * Math.PI) : 0; // (rl: down and tipped up for the reload)
    vm.scale.setScalar(0.8); vm.position.copy(toW(Math.min(0.2, hw(0.62) * 0.46), -hh(0.62) * 0.56 - down - rl * 0.12 + k * 0.02, -0.62 + k * 0.04));
    vm.lookAt(toW(0, 0, -25)); vm.rotateX(-k * 0.5 + rl * 0.9); } // the barrel lines up on the crosshair
  // the one taking aim at you: a red mark over his head while you can see him, pulsing faster as he's about to fire
  const W = $("warn"), A = S.on && (S.phase === "fight" || S.phase === "doomed") ? S.enemies.find(E => E.alive && E.state === "aim") : null; let mark = false;
  if (A) { const p = A.a.ch.bones.Head.getWorldPosition(_s2).add(_s3.set(0, 0.38, 0)).project(cam);
    if (p.z < 1 && Math.abs(p.x) < 1 && Math.abs(p.y) < 1) { mark = true; W.style.left = ((p.x * 0.5 + 0.5) * R.w).toFixed(1) + "px"; W.style.top = ((-p.y * 0.5 + 0.5) * R.h).toFixed(1) + "px";
      const k = clamp(1 - A.t / (A.tAim || 1), 0, 1); W.style.opacity = (0.55 + 0.45 * Math.abs(Math.sin(T * (5 + 14 * k)))).toFixed(2); } }
  W.hidden = !mark;
  // a man taking aim from outside your view: the red arc round the crosshair, on his side, pulsing faster as he's about to fire; it flares
  // as he fires and fades (bright if the shot hit you)
  const Th = $("threat"); let src = null, k = 0, glow = 0;
  if (A && !mark) { src = A; k = clamp(1 - A.t / (A.tAim || 1), 0, 1); }
  else if (S.threat && S.threat.t > 0) { S.threat.t -= rdt; src = S.threat.E; glow = Math.max(0, S.threat.t / 0.7); }
  if (src && S.on && (S.phase === "fight" || S.phase === "doomed" || glow > 0)) {
    const v = src.a.ch.bones.Spine2.getWorldPosition(_s2).sub(cam.position).applyQuaternion(_s4q.copy(cam.quaternion).invert()), ang = Math.atan2(v.x, -v.z);
    const size = Math.round(Math.min(R.w, R.h) * 0.74); if (Th.dataset.size !== String(size)) { Th.dataset.size = size; Th.style.width = Th.style.height = size + "px"; }
    Th.style.transform = `translate(-50%,-50%) rotate(${ang.toFixed(3)}rad)`; Th.classList.toggle("fire", glow > 0);
    Th.style.opacity = (glow > 0 ? glow * (S.threat.hit ? 1 : 0.75) : 0.45 + 0.55 * Math.abs(Math.sin(T * (5 + 14 * k)))).toFixed(2); Th.hidden = false; }
  else Th.hidden = true;
  for (const f of S.flashes) { if (f.t >= 1) continue; f.t = Math.min(1, f.t + rdt / 0.06); f.s.material.opacity = 1 - f.t; if (f.t >= 1) f.s.visible = false; }
  if (KEY_LIGHT && S.on) { S.flash = Math.max(0, S.flash - rdt / 0.07); KEY_LIGHT.intensity = S.flash * 9; KEY_LIGHT.distance = 9; KEY_LIGHT.color.setRGB(1, 0.72, 0.42); KEY_LIGHT.position.copy(S.flashPos); }
}
// the shootout is still being fought (the menu can send you back to it), not won or lost
function siegeLive() { return (SIEGE.on && (SIEGE.phase === "cut" || SIEGE.phase === "fight" || SIEGE.phase === "doomed" || SIEGE.phase === "cleared")) || chaseLive(); }
// back to the start for a new round
function resetSiege() {
  const S = SIEGE; if (!S.sword) return; showTargets(false); resetLaser(); S.doomFirst = S.doomGap = null;
  S.phase = null; S.sword.glint.visible = false; swordShine(0, false); S.sword.held = false; S.sword.group.visible = true; for (const C of S.covers) C.grp.visible = false; if (S.props) S.props.visible = false; S.sword.group.position.copy(S.sword.rest.p); S.sword.group.quaternion.copy(S.sword.rest.q);
  $("clearMsg").hidden = true; bellReset(); chaseReset(); // (and a getaway, if one was under way: 12g)
  if (!S.on) return; S.on = false;
  for (const E of S.enemies) { const a = E.a; a.hang = null; a.siege = false; a.pre = null; a.setIK("R", null, 0); a.setIK("L", null, 0); a.setGrip("R", 0); a.setGrip("L", 0); a.act.idle.timeScale = 1; R.scene.remove(E.gun);
    a.talkAmt = 0; a.ch.skin.userData.U.jaw.value = 0; // (in case he was cut off mid-taunt)
    setDetail(a.ch, false); a.speed = 1.3;
    a.wounds = []; for (const m of [a.ch.body.material.userData.U, a.ch.skin.userData.U]) m.woundN.value = 0; }
  LIFE.crowd.forEach((a, i) => { if (i < CROWD_SPECS.length && !S.spawned.includes(a)) { const c = CROWD_SPECS[i]; a.place(c.pos[0], c.pos[1], Math.atan2(LAY.plat.x - c.pos[0], LAY.plat.z - c.pos[1])); a.lookPt = V3(LAY.plat.x, 3.6, LAY.plat.z); a.gestureT = 3 + Math.random() * 6; } });
  for (const a of S.spawned) { a.root.visible = false; const k = LIFE.crowd.indexOf(a); if (k >= 0) LIFE.crowd.splice(k, 1); } S.spawned = [];
  const G = S.gore; for (const E of G.hats) { const st = E.hatOff; if (st) { st.parent.add(st.obj); st.obj.position.copy(st.p); st.obj.quaternion.copy(st.q); st.obj.scale.copy(st.s); E.hatOff = null; } } G.hats = [];
  for (const a of S.hiddenCrowd) a.root.visible = true; S.hiddenCrowd = []; S.enemies = [];
  for (const a of S.roofActors) { a.root.visible = false; a.yOff = 0; a.path = null; } S.threat = null; $("threat").hidden = true; // (the men on the roofs climb back down out of sight)
  HOST.root.visible = true; EXEC.act.idle.timeScale = 1; MAN.root.visible = true; if (MAN.tie) MAN.tie.visible = true; GAL.rope.lowHidden = false;
  for (const P of S.pools) R.scene.remove(P.m); S.pools = [];
  for (const D of [G.fine, G.fat]) { D.life.fill(0); D.pts.geometry.attributes.position.array.fill(-50); D.pts.geometry.attributes.position.needsUpdate = true; }
  G.splat.used = G.splat.next = 0; G.splat.im.count = 0; for (const m of G.walls) m.visible = false; G.wallNext = 0; G.bleed = []; $("gore").innerHTML = "";
  for (const m of G.mist) { m.t = 1; m.s.visible = false; } for (const b of G.bursts) { b.t = 1; b.s.visible = false; } for (const f of S.flashes) { f.t = 1; f.s.visible = false; }
  S.vm.gun.visible = false; S.run = null; S.occ = null; S.hurt = 0; $("hurt").style.opacity = 0; $("xhair").hidden = true; $("warn").hidden = true; $("hitMsg").hidden = $("doomMsg").hidden = true; showSiegeUI("off"); $("gun").title = "Guesses left"; $("gun").removeAttribute("aria-label");
  if (STATE.bubble && STATE.bubble.who) STATE.bubble = null; S.wordsAt = S.lastAt = 0;
  if (KEY_LIGHT) { KEY_LIGHT.distance = 3.5; KEY_LIGHT.color.set(0xffd9b8); }
  SLOW.t = 99; STATE.ts = 1;
}
