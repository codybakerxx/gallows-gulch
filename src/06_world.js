// ---------- WORLD: desert terrain, mesas, rocks, cacti, scrub, frontier town ----------
const WORLD = { ground: null, lit: [], windows: [], roofs: [], mesas: [], canyonU: { on: { value: 0 }, inv: { value: new THREE.Matrix4() } } };
// play-area layout (meters). Camera looks roughly toward -x/-z, sun sets behind the town.
const LAY = {
  plat: { x: -3.2, z: -5.5, w: 3.4, d: 3.0, h: 2.4 },
  trap: { x: -3.2, z: -5.5, w: 1.1, d: 1.0 },
  beamY: 5.35, postX: [-4.85, -1.55],
  stairs: { x: -2.15, zTop: -4.0, zBot: -0.35, w: 1.0, n: 13 },
  lever: { x: -4.3, z: -4.55 }, exec: { x: -4.3, z: -5.05 },
  board: { x: 1.7, y: 1.45, z: -0.6, w: 2.1, h: 1.15, yaw: 0.8 },
  manStart: { x: -2.15, z: 0.75 }
};
function boxUV(geo, w, h, d, s = 1) { // scale BoxGeometry UVs to meters
  const uv = geo.attributes.uv, dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) for (let i = 0; i < 4; i++) { const k = f * 4 + i; uv.setXY(k, uv.getX(k) * dims[f][0] * s, uv.getY(k) * dims[f][1] * s); }
  uv.needsUpdate = true; return geo;
}
function woodBox(w, h, d, mat, rotGrain) {
  const g = boxUV(new THREE.BoxGeometry(w, h, d), w, h, d);
  if (rotGrain) { const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) { const a = uv.getX(i); uv.setX(i, uv.getY(i)); uv.setY(i, a); } }
  { const uv = g.attributes.uv, ou = Math.random() * 7, ov = Math.random() * 7; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) + ou, uv.getY(i) + ov); }
  const m = new THREE.Mesh(g, mat || MAT.wood); m.castShadow = true; m.receiveShadow = true; return m;
}
function groundHeight(x, z) {
  const r = Math.hypot(x + 2, z + 4);
  const far = smoothstep(45, 260, r);
  return far * (6 * tfbm(x * 0.004, z * 0.004, 4) + 9 * Math.max(0, tfbm(x * 0.0017 + 3, z * 0.0017, 3))) + 0.12 * tfbm(x * 0.12, z * 0.12, 2) * smoothstep(14, 30, r) * (1 - far);
}
// the ground as it is drawn: the height field sampled on the mesh's grid and cut into its triangles, so a horse out on the plain stands on what
// you see rather than on the smooth field the grid only approximates (the getaway, 12f)
const GROUND_GRID = { size: 1400, seg: 120, h: null };
function groundVis(x, z) {
  const G = GROUND_GRID, n = G.seg + 1, c = G.size / G.seg; if (!G.h) return groundHeight(x, z);
  const fx = clamp((x + G.size / 2) / c, 0, G.seg - 1e-4), fz = clamp((z + G.size / 2) / c, 0, G.seg - 1e-4), ix = fx | 0, iz = fz | 0, u = fx - ix, v = fz - iz;
  const ha = G.h[iz * n + ix], hb = G.h[(iz + 1) * n + ix], hc = G.h[(iz + 1) * n + ix + 1], hd = G.h[iz * n + ix + 1];
  return u + v <= 1 ? ha + (hd - ha) * u + (hb - ha) * v : hc + (hb - hc) * (1 - u) + (hd - hc) * (1 - v);
}
function buildGround() {
  const size = 1400, seg = 120, g = new THREE.PlaneGeometry(size, size, seg, seg); g.rotateX(-Math.PI / 2);
  const p = g.attributes.position, uv = g.attributes.uv; GROUND_GRID.h = new Float32Array(p.count);
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); p.setY(i, GROUND_GRID.h[i] = groundHeight(x, z)); uv.setXY(i, x / 3.2, z / 3.2); }
  g.computeVertexNormals();
  const m = new THREE.MeshStandardMaterial({ map: TEX.ground.map, normalMap: TEX.ground.normalMap, roughnessMap: TEX.ground.orm, normalScale: new THREE.Vector2(0.65, 0.65) });
  { // an apron under and beyond the plain, so out on the getaway trail (12g) the ground's far edge never shows sky below the horizon; the fog colours it
    const ap = new THREE.Mesh(new THREE.RingGeometry(560, 9000, 96, 1).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({ color: 0x4a3020 })); ap.position.y = -10; ap.matrixAutoUpdate = false; ap.updateMatrix(); R.scene.add(ap); }
  m.onBeforeCompile = sh => {
    sh.uniforms.macroMap = { value: TEX.macro }; sh.uniforms.canyonOn = WORLD.canyonU.on; sh.uniforms.canyonInv = WORLD.canyonU.inv;
    sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nvarying vec3 vGW;").replace("#include <project_vertex>", "#include <project_vertex>\nvGW = (modelMatrix * vec4(transformed, 1.0)).xyz;");
    sh.fragmentShader = sh.fragmentShader.replace("#include <clipping_planes_fragment>", `#include <clipping_planes_fragment>
      if (canyonOn > 0.5) { vec3 cl = (canyonInv * vec4(vGW, 1.0)).xyz; if (abs(cl.x) < 1.0 && cl.z > 0.0 && cl.z < 1.0) discard; } // (the canyon at the end of the getaway cuts through the plain)`)
      .replace("#include <common>", `#include <common>
      varying vec3 vGW; uniform sampler2D macroMap; uniform float canyonOn; uniform mat4 canyonInv; float groundH = 0.0;
      vec2 gh2(vec2 p) { return fract(sin(vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)))) * 43758.5453); }
      // prints: cells hold at most one oval dent, sized and turned per cell
      float prints(vec2 p, float cell, vec2 size, float keep) {
        vec2 c = floor(p / cell), best = vec2(9.0); float o = 0.0;
        for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) { vec2 g = c + vec2(float(i), float(j)), h = gh2(g); if (h.x > keep) continue;
          vec2 q = p - (g + 0.15 + 0.7 * h) * cell; float a = h.y * 6.2832; q = mat2(cos(a), -sin(a), sin(a), cos(a)) * q;
          o = max(o, smoothstep(1.0, 0.55, length(q / size))); }
        return o; }`)
      .replace("#include <map_fragment>", `#include <map_fragment>
        vec4 mac = texture2D(macroMap, vGW.xz * 0.011); vec4 mac2 = texture2D(macroMap, vGW.xz * 0.0019 + 0.37);
        float mm = mac.r * 0.7 + mac2.g * 0.7 - 0.7;
        diffuseColor.rgb *= 0.84 + 0.34 * mm;
        diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(1.1, 0.95, 0.84), smoothstep(0.35, 0.8, mac2.r));
        float trod = exp(-pow(length((vGW.xz - vec2(-1.0, -2.6)) * vec2(1.0, 0.8)) / 7.5, 2.0));
        diffuseColor.rgb *= 1.0 - 0.14 * trod;
        vec2 sd = vGW.xz - vec2(-3.5, -6.0); float al = dot(sd, vec2(-0.55, -0.835)), sdx = dot(sd, vec2(0.835, -0.55)); float rut = exp(-pow(abs(sdx - 0.6) - 0.75, 2.0) * 30.0) * smoothstep(4.0, 9.0, al);
        diffuseColor.rgb *= 1.0 - 0.18 * rut;
        // hooves along the street, boots around the gallows, ruts pressed in
        float street = smoothstep(9.0, 4.0, abs(sdx)) * smoothstep(-2.0, 3.0, al);
        float hoof = prints(vGW.xz, 0.55, vec2(0.075, 0.06), 0.35) * street;
        float boot = prints(vGW.xz + 7.3, 0.42, vec2(0.13, 0.05), 0.4) * trod;
        diffuseColor.rgb *= 1.0 - 0.22 * hoof - 0.16 * boot;
        groundH = -0.02 * rut - 0.012 * hoof - 0.008 * boot;`)
      .replace("#include <normal_fragment_maps>", `#include <normal_fragment_maps>
        { vec3 sx = dFdx(-vViewPosition), sy = dFdy(-vViewPosition), r1 = cross(sy, normal), r2 = cross(normal, sx);
          float fd = dot(sx, r1) * faceDirection; vec3 gr = sign(fd) * (dFdx(groundH) * r1 + dFdy(groundH) * r2); normal = normalize(abs(fd) * normal - gr); }`);
  };
  const mesh = new THREE.Mesh(g, m); mesh.receiveShadow = true; R.scene.add(mesh); WORLD.ground = mesh;
}
// mesas and buttes: a concave talus apron, a shale bench, sheer sandstone cliffs in two bands with a ledge between, a hard caprock
// rim; the outline is lobed, with buttresses and alcoves where blocks have fallen away
function mesaGeo(r, R0, Hh, butte) {
  const nu = 96, seed = r() * 50, pos = [], col = [], idx = [];
  const prof = [];
  for (let k = 0; k <= 6; k++) { const t = k / 6 * 0.3; prof.push([t, 1.0 + 0.62 * Math.pow(1 - t / 0.3, 1.7), 0]); }         // talus apron
  for (const [t, m] of [[0.35, 0.978], [0.43, 0.966]]) prof.push([t, m, 0.3]);                                                  // shale bench
  for (let k = 0; k <= 3; k++) { const t = 0.45 + k / 3 * 0.17; prof.push([t, 0.955 - 0.012 * k / 3, 1]); }                   // lower cliff
  prof.push([0.625, 0.925, 0.5], [0.64, 0.905, 0.3]);                                                                          // ledge
  for (let k = 0; k <= 4; k++) { const t = 0.65 + k / 4 * 0.28; prof.push([t, 0.9 - 0.008 * k / 4, 1]); }                     // upper cliff
  prof.push([0.96, 0.905, 1], [0.975, 0.89, 0.6], [0.99, 0.85, 0.2], [1.0, 0.82, 0]);                                          // caprock rim
  const lobe = th => 1 + 0.3 * tfbm(Math.cos(th) * 1.4 + seed, Math.sin(th) * 1.4, 3) * (butte ? 0.5 : 1);
  const fracture = (th, t) => { const n = tfbm(Math.cos(th) * 7 + seed * 2, Math.sin(th) * 7 + t * 2.2, 3); return 0.07 * Math.max(-0.4, Math.min(0.4, n * 2.2)); };
  const sand = [[0.74, 0.40, 0.24], [0.80, 0.47, 0.29], [0.70, 0.35, 0.21], [0.83, 0.55, 0.37], [0.76, 0.42, 0.25]];
  for (const [ty, m, cliff] of prof) {
    const y = ty * Hh;
    for (let i = 0; i <= nu; i++) {
      const th = (i % nu) / nu * TAU, L = lobe(th);
      const fr = ty > 0.3 ? fracture(th, ty) : fracture(th, 0.3) * (ty / 0.3);
      const rr = R0 * L * (m + fr + (ty < 0.3 ? 0.07 * tfbm(th * 6, seed + ty * 3, 2) : 0));
      pos.push(Math.cos(th) * rr, y, Math.sin(th) * rr);
      const band = sand[Math.floor(ty * 14 + 0.6 * tfbm(th * 2, ty * 5, 2) + 14) % sand.length], sh = 0.86 + 0.14 * tfbm(th * 13 + seed, ty * 40, 2);
      let c = band;
      if (ty < 0.3) { const k = ty / 0.3; c = [lerp(0.62, band[0], k * 0.6), lerp(0.43, band[1], k * 0.6), lerp(0.31, band[2], k * 0.6)]; }   // talus: mixed debris
      else if (cliff < 0.4) c = [0.58, 0.42, 0.34];                                                                                 // shale: duller, purplish
      col.push(c[0] * sh, c[1] * sh, c[2] * sh);
    }
  }
  for (let k = 0; k < prof.length - 1; k++) for (let i = 0; i < nu; i++) { const a = k * (nu + 1) + i, b = a + 1, c = a + nu + 2, d = a + nu + 1; idx.push(a, d, b, b, d, c); }
  const top = pos.length / 3; pos.push(0, Hh * 1.0, 0); col.push(0.6, 0.38, 0.24);
  const last = (prof.length - 1) * (nu + 1); for (let i = 0; i < nu; i++) idx.push(last + i, last + i + 1, top);
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx); g.computeVertexNormals(); return g;
}
// rock faces at a distance: dark desert-varnish streaks down the cliffs, fine strata, sun-bleached tops
function mesaMat() {
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 });
  m.onBeforeCompile = sh => {
    sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nvarying vec3 vMP; varying vec3 vMN;")
      .replace("#include <worldpos_vertex>", "#include <worldpos_vertex>\nvMP = (modelMatrix * vec4(transformed, 1.0)).xyz; vMN = normalize(mat3(modelMatrix) * objectNormal);");
    sh.fragmentShader = sh.fragmentShader.replace("#include <common>", `#include <common>
      varying vec3 vMP; varying vec3 vMN;
      float mh(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float mn(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(mh(i), mh(i + vec2(1, 0)), f.x), mix(mh(i + vec2(0, 1)), mh(i + vec2(1, 1)), f.x), f.y); }`)
      .replace("#include <color_fragment>", `#include <color_fragment>
        { vec3 n = normalize(vMN); float cliff = smoothstep(0.55, 0.15, abs(n.y)), hc = abs(n.x) > abs(n.z) ? vMP.z : vMP.x;
          float v = mn(vec2(hc * 0.22, vMP.y * 0.012)) * 0.65 + mn(vec2(hc * 0.9, vMP.y * 0.05)) * 0.35;
          float varnish = smoothstep(0.5, 0.82, v) * cliff;
          float strata = 0.5 + 0.5 * sin(vMP.y * 0.9 + mn(vec2(hc * 0.05, vMP.y * 0.1)) * 3.0);
          diffuseColor.rgb *= (1.0 - 0.42 * varnish) * (0.93 + 0.07 * strata);
          diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(1.08, 1.04, 0.98), smoothstep(0.7, 0.95, n.y)); }`);
  };
  m.customProgramCacheKey = () => "gulchMesa"; return m;
}
function buildMesas() {
  const r = rng(404), mat = mesaMat();
  const sunA = Math.atan2(STREET.a[1], STREET.a[0]), pl = [], geos = [];
  for (let i = 0; i < 18; i++) pl.push({ a: sunA + (i / 17 - 0.5) * 2.6 + (r() - 0.5) * 0.1, d: 520 + r() * 900, butte: r() < 0.3 });
  for (let i = 0; i < 6; i++) pl.push({ a: sunA + Math.PI * (0.55 + r() * 0.9), d: 700 + r() * 700, butte: r() < 0.4 });
  for (const P of pl) {
    if (Math.abs(((P.a - sunA + Math.PI) % TAU + TAU) % TAU - Math.PI) < 0.08) continue; // keep the setting sun clear
    const R0 = P.butte ? 30 + r() * 35 : 80 + r() * 160, Hh = P.butte ? 80 + r() * 90 : 40 + r() * 70;
    const m = new THREE.Mesh(mesaGeo(r, R0, Hh, P.butte), mat); m.position.set(Math.cos(P.a) * P.d - 2, -4, Math.sin(P.a) * P.d - 4); m.rotation.y = r() * TAU; geos.push(m);
    WORLD.mesas.push({ x: m.position.x, z: m.position.z, r: R0 * 1.7 }); // (its footprint, talus and all: the getaway's trail keeps clear of it)
  }
  for (const m of geos) { m.updateMatrixWorld(true); m.geometry.applyMatrix4(m.matrixWorld); }
  const merged = mergeGeos(geos.map(m => ({ geo: m.geometry }))); merged.clearGroups(); const mm = new THREE.Mesh(merged, mat); mm.receiveShadow = false; R.scene.add(mm);
}
function rockGeo(seed) {
  const g = new THREE.IcosahedronGeometry(1, 2), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const v = _v1.fromBufferAttribute(p, i); const n = 1 + 0.35 * tfbm(v.x * 1.3 + seed, v.y * 1.3 + v.z * 0.7, 4); v.multiplyScalar(n); v.y *= 0.62; p.setXYZ(i, v.x, v.y, v.z); }
  g.computeVertexNormals(); return g;
}
function scatter(count, rMin, rMax, avoid, seed) {
  const r = rng(seed), out = [];
  let guard = 0;
  while (out.length < count && guard++ < count * 30) {
    const a = r() * TAU, d = rMin + Math.sqrt(r()) * (rMax - rMin), x = Math.cos(a) * d - 1, z = Math.sin(a) * d - 3;
    if (avoid(x, z)) continue; out.push({ x, z, r: r(), s: r() });
  }
  return out;
}
const inPlayArea = (x, z) => { if (x > -9 && x < 6.5 && z > -11 && z < 4.5) return true; if (z > 1 && Math.abs(x - 2) < 9) return true; if (nearTrail(x, z, 8)) return true;
  const dx = x - STREET.o[0], dz = z - STREET.o[1], al = dx * STREET.a[0] + dz * STREET.a[1], sd = dx * STREET.r[0] + dz * STREET.r[1];
  return al > 2 && al < 95 && Math.abs(sd) < 26; };
function buildRocks() {
  const geos = [rockGeo(1), rockGeo(7), rockGeo(13)], pts = scatter(70, 9, 140, inPlayArea, 77);
  geos.forEach((g, gi) => {
    const list = pts.filter((_, i) => i % 3 === gi), im = new THREE.InstancedMesh(g, MAT.rock, list.length), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3();
    list.forEach((p, i) => { const sc = 0.25 + Math.pow(p.s, 3) * 2.2; q.setFromEuler(new THREE.Euler(0, p.r * TAU, 0)); s.set(sc, sc, sc); m4.compose(V3(p.x, groundHeight(p.x, p.z) - sc * 0.15, p.z), q, s); im.setMatrixAt(i, m4); });
    im.castShadow = true; im.receiveShadow = true; R.scene.add(im);
  });
}
function cactusGeo(seed) {
  const r = rng(seed), parts = [], H = 3.2 + r() * 3.5;
  const rib = (g, R0) => { const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), a = Math.atan2(z, x), k = 1 + 0.07 * Math.cos(a * 12); p.setX(i, x * k); p.setZ(i, z * k); } return g; };
  const trunk = rib(new THREE.CylinderGeometry(0.2, 0.26, H, 24, 8), 0.24); trunk.translate(0, H / 2, 0); parts.push(trunk);
  const cap = rib(new THREE.SphereGeometry(0.2, 24, 8, 0, TAU, 0, Math.PI / 2), 0.2); cap.translate(0, H, 0); parts.push(cap);
  const arms = 1 + (r() * 3 | 0);
  for (let a = 0; a < arms; a++) {
    const side = a % 2 ? 1 : -1, h0 = H * (0.35 + r() * 0.3), out = 0.45 + r() * 0.25, up = 0.9 + r() * 1.3, rot = r() * TAU;
    const curve = new THREE.CatmullRomCurve3([V3(0, h0, 0), V3(side * out * 0.7, h0 + 0.05, 0), V3(side * out, h0 + 0.35, 0), V3(side * out, h0 + up, 0)]);
    const tg = new THREE.TubeGeometry(curve, 16, 0.14, 16, false); tg.rotateY(rot); parts.push(tg);
    const tc = new THREE.SphereGeometry(0.14, 16, 6, 0, TAU, 0, Math.PI / 2); tc.translate(side * out, h0 + up, 0); tc.rotateY(rot); parts.push(tc);
  }
  const clean = parts.map(g => { const n = g.index ? g.toNonIndexed() : g; for (const k of Object.keys(n.attributes)) if (!["position", "normal", "uv"].includes(k)) n.deleteAttribute(k); return { geo: n, mat: 0 }; });
  const m = mergeGeos(clean); m.clearGroups(); m.computeVertexNormals(); return m;
}
function buildCacti() {
  const mat = new THREE.MeshStandardMaterial({ color: 0x5f6e48, roughness: 0.7, normalMap: TEX.fabric.normalMap, normalScale: new THREE.Vector2(0.4, 0.4) });
  const geos = [cactusGeo(3), cactusGeo(11), cactusGeo(29)], pts = scatter(18, 14, 110, inPlayArea, 91);
  geos.forEach((g, gi) => { const list = pts.filter((_, i) => i % 3 === gi), im = new THREE.InstancedMesh(g, mat, list.length), m4 = new THREE.Matrix4(), q = new THREE.Quaternion();
    list.forEach((p, i) => { const sc = 0.8 + p.s * 0.5; q.setFromEuler(new THREE.Euler(0, p.r * TAU, 0)); m4.compose(V3(p.x, groundHeight(p.x, p.z) - 0.1, p.z), q, V3(sc, sc, sc)); im.setMatrixAt(i, m4); });
    im.castShadow = true; im.receiveShadow = true; R.scene.add(im); });
}
function buildScrub() {
  const T = TIERS[R.tier];
  const cross = new THREE.PlaneGeometry(1, 1); cross.translate(0, 0.5, 0);
  const g2 = cross.clone(); g2.rotateY(Math.PI / 2);
  const geo = mergeGeos([{ geo: cross.toNonIndexed() }, { geo: g2.toNonIndexed() }]); geo.clearGroups();
  for (const [tex, n, s0, seed, tint] of [[TEX.sage, 260, 0.9, 5, 0xc8c2a8], [TEX.grass, 420, 0.6, 6, 0xd8c79a]]) {
    const pts = scatter(Math.round(n * T.grass), 3.5, 95, (x, z) => (x > -5.6 && x < 3.2 && z > -7.2 && z < 2.6) || (Math.abs(x - LAY.board.x) < 2.5 && Math.abs(z - LAY.board.z) < 2.5), seed);
    const mat = swayMat(new THREE.MeshStandardMaterial({ map: tex, alphaTest: 0.45, side: THREE.DoubleSide, roughness: 0.95, color: tint }), tex === TEX.grass ? 0.32 : 0.16);
    const im = new THREE.InstancedMesh(geo, mat, pts.length), m4 = new THREE.Matrix4(), q = new THREE.Quaternion();
    pts.forEach((p, i) => { const sc = s0 * (0.6 + p.s * 0.9); q.setFromEuler(new THREE.Euler(0, p.r * TAU, 0)); m4.compose(V3(p.x, groundHeight(p.x, p.z) - 0.04, p.z), q, V3(sc * 1.3, sc, sc * 1.3)); im.setMatrixAt(i, m4); });
    im.receiveShadow = true; R.scene.add(im);
  }
}
// ---- frontier town ----
function signTex(text, w, h, bg, fg, font) {
  const c = document.createElement("canvas"); c.width = w; c.height = h; const g = c.getContext("2d");
  g.fillStyle = bg; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 400; i++) { g.fillStyle = `rgba(0,0,0,${Math.random() * 0.08})`; g.fillRect(Math.random() * w, Math.random() * h, Math.random() * 30, 1 + Math.random() * 2); }
  g.fillStyle = fg; g.textAlign = "center"; g.textBaseline = "middle"; g.font = `${Math.floor(h * 0.62)}px ${font || '"Sancreek","Rye",Georgia,serif'}`;
  g.fillText(text, w / 2, h * 0.54, w * 0.9); g.strokeStyle = "rgba(0,0,0,.35)"; g.lineWidth = h * 0.06; g.strokeRect(0, 0, w, h);
  return canvasTex(c);
}
function bakeGroup(group, skip) {
  group.updateMatrixWorld(true);
  const meshes = []; group.traverse(o => { if (o.isMesh && !(skip && skip(o))) meshes.push(o); });
  const baked = bakeStatic(meshes); for (const m of meshes) m.parent.remove(m); for (const b of baked) R.scene.add(b); return baked;
}
function building(x, z, ry, w, h, d, name, opt = {}) {
  const grp = new THREE.Group(), mat = opt.mat === MAT.woodRed ? MAT.sidingRed : opt.mat || MAT.siding, parts = [];
  const add = m => { parts.push(m); grp.add(m); return m; };
  const body = add(woodBox(w, h, d, mat)); body.position.y = h / 2;
  const front = add(woodBox(w, h + 1.6, 0.18, opt.brick ? MAT.brick : mat)); front.position.set(0, (h + 1.6) / 2, d / 2 + 0.09);
  const cap = add(woodBox(w + 0.3, 0.22, 0.4, MAT.woodDark)); cap.position.set(0, h + 1.65, d / 2 + 0.1);
  // porch
  const pd = 2.4, deck = add(woodBox(w, 0.25, pd, MAT.woodDark)); deck.position.set(0, 0.12, d / 2 + pd / 2 + 0.18);
  const roof = add(woodBox(w + 0.2, 0.1, pd + 0.2, MAT.shingle, true)); roof.position.set(0, 3.15, d / 2 + pd / 2 + 0.15); roof.rotation.x = 0.12;
  if (opt.balcony) { roof.rotation.x = 0; roof.position.y = 3.24; }
  for (let i = 0; i <= 3; i++) { const p = add(woodBox(0.16, 3.0, 0.16, MAT.woodDark)); p.position.set(-w / 2 + 0.2 + i * (w - 0.4) / 3, 1.6, d / 2 + pd + 0.1); }
  // windows + door (emissive at dusk)
  if (!WORLD.winMat) { WORLD.winMat = windowMat(); WORLD.windows.push(WORLD.winMat); }
  const winMat = WORLD.winMat;
  const door = new THREE.Mesh(boxUV(new THREE.BoxGeometry(1.1, 2.2, 0.06), 1.1, 2.2, 0.06), MAT.door); door.position.set(0, 1.35, d / 2 + 0.2); grp.add(door);
  for (const [fw, fh, fx, fy] of [[1.3, 0.1, 0, 2.5], [0.1, 2.3, -0.6, 1.35], [0.1, 2.3, 0.6, 1.35]]) { const f = woodBox(fw, fh, 0.1, MAT.woodDark); f.position.set(fx, fy, d / 2 + 0.22); grp.add(f); }
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), MAT.brass); knob.position.set(0.4, 1.25, d / 2 + 0.25); grp.add(knob);
  for (const sx of [-1, 1]) { const wdw = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.3, 0.06), winMat); wdw.position.set(sx * w * 0.3, 1.7, d / 2 + 0.2); grp.add(wdw);
    const up = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.0, 0.06), winMat); up.position.set(sx * w * 0.25, h - 1.2, d / 2 + 0.2); grp.add(up);
    for (const [ww, wh, wx, wy] of [[1.16, 1.46, sx * w * 0.3, 1.7], [1.04, 1.14, sx * w * 0.25, h - 1.2]]) { // casing and sill
      const top = woodBox(ww + 0.08, 0.09, 0.08, MAT.woodDark); top.position.set(wx, wy + wh / 2, d / 2 + 0.22); grp.add(top);
      const sill = woodBox(ww + 0.14, 0.06, 0.14, MAT.woodDark); sill.position.set(wx, wy - wh / 2, d / 2 + 0.24); grp.add(sill);
      for (const e of [-1, 1]) { const side = woodBox(0.08, wh, 0.08, MAT.woodDark); side.position.set(wx + e * ww / 2, wy, d / 2 + 0.22); grp.add(side); } } }
  if (name) { const sm = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.82, 0.9), new THREE.MeshStandardMaterial({ map: signTex(name, 1024, 128, opt.signBg || "#d9c8a4", opt.signFg || "#3a2214"), roughness: 0.9 }));
    sm.position.set(0, h + 0.55, d / 2 + 0.19); grp.add(sm); }
  // false-front trim: corner boards, a frieze and a bracketed cornice
  for (const e of [-1, 1]) { const cb = woodBox(0.16, h + 1.55, 0.05, MAT.woodDark); cb.position.set(e * (w / 2 - 0.08), (h + 1.55) / 2, d / 2 + 0.2); add(cb); }
  const fz = woodBox(w - 0.2, 0.12, 0.05, MAT.woodDark); fz.position.set(0, h + 1.28, d / 2 + 0.2); add(fz);
  const nb = Math.max(3, Math.round(w / 1.3)); for (let i = 0; i <= nb; i++) { const br = woodBox(0.09, 0.24, 0.22, MAT.woodDark); br.position.set(-w / 2 + 0.25 + i * (w - 0.5) / nb, h + 1.43, d / 2 + 0.3); add(br); }
  // the real roof behind the false front: a low gable, ridge running back from the street, shingled
  const pitch = Math.min(0.42, Math.atan(1.3 / (w / 2))), rw = (w / 2 + 0.3) / Math.cos(pitch);
  for (const e of [-1, 1]) { const rf = woodBox(rw, 0.08, d + 0.4, MAT.shingle); rf.rotation.z = -e * pitch; rf.position.set(e * (w / 4 + 0.07), h + Math.tan(pitch) * w / 4 + 0.06, -0.1); add(rf); }
  { const gs = new THREE.Shape([new THREE.Vector2(-w / 2, 0), new THREE.Vector2(w / 2, 0), new THREE.Vector2(0, Math.tan(pitch) * w / 2)]), gg = new THREE.ExtrudeGeometry(gs, { depth: 0.08, bevelEnabled: false });
    const uv = gg.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 1.0 + 3.3, uv.getY(i) * 1.0); const gm = new THREE.Mesh(gg, mat); gm.position.set(0, h, -d / 2 - 0.04); add(gm); }
  const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.6, 10), MAT.iron); pipe.position.set(w * 0.22, h + Math.tan(pitch) * (w / 2 - w * 0.22) + 0.6, -d * 0.25); pipe.castShadow = true; add(pipe);
  const capP = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.14, 10), MAT.iron); capP.position.copy(pipe.position).add(V3(0, 0.86, 0)); add(capP);
  if (opt.smoke) grp.userData.smokeAt = pipe.position.clone().add(V3(0, 0.75, 0));
  // windows down the sides
  for (const e of [-1, 1]) for (const zz of [-d * 0.22, d * 0.18]) { const sw = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.15, 0.85), winMat); sw.position.set(e * (w / 2 + 0.03), 1.85, zz); grp.add(sw);
    const tp = woodBox(0.08, 0.08, 1.0, MAT.woodDark); tp.position.set(e * (w / 2 + 0.05), 2.46, zz); add(tp); const sl = woodBox(0.12, 0.06, 1.05, MAT.woodDark); sl.position.set(e * (w / 2 + 0.07), 1.25, zz); add(sl); }
  // two-storey houses get a balcony over the porch: plank floor on the porch roof line, turned posts and a top rail
  if (opt.balcony) { const by = 3.35, bal = add(woodBox(w - 0.3, 0.12, pd - 0.2, MAT.plank)); bal.position.set(0, by, d / 2 + pd / 2 + 0.1);
    const nb2 = Math.round((w - 0.6) / 0.3); for (let i = 0; i <= nb2; i++) { const bp = woodBox(0.05, 0.85, 0.05, MAT.woodDark); bp.position.set(-w / 2 + 0.3 + i * (w - 0.6) / nb2, by + 0.48, d / 2 + pd - 0.05); add(bp); }
    const tr = woodBox(w - 0.4, 0.07, 0.1, MAT.wood, true); tr.position.set(0, by + 0.92, d / 2 + pd - 0.05); add(tr);
    for (const e of [-1, 1]) { const sr = woodBox(0.07, 0.07, pd - 0.3, MAT.wood); sr.position.set(e * (w / 2 - 0.2), by + 0.92, d / 2 + pd / 2 + 0.1); add(sr); }
    for (const sx of [-1, 1]) { const dr = new THREE.Mesh(boxUV(new THREE.BoxGeometry(0.85, 2.0, 0.06), 0.85, 2.0, 0.06), MAT.door); dr.position.set(sx * w * 0.08, by + 1.06, d / 2 + 0.2); grp.add(dr); } }
  // a shingle sign swinging under the porch roof, and a few bills tacked to the wall
  if (opt.hang) { const hs = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.42, 0.05), [MAT.woodDark, MAT.woodDark, MAT.woodDark, MAT.woodDark,
      new THREE.MeshStandardMaterial({ map: signTex(opt.hang, 512, 160, "#d6c49c", "#3a2214"), roughness: 0.9 }), new THREE.MeshStandardMaterial({ map: signTex(opt.hang, 512, 160, "#d6c49c", "#3a2214"), roughness: 0.9 })]);
    hs.geometry.groups.forEach(g => { if (g.materialIndex < 4) g.materialIndex = 0; }); hs.material = [hs.material[0], hs.material[1], hs.material[2], hs.material[3], hs.material[4], hs.material[5]];
    hs.position.set(w / 2 - 0.9, 2.45, d / 2 + pd - 0.25); hs.rotation.y = Math.PI / 2; grp.add(hs);
    for (const e of [-0.45, 0.45]) { const ch = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.36, 4), MAT.iron); ch.position.set(w / 2 - 0.9, 2.84, d / 2 + pd - 0.25 + e); add(ch); } }
  if (!WORLD.billMat) { const c = document.createElement("canvas"); c.width = 256; c.height = 340; const g = c.getContext("2d");
    g.fillStyle = "#d8c8a0"; g.fillRect(0, 0, 256, 340); g.fillStyle = "#2a1a10"; g.textAlign = "center"; g.font = '700 40px "Zilla Slab",Georgia,serif'; g.fillText("NOTICE", 128, 56);
    g.font = '18px Georgia,serif'; ["No firearms", "within town", "limits", "", "by order of", "the Marshal"].forEach((t, i) => g.fillText(t, 128, 110 + i * 34));
    for (let i = 0; i < 300; i++) { g.fillStyle = `rgba(70,50,20,${Math.random() * 0.12})`; g.fillRect(Math.random() * 256, Math.random() * 340, Math.random() * 12, Math.random() * 12); }
    WORLD.billMat = new THREE.MeshStandardMaterial({ map: canvasTex(c), roughness: 0.95, side: THREE.DoubleSide }); }
  for (const bx of [-w * 0.42, w * 0.12]) { const b = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.45), WORLD.billMat); b.position.set(bx, 1.55 + Math.random() * 0.2, d / 2 + 0.195); b.rotation.z = (Math.random() - 0.5) * 0.12; grp.add(b); }
  // the porch: plank seams on the deck and a rail out front to tie horses to
  deck.material = MAT.plank;
  if (opt.rail !== false) { for (const e of [-1, 1]) { const hp = woodBox(0.12, 1.0, 0.12, MAT.woodDark); hp.position.set(e * w * 0.3, 0.5, d / 2 + pd + 1.0); add(hp); }
    const hr = woodBox(w * 0.6 + 0.3, 0.09, 0.09, MAT.wood, true); hr.position.set(0, 0.95, d / 2 + pd + 1.0); add(hr); }
  grp.position.set(x, groundHeight(x, z), z); grp.rotation.y = ry; (WORLD.town || R.scene).add(grp);
  if (grp.userData.smokeAt) { grp.updateMatrixWorld(true); (WORLD.chimneys = WORLD.chimneys || []).push(grp.localToWorld(grp.userData.smokeAt.clone())); }
  return grp;
}
// ---- the roofs a gunman climbs onto in the shootout (12d): where the building stands and its measurements (the same as building() draws),
// so a man can stand behind the false front (floorAt), a falling body lands on the roof, the porch roof or the street (the ragdoll's solids),
// and a drop of blood or a dropped gun comes to rest on whichever it reaches first (surfaceAt)
function roofInfo(x, z, ry, w, h, d, name, opt) {
  const Rf = { name, x, z, y0: groundHeight(x, z), c: Math.cos(ry), s: Math.sin(ry), w, h, d, pd: 2.4, pitch: Math.min(0.42, Math.atan(1.3 / (w / 2))),
    porchY: opt.balcony ? 3.24 : 3.15, porchTilt: opt.balcony ? 0 : 0.12, top: h + 1.76 }; // (top: the cap on the false front)
  Rf.solids = roofSolids(Rf); return Rf;
}
const _rl = [0, 0];
function roofLocal(Rf, x, z, out = _rl) { const dx = x - Rf.x, dz = z - Rf.z; out[0] = dx * Rf.c - dz * Rf.s; out[1] = dx * Rf.s + dz * Rf.c; return out; } // world -> the building's own x (along the front) and z (toward the street)
function roofWorld(Rf, lx, ly, lz, out = V3()) { return out.set(Rf.x + lx * Rf.c + lz * Rf.s, Rf.y0 + ly, Rf.z - lx * Rf.s + lz * Rf.c); }
function roofTop(Rf, lx) { return Rf.y0 + Rf.h + 0.1 + Math.tan(Rf.pitch) * (Rf.w / 2 + 0.07 - Math.abs(lx)); } // the shingles: eaves low at the sides, ridge running back from the street
function onRoof(Rf, l) { return Math.abs(l[0]) < Rf.w / 2 + 0.07 && l[1] > -Rf.d / 2 - 0.3 && l[1] < Rf.d / 2; }
function porchTop(Rf, l) { const { w, d, pd } = Rf; if (Math.abs(l[0]) > w / 2 + 0.1 || l[1] < d / 2 + 0.05 || l[1] > d / 2 + pd + 0.25) return -1e9;
  return Rf.y0 + Rf.porchY + 0.05 - (l[1] - (d / 2 + pd / 2 + 0.15)) * Math.tan(Rf.porchTilt); }
// the top of whatever is under (x, z) at height y or a little below: a roof, a porch roof, the gallows deck, the street
function surfaceAt(x, z, y) {
  let f = floorAt(x, z); if (!WORLD.roofs.length || y === undefined) return f;
  for (const Rf of WORLD.roofs) { const py = porchTop(Rf, roofLocal(Rf, x, z)); if (py > f && y >= py - 0.25) f = py; }
  return f;
}
// the building as boxes a body can't pass through, in world space: [centre, its three axes, half sizes]. The roof slabs and the porch roof are
// thickened downward so a falling body can't slip through them in a step
function roofSolids(Rf) {
  const { w, h, d, pd, pitch } = Rf, out = [], ax = (x, y, z) => V3(x * Rf.c + z * Rf.s, y, -x * Rf.s + z * Rf.c);
  const box = (cx, cy, cz, hx, hy, hz, rz = 0, rx = 0) => { // a box in the building's frame, turned rz about its z axis or rx about its x axis
    const ux = V3(Math.cos(rz), Math.sin(rz), 0), uy = V3(-Math.sin(rz) * Math.cos(rx), Math.cos(rz) * Math.cos(rx), Math.sin(rx)), uz = V3(0, -Math.sin(rx), Math.cos(rx));
    out.push({ c: roofWorld(Rf, cx, cy, cz), u: [ax(ux.x, ux.y, ux.z), ax(uy.x, uy.y, uy.z), ax(uz.x, uz.y, uz.z)], h: [hx, hy, hz] }); };
  box(0, h / 2, 0, w / 2, h / 2, d / 2); // the walls
  const rw = (w / 2 + 0.3) / Math.cos(pitch);
  for (const e of [-1, 1]) { const r = -e * pitch, cy = h + Math.tan(pitch) * w / 4 + 0.06, cx = e * (w / 4 + 0.07); // the two roof slabs, 0.58 thick below the shingles
    box(cx + Math.sin(r) * 0.25, cy - Math.cos(r) * 0.25, -0.1, rw / 2, 0.29, (d + 0.4) / 2, r); }
  box(0, (h + 1.6) / 2, d / 2 + 0.09, w / 2, (h + 1.6) / 2, 0.09); // the false front
  box(0, h + 1.65, d / 2 + 0.1, (w + 0.3) / 2, 0.11, 0.2); // its cap
  box(0, Rf.porchY - 0.1 * Math.cos(Rf.porchTilt), d / 2 + pd / 2 + 0.15 - 0.1 * Math.sin(Rf.porchTilt), w / 2 + 0.1, 0.15, (pd + 0.2) / 2, 0, Rf.porchTilt); // the porch roof
  box(0, 0.12, d / 2 + pd / 2 + 0.18, w / 2, 0.125, pd / 2); // the porch deck
  for (let i = 0; i <= 3; i++) box(-w / 2 + 0.2 + i * (w - 0.4) / 3, 1.6, d / 2 + pd + 0.1, 0.08, 1.5, 0.08); // its posts
  return out;
}
const STREET = { o: [-3.5, -6.0], a: [-0.55, -0.835], r: [0.835, -0.55] };
function streetPt(along, side) { return [STREET.o[0] + STREET.a[0] * along + STREET.r[0] * side, STREET.o[1] + STREET.a[1] * along + STREET.r[1] * side]; }
// ---- the trail out of town for the getaway (12f): out the back of the street past the hay bales, away from the sunset, then a long bend
// that slowly opens out (a spiral, so it never comes back round on itself). Points every 2 m: position, heading and the cumulative distance
const TRAIL = { step: 2, x: null, z: null, hx: null, hz: null, len: 0, turn: 1, R0: 120, R1: 180, straight: 300, total: 1700 }; // (stays 200 m from town once past 300 m, and 250 m clear of every mesa)
function buildTrail() {
  const T = TRAIL, n = Math.ceil(T.total / T.step) + 1; T.x = new Float32Array(n); T.z = new Float32Array(n); T.hx = new Float32Array(n); T.hz = new Float32Array(n);
  let [x, z] = streetPt(-12, 5.5), th = Math.atan2(-STREET.a[0], -STREET.a[1]); // heading: away from town, back down the street
  for (let i = 0; i < n; i++) { const s = i * T.step; T.x[i] = x; T.z[i] = z; T.hx[i] = Math.sin(th); T.hz[i] = Math.cos(th);
    const k = s < T.straight ? 0 : T.turn / lerp(T.R0, T.R1, clamp((s - T.straight) / (T.total - T.straight), 0, 1)) * smoothstep(T.straight, T.straight + 40, s);
    th += k * T.step; x += Math.sin(th) * T.step; z += Math.cos(th) * T.step; }
  T.len = (n - 1) * T.step; T.n = n;
}
// a point on the trail s metres along it, `lat` metres to its right: position (y on the drawn ground), heading and the right-hand normal
function trailAt(s, lat = 0, out = {}) {
  const T = TRAIL; if (!T.x) buildTrail();
  if (s < 0 || s > T.len) { const e = s < 0 ? 0 : T.n - 1, d = s < 0 ? s : s - T.len; // (before its start, back up the street; past its end, straight on)
    out.hx = T.hx[e]; out.hz = T.hz[e]; out.nx = -out.hz; out.nz = out.hx; out.x = T.x[e] + out.hx * d + out.nx * lat; out.z = T.z[e] + out.hz * d + out.nz * lat;
    out.y = groundVis(out.x, out.z); out.yaw = Math.atan2(out.hx, out.hz); return out; }
  const f = clamp(s / T.step, 0, T.n - 1.001), i = f | 0, u = f - i;
  const hx = lerp(T.hx[i], T.hx[i + 1], u), hz = lerp(T.hz[i], T.hz[i + 1], u), hl = Math.hypot(hx, hz) || 1;
  out.hx = hx / hl; out.hz = hz / hl; out.nx = -out.hz; out.nz = out.hx; // (right of the heading: x = -hz... turned clockwise seen from above)
  out.x = lerp(T.x[i], T.x[i + 1], u) + out.nx * lat; out.z = lerp(T.z[i], T.z[i + 1], u) + out.nz * lat; out.y = groundVis(out.x, out.z); out.yaw = Math.atan2(out.hx, out.hz); return out;
}
function nearTrail(x, z, m) { const T = TRAIL; if (!T.x) buildTrail(); const m2 = m * m; for (let i = 0; i < T.n; i += 2) { const dx = x - T.x[i], dz = z - T.z[i]; if (dx * dx + dz * dz < m2) return true; } return false; }
function buildTown() {
  WORLD.town = new THREE.Group(); R.scene.add(WORLD.town);
  const yawL = Math.atan2(STREET.r[0], STREET.r[1]), yawR = Math.atan2(-STREET.r[0], -STREET.r[1]);
  const B = [
    [9, -1, 8, 5.5, 9, "SHERIFF", { smoke: true, hang: "JAIL", roofGun: true }], [18.5, -1, 9, 7.5, 10, "SALOON", { signBg: "#7a2418", signFg: "#f0dcae", smoke: true, balcony: true }], [28, -1, 8, 6.5, 9, "HOTEL", { mat: MAT.woodRed, balcony: true }],
    [37, -1, 7, 5, 8, "BARBER", { hang: "BATHS 25c" }], [45.5, -1, 8, 6, 9, "UNDERTAKER"],
    [11, 1, 8, 6, 9, "GENERAL STORE", { smoke: true, hang: "DRY GOODS", roofGun: true }], [20, 1, 7, 5.5, 8, "BANK", { signBg: "#2b2a28", signFg: "#d8b264", brick: true }], [29, 1, 9, 6, 9, "ASSAY OFFICE", { mat: MAT.woodRed, hang: "GUNSMITH" }], [38.5, 1, 8, 5.5, 9, "LIVERY"]
  ];
  for (const [along, side, w, h, d, name, opt] of B) { const [x, z] = streetPt(along, side * (11.5 + d / 2)), ry = side < 0 ? yawL : yawR; building(x, z, ry, w, h, d, name, opt);
    if (opt && opt.roofGun) WORLD.roofs.push(roofInfo(x, z, ry, w, h, d, name, opt)); }
  // church with steeple
  const ch = new THREE.Group(), cb = woodBox(8, 6, 14, MAT.wood); cb.position.y = 3; ch.add(cb);
  const roofG = new THREE.CylinderGeometry(0.01, 6.2, 3.5, 4, 1); roofG.rotateY(Math.PI / 4); const roof = new THREE.Mesh(roofG, MAT.woodDark); roof.scale.set(0.95, 1, 1.7); roof.position.y = 7.7; roof.castShadow = true; ch.add(roof);
  const tw = woodBox(2.6, 5, 2.6, MAT.wood); tw.position.set(0, 8.5, 6.5); ch.add(tw);
  const sp = new THREE.Mesh(new THREE.ConeGeometry(1.9, 6, 4), MAT.woodDark); sp.rotation.y = Math.PI / 4; sp.position.set(0, 14, 6.5); ch.add(sp);
  const cr = woodBox(0.15, 1.4, 0.15, MAT.iron); cr.position.set(0, 17.6, 6.5); ch.add(cr); const cr2 = woodBox(0.8, 0.15, 0.15, MAT.iron); cr2.position.set(0, 17.8, 6.5); ch.add(cr2);
  { const [cx, cz] = streetPt(78, -9); ch.position.set(cx, groundHeight(cx, cz), cz); ch.rotation.y = yawR + 0.4; } WORLD.town.add(ch); WORLD.church = { position: ch.position.clone() };
  // water tower
  const wt = new THREE.Group(), tank = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.4, 3.2, 20), MAT.woodDark); tank.position.y = 7.5; wt.add(tank);
  const tr = new THREE.Mesh(new THREE.ConeGeometry(2.7, 1.4, 20), MAT.wood); tr.position.y = 9.8; wt.add(tr);
  for (const [lx, lz] of [[-1.8, -1.8], [1.8, -1.8], [-1.8, 1.8], [1.8, 1.8]]) { const l = woodBox(0.25, 6, 0.25, MAT.wood); l.position.set(lx, 3, lz); wt.add(l); }
  { const [wx, wz] = streetPt(52, 20); wt.position.set(wx, groundHeight(wx, wz), wz); } WORLD.town.add(wt);
  wt.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  // telegraph line heading out of town
  const wireMat = new THREE.LineBasicMaterial({ color: 0x1b1410 }), wp = [];
  for (let i = 0; i < 14; i++) { const [x, z] = streetPt(56 + i * 26, 13 + i * 0.4), y = groundHeight(x, z); const p = woodBox(0.22, 7, 0.22, MAT.woodDark); p.position.set(x, y + 3.5, z); WORLD.town.add(p);
    const arm = woodBox(1.6, 0.14, 0.14, MAT.woodDark); arm.position.set(x, y + 6.6, z); WORLD.town.add(arm); wp.push(V3(x - 0.6, y + 6.7, z), V3(x + 0.6, y + 6.7, z)); }
  { const [fx, fz] = streetPt(16.5, -10.2); buildFlag(fx, fz); }
  bakeGroup(WORLD.town); R.scene.remove(WORLD.town);
  for (let s = 0; s < 2; s++) { const pts = []; for (let i = 0; i < wp.length / 2 - 1; i++) { const a = wp[i * 2 + s], b = wp[i * 2 + 2 + s]; for (let k = 0; k <= 8; k++) { const t = k / 8; pts.push(V3(lerp(a.x, b.x, t), lerp(a.y, b.y, t) - Math.sin(t * Math.PI) * 0.45, lerp(a.z, b.z, t))); } }
    R.scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), wireMat)); }
}
function setTownLights(d) { const k = smoothstep(0.15, 0.9, d) * 2.2; for (const m of WORLD.windows) m.emissiveIntensity = k; }
