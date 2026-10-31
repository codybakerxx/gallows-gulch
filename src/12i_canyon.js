// ---------- THE GETAWAY's end (12g): the canyon nobody mentioned, and the last of him ----------
// The canyon is cut across the trail out of the plain: a wandering rim on both sides, walls stepped the way canyon country weathers (a pale
// caprock cliff, talus, a bench, a tall red cliff, more talus, a dark inner gorge), banded, a river down at the bottom. The ground, the trail
// and anything standing in the way are cut away by the same rim (CANYON_GLSL for the shaders, canyonRim() here).
// The end is filmed: the last rider falls, a twirl and a shot in the air, you turn and see it, everything slows, and you're over. A low shot
// from the cliff face as the horse goes out over the drop against the sky, a look straight down from the rim as he falls away, the long
// view from across the canyon, and the sound coming back up. Letterboxed, no top bar.
const CANYON = { depth: 118, W: 172, step: 3, prof: [[18, 1.2, 1], [14, 11, 0], [3, 9, 0], [34, 2.5, 1], [17, 13, 0], [20, 3.5, 1], [12, 10, 0]] }; // (each: drop, setback, cliff?)
const RIM0 = 5.0 * Math.sin(1.3) + 2.6 * Math.sin(0.4) + 1.3 * Math.sin(2.1);
function canyonRim(lx, far) { return far ? 7.0 * Math.sin(lx * 0.024 + 4.1) + 3.0 * Math.sin(lx * 0.069 + 2.2) + 1.5 * Math.sin(lx * 0.17 + 0.7)
  : 5.0 * Math.sin(lx * 0.031 + 1.3) + 2.6 * Math.sin(lx * 0.083 + 0.4) + 1.3 * Math.sin(lx * 0.21 + 2.1) - RIM0; } // (metres toward the far side; the near rim crosses the trail where it should)
const CANYON_GLSL = `
  float canyonRimN(float x) { return 5.0 * sin(x * 0.031 + 1.3) + 2.6 * sin(x * 0.083 + 0.4) + 1.3 * sin(x * 0.21 + 2.1) - ${RIM0.toFixed(6)}; }
  float canyonRimF(float x) { return 7.0 * sin(x * 0.024 + 4.1) + 3.0 * sin(x * 0.069 + 2.2) + 1.5 * sin(x * 0.17 + 0.7); }
  bool inCanyon(vec3 w, mat4 inv, vec2 size) { vec3 cl = (inv * vec4(w, 1.0)).xyz; float lx = cl.x * size.x, lz = cl.z * size.y; return abs(cl.x) < 1.0 && lz > canyonRimN(lx) && lz < size.y + canyonRimF(lx); }`;
WORLD.canyonU.size = { value: new THREE.Vector2(1, 1) };

// rock up close: the strata in the vertex colours; a triplanar stone normal and grain on top, so a cliff a few metres away isn't smooth paint
function canyonMat() {
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.93, side: THREE.DoubleSide }), st = stoneTex();
  m.onBeforeCompile = sh => { sh.uniforms.rockN = { value: st.normalMap }; sh.uniforms.rockC = { value: st.map };
    sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nvarying vec3 vCP; varying vec3 vCN;")
      .replace("#include <worldpos_vertex>", "#include <worldpos_vertex>\nvCP = (modelMatrix * vec4(transformed, 1.0)).xyz; vCN = normalize(mat3(modelMatrix) * objectNormal);");
    sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\nvarying vec3 vCP; varying vec3 vCN; uniform sampler2D rockN, rockC;")
      .replace("#include <color_fragment>", `#include <color_fragment>
        vec3 cbw = pow(abs(normalize(vCN)), vec3(4.0)); cbw /= cbw.x + cbw.y + cbw.z; const float CS = 0.38;
        float cg = dot(texture2D(rockC, vCP.zy * CS).rgb * cbw.x + texture2D(rockC, vCP.xz * CS).rgb * cbw.y + texture2D(rockC, vCP.xy * CS).rgb * cbw.z, vec3(0.333));
        float cg2 = dot(texture2D(rockC, vCP.zy * 0.031 + 0.3).rgb * cbw.x + texture2D(rockC, vCP.xz * 0.031 + 0.3).rgb * cbw.y + texture2D(rockC, vCP.xy * 0.031 + 0.3).rgb * cbw.z, vec3(0.333));
        diffuseColor.rgb *= (0.55 + 0.9 * cg) * (0.75 + 0.5 * cg2);
        float streak = smoothstep(0.55, 0.85, cg2) * smoothstep(0.6, 0.1, abs(normalize(vCN).y)); diffuseColor.rgb *= 1.0 - 0.35 * streak; // (desert varnish down the cliffs)`)
      .replace("#include <normal_fragment_maps>", `#include <normal_fragment_maps>
        { vec3 tX = texture2D(rockN, vCP.zy * CS).xyz * 2.0 - 1.0, tY = texture2D(rockN, vCP.xz * CS).xyz * 2.0 - 1.0, tZ = texture2D(rockN, vCP.xy * CS).xyz * 2.0 - 1.0;
          vec3 pw = vec3(0.0, tX.y, tX.x) * cbw.x + vec3(tY.x, 0.0, tY.y) * cbw.y + vec3(tZ.x, tZ.y, 0.0) * cbw.z;
          vec3 tX2 = texture2D(rockN, vCP.zy * 0.09 + 0.5).xyz * 2.0 - 1.0, tY2 = texture2D(rockN, vCP.xz * 0.09 + 0.5).xyz * 2.0 - 1.0, tZ2 = texture2D(rockN, vCP.xy * 0.09 + 0.5).xyz * 2.0 - 1.0;
          pw += (vec3(0.0, tX2.y, tX2.x) * cbw.x + vec3(tY2.x, 0.0, tY2.y) * cbw.y + vec3(tZ2.x, tZ2.y, 0.0) * cbw.z) * 0.8; // (and a coarser grain under it)
          normal = normalize(normal + (viewMatrix * vec4(pw * 1.1, 0.0)).xyz); }`); };
  m.customProgramCacheKey = () => "gulchCanyon"; return m;
}
// the strata, top to bottom (depth below the rim, m): colour, and how it varies
const CANYON_BANDS = [[0, [0.9, 0.76, 0.58]], [18, [0.84, 0.62, 0.44]], [32, [0.78, 0.52, 0.36]], [36, [0.74, 0.34, 0.2]], [70, [0.62, 0.3, 0.21]], [87, [0.46, 0.34, 0.29]], [107, [0.55, 0.44, 0.34]]];
function canyonColor(depth, lx, cliff, frac, out) {
  let c = CANYON_BANDS[0][1]; for (const [d, col] of CANYON_BANDS) if (depth >= d) c = col;
  const thin = 0.88 + 0.08 * Math.sin(depth * 1.7 + 2.5 * tfbm(lx * 0.02, depth * 0.05, 2)) + 0.06 * Math.sin(depth * 4.3 + 1.1), n = 0.9 + 0.12 * tfbm(lx * 0.11 + depth, depth * 0.3, 2); // (beds within beds)
  const deep = 0.62 + 0.38 * Math.pow(1 - frac, 0.8), talus = cliff ? 1 : 0.92; // (deeper down, less sky gets in; talus is rubble: duller. The sun's own shadow does the rest)
  const k = thin * n * deep * talus; out[0] = c[0] * k; out[1] = c[1] * k * (cliff ? 1 : 0.97); out[2] = c[2] * k * (cliff ? 1 : 1.04); return out;
}
// lay the canyon across the trail sEdge metres along it
function placeCanyon(sEdge) {
  const C = CHASE, K = CHASE_CFG.cliff, Q = CANYON, e = trailAt(sEdge, 0, {}), n = V3(e.nx, 0, e.nz), h = V3(e.hx, 0, e.hz), W = Q.W; let half = K.half;
  for (const M of WORLD.mesas) { const dx = M.x - e.x, dz = M.z - e.z, lx = dx * n.x + dz * n.z, lz = dx * h.x + dz * h.z; if (Math.abs(lz - W / 2) < W / 2 + M.r + 20) half = Math.min(half, Math.max(70, Math.abs(lx) - M.r)); }
  half = Math.floor(half / Q.step) * Q.step;
  const P = (lx, lz, y, out = V3()) => out.set(e.x + n.x * lx + h.x * lz, y, e.z + n.z * lx + h.z * lz), top = (lx, lz) => { const q = P(lx, lz, 0); return groundVis(q.x, q.z); };
  let lo = Infinity; for (let lx = -half; lx <= half; lx += Q.step) lo = Math.min(lo, top(lx, canyonRim(lx, false)), top(lx, W + canyonRim(lx, true))); const floor = lo - Q.depth;
  // the profile, sampled: [depth fraction, setback, cliff?]
  const prof = []; { const tot = Q.prof.reduce((a, p) => a + p[0], 0); let d = 0, sb = 0; prof.push([0, 0, 1]);
    for (const [drop, set, cliff] of Q.prof) { const ns = cliff ? 7 : 4; for (let i = 1; i <= ns; i++) { const u = i / ns; prof.push([(d + drop * u) / tot, sb + set * (cliff ? u : Ease.sine(u)), cliff]); } d += drop; sb += set; } Q.sbTot = sb; }
  const pos = [], col = [], idx = [], cc = [0, 0, 0], rows = prof.length;
  const wall = (cols, place) => { const b = pos.length / 3; // cols: list of lx; place(lx, setback, y) → world point
    for (const lx of cols) { for (let j = 0; j < rows; j++) { const [fr, sb0, cliff] = prof[j], t0 = place.top(lx), y = lerp(t0, floor, fr), depth = (t0 - y);
        const bed = cliff ? 0.8 * smoothstep(0.6, 0.82, ((depth + 2.5 * tfbm(lx * 0.012 + place.seed, 1.7, 2)) / 6.3) % 1) : 0; // (hard beds stand out, the soft ones between weather back)
        const fl = j === 0 ? 0 : (2.2 * tfbm(lx * 0.045 + place.seed, depth * 0.03, 3) + (cliff ? 1.3 * tfbm(lx * 0.38 + place.seed * 3, depth * 0.016, 2) : 0) + bed) * Math.min(1, fr * 12); // (buttresses and alcoves; gullies down the cliffs)
        const fine = j === 0 ? 0 : 0.55 * tfbm(lx * 0.31 + place.seed * 5, depth * 0.27, 2) * Math.min(1, fr * 12), rec = smoothstep(0.4, 2.6, fl + fine - 1.2 * tfbm(lx * 0.045 + place.seed, depth * 0.03 + 5, 2)); // (the recesses: darker)
        const q = place.at(lx, sb0 + fl + fine, y); pos.push(q.x, q.y, q.z); canyonColor(depth, lx, cliff, fr, cc); const ao = 1 - 0.3 * rec; col.push(cc[0] * ao, cc[1] * ao, cc[2] * ao); } }
    for (let i = 0; i < cols.length - 1; i++) for (let j = 0; j < rows - 1; j++) { const a = b + i * rows + j, c = a + rows; idx.push(a, a + 1, c, a + 1, c + 1, c); } };
  const xs = []; for (let lx = -half; lx <= half + 0.01; lx += Q.step) xs.push(lx);
  wall(xs, { seed: 3, top: lx => top(lx, canyonRim(lx, false)), at: (lx, sb, y) => P(lx, canyonRim(lx, false) + sb, y) });                        // the near wall
  wall(xs.slice().reverse(), { seed: 9, top: lx => top(lx, W + canyonRim(lx, true)), at: (lx, sb, y) => P(lx, W + canyonRim(lx, true) - sb, y) }); // the far wall
  for (const e2 of [-1, 1]) { const zs = [], z0 = canyonRim(e2 * half, false), z1 = W + canyonRim(e2 * half, true); for (let lz = z0; lz <= z1 + 0.01; lz += (z1 - z0) / 40) zs.push(lz); // the ends
    if (e2 > 0) zs.reverse(); wall(zs, { seed: 15 + e2, top: lz => top(e2 * half, lz), at: (lz, sb, y) => P(e2 * (half - sb), lz, y) }); }
  // the floor: gravel and sand between the walls' feet, and the river winding down it
  { const b = pos.length / 3, nz = 14; for (const lx of xs) { const z0 = canyonRim(lx, false) + Q.sbTot, z1 = W + canyonRim(lx, true) - Q.sbTot;
      for (let j = 0; j <= nz; j++) { const lz = lerp(z0 - 2, z1 + 2, j / nz), q = P(lx, lz, floor + 0.6 * tfbm(lx * 0.08, lz * 0.08, 2) - 0.4); pos.push(q.x, q.y, q.z); const k = 0.38 + 0.08 * tfbm(lx * 0.2, lz * 0.2, 2); col.push(k * 1.05, k * 0.93, k * 0.8); } }
    for (let i = 0; i < xs.length - 1; i++) for (let j = 0; j < nz; j++) { const a = b + i * (nz + 1) + j, c = a + nz + 1; idx.push(a, c, a + 1, a + 1, c, c + 1); } }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx); g.computeVertexNormals();
  if (!C.canyon) { C.canyon = new THREE.Mesh(g, canyonMat()); C.canyon.receiveShadow = true; C.canyon.castShadow = true; C.canyon.userData.dyn = true; C.canyon.frustumCulled = false; R.scene.add(C.canyon); }
  else { C.canyon.geometry.dispose(); C.canyon.geometry = g; } C.canyon.visible = true;
  { const rp = [], ri = [], RW = 6.5; for (let i = 0; i < xs.length; i++) { const lx = xs[i], z0 = canyonRim(lx, false) + Q.sbTot, z1 = W + canyonRim(lx, true) - Q.sbTot, mid = lerp(z0, z1, 0.5 + 0.22 * Math.sin(lx * 0.013 + 1.1)), w = RW * (1 + 0.25 * Math.sin(lx * 0.05));
      for (const s of [-1, 1]) { const q = P(lx, mid + s * w, floor + 0.15); rp.push(q.x, q.y, q.z); } if (i < xs.length - 1) { const a = i * 2; ri.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); } }
    const rg = new THREE.BufferGeometry(); rg.setAttribute("position", new THREE.Float32BufferAttribute(rp, 3)); rg.setIndex(ri); rg.computeVertexNormals();
    if (!C.river) { C.river = new THREE.Mesh(rg, new THREE.MeshStandardMaterial({ color: 0x1b3433, roughness: 0.12, metalness: 0.0, envMapIntensity: 1.2, normalMap: TEX.fabric.normalMap, normalScale: new THREE.Vector2(0.15, 0.15) })); C.river.userData.dyn = true; C.river.frustumCulled = false; R.scene.add(C.river); }
    else { C.river.geometry.dispose(); C.river.geometry = rg; } C.river.visible = true; }
  C.canyonAt = { p: V3(e.x, groundVis(e.x, e.z), e.z), n, h, floor, W, half };
  const M = new THREE.Matrix4().makeBasis(n.clone().multiplyScalar(half), V3(0, 1, 0), h.clone().multiplyScalar(W)).setPosition(e.x, 0, e.z); WORLD.canyonU.inv.value.copy(M).invert(); WORLD.canyonU.size.value.set(half, W); WORLD.canyonU.on.value = 1;
  canyonClearScenery(true);
}
// the desert's bushes and rocks (12h) that would stand over the drop: tucked away while the canyon's there. v40: and anything else that
// would be left hanging over it with the ground cut away from under it. The trail curls back, and the canyon's far end reaches the town:
// its buildings, porches, props and tufts were left floating over the drop in the long views of the fall. All of it goes while the canyon's
// there (an instanced mesh loses just the copies over the drop), and comes back with the town
function canyonClearScenery(on) {
  const C = CHASE, Mi = new THREE.Matrix4(), Z = new THREE.Matrix4().makeScale(0, 0, 0), v = new THREE.Vector3(), A = C.canyonAt;
  const over = (x, z, m = 2.5) => { const dx = x - A.p.x, dz = z - A.p.z, lx = dx * A.n.x + dz * A.n.z, lz = dx * A.h.x + dz * A.h.z; return Math.abs(lx) < A.half + m + 1 && lz > canyonRim(lx, false) - m && lz < A.W + canyonRim(lx, true) + m; };
  if (!on) { for (const o of C.canyonHid || []) o.visible = true; C.canyonHid = [];
    for (const im of C.canyonIm || []) if (im.userData.canyonSaved) { im.instanceMatrix.array.set(im.userData.canyonSaved); im.instanceMatrix.needsUpdate = true; } C.canyonIm = []; }
  for (const im of C.scenery || []) { if (on && !im.userData.saved) im.userData.saved = im.instanceMatrix.array.slice(); if (!on) { if (im.userData.saved) { im.instanceMatrix.array.set(im.userData.saved); im.instanceMatrix.needsUpdate = true; } continue; }
    let ch = false; for (let i = 0; i < im.count; i++) { im.getMatrixAt(i, Mi); v.setFromMatrixPosition(Mi); if (over(v.x, v.z)) { im.setMatrixAt(i, Z); ch = true; } }
    if (ch) im.instanceMatrix.needsUpdate = true; }
  if (!on) return;
  // everything else standing in the scene: not the canyon, the river, the sky or the ground (cut by the canyon's own shader), nor anything that moves
  const keep = new Set([C.canyon, C.river, ...(C.scenery || [])]), mov = [C.horse && C.horse.grp, MAN && MAN.root, ...(C.riders || []).flatMap(R0 => [R0.a.root, R0.H.grp, R0.gun])];
  for (const r of mov) if (r) r.traverse(o => keep.add(o));
  C.canyonHid = []; C.canyonIm = [];
  R.scene.traverse(o => { if (!o.isMesh || keep.has(o) || !o.visible || o.userData.dyn || o.isSkinnedMesh || !o.frustumCulled || !o.geometry) return; // (not the effects drawn in world space: beams, ropes, the trail's ribbon)
    if (!o.geometry.boundingSphere) o.geometry.computeBoundingSphere(); const bs = o.geometry.boundingSphere; o.updateMatrixWorld();
    if (o.isInstancedMesh) { let ch = false; for (let i = 0; i < o.count; i++) { o.getMatrixAt(i, Mi); Mi.premultiply(o.matrixWorld); v.setFromMatrixPosition(Mi); if (!over(v.x, v.z)) continue;
        if (!ch) { ch = true; o.userData.canyonSaved = o.instanceMatrix.array.slice(); C.canyonIm.push(o); } o.setMatrixAt(i, Z); }
      if (ch) o.instanceMatrix.needsUpdate = true; return; }
    if (bs.radius * o.matrixWorld.getMaxScaleOnAxis() > 250) return; // (the ground, the sky, the far mesas' plain)
    v.copy(bs.center).applyMatrix4(o.matrixWorld); if (over(v.x, v.z, 6)) { o.visible = false; C.canyonHid.push(o); } });
}
function canyonClear() { const C = CHASE; if (C.canyon) C.canyon.visible = false; if (C.river) C.river.visible = false; WORLD.canyonU.on.value = 0; if (C.canyonAt) canyonClearScenery(false); canyonShadow(false); for (const p of C.pebbles || []) p.m.visible = false; }
// at the end the sun's shadows cover the whole canyon (the rim's shadow down the far wall, the depths in shade), not just round the horse
function canyonShadow(on) { SKY.fogK = on ? 0.5 : 1; SKY.hemiK = on ? 2.4 : 1; setDusk(STATE.dusk); // (the air clears for the long views across, and the sunlit rock lights the shade)
  const sc = SKY.sun.shadow.camera, k = on ? 170 : 15; if (sc.right === k) return; sc.left = sc.bottom = -k; sc.right = sc.top = k; sc.far = on ? 700 : 160; sc.updateProjectionMatrix();
  SKY.sun.shadow.bias = on ? -0.0012 : -0.0004; SKY.sun.shadow.normalBias = on ? 0.3 : 0.035;
}

// ---- the end, filmed ----
function beginVictory() {
  const C = CHASE, K = CHASE_CFG.cliff; if (!chaseState("victory")) return; C.attacker = null; C.lasso.fly = null; chaseUI("end"); $("chaseRet").hidden = true;
  const v = CHASE_CFG.speed2, sEdge = C.s + v * (K.celebrate + K.turn) + v * K.beat * K.slow + 1.0;
  for (let i = C.obs.length - 1; i >= 0; i--) if (C.obs[i].s > C.s - 1) { dropObstacle(C.obs[i]); C.obs.splice(i, 1); } // (nothing ahead now but the trail)
  placeCanyon(sEdge); C.cine = { t: 0, sEdge, phase: "celebrate", skip: !!STATE.cliffSeen, fell: false, impact: false };
  $("chaseSkip").hidden = !C.cine.skip; Sound.victory(); C.speed = v;
}
const CINE = { leap: 2.3, slow: 0.26, down: 4.0, wide: 4.0 }; // (the fall, in real seconds from the edge: the slow leap to here, then straight down, then the long view; how slow the leap)
function updateVictory(rdt, dt) {
  const C = CHASE, K = CHASE_CFG.cliff, V = C.cine; V.t += rdt;
  const t1 = K.celebrate, t2 = t1 + K.turn, t3 = t2 + K.beat; let k = 1;
  if (V.phase !== "fall") {
    if (V.t < t1) { C.yawOff = Math.PI; } else if (V.t < t2) { C.yawOff = Math.PI * (1 - Ease.inOut((V.t - t1) / K.turn)); } else { C.yawOff = 0; k = K.slow; } // the realization: slow
    if (V.t > t1 && !V.shadowed) { V.shadowed = true; canyonShadow(true); }
    C.s += C.speed * rdt * k; C.lat += (0 - C.lat) * Math.min(1, rdt * 2); placeHorse(C.horse, C.s, C.lat, 0, C.speed * k, rdt * k, 0); if (V.t < t3) gallopFeet(C.horse, rdt * k, null, 0.8);
    Sound.rush(k); if (V.t >= t2 && !V.zoom) { V.zoom = true; Sound.duck(0.05, 0.3); Sound.horseSnort(C.horse.grp.position); }
    if (C.s >= V.sEdge) { // over: the ground's gone, and he goes out over it in a leap
      V.phase = "fall"; V.ft = 0; V.st = 0; const hh = trailAt(V.sEdge, C.lat, _tA); V.p = C.horse.grp.position.clone(); V.v = V3(hh.hx, 0, hh.hz).multiplyScalar(C.speed * 0.95); V.v.y = 3.4; V.rot = -0.3;
      MAN.root.visible = true; MAN.ride = true; MAN.hang = null; Sound.rush(0); V.shot = null; C.scream = Sound.track("scream0", 1.6, 6, 0.4);
      canyonPebbles(V.p, V.v); kickDust(V.p, 24, 1.6, 1.2, 1.4, 1.8); } }
  else { V.ft += rdt; const ts = V.ft < CINE.leap - 0.6 ? CINE.slow : V.ft < CINE.leap ? lerp(CINE.slow, 1, Ease.inOut((V.ft - (CINE.leap - 0.6)) / 0.6)) : 1, sdt = rdt * ts; V.ts = ts; V.st += sdt;
    const H = C.horse; V.v.y -= 9.81 * sdt; V.p.addScaledVector(V.v, sdt); V.rot = Math.min(1.35, V.rot + sdt * (V.st < 0.5 ? 0.3 : 0.5));
    H.grp.position.copy(V.p); H.grp.rotation.set(V.rot, H.yaw, Math.sin(V.st * 2.6) * 0.18, "YXZ"); H.act.timeScale = 2.6; H.mixer.update(sdt); H.grp.updateMatrixWorld(true); horseTackUpdate(H, sdt);
    canyonPebblesUpdate(sdt); updateChaseDust(sdt - rdt); // (the dust off the rim hangs in the slow motion)
    if (C.scream) { C.scream.set(MAN.ch.bones.Head.getWorldPosition(_c1)); C.scream.level(1 - 0.55 * clamp((V.ft - 1.0) / 4.0, 0, 1)); }
    if (!V.impact && V.p.y < C.canyonAt.floor + 1.5) { V.impact = true; V.it = V.ft; Sound.clip("canyon0", V.p.clone(), 2.4, 0, 0.6, 1, 25); if (C.scream) { C.scream.stop(0.15); C.scream = null; }
      kickDust(V.p, 60, 5, 3, 6, 4.5); H.grp.visible = false; horseTackShow(H, false); MAN.root.visible = false; } // (far below, all you see is the dust go up)
    if (V.impact && V.ft - V.it > K.pause) { const f = clamp((V.ft - V.it - K.pause) / K.fade, 0, 1); $("chaseFade").hidden = false; $("chaseFade").style.opacity = f.toFixed(3); if (f >= 1) { STATE.cliffSeen = true; savePrefs(); chaseResults(true); } } }
}
function chaseSkipCine() { const C = CHASE; if (C.state !== "victory" || !C.cine || !C.cine.skip) return; if (C.scream) { C.scream.stop(0.1); C.scream = null; } chaseResults(true); }
// stones off the rim, going over with him
function canyonPebbles(p, v) {
  const C = CHASE; if (!C.pebbles) { const mat = runRockMat(); C.pebbles = Array.from({ length: 9 }, (_, i) => { const m = new THREE.Mesh(boulderGeo(200 + i * 13), mat); m.castShadow = true; m.userData.dyn = true; m.visible = false; R.scene.add(m); return { m, v: V3(), w: V3() }; }); }
  C.pebbles.forEach((P, i) => { if (i > 5) { P.m.visible = false; return; } const s = 0.035 + Math.random() * 0.06; P.m.scale.setScalar(s); P.m.position.copy(p).add(_c1.set(rnd(-1.2, 1.2), rnd(-0.2, 0.4), rnd(-0.6, 0.8))); P.v.copy(v).multiplyScalar(rnd(0.35, 0.8)); P.v.y = rnd(0.5, 2.5);
    P.w.set(rnd(-6, 6), rnd(-6, 6), rnd(-6, 6)); P.m.visible = true; }); // (a few small stones: up close in the slow shot, more would read as blots)
}
function canyonPebblesUpdate(dt) { for (const P of CHASE.pebbles || []) { if (!P.m.visible) continue; P.v.y -= 9.81 * dt; P.m.position.addScaledVector(P.v, dt); P.m.rotation.x += P.w.x * dt; P.m.rotation.y += P.w.y * dt; if (P.m.position.y < CHASE.canyonAt.floor) P.m.visible = false; } }
// the shots: where the camera is, what it looks at, its field of view (and focus), this frame. null: through his eyes still
function cineShot(rdt) {
  const C = CHASE, V = C.cine; if (!V || V.phase !== "fall") return null; const A = C.canyonAt, H = C.horse.grp.position, ft = V.ft;
  // which side to film from: the one that looks toward the low sun, so they go over against the glow
  if (!V.side) { const s = A.n.x * SKY.sunDir.x + A.n.z * SKY.sunDir.z; V.side = s > 0 ? -1 : 1; }
  const n = _c2.copy(A.n).multiplyScalar(V.side), out = V.out || (V.out = { pos: V3(), tgt: V3(), fov: 40, up: V3(0, 1, 0), dof: null });
  if (ft < CINE.leap) { // the leap: out over the drop in front of them, looking back at the cliff as they come off it at you
    const base = _c3.copy(A.p).addScaledVector(A.h, 13).addScaledVector(n, 6.5); base.y = A.p.y - 0.8 - ft * 0.9; out.pos.copy(base);
    out.tgt.copy(H).add(_c4.set(0, 0.7, 0)); out.fov = 40 - ft * 2.5; out.up.set(0, 1, 0); out.dof = { focus: out.pos.distanceTo(out.tgt), ap: 2.2 }; }
  else if (ft < CINE.down) { // straight down from the rim: they fall away into it, the river a thread at the bottom
    out.pos.copy(A.p).addScaledVector(A.h, -0.6).addScaledVector(n, 0.8); out.pos.y = A.p.y + 3.4; out.tgt.copy(H); out.fov = 46; out.up.copy(A.h); out.dof = null; }
  else { // the long view, from far down the canyon: both walls running away into the haze, the river at the bottom, the tiny figure going down the cliff, the dust when it's done
    const u = clamp((ft - CINE.down) / 4, 0, 1); out.pos.copy(A.p).addScaledVector(n, 150 - u * 12).addScaledVector(A.h, A.W * 0.42); out.pos.y = A.p.y - 32 - u * 14;
    out.tgt.copy(A.p).addScaledVector(A.h, 22); out.tgt.y = lerp(A.p.y - 46, Math.max(A.floor + 6, H.y), 0.3 + 0.35 * u); out.fov = 40 - u * 2; out.up.set(0, 1, 0); out.dof = null; } // (tilting down after him to the floor)
  return out;
}
// the man himself, seen going over: still in the saddle, leaning back, arms everywhere
function poseFallingMan() {
  const C = CHASE, a = MAN, H = C.horse, B = a.ch.bones, t = C.cine.st; a.pos.copy(H.grp.position); a.yaw = H.yaw; a.root.position.copy(H.grp.position); a.root.rotation.set(0, H.yaw, 0); a.root.updateMatrixWorld(true);
  const up = saddlePt(H, 0, 1.45, 0.1, V3()), fl = clamp(t * 1.4, 0, 1);
  seatRider(a, H, { lean: lerp(0.1, -0.45, fl), L: up.clone().add(V3(Math.sin(t * 11) * 0.45 * fl + 0.3, Math.cos(t * 9) * 0.3 * fl - 0.5 * (1 - fl), 0.3)), R: up.clone().add(V3(-Math.sin(t * 13) * 0.45 * fl - 0.3, Math.sin(t * 7) * 0.3 * fl - 0.5 * (1 - fl), -0.3)) });
  const U = a.ch.skin.userData.U; if (U.fear) U.fear.value = 1; if (U.jaw) U.jaw.value = 0.55 + 0.1 * Math.sin(t * 20);
}
