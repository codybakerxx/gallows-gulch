// ---------- CHARACTER ASSEMBLY: mocap rig + lofted clothing + scanned head + hats/hood/mask ----------
function prepareCharacters(xbot, head, col, nrm, spec) {
  CHAR.gltf = xbot;
  for (const c of xbot.animations) CHAR.clips[c.name] = c;
  const hp = CHAR.clips.walk.tracks.find(t => t.name === "mixamorigHips.position"), ip = CHAR.clips.idle.tracks.find(t => t.name === "mixamorigHips.position");
  const dz = ip.values[2] - hp.values[2]; for (let i = 2; i < hp.values.length; i += 3) hp.values[i] += dz;
  const upper = /(Spine1|Spine2|Neck|Head)\.quaternion$/;
  for (const [k, n, ref] of [["agree", "agree"], ["shake", "headShake"], ["sad", "sad_pose", "idle"]]) {
    const c = CHAR.clips[n].clone(); c.tracks = c.tracks.filter(t => upper.test(t.name));
    if (ref) { const r = CHAR.clips[ref].clone(); r.tracks = r.tracks.filter(t => upper.test(t.name)); THREE.AnimationUtils.makeClipAdditive(c, 0, r); }
    else THREE.AnimationUtils.makeClipAdditive(c);
    CHAR.add[k] = c;
  }
  let surf, joints; xbot.scene.traverse(o => { if (o.isSkinnedMesh) { if (o.name === "Beta_Surface") surf = o; else joints = o; } });
  const sk = surf.skeleton;
  sk.bones.forEach((b, i) => { const n = b.name.replace("mixamorig", ""); CHAR.boneIdx[n] = i; CHAR.boneInv[n] = sk.boneInverses[i].clone(); CHAR.bind[n] = new THREE.Vector3().setFromMatrixPosition(_m1.copy(sk.boneInverses[i]).invert()); });
  const hands = (x, y) => Math.abs(x) > 0.686, feet = (x, y) => y < 0.125;
  CHAR.partGeo.surface = splitGeo(surf.geometry, [hands, feet]); CHAR.partGeo.joints = splitGeo(joints.geometry, [hands, feet]); CHAR.partGeo.surfaceLow = decimateSkinned(CHAR.partGeo.surface, 0.018);
  let hm; head.scene.traverse(o => { if (o.isMesh) hm = o; });
  { const raw = atob(HEAD_OCC_B64), occ = new Uint8Array(raw.length); for (let i = 0; i < raw.length; i++) occ[i] = raw.charCodeAt(i);
    if (occ.length === hm.geometry.attributes.position.count) hm.geometry.setAttribute("aOcc", new THREE.BufferAttribute(occ, 1, true)); }
  CHAR.headGeo = splitGeo(hm.geometry, [(x, y) => y > -1.25]); CHAR.headGeo.clearGroups(); CHAR.headLow = decimate(CHAR.headGeo, 0.3);
  col.encoding = THREE.sRGBEncoding; for (const t of [col, nrm, spec]) if (t) t.anisotropy = Math.min(8, R.maxAniso || 1);
  CHAR.headTex = { col, nrm, spec: spec || TEX.white };
  CHAR.headSkin = skinHeadGeo(CHAR.headGeo); CHAR.headLowSkin = skinHeadGeo(CHAR.headLow); CHAR.shellBase = hairShellBase();
  CHAR.hat = hatGeo(); CHAR.hood = hoodGeo(); CHAR.mask = maskGeo(); CHAR.hair = hairGeo(); CHAR.eyeGeo = eyeballGeo(56, 40); CHAR.eyeGeoLow = eyeballGeo(18, 12); CHAR.dropGeo = new THREE.SphereGeometry(1, 12, 8);
}
// the scan becomes part of the skinned body: head bone above, neck bone below, so the neck bends instead of the head sliding off it
const HEAD_O = new THREE.Vector3(0, 1.578, -0.008), HEAD_S = 0.0555;
function headWeight(x, y, z) { // scan units -> weight of the Head bone
  const yb = HEAD_O.y + y * HEAD_S, zb = HEAD_O.z + z * HEAD_S;
  return clamp(smoothstep(1.508, 1.585, yb) + smoothstep(0.03, 0.065, zb) * smoothstep(1.515, 1.545, yb), 0, 1);
}
function skinHeadGeo(src) {
  const p = src.attributes.position, n = p.count, P = new Float32Array(n * 3), SI = new Uint16Array(n * 4), SW = new Float32Array(n * 4), h = CHAR.boneIdx.Head, k = CHAR.boneIdx.Neck;
  for (let i = 0; i < n; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), w = headWeight(x, y, z);
    P[i * 3] = HEAD_O.x + x * HEAD_S; P[i * 3 + 1] = HEAD_O.y + y * HEAD_S; P[i * 3 + 2] = HEAD_O.z + z * HEAD_S; SI[i * 4] = h; SI[i * 4 + 1] = k; SW[i * 4] = w; SW[i * 4 + 1] = 1 - w; }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(P, 3));
  for (const a of ["normal", "uv", "aOcc"]) if (src.attributes[a]) g.setAttribute(a, src.attributes[a]);
  g.setAttribute("skinIndex", new THREE.BufferAttribute(SI, 4)); g.setAttribute("skinWeight", new THREE.BufferAttribute(SW, 4));
  g.setIndex(src.index); g.computeBoundingSphere(); return g;
}
// vertex-clustering decimation for distant heads
function decimate(geo, cell) {
  const pos = geo.attributes.position, uv = geo.attributes.uv, idx = geo.index.array, map = new Map(), remap = new Int32Array(pos.count).fill(-1), P = [], U = [], C = [];
  for (let t = 0; t < idx.length; t++) { const i = idx[t]; if (remap[i] >= 0) continue;
    const k = Math.floor(pos.getX(i) / cell) + "," + Math.floor(pos.getY(i) / cell) + "," + Math.floor(pos.getZ(i) / cell);
    let c = map.get(k); if (c === undefined) { c = C.length; map.set(k, c); P.push(0, 0, 0); U.push(0, 0); C.push(0); }
    remap[i] = c; P[c * 3] += pos.getX(i); P[c * 3 + 1] += pos.getY(i); P[c * 3 + 2] += pos.getZ(i); U[c * 2] += uv.getX(i); U[c * 2 + 1] += uv.getY(i); C[c]++; }
  for (let c = 0; c < C.length; c++) { P[c * 3] /= C[c]; P[c * 3 + 1] /= C[c]; P[c * 3 + 2] /= C[c]; U[c * 2] /= C[c]; U[c * 2 + 1] /= C[c]; }
  const out = []; for (let t = 0; t < idx.length; t += 3) { const a = remap[idx[t]], b = remap[idx[t + 1]], c = remap[idx[t + 2]]; if (a !== b && b !== c && a !== c) out.push(a, b, c); }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(P, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(U, 2)); g.setIndex(out); g.computeVertexNormals(); return g;
}
function decimateSkinned(geo, cell) {
  const pos = geo.attributes.position, si = geo.attributes.skinIndex, sw = geo.attributes.skinWeight, idx = geo.index.array, map = new Map(), remap = new Int32Array(pos.count).fill(-1), P = [], C = [], rep = [];
  for (let t = 0; t < idx.length; t++) { const i = idx[t]; if (remap[i] >= 0) continue;
    const k = Math.floor(pos.getX(i) / cell) + "," + Math.floor(pos.getY(i) / cell) + "," + Math.floor(pos.getZ(i) / cell);
    let c = map.get(k); if (c === undefined) { c = C.length; map.set(k, c); P.push(0, 0, 0); C.push(0); rep.push(i); }
    remap[i] = c; P[c * 3] += pos.getX(i); P[c * 3 + 1] += pos.getY(i); P[c * 3 + 2] += pos.getZ(i); C[c]++; }
  const n = C.length, SI = new Uint16Array(n * 4), SW = new Float32Array(n * 4);
  for (let c = 0; c < n; c++) { P[c * 3] /= C[c]; P[c * 3 + 1] /= C[c]; P[c * 3 + 2] /= C[c]; const r = rep[c]; SI.set([si.getX(r), si.getY(r), si.getZ(r), si.getW(r)], c * 4); SW.set([sw.getX(r), sw.getY(r), sw.getZ(r), sw.getW(r)], c * 4); }
  const g = new THREE.BufferGeometry(), out = [];
  g.setAttribute("position", new THREE.Float32BufferAttribute(P, 3)); g.setAttribute("skinIndex", new THREE.BufferAttribute(SI, 4)); g.setAttribute("skinWeight", new THREE.BufferAttribute(SW, 4));
  for (const gr of geo.groups) { const st = out.length; for (let t = gr.start; t < gr.start + gr.count; t += 3) { const a = remap[idx[t]], b = remap[idx[t + 1]], c = remap[idx[t + 2]]; if (a !== b && b !== c && a !== c) out.push(a, b, c); } g.addGroup(st, out.length - st, gr.materialIndex); }
  g.setIndex(out); g.computeVertexNormals(); g.computeBoundingSphere(); return g;
}
// ---- headwear (built in head-scan units: head ≈ 3.8 wide, crown at y≈4) ----
function hatGeo() {
  const prof = [[2.2, 0], [2.24, 0.7], [2.17, 1.45], [1.96, 2.0], [1.45, 2.2], [0.6, 2.08], [0.001, 1.98]].map(p => new THREE.Vector2(p[0], p[1]));
  const crown = new THREE.LatheGeometry(prof, 32), p = crown.attributes.position;
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i), y = p.getY(i), z = p.getZ(i); const r = Math.hypot(x, z) || 1, fr = Math.max(0, z / r);
    const pinch = 1 - 0.2 * smoothstep(1.0, 2.1, y) * fr * Math.abs(x / r) * 2; x *= pinch;
    y -= 0.38 * Math.exp(-x * x / 0.3) * smoothstep(1.6, 2.1, y) * (0.6 + 0.4 * (1 - fr));
    p.setXYZ(i, x, y, z * 1.08);
  }
  crown.computeVertexNormals();
  const brim = new THREE.RingGeometry(2.05, 3.75, 48, 4); brim.rotateX(-Math.PI / 2); const b = brim.attributes.position;
  for (let i = 0; i < b.count; i++) { const x = b.getX(i), z = b.getZ(i), r = Math.hypot(x, z), c = Math.abs(x / r), f = Math.max(0, z / r), k = smoothstep(2.4, 3.75, r);
    b.setXYZ(i, x, 0.62 * k * c * c - 0.18 * k * f + 0.02, z * 1.12); }
  brim.computeVertexNormals();
  const band = new THREE.CylinderGeometry(2.25, 2.26, 0.42, 32, 1, true); band.translate(0, 0.22, 0); band.scale(1, 1, 1.08);
  return { crown, brim, band };
}
function hairGeo() { // pinned-up hair with a bun, for the women of the town: the scalp of the scan itself, lifted a little off the skull
  // above a hairline (forehead, temples, over the ears, down to the nape), so it sits close like real hair instead of a cap
  const H = CHAR.headGeo, P = H.attributes.position, N = H.attributes.normal, idx = H.index.array;
  const line = (x, z) => { const a = Math.abs(Math.atan2(x, z)); // 0 = the brow, pi = the nape
    return a < 0.45 ? 3.0 : a < 1.25 ? lerp(3.0, 2.25, smoothstep(0.45, 1.25, a)) : a < 2.05 ? 2.25 : lerp(2.25, 0.95, smoothstep(2.05, 2.75, a)); };
  const pos = [], nrm = [], uv = [], v = new THREE.Vector3(), n = new THREE.Vector3();
  for (let i = 0; i < idx.length; i += 3) {
    let cx = 0, cy = 0, cz = 0; for (let k = 0; k < 3; k++) { const j = idx[i + k]; cx += P.getX(j); cy += P.getY(j); cz += P.getZ(j); }
    cx /= 3; cy /= 3; cz /= 3; if (cy < line(cx, cz) || cy < -0.2) continue;
    for (let k = 0; k < 3; k++) { const j = idx[i + k]; v.set(P.getX(j), P.getY(j), P.getZ(j)); n.set(N.getX(j), N.getY(j), N.getZ(j)).normalize();
      const edge = 0.3 + 0.7 * smoothstep(0, 0.45, v.y - line(v.x, v.z)); // thin at the hairline, so the edge lies on the skin
      const lift = (0.16 + 0.07 * gnoise(v.x * 2.2, v.y * 2.2 + v.z, 1 << 16, 1 << 16, 3) + 0.12 * smoothstep(2.6, 3.9, v.y)) * edge; // fuller on the crown
      v.addScaledVector(n, lift); pos.push(v.x, v.y, v.z); nrm.push(n.x, n.y, n.z); uv.push(Math.atan2(v.x, v.z) / Math.PI * 3, (4.2 - v.y) * 0.9); } }
  const cap = new THREE.BufferGeometry(); cap.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); cap.setAttribute("normal", new THREE.Float32BufferAttribute(nrm, 3)); cap.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  const bun = new THREE.SphereGeometry(1, 18, 12); bun.scale(1.15, 0.9, 0.95); bun.translate(0, 3.25, -2.05); // a high bun at the back of the crown
  const clean = g => { const q = g.index ? g.toNonIndexed() : g; for (const k of Object.keys(q.attributes)) if (!["position", "normal", "uv"].includes(k)) q.deleteAttribute(k); return q; };
  const g = mergeGeos([{ geo: clean(cap) }, { geo: clean(bun) }]); g.clearGroups(); return g;
}
function hoodGeo() {
  const prof = [[4.7, -3.0], [3.9, -2.35], [2.62, -1.55], [2.3, -0.6], [2.25, 0.6], [2.36, 2.0], [2.1, 3.25], [1.4, 4.15], [0.5, 4.5], [0.001, 4.55]].map(p => new THREE.Vector2(p[0], p[1]));
  const g = new THREE.LatheGeometry(prof, 72), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), th = Math.atan2(z, x);
    let n = 1 + 0.03 * gnoise(th * 3, y * 1.5, 1 << 16, 1 << 16, 6);
    n += 0.045 * Math.sin(th * 9 + gnoise(th * 2, y, 1 << 16, 1 << 16, 8) * 3) * smoothstep(-0.9, -2.6, y);          // cape drapes in folds over the shoulders
    n += 0.02 * Math.sin(y * 11 + th * 2) * smoothstep(-0.2, -0.9, y) * smoothstep(-2.0, -1.2, y);                      // cloth bunched around the neck
    n += 0.012 * Math.sin(th * 5 + y * 3) * smoothstep(-0.6, 1.0, y);                                                   // loose over the skull
    p.setXYZ(i, x * n, y, z * n * 1.12 + 0.1); }
  g.computeVertexNormals(); return g;
}
function maskGeo() { // bandana tied over nose and mouth; the point hangs below the chin
  const nu = 48, nv = 22, pos = [], uv = [], idx = [];
  for (let iv = 0; iv <= nv; iv++) for (let iu = 0; iu <= nu; iu++) {
    const y = lerp(1.3, -1.0, iv / nv), a = lerp(-1.9, 1.9, iu / nu);
    const rz = y > 1.15 ? lerp(2.7, 2.5, (y - 1.15) / 0.15) : y > -0.3 ? 2.72 : lerp(2.72, 2.3, (-0.3 - y) / 0.7), rx = y > -0.3 ? 2.02 : lerp(2.02, 1.8, (-0.3 - y) / 0.7);
    const sag = Math.max(0, Math.cos(a)) * (iv / nv) * 0.15;
    // creases: pulled taut over the nose bridge (horizontal), gathering toward the knot at the back (diagonal)
    const crease = 0.035 * Math.sin(y * 9.0 + Math.sin(a * 3.0) * 0.8) * smoothstep(1.2, 0.4, y) * (0.4 + 0.6 * Math.abs(Math.sin(a)));
    const gather = 0.05 * Math.sin(a * 11.0 - y * 4.0) * smoothstep(0.9, 1.6, Math.abs(a));
    const k = 1 + crease + gather;
    pos.push(rx * Math.sin(a) * k, y - sag, (rz * Math.cos(a) * (0.9 + 0.1 * Math.cos(a))) * k - 0.25); uv.push(iu / nu * 2, iv / nv);
  }
  for (let iv = 0; iv < nv; iv++) for (let iu = 0; iu < nu; iu++) { const a = iv * (nu + 1) + iu, b = a + 1, c = a + nu + 2, d = a + nu + 1; idx.push(a, b, d, b, c, d); }
  // the hanging point: a small grid so it can drape and flutter
  const base = pos.length / 3, tu = 12, tv = 8;
  for (let iv = 0; iv <= tv; iv++) for (let iu = 0; iu <= tu; iu++) { const v = iv / tv, w = (1 - v), x = lerp(-1.5, 1.5, iu / tu) * w, y = lerp(-1.0, -2.3, v), z = lerp(2.3, 1.9, v) - 0.04 * Math.cos(x * 1.4) + 0.05 * Math.sin(x * 5.0) * v;
    pos.push(x, y, z); uv.push(0.5 + x / 3.0, 1 + v * 0.6); }
  for (let iv = 0; iv < tv; iv++) for (let iu = 0; iu < tu; iu++) { const a = base + iv * (tu + 1) + iu, b = a + 1, c = a + tu + 2, d = a + tu + 1; idx.push(a, b, d, b, c, d); }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
  return g;
}
// ---- materials ----
function texRep(t, r) { const c = t.clone(); c.repeat.set(r, r); c.needsUpdate = true; return c; }
let FABRIC_FINE, FABRIC_COARSE, LEATHER_T, FELT_T, CARUNCLE, BUTTON_MAT, TEETH_MAT;
function clothMat(color, fine, opts) {
  if (!FABRIC_FINE) { FABRIC_FINE = { map: texRep(TEX.fabric.map, 3), normalMap: texRep(TEX.fabric.normalMap, 3), roughnessMap: texRep(TEX.fabric.orm, 3) }; FABRIC_COARSE = TEX.fabric; }
  const T = fine ? FABRIC_FINE : FABRIC_COARSE;
  return new THREE.MeshStandardMaterial(Object.assign({ color, map: T.map, normalMap: T.normalMap, roughnessMap: T.roughnessMap || T.orm, normalScale: new THREE.Vector2(0.7, 0.7) }, opts || {}));
}
function leatherMat(color, rough = 1) { return new THREE.MeshStandardMaterial({ color, map: TEX.leather.map, normalMap: TEX.leather.normalMap, roughnessMap: TEX.leather.orm, roughness: rough, normalScale: new THREE.Vector2(0.8, 0.8) }); }
// clothing: one material, colour/roughness per part; folds are bump-mapped from bind-space position so they ride with the cloth
const CLOTH_GLSL = `
  float ch3(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
  float cn3(vec3 p) { vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(ch3(i), ch3(i + vec3(1, 0, 0)), f.x), mix(ch3(i + vec3(0, 1, 0)), ch3(i + vec3(1, 1, 0)), f.x), f.y),
               mix(mix(ch3(i + vec3(0, 0, 1)), ch3(i + vec3(1, 0, 1)), f.x), mix(ch3(i + vec3(0, 1, 1)), ch3(i + vec3(1, 1, 1)), f.x), f.y), f.z); }
  float clothFolds(vec3 p, int gp) {
    float ax = abs(p.x), h = 0.0, n = cn3(p * 7.0) * 2.0 - 1.0;
    if (gp == 0 || gp == 2 || gp == 6 || gp == 3) {
      if (ax < 0.2 || gp == 6 || (gp == 2 && p.y < 1.4)) {
        float drape = sin(p.x * 52.0 + n * 3.0 + p.z * 16.0) * mix(0.35, 1.0, smoothstep(1.36, 1.0, p.y));
        float tuck = sin(p.y * 75.0 + n * 3.0) * smoothstep(1.17, 1.06, p.y) * smoothstep(0.98, 1.05, p.y);
        float pull = sin((p.y - ax * 1.3) * 62.0 + n * 2.0) * smoothstep(0.1, 0.17, ax) * smoothstep(1.2, 1.37, p.y) * smoothstep(1.48, 1.41, p.y);
        h = drape * 0.55 + tuck * 0.8 + pull * 0.6;
        if (gp == 3) h *= 0.35; if (gp == 2) h = (sin(p.x * 22.0 + n * 5.0 + p.z * 9.0) * 0.6 + (cn3(p * vec3(9.0, 2.5, 9.0)) - 0.5) * 1.2) * smoothstep(1.3, 0.4, p.y) * 0.7 + pull * 0.4;
      } else {
        float e = exp(-pow((ax - 0.44) / 0.06, 2.0)) + 0.7 * exp(-pow((ax - 0.67) / 0.035, 2.0)) + 0.4 * exp(-pow((ax - 0.2) / 0.04, 2.0));
        h = sin(ax * 95.0 + n * 3.0 + atan(p.z + 0.05, p.y - 1.438) * 2.0) * (0.2 + e);
      }
    } else if (gp == 1) {
      float k = exp(-pow((p.y - 0.53) / 0.06, 2.0)) + 0.9 * exp(-pow((p.y - 0.37) / 0.05, 2.0)) + 0.6 * smoothstep(0.84, 0.96, p.y) * smoothstep(0.14, 0.0, ax);
      h = sin(p.y * 85.0 + n * 3.0 + p.x * 25.0) * (0.22 + k) + 0.45 * sin(p.x * 55.0 + p.z * 45.0 + n * 3.0) * smoothstep(0.75, 0.15, p.y);
    }
    return h;
  }`;
// ---- gunshot wounds, painted in the body's rest-pose space so they ride the skin and clothes however the body moves:
// a dark hole, a stain that soaks outward over a few seconds, and a run of blood below it ----
const WOUND_T = { value: 0 }, WOUND_MAX = 6;
const woundUniforms = () => ({ wound: { value: Array.from({ length: WOUND_MAX }, () => new THREE.Vector4(0, -10, 0, 0)) }, woundN: { value: 0 }, woundT: WOUND_T });
const WOUND_GLSL = `
uniform vec4 wound[6]; uniform float woundN, woundT;
float wHash(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
float wNoise(vec3 p) { vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(wHash(i), wHash(i + vec3(1.0, 0.0, 0.0)), f.x), mix(wHash(i + vec3(0.0, 1.0, 0.0)), wHash(i + vec3(1.0, 1.0, 0.0)), f.x), f.y),
             mix(mix(wHash(i + vec3(0.0, 0.0, 1.0)), wHash(i + vec3(1.0, 0.0, 1.0)), f.x), mix(wHash(i + vec3(0.0, 1.0, 1.0)), wHash(i + vec3(1.0, 1.0, 1.0)), f.x), f.y), f.z); }
vec2 woundAt(vec3 bp) { // x: blood, y: the hole itself
  vec2 r = vec2(0.0);
  for (int k = 0; k < 6; k++) { if (float(k) >= woundN) break;
    vec4 W = wound[k]; vec3 d = bp - W.xyz; float age = max(0.0, woundT - W.w), dl = length(d);
    float n = wNoise(bp * 60.0) * 0.6 + wNoise(bp * 150.0) * 0.4;
    float rad = 0.025 + 0.05 * (1.0 - exp(-age / 0.35)) + 0.08 * (1.0 - exp(-age / 3.5)); // a wet patch at once, soaking out wider
    float stain = smoothstep(rad * (0.7 + 0.6 * n), rad * 0.4, dl);
    float run = 0.0; // three runs of blood down from it, each its own length
    for (int j = 0; j < 3; j++) { float fj = float(j), h = wHash(W.xyz * 7.0 + fj);
      vec2 q = vec2(d.x - (fj - 1.0) * 0.024 - (h - 0.5) * 0.02, d.z);
      float len = (0.04 + 0.34 * (1.0 - exp(-age / (2.0 + fj * 1.5)))) * (0.55 + 0.45 * h);
      run = max(run, smoothstep(0.009 + 0.006 * n, 0.002, length(q)) * step(d.y, 0.0) * smoothstep(-len, -0.004, d.y)); }
    float spk = step(0.82, wNoise(bp * 120.0)) * smoothstep(rad * 2.4, rad * 1.05, dl) * step(0.004, age); // flecks thrown round the hole
    r.x = max(r.x, max(max(stain, run * 0.95), spk * 0.85));
    r.y = max(r.y, smoothstep(0.011, 0.005, dl + (n - 0.5) * 0.004));
  }
  return r;
}
`;
const WOUND_PAINT = `
        vec2 wnd = woundN > 0.5 ? woundAt(WBP) : vec2(0.0);
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.17, 0.014, 0.01), wnd.x * 0.93);
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.035, 0.005, 0.004), wnd.y);`;
function bodyMat(cols, opt = {}) {
  if (!FABRIC_FINE) clothMat(0xffffff, true);
  const m = new THREE.MeshPhysicalMaterial({ map: FABRIC_FINE.map, normalMap: FABRIC_FINE.normalMap, roughnessMap: FABRIC_FINE.roughnessMap, side: THREE.DoubleSide, normalScale: new THREE.Vector2(0.7, 0.7),
    sheen: 0.5, sheenRoughness: 0.75, sheenColor: new THREE.Color(0.32, 0.3, 0.28) });
  const U = { coatD: { value: [0, 1, 2, 3, 4, 5].map(() => new THREE.Vector3()) }, coatA: { value: [2.07, 1.07, 3.17, -0.03, 4.17, 5.25] }, partCol: { value: cols.map(c => new THREE.Color(c)) }, partRough: { value: [0.95, 0.95, 0.92, 0.9, 0.58, 0.62, 0.92, 0.9, 0.55] },
    grime: { value: opt.grime ?? 0.5 }, sweat: { value: 0 }, openV: { value: opt.openV ? 1 : 0 }, ...woundUniforms() }; m.userData.U = U;
  m.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nattribute float aPart; varying float vPart; varying vec3 vBP;" + CLOTH_GLSL).replace("#include <begin_vertex>", `#include <begin_vertex>
      vPart = aPart; vBP = position;
      { int vp = int(aPart + 0.5); float fa = vp == 1 ? 0.004 : vp == 0 ? 0.0045 : vp == 2 ? 0.004 : vp == 6 ? 0.008 : vp == 3 ? 0.0015 : 0.0;
        if (vp == 0 && position.y > 1.44) fa *= smoothstep(1.5, 1.44, position.y);
        transformed += normalize(objectNormal) * clothFolds(position, vp) * fa; }`)
      .replace("#include <skinning_vertex>", `#include <skinning_vertex>
      #ifdef COAT_SIM
        if (int(aPart + 0.5) == 2 && position.y < 1.0) { // duster tails: lag, swing and flap from the spring simulation (Actor.updateCoat)
          float hem = smoothstep(0.98, 0.32, position.y); hem *= hem; float ang = atan(position.z, position.x);
          vec3 off = vec3(0.0); float ws = 0.0;
          for (int k = 0; k < 6; k++) { float w = pow(max(0.0, cos(ang - coatA[k])), 4.0) + 1e-4; off += coatD[k] * w; ws += w; }
          transformed += off / ws * hem;
        }
      #endif`);
    if (opt.coatSim) sh.vertexShader = "#define COAT_SIM\nuniform vec3 coatD[6]; uniform float coatA[6];\n" + sh.vertexShader;
    sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\nvarying float vPart; varying vec3 vBP; uniform vec3 partCol[9]; uniform float partRough[9]; uniform float grime, sweat, openV;" + CLOTH_GLSL + WOUND_GLSL)
      .replace("#include <map_fragment>", `#include <map_fragment>
        int gp = int(vPart + 0.5);
        // the neck above the collar and an open shirt front show skin
        float vth = atan(vBP.z - 0.01, vBP.x), vphi = mix(0.09, 0.8, smoothstep(1.26, 1.47, vBP.y)), vEdge = abs(vth - 1.5708) - vphi;
        vec3 gpc = partCol[0]; float gpr = partRough[0];
        for (int k = 0; k < 9; k++) { if (k == gp) { gpc = partCol[k]; gpr = partRough[k]; } }
        if (gp == 8) diffuseColor.rgb = vec3(1.0);
        diffuseColor.rgb *= gpc;
        float fh = clothFolds(vBP, gp);
        if (gp == 3) { // vest: bound edges and welt pockets
          diffuseColor.rgb *= 1.0 - 0.35 * smoothstep(0.07, 0.03, vEdge) * step(0.0, vBP.z);
          float pk = smoothstep(0.004, 0.0, abs(vBP.y - 1.12)) * smoothstep(0.03, 0.05, abs(vBP.x)) * smoothstep(0.12, 0.1, abs(vBP.x)) * step(0.0, vBP.z);
          diffuseColor.rgb *= 1.0 - 0.5 * pk;
        }
        if (gp == 0) { // shirt: front placket and shoulder/armhole seams
          diffuseColor.rgb *= 1.0 - 0.25 * smoothstep(0.004, 0.0, abs(abs(vBP.x) - 0.013)) * step(0.0, vBP.z) * step(vBP.y, 1.46);
          diffuseColor.rgb *= 1.0 - 0.3 * smoothstep(0.005, 0.0, abs(abs(vBP.x) - 0.185)) * step(1.3, vBP.y);
        }
        diffuseColor.rgb *= 1.0 - 0.42 * max(0.0, -fh) * (gp == 8 ? 0.0 : 1.0);
        // cloth in the armpits and under the arms sees less light
        diffuseColor.rgb *= 1.0 - 0.25 * smoothstep(0.03, 0.0, abs(abs(vBP.x) - 0.17)) * smoothstep(1.2, 1.36, vBP.y) * smoothstep(1.46, 1.38, vBP.y);
        // wear: grime blotches, dusty legs, sweat
        float gn = cn3(vBP * 9.0) * 0.6 + cn3(vBP * 23.0) * 0.4;
        if (gp != 8 && gp != 4) {
          diffuseColor.rgb *= 1.0 - grime * 0.22 * smoothstep(0.45, 0.85, gn);
          float dust = smoothstep(0.55, 0.12, vBP.y) * grime * (0.5 + 0.5 * gn);
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.42, 0.34, 0.26), dust * 0.45);
          float sw = sweat * (smoothstep(0.06, 0.0, abs(abs(vBP.x) - 0.165)) * smoothstep(1.24, 1.32, vBP.y) * smoothstep(1.46, 1.38, vBP.y)
            + smoothstep(0.07, 0.0, abs(vBP.x)) * smoothstep(1.16, 1.3, vBP.y) * step(0.0, vBP.z) + smoothstep(1.43, 1.5, vBP.y)) * (0.6 + 0.4 * gn);
          if (gp == 0) diffuseColor.rgb *= 1.0 - 0.3 * min(sw, 1.0);
        }` + WOUND_PAINT.replace("WBP", "vBP") + `
        `)
      .replace("#include <roughnessmap_fragment>", "#include <roughnessmap_fragment>\nroughnessFactor *= gpr; roughnessFactor = mix(roughnessFactor, 0.28, wnd.x * 0.8);")
      .replace("#include <normal_fragment_maps>", `#include <normal_fragment_maps>
        { float hb = fh * (gp == 1 ? 0.0032 : gp == 3 ? 0.0012 : gp == 8 ? 0.0 : 0.0036);
          vec3 sx = dFdx(-vViewPosition), sy = dFdy(-vViewPosition), r1 = cross(sy, normal), r2 = cross(normal, sx);
          float fd = dot(sx, r1) * faceDirection; vec3 gr = sign(fd) * (dFdx(hb) * r1 + dFdy(hb) * r2);
          normal = normalize(abs(fd) * normal - gr); }`);
  };
  m.customProgramCacheKey = () => "gulchBody";
  return m;
}
// bare hands: the same light-through-skin diffuse as the face, redder knuckles and fingertips, a little grime in the creases
function handMat(color) {
  const m = new THREE.MeshPhysicalMaterial({ color, roughness: 0.58, sheen: 0.3, sheenRoughness: 0.6, sheenColor: new THREE.Color(0.3, 0.24, 0.22), normalMap: TEX.pores, normalScale: new THREE.Vector2(0.35, 0.35) });
  m.onBeforeCompile = sh => {
    sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nvarying vec3 vBP;").replace("#include <begin_vertex>", "#include <begin_vertex>\nvBP = position;");
    sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\nvarying vec3 vBP;")
      .replace("#include <lights_physical_pars_fragment>", "#include <lights_physical_pars_fragment>\n" + SKIN_LIGHT)
      .replace("#include <map_fragment>", `#include <map_fragment>
        float ax = abs(vBP.x), fing = smoothstep(0.77, 0.8, ax), kn = smoothstep(0.012, 0.0, abs(ax - 0.775)) + smoothstep(0.01, 0.0, abs(ax - 0.815)) * fing;
        float n = fract(sin(dot(floor(vBP * 260.0), vec3(12.9898, 78.233, 37.719))) * 43758.5453);
        diffuseColor.rgb *= mix(vec3(1.0), vec3(1.06, 0.88, 0.84), clamp(kn + fing * smoothstep(0.86, 0.9, ax), 0.0, 1.0));
        diffuseColor.rgb *= 0.92 + 0.08 * n;
        skinThin = 0.25 * fing;`)
      .replace("#include <normal_fragment_begin>", "#include <normal_fragment_begin>\nskinGeoN = normal;");
  };
  m.customProgramCacheKey = () => "gulchHand";
  return m;
}
function feltMat(color) { return new THREE.MeshStandardMaterial({ color, map: TEX.felt.map, normalMap: TEX.felt.normalMap, roughness: 0.95, side: THREE.DoubleSide }); }
// ---- eyes: the scan has closed lids, so apertures are cut into them and real eyeballs sit behind ----
// head-scan units; seam = closed-lid crease fitted per eye; u: -1 medial .. +1 lateral
const EYE = { R: 0.235, hw: 0.28, list: [{ cx: -0.72, sg: -1 }, { cx: 0.53, sg: 1 }] };
EYE.list.forEach(e => { e.c = new THREE.Vector3(e.cx, 1.655, 1.635); });
const EYE_GLSL = `
  uniform float eyeOpen; uniform vec3 eyeGaze;
  vec4 eyeAp(vec3 p, float fr) {
    bool rt = p.x < -0.095;
    float cx = rt ? -0.72 : 0.53, sg = rt ? -1.0 : 1.0, c0 = rt ? 1.5966 : 1.6032, cb = rt ? -0.040 : -0.021, ca = rt ? 0.070 : 0.058;
    float u = (p.x - cx) * sg / 0.28, uc = clamp(u, -1.0, 1.0), q = max(1.0 - uc * uc * 1.13, 0.0);
    float gy = clamp(eyeGaze.y / max(eyeGaze.z, 0.5), -0.4, 0.4);
    float dyU = max(0.138 + 0.06 * fr + gy * 0.22, 0.02) * eyeOpen * pow(q, 0.55) * (1.0 - 0.12 * uc);
    float dyL = -max(0.035 + 0.018 * fr - gy * 0.08, 0.01) * eyeOpen * pow(q, 0.7) * (1.0 + 0.15 * uc);
    return vec4(u, p.y - (c0 + cb * uc + ca * uc * uc), dyU, dyL);
  }
  float eyeSurfZ(vec3 p) {
    vec3 ec = p.x < -0.095 ? vec3(-0.72, 1.655, 1.635) : vec3(0.53, 1.655, 1.635);
    vec2 d = p.xy - ec.xy; float rr = 0.055225 - dot(d, d);
    if (rr <= 0.0) return -10.0;
    vec3 dir = vec3(d, sqrt(rr)) / 0.235;
    return ec.z + sqrt(rr) + smoothstep(0.84, 0.93, dot(dir, normalize(eyeGaze))) * 0.022;
  }`;
// face morphs in scan units: brows lift with fear; the jaw drops and the lips part along the fitted lip seam
const MORPH_GLSL = `
  float mSeam(float x) { float u = x + 0.06; return 0.4507 + 0.0105 * u - 0.295 * u * u; }
  float mLip(float x) { float u = (x + 0.06) / 0.4; return pow(max(1.0 - u * u, 0.0), 0.6); }
  vec3 faceMorph(vec3 p, float fr, float jw0) {
    float ax = abs(p.x + 0.07);
    float brow = smoothstep(1.86, 2.04, p.y) * (1.0 - smoothstep(2.3, 2.7, p.y)) * smoothstep(1.2, 1.7, p.z) * (1.0 - smoothstep(0.95, 1.35, ax));
    vec3 o = p; o.y += fr * brow * (0.05 + 0.08 * (1.0 - smoothstep(0.15, 0.9, ax)));
    float lw = mLip(p.x) * smoothstep(1.8, 2.0, p.z);
    float soft = smoothstep(0.62, 0.18, p.y), below = smoothstep(mSeam(p.x) + 0.007, mSeam(p.x) - 0.005, p.y);
    float jw = mix(soft, below, lw) * smoothstep(-0.9, -0.3, p.y) * smoothstep(1.1, 1.9, p.z) * (1.0 - smoothstep(0.55, 1.15, ax));
    o.y -= jw0 * jw * 0.13; o.z -= jw0 * jw * 0.035;
    // a stretched, frightened mouth pulls its corners back
    o.x += fr * sign(p.x + 0.06) * 0.02 * smoothstep(0.5, 0.25, abs(p.y - 0.42)) * smoothstep(0.25, 0.45, abs(p.x + 0.06)) * smoothstep(0.7, 0.45, abs(p.x + 0.06)) * smoothstep(1.7, 2.0, p.z);
    return o;
  }`;
// skin: wrapped, per-channel diffuse (light bleeds red through the skin), spec map, pores, translucent ears, sweat as a clear coat
const SKIN_LIGHT = `
  vec3 skinGeoN = vec3(0.0, 0.0, 1.0); float skinThin = 0.0;
  void RE_Direct_Skin(const in IncidentLight directLight, const in GeometricContext geometry, const in PhysicalMaterial material, inout ReflectedLight reflectedLight) {
    ReflectedLight tmp = ReflectedLight(vec3(0.0), vec3(0.0), vec3(0.0), vec3(0.0));
    RE_Direct_Physical(directLight, geometry, material, tmp);
    reflectedLight.directSpecular += tmp.directSpecular;
    float nd = dot(geometry.normal, directLight.direction), nb = dot(skinGeoN, directLight.direction);
    vec3 nl = vec3(mix(nb, nd, 0.35), mix(nb, nd, 0.75), nd), wrap = vec3(0.3, 0.12, 0.08);
    vec3 dif = clamp((nl + wrap) / (1.0 + wrap), 0.0, 1.0);
    dif *= mix(vec3(1.0), vec3(1.08, 0.86, 0.8), smoothstep(0.35, 0.0, nd) * step(-0.25, nd));
    reflectedLight.directDiffuse += dif * directLight.color * BRDF_Lambert(material.diffuseColor);
    float back = pow(clamp(dot(geometry.viewDir, -directLight.direction), 0.0, 1.0), 3.0) * smoothstep(0.1, -0.3, nd);
    reflectedLight.directDiffuse += back * skinThin * directLight.color * vec3(1.0, 0.3, 0.16) * material.diffuseColor * 0.9;
  }
  #undef RE_Direct
  #define RE_Direct RE_Direct_Skin`;
function skinMat(o) {
  const m = new THREE.MeshPhysicalMaterial({ map: CHAR.headTex.col, normalMap: CHAR.headTex.nrm, roughness: 0.5, color: o.tint || 0xffffff, side: THREE.DoubleSide,
    ior: 1.4, sheen: 0.25, sheenRoughness: 0.6, sheenColor: new THREE.Color(0.3, 0.24, 0.22), clearcoat: 1, clearcoatRoughness: 0.2 });
  const U = { hairCol: { value: new THREE.Color(o.hair || 0x2a1d14) }, hairAmt: { value: o.hairAmt ?? 1 }, stubble: { value: o.stubble ?? 0.35 }, sweat: { value: 0 }, fear: { value: 0 }, jaw: { value: 0 },
    eyeOpen: { value: 1 }, eyeGaze: { value: new THREE.Vector3(0, 0, 1) }, pupil: { value: 0.32 }, skinSpec: { value: CHAR.headTex.spec }, poreMap: { value: TEX.pores }, ...woundUniforms() };
  m.userData.U = U;
  m.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nvarying vec3 vHP; varying float vOcc; varying vec2 vMouth; attribute float aOcc; uniform float fear, jaw;" + EYE_GLSL + MORPH_GLSL).replace("#include <begin_vertex>", `#include <begin_vertex>
      vec3 hp0 = (transformed - vec3(0.0, 1.578, -0.008)) / 0.0555;
      vHP = hp0; vOcc = aOcc; transformed = hp0;
      transformed = faceMorph(hp0, fear, jaw);
      vMouth = vec2((hp0.x + 0.06) / 0.4, transformed.y - mSeam(hp0.x));
      // open lids: tuck the lid margins back onto the eyeball so they wrap it
      if (hp0.z > 1.5) {
        vec4 ap = eyeAp(hp0, fear);
        vec3 ec = hp0.x < -0.095 ? vec3(-0.72, 1.655, 1.635) : vec3(0.53, 1.655, 1.635);
        vec2 dd = hp0.xy - ec.xy; float rr = 0.066 - dot(dd, dd);
        if (abs(ap.x) < 1.35 && rr > 0.0) {
          float aU = ap.y - ap.z, bL = ap.w - ap.y, ez = ec.z + sqrt(rr) - 0.012 + smoothstep(0.84, 0.93, dot(normalize(vec3(dd, sqrt(rr))), normalize(eyeGaze))) * 0.022;
          float w = max(smoothstep(0.17, 0.0, aU) * step(0.0, aU), smoothstep(0.07, 0.0, bL) * step(0.0, bL)) * smoothstep(1.35, 0.9, abs(ap.x)) * smoothstep(0.0, 0.012, rr) * eyeOpen;
          transformed.z = mix(transformed.z, min(transformed.z, ez + 0.02), w);
        }
      }
      transformed = vec3(0.0, 1.578, -0.008) + transformed * 0.0555;`);
    sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\nvarying vec3 vHP; varying float vOcc; varying vec2 vMouth; uniform vec3 hairCol; uniform float hairAmt, stubble, sweat, fear, jaw; uniform sampler2D skinSpec, poreMap;" + EYE_GLSL + MORPH_GLSL + WOUND_GLSL)
      .replace("#include <lights_physical_pars_fragment>", "#include <lights_physical_pars_fragment>\n" + SKIN_LIGHT)
      .replace("#include <clipping_planes_fragment>", `#include <clipping_planes_fragment>
        vec4 eap = eyeAp(vHP, fear);
        bool inEye = vHP.z > 1.5 && abs(eap.x) < 1.0;
        if (inEye && eap.y < eap.z && eap.y > eap.w) discard;
        if (vHP.z > 1.8 && abs(vMouth.x) < 1.0 && jaw > 0.01) {
          float sw = smoothstep(0.62, 0.18, mSeam(vHP.x)) * 0.13 * jaw, lw = mLip(vHP.x) * smoothstep(1.8, 2.0, vHP.z);
          float top = -sw * (1.0 - lw) - 0.001, bot = -(sw * (1.0 - lw) + lw * 0.13 * jaw) + 0.001;
          if (vMouth.y < top && vMouth.y > bot) discard;
        }`)
      .replace("#include <map_fragment>", `#include <map_fragment>
        float hn = fract(sin(dot(floor(vHP.xz * 38.0 + vHP.y * 11.0), vec2(12.9898, 78.233))) * 43758.5453);
        float scalp = smoothstep(2.55, 3.15, vHP.y + 0.35 * smoothstep(0.5, -1.5, vHP.z)) * (1.0 - smoothstep(1.2, 2.3, vHP.z)) * hairAmt;
        diffuseColor.rgb = mix(diffuseColor.rgb, hairCol * (0.75 + 0.5 * hn), scalp);
        float beard = smoothstep(1.05, 0.55, vHP.y) * smoothstep(-1.0, -0.35, vHP.y) * smoothstep(0.2, 1.0, vHP.z);
        diffuseColor.rgb *= 1.0 - beard * stubble * (0.7 + 0.3 * hn);
        if (inEye) { // lash line above, wet pink rim below
          float lash = smoothstep(0.028, 0.004, eap.y - eap.z) * step(eap.z, eap.y) * smoothstep(1.0, 0.65, abs(eap.x)) * eyeOpen;
          float rim = smoothstep(0.016, 0.0, eap.w - eap.y) * step(eap.y, eap.w) * smoothstep(1.0, 0.6, abs(eap.x)) * eyeOpen;
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.05, 0.035, 0.03), lash * 0.8);
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.62, 0.32, 0.28), rim * 0.55);
        }
        // fear flushes the face; ears and nose tip let light through
        diffuseColor.rgb *= mix(vec3(1.0), vec3(0.97, 0.9, 0.9), fear * 0.5);
        float skSpec = texture2D(skinSpec, vUv).r;
        float lips = smoothstep(0.75, 0.35, abs(vHP.x + 0.06)) * smoothstep(0.17, 0.0, abs(vHP.y - 0.42)) * smoothstep(1.95, 2.1, vHP.z);
        skinThin = smoothstep(1.55, 1.85, abs(vHP.x + 0.1)) * smoothstep(0.85, 1.3, vHP.y) * smoothstep(2.45, 2.1, vHP.y) * smoothstep(1.2, 0.4, vHP.z);` + WOUND_PAINT.replace("WBP", "(vHP * 0.0555 + vec3(0.0, 1.578, -0.008))"))
      .replace("#include <normal_fragment_begin>", "#include <normal_fragment_begin>\nskinGeoN = normal;")
      .replace("#include <normal_fragment_maps>", `#include <normal_fragment_maps>
        #if defined(TANGENTSPACE_NORMALMAP) && !defined(USE_TANGENT)
          vec3 pn = texture2D(poreMap, vUv * 21.0).xyz * 2.0 - 1.0;
          pn.xy *= (0.22 + 0.3 * skSpec) * (1.0 - lips * 0.8) * (1.0 - 0.5 * float(inEye));
          normal = perturbNormal2Arb(-vViewPosition, normal, normalize(pn), faceDirection);
        #endif
        { // forehead creases when the brows go up
          float wr = fear * smoothstep(2.12, 2.35, vHP.y) * smoothstep(2.95, 2.6, vHP.y) * smoothstep(1.15, 0.4, abs(vHP.x + 0.1)) * smoothstep(1.4, 1.8, vHP.z);
          float hW = wr * (0.5 + 0.5 * sin(vHP.y * 36.0 + sin(vHP.x * 3.0) * 1.6)) * 0.0007;
          vec3 sx = dFdx(-vViewPosition), sy = dFdy(-vViewPosition), r1 = cross(sy, normal), r2 = cross(normal, sx);
          float fd = dot(sx, r1) * faceDirection; vec3 gr = sign(fd) * (dFdx(hW) * r1 + dFdy(hW) * r2);
          normal = normalize(abs(fd) * normal - gr);
        }`)
      .replace("#include <roughnessmap_fragment>", "#include <roughnessmap_fragment>\nroughnessFactor = mix(mix(0.62, 0.4, skSpec), 0.32, lips * 0.7) * mix(1.0, 0.85, sweat * smoothstep(1.3, 1.9, vHP.y)); roughnessFactor = mix(roughnessFactor, 0.3, wnd.x * 0.7);")
      .replace("#include <lights_physical_fragment>", `#include <lights_physical_fragment>
        material.specularColor *= 0.55 + 0.9 * skSpec;
        #ifdef USE_CLEARCOAT
          material.clearcoat *= sweat * 0.4 * smoothstep(1.3, 1.9, vHP.y) * (1.0 - lips);
        #endif`)
      .replace("#include <aomap_fragment>", `#include <aomap_fragment>
        { float sao = 1.0 - vOcc * 0.85; reflectedLight.indirectDiffuse *= sao; reflectedLight.indirectSpecular *= sao * sao; reflectedLight.directDiffuse *= mix(1.0, sao, 0.4); }`)
      .replace("#include <dithering_fragment>", "#include <dithering_fragment>\nif (!gl_FrontFacing) gl_FragColor.rgb = vec3(0.05, 0.016, 0.013);\ngl_FragColor.a = mix(0.5, 1.0, max(scalp, float(!gl_FrontFacing))); // 0.5 marks living skin for the scattering pass");
  };
  m.customProgramCacheKey = () => "gulchSkin";
  return m;
}
// ---- short hair as stacked shells: buzz-cut scalp + stubble ----
const HAIR_GLSL = `
  float hmScalp(vec3 p) { return smoothstep(2.5, 3.0, p.y + 0.35 * smoothstep(0.5, -1.5, p.z)) * (1.0 - smoothstep(1.25, 2.2, p.z)) * (1.0 - smoothstep(1.62, 1.78, abs(p.x + 0.1)) * smoothstep(2.9, 2.3, p.y)); }
  float hmBeard(vec3 p) {
    float lips = smoothstep(0.62, 0.42, abs(p.x + 0.06)) * smoothstep(0.2, 0.1, abs(p.y - 0.43)) * smoothstep(1.85, 2.0, p.z);
    float nose = smoothstep(0.72, 0.86, p.y) * smoothstep(2.05, 2.2, p.z);
    float ear = smoothstep(1.38, 1.55, abs(p.x + 0.1)) * smoothstep(0.25, 0.55, p.y);
    return smoothstep(1.0, 0.7, p.y) * smoothstep(-1.15, -0.55, p.y) * smoothstep(0.1, 0.9, p.z) * (1.0 - lips) * (1.0 - nose) * (1.0 - ear);
  }`;
const HAIR_MASK = (x, y, z) => { // [scalp, beard] (loose CPU version used to pick triangles)
  const sc = smoothstep(2.4, 3.0, y + 0.35 * smoothstep(0.5, -1.5, z)) * (1 - smoothstep(1.25, 2.3, z));
  const bd = smoothstep(1.1, 0.7, y) * smoothstep(-1.2, -0.5, y) * smoothstep(0.0, 0.9, z);
  return [sc, bd]; };
function hairShellBase() { // triangles of the skinned head that can carry hair
  const g = CHAR.headSkin, src = CHAR.headGeo.attributes.position, idx = g.index.array, n = src.count, L = new Float32Array(n), keep = [], used = new Int32Array(n).fill(-1), order = [];
  for (let i = 0; i < n; i++) { const [sc, bd] = HAIR_MASK(src.getX(i), src.getY(i), src.getZ(i)); L[i] = Math.max(sc, bd); }
  for (let t = 0; t < idx.length; t += 3) if (L[idx[t]] > 0.02 || L[idx[t + 1]] > 0.02 || L[idx[t + 2]] > 0.02) for (let k = 0; k < 3; k++) { const v = idx[t + k]; if (used[v] < 0) { used[v] = order.length; order.push(v); } keep.push(used[v]); }
  return { order, keep };
}
function hairShells(skel, U, n) {
  const { order, keep } = CHAR.shellBase, g = CHAR.headSkin, V = order.length, A = {};
  for (const [k, sz] of [["position", 3], ["normal", 3], ["skinIndex", 4], ["skinWeight", 4]]) { const src = g.attributes[k], a = new src.array.constructor(V * n * sz);
    for (let l = 0; l < n; l++) for (let i = 0; i < V; i++) for (let c = 0; c < sz; c++) a[(l * V + i) * sz + c] = src.array[order[i] * sz + c];
    A[k] = new THREE.BufferAttribute(a, sz); }
  const lay = new Float32Array(V * n); for (let l = 0; l < n; l++) lay.fill((l + 1) / n, l * V, (l + 1) * V);
  const idx = new Uint32Array(keep.length * n); for (let l = 0; l < n; l++) for (let i = 0; i < keep.length; i++) idx[l * keep.length + i] = keep[i] + l * V;
  const geo = new THREE.BufferGeometry(); for (const k in A) geo.setAttribute(k, A[k]); geo.setAttribute("aLayer", new THREE.BufferAttribute(lay, 1)); geo.setIndex(new THREE.BufferAttribute(idx, 1)); geo.computeBoundingSphere();
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.62, alphaToCoverage: true, transparent: false });
  m.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nattribute float aLayer; varying vec3 vHP; varying float vLay; uniform float fear, jaw;" + MORPH_GLSL)
      .replace("#include <begin_vertex>", `#include <begin_vertex>
        vec3 hp = (position - vec3(0.0, 1.578, -0.008)) / 0.0555; vHP = hp; vLay = aLayer;
        hp = faceMorph(hp, fear, jaw);
        float kind = step(2.0, hp.y);
        float hl = mix(0.034, 0.07, kind) * aLayer;
        vec3 comb = normalize(vec3(0.0, -0.35, -1.0)) * kind * 0.6 + vec3(0.0, -0.5, 0.0) * (1.0 - kind) * 0.3;
        hp += normalize(objectNormal) * hl + comb * hl * aLayer;
        transformed = vec3(0.0, 1.578, -0.008) + hp * 0.0555;`);
    sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\nvarying vec3 vHP; varying float vLay; uniform vec3 hairCol; uniform float hairAmt, stubble; float hairA = 1.0;\nfloat shH(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }" + HAIR_GLSL)
      .replace("#include <map_fragment>", `#include <map_fragment>
        float beardM = hmBeard(vHP), scalpM = hmScalp(vHP), isB = step(scalpM, beardM);
        float cs = mix(0.024, 0.019, isB);
        vec3 q = vHP / cs, cell = floor(q), f = fract(q) - 0.5;
        float h1 = shH(cell), h2 = shH(cell + 17.3), h3 = shH(cell + 41.9);
        float m = max(scalpM * hairAmt, beardM * min(1.0, stubble * 1.4));
        m = smoothstep(0.25, 0.7, m + (h3 - 0.5) * 0.5);
        float len = m * (0.6 + 0.4 * h1) * mix(1.0, 0.75, isB);
        vec3 off = vec3(h2, h3, h1) - 0.5; float d = length(f - off * 0.5);
        float rad = mix(0.24, 0.2, isB) * (1.0 - vLay * 0.7);
        float a = smoothstep(rad, rad * 0.5, d) * step(vLay, len);
        if (a < 0.03) discard;
        hairA = a;
        diffuseColor.rgb = hairCol * (0.45 + 0.65 * vLay) * (0.75 + 0.5 * h2);`)
      .replace("#include <roughnessmap_fragment>", "#include <roughnessmap_fragment>\nroughnessFactor = 0.78;")
      .replace("#include <dithering_fragment>", "#include <dithering_fragment>\ngl_FragColor.a = hairA;");
  };
  m.customProgramCacheKey = () => "gulchHair";
  const mesh = new THREE.SkinnedMesh(geo, m); mesh.bind(skel, new THREE.Matrix4()); mesh.frustumCulled = false; mesh.receiveShadow = true; mesh.castShadow = false;
  return mesh;
}
// upper front teeth on the dental arch, just behind the lip seam (scan units)
function teethGeo() {
  const nu = 24, nv = 4, pos = [], uv = [], idx = [], seam = x => { const u = x + 0.06; return 0.4507 + 0.0105 * u - 0.295 * u * u; };
  for (let iv = 0; iv <= nv; iv++) for (let iu = 0; iu <= nu; iu++) { const x = lerp(-0.39, 0.27, iu / nu), u = x + 0.06, y = seam(x) + lerp(-0.035, 0.13, iv / nv);
    pos.push(x, y, 2.207 - 0.08 - 1.25 * u * u - 0.02 * (iv / nv)); uv.push(iu / nu, iv / nv); }
  for (let iv = 0; iv < nv; iv++) for (let iu = 0; iu < nu; iu++) { const a = iv * (nu + 1) + iu, b = a + 1, c = a + nu + 2, d = a + nu + 1; idx.push(a, b, d, b, c, d); }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals(); return g;
}
function teethMat() {
  const c = document.createElement("canvas"); c.width = 256; c.height = 64; const g = c.getContext("2d");
  g.fillStyle = "#2a0d0b"; g.fillRect(0, 0, 256, 64);
  const w = [0.6, 0.75, 0.85, 1.0, 1.0, 0.85, 0.75, 0.6], tot = w.reduce((a, b) => a + b); let x = 0;
  w.forEach((k, i) => { const tw = k / tot * 256, gr = g.createLinearGradient(0, 64, 0, 0); gr.addColorStop(0, "#d9cfb6"); gr.addColorStop(0.7, "#c9b993"); gr.addColorStop(1, "#a88a6a");
    g.fillStyle = gr; g.beginPath(); g.roundRect ? g.roundRect(x + 1.5, 6, tw - 3, 60, [2, 2, 7, 7]) : g.rect(x + 1.5, 6, tw - 3, 60); g.fill(); x += tw; });
  g.fillStyle = "#8a3a36"; g.fillRect(0, 0, 256, 9);
  const t = canvasTex(c); t.flipY = true;
  return new THREE.MeshStandardMaterial({ map: t, roughness: 0.35 });
}
// ---- eyelashes: a curled card strip riding the upper lid margin ----
const LASH_N = 18, EYE_FIT = [{ c0: 1.5966, cb: -0.040, ca: 0.070 }, { c0: 1.6032, cb: -0.021, ca: 0.058 }];
let LASH_MAT = null;
function lashMat() {
  const c = document.createElement("canvas"); c.width = 512; c.height = 64; const g = c.getContext("2d"), r = rng(17);
  g.clearRect(0, 0, 512, 64); g.lineCap = "round";
  for (let i = 0; i < 150; i++) { const x = 6 + r() * 500, len = 30 + r() * 30, bend = 6 + r() * 10, lean = (x - 256) / 256 * 14;
    g.strokeStyle = `rgba(${22 + r() * 18 | 0},${15 + r() * 10 | 0},${10 + r() * 8 | 0},${0.65 + r() * 0.35})`; g.lineWidth = 1.2 + r() * 1.3;
    g.beginPath(); g.moveTo(x, 63); g.quadraticCurveTo(x + lean * 0.5, 63 - len * 0.6, x + lean + bend * 0.3, 63 - len); g.stroke(); }
  const t = canvasTex(c); t.anisotropy = 4;
  return new THREE.MeshStandardMaterial({ map: t, transparent: true, depthWrite: false, side: THREE.DoubleSide, roughness: 0.6, color: 0xffffff, alphaTest: 0.02 });
}
function lashGeo() {
  const g = new THREE.BufferGeometry(), n = (LASH_N + 1) * 3, uv = new Float32Array(n * 2), idx = [];
  for (let r = 0; r < 3; r++) for (let i = 0; i <= LASH_N; i++) { const k = r * (LASH_N + 1) + i; uv[k * 2] = i / LASH_N; uv[k * 2 + 1] = r / 2; }
  for (let r = 0; r < 2; r++) for (let i = 0; i < LASH_N; i++) { const a = r * (LASH_N + 1) + i, b = a + 1, c = a + LASH_N + 2, d = a + LASH_N + 1; idx.push(a, b, d, b, c, d); }
  g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(n * 3), 3)); g.setAttribute("uv", new THREE.BufferAttribute(uv, 2)); g.setIndex(idx); return g;
}
// same lid margin as EYE_GLSL, evaluated on the CPU
function updateLashes(ch, open, fear, gaze) {
  if (!ch.lashes) return; const gy = clamp(gaze.y / Math.max(gaze.z, 0.5), -0.4, 0.4);
  ch.lashes.forEach((m, e) => { const E = EYE.list[e], F = EYE_FIT[e], p = m.geometry.attributes.position;
    for (let i = 0; i <= LASH_N; i++) {
      const u = lerp(-0.86, 0.96, i / LASH_N), q = Math.max(1 - u * u * 1.13, 0), x = E.cx + E.sg * EYE.hw * u, seam = F.c0 + F.cb * u + F.ca * u * u;
      const y = seam + Math.max(0.138 + 0.06 * fear + gy * 0.22, 0.02) * open * Math.pow(q, 0.55) * (1 - 0.12 * u) + 0.006;
      const dx = x - E.c.x, dy = y - E.c.y, rr = 0.066 - dx * dx - dy * dy, z = rr > 0 ? E.c.z + Math.sqrt(rr) - 0.012 + 0.024 : 1.85;
      const len = (0.12 + 0.06 * Math.sin(Math.PI * clamp((u + 0.86) / 1.82, 0, 1))) * (0.4 + 0.6 * open), out = E.sg * u * 0.03;
      p.setXYZ(i, x, y, z);
      p.setXYZ(LASH_N + 1 + i, x + out * 0.5, y + len * 0.18, z + len * 0.62);
      p.setXYZ(2 * (LASH_N + 1) + i, x + out, y + len * 0.62, z + len * 0.82);
    }
    p.needsUpdate = true; m.geometry.computeVertexNormals(); });
}
// eyeball with a corneal bulge (unit radius, looking down +z)
function eyeballGeo(ws, hs) {
  const g = new THREE.SphereGeometry(1, ws, hs); g.rotateX(Math.PI / 2); const p = g.attributes.position, zc = 0.4507, rc = 0.65;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    if (z > 0.86) { const t = z * zc + Math.sqrt(z * z * zc * zc - zc * zc + rc * rc), k = lerp(1, t, smoothstep(0.86, 0.885, z)); p.setXYZ(i, x * k, y * k, z * k); } }
  g.computeVertexNormals(); return g;
}
function eyeMat(iris, U, pre) {
  const m = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.42, clearcoat: 1, clearcoatRoughness: 0.035, envMapIntensity: 1.0 });
  const EU = { irisCol: { value: new THREE.Color(iris) }, eyeLocal: { value: null } };
  m.userData.U = EU;
  m.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, U, EU);
    sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nvarying vec3 vEL, vHE, vVE; uniform mat4 eyeLocal;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvEL = position; vHE = (eyeLocal * vec4(position, 1.0)).xyz;")
      .replace("#include <project_vertex>", "#include <project_vertex>\nvVE = (cameraPosition - (modelMatrix * vec4(transformed, 1.0)).xyz) * mat3(modelMatrix);");
    sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\nvarying vec3 vEL, vHE, vVE; uniform vec3 irisCol; uniform float pupil, fear;" + EYE_GLSL + `
        float eh(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float evn(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(eh(i), eh(i + vec2(1.0, 0.0)), f.x), mix(eh(i + vec2(0.0, 1.0)), eh(i + vec2(1.0, 1.0)), f.x), f.y); }`)
      .replace("#include <map_fragment>", `#include <map_fragment>
        vec3 ep = vEL, V = normalize(vVE);
        // iris seen through the cornea (refraction gives it depth)
        vec3 Nc = normalize(ep - vec3(0.0, 0.0, 0.4507));
        vec3 Rr = refract(-V, Nc, 0.7267);
        float tI = (0.86 - ep.z) / min(Rr.z, -0.1);
        vec2 ip = ep.xy + Rr.xy * max(tI, 0.0);
        float ir = length(ip) / 0.488, ang = atan(ip.y, ip.x), cor = smoothstep(0.865, 0.878, ep.z);
        float pr = pupil;
        float fib = evn(vec2(ang * 9.549, ir * 3.0)) * 0.5 + evn(vec2(ang * 19.1, ir * 8.0 + 3.0)) * 0.33 + evn(vec2(ang * 38.2, ir * 2.0 + 7.0)) * 0.17;
        vec3 inner = irisCol * vec3(1.5, 1.2, 0.72) + vec3(0.07, 0.04, 0.0);
        vec3 ic = mix(inner, irisCol, smoothstep(pr + 0.04, pr + 0.32, ir)) * (0.5 + 0.8 * fib);
        float coll = smoothstep(0.06, 0.0, abs(ir - (pr + 0.16 + 0.04 * evn(vec2(ang * 5.0, 2.0)))));
        ic += coll * 0.18 * irisCol + coll * 0.03;
        ic *= 1.0 - 0.45 * smoothstep(0.6, 0.72, evn(vec2(ang * 11.5, ir * 6.0 + 9.0))) * smoothstep(1.0, 0.45, ir);
        ic *= mix(1.0, 0.3, smoothstep(0.78, 1.0, ir));
        ic = mix(ic, vec3(0.008), smoothstep(pr + 0.015, pr - 0.015, ir));
        // sclera: off-white, pinker and veined toward the corners, dimmer at the limbus
        vec3 scl = vec3(0.76, 0.72, 0.67) * (0.94 + 0.06 * evn(ep.xy * 6.0));
        scl = mix(scl, vec3(0.8, 0.58, 0.52), 0.4 * smoothstep(0.4, 0.95, abs(ep.x)));
        float vein = smoothstep(0.03, 0.0, abs(evn(ep.xy * 7.0 + 4.0) - 0.5)) * smoothstep(0.35, 0.9, abs(ep.x)) * smoothstep(0.86, 0.55, ep.z);
        scl = mix(scl, vec3(0.7, 0.2, 0.17), vein * (0.35 + 0.3 * fear));
        scl *= mix(1.0, 0.8, smoothstep(0.78, 0.87, ep.z));
        vec3 ecol = mix(scl, ic, cor * smoothstep(1.03, 0.99, ir));
        // shadow under the lids and in the corners
        vec4 eap = eyeAp(vHE, fear);
        float eyeAO = mix(0.3, 1.0, smoothstep(0.0, 0.08, eap.z - eap.y)) * mix(0.6, 1.0, smoothstep(0.0, 0.03, eap.y - eap.w)) * mix(0.45, 1.0, smoothstep(1.02, 0.7, abs(eap.x)));
        diffuseColor.rgb = ecol * eyeAO;`)
      .replace("#include <roughnessmap_fragment>", "#include <roughnessmap_fragment>\nroughnessFactor = mix(0.38, 0.6, cor);")
      .replace("#include <aomap_fragment>", `#include <aomap_fragment>
        reflectedLight.indirectSpecular *= eyeAO * eyeAO; reflectedLight.directSpecular *= eyeAO;`)
      .replace("#include <output_fragment>", `#ifdef USE_CLEARCOAT
        clearcoatSpecular *= eyeAO * eyeAO;
        #endif
        #include <output_fragment>`);
  };
  m.customProgramCacheKey = () => "gulchEye" + (pre || "");
  return m;
}
function hoodMat() {
  if (!FABRIC_FINE) clothMat(0xffffff, true);
  const m = new THREE.MeshPhysicalMaterial({ color: 0x1a1816, map: FABRIC_COARSE.map, normalMap: FABRIC_COARSE.normalMap, roughnessMap: FABRIC_COARSE.orm, normalScale: new THREE.Vector2(1.1, 1.1), side: THREE.DoubleSide, roughness: 1,
    sheen: 0.35, sheenRoughness: 0.7, sheenColor: new THREE.Color(0.1, 0.095, 0.09) });
  m.onBeforeCompile = sh => {
    sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nvarying vec3 vHL;").replace("#include <begin_vertex>", "#include <begin_vertex>\nvHL = position;");
    sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\nvarying vec3 vHL;")
      .replace("#include <clipping_planes_fragment>", "#include <clipping_planes_fragment>\nif (vHL.z > 1.2 && length(vec2((abs(vHL.x + 0.095) - 0.625) / 0.36, (vHL.y - 1.67) / 0.19)) < 1.0) discard;");
  };
  return m;
}
// a printed cotton bandana: the jaw works under it while he talks, and the hanging point flutters in the breeze
function bandanaMat(color) {
  if (!FABRIC_FINE) clothMat(0xffffff, true);
  const U = { talk: { value: 0 }, time: { value: 0 }, wind: { value: 0.5 } };
  const m = new THREE.MeshPhysicalMaterial({ color, map: FABRIC_FINE.map, normalMap: FABRIC_FINE.normalMap, roughnessMap: FABRIC_FINE.roughnessMap, normalScale: new THREE.Vector2(0.8, 0.8), side: THREE.DoubleSide,
    sheen: 0.6, sheenRoughness: 0.55, sheenColor: new THREE.Color(0.45, 0.25, 0.22) }); m.userData.U = U;
  m.onBeforeCompile = sh => { Object.assign(sh.uniforms, U);
    sh.vertexShader = "uniform float talk, time, wind;\nvarying vec2 vBU;\n" + sh.vertexShader.replace("#include <begin_vertex>", `#include <begin_vertex>
      vBU = uv;
      float jw = smoothstep(0.1, -1.3, position.y) * talk; transformed.y -= jw * 0.55; transformed.z += jw * 0.14;
      float fl = smoothstep(-1.0, -2.3, position.y); // the point hangs free
      transformed.z += fl * (sin(time * 6.3 + position.x * 1.7) * 0.06 + sin(time * 11.1 + position.x * 3.1) * 0.025) * (0.4 + wind);
      transformed.x += fl * sin(time * 4.7 + position.y * 2.0) * 0.05 * (0.3 + wind);`);
    sh.fragmentShader = "varying vec2 vBU;\n" + sh.fragmentShader.replace("#include <map_fragment>", `#include <map_fragment>
      { vec2 q = vBU * vec2(14.0, 9.0); vec2 c = fract(q) - 0.5; float id = fract(sin(dot(floor(q), vec2(12.9898, 78.233))) * 43758.5453);
        float dotm = smoothstep(0.17, 0.12, length(c + vec2(0.12 * sin(id * 6.28), 0.1 * cos(id * 6.28)))) * step(0.35, id);
        float swirl = smoothstep(0.05, 0.0, abs(length(c - vec2(0.15, -0.1)) - 0.28)) * step(id, 0.35) * smoothstep(-0.1, 0.2, c.x);
        float border = smoothstep(0.035, 0.02, abs(vBU.y - 0.06)) + smoothstep(0.035, 0.02, abs(vBU.y - 1.5));
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.78, 0.72, 0.62), clamp((dotm + swirl * 0.8) * 0.75 + border * 0.6, 0.0, 0.85)); }`);
  };
  m.customProgramCacheKey = () => "gulchBandana"; return m;
}
const HAT_FIT = [0.8, 0.92, 0.85, -0.34, 0.16]; // a townsman's hat: scale x, y, z, drop, forward (scan units)
// a townsman from the crowd drawn in full for a close look (the shootout: scanned-head detail, eyes, lashes, teeth, hands), and back again
function setDetail(ch, hi) {
  if (!ch.spec.lod) return;
  if (!ch.detail) { let surf = null, joints = null; ch.root.traverse(o => { if (o.isSkinnedMesh && o !== ch.body && o !== ch.headMesh) { if (o.name === "Beta_Surface") surf = o; else joints = o; } });
    ch.detail = { surf, joints, lo: { head: ch.headMesh.geometry, surf: surf && surf.geometry, eye: ch.eyes.length ? ch.eyes[0].geometry : null }, hi: null }; }
  const D = ch.detail; if (hi && !D.hi) D.hi = { head: CHAR.headSkin, surf: CHAR.partGeo.surface, eye: CHAR.eyeGeo };
  const g = hi ? D.hi : D.lo; ch.headMesh.geometry = g.head; if (D.surf) D.surf.geometry = g.surf; if (g.eye) for (const e of ch.eyes) e.geometry = g.eye;
  if (D.joints) D.joints.visible = hi; ch.skin.normalMap = hi ? CHAR.headTex.nrm : null; ch.skin.needsUpdate = true;
  if (!ch.spec.mask && !ch.spec.hood) {
    if (hi && !D.lashes) { D.lashes = EYE.list.map(() => { const l = new THREE.Mesh(lashGeo(), LASH_MAT || (LASH_MAT = lashMat())); l.frustumCulled = false; l.renderOrder = 2; ch.head.add(l); return l; });
      D.teeth = new THREE.Mesh(CHAR.teethGeo || (CHAR.teethGeo = teethGeo()), TEETH_MAT || (TEETH_MAT = teethMat())); ch.head.add(D.teeth); }
    if (D.lashes) { for (const l of D.lashes) l.visible = hi; D.teeth.visible = hi; ch.lashes = hi ? D.lashes : null; if (hi) updateLashes(ch, 1, 0, V3(0, 0, 1)); } }
}
// place an object on a bone using a bind-space (T-pose, metres) transform
function attachBone(ch, boneName, obj, pos, scale = 1, euler) {
  const inv = CHAR.boneInv[boneName];
  const desired = new THREE.Matrix4().compose(pos, new THREE.Quaternion().setFromEuler(euler || new THREE.Euler()), V3(scale, scale, scale));
  const local = _m1.copy(inv).multiply(desired); local.decompose(obj.position, obj.quaternion, obj.scale);
  ch.bones[boneName].add(obj); return obj;
}
/* spec: { body:{coat,vest,skirt,kerchief}, shirt, trousers, coat, vest, skirt, kerchief, boots, belt, gloves, bareHands,
           skin:{tint,hair,hairAmt,stubble}, hat:{color, y, tilt} | null, hood, mask } */
function buildCharacter(spec) {
  const root = THREE.SkeletonUtils.clone(CHAR.gltf.scene);
  let surf, joints; root.traverse(o => { if (o.isSkinnedMesh) { if (o.name === "Beta_Surface") surf = o; else joints = o; } });
  const ch = { root, bones: {}, skeleton: surf.skeleton, spec };
  surf.skeleton.bones.forEach(b => ch.bones[b.name.replace("mixamorig", "")] = b);
  const boots = leatherMat(spec.boots || 0x3a2516, 0.9);
  const hands = spec.bareHands ? handMat(spec.bareHands) : leatherMat(spec.gloves || 0x4a3020, 0.85);
  surf.geometry = spec.lod ? CHAR.partGeo.surfaceLow : CHAR.partGeo.surface; surf.material = [hands, boots]; joints.geometry = CHAR.partGeo.joints; joints.material = [hands, boots];
  const sk = new THREE.Color(spec.skin && spec.skin.tint || 0xe8c4ac).multiply(new THREE.Color(0.86, 0.66, 0.56));
  const mats = bodyMat([spec.shirt || 0xb9ad97, spec.trousers || 0x4a4038, spec.coat || 0x5a4330, spec.vest || 0x2c2420, spec.boots || 0x3a2516, spec.belt || 0x2a1a10, spec.skirt || 0x5b3a3a, spec.kerchief || 0x8f2b1d, sk.getHex()],
    { grime: spec.grime ?? 0.45, openV: spec.openCollar, coatSim: !!(spec.body && spec.body.coat && !spec.lod) });
  if (spec.body && spec.body.coat && !spec.lod) { mats.customProgramCacheKey = () => "gulchBodyCoat"; ch.coatU = mats.userData.U.coatD.value; }
  const body = new THREE.SkinnedMesh(buildBodyGeo(spec.body || {}, spec.lod), mats); body.bind(ch.skeleton, new THREE.Matrix4()); root.add(body); ch.body = body;
  if (spec.body && spec.body.vest && !spec.lod) { // vest buttons, shirt buttons below the open collar, a watch chain
    const bm = BUTTON_MAT || (BUTTON_MAT = new THREE.MeshStandardMaterial({ color: 0x3b3128, roughness: 0.45, metalness: 0.2 })), bg = new THREE.CylinderGeometry(0.0065, 0.0065, 0.004, 12); bg.rotateX(Math.PI / 2);
    for (const y of [1.04, 1.095, 1.15, 1.205, 1.258]) { const [hw, hdF, hdB, zc] = sampleKeys(TORSO, y); attachBone(ch, y < 1.19 ? "Spine" : "Spine1", new THREE.Mesh(bg, bm), V3(-0.016, y, zc + hdF + 0.017)); }
    const chain = new THREE.CatmullRomCurve3([V3(-0.02, 1.15, 0.13), V3(0.04, 1.122, 0.132), V3(0.09, 1.135, 0.125)].map(v => { const [, hdF, , zc] = sampleKeys(TORSO, v.y); v.z = zc + hdF + 0.016; return v; }));
    attachBone(ch, "Spine", new THREE.Mesh(new THREE.TubeGeometry(chain, 16, 0.0016, 5, false), MAT.brass), V3(0, 0, 0));
  }
  // scanned head on the head bone
  const sm = skinMat(spec.skin || {}); ch.skin = sm; mats.userData.U.sweat = sm.userData.U.sweat;
  const hm = new THREE.SkinnedMesh(spec.lod ? CHAR.headLowSkin : CHAR.headSkin, sm); hm.bind(ch.skeleton, new THREE.Matrix4()); root.add(hm); ch.headMesh = hm;
  const head = new THREE.Group(); ch.head = head; attachBone(ch, "Head", head, V3(0, 1.578, -0.008), 0.0555); // scan-space anchor for eyes, hats, hoods
  if (spec.lod) { joints.visible = false; sm.normalMap = null; }
  if (spec.shells && R.tier !== "low") root.add(ch.shells = hairShells(ch.skeleton, sm.userData.U, R.tier === "ultra" ? 18 : R.tier === "high" ? 14 : 9));
  ch.eyes = [];
  for (const E of EYE.list) { const em = eyeMat(spec.iris || 0x4a3624, sm.userData.U); const e = new THREE.Mesh(spec.lod ? CHAR.eyeGeoLow : CHAR.eyeGeo, em);
    e.position.copy(E.c); e.scale.setScalar(EYE.R); em.userData.U.eyeLocal.value = e.matrix; head.add(e); ch.eyes.push(e);
    // caruncle: the pink tissue filling the inner corner
    if (spec.hood) continue;
    const car = new THREE.Mesh(CHAR.dropGeo, CARUNCLE || (CARUNCLE = new THREE.MeshPhysicalMaterial({ color: 0x9a5550, roughness: 0.4, clearcoat: 0.8, clearcoatRoughness: 0.1 })));
    car.position.set(E.cx - E.sg * EYE.hw * 0.88, E.sg < 0 ? 1.7 : 1.68, 1.775); car.scale.set(0.04, 0.03, 0.028); head.add(car); }
  if (!spec.lod && !spec.mask) head.add(new THREE.Mesh(CHAR.teethGeo || (CHAR.teethGeo = teethGeo()), TEETH_MAT || (TEETH_MAT = teethMat())));
  if (!spec.lod) { ch.lashes = EYE.list.map(() => { const l = new THREE.Mesh(lashGeo(), LASH_MAT || (LASH_MAT = lashMat())); l.frustumCulled = false; l.renderOrder = 2; head.add(l); return l; }); updateLashes(ch, 1, 0, V3(0, 0, 1)); }
  ch.blink = 3 + Math.random() * 3; ch.sacc = 0.5; ch.gaze = new THREE.Vector3(0, 0, 1); ch.gazeT = new THREE.Vector3(0, 0, 1); ch.jit = new THREE.Vector2();
  if (spec.sweatDrops) { ch.drops = []; const dm = new THREE.MeshPhysicalMaterial({ color: 0xc9b7a6, roughness: 0.02, clearcoat: 1, transparent: true, opacity: 0.32, depthWrite: false });
    for (const [x, y, z] of [[-0.45, 2.38, 2.166], [0.28, 2.5, 2.092], [0.66, 2.22, 1.968], [-0.74, 2.12, 2.074], [0.02, 2.66, 2.086], [-0.2, 2.2, 2.2], [0.45, 2.05, 2.072]]) {
      const d = new THREE.Mesh(CHAR.dropGeo, dm); d.position.set(x, y, z + 0.02); d.scale.setScalar(0.0001); d.userData.base = [x, y, z]; d.userData.ph = Math.random(); head.add(d); ch.drops.push(d); } }
  if (spec.hat) {
    const hat = new THREE.Group(), fm = feltMat(spec.hat.color || 0x6b5236);
    hat.add(new THREE.Mesh(CHAR.hat.crown, fm), new THREE.Mesh(CHAR.hat.brim, fm), new THREE.Mesh(CHAR.hat.band, leatherMat(spec.hat.band || 0x24170f, 0.7)));
    hat.position.set(0, spec.hat.y || 2.95, 0.05); hat.rotation.x = spec.hat.tilt ?? -0.08; head.add(hat); ch.hat = hat;
    if (spec.lod) { hat.scale.set(HAT_FIT[0], HAT_FIT[1], HAT_FIT[2]); hat.position.y += HAT_FIT[3]; hat.position.z = HAT_FIT[4]; } // townsfolk have no hair under the hat: it sits down on the skull
  }
  if (spec.hood) { const h = new THREE.Mesh(CHAR.hood, hoodMat()); head.add(h); ch.hood = h; }
  if (spec.hairStyle) head.add(new THREE.Mesh(CHAR.hair, new THREE.MeshStandardMaterial({ color: spec.skin && spec.skin.hair || 0x3a2614, roughness: 0.5, normalMap: TEX.fabric.normalMap, normalScale: new THREE.Vector2(0.4, 1.2) })));
  if (spec.mask) { const mm = bandanaMat(spec.mask), U = mm.userData.U; ch.maskTalk = U.talk; ch.maskU = U;
    const m = new THREE.Mesh(CHAR.mask, mm); head.add(m); }
  // gun belt and holster
  if (spec.gun) {
    const hol = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.22, 0.05), leatherMat(0x3a2414, 0.7)); attachBone(ch, "RightUpLeg", hol, V3(-0.165, 0.87, 0.0), 1, new THREE.Euler(0, 0, -0.08));
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.09, 0.035), MAT.woodDark); attachBone(ch, "RightUpLeg", grip, V3(-0.17, 1.0, -0.012), 1, new THREE.Euler(0.3, 0, -0.1));
    const cyl = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.05, 8), MAT.iron); attachBone(ch, "RightUpLeg", cyl, V3(-0.165, 0.97, 0.008), 1);
  }
  if (spec.spurs) for (const s of ["Left", "Right"]) { const sp = new THREE.Mesh(new THREE.TorusGeometry(0.022, 0.004, 4, 10), MAT.iron); attachBone(ch, s + "Foot", sp, V3(s === "Left" ? 0.082 : -0.082, 0.05, -0.085), 1, new THREE.Euler(0, Math.PI / 2, 0)); }
  if (spec.marker) { const mk = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.13, 10), new THREE.MeshStandardMaterial({ color: 0x23305e, roughness: 0.4 }));
    attachBone(ch, "RightHand", mk, V3(-0.78, 1.43, -0.01), 1, new THREE.Euler(0.2, 0, Math.PI / 2 + 0.3)); mk.visible = false; ch.marker = mk; }
  if (spec.bound) for (const s of ["Left", "Right"]) { const ring = new THREE.Mesh(new THREE.TorusGeometry(0.043, 0.01, 6, 16), MAT.rope); attachBone(ch, s + "Hand", ring, V3(s === "Left" ? 0.69 : -0.69, 1.438, -0.05), 1, new THREE.Euler(0, Math.PI / 2, 0)); }
  root.traverse(o => { if (o.isMesh) { o.castShadow = o === body || o === hm || (ch.hat && o.parent === ch.hat) || o === ch.hood; o.receiveShadow = true; o.frustumCulled = false; } });
  if (ch.shells) ch.shells.castShadow = false;
  return ch;
}
