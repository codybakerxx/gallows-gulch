// ---------- HORSES up close (the getaway, 12g): a smoother body that still gallops, its animated back measured every frame so a man
// sits on it rather than in it, and the tack: saddle and blanket, a mane and a tail of real hair, reins to the bit ----------
// The model's gallop is 15 morph targets. Everything here is done in the horse's own frame (its group: metres, y up, nose toward +z).
const HORSE = { geo: null, M: null, s: 1, at: {}, crest: [], tailSet: null };

// Loop subdivision of an indexed mesh animated by relative morph targets. Each new vertex is a fixed weighted sum of old ones, so the same
// weights carry every morph target exactly. smooth: 1 = Loop's rules, 0 = a plain midpoint split (no shrinking); in between, a blend.
function subdivideMorph(g, smooth = 0.75) {
  const P = g.attributes.position, n = P.count, idx = g.index.array, nt = idx.length / 3, edges = new Map(), ek = (a, b) => a < b ? a * n + b : b * n + a;
  const nb = Array.from({ length: n }, () => new Set());
  for (let t = 0; t < nt; t++) for (let k = 0; k < 3; k++) { const a = idx[t * 3 + k], b = idx[t * 3 + (k + 1) % 3], c = idx[t * 3 + (k + 2) % 3], key = ek(a, b);
    let e = edges.get(key); if (!e) { e = { a, b, opp: [], id: 0 }; edges.set(key, e); } e.opp.push(c); nb[a].add(b); nb[b].add(a); }
  let id = n; for (const e of edges.values()) e.id = id++;
  const bnd = Array.from({ length: n }, () => []), odd = new Uint8Array(n);
  for (const e of edges.values()) { if (e.opp.length === 1) { bnd[e.a].push(e.b); bnd[e.b].push(e.a); } else if (e.opp.length > 2) odd[e.a] = odd[e.b] = 1; }
  const W = []; // per new vertex: { s: smoothed weights, l: linear weights }, each a list of [old index, weight]
  for (let v = 0; v < n; v++) { const ns = [...nb[v]]; let s;
    if (odd[v] || ns.length < 3 || (bnd[v].length && bnd[v].length !== 2)) s = [[v, 1]];
    else if (bnd[v].length === 2) s = [[v, 0.75], [bnd[v][0], 0.125], [bnd[v][1], 0.125]];
    else { const k = ns.length, beta = k === 3 ? 3 / 16 : 3 / (8 * k); s = [[v, 1 - k * beta], ...ns.map(u => [u, beta])]; }
    W.push({ s, l: [[v, 1]] }); }
  for (const e of edges.values()) W.push({ s: e.opp.length === 2 ? [[e.a, 3 / 8], [e.b, 3 / 8], [e.opp[0], 1 / 8], [e.opp[1], 1 / 8]] : [[e.a, 0.5], [e.b, 0.5]], l: [[e.a, 0.5], [e.b, 0.5]] });
  const N = W.length, apply = (src, it, ms) => { const out = new Float32Array(N * it);
    for (let i = 0; i < N; i++) { const o = i * it; for (const [j, w] of W[i].l) for (let c = 0; c < it; c++) out[o + c] += src[j * it + c] * w * (1 - ms);
      if (ms > 0) for (const [j, w] of W[i].s) for (let c = 0; c < it; c++) out[o + c] += src[j * it + c] * w * ms; }
    return out; };
  const out = new THREE.BufferGeometry();
  for (const nm of Object.keys(g.attributes)) { if (nm === "normal") continue; const a = g.attributes[nm]; out.setAttribute(nm, new THREE.BufferAttribute(apply(a.array, a.itemSize, nm === "position" ? smooth : 0), a.itemSize, a.normalized)); }
  out.morphAttributes.position = (g.morphAttributes.position || []).map(m => new THREE.BufferAttribute(apply(m.array, 3, smooth), 3)); out.morphTargetsRelative = g.morphTargetsRelative;
  const ni = new Uint32Array(nt * 12); let o = 0;
  for (let t = 0; t < nt; t++) { const a = idx[t * 3], b = idx[t * 3 + 1], c = idx[t * 3 + 2], ab = edges.get(ek(a, b)).id, bc = edges.get(ek(b, c)).id, ca = edges.get(ek(c, a)).id;
    ni[o++] = a; ni[o++] = ab; ni[o++] = ca; ni[o++] = ab; ni[o++] = b; ni[o++] = bc; ni[o++] = ca; ni[o++] = bc; ni[o++] = c; ni[o++] = ab; ni[o++] = bc; ni[o++] = ca; }
  out.setIndex(new THREE.BufferAttribute(ni, 1)); out.computeVertexNormals(); return out;
}
// normals for every pose of the gallop (so the shading turns with a swinging leg), as relative morph normals
function morphNormals(g) {
  const P = g.attributes.position.array, base = g.attributes.normal.array, rel = g.morphTargetsRelative, tmp = new THREE.BufferGeometry(), pos = new Float32Array(P.length);
  tmp.setIndex(g.index); tmp.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  g.morphAttributes.normal = g.morphAttributes.position.map(m => { const d = m.array; for (let i = 0; i < P.length; i++) pos[i] = rel ? P[i] + d[i] : d[i];
    tmp.computeVertexNormals(); const nn = tmp.attributes.normal.array, out = new Float32Array(P.length); for (let i = 0; i < P.length; i++) out[i] = rel ? nn[i] - base[i] : nn[i];
    return new THREE.BufferAttribute(out, 3); });
}
// the tail the model came with is a stiff paddle: fold its vertices into the dock (they move with it, and draw nothing), for a hair tail instead
function foldTail(g, M, test, dockI) {
  const P = g.attributes.position, mt = g.morphAttributes.position, v = new THREE.Vector3(); let k = 0;
  for (let i = 0; i < P.count; i++) { v.fromBufferAttribute(P, i).applyMatrix4(M); if (!test(v)) continue; k++;
    P.setXYZ(i, P.getX(dockI), P.getY(dockI), P.getZ(dockI)); for (const m of mt) m.setXYZ(i, m.getX(dockI), m.getY(dockI), m.getZ(dockI)); }
  return k;
}
// a ray against the bind pose, in the horse's frame: { t, f (triangle), w (barycentrics) } or null
function horseRay(ro, rd, P, idx, M) {
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), e1 = new THREE.Vector3(), e2 = new THREE.Vector3(), h = new THREE.Vector3(), s = new THREE.Vector3(), q = new THREE.Vector3(); let best = null;
  for (let f = 0; f < idx.length; f += 3) { a.fromBufferAttribute(P, idx[f]).applyMatrix4(M); b.fromBufferAttribute(P, idx[f + 1]).applyMatrix4(M); c.fromBufferAttribute(P, idx[f + 2]).applyMatrix4(M);
    e1.subVectors(b, a); e2.subVectors(c, a); h.crossVectors(rd, e2); const det = e1.dot(h); if (Math.abs(det) < 1e-9) continue; const inv = 1 / det;
    s.subVectors(ro, a); const u = s.dot(h) * inv; if (u < 0 || u > 1) continue; q.crossVectors(s, e1); const w = rd.dot(q) * inv; if (w < 0 || u + w > 1) continue;
    const t = e2.dot(q) * inv; if (t > 1e-4 && (!best || t < best.t)) best = { t, f, w: [1 - u - w, u, w] }; }
  return best;
}
function prepHorseRig(g, M) { // where things attach, found once on the bind pose
  const P = g.attributes.position, idx = g.index.array, down = V3(0, -1, 0);
  const attach = (ro, rd) => { const r = horseRay(ro, rd, P, idx, M); return r ? { i: [idx[r.f], idx[r.f + 1], idx[r.f + 2]], w: r.w } : null; };
  const A = HORSE.at; A.seat = attach(V3(0, 4, SEAT.z), down); A.fore = attach(V3(0, 4, SEAT.z + 0.45), down); A.rear = attach(V3(0, 4, SEAT.z - 0.5), down);
  A.dock = attach(V3(0, 4, -1.12), down);
  for (const e of [1, -1]) A[e > 0 ? "bitL" : "bitR"] = attach(V3(e * 1.5, 1.47, 1.42), V3(-e, 0, 0)) || attach(V3(e * 1.5, 1.52, 1.38), V3(-e, 0, 0));
  HORSE.crest = []; for (let k = 0; k <= 8; k++) { const z = lerp(0.36, 1.08, k / 8), a = attach(V3(0, 4, z), down); if (a) HORSE.crest.push(a); }
}
// the attached point now, in the horse's frame: its three vertices as the gallop has them this frame
const _ha = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
function horsePt(H, at, out) {
  const g = HORSE.geo, P = g.attributes.position.array, mt = g.morphAttributes.position, inf = H.mesh.morphTargetInfluences; out.set(0, 0, 0);
  for (let k = 0; k < 3; k++) { const i = at.i[k] * 3, v = _ha[k].set(P[i], P[i + 1], P[i + 2]);
    for (let j = 0; j < mt.length; j++) { const w = inf[j]; if (w) { const d = mt[j].array; v.x += d[i] * w; v.y += d[i + 1] * w; v.z += d[i + 2] * w; } }
    out.addScaledVector(v, at.w[k]); }
  return out.applyMatrix4(HORSE.M);
}

// ---- the tack ----
function hairTex(tail) { // strands, ragged at the tips (alpha). The tail's has two ribbons side by side (u 0-0.5, 0.5-1), each thinning to its edges
  const key = tail ? "tailHair" : "hair"; if (TEX[key]) return TEX[key]; const c = document.createElement("canvas"); c.width = 256; c.height = 256; const g = c.getContext("2d"), r = rng(tail ? 37 : 31);
  for (let i = 0; i < (tail ? 300 : 340); i++) { let x = r() * 256; if (tail) { const h = r() < 0.5 ? 0 : 128, e = r() - 0.5; x = h + 64 + e * Math.abs(e) * 2 * 118; }
    const len = (tail ? 120 : 140) + r() * (tail ? 136 : 116), l = 60 + r() * 110 | 0, a = 0.5 + r() * 0.5; g.strokeStyle = `rgba(${l},${l * 0.88 | 0},${l * 0.78 | 0},${a})`; g.lineWidth = 0.7 + r() * 1.6;
    g.beginPath(); g.moveTo(x, 0); g.bezierCurveTo(x + (r() - 0.5) * 10, len * 0.4, x + (r() - 0.5) * 18, len * 0.75, x + (r() - 0.5) * 22, len); g.stroke(); }
  const t = canvasTex(c); t.wrapS = THREE.RepeatWrapping; TEX[key] = t; return t;
}
function blanketTex() { // a Navajo-style saddle blanket: bands and a stepped diamond, worn and dusty
  if (TEX.blanket) return TEX.blanket; const c = document.createElement("canvas"); c.width = 256; c.height = 256; const g = c.getContext("2d"), r = rng(57);
  g.fillStyle = "#7a2a1c"; g.fillRect(0, 0, 256, 256);
  [["#2a1d16", 0, 22], ["#c9b48a", 22, 10], ["#2a1d16", 32, 8], ["#c9b48a", 224, 10], ["#2a1d16", 234, 22], ["#2a1d16", 216, 8]].forEach(([col, y, h]) => { g.fillStyle = col; g.fillRect(0, y, 256, h); });
  g.fillStyle = "#c9b48a"; for (let k = 0; k < 6; k++) { const w = 100 - k * 16; g.fillRect(128 - w / 2, 70 + k * 10, w, 10); g.fillRect(128 - w / 2, 176 - k * 10, w, 10); }
  g.fillStyle = "#2a1d16"; g.fillRect(118, 118, 20, 20);
  for (let i = 0; i < 2600; i++) { g.fillStyle = `rgba(${r() < 0.5 ? "0,0,0" : "210,180,140"},${r() * 0.12})`; g.fillRect(r() * 256, r() * 256, 1 + r() * 3, 1 + r() * 2); }
  TEX.blanket = canvasTex(c); return TEX.blanket;
}
// the saddle, built in its own frame: origin on the horse's back where the seat goes, z forward. A western saddle: blanket, skirts,
// seat with a high cantle, swell and horn, fenders down to wooden stirrups
function saddleGeo() {
  const parts = [];
  const shell = (zs, angle, rx, ry, y0, thick, mat, nz = 10, nu = 16, shape) => { // a curved sheet over the back: z from zs[0] to zs[1], wrapping ±angle
    const g = new THREE.BufferGeometry(), pos = [], uv = [], ix = [];
    for (let j = 0; j <= nz; j++) { const v = j / nz, z = lerp(zs[0], zs[1], v);
      for (let i = 0; i <= nu; i++) { const u = i / nu, a = lerp(-angle, angle, u), k = shape ? shape(u, v) : 1;
        pos.push(Math.sin(a) * rx * k, y0 + ry * (Math.cos(a) - 1) * k + thick, z); uv.push(u, v); } }
    for (let j = 0; j < nz; j++) for (let i = 0; i < nu; i++) { const a = j * (nu + 1) + i, b = a + nu + 1; ix.push(a, a + 1, b, a + 1, b + 1, b); }
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(ix); g.computeVertexNormals(); parts.push({ geo: g, mat }); return g; };
  shell([-0.5, 0.42], 1.22, 0.4, 0.34, 0.0, 0.025, 0);                                  // the blanket
  shell([-0.38, 0.34], 1.0, 0.41, 0.33, 0.0, 0.05, 1, 10, 16, (u, v) => 1 + 0.04 * Math.sin(v * Math.PI));   // the skirts
  // the seat: dished, rising to the cantle behind and the swell in front
  { const g = new THREE.BufferGeometry(), pos = [], uv = [], ix = [], nz = 14, nu = 10;
    for (let j = 0; j <= nz; j++) { const v = j / nz, z = lerp(-0.3, 0.28, v), rise = 0.16 * Math.pow(smoothstep(0.25, 0.0, v), 1.6) + 0.12 * Math.pow(smoothstep(0.72, 1.0, v), 1.5), wv = lerp(0.2, 0.15, v) * (1 - 0.3 * smoothstep(0.75, 1, v));
      for (let i = 0; i <= nu; i++) { const u = i / nu, a = lerp(-1, 1, u); pos.push(a * wv, 0.07 + rise + 0.03 * a * a - 0.02 * (1 - a * a) * Math.sin(v * Math.PI), z); uv.push(u * 0.6, v); } }
    for (let j = 0; j < nz; j++) for (let i = 0; i < nu; i++) { const a = j * (nu + 1) + i, b = a + nu + 1; ix.push(a, a + 1, b, a + 1, b + 1, b); }
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(ix); g.computeVertexNormals(); parts.push({ geo: g, mat: 1 }); }
  { const c = new THREE.TorusGeometry(0.19, 0.028, 6, 18, Math.PI); c.rotateX(-Math.PI / 2 + 0.35); c.scale(1, 1, 0.75); c.translate(0, 0.22, -0.13); parts.push({ geo: c, mat: 1 }); } // the cantle's rolled edge, round the back of the seat
  { const h = new THREE.CylinderGeometry(0.028, 0.036, 0.13, 10); h.translate(0, 0.27, 0.26); parts.push({ geo: h, mat: 1 });                    // the horn
    const cap = new THREE.CylinderGeometry(0.055, 0.05, 0.022, 14); cap.translate(0, 0.34, 0.27); parts.push({ geo: cap, mat: 1 }); }
  for (const e of [-1, 1]) { const f = new THREE.BoxGeometry(0.015, 0.5, 0.16, 1, 4, 1); const p = f.attributes.position;               // fenders
    for (let i = 0; i < p.count; i++) { const y = p.getY(i), t = (0.25 - y) / 0.5; p.setZ(i, p.getZ(i) * (1 + 0.5 * t)); } f.translate(e * 0.37, -0.32, 0.06); f.rotateZ(e * 0.06); parts.push({ geo: f, mat: 1 });
    const st = new THREE.TorusGeometry(0.075, 0.016, 5, 12); st.scale(0.6, 1, 1.4); st.rotateY(Math.PI / 2); st.translate(e * 0.4, -0.62, 0.06); parts.push({ geo: st, mat: 2 }); }  // stirrups
  const clean = parts.map(p => { const g = p.geo.index ? p.geo.toNonIndexed() : p.geo; for (const k of Object.keys(g.attributes)) if (!["position", "normal", "uv"].includes(k)) g.deleteAttribute(k); return { geo: g, mat: p.mat }; });
  return mergeGeos(clean);
}
function tackMats() {
  if (HORSE.mats) return HORSE.mats;
  const leather = new THREE.MeshStandardMaterial({ color: 0x7a4a2a, map: TEX.leather.map, normalMap: TEX.leather.normalMap, roughnessMap: TEX.leather.orm, roughness: 0.75, normalScale: new THREE.Vector2(0.6, 0.6) });
  const blanket = new THREE.MeshStandardMaterial({ map: blanketTex(), normalMap: TEX.fabric.normalMap, roughness: 0.95, side: THREE.DoubleSide });
  const wood = MAT.woodDark, hair = new THREE.MeshStandardMaterial({ color: 0x2a1c12, map: hairTex(), alphaTest: 0.42, side: THREE.DoubleSide, roughness: 0.62 }),
    tail = new THREE.MeshStandardMaterial({ color: 0x2e2016, map: hairTex(true), alphaTest: 0.38, side: THREE.DoubleSide, roughness: 0.62 });
  const strap = new THREE.MeshStandardMaterial({ color: 0x3a2414, roughness: 0.7, map: TEX.leather.map });
  HORSE.mats = { saddle: [blanket, leather, wood], hair, tail, strap }; return HORSE.mats;
}
// put the tack on a horse made by chaseHorse (12g) or the loose one in town: opt.saddle, opt.reins (a function giving the hand point, world)
function horseTack(H, opt = {}) {
  const M = tackMats(); H.tack = { opt, back: { y: 1.65, pitch: 0, y0: null }, pts: {} };
  if (opt.saddle !== false) { if (!HORSE.saddleGeo) HORSE.saddleGeo = saddleGeo(); const s = new THREE.Mesh(HORSE.saddleGeo, M.saddle); s.castShadow = s.receiveShadow = true; s.userData.dyn = true; H.grp.add(s); H.tack.saddle = s; }
  { const n = HORSE.crest.length, g = new THREE.BufferGeometry(), pos = new Float32Array(n * 4 * 3), uv = new Float32Array(n * 4 * 2), ix = [];
    for (let k = 0; k < n; k++) { for (let c = 0; c < 4; c++) { uv[(k * 4 + c) * 2] = k * 0.35 + (c > 1 ? 0.5 : 0); uv[(k * 4 + c) * 2 + 1] = c % 2 ? 0 : 1; } // (v: 1 at the roots, 0 at the ragged tips)
      if (k < n - 1) for (const c of [0, 2]) { const a = k * 4 + c, b = a + 4; ix.push(a, a + 1, b, a + 1, b + 1, b); } }
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3)); g.setAttribute("uv", new THREE.BufferAttribute(uv, 2)); g.setIndex(ix);
    const m = new THREE.Mesh(g, M.hair); m.frustumCulled = false; m.userData.dyn = true; H.grp.add(m); H.tack.mane = m; }
  { const N = 7, g = new THREE.BufferGeometry(), pos = new Float32Array(N * 4 * 3), uv = new Float32Array(N * 4 * 2), ix = [];
    for (let k = 0; k < N; k++) { for (let c = 0; c < 4; c++) { uv[(k * 4 + c) * 2] = c % 2 ? 0.95 : 0.05 + (c > 1 ? 0.5 : 0); uv[(k * 4 + c) * 2 + 1] = 1 - k / (N - 1); } // (two crossed ribbons: u across, v root → tip)
      if (k < N - 1) for (const c of [0, 2]) { const a = k * 4 + c, b = a + 4; ix.push(a, a + 1, b, a + 1, b + 1, b); } }
    for (let k = 0; k < N; k++) { uv[(k * 4) * 2] = 0.05; uv[(k * 4 + 1) * 2] = 0.45; uv[(k * 4 + 2) * 2] = 0.55; uv[(k * 4 + 3) * 2] = 0.95; }
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3)); g.setAttribute("uv", new THREE.BufferAttribute(uv, 2)); g.setIndex(ix);
    const m = new THREE.Mesh(g, M.tail); m.frustumCulled = false; m.userData.dyn = true; R.scene.add(m); m.visible = false; H.tack.tail = m; H.tack.chain = null; }
  if (opt.reins) { const g = new THREE.BufferGeometry(), S = 10, pos = new Float32Array((S + 1) * 2 * 2 * 3), ix = []; // two straps, each a flat ribbon of S segments
    for (let r = 0; r < 2; r++) for (let k = 0; k < S; k++) { const a = (r * (S + 1) + k) * 2, b = a + 2; ix.push(a, a + 1, b, a + 1, b + 1, b); }
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3)); g.setIndex(ix); const m = new THREE.Mesh(g, M.strap); m.frustumCulled = false; m.userData.dyn = true; m.material.side = THREE.DoubleSide; R.scene.add(m); m.visible = false; H.tack.reins = m; }
  return H.tack;
}
function horseTackShow(H, on) { const T = H.tack; if (!T) return; if (T.tail) { T.tail.visible = on; T.chain = null; } if (T.reins) T.reins.visible = on; }
// each frame, after the gallop has moved the horse: measure the back, and set the saddle, the mane, the tail and the reins on it
const _ht = new THREE.Vector3(), _ht2 = new THREE.Vector3(), _ht3 = new THREE.Vector3(), _ht4 = new THREE.Vector3();
function horseTackUpdate(H, dt) {
  const T = H.tack; if (!T || !H.grp.visible) return; const A = HORSE.at, B = T.back;
  if (A.seat) { const s = horsePt(H, A.seat, _ht), f = horsePt(H, A.fore, _ht2), r = horsePt(H, A.rear, _ht3);
    B.y = s.y; B.z = s.z; B.pitch = Math.atan2(f.y - r.y, f.z - r.z); if (B.y0 === null) B.y0 = B.y; B.y0 += (B.y - B.y0) * Math.min(1, dt * 1.5); }
  if (T.saddle) { T.saddle.position.set(0, B.y, SEAT.z); T.saddle.rotation.set(-B.pitch * 0.85, 0, 0); }
  // the mane: hair falling from the crest to the off side, a shorter layer to the near side
  if (T.mane) { const P = T.mane.geometry.attributes.position, n = HORSE.crest.length, c = _ht, nx = _ht2;
    T.ph = (T.ph || 0) + dt * 6;
    for (let k = 0; k < n; k++) { horsePt(H, HORSE.crest[k], c); const t = k / (n - 1), L = lerp(0.17, 0.12, t) * (k === 0 ? 0.6 : 1), sw = 0.015 * Math.sin(T.ph + k * 0.9);
      const j = k * 4; P.setXYZ(j, c.x - 0.02, c.y + 0.03, c.z); P.setXYZ(j + 1, c.x + L * 0.45 + sw, c.y - L * 0.9, c.z - 0.06); // (lying on the off side, close to the neck)
      P.setXYZ(j + 2, c.x - 0.03, c.y + 0.028, c.z); P.setXYZ(j + 3, c.x + L * 0.1 - sw, c.y - L * 0.25, c.z - 0.03); }
    P.needsUpdate = true; T.mane.geometry.computeVertexNormals(); }
  // the tail: hair from the dock, its shape set by the pace (hanging at a walk, streaming back and down at a gallop), swinging with the stride,
  // each point following its place with a little lag
  if (T.tail && T.tail.visible && A.dock) { const dock = horsePt(H, A.dock, _ht), N = 7, seg = 0.135, spd = T.spd = lerp(T.spd ?? 0, H.act.timeScale * 4.4, Math.min(1, dt * 3)), air = clamp(spd / 12, 0, 1);
    const ph = H.act.time / H.act.getClip().duration % 1, flick = Math.sin(ph * TAU * 2) * 0.05 * air, sway = Math.sin(ph * TAU + 1.3) * 0.05 * air;
    if (!T.chain) T.chain = Array.from({ length: N }, () => ({ p: new THREE.Vector3(), l: new THREE.Vector3(), init: true }));
    const ch = T.chain, k8 = Math.min(1, dt * 14), at = _ht2, dir = _ht3;
    at.copy(dock).add(_ht4.set(0, -0.03, -0.05));
    for (let k = 0; k < N; k++) { const u = k / (N - 1);
      if (k) { dir.set(sway * u * 2, lerp(-0.45, -0.95, u) + lerp(0.35, 0.18, u) * air + flick * (1 - u), lerp(-0.9, -0.35, u) - 0.55 * air * (1 - u * 0.4)).normalize(); at.addScaledVector(dir, seg); }
      const q = ch[k]; if (q.init || !k) { q.l.copy(at); q.init = false; } else q.l.lerp(at, k8 * (1 - u * 0.45)); // (the lag is the hair's own, in the horse's frame: going fast doesn't stretch it)
      q.p.copy(q.l); H.grp.localToWorld(q.p); }
    const P = T.tail.geometry.attributes.position, side = _ht4.set(1, 0, 0).transformDirection(H.grp.matrixWorld);
    for (let k = 0; k < N; k++) { const p = ch[k].p, w = lerp(0.04, 0.085, Math.sin(k / (N - 1) * Math.PI * 0.8)), j = k * 4;
      P.setXYZ(j, p.x - side.x * w, p.y - side.y * w, p.z - side.z * w); P.setXYZ(j + 1, p.x + side.x * w, p.y + side.y * w, p.z + side.z * w);
      P.setXYZ(j + 2, p.x, p.y + w * 0.8, p.z); P.setXYZ(j + 3, p.x, p.y - w * 0.8, p.z); }
    P.needsUpdate = true; T.tail.geometry.computeVertexNormals(); T.tail.geometry.computeBoundingSphere(); }
  // the reins: from the hands (or where they'd be) to the bit, sagging a little
  if (T.reins && T.reins.visible && A.bitL && A.bitR) { const hand = T.opt.reins(_ht4), P = T.reins.geometry.attributes.position, S = 10;
    for (let r = 0; r < 2; r++) { const bit = H.grp.localToWorld(horsePt(H, r ? A.bitR : A.bitL, _ht)), sd = _ht2.set(1, 0, 0).transformDirection(H.grp.matrixWorld).multiplyScalar(r ? -0.06 : 0.06); // (the two straps part at the hands)
      const L = hand.distanceTo(bit);
      for (let k = 0; k <= S; k++) { const t = k / S, x = hand.x + (bit.x - hand.x) * t + sd.x * (1 - t), y = hand.y + (bit.y - hand.y) * t - Math.sin(t * Math.PI) * L * 0.06 + sd.y * (1 - t), z = hand.z + (bit.z - hand.z) * t + sd.z * (1 - t);
        const j = (r * (S + 1) + k) * 2; P.setXYZ(j, x, y + 0.009, z); P.setXYZ(j + 1, x, y - 0.009, z); } }
    P.needsUpdate = true; T.reins.geometry.computeVertexNormals(); }
}
