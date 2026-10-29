// ---------- THE GETAWAY, first half: the run (12g has the rest). Three lanes down the trail out of town: swipe left or right (or the arrow
// keys, A / D) to change lane, swipe up (or ↑, W, Space) to jump. It gets faster as it goes, the rows of things in the way come closer
// together and harder to read, and the posse behind gains on you every time you hit something. Nothing on screen to press. ----------
const RUN = {
  lanes: [-2.3, 0, 2.3], shift: 0.19,                  // lane centres across the trail (m); seconds to change lane
  speed0: 19.5, speed1: 19.5, fx0: 13, first: 70, course: 760, // m/s at the start and the end of the course (v34: flat out the whole way); the speed the view's
                                                        // stretch and blur count up from; where the first row is; how long the course runs
  jump: { up: 1.5, dur: 0.76 },                         // how high (m) and how long (s) a jump is
  react: [1.45, 0.85], spread: 0.3,                     // seconds between rows at the start and the end (plus up to this share more, at random)
  horse: { half: 0.42, front: 1.45, back: 1.15 },       // the horse for collisions: half its width; nose and rump from the saddle (m)
  hit: { crash: 14, trip: 9, scrape: 5 },               // metres the posse gains when you ride into something, trip on it, or clip it changing lane
  slow: { crash: 0.42, trip: 0.62, scrape: 0.86 }, recover: 1.5, ghost: 0.55, // how hard each checks the horse; seconds back to full speed; seconds after a hit when nothing else can
  fire: [1.6, 3.4], swipe: 26                           // seconds between the posse's shots once they're close; pixels a finger must travel for a swipe
};
// what can be in a lane: tall things you go round, low things you jump (low: their height), long ones that fill a lane for a while
const RUN_KINDS = {
  boulder: { tall: true, half: 1.0, depth: 0.85, n: 18 }, cactus: { tall: true, half: 0.95, depth: 0.55, n: 15 }, crates: { tall: true, half: 1.0, depth: 0.6, n: 11 },
  wagon: { tall: true, half: 0.85, depth: 2.1, n: 7 }, log: { low: 0.66, half: 1.15, depth: 0.32, n: 18 }, bales: { low: 0.98, half: 1.1, depth: 0.42, n: 12 },
  fence: { low: 1.08, half: 1.15, depth: 0.14, n: 18 }, trough: { low: 0.76, half: 1.0, depth: 0.34, n: 12 } }; // (n: how many of each are kept: the most a course ever has out at once, 30 m behind to 170 m ahead, over 300 courses, plus two: mk_s134)

// ---- building them (each merged into a mesh or two per material, so a row costs a handful of draw calls) ----
function mergeLocal(g) { // a group of meshes → the same, merged by material, in the group's own frame
  g.position.set(0, 0, 0); g.rotation.set(0, 0, 0); g.scale.set(1, 1, 1); g.updateMatrixWorld(true);
  const meshes = []; g.traverse(o => { if (o.isMesh) meshes.push(o); }); const out = new THREE.Group();
  for (const m of bakeStatic(meshes)) out.add(m); return out;
}
// a boulder: a lumpy sphere cut by a few planes into the faces and edges of broken rock, settled on a flat-ish base, smooth-shaded
function boulderGeo(seed) {
  const r = rng(seed), g0 = new THREE.IcosahedronGeometry(1, 3), p = g0.attributes.position, v = new THREE.Vector3(), cuts = [];
  for (let i = 0; i < 8; i++) cuts.push([V3(r() * 2 - 1, r() * 1.6 - 0.5, r() * 2 - 1).normalize(), 0.58 + r() * 0.3]);
  for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); v.multiplyScalar(1 + 0.1 * tfbm(v.x * 2.2 + seed, v.y * 2.2 + v.z * 1.3, 4));
    for (const [n, d] of cuts) { const t = v.dot(n); if (t > d) v.addScaledVector(n, -(t - d) * 0.92); }
    v.y += 0.03 * tfbm(v.x * 9 + seed, v.z * 9, 2); if (v.y < -0.25) v.y = -0.25 + (v.y + 0.25) * 0.25; p.setXYZ(i, v.x, v.y, v.z); }
  const g = weldMorph(g0); g.morphAttributes = {}; g.computeVertexNormals(); return g; // (welded for smooth shading; no morph targets, so three mustn't look for any)
}
function runModel(kind, i) {
  const g = new THREE.Group(), r = rng(1000 + i * 17 + kind.length * 131), add = (m, x, y, z) => { m.position.set(x, y, z); g.add(m); return m; };
  if (kind === "boulder") { // a big boulder broken off the mesas, a smaller one beside it: chest high on a horse and more
    const mat = runRockMat();
    const a = new THREE.Mesh(boulderGeo(3 + i * 7), mat); a.scale.set(1.0 + r() * 0.12, 1.15 + r() * 0.3, 0.8 + r() * 0.15); a.rotation.y = r() * 6; add(a, (r() - 0.5) * 0.2, 0.42, 0);
    const b = new THREE.Mesh(boulderGeo(5 + i * 3), mat); b.scale.set(0.5, 0.45, 0.45); b.rotation.y = r() * 6; add(b, (r() < 0.5 ? -1 : 1) * 0.75, 0.15, 0.3); }
  else if (kind === "cactus") { // a stand of saguaro with a barrel cactus at their feet
    const mat = runCactusMat();
    for (const [x, z, s] of [[-0.45, 0.1, 0.62 + r() * 0.15], [0.5, -0.15, 0.48 + r() * 0.15]]) { const c = new THREE.Mesh(cactusGeo(7 + i * 5 + (x > 0 ? 3 : 0)), mat); c.scale.setScalar(s); c.rotation.y = r() * 6; add(c, x, -0.05, z); }
    const bc = new THREE.SphereGeometry(0.32, 16, 10); { const p = bc.attributes.position; for (let k = 0; k < p.count; k++) { const x = p.getX(k), z = p.getZ(k), a = Math.atan2(z, x), f = 1 + 0.08 * Math.cos(a * 14); p.setX(k, x * f); p.setZ(k, z * f); p.setY(k, p.getY(k) * 1.15); } bc.computeVertexNormals(); }
    add(new THREE.Mesh(bc, mat), 0.05 + (r() - 0.5) * 0.4, 0.28, 0.35); }
  else if (kind === "crates") { // freight off a wagon: crates two high and a barrel
    for (const [x, y, z, s] of [[-0.5, 0, 0, 0.85], [0.42, 0, 0.05, 0.8], [-0.35, 0.85, 0.02, 0.75], [0.35, 0.8, -0.05, 0.6]]) { const c = woodBox(s, s, s, MAT.woodDark); c.rotation.y = (r() - 0.5) * 0.4; add(c, x, y + s / 2, z); }
    const bar = new THREE.CylinderGeometry(0.29, 0.29, 0.86, 18, 4); { const p = bar.attributes.position; for (let k = 0; k < p.count; k++) { const y = p.getY(k), f = 1 + 0.13 * (1 - Math.pow(y / 0.43, 2)); p.setX(k, p.getX(k) * f); p.setZ(k, p.getZ(k) * f); } bar.computeVertexNormals(); }
    add(new THREE.Mesh(bar, MAT.wood), 0.95, 0.43, 0.25); }
  else if (kind === "wagon") { const wg = new THREE.Group(), add0 = R.scene.add.bind(R.scene); R.scene.add = o => wg.add(o); try { wagon(0, 0, 0, i % 2 === 0); } finally { R.scene.add = add0; }
    const w = wg.children[0]; w.position.set(0, 0, 0); w.rotation.set(0, 0, (r() - 0.5) * 0.06); g.add(w); } // (along the lane: it fills it for a wagon's length)
  else if (kind === "log") { // a dead cottonwood trunk across the lane, a broken limb sticking up
    const lg = new THREE.CylinderGeometry(0.3, 0.34, 2.3, 14, 3); lg.rotateZ(Math.PI / 2); { const p = lg.attributes.position; for (let k = 0; k < p.count; k++) { const x = p.getX(k); p.setY(k, p.getY(k) * (1 + 0.06 * Math.sin(x * 5 + i))); } lg.computeVertexNormals(); }
    const uv = lg.attributes.uv; for (let k = 0; k < uv.count; k++) uv.setXY(k, uv.getX(k) * 2.2, uv.getY(k) * 2.3);
    add(new THREE.Mesh(lg, MAT.woodDark), 0, 0.31, 0); const limb = woodBox(0.12, 0.7, 0.12, MAT.woodDark); limb.rotation.set(0.3, 0, (r() < 0.5 ? -1 : 1) * 0.5); add(limb, (r() - 0.5) * 1.2, 0.75, 0); }
  else if (kind === "bales") { for (const [x, y, z, ry] of [[-0.55, 0.25, 0, 0.05], [0.55, 0.25, 0.04, -0.06], [0.0, 0.74, 0.02, 0.1]]) { const b = woodBox(1.05, 0.48, 0.6, MAT.hay); b.rotation.y = ry; add(b, x, y, z); } }
  else if (kind === "fence") { // a lane's width of post-and-rail fence
    for (const x of [-1.12, 1.12]) add(woodBox(0.14, 1.25, 0.14, MAT.woodDark), x, 0.6, 0);
    for (const y of [1.02, 0.6]) add(woodBox(2.36, 0.1, 0.07, MAT.wood, true), 0, y, 0.03); }
  else if (kind === "trough") { const t = woodBox(2.0, 0.62, 0.62, MAT.woodDark); add(t, 0, 0.31, 0); const w = new THREE.Mesh(new THREE.PlaneGeometry(1.86, 0.5), RUN.waterMat || (RUN.waterMat = new THREE.MeshStandardMaterial({ color: 0x1c2428, roughness: 0.05, metalness: 0.1 })));
    w.rotation.x = -Math.PI / 2; add(w, 0, 0.58, 0); }
  const out = mergeLocal(g); out.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; o.userData.dyn = true; } }); return out;
}
function buildRunObstacles() {
  const P = CHASE.pool; for (const k in RUN_KINDS) { const K = RUN_KINDS[k]; P[k] = []; for (let i = 0; i < K.n; i++) { const o = runModel(k, i); o.visible = false; R.scene.add(o); P[k].push({ o, kind: k, half: K.half, depth: K.depth, low: K.low || 0, run: true, used: false }); } }
  buildRunScenery();
}
// the desert either side of the trail, all the way along: sage, dry grass, rocks and cactus, in chunks so what's behind you isn't drawn
function buildRunScenery() {
  const T = TRAIL; if (!T.x) buildTrail(); const r = rng(808), chunk = 160, out = [];
  const sageMat = swayMat(new THREE.MeshStandardMaterial({ map: TEX.sage, alphaTest: 0.45, side: THREE.DoubleSide, roughness: 0.95, color: 0xc8c2a8 }), 0.16);
  const grassMat = swayMat(new THREE.MeshStandardMaterial({ map: TEX.grass, alphaTest: 0.45, side: THREE.DoubleSide, roughness: 0.95, color: 0xd8c79a }), 0.32);
  const cross = new THREE.PlaneGeometry(1, 1); cross.translate(0, 0.5, 0); const c2 = cross.clone(); c2.rotateY(Math.PI / 2); const bush = mergeGeos([{ geo: cross.toNonIndexed() }, { geo: c2.toNonIndexed() }]); bush.clearGroups();
  const cMat = runCactusMat(), rMat = runRockMat(), KC = TIERS[R.tier].clutter;
  const snagMat = weatherWood(stdMat(TEX.wood, 0xb8b0a4, null, { normalScale: new THREE.Vector2(1.2, 1.2) })), ocoMat = new THREE.MeshStandardMaterial({ color: 0x6a6448, roughness: 0.85, normalMap: TEX.fabric.normalMap, normalScale: new THREE.Vector2(0.6, 0.6) });
  const pebble = new THREE.IcosahedronGeometry(1, 0); { const p = pebble.attributes.position; for (let i = 0; i < p.count; i++) p.setY(i, p.getY(i) * 0.55); pebble.computeVertexNormals(); }
  const slab = boulderGeo(47); slab.scale(1.6, 0.32, 1.1); // (a flat ledge of rock breaking the surface)
  const kinds = [{ geo: bush, mat: sageMat, n: 55, lat: [5.6, 70], s: [0.4, 1.05], shadow: false }, { geo: bush, mat: grassMat, n: 170, lat: [5.0, 45], s: [0.35, 0.8], shadow: false, more: [{ n: 90, lat: [0.85, 1.45], s: [0.15, 0.32] }, { n: 70, lat: [3.15, 5.0], s: [0.18, 0.42] }] }, // (and low tufts between the three trails, and along their outer edges)
    { geo: boulderGeo(41), mat: rMat, n: 26, lat: [6, 90], s: [0.2, 1.3], shadow: true, sink: 0.12 }, { geo: boulderGeo(43), mat: rMat, n: 18, lat: [6.5, 90], s: [0.3, 2.2], shadow: true, sink: 0.15 },
    { geo: cactusGeo(53), mat: cMat, n: 5, lat: [7, 80], s: [0.7, 1.15], shadow: true }, { geo: cactusGeo(59), mat: cMat, n: 4, lat: [7, 80], s: [0.7, 1.1], shadow: true }];
  if (KC) kinds.push( // (v33: more of the desert, as the tier allows: dead trees, ocotillo, flat ledges of rock, and loose stones by the trail)
    { geo: snagGeo(61), mat: snagMat, n: Math.round(3 * KC), lat: [7, 70], s: [0.8, 1.4], shadow: true }, { geo: snagGeo(67), mat: snagMat, n: Math.round(2 * KC), lat: [9, 90], s: [0.9, 1.6], shadow: true },
    { geo: ocotilloGeo(71), mat: ocoMat, n: Math.round(5 * KC), lat: [6.5, 60], s: [0.75, 1.2], shadow: true },
    { geo: slab, mat: rMat, n: Math.round(8 * KC), lat: [6, 80], s: [0.6, 2.2], shadow: true, sink: 0.12 },
    { geo: pebble, mat: rMat, n: Math.round(240 * KC), lat: [3.2, 12], s: [0.03, 0.15], shadow: false, sink: 0.2 });
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
  for (let s0 = 40; s0 < T.len; s0 += chunk) for (const K of kinds) {
    const pts = []; for (const B of [K, ...(K.more || [])]) for (let i = 0; i < B.n; i++) { const s = s0 + r() * chunk, side = r() < 0.5 ? -1 : 1, lat = side * lerp(B.lat[0], B.lat[1], Math.pow(r(), 1.6)), p = trailAt(s, lat, {});
      if (inPlayArea(p.x, p.z) && s < 140) continue; pts.push([p.x, p.z, lerp(B.s[0], B.s[1], Math.pow(r(), 2)), r() * TAU]); }
    if (!pts.length) continue; const im = new THREE.InstancedMesh(K.geo, K.mat, pts.length);
    pts.forEach(([x, z, sc, a], i) => { q.setFromEuler(e.set(0, a, 0)); m4.compose(V3(x, groundVis(x, z) - (K.sink || 0.05) * sc, z), q, V3(sc * (K.geo === bush ? 1.3 : 1), sc, sc * (K.geo === bush ? 1.3 : 1))); im.setMatrixAt(i, m4); });
    im.castShadow = K.shadow; im.receiveShadow = true; im.frustumCulled = false; im.userData.s0 = s0; im.visible = false; R.scene.add(im); out.push(im); } // (three culls an instanced mesh by its one geometry: these go by distance along the trail instead)
  CHASE.scenery = out;
}
// a dead tree: a twisted grey trunk forking into bare limbs that thin to twigs (recursive tubes, merged)
function snagGeo(seed) {
  const r = rng(seed), parts = [];
  const limb = (p0, dir, len, rad, depth) => { const pts = [p0.clone()], d = dir.clone(); let p = p0.clone();
    for (let k = 0; k < 4; k++) { d.add(V3((r() - 0.5) * 0.5, (r() - 0.3) * 0.25, (r() - 0.5) * 0.5)).normalize(); p = p.clone().addScaledVector(d, len / 4); pts.push(p); }
    const tg = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), depth ? 5 : 8, rad, depth > 1 ? 4 : 6, false), pp = tg.attributes.position, n = tg.parameters.tubularSegments + 1, rs = tg.parameters.radialSegments + 1;
    for (let i = 0; i < n; i++) { const t = i / (n - 1), sc = 1 - 0.65 * t; const c = tg.parameters.path.getPointAt(t); for (let j = 0; j < rs; j++) { const q = i * rs + j; pp.setXYZ(q, c.x + (pp.getX(q) - c.x) * sc, c.y + (pp.getY(q) - c.y) * sc, c.z + (pp.getZ(q) - c.z) * sc); } } // (tapering)
    parts.push({ geo: tg.toNonIndexed() });
    if (depth < 3) { const kids = depth === 0 ? 3 : 2 + (r() < 0.4 ? 1 : 0); for (let c = 0; c < kids; c++) { const at = pts[2 + (r() * 3 | 0) % 3], nd = d.clone().add(V3((r() - 0.5) * 1.6, 0.2 + r() * 0.6, (r() - 0.5) * 1.6)).normalize(); limb(at, nd, len * (0.55 + r() * 0.2), rad * 0.5, depth + 1); } } };
  limb(V3(0, -0.2, 0), V3((r() - 0.5) * 0.3, 1, (r() - 0.5) * 0.3).normalize(), 2.2 + r() * 1.2, 0.13, 0);
  for (const p of parts) { for (const k of Object.keys(p.geo.attributes)) if (!["position", "normal", "uv"].includes(k)) p.geo.deleteAttribute(k); const uv = p.geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getY(i) * 0.3, uv.getX(i) * 4); } // (the grain along the limb)
  const g = mergeGeos(parts); g.clearGroups(); g.computeVertexNormals(); return g;
}
// ocotillo: a fan of long thin wands from one root, gently bowed, a few with a red tuft at the tip
function ocotilloGeo(seed) {
  const r = rng(seed), parts = [];
  for (let i = 0; i < 14; i++) { const a = r() * TAU, lean = 0.12 + r() * 0.35, L = 2.2 + r() * 1.8, pts = [];
    for (let k = 0; k <= 5; k++) { const t = k / 5, out = Math.sin(lean) * L * t * (0.8 + 0.2 * t); pts.push(V3(Math.cos(a) * out, Math.cos(lean) * L * t, Math.sin(a) * out)); }
    const tg = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 8, 0.022, 4, false); parts.push({ geo: tg.toNonIndexed() }); }
  for (const p of parts) for (const k of Object.keys(p.geo.attributes)) if (!["position", "normal", "uv"].includes(k)) p.geo.deleteAttribute(k);
  const g = mergeGeos(parts); g.clearGroups(); g.computeVertexNormals(); return g;
}
function runCactusMat() { return RUN.cactusMat || (RUN.cactusMat = new THREE.MeshStandardMaterial({ color: 0x46553a, roughness: 0.82, normalMap: TEX.fabric.normalMap, normalScale: new THREE.Vector2(0.4, 0.4) })); } // (saguaro: a dusty grey-green, not lit up like paint)
// weathered stone for boulders: a grainy, dull tan-grey with cracks, pits, and the odd crust of lichen; no bands (those are for cliffs)
function stoneTex() {
  if (TEX.stone) return TEX.stone; const N = Math.max(128, TEXQ >> 1);
  TEX.stone = buildSet(N, N, (u, v, o) => { const f = fbm(u * 4, v * 4, 4, 4, 5, 141), d = fbm(u * 22, v * 22, 22, 22, 3, 143), w = worley(u * 5, v * 5, 5, 5, 145), crack = smoothstep(0.035, 0.0, w.f2 - w.f1) * smoothstep(0.1, 0.45, f) * 0.6; // (a few fine cracks where the stone's weathered, not a paving pattern)
    const pit = (ihash((u * N) | 0, (v * N) | 0, 147) & 1023) < 18 ? 1 : 0, lich = smoothstep(0.42, 0.62, fbm(u * 9, v * 9, 9, 9, 3, 149)) * 0.8, t = 0.5 + 0.5 * f;
    o.h = 0.5 * f + 0.25 * d - 0.9 * crack - 0.3 * pit; o.r = lerp(0.42, 0.62, t) + 0.05 * d; o.g = lerp(0.36, 0.53, t) + 0.04 * d; o.b = lerp(0.30, 0.44, t) + 0.03 * d;
    if (lich > 0.05) { const lc = (w.id & 3) === 0 ? [0.72, 0.52, 0.22] : [0.6, 0.62, 0.52]; o.r = lerp(o.r, lc[0], lich); o.g = lerp(o.g, lc[1], lich); o.b = lerp(o.b, lc[2], lich); }
    const dk = 1 - 0.55 * crack - 0.4 * pit; o.r *= dk; o.g *= dk; o.b *= dk; o.ro = 0.92 - 0.1 * lich; o.ao = 1 - 0.6 * crack; }, 2.4);
  return TEX.stone;
}
// a horse trail, 1.5 m across (u) by 3 m along (v, repeating): dirt packed hard down the middle, cut up with hoofprints old and new (a
// dished print with the shoe's rim pressed in round the toe, the heels open, and the dirt it threw back behind it), scuffed along its
// length, with loose dirt and pebbles kicked up into low banks at the sides
function trailTex() {
  if (TEX.trail) return TEX.trail; const W = 256, Hh = 512, px = 1.5 / W, r = rng(161), dent = new Float32Array(W * Hh), lip = new Float32Array(W * Hh);
  const gauss = () => (r() + r() + r() - 1.5) / 1.5;
  for (let k = 0; k < 72; k++) { const cx = clamp(0.5 + gauss() * 0.3, 0.22, 0.78) * W, cy = r() * Hh, a = (r() - 0.5) * 0.7, sz = 0.85 + r() * 0.32, dep = 0.22 + 0.78 * Math.pow(r(), 1.8), slide = r() < 0.2 ? 1.3 + r() * 0.5 : 1; // (most of them old and trodden soft; now and then one skidded)
    const A = 0.058 * sz / px, B = 0.066 * sz * slide / px, R = Math.ceil(B * 1.7), ca = Math.cos(a), sa = Math.sin(a), sharp = 0.05 + 0.2 * (1 - dep);
    for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) { const x = Math.round(cx + dx); if (x < 0 || x >= W) continue; const y = ((Math.round(cy + dy) % Hh) + Hh) % Hh, i = y * W + x;
      const lx = dx * ca - dy * sa, ly = dx * sa + dy * ca, d = Math.hypot(lx / A, ly / B), toe = smoothstep(-0.6, -0.15, ly / B); // (ly: along the trail, the toe ahead)
      const dish = smoothstep(1.0, 0.82 - sharp, d) * 0.55, rim = smoothstep(0.13 + sharp, 0.0, Math.abs(d - 0.83)) * toe * 0.55;
      const kick = smoothstep(0.98, 1.1, d) * smoothstep(1.7, 1.15, d) * smoothstep(0.1, -0.7, ly / B); // (thrown back, behind the print)
      dent[i] = Math.max(dent[i], (dish + rim) * dep); lip[i] = Math.max(lip[i], kick * dep * 0.8); } }
  TEX.trail = buildSet(W, Hh, (u, v, o) => {
    const i = Math.min(Hh - 1, (v * Hh) | 0) * W + Math.min(W - 1, (u * W) | 0), c = (u - 0.5) * 1.5, ac = Math.abs(c);
    const base = fbm(u * 3, v * 6, 3, 6, 4, 163), det = fbm(u * 24, v * 48, 24, 48, 2, 165), scuff = fbm(u * 40, v * 3, 40, 3, 3, 167); // (scuffs: long along the trail)
    const pack = Math.exp(-Math.pow(c / 0.36, 2)), bank = smoothstep(0.33, 0.52, ac) * smoothstep(0.78, 0.58, ac), dn = dent[i], lp = lip[i];
    const w = worley(u * 20, v * 40, 20, 40, 169), pk = (w.id & 255) / 255, peb = pk > 0.8 - 0.3 * bank ? smoothstep(0.32, 0.12, w.f1) * (0.35 + 0.65 * bank) : 0;
    o.h = 0.22 * base + det * (0.06 + 0.16 * bank) + 0.08 * scuff * pack - 0.95 * dn + 0.42 * lp + 0.35 * bank * (0.5 + 0.5 * det) + 0.55 * peb;
    const t = 0.5 + 0.5 * base, lt = 1 + 0.1 * lp + 0.12 * bank + 0.05 * scuff * pack - 0.26 * dn;
    o.r = lerp(0.43, 0.55, t) * lt; o.g = lerp(0.305, 0.39, t) * lt; o.b = lerp(0.21, 0.27, t) * lt; // (darker and redder than the sand around: packed, and the prints keep a little damp)
    const loose = bank * 0.6 + lp * 0.4; o.r = lerp(o.r, 0.62 + 0.06 * det, loose * 0.55); o.g = lerp(o.g, 0.47 + 0.05 * det, loose * 0.55); o.b = lerp(o.b, 0.34 + 0.04 * det, loose * 0.55);
    if (peb > 0.05) { const pc = 0.4 + 0.22 * ((w.id >>> 8) & 255) / 255; o.r = lerp(o.r, pc * 1.04, peb); o.g = lerp(o.g, pc * 0.95, peb); o.b = lerp(o.b, pc * 0.85, peb); }
    o.ro = 0.96 - 0.14 * pack + 0.04 * bank - 0.06 * peb; o.ao = 1 - 0.55 * dn; }, 3.2);
  return TEX.trail;
}
function runRockMat() { return RUN.rockMat || (RUN.rockMat = gritWorld(stdMat(stoneTex(), 0xffffff, [1.6, 1.6], { normalScale: new THREE.Vector2(1.2, 1.2) }), 1.1, 0.008, 0.4)); }
function runSceneryShow(on) { CHASE.sceneryOn = on; for (const m of CHASE.scenery || []) m.visible = on && runSceneryNear(m); }
const runSceneryNear = m => { const C = CHASE, d = m.userData.s0 - C.s, back = C.state === "ride" || C.state === "mount" ? 60 : 420; return d > -back - 160 && d < 520; }; // (a chunk is 160 m long; facing back in the fight, the trail behind shows)
function runSceneryUpdate() { if (!CHASE.sceneryOn) return; for (const m of CHASE.scenery || []) m.visible = runSceneryNear(m); for (const m of CHASE.ribbon ? CHASE.ribbon.children : []) m.visible = runSceneryNear(m); } // (the trails too: 12g)

// ---- the course: rows across the three lanes, every one with a way through ----
// a row is three cells, one per lane: null (open), "tall", "low" or "long". The patterns come in harder as the course goes on
const RUN_PATTERNS = [
  { f: 0, w: [3, 1, 0.6], cells: r => { const c = [null, null, null]; c[(r() * 3) | 0] = "tall"; return c; } },                                    // one in the way
  { f: 0.08, w: [0.8, 3, 2.5], cells: r => { const c = ["tall", "tall", "tall"]; c[(r() * 3) | 0] = null; return c; } },                          // one way through
  { f: 0.04, w: [1, 1.1, 1.2], jump: true, cells: () => ["low", "low", "low"], full: true },                                                     // jump it, all the way across
  { f: 0.2, w: [0, 1.6, 2.6], jump: true, cells: r => { const c = ["tall", "tall", "tall"]; c[(r() * 3) | 0] = "low"; return c; } },            // find the low one and jump it
  { f: 0.15, w: [0, 1.2, 1.8], cells: r => { const c = [null, null, null], k = (r() * 3) | 0; c[k] = "long"; c[(k + 1 + ((r() * 2) | 0)) % 3] = "tall"; return c; } }, // a wagon down one lane
  { f: 0.3, w: [0, 1, 2], jump: true, cells: r => { const c = ["low", "low", "low"]; c[(r() * 3) | 0] = "tall"; return c; } },                 // jump, or go round where you can
  { f: 0.35, w: [0, 0.8, 2], stagger: true, cells: r => { const a = (r() * 3) | 0, b = (a + 1 + ((r() * 2) | 0)) % 3, c = [null, null, null]; c[a] = "tall"; return { c, then: (() => { const d = [null, null, null]; d[b] = "tall"; d[3 - a - b] = r() < 0.5 ? "tall" : null; return d; })() }; } }, // a zig and a zag
];
function runPick(f) { const C = CHASE, r = C.rng, band = f < 0.15 ? 0 : f < 0.45 ? 1 : 2, ok = RUN_PATTERNS.filter(p => p.f <= f), tot = ok.reduce((a, p) => a + p.w[band], 0); let x = r() * tot;
  for (const p of ok) { x -= p.w[band]; if (x <= 0) return p; } return ok[0]; }
const RUN_TALL = ["boulder", "boulder", "cactus", "crates"], RUN_LOW = ["log", "log", "bales", "trough", "fence"];
// lay one row's cells out at s: returns how long the row runs along the trail
function runCells(cells, s, full) {
  const C = CHASE, r = C.rng; let len = 1;
  const fenceAll = full && r() < 0.5, lowKind = fenceAll ? "fence" : RUN_LOW[(r() * RUN_LOW.length) | 0];
  cells.forEach((cell, i) => { if (!cell) return; const lat = RUN.lanes[i];
    if (cell === "tall") placeObstacle(RUN_TALL[(r() * RUN_TALL.length) | 0], s + (r() - 0.5) * 0.6, lat + (r() - 0.5) * 0.15, r() * 0.4 - 0.2 + (r() < 0.5 ? 0 : Math.PI));
    else if (cell === "low") placeObstacle(full ? lowKind : RUN_LOW[(r() * RUN_LOW.length) | 0], s, lat, (r() - 0.5) * 0.08);
    else if (cell === "long") { placeObstacle("wagon", s + 2.0, lat, r() < 0.5 ? 0 : Math.PI, 1, true); len = 4.5; } });
  return len;
}
// no free rides (v34): every row blocks each lane a rider could have come through the row before (C.reach) by sitting still, so every row
// takes a swipe or a jump. An open cell there becomes a tall thing (when there's another open lane to swipe to) or a low one to jump; and a
// row always keeps a way through
function runForce(cells) {
  const C = CHASE, r = C.rng, reach = C.reach || [true, true, true], c = cells.slice();
  const shut = [0, 1, 2].filter(i => reach[i] && c[i] === null), away = c.some((x, j) => x === null && !reach[j]); let low = c.includes("low");
  for (const i of r() < 0.5 ? shut : shut.reverse()) { if (away || low) c[i] = r() < (away ? 0.7 : 0.55) ? "tall" : "low"; else { c[i] = "low"; low = true; } } // (one low at least if the only ways through are here)
  if (!c.some(x => x === null || x === "low")) c[reach.indexOf(true)] = "low";
  C.reach = c.map(x => x === null || x === "low"); return c;
}
function runRow(s, f) {
  const C = CHASE, r = C.rng, first = C.rowsLaid || 0; let p = runPick(f);
  if (first === 0) { p = RUN_PATTERNS[0]; C.reach = [false, true, false]; } else if (first === 2) p = RUN_PATTERNS[2]; // (you start in the middle lane: the first row blocks it; the third teaches the jump)
  const got = first === 0 ? [null, "tall", null] : p.cells(r), cells = runForce(Array.isArray(got) ? got : got.c); let len = runCells(cells, s, cells.every(x => x === "low")), jump = cells.includes("low");
  C.rows.push({ s, cells, len, jump });
  if (got.then) { const zag = runForce(got.then), zj = zag.includes("low"), s2 = s + Math.max(7, lerp(RUN.speed0, RUN.speed1, f) * (zj ? 0.95 : 0.7)) + r() * 2; // (the zag comes 0.7 s after the zig
    runCells(zag, s2, false); C.rows.push({ s: s2, cells: zag, len: 1, jump: zj, zag: true }); len += s2 - s; jump = zj; } //  at least, however fast; more if it has to be jumped)
  C.rowsLaid = first + 1;
  // dressing at the edges of the trail: nothing you can hit, just what's out there
  if (r() < 0.55) { const side = r() < 0.5 ? -1 : 1, k = r() < 0.6 ? "rock" : "cactus"; placeObstacle(k, s + (r() - 0.5) * 6, side * (4.6 + r() * 1.6), r() * 6, 0.7 + r() * 0.5); }
  const react = lerp(RUN.react[0], RUN.react[1], f) * (1 + r() * RUN.spread) * (jump ? 1.35 : 1), v = lerp(RUN.speed0, RUN.speed1, f);
  return len + react * v;
}

// ---- input: a swipe (a drag that travels far enough), or a key ----
function runLane(dir) { const C = CHASE; if (C.state !== "ride" && C.state !== "mount") return; const to = clamp(C.lane + dir, -1, 1);
  if (to === C.lane) { if (C.state === "ride") { CAM.shake = Math.max(CAM.shake, 0.25); } return; } // (the edge of the trail: a nudge, nothing more)
  C.shift = { from: C.lat, to: RUN.lanes[to + 1], t: 0, back: C.lane }; C.lane = to; if (C.state === "ride") Sound.swish(C.horse.grp.position, 0.35); }
function runJump() { const C = CHASE; if (C.state !== "ride" || C.air) return; C.air = { t: 0 }; C.stats.jumps = (C.stats.jumps || 0) + 1; Sound.horseSnort(C.horse.grp.position);
  kickDust(C.horse.grp.localToWorld(_c1.set(0, 0.1, -0.8)), 6, 1.0, 1.2, 1.0, 1.0); }
function runSwipeStart(e) { CHASE.swipe = { id: e.pointerId, x: e.clientX, y: e.clientY, side: false, up: false }; }
function runSwipeMove(e) { // one lane per swipe, however long it is (swipe again for the next), and one jump; a swipe can do one of each
  const W = CHASE.swipe; if (!W || W.id !== e.pointerId) return false; const dx = e.clientX - W.x, dy = e.clientY - W.y, th = RUN.swipe;
  if (!W.side && Math.abs(dx) > th && Math.abs(dx) > Math.abs(dy) * 1.1) { W.side = true; runLane(dx > 0 ? 1 : -1); W.x = e.clientX; W.y = e.clientY; return true; }
  if (!W.up && -dy > th && -dy > Math.abs(dx) * 1.1) { W.up = true; runJump(); W.x = e.clientX; W.y = e.clientY; return true; }
  return false;
}
function runSwipeEnd(e) { const W = CHASE.swipe; if (W && W.id === e.pointerId) CHASE.swipe = null; }

// ---- each frame of the run ----
function runBegin() { // (from the mount, and on a retry)
  const C = CHASE; C.lane = 0; C.lat = 0; C.shift = null; C.air = null; C.jy = 0; C.jp = 0; C.hitT = 9; C.slowK = 1; C.ghostT = 0; C.fireT = 5; C.rowsLaid = 0; C.swipe = null; C.nearT = 0; C.landT = 9;
}
function updateRide(dt) {
  const C = CHASE, K = CHASE_CFG, f = clamp((C.s - RUN.first) / RUN.course, 0, 1);
  // speed: flat out from the start (RUN.speed0 = speed1); checked by a hit, and back up to speed after it
  C.hitT += dt; C.ghostT -= dt; const back = C.hitT < RUN.recover ? lerp(C.slowK, 1, Ease.inOut(C.hitT / RUN.recover)) : 1;
  const want = lerp(RUN.speed0, RUN.speed1, f) * back; C.speed += (want - C.speed) * Math.min(1, dt * 2.6);
  // across: a quick, straight sidestep from lane to lane
  const v0 = C.latV; if (C.shift) { const S = C.shift; S.t += dt; const u = clamp(S.t / RUN.shift, 0, 1), lat = lerp(S.from, S.to, Ease.inOut(u)); C.latV = (lat - C.lat) / Math.max(dt, 1e-4); C.lat = lat; if (u >= 1) C.shift = null; }
  else { const to = RUN.lanes[C.lane + 1]; C.latV = (to - C.lat) * 8; C.lat += C.latV * dt; }
  C.latA = (C.latV - v0) / Math.max(dt, 1e-4);
  // up: the jump, a clean arc; a landing that thumps
  if (C.air) { C.air.t += dt; const u = C.air.t / RUN.jump.dur;
    if (u >= 1) { C.air = null; C.jy = 0; C.jp = 0; C.landT = 0; CAM.kv = -1.4; Sound.thud(C.horse.grp.position, 0.7); Sound.gallop(null, 1); kickDust(C.horse.grp.localToWorld(_c1.set(0, 0.1, 0.6)), 10, 1.4, 1.1, 1.1, 1.2); }
    else { C.jy = 4 * RUN.jump.up * u * (1 - u); C.jp = -0.3 * (1 - 2 * u) * Math.sin(u * Math.PI); } }
  C.landT += dt; C.s += C.speed * dt;
  // rows set out ahead to the end of the course; picked up again once well behind
  while (C.nextRow < C.s + K.rows.ahead && C.nextRow <= C.courseEnd) { const fr = clamp((C.nextRow - RUN.first) / RUN.course, 0, 1); C.nextRow += runRow(C.nextRow, fr); }
  recycleObstacles();
  // what you ride into
  if (C.ghostT <= 0) { const H0 = RUN.horse;
    for (const ob of C.obs) { if (ob.hit || !ob.run) continue; const ds = ob.s - C.s; if (ds > H0.front + ob.halfS || ds < -H0.back - ob.halfS) continue;
      if (Math.abs(ob.lat - C.lat) > ob.halfLat + H0.half) continue; if (ob.low && C.jy > ob.low * 0.7) continue; // (cleared it)
      const into = (C.s + H0.front) - (ob.s - ob.halfS); runHit(ob, C.shift && into > 0.9 ? "scrape" : ob.low ? "trip" : "crash"); break; } }
  // the gap: riding clean you pull away a little (less as the course goes on); every hit gives them ground
  C.gap = Math.min(K.pursuit.max, C.gap + lerp(K.pursuit.regain0, K.pursuit.regain1, f) * dt * (C.hitT > RUN.recover ? 1 : 0)); C.gapShow += (C.gap - C.gapShow) * Math.min(1, dt * 3);
  // they shoot once they're close: the crack behind you, a whine past, dirt kicked up ahead
  C.fireT -= dt; if (C.fireT <= 0) { C.fireT = rnd(RUN.fire[0], RUN.fire[1]) * (0.55 + C.gap / 45); if (C.gap < 30 && C.s > RUN.first) runPosseShot(); }
  C.nearT = C.gapShow < K.pursuit.near ? C.nearT + dt : 0;
  placeHorse(C.horse, C.s, C.lat, C.latV, C.speed, dt, C.latA, C.jy, C.jp, C.air ? 0.25 : 1); if (!C.air) gallopFeet(C.horse, dt, null, 0.9);
  updatePursuitBar(); Sound.rush(C.speed / K.speed);
  // the wind: sand blown along the ground ahead, streaming past you
  C.windT = (C.windT || 0) - dt * C.speed; while (C.windT < 0) { C.windT += 2.2; const w = trailAt(C.s + rnd(14, 34), C.lat + rnd(-7, 7), _tA); kickDust(_c1.set(w.x, w.y + rnd(0.1, 1.6), w.z), 1, 0.3, 0.25, rnd(0.5, 1.1), rnd(0.8, 1.4)); }
  if (C.gap <= 0) { chaseCapture("ride"); return; }
  if (C.s >= C.turnAt) beginTurn();
}
function runPosseShot() {
  const C = CHASE, R0 = C.riders[(Math.random() * 3) | 0]; Sound.clip(siegePick("far", 4), R0.H.grp.position, 0.95, 0, 0.35, rnd(0.94, 1.06), 9);
  const lat = C.lat + rnd(-2.6, 2.6), at = trailAt(C.s + rnd(5, 16), lat, _tA); kickDust(_c1.set(at.x, at.y + 0.05, at.z), 9, 0.6, 1.6, 0.8, 0.9);
  Sound.clip(siegePick("whiz", 3), R.camera.position.clone().add(_c2.set(rnd(-0.8, 0.8), 0.3, rnd(-0.8, 0.8))), 0.8, 0.05, 0.05, rnd(0.9, 1.1), 2);
}
// you rode into something: what it costs depends on how
function runHit(ob, how) {
  const C = CHASE, p = ob.o.position; ob.hit = true; C.ghostT = RUN.ghost; C.stats.bumps++; C.gap -= RUN.hit[how]; C.hitT = 0; C.slowK = RUN.slow[how];
  kickDust(p, how === "crash" ? 18 : 10, 2, 2, 1.3, 1.6); Sound.thud(p, how === "scrape" ? 0.5 : 0.95); Sound.horseSnort(C.horse.grp.position);
  if (how === "scrape") { const from = C.shift.back; C.shift = { from: C.lat, to: RUN.lanes[from + 1], t: 0, back: C.lane }; C.lane = from; CAM.shake = Math.max(CAM.shake, reduceMotion() ? 0.2 : 0.7); } // (bounced back into the lane you came from)
  else { CAM.shake = Math.max(CAM.shake, reduceMotion() ? 0.3 : how === "crash" ? 1.8 : 1.2); CAM.kv = how === "crash" ? -2.2 : -1.5;
    if (ob.kind === "fence" || ob.kind === "log" || ob.kind === "bales" || ob.kind === "trough") { Sound.crack(p, 1.0); ob.o.rotation.x += (Math.random() < 0.5 ? -1 : 1) * 0.6; ob.o.position.y -= 0.15; }
    else if (ob.kind === "cactus") { Sound.rustle(p, 1); ob.o.rotation.z = 0.5; }
    if (how === "crash") { // the horse shies off it into the nearest lane that's open, losing its stride
      let best = null; for (const k of [C.lane - 1, C.lane + 1, C.lane - 2, C.lane + 2]) { if (k < -1 || k > 1) continue; const lat = RUN.lanes[k + 1];
        if (!C.obs.some(o => o.run && !o.hit && !o.low && Math.abs(o.lat - lat) < o.halfLat + 0.3 && Math.abs(o.s - C.s) < o.halfS + 3)) { best = k; break; } }
      if (best !== null) { C.shift = { from: C.lat, to: RUN.lanes[best + 1], t: -0.08, back: C.lane }; C.lane = best; } C.ghostT = RUN.ghost + 0.4; } }
  const near = C.gap <= K_near(); chaseMsg(how === "scrape" ? "<b>Close!</b><span>" + (near ? "They're right behind you" : "They're gaining") + "</span>"
    : `<b>Whoa!</b><span>${near ? "They're right behind you" : "They're gaining"}</span>`, 1.3, "bump");
  if (C.t - (C.shoutAt ?? -9) > 6) { C.shoutAt = C.t; Sound.clip("shout2", C.riders[0].H.grp.position, 1.2, 0.5, 0.2, 1, 10); }
}
const K_near = () => CHASE_CFG.pursuit.near;
