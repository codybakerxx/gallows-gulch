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
  // the first half: the run (lanes, speeds, jumps and the course: RUN, in 12h)
  speed: 13, lane: 4.4, // a full gallop (m/s, for the sound of the wind); the trail's usable half-width either side of its middle
  turnYaw: 0.12, // how much a horse's body turns toward a sideways move (1: all the way along its path; small: it mostly sidesteps, straight on)
  rows: { ahead: 170 }, // how far ahead the course is set out (m)
  pursuit: { gap0: 36, max: 46, regain0: 0.85, regain1: 0.4, near: 14 }, // the gap to the posse (m): at the start, at most, how fast you pull away riding clean (start → end of the run), when it shows red
  // the turn
  turn: 1.8, safe: 3.4, // seconds to twist round; seconds nobody can hurt you from the shot that starts it
  // the second half: the fight
  // (the gun and the hearts are the shootout's: GUN in 12d, six rounds and five hearts; out here you get one more automatic reload than in the shootout)
  reloads: 2,
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
  cliff: { celebrate: 1.4, turn: 1.1, beat: 0.9, slow: 0.35, half: 380, pause: 1.3, fade: 1.0, look: 0.3 }, // (seconds; how far the canyon runs either side of the trail at most (m); look: how far the view drops into the canyon at the realization. The canyon itself and the shots of the fall: CANYON and CINE, 12i)
  mount: 3.0, retryMount: 1.3, capture: 1.8,
};
const CHASE = { on: false, state: "off", st: 0, t: 0, s: 0, s0: 0, lat: 0, latV: 0, latA: 0, latAs: 0, speed: 0, gap: 36, gapShow: 36, lane: 0, shift: null, air: null, jy: 0, jp: 0,
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
  { kind: "gun", name: "posse0", horse: 0x3c2216, coat: { pointCol: 0x0a0807, hair: 0x16100b }, spec: { body: { coat: true }, shirt: 0x8a7a5e, trousers: 0x2e2822, coat: 0x3a2e22, skin: { tint: 0xd4a888, hair: 0x2a1c12, stubble: 0.8 }, hat: { color: 0x2a221a, y: 2.93 } } },
  { kind: "lasso", name: "posse1", horse: 0x6c3218, coat: { points: 0.35, pointCol: 0x4a2412, blaze: 1, socks: [0.3, 0, 0.36, 0.22], hair: 0x8a5a34 }, spec: { body: { vest: true, kerchief: true }, shirt: 0xb0a080, trousers: 0x4a3c30, vest: 0x5a3a24, kerchief: 0x8a2a1a, skin: { tint: 0xc89676, stubble: 0.6 }, hat: { color: 0x9a7a52, y: 2.95 } } },
  { kind: "gun", name: "posse2", horse: 0x8a8680, coat: { points: 0.8, pointCol: 0x45413c, dapple: 1, hair: 0x4a4744 }, spec: { body: { kerchief: true }, shirt: 0x5a4a3a, trousers: 0x2a2622, kerchief: 0x2a3a4a, skin: { tint: 0xe0b89c, hair: 0x6a4a2a, stubble: 0.4 }, hat: { color: 0x4a3a2a, y: 2.93 } } },
  { kind: "lasso", name: "posse3", horse: 0x4a2c1c, coat: { points: 0.85, pointCol: 0x1c120c, socks: [0, 0, 0, 0.27], hair: 0x1a110b }, spec: { body: { vest: true }, shirt: 0xcab89a, trousers: 0x3a3028, vest: 0x2a1e16, skin: { tint: 0xd8ac8c, hair: 0x2a1a10, stubble: 0.9 }, hat: { color: 0x6a5238, y: 2.94, tilt: 0.05 } } },
  { kind: "last", name: "posse4", horse: 0x16120f, coat: { points: 0.5, pointCol: 0x080706, hair: 0x0c0a08 }, spec: { body: { coat: true, kerchief: true }, shirt: 0x6a5a48, trousers: 0x1e1c1a, coat: 0x161412, kerchief: 0x1a1a1a, skin: { tint: 0xd0a080, hair: 0x101010, stubble: 1.0 }, hat: { color: 0x0e0d0c, y: 2.97 } } }];
const SEAT = { y: 1.8, z: -0.25, eye: 2.48, hip: 0.17, eyeUp: 0.82, stirrup: [0.4, -0.6, 0.07] }; // on the horse (its own frame, metres): where the saddle sits along the back; the hips above the back (the
// back itself is measured every frame from the gallop, 10b), the eye above the back, the stirrups in the saddle's frame

function chaseHorse(color, reins, coat) {
  const src = LIFE.horse, grp = THREE.SkeletonUtils.clone(src.grp); grp.visible = false; R.scene.add(grp);
  let mesh; grp.traverse(o => { if (o.isMesh) mesh = o; }); const m = horseCoatMat(color, coat); m.sheen = 0.36; mesh.material = m; mesh.frustumCulled = false; // (its own coat: 10b)
  coat = coat || {};
  for (const c of [...grp.children]) if (c.userData.tack) grp.remove(c);
  const mixer = new THREE.AnimationMixer(grp.children[0]), act = mixer.clipAction(src.act.getClip()); act.play(); act.time = Math.random() * 1.5;
  const H = { grp, mesh, mixer, act, phase: Math.random(), pitch: 0, yaw: 0, roll: 0 }; horseTack(H, { reins: reins || (out => out.set(0, -99, 0)), hair: coat.hair ?? 0x1a120c }); horseTackShow(H, false); return H;
}
// the saddle's frame on a horse this frame (its back measured from the gallop): a point given in it, in the world
function saddlePt(H, x, y, z, out) { const B = H.tack ? H.tack.back : { y: 1.65, pitch: 0 }, p = -B.pitch * 0.85, c = Math.cos(p), sn = Math.sin(p);
  return H.grp.localToWorld(out.set(x, B.y + y * c - z * sn, SEAT.z + y * sn + z * c)); }
// a man in the saddle: hips on the seat, knees out and forward, feet in the stirrups, one hand on the reins; the other does what his job is
function seatRider(a, H, opt) {
  const B = a.ch.bones, g = H.grp, bob = opt.bob || 0, St = SEAT.stirrup;
  const seat = saddlePt(H, 0, SEAT.hip + bob, 0.02, _c1); B.Hips.position.copy(B.Hips.parent.worldToLocal(seat)); B.Hips.updateMatrixWorld(true); // (on the back as the gallop has it now: never down inside the horse)
  for (const [S, e] of [["Left", 1], ["Right", -1]]) {
    const foot = saddlePt(H, e * St[0], St[1] + 0.06, St[2] + 0.05, _c2), pole = saddlePt(H, e * 0.8, -0.15, 1.0, _c3); // (feet in the stirrups, knees out round the barrel)
    twoBoneIK(B[S + "UpLeg"], B[S + "Leg"], B[S + "Foot"], foot, pole, 1); }
  turnBone(B.Spine, a, (opt.twist || 0) * 0.35, (opt.lean ?? 0.18) * 0.5, 0); turnBone(B.Spine1, a, (opt.twist || 0) * 0.35, (opt.lean ?? 0.18) * 0.3, 0); turnBone(B.Spine2, a, (opt.twist || 0) * 0.3, (opt.lean ?? 0.18) * 0.2, 0);
  for (const [S, k] of [["Left", "L"], ["Right", "R"]]) { const tgt = opt[k]; if (!tgt) continue; const sh = B[S + "Arm"].getWorldPosition(_c4), e = S === "Left" ? 1 : -1;
    const pole = sh.clone().add(_c2.set(e * 0.55, -0.9, -0.35).applyQuaternion(g.quaternion)); twoBoneIK(B[S + "Arm"], B[S + "ForeArm"], B[S + "Hand"], tgt, pole, 1); }
  a.root.updateMatrixWorld(true);
}
function buildChase() {
  if (CHASE.built || !LIFE.horse) return; CHASE.built = true;
  CHASE.horse = chaseHorse(0x3a2014, out => MAN.root.visible && MAN.ride ? MAN.ch.bones.LeftHand.getWorldPosition(out) : saddlePt(CHASE.horse, 0.0, 0.36, 0.5, out), { pointCol: 0x0a0807, blaze: 1, socks: [0.26, 0, 0, 0], hair: 0x140e0a }); // (a dark bay with a blaze; your hands, just over the horn: you never see them, but the reins run from there)
  CHASE.riders = POSSE.map((P, i) => { const a = new Actor(Object.assign({ boots: 0x2e2016, gloves: 0x6a5038, lod: true }, P.spec), P.name); a.root.visible = false; a.ride = true;
    const H = chaseHorse(P.horse, out => a.ch.bones.LeftHand.getWorldPosition(out), P.coat), gun = revolver(false); gun.visible = false; R.scene.add(gun); const R0 = { i, P, kind: P.kind, a, H, gun, alive: true, state: "idle", d: 30, l: 0, dl: 0, t: 0 };
    a.pre = (actor, dt) => riderPose(R0, dt); return R0; });
  // the lasso: a loop of rope and the length of it back to the hand
  const ropeMat = new THREE.MeshStandardMaterial({ color: 0xcaa874, roughness: 0.85, emissive: 0x2a1c0c });
  const loop = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.03, 6, 44), ropeMat); loop.visible = false; R.scene.add(loop);
  const line = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1, 5), ropeMat); line.visible = false; R.scene.add(line); CHASE.lasso = { loop, line };
  buildObstacles(); buildRunObstacles(); buildTrailRibbon(); buildChaseDust(); buildChaseUI();
  for (const o of [loop, line]) o.userData.dyn = true;
}

// ---- the trail and what's on it ----
function buildTrailRibbon() { // three horse trails down the three lanes the horses keep to (RUN.lanes, 12h): each a strip of packed, hoof-cut dirt
  // (trailTex) sunk a little down the middle with low banks either side, its edges ragged; dry grass between (12h). In chunks along the
  // trail, shown by distance like the scenery, and hidden beyond the canyon's edge at the end, like the ground
  const T = TRAIL; if (!T.x) buildTrail(); const step = 2, chunk = 160, cols = [-0.75, -0.62, -0.5, -0.38, -0.25, -0.12, 0, 0.12, 0.25, 0.38, 0.5, 0.62, 0.75], grp = new THREE.Group();
  const prof = c => 0.045 - 0.022 * Math.exp(-Math.pow(c / 0.3, 2)) + 0.016 * Math.exp(-Math.pow((Math.abs(c) - 0.52) / 0.1, 2)); // (above the ground everywhere: the middle 2 cm lower than the banks)
  const set = trailTex(), m = new THREE.MeshStandardMaterial({ map: set.map, normalMap: set.normalMap, normalScale: new THREE.Vector2(1.3, 1.3), roughnessMap: set.orm, roughness: 1, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  m.onBeforeCompile = sh => { sh.uniforms.canyonOn = WORLD.canyonU.on; sh.uniforms.canyonInv = WORLD.canyonU.inv; sh.uniforms.canyonSize = WORLD.canyonU.size; sh.uniforms.macroMap = { value: TEX.macro };
    sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nvarying vec3 vTW;").replace("#include <project_vertex>", "#include <project_vertex>\nvTW = (modelMatrix * vec4(transformed, 1.0)).xyz;");
    sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\nvarying vec3 vTW; uniform sampler2D macroMap; uniform float canyonOn; uniform mat4 canyonInv; uniform vec2 canyonSize;" + CANYON_GLSL)
      .replace("#include <clipping_planes_fragment>", "#include <clipping_planes_fragment>\nif (canyonOn > 0.5 && inCanyon(vTW, canyonInv, canyonSize)) discard;")
      .replace("#include <map_fragment>", `#include <map_fragment>
        vec4 mac = texture2D(macroMap, vTW.xz * 0.011), mac2 = texture2D(macroMap, vTW.xz * 0.0019 + 0.37); diffuseColor.rgb *= 0.86 + 0.3 * (mac.r * 0.7 + mac2.g * 0.7 - 0.7); // (the ground's own variation, so it sits in it)
        float ec = abs(vUv.x * 2.0 - 1.0) + (texture2D(macroMap, vTW.xz * 0.33).g - 0.5) * 0.4 + (texture2D(macroMap, vTW.xz * 1.7 + 0.5).r - 0.5) * 0.14;
        diffuseColor.a = smoothstep(0.98, 0.7, ec);`); };
  m.customProgramCacheKey = () => "gulchTrail2";
  for (let s0 = 0; s0 < T.len; s0 += chunk) { const pos = [], uv = [], idx = [], n = Math.ceil(Math.min(chunk, T.len - s0) / step);
    RUN.lanes.forEach((L, li) => { const base = pos.length / 3;
      for (let i = 0; i <= n; i++) { const s = s0 + i * step, p = trailAt(s, 0, _tA);
        cols.forEach(c => { const x = p.x + p.nx * (L + c), z = p.z + p.nz * (L + c); pos.push(x, groundVis(x, z) + prof(c), z); uv.push((c + 0.75) / 1.5, s / 3 + li * 0.37); });
        if (i < n) for (let j = 0; j < cols.length - 1; j++) { const a = base + i * cols.length + j, b = a + cols.length; idx.push(a, a + 1, b, a + 1, b + 1, b); } } }); // (wound to face up)
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
    const mesh = new THREE.Mesh(g, m); mesh.receiveShadow = true; mesh.renderOrder = 1; mesh.frustumCulled = false; mesh.userData.s0 = s0; grp.add(mesh); }
  grp.visible = false; R.scene.add(grp); CHASE.ribbon = grp;
}
// the things in the way: rocks, cactus, wagons and broken fences, kept in a pool and set out row by row ahead of you
function buildObstacles() { // rocks and cactus at the edges of the trail, and what the horse swerves round in the fight (the run's own things to hit are in 12h)
  const P = CHASE.pool = { rock: [], cactus: [] }, rg = [rockGeo(3), rockGeo(9), rockGeo(21)], cg = [cactusGeo(5), cactusGeo(17), cactusGeo(41)];
  const cMat = runCactusMat();
  const finish = (o, kind, half, depth) => { o.visible = false; o.traverse(q => { if (q.isMesh) { q.castShadow = true; q.receiveShadow = true; q.userData.dyn = true; } }); R.scene.add(o); return { o, kind, half, depth, used: false }; };
  for (let i = 0; i < 16; i++) { const m = new THREE.Mesh(rg[i % 3], MAT.rock); const g = new THREE.Group(); g.add(m); P.rock.push(finish(g, "rock", 0.8, 0.8)); }
  for (let i = 0; i < 12; i++) { const m = new THREE.Mesh(cg[i % 3], cMat); const g = new THREE.Group(); g.add(m); P.cactus.push(finish(g, "cactus", 0.6, 0.45)); }
}
function takeObstacle(kind) { const L = CHASE.pool[kind]; const o = L.find(q => !q.used); if (!o) return null; o.used = true; o.o.visible = true; return o; }
function dropObstacle(ob) { ob.used = false; ob.o.visible = false; ob.hit = false; }
// put one down s metres along the trail at lat; half: how far it reaches across the trail either side of lat, depth: along it
function placeObstacle(kind, s, lat, yaw = 0, scale = 1) {
  const ob = takeObstacle(kind); if (!ob) return null; const p = trailAt(s, lat, _tA);
  ob.s = s; ob.lat = lat; ob.hit = false; ob.halfLat = ob.half * scale; ob.halfS = ob.depth * scale; ob.o.position.set(p.x, p.y - (kind === "rock" ? 0.2 * scale : 0), p.z);
  ob.o.rotation.set(0, p.yaw + yaw, 0); ob.o.scale.setScalar(scale); // (the run's fences and logs are built across their x: across the trail; a wagon along its z: along it)
  if (kind === "rock") ob.o.children[0].scale.set(0.58, 1.05, 0.58); // (so what you see of a boulder is about what you hit: 0.8 m either side at scale 1, and tall enough to see coming)
  CHASE.obs.push(ob); return ob;
}
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
  el("chaseTip", ""); el("chaseMsg", ""); el("chaseFade", ""); el("cineBars", "", $("app")).hidden = false;
  el("chaseSkip", "Skip", st, "button").type = "button";
  el("chaseRes", `<div class="sign"><div class="chain l"></div><div class="chain r"></div><h2 id="resTitle"></h2><p id="resLine"></p><dl id="resStats"></dl><p id="resScore"></p>
    <div class="sign-actions"><button id="resRetry" type="button">Retry chase</button><button id="resHome" type="button">Return to Hangman</button></div></div>`, $("app"));
  $("chaseRes").classList.add("overlay", "sign-wrap");
  // the bottom panel, in the fight only: Aim | Fire, as in the shootout (in the run there's nothing to press: the whole screen takes swipes)
  el("chasePad", `<div id="padAim2" role="button" aria-label="Aim: drag to look">${$("padAim").innerHTML}</div>`
    + `<div id="padShoot" role="button" aria-label="Fire">${$("padFire").innerHTML}</div>`, $("kb"));
  const shoot = $("padShoot"); shoot.addEventListener("pointerdown", e => { e.preventDefault(); shoot.classList.add("on"); chaseFire(); });
  for (const ev of ["pointerup", "pointercancel", "pointerleave"]) shoot.addEventListener(ev, () => shoot.classList.remove("on"));
  // a drag on the Aim pad works just like a drag on the view
  for (const id of ["padAim2"]) { const b = $(id);
    b.addEventListener("pointerdown", e => { e.preventDefault(); try { b.setPointerCapture(e.pointerId); } catch (x) {} b.classList.add("on"); chaseDragStart(e); });
    b.addEventListener("pointermove", e => chaseDragMove(e));
    for (const ev of ["pointerup", "pointercancel", "lostpointercapture"]) b.addEventListener(ev, e => { b.classList.remove("on"); chaseDragEnd(e); }); }
  $("chaseSkip").addEventListener("click", e => { e.stopPropagation(); chaseSkipCine(); });
  $("resRetry").addEventListener("click", () => chaseRetry()); $("resHome").addEventListener("click", () => chaseHome());
  // the view: a mouse aims wherever it points in the fight; a finger (or a mouse held down) swipes in the run and drags in the fight; the page never scrolls
  st.addEventListener("pointermove", e => { if (!CHASE.on) return; const r = st.getBoundingClientRect();
    if (e.pointerType === "mouse") CHASE.mouse = { x: ((e.clientX - r.left) / r.width) * 2 - 1, y: -(((e.clientY - r.top) / r.height) * 2 - 1) };
    chaseDragMove(e); });
  for (const ev of ["pointerup", "pointercancel"]) window.addEventListener(ev, e => chaseDragEnd(e));
}
// a finger (or a held mouse): in the run, a swipe (12h); in the fight, a drag turns your aim
function chaseDragStart(e) { const C = CHASE; if (C.state === "ride" || C.state === "mount") { runSwipeStart(e); return; } C.drag = { id: e.pointerId, x: e.clientX, y: e.clientY }; }
function chaseDragMove(e) {
  const C = CHASE, K = CHASE_CFG; if (C.state === "ride" || C.state === "mount") { runSwipeMove(e); return; }
  const D = C.drag; if (!D || D.id !== e.pointerId) return; const dx = e.clientX - D.x, dy = e.clientY - D.y; D.x = e.clientX; D.y = e.clientY;
  if (C.state === "combat" || C.state === "turn") { C.mouse = null; C.ay = clamp(C.ay - dx * K.sens, -K.yawLim, K.yawLim); C.ap = clamp(C.ap - dy * K.sens, K.pitchLo, K.pitchHi); }
}
function chaseDragEnd(e) { const D = CHASE.drag; if (D && D.id === e.pointerId) CHASE.drag = null; runSwipeEnd(e); }
// a touch on the 3D view during the chase: a mouse click fires in the fight; anything else starts a swipe or a drag
function chaseTap(e) {
  if (!CHASE.on) return false; if (e.target.closest("button")) return true;
  if (e.pointerType === "mouse" && CHASE.state === "combat") { chaseFire(); return true; }
  chaseDragStart(e); return true;
}
function chaseKey(e, down) {
  if (!CHASE.on || !$("menu").hidden) return false; const k = e.key, C = CHASE; if (k === "Escape") return false;
  if (C.state === "results" || (e.target && e.target.closest && e.target.closest("#chaseRes"))) return true; // (Enter and Space press the focused button on the results sign)
  const left = k === "a" || k === "A" || k === "ArrowLeft", right = k === "d" || k === "D" || k === "ArrowRight", up = k === "w" || k === "W" || k === "ArrowUp";
  if (C.state === "ride" || C.state === "mount") { // the run: a lane per press, a jump
    if (left || right || up || k === " ") { e.preventDefault(); if (down && !e.repeat) { if (left) runLane(-1); else if (right) runLane(1); else runJump(); } } return true; }
  if (left || right || up) { e.preventDefault(); return true; }
  if (down && (k === " " || k === "Enter")) { e.preventDefault(); if (!e.repeat) { if (C.cine && C.cine.skip) chaseSkipCine(); else chaseFire(); } }
  return true;
}
function chaseTip(text, sec = 3.2) { const t = $("chaseTip"); t.textContent = text; t.hidden = false; t.classList.remove("show"); void t.offsetWidth; t.classList.add("show"); CHASE.tipT = sec; }
function chaseMsg(html, sec = 1.6, cls = "") { const m = $("chaseMsg"); m.innerHTML = html; m.className = cls; m.hidden = false; m.classList.remove("show"); void m.offsetWidth; m.classList.add("show"); CHASE.msgT = sec; }
function chaseUI(mode) { // "mount" and "ride" (the run: the whole screen is the view, nothing to press), "combat", "cine" (nothing to press), "end" (the cliff: full screen, letterboxed), "off"
  const on = mode !== "off", play = mode === "ride" || mode === "combat"; $("app").classList.toggle("chase", on); $("hud").classList.toggle("siege", on); $("kb").classList.toggle("siege", on); if (on) $("kb").classList.add("up");
  $("app").classList.toggle("run", mode === "ride" || mode === "mount" || mode === "end"); $("app").classList.toggle("cinema", mode === "end");
  $("chasePad").hidden = mode !== "combat"; $("pad").hidden = true; for (const id of ["padAim2", "padShoot"]) $(id).hidden = mode !== "combat";
  $("pursuit").hidden = mode !== "ride"; $("chaseRet").hidden = mode !== "combat"; $("app").classList.toggle("aiming", mode === "combat");
  $("hp").hidden = $("reloads").hidden = !play; $("gun").style.visibility = play ? "" : "hidden"; // (the same gun and hearts as the shootout's, all the way through)
  $("left").hidden = on; $("hintBtn").style.display = on ? "none" : ""; $("xhair").hidden = true; $("siegeTip").hidden = true;
  if (!on) { $("gun").style.visibility = ""; $("app").classList.remove("aiming"); for (const id of ["pursuit", "chaseRet", "chaseTip", "chaseMsg", "chaseSkip"]) $(id).hidden = true; }
}
function chaseHud() {
  const C = CHASE; gunHud(C.rounds, C.reloads, C.reloadT > 0 ? 1 - C.reloadT / GUN.reload : -1, C.hp, CHASE_CFG.reloads);
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
  const C = CHASE, K = CHASE_CFG; chaseClear(); CAM.dof = null;
  C.seed = (C.seed * 9301 + 49297) % 233280 || 7; C.rng = rng(C.seed); C.state = "off"; chaseState("mount"); C.first = first && C.firstMount; C.firstMount = false;
  C.s = C.s0 = 0; C.lat = 0; C.latV = 0; C.latA = C.latAs = 0; C.speed = 0; C.gap = C.gapShow = K.pursuit.gap0; C.rows = []; C.nextRow = RUN.first; C.courseEnd = RUN.first + RUN.course; C.turnAt = C.courseEnd + 30; runBegin();
  C.hp = GUN.hearts; C.rounds = GUN.rounds; C.reloads = K.reloads; C.reloadT = 0; C.doom = null; gunHud.key = null; C.cool = 0; C.ay = C.ap = C.cy = C.cp = 0; C.yawOff = 0; C.safeT = 0; C.attackT = 0; C.attacker = null; C.joined = false; C.swerve = null; C.threat = null;
  C.stats = { shots: 0, hits: 0, downed: 0, bumps: 0, jumps: 0, t: 0 }; C.saidEarl = false; C.shoutAt = -9; C.t = 0; C.cine = null; C.result = null; C.tipT = 0; C.msgT = 0; C.drag = null;
  // he is you now: out of sight (you see through his eyes), the noose and the ties gone with the cut
  MAN.hang = null; MAN.root.visible = false; MAN.ride = true; MAN.pre = null; MAN.bound = false; if (MAN.tie) MAN.tie.visible = false; GAL.rope.lowHidden = true;
  C.horse.grp.visible = true; horseTackShow(C.horse, true); C.ribbon.visible = true; C.dust.pts.visible = true; runSceneryShow(true);
  for (const R0 of C.riders) { const a = R0.a; a.hang = null; a.ride = true; a.pre = (actor, dt) => riderPose(R0, dt); a.root.visible = true; a.wounds = []; for (const m of [a.ch.body.material.userData.U, a.ch.skin.userData.U]) m.woundN.value = 0;
    R0.alive = true; R0.state = "trail"; R0.H.grp.visible = true; horseTackShow(R0.H, true); R0.gun.visible = R0.kind !== "lasso"; R0.hp = R0.kind === "last" ? K.last.hp : 1; R0.t = 0; R0.cool = 0; R0.free = null; R0.l = (R0.i - 2) * 1.5; R0.dl = 0;
    C.posseHidden = false; R0.d = K.pursuit.gap0 + R0.i * 3; R0.wob = Math.random() * TAU; R0.side = Math.random() < 0.5 ? -1 : 1; R0.stagger = 0; R0.lockL = null; R0.inPlace = false; setDetail(a.ch, false); if (R0.hatOff) { const h = R0.hatOff; h.parent.add(h.obj); h.obj.position.copy(h.p); h.obj.quaternion.copy(h.q); R0.hatOff = null; } }
  chaseUI("mount"); $("hud").classList.add("chase"); $("meta").textContent = ""; Sound.duck(0.25, 1.2);
  // the first time: the posse comes into view down the street, shouting, while you find a horse; a retry: straight into the saddle
  C.mount = { dur: C.first ? K.mount : K.retryMount, from: { pos: R.camera.position.clone(), q: R.camera.quaternion.clone() }, shouted: false };
  if (C.first) { const [sx, sz] = streetPt(40, -4); Sound.clip("shout0", V3(sx, 2, sz), 1.4, 0.5, 0.3, 1, 18); }
}
function chaseClear() { // everything the last run left: obstacles, rows, dust, lasso, ragdolls, the canyon
  const C = CHASE; if (!C.built) return;
  for (const ob of C.obs) dropObstacle(ob); C.obs = []; C.rows = []; const D = C.dust; D.life.fill(0); D.pts.geometry.attributes.alpha.array.fill(0); D.pts.geometry.attributes.alpha.needsUpdate = true;
  C.lasso.loop.visible = C.lasso.line.visible = false; C.lasso.fly = null; canyonClear();
  for (const R0 of C.riders) { R0.a.hang = null; R0.free = null; }
  if (C.scream) { C.scream.stop(0.1); C.scream = null; } Sound.rush(0);
  for (const id of ["chaseFade", "chaseRes", "chaseSkip", "chaseMsg", "chaseTip"]) $(id).hidden = true; $("chaseFade").style.opacity = 0;
}
// off: back to the town as it was (the shootout's own reset, newRound, does the rest)
function chaseReset() {
  const C = CHASE; if (!C.on && C.state === "off") return; C.on = false; C.state = "off"; chaseHideTown(false); if (!C.built) return; chaseClear();
  C.horse.grp.visible = false; horseTackShow(C.horse, false); C.ribbon.visible = false; C.dust.pts.visible = false; runSceneryShow(false);
  for (const R0 of C.riders) { R0.a.root.visible = false; R0.H.grp.visible = false; horseTackShow(R0.H, false); R0.gun.visible = false; R0.a.hang = null; }
  MAN.ride = false; MAN.pre = null; chaseUI("off"); R.grade.uniforms.zoomBlur.value = 0; $("hud").classList.remove("chase"); $("hurt").style.opacity = 0; $("warn").hidden = true; $("threat").hidden = true;
  if (SKY.sun) { SKY.sun.target.position.set(-1.2, 0, -3.2); SKY.sun.position.copy(SKY.sun.target.position).addScaledVector(SKY.sunDir, 90); SKY.sun.target.updateMatrixWorld(); }
  if (SIEGE.vm) SIEGE.vm.gun.visible = false; STATE.locked = false;
}
function chaseHideTown(on) {
  const C = CHASE; if (on) { const S = SIEGE, all = [HOST, EXEC, ...LIFE.crowd, ...(S.pool || []), ...(S.roofActors || [])]; C.townHid = all.filter(a => a && a.root && a.root.visible); for (const a of C.townHid) a.root.visible = false; }
  else if (C.townHid) { for (const a of C.townHid) a.root.visible = true; C.townHid = null; }
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
  if (st !== "results") { updateRiders(dt); updateChaseDust(C.cine && C.cine.ts ? rdt * C.cine.ts : dt); updateLasso(dt); runSceneryUpdate(); } // (the dust slows with the film)
  if (st !== "mount" && !C.townHid) chaseHideTown(true); // (out of town: the people back there are drawn whether in view or not, so they go until you're back)
  if (st === "ride" || st === "turn" || st === "combat") { C.stats.t += dt; chaseHud(); }
}
// the player's horse: s along the trail, lat across it; heading, slope, a lean into turns, the gallop. Returns the frame it sits in
function placeHorse(H, s, lat, latV, speed, dt, latA = 0, lift = 0, pitchAdd = 0, animK = 1) {
  const p = trailAt(s, lat, _tB), ahead = trailAt(s + 1.6, lat, _tA), yAhead = ahead.y; const back = trailAt(s - 1.6, lat, _tA), yBack = back.y; const p2 = trailAt(s, lat, _tB);
  const yaw = p2.yaw + Math.atan2(latV, Math.max(2, speed)) * CHASE_CFG.turnYaw, pitch = Math.atan2(yBack - yAhead, 3.2); // (it moves across the trail with its body still straight on: no crabbing)
  H.yaw = yaw; H.pitch += (pitch - H.pitch) * Math.min(1, dt * 6); H.roll += (clamp(-latA * 0.012, -0.07, 0.07) - H.roll) * Math.min(1, dt * 5);
  H.grp.position.set(p2.x, p2.y + lift, p2.z); H.grp.rotation.set(H.pitch + pitchAdd, yaw, H.roll, "YXZ");
  H.act.timeScale = Math.max(0.2, speed / 4.4) * animK; H.mixer.update(dt); H.grp.updateMatrixWorld(true); horseTackUpdate(H, dt); return p2;
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
  if (k >= 1) { chaseState("ride"); C.speed = RUN.speed0 * 0.7; chaseUI("ride"); Sound.clip("shout1", null, 0.9, 0.5, 0.25, 1, 4);
    chaseTip(matchMedia("(pointer: coarse)").matches ? "Swipe left or right to change lanes · swipe up to jump" : "← → or A / D to change lanes · ↑, W or Space to jump", 4.2); }
}
function recycleObstacles() { const C = CHASE, behind = C.state === "ride" ? 30 : 140; for (let i = C.obs.length - 1; i >= 0; i--) { const ob = C.obs[i]; if (ob.s < C.s - behind) { dropObstacle(ob); C.obs.splice(i, 1); } } C.rows = C.rows.filter(r => r.s > C.s - 60 || r === C.rows[C.rows.length - 1]); } // (in the run you never look back)
function updatePursuitBar() { const C = CHASE, K = CHASE_CFG, k = clamp(C.gapShow / K.pursuit.max, 0, 1);
  $("posseDot").style.left = `${Math.min(96, (1 - k) * 100)}%`; $("pursuitM").textContent = `${Math.max(0, Math.round(C.gapShow))} m`; $("pursuit").classList.toggle("near", C.gapShow < K.pursuit.near); }
// halfway: a shot whistles past your shoulder and you twist round in the saddle; the horse takes over the steering
function beginTurn() {
  const C = CHASE, K = CHASE_CFG; if (!chaseState("turn")) return; C.safeT = K.safe; C.drag = null; C.swipe = null; C.shift = null; C.air = null; C.jy = C.jp = 0;
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
    chaseTip(matchMedia("(pointer: coarse)").matches ? "Drag to aim · Fire · it reloads itself, twice" : "Aim with the mouse · Click to fire · it reloads itself, twice", 3.6);
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
  const hide = C.state === "ride"; // (in the run they're behind you and you never look back: not drawn, nothing to pose; the turn brings them back)
  if (hide !== !!C.posseHidden) { C.posseHidden = hide; for (const R0 of C.riders) if (R0.alive) { R0.a.root.visible = !hide; R0.H.grp.visible = !hide; horseTackShow(R0.H, !hide); R0.gun.visible = !hide && R0.kind !== "lasso"; } }
  const viewHalf = Math.atan(Math.tan(THREE.MathUtils.degToRad(64) / 2) * R.camera.aspect), p0 = Object.assign({}, trailAt(C.s, 0, _tB)); // (half the view's width, as an angle, at the fight's field of view; where you are on the trail)
  for (const R0 of C.riders) { const a = R0.a, H = R0.H;
    if (R0.free) { // fallen: the horse runs on without him, drifting off and slowing; he lies where he came down
      const F = R0.free; F.t += dt; F.v = Math.max(0, F.v - dt * 1.4); F.s += F.v * dt; F.l += F.side * dt * 1.1; placeHorse(H, F.s, F.l, F.side * 1.1, F.v, dt, 0); if (F.t > 6 || F.s < C.s - 90 || (C.cine && F.s > C.cine.sEdge - 6)) { H.grp.visible = false; horseTackShow(H, false); } // (and it shies away from the edge: never runs out over the canyon)
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
    a.pos.copy(H.grp.position); a.yaw = H.yaw; a.lookPt = (a.lookPt || V3()).copy(eye); if (!hide) a.update(dt);
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
  R0.alive = false; R0.state = "dead"; C.stats.downed++; const a = R0.a, H = R0.H; a.pre = null; a.ride = false; R0.gun.visible = false; if (H.tack.reins) H.tack.reins.visible = false;
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

// caught: by the gap closing in the ride, or the last heart in the fight
function chaseCapture(from) {
  const C = CHASE; if (!chaseState("captured")) return; C.cap = { t: 0, from }; C.attacker = null; C.lasso.fly = null; chaseUI("cine"); $("chaseRet").hidden = true; SLOW.t = 0;
  chaseMsg(`<b>Captured</b><span>${from === "ride" ? "They ran you down" : from === "ammo" ? "An empty gun and riders still coming" : "That's the last of your luck"}</span>`, 2.4, "captured"); Sound.stinger(); Sound.rush(0);
}
function updateCaptured(rdt, dt) { const C = CHASE, K = CHASE_CFG; C.cap.t += rdt; C.speed = Math.max(0, C.speed - dt * 8); C.s += C.speed * dt; placeHorse(C.horse, C.s, C.lat, 0, C.speed, dt, 0);
  $("hurt").style.opacity = Math.min(1, C.cap.t).toFixed(2); if (C.cap.t > K.capture) { const f = clamp((C.cap.t - K.capture) / 0.6, 0, 1); $("chaseFade").hidden = false; $("chaseFade").style.opacity = f.toFixed(3); if (f >= 1) chaseResults(false); } }
// the results: what you did, the score, and where to go from here
function chaseResults(won) {
  const C = CHASE; if (!chaseState("results")) return; C.cine = null; chaseUI("cine"); CAM.dof = null; R.grade.uniforms.zoomBlur.value = 0; $("chaseSkip").hidden = true; $("chaseMsg").hidden = true; Sound.rush(0); C.result = won ? "won" : "captured";
  const S = C.stats, acc = S.shots ? Math.round(S.hits / S.shots * 100) : 0, score = (won ? 1000 : 0) + S.downed * 150 + (won ? Math.round(acc * 3) : 0) + (won && !S.bumps ? 200 : 0) + Math.round(Math.max(0, C.s) / 10);
  STATE.bestRide = Math.max(STATE.bestRide || 0, score); if (won) STATE.rides = (STATE.rides || 0) + 1; savePrefs();
  $("resTitle").textContent = won ? "The End" : "Captured"; $("resTitle").className = won ? "" : "lose";
  $("resLine").textContent = won ? "You killed every last one. Should've watched the road." : C.cap && C.cap.from === "ride" ? "They ran you down and dragged you back to town. The rope was still warm." : C.cap && C.cap.from === "ammo" ? "Eighteen rounds, and not enough of them hit anything. They took their time." : "Shot out of the saddle. They took you back to town, what was left of you.";
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
  C.hurt = Math.max(0, (C.hurt || 0) - rdt * 0.9); const near = C.state === "ride" && C.nearT > 0 ? (0.16 + 0.1 * Math.sin(T * 7)) * Math.min(1, C.nearT * 2) : 0; // (the posse right on you in the run: the edges pulse red)
  if (C.state !== "captured") $("hurt").style.opacity = (C.hurt + near + (fight && C.hp === 1 ? 0.3 : 0)).toFixed(3);
  // sun shadows travel with you (at the end they take in the whole canyon, from its middle)
  if (SKY.sun) { const wide = C.cine && C.cine.shadowed && C.canyonAt, p = wide ? _c4.copy(C.canyonAt.p).addScaledVector(C.canyonAt.h, C.canyonAt.W * 0.5) : C.horse.grp.position;
    SKY.sun.target.position.set(p.x, p.y, p.z); SKY.sun.position.copy(p).addScaledVector(SKY.sunDir, wide ? 320 : 90); SKY.sun.target.updateMatrixWorld(); }
}
// through his eyes on horseback: a little bob at the gallop and a lean into turns (much less with reduced motion); facing forward to ride,
// back to fight. In the fight the view follows your aim part of the way, and takes a little of the drift the horse puts on the gun
function placeChaseCamera(rdt, hold) {
  const C = CHASE, K = CHASE_CFG, cam = R.camera, H = C.horse;
  if (hold && C.camP) { cam.position.copy(C.camP); cam.quaternion.copy(C.camQ); cam.updateMatrixWorld(); return; }
  if (C.state === "mount") { cam.position.copy(C.camP); cam.quaternion.copy(C.camQ); setFov(C.first && C.st < C.mount.dur * 0.5 ? 46 : 62); cam.updateMatrixWorld(); syncCam(); return; } /* (a tighter view while you watch them come) */
  const shotNow = C.state === "victory" ? cineShot(rdt) : null; // (over the edge: the end is filmed, 12i)
  if (shotNow) { cam.position.copy(shotNow.pos); cam.up.copy(shotNow.up); cam.lookAt(shotNow.tgt); cam.up.set(0, 1, 0); if (Math.abs(cam.fov - shotNow.fov) > 0.01) { cam.fov = shotNow.fov; cam.updateProjectionMatrix(); }
    cam.updateMatrixWorld(); syncCam(); CAM.dof = shotNow.dof; C.camP = cam.position.clone(); C.camQ = cam.quaternion.clone(); poseFallingMan(); return; }
  CAM.dof = null;
  const rm = reduceMotion() ? 0.2 : 1, ph = H.act.time / H.act.getClip().duration % 1, bob = Math.sin(ph * TAU * 2) * 0.015 * rm * clamp(C.speed / K.speed, 0, 1);
  const Bk = H.tack.back, eyeY = (Bk.y0 ?? Bk.y) + (Bk.y - (Bk.y0 ?? Bk.y)) * 0.4 * rm + SEAT.eyeUp; // (you ride the horse's back as it rises and falls, taking some of it in the knees)
  const back = clamp(C.yawOff / Math.PI, 0, 1), falling = C.state === "victory" && C.cine && C.cine.phase === "fall";
  const KC = CHASE_CFG.cliff, dropK = C.state === "victory" && C.cine ? Ease.inOut(clamp((C.cine.t - KC.celebrate - KC.turn * 0.7) / 0.6, 0, 1)) : 0; // (the realization: he leans out past the horse's head and looks down)
  const eye = H.grp.localToWorld(_c1.set(-0.42 * dropK, eyeY + bob + back * 0.04 + 0.22 * dropK, SEAT.z - 0.05 + back * 0.32 + 0.25 * dropK)); // (twisted round in the saddle, his head comes forward over the pommel)
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
  const vt = C.state === "victory" && C.cine ? C.cine.t - KC.celebrate - KC.turn : -1; // (the realization: the view stretches as the ground ahead runs out, a dolly zoom)
  const fast = C.state === "ride" ? clamp((C.speed - RUN.speed0) / (RUN.speed1 - RUN.speed0), 0, 1) : 0; // (in the run, the view widens and its edges smear as the speed builds)
  setFov(vt > 0 ? lerp(60, 88, Ease.inOut(clamp(vt / 1.1, 0, 1))) : C.state === "ride" ? lerp(63, 71, fast) + (C.air ? 2 : 0) : 64);
  R.grade.uniforms.zoomBlur.value = reduceMotion() ? 0 : C.state === "ride" ? 0.25 + 0.75 * fast + (C.hitT < 0.4 ? 0.6 : 0) : 0; cam.updateMatrixWorld(); syncCam(); C.camP = cam.position.clone(); C.camQ = cam.quaternion.clone();
}
function setFov(f) { const cam = R.camera; if (Math.abs(cam.fov - f) > 0.01) { cam.fov += (f - cam.fov) * 0.2; cam.updateProjectionMatrix(); } }
function syncCam() { const cam = R.camera; CAM.pos.copy(cam.position); CAM.tgt.copy(cam.position).add(_c4.set(0, 0, -5).applyQuaternion(cam.quaternion)); CAM.fov = cam.fov; CAM.to = null; CAM.follow = null; CAM.name = "chase"; }

