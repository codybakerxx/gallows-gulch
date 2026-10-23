// ---------- PHYSICS: wind field, XPBD rope with a twine-tied slack coil, swinging trap leaves, lantern pendulums ----------
const WIND = { v: new THREE.Vector3(1.2, 0, 0.2), base: 1.3, gust: 0, t: Math.random() * 100 };
const WINDU = { time: { value: 0 }, gust: { value: 0 }, dir: { value: new THREE.Vector2(1, 0) } }; // shader uniforms for plants that sway
function updateWind(dt) {
  const t = (WIND.t += dt);
  // a steady breeze down the street with slow gusts and lulls
  const g = 0.55 + 0.3 * Math.sin(t * 0.19) + 0.22 * Math.sin(t * 0.47 + 1.3) + 0.12 * Math.sin(t * 1.31 + 0.4) + 0.06 * Math.sin(t * 2.9);
  WIND.gust = Math.max(0, g); WIND.v.set(WIND.base * (0.35 + 0.95 * WIND.gust), 0, 0.35 * Math.sin(t * 0.13) + 0.12 * Math.sin(t * 0.71));
  WINDU.time.value = t; WINDU.gust.value = WIND.gust; WINDU.dir.value.set(WIND.v.x, WIND.v.z).multiplyScalar(0.5);
}
// brush and grass bend with the breeze: tips move most, each plant on its own phase, gusts roll through
function swayMat(mat, amt) {
  mat.onBeforeCompile = sh => { sh.uniforms.wTime = WINDU.time; sh.uniforms.wGust = WINDU.gust; sh.uniforms.wDir = WINDU.dir;
    sh.vertexShader = "uniform float wTime, wGust; uniform vec2 wDir;\n" + sh.vertexShader.replace("#include <begin_vertex>", `#include <begin_vertex>
      { float hgt = position.y * position.y; vec2 ip = instanceMatrix[3].xz; float ph = dot(ip, vec2(0.37, 0.61)) - wTime * 1.3;
        vec3 wl = (vec4(wDir.x, 0.0, wDir.y, 0.0) * instanceMatrix).xyz; float sl = length(wl); wl = sl > 1e-4 ? wl / sl * length(wDir) : vec3(0.0);
        float sway = ${amt.toFixed(3)} * ((0.4 + wGust) * (0.6 + 0.4 * sin(ph * 0.7)) + 0.35 * sin(wTime * 4.7 + ph * 3.1) * wGust);
        transformed.xz += wl.xz * sway * hgt; transformed.y -= sway * sway * hgt * 0.15; }`);
  };
  mat.customProgramCacheKey = () => "gulchSway" + amt; return mat;
}
// ---- rope: a chain of particles (positions solved with substepped XPBD), tethered so a taut rope is straight, with gentle bending stiffness ----
class RopeSim {
  constructor(n, L, kgPerM, endKg) {
    this.n = n; this.L = L; this.rest = L / (n - 1); this.scale = 1;
    this.x = new Float32Array(n * 3); this.p = new Float32Array(n * 3); this.v = new Float32Array(n * 3); this.w = new Float32Array(n); this.we = new Float32Array(n);
    for (let i = 0; i < n; i++) this.w[i] = 1 / (kgPerM * this.rest); this.w[n - 1] = 1 / endKg;
    this.pins = []; this.spheres = []; this.boxes = []; this.floor = () => 0.02;
    this.drag = 0.9; this.bend = 0.06; this.iters = 10; this.subs = 6; this.cut = -1; // cut: the link between particles cut and cut+1 is severed
  }
  pin(i, pos, smooth = 0) { let p = this.pins.find(q => q.i === i);
    if (!p) { p = { i, at: new THREE.Vector3(this.x[i * 3], this.x[i * 3 + 1], this.x[i * 3 + 2]), prev: new THREE.Vector3(), tgt: new THREE.Vector3() }; this.pins.push(p); p.prev.copy(p.at); p.tgt.copy(pos); }
    p.tgt.copy(pos); p.smooth = smooth; return p; }
  free(i) { this.pins = this.pins.filter(q => q.i !== i); }
  pinned(i) { return this.pins.some(q => q.i === i); }
  P(i, out) { return out.set(this.x[i * 3], this.x[i * 3 + 1], this.x[i * 3 + 2]); }
  step(dt) {
    if (dt <= 0) return; const S = this.subs, h = dt / S;
    for (const p of this.pins) { p.prev.copy(p.at); if (p.smooth > 0) p.at.lerp(p.tgt, 1 - Math.exp(-dt / p.smooth)); else p.at.copy(p.tgt); }
    for (let s = 0; s < S; s++) this.substep(h, (s + 1) / S);
  }
  substep(h, f) {
    const n = this.n, x = this.x, p = this.p, v = this.v, w = this.w, we = this.we, W = WIND.v, kd = 1 - Math.exp(-this.drag * h);
    we.set(w); for (const q of this.pins) we[q.i] = 0;
    for (let i = 0; i < n; i++) { const k = i * 3; p[k] = x[k]; p[k + 1] = x[k + 1]; p[k + 2] = x[k + 2]; if (!we[i]) continue;
      const kk = i === n - 1 ? kd * 0.35 : kd; v[k + 1] -= 9.81 * h; v[k] += (W.x - v[k]) * kk; v[k + 1] *= 1 - kk * 0.5; v[k + 2] += (W.z - v[k + 2]) * kk;
      x[k] += v[k] * h; x[k + 1] += v[k + 1] * h; x[k + 2] += v[k + 2] * h; }
    for (const q of this.pins) { const k = q.i * 3; x[k] = lerp(q.prev.x, q.at.x, f); x[k + 1] = lerp(q.prev.y, q.at.y, f); x[k + 2] = lerp(q.prev.z, q.at.z, f); }
    const r = this.rest * this.scale;
    for (let it = 0; it < this.iters; it++) {
      // stretch (hard) — alternate sweep direction so neither end drags
      for (let jj = 0; jj < n - 1; jj++) { const j = it & 1 ? n - 2 - jj : jj, a = j * 3, b = a + 3, ws = we[j] + we[j + 1]; if (!ws || j === this.cut) continue;
        const dx = x[b] - x[a], dy = x[b + 1] - x[a + 1], dz = x[b + 2] - x[a + 2], L = Math.hypot(dx, dy, dz) || 1e-9, c = (L - r) / L / ws;
        x[a] += dx * c * we[j]; x[a + 1] += dy * c * we[j]; x[a + 2] += dz * c * we[j]; x[b] -= dx * c * we[j + 1]; x[b + 1] -= dy * c * we[j + 1]; x[b + 2] -= dz * c * we[j + 1]; }
      // bending: soft pull toward straight over each pair of segments
      if (this.bend > 0) for (let j = 0; j < n - 2; j++) { const a = j * 3, b = a + 6, ws = we[j] + we[j + 2]; if (!ws || j === this.cut || j + 1 === this.cut) continue;
        const dx = x[b] - x[a], dy = x[b + 1] - x[a + 1], dz = x[b + 2] - x[a + 2], L = Math.hypot(dx, dy, dz) || 1e-9; if (L >= 2 * r) continue; const c = (L - 2 * r) / L / ws * this.bend;
        x[a] += dx * c * we[j]; x[a + 1] += dy * c * we[j]; x[a + 2] += dz * c * we[j]; x[b] -= dx * c * we[j + 2]; x[b + 1] -= dy * c * we[j + 2]; x[b + 2] -= dz * c * we[j + 2]; }
      // tethers: nothing can be farther from a pinned point than the rope between them allows (keeps a taut rope dead straight)
      for (const q of this.pins) { const a = q.i * 3, qs = q.i <= this.cut;
        for (let i = 0; i < n; i++) { if (!we[i] || (this.cut >= 0 && (i <= this.cut) !== qs)) continue; const b = i * 3, lim = Math.abs(i - q.i) * r, dx = x[b] - x[a], dy = x[b + 1] - x[a + 1], dz = x[b + 2] - x[a + 2], L = Math.hypot(dx, dy, dz);
          if (L > lim) { const c = (L - lim) / L; x[b] -= dx * c; x[b + 1] -= dy * c; x[b + 2] -= dz * c; } } }
    }
    this.collide();
    for (let i = 0; i < n; i++) { const k = i * 3; v[k] = (x[k] - p[k]) / h; v[k + 1] = (x[k + 1] - p[k + 1]) / h; v[k + 2] = (x[k + 2] - p[k + 2]) / h; }
  }
  collide() {
    const n = this.n, x = this.x, we = this.we, R = 0.02;
    for (let i = 0; i < n; i++) { if (!we[i]) continue; const k = i * 3;
      for (const s of this.spheres) { if (s.skip && i >= n - s.skip) continue; const dx = x[k] - s.c.x, dy = x[k + 1] - s.c.y, dz = x[k + 2] - s.c.z, d2 = dx * dx + dy * dy + dz * dz, rr = s.r + R;
        if (d2 < rr * rr) { const d = Math.sqrt(d2) || 1e-6, c = (rr - d) / d; x[k] += dx * c; x[k + 1] += dy * c; x[k + 2] += dz * c; } }
      for (const b of this.boxes) { if (b.off) continue; const px = x[k], py = x[k + 1], pz = x[k + 2];
        if (px > b.min.x - R && px < b.max.x + R && py > b.min.y - R && py < b.max.y + R && pz > b.min.z - R && pz < b.max.z + R) {
          const o = [px - (b.min.x - R), b.max.x + R - px, py - (b.min.y - R), b.max.y + R - py, pz - (b.min.z - R), b.max.z + R - pz]; let m = 0; for (let j = 1; j < 6; j++) if (o[j] < o[m]) m = j;
          if (m === 0) x[k] = b.min.x - R; else if (m === 1) x[k] = b.max.x + R; else if (m === 2) x[k + 1] = b.min.y - R; else if (m === 3) x[k + 1] = b.max.y + R; else if (m === 4) x[k + 2] = b.min.z - R; else x[k + 2] = b.max.z + R;
          // contact friction
          const p = this.p; x[k] = lerp(x[k], p[k], 0.3); x[k + 2] = lerp(x[k + 2], p[k + 2], 0.3); } }
      const fy = this.floor(x[k], x[k + 2], this.p[k + 1] - R) + R; if (x[k + 1] < fy) { x[k + 1] = fy; const p = this.p; x[k] = lerp(x[k], p[k], 0.5); x[k + 2] = lerp(x[k + 2], p[k + 2], 0.5); } }
  }
  save() { return { x: this.x.slice(), v: this.v.slice() }; }
  load(s) { this.x.set(s.x); this.v.fill(0); this.p.set(s.x); this.cut = -1; }
}
// ---- a tube mesh with a fixed vertex budget, re-skinned onto the particle chain each frame (Catmull-Rom smoothed, parallel-transport frames) ----
class RopeTube {
  constructor(nPts, sub, radial, radius, mat) {
    this.np = nPts; this.sub = sub; this.m = (nPts - 1) * sub + 1; this.rad = radial; this.r = radius;
    const nv = this.m * (radial + 1), g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(nv * 3), 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute("normal", new THREE.BufferAttribute(new Float32Array(nv * 3), 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(nv * 2), 2).setUsage(THREE.DynamicDrawUsage));
    const idx = []; for (let i = 0; i < this.m - 1; i++) for (let j = 0; j < radial; j++) { const a = i * (radial + 1) + j, b = a + radial + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); }
    g.setIndex(idx); this.geo = g; this.mesh = new THREE.Mesh(g, mat); this.mesh.frustumCulled = false; this.mesh.castShadow = true; this.mesh.receiveShadow = true;
    this.pts = Array.from({ length: this.m }, () => new THREE.Vector3()); this.N = new THREE.Vector3(1, 0, 0); this.T = new THREE.Vector3(); this.B = new THREE.Vector3();
  }
  update(src) { // src(i, out) gives control point i of nPts
    const m = this.m, S = this.sub, pts = this.pts, P0 = _v1, P1 = _v2, P2 = _v3, P3 = _v4;
    for (let i = 0; i < this.np - 1; i++) {
      src(Math.max(0, i - 1), P0); src(i, P1); src(i + 1, P2); src(Math.min(this.np - 1, i + 2), P3);
      if (i === 0) P0.copy(P1).multiplyScalar(2).sub(P2); if (i + 2 > this.np - 1) P3.copy(P2).multiplyScalar(2).sub(P1);
      for (let s = 0; s < S; s++) { const t = s / S, t2 = t * t, t3 = t2 * t, o = pts[i * S + s];
        o.set(0, 0, 0).addScaledVector(P0, -0.5 * t3 + t2 - 0.5 * t).addScaledVector(P1, 1.5 * t3 - 2.5 * t2 + 1).addScaledVector(P2, -1.5 * t3 + 2 * t2 + 0.5 * t).addScaledVector(P3, 0.5 * t3 - 0.5 * t2); }
    }
    src(this.np - 1, pts[m - 1]);
    const pos = this.geo.attributes.position.array, nor = this.geo.attributes.normal.array, uv = this.geo.attributes.uv.array, R = this.rad, T = this.T, N = this.N, B = this.B;
    let len = 0;
    for (let i = 0; i < m; i++) {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(m - 1, i + 1)]; T.subVectors(b, a).normalize(); if (i > 0) len += pts[i].distanceTo(pts[i - 1]);
      if (i === 0) { N.set(0, 0, 1); if (Math.abs(T.z) > 0.9) N.set(1, 0, 0); }
      N.addScaledVector(T, -N.dot(T)); if (N.lengthSq() < 1e-8) N.set(T.y, -T.x, 0.3).addScaledVector(T, -N.dot(T)); N.normalize(); B.crossVectors(T, N);
      for (let j = 0; j <= R; j++) { const a2 = j / R * TAU, c = Math.cos(a2), s = Math.sin(a2), k = (i * (R + 1) + j);
        const nx = N.x * c + B.x * s, ny = N.y * c + B.y * s, nz = N.z * c + B.z * s;
        nor[k * 3] = nx; nor[k * 3 + 1] = ny; nor[k * 3 + 2] = nz; pos[k * 3] = pts[i].x + nx * this.r; pos[k * 3 + 1] = pts[i].y + ny * this.r; pos[k * 3 + 2] = pts[i].z + nz * this.r;
        uv[k * 2] = j / R; uv[k * 2 + 1] = len * 3; }
    }
    this.geo.attributes.position.needsUpdate = true; this.geo.attributes.normal.needsUpdate = true; this.geo.attributes.uv.needsUpdate = true;
    this.geo.boundingSphere = null; this.length = len;
  }
}
// ---- trap leaves: uniform planks hinged on their outer edges; gravity swings them past vertical into the stops, then they settle like pendulums ----
function setTrapOpen(dt, target) {
  const w = LAY.trap.w / 2, G = 3 * 9.81 / (2 * w), STOP = Math.PI / 2 + 0.16;
  for (const d of GAL.doors) {
    if (!target) { d.ang = 0; d.vel = 0; d.slams = 0; d.pivot.rotation.z = 0; continue; }
    const sub = 8, h = dt / sub;
    for (let s = 0; s < sub; s++) {
      d.vel += (G * Math.cos(d.ang) - 0.55 * d.vel) * h; d.ang += d.vel * h;
      if (d.ang > STOP) { d.ang = STOP; const sp = d.vel; d.vel = -d.vel * 0.32;
        if (sp > 1.2) { const at = V3(LAY.trap.x + d.side * LAY.trap.w * 0.5, LAY.plat.h - w, LAY.trap.z);
          if (!d.slams) { if (d.side > 0) { Sound.bang(at); CAM.shake = Math.max(CAM.shake || 0, 0.7); kickLanterns(1); } } else if (sp > 2) Sound.knock(at, Math.min(1, sp / 6)); d.slams++; } }
      if (d.ang < 0) { d.ang = 0; d.vel = Math.abs(d.vel) * 0.2; }
    }
    d.pivot.rotation.z = d.side * d.ang;
  }
}
// ---- lanterns on the uprights swing on their hooks ----
function kickLanterns(k) { for (const L of GAL.swingers || []) { L.vx += (Math.random() - 0.5) * 0.9 * k; L.vz += (Math.random() - 0.5) * 1.4 * k; } }
function updateLanterns(dt) {
  const l = 0.24, g = 9.81 / l;
  for (const L of GAL.swingers || []) {
    const fx = WIND.v.x * Math.abs(WIND.v.x) * 0.9, fz = WIND.v.z * Math.abs(WIND.v.z) * 0.9; // drag pushes the lantern downwind
    L.vx += (-g * Math.sin(L.ax) - 0.7 * L.vx - fz * L.k) * dt; L.vz += (-g * Math.sin(L.az) - 0.7 * L.vz + fx * L.k) * dt; // +x wind tips the lantern toward +x
    L.ax += L.vx * dt; L.az += L.vz * dt; L.pv.rotation.set(L.ax, 0, L.az);
  }
}

// ---- a flag on a tall pole: a little cloth simulation (Verlet + distance constraints), pushed by the wind on each face ----
const FLAG = { on: false };
function flagTexture() { // the 38-star flag of the day, sun-faded
  const c = document.createElement("canvas"); c.width = 512; c.height = 320; const g = c.getContext("2d");
  for (let i = 0; i < 13; i++) { g.fillStyle = i % 2 ? "#e8e0cc" : "#9a2a24"; g.fillRect(0, i * 320 / 13, 512, 320 / 13 + 1); }
  g.fillStyle = "#24304e"; g.fillRect(0, 0, 220, 320 * 7 / 13);
  g.fillStyle = "#e8e0cc"; for (let r = 0; r < 6; r++) for (let k = 0; k < (r % 2 ? 6 : 7); k++) { const x = 16 + k * 31 + (r % 2 ? 15 : 0), y = 14 + r * 26; if (r * 7 + k > 37) continue; g.beginPath();
    for (let j = 0; j < 10; j++) { const a = -Math.PI / 2 + j * Math.PI / 5, rr = j % 2 ? 4 : 9; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } g.fill(); }
  g.globalCompositeOperation = "multiply"; const gr = g.createLinearGradient(0, 0, 512, 0); gr.addColorStop(0, "#fff"); gr.addColorStop(1, "#d8cfc0"); g.fillStyle = gr; g.fillRect(0, 0, 512, 320);
  return canvasTex(c);
}
function buildFlag(x, z) {
  const NX = 15, NY = 10, W = 1.9, H = 1.2, top = 9.2, y0 = groundHeight(x, z);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.07, top + 0.2, 10), MAT.woodDark); pole.position.set(x, y0 + (top + 0.2) / 2, z); pole.castShadow = true; R.scene.add(pole);
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 8), MAT.brass); ball.position.set(x, y0 + top + 0.28, z); R.scene.add(ball);
  const geo = new THREE.PlaneGeometry(W, H, NX - 1, NY - 1), n = NX * NY;
  const P = new Float32Array(n * 3), Q = new Float32Array(n * 3), pin = new Uint8Array(n), C = [];
  for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) { const k = j * NX + i; P[k * 3] = x + i / (NX - 1) * W; P[k * 3 + 1] = y0 + top - j / (NY - 1) * H; P[k * 3 + 2] = z; if (i === 0) pin[k] = 1; }
  Q.set(P); const id = (i, j) => j * NX + i, add = (a, b) => C.push([a, b, Math.hypot(P[a * 3] - P[b * 3], P[a * 3 + 1] - P[b * 3 + 1], P[a * 3 + 2] - P[b * 3 + 2])]);
  for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) { if (i < NX - 1) add(id(i, j), id(i + 1, j)); if (j < NY - 1) add(id(i, j), id(i, j + 1)); if (i < NX - 1 && j < NY - 1) { add(id(i, j), id(i + 1, j + 1)); add(id(i + 1, j), id(i, j + 1)); }
    if (i < NX - 2) add(id(i, j), id(i + 2, j)); if (j < NY - 2) add(id(i, j), id(i, j + 2)); }
  const mat = new THREE.MeshStandardMaterial({ map: flagTexture(), side: THREE.DoubleSide, roughness: 0.85 });
  const mesh = new THREE.Mesh(geo, mat); mesh.castShadow = true; mesh.receiveShadow = true; mesh.frustumCulled = false; R.scene.add(mesh);
  Object.assign(FLAG, { on: true, NX, NY, P, Q, pin, C, mesh, geo, n, t: Math.random() * 10, x, y0, z, top, W, H });
  for (let k = 0; k < 90; k++) updateFlag(1 / 60);
}
const _fn = new THREE.Vector3(), _fa = new THREE.Vector3(), _fb = new THREE.Vector3();
function updateFlag(dt) {
  const F = FLAG; if (!F.on || dt <= 0) return; F.t += dt;
  const sub = 3, h = Math.min(dt, 0.05) / sub, P = F.P, Q = F.Q, NX = F.NX, NY = F.NY, n = F.n;
  for (let s = 0; s < sub; s++) {
    // wind pressure on each little quad, along its normal, from the air moving past (gusty, with eddies coming off the pole)
    const acc = F.acc || (F.acc = new Float32Array(n * 3)); acc.fill(0);
    for (let j = 0; j < NY - 1; j++) for (let i = 0; i < NX - 1; i++) {
      const a = j * NX + i, b = a + 1, c = a + NX, d = c + 1;
      _fa.set(P[d * 3] - P[a * 3], P[d * 3 + 1] - P[a * 3 + 1], P[d * 3 + 2] - P[a * 3 + 2]); _fb.set(P[c * 3] - P[b * 3], P[c * 3 + 1] - P[b * 3 + 1], P[c * 3 + 2] - P[b * 3 + 2]);
      _fn.crossVectors(_fa, _fb); const area = _fn.length() * 0.5 || 1e-6; _fn.normalize();
      const turb = 0.6 + 0.5 * Math.sin(F.t * 3.1 + i * 0.7 + j * 0.3) + 0.3 * Math.sin(F.t * 7.3 - i * 1.3);
      const wx = WIND.v.x * 2.6 * turb, wz = WIND.v.z * 2.6 * turb + Math.sin(F.t * 1.7 + j) * 0.4;
      const vx = (P[a * 3] - Q[a * 3]) / h, vz = (P[a * 3 + 2] - Q[a * 3 + 2]) / h;
      const rel = _fn.x * (wx - vx) + _fn.z * (wz - vz), f = 1.1 * rel * Math.abs(rel) * area * 4;
      for (const k of [a, b, c, d]) { acc[k * 3] += _fn.x * f; acc[k * 3 + 1] += _fn.y * f; acc[k * 3 + 2] += _fn.z * f; }
    }
    for (let k = 0; k < n; k++) { if (F.pin[k]) continue; const i3 = k * 3;
      for (let c = 0; c < 3; c++) { const x = P[i3 + c], v = (x - Q[i3 + c]) * 0.992; Q[i3 + c] = x; P[i3 + c] = x + v + (acc[i3 + c] + (c === 1 ? -9.81 : 0)) * h * h; } }
    for (let it = 0; it < 6; it++) for (const [a, b, L] of F.C) {
      const dx = P[b * 3] - P[a * 3], dy = P[b * 3 + 1] - P[a * 3 + 1], dz = P[b * 3 + 2] - P[a * 3 + 2], D = Math.hypot(dx, dy, dz) || 1e-6, wa = F.pin[a] ? 0 : 1, wb = F.pin[b] ? 0 : 1, ws = wa + wb; if (!ws) continue;
      const k = (D - L) / D / ws; P[a * 3] += dx * k * wa; P[a * 3 + 1] += dy * k * wa; P[a * 3 + 2] += dz * k * wa; P[b * 3] -= dx * k * wb; P[b * 3 + 1] -= dy * k * wb; P[b * 3 + 2] -= dz * k * wb; }
  }
  const pos = F.geo.attributes.position; pos.array.set(P); pos.needsUpdate = true; F.geo.computeVertexNormals();
  // the geometry is in world space: keep the mesh transform identity
}
// ---- thin smoke from the stovepipes, carried off by the breeze ----
const SMOKE = { pts: null, list: [] };
function buildSmoke() {
  const srcs = WORLD.chimneys || []; if (!srcs.length) return;
  const per = 22, n = srcs.length * per, pos = new Float32Array(n * 3), alpha = new Float32Array(n), size = new Float32Array(n);
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(pos, 3)); g.setAttribute("alpha", new THREE.BufferAttribute(alpha, 1)); g.setAttribute("size", new THREE.BufferAttribute(size, 1));
  const m = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, uniforms: { map: { value: TEX.dust }, col: { value: new THREE.Color(0.5, 0.48, 0.47) }, scale: { value: 300 } },
    vertexShader: "attribute float alpha, size; varying float vA; uniform float scale; void main(){ vA = alpha; vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_PointSize = size * scale / -mv.z; gl_Position = projectionMatrix * mv; }",
    fragmentShader: "uniform sampler2D map; uniform vec3 col; varying float vA; void main(){ float a = texture2D(map, gl_PointCoord).a * vA; if (a < 0.004) discard; gl_FragColor = vec4(col, a); }" });
  SMOKE.pts = new THREE.Points(g, m); SMOKE.pts.frustumCulled = false; R.scene.add(SMOKE.pts);
  srcs.forEach((s, si) => { for (let k = 0; k < per; k++) SMOKE.list.push({ src: s, age: k / per * 7, life: 7, p: s.clone(), v: new THREE.Vector3(0, 0.6, 0) }); });
  for (let k = 0; k < 220; k++) updateSmoke(1 / 30); // already drifting when the curtain goes up
}
function updateSmoke(dt) {
  if (!SMOKE.pts) return; const g = SMOKE.pts.geometry, pos = g.attributes.position.array, al = g.attributes.alpha.array, sz = g.attributes.size.array;
  SMOKE.pts.material.uniforms.scale.value = R.h * R.dpr * 0.5 / Math.tan(THREE.MathUtils.degToRad(R.camera.fov) / 2);
  SMOKE.list.forEach((q, i) => {
    q.age += dt; if (q.age > q.life) { q.age = 0; q.p.copy(q.src); q.v.set((Math.random() - 0.5) * 0.1, 0.55 + Math.random() * 0.2, (Math.random() - 0.5) * 0.1); }
    q.v.x += (WIND.v.x * 0.8 - q.v.x) * dt * 0.6; q.v.z += (WIND.v.z * 0.8 - q.v.z) * dt * 0.6; q.v.y *= 1 - dt * 0.12;
    q.p.addScaledVector(q.v, dt); const u = q.age / q.life;
    pos[i * 3] = q.p.x; pos[i * 3 + 1] = q.p.y; pos[i * 3 + 2] = q.p.z; al[i] = 0.34 * Math.sin(Math.min(1, u * 6) * Math.PI / 2) * (1 - u); sz[i] = 0.3 + u * 2.4;
  });
  g.attributes.position.needsUpdate = true; g.attributes.alpha.needsUpdate = true; g.attributes.size.needsUpdate = true;
}
