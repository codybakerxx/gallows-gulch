// ---------- THINGS THAT BREAK (v37) ----------
// Most of the loose things about the street can be shot to pieces: the crates, barrels, coffin and wagon wheel round the gallows, the
// trough and hitching rail by the water, the barrels and crates along the boardwalks, the benches, crates, sacks, barrels, lanterns,
// shutters and wanted posters on the porches, and the trough, crates and barrels the gunmen hide behind in the shootout. Each takes a
// few bullets (BRK_KIND hp), or a moment in the laser's beam; then it bursts: planks and staves, hoops, glass, straw, grain or paper
// flying and lying where they land, water out of a barrel or the trough, dust. Whatever stood on it falls (a bottle, a can) or breaks
// with it (a crate stacked on top). A gunman whose cover is gone is in the open.
// How: they're tagged as they're built (brkTag) and kept out of the town's merged meshes; at boot (buildBreakables) each set of them is
// merged again, by material, with each vertex knowing its object (aBrk). One small texture says which objects still stand; the shader
// drops a broken one's vertices out of sight, and the shadow pass does the same. A shot finds the object from the triangle it hit.
// Everything's put back for the next shootout (breakReset).
const BRK = { list: [], tex: null, data: null, N: 256, src: new Map(), sets: [], depth: null, pend: [] };
const BRK_KIND = { crate: { hp: 3, chunk: "plankD", n: 10 }, barrel: { hp: 3, chunk: "stave", n: 11, water: true, hoops: true }, keg: { hp: 3, chunk: "stave", n: 9, hoops: true },
  trough: { hp: 5, chunk: "plankD", n: 14, water: true }, coffin: { hp: 4, chunk: "plankW", n: 10 }, bench: { hp: 2, chunk: "plankW", n: 7 }, sack: { hp: 2, chunk: "cloth", n: 7, grain: true },
  lantern: { hp: 1, chunk: "iron", n: 5, glass: true }, shutter: { hp: 2, chunk: "plankD", n: 6 }, poster: { hp: 1, chunk: "paper", n: 9 }, wheel: { hp: 3, chunk: "plankD", n: 12, hoops: true },
  rail: { hp: 3, chunk: "plankD", n: 8 }, hay: { hp: 3, chunk: null, n: 0, straw: true }, sign: { hp: 3, chunk: "plankW", n: 8 } };
const _bk1 = new THREE.Vector3(), _bk2 = new THREE.Vector3(), _bk3 = new THREE.Vector3();

// ---- as the town is built ----
function brkTag(o, kind, opt) { o.userData.brk = Object.assign({ kind }, opt || {}); return o; }
function brkOf(o) { for (let q = o; q; q = q.parent) if (q.userData.brk) return q; return null; }
function brkCollect(root) { const out = []; root.traverse(o => { if (o.userData.brk && !(o.parent && brkOf(o.parent))) out.push(o); }); return out; }
const brkSkip = o => !!brkOf(o); // (for bakeGroup: leave them out of the merged town)

// a material like the one it was built with, that hides a broken object's vertices (and keeps whatever the original adds to its shader)
function brkMat(src) {
  const m = src.clone(), before = src.onBeforeCompile, key = src.customProgramCacheKey ? src.customProgramCacheKey() : "";
  m.onBeforeCompile = function (sh, r) { if (before && before !== THREE.Material.prototype.onBeforeCompile) before.call(this, sh, r); brkInject(sh); };
  m.customProgramCacheKey = () => key + "|brk"; BRK.src.set(m, src); if (WORLD.windows.includes(src)) WORLD.windows.push(m); // (lanterns still light at dusk)
  return m;
}
function brkInject(sh) { sh.uniforms.uBrkTex = { value: BRK.tex };
  sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nattribute float aBrk; uniform sampler2D uBrkTex;")
    .replace("#include <begin_vertex>", `#include <begin_vertex>\nif (texture2D(uBrkTex, vec2((aBrk + 0.5) / ${BRK.N.toFixed(1)}, 0.5)).r < 0.5) transformed = vec3(0.0, -500.0, 0.0);`); }
// merge a set of tagged objects into a few meshes under parent
function buildBreakables(objs, parent, opt = {}) {
  if (!BRK.tex) { BRK.data = new Uint8Array(BRK.N * 4).fill(255); BRK.tex = new THREE.DataTexture(BRK.data, BRK.N, 1, THREE.RGBAFormat, THREE.UnsignedByteType); BRK.tex.needsUpdate = true;
    BRK.depth = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking }); BRK.depth.onBeforeCompile = brkInject; BRK.depth.customProgramCacheKey = () => "brkDepth"; }
  const groups = new Map(), set = { parent, meshes: [], ids: [] };
  for (const o of objs) { if (BRK.list.length >= BRK.N) break; o.updateMatrixWorld(true); const id = BRK.list.length, info = o.userData.brk, K = BRK_KIND[info.kind] || BRK_KIND.crate, box = new THREE.Box3().setFromObject(o);
    const B = { id, kind: info.kind, K, hp0: info.hp || K.hp, hp: info.hp || K.hp, alive: true, box, c: box.getCenter(new THREE.Vector3()), size: box.getSize(new THREE.Vector3()), mats: [], decals: [], set, onTop: [], water: info.water ?? K.water };
    o.traverse(m => { if (!m.isMesh || !m.visible) return; const mats = Array.isArray(m.material) ? m.material : [m.material]; const src = mats[0];
      const g = (m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone()); g.applyMatrix4(m.matrixWorld);
      for (const k of Object.keys(g.attributes)) if (!["position", "normal", "uv"].includes(k)) g.deleteAttribute(k);
      if (!g.attributes.uv) g.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
      if (!g.attributes.normal) g.computeVertexNormals();
      g.setAttribute("aBrk", new THREE.BufferAttribute(new Float32Array(g.attributes.position.count).fill(id), 1));
      if (!groups.has(src.uuid)) groups.set(src.uuid, { src, geos: [] }); groups.get(src.uuid).geos.push(g); if (!B.mats.includes(src)) B.mats.push(src); });
    if (o.parent) o.parent.remove(o); BRK.list.push(B); set.ids.push(id); }
  for (const { src, geos } of groups.values()) { const merged = mergeGeos(geos.map(g => ({ geo: g, mat: 0 }))); merged.clearGroups(); merged.computeBoundingSphere();
    const mesh = new THREE.Mesh(merged, brkMat(src)); mesh.castShadow = opt.shadow !== false; mesh.receiveShadow = true; mesh.customDepthMaterial = BRK.depth; mesh.userData.brkMesh = true;
    if (src.transparent || src.alphaTest > 0) mesh.castShadow = false; parent.add(mesh); set.meshes.push(mesh); }
  // what stands on what: a crate stacked on another, a barrel on a porch crate
  for (const i of set.ids) { const A = BRK.list[i]; for (const j of set.ids) { if (i === j) continue; const T = BRK.list[j];
    if (Math.abs(T.box.min.y - A.box.max.y) < 0.09 && T.box.min.x < A.box.max.x - 0.05 && T.box.max.x > A.box.min.x + 0.05 && T.box.min.z < A.box.max.z - 0.05 && T.box.max.z > A.box.min.z + 0.05) A.onTop.push(j); } }
  BRK.sets.push(set); return set;
}
// the town's and the set dressing's, once everything's built (12c boot); the gunmen's cover with the shootout's props (12d)
function buildTownBreakables() { buildBreakDebrisOnce(); buildBreakables(brkCollect(R.scene), R.scene); }
function buildBreakDebrisOnce() { if (!TGT.debris.plankD) buildBreakDebris(); }

// ---- shot ----
// the object a ray's hit is on (null if it isn't one, or it's gone)
function brkFromHit(h) { if (!h || !h.object || !h.object.userData.brkMesh || !h.face) return null; const B = BRK.list[h.object.geometry.attributes.aBrk.getX(h.face.a)]; return B && B.alive ? B : null; }
const brkHitAlive = h => !h.object.userData.brkMesh || !!brkFromHit(h);
function brkSrcMat(m) { return BRK.src.get(m) || m; }
// damage: one per bullet; the beam does it by the second
function brkHit(B, dmg, at, rd, laser) { if (!B || !B.alive) return; B.hp -= dmg; if (B.hp <= 0) brkBreak(B, at, rd, laser); }
function brkSetAlive(B, on) { B.alive = on; BRK.data[B.id * 4] = on ? 255 : 0; BRK.tex.needsUpdate = true; }
function brkBreak(B, at, rd, laser) {
  if (!B.alive) return; brkSetAlive(B, false); const K = B.K, c = B.c, sz = B.size, vol = sz.x * sz.y * sz.z;
  for (const [D, i] of B.decals) D.im.setMatrixAt(i, _tm.makeScale(0, 0, 0)), D.im.instanceMatrix.needsUpdate = true; B.decals = []; // (its bullet holes go with it)
  const rnd3 = () => _bk1.set(rnd(B.box.min.x, B.box.max.x), rnd(B.box.min.y, B.box.max.y), rnd(B.box.min.z, B.box.max.z));
  const fling = (k, up) => _bk2.subVectors(_bk1, c).setY(0).normalize().multiplyScalar(rnd(0.8, 2.6) * k).addScaledVector(rd, rnd(0.6, 2.2) * k).add(_bk3.set(rnd(-0.6, 0.6), rnd(1.2, 3.4) * up, rnd(-0.6, 0.6)));
  const n = K.n ? Math.round(clamp(K.n * (0.6 + Math.cbrt(vol) * 0.6), 4, 18)) : 0, sizeK = clamp(Math.max(sz.x, sz.y, sz.z), 0.25, 1.4);
  if (K.chunk) for (let i = 0; i < n; i++) { rnd3(); debris(K.chunk, _bk1, fling(1, 1), sizeK * rnd(0.35, 0.6), laser ? _bkBurnt : _bkWhite); }
  for (let i = 0; i < 10; i++) { rnd3(); debris("splinter", _bk1, fling(1.3, 1), rnd(0.4, 0.9)); }
  if (K.hoops) for (let i = 0; i < 3; i++) { rnd3(); debris("iron", _bk1, fling(0.8, 0.8), sizeK * 0.5); }
  if (K.glass) { for (let i = 0; i < 16; i++) { rnd3(); debris("glass", _bk1, fling(1, 1), rnd(0.02, 0.045), new THREE.Color(0xd8b070)); } for (let i = 0; i < 18; i++) emit(TGT.sparks, c, _bk2.set(rnd(-1.6, 1.6), rnd(-0.3, 2.2), rnd(-1.6, 1.6)), rnd(0.25, 0.6)); Sound.clip(siegePick("glass", 3), c, 0.9, 0, 0.3, rnd(1.05, 1.2), 4); }
  if (K.straw) { for (let i = 0; i < 40; i++) { rnd3(); debris("straw", _bk1, fling(1, 1), rnd(0.6, 1.2)); } puff(c, 18, 0.8, 0.3, 1.6, 0.6, 0xd8c088); Sound.straw(c, 1); }
  if (K.grain) { for (let i = 0; i < 70; i++) emit(TGT.dirt, c, _bk2.set(rnd(-1.4, 1.4), rnd(0.4, 2.6), rnd(-1.4, 1.4)).addScaledVector(rd, rnd(0.2, 1)), rnd(0.6, 1.2), rnd(0.85, 1)); Sound.straw(c, 0.7); }
  if (K.chunk === "paper") Sound.straw(c, 0.4);
  if (B.water) { const top = _bk3.set(c.x, B.box.max.y - 0.05, c.z); for (let i = 0; i < Math.round(60 + vol * 120); i++) emit(TGT.water, top, _bk2.set(rnd(-1.6, 1.6), rnd(0.5, 2.6), rnd(-1.6, 1.6)).addScaledVector(rd, rnd(0, 1.2)), rnd(0.8, 1.5), rnd(0.6, 0.85)); Sound.splash(c, 1.2); }
  puff(c, Math.round(12 + vol * 30), 0.9 + sizeK * 0.6, 0.25, 1.6, 0.6, laser ? 0x4a4440 : 0xc8a882);
  if (K.chunk && K.chunk !== "paper" && K.chunk !== "cloth" && K.chunk !== "iron") Sound.clip(siegePick("smash", 3), c, clamp(0.7 + sizeK * 0.4, 0.7, 1.2), 0, 0.3, rnd(0.9, 1.1) * (sizeK < 0.5 ? 1.15 : 1), 5);
  else if (K.chunk === "iron") Sound.clip(siegePick("tin", 3), c, 0.8, 0, 0.2, rnd(0.9, 1.05), 4);
  if (laser) Sound.sizzle(c, 0.8);
  crowsStartle(c, 40, 1.2);
  // what was on it: bottles and cans fall, a crate stacked on it goes too
  for (const T of TGT.items) { if (T.state !== "stand" && T.state !== "rest") continue; const p = T.mesh.position; if (p.x > B.box.min.x - 0.05 && p.x < B.box.max.x + 0.05 && p.z > B.box.min.z - 0.05 && p.z < B.box.max.z + 0.05 && Math.abs(p.y - B.box.max.y) < 0.15) {
    if (T.kind === "bottle") { T.state = "broken"; T.mesh.visible = false; for (let i = 0; i < 12; i++) debris("glass", p, _bk2.set(rnd(-1, 1), rnd(0.5, 2), rnd(-1, 1)), rnd(0.02, 0.04), T.col); Sound.clip(siegePick("glass", 3), p, 0.7, 0, 0.25, rnd(1, 1.1), 4); }
    else { T.state = "fly"; T.v.set(rnd(-1, 1), rnd(1.5, 2.5), rnd(-1, 1)); T.w.set(rnd(-10, 10), rnd(-6, 6), rnd(-10, 10)); } } }
  for (const j of B.onTop) BRK.pend.push({ B: BRK.list[j], t: rnd(0.12, 0.25), at: BRK.list[j].c.clone(), rd: rd.clone() });
}
const _bkBurnt = new THREE.Color(0x3a3430), _bkWhite = new THREE.Color(1, 1, 1);
function updateBreak(dt) { for (let i = BRK.pend.length - 1; i >= 0; i--) { const P = BRK.pend[i]; P.t -= dt; if (P.t <= 0) { BRK.pend.splice(i, 1); brkBreak(P.B, P.at, P.rd.setY(-0.3).normalize(), false); } } }
// all of it whole again (the gunmen's cover too); keep = leave the debris (a new shootout straight after a won round)
function breakReset() { let any = false; for (const B of BRK.list) { B.hp = B.hp0; B.decals = []; if (!B.alive) { BRK.data[B.id * 4] = 255; B.alive = true; any = true; } } if (any && BRK.tex) BRK.tex.needsUpdate = true; BRK.pend = []; }
// the debris they leave (instanced, one draw each: 12j)
function buildBreakDebris() {
  const plank = new THREE.BoxGeometry(1, 0.06, 0.2), stave = new THREE.BoxGeometry(1.1, 0.05, 0.16); stave.translate(0, 0.0, 0);
  debrisKind("plankD", plank, MAT.woodDark, 160, { bounce: 0.25, flatX: false, colors: [new THREE.Color(1, 1, 1)] });
  debrisKind("plankW", plank, MAT.wood, 120, { bounce: 0.25, flatX: false, colors: [new THREE.Color(1, 1, 1)] });
  debrisKind("stave", stave, MAT.wood, 120, { bounce: 0.25, flatX: false, colors: [new THREE.Color(1, 1, 1)] });
  debrisKind("iron", new THREE.TorusGeometry(0.5, 0.03, 4, 10, Math.PI * 0.7), MAT.iron, 50, { bounce: 0.35, flatX: false });
  debrisKind("cloth", new THREE.PlaneGeometry(0.5, 0.4, 2, 2), Object.assign(new THREE.MeshStandardMaterial({ color: 0xa88e66, roughness: 0.97, side: THREE.DoubleSide })), 60, { bounce: 0, drag: 2, flutter: 1.2, flatX: false });
  debrisKind("paper", new THREE.PlaneGeometry(0.16, 0.2), new THREE.MeshStandardMaterial({ color: 0xd9c79c, roughness: 0.95, side: THREE.DoubleSide }), 80, { bounce: 0, drag: 2.6, flutter: 0.7, flatX: false });
}
