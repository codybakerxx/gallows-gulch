// ---------- PROCEDURAL PBR TEXTURES ----------
const TEX = {};
let TEXQ = 512; // set by quality tier before building
function dataTex(w, h, data, srgb) {
  const t = new THREE.DataTexture(data, w, h, THREE.RGBAFormat);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter;
  t.generateMipmaps = true; t.anisotropy = 8; if (srgb) t.encoding = THREE.sRGBEncoding; t.needsUpdate = true; return t;
}
function normalMap(H, w, h, strength) {
  const out = new Uint8Array(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const xl = (x - 1 + w) % w, xr = (x + 1) % w, yu = (y - 1 + h) % h, yd = (y + 1) % h;
    const dx = (H[y * w + xr] - H[y * w + xl]) * strength, dy = (H[yd * w + x] - H[yu * w + x]) * strength;
    const l = Math.hypot(dx, dy, 1), i = (y * w + x) * 4;
    out[i] = (-dx / l * 0.5 + 0.5) * 255; out[i + 1] = (dy / l * 0.5 + 0.5) * 255; out[i + 2] = (1 / l * 0.5 + 0.5) * 255; out[i + 3] = 255;
  }
  return dataTex(w, h, out, false);
}
// generic builder: fn(u, v, o) sets o.h (height), o.r,o.g,o.b (albedo 0..1, sRGB), o.ro (roughness)
function buildSet(w, h, fn, nStrength, ormOnly) {
  const H = new Float32Array(w * h), A = new Uint8Array(w * h * 4), M = new Uint8Array(w * h * 4), o = { h: 0, r: 0, g: 0, b: 0, ro: 0.9, ao: 1 };
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    o.h = 0; o.ro = 0.9; o.ao = 1; fn(x / w, y / h, o);
    const i = y * w + x, j = i * 4; H[i] = o.h;
    A[j] = clamp(o.r, 0, 1) * 255; A[j + 1] = clamp(o.g, 0, 1) * 255; A[j + 2] = clamp(o.b, 0, 1) * 255; A[j + 3] = 255;
    M[j] = clamp(o.ao, 0, 1) * 255; M[j + 1] = clamp(o.ro, 0, 1) * 255; M[j + 2] = 0; M[j + 3] = 255;
  }
  return { map: dataTex(w, h, A, true), normalMap: normalMap(H, w, h, nStrength * w / 256), orm: dataTex(w, h, M, false) };
}

function buildTextures() {
  const N = TEXQ, n2 = Math.max(128, N >> 1);
  // desert ground: sand, dry cracked mud patches, pebbles, organic specks
  TEX.ground = buildSet(N, N, (u, v, o) => {
    const base = fbm(u * 6, v * 6, 6, 6, 4, 1), det = fbm(u * 40, v * 40, 40, 40, 2, 9);
    const cm = smoothstep(0.05, 0.3, fbm(u * 3, v * 3, 3, 3, 2, 21));
    let w = worley(u * 13, v * 13, 13, 13, 5); const crack = smoothstep(0.05, 0.0, w.f2 - w.f1) * cm * 0.7;
    w = worley(u * 36, v * 36, 36, 36, 77); const pk = (w.id & 255) / 255, peb = pk > 0.78 ? smoothstep(0.3, 0.12, w.f1) : 0;
    const speck = ((ihash((u * N) | 0, (v * N) | 0, 3) & 4095) < 5) ? 1 : 0;
    o.h = 0.35 * base + 0.18 * det - 0.7 * crack + 0.65 * peb;
    const t = 0.5 + 0.5 * base;
    o.r = lerp(0.50, 0.70, t); o.g = lerp(0.37, 0.53, t); o.b = lerp(0.26, 0.38, t);
    const dk = 1 - 0.1 * det - 0.45 * crack; o.r *= dk; o.g *= dk; o.b *= dk;
    if (peb > 0.05) { const pc = 0.42 + 0.18 * ((w.id >>> 8) & 255) / 255; o.r = lerp(o.r, pc * 1.02, peb); o.g = lerp(o.g, pc * 0.95, peb); o.b = lerp(o.b, pc * 0.86, peb); }
    if (speck) { o.r *= 0.45; o.g *= 0.42; o.b *= 0.4; }
    o.ro = 0.96 - 0.25 * peb; o.ao = 1 - 0.5 * crack;
  }, 2.2);
  // low-frequency variation for breaking tiling
  { const M = 256, d = new Uint8Array(M * M * 4);
    for (let y = 0; y < M; y++) for (let x = 0; x < M; x++) { const i = (y * M + x) * 4, a = fbm(x / M * 4, y / M * 4, 4, 4, 4, 41), b = fbm(x / M * 9, y / M * 9, 9, 9, 3, 43);
      d[i] = (0.5 + 0.5 * a) * 255; d[i + 1] = (0.5 + 0.5 * b) * 255; d[i + 2] = 128; d[i + 3] = 255; }
    TEX.macro = dataTex(M, M, d, false); }
  // weathered timber (u across the grain, v along it; 1 unit = 1 m): wandering ring spacing, knots the grain bends around,
  // checks along the grain, silvered grey surface with patches of the old brown; every noise is periodic so it tiles
  TEX.wood = buildSet(N, N, (u, v, o) => {
    const lo = fbm(u * 2, v * 2, 2, 2, 3, 61);
    const warp = lo * 1.3 + 3.2 * fbm(u * 2, v, 2, 1, 2, 66) + 0.7 * Math.sin(v * TAU * 2 + lo * 2.5) * smoothstep(0.1, 0.6, fbm(u * 2, v, 2, 1, 2, 64) + 0.3);
    const kn = worley(u * 4, v * 2, 4, 2, 67), isK = (kn.id & 7) === 0, kr = kn.f1;
    const knot = isK ? smoothstep(0.12, 0.045, kr) : 0, knotFlow = isK ? 1 - smoothstep(0.0, 0.4, kr) : 0;
    const g = u * 30 + warp + knotFlow * knotFlow * 2.6 * (((kn.id >>> 4) & 1) ? 1 : -1), fr = g - Math.floor(g);
    const late = smoothstep(0.2, 0.0, fr) + smoothstep(0.88, 1.0, fr) * 0.7, early = smoothstep(0.18, 0.5, fr) * smoothstep(0.92, 0.6, fr);
    const fib = gnoise(u * N / 2, v * 5, N / 2, 5, 63) * 0.6 + gnoise(u * N, v * 9, N, 9, 65) * 0.4;
    const cu = u * 7 + lo * 0.1, cf = cu - Math.floor(cu), cid = ((Math.floor(cu) % 7) + 7) % 7;
    const run = smoothstep(0.3, 0.6, gnoise(cid * 3, v * 3, 21, 3, 71) * 0.5 + 0.5);
    const check = smoothstep(0.02, 0.0, Math.abs(cf - 0.5)) * run * ((((cid * 2654435761) >>> 0) % 3) === 0 ? 1 : 0);
    const pat = fbm(u * 3, v, 3, 1, 4, 73), gray = smoothstep(-0.5, 0.15, pat), mild = smoothstep(0.35, 0.75, fbm(u * 6, v * 3, 6, 3, 3, 75));
    o.h = 0.32 * late - 0.26 * early + 0.2 * fib - 1.1 * check - 0.5 * knot;
    let r = 0.5 + 0.07 * fib - 0.085 * late + 0.02 * early, gg = r * 0.87, b = r * 0.76;
    r = lerp(0.5 - 0.09 * late + 0.06 * fib, r, gray); gg = lerp(0.35 - 0.07 * late + 0.04 * fib, gg, gray); b = lerp(0.23 - 0.05 * late + 0.03 * fib, b, gray);
    const dk = (1 - 0.62 * knot) * (1 - 0.7 * check) * (1 - 0.16 * mild);
    o.r = r * dk; o.g = gg * dk; o.b = b * dk;
    o.ro = 0.8 + 0.12 * gray + 0.08 * check; o.ao = 1 - 0.5 * check - 0.2 * knot;
  }, 0.8);
  // fabric weave (tinted by material color)
  TEX.fabric = buildSet(n2, n2, (u, v, o) => {
    const a = Math.sin(u * 48 * TAU), b = Math.sin(v * 48 * TAU), top = (Math.floor(u * 48) + Math.floor(v * 48)) & 1;
    const thread = top ? Math.abs(b) : Math.abs(a), f = fbm(u * 8, v * 8, 8, 8, 3, 81), fi = gnoise(u * 96, v * 96, 96, 96, 83);
    o.h = 0.35 * thread + 0.12 * fi + 0.25 * f; const t = 0.9 + 0.07 * f + 0.02 * fi + 0.015 * thread;
    o.r = o.g = o.b = t; o.ro = 0.88 + 0.08 * f;
  }, 0.7);
  // leather
  TEX.leather = buildSet(n2, n2, (u, v, o) => {
    const w = worley(u * 10, v * 10, 10, 10, 91), cr = smoothstep(0.08, 0.0, w.f2 - w.f1), f = fbm(u * 6, v * 6, 6, 6, 3, 93), p = gnoise(u * 80, v * 80, 80, 80, 95);
    o.h = -0.6 * cr + 0.2 * p + 0.2 * f; const t = 0.82 + 0.14 * f - 0.18 * cr; o.r = o.g = o.b = t; o.ro = 0.55 + 0.2 * f + 0.15 * cr;
  }, 1.2);
  // felt (hats) and generic noise
  TEX.felt = buildSet(128, 128, (u, v, o) => { const f = fbm(u * 8, v * 8, 8, 8, 4, 101); o.h = f; o.r = o.g = o.b = 0.88 + 0.12 * f; o.ro = 0.92; }, 0.6);
  // hemp rope: three twisted strands
  TEX.rope = buildSet(64, 256, (u, v, o) => {
    const ph = u * 3 + v * 10, s = 0.5 + 0.5 * Math.cos(ph * TAU), fi = gnoise(u * 24, v * 96, 24, 96, 111), lay = gnoise(u * 6 + v * 20, v * 40, 26, 40, 113);
    o.h = Math.pow(s, 0.6) + 0.25 * fi; const t = 0.55 + 0.45 * Math.pow(s, 0.5) + 0.06 * fi;
    o.r = 0.66 * t + 0.03 * lay; o.g = 0.55 * t; o.b = 0.37 * t; o.ro = 0.9; o.ao = 0.5 + 0.5 * s;
  }, 2.5);
  // sandstone rock
  TEX.rock = buildSet(n2, n2, (u, v, o) => {
    const f = fbm(u * 5, v * 5, 5, 5, 5, 121), st = Math.sin((v * 14 + f * 1.2) * TAU), w = worley(u * 6, v * 6, 6, 6, 123);
    o.h = 0.5 * f + 0.15 * st + 0.4 * w.f1; const t = 0.5 + 0.5 * f;
    o.r = lerp(0.48, 0.70, t) * (0.92 + 0.08 * st); o.g = lerp(0.28, 0.42, t) * (0.92 + 0.08 * st); o.b = lerp(0.18, 0.28, t); o.ro = 0.9;
  }, 2.0);
  // skin micro-detail: pores (pits) + fine wrinkle noise, tiled over the face
  { const S = 256, H = new Float32Array(S * S);
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) { const u = x / S, v = y / S, w = worley(u * 26, v * 26, 26, 26, 131), pit = smoothstep(0.24, 0.03, w.f1) * (0.45 + 0.55 * ((w.id >>> 4) & 255) / 255);
      H[y * S + x] = -pit + 0.35 * gnoise(u * 64, v * 64, 64, 64, 133) + 0.18 * gnoise(u * 7, v * 96, 7, 96, 135); }
    TEX.pores = normalMap(H, S, S, 1.6); }
  TEX.white = dataTex(1, 1, new Uint8Array([255, 255, 255, 255]), false);
  if (TIERS[R.tier].detail) buildDetail();
  TEX.grass = spriteGrass(); TEX.sage = spriteSage(); TEX.dust = spriteDot(); TEX.cloth = spriteBunting();
}
// close-up detail: small tiling maps sampled a second time over the main textures, much finer than they are, and faded out with
// distance. R: height (the surface is bumped from it in the shader), G: tone. grit: sand grains, grit and little stones in a 0.5 m tile
// (the ground, rock); fibre: the grain's fibres, splinters and fine checks in wood, 0.25 m across by 1 m along
function buildDetail() {
  const S = TIERS[R.tier].detail > 1 ? 512 : 256, A = new Uint8Array(S * S * 4), B = new Uint8Array(S * S * 4);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) { const u = x / S, v = y / S, i = (y * S + x) * 4;
    const sand = gnoise(u * 160, v * 160, 160, 160, 201) * 0.5 + gnoise(u * 64, v * 64, 64, 64, 203) * 0.5, w = worley(u * 22, v * 22, 22, 22, 205), id = (w.id & 255) / 255;
    const stone = id > 0.62 ? smoothstep(0.42, 0.18, w.f1) * (0.5 + 0.5 * id) : 0, w2 = worley(u * 55, v * 55, 55, 55, 207), grain = (w2.id & 3) === 0 ? smoothstep(0.38, 0.1, w2.f1) : 0;
    const h = 0.5 + 0.18 * sand + 0.4 * stone + 0.16 * grain, tone = 0.5 + 0.14 * sand - 0.2 * stone * ((w.id >>> 9) & 1 ? 1 : -0.6) + 0.12 * grain * ((w2.id >>> 5) & 1 ? 1 : -1);
    A[i] = clamp(h, 0, 1) * 255; A[i + 1] = clamp(tone, 0, 1) * 255; A[i + 2] = 128; A[i + 3] = 255;
    const fib = gnoise(u * 90, v * 6, 90, 6, 211) * 0.55 + gnoise(u * 220, v * 14, 220, 14, 213) * 0.3 + gnoise(u * 30, v * 3, 30, 3, 215) * 0.15;
    const cu = u * 40, cf = cu - Math.floor(cu), chk = ((Math.floor(cu) * 2654435761 >>> 0) % 5 === 0 ? 1 : 0) * smoothstep(0.08, 0.0, Math.abs(cf - 0.5)) * smoothstep(0.2, 0.6, gnoise(Math.floor(cu) * 7, v * 4, 280, 4, 217) * 0.5 + 0.5);
    B[i] = clamp(0.5 + 0.35 * fib - 0.45 * chk, 0, 1) * 255; B[i + 1] = clamp(0.5 + 0.22 * fib - 0.35 * chk, 0, 1) * 255; B[i + 2] = 128; B[i + 3] = 255; }
  TEX.grit = dataTex(S, S, A, false); TEX.fibre = dataTex(S, S, B, false); TEX.grit.anisotropy = TEX.fibre.anisotropy = Math.min(16, R.maxAniso || 8);
}
// the same in GLSL: tone and bump from a detail map, faded out by distance (dn: fully on nearer than this, df: gone beyond); writes `dh`
// (height, metres) and scales the colour
const DETAIL_GLSL = (map, uv, amp, tone, dn, df) => `{ float dk = 1.0 - smoothstep(${dn.toFixed(1)}, ${df.toFixed(1)}, length(vViewPosition));
    if (dk > 0.0) { vec2 dq = ${uv}; vec4 dt = texture2D(${map}, dq), dt2 = texture2D(${map}, dq * 0.31 + vec2(0.37, 0.61));
      diffuseColor.rgb *= 1.0 + ((dt.g - 0.5) * ${tone.toFixed(3)} + (dt2.g - 0.5) * ${(tone * 0.6).toFixed(3)}) * dk;
      dh += ((dt.r - 0.5) * ${amp.toFixed(5)} + (dt2.r - 0.5) * ${(amp * 2.2).toFixed(5)}) * dk; } }`;
const BUMP_GLSL = h => `{ vec3 sx = dFdx(-vViewPosition), sy = dFdy(-vViewPosition), r1 = cross(sy, normal), r2 = cross(normal, sx);
    float fd = dot(sx, r1) * faceDirection; vec3 gr = sign(fd) * (dFdx(${h}) * r1 + dFdy(${h}) * r2); normal = normalize(abs(fd) * normal - gr); }`;
// grit on any surface by world position (three projections blended by the normal: no UVs needed). For rock and the like
function gritWorld(m, scale = 1.4, amp = 0.006, tone = 0.4) {
  if (!TEX.grit) return m; const before = m.onBeforeCompile;
  m.onBeforeCompile = function (sh, r) { if (before && before !== THREE.Material.prototype.onBeforeCompile) before.call(this, sh, r);
    sh.uniforms.gritMap = { value: TEX.grit };
    sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nvarying vec3 vGRP; varying vec3 vGRN;").replace("#include <worldpos_vertex>", `#include <worldpos_vertex>
      #ifdef USE_INSTANCING
        vGRP = (modelMatrix * instanceMatrix * vec4(transformed, 1.0)).xyz; vGRN = mat3(modelMatrix) * mat3(instanceMatrix) * objectNormal;
      #else
        vGRP = (modelMatrix * vec4(transformed, 1.0)).xyz; vGRN = mat3(modelMatrix) * objectNormal;
      #endif`);
    sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\nvarying vec3 vGRP; varying vec3 vGRN; uniform sampler2D gritMap; float gh = 0.0;")
      .replace("#include <map_fragment>", `#include <map_fragment>
        { vec3 bw = pow(abs(normalize(vGRN)), vec3(4.0)); bw /= bw.x + bw.y + bw.z; float dh = 0.0; vec3 q = vGRP * ${(1 / scale).toFixed(4)};
          float dk = 1.0 - smoothstep(6.0, 30.0, length(vViewPosition));
          if (dk > 0.0) { vec4 a = texture2D(gritMap, q.yz) * bw.x + texture2D(gritMap, q.xz) * bw.y + texture2D(gritMap, q.xy) * bw.z;
            diffuseColor.rgb *= 1.0 + (a.g - 0.5) * ${tone.toFixed(3)} * dk; gh = (a.r - 0.5) * ${amp.toFixed(5)} * dk; } }`)
      .replace("#include <normal_fragment_maps>", "#include <normal_fragment_maps>\n" + BUMP_GLSL("gh")); };
  const key = m.customProgramCacheKey ? m.customProgramCacheKey() : ""; m.customProgramCacheKey = () => key + "|grit"; return m;
}
function canvasTex(c, srgb = true) { const t = new THREE.CanvasTexture(c); if (srgb) t.encoding = THREE.sRGBEncoding; t.anisotropy = 4; return t; }
function spriteGrass() {
  const c = document.createElement("canvas"); c.width = c.height = 256; const g = c.getContext("2d"), r = rng(5);
  for (let i = 0; i < 70; i++) {
    const x0 = 128 + (r() - 0.5) * 70, a = (r() - 0.5) * 1.5, len = 90 + r() * 140, bend = (r() - 0.5) * 60;
    const l = 140 + r() * 70 | 0; g.strokeStyle = `rgb(${l},${l * 0.82 | 0},${l * 0.52 | 0})`; g.lineWidth = 1.5 + r() * 2.5;
    g.beginPath(); g.moveTo(x0, 256); g.quadraticCurveTo(x0 + Math.sin(a) * len * 0.5, 256 - len * 0.6, x0 + Math.sin(a) * len + bend, 256 - len); g.stroke();
  }
  return canvasTex(c);
}
function spriteSage() {
  const c = document.createElement("canvas"); c.width = c.height = 256; const g = c.getContext("2d"), r = rng(9);
  g.strokeStyle = "#4a3b2a"; g.lineWidth = 3;
  for (let i = 0; i < 14; i++) { g.beginPath(); g.moveTo(128 + (r() - 0.5) * 30, 256); g.lineTo(128 + (r() - 0.5) * 200, 120 + r() * 90); g.stroke(); }
  for (let i = 0; i < 900; i++) {
    const a = r() * Math.PI, rad = Math.sqrt(r()) * 115, x = 128 + Math.cos(a) * rad * 1.05, y = 200 - Math.sin(a) * rad * 0.95;
    const l = 105 + r() * 70 | 0; g.fillStyle = `rgba(${l * 0.85 | 0},${l | 0},${l * 0.78 | 0},0.9)`;
    g.beginPath(); g.ellipse(x, y, 3 + r() * 4, 2 + r() * 3, r() * 3, 0, TAU); g.fill();
  }
  return canvasTex(c);
}
function spriteDot() {
  const c = document.createElement("canvas"); c.width = c.height = 64; const g = c.getContext("2d");
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.4, "rgba(255,255,255,.35)"); gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return canvasTex(c, false);
}
function spriteBunting() { // faded red-white-blue bunting cloth
  const c = document.createElement("canvas"); c.width = 256; c.height = 64; const g = c.getContext("2d");
  ["#8e2f24", "#d9cdb4", "#2c3c5a"].forEach((col, i) => { g.fillStyle = col; g.fillRect(0, i * 21, 256, 22); });
  return canvasTex(c);
}
// shared PBR materials
const MAT = {};
function stdMat(set, color, rep, extra) {
  const m = new THREE.MeshStandardMaterial(Object.assign({ color, map: set.map, normalMap: set.normalMap, roughnessMap: set.orm, aoMap: null, roughness: 1, metalness: 0 }, extra || {}));
  if (rep) for (const k of ["map", "normalMap", "roughnessMap"]) if (m[k]) { m[k] = m[k].clone(); m[k].repeat.set(rep[0], rep[1]); m[k].needsUpdate = true; }
  return m;
}
// vertical board siding: seams with a shadowed groove, per-board tone, nail heads, weather staining toward the ground
function sidingMat(base, bw = 0.19) {
  const m = base.clone();
  const sid = sh => {
    sh.fragmentShader = sh.fragmentShader.replace("#include <map_fragment>", `#include <map_fragment>
      float bx = vUv.x / ${bw.toFixed(3)}, bi = floor(bx), bf = fract(bx), bh = fract(sin(bi * 91.7 + 3.1) * 4375.85);
      float seam = smoothstep(0.05, 0.0, bf) + smoothstep(0.95, 1.0, bf);
      float nail = smoothstep(0.028, 0.012, length(vec2((bf - 0.5) * ${bw.toFixed(3)}, mod(vUv.y + bh * 0.3, 0.85) - 0.42)));
      diffuseColor.rgb *= (0.84 + 0.26 * bh) * (1.0 - 0.6 * seam) * (1.0 - 0.45 * nail);
      diffuseColor.rgb *= 1.0 - 0.18 * smoothstep(0.9, 0.0, vUv.y) * (0.6 + 0.4 * bh);
      float sidingH = -seam * 0.004;`)
      .replace("#include <normal_fragment_maps>", `#include <normal_fragment_maps>
      { vec3 sx = dFdx(-vViewPosition), sy = dFdy(-vViewPosition), r1 = cross(sy, normal), r2 = cross(normal, sx);
        float fd = dot(sx, r1) * faceDirection; vec3 gr = sign(fd) * (dFdx(sidingH) * r1 + dFdy(sidingH) * r2); normal = normalize(abs(fd) * normal - gr); }`);
  };
  m.customProgramCacheKey = () => "gulchSiding" + bw;
  return weatherWood(m, sid);
}
// fired-clay brick in running bond (uv in metres): per-brick colour and soot, recessed mortar joints, chipped arrises
function brickMat() {
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, map: TEX.rock.map, normalMap: TEX.rock.normalMap, normalScale: new THREE.Vector2(0.5, 0.5), roughness: 0.9 });
  m.onBeforeCompile = sh => {
    sh.fragmentShader = sh.fragmentShader.replace("#include <map_fragment>", `#include <map_fragment>
      vec2 bu = vUv / vec2(0.205, 0.075); float row = floor(bu.y); bu.x += mod(row, 2.0) * 0.5; vec2 bi = floor(bu), bf = fract(bu);
      float bh = fract(sin(dot(bi, vec2(12.9898, 78.233))) * 43758.5453), bh2 = fract(bh * 91.7);
      float mort = 1.0 - smoothstep(0.035, 0.07, min(min(bf.x, 1.0 - bf.x) * 0.205 / 0.075, min(bf.y, 1.0 - bf.y)));
      vec3 brick = mix(vec3(0.52, 0.24, 0.17), vec3(0.66, 0.36, 0.24), bh) * (0.82 + 0.3 * bh2) * (0.85 + 0.3 * dot(diffuseColor.rgb, vec3(0.33)));
      brick *= 1.0 - 0.25 * smoothstep(0.7, 1.0, bh2) * smoothstep(0.4, 0.0, fract(vUv.y * 0.35));
      diffuseColor.rgb = mix(brick, vec3(0.58, 0.54, 0.48) * (0.85 + 0.2 * dot(diffuseColor.rgb, vec3(0.33))), mort);
      float brickH = -mort * 0.006;`)
      .replace("#include <normal_fragment_maps>", `#include <normal_fragment_maps>
      { vec3 sx = dFdx(-vViewPosition), sy = dFdy(-vViewPosition), r1 = cross(sy, normal), r2 = cross(normal, sx);
        float fd = dot(sx, r1) * faceDirection; vec3 gr = sign(fd) * (dFdx(brickH) * r1 + dFdy(brickH) * r2); normal = normalize(abs(fd) * normal - gr); }`);
  };
  m.customProgramCacheKey = () => "gulchBrick"; return m;
}
// window glass behind a painted sash: six dusty panes; the panes glow at dusk, the frame does not
function windowMat() {
  const c = document.createElement("canvas"); c.width = 128; c.height = 160; const g = c.getContext("2d"), e = document.createElement("canvas"); e.width = 128; e.height = 160; const h = e.getContext("2d");
  g.fillStyle = "#4a3a2c"; g.fillRect(0, 0, 128, 160); h.fillStyle = "#000"; h.fillRect(0, 0, 128, 160);
  for (let r = 0; r < 3; r++) for (let k = 0; k < 2; k++) { const x = 10 + k * 56, y = 10 + r * 48;
    const gr = g.createLinearGradient(x, y, x + 50, y + 44); gr.addColorStop(0, "#1c1712"); gr.addColorStop(1, "#2b231b"); g.fillStyle = gr; g.fillRect(x, y, 52, 44);
    h.fillStyle = `rgb(${200 + Math.random() * 55 | 0},${150 + Math.random() * 40 | 0},${80 + Math.random() * 30 | 0})`; h.fillRect(x, y, 52, 44); }
  g.fillStyle = "rgba(120,100,80,0.25)"; for (let i = 0; i < 60; i++) g.fillRect(Math.random() * 128, Math.random() * 160, 2 + Math.random() * 6, 1);
  const t = canvasTex(c), te = canvasTex(e);
  return new THREE.MeshStandardMaterial({ map: t, emissiveMap: te, emissive: 0xffa24a, emissiveIntensity: 0, roughness: 0.12, metalness: 0.1, envMapIntensity: 1.2 });
}
// weathering that depends on where a surface is: tops bleached silver by the sun, undersides dark, rain streaks down vertical faces,
// dust and splash-back grime near the ground, slow blotchy variation so no two boards match
const WOOD_PARS = `varying vec3 vWWP; varying vec3 vWWN; uniform sampler2D woodMacro; uniform sampler2D fibreMap; float wdh = 0.0;`;
const WOOD_WEATHER = `{ // two texture reads of a tiling noise map (cheap on phones) instead of procedural noise
    vec3 wn = normalize(vWWN); float lumW = dot(diffuseColor.rgb, vec3(0.3, 0.59, 0.11));
    float up = clamp(wn.y, 0.0, 1.0), dn = clamp(-wn.y, 0.0, 1.0), vert = 1.0 - abs(wn.y);
    float hcW = abs(wn.x) > abs(wn.z) ? vWWP.z : vWWP.x;
    vec2 mac = texture2D(woodMacro, vec2(hcW * 0.23 + vWWP.y * 0.07, vWWP.y * 0.19 + (vWWP.x + vWWP.z) * 0.05)).rg;
    float blot = mac.x;
    diffuseColor.rgb *= 0.86 + 0.28 * blot;
    diffuseColor.rgb = mix(diffuseColor.rgb, vec3(lumW) * vec3(1.06, 1.04, 1.0) + 0.04, up * 0.45);
    diffuseColor.rgb *= 1.0 - 0.3 * dn;
    float streak = smoothstep(0.55, 0.85, texture2D(woodMacro, vec2(hcW * 1.7, vWWP.y * 0.045)).g);
    diffuseColor.rgb *= 1.0 - 0.2 * streak * vert;
    float grime = smoothstep(0.7, 0.0, vWWP.y) * (0.6 + 0.4 * blot);
    diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.36, 0.27, 0.19) * (0.8 + 0.4 * lumW), grime * 0.5);
  }`;
function weatherWood(m, prev) {
  const before = prev || m.onBeforeCompile; m.onBeforeCompile = sh => {
    if (before && before !== THREE.Material.prototype.onBeforeCompile) before(sh);
    sh.uniforms.woodMacro = { value: TEX.macro };
    sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nvarying vec3 vWWP; varying vec3 vWWN;")
      .replace("#include <worldpos_vertex>", `#include <worldpos_vertex>
        #ifdef USE_INSTANCING
          vWWP = (modelMatrix * instanceMatrix * vec4(transformed, 1.0)).xyz; vWWN = mat3(modelMatrix) * mat3(instanceMatrix) * objectNormal;
        #else
          vWWP = (modelMatrix * vec4(transformed, 1.0)).xyz; vWWN = mat3(modelMatrix) * objectNormal;
        #endif`);
    sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\n" + WOOD_PARS).replace("#include <map_fragment>", "#include <map_fragment>\n" + WOOD_WEATHER);
    if (TEX.fibre && sh.fragmentShader.includes("vUv")) { sh.uniforms.fibreMap = { value: TEX.fibre }; // (close up: the grain's fibres and splinters, 10)
      sh.fragmentShader = sh.fragmentShader.replace("#include <map_fragment>", "#include <map_fragment>\n{ float dh = 0.0; " + DETAIL_GLSL("fibreMap", "vUv * vec2(4.0, 1.0)", 0.0012, 0.32, 1.5, 6.0) + " wdh = dh; }")
        .replace("#include <normal_fragment_maps>", "#include <normal_fragment_maps>\n" + BUMP_GLSL("wdh")); }
  };
  const key = m.customProgramCacheKey ? m.customProgramCacheKey() : ""; m.customProgramCacheKey = () => key + "|wood"; return m;
}
function buildMaterials() {
  MAT.wood = weatherWood(stdMat(TEX.wood, 0xffffff, null, { normalScale: new THREE.Vector2(0.75, 0.75) }));
  MAT.woodDark = weatherWood(stdMat(TEX.wood, 0x8a7a6a, null, { normalScale: new THREE.Vector2(0.75, 0.75) }));
  MAT.woodRed = weatherWood(stdMat(TEX.wood, 0xb07a66, null, { normalScale: new THREE.Vector2(0.75, 0.75) }));
  MAT.iron = new THREE.MeshStandardMaterial({ color: 0x2e2a27, roughness: 0.45, metalness: 0.85, normalMap: TEX.leather.normalMap });
  MAT.brass = new THREE.MeshStandardMaterial({ color: 0xb08a3e, roughness: 0.35, metalness: 1 });
  MAT.rope = stdMat(TEX.rope, 0xd9c2a0);
  MAT.rock = gritWorld(stdMat(TEX.rock, 0xffffff), 1.2, 0.008, 0.45);
  MAT.glassLit = new THREE.MeshStandardMaterial({ color: 0x1a120a, emissive: 0xffa040, emissiveIntensity: 0.0, roughness: 0.2 });
  MAT.siding = sidingMat(MAT.wood); MAT.sidingRed = sidingMat(MAT.woodRed);
  MAT.door = sidingMat(MAT.woodDark, 0.11);
  MAT.shingle = sidingMat(MAT.woodDark, 0.16); MAT.plank = sidingMat(MAT.woodDark, 0.2);
  MAT.brick = brickMat();
  MAT.hay = new THREE.MeshStandardMaterial({ color: 0xc8a866, map: TEX.wood.map, normalMap: TEX.wood.normalMap, normalScale: new THREE.Vector2(2, 2), roughness: 1 });
  MAT.canvas = new THREE.MeshPhysicalMaterial({ color: 0xd9ccb0, map: TEX.fabric.map, normalMap: TEX.fabric.normalMap, roughness: 0.92, side: THREE.DoubleSide,
    sheen: 0.6, sheenRoughness: 0.7, sheenColor: new THREE.Color(0.5, 0.45, 0.38) });
}
