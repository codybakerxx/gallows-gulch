// ---------- HORSES up close (the getaway, 12g): a smoother body that still gallops, its animated back measured every frame so a man
// sits on it rather than in it, and the tack: saddle and blanket, a mane and a tail of real hair, reins to the bit ----------
// The model's gallop is 15 morph targets. Everything here is done in the horse's own frame (its group: metres, y up, nose toward +z).
const HORSE = { geo: null, M: null, s: 1, at: {}, crest: [], tailSet: null };
const HORSE_POLL = [1.95, 1.22, 0.55]; // (v37, a standing horse grazing: where the head meets the neck (y, z, metres), and how much of the neck's bow the head turns back there)

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
  HORSE.crest = []; for (let k = 0; k <= 10; k++) { const z = lerp(0.36, 1.12, k / 10), a = attach(V3(0, 4, z), down); if (a) HORSE.crest.push(a); }
  // where the mane lies: for each point of the crest, points down the off side of the neck (+x) at three depths and the near side at
  // two, each with the surface's normal there (bind pose, the horse's frame). Hair laid through them lies on the neck as it moves
  const bind = at => { const o = V3(0, 0, 0); for (let k = 0; k < 3; k++) o.addScaledVector(V3(P.getX(at.i[k]), P.getY(at.i[k]), P.getZ(at.i[k])), at.w[k]); return o.applyMatrix4(M); };
  const side = (ro, rd, fb) => { const r = horseRay(ro, rd, P, idx, M); if (!r) return { at: fb, n: V3(0, 1, 0) };
    const v = [0, 1, 2].map(k => V3(P.getX(idx[r.f + k]), P.getY(idx[r.f + k]), P.getZ(idx[r.f + k])).applyMatrix4(M)), n = v[1].clone().sub(v[0]).cross(v[2].clone().sub(v[0])).normalize(); if (n.dot(rd) > 0) n.negate();
    return { at: { i: [idx[r.f], idx[r.f + 1], idx[r.f + 2]], w: r.w }, n }; };
  HORSE.maneSide = HORSE.crest.map((a, k) => { const c = bind(a), t = k / Math.max(1, HORSE.crest.length - 1);
    return { off: [0.065, 0.13, 0.2].map(dy => side(V3(1.5, c.y - dy * (1 - 0.25 * t), c.z - 0.02), V3(-1, 0, 0), a)), near: [0.06, 0.13].map(dy => side(V3(-1.5, c.y - dy * (1 - 0.25 * t), c.z - 0.02), V3(1, 0, 0), a)) }; });
}
// the attached point now, in the horse's frame: its three vertices as the gallop has them this frame
const _ha = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
function horsePt(H, at, out) {
  if (H.stand) return horseStandPt(H, at, out); // (a horse that stands, grazes or walks: 12n)
  const g = HORSE.geo, P = g.attributes.position.array, mt = g.morphAttributes.position, inf = H.mesh.morphTargetInfluences; out.set(0, 0, 0);
  for (let k = 0; k < 3; k++) { const i = at.i[k] * 3, v = _ha[k].set(P[i], P[i + 1], P[i + 2]);
    for (let j = 0; j < mt.length; j++) { const w = inf[j]; if (w) { const d = mt[j].array; v.x += d[i] * w; v.y += d[i + 1] * w; v.z += d[i + 2] * w; } }
    out.addScaledVector(v, at.w[k]); }
  return out.applyMatrix4(HORSE.M);
}

// ---- the coat ----
// Which part of the horse each vertex is, from the colours the model was painted with: eye, the ridge under the mane, lower leg, muzzle
// and ear tips (aReg), and the blaze down the face (aAux.x). Taken on the welded mesh, before it's smoothed: each vertex to the
// nearest of the model's colours, so the masks come out of subdivision with soft edges
function horseRegions(g) {
  const C = g.attributes.color, n = g.attributes.position.count, reg = new Float32Array(n * 4), aux = new Float32Array(n * 4);
  const pal = [[0.04, 0.012, 0.009, 0], [0.047, 0.013, 0.009, 1], [0.1, 0.022, 0.01, 2], [0.107, 0.04, 0.036, 3], [0.38, 0.107, 0.04, -1], [0.523, 0.285, 0.147, 4]];
  if (C) for (let i = 0; i < n; i++) { let best = null, bd = 0.02 * 0.02; const r = C.getX(i), gg = C.getY(i), b = C.getZ(i);
    for (const c of pal) { const d = (r - c[0]) ** 2 + (gg - c[1]) ** 2 + (b - c[2]) ** 2; if (d < bd) { bd = d; best = c; } }
    if (best && best[3] >= 0) { if (best[3] < 4) reg[i * 4 + best[3]] = 1; else aux[i * 4] = 1; } }
  g.setAttribute("aReg", new THREE.BufferAttribute(reg, 4)); g.setAttribute("aAux", new THREE.BufferAttribute(aux, 4));
}
// after smoothing and folding (the horse's frame, M): aAux.y, the lowest the vertex ever gets in the gallop (metres: hooves ~0, fetlocks
// ~0.25, knees ~0.5, the belly ~1), which finds the hooves, socks and legs whatever pose they're in; aAux.z, how hollow the surface is
// there (between the neighbours and the normal, over the edge length, smoothed): the seams of the muscles and the creases at the
// elbows and flanks, darkened like light that doesn't reach in
function horseAux(g, M) {
  const P = g.attributes.position, N = g.attributes.normal, mt = g.morphAttributes.position, n = P.count, aux = g.attributes.aAux.array, idx = g.index.array, s = M.elements[5], ty = M.elements[13];
  for (let i = 0; i < n; i++) { let lo = 1e9; const y0 = P.getY(i); for (const m of mt) lo = Math.min(lo, g.morphTargetsRelative ? y0 + m.getY(i) : m.getY(i)); if (!mt.length) lo = y0; aux[i * 4 + 1] = lo * s + ty; }
  const nb = Array.from({ length: n }, () => new Set()); for (let t = 0; t < idx.length; t += 3) for (let k = 0; k < 3; k++) { const a = idx[t + k], b = idx[t + (k + 1) % 3]; nb[a].add(b); nb[b].add(a); }
  let cav = new Float32Array(n); const p = new THREE.Vector3(), q = new THREE.Vector3(), m = new THREE.Vector3();
  for (let i = 0; i < n; i++) { if (!nb[i].size) continue; p.fromBufferAttribute(P, i); m.set(0, 0, 0); let el = 0;
    for (const j of nb[i]) { q.fromBufferAttribute(P, j); m.add(q); el += q.distanceTo(p); } m.divideScalar(nb[i].size).sub(p); el /= nb[i].size;
    cav[i] = el > 1e-9 ? (m.x * N.getX(i) + m.y * N.getY(i) + m.z * N.getZ(i)) / el : 0; }
  for (let it = 0; it < 2; it++) { const c2 = new Float32Array(n); for (let i = 0; i < n; i++) { let a = cav[i], k = 1; for (const j of nb[i]) { a += cav[j]; k++; } c2[i] = a / k; } cav = c2; }
  for (let i = 0; i < n; i++) aux[i * 4 + 2] = cav[i];
  g.attributes.aAux.needsUpdate = true;
}
// The coat, painted in the horse's own frame (it rides with the gallop): the base colour, darker along the back and uneven; hair that lies
// back along the body and down the legs, as fine streaks in colour and in the surface (faded out where they'd be finer than a pixel);
// the points (legs, muzzle, ear tips, the crest under the mane) in their own colour; white socks and blaze; hooves, wet eyes, and the
// hollows darker. Per horse: coat = { points: 0-1, pointCol, blaze: 0-1, dapple: 0-1, socks: [near fore, off fore, near hind, off hind] (m up the leg) }
function horseCoatMat(color, coat) {
  const m = new THREE.MeshPhysicalMaterial({ color, roughness: 0.46, sheen: 0.45, sheenRoughness: 0.4, sheenColor: new THREE.Color(color).multiplyScalar(1.6) });
  m.userData.coat = Object.assign({ points: 1, pointCol: 0x0c0907, blaze: 0, dapple: 0, socks: [0, 0, 0, 0] }, coat);
  m.userData.U = { neck: { value: 0 }, walk: { value: new THREE.Vector4() }, piv: { value: new THREE.Vector4(1, 0.5, 1, -0.8) }, neckP: { value: new THREE.Vector2(1.25, 0.35) } }; // (v37: a standing horse's head down to graze, its legs walking: 12n)
  m.onBeforeCompile = horseCoatCompile; m.customProgramCacheKey = () => "gulchHorse"; return m;
}
function horseCoatCompile(sh) {
  const c = this.userData.coat || {}, S = HORSE.M.elements[5].toFixed(6), TY = HORSE.M.elements[13].toFixed(6);
  sh.uniforms.uCoatA = { value: new THREE.Vector4(c.points ?? 1, c.blaze || 0, c.dapple || 0, 0) }; sh.uniforms.uSocks = { value: new THREE.Vector4(...(c.socks || [0, 0, 0, 0])) };
  sh.uniforms.uPointCol = { value: new THREE.Color(c.pointCol ?? 0x0c0907).convertSRGBToLinear() }; // (as it should look: the coat's own colour is the game's usual, unconverted)
  const HPOLL = `vec2(${HORSE_POLL[0].toFixed(3)}, ${HORSE_POLL[1].toFixed(3)})`, HCOUNTER = HORSE_POLL[2].toFixed(3);
  const U = this.userData.U; sh.uniforms.uNeck = U.neck; sh.uniforms.uWalk = U.walk; sh.uniforms.uPiv = U.piv; sh.uniforms.uNeckP = U.neckP;
  sh.vertexShader = sh.vertexShader.replace("#include <common>", `#include <common>
    attribute vec4 aReg; attribute vec4 aAux; attribute vec4 aLeg; varying vec3 vHp; varying vec4 vReg; varying vec4 vAux;
    uniform float uNeck; uniform vec4 uWalk; uniform vec4 uPiv; uniform vec2 uNeckP; // (v37, a standing horse: aLeg = which leg, how much it swings, how much it lifts, how much it bows with the neck)
    vec2 hRot(vec2 d, float a) { float c = cos(a), s = sin(a); return vec2(d.x * c - d.y * s, d.x * s + d.y * c); }
    float hOff() { return aLeg.x < 0.5 ? 0.0 : aLeg.x < 1.5 ? 0.25 : aLeg.x < 2.5 ? 0.5 : 0.75; }
    float hLegA() { return aLeg.y > 0.0 ? uWalk.y * sin(6.2831853 * (uWalk.x + hOff())) * aLeg.y : 0.0; }
    vec3 hBendP(vec3 q) { vec3 m = q * ${S} + vec3(0.0, ${TY}, 0.0); float a = hLegA();
      if (a != 0.0) { vec2 pv = (aLeg.x == 1.0 || aLeg.x == 3.0) ? uPiv.xy : uPiv.zw; m.yz = pv + hRot(m.yz - pv, a); m.y += max(0.0, cos(6.2831853 * (uWalk.x + hOff()))) * uWalk.z * aLeg.z; }
      if (uNeck != 0.0 && aLeg.w > 0.0) { m.yz = ${HPOLL} + hRot(m.yz - ${HPOLL}, -uNeck * ${HCOUNTER} * aAux.w); m.yz = uNeckP + hRot(m.yz - uNeckP, uNeck * aLeg.w); } // (the head turned back at the poll as the neck goes down, so the muzzle meets the ground)
      return (m - vec3(0.0, ${TY}, 0.0)) / ${S}; }
    vec3 hBendN(vec3 n) { n.yz = hRot(n.yz, hLegA() + uNeck * (aLeg.w - ${HCOUNTER} * aAux.w * step(0.001, aLeg.w))); return n; }`)
    .replace("#include <begin_vertex>", `#include <begin_vertex>\nvHp = position * ${S} + vec3(0.0, ${TY}, 0.0); vReg = aReg; vAux = aAux;`)
    .replace("#include <morphtarget_vertex>", "#include <morphtarget_vertex>\ntransformed = hBendP(transformed);")
    .replace("#include <morphnormal_vertex>", "#include <morphnormal_vertex>\nobjectNormal = hBendN(objectNormal);");
  sh.fragmentShader = sh.fragmentShader.replace("#include <common>", `#include <common>
    uniform vec4 uCoatA; uniform vec4 uSocks; uniform vec3 uPointCol; varying vec3 vHp; varying vec4 vReg; varying vec4 vAux;
    float hh3(vec3 p) { p = fract(p * 0.1031); p += dot(p, p.zyx + 31.32); return fract((p.x + p.y) * p.z); }
    float vn3(vec3 p) { vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
      return mix(mix(mix(hh3(i), hh3(i + vec3(1.0, 0.0, 0.0)), f.x), mix(hh3(i + vec3(0.0, 1.0, 0.0)), hh3(i + vec3(1.0, 1.0, 0.0)), f.x), f.y),
                 mix(mix(hh3(i + vec3(0.0, 0.0, 1.0)), hh3(i + vec3(1.0, 0.0, 1.0)), f.x), mix(hh3(i + vec3(0.0, 1.0, 1.0)), hh3(i + vec3(1.0)), f.x), f.y), f.z); }
    float cell3(vec3 p) { vec3 i = floor(p), f = fract(p); float d = 9.0;
      for (int z = -1; z <= 1; z++) for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) { vec3 o = vec3(float(x), float(y), float(z)), r = o + 0.15 + 0.7 * vec3(hh3(i + o), hh3(i + o + 17.1), hh3(i + o + 31.7)) - f; d = min(d, dot(r, r)); }
      return sqrt(d); }`)
    .replace("#include <map_fragment>", `#include <map_fragment>
      vec3 hp = vHp; float low = vAux.y, cavK = smoothstep(0.015, 0.16, vAux.z), bumpK = smoothstep(-0.02, -0.14, vAux.z);
      float eye = smoothstep(0.3, 0.65, vReg.x), ridge = vReg.y, face = vReg.w;
      float m1 = vn3(hp * 3.1) + 0.5 * vn3(hp * 7.3 + 11.0), top = smoothstep(1.25, 1.75, hp.y) * smoothstep(1.0, 0.7, hp.z); // (uneven; the back)
      vec3 coat = diffuseColor.rgb * (0.86 + 0.18 * m1) * (1.0 - 0.2 * top) * (1.0 + 0.1 * smoothstep(1.15, 0.95, hp.y) * smoothstep(0.75, 0.98, low));
      if (uCoatA.z > 0.0) { float dp = smoothstep(0.3, 0.6, cell3(hp * vec3(10.0, 11.0, 9.0)) + (vn3(hp * 31.0) - 0.5) * 0.22) * smoothstep(0.65, 1.0, low) * smoothstep(1.35, 1.0, hp.z);
        coat = mix(coat, coat * mix(1.14, 0.72, dp), uCoatA.z * smoothstep(0.6, 0.95, low)); }
      float legness = smoothstep(1.0, 0.75, low); // (hair runs down the legs, back along the body; streaks 4 mm by 3 cm)
      vec3 qs = hp * mix(vec3(240.0, 240.0, 34.0), vec3(240.0, 34.0, 240.0), legness);
      float hf = clamp(1.7 - length(fwidth(qs)) * 1.2, 0.0, 1.0), strk = vn3(qs) * 0.65 + vn3(qs * 2.03 + 5.0) * 0.35 - 0.5;
      coat *= 1.0 + strk * 0.26 * hf;
      float pts = max(max(vReg.z, smoothstep(0.52, 0.3, low)), max(ridge, face * 0.9)) * uCoatA.x;
      coat = mix(coat, uPointCol * (0.8 + 0.35 * m1) * (1.0 + strk * 0.3 * hf), pts);
      float nearS = step(0.0, hp.x), fore = step(-0.1, hp.z), sockH = dot(vec4(nearS * fore, (1.0 - nearS) * fore, nearS * (1.0 - fore), (1.0 - nearS) * (1.0 - fore)), uSocks);
      float hoof = smoothstep(0.1, 0.065, low), sock = sockH > 0.01 ? smoothstep(sockH + 0.025, sockH - 0.025, low + (vn3(hp * 38.0) - 0.5) * 0.06) * (1.0 - hoof) : 0.0;
      vec3 white = vec3(0.64, 0.61, 0.56) * (0.94 + 0.08 * m1) * (1.0 + strk * 0.12 * hf);
      coat = mix(coat, white, sock);
      float blaze = smoothstep(0.25, 0.6, vAux.x + (vn3(hp * 30.0) - 0.5) * 0.35) * step(1.0, hp.z) * smoothstep(1.99, 1.92, hp.y) * uCoatA.y; coat = mix(coat, white, blaze); // (from between the eyes down)
      coat = mix(coat, mix(vec3(0.075, 0.062, 0.05), vec3(0.32, 0.27, 0.2), step(0.01, sockH)) * (0.85 + 0.3 * vn3(hp * vec3(60.0, 6.0, 60.0))), hoof); // (hooves: horn, pale under a white sock)
      coat = mix(coat, vec3(0.018, 0.011, 0.009), eye);
      coat *= (1.0 - 0.38 * cavK) * (1.0 + 0.08 * bumpK);
      diffuseColor.rgb = coat;`)
    .replace("#include <roughnessmap_fragment>", `#include <roughnessmap_fragment>
      roughnessFactor = clamp(roughnessFactor * (1.0 - 0.18 * strk * hf) + 0.14 * cavK, 0.0, 1.0); roughnessFactor = mix(roughnessFactor, 0.38, hoof); roughnessFactor = mix(roughnessFactor, 0.06, eye);`)
    .replace("#include <normal_fragment_maps>", `#include <normal_fragment_maps>
      { float hb = strk * hf * 0.0005 * (1.0 - eye) + (vn3(hp * 9.0) - 0.5) * 0.0015;
        vec3 sx = dFdx(-vViewPosition), sy = dFdy(-vViewPosition), r1 = cross(sy, normal), r2 = cross(normal, sx);
        float fd = dot(sx, r1) * faceDirection; vec3 gr = sign(fd) * (dFdx(hb) * r1 + dFdy(hb) * r2); normal = normalize(abs(fd) * normal - gr); }`)
    .replace("#include <lights_fragment_begin>", `#ifdef USE_SHEEN\nmaterial.sheenColor *= 1.0 - max(eye, hoof); material.sheenColor = mix(material.sheenColor, vec3(0.75), sock * 0.4 + blaze * 0.4);\n#endif\n#include <lights_fragment_begin>`);
}

// ---- the tack ----
function hairTex(tail) { // locks of hair: strands that share a sweep and part at the ends, ragged tips (alpha). v: 1 at the roots, 0 at the tips.
  // The tail's has two ribbons side by side (u 0-0.5, 0.5-1), each thinning to its edges
  const key = tail ? "tailHair" : "hair"; if (TEX[key]) return TEX[key]; const S = 512, c = document.createElement("canvas"); c.width = c.height = S; const g = c.getContext("2d"), r = rng(tail ? 37 : 31);
  g.lineCap = "round";
  const lockX = () => { if (!tail) return r() * S; const h = r() < 0.5 ? 0 : S / 2, e = r() - 0.5; return h + S / 4 + e * Math.abs(e) * 2 * (S / 4 - 10); };
  for (let i = 0; i < 260; i++) { const x = lockX(), l = 30 + r() * 50, t = 110 + r() * 60; g.strokeStyle = `rgba(${t | 0},${t * 0.86 | 0},${t * 0.74 | 0},0.9)`; g.lineWidth = 1 + r() * 1.6; // (thick at the roots)
    g.beginPath(); g.moveTo(x, 0); g.lineTo(x + (r() - 0.5) * 6, l); g.stroke(); }
  for (let L = 0; L < (tail ? 80 : 110); L++) { const x0 = lockX(), len = S * (tail ? 0.5 + r() * 0.5 : 0.55 + r() * 0.45), b1 = (r() - 0.5) * 34, b2 = (r() - 0.5) * 60, wid = 5 + r() * 16, tone = 100 + r() * 90, n = 9 + (r() * 12 | 0);
    for (let k = 0; k < n; k++) { const off = (r() - 0.5) * wid, l = len * (0.7 + r() * 0.3), lt = tone + (r() - 0.5) * 50 + (r() < 0.07 ? 50 : 0);
      g.strokeStyle = `rgba(${clamp(lt, 0, 255) | 0},${clamp(lt * 0.86, 0, 255) | 0},${clamp(lt * 0.74, 0, 255) | 0},${0.55 + r() * 0.45})`; g.lineWidth = 0.7 + r() * 1.3;
      g.beginPath(); g.moveTo(x0 + off, 0); g.bezierCurveTo(x0 + off + b1 * 0.3, l * 0.35, x0 + off * 1.3 + b1, l * 0.7, x0 + off * 1.7 + b2, l); g.stroke(); } }
  const t = canvasTex(c); t.wrapS = THREE.RepeatWrapping; TEX[key] = t; return t;
}
// a lock of mane: four of them side by side (u 0-0.25, ...), each strands gathered at the root (v 1) and parting toward ragged tips (v 0),
// thinning out to nothing at its sides so a narrow strip of it has no hard edge
function lockTex() {
  if (TEX.lock) return TEX.lock; const S = 512, c = document.createElement("canvas"); c.width = c.height = S; const g = c.getContext("2d"), r = rng(41); g.lineCap = "round";
  for (let L = 0; L < 4; L++) { const x0 = L * 128 + 64, sweep = (r() - 0.5) * 30;
    for (let k = 0; k < 170; k++) { const e = r() - 0.5, xr = x0 + e * 64 * (0.35 + 0.65 * r()), len = S * (0.5 + 0.5 * Math.pow(r(), 0.55)), xt = xr + e * 26 + sweep + (r() - 0.5) * 18;
      const lt = 95 + r() * 95 + (r() < 0.06 ? 45 : 0); g.strokeStyle = `rgba(${Math.min(255, lt) | 0},${Math.min(255, lt * 0.87) | 0},${Math.min(255, lt * 0.76) | 0},${0.5 + 0.5 * r()})`; g.lineWidth = 0.8 + r() * 1.5;
      g.beginPath(); g.moveTo(xr, 0); g.bezierCurveTo(xr + sweep * 0.2, len * 0.35, xt - sweep * 0.3, len * 0.7, xt, len); g.stroke(); } }
  const t = canvasTex(c); TEX.lock = t; return t;
}
// hair: alpha kept up as it's mipped down (thin strands otherwise vanish at a distance), and a highlight that runs across the strands
// (Kajiya-Kay), along aDir: the way the hair lies
function hairMat(color, tex) {
  const m = new THREE.MeshPhysicalMaterial({ color, map: tex, alphaTest: 0.4, side: THREE.DoubleSide, roughness: 0.6, specularIntensity: 0.3, envMapIntensity: 0.5 });
  m.onBeforeCompile = sh => {
    sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nattribute vec3 aDir; varying vec3 vDirV;").replace("#include <begin_vertex>", "#include <begin_vertex>\nvDirV = normalize(mat3(modelViewMatrix) * aDir);");
    sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\nvarying vec3 vDirV;")
      .replace("#include <map_fragment>", `#include <map_fragment>
        { vec2 tu = vUv * 512.0; float md = max(dot(dFdx(tu), dFdx(tu)), dot(dFdy(tu), dFdy(tu))); diffuseColor.a *= 1.0 + 0.28 * max(0.0, 0.5 * log2(md)); }`)
      .replace("#include <output_fragment>", `
        #if NUM_DIR_LIGHTS > 0
        { vec3 T = normalize(vDirV), Vv = normalize(vViewPosition);
          for (int i = 0; i < NUM_DIR_LIGHTS; i++) { vec3 Hh = normalize(directionalLights[i].direction + Vv); float th = dot(T, Hh), sn = sqrt(max(0.0, 1.0 - th * th));
            float th2 = dot(T, normalize(Hh + T * 0.25)), sn2 = sqrt(max(0.0, 1.0 - th2 * th2));
            outgoingLight += directionalLights[i].color * (pow(sn, 80.0) * 0.015 + pow(sn2, 16.0) * 0.3 * diffuseColor.rgb) * max(0.0, dot(normal, directionalLights[i].direction) * 0.5 + 0.5); } }
        #endif
        #include <output_fragment>`); };
  m.customProgramCacheKey = () => "gulchHair"; return m;
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
  const wood = MAT.woodDark, hair = hairMat(0x2a1c12, lockTex()), sheet = hairMat(0x2a1c12, hairTex()), tail = hairMat(0x2e2016, hairTex(true));
  const strap = new THREE.MeshStandardMaterial({ color: 0x3a2414, roughness: 0.7, map: TEX.leather.map });
  HORSE.mats = { saddle: [blanket, leather, wood], hair, sheet, tail, strap }; return HORSE.mats;
}
// put the tack on a horse made by chaseHorse (12g) or the loose one in town: opt.saddle, opt.reins (a function giving the hand point, world)
function horseTack(H, opt = {}) {
  const M = Object.assign({}, tackMats()); H.tack = { opt, back: { y: 1.65, pitch: 0, y0: null }, pts: {} };
  if (opt.hair !== undefined) { const hm = HORSE.hairMats || (HORSE.hairMats = {}), k = opt.hair; if (!hm[k]) hm[k] = { hair: hairMat(k, lockTex()), sheet: hairMat(k, hairTex()), tail: hairMat(k, hairTex(true)) }; M.hair = hm[k].hair; M.sheet = hm[k].sheet; M.tail = hm[k].tail; } // (the mane and tail in the horse's own colour)
  if (opt.saddle !== false) { if (!HORSE.saddleGeo) HORSE.saddleGeo = saddleGeo(); const s = new THREE.Mesh(HORSE.saddleGeo, M.saddle); s.castShadow = s.receiveShadow = true; s.userData.dyn = true; H.grp.add(s); H.tack.saddle = s; }
  { // the mane: a sheet of hair lying down the off side of the neck from the crest, and over it locks of hair, narrow strips laid the same
    // way, some longer and lifting in the gallop (lay() can lay locks to the near side too)
    const n = HORSE.crest.length, r = rng(71), locks = [], add = (side, cnt, len, lay, w) => { for (let i = 0; i < cnt; i++) locks.push({ f: clamp((i + 0.15 + r() * 0.7) / cnt, 0, 1), side, len: len * (0.8 + r() * 0.4), lay, w: w * (0.7 + r() * 0.6), u0: (r() * 4 | 0) * 0.25, tw: (r() - 0.5) * 0.6, ph: r() * TAU, off: r() }); };
    add(1, 44, 1, 0, 0.034); add(1, 22, 1.25, 1, 0.038); // (all of it falls to the off side: locks across the near side read as stripes from the saddle)
    const NL = locks.length, NV = NL * 10, g = new THREE.BufferGeometry(), pos = new Float32Array(NV * 3), uv = new Float32Array(NV * 2), dir = new Float32Array(NV * 3), ix = [];
    locks.forEach((L, i) => { for (let j = 0; j < 5; j++) { const a = i * 10 + j * 2; uv[a * 2] = L.u0 + 0.025; uv[a * 2 + 2] = L.u0 + 0.225; uv[a * 2 + 1] = uv[a * 2 + 3] = 1 - j / 4; if (j < 4) ix.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } });
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3)); g.setAttribute("uv", new THREE.BufferAttribute(uv, 2)); g.setAttribute("aDir", new THREE.BufferAttribute(dir, 3)); g.setIndex(ix);
    g.setAttribute("normal", new THREE.BufferAttribute(new Float32Array(NV * 3).fill(0.577), 3)); // (set as the hair is laid: the neck's own normal under it, so it shades like the neck it lies on)
    const m = new THREE.Mesh(g, M.hair); m.frustumCulled = false; m.userData.dyn = true; m.castShadow = true; H.grp.add(m); H.tack.mane = m; H.tack.locks = locks;
    const g2 = new THREE.BufferGeometry(), NB = n * 5, p2 = new Float32Array(NB * 3), u2 = new Float32Array(NB * 2), d2 = new Float32Array(NB * 3), i2 = []; // (the sheet: five rows per crest point)
    for (let k = 0; k < n; k++) for (let j = 0; j < 5; j++) { const a = k * 5 + j; u2[a * 2] = k * 0.27; u2[a * 2 + 1] = 1 - j / 4; if (k < n - 1 && j < 4) i2.push(a, a + 5, a + 1, a + 1, a + 5, a + 6); }
    g2.setAttribute("position", new THREE.BufferAttribute(p2, 3)); g2.setAttribute("uv", new THREE.BufferAttribute(u2, 2)); g2.setAttribute("aDir", new THREE.BufferAttribute(d2, 3)); g2.setIndex(i2); g2.setAttribute("normal", new THREE.BufferAttribute(new Float32Array(NB * 3).fill(0.577), 3));
    const m2 = new THREE.Mesh(g2, M.sheet); m2.frustumCulled = false; m2.userData.dyn = true; m2.castShadow = true; H.grp.add(m2); H.tack.sheet = m2;
    H.tack.cp = HORSE.crest.map(() => ({ c: new THREE.Vector3(), off: [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()], near: [new THREE.Vector3(), new THREE.Vector3()] })); }
  { // the tail: a chain of points from the dock; round each, three ribbons at 60° to each other, so it's full from any side
    const N = 8, g = new THREE.BufferGeometry(), pos = new Float32Array(N * 6 * 3), uv = new Float32Array(N * 6 * 2), dir = new Float32Array(N * 6 * 3), ix = [];
    for (let k = 0; k < N; k++) for (let rb = 0; rb < 3; rb++) { const a = k * 6 + rb * 2, u0 = rb === 1 ? 0.55 : 0.05, v = 1 - k / (N - 1); uv[a * 2] = u0; uv[a * 2 + 1] = v; uv[a * 2 + 2] = u0 + 0.4; uv[a * 2 + 3] = v;
      if (k < N - 1) { const b = a + 6; ix.push(a, a + 1, b, a + 1, b + 1, b); } }
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3)); g.setAttribute("uv", new THREE.BufferAttribute(uv, 2)); g.setAttribute("aDir", new THREE.BufferAttribute(dir, 3)); g.setIndex(ix);
    const m = new THREE.Mesh(g, M.tail); m.frustumCulled = false; m.userData.dyn = true; m.castShadow = true; R.scene.add(m); m.visible = false; H.tack.tail = m; H.tack.chain = null; }
  if (opt.reins) { const g = new THREE.BufferGeometry(), S = 10, pos = new Float32Array((S + 1) * 2 * 2 * 3), ix = []; // two straps, each a flat ribbon of S segments
    for (let r = 0; r < 2; r++) for (let k = 0; k < S; k++) { const a = (r * (S + 1) + k) * 2, b = a + 2; ix.push(a, a + 1, b, a + 1, b + 1, b); }
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3)); g.setIndex(ix); const m = new THREE.Mesh(g, M.strap); m.frustumCulled = false; m.userData.dyn = true; m.material.side = THREE.DoubleSide; R.scene.add(m); m.visible = false; H.tack.reins = m; }
  return H.tack;
}
function horseTackShow(H, on) { const T = H.tack; if (!T) return; if (T.tail) { T.tail.visible = on; T.chain = null; } if (T.reins) T.reins.visible = on; }
// each frame, after the gallop has moved the horse: measure the back, and set the saddle, the mane, the tail and the reins on it
const _ht = new THREE.Vector3(), _ht2 = new THREE.Vector3(), _ht3 = new THREE.Vector3(), _ht4 = new THREE.Vector3(), _ht5 = new THREE.Vector3(), _ht6 = new THREE.Vector3(), _ht7 = new THREE.Vector3(), _ht8 = new THREE.Vector3(), _ht9 = new THREE.Vector3(), _ht10 = new THREE.Vector3();
function horseTackUpdate(H, dt) {
  const T = H.tack; if (!T || !H.grp.visible) return; const A = HORSE.at, B = T.back;
  if (A.seat) { const s = horsePt(H, A.seat, _ht), f = horsePt(H, A.fore, _ht2), r = horsePt(H, A.rear, _ht3);
    B.y = s.y; B.z = s.z; B.pitch = Math.atan2(f.y - r.y, f.z - r.z); if (B.y0 === null) B.y0 = B.y; B.y0 += (B.y - B.y0) * Math.min(1, dt * 1.5); }
  if (T.saddle) { T.saddle.position.set(0, B.y, SEAT.z); T.saddle.rotation.set(-B.pitch * 0.85, 0, 0); }
  // the mane: the sheet and each lock laid through the points down the neck (just off the surface), past the last to hang free; in the
  // gallop the outer locks lift off the neck and the ends flick with the stride
  if (T.mane) { const P = T.mane.geometry.attributes.position, D = T.mane.geometry.attributes.aDir, n = HORSE.crest.length, c = _ht, tip = _ht2, d = _ht3;
    const ph = H.act.time / H.act.getClip().duration % 1, spd = clamp(H.act.timeScale * 4.4 / 12, 0, 1), cp = T.cp, MS = HORSE.maneSide;
    for (let k = 0; k < n; k++) { const q = cp[k]; horsePt(H, HORSE.crest[k], q.c); q.c.y += 0.012; for (let j = 0; j < 3; j++) horsePt(H, MS[k].off[j].at, q.off[j]); for (let j = 0; j < 2; j++) horsePt(H, MS[k].near[j].at, q.near[j]); }
    // rows of a strand at crest fraction f on a side: the crest, the points down the neck lifted off it by `up` (more toward the end), and the free end
    const rows = T.rows || (T.rows = Array.from({ length: 5 }, () => new THREE.Vector3())), rn = T.rn || (T.rn = Array.from({ length: 5 }, () => new THREE.Vector3())), nrm = _ht4;
    const lay = (f, side, up, lift, len, sw) => { const kf = f * (n - 1), k0 = Math.min(n - 2, kf | 0), a = kf - k0, A0 = cp[k0], A1 = cp[k0 + 1], S0 = MS[k0], S1 = MS[k0 + 1];
      rows[0].lerpVectors(A0.c, A1.c, a); const pts = side > 0 ? 3 : 2;
      for (let j = 0; j < pts; j++) { const t = (j + 1) / (pts + 1), P0 = side > 0 ? A0.off[j] : A0.near[j], P1 = side > 0 ? A1.off[j] : A1.near[j];
        nrm.lerpVectors(side > 0 ? S0.off[j].n : S0.near[j].n, side > 0 ? S1.off[j].n : S1.near[j].n, a).normalize();
        rows[j + 1].lerpVectors(P0, P1, a).addScaledVector(nrm, up * (0.6 + 0.6 * t) + lift * t * t * 0.12); rows[j + 1].z -= lift * t * 0.04 - sw * t; rn[j + 1].copy(nrm); }
      rn[0].copy(rn[1]).add(V_UP).normalize(); rn[4].copy(nrm); if (pts === 2) rn[3].copy(nrm);
      const last = rows[pts], prv = rows[pts - 1]; // (the free end: on past the last point, falling away from the neck)
      rows[4].copy(last).sub(prv).multiplyScalar(len * 1.6).add(last).addScaledVector(nrm, up * 0.8 + lift * 0.15); if (pts === 2) rows[3].lerpVectors(rows[2], rows[4], 0.5); };
    { const P2 = T.sheet.geometry.attributes.position, D2 = T.sheet.geometry.attributes.aDir, N2 = T.sheet.geometry.attributes.normal; // (the sheet)
      for (let k = 0; k < n; k++) { lay(k / (n - 1), 1, 0.008, spd * 0.06, (k === 0 ? 0.3 : 0.7), 0);
        for (let j = 0; j < 5; j++) { P2.setXYZ(k * 5 + j, rows[j].x, rows[j].y, rows[j].z); N2.setXYZ(k * 5 + j, rn[j].x, rn[j].y, rn[j].z); d.subVectors(rows[Math.min(4, j + 1)], rows[Math.max(0, j - (j === 4 ? 1 : 0))]).normalize(); D2.setXYZ(k * 5 + j, d.x, d.y, d.z); } }
      P2.needsUpdate = true; D2.needsUpdate = true; N2.needsUpdate = true; }
    const w = _ht5, q = _ht6, along = _ht7, NN = T.mane.geometry.attributes.normal;
    T.locks.forEach((L, i) => { const lift = spd * (L.lay ? 0.42 : 0.16) * (0.7 + 0.6 * Math.sin(ph * TAU * 2 - L.f * 4 + L.ph)), sw = 0.02 * spd * Math.sin(ph * TAU + L.ph);
      lay(L.f, L.side, 0.016 + L.lay * 0.012 + L.off * 0.01, lift, L.len * (L.side > 0 ? 0.75 : 0.5), sw);
      const kf = L.f * (n - 1), k0 = Math.min(n - 2, kf | 0); along.subVectors(cp[k0 + 1].c, cp[k0].c).normalize();
      for (let j = 0; j < 5; j++) { const k = i * 10 + j * 2, wt = (1 - 0.35 * j / 4) * L.w * 0.5; q.copy(rows[j]);
        d.subVectors(rows[Math.min(4, j + 1)], rows[Math.max(0, j - 1)]).normalize(); w.copy(along).addScaledVector(d, L.tw * 0.3).normalize().multiplyScalar(wt);
        P.setXYZ(k, q.x - w.x, q.y - w.y, q.z - w.z); P.setXYZ(k + 1, q.x + w.x, q.y + w.y, q.z + w.z); D.setXYZ(k, d.x, d.y, d.z); D.setXYZ(k + 1, d.x, d.y, d.z); NN.setXYZ(k, rn[j].x, rn[j].y, rn[j].z); NN.setXYZ(k + 1, rn[j].x, rn[j].y, rn[j].z); } });
    P.needsUpdate = true; D.needsUpdate = true; NN.needsUpdate = true; }
  // the tail: hair from the dock, its shape set by the pace (hanging at a walk, streaming back and down at a gallop), swinging with the stride,
  // each point following its place with a little lag
  if (T.tail && T.tail.visible && A.dock) { const dock = horsePt(H, A.dock, _ht), N = 8, seg = 0.13, spd = T.spd = lerp(T.spd ?? 0, H.act.timeScale * 4.4, Math.min(1, dt * 3)), air = clamp(spd / 12, 0, 1);
    const ph = H.act.time / H.act.getClip().duration % 1, flick = Math.sin(ph * TAU * 2) * 0.05 * air, sway = Math.sin(ph * TAU + 1.3) * 0.05 * air;
    if (!T.chain) T.chain = Array.from({ length: N }, () => ({ p: new THREE.Vector3(), l: new THREE.Vector3(), init: true }));
    const ch = T.chain, k8 = Math.min(1, dt * 14), at = _ht2, dir = _ht3;
    at.copy(dock).add(_ht4.set(0, -0.03, -0.05));
    for (let k = 0; k < N; k++) { const u = k / (N - 1);
      if (k) { dir.set(sway * u * 2, lerp(-0.45, -0.95, u) + lerp(0.35, 0.18, u) * air + flick * (1 - u), lerp(-0.9, -0.35, u) - 0.55 * air * (1 - u * 0.4)).normalize(); at.addScaledVector(dir, seg); }
      const q = ch[k]; if (q.init || !k) { q.l.copy(at); q.init = false; } else q.l.lerp(at, k8 * (1 - u * 0.45)); // (the lag is the hair's own, in the horse's frame: going fast doesn't stretch it)
      q.p.copy(q.l); H.grp.localToWorld(q.p); }
    const P = T.tail.geometry.attributes.position, D = T.tail.geometry.attributes.aDir, t = _ht2, u1 = _ht3, u2 = _ht4;
    for (let k = 0; k < N; k++) { const p = ch[k].p; t.copy(ch[Math.min(N - 1, k + 1)].p).sub(ch[Math.max(0, k - 1)].p).normalize(); // (along the tail here; then two directions across it)
      u1.crossVectors(t, V_UP); if (u1.lengthSq() < 1e-6) u1.set(1, 0, 0); u1.normalize(); u2.crossVectors(u1, t).normalize();
      const w = lerp(0.06, 0.14, Math.sin(Math.min(1, k / (N - 1) * 1.15) * Math.PI * 0.85)) * (k === 0 ? 0.6 : 1);
      for (let rb = 0; rb < 3; rb++) { const a = rb * Math.PI / 3, cx = Math.cos(a) * w, cy = Math.sin(a) * w, j = k * 6 + rb * 2;
        P.setXYZ(j, p.x - u1.x * cx - u2.x * cy, p.y - u1.y * cx - u2.y * cy, p.z - u1.z * cx - u2.z * cy); P.setXYZ(j + 1, p.x + u1.x * cx + u2.x * cy, p.y + u1.y * cx + u2.y * cy, p.z + u1.z * cx + u2.z * cy);
        D.setXYZ(j, t.x, t.y, t.z); D.setXYZ(j + 1, t.x, t.y, t.z); } }
    P.needsUpdate = true; D.needsUpdate = true; T.tail.geometry.computeVertexNormals(); T.tail.geometry.computeBoundingSphere(); }
  // the reins: from the hands (or where they'd be) to the bit, sagging a little
  if (T.reins && T.reins.visible && A.bitL && A.bitR) { const hand = T.opt.reins(_ht4), P = T.reins.geometry.attributes.position, S = 10;
    for (let r = 0; r < 2; r++) { const bit = H.grp.localToWorld(horsePt(H, r ? A.bitR : A.bitL, _ht)), sd = _ht2.set(1, 0, 0).transformDirection(H.grp.matrixWorld).multiplyScalar(r ? -0.06 : 0.06); // (the two straps part at the hands)
      const L = hand.distanceTo(bit);
      for (let k = 0; k <= S; k++) { const t = k / S, x = hand.x + (bit.x - hand.x) * t + sd.x * (1 - t), y = hand.y + (bit.y - hand.y) * t - Math.sin(t * Math.PI) * L * 0.06 + sd.y * (1 - t), z = hand.z + (bit.z - hand.z) * t + sd.z * (1 - t);
        const j = (r * (S + 1) + k) * 2; P.setXYZ(j, x, y + 0.009, z); P.setXYZ(j + 1, x, y - 0.009, z); } }
    P.needsUpdate = true; T.reins.geometry.computeVertexNormals(); }
}

// ---- a horse that stands (v37: the town's horses that graze and walk, 12n) ----
// The model only gallops: every one of its 15 poses has legs in the air. A standing horse is made from them: each leg taken from the pose
// where it's planted straight under the body, the body, neck and head from the average of the gallop, blended across the top of the leg.
// Its own attribute, aLeg, tells the coat's shader (above) how each vertex walks and bows: which leg (0 near hind, 1 near fore, 2 off hind,
// 3 off fore), how much it swings about the shoulder or hip, how much it lifts, and how much it goes down with the neck to graze.
function horseStandPrep() {
  const g = HORSE.geo, M = HORSE.M, S = M.elements[5], TY = M.elements[13], P = g.attributes.position.array, mt = g.morphAttributes.position, n = g.attributes.position.count, nf = mt.length;
  const low = g.attributes.aAux.array, frame = (j, i, out) => out.set(P[i * 3] + mt[j].array[i * 3], P[i * 3 + 1] + mt[j].array[i * 3 + 1], P[i * 3 + 2] + mt[j].array[i * 3 + 2]).multiplyScalar(S).add(_hs.set(0, TY, 0));
  const avg = new Float32Array(n * 3), v = new THREE.Vector3(); for (let i = 0; i < n; i++) { let x = 0, y = 0, z = 0; for (let j = 0; j < nf; j++) { frame(j, i, v); x += v.x; y += v.y; z += v.z; } avg[i * 3] = x / nf; avg[i * 3 + 1] = y / nf; avg[i * 3 + 2] = z / nf; }
  const legW = new Float32Array(n), leg = new Int8Array(n).fill(-1);
  for (let i = 0; i < n; i++) { const lo = low[i * 4 + 1]; legW[i] = smoothstep(0.98, 0.72, lo); if (legW[i] <= 0) continue;
    const hind = avg[i * 3 + 2] < -0.15, off = avg[i * 3] < 0; leg[i] = (off ? 2 : 0) + (hind ? 0 : 1); }
  // each leg from the pose where its hoof is down and right under its top
  const pick = [0, 0, 0, 0], pivots = [];
  for (let L = 0; L < 4; L++) { let best = 1e9;
    for (let j = 0; j < nf; j++) { let hz = 0, hy = 1e9, hn = 0, tz = 0, tn = 0;
      for (let i = 0; i < n; i++) { if (leg[i] !== L) continue; frame(j, i, v); const lo = low[i * 4 + 1]; if (lo < 0.12) { hz += v.z; hn++; hy = Math.min(hy, v.y); } else if (legW[i] > 0.3 && legW[i] < 0.7) { tz += v.z; tn++; } }
      if (!hn || !tn) continue; const sc = Math.abs(hz / hn - tz / tn) + 4 * Math.max(0, hy - 0.05); if (sc < best) { best = sc; pick[L] = j; } } }
  const pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { if (leg[i] >= 0) frame(pick[leg[i]], i, v); else v.set(avg[i * 3], avg[i * 3 + 1], avg[i * 3 + 2]); const w = legW[i];
    pos[i * 3] = lerp(avg[i * 3], v.x, w); pos[i * 3 + 1] = lerp(avg[i * 3 + 1], v.y, w); pos[i * 3 + 2] = lerp(avg[i * 3 + 2], v.z, w); }
  // feet on the ground; where each leg swings from; the neck
  let ymin = 1e9; for (let i = 0; i < n; i++) ymin = Math.min(ymin, pos[i * 3 + 1]); for (let i = 0; i < n; i++) pos[i * 3 + 1] -= ymin;
  for (let L = 0; L < 4; L++) { let y = 0, z = 0, k = 0; for (let i = 0; i < n; i++) if (leg[i] === L && legW[i] > 0.35 && legW[i] < 0.65) { y += pos[i * 3 + 1]; z += pos[i * 3 + 2]; k++; } pivots[L] = k ? [y / k, z / k] : [1, 0]; }
  const aLeg = new Float32Array(n * 4);
  for (let i = 0; i < n; i++) { const L = leg[i], y = pos[i * 3 + 1], z = pos[i * 3 + 2];
    if (L >= 0) { const pv = pivots[L]; aLeg[i * 4] = L; aLeg[i * 4 + 1] = legW[i] * smoothstep(pv[0] + 0.1, pv[0] - 0.25, y); aLeg[i * 4 + 2] = legW[i] * smoothstep(0.6, 0.25, y); }
    else aLeg[i * 4] = -1;
    aLeg[i * 4 + 3] = (1 - legW[i]) * smoothstep(0.2, 0.95, z) * smoothstep(0.75, 1.05, y); } // (the neck and head: forward of the shoulder, up off the chest)
  const out = new THREE.BufferGeometry(), raw = new Float32Array(n * 3); for (let i = 0; i < n; i++) { raw[i * 3] = pos[i * 3] / S; raw[i * 3 + 1] = (pos[i * 3 + 1] - TY) / S; raw[i * 3 + 2] = pos[i * 3 + 2] / S; }
  out.setAttribute("position", new THREE.BufferAttribute(raw, 3)); for (const nm of Object.keys(g.attributes)) if (nm !== "position" && nm !== "normal" && nm !== "aAux") out.setAttribute(nm, g.attributes[nm]);
  const aux = new Float32Array(g.attributes.aAux.array), dy = HORSE_POLL[0] - 1.22, dz = HORSE_POLL[1] - 0.42, dl = Math.hypot(dy, dz); // (aAux.w: the head, past the poll along the neck)
  for (let i = 0; i < n; i++) aux[i * 4 + 3] = aLeg[i * 4 + 3] > 0 ? smoothstep(-0.06, 0.08, ((pos[i * 3 + 1] - HORSE_POLL[0]) * dy + (pos[i * 3 + 2] - HORSE_POLL[1]) * dz) / dl) : 0;
  out.setAttribute("aAux", new THREE.BufferAttribute(aux, 4)); HORSE.standHead = aux;
  out.setAttribute("aLeg", new THREE.BufferAttribute(aLeg, 4)); out.setIndex(g.index); out.computeVertexNormals(); out.computeBoundingSphere();
  const fp = [(pivots[1][0] + pivots[3][0]) / 2, (pivots[1][1] + pivots[3][1]) / 2], hp = [(pivots[0][0] + pivots[2][0]) / 2, (pivots[0][1] + pivots[2][1]) / 2];
  HORSE.stand = { geo: out, pos, aLeg, piv: new THREE.Vector4(fp[0], fp[1], hp[0], hp[1]), pick, neckP: new THREE.Vector2(1.05, 0.3) }; // (the neck bows about the base of the chest: at 1.3 rad the muzzle is at the ground)
}
const _hs = new THREE.Vector3();
// a point on a standing horse (horsePt for it): its three vertices as it stands, bowed with the neck as it grazes (the legs carry no tack)
function horseStandPt(H, at, out) {
  const St = HORSE.stand, P = St.pos, A = St.aLeg, a = H.neckA || 0, np = St.neckP, c = Math.cos, s = Math.sin, hd = HORSE.standHead, [py, pz, cf] = HORSE_POLL; out.set(0, 0, 0);
  for (let k = 0; k < 3; k++) { const i = at.i[k]; let y = P[i * 3 + 1], z = P[i * 3 + 2]; const w = A[i * 4 + 3] * a;
    if (w) { const b = -a * cf * hd[i * 4 + 3]; if (b) { const ey = y - py, ez = z - pz; y = py + ey * c(b) - ez * s(b); z = pz + ey * s(b) + ez * c(b); }
      const dy = y - np.x, dz = z - np.y; y = np.x + dy * c(w) - dz * s(w); z = np.y + dy * s(w) + dz * c(w); }
    out.x += P[i * 3] * at.w[k]; out.y += y * at.w[k]; out.z += z * at.w[k]; }
  return out;
}
