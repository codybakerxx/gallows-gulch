// ---------- CHARACTER GEOMETRY: clothing lofted around a mocap skeleton (bind space, metres) ----------
const CHAR = { gltf: null, clips: {}, add: {}, bind: {}, boneIdx: {}, boneInv: {}, partGeo: {}, headGeo: null, headTex: {}, bodyCache: {} };
function sampleKeys(keys, x) { // keys sorted by column 0 ascending; Catmull-Rom per column
  const n = keys.length; if (x <= keys[0][0]) return keys[0].slice(1); if (x >= keys[n - 1][0]) return keys[n - 1].slice(1);
  let i = 0; while (i < n - 2 && x > keys[i + 1][0]) i++;
  const k0 = keys[Math.max(0, i - 1)], k1 = keys[i], k2 = keys[i + 1], k3 = keys[Math.min(n - 1, i + 2)], t = (x - k1[0]) / (k2[0] - k1[0]);
  const out = []; for (let c = 1; c < k1.length; c++) { const p0 = k0[c], p1 = k1[c], p2 = k2[c], p3 = k3[c];
    out.push(0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (-p0 + 3 * p1 - 3 * p2 + p3) * t * t * t)); }
  return out;
}
const sgnPow = (v, e) => Math.sign(v) * Math.pow(Math.abs(v), e);
// grid surface with skin weights. posFn(iu, iv) -> [x,y,z]; wFn(x,y,z) -> [[bone, w],...]; uvFn(iu, iv, p) -> [u,v]
let GRID_RES = 1; // < 1 builds coarser garments for distant townsfolk (the callbacks take fractional grid indices)
function gridGeo(nu0, nv0, posFn, wFn, uvFn, wrap, centerFn) {
  const nu = Math.max(4, Math.round(nu0 * GRID_RES)), nv = Math.max(1, Math.round(nv0 * GRID_RES)), su = nu0 / nu, sv = nv0 / nv;
  const cols = nu + 1, rows = nv + 1, N = cols * rows;
  const P = new Float32Array(N * 3), UV = new Float32Array(N * 2), SI = new Uint16Array(N * 4), SW = new Float32Array(N * 4);
  for (let iv = 0; iv < rows; iv++) for (let iu = 0; iu < cols; iu++) {
    const k = iv * cols + iu, p = posFn(wrap && iu === nu ? 0 : iu * su, iv * sv);
    P[k * 3] = p[0]; P[k * 3 + 1] = p[1]; P[k * 3 + 2] = p[2];
    const uv = uvFn(iu * su, iv * sv, p); UV[k * 2] = uv[0]; UV[k * 2 + 1] = uv[1];
    const w = wFn(p[0], p[1], p[2]).filter(e => e[1] > 0.001).sort((a, b) => b[1] - a[1]).slice(0, 4);
    let s = 0; for (const e of w) s += e[1];
    w.forEach((e, j) => { SI[k * 4 + j] = CHAR.boneIdx[e[0]]; SW[k * 4 + j] = e[1] / s; });
  }
  const idx = [];
  for (let iv = 0; iv < nv; iv++) for (let iu = 0; iu < nu; iu++) { const a = iv * cols + iu, b = a + 1, c = a + cols + 1, d = a + cols; idx.push(a, d, b, b, d, c); }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(P, 3)); g.setAttribute("uv", new THREE.BufferAttribute(UV, 2));
  g.setAttribute("skinIndex", new THREE.BufferAttribute(SI, 4)); g.setAttribute("skinWeight", new THREE.BufferAttribute(SW, 4));
  g.setIndex(idx); g.computeVertexNormals();
  // make normals point outward
  if (centerFn) {
    const nrm = g.attributes.normal, mid = Math.floor(rows / 2) * cols + Math.floor(nu / 3), c = centerFn(Math.floor(rows / 2) * sv);
    const dot = (P[mid * 3] - c[0]) * nrm.getX(mid) + (P[mid * 3 + 1] - c[1]) * nrm.getY(mid) + (P[mid * 3 + 2] - c[2]) * nrm.getZ(mid);
    if (dot < 0) { for (let i = 0; i < idx.length; i += 3) { const t = idx[i + 1]; idx[i + 1] = idx[i + 2]; idx[i + 2] = t; } g.setIndex(idx); g.computeVertexNormals(); }
  }
  if (wrap) { const nrm = g.attributes.normal; for (let iv = 0; iv < rows; iv++) { const a = iv * cols, b = a + nu; _v1.fromBufferAttribute(nrm, a).add(_v2.fromBufferAttribute(nrm, b)).normalize(); nrm.setXYZ(a, _v1.x, _v1.y, _v1.z); nrm.setXYZ(b, _v1.x, _v1.y, _v1.z); } }
  return g;
}
// ---- skin weights ----
const SPINE_Y = [["Hips", 1.04], ["Spine", 1.142], ["Spine1", 1.243], ["Spine2", 1.334], ["Neck", 1.5]];
function scaleW(list, k) { for (const e of list) e[1] *= k; return list; }
function torsoW(x, y) {
  let out;
  if (y <= 1.04) out = [["Hips", 1]]; else if (y >= 1.5) out = [["Neck", 1]];
  else for (let i = 0; i < 4; i++) { const [a, ya] = SPINE_Y[i], [b, yb] = SPINE_Y[i + 1]; if (y >= ya && y <= yb) { const t = (y - ya) / (yb - ya); out = [[a, 1 - t], [b, t]]; break; } }
  const ax = Math.abs(x), side = x > 0 ? "Left" : "Right";
  const wl = smoothstep(0.99, 0.87, y) * smoothstep(0.015, 0.09, ax) * 0.65;
  if (wl > 0) { scaleW(out, 1 - wl); out.push([side + "UpLeg", wl]); }
  const ws = smoothstep(0.12, 0.18, ax) * smoothstep(1.35, 1.42, y) * (1 - smoothstep(1.48, 1.53, y));
  if (ws > 0) { scaleW(out, 1 - ws * 0.75); out.push([side + "Shoulder", ws * 0.5], [side + "Arm", ws * 0.25]); }
  return out;
}
function armW(ax, side) {
  if (ax < 0.12) return [["Spine2", 0.45], [side + "Shoulder", 0.55]];
  if (ax < 0.17) { const t = (ax - 0.12) / 0.05; return [[side + "Shoulder", 1 - t], [side + "Arm", t]]; }
  if (ax < 0.40) return [[side + "Arm", 1]];
  if (ax < 0.46) { const t = (ax - 0.40) / 0.06; return [[side + "Arm", 1 - t], [side + "ForeArm", t]]; }
  if (ax < 0.68) return [[side + "ForeArm", 1]];
  const t = smoothstep(0.68, 0.72, ax) * 0.5; return [[side + "ForeArm", 1 - t], [side + "Hand", t]];
}
function legW(y, side) {
  if (y > 0.93) { const t = smoothstep(0.93, 1.04, y) * 0.6; return [["Hips", t], [side + "UpLeg", 1 - t]]; }
  if (y > 0.56) return [[side + "UpLeg", 1]];
  if (y > 0.50) { const t = (0.56 - y) / 0.06; return [[side + "UpLeg", 1 - t], [side + "Leg", t]]; }
  if (y > 0.11) return [[side + "Leg", 1]];
  const t = smoothstep(0.11, 0.07, y) * 0.6; return [[side + "Leg", 1 - t], [side + "Foot", t]];
}
function skirtW(x, y) {
  if (y >= 1.04) return torsoW(x, y);
  const wl = smoothstep(1.02, 0.5, y) * 0.62, m = smoothstep(-0.06, 0.06, x);
  return [["Hips", 1 - wl], ["LeftUpLeg", wl * m], ["RightUpLeg", wl * (1 - m)]];
}
// ---- section tables ----
const TORSO = [[0.86, 0.120, 0.090, 0.095, 0.000], [0.93, 0.168, 0.105, 0.112, 0.005], [1.00, 0.178, 0.108, 0.115, 0.008], [1.08, 0.165, 0.100, 0.105, 0.010],
  [1.16, 0.150, 0.098, 0.098, 0.012], [1.25, 0.158, 0.110, 0.098, 0.012], [1.33, 0.175, 0.122, 0.100, 0.008], [1.40, 0.188, 0.118, 0.098, 0.0],
  [1.45, 0.190, 0.100, 0.090, -0.010], [1.49, 0.140, 0.075, 0.075, -0.018], [1.52, 0.072, 0.058, 0.058, -0.022], [1.585, 0.05, 0.049, 0.049, -0.015]];
const COAT = [[0.30, 0.300, 0.228, 0.226, -0.01], [0.60, 0.270, 0.190, 0.192, 0.0], [0.85, 0.236, 0.152, 0.152, 0.005], [1.02, 0.200, 0.128, 0.130, 0.008],
  [1.16, 0.176, 0.124, 0.114, 0.012], [1.30, 0.194, 0.137, 0.114, 0.006], [1.38, 0.207, 0.134, 0.112, 0.0], [1.45, 0.206, 0.113, 0.104, -0.01],
  [1.49, 0.150, 0.088, 0.088, -0.018], [1.535, 0.092, 0.086, 0.086, -0.02]];
const ARM = [[0.10, 0.070, 0.068], [0.15, 0.066, 0.064], [0.21, 0.058, 0.056], [0.30, 0.050, 0.049], [0.40, 0.046, 0.045], [0.43, 0.044, 0.043],
  [0.48, 0.045, 0.044], [0.58, 0.040, 0.038], [0.66, 0.036, 0.034], [0.705, 0.039, 0.037]];
const LEG = [[0.075, 0.050, 0.052, -0.012], [0.14, 0.049, 0.050, -0.010], [0.24, 0.052, 0.052, -0.008], [0.36, 0.058, 0.060, -0.010], [0.46, 0.060, 0.062, -0.004],
  [0.53, 0.059, 0.060, 0.006], [0.60, 0.064, 0.066, 0.008], [0.72, 0.076, 0.080, 0.010], [0.85, 0.088, 0.093, 0.008], [0.95, 0.096, 0.100, 0.005], [1.03, 0.098, 0.100, 0.0]];
function ringPoint(th, hw, hdF, hdB, zc, e) { const c = Math.cos(th), s = Math.sin(th); return [hw * sgnPow(c, e), (s > 0 ? hdF : hdB) * sgnPow(s, e) + zc]; }
function torsoGeo(y0, y1, nv, grow = 0, keys = TORSO, nu = 32, wrinkle = 0.01) {
  return gridGeo(nu, nv, (iu, iv) => {
    const y = lerp(y0, y1, iv / nv), [hw, hdF, hdB, zc] = sampleKeys(keys, y), th = iu / nu * TAU;
    const e = lerp(0.85, 1.0, smoothstep(1.5, 1.56, y)), n = 1 + wrinkle * gnoise(th * 2, y * 9, 1 << 16, 1 << 16, 5);
    const [x, z] = ringPoint(th, (hw + grow) * n, (hdF + grow) * n, (hdB + grow) * n, zc, e); return [x, y, z];
  }, (x, y) => torsoW(x, y), (iu, iv) => [iu / nu * 3.2, lerp(y0, y1, iv / nv) * 3.5], true, iv => [0, lerp(y0, y1, iv / nv), 0]);
}
function armGeo(side, grow, cuff) {
  const sd = side > 0 ? "Left" : "Right", nu = 24, nv = 40, x0 = 0.1, x1 = cuff || 0.705, cy = 1.438, cz = -0.05;
  return gridGeo(nu, nv, (iu, iv) => {
    const x = lerp(x0, x1, iv / nv), [ry, rz] = sampleKeys(ARM, x), th = iu / nu * TAU;
    const wr = 1 + 0.03 * Math.exp(-Math.pow((x - 0.44) / 0.05, 2)) * Math.sin(th * 3 + x * 60) + 0.012 * gnoise(th * 2, x * 12, 1 << 16, 1 << 16, 8);
    return [side * x, cy + (ry + grow) * wr * Math.cos(th), cz + (rz + grow) * wr * Math.sin(th)];
  }, (x) => armW(Math.abs(x), sd), (iu, iv) => [iu / nu * 1.4, lerp(x0, x1, iv / nv) * 3.5], true, iv => [side * lerp(x0, x1, iv / nv), cy, cz]);
}
const legCenter = (y, side) => { const hip = [0.082, 0.972, 0.005], knee = [0.082, 0.529, 0.008], ank = [0.082, 0.084, -0.022];
  const t = y >= 0.529 ? (y - 0.529) / (0.972 - 0.529) : (y - 0.084) / (0.529 - 0.084), a = y >= 0.529 ? knee : ank, b = y >= 0.529 ? hip : knee;
  return [side * lerp(a[0], b[0], t) * (y > 0.972 ? 0.92 : 1), lerp(a[2], b[2], clamp(t, 0, 1.2))]; };
function legGeo(side, grow = 0) {
  const sd = side > 0 ? "Left" : "Right", nu = 26, nv = 56, y0 = 1.03, y1 = 0.075;
  return gridGeo(nu, nv, (iu, iv) => {
    const y = lerp(y0, y1, iv / nv), [rx, rz, zo] = sampleKeys(LEG, y), th = iu / nu * TAU, [cx, cz] = legCenter(y, side);
    const bunch = 1 + 0.05 * Math.exp(-Math.pow((y - 0.42) / 0.05, 2)) * Math.sin(th * 4 + y * 50) + 0.014 * gnoise(th * 2, y * 10, 1 << 16, 1 << 16, 9);
    return [cx + (rx + grow) * bunch * Math.cos(th), y, cz + zo + (rz + grow) * bunch * Math.sin(th)];
  }, (x, y) => legW(y, sd), (iu, iv) => [iu / nu * 1.8, lerp(y0, y1, iv / nv) * 3.5], true, iv => { const y = lerp(y0, y1, iv / nv), c = legCenter(y, side); return [c[0], y, c[1]]; });
}
function bootGeo(side) {
  const sd = side > 0 ? "Left" : "Right", nu = 18, nv = 6, y0 = 0.05, y1 = 0.38;
  return gridGeo(nu, nv, (iu, iv) => {
    const y = lerp(y0, y1, iv / nv), th = iu / nu * TAU, [cx, cz] = legCenter(y, side), r = 0.064 + 0.01 * smoothstep(0.3, 0.38, y) + 0.004 * gnoise(th * 2, y * 20, 1 << 16, 1 << 16, 4);
    return [cx + r * Math.cos(th), y, cz - 0.004 + r * 1.06 * Math.sin(th)];
  }, (x, y) => legW(y, sd), (iu, iv) => [iu / nu * 1.6, lerp(y0, y1, iv / nv) * 3], true, iv => { const y = lerp(y0, y1, iv / nv), c = legCenter(y, side); return [c[0], y, c[1]]; });
}
function bandGeo(y0, y1, grow, keys = TORSO, nu = 32) { return torsoGeo(y0, y1, 2, grow, keys, nu, 0); }
function collarGeo(open) { // band collar; open at the throat for the condemned man
  const gap = open ? 0.12 : 0.02, nu = 32;
  return gridGeo(nu, 3, (iu, iv) => { const th = Math.PI / 2 + gap + iu / nu * (TAU - 2 * gap), front = Math.max(0, Math.sin(th)), y = lerp(1.462, 1.545 - 0.016 * front, iv / 3), f = lerp(0.086, 0.091, iv / 3);
    return [f * Math.cos(th), y, -0.02 + f * 0.92 * Math.sin(th)]; },
    (x, y) => torsoW(x, y), (iu, iv) => [iu / nu * 1.5, iv / 3 * 0.25], !open, iv => [0, 1.5, -0.02]);
}
function openGeo(keys, y0, y1, nv, grow, phiFn, wFn, nu = 36, flare = 0) { // garment open at the front (coat, vest)
  return gridGeo(nu, nv, (iu, iv) => {
    const y = lerp(y0, y1, iv / nv), [hw, hdF, hdB, zc] = sampleKeys(keys, y), phi = phiFn(y);
    const th = Math.PI / 2 + phi + (iu / nu) * (TAU - 2 * phi);
    const fold = 1 + flare * smoothstep(1.0, 0.3, y) * (0.035 * Math.sin(th * 7 + y * 3) + 0.02 * gnoise(th * 3, y * 6, 1 << 16, 1 << 16, 3));
    const [x, z] = ringPoint(th, (hw + grow) * fold, (hdF + grow) * fold, (hdB + grow) * fold, zc, 0.9); return [x, y, z];
  }, wFn, (iu, iv) => [iu / nu * 3.4, lerp(y0, y1, iv / nv) * 3.5], false, iv => [0, lerp(y0, y1, iv / nv), 0]);
}
const coatGeo = () => openGeo(COAT, 0.30, 1.535, 30, 0.004, y => lerp(0.13, 0.62, smoothstep(1.5, 0.3, y)), (x, y) => skirtW(x, y), 40, 1);
const vestGeo = () => openGeo(TORSO, 1.0, 1.47, 24, 0.013, y => lerp(0.09, 0.8, smoothstep(1.26, 1.47, y)), (x, y) => torsoW(x, y), 48, 0);
function skirtGeo() {
  return gridGeo(40, 22, (iu, iv) => { const y = lerp(1.12, 0.04, iv / 22), t = smoothstep(1.12, 0.04, y), th = iu / 40 * TAU, f = 1 + 0.05 * Math.sin(th * 12) * t;
    return [lerp(0.168, 0.37, Math.pow(t, 0.8)) * f * Math.cos(th), y, lerp(0.124, 0.31, Math.pow(t, 0.8)) * f * Math.sin(th) + 0.01]; },
    (x, y) => skirtW(x, y), (iu, iv) => [iu / 40 * 5, iv / 22 * 4], true, iv => [0, lerp(1.12, 0.04, iv / 22), 0]);
}
function neckerchiefGeo() {
  return gridGeo(24, 4, (iu, iv) => { const y = lerp(1.47, 1.535, iv / 4), th = iu / 24 * TAU, drop = Math.max(0, Math.sin(th)) * 0.05 * (1 - iv / 4), f = lerp(0.09, 0.083, iv / 4);
    return [f * Math.cos(th), y - drop, -0.02 + f * 0.95 * Math.sin(th) + drop * 0.4]; }, (x, y) => torsoW(x, y), (iu, iv) => [iu / 24 * 2, iv / 4 * 0.4], true, iv => [0, 1.5, -0.02]);
}
function buildBodyGeo(type, lod) {
  const key = JSON.stringify(type) + (lod ? "|lod" : ""); if (CHAR.bodyCache[key]) return CHAR.bodyCache[key];
  GRID_RES = lod ? 0.5 : 1; try { return (CHAR.bodyCache[key] = buildBodyGeoRes(type)); } finally { GRID_RES = 1; }
}
function buildBodyGeoRes(type) {
  const parts = [];
  parts.push({ geo: torsoGeo(0.86, 1.0, 8, 0, TORSO, 56), mat: 1 }, { geo: torsoGeo(0.995, 1.51, 44, 0, TORSO, 64), mat: 0 });
  for (const s of [1, -1]) parts.push({ geo: armGeo(s, type.coat ? 0.009 : 0), mat: type.coat ? 2 : 0 });
  for (const s of [1, -1]) parts.push({ geo: legGeo(s), mat: 1 }, { geo: bootGeo(s), mat: 4 });
  parts.push({ geo: collarGeo(type.openCollar), mat: 0 }, { geo: bandGeo(0.982, 1.03, 0.009), mat: 5 });
  if (type.coat) parts.push({ geo: coatGeo(), mat: 2 });
  if (type.vest) parts.push({ geo: vestGeo(), mat: 3 });
  if (type.skirt) parts.push({ geo: skirtGeo(), mat: 6 });
  if (type.kerchief) parts.push({ geo: neckerchiefGeo(), mat: 7 });
  for (const pt of parts) { const n = pt.geo.attributes.position.count; pt.geo.setAttribute("aPart", new THREE.BufferAttribute(new Float32Array(n).fill(pt.mat), 1)); }
  const g = mergeGeos(parts); g.clearGroups(); g.computeBoundingSphere(); return g;
}
// keep only triangles whose vertices pass a test; groups for each test in order
function splitGeo(g, tests) {
  const p = g.attributes.position, idx = g.index.array, lists = tests.map(() => []);
  for (let i = 0; i < idx.length; i += 3) {
    for (let t = 0; t < tests.length; t++) { let ok = true; for (let k = 0; k < 3; k++) { const v = idx[i + k]; if (!tests[t](p.getX(v), p.getY(v), p.getZ(v))) { ok = false; break; } } if (ok) { lists[t].push(idx[i], idx[i + 1], idx[i + 2]); break; } }
  }
  const out = new THREE.BufferGeometry(); for (const k in g.attributes) out.setAttribute(k, g.attributes[k]);
  const all = []; let start = 0; lists.forEach((l, i) => { out.addGroup(start, l.length, i); start += l.length; for (const v of l) all.push(v); });
  out.setIndex(all); out.computeBoundingSphere(); return out;
}
