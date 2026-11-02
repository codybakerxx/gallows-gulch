// ---------- HORSES SHOT, AND MEAT (v36) ----------
// A horse hit by a bullet goes down: the loose horse that bolts through town (in the shootout it comes through every 9–16 s, across the
// street behind the gallows) and, on the getaway, a posse rider's horse, which throws its rider. It cries out, its forelegs fold, it pitches
// nose-first and rolls onto its side, slides to a stop and lies there in its blood. Hit by the laser (12k) a horse is gone in a flash and a
// steak drops out of the air where it was; a crow comes down as a chicken leg. The meat bounces, lies where it lands and steams.
const MEAT = { list: [], steakGeo: null, steakMats: null, legGeo: null, legMat: null, zaps: [], blue: null };
const _mt1 = new THREE.Vector3(), _mt2 = new THREE.Vector3(), _mt3 = new THREE.Vector3(), _mtq = new THREE.Quaternion(), _mte = new THREE.Euler(), _mtc = new THREE.Color();
// the horse for a shot, in its own frame (metres): the body, the neck and head, the forelegs, the hind legs
const HORSE_CAPS = [[V3(0, 1.22, 0.85), V3(0, 1.17, -0.9), 0.42], [V3(0, 1.45, 0.92), V3(0, 1.95, 1.38), 0.22], [V3(0, 0.95, 0.6), V3(0, 0.15, 0.62), 0.11], [V3(0, 0.95, -0.72), V3(0, 0.15, -0.8), 0.11]];
const HORSE_HC = 1.15; // (the height of the middle of its body: what it rolls about as it goes down)

function horseRayOne(H, ro, rd) {
  if (!H || !H.grp.visible || H.meat) return -1; H.grp.updateMatrixWorld(); let best = -1;
  HORSE_CAPS.forEach(([a, b, r], k) => { _mt1.copy(a); _mt2.copy(b);
    if (k === 1 && H.stand && H.neckA) { const np = HORSE.stand.neckP; for (const [q, w] of [[_mt1, 0.35], [_mt2, 1]]) { const ang = H.neckA * w, dy = q.y - np.x, dz = q.z - np.y; q.y = np.x + dy * Math.cos(ang) - dz * Math.sin(ang); q.z = np.y + dy * Math.sin(ang) + dz * Math.cos(ang); } } // (a horse grazing: its head is down)
    const t = rayCapsule(ro, rd, _mt1.applyMatrix4(H.grp.matrixWorld), _mt2.applyMatrix4(H.grp.matrixWorld), r); if (t > 0 && (best < 0 || t < best)) best = t; });
  return best;
}
// the town's horse, for a shot in the shootout
function townHorseRay(ro, rd) { const H = LIFE.horse, t = H && (H.run || H.dead) ? horseRayOne(H, ro, rd) : -1, h = herdRay(ro, rd); // (and the horses about the town: 12n)
  return t > 0 && (!h || t < h.t) ? { t, H } : h; }

// ---- going down ----
// the pose part way through the fall (t seconds in): forelegs folding and the nose going down, then over onto its side, the body dropping
// to the ground and settling. base: where its feet are; side: which way it rolls
function horseFallPose(H, base, yaw, t, side) {
  const k1 = smoothstep(0, 0.32, t), k2 = Ease.inOut(smoothstep(0.22, 0.85, t)), bounce = t > 0.85 ? Math.exp(-(t - 0.85) * 9) * Math.sin((t - 0.85) * 22) * 0.05 : 0;
  const pitch = 0.42 * k1 * (1 - smoothstep(0.4, 0.95, t)) + 0.06 * k2, roll = side * 1.42 * k2, drop = (HORSE_HC - 0.44) * k2 + bounce;
  _mtq.setFromEuler(_mte.set(pitch, yaw, roll, "YXZ")); H.grp.quaternion.copy(_mtq);
  H.grp.position.copy(base).add(_mt1.set(0, HORSE_HC - drop, 0)).add(_mt2.set(0, -HORSE_HC, 0).applyQuaternion(_mtq));
}
function horseDown(H, at, rd, v, dir, yaw) { // (common to the town horse and a posse horse)
  bloodBurst(at, rd, false); Sound.clip(siegePick("horse", 3), at, 1.35, 0, 0.3, rnd(0.95, 1.06), 9); crowsStartle(at, 30, 1);
  return { t: 0, v, dir: dir.clone(), yaw, side: Math.random() < 0.5 ? -1 : 1, ts: H.act.timeScale, landed: false, base: H.grp.position.clone() };
}
function horseLanded(H, D) { // the body meets the ground: a heavy thump, dust, and the blood spreads under it
  D.landed = true; const c = H.grp.localToWorld(_mt3.set(0, HORSE_HC, 0)).clone(); c.y = groundVis(c.x, c.z);
  Sound.thud(c, 1); Sound.thud(c, 0.8); puff(c.clone().add(_mt1.set(0, 0.2, 0)), 30, 1.6, 0.5, 2.4, 0.5); CAM.shake = Math.max(CAM.shake, reduceMotion() ? 0 : 0.25);
  if (SIEGE.bloodMat) { const m = new THREE.Mesh(SIEGE.poolGeo || (SIEGE.poolGeo = new THREE.PlaneGeometry(2, 2)), SIEGE.bloodMat); m.rotation.x = -Math.PI / 2; m.rotation.z = Math.random() * TAU;
    m.position.set(c.x, groundVis(c.x, c.z) + 0.006 + SIEGE.pools.length * 0.0004, c.z); m.scale.set(0.01, 0.01, 1); m.receiveShadow = true; R.scene.add(m); SIEGE.pools.push({ m, t: 0, r: rnd(1.0, 1.4) }); }
}
// the town horse, shot with the revolver
function horseShot(H, at, rd) {
  if (H.dead) { bloodBurst(at, rd, false); Sound.thud(at, 0.5); return; } // (already down: it's dead)
  const v = H.run ? H.run.v : H.walk ? 1.2 : 0, dir = V3(Math.sin(H.yaw || 0), 0, Math.cos(H.yaw || 0)); H.dead = horseDown(H, at, rd, v, dir, H.yaw || 0); H.run = null; H.walk = null;
}
function horseFallStep(H, dt) { // (each frame while it's down: 10 updateHorse)
  const D = H.dead; D.t += dt; D.v = Math.max(0, D.v - dt * (D.t < 0.5 ? 3 : 9)); D.base.addScaledVector(D.dir, D.v * dt); D.base.y = groundVis(D.base.x, D.base.z);
  H.act.timeScale = D.ts * Math.max(0, 1 - D.t / 0.35); H.mixer.update(dt); // (its legs stop where they were)
  horseFallPose(H, D.base, D.yaw, Math.min(D.t, 1.6), D.side); H.grp.updateMatrixWorld(true); horseTackUpdate(H, dt);
  if (!D.landed && D.t > 0.72) horseLanded(H, D);
}
// a posse horse in the getaway, shot: its rider goes off (12g riderHit) and it goes down where it was, sliding on along the trail
function chaseHorseRay(ro, rd) { let best = null; for (const R0 of CHASE.riders || []) { if (!R0.alive || !R0.H.grp.visible) continue; const t = horseRayOne(R0.H, ro, rd); if (t > 0 && (!best || t < best.t)) best = { t, R0 }; } return best; }
function chaseHorseShot(R0, at, rd) {
  const C = CHASE, H = R0.H; R0.hp = 1; riderHit(R0, ["Hips", "Spine", 0.2, "hips", "Hips"], at, rd); if (!R0.free) return;
  R0.free.down = horseDown(H, at, rd, C.speed, V3(Math.sin(H.yaw), 0, Math.cos(H.yaw)), H.yaw); R0.free.v = C.speed;
}
function chaseHorseFallStep(R0, dt) {
  const F = R0.free, D = F.down, H = R0.H; D.t += dt; F.v = Math.max(0, F.v - dt * (D.t < 0.5 ? 4 : 12)); F.s += F.v * dt;
  const p = trailAt(F.s, F.l, _mt3); H.act.timeScale = D.ts * Math.max(0, 1 - D.t / 0.35); H.mixer.update(dt);
  horseFallPose(H, _mt1.set(p.x, p.y, p.z).clone(), p.yaw, Math.min(D.t, 1.6), D.side); H.grp.updateMatrixWorld(true); horseTackUpdate(H, dt);
  if (!D.landed && D.t > 0.72) { horseLanded(H, D); kickDust(H.grp.position, 10, 1.4, 1.2, 1, 1.4); }
  if (F.s < CHASE.s - 90) { H.grp.visible = false; horseTackShow(H, false); }
}

// ---- the laser: a flash, and meat ----
function zapTex() { const c = document.createElement("canvas"); c.width = c.height = 128; const g = c.getContext("2d"), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.25, "rgba(190,230,255,0.85)"); gr.addColorStop(0.6, "rgba(70,150,255,0.3)"); gr.addColorStop(1, "rgba(20,60,255,0)"); g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  g.strokeStyle = "rgba(220,245,255,0.8)"; g.lineWidth = 3; g.beginPath(); g.arc(64, 64, 52, 0, TAU); g.stroke(); return canvasTex(c); }
function zapFx(at, size) {
  if (!MEAT.blue) { const tex = zapTex(); for (let i = 0; i < 4; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: false }));
      s.visible = false; s.renderOrder = 8; R.scene.add(s); MEAT.zaps.push({ s, t: 1, size: 1 }); } MEAT.blue = pointPool(260, 0.06, 0x9fdcff, true); }
  const z = MEAT.zaps.find(q => q.t >= 1) || MEAT.zaps[0]; z.t = 0; z.size = size; z.s.position.copy(at); z.s.visible = true;
  for (let i = 0; i < 40 * size; i++) emit(MEAT.blue, at, _mt1.set(rnd(-1, 1), rnd(-0.6, 1.4), rnd(-1, 1)).normalize().multiplyScalar(rnd(1, 4) * Math.sqrt(size)), rnd(0.25, 0.6));
  puff(at, 10, 0.5 * size, 0.3 * size, 1.4, 0.45, 0xe8eef2); Sound.zap(at, size);
}
// a crow hit by the beam
function crowLaser(c, at, rd) {
  if (c.state === "meat" || c.state === "away") return; const was = c.state, v = was === "fly" && c.fl ? _mt1.subVectors(c.pos, c.fl.prev).divideScalar(Math.max(LASER.dtNow || 0.016, 0.005)).clone() : V3();
  const ctr = c.body.getWorldPosition(V3()); c.state = "meat"; c.meatT = 0; c.fl = null; c.hop = null; c.act = null; c.perch = null; c.meatAt = ctr.clone();
  zapFx(ctr, 0.6); spawnMeat("leg", ctr, v.clampLength(0, 6).add(V3(rnd(-0.5, 0.5), 1.8, rnd(-0.5, 0.5))), c.s * 2.4); // (v37: a big drumstick, about 0.6 m)
  if (was !== "dead") { crowsStartle(at, 40, 1.3); SIEGE.crowKills = (SIEGE.crowKills || 0) + 1; }
}
function crowMeatStep(c, dt) { c.meatT += dt; const k = 1 - smoothstep(0, 0.1, c.meatT); c.root.scale.setScalar(c.s * Math.max(0.001, k)); c.root.position.lerpVectors(c.meatAt, c.pos, k); if (c.meatT > 0.1) c.root.visible = false; }
// the town horse hit by the beam
function horseLaser(H, at, rd) {
  if (H.meat) return; const ctr = H.grp.localToWorld(V3(0, HORSE_HC, 0)), v = H.run ? V3(Math.sin(H.yaw), 0, Math.cos(H.yaw)).multiplyScalar(H.run.v) : V3();
  H.meat = { t: 0, c: ctr, p0: H.grp.position.clone() }; H.run = null; H.dead = null; horseTackShow(H, false);
  zapFx(ctr, 1.5); spawnMeat("steak", ctr, v.multiplyScalar(0.6).add(V3(rnd(-0.4, 0.4), 2.4, rnd(-0.4, 0.4))), 3); crowsStartle(at, 30, 1); // (v39: three times the size: about 1.9 m by 1.3 m)
}
function horseMeatStep(H, dt) { const M = H.meat; M.t += dt; const k = 1 - smoothstep(0, 0.12, M.t); H.grp.scale.setScalar(Math.max(0.001, k)); H.grp.position.lerpVectors(M.c, M.p0, k); if (M.t > 0.12) H.grp.visible = false; }

// ---- the meat ----
// ---- the steak (v39): three times the size it was, and made to look like one ----
// A ribeye off the grill: a thick slab with a rolled, uneven outline, a cap of fat browned along one side and a seam of fat through it,
// a crust seared dark and glossy, criss-cross grill marks burnt into it, cracked pepper and a few flakes of salt. The slab is built ring by
// ring from the middle out (steakGeo): a top that isn't quite flat, rounded corners, a wall that bulges a little; the top and bottom
// carry the drawn crust (steakTopTex) with a normal map pressed from the same picture (steakNrmTex), the wall its own band (steakSideTex).
const STEAK = { a: 0.3, b: 0.21, T: 0.075, rc: 0.022, U: 0.72, V: 0.52, fat0: 2.25, fatW: 0.72, N: 72 };
// how far out the edge is at angle a (x along it, z across), as a share of the ellipse; a dip where the tail curls in
const steakK = a => 1 + 0.09 * Math.sin(2 * a + 0.6) + 0.05 * Math.sin(3 * a + 1.2) + 0.025 * Math.sin(5 * a + 2.1) - 0.1 * Math.max(0, Math.cos(a - 5.2)) ** 6;
// how much of the edge at angle a is the fat cap (1 in the middle of it, 0 away from it)
const steakFat = a => { const d = Math.abs(((a - STEAK.fat0 + Math.PI) % TAU + TAU) % TAU - Math.PI); return 1 - smoothstep(STEAK.fatW * 0.55, STEAK.fatW, d); };
const steakEdge = (a, s, out) => { const k = steakK(a) * s; out[0] = Math.cos(a) * STEAK.a * k; out[1] = Math.sin(a) * STEAK.b * k; return out; };
// (the canvas a texture is drawn on: a point on the steak's top, in metres of its own, to pixels; three.js turns canvases upside down)
const steakPx = (x, z, n) => [(x / STEAK.U + 0.5) * n, (1 - (z / STEAK.V + 0.5)) * n];
function steakPath(g, n, s, a0 = 0, a1 = TAU, back) { const e = [0, 0], m = 120, pts = [];
  for (let i = 0; i <= m; i++) { const a = a0 + (a1 - a0) * i / m; steakEdge(a, typeof s === "function" ? s(a) : s, e); pts.push(steakPx(e[0], e[1], n)); }
  if (back) pts.push(...back); pts.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); }
function steakTopTex(n = 512) { // returns the picture and, drawn alongside it, a height map for the normals (steakNrmTex)
  const c = document.createElement("canvas"); c.width = c.height = n; const g = c.getContext("2d"), r = rng(23), k = n / 512, fa0 = STEAK.fat0 - STEAK.fatW, fa1 = STEAK.fat0 + STEAK.fatW;
  const hc = document.createElement("canvas"); hc.width = hc.height = n; const h = hc.getContext("2d"); h.fillStyle = "#808080"; h.fillRect(0, 0, n, n);
  // a soft round brush (dark in the middle, nothing at the edge), stamped along the grill bars and the char so nothing has a hard line
  const B = document.createElement("canvas"); B.width = B.height = 32; { const bg = B.getContext("2d"), gr = bg.createRadialGradient(16, 16, 0, 16, 16, 16); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.45, "rgba(255,255,255,0.7)"); gr.addColorStop(1, "rgba(255,255,255,0)"); bg.fillStyle = gr; bg.fillRect(0, 0, 32, 32); }
  const tint = (col) => { const t = document.createElement("canvas"); t.width = t.height = 32; const tg = t.getContext("2d"); tg.drawImage(B, 0, 0); tg.globalCompositeOperation = "source-in"; tg.fillStyle = col; tg.fillRect(0, 0, 32, 32); return t; };
  const charB = tint("#160904"), caramelB = tint("#9a4f1e"), goldB = tint("#c98a46"), darkB = tint("#3a1809"), lowB = tint("#000000"), highB = tint("#ffffff");
  const stamp = (b, x, y, rad, a, cx = g) => { cx.globalAlpha = a; cx.drawImage(b, x - rad, y - rad, rad * 2, rad * 2); };
  for (let i = 0; i < 260; i++) stamp(r() < 0.5 ? lowB : highB, r() * n, r() * n, (6 + r() * 22) * k, 0.06 + r() * 0.1, h); // (the crust's lumps, in the height map only)
  for (let i = 0; i < 2600; i++) stamp(r() < 0.5 ? lowB : highB, r() * n, r() * n, (1 + r() * 2.5) * k, 0.05 + r() * 0.07, h); // (and its grain)
  const wob = (t, f, ph) => 0.5 + 0.3 * Math.sin(t * f + ph) + 0.2 * Math.sin(t * f * 2.7 + ph * 1.9);
  g.fillStyle = "#3a1a0b"; g.fillRect(0, 0, n, n); // (past the edge: the crust, so the edge never shows a seam)
  g.save(); g.beginPath(); steakPath(g, n, 1.04); g.clip();
  const [cx, cy] = steakPx(0.02, -0.02, n), gr = g.createRadialGradient(cx, cy, 10 * k, cx, cy, 250 * k); gr.addColorStop(0, "#7e4120"); gr.addColorStop(0.55, "#6a361a"); gr.addColorStop(1, "#47220f"); g.fillStyle = gr; g.fillRect(0, 0, n, n);
  // the sear: browns, uneven, golden where it caught least and near black where it caught most
  const pal = ["#7a3f1c", "#9a5428", "#5a2a12", "#3a1a0a", "#b06a34", "#4c230f", "#6b3417", "#a35e2c"];
  for (let i = 0; i < 1600; i++) { g.fillStyle = pal[(r() * pal.length) | 0]; g.globalAlpha = 0.1 + r() * 0.25; g.beginPath(); g.ellipse(r() * n, r() * n, (1.5 + r() * 9) * k, (1 + r() * 6) * k, r() * 3, 0, TAU); g.fill(); }
  for (let i = 0; i < 90; i++) stamp(r() < 0.5 ? darkB : caramelB, r() * n, r() * n, (8 + r() * 26) * k, 0.18 + r() * 0.22);
  g.globalAlpha = 1;
  // marbling: fine threads of fat through the meat, browned with it (faint)
  for (let i = 0; i < 70; i++) { g.strokeStyle = `rgba(${190 + r() * 40 | 0},${120 + r() * 40 | 0},${70 + r() * 30 | 0},${0.05 + r() * 0.1})`; g.lineWidth = (0.5 + r() * 1.4) * k; g.beginPath(); let x = r() * n, y = r() * n; g.moveTo(x, y);
    for (let j = 0; j < 4; j++) { const nx = x + (r() - 0.5) * 50 * k, ny = y + (r() - 0.5) * 50 * k; g.quadraticCurveTo(x + (r() - 0.5) * 30 * k, y + (r() - 0.5) * 30 * k, nx, ny); x = nx; y = ny; } g.stroke(); }
  // the seam of fat between the eye and the cap: thin, broken, browned
  { const e = [0, 0]; for (let i = 0; i < 320; i++) { const a = fa0 + 0.3 + (fa1 - fa0 - 0.55) * i / 320; steakEdge(a, 0.6 + 0.05 * Math.sin(a * 7), e); const [x, y] = steakPx(e[0], e[1], n), w = wob(i * 0.1, 1.3, 2);
      if (w > 0.3) { stamp(goldB, x, y, (2.5 + 2.5 * w) * k, 0.13 * w); stamp(caramelB, x, y + 2 * k, (4 + 3 * w) * k, 0.08); } } }
  // the cap of fat along that side: rendered gold-brown, crisp and darker at its edge
  { const inner = []; const e = [0, 0]; for (let i = 120; i >= 0; i--) { const a = fa0 + (fa1 - fa0) * i / 120; steakEdge(a, 1 - 0.13 * steakFat(a), e); inner.push(steakPx(e[0], e[1], n)); }
    g.beginPath(); steakPath(g, n, 1.05, fa0, fa1, inner); g.closePath(); g.fillStyle = "#a8682f"; g.globalAlpha = 1; g.fill();
    h.beginPath(); steakPath(h, n, 1.05, fa0, fa1, inner); h.closePath(); h.globalAlpha = 0.85; h.fillStyle = "#8a8a8a"; h.fill(); h.globalAlpha = 1; // (the fat: smooth)
    g.save(); g.clip(); for (let i = 0; i < 220; i++) stamp(r() < 0.45 ? goldB : r() < 0.6 ? caramelB : darkB, r() * n, r() * n, (3 + r() * 9) * k, 0.25 + r() * 0.35); g.restore(); }
  // the grill: two sets of bars at about sixty degrees, each a caramel halo round a burnt middle, fading in and out along its length
  for (const [ang, gap, w, a0, ph] of [[0.62, 92, 15, 0.85, 0.3], [-0.42, 92, 13, 0.7, 2.1]]) { const dx = Math.cos(ang), dy = Math.sin(ang), px = -dy, py = dx;
    for (let o = -n * 0.75, li = 0; o <= n * 0.75; o += gap * k, li++) { const x0 = n / 2 + px * (o + ph * 9), y0 = n / 2 + py * (o + ph * 9), lp = r() * 9;
      for (let t = -n * 0.8; t < n * 0.8; t += 3 * k) { const x = x0 + dx * t, y = y0 + dy * t, f = wob(t / 60, 1, lp + li), ww = w * k * (0.8 + 0.4 * f);
        stamp(caramelB, x, y, ww * 1.3, 0.04 + 0.05 * f); if (f > 0.2) { stamp(charB, x, y, ww * 0.6, a0 * 0.5 * Math.min(1, f * 1.6)); stamp(lowB, x, y, ww * 0.7, 0.16 * Math.min(1, f * 1.6), h); } } } } // (sunk in a little)
  g.globalAlpha = 1;
  // cracked pepper and a few flakes of salt; darker pools where the juices sit
  for (let i = 0; i < 26; i++) { g.fillStyle = `rgba(60,14,6,${0.1 + r() * 0.14})`; g.beginPath(); g.ellipse(r() * n, r() * n, (6 + r() * 18) * k, (3 + r() * 8) * k, r() * 3, 0, TAU); g.fill(); }
  for (let i = 0; i < 520; i++) { g.fillStyle = `rgba(8,5,3,${0.5 + r() * 0.4})`; g.beginPath(); g.ellipse(r() * n, r() * n, (0.5 + r() * 1.4) * k, (0.4 + r() * 1.0) * k, r() * 3, 0, TAU); g.fill(); }
  for (let i = 0; i < 120; i++) { g.fillStyle = `rgba(250,240,222,${0.3 + r() * 0.35})`; g.fillRect(r() * n, r() * n, (0.6 + r() * 1.2) * k, (0.6 + r() * 1.0) * k); }
  g.restore(); return { c, h: hc };
}
// a normal map pressed from the picture: the grill bars sunk in, the crust bumpy, the fat smooth
function steakNrmTex(src) {
  const n = src.width, g = src.getContext("2d"), d = g.getImageData(0, 0, n, n).data, h0 = new Float32Array(n * n), h = new Float32Array(n * n);
  for (let i = 0; i < n * n; i++) h0[i] = d[i * 4] / 255; // (dark is low: the grill bars)
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { let a = 0; for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) a += h0[((y + j + n) % n) * n + ((x + i + n) % n)]; h[y * n + x] = a / 9; } // (softened: the crust's lumps, not every grain of pepper)
  const c = document.createElement("canvas"); c.width = c.height = n; const o = c.getContext("2d"), im = o.createImageData(n, n), q = im.data, s = 4 * n / 512, H = (x, y) => h[((y + n) % n) * n + ((x + n) % n)];
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { const nx = -(H(x + 1, y) - H(x - 1, y)) * s, ny = (H(x, y + 1) - H(x, y - 1)) * s, l = Math.hypot(nx, ny, 1), j = (y * n + x) * 4;
    q[j] = (nx / l * 0.5 + 0.5) * 255; q[j + 1] = (ny / l * 0.5 + 0.5) * 255; q[j + 2] = (1 / l * 0.5 + 0.5) * 255; q[j + 3] = 255; }
  o.putImageData(im, 0, 0); return canvasTex(c, false);
}
// the wall round the steak: the crust, darker at the corners, meat fibres running across it; the fat cap's stretch golden
function steakSideTex() {
  const W = 512, Hh = 64, c = document.createElement("canvas"); c.width = W; c.height = Hh; const g = c.getContext("2d"), r = rng(41);
  const gr = g.createLinearGradient(0, 0, 0, Hh); gr.addColorStop(0, "#241008"); gr.addColorStop(0.2, "#4e2411"); gr.addColorStop(0.5, "#5e2c14"); gr.addColorStop(0.8, "#4a2210"); gr.addColorStop(1, "#200e07"); g.fillStyle = gr; g.fillRect(0, 0, W, Hh);
  for (let i = 0; i < 300; i++) { g.strokeStyle = `rgba(${r() < 0.5 ? "28,11,5" : "130,66,30"},${0.1 + r() * 0.2})`; g.lineWidth = 0.6 + r() * 1.2; const x = r() * W; g.beginPath(); g.moveTo(x, 4 + r() * 10); g.lineTo(x + (r() - 0.5) * 6, Hh - 4 - r() * 10); g.stroke(); }
  for (let x = 0; x < W; x++) { const f = steakFat(x / W * TAU); if (f < 0.02) continue; const fg = g.createLinearGradient(0, 0, 0, Hh); fg.addColorStop(0, `rgba(74,34,14,${f * 0.9})`); fg.addColorStop(0.18, `rgba(168,104,48,${f * 0.92})`); fg.addColorStop(0.5, `rgba(196,138,74,${f * 0.92})`); fg.addColorStop(0.82, `rgba(160,98,44,${f * 0.92})`); fg.addColorStop(1, `rgba(70,32,13,${f * 0.9})`); g.fillStyle = fg; g.fillRect(x, 0, 1, Hh); }
  for (let i = 0; i < 160; i++) { const x = r() * W, f = steakFat(x / W * TAU); if (f < 0.1) continue; g.fillStyle = r() < 0.6 ? `rgba(110,56,20,${0.25 + r() * 0.4})` : `rgba(226,180,120,${0.2 + r() * 0.3})`; g.beginPath(); g.ellipse(x, r() * Hh, 1 + r() * 4, 1 + r() * 3, 0, 0, TAU); g.fill(); }
  const t = canvasTex(c); t.wrapS = THREE.RepeatWrapping; return t;
}
// the slab, ring by ring from the middle of the top out over the corner, down the wall and back in under it
function steakGeo() {
  const { N, T, rc, U, V } = STEAK, pos = [], uv = [], idx = [], groups = [];
  const bump = (x, z) => 0.0018 * Math.sin(x * 23 + 1.3) * Math.sin(z * 19 + 0.4) + 0.001 * Math.sin(x * 41 + z * 17);
  // the rows: [share of the way out, height, out past the edge, which part (0 top, 1 wall, 2 bottom)]
  const rows = []; for (const f of [0, 0.18, 0.36, 0.54, 0.7, 0.84, 0.94, 1]) rows.push([f, T / 2 + 0.006 * (1 - f * f) * (1 - f * f), 0, 0]);
  for (let i = 0; i <= 3; i++) { const ph = i / 3 * Math.PI / 2; rows.push([1, T / 2 - rc + rc * Math.cos(ph), rc * Math.sin(ph), 1]); }
  rows.push([1, 0, rc + 0.003, 1]); for (let i = 0; i <= 3; i++) { const ph = i / 3 * Math.PI / 2; rows.push([1, -T / 2 + rc - rc * Math.sin(ph), rc * Math.cos(ph), 1]); }
  for (const f of [1, 0.84, 0.6, 0.3, 0]) rows.push([f, -T / 2 - 0.002 * (1 - f * f), 0, 2]);
  const wallV = []; { let acc = 0; for (let i = 8; i <= 16; i++) { if (i > 8) acc += Math.hypot(rows[i][1] - rows[i - 1][1], rows[i][2] - rows[i - 1][2]); wallV.push(acc); } } const wallL = wallV[wallV.length - 1];
  // each part has its own vertices, so the wall's band and the top's picture each fit their own part
  const part = (r0, r1, kind) => { const base = pos.length / 3, start = idx.length;
    for (let ri = r0; ri <= r1; ri++) { const [f, y, out] = rows[ri];
      for (let j = 0; j <= N; j++) { const a = j / N * TAU, k = steakK(a), rx = Math.cos(a) * STEAK.a * k, rz = Math.sin(a) * STEAK.b * k, rr = Math.hypot(rx, rz), sh = Math.max(0, rr - rc) / rr;
        const x = rx * sh * f + rx / rr * out, z = rz * sh * f + rz / rr * out, wob = kind === 1 ? 0.002 * Math.sin(a * 13 + y * 90) : 0, yy = y + (kind !== 1 ? bump(x, z) * f * f * (1 - f ** 4) * (kind === 2 ? 0.5 : 1) : 0); // (lumps out toward the edge only: the normal map has the rest)
        pos.push(x + Math.cos(a) * wob, yy, z + Math.sin(a) * wob);
        if (kind === 1) uv.push(j / N, 1 - wallV[ri - 8] / wallL); else uv.push(x / U + 0.5, z / V + 0.5); } }
    const W = N + 1; for (let ri = 0; ri < r1 - r0; ri++) for (let j = 0; j < N; j++) { const p = base + ri * W + j, q = p + W;
      idx.push(p, p + 1, q, p + 1, q + 1, q); } // (the same winding for all three: the rows run outward on top, down the wall and inward underneath)
    groups.push([start, idx.length - start, kind === 1 ? 1 : 0]); };
  part(0, 7, 0); part(8, 16, 1); part(17, 21, 2);
  const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); geo.setIndex(idx);
  for (const [s, c, m] of groups) geo.addGroup(s, c, m); geo.computeVertexNormals();
  const nr = geo.attributes.normal; for (let j = 0; j <= N; j++) { nr.setXYZ(j, 0, 1, 0); nr.setXYZ(nr.count - 1 - j, 0, -1, 0); } // (straight up in the very middle, down underneath: no star where the rings meet)
  geo.computeBoundingSphere(); return geo;
}
function buildMeat() {
  MEAT.steakGeo = steakGeo(); const T0 = steakTopTex(512), top = canvasTex(T0.c);
  const nrm = steakNrmTex(T0.h), side = steakSideTex();
  MEAT.steakMats = [new THREE.MeshPhysicalMaterial({ map: top, normalMap: nrm, normalScale: new THREE.Vector2(1.1, 1.1), roughness: 0.64, metalness: 0, clearcoat: 0.3, clearcoatRoughness: 0.5, envMapIntensity: 0.55 }), // (a sheen of juices and fat, not a varnish: low, or the sky shows in it)
    new THREE.MeshPhysicalMaterial({ map: side, roughness: 0.7, metalness: 0, clearcoat: 0.22, clearcoatRoughness: 0.55, envMapIntensity: 0.55 })];
  // a chicken leg: knob and bone, then the roasted meat
  const prof = [[0, 0], [0.012, 0.002], [0.016, 0.011], [0.011, 0.022], [0.0075, 0.03], [0.0075, 0.07], [0.016, 0.085], [0.032, 0.12], [0.042, 0.16], [0.04, 0.19], [0.028, 0.214], [0, 0.226]].map(([x, y]) => new THREE.Vector2(x, y));
  const lg = new THREE.LatheGeometry(prof, 14), col = new Float32Array(lg.attributes.position.count * 3), cb = new THREE.Color(0xeadcc4).convertSRGBToLinear(), cm = new THREE.Color(0xb06a2c).convertSRGBToLinear(), cd = new THREE.Color(0x6a3612).convertSRGBToLinear();
  for (let i = 0; i < lg.attributes.position.count; i++) { const y = lg.attributes.position.getY(i), x = lg.attributes.position.getX(i), z = lg.attributes.position.getZ(i), n = 0.5 + 0.5 * Math.sin(x * 160 + y * 90) * Math.cos(z * 140 - y * 50);
    const c = y < 0.076 ? cb : _mtc.copy(cm).lerp(cd, n * 0.6); col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; }
  lg.setAttribute("color", new THREE.BufferAttribute(col, 3)); lg.translate(0, -0.113, 0); MEAT.legGeo = lg; MEAT.legMat = new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: 0.42, metalness: 0 });
}
// compiled at boot with everything else (12c): a steak and a drumstick, and a charred one, out of sight under the ground for a frame
function meatPrecompile(on) {
  if (!MEAT.steakGeo) buildMeat();
  if (on) { MEAT.pre = [new THREE.Mesh(MEAT.steakGeo, MEAT.steakMats), new THREE.Mesh(MEAT.legGeo, MEAT.legMat), new THREE.Mesh(MEAT.legGeo, ASH.preMat || (ASH.preMat = ashMat()))]; for (const m of MEAT.pre) { m.position.set(0, -5, 0); R.scene.add(m); } }
  else if (MEAT.pre) { for (const m of MEAT.pre) R.scene.remove(m); MEAT.pre = null; }
}
function spawnMeat(kind, at, v, s, floor) { // (floor: the ground under it, where that isn't the town's: the getaway's trail)
  if (!MEAT.steakGeo) buildMeat(); const steak = kind === "steak", m = new THREE.Mesh(steak ? MEAT.steakGeo : MEAT.legGeo, steak ? MEAT.steakMats : MEAT.legMat);
  m.castShadow = m.receiveShadow = true; m.userData.dyn = true; m.position.copy(at); m.scale.setScalar(0.001); m.rotation.set(rnd(-1, 1), Math.random() * TAU, rnd(-1, 1)); R.scene.add(m);
  MEAT.list.push({ m, steak, v: v.clone(), w: V3(rnd(-7, 7), rnd(-4, 4), rnd(-7, 7)).multiplyScalar(steak ? 0.6 : 1), t: 0, rest: false, s, half: (steak ? STEAK.T / 2 + 0.002 : 0.036) * s, steamT: 0, bounced: 0, floor, settle: null });
}
// how far below its middle the lowest point of it is, turned as it is (so a big steak tumbling down lands on its edge, not through it)
function meatLow(M) { const q = M.m.quaternion, k = M.m.scale.x;
  if (M.steak) { const ex = _mt1.set(1, 0, 0).applyQuaternion(q).y, ey = _mt2.set(0, 1, 0).applyQuaternion(q).y, ez = _mt3.set(0, 0, 1).applyQuaternion(q).y;
    return k * (Math.hypot(ex * STEAK.a * 1.12, ez * STEAK.b * 1.12) + Math.abs(ey) * STEAK.T / 2); }
  return k * (Math.abs(_mt1.set(0, 1, 0).applyQuaternion(q).y) * 0.11 + 0.042); }
function meatFloor(M) { const p = M.m.position; return M.floor ? M.floor(p.x, p.z) : typeof goreFloor === "function" ? goreFloor(p.x, p.z, p.y + 0.1) : surfaceAt(p.x, p.z, p.y + 0.1); }
function updateMeat(dt) {
  for (const M of MEAT.list) { const m = M.m; M.t += dt; if (M.ash) continue; // (burning to ash: 12o)
    const pop = M.t < 0.14 ? 1.2 * Ease.out(M.t / 0.14) : 1.2 - 0.2 * smoothstep(0.14, 0.26, M.t); m.scale.setScalar(M.s * pop); // (it pops out of the flash)
    if (!M.rest) { M.v.y -= 9.81 * dt; m.position.addScaledVector(M.v, dt); _mtq.setFromEuler(_mte.set(M.w.x * dt, M.w.y * dt, M.w.z * dt)); m.quaternion.multiply(_mtq);
      const ground = meatFloor(M), fl = ground + (M.t > 0.14 ? meatLow(M) : M.half);
      if (m.position.y <= fl) { m.position.y = fl;
        if (M.v.y < -1.6 && M.bounced < 2) { M.bounced++; M.v.y = -M.v.y * 0.3; M.v.x *= 0.5; M.v.z *= 0.5; M.w.multiplyScalar(0.45); Sound.slap(m.position, M.steak ? 1 : 0.5); }
        else { M.rest = true; const yaw = Math.random() * TAU, q1 = new THREE.Quaternion().setFromEuler(M.steak ? _mte.set(0, yaw, 0) : _mte.set(Math.PI / 2 - 0.12, yaw, 0, "YXZ"));
          M.settle = { t: 0, q0: m.quaternion.clone(), q1, y0: m.position.y, y1: ground + M.half }; Sound.sizzle(m.position, M.steak ? 0.8 : 0.4); } } }
    else if (M.settle) { const S = M.settle; S.t = Math.min(1, S.t + dt / 0.22); const e = Ease.inOut(S.t); m.quaternion.slerpQuaternions(S.q0, S.q1, e); m.position.y = lerp(S.y0, S.y1, e); if (S.t >= 1) M.settle = null; } // (it flops down flat)
    if (M.t < 5) { M.steamT -= dt; if (M.steamT <= 0) { M.steamT = M.steak ? 0.24 : 0.3; puff(m.position.clone().add(_mt1.set(rnd(-0.1, 0.1) * M.s, 0.05 * M.s, rnd(-0.1, 0.1) * M.s)), 2, 0.1 * Math.sqrt(M.s), (M.steak ? 0.18 * Math.sqrt(M.s) : 0.08), 1.5, 0.22, 0xf2f2f2); } } }
  for (const z of MEAT.zaps) { if (z.t >= 1) continue; z.t = Math.min(1, z.t + dt / 0.28); z.s.scale.setScalar(z.size * (0.4 + 2.2 * Ease.out(z.t))); z.s.material.opacity = 1 - z.t * z.t; if (z.t >= 1) z.s.visible = false; }
  if (MEAT.blue) updatePoints(MEAT.blue, dt, true, 0.8);
}
// the shootout's begun: the horse comes through soon
function horseHurry() { const H = LIFE.horse; if (H && !H.run && !H.dead && !H.meat) H.wait = Math.min(H.wait, 4 + Math.random() * 4); }
// a new round: the meat's cleared away, and the town horse is up and gone again (it'll come through later)
function resetMeat() {
  for (const M of MEAT.list) R.scene.remove(M.m); MEAT.list = []; resetHerd();
  for (const z of MEAT.zaps) { z.t = 1; z.s.visible = false; } if (MEAT.blue) { MEAT.blue.life.fill(0); MEAT.blue.pts.visible = false; }
  const H = LIFE.horse; if (H && (H.dead || H.meat)) { H.dead = H.meat = null; H.run = null; H.grp.visible = false; H.grp.scale.setScalar(1); H.grp.rotation.set(0, 0, 0); horseTackShow(H, false); H.act.timeScale = 1; H.wait = 25 + Math.random() * 20; }
}
