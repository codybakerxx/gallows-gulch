// ---------- LIFE: horse, vultures, tumbleweed, dust, townsfolk ----------
const LIFE = { horse: null, birds: [], weed: null, dust: null, puffs: [], crowd: [] };
// the bind pose only: three's bounds for relative morph targets add every target's full offset and come out several times too big
function baseBox(g) { const p = g.attributes.position, b = new THREE.Box3(); for (let i = 0; i < p.count; i++) b.expandByPoint(_v1.set(p.getX(i), p.getY(i), p.getZ(i))); return b; }
// weld the model's split triangles so it can be smooth-shaded (positions, uvs, colours and every morph target must agree)
function weldMorph(g) {
  const p = g.attributes.position, n = p.count, key = new Map(), remap = new Int32Array(n), keep = [];
  for (let i = 0; i < n; i++) { const k = `${p.getX(i).toFixed(3)},${p.getY(i).toFixed(3)},${p.getZ(i).toFixed(3)}`; let j = key.get(k); if (j === undefined) { j = keep.length; key.set(k, j); keep.push(i); } remap[i] = j; }
  const out = new THREE.BufferGeometry(), pick = a => { const it = a.itemSize, arr = new Float32Array(keep.length * it); keep.forEach((src, d) => { for (let c = 0; c < it; c++) arr[d * it + c] = a.array[src * it + c]; }); return new THREE.BufferAttribute(arr, it, a.normalized); };
  for (const nm of Object.keys(g.attributes)) if (nm !== "normal") out.setAttribute(nm, pick(g.attributes[nm]));
  out.morphAttributes.position = (g.morphAttributes.position || []).map(pick); out.morphTargetsRelative = g.morphTargetsRelative;
  const idx = []; for (let i = 0; i < (g.index ? g.index.count : n); i++) idx.push(remap[g.index ? g.index.getX(i) : i]); out.setIndex(idx);
  out.computeVertexNormals(); return out;
}
function prepHorse(gltf) {
  let mesh; gltf.scene.traverse(o => { if (o.isMesh) mesh = o; });
  let g = subdivideMorph(weldMorph(mesh.geometry), 0.75); // (a smoother body: one level of Loop subdivision, morph targets and all; 10b)
  const bb = baseBox(g), h = bb.max.y - bb.min.y, s = 2.2 / h; // ~2.2 m to the top of the head
  { // the horse's own frame (metres, on the ground): fold the paddle of a tail into the dock, normals for every pose, and where the tack attaches
    const M = new THREE.Matrix4().makeScale(s, s, s).premultiply(new THREE.Matrix4().makeTranslation(0, -bb.min.y * s, 0)), P = g.attributes.position, v = new THREE.Vector3();
    const isTail = q => q.z < -1.27 && q.y > 1.15; let dockI = 0, dBest = 1e9;
    for (let i = 0; i < P.count; i++) { v.fromBufferAttribute(P, i).applyMatrix4(M); if (isTail(v)) continue; const d = v.distanceToSquared(_v1.set(0, 1.62, -1.18)); if (d < dBest) { dBest = d; dockI = i; } }
    foldTail(g, M, isTail, dockI); g.computeVertexNormals(); morphNormals(g); HORSE.geo = g; HORSE.M = M; HORSE.s = s; prepHorseRig(g, M); }
  mesh.geometry = g; mesh.updateMorphTargets();
  // a bay: warm brown coat with a soft sheen, darker legs, mane and tail (from the bind pose, so it rides with the gallop)
  const m = new THREE.MeshPhysicalMaterial({ color: 0x6a3f24, roughness: 0.55, sheen: 0.6, sheenRoughness: 0.45, sheenColor: new THREE.Color(0x8a5a3a) });
  const y0 = bb.min.y.toFixed(1), y1 = bb.max.y.toFixed(1), z0 = bb.min.z.toFixed(1), z1 = bb.max.z.toFixed(1);
  m.onBeforeCompile = sh => {
    sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nvarying vec3 vBind;").replace("#include <begin_vertex>", "#include <begin_vertex>\nvBind = position;");
    sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\nvarying vec3 vBind;").replace("#include <map_fragment>", `#include <map_fragment>
      float hy = (vBind.y - ${y0}) / (${y1} - ${y0}), hz = (vBind.z - ${z0}) / (${z1} - ${z0});
      float legs = 1.0 - smoothstep(0.18, 0.34, hy), mane = smoothstep(0.78, 0.9, hy) * smoothstep(0.55, 0.75, hz), tail = smoothstep(0.25, 0.08, hz) * smoothstep(0.35, 0.5, hy);
      float dk = max(legs * 0.85, max(mane, tail));
      diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.045, 0.032, 0.025), dk);
      diffuseColor.rgb *= 0.92 + 0.08 * sin(vBind.x * 0.3) * sin(vBind.z * 0.21);`);
  };
  mesh.material = m; mesh.castShadow = true; mesh.receiveShadow = true; mesh.frustumCulled = false;
  const grp = new THREE.Group(); grp.add(gltf.scene); gltf.scene.scale.setScalar(s); gltf.scene.position.y = -bb.min.y * s; grp.visible = false;
  R.scene.add(grp);
  const mixer = new THREE.AnimationMixer(gltf.scene); const act = mixer.clipAction(gltf.animations[0]); act.play();
  LIFE.horse = { grp, mesh, mixer, act, t: 0, wait: 12 + Math.random() * 10, run: null, stepT: 0, dustT: 0 };
}
// now and then a loose horse bolts in from the side of town and gallops off down the street into the sunset
function updateHorse(dt) {
  const H = LIFE.horse; if (!H) return;
  if (!H.run) { H.wait -= dt; if (H.wait > 0) return;
    const pts = [streetPt(-3, 24), streetPt(14, 2.5 + Math.random()), streetPt(110, -1 + Math.random() * 2)].map(q => V3(q[0], 0, q[1]));
    H.run = { pts, seg: 0, d: 0, v: 5 }; H.grp.visible = true; H.yaw = Math.atan2(pts[1].x - pts[0].x, pts[1].z - pts[0].z); if (!H.tack) horseTack(H, { saddle: false }); horseTackShow(H, true); }
  const Rn = H.run; let a = Rn.pts[Rn.seg], b = Rn.pts[Rn.seg + 1], len = a.distanceTo(b);
  Rn.v = Math.min(7.5, Rn.v + dt * 3); Rn.d += Rn.v * dt;
  if (Rn.d >= len) { Rn.d -= len; Rn.seg++; if (Rn.seg >= Rn.pts.length - 1) { H.run = null; H.grp.visible = false; horseTackShow(H, false); H.wait = 45 + Math.random() * 40; return; } a = Rn.pts[Rn.seg]; b = Rn.pts[Rn.seg + 1]; len = a.distanceTo(b); }
  const p = _v1.copy(a).lerp(b, Rn.d / len); p.y = groundHeight(p.x, p.z); H.grp.position.copy(p);
  const want = Math.atan2(b.x - a.x, b.z - a.z), dy = ((want - H.yaw + Math.PI) % TAU + TAU) % TAU - Math.PI; H.yaw += dy * Math.min(1, dt * 2.2);
  H.grp.rotation.set(0, H.yaw, -dy * 0.25); // leans into the turn
  H.act.timeScale = Rn.v / 4.0; H.mixer.update(dt); H.grp.updateMatrixWorld(true); horseTackUpdate(H, dt);
  H.stepT += dt * Rn.v / 4.0; if (H.stepT > 0.375) { H.stepT = 0; Sound.hoof(H.grp.position); }
  H.dustT -= dt; if (H.dustT < 0 && LIFE.puffs.length < 50) { H.dustT = 0.2; puff(_v2.copy(p).add(_v3.set((Math.random() - 0.5) * 0.4, 0.15, (Math.random() - 0.5) * 0.4)), 5, 0.7, 0.4, 2.2, 0.5); }
}
function prepBirds(gltf) {
  for (let i = 0; i < 2; i++) {
    const scn = i === 0 ? gltf.scene : THREE.SkeletonUtils.clone(gltf.scene); let mesh; scn.traverse(o => { if (o.isMesh) mesh = o; });
    const bb = baseBox(mesh.geometry), span = Math.max(bb.max.x - bb.min.x, bb.max.z - bb.min.z);
    mesh.material = new THREE.MeshStandardMaterial({ color: 0x141110, roughness: 0.9 }); mesh.frustumCulled = false; mesh.castShadow = true;
    scn.scale.setScalar(1.9 / span); const grp = new THREE.Group(); grp.add(scn); R.scene.add(grp);
    const mixer = new THREE.AnimationMixer(scn); const act = mixer.clipAction(gltf.animations[0]); act.play(); act.timeScale = 0.55; act.time = i * 0.4;
    LIFE.birds.push({ grp, mixer, r: 16 + i * 9, h: 26 + i * 7, a: i * 2.4, w: (0.11 - i * 0.03) * (i ? -1 : 1), caw: 6 + i * 5 });
  }
}
function updateBirds(dt) {
  for (const b of LIFE.birds) { b.a += b.w * dt; const x = LAY.plat.x + Math.cos(b.a) * b.r, z = LAY.plat.z + Math.sin(b.a) * b.r, y = b.h + Math.sin(b.a * 2) * 1.5;
    b.grp.position.set(x, y, z); b.grp.rotation.set(0, -b.a + (b.w > 0 ? 0 : Math.PI), (b.w > 0 ? -0.35 : 0.35));
    b.mixer.update(dt * (0.6 + 0.4 * Math.max(0, Math.sin(b.a * 3)))); b.caw -= dt; if (b.caw < 0) { b.caw = 9 + Math.random() * 14; Sound.caw(b.grp.position); } }
}
function buildWeed() {
  const r = rng(12), parts = [];
  for (let i = 0; i < 70; i++) {
    const pts = []; let p = V3((r() - 0.5) * 0.5, (r() - 0.5) * 0.5, (r() - 0.5) * 0.5).clampLength(0, 0.33);
    for (let k = 0; k < 5; k++) { pts.push(p.clone()); p = p.clone().add(V3((r() - 0.5) * 0.25, (r() - 0.5) * 0.25, (r() - 0.5) * 0.25)).clampLength(0, 0.36); }
    const t = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 8, 0.004 + r() * 0.004, 3, false);
    const n = t.toNonIndexed(); n.deleteAttribute("uv"); n.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(n.attributes.position.count * 2), 2)); parts.push({ geo: n });
  }
  const g = mergeGeos(parts); g.clearGroups();
  const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: 0xb59466, roughness: 1, side: THREE.DoubleSide })); m.castShadow = true; m.visible = false; R.scene.add(m);
  LIFE.weed = { m, on: false, wait: 4, x: 0, z: 0, vx: 0, y: 0, vy: 0, rot: 0, rustle: 0 };
}
// a tumbleweed is a light, springy, lumpy ball: wind drag pushes it, gravity and the ground make it bounce and roll; its uneven shape makes it hop
const _w1 = new THREE.Vector3(), _w2 = new THREE.Vector3(), _w3 = new THREE.Vector3(), _wq = new THREE.Quaternion();
const WEED_LOBES = (() => { const r = rng(77), L = []; for (let i = 0; i < 7; i++) L.push(V3(r() - 0.5, r() - 0.5, r() - 0.5).normalize()); return L; })();
function weedRadius(W, down) { // contact radius along a world direction, from the lumpy shape in body space
  _w3.copy(down).applyQuaternion(_wq.copy(W.q).invert()); let k = 0; for (const L of WEED_LOBES) k += Math.pow(Math.max(0, _w3.dot(L)), 6);
  return W.r * (0.9 + 0.16 * k); }
function spawnWeed(W) {
  W.on = true; W.m.visible = true; W.p.set(-19, 0, 0.2 + Math.random() * 2.2); W.p.y = groundHeight(W.p.x, W.p.z) + W.r + 0.3;
  W.v.set(WIND.v.x * 0.8, 0, WIND.v.z * 0.5); W.w.set(0, 0, -W.v.x / W.r); W.q.setFromEuler(new THREE.Euler(Math.random() * 6, Math.random() * 6, Math.random() * 6));
}
function updateWeed(dt) {
  const W = LIFE.weed; if (!W) return;
  if (!W.p) { W.p = V3(); W.v = V3(); W.w = V3(); W.q = new THREE.Quaternion(); W.r = 0.34; W.m.rotation.set(0, 0, 0); }
  if (!W.on) { W.wait -= dt; if (W.wait < 0) spawnWeed(W); return; }
  const sub = 3, h = Math.min(dt, 0.05) / sub;
  for (let s = 0; s < sub; s++) {
    // aerodynamic drag (it is mostly air): a = k |u| u, u = wind - velocity; plus a lift-ish flutter in gusts
    const ux = WIND.v.x * 1.9 - W.v.x, uy = -W.v.y, uz = WIND.v.z * 1.5 - W.v.z, um = Math.hypot(ux, uy, uz), kd = 0.55; // the breeze is gustier at ground level where it catches
    W.v.x += kd * um * ux * h; W.v.y += (kd * um * uy - 9.81) * h; W.v.z += kd * um * uz * h;
    W.v.y += (Math.random() - 0.4) * WIND.gust * 3.5 * h;
    W.p.addScaledVector(W.v, h);
    // spin decays slowly (branches drag through the air)
    W.w.multiplyScalar(1 - 0.25 * h);
    // ground contact against the terrain normal
    const gy = groundHeight(W.p.x, W.p.z), e = 0.08, n = _w1.set(groundHeight(W.p.x - e, W.p.z) - groundHeight(W.p.x + e, W.p.z), 2 * e, groundHeight(W.p.x, W.p.z - e) - groundHeight(W.p.x, W.p.z + e)).normalize();
    const rr = weedRadius(W, _w2.copy(n).negate()), pen = gy + rr - W.p.y;
    if (pen > 0) {
      W.p.addScaledVector(n, pen);
      const vn = W.v.dot(n);
      if (vn < 0) { const imp = -vn; W.v.addScaledVector(n, -vn * (1 + (0.25 + Math.random() * 0.25)));
        if (imp > 0.6) { Sound.rustle(W.m.position, Math.min(1, imp / 3)); if (Math.random() < 0.25) W.v.addScaledVector(n, 0.8 + Math.random() * 1.2); } }
      // friction at the contact point drives the roll: slip = v + w × (−n r)
      const rc = _w2.copy(n).multiplyScalar(-rr), slip = _w3.crossVectors(W.w, rc).add(W.v); slip.addScaledVector(n, -slip.dot(n));
      const sl = slip.length();
      if (sl > 1e-4) { const m = 0.3, I = 0.55 * m * rr * rr, mu = 0.7, jn = m * Math.max(0.2, -vn) + m * 9.81 * h * 2;
        // impulse that would stop the slip, limited by Coulomb friction
        const kEff = 1 / m + rr * rr / I, jt = Math.min(sl / kEff, mu * jn), t = slip.multiplyScalar(-jt / sl);
        W.v.addScaledVector(t, 1 / m); W.w.add(_w1.crossVectors(rc, t).multiplyScalar(1 / I)); }
    }
    // integrate orientation
    const wl = W.w.length(); if (wl > 1e-5) { _wq.setFromAxisAngle(_w1.copy(W.w).divideScalar(wl), wl * h); W.q.premultiply(_wq).normalize(); }
  }
  W.m.position.copy(W.p); W.m.quaternion.copy(W.q);
  W.rustle -= dt; if (W.rustle < 0 && W.p.y < groundHeight(W.p.x, W.p.z) + W.r * 1.15) { W.rustle = 0.22; Sound.rustle(W.m.position, Math.min(0.4, W.v.length() * 0.1)); }
  if (W.p.x > 20 || Math.abs(W.p.z) > 30) { W.on = false; W.m.visible = false; W.wait = 7 + Math.random() * 14; }
}
function buildDust() {
  const n = R.tier === "low" ? 120 : 320, pos = new Float32Array(n * 3), r = rng(31);
  for (let i = 0; i < n; i++) { pos[i * 3] = -10 + r() * 18; pos[i * 3 + 1] = r() * 6; pos[i * 3 + 2] = -12 + r() * 16; }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const m = new THREE.PointsMaterial({ map: TEX.dust, size: 0.05, color: 0xffd9a0, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true });
  LIFE.dust = new THREE.Points(g, m); LIFE.dust.frustumCulled = false; R.scene.add(LIFE.dust);
}
function updateDust(dt, t) {
  const p = LIFE.dust.geometry.attributes.position;
  for (let i = 0; i < p.count; i++) { let x = p.getX(i) + dt * WIND.v.x * (0.2 + 0.08 * Math.sin(i)), y = p.getY(i) + Math.sin(t * 0.7 + i) * dt * 0.05, z = p.getZ(i) + dt * WIND.v.z * 0.2; if (x > 8) x = -10; if (z > 4) z = -12; else if (z < -12) z = 4; p.setXYZ(i, x, y, z); }
  p.needsUpdate = true; LIFE.dust.material.opacity = 0.35 + 0.25 * (1 - SKY.dusk);
}
// a burst of dust (trap door, body drop)
function puff(at, n = 40, spread = 0.8, size = 0.35, life = 2.5, op = 0.6, color = 0xc9a27a) {
  const pos = new Float32Array(n * 3), vel = [];
  for (let i = 0; i < n; i++) { pos[i * 3] = at.x; pos[i * 3 + 1] = at.y; pos[i * 3 + 2] = at.z; vel.push(V3((Math.random() - 0.5) * spread, Math.random() * spread * 0.6, (Math.random() - 0.5) * spread)); }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const m = new THREE.PointsMaterial({ map: TEX.dust, size, color, transparent: true, opacity: op, depthWrite: false, sizeAttenuation: true });
  const pts = new THREE.Points(g, m); pts.frustumCulled = false; R.scene.add(pts); LIFE.puffs.push({ pts, vel, t: 0, size, life, op });
}
function updatePuffs(dt) {
  for (let k = LIFE.puffs.length - 1; k >= 0; k--) { const P = LIFE.puffs[k]; P.t += dt; const p = P.pts.geometry.attributes.position;
    for (let i = 0; i < p.count; i++) { const v = P.vel[i]; v.x += (WIND.v.x * 0.6 - v.x) * dt * 1.5; v.z += (WIND.v.z * 0.6 - v.z) * dt * 1.5; v.y = v.y * (1 - dt * 1.5) - dt * 0.05; p.setXYZ(i, p.getX(i) + v.x * dt, Math.max(0.05, p.getY(i) + v.y * dt), p.getZ(i) + v.z * dt); }
    p.needsUpdate = true; P.pts.material.opacity = P.op * Math.max(0, 1 - P.t / P.life); P.pts.material.size = P.size * (1 + P.t * 0.85);
    if (P.t > P.life) { R.scene.remove(P.pts); P.pts.geometry.dispose(); P.pts.material.dispose(); LIFE.puffs.splice(k, 1); } }
}
const CROWD_SPECS = [
  { pos: [-6.7, -2.6], spec: { body: { coat: true }, shirt: 0x9a8c74, trousers: 0x3e352c, coat: 0x2f2a26, skin: { tint: 0xe0bfa6, hair: 0x2a1d14, stubble: 0.7 }, hat: { color: 0x2a2420, y: 2.92 } } },
  { pos: [-7.6, -4.3], spec: { body: { skirt: true }, hairStyle: true, shirt: 0x6b4a5a, skirt: 0x4e3446, skin: { tint: 0xf2d5c4, hair: 0x5a3a20, hairAmt: 1, stubble: 0 }, hat: { color: 0xc9b48a, y: 3.0, tilt: -0.02 } } },
  { pos: [0.9, -7.0], spec: { body: { vest: true, kerchief: true }, shirt: 0xc2b08e, trousers: 0x5a4a3a, vest: 0x5a3a28, kerchief: 0x2d4a6a, skin: { tint: 0xd9b090, stubble: 0.5 }, hat: { color: 0x8a6a46, y: 2.94 } } },
  { pos: [-0.2, -8.9], spec: { body: { skirt: true }, hairStyle: true, shirt: 0x3a4a5a, skirt: 0x2c3846, skin: { tint: 0xeac8b4, hair: 0x2a1a10, stubble: 0 }, hat: null } },
  { pos: [-6.2, -8.8], spec: { body: { kerchief: true }, shirt: 0x8a3a2a, trousers: 0x3a3a40, kerchief: 0xb8a070, skin: { tint: 0xc89878, stubble: 0.6 }, hat: { color: 0x4a3a2a, y: 2.93 } } },
  { pos: [1.9, -5.4], spec: { body: { coat: true }, shirt: 0xd0c4a8, trousers: 0x2a2622, coat: 0x1e1c1a, skin: { tint: 0xe6c6b0, hairAmt: 1, hair: 0x8a8a86, stubble: 0.2 }, hat: { color: 0x151312, y: 2.96 } } },
  { pos: [-8.3, -6.0], spec: { body: { vest: true }, shirt: 0xb9a888, trousers: 0x463a30, vest: 0x3b2a1e, skin: { tint: 0xd8b498, hair: 0x3a2818, stubble: 0.8 }, hat: { color: 0x5a4632, y: 2.93, tilt: 0.05 } } },
  { pos: [-4.7, -9.7], spec: { body: { skirt: true }, hairStyle: true, shirt: 0x7a6a4a, skirt: 0x3e3226, skin: { tint: 0xe2bea6, hair: 0x6a4428, hairAmt: 1, stubble: 0 }, hat: { color: 0xd8c8a0, y: 3.0 } } },
  { pos: [2.7, -8.2], spec: { body: { coat: true, kerchief: true }, shirt: 0x8c7c60, trousers: 0x3a3028, coat: 0x5a4a38, kerchief: 0x7a2418, skin: { tint: 0xc89a7a, stubble: 0.7 }, hat: { color: 0x3a2e24, y: 2.94 } } },
  { pos: [-7.8, -8.1], spec: { body: { kerchief: true }, shirt: 0x5a6a7a, trousers: 0x2e2a26, kerchief: 0xc8b48a, skin: { tint: 0xe8c4a8, hair: 0x9a6a3a, stubble: 0.4 }, hat: { color: 0x6a5a48, y: 2.92 } } },
  { pos: [-1.5, -10.5], spec: { body: { vest: true }, shirt: 0xd8ccb4, trousers: 0x2a2420, vest: 0x161412, skin: { tint: 0xdcb49a, hair: 0x241810, stubble: 0.9 }, hat: { color: 0x0e0d0c, y: 2.97 } } },
  { pos: [3.6, -6.4], spec: { body: { skirt: true }, hairStyle: true, shirt: 0x8a5a4a, skirt: 0x5a3a30, skin: { tint: 0xf0d0bc, hair: 0x2a1a10, hairAmt: 1, stubble: 0 }, hat: null } }
];
function buildCrowd() {
  const n = Math.min(CROWD_SPECS.length, TIERS[R.tier].crowd);
  for (let i = 0; i < n; i++) { const c = CROWD_SPECS[i], a = new Actor(Object.assign({ boots: 0x2e2016, gloves: 0x6a5038, lod: true }, c.spec), "crowd" + i);
    a.place(c.pos[0], c.pos[1], Math.atan2(LAY.plat.x - c.pos[0], LAY.plat.z - c.pos[1])); a.lookPt = V3(LAY.plat.x, 3.6, LAY.plat.z); a.gestureT = 3 + Math.random() * 6; LIFE.crowd.push(a); }
}
function updateCrowd(dt, mood) {
  for (const a of LIFE.crowd) { if (!a.root.visible) continue; a.update(dt); if (a.siege) continue; a.gestureT -= dt; if (a.gestureT < 0) { a.gestureT = 5 + Math.random() * 9; if (Math.random() < 0.5 + mood * 0.3) a.gesture(Math.random() < 0.6 ? "shake" : "agree"); } }
}
