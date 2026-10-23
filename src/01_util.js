// ---------- UTIL: math, easing, noise ----------
"use strict";
const TAU = Math.PI * 2;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const smoothstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const Ease = {
  inOut: t => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2,
  out: t => 1 - (1 - t) * (1 - t),
  in: t => t * t,
  outBack: t => 1 + 2.70158 * Math.pow(t - 1, 3) + 1.70158 * Math.pow(t - 1, 2),
  sine: t => 0.5 - 0.5 * Math.cos(Math.PI * t)
};
function rng(seed) {
  return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const _v1 = new THREE.Vector3(), _v2 = new THREE.Vector3(), _v3 = new THREE.Vector3(), _v4 = new THREE.Vector3();
const _q1 = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _q3 = new THREE.Quaternion();
const _m1 = new THREE.Matrix4();

// ---- periodic gradient noise (for tileable textures) ----
const GRAD = (() => { const g = new Float32Array(512), r = rng(7); for (let i = 0; i < 256; i++) { const a = r() * TAU; g[i * 2] = Math.cos(a); g[i * 2 + 1] = Math.sin(a); } return g; })();
function ihash(x, y, s) { let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(s, 982451653)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return (h ^ (h >>> 16)) >>> 0; }
function gnoise(x, y, px, py, s) {
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
  const u = fx * fx * fx * (fx * (fx * 6 - 15) + 10), v = fy * fy * fy * (fy * (fy * 6 - 15) + 10);
  const x0 = ((ix % px) + px) % px, y0 = ((iy % py) + py) % py, x1 = (x0 + 1) % px, y1 = (y0 + 1) % py;
  let h = (ihash(x0, y0, s) & 255) * 2; const a = GRAD[h] * fx + GRAD[h + 1] * fy;
  h = (ihash(x1, y0, s) & 255) * 2; const b = GRAD[h] * (fx - 1) + GRAD[h + 1] * fy;
  h = (ihash(x0, y1, s) & 255) * 2; const c = GRAD[h] * fx + GRAD[h + 1] * (fy - 1);
  h = (ihash(x1, y1, s) & 255) * 2; const d = GRAD[h] * (fx - 1) + GRAD[h + 1] * (fy - 1);
  return 1.41 * (a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v);
}
function fbm(x, y, px, py, oct, s, gain = 0.5) {
  let amp = 1, f = 1, sum = 0, norm = 0;
  for (let o = 0; o < oct; o++) { sum += amp * gnoise(x * f, y * f, px * f, py * f, s + o * 31); norm += amp; amp *= gain; f *= 2; }
  return sum / norm;
}
// periodic cellular noise: returns F1, F2 and the id of the nearest cell
const _wor = { f1: 0, f2: 0, id: 0, cx: 0, cy: 0 };
function worley(x, y, px, py, s) {
  const ix = Math.floor(x), iy = Math.floor(y); let f1 = 9, f2 = 9, id = 0, bx = 0, by = 0;
  for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
    const cx = ix + i, cy = iy + j, wx = ((cx % px) + px) % px, wy = ((cy % py) + py) % py, h = ihash(wx, wy, s);
    const fx = cx + (h & 1023) / 1023, fy = cy + ((h >>> 10) & 1023) / 1023, d = Math.hypot(fx - x, fy - y);
    if (d < f1) { f2 = f1; f1 = d; id = h; bx = fx; by = fy; } else if (d < f2) f2 = d;
  }
  _wor.f1 = f1; _wor.f2 = f2; _wor.id = id; _wor.cx = bx; _wor.cy = by; return _wor;
}
// non-periodic terrain noise
const tnoise = (x, y) => gnoise(x, y, 1 << 20, 1 << 20, 11);
function tfbm(x, y, oct) { let a = 1, f = 1, s = 0, n = 0; for (let o = 0; o < oct; o++) { s += a * gnoise(x * f, y * f, 1 << 20, 1 << 20, 17 + o); n += a; a *= 0.5; f *= 2.03; } return s / n; }

// merge simple BufferGeometries (same attribute set), adding material groups
function mergeGeos(list) {
  const names = Object.keys(list[0].geo.attributes);
  let vtx = 0, idx = 0;
  for (const it of list) { vtx += it.geo.attributes.position.count; idx += it.geo.index ? it.geo.index.count : it.geo.attributes.position.count; }
  const out = new THREE.BufferGeometry(), arrays = {};
  for (const n of names) { const a = list[0].geo.attributes[n]; arrays[n] = new a.array.constructor(vtx * a.itemSize); }
  const index = new Uint32Array(idx); let vo = 0, io = 0;
  for (const it of list) {
    const g = it.geo, cnt = g.attributes.position.count;
    for (const n of names) arrays[n].set(g.attributes[n].array, vo * g.attributes[n].itemSize);
    const start = io;
    if (g.index) { for (let i = 0; i < g.index.count; i++) index[io++] = g.index.array[i] + vo; }
    else for (let i = 0; i < cnt; i++) index[io++] = i + vo;
    out.addGroup(start, io - start, it.mat || 0); vo += cnt;
  }
  for (const n of names) { const a = list[0].geo.attributes[n]; out.setAttribute(n, new THREE.BufferAttribute(arrays[n], a.itemSize, a.normalized)); }
  out.setIndex(new THREE.BufferAttribute(index, 1));
  return out;
}
// bake a mesh list (non-skinned) into world-space merged geometry per material key
function bakeStatic(meshes) {
  const groups = new Map();
  for (const m of meshes) {
    m.updateMatrixWorld(true);
    const g = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone();
    g.applyMatrix4(m.matrixWorld);
    for (const k of Object.keys(g.attributes)) if (!["position", "normal", "uv"].includes(k)) g.deleteAttribute(k);
    if (!g.attributes.uv) g.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    const key = m.material.uuid; if (!groups.has(key)) groups.set(key, { mat: m.material, geos: [] }); groups.get(key).geos.push(g);
  }
  const out = [];
  for (const { mat, geos } of groups.values()) {
    const merged = mergeGeos(geos.map(g => ({ geo: g, mat: 0 }))); merged.clearGroups();
    const mesh = new THREE.Mesh(merged, mat); mesh.castShadow = true; mesh.receiveShadow = true; out.push(mesh);
  }
  return out;
}
