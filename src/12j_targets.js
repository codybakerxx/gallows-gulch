// ---------- THINGS TO SHOOT IN THE TOWN SHOOTOUT (v35) ----------
// Bottles and tin cans stood on the shootout's crates, barrels and trough and on the post at the foot of the gallows stairs: a bottle
// bursts into glass and whatever was in it, leaving its jagged bottom standing; a can jumps, spinning, bounces and can be shot again
// where it lies. The lanterns on the gallows shatter, swing hard and go dark. A shop window cracks round the hole, glass falling; a
// barrel or the side of the trough spouts water from the hole for a few seconds, a shot into the trough throws up a splash; hay
// bursts into straw; iron throws sparks and the bullet whines off it; wood splinters and keeps the hole; the street spits dirt; a
// tumbleweed hit jumps and sheds twigs. It's all set back as it was for the next shootout (resetTargets).
const TGT = { items: [], grp: null, debris: {}, holes: null, cracks: null, sparks: null, water: null, spouts: [], lamps: [], hats: 0 };
const _t1 = new THREE.Vector3(), _t2 = new THREE.Vector3(), _t3 = new THREE.Vector3(), _tq = new THREE.Quaternion(), _tq2 = new THREE.Quaternion(), _tm = new THREE.Matrix4(), _te = new THREE.Euler(), _ts = new THREE.Vector3();

// ---- textures ----
function holeTex() { // a bullet hole in wood: the dark hole, pale torn fibres round it
  const c = document.createElement("canvas"); c.width = c.height = 64; const g = c.getContext("2d"), r = rng(31);
  for (let i = 0; i < 26; i++) { const a = r() * TAU, l = 9 + r() * 18; g.strokeStyle = `rgba(214,184,140,${0.35 + r() * 0.4})`; g.lineWidth = 1 + r() * 2.2; g.beginPath(); g.moveTo(32 + Math.cos(a) * 5, 32 + Math.sin(a) * 5); g.lineTo(32 + Math.cos(a) * l, 32 + Math.sin(a) * l * 0.7); g.stroke(); }
  const gr = g.createRadialGradient(32, 32, 1, 32, 32, 10); gr.addColorStop(0, "rgba(6,4,3,1)"); gr.addColorStop(0.6, "rgba(16,10,6,0.95)"); gr.addColorStop(1, "rgba(30,20,12,0)"); g.fillStyle = gr; g.beginPath(); g.arc(32, 32, 10, 0, TAU); g.fill();
  return canvasTex(c);
}
function crackTex() { // a bullet through a window: the hole, cracks running out from it and rings of cracks between them
  const c = document.createElement("canvas"); c.width = c.height = 256; const g = c.getContext("2d"), r = rng(47), C = 128, rays = [];
  g.lineCap = "round";
  for (let i = 0; i < 13; i++) { const a = i / 13 * TAU + (r() - 0.5) * 0.4, L = 60 + r() * 66, pts = [[C, C]]; let x = C, y = C, aa = a;
    for (let s = 1; s <= 6; s++) { aa += (r() - 0.5) * 0.35; x = C + Math.cos(aa) * L * s / 6; y = C + Math.sin(aa) * L * s / 6; pts.push([x, y]); } rays.push(pts);
    g.strokeStyle = `rgba(255,255,250,${0.75 + r() * 0.25})`; g.lineWidth = 1.6 + r(); g.beginPath(); g.moveTo(C, C); for (const [px, py] of pts) g.lineTo(px, py); g.stroke(); }
  for (const rad of [16, 30, 48]) for (let i = 0; i < rays.length; i++) { if (r() < 0.3) continue; const A = rays[i], B = rays[(i + 1) % rays.length], k = Math.min(5, Math.round(rad / 12));
    if (!A[k] || !B[k]) continue; g.strokeStyle = `rgba(255,255,250,${0.5 + r() * 0.35})`; g.lineWidth = 1.1; g.beginPath(); g.moveTo(A[k][0], A[k][1]); g.quadraticCurveTo(C + (A[k][0] + B[k][0] - 2 * C) * 0.62, C + (A[k][1] + B[k][1] - 2 * C) * 0.62, B[k][0], B[k][1]); g.stroke(); }
  const gr = g.createRadialGradient(C, C, 2, C, C, 14); gr.addColorStop(0, "rgba(10,8,6,1)"); gr.addColorStop(0.55, "rgba(30,26,22,0.9)"); gr.addColorStop(1, "rgba(240,240,235,0.25)"); g.fillStyle = gr; g.beginPath(); g.arc(C, C, 14, 0, TAU); g.fill();
  return canvasTex(c);
}
function canTex() { // an old tin can's paper label, sun-faded
  const c = document.createElement("canvas"); c.width = 256; c.height = 96; const g = c.getContext("2d");
  g.fillStyle = "#b9442c"; g.fillRect(0, 0, 256, 96); g.fillStyle = "#e6d3a8"; g.fillRect(0, 22, 256, 52); g.fillStyle = "#3a2a1a"; g.font = '700 30px "Zilla Slab",Georgia,serif'; g.textAlign = "center";
  g.fillText("PEACHES", 64, 58); g.fillText("PEACHES", 192, 58); g.fillStyle = "#c08a2a"; for (const x of [0, 128]) { g.beginPath(); g.arc(x + 118, 48, 9, 0, TAU); g.fill(); }
  for (let i = 0; i < 500; i++) { g.fillStyle = `rgba(${90 + Math.random() * 60},${60 + Math.random() * 40},30,${Math.random() * 0.18})`; g.fillRect(Math.random() * 256, Math.random() * 96, 2 + Math.random() * 10, 1 + Math.random() * 4); }
  return canvasTex(c);
}

// ---- debris: glass, splinters, straw, dirt and twigs, flying, bouncing and lying where they land (instanced, one draw each) ----
function debrisKind(name, geo, mat, n, o = {}) {
  const im = new THREE.InstancedMesh(geo, mat, n); im.frustumCulled = false; im.castShadow = false; im.receiveShadow = true; im.instanceMatrix.setUsage(THREE.DynamicDrawUsage); im.visible = false;
  const P = []; for (let i = 0; i < n; i++) { P.push({ on: false, rest: false, p: new THREE.Vector3(), v: new THREE.Vector3(), q: new THREE.Quaternion(), w: new THREE.Vector3(), s: new THREE.Vector3(1, 1, 1) }); im.setMatrixAt(i, _tm.makeScale(0, 0, 0)); }
  if (o.colors) { for (let i = 0; i < n; i++) im.setColorAt(i, o.colors[0]); }
  R.scene.add(im); return (TGT.debris[name] = Object.assign({ im, P, n, next: 0, live: 0, drag: 0.4, bounce: 0.3, flat: true }, o));
}
function debris(name, at, v, size, col) {
  const K = TGT.debris[name]; if (!K) return; const D = K.P[K.next], i = K.next; K.next = (K.next + 1) % K.n;
  D.on = true; D.rest = false; D.p.copy(at); D.v.copy(v); D.q.setFromEuler(_te.set(Math.random() * TAU, Math.random() * TAU, Math.random() * TAU)); D.w.set(rnd(-14, 14), rnd(-14, 14), rnd(-14, 14));
  D.s.set(size * rnd(0.6, 1.3), size * rnd(0.6, 1.3), size * rnd(0.6, 1.3)); if (col && K.im.instanceColor) { K.im.setColorAt(i, col); K.im.instanceColor.needsUpdate = true; }
  K.im.visible = true; K.live = 3;
}
function updateDebris(dt) {
  for (const K of Object.values(TGT.debris)) { if (!K.im.visible || K.live <= 0) continue; let moving = false;
    K.P.forEach((D, i) => { if (!D.on || D.rest) return; moving = true;
      D.v.y -= 9.81 * dt; D.v.multiplyScalar(1 - K.drag * dt); if (K.flutter) { D.v.y = Math.max(D.v.y, -K.flutter); D.p.x += Math.sin(D.w.x + D.p.y * 9) * 0.3 * dt; }
      D.p.addScaledVector(D.v, dt); _tq.setFromEuler(_te.set(D.w.x * dt, D.w.y * dt, D.w.z * dt)); D.q.multiply(_tq);
      const fl = (typeof goreFloor === "function" ? goreFloor(D.p.x, D.p.z, D.p.y + 0.05) : surfaceAt(D.p.x, D.p.z, D.p.y + 0.05)) + 0.004;
      if (D.p.y <= fl) { D.p.y = fl;
        if (D.v.y < -1.2 && K.bounce > 0) { D.v.y = -D.v.y * K.bounce; D.v.x *= 0.45; D.v.z *= 0.45; D.w.multiplyScalar(0.5); }
        else { D.rest = true; if (K.flat) D.q.setFromEuler(_te.set(Math.PI / 2 * (Math.random() < 0.5 ? 1 : -1) * (K.flatX ? 1 : 0), Math.random() * TAU, 0)); } }
      K.im.setMatrixAt(i, _tm.compose(D.p, D.q, D.s)); });
    K.im.instanceMatrix.needsUpdate = true; if (!moving) K.live -= dt; }
}

// ---- points: sparks (glowing, gone in a moment) and water (drops arcing down) ----
function pointPool(n, size, col, additive) {
  const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(n * 3).fill(-50), 3)); geo.setAttribute("color", new THREE.BufferAttribute(new Float32Array(n * 3), 3));
  const m = new THREE.PointsMaterial({ map: SIEGE.gore && SIEGE.gore.dot || dotTex(), size, vertexColors: true, color: col, transparent: true, depthWrite: false, sizeAttenuation: true, alphaTest: 0.02,
    blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending, opacity: additive ? 1 : 0.8 });
  const pts = new THREE.Points(geo, m); pts.frustumCulled = false; pts.visible = false; R.scene.add(pts);
  return { pts, n, next: 0, v: new Float32Array(n * 3), life: new Float32Array(n), life0: new Float32Array(n), floor: new Float32Array(n), live: 0 };
}
function emit(Pp, at, v, life, bright = 1) {
  const j = Pp.next; Pp.next = (Pp.next + 1) % Pp.n; Pp.pts.geometry.attributes.position.setXYZ(j, at.x, at.y, at.z); Pp.pts.geometry.attributes.color.setXYZ(j, bright, bright, bright);
  Pp.v[j * 3] = v.x; Pp.v[j * 3 + 1] = v.y; Pp.v[j * 3 + 2] = v.z; Pp.life[j] = Pp.life0[j] = life; Pp.pts.visible = true; Pp.live = 1;
  Pp.floor[j] = surfaceAt(at.x, at.z, at.y) - 0.02; // (where it comes down: the floor under where it started, near enough for drops that land within a metre or two)
}
function updatePoints(Pp, dt, fade, drag) {
  if (!Pp.pts.visible) return; const pos = Pp.pts.geometry.attributes.position, a = pos.array, col = Pp.pts.geometry.attributes.color.array; let any = false;
  for (let j = 0; j < Pp.n; j++) { if (Pp.life[j] <= 0) continue; any = true; const k = j * 3; Pp.life[j] -= dt;
    Pp.v[k + 1] -= 9.81 * dt; const dd = 1 - drag * dt; Pp.v[k] *= dd; Pp.v[k + 2] *= dd;
    a[k] += Pp.v[k] * dt; a[k + 1] += Pp.v[k + 1] * dt; a[k + 2] += Pp.v[k + 2] * dt;
    if (fade) { const f = Math.max(0, Pp.life[j] / Pp.life0[j]); col[k] = col[k + 1] = col[k + 2] = f * f; }
    if (Pp.life[j] <= 0 || a[k + 1] < Pp.floor[j]) { Pp.life[j] = 0; a[k + 1] = -50; } }
  pos.needsUpdate = true; Pp.pts.geometry.attributes.color.needsUpdate = true; if (!any) Pp.pts.visible = false;
}

// ---- decals: bullet holes in wood, cracked glass ----
function decalPool(n, tex, basic, size) {
  const g = new THREE.PlaneGeometry(size, size), m = basic ? new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4, fog: true })
    : new THREE.MeshStandardMaterial({ map: tex, transparent: true, depthWrite: false, roughness: 0.9, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 });
  const im = new THREE.InstancedMesh(g, m, n); im.count = 0; im.frustumCulled = false; im.receiveShadow = true; im.instanceMatrix.setUsage(THREE.DynamicDrawUsage); R.scene.add(im); return { im, n, next: 0, used: 0 };
}
function decal(D, at, n, scale) {
  _tq.setFromUnitVectors(V_Z, n).multiply(_tq2.setFromAxisAngle(V_Z, Math.random() * TAU)); _t3.copy(at).addScaledVector(n, 0.006); // (turned at random about the normal)
  const i = D.next; D.im.setMatrixAt(i, _tm.compose(_t3, _tq, _ts.setScalar(scale))); D.next = (D.next + 1) % D.n; D.used = Math.min(D.n, D.used + 1); D.im.count = D.used; D.im.instanceMatrix.needsUpdate = true;
  return i; // (its slot: a hole in something that later breaks goes with it, 12m)
}

// ---- the bottles and cans ----
function bottleGeo() { const prof = [[0, 0], [0.034, 0], [0.036, 0.01], [0.036, 0.15], [0.03, 0.175], [0.012, 0.2], [0.011, 0.245], [0.014, 0.25], [0.0, 0.25]].map(([a, b]) => new THREE.Vector2(a, b)); return new THREE.LatheGeometry(prof, 14); }
function brokenGeo() { const g = new THREE.CylinderGeometry(0.036, 0.036, 0.07, 14, 1, false), p = g.attributes.position, r = rng(9);
  for (let i = 0; i < p.count; i++) if (p.getY(i) > 0.03) p.setY(i, 0.035 - r() * 0.05 * (0.4 + 0.6 * Math.abs(Math.sin(i * 1.7)))); g.translate(0, 0.035, 0); g.computeVertexNormals(); return g; }
function buildTargets() {
  const S = SIEGE, grp = TGT.grp = new THREE.Group(); grp.visible = false; R.scene.add(grp);
  const bg = bottleGeo(), brk = brokenGeo(), cg = new THREE.CylinderGeometry(0.034, 0.034, 0.11, 16), tin = new THREE.MeshStandardMaterial({ color: 0x9a9690, metalness: 0.85, roughness: 0.38 });
  const label = new THREE.MeshStandardMaterial({ map: canTex(), metalness: 0.25, roughness: 0.6 }), cols = [0x2f5a1e, 0x6a3810, 0x8fa8a0, 0x2a4a3a];
  const add = (kind, x, y, z, ci = 0) => { let mesh, base = null;
    if (kind === "bottle") { const m = new THREE.MeshStandardMaterial({ color: cols[ci % cols.length], roughness: 0.06, metalness: 0, transparent: true, opacity: 0.86, envMapIntensity: 1.8 });
      mesh = new THREE.Mesh(bg, m); base = new THREE.Mesh(brk, m); base.visible = false; base.position.set(x, y, z); base.castShadow = true; base.userData.dyn = true; grp.add(base); }
    else mesh = new THREE.Mesh(cg, [label, tin, tin]);
    mesh.position.set(x, y + (kind === "can" ? 0.055 : 0), z); mesh.rotation.y = Math.random() * TAU; mesh.castShadow = true; mesh.receiveShadow = true; mesh.userData.dyn = true; grp.add(mesh);
    TGT.items.push({ kind, mesh, base, col: new THREE.Color(cols[ci % cols.length]), home: mesh.position.clone(), q0: mesh.quaternion.clone(), state: "stand", v: new THREE.Vector3(), w: new THREE.Vector3(), restT: 0 }); };
  // on the cover set out for the townsfolk (12d ENEMY_COVER): the top crate, the two barrels, the ends of the trough
  for (const [kind, x, z, ry] of ENEMY_COVER) { const sx = Math.cos(ry), sz = -Math.sin(ry);
    if (kind === "crates") { const cx = x + sx * -0.3, cz = z + sz * -0.3, a = ry + 0.35; add("bottle", cx + Math.cos(a) * 0.1, 1.22, cz - Math.sin(a) * 0.1, 0); add("can", cx - Math.cos(a) * 0.12, 1.22, cz + Math.sin(a) * 0.12); }
    else if (kind === "barrels") { add("bottle", x - sx * 0.31, 0.894, z - sz * 0.31, 1); add("can", x + sx * 0.31 + 0.05, 0.894, z + sz * 0.31); add("bottle", x + sx * 0.31 - 0.08, 0.894, z + sz * 0.31 + 0.06, 2); }
    else if (kind === "trough") { add("can", x + sx * 0.72, 0.6, z + sz * 0.72); add("bottle", x - sx * 0.74, 0.6, z - sz * 0.74, 3); } }
  { const St = LAY.stairs; add("bottle", St.x + 0.56, 1.0, St.zBot - 0.1, 0); } // (on the post at the foot of the gallows stairs)
  // the gallows lanterns: which material and light each has, so one can be put out
  GAL.lanternGroups.forEach((g, i) => { let glass = null, light = null; g.traverse(o => { if (o.isMesh && o.material.emissive && o.geometry.parameters && o.geometry.parameters.radiusTop === 0.08) glass = o; if (o.isLight) light = o; });
    g.traverse(o => { o.userData.lamp = i; }); TGT.lamps.push({ g, glass, light, sw: GAL.swingers[i], broken: false, col: glass ? glass.material.color.getHex() : 0 }); });
  // debris, sparks, water, holes and cracks
  const tri = new THREE.BufferGeometry(); tri.setAttribute("position", new THREE.BufferAttribute(new Float32Array([-0.5, 0, -0.3, 0.5, 0, -0.45, 0.05, 0, 0.6]), 3)); tri.computeVertexNormals();
  debrisKind("glass", tri, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.05, metalness: 0.2, side: THREE.DoubleSide, transparent: true, opacity: 0.85, envMapIntensity: 2 }), 160, { colors: [new THREE.Color(0xa8c0b8)], bounce: 0.25, flatX: false });
  debrisKind("splinter", new THREE.BoxGeometry(0.12, 0.012, 0.022), MAT.wood, 80, { bounce: 0.3, flatX: false });
  debrisKind("straw", new THREE.BoxGeometry(0.16, 0.004, 0.006), new THREE.MeshStandardMaterial({ color: 0xd8bc78, roughness: 1 }), 120, { bounce: 0, drag: 2.5, flutter: 1.4, flatX: false });
  debrisKind("clod", new THREE.IcosahedronGeometry(0.02, 0), new THREE.MeshStandardMaterial({ color: 0x7a5a3c, roughness: 1 }), 60, { bounce: 0.2, flat: false });
  TGT.sparks = pointPool(160, 0.05, 0xffb050, true); TGT.water = pointPool(900, 0.045, 0xeef4f6, false);
  TGT.holes = decalPool(48, holeTex(), false, 0.09); TGT.cracks = decalPool(14, crackTex(), true, 0.7); TGT.dirt = pointPool(240, 0.05, 0x9a7654, false);
}
// the props are set out with the shootout's cover, and put back as they were for the next one
function showTargets(on) { if (TGT.grp) TGT.grp.visible = on; }
function resetTargets() {
  for (const T of TGT.items) { T.state = "stand"; T.mesh.visible = true; T.mesh.position.copy(T.home); T.mesh.quaternion.copy(T.q0); T.v.set(0, 0, 0); if (T.base) T.base.visible = false; }
  for (const L of TGT.lamps) if (L.broken) { L.broken = false; if (L.glass) { L.glass.visible = true; L.glass.material.color.setHex(L.col); GAL.lanterns.push(L.glass.material); } if (L.light) GAL.lanterns.push(L.light); }
  for (const K of Object.values(TGT.debris)) { K.P.forEach((D, i) => { D.on = false; K.im.setMatrixAt(i, _tm.makeScale(0, 0, 0)); }); K.im.instanceMatrix.needsUpdate = true; K.im.visible = false; K.live = 0; }
  for (const Pp of [TGT.sparks, TGT.water, TGT.dirt]) if (Pp) { Pp.life.fill(0); Pp.pts.geometry.attributes.position.array.fill(-50); Pp.pts.geometry.attributes.position.needsUpdate = true; Pp.pts.visible = false; }
  for (const D of [TGT.holes, TGT.cracks]) if (D) { D.used = D.next = 0; D.im.count = 0; }
  TGT.spouts = [];
}

// ---- a shot: the nearest target along the ray (a bottle, a can, a tumbleweed), or null ----
function targetRay(ro, rd) {
  let best = null; if (!TGT.grp || !TGT.grp.visible) return null;
  for (const T of TGT.items) { if (T.state === "broken" || !T.mesh.visible) continue; const far = T.mesh.position.distanceTo(ro), pad = clamp((far - 5) * 0.006, 0, 0.07);
    const up = _t3.set(0, 1, 0).applyQuaternion(T.mesh.quaternion), h = T.kind === "bottle" ? 0.25 : 0.11, a = T.kind === "bottle" ? T.mesh.position.clone() : T.mesh.position.clone().addScaledVector(up, -0.055);
    const b = a.clone().addScaledVector(up, h), t = rayCapsule(ro, rd, a, b, (T.kind === "bottle" ? 0.04 : 0.038) + pad); if (t > 0 && (!best || t < best.t)) best = { t, T }; }
  const W = DRESS.weeds; if (W && W.im.visible) W.weeds.forEach(w => { const c = _t1.set(w.p.x, groundVis(w.p.x, w.p.z) + w.rad * 0.9 + w.y, w.p.z), ox = ro.x - c.x, oy = ro.y - c.y, oz = ro.z - c.z, r = w.rad * 0.85;
    const bb = ox * rd.x + oy * rd.y + oz * rd.z, hh = bb * bb - (ox * ox + oy * oy + oz * oz - r * r); if (hh < 0) return; const t = -bb - Math.sqrt(hh); if (t > 0 && (!best || t < best.t)) best = { t, weed: w }; });
  return best;
}
function targetShot(hit, at, rd) {
  if (hit.weed) { const w = hit.weed; w.vy = 2.2 + Math.random(); w.y += 0.02; w.kick = (w.kick || V3()).copy(rd).setY(0).multiplyScalar(3.5); Sound.straw(at, 0.7);
    for (let i = 0; i < 10; i++) debris("straw", at, _t1.copy(rd).multiplyScalar(rnd(0.5, 2)).add(_t2.set(rnd(-1, 1), rnd(0.5, 2), rnd(-1, 1))), 0.6); return; }
  const T = hit.T;
  if (T.kind === "bottle") { T.state = "broken"; T.mesh.visible = false; if (T.base) { T.base.position.copy(T.mesh.position); T.base.visible = Math.random() < 0.8; }
    Sound.clip(siegePick("glass", 3), at, 1.0, 0, 0.25, rnd(0.95, 1.08), 4);
    const top = T.mesh.position.clone().add(_t3.set(0, 0.12, 0));
    for (let i = 0; i < 22; i++) debris("glass", top.clone().add(_t1.set(rnd(-0.03, 0.03), rnd(-0.08, 0.1), rnd(-0.03, 0.03))), _t2.copy(rd).multiplyScalar(rnd(0.8, 3.5)).add(_t1.set(rnd(-1.4, 1.4), rnd(0.3, 2.6), rnd(-1.4, 1.4))), rnd(0.02, 0.045), T.col);
    for (let i = 0; i < 26; i++) emit(TGT.water, top, _t2.copy(rd).multiplyScalar(rnd(0.6, 2.4)).add(_t1.set(rnd(-0.9, 0.9), rnd(0.2, 1.8), rnd(-0.9, 0.9))), rnd(0.8, 1.4), rnd(0.55, 0.8));
    return; }
  // a can: it jumps off, spinning (and again, wherever it is, every time it's hit)
  T.state = "fly"; T.v.copy(rd).multiplyScalar(rnd(2.6, 4.2)).add(_t1.set(rnd(-0.6, 0.6), rnd(2.2, 3.4), rnd(-0.6, 0.6))); T.w.set(rnd(-16, 16), rnd(-10, 10), rnd(-16, 16));
  Sound.clip(siegePick("tin", 3), at, 0.95, 0, 0.2, rnd(0.95, 1.1), 4); for (let i = 0; i < 6; i++) emit(TGT.sparks, at, _t2.set(rnd(-1.5, 1.5), rnd(0, 2), rnd(-1.5, 1.5)), rnd(0.12, 0.3));
}
function updateCans(dt) {
  for (const T of TGT.items) { if (T.kind !== "can" || T.state !== "fly") continue; const m = T.mesh;
    T.v.y -= 9.81 * dt; T.v.multiplyScalar(1 - 0.25 * dt); m.position.addScaledVector(T.v, dt); _tq.setFromEuler(_te.set(T.w.x * dt, T.w.y * dt, T.w.z * dt)); m.quaternion.multiply(_tq);
    const fl = (typeof goreFloor === "function" ? goreFloor(m.position.x, m.position.z, m.position.y + 0.1) : surfaceAt(m.position.x, m.position.z, m.position.y + 0.1)) + 0.034;
    if (m.position.y > fl) continue; m.position.y = fl; const sp = -T.v.y;
    if (sp > 1.1) { T.v.y = sp * 0.38; T.v.x *= 0.6; T.v.z *= 0.6; T.w.multiplyScalar(0.55); Sound.tinTick(m.position, Math.min(1, sp / 5)); }
    else { T.v.set(0, 0, 0); T.state = "rest"; const yaw = Math.random() * TAU; m.quaternion.setFromEuler(_te.set(Math.PI / 2, yaw, 0, "YXZ")); }
  }
}

// ---- the street, the buildings and everything else: what was hit decides what happens ----
function envShot(env, rd, laser) { // (laser: the beam, 12k, which scorches and smokes for itself; here only what's particular to a material)
  const p = env.point, o = env.object, mat = brkSrcMat(Array.isArray(o.material) ? o.material[env.face ? env.face.materialIndex : 0] : o.material), bk = brkFromHit(env); // (bk: a thing that breaks, 12m)
  const hole = (D, at, nrm, s) => { const i = decal(D, at, nrm, s); if (bk) bk.decals.push([D, i]); };
  if (bk && !laser) brkHit(bk, 1, p, rd, false); if (bk && !bk.alive) return; // (that was the shot that broke it)
  const n = env.face ? _t1.copy(env.face.normal).transformDirection(o.matrixWorld) : _t1.set(0, 1, 0); if (n.dot(rd) > 0) n.negate(); const nn = n.clone();
  // a gallows lantern: it shatters, swings and goes out
  let lamp = null; for (let q = o; q; q = q.parent) if (q.userData.lamp !== undefined) { lamp = TGT.lamps[q.userData.lamp]; break; }
  if (lamp) { const L = lamp; L.sw.vx += rd.z * 6 + rnd(-1, 1); L.sw.vz -= rd.x * 6 + rnd(-1, 1);
    if (!L.broken) { L.broken = true; const gl = L.glass; if (gl) { gl.visible = false; const k = GAL.lanterns.indexOf(gl.material); if (k >= 0) GAL.lanterns.splice(k, 1); }
      if (L.light) { const k = GAL.lanterns.indexOf(L.light); if (k >= 0) GAL.lanterns.splice(k, 1); L.light.intensity = 0; }
      const c = gl ? gl.getWorldPosition(_t2) : p.clone(); Sound.clip(siegePick("glass", 3), c, 0.9, 0, 0.3, rnd(1.05, 1.2), 4);
      for (let i = 0; i < 18; i++) debris("glass", c, _t3.copy(rd).multiplyScalar(rnd(0.5, 2.5)).add(_t1.set(rnd(-1.2, 1.2), rnd(-0.2, 1.6), rnd(-1.2, 1.2))), rnd(0.02, 0.04), new THREE.Color(0xd8b070));
      for (let i = 0; i < 24; i++) emit(TGT.sparks, c, _t3.set(rnd(-1.6, 1.6), rnd(-0.4, 2.2), rnd(-1.6, 1.6)), rnd(0.25, 0.7)); puff(c, 8, 0.4, 0.15, 1.6, 0.4, 0x5a5048); }
    else { Sound.clip(siegePick("ric", 3), p, 0.8, 0, 0.3, rnd(0.95, 1.1), 4); for (let i = 0; i < 10; i++) emit(TGT.sparks, p, _t3.copy(nn).multiplyScalar(rnd(0.5, 2)).add(_t1.set(rnd(-1, 1), rnd(-0.5, 1.5), rnd(-1, 1))), rnd(0.15, 0.4)); }
    return; }
  if (mat === WORLD.winMat) { // a window: cracks round the hole, glass falling out of it
    decal(TGT.cracks, p, nn, rnd(0.8, 1.15)); Sound.clip(siegePick("pane", 3), p, 1.0, 0, 0.35, rnd(0.95, 1.05), 5);
    for (let i = 0; i < 16; i++) debris("glass", p.clone().addScaledVector(nn, 0.02), _t3.copy(nn).multiplyScalar(rnd(0.1, 0.9)).add(_t2.set(rnd(-0.5, 0.5), rnd(-0.6, 0.6), rnd(-0.5, 0.5))), rnd(0.03, 0.07), new THREE.Color(0xc8d4cc));
    return; }
  if (o.geometry === DRESS.barrelGeo || o.userData.trough || (bk && bk.water)) { // a barrel, or the trough: water
    const top = (o.userData.trough || (bk && bk.kind === "trough")) && nn.y > 0.7;
    if (top) { Sound.splash(p, 1); for (let i = 0; i < 40; i++) emit(TGT.water, p, _t3.set(rnd(-0.8, 0.8), rnd(1.5, 3.4), rnd(-0.8, 0.8)), rnd(0.8, 1.4), rnd(0.6, 0.85)); return; }
    hole(TGT.holes, p, nn, rnd(0.8, 1.1)); Sound.clip(siegePick("keg", 3), p, 0.95, 0, 0.25, rnd(0.95, 1.05), 4);
    for (let i = 0; i < 5; i++) debris("splinter", p, _t3.copy(nn).multiplyScalar(rnd(0.8, 2.2)).add(_t2.set(rnd(-0.6, 0.6), rnd(0, 1.2), rnd(-0.6, 0.6))), rnd(0.4, 0.8));
    if (TGT.spouts.length < 6) TGT.spouts.push({ p: p.clone().addScaledVector(nn, 0.01), n: nn.clone(), t: 0, life: rnd(4.5, 6.5), acc: 0 });
    return; }
  if (mat === MAT.hay) { // hay: a burst of straw
    Sound.straw(p, 1); puff(p, 10, 0.5, 0.18, 1.4, 0.45, 0xd8c088);
    for (let i = 0; i < 16; i++) debris("straw", p, _t3.copy(nn).multiplyScalar(rnd(0.5, 2)).add(_t2.set(rnd(-1, 1), rnd(0.2, 1.6), rnd(-1, 1))), rnd(0.6, 1.1)); return; }
  if (mat === MAT.iron || mat === MAT.brass) { // iron: sparks, and the bullet whines off it
    if (!laser) Sound.clip(siegePick("ric", 3), p, 0.9, 0, 0.3, rnd(0.92, 1.1), 4);
    for (let i = 0; i < 16; i++) emit(TGT.sparks, p, _t3.copy(nn).multiplyScalar(rnd(0.8, 3)).add(_t2.set(rnd(-1.2, 1.2), rnd(-0.4, 1.4), rnd(-1.2, 1.2))), rnd(0.12, 0.4)); return; }
  if (laser && o === WORLD.ground) { Sound.sizzle(p, 0.35); return; }
  if (o === WORLD.ground) { // the street: a spurt of dirt
    Sound.dirt(p, 1); puff(p.clone().add(_t3.set(0, 0.08, 0)), 26, 1.2, 0.3, 1.6, 0.75, 0xd2b48e);
    for (let i = 0; i < 34; i++) emit(TGT.dirt, p, _t3.set(rnd(-0.7, 0.7), rnd(1.4, 3.4), rnd(-0.7, 0.7)).addScaledVector(rd, -rnd(0.2, 1)), rnd(0.6, 1.1), rnd(0.7, 1));
    for (let i = 0; i < 10; i++) debris("clod", p, _t3.set(rnd(-0.8, 0.8), rnd(1.2, 2.8), rnd(-0.8, 0.8)).addScaledVector(rd, -0.6), rnd(0.8, 1.6)); return; }
  if (laser) { Sound.sizzle(p, 0.35); return; }
  // wood (and anything else): splinters and a hole that stays
  setTimeout(() => { puff(p, 14, 0.6, 0.08, 0.9, 0.6); Sound.clip(siegePick("wood", 4), p, 0.8, 0, 0.3, rnd(0.9, 1.1), 3); }, 40);
  hole(TGT.holes, p, nn, rnd(0.8, 1.15));
  for (let i = 0; i < 6; i++) debris("splinter", p.clone().addScaledVector(nn, 0.02), _t3.copy(nn).multiplyScalar(rnd(0.8, 2.6)).add(_t2.set(rnd(-0.8, 0.8), rnd(0, 1.4), rnd(-0.8, 0.8))), rnd(0.3, 0.75));
}
function updateTargets(dt) {
  if (!TGT.grp) return;
  updateCans(dt); updateDebris(dt); updatePoints(TGT.sparks, dt, true, 0.8); updatePoints(TGT.water, dt, false, 0.3); updatePoints(TGT.dirt, dt, false, 0.6);
  for (let i = TGT.spouts.length - 1; i >= 0; i--) { const s = TGT.spouts[i]; s.t += dt; const k = 1 - s.t / s.life; if (k <= 0) { TGT.spouts.splice(i, 1); continue; }
    s.acc += dt * 130 * k; while (s.acc >= 1) { s.acc -= 1; emit(TGT.water, s.p, _t3.copy(s.n).multiplyScalar(rnd(1.7, 2.5) * (0.35 + 0.65 * k)).add(_t2.set(rnd(-0.06, 0.06), rnd(-0.04, 0.1), rnd(-0.06, 0.06))), 1.2, rnd(0.75, 1)); } }
}
