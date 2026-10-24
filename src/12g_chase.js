// ---------- THE GETAWAY (hidden): the ride out of town that the bell rings for ----------
// Win the shootout with the bell rung (12f) and the posse comes down the street for you. A horse, and you're away: out the back of the
// street and into the desert, steering through rocks, cactus, wagons and broken fences while they close in behind (the first half). A
// bullet past your shoulder and you twist round in the saddle and shoot back while the horse picks its own way (the second half). Drop
// the last of them, turn round in time to see where the trail goes, and the horse takes you over the edge of a canyon. You won; he dies.
// Then the results, a retry, or back to the hangman.
//
// States (CHASE.state): off → mount → ride → turn → combat → victory → results, or (from ride, turn or combat) captured → results.
// The bell's mark (BELL.unlocked) and the shootout's own states (SIEGE.phase: fight, cleared, won, chase) are kept apart from these, and
// every change of state goes through chaseState(), which allows each step only from the one before it.
const CHASE_CFG = {
  // the first half: riding
  speed: 11.5, steerMax: 5.4, steerAcc: 28, lane: 4.4, horseHalf: 0.46, reach: 1.3, // m/s; how fast the keys move you across the trail and pick it up; the trail's usable half-width; the horse's half-width; nose to rump half-length
  drag: { span: 0.55, max: 8, acc: 44, snap: 7 }, // a drag or swipe: the share of the screen's width that spans the trail; how fast (m/s) and briskly the horse follows your finger; how hard it closes on it
  turnYaw: 0.12, // how much the horse's body turns toward a sideways move (1: all the way along its path; small: it mostly sidesteps, straight on)
  rows: { first: 75, gap0: 50, gap1: 24, open0: 6.4, open1: 3.4, course: 340, shift: 0.6, ahead: 170 }, // the first row; metres between rows at the start and end of the ride; the width of the way through; how far the course runs; the most of your steering a change of line may ask for; how far ahead rows are set out
  bump: { loss: 11, slow: 0.5, recover: 1.8 }, // metres the posse gains on a collision; how hard it checks the horse; seconds to get back up to speed
  pursuit: { gap0: 40, max: 46, regain0: 0.7, regain1: 0.25, near: 14 }, // the gap to the posse (m): at the start, at most, how fast you pull away riding clean (start → end of the ride), when it shows red
  // the turn
  turn: 1.8, safe: 3.4, // seconds to twist round; seconds nobody can hurt you from the shot that starts it
  // the second half: the fight
  // (the gun and the hearts are the shootout's: GUN in 12d, six rounds, one automatic reload, five hearts)
  fireCool: 0.28, sens: 0.0048, yawLim: 1.05, pitchLo: -0.4, pitchHi: 0.3, follow: 0.6, mouseFollow: 0.4, basePitch: -0.17, // (basePitch: the view's tilt down when you face back, so the horse's rump shows under the gun)
  sway: { yaw: 0.024, nod: 0.012, cam: 0.3 }, // aim drift (rad) per m/s² of the horse's sideways swing, the gallop's nod (rad), and how much of either the view takes
  swerve: { calm: [2.0, 3.0], move: [1.3, 1.8], lat: 2.6 }, // the horse's own line: steady spells (s), swerves (s), how far it swerves (m)
  speed2: 10.5,
  gun: { back: [12, 17], windup: 1.4, hit: 0.8, rest: [2.4, 3.8] },
  lasso: { back: 7.5, windup: 2.2, fly: 0.55, rest: [3, 4.5] },
  last: { back: 3.6, side: 2.8, windup: 1.15, hp: 2, rest: [1.4, 2.2], backMax: 6.5 }, // (backMax: on a narrow screen he rides a little further back, so he stays in view)
  view: 0.66, wait: [18, 24], // riders keep within this share of the view's half-width, straight back; how far back the second wave waits
  doom: [1.3, 0.85], // out of bullets with riders left: the first shoots this long after your last shot, and one more every 0.85 s, each a heart
  attackGap: [1.3, 2.3], join: 6, // seconds between one attack ending and the next starting; when the second wave joins in if nobody has fallen yet
  // the end
  cliff: { celebrate: 1.4, turn: 1.1, beat: 0.9, slow: 0.35, depth: 55, width: 110, half: 200, pause: 1.0, fade: 0.9, look: 0.3 }, // (seconds; metres; look: how far the view drops into the canyon at the realization)
  mount: 3.0, retryMount: 1.3, capture: 1.8,
};
const CHASE = { on: false, state: "off", st: 0, t: 0, s: 0, s0: 0, lat: 0, latV: 0, latA: 0, latAs: 0, speed: 0, bumpT: 9, gap: 40, gapShow: 40, steerKey: 0, steerT: null,
  rows: [], obs: [], nextRow: 0, courseEnd: 0, turnAt: 0, rng: null, riders: [], hp: GUN.hearts, rounds: GUN.rounds, reloads: GUN.reloads, reloadT: 0, doom: null, cool: 0, ay: 0, ap: 0, cy: 0, cp: 0, yawOff: 0,
  safeT: 0, attackT: 0, attacker: null, joined: false, swerve: null, stats: null, threat: null, phase: 0, foot: 0, mouse: null, drag: null, cine: null, built: false, firstMount: true, seed: 1, result: null };
const _c1 = new THREE.Vector3(), _c2 = new THREE.Vector3(), _c3 = new THREE.Vector3(), _c4 = new THREE.Vector3(), _cq1 = new THREE.Quaternion(), _cq2 = new THREE.Quaternion(), _ce = new THREE.Euler(), _tA = {}, _tB = {};
const STATE_FROM = { mount: ["off", "results", "captured", "victory", "combat", "ride", "turn", "mount"], ride: ["mount"], turn: ["ride"], combat: ["turn"], victory: ["combat"], captured: ["ride", "turn", "combat"], results: ["victory", "captured"], off: null };
function chaseState(next) { // the one way a state changes: only from the states listed for it (off is always allowed: a reset)
  const C = CHASE, ok = !STATE_FROM[next] || STATE_FROM[next].includes(C.state); if (!ok) return false; C.state = next; C.st = 0; return true; }
function chaseLive() { return CHASE.on; } // (the menu can send you back to it, at any point from the mount to the results)
const reduceMotion = () => !!STATE.reduceMotion;
const CHASE_CLIPS = ["shout0", "shout1", "shout2", "shout3", "shout4", "shout5", "scream0", "canyon0"]; // (fetched when the bell is first rung, or at the start of the ride)

// ---- the posse ----
const POSSE = [
  { kind: "gun", name: "posse0", horse: 0x2a1f19, spec: { body: { coat: true }, shirt: 0x8a7a5e, trousers: 0x2e2822, coat: 0x3a2e22, skin: { tint: 0xd4a888, hair: 0x2a1c12, stubble: 0.8 }, hat: { color: 0x2a221a, y: 2.93 } } },
  { kind: "lasso", name: "posse1", horse: 0x7a3e1e, spec: { body: { vest: true, kerchief: true }, shirt: 0xb0a080, trousers: 0x4a3c30, vest: 0x5a3a24, kerchief: 0x8a2a1a, skin: { tint: 0xc89676, stubble: 0.6 }, hat: { color: 0x9a7a52, y: 2.95 } } },
  { kind: "gun", name: "posse2", horse: 0x8a8478, spec: { body: { kerchief: true }, shirt: 0x5a4a3a, trousers: 0x2a2622, kerchief: 0x2a3a4a, skin: { tint: 0xe0b89c, hair: 0x6a4a2a, stubble: 0.4 }, hat: { color: 0x4a3a2a, y: 2.93 } } },
  { kind: "lasso", name: "posse3", horse: 0x5a3a26, spec: { body: { vest: true }, shirt: 0xcab89a, trousers: 0x3a3028, vest: 0x2a1e16, skin: { tint: 0xd8ac8c, hair: 0x2a1a10, stubble: 0.9 }, hat: { color: 0x6a5238, y: 2.94, tilt: 0.05 } } },
  { kind: "last", name: "posse4", horse: 0x141110, spec: { body: { coat: true, kerchief: true }, shirt: 0x6a5a48, trousers: 0x1e1c1a, coat: 0x161412, kerchief: 0x1a1a1a, skin: { tint: 0xd0a080, hair: 0x101010, stubble: 1.0 }, hat: { color: 0x0e0d0c, y: 2.97 } } }];
const SEAT = { y: 1.8, z: -0.25, eye: 2.48, stirrupY: 0.98, stirrupX: 0.36 }; // on the horse (its own frame, metres): where the rider's hips sit, his eye, his stirrups

function chaseHorse(color) {
  const src = LIFE.horse, grp = THREE.SkeletonUtils.clone(src.grp); grp.visible = false; R.scene.add(grp);
  let mesh; grp.traverse(o => { if (o.isMesh) mesh = o; }); const m0 = mesh.material; if (!m0.customProgramCacheKey || m0.customProgramCacheKey() !== "gulchHorse") m0.customProgramCacheKey = () => "gulchHorse";
  const m = m0.clone(); m.onBeforeCompile = m0.onBeforeCompile; m.customProgramCacheKey = () => "gulchHorse"; m.color.setHex(color); m.sheen = 0.32; m.sheenColor = new THREE.Color(color).multiplyScalar(1.5); mesh.material = m; mesh.frustumCulled = false;
  const mixer = new THREE.AnimationMixer(grp.children[0]), act = mixer.clipAction(src.act.getClip()); act.play(); act.time = Math.random() * 1.5;
  return { grp, mesh, mixer, act, phase: Math.random(), pitch: 0, yaw: 0, roll: 0 };
}
// a man in the saddle: hips on the seat, knees out and forward, feet in the stirrups, one hand on the reins; the other does what his job is
function seatRider(a, H, opt) {
  const B = a.ch.bones, g = H.grp, bob = opt.bob || 0;
  const seat = g.localToWorld(_c1.set(0, SEAT.y + bob, SEAT.z)); B.Hips.position.copy(B.Hips.parent.worldToLocal(seat)); B.Hips.updateMatrixWorld(true);
  for (const [S, e] of [["Left", 1], ["Right", -1]]) {
    const foot = g.localToWorld(_c2.set(e * SEAT.stirrupX, SEAT.stirrupY + bob * 0.3, SEAT.z + 0.12)), pole = g.localToWorld(_c3.set(e * 0.75, 1.55, SEAT.z + 1.0));
    twoBoneIK(B[S + "UpLeg"], B[S + "Leg"], B[S + "Foot"], foot, pole, 1); }
  turnBone(B.Spine, a, (opt.twist || 0) * 0.35, (opt.lean ?? 0.18) * 0.5, 0); turnBone(B.Spine1, a, (opt.twist || 0) * 0.35, (opt.lean ?? 0.18) * 0.3, 0); turnBone(B.Spine2, a, (opt.twist || 0) * 0.3, (opt.lean ?? 0.18) * 0.2, 0);
  for (const [S, k] of [["Left", "L"], ["Right", "R"]]) { const tgt = opt[k]; if (!tgt) continue; const sh = B[S + "Arm"].getWorldPosition(_c4), e = S === "Left" ? 1 : -1;
    const pole = sh.clone().add(_c2.set(e * 0.55, -0.9, -0.35).applyQuaternion(g.quaternion)); twoBoneIK(B[S + "Arm"], B[S + "ForeArm"], B[S + "Hand"], tgt, pole, 1); }
  a.root.updateMatrixWorld(true);
}
function buildChase() {
  if (CHASE.built || !LIFE.horse) return; CHASE.built = true;
  CHASE.horse = chaseHorse(0x3b2416);
  CHASE.riders = POSSE.map((P, i) => { const a = new Actor(Object.assign({ boots: 0x2e2016, gloves: 0x6a5038, lod: true }, P.spec), P.name); a.root.visible = false; a.ride = true;
    const H = chaseHorse(P.horse), gun = revolver(false); gun.visible = false; R.scene.add(gun); const R0 = { i, P, kind: P.kind, a, H, gun, alive: true, state: "idle", d: 30, l: 0, dl: 0, t: 0 };
    a.pre = (actor, dt) => riderPose(R0, dt); return R0; });
  // the lasso: a loop of rope and the length of it back to the hand
  const ropeMat = new THREE.MeshStandardMaterial({ color: 0xcaa874, roughness: 0.85, emissive: 0x2a1c0c });
  const loop = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.03, 6, 44), ropeMat); loop.visible = false; R.scene.add(loop);
  const line = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1, 5), ropeMat); line.visible = false; R.scene.add(line); CHASE.lasso = { loop, line };
  buildObstacles(); buildTrailRibbon(); buildChaseDust(); buildChaseUI();
  for (const o of [loop, line]) o.userData.dyn = true;
}

// ---- the trail and what's on it ----
function buildTrailRibbon() { // a worn dirt track along the trail (hidden beyond the canyon's edge at the end, like the ground)
  const T = TRAIL; if (!T.x) buildTrail(); const step = 4, n = Math.floor(T.len / step), cols = [-6, -3.5, -1.2, 1.2, 3.5, 6], pos = [], col = [], idx = [];
  for (let i = 0; i <= n; i++) { const p = trailAt(i * step, 0, _tA);
    cols.forEach((c, j) => { const x = p.x + p.nx * c, z = p.z + p.nz * c; pos.push(x, groundVis(x, z) + 0.05, z); const a = j === 0 || j === cols.length - 1 ? 0 : j === 1 || j === cols.length - 2 ? 0.7 : 1; col.push(a, a, a); });
    if (i < n) for (let j = 0; j < cols.length - 1; j++) { const a = i * cols.length + j, b = a + cols.length; idx.push(a, b, a + 1, a + 1, b, b + 1); } }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx); g.computeVertexNormals();
  const m = new THREE.MeshStandardMaterial({ color: 0x8a6a4c, roughness: 1, vertexColors: true, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  m.onBeforeCompile = sh => { sh.uniforms.canyonOn = WORLD.canyonU.on; sh.uniforms.canyonInv = WORLD.canyonU.inv;
    sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nvarying vec3 vTW; varying float vTA;").replace("#include <begin_vertex>", "#include <begin_vertex>\nvTA = color.r;").replace("#include <project_vertex>", "#include <project_vertex>\nvTW = (modelMatrix * vec4(transformed, 1.0)).xyz;");
    sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\nvarying vec3 vTW; varying float vTA; uniform float canyonOn; uniform mat4 canyonInv;")
      .replace("#include <clipping_planes_fragment>", "#include <clipping_planes_fragment>\nif (canyonOn > 0.5) { vec3 cl = (canyonInv * vec4(vTW, 1.0)).xyz; if (abs(cl.x) < 1.0 && cl.z > 0.0 && cl.z < 1.0) discard; }")
      .replace("#include <color_fragment>", "float ruts = 0.82 + 0.18 * sin(vTW.x * 2.7 + vTW.z * 1.9) * sin(vTW.z * 3.1 - vTW.x * 0.7);")
      .replace("#include <alphamap_fragment>", "#include <alphamap_fragment>\ndiffuseColor.a *= vTA * 0.55; diffuseColor.rgb *= ruts;"); };
  m.customProgramCacheKey = () => "gulchTrail"; const mesh = new THREE.Mesh(g, m); mesh.receiveShadow = true; mesh.visible = false; mesh.renderOrder = 1; R.scene.add(mesh); CHASE.ribbon = mesh;
}
// the things in the way: rocks, cactus, wagons and broken fences, kept in a pool and set out row by row ahead of you
function buildObstacles() {
  const P = CHASE.pool = { rock: [], cactus: [], wagon: [], fence: [], broken: [] }, rg = [rockGeo(3), rockGeo(9), rockGeo(21)], cg = [cactusGeo(5), cactusGeo(17), cactusGeo(41)];
  const cMat = new THREE.MeshStandardMaterial({ color: 0x5f6e48, roughness: 0.7, normalMap: TEX.fabric.normalMap, normalScale: new THREE.Vector2(0.4, 0.4) });
  const grab = fn => { const g = new THREE.Group(), add0 = R.scene.add.bind(R.scene); R.scene.add = o => g.add(o); try { fn(); } finally { R.scene.add = add0; } return g; };
  const finish = (o, kind, half, depth) => { o.visible = false; o.traverse(q => { if (q.isMesh) { q.castShadow = true; q.receiveShadow = true; q.userData.dyn = true; } }); R.scene.add(o); return { o, kind, half, depth, used: false }; };
  for (let i = 0; i < 14; i++) { const m = new THREE.Mesh(rg[i % 3], MAT.rock); const g = new THREE.Group(); g.add(m); P.rock.push(finish(g, "rock", 0.8, 0.8)); }
  for (let i = 0; i < 10; i++) { const m = new THREE.Mesh(cg[i % 3], cMat); const g = new THREE.Group(); g.add(m); P.cactus.push(finish(g, "cactus", 0.6, 0.45)); }
  for (let i = 0; i < 3; i++) { const g = grab(() => wagon(0, 0, 0, i === 1)); const w = g.children[0]; w.position.set(0, 0, 0); w.rotation.y = 0; // (built along its own z: placed across the trail)
    w.children.forEach(c => { if (c.position.z > 2 && Math.abs(c.rotation.x - 0.36) < 0.01) c.visible = false; }); // (the tongue's gone: abandoned, and no longer poking out into the way through)
    w.rotation.z = (i - 1) * 0.04; P.wagon.push(finish(g, "wagon", 1.9, 0.9)); }
  const fence = () => { const g = new THREE.Group(); // a three-metre length of post-and-rail fence, along its x
    for (const x of [-1.5, 1.5]) { const p = woodBox(0.14, 1.3, 0.14, MAT.woodDark); p.position.set(x, 0.62, 0); g.add(p); }
    for (const y of [1.05, 0.62]) { const r = woodBox(3.1, 0.1, 0.07, MAT.wood, true); r.position.set(0, y, 0.02); g.add(r); } return g; };
  const broken = () => { const g = new THREE.Group(); // the length that's down: that's the way through. Two posts leaning out, one rail flat in the dirt, a stub of the other
    for (const e of [-1, 1]) { const p = woodBox(0.14, 1.3, 0.14, MAT.woodDark); p.position.set(e * 1.5, 0.6, 0); p.rotation.z = -e * 0.22; g.add(p); }
    const r = woodBox(2.6, 0.1, 0.07, MAT.wood, true); r.position.set(0.1, 0.05, 0.25); r.rotation.set(Math.PI / 2, 0.12, 0); g.add(r);
    const st = woodBox(0.9, 0.1, 0.07, MAT.wood, true); st.position.set(-1.05, 0.82, 0.02); st.rotation.z = -0.5; g.add(st); return g; };
  for (let i = 0; i < 14; i++) P.fence.push(finish(fence(), "fence", 1.55, 0.25));
  for (let i = 0; i < 5; i++) P.broken.push(finish(broken(), "broken", 0, 0));
}
function takeObstacle(kind) { const L = CHASE.pool[kind]; const o = L.find(q => !q.used); if (!o) return null; o.used = true; o.o.visible = true; return o; }
function dropObstacle(ob) { ob.used = false; ob.o.visible = false; ob.hit = false; }
// put one down s metres along the trail at lat; half: how far it reaches across the trail either side of lat, depth: along it
function placeObstacle(kind, s, lat, yaw = 0, scale = 1) {
  const ob = takeObstacle(kind); if (!ob) return null; const p = trailAt(s, lat, _tA);
  ob.s = s; ob.lat = lat; ob.hit = false; ob.halfLat = ob.half * scale; ob.halfS = ob.depth * scale; ob.o.position.set(p.x, p.y - (kind === "rock" ? 0.2 * scale : 0), p.z);
  ob.o.rotation.set(0, p.yaw + (kind === "wagon" ? Math.PI / 2 : 0) + yaw, 0); ob.o.scale.setScalar(scale); // (fences and wagons lie across the trail; rocks and cactus turn any way)
  if (kind === "rock") ob.o.children[0].scale.set(0.58, 1.05, 0.58); // (so what you see of a boulder is about what you hit: 0.8 m either side at scale 1, and tall enough to see coming)
  CHASE.obs.push(ob); return ob;
}
// a row: everything across the trail except one way through, `open` metres wide and centred at g. The kinds of row come in as the ride goes on
function spawnRow(s, f) {
  const C = CHASE, K = CHASE_CFG, r = C.rng, L = K.lane + 0.9, prev = C.rows.length ? C.rows[C.rows.length - 1] : { g: 0, s: s - 40 };
  const open = lerp(K.rows.open0, K.rows.open1, f), gapS = s - prev.s, time = gapS / K.speed, reach = K.steerMax * time * K.rows.shift; // (how far the line may move: a share of what you can steer in the time)
  const gMax = L - open / 2 - 0.2, g = clamp(prev.g + (r() * 2 - 1) * reach, -gMax, gMax);
  const kinds = f < 0.15 ? ["one"] : f < 0.4 ? ["one", "scatter", "scatter", "wagon"] : ["scatter", "wagon", "fence", "fence", "scatter"];
  const kind = kinds[(r() * kinds.length) | 0];
  const blocks = [[-L, g - open / 2], [g + open / 2, L]].filter(b => b[1] - b[0] > 0.3);
  if (kind === "one") { // a single cactus or rock where you'd otherwise ride: the way round is wide
    const b = blocks[(r() * blocks.length) | 0] || blocks[0]; const lat = clamp(b[0] + b[1] < 0 ? b[1] - 0.6 : b[0] + 0.6, -L + 0.6, L - 0.6);
    placeObstacle(r() < 0.5 ? "cactus" : "rock", s, lat, r() * 6, 1 + r() * 0.3); C.rows.push({ s, g: (b[0] + b[1] < 0) ? Math.max(g, lat + 0.6 + open / 2) : Math.min(g, lat - 0.6 - open / 2), open, kind }); return; }
  if (kind === "fence") { // a fence right across with one length broken down: that's the way through
    for (const [a, b] of blocks) { for (let x = a; x < b - 0.2; x += 3.0) { const w = Math.min(3.0, b - x), c = x + w / 2; const ob = placeObstacle("fence", s, c, 0, 1); if (ob) { ob.halfLat = w / 2; ob.o.scale.set(w / 3, 1, 1); } } }
    const br = placeObstacle("broken", s, g, 0, 1); if (br) { br.o.scale.set(open / 3, 1, 1); br.halfLat = 0; br.halfS = 0; } // (the length that's down spans the way through: you ride over its rail)
    C.rows.push({ s, g, open, kind }); return; }
  for (const [a, b] of blocks) { let x = a; // wagons and rocks and cactus shoulder to shoulder: nothing a horse could get between
    if (kind === "wagon" && b - a > 3.6) { const c = clamp((a + b) / 2, a + 1.85, b - 1.85); placeObstacle("wagon", s, c, r() < 0.5 ? 0 : Math.PI, 1); for (const [p0, p1] of [[a, c - 1.85], [c + 1.85, b]]) fillRun(p0, p1, s); continue; }
    fillRun(x, b, s); }
  C.rows.push({ s, g, open, kind });
}
function fillRun(a, b, s) { const r = CHASE.rng; let x = a; while (x < b - 0.15) { const k = r() < 0.55 ? "rock" : "cactus", sc = k === "rock" ? 0.8 + r() * 0.5 : 0.9 + r() * 0.3, half = (k === "rock" ? 0.8 : 0.45) * sc;
    const c = Math.min(x + half, b - half * 0.6); const ob = placeObstacle(k, s + (r() - 0.5) * 0.8, c, r() * 6, sc); if (!ob) return; x = c + half + 0.25; } }

// ---- dust: one pool of points thrown up by every hoof ----
function buildChaseDust() {
  const n = 360, g = new THREE.BufferGeometry(), pos = new Float32Array(n * 3).fill(-50), a = new Float32Array(n), sz = new Float32Array(n);
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3)); g.setAttribute("alpha", new THREE.BufferAttribute(a, 1)); g.setAttribute("size", new THREE.BufferAttribute(sz, 1));
  const m = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, uniforms: { map: { value: TEX.dust }, color: { value: new THREE.Color(0xa88762) }, scale: { value: 300 } },
    vertexShader: "attribute float alpha; attribute float size; varying float vA; uniform float scale; void main() { vec4 mv = modelViewMatrix * vec4(position, 1.0); vA = alpha * smoothstep(2.0, 6.0, -mv.z); gl_PointSize = min(size * scale / -mv.z, 160.0); gl_Position = projectionMatrix * mv; }", // (thin close up, so dust kicked up behind you never fogs the view)
    fragmentShader: "uniform sampler2D map; uniform vec3 color; varying float vA; void main() { vec4 t = texture2D(map, gl_PointCoord); gl_FragColor = vec4(color, t.a * vA); if (gl_FragColor.a < 0.01) discard; }" });
  const pts = new THREE.Points(g, m); pts.frustumCulled = false; pts.visible = false; pts.renderOrder = 2; R.scene.add(pts);
  CHASE.dust = { pts, n, v: new Float32Array(n * 3), life: new Float32Array(n), max: new Float32Array(n), s0: new Float32Array(n), next: 0 };
}
function kickDust(p, n, spread, up, size, life) { const D = CHASE.dust, P = D.pts.geometry.attributes.position;
  for (let i = 0; i < n; i++) { const j = D.next; D.next = (D.next + 1) % D.n; P.setXYZ(j, p.x + rnd(-0.3, 0.3), p.y + rnd(0, 0.2), p.z + rnd(-0.3, 0.3));
    D.v[j * 3] = rnd(-spread, spread); D.v[j * 3 + 1] = rnd(0.2, up); D.v[j * 3 + 2] = rnd(-spread, spread); D.life[j] = D.max[j] = life * rnd(0.7, 1.2); D.s0[j] = size * rnd(0.7, 1.3); } }
function updateChaseDust(dt) { const D = CHASE.dust, P = D.pts.geometry.attributes.position, A = D.pts.geometry.attributes.alpha, Z = D.pts.geometry.attributes.size;
  for (let j = 0; j < D.n; j++) { if (D.life[j] <= 0) { A.array[j] = 0; continue; } D.life[j] -= dt; const k = Math.max(0, D.life[j] / D.max[j]);
    D.v[j * 3 + 1] = D.v[j * 3 + 1] * (1 - dt * 1.4) - dt * 0.1; P.array[j * 3] += D.v[j * 3] * dt; P.array[j * 3 + 1] += D.v[j * 3 + 1] * dt; P.array[j * 3 + 2] += D.v[j * 3 + 2] * dt;
    A.array[j] = 0.42 * k * Math.min(1, (1 - k) * 6); Z.array[j] = D.s0[j] * (1 + (1 - k) * 2.2); }
  P.needsUpdate = A.needsUpdate = Z.needsUpdate = true; }

// ---- the screen: the posse behind you, hearts and rounds, the reticle, hints, the results; and the pad (steer, or reload and fire) ----
function buildChaseUI() {
  const st = $("stage");
  const el = (id, html, parent = st, tag = "div") => { const d = document.createElement(tag); d.id = id; d.hidden = true; d.innerHTML = html; parent.appendChild(d); return d; };
  el("pursuit", '<span class="pl">Posse</span><div class="pbar"><i id="posseDot"></i><b id="youDot"></b></div><span id="pursuitM" class="pm"></span>');
  el("chaseRet", '<svg viewBox="0 0 44 44" width="44" height="44" aria-hidden="true"><circle cx="22" cy="22" r="12" fill="none" stroke="#000" stroke-opacity=".55" stroke-width="3.2"/><circle cx="22" cy="22" r="12" fill="none" stroke="#f4ead8" stroke-width="1.6"/><path d="M22 4v8M22 32v8M4 22h8M32 22h8" stroke="#f4ead8" stroke-width="1.6" stroke-linecap="round"/><circle cx="22" cy="22" r="1.9" fill="#e2483a"/></svg>');
  el("chaseTip", ""); el("chaseMsg", ""); el("chaseFade", "");
  el("chaseSkip", "Skip", st, "button").type = "button";
  el("chaseRes", `<div class="sign"><div class="chain l"></div><div class="chain r"></div><h2 id="resTitle"></h2><p id="resLine"></p><dl id="resStats"></dl><p id="resScore"></p>
    <div class="sign-actions"><button id="resRetry" type="button">Retry chase</button><button id="resHome" type="button">Return to Hangman</button></div></div>`, $("app"));
  $("chaseRes").classList.add("overlay", "sign-wrap");
  // the bottom panel: in the ride, nothing to press, just room to drag (the whole screen steers); in the fight, Aim | Fire, as in the shootout
  el("chasePad", '<div id="padSteer" aria-label="Drag left or right to steer"><svg viewBox="0 0 120 24" width="120" height="24" aria-hidden="true"><path d="M8 12h104M20 4l-12 8 12 8M100 4l12 8-12 8" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg><span>Drag to steer</span></div>'
    + `<div id="padAim2" role="button" aria-label="Aim: drag to look">${$("padAim").innerHTML}</div>`
    + `<div id="padShoot" role="button" aria-label="Fire">${$("padFire").innerHTML}</div>`, $("kb"));
  const shoot = $("padShoot"); shoot.addEventListener("pointerdown", e => { e.preventDefault(); shoot.classList.add("on"); chaseFire(); });
  for (const ev of ["pointerup", "pointercancel", "pointerleave"]) shoot.addEventListener(ev, () => shoot.classList.remove("on"));
  // a drag on the panel (steering in the ride, aiming in the fight) works just like a drag on the view
  for (const id of ["padSteer", "padAim2"]) { const b = $(id);
    b.addEventListener("pointerdown", e => { e.preventDefault(); try { b.setPointerCapture(e.pointerId); } catch (x) {} b.classList.add("on"); chaseDragStart(e); });
    b.addEventListener("pointermove", e => chaseDragMove(e));
    for (const ev of ["pointerup", "pointercancel", "lostpointercapture"]) b.addEventListener(ev, e => { b.classList.remove("on"); chaseDragEnd(e); }); }
  $("chaseSkip").addEventListener("click", e => { e.stopPropagation(); chaseSkipCine(); });
  $("resRetry").addEventListener("click", () => chaseRetry()); $("resHome").addEventListener("click", () => chaseHome());
  // the view: a mouse aims wherever it points; a finger (or a mouse held down in the ride) drags; the page never scrolls while you ride
  st.addEventListener("pointermove", e => { if (!CHASE.on) return; const r = st.getBoundingClientRect();
    if (e.pointerType === "mouse") CHASE.mouse = { x: ((e.clientX - r.left) / r.width) * 2 - 1, y: -(((e.clientY - r.top) / r.height) * 2 - 1) };
    chaseDragMove(e); });
  for (const ev of ["pointerup", "pointercancel"]) window.addEventListener(ev, e => chaseDragEnd(e));
}
// dragging: in the ride, your finger's sideways travel moves the horse across the trail (a quick swipe does the same: it carries on to where
// the swipe put it); in the fight, it turns your aim
function chaseDragStart(e) { const C = CHASE; C.drag = { id: e.pointerId, x: e.clientX, y: e.clientY, sx: 0, lat0: C.steerT ?? C.lat }; }
function chaseDragMove(e) {
  const C = CHASE, K = CHASE_CFG, D = C.drag; if (!D || D.id !== e.pointerId) return; const dx = e.clientX - D.x, dy = e.clientY - D.y; D.x = e.clientX; D.y = e.clientY;
  if (C.state === "combat" || C.state === "turn") { C.mouse = null; C.ay = clamp(C.ay - dx * K.sens, -K.yawLim, K.yawLim); C.ap = clamp(C.ap - dy * K.sens, K.pitchLo, K.pitchHi); }
  else if (C.state === "ride" || C.state === "mount") { D.sx += dx; const mPerPx = 2 * K.lane / (K.drag.span * Math.max(320, window.innerWidth)); C.steerT = clamp(D.lat0 + D.sx * mPerPx, -K.lane, K.lane); }
}
function chaseDragEnd(e) { const D = CHASE.drag; if (D && D.id === e.pointerId) CHASE.drag = null; } // (steerT stays: the horse finishes the move)
// a touch on the 3D view during the chase: a mouse click fires in the fight; anything else starts a drag
function chaseTap(e) {
  if (!CHASE.on) return false; if (e.target.closest("button")) return true;
  if (e.pointerType === "mouse" && CHASE.state === "combat") { chaseFire(); return true; }
  chaseDragStart(e); return true;
}
function chaseKey(e, down) {
  if (!CHASE.on || !$("menu").hidden) return false; const k = e.key; if (k === "Escape") return false;
  if (CHASE.state === "results" || (e.target && e.target.closest && e.target.closest("#chaseRes"))) return true; // (Enter and Space press the focused button on the results sign)
  if (k === "a" || k === "A" || k === "ArrowLeft") { CHASE.keyL = down; e.preventDefault(); }
  else if (k === "d" || k === "D" || k === "ArrowRight") { CHASE.keyR = down; e.preventDefault(); }
  else if (down && (k === " " || k === "Enter")) { e.preventDefault(); if (!e.repeat) { if (CHASE.cine && CHASE.cine.skip) chaseSkipCine(); else chaseFire(); } }
  CHASE.steerKey = (CHASE.keyR ? 1 : 0) - (CHASE.keyL ? 1 : 0); if (CHASE.steerKey) CHASE.steerT = null; return true;
}
function chaseTip(text, sec = 3.2) { const t = $("chaseTip"); t.textContent = text; t.hidden = false; t.classList.remove("show"); void t.offsetWidth; t.classList.add("show"); CHASE.tipT = sec; }
function chaseMsg(html, sec = 1.6, cls = "") { const m = $("chaseMsg"); m.innerHTML = html; m.className = cls; m.hidden = false; m.classList.remove("show"); void m.offsetWidth; m.classList.add("show"); CHASE.msgT = sec; }
function chaseUI(mode) { // "ride", "combat", "cine" (nothing to press), "off"
  const on = mode !== "off", play = mode === "ride" || mode === "combat"; $("app").classList.toggle("chase", on); $("hud").classList.toggle("siege", on); $("kb").classList.toggle("siege", on); if (on) $("kb").classList.add("up");
  $("chasePad").hidden = !play; $("pad").hidden = true; $("padSteer").hidden = mode !== "ride"; for (const id of ["padAim2", "padShoot"]) $(id).hidden = mode !== "combat";
  $("pursuit").hidden = mode !== "ride"; $("chaseRet").hidden = mode !== "combat"; $("app").classList.toggle("aiming", mode === "combat");
  $("hp").hidden = $("reloads").hidden = !play; $("gun").style.visibility = play ? "" : "hidden"; // (the same gun and hearts as the shootout's, all the way through)
  $("left").hidden = on; $("hintBtn").style.display = on ? "none" : ""; $("xhair").hidden = true; $("siegeTip").hidden = true;
  if (!on) { $("gun").style.visibility = ""; $("app").classList.remove("aiming"); for (const id of ["pursuit", "chaseRet", "chaseTip", "chaseMsg", "chaseSkip"]) $(id).hidden = true; }
}
function chaseHud() {
  const C = CHASE; gunHud(C.rounds, C.reloads, C.reloadT > 0 ? 1 - C.reloadT / GUN.reload : -1, C.hp);
  const alive = C.riders.filter(r => r.alive).length;
  $("meta").textContent = C.state === "combat" || C.state === "turn" ? (C.reloadT > 0 ? (narrowHud() ? "" : "Reloading…") : narrowHud() ? `${alive} left` : `${alive} rider${alive === 1 ? "" : "s"} left`) : C.state === "ride" ? "Ride!" : "";
}

// ---- starting, retrying, leaving ----
// from the shootout (12d, 12f): the posse comes down the street, the horse, and away
function startGetaway() {
  if (CHASE.on || !LIFE.horse) return; buildChase(); BELL.pending = false;
  const S = SIEGE; S.phase = "chase"; S.threat = null; S.holding = S.keyAim = false; $("clearMsg").hidden = true; $("warn").hidden = true; $("threat").hidden = true; $("hurt").style.opacity = 0;
  STATE.locked = true; Sound.rush(0); Sound.preloadClips(CHASE_CLIPS); CHASE.on = true; chaseBegin(true);
}
function chaseBegin(first) {
  const C = CHASE, K = CHASE_CFG; chaseClear();
  C.seed = (C.seed * 9301 + 49297) % 233280 || 7; C.rng = rng(C.seed); C.state = "off"; chaseState("mount"); C.first = first && C.firstMount; C.firstMount = false;
  C.s = C.s0 = 0; C.lat = 0; C.latV = 0; C.latA = C.latAs = 0; C.speed = 0; C.bumpT = 9; C.gap = C.gapShow = K.pursuit.gap0; C.rows = []; C.nextRow = K.rows.first; C.courseEnd = K.rows.first + K.rows.course; C.turnAt = C.courseEnd + 25;
  C.hp = GUN.hearts; C.rounds = GUN.rounds; C.reloads = GUN.reloads; C.reloadT = 0; C.doom = null; gunHud.key = null; C.cool = 0; C.ay = C.ap = C.cy = C.cp = 0; C.yawOff = 0; C.safeT = 0; C.attackT = 0; C.attacker = null; C.joined = false; C.swerve = null; C.threat = null;
  C.stats = { shots: 0, hits: 0, downed: 0, bumps: 0, t: 0 }; C.saidEarl = false; C.shoutAt = -9; C.t = 0; C.cine = null; C.result = null; C.tipT = 0; C.msgT = 0; C.steerKey = 0; C.steerT = null; C.drag = null; C.keyL = C.keyR = false;
  // he is you now: out of sight (you see through his eyes), the noose and the ties gone with the cut
  MAN.hang = null; MAN.root.visible = false; MAN.ride = true; MAN.pre = null; MAN.bound = false; if (MAN.tie) MAN.tie.visible = false; GAL.rope.lowHidden = true;
  C.horse.grp.visible = true; C.ribbon.visible = true; C.dust.pts.visible = true;
  for (const R0 of C.riders) { const a = R0.a; a.hang = null; a.ride = true; a.pre = (actor, dt) => riderPose(R0, dt); a.root.visible = true; a.wounds = []; for (const m of [a.ch.body.material.userData.U, a.ch.skin.userData.U]) m.woundN.value = 0;
    R0.alive = true; R0.state = "trail"; R0.H.grp.visible = true; R0.gun.visible = R0.kind !== "lasso"; R0.hp = R0.kind === "last" ? K.last.hp : 1; R0.t = 0; R0.cool = 0; R0.free = null; R0.l = (R0.i - 2) * 1.5; R0.dl = 0;
    R0.d = K.pursuit.gap0 + R0.i * 3; R0.wob = Math.random() * TAU; R0.side = Math.random() < 0.5 ? -1 : 1; R0.stagger = 0; R0.lockL = null; R0.inPlace = false; setDetail(a.ch, false); if (R0.hatOff) { const h = R0.hatOff; h.parent.add(h.obj); h.obj.position.copy(h.p); h.obj.quaternion.copy(h.q); R0.hatOff = null; } }
  chaseUI("cine"); $("hud").classList.add("chase"); $("meta").textContent = ""; Sound.duck(0.25, 1.2);
  // the first time: the posse comes into view down the street, shouting, while you find a horse; a retry: straight into the saddle
  C.mount = { dur: C.first ? K.mount : K.retryMount, from: { pos: R.camera.position.clone(), q: R.camera.quaternion.clone() }, shouted: false };
  if (C.first) { const [sx, sz] = streetPt(40, -4); Sound.clip("shout0", V3(sx, 2, sz), 1.4, 0.5, 0.3, 1, 18); }
}
function chaseClear() { // everything the last run left: obstacles, rows, dust, lasso, ragdolls, the canyon
  const C = CHASE; if (!C.built) return;
  for (const ob of C.obs) dropObstacle(ob); C.obs = []; C.rows = []; const D = C.dust; D.life.fill(0); D.pts.geometry.attributes.alpha.array.fill(0); D.pts.geometry.attributes.alpha.needsUpdate = true;
  C.lasso.loop.visible = C.lasso.line.visible = false; C.lasso.fly = null; if (C.canyon) C.canyon.visible = false; WORLD.canyonU.on.value = 0;
  for (const R0 of C.riders) { R0.a.hang = null; R0.free = null; }
  if (C.scream) { C.scream.stop(0.1); C.scream = null; } Sound.rush(0);
  for (const id of ["chaseFade", "chaseRes", "chaseSkip", "chaseMsg", "chaseTip"]) $(id).hidden = true; $("chaseFade").style.opacity = 0;
}
// off: back to the town as it was (the shootout's own reset, newRound, does the rest)
function chaseReset() {
  const C = CHASE; if (!C.on && C.state === "off") return; C.on = false; C.state = "off"; if (!C.built) return; chaseClear();
  C.horse.grp.visible = false; C.ribbon.visible = false; C.dust.pts.visible = false;
  for (const R0 of C.riders) { R0.a.root.visible = false; R0.H.grp.visible = false; R0.gun.visible = false; R0.a.hang = null; }
  MAN.ride = false; MAN.pre = null; chaseUI("off"); $("hud").classList.remove("chase"); $("hurt").style.opacity = 0; $("warn").hidden = true; $("threat").hidden = true;
  if (SKY.sun) { SKY.sun.target.position.set(-1.2, 0, -3.2); SKY.sun.position.copy(SKY.sun.target.position).addScaledVector(SKY.sunDir, 90); SKY.sun.target.updateMatrixWorld(); }
  if (SIEGE.vm) SIEGE.vm.gun.visible = false; STATE.locked = false;
}
function chaseRetry() { if (!CHASE.on || CHASE.state !== "results") return; $("chaseRes").hidden = true; chaseBegin(false); }
function chaseHome() { if (!CHASE.on) return; $("chaseRes").hidden = true; $("sign").hidden = true; Sound.resume(); newRound(); } // (newRound resets the scene, the shootout and this: resetScene → resetSiege → chaseReset)

// ---- each frame ----
function updateChase(rdt, dt) {
  const C = CHASE; if (!C.on) return; if (!$("menu").hidden) { Sound.rush(0); return; } C.st += rdt; C.t += dt;
  if (C.tipT > 0 && (C.tipT -= rdt) <= 0) $("chaseTip").hidden = true;
  if (C.msgT > 0 && (C.msgT -= rdt) <= 0) $("chaseMsg").hidden = true;
  const K = CHASE_CFG, st = C.state;
  if (st === "mount") updateMount(rdt, dt);
  else if (st === "ride") updateRide(dt);
  else if (st === "turn") updateTurn(dt);
  else if (st === "combat") updateCombat(dt);
  else if (st === "victory") updateVictory(rdt, dt);
  else if (st === "captured") updateCaptured(rdt, dt);
  if (st !== "results") { updateRiders(dt); updateChaseDust(dt); updateLasso(dt); }
  if (st === "ride" || st === "turn" || st === "combat") { C.stats.t += dt; chaseHud(); }
}
// the player's horse: s along the trail, lat across it; heading, slope, a lean into turns, the gallop. Returns the frame it sits in
function placeHorse(H, s, lat, latV, speed, dt, latA = 0) {
  const p = trailAt(s, lat, _tB), ahead = trailAt(s + 1.6, lat, _tA), yAhead = ahead.y; const back = trailAt(s - 1.6, lat, _tA), yBack = back.y; const p2 = trailAt(s, lat, _tB);
  const yaw = p2.yaw + Math.atan2(latV, Math.max(2, speed)) * CHASE_CFG.turnYaw, pitch = Math.atan2(yBack - yAhead, 3.2); // (it moves across the trail with its body still straight on: no crabbing)
  H.yaw = yaw; H.pitch += (pitch - H.pitch) * Math.min(1, dt * 6); H.roll += (clamp(-latA * 0.012, -0.07, 0.07) - H.roll) * Math.min(1, dt * 5);
  H.grp.position.set(p2.x, p2.y, p2.z); H.grp.rotation.set(H.pitch, yaw, H.roll, "YXZ");
  H.act.timeScale = Math.max(0.2, speed / 4.4); H.mixer.update(dt); H.grp.updateMatrixWorld(true); return p2;
}
function gallopFeet(H, dt, pos, k) { // the four beats of a stride: a hoof hits at each, and throws up a little dust
  const ph = H.act.time / H.act.getClip().duration % 1, prev = H.ph ?? ph; H.ph = ph;
  for (const c of [0.06, 0.16, 0.5, 0.6]) { const hit = prev <= ph ? (prev < c && ph >= c) : (c > prev || c <= ph); if (hit) { Sound.gallop(pos, k); if (pos !== null) kickDust(H.grp.position, 2, 0.8, 1.2, 0.9, 1.4); else if (Math.random() < 0.5) kickDust(H.grp.localToWorld(_c1.set(0, 0.1, -1.4)), 1, 0.8, 0.9, 0.7, 1.0); } } // (your own horse: a little, low; the posse throw up the clouds you see them through)
}
function updateMount(rdt, dt) {
  const C = CHASE, K = CHASE_CFG, M = C.mount, k = clamp(C.st / M.dur, 0, 1);
  // the posse: on the first run, riding in down the street from town; then (or on a retry) in line behind you
  // (on the sheriff's side of the street, so the gallows doesn't hide them; they keep coming until you're up and facing away, and then they're simply behind you)
  const cen = _c4.set(0, 0, 0);
  if (C.first && C.st < M.dur) { C.riders.forEach((R0, i) => { const al = 26 - C.st * 6.5 + Math.abs(i - 2) * 2.6, sd = -4.2 + (i - 2) * 1.7; const [x, z] = streetPt(al, sd), H = R0.H;
      H.grp.position.set(x, groundVis(x, z), z); H.yaw = Math.atan2(-STREET.a[0], -STREET.a[1]); H.grp.rotation.set(0, H.yaw, 0); H.act.timeScale = 2.1; H.mixer.update(dt); H.grp.updateMatrixWorld(true); R0.posed = true; cen.add(H.grp.position);
      if (Math.random() < dt * 3) kickDust(H.grp.position, 3, 1, 1.4, 1.1, 1.6); }); cen.multiplyScalar(1 / C.riders.length).add(_c3.set(0, 2.2, 0)); }
  else for (const R0 of C.riders) R0.posed = false;
  const p = placeHorse(C.horse, 0, 0, 0, C.st > M.dur * 0.8 ? 4 : 0.2, dt);
  // the camera: on the first run it turns to the posse coming (and follows them), then up into the saddle; a retry starts in the saddle
  const eye = C.horse.grp.localToWorld(_c1.set(0, SEAT.eye, SEAT.z - 0.05)), fwd = _c2.set(p.hx, -0.12, p.hz).normalize(), look = _cq1.setFromRotationMatrix(new THREE.Matrix4().lookAt(eye, _c3.copy(eye).add(fwd), V_UP));
  if (C.first) { const from = M.from.pos; if (C.st < M.dur) M.qPosse = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().lookAt(from, cen, V_UP)); const qPosse = M.qPosse;
    if (k < 0.5) { const e = Ease.inOut(clamp(k / 0.3, 0, 1)); C.camQ = M.from.q.clone().slerp(qPosse, e); C.camP = from.clone(); }
    else { const e = Ease.inOut((k - 0.5) / 0.5); C.camQ = qPosse.clone().slerp(look, e); C.camP = from.clone().lerp(eye, e); if (!M.shouted && k > 0.6) { M.shouted = true; Sound.horseSnort(eye); } } }
  else { C.camQ = look.clone(); C.camP = eye.clone(); }
  if (k >= 1) { chaseState("ride"); C.speed = K.speed * 0.6; chaseUI("ride"); chaseTip(matchMedia("(pointer: coarse)").matches ? "Swipe or drag left and right to steer" : "Steer: A / D, ← →, or drag"); Sound.clip("shout1", null, 0.9, 0.5, 0.25, 1, 4); }
}
function updateRide(dt) {
  const C = CHASE, K = CHASE_CFG, f = clamp((C.s - K.rows.first) / K.rows.course, 0, 1);
  // speed: back up to a full gallop after a collision
  C.bumpT += dt; const want = K.speed * (C.bumpT < K.bump.recover ? lerp(K.bump.slow, 1, Ease.inOut(C.bumpT / K.bump.recover)) : 1); C.speed += (want - C.speed) * Math.min(1, dt * 3);
  // steering: a drag or swipe sets where across the trail you want to be and the horse goes there, straight across; the keys steer while held
  let vt, acc = K.steerAcc;
  if (C.steerKey) vt = C.steerKey * K.steerMax;
  else if (C.steerT != null) { const d = C.steerT - C.lat; vt = clamp(d * K.drag.snap, -K.drag.max, K.drag.max); acc = K.drag.acc; if (Math.abs(d) < 0.03 && !C.drag) C.steerT = null; }
  else vt = 0;
  const dv = clamp(vt - C.latV, -acc * dt, acc * dt);
  const v0 = C.latV; C.latV += dv; C.lat += C.latV * dt; if (Math.abs(C.lat) > K.lane) { C.lat = Math.sign(C.lat) * K.lane; C.latV = 0; } C.latA = (C.latV - v0) / Math.max(dt, 1e-4);
  C.s += C.speed * dt;
  // rows set out ahead, up to the end of the course; they're picked up again once well behind
  while (C.nextRow < C.s + K.rows.ahead && C.nextRow <= C.courseEnd) { const fr = clamp((C.nextRow - K.rows.first) / K.rows.course, 0, 1); spawnRow(C.nextRow, fr); C.nextRow += lerp(K.rows.gap0, K.rows.gap1, fr); }
  recycleObstacles();
  // collisions: anything you overlap as you pass it checks the horse and the posse gains on you
  for (const ob of C.obs) { if (ob.hit || !ob.halfLat || Math.abs(ob.s - C.s) > ob.halfS + K.reach) continue;
    if (Math.abs(ob.lat - C.lat) < ob.halfLat + K.horseHalf) chaseBump(ob); }
  // the gap: riding clean you pull away a little (less as the ride goes on); a collision gives them ground
  C.gap = Math.min(K.pursuit.max, C.gap + lerp(K.pursuit.regain0, K.pursuit.regain1, f) * dt * (C.bumpT > K.bump.recover ? 1 : 0)); C.gapShow += (C.gap - C.gapShow) * Math.min(1, dt * 3);
  placeHorse(C.horse, C.s, C.lat, C.latV, C.speed, dt, C.latA); gallopFeet(C.horse, dt, null, 0.9);
  updatePursuitBar(); Sound.rush(C.speed / K.speed);
  if (C.gap <= 0) { chaseCapture("ride"); return; }
  if (C.s >= C.turnAt) beginTurn();
}
function chaseBump(ob) {
  const C = CHASE, K = CHASE_CFG; ob.hit = true; C.bumpT = 0; C.gap -= K.bump.loss; C.stats.bumps++; CAM.shake = Math.max(CAM.shake, reduceMotion() ? 0.3 : 1.4); CAM.kv = -1.6;
  const p = ob.o.position; kickDust(p, 14, 2, 2, 1.3, 1.6); Sound.thud(p, 0.9);
  if (ob.kind === "fence" || ob.kind === "wagon") { Sound.crack(p, 1.2); ob.o.rotation.z = (Math.random() < 0.5 ? -1 : 1) * 0.5; ob.o.position.y -= 0.2; } else if (ob.kind === "cactus") { ob.o.rotation.z = 0.8; Sound.rustle(p, 1); }
  Sound.horseSnort(C.horse.grp.position);
  chaseMsg(C.gap > K.pursuit.near ? "<b>Whoa!</b><span>They're gaining</span>" : "<b>Whoa!</b><span>They're right behind you</span>", 1.4, "bump");
  if (C.t - (C.shoutAt ?? -9) > 6) { C.shoutAt = C.t; Sound.clip("shout2", C.riders[0].H.grp.position, 1.2, 0.5, 0.2, 1, 10); }
}
function recycleObstacles() { const C = CHASE; for (let i = C.obs.length - 1; i >= 0; i--) { const ob = C.obs[i]; if (ob.s < C.s - 140) { dropObstacle(ob); C.obs.splice(i, 1); } } C.rows = C.rows.filter(r => r.s > C.s - 60 || r === C.rows[C.rows.length - 1]); }
function updatePursuitBar() { const C = CHASE, K = CHASE_CFG, k = clamp(C.gapShow / K.pursuit.max, 0, 1);
  $("posseDot").style.left = `${Math.min(96, (1 - k) * 100)}%`; $("pursuitM").textContent = `${Math.max(0, Math.round(C.gapShow))} m`; $("pursuit").classList.toggle("near", C.gapShow < K.pursuit.near); }
// halfway: a shot whistles past your shoulder and you twist round in the saddle; the horse takes over the steering
function beginTurn() {
  const C = CHASE, K = CHASE_CFG; if (!chaseState("turn")) return; C.safeT = K.safe; C.steerKey = 0; C.steerT = null; C.drag = null; C.keyL = C.keyR = false;
  const sh = C.horse.grp.localToWorld(_c1.set(0.5, SEAT.eye, SEAT.z)); Sound.clip("whiz1", sh, 1.2, 0, 0.05, 1, 2); Sound.clip("far0", C.riders[2].H.grp.position, 0.9, 0, 0.35, 1, 7);
  kickDust(trailAt(C.s + 9, C.lat + 1.2, _tA), 8, 0.8, 1.2, 0.9, 1.2); CAM.shake = Math.max(CAM.shake, reduceMotion() ? 0.2 : 0.8);
  Sound.clip("shout3", C.riders[0].H.grp.position, 1.3, 0.3, 0.2, 1, 12);
  // the posse closes up for the fight: as near as you let them get in the ride, but never so near nobody has time to react
  for (let i = C.obs.length - 1; i >= 0; i--) if (C.obs[i].s < C.s - 3) { dropObstacle(C.obs[i]); C.obs.splice(i, 1); } // (the rows behind you go now, while you face forward: the posse comes on over open ground)
  const d0 = clamp(C.gap * 0.6, 13, 26); C.riders.forEach((R0, i) => { R0.d = d0 + (R0.kind === "last" ? 14 : i * 2.5); R0.state = R0.kind === "last" ? "wait" : i < 2 ? "trail" : "wait"; R0.cool = K.safe + 1 + i * 0.8; });
  C.attackT = K.safe + 1.2; C.yawFrom = 0; chaseUI("cine"); $("chaseRet").hidden = true;
}
function updateTurn(dt) {
  const C = CHASE, K = CHASE_CFG, k = clamp(C.st / K.turn, 0, 1);
  C.safeT -= dt; C.speed += (K.speed2 - C.speed) * Math.min(1, dt * 1.5); C.latV = (0 - C.lat) * 1.2; C.lat += C.latV * dt; C.s += C.speed * dt; recycleObstacles();
  C.yawOff = Math.PI * Ease.inOut(k); placeHorse(C.horse, C.s, C.lat, C.latV, C.speed, dt, 0); gallopFeet(C.horse, dt, null, 0.8); Sound.rush(C.speed / K.speed);
  if (k >= 1) { chaseState("combat"); C.yawOff = Math.PI; C.ay = C.ap = C.cy = C.cp = 0; chaseUI("combat"); chaseHud();
    chaseTip(matchMedia("(pointer: coarse)").matches ? "Drag to aim · Fire · it reloads itself, once" : "Aim with the mouse · Click to fire · it reloads itself, once", 3.6);
    C.swerve = { seg: "calm", t: 0, dur: rnd(K.swerve.calm[0], K.swerve.calm[1]), from: C.lat, to: C.lat }; }
}
// the second half: the horse keeps to the trail and swerves round what's on it by itself, a steady spell, a swerve, a steady spell; you shoot
function updateCombat(dt) {
  const C = CHASE, K = CHASE_CFG, W = C.swerve;
  C.safeT -= dt; C.cool -= dt; C.speed += (K.speed2 - C.speed) * Math.min(1, dt * 1.5); C.s += C.speed * dt;
  W.t += dt; if (W.t >= W.dur) { // the next stretch: a swerve to the other side round something on the trail, or a steady spell
    if (W.seg === "calm") { const to = clamp(-Math.sign(C.lat || (Math.random() - 0.5)) * K.swerve.lat * rnd(0.7, 1), -K.lane + 0.5, K.lane - 0.5), dur = rnd(K.swerve.move[0], K.swerve.move[1]);
      placeObstacle(Math.random() < 0.5 ? "rock" : "cactus", C.s + C.speed * dur * 0.92, C.lat, Math.random() * 6, 0.9 + Math.random() * 0.3); // (what it swerves round: it passes beside you and drops behind)
      C.swerve = { seg: "move", t: 0, dur, from: C.lat, to }; }
    else C.swerve = { seg: "calm", t: 0, dur: rnd(K.swerve.calm[0], K.swerve.calm[1]), from: C.lat, to: C.lat }; }
  const S2 = C.swerve, u = clamp(S2.t / S2.dur, 0, 1), e = u * u * (3 - 2 * u), de = 6 * u * (1 - u) / S2.dur, dde = (6 - 12 * u) / (S2.dur * S2.dur);
  const lat = lerp(S2.from, S2.to, e), latV = (S2.to - S2.from) * de, latA = (S2.to - S2.from) * dde; C.lat = lat; C.latV = latV; C.latA = latA; C.latAs += (latA - C.latAs) * Math.min(1, dt * 6);
  recycleObstacles(); placeHorse(C.horse, C.s, C.lat, C.latV, C.speed, dt, C.latA); gallopFeet(C.horse, dt, null, 0.75); Sound.rush(C.speed / K.speed * 0.8);
  if (C.reloadT > 0) { C.reloadT -= dt; if (C.reloadT <= 0) { C.reloadT = 0; C.rounds = GUN.rounds; Sound.clip(siegePick("cock", 2), null, 0.75, 0, 0.05); } chaseHud(); }
  // the fight: who's in it, and whose turn it is
  const alive = C.riders.filter(r => r.alive), front = alive.filter(r => r.kind !== "last");
  if (!C.joined && (C.t > 0 && (C.riders.some(r => !r.alive) || C.st > K.join))) { C.joined = true; for (const r of front) if (r.state === "wait") { r.state = "trail"; r.cool = Math.max(r.cool, 1.5); } }
  if (!front.length) { const L = alive.find(r => r.kind === "last"); if (L && L.state === "wait") { L.state = "trail"; L.cool = 1.8; Sound.clip("shout4", L.H.grp.position, 1.4, 0.2, 0.2, 1, 10); chaseMsg("<b>The last of them</b>", 1.6); } }
  if (C.doom) { const D = C.doom, K2 = K.doom; D.t += dt; if (D.t >= K2[0] + D.i * K2[1] && alive.length) { const R0 = alive[D.i % alive.length]; D.i++; // (one after another, every one a hit)
      const muzzle = R0.gun.visible ? R0.gun.localToWorld(V3(0, 0.035, 0.21)) : R0.a.ch.bones.RightHand.getWorldPosition(V3()); muzzleFlash(muzzle, 0.3); Sound.clip(siegePick("far", 4), muzzle, 1.0, 0, 0.35, rnd(0.94, 1.06), 7);
      if (!onScreenR(R0)) C.threat = { R0, t: 0.7, hit: true }; chaseHit(R0, "Shot!"); } }
  C.attackT -= dt; if (!C.doom && !C.attacker && C.attackT <= 0 && C.safeT <= 0) { const ready = alive.filter(r => r.state === "trail" && r.cool <= 0 && r.inPlace);
    if (ready.length) { const R0 = ready[(Math.random() * ready.length) | 0]; startAttack(R0); } }
  if (!alive.length) beginVictory();
  else if (C.hp <= 0) chaseCapture(C.doom ? "ammo" : "combat");
}

// ---- the riders behind you ----
function updateRiders(dt) {
  const C = CHASE, K = CHASE_CFG, fight = C.state === "combat" || C.state === "turn", eye = R.camera.position;
  const viewHalf = Math.atan(Math.tan(THREE.MathUtils.degToRad(64) / 2) * R.camera.aspect), p0 = Object.assign({}, trailAt(C.s, 0, _tB)); // (half the view's width, as an angle, at the fight's field of view; where you are on the trail)
  for (const R0 of C.riders) { const a = R0.a, H = R0.H;
    if (R0.free) { // fallen: the horse runs on without him, drifting off and slowing; he lies where he came down
      const F = R0.free; F.t += dt; F.v = Math.max(0, F.v - dt * 1.4); F.s += F.v * dt; F.l += F.side * dt * 1.1; placeHorse(H, F.s, F.l, F.side * 1.1, F.v, dt, 0); if (F.t > 6 || F.s < C.s - 90) H.grp.visible = false;
      if (a.hang) { a.update(dt); } continue; }
    if (!R0.alive || R0.posed) { if (R0.posed) { a.pos.copy(H.grp.position); a.yaw = H.yaw; a.update(dt); } continue; }
    R0.t += dt; R0.cool -= dt; R0.wob += dt;
    // where he wants to be: gunmen hang back, a lasso man comes in close, the last one rides up alongside; all of them weave, except while they
    // line up an attack, when they hold steady
    let wantD = R0.d, wantL = R0.l;
    if (C.state === "ride" || C.state === "mount") { wantD = C.gap + R0.i * 3 + Math.sin(R0.wob * 0.7) * 1.5; wantL = (R0.i - 2) * 1.6 + Math.sin(R0.wob * 0.9 + R0.i) * 1.2; }
    else if (R0.state === "wait") { wantD = R0.kind === "last" ? K.wait[1] : K.wait[0] + R0.i * 1.2; wantL = (R0.i - 2) * 2.2; }
    else { const w = R0.state === "windup" || R0.state === "attack" ? 0 : 1;
      if (R0.kind === "gun") { wantD = lerp(K.gun.back[0], K.gun.back[1], (R0.i % 2) * 0.7 + 0.15); wantL = (R0.i % 2 ? 2.6 : -2.6) + Math.sin(R0.wob * 0.8) * 2.2 * w; }
      else if (R0.kind === "lasso") { wantD = R0.state === "trail" && R0.cool > 1 ? 13 : K.lasso.back; wantL = (R0.i % 2 ? -1.8 : 1.8) + Math.sin(R0.wob * 1.1) * 1.6 * w; }
      else { const back = clamp(K.last.side / Math.tan(viewHalf * K.view), K.last.back, K.last.backMax); wantD = R0.stagger > 0 ? back + 4 : back; wantL = R0.side * K.last.side + Math.sin(R0.wob * 0.9) * 0.4 * w; R0.stagger = Math.max(0, (R0.stagger || 0) - dt); }
      if (R0.state === "windup" || R0.state === "attack") wantL = R0.lockL ?? R0.l; }
    // and he rides round anything on the trail, and round anyone who has just come off his horse
    for (const ob of C.obs) { const ds = (C.s - R0.d) - ob.s; if (ob.halfLat && ds > -8 && ds < 2 && Math.abs(ob.lat - wantL) < ob.halfLat + 0.9) wantL = ob.lat + Math.sign(wantL - ob.lat || 1) * (ob.halfLat + 1.0); }
    for (const O of C.riders) if (O.free && O.free.body) { const ds = (C.s - R0.d) - O.free.bodyS; if (ds > -10 && ds < 2 && Math.abs(O.free.bodyL - wantL) < 1.8) wantL = O.free.bodyL + Math.sign(wantL - O.free.bodyL || 1) * 2.0; }
    // and, in the fight, never wider of you than the screen shows: a phone held upright sees a narrow slice behind you, so they bunch up in it
    // (bend: the trail curving away behind you. edge: 1 while he rides the edge of the view, 2 once he's outside it; then he matches your
    // sideways speed as well as closing on his place, so a swerve of yours doesn't leave him off the side of the screen)
    let edge = 0;
    if (C.state !== "ride" && C.state !== "mount") { const span = Math.max(1, R0.d) * Math.tan(viewHalf * K.view), pr = trailAt(C.s - R0.d, 0, _tA), bend = (pr.x - p0.x) * p0.nx + (pr.z - p0.z) * p0.nz;
      const lo = C.lat - bend - span, hi = C.lat - bend + span; if (R0.l < lo || R0.l > hi) edge = 2; else if (wantL < lo || wantL > hi) edge = 1; wantL = clamp(wantL, lo, hi); }
    const dd = clamp(wantD - R0.d, -4 * dt, 4 * dt); R0.d += dd;
    const lv = edge ? clamp((wantL - R0.l) * (edge > 1 ? 4 : 1.8) + (C.latV || 0), -7, 7) : clamp((wantL - R0.l) * 1.8, -3.4, 3.4); R0.dl = lv; R0.l = clamp(R0.l + lv * dt, -K.lane - 1, K.lane + 1);
    R0.inPlace = Math.abs(wantD - R0.d) < 2.5;
    const sp = (C.speed || 0) - dd / Math.max(dt, 1e-4); placeHorse(H, C.s - R0.d, R0.l, R0.dl, Math.max(4, sp), dt, 0);
    if (R0.d < 60) gallopFeet(H, dt, H.grp.position, clamp(1.4 - R0.d / 40, 0.15, 1));
    a.pos.copy(H.grp.position); a.yaw = H.yaw; a.lookPt = (a.lookPt || V3()).copy(eye); a.update(dt);
    if (fight) updateAttack(R0, dt);
    // his gun in his right hand, along his arm
    if (R0.gun.visible) { const hand = a.ch.bones.RightHand.getWorldPosition(_c1), dir = R0.gdir || _c2.set(Math.sin(H.yaw), -0.4, Math.cos(H.yaw)).normalize(); R0.gun.position.copy(hand).addScaledVector(dir, 0.035); R0.gun.lookAt(_c3.copy(R0.gun.position).add(dir)); }
  }
}
function riderPose(R0, dt) {
  const a = R0.a, H = R0.H, B = a.ch.bones, C = CHASE, eye = R.camera.position, ph = H.act.time / H.act.getClip().duration % 1, bob = Math.sin(ph * TAU * 2) * 0.05;
  const head = B.Head.getWorldPosition(_c4).clone(), rein = H.grp.localToWorld(V3(0.04, 1.95, SEAT.z + 0.5)), opt = { bob, lean: 0.22, L: rein, R: null };
  if (R0.kind === "lasso" && (R0.state === "windup")) { const t = R0.spin || 0; opt.R = head.clone().add(V3(Math.cos(t) * 0.22, 0.42, Math.sin(t) * 0.22)); }
  else if (R0.kind === "lasso") opt.R = H.grp.localToWorld(V3(-0.25, 1.9, SEAT.z + 0.3));
  else { const sh = B.RightArm.getWorldPosition(_c3).clone(), to = eye.clone().sub(sh).normalize(), aim = R0.state === "windup" || R0.state === "attack" ? 1 : 0; R0.aimW = (R0.aimW || 0) + (aim - (R0.aimW || 0)) * Math.min(1, dt * 6);
    const low = H.grp.localToWorld(V3(-0.28, 1.85, SEAT.z + 0.35)), out = sh.clone().addScaledVector(to, 0.55); opt.R = low.lerp(out, R0.aimW); opt.twist = 0;
    R0.gdir = (R0.gdir || V3()).set(Math.sin(H.yaw), -0.6, Math.cos(H.yaw)).normalize().lerp(to, R0.aimW).normalize(); }
  seatRider(a, H, opt);
}
function startAttack(R0) {
  const C = CHASE, K = CHASE_CFG; C.attacker = R0; R0.state = "windup"; R0.lockL = R0.l; R0.t = 0; R0.spin = 0;
  R0.wind = R0.kind === "lasso" ? K.lasso.windup : R0.kind === "last" ? K.last.windup : K.gun.windup;
  if (R0.kind !== "lasso") Sound.clip(siegePick("cock", 2), R0.gun.position, 1.0, 0.05, 0.1, 1, 6); else { C.lasso.loop.visible = C.lasso.line.visible = true; R0.swT = 0; }
}
function updateAttack(R0, dt) {
  const C = CHASE, K = CHASE_CFG; if (C.attacker !== R0) return;
  if (R0.state === "windup") { R0.t += dt;
    if (R0.kind === "lasso") { R0.spin = (R0.spin || 0) + dt * 11; R0.swT -= dt; if (R0.swT <= 0) { R0.swT = TAU / 11; Sound.swish(R0.a.ch.bones.Head.getWorldPosition(_c1), 0.6 + R0.t / R0.wind * 0.6); } }
    if (R0.t >= R0.wind) { R0.state = "attack"; R0.t = 0;
      if (R0.kind === "lasso") { const from = lassoAt(R0, _c1).clone(); C.lasso.fly = { R0, from, t: 0 }; }
      else { // the shot: through the dust at you
        const muzzle = R0.gun.localToWorld(V3(0, 0.035, 0.21)); muzzleFlash(muzzle, 0.3); puff(muzzle, 7, 0.3, 0.25, 1.6, 0.32, 0xd8d3c8); Sound.clip(siegePick("far", 4), muzzle, 1.0, 0, 0.35, rnd(0.94, 1.06), 7);
        const hit = C.safeT <= 0 && Math.random() < (R0.kind === "last" ? 0.85 : K.gun.hit); if (!onScreenR(R0)) C.threat = { R0, t: 0.7, hit };
        if (hit) chaseHit(R0, "Shot!"); else Sound.clip(siegePick("whiz", 3), R.camera.position.clone().add(V3(rnd(-0.6, 0.6), 0.25, rnd(-0.6, 0.6))), 0.9, 0.05, 0.05, rnd(0.9, 1.1), 2);
        endAttack(R0); } } }
}
function endAttack(R0) { const C = CHASE, K = CHASE_CFG; if (C.attacker === R0) C.attacker = null; if (R0.alive) { R0.state = "trail"; const r = R0.kind === "lasso" ? K.lasso.rest : R0.kind === "last" ? K.last.rest : K.gun.rest; R0.cool = rnd(r[0], r[1]); } R0.lockL = null;
  C.attackT = rnd(K.attackGap[0], K.attackGap[1]); }
function lassoAt(R0, out) { const h = R0.a.ch.bones.Head.getWorldPosition(out); return h.add(_c4.set(Math.cos(R0.spin || 0) * 0.2, 0.55, Math.sin(R0.spin || 0) * 0.2)); }
function updateLasso(dt) {
  const C = CHASE, L = C.lasso, R0 = C.attacker && C.attacker.kind === "lasso" ? C.attacker : L.fly ? L.fly.R0 : null;
  if (!R0 || (!L.fly && R0.state !== "windup")) { L.loop.visible = L.line.visible = false; return; }
  let at; const hand = R0.a.ch.bones.RightHand.getWorldPosition(_c2);
  if (L.fly) { const F = L.fly; F.t += dt; const k = clamp(F.t / CHASE_CFG.lasso.fly, 0, 1), to = R.camera.position.clone().add(_c3.set(0, -0.2, 0)); at = F.from.clone().lerp(to, k); at.y += Math.sin(k * Math.PI) * 1.2;
    L.loop.scale.setScalar(1 + k * 0.7); L.loop.rotation.set(Math.PI / 2 - k * 1.2, R0.H.yaw, 0);
    if (!R0.alive) { L.fly = null; L.loop.visible = L.line.visible = false; return; } // (shot as he threw: the rope goes slack)
    if (k >= 1) { L.fly = null; const caught = C.safeT <= 0 && C.state === "combat"; if (caught) chaseHit(R0, "Roped!", true); else Sound.thud(at, 0.3); R0.d += 6; endAttack(R0); L.loop.visible = L.line.visible = false; return; } }
  else { at = lassoAt(R0, _c1).clone(); L.loop.scale.setScalar(1); L.loop.rotation.set(Math.PI / 2 + 0.25 * Math.sin(R0.spin), 0, 0.25 * Math.cos(R0.spin)); }
  L.loop.position.copy(at); L.loop.visible = true;
  const mid = _c4.copy(hand).add(at).multiplyScalar(0.5), len = hand.distanceTo(at); L.line.position.copy(mid); L.line.scale.set(1, Math.max(0.01, len), 1); L.line.quaternion.setFromUnitVectors(V_UP, _c3.copy(at).sub(hand).normalize()); L.line.visible = true;
}
function onScreenR(R0) { const p = R0.a.ch.bones.Spine2.getWorldPosition(_c1).project(R.camera); return p.z < 1 && Math.abs(p.x) < 1 && Math.abs(p.y) < 1; }
// you're hit: a heart goes, the screen shows it, the horse shies
function chaseHit(R0, what, roped) {
  const C = CHASE; C.hp--; CAM.shake = Math.max(CAM.shake, reduceMotion() ? 0.4 : 1.6); CAM.kv = -1.2; screenBlood(roped ? 2 : 3); $("hurt").style.opacity = 1; C.hurt = 1;
  Sound.clip(siegePick("hurt", 3), null, 1.0, 0.03, 0.1, rnd(0.96, 1.04)); chaseHud();
  const left = C.hp; chaseMsg(`<b>${what}</b><span>${left > 0 ? `${left} heart${left === 1 ? "" : "s"} left` : "That's it"}</span>`, 1.6, "hit");
}

// ---- your gun ----
function chaseReload() { // (automatic, the moment the cylinder's empty, while there's a reload left: the shootout's gun, GUN)
  const C = CHASE; if (C.reloadT > 0 || C.reloads <= 0 || C.rounds > 0) return; C.reloads--; C.reloadT = GUN.reload; Sound.cap(null); setTimeout(() => Sound.cap(null), 240); chaseHud(); }
function aimDir(out) { // where the shot goes: your aim plus the drift the horse's movement puts on it, from the camera, through the reticle
  const C = CHASE, K = CHASE_CFG, Sw = C.sway || { y: 0, p: 0 }, base = C.horse.yaw + Math.PI, y = base + C.ay + Sw.y, p = C.ap + Sw.p;
  return out.set(Math.sin(y) * Math.cos(p), Math.sin(p), Math.cos(y) * Math.cos(p)); }
function chaseFire() {
  const C = CHASE, K = CHASE_CFG; if (C.state !== "combat") return;
  if (C.reloadT > 0) return; if (C.rounds <= 0) { if (C.cool <= 0) { Sound.clip("dry0", null, 0.9, 0, 0.05); C.cool = 0.3; } return; } if (C.cool > 0) return;
  C.rounds--; C.cool = K.fireCool; C.stats.shots++; SIEGE.recoil = 1; SIEGE.vm.kick = 1; Sound.clip(siegePick("shot", 3), null, 1.1, 0, 0.32, rnd(0.97, 1.03)); CAM.shake = Math.max(CAM.shake, reduceMotion() ? 0.1 : 0.3);
  muzzleFlash(SIEGE.vm.gun.localToWorld(V3(0, 0.035, 0.22)), 0.3);
  const ro = R.camera.position.clone(), rd = aimDir(V3()).normalize(); let hit = null;
  for (const R0 of C.riders) { if (!R0.alive || !R0.a.root.visible) continue; const far = R0.a.ch.bones.Spine2.getWorldPosition(_c1).distanceTo(ro), h = rayActor(R0.a, ro, rd, false, clamp((far - 10) * 0.006, 0, 0.1)); if (h && (!hit || h.t < hit.t)) hit = Object.assign(h, { R0 }); }
  if (hit) { riderHit(hit.R0, hit.part, ro.clone().addScaledVector(rd, hit.t), rd); C.stats.hits++; }
  else { for (let t = 2; t < 70; t += 1) { const q = _c1.copy(ro).addScaledVector(rd, t); if (q.y < groundVis(q.x, q.z)) { kickDust(q, 8, 0.5, 1.0, 0.7, 1.1); break; } } } // (a puff where it hits the dirt)
  if (C.rounds <= 0) { if (C.reloads > 0) chaseReload(); else if (C.riders.some(r => r.alive)) chaseDoomed(); } chaseHud();
}
// the last round gone, the reload spent, and riders still coming: they know it. No more attacks to wind up: they just ride in and shoot
function chaseDoomed() {
  const C = CHASE; if (C.doom || C.state !== "combat") return; C.doom = { t: 0, i: 0 }; if (C.attacker) endAttack(C.attacker); C.lasso.fly = null;
  chaseMsg("<b>Out of bullets</b><span>They know your gun is empty</span>", 2.2, "hit");
}
// a rider hit: the last of them takes two; anyone hit while lining up an attack loses it
function riderHit(R0, part, at, rd) {
  const C = CHASE; bloodBurst(at, rd, part[3] === "head"); Sound.thud(at, 0.4);
  if (C.attacker === R0) { endAttack(R0); if (C.lasso.fly && C.lasso.fly.R0 === R0) C.lasso.fly = null; }
  R0.hp = (R0.hp || 1) - 1; if (R0.hp > 0) { R0.stagger = 2.2; R0.cool = 1.4; Sound.clip(siegePick("painm", 7), R0.a.ch.bones.Head.getWorldPosition(V3()), 1.1, 0.05, 0.2, 1, 6); chaseMsg("<b>Winged him</b>", 1.0); return; }
  // down: off the horse, still going the speed it was, in a heap in the dirt behind you
  R0.alive = false; R0.state = "dead"; C.stats.downed++; const a = R0.a, H = R0.H; a.pre = null; a.ride = false; R0.gun.visible = false;
  a.root.updateMatrixWorld(true); const G = a.hang = new Ragdoll(a, null, 0); G.dead = true; G.solids = []; G.floorFn = groundVis;
  const hv = _c1.set(Math.sin(H.yaw), 0, Math.cos(H.yaw)).multiplyScalar(C.speed * 0.9); for (let i = 0; i < G.n; i++) { G.v[i * 3] += hv.x; G.v[i * 3 + 1] += 0.6; G.v[i * 3 + 2] += hv.z; }
  const I = G.I, d = rd.clone().setY(Math.max(-0.1, rd.y)).normalize(); G.kick(I.chest, d.clone().multiplyScalar(3.2).add(V3(0, 1.2, 0)), 0.35); G.kick(I.hips, V3(0, 1.8, 0), 0.4);
  G.onHit = (p, sp) => { Sound.thud(p, clamp(sp / 6, 0.3, 1)); kickDust(p, 6, 1, 1, 1, 1.2); };
  if (part[3] === "head") { const h = a.ch.hat; if (h) { R0.hatOff = { obj: h, parent: h.parent, p: h.position.clone(), q: h.quaternion.clone() }; R.scene.attach(h); h.position.y += 0.3; } }
  Sound.clip(siegePick("painm", 7), a.ch.bones.Head.getWorldPosition(V3()), 1.25, 0.06, 0.25, rnd(0.95, 1.05), 6);
  R0.free = { t: 0, s: C.s - R0.d, l: R0.l, v: C.speed, side: R0.l >= 0 ? 1 : -1, body: true, bodyS: C.s - R0.d, bodyL: R0.l };
  const left = C.riders.filter(r => r.alive).length; if (left) chaseMsg(`<b>${["One", "Two", "Three", "Four", "Five"][C.stats.downed - 1] || C.stats.downed} down</b>`, 1.1, "down");
  if (left > 1 && !C.saidEarl) { C.saidEarl = true; const o = C.riders.find(r => r.alive && r.kind !== "last") || C.riders.find(r => r.alive); Sound.clip("shout5", o.H.grp.position, 1.2, 0.5, 0.2, 1, 10); } // (the first man down: "Aw, hell! He shot Earl!")
}

// ---- the end: a canyon nobody mentioned ----
function beginVictory() {
  const C = CHASE, K = CHASE_CFG.cliff; if (!chaseState("victory")) return; C.attacker = null; C.lasso.fly = null; chaseUI("cine"); $("chaseRet").hidden = true;
  const v = CHASE_CFG.speed2, sEdge = C.s + v * (K.celebrate + K.turn) + v * K.beat * K.slow + 1.0;
  for (let i = C.obs.length - 1; i >= 0; i--) if (C.obs[i].s > C.s - 1) { dropObstacle(C.obs[i]); C.obs.splice(i, 1); } // (nothing ahead now but the trail)
  placeCanyon(sEdge); C.cine = { t: 0, sEdge, phase: "celebrate", skip: !!STATE.cliffSeen, fell: false, impact: false };
  $("chaseSkip").hidden = !C.cine.skip; Sound.victory(); C.speed = v;
}
function updateVictory(rdt, dt) {
  const C = CHASE, K = CHASE_CFG.cliff, V = C.cine; V.t += rdt;
  const t1 = K.celebrate, t2 = t1 + K.turn, t3 = t2 + K.beat; let k = 1;
  if (V.phase !== "fall") {
    if (V.t < t1) { C.yawOff = Math.PI; } else if (V.t < t2) { C.yawOff = Math.PI * (1 - Ease.inOut((V.t - t1) / K.turn)); } else { C.yawOff = 0; k = K.slow; } // the realization: slow
    C.s += C.speed * rdt * k; C.lat += (0 - C.lat) * Math.min(1, rdt * 2); placeHorse(C.horse, C.s, C.lat, 0, C.speed * k, rdt * k, 0); if (V.t < t3) gallopFeet(C.horse, rdt * k, null, 0.8);
    Sound.rush(k); if (V.t >= t2 && !V.zoom) { V.zoom = true; Sound.duck(0.05, 0.3); Sound.horseSnort(C.horse.grp.position); }
    if (C.s >= V.sEdge) { // over: the ground's gone. A moment through his eyes, then the long view
      V.phase = "fall"; V.ft = 0; const h = trailAt(V.sEdge, C.lat, _tA); V.p = C.horse.grp.position.clone(); V.v = V3(h.hx, 0.2, h.hz).multiplyScalar(C.speed); V.rot = 0;
      MAN.root.visible = true; MAN.ride = true; MAN.hang = null; V.cam = null; Sound.rush(0); } }
  else { V.ft += rdt; const H = C.horse; V.v.y -= 9.81 * rdt; V.p.addScaledVector(V.v, rdt); V.rot = Math.min(1.25, V.rot + rdt * 0.55);
    H.grp.position.copy(V.p); H.grp.rotation.set(V.rot, H.yaw, Math.sin(V.ft * 3) * 0.15, "YXZ"); H.act.timeScale = 3.2; H.mixer.update(rdt); H.grp.updateMatrixWorld(true);
    if (V.ft > 0.32 && !V.cam) { // the wide shot from out in the canyon, side on: horse and rider going over and down past the cliff face, the scream going with them
      const e = C.canyonAt, n = e.n, h = e.h; V.cam = { pos: e.p.clone().addScaledVector(n, 24).addScaledVector(h, 11).add(V3(0, -7, 0)), tgt: e.p.clone().add(V3(0, -4, 0)).addScaledVector(h, 5) }; // (side on, the cliff's edge in profile)
      C.scream = Sound.track("scream0", 1.6, 6, 0.4); }
    if (C.scream) { C.scream.set(MAN.ch.bones.Head.getWorldPosition(_c1)); C.scream.level(1 - 0.55 * clamp((V.ft - 0.32) / 3.2, 0, 1)); }
    if (!V.impact && V.p.y < C.canyonAt.floor + 1) { V.impact = true; V.it = V.ft; Sound.clip("canyon0", V.p.clone(), 2.4, 0, 0.6, 1, 25); if (C.scream) { C.scream.stop(0.15); C.scream = null; } }
    if (V.impact && V.ft - V.it > K.pause) { const f = clamp((V.ft - V.it - K.pause) / K.fade, 0, 1); $("chaseFade").hidden = false; $("chaseFade").style.opacity = f.toFixed(3); if (f >= 1) { STATE.cliffSeen = true; savePrefs(); chaseResults(true); } } }
}
function chaseSkipCine() { const C = CHASE; if (C.state !== "victory" || !C.cine || !C.cine.skip) return; if (C.scream) { C.scream.stop(0.1); C.scream = null; } chaseResults(true); }
// the canyon: the ground cut away across the trail (K.width on, up to 2 × K.half across, short of any mesa), sheer walls K.depth down, a floor, the far wall, closed at both ends
function placeCanyon(sEdge) {
  const C = CHASE, K = CHASE_CFG.cliff, e = trailAt(sEdge, 0, {}), n = V3(e.nx, 0, e.nz), h = V3(e.hx, 0, e.hz), W = K.width; let half = K.half;
  for (const M of WORLD.mesas) { const dx = M.x - e.x, dz = M.z - e.z, lx = dx * n.x + dz * n.z, lz = dx * h.x + dz * h.z; if (Math.abs(lz - W / 2) < W / 2 + M.r) half = Math.min(half, Math.max(60, Math.abs(lx) - M.r)); }
  const P = (lx, lz, y) => V3(e.x + n.x * lx + h.x * lz, y, e.z + n.z * lx + h.z * lz), rim = (lx, lz) => { const q = P(lx, lz, 0); return groundVis(q.x, q.z); };
  let lo = Infinity; for (let lx = -half; lx <= half; lx += 8) { lo = Math.min(lo, rim(lx, 0), rim(lx, W)); } const floor = lo - K.depth;
  C.canyonAt = { p: V3(e.x, groundVis(e.x, e.z), e.z), n, h, floor };
  const M = new THREE.Matrix4().makeBasis(n.clone().multiplyScalar(half), V3(0, 1, 0), h.clone().multiplyScalar(W)).setPosition(e.x, 0, e.z); WORLD.canyonU.inv.value.copy(M).invert(); WORLD.canyonU.on.value = 1;
  const pos = [], col = [], idx = [], uv = [], noise3 = (a, b) => tfbm(a * 0.08, b * 0.08, 3), sand = [[0.74, 0.40, 0.24], [0.80, 0.47, 0.29], [0.70, 0.35, 0.21], [0.83, 0.55, 0.37], [0.76, 0.42, 0.25]];
  const wall = (pts, rows, inward) => { // a wall from a list of top points down to the floor, pushed in and out by noise (the top edge stays on the line); banded like the mesas, darker the deeper it goes
    const b = pos.length / 3; pts.forEach(([lx, lz]) => { const top = rim(lx, lz); for (let j = 0; j <= rows; j++) { const v = j / rows, y = lerp(top, floor, v), push = j === 0 ? 0 : (noise3(lx + lz, y) * 3.4 + Math.sin(y * 0.55) * 1.1) * Math.min(1, v * 4);
      const q = P(lx + inward[0] * push, lz + inward[1] * push, y); pos.push(q.x, q.y, q.z); uv.push((lx + lz) / 6, y / 6);
      const band = sand[Math.floor((y - floor) * 0.3 + 0.8 * noise3(lx * 3 + lz * 3, y) + 20) % sand.length], dk = 0.07 + 0.93 * Math.pow(smoothstep(floor, top, y), 1.3), sh = 0.88 + 0.12 * noise3(lx * 7 + 3, y * 9);
      col.push(band[0] * dk * sh, band[1] * dk * sh, band[2] * dk * sh); } });
    for (let i = 0; i < pts.length - 1; i++) for (let j = 0; j < rows; j++) { const a = b + i * (rows + 1) + j, c = a + rows + 1; idx.push(a, c, a + 1, a + 1, c, c + 1); } };
  const line = (x0, z0, x1, z1, step) => { const out = [], L = Math.hypot(x1 - x0, z1 - z0), nn = Math.max(1, Math.round(L / step)); for (let i = 0; i <= nn; i++) out.push([lerp(x0, x1, i / nn), lerp(z0, z1, i / nn)]); return out; };
  wall(line(half, 0, -half, 0, 4), 12, [0, 1]); wall(line(-half, W, half, W, 4), 12, [0, -1]); wall(line(-half, 0, -half, W, 4), 12, [1, 0]); wall(line(half, W, half, 0, 4), 12, [-1, 0]);
  { const b = pos.length / 3, nx = 30, nz = 8; for (let i = 0; i <= nx; i++) for (let j = 0; j <= nz; j++) { const q = P(lerp(-half, half, i / nx), lerp(2, W - 2, j / nz), floor + noise3(i * 9, j * 9) * 1.2); pos.push(q.x, q.y, q.z); uv.push(i, j); col.push(0.05, 0.034, 0.025); }
    for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) { const a = b + i * (nz + 1) + j, c = a + nz + 1; idx.push(a, a + 1, c, a + 1, c + 1, c); } }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
  if (!C.canyon) { const m = mesaMat(); m.side = THREE.DoubleSide; C.canyon = new THREE.Mesh(g, m); C.canyon.receiveShadow = true; C.canyon.castShadow = true; C.canyon.userData.dyn = true; R.scene.add(C.canyon); }
  else { C.canyon.geometry.dispose(); C.canyon.geometry = g; } C.canyon.visible = true;
}
// caught: by the gap closing in the ride, or the last heart in the fight
function chaseCapture(from) {
  const C = CHASE; if (!chaseState("captured")) return; C.cap = { t: 0, from }; C.attacker = null; C.lasso.fly = null; chaseUI("cine"); $("chaseRet").hidden = true; SLOW.t = 0;
  chaseMsg(`<b>Captured</b><span>${from === "ride" ? "They ran you down" : from === "ammo" ? "An empty gun and riders still coming" : "That's the last of your luck"}</span>`, 2.4, "captured"); Sound.stinger(); Sound.rush(0);
}
function updateCaptured(rdt, dt) { const C = CHASE, K = CHASE_CFG; C.cap.t += rdt; C.speed = Math.max(0, C.speed - dt * 8); C.s += C.speed * dt; placeHorse(C.horse, C.s, C.lat, 0, C.speed, dt, 0);
  $("hurt").style.opacity = Math.min(1, C.cap.t).toFixed(2); if (C.cap.t > K.capture) { const f = clamp((C.cap.t - K.capture) / 0.6, 0, 1); $("chaseFade").hidden = false; $("chaseFade").style.opacity = f.toFixed(3); if (f >= 1) chaseResults(false); } }
// the results: what you did, the score, and where to go from here
function chaseResults(won) {
  const C = CHASE; if (!chaseState("results")) return; C.cine = null; $("chaseSkip").hidden = true; $("chaseMsg").hidden = true; Sound.rush(0); C.result = won ? "won" : "captured";
  const S = C.stats, acc = S.shots ? Math.round(S.hits / S.shots * 100) : 0, score = (won ? 1000 : 0) + S.downed * 150 + (won ? Math.round(acc * 3) : 0) + (won && !S.bumps ? 200 : 0) + Math.round(Math.max(0, C.s) / 10);
  STATE.bestRide = Math.max(STATE.bestRide || 0, score); if (won) STATE.rides = (STATE.rides || 0) + 1; savePrefs();
  $("resTitle").textContent = won ? "The End" : "Captured"; $("resTitle").className = won ? "" : "lose";
  $("resLine").textContent = won ? "You killed every last one. Should've watched the road." : C.cap && C.cap.from === "ride" ? "They ran you down and dragged you back to town. The rope was still warm." : C.cap && C.cap.from === "ammo" ? "Six rounds, one reload, and not enough of them hit anything. They took their time." : "Shot out of the saddle. They took you back to town, what was left of you.";
  const row = (k, v) => `<dt>${k}</dt><dd>${v}</dd>`;
  $("resStats").innerHTML = row("Riders downed", `${S.downed} of ${C.riders.length}`) + row("Shots", `${S.shots}${S.shots ? ` · ${acc}% hit` : ""}`) + row("Collisions", S.bumps) + row("Time", `${Math.round(S.t)} s`) + (won ? row("Getaway", "Complete") : "");
  $("resScore").textContent = `Score: ${score} · Best: ${STATE.bestRide}`;
  $("chaseRes").hidden = false; $("chaseFade").hidden = false; $("chaseFade").style.opacity = 0.85; $("resRetry").focus({ preventScroll: true });
}

// ---- the camera, the gun in your hand, the reticle, the warnings: after everything else has moved ----
function chaseLate(rdt) {
  const C = CHASE; if (!C.on || C.state === "results") { if (C.on) placeChaseCamera(rdt, true); return; }
  placeChaseCamera(rdt, false);
  const cam = R.camera, S = SIEGE, vm = S.vm.gun, fight = C.state === "combat";
  // the revolver: drawn during the turn, up while you fight, raised and twirled when the last one falls
  const showGun = C.state === "combat" || (C.state === "turn" && C.st > CHASE_CFG.turn * 0.55) || (C.state === "victory" && C.cine && C.cine.t < CHASE_CFG.cliff.celebrate + CHASE_CFG.cliff.turn * 0.6);
  vm.visible = showGun; if (showGun) { const th = Math.tan(THREE.MathUtils.degToRad(cam.fov) / 2), hw = d => d * th * cam.aspect, hh = d => d * th, k = S.vm.kick, toW = (x, y, z) => _c1.set(x, y, z).applyMatrix4(cam.matrixWorld);
    S.vm.kick = Math.max(0, S.vm.kick - rdt * 6); S.recoil = Math.max(0, S.recoil - rdt * 4.5);
    const rl = C.reloadT > 0 ? Math.sin(clamp(1 - C.reloadT / GUN.reload, 0, 1) * Math.PI) : 0, cel = C.state === "victory" ? clamp(C.cine.t / 0.5, 0, 1) : 0;
    vm.scale.setScalar(0.95); vm.position.copy(toW(Math.min(0.24, hw(0.62) * 0.5), -hh(0.62) * 0.56 - rl * 0.12 + cel * hh(0.62) * 0.9 + k * 0.02, -0.62 + k * 0.04));
    if (cel) { const pump = Math.sin(clamp(C.cine.t - 0.6, 0, 1.2) * 11) * 0.025 * (1 - clamp((C.cine.t - 0.6) / 1.2, 0, 1)); vm.position.copy(toW(hw(0.62) * 0.4, -hh(0.62) * 0.56 + cel * hh(0.62) * 0.75 + pump, -0.62)); }
    const tgt = fight ? cam.position.clone().addScaledVector(aimDir(_c2).normalize(), 25) : cel ? toW(hw(0.62) * 0.4 + 0.6 * cel, 6 * cel, -2.5) : toW(0, 0, -25); vm.lookAt(tgt); vm.rotateX(-k * 0.5 + rl * 0.9);
    if (cel && !C.cine.fired && C.cine.t > 0.55) { C.cine.fired = true; S.vm.kick = 1; muzzleFlash(vm.localToWorld(V3(0, 0.035, 0.22)), 0.34); Sound.clip(siegePick("shot", 3), null, 1.0, 0, 0.45, 1.02); } } // (one in the air)
  // the reticle sits exactly where a shot would go
  const ret = $("chaseRet"); if (fight) { const p = _c2.copy(cam.position).addScaledVector(aimDir(_c3).normalize(), 40).project(cam); ret.hidden = false;
    ret.style.left = ((p.x * 0.5 + 0.5) * R.w).toFixed(1) + "px"; ret.style.top = ((-p.y * 0.5 + 0.5) * R.h).toFixed(1) + "px"; ret.classList.toggle("dim", C.reloadT > 0); } else ret.hidden = true;
  // the one about to attack: a red mark over him while you can see him; off your screen, the red arc points his way
  const W = $("warn"), A = fight && C.attacker && C.attacker.state === "windup" ? C.attacker : null; let mark = false;
  if (A) { const p = A.a.ch.bones.Head.getWorldPosition(_c2).add(_c3.set(0, 0.4, 0)).project(cam);
    if (p.z < 1 && Math.abs(p.x) < 1 && Math.abs(p.y) < 1) { mark = true; W.style.left = ((p.x * 0.5 + 0.5) * R.w).toFixed(1) + "px"; W.style.top = ((-p.y * 0.5 + 0.5) * R.h).toFixed(1) + "px";
      const k = clamp(A.t / (A.wind || 1), 0, 1); W.style.opacity = (0.55 + 0.45 * Math.abs(Math.sin(T * (5 + 14 * k)))).toFixed(2); } }
  W.hidden = !mark;
  const Th = $("threat"); let src = null, kk = 0, glow = 0;
  if (A && !mark) { src = A; kk = clamp(A.t / (A.wind || 1), 0, 1); } else if (C.threat && C.threat.t > 0) { C.threat.t -= rdt; src = C.threat.R0; glow = Math.max(0, C.threat.t / 0.7); }
  if (src && fight) { const v = src.a.ch.bones.Spine2.getWorldPosition(_c2).sub(cam.position).applyQuaternion(_cq2.copy(cam.quaternion).invert()), ang = Math.atan2(v.x, -v.z);
    const size = Math.round(Math.min(R.w, R.h) * 0.74); if (Th.dataset.size !== String(size)) { Th.dataset.size = size; Th.style.width = Th.style.height = size + "px"; }
    Th.style.transform = `translate(-50%,-50%) rotate(${ang.toFixed(3)}rad)`; Th.classList.toggle("fire", glow > 0); Th.style.opacity = (glow > 0 ? glow : 0.45 + 0.55 * Math.abs(Math.sin(T * (5 + 14 * kk)))).toFixed(2); Th.hidden = false; }
  else Th.hidden = true;
  C.hurt = Math.max(0, (C.hurt || 0) - rdt * 0.9); if (C.state !== "captured") $("hurt").style.opacity = (C.hurt + (fight && C.hp === 1 ? 0.3 : 0)).toFixed(3);
  // sun shadows travel with you
  if (SKY.sun) { const p = C.horse.grp.position; SKY.sun.target.position.set(p.x, p.y, p.z); SKY.sun.position.copy(p).addScaledVector(SKY.sunDir, 90); SKY.sun.target.updateMatrixWorld(); }
}
// through his eyes on horseback: a little bob at the gallop and a lean into turns (much less with reduced motion); facing forward to ride,
// back to fight. In the fight the view follows your aim part of the way, and takes a little of the drift the horse puts on the gun
function placeChaseCamera(rdt, hold) {
  const C = CHASE, K = CHASE_CFG, cam = R.camera, H = C.horse;
  if (hold && C.camP) { cam.position.copy(C.camP); cam.quaternion.copy(C.camQ); cam.updateMatrixWorld(); return; }
  if (C.state === "mount") { cam.position.copy(C.camP); cam.quaternion.copy(C.camQ); setFov(C.first && C.st < C.mount.dur * 0.5 ? 46 : 62); cam.updateMatrixWorld(); syncCam(); return; } /* (a tighter view while you watch them come) */
  if (C.state === "victory" && C.cine && C.cine.phase === "fall" && C.cine.cam) { const V = C.cine.cam; cam.position.copy(V.pos); cam.lookAt(_c4.copy(V.tgt).lerp(C.horse.grp.position, 0.55 * clamp(1 - (C.cine.ft - 1.3) / 0.9, 0, 1))); setFov(44); /* (panning after them, slower than they fall, then holding on the cliff as they drop out of the bottom of the frame) */ cam.updateMatrixWorld(); syncCam(); C.camP = cam.position.clone(); C.camQ = cam.quaternion.clone(); poseFallingMan(); return; }
  const rm = reduceMotion() ? 0.2 : 1, ph = H.act.time / H.act.getClip().duration % 1, bob = Math.sin(ph * TAU * 2) * 0.045 * rm * clamp(C.speed / K.speed, 0, 1);
  const back = clamp(C.yawOff / Math.PI, 0, 1), falling = C.state === "victory" && C.cine && C.cine.phase === "fall";
  const KC = CHASE_CFG.cliff, dropK = C.state === "victory" && C.cine ? Ease.inOut(clamp((C.cine.t - KC.celebrate - KC.turn * 0.7) / 0.6, 0, 1)) : 0; // (the realization: he leans out past the horse's head and looks down)
  const eye = H.grp.localToWorld(_c1.set(-0.42 * dropK, SEAT.eye + bob + back * 0.04 + 0.22 * dropK, SEAT.z - 0.05 + back * 0.32 + 0.25 * dropK)); // (twisted round in the saddle, his head comes forward over the pommel)
  if (falling) eye.y -= C.cine.ft * 2;
  // the drift the horse's swerves put on the gun (predictable: it follows the swerve), and the gallop's nod
  const sw = C.sway || (C.sway = { y: 0, p: 0 }), fight = C.state === "combat";
  sw.y += ((fight ? -C.latAs * K.sway.yaw : 0) - sw.y) * Math.min(1, rdt * 8); sw.p = fight ? Math.sin(ph * TAU * 2 + 0.6) * K.sway.nod * (reduceMotion() ? 0.6 : 1) : 0;
  // the view follows a share of your aim (so aiming wide turns you), and takes a little of the drift: always less than the gun does
  const follow = C.mouse ? K.mouseFollow : K.follow; C.cy += ((fight ? C.ay * follow : 0) - C.cy) * Math.min(1, rdt * 5); C.cp += ((fight ? C.ap * follow : 0) - C.cp) * Math.min(1, rdt * 5);
  const camK = K.sway.cam * (reduceMotion() ? 0.3 : 1), base = lerp(-0.12, K.basePitch, back);
  const drop = KC.look * dropK;
  const yaw = H.yaw + C.yawOff + C.cy + sw.y * camK, pitch = base + C.cp + sw.p * camK - drop + (falling ? -C.cine.ft * 1.0 : 0);
  // aim from the mouse: the cursor's direction through the view as it stands (the gun then drifts off it with the horse, as a finger's aim does)
  if (fight && C.mouse) { const th = Math.tan(THREE.MathUtils.degToRad(cam.fov) / 2);
    C.ay = clamp(C.cy + sw.y * camK - Math.atan(C.mouse.x * th * cam.aspect), -K.yawLim, K.yawLim); C.ap = clamp(pitch - sw.p * camK + Math.atan(C.mouse.y * th), K.pitchLo, K.pitchHi); }
  const roll = H.roll * 0.6 * rm, look = _c2.set(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch));
  cam.position.copy(eye); cam.up.set(Math.sin(roll) * Math.cos(yaw), Math.cos(roll), -Math.sin(roll) * Math.sin(yaw)); cam.lookAt(_c3.copy(eye).add(look)); cam.up.set(0, 1, 0);
  const shake = CAM.shake * 0.05 * (reduceMotion() ? 0.25 : 1); if (shake > 0) { cam.position.x += (Math.random() - 0.5) * shake; cam.position.y += (Math.random() - 0.5) * shake; } // (it dies away in updateCamera)
  cam.position.y += (CAM.ky || 0) * (reduceMotion() ? 0.3 : 1); // a jolt (a collision, a hit), sprung in updateCamera
  setFov(C.state === "victory" && C.cine && C.cine.t > CHASE_CFG.cliff.celebrate + CHASE_CFG.cliff.turn ? 52 : 64); cam.updateMatrixWorld(); syncCam(); C.camP = cam.position.clone(); C.camQ = cam.quaternion.clone();
}
function setFov(f) { const cam = R.camera; if (Math.abs(cam.fov - f) > 0.01) { cam.fov += (f - cam.fov) * 0.2; cam.updateProjectionMatrix(); } }
function syncCam() { const cam = R.camera; CAM.pos.copy(cam.position); CAM.tgt.copy(cam.position).add(_c4.set(0, 0, -5).applyQuaternion(cam.quaternion)); CAM.fov = cam.fov; CAM.to = null; CAM.follow = null; CAM.name = "chase"; }
// the man himself, seen from across the canyon on the way down: still in the saddle, arms everywhere
function poseFallingMan() {
  const C = CHASE, a = MAN, H = C.horse, B = a.ch.bones, t = C.cine.ft; a.pos.copy(H.grp.position); a.yaw = H.yaw; a.root.position.copy(H.grp.position); a.root.rotation.set(0, H.yaw, 0); a.root.updateMatrixWorld(true);
  const up = H.grp.localToWorld(V3(0, 3.2, SEAT.z)); seatRider(a, H, { lean: -0.25, L: up.clone().add(V3(Math.sin(t * 11) * 0.4, Math.cos(t * 9) * 0.3, 0.3)), R: up.clone().add(V3(-Math.sin(t * 13) * 0.4, Math.sin(t * 7) * 0.3, -0.3)) });
  const U = a.ch.skin.userData.U; if (U.fear) U.fear.value = 1; if (U.jaw) U.jaw.value = 0.55 + 0.1 * Math.sin(t * 20);
}
