// ---------- THE TOWN'S HORSES (v37) ----------
// Besides the loose one that bolts through now and then (10 LIFE.horse), a few horses are about the town: one tied at the hitching rail by
// the water trough, saddled, waiting; others loose out on the open ground at the edge of town, heads down tearing at tufts of grass,
// some behind you as you fight from the street's cover, off to the sides. They look up now and then, shift their feet, swish their tails;
// one or two wander from patch to patch at a walk and put their heads down again where they stop. They stand on HORSE.stand (10b), the
// model's gallop made into a horse standing square, which the coat's shader bows at the neck and walks leg by leg.
// They can be shot (12d fireTap, 12k laserBeam through townHorseRay, 12l): one shot and a horse goes down as the loose one does; the beam
// turns it to steak. A new shootout puts them back where they were.
const HERD = { list: [], grass: null, clip: { duration: 1.5 } };
// [x, z, facing, what it does, coat colour, coat, saddled, where it wanders] (the first few for the lower quality tiers)
const HERD_SPOTS = [
  [5.6, -9.65, 0.05, "tied", 0x5a3520, { points: 1, pointCol: 0x0d0a08, blaze: 0.8, socks: [0.3, 0, 0, 0.22], hair: 0x120c08 }, true],
  [9.2, 7.6, 2.6, "graze", 0x8a6a48, { points: 0.25, pointCol: 0x3a2a1c, dapple: 0.6, socks: [0, 0.25, 0, 0], hair: 0xd8d0c0 }, false],
  [11.5, -3.0, -1.9, "walk", 0x2a1c14, { points: 0.2, pointCol: 0x0a0806, blaze: 0.6, hair: 0x0c0806 }, false, [[11.5, -3.0], [13.5, 2.8], [10.2, 4.6], [12.6, -1.2]]],
  [-9.4, 7.2, 1.2, "graze", 0x9a5a2c, { points: 0.2, pointCol: 0x6a3a18, socks: [0, 0, 0.35, 0.35], hair: 0xc89a5a }, false],
  [3.8, 10.4, -2.2, "walk", 0xb08a5a, { points: 1, pointCol: 0x1a120c, blaze: 0.4, hair: 0x1a120c }, false, [[3.8, 10.4], [7.4, 12.6], [1.0, 13.2], [5.6, 9.6]]],
  [14.2, 9.4, 3.4, "graze", 0x6a3f24, { points: 1, pointCol: 0x0d0a08, hair: 0x1a120c }, false]];
const _hd1 = new THREE.Vector3(), _hd2 = new THREE.Vector3();

function buildHerd() {
  if (!HORSE.stand || !LIFE.horse) return; const n = { ultra: 6, high: 5, medium: 4, low: 2 }[R.tier] || 3, tufts = [];
  HERD_SPOTS.slice(0, n).forEach(([x, z, yaw, kind, color, coat, saddle, path], i) => {
    const grp = THREE.SkeletonUtils.clone(LIFE.horse.grp); for (const c of [...grp.children]) if (c.userData.tack) grp.remove(c);
    let mesh; grp.traverse(o => { if (o.isMesh && o.morphTargetInfluences) mesh = o; }); mesh.geometry = HORSE.stand.geo; delete mesh.morphTargetInfluences; delete mesh.morphTargetDictionary;
    const m = horseCoatMat(color, coat); m.sheen = 0.36; m.userData.U.piv.value.copy(HORSE.stand.piv); m.userData.U.neckP.value.copy(HORSE.stand.neckP); mesh.material = m; mesh.frustumCulled = false; grp.traverse(o => { if (o.isMesh) o.userData.dyn = true; }); // (not scenery: a shot that meets it is a shot at a horse)
    grp.visible = true; R.scene.add(grp);
    const H = { grp, mesh, U: m.userData.U, stand: true, mixer: { update() {} }, act: { time: Math.random(), timeScale: 0, getClip: () => HERD.clip }, i, kind, home: [x, z, yaw], path: path ? path.map(p => V3(p[0], 0, p[1])) : null,
      x, z, yaw, neckA: kind === "tied" ? 0.3 : 1.3, neckT: kind === "tied" ? 0.3 : 1.3, mood: rnd(2, 9), t: Math.random() * 10, chew: Math.random() * 6, walk: null, pi: 0, ph: 0, swishT: rnd(3, 9), snortT: rnd(8, 25), stepT: 0 };
    horseTack(H, { saddle, hair: coat.hair ?? 0x1a120c }); horseTackShow(H, true);
    HERD.list.push(H); herdPlace(H, 0);
    if (kind !== "tied") for (let k = 0; k < 7; k++) { const a = yaw + rnd(-0.6, 0.6), d = rnd(1.45, 2.1); tufts.push([x + Math.sin(a) * d, z + Math.cos(a) * d, rnd(0.18, 0.32)]); } });
  for (const H of HERD.list) if (H.path) for (const p of H.path) for (let k = 0; k < 4; k++) tufts.push([p.x + rnd(-1.6, 1.6), p.z + rnd(-1.6, 1.6), rnd(0.16, 0.28)]);
  // tufts of green grass where they graze (one draw)
  const cross = new THREE.PlaneGeometry(1, 1); cross.translate(0, 0.5, 0); const g2 = cross.clone(); g2.rotateY(Math.PI / 2); const geo = mergeGeos([{ geo: cross.toNonIndexed() }, { geo: g2.toNonIndexed() }]); geo.clearGroups();
  const mat = swayMat(new THREE.MeshStandardMaterial({ map: TEX.grass, alphaTest: 0.45, side: THREE.DoubleSide, roughness: 0.95, color: 0x9aa860 }), 0.3);
  const im = HERD.grass = new THREE.InstancedMesh(geo, mat, Math.max(1, tufts.length)), m4 = new THREE.Matrix4(), q = new THREE.Quaternion();
  tufts.forEach(([x, z, s], i) => { q.setFromEuler(new THREE.Euler(0, Math.random() * TAU, 0)); m4.compose(V3(x, groundVis(x, z) - 0.02, z), q, V3(s * 1.5, s, s * 1.5)); im.setMatrixAt(i, m4); });
  im.receiveShadow = true; R.scene.add(im);
}
// where it is and how it stands this frame
function herdPlace(H, bob) { H.grp.position.set(H.x, groundVis(H.x, H.z) + bob, H.z); H.grp.rotation.set(0, H.yaw, 0); H.grp.updateMatrixWorld(true); }
function updateHerd(dt) {
  for (const H of HERD.list) {
    if (H.meat) { horseMeatStep(H, dt); continue; } if (H.dead) { H.U.walk.value.y = 0; H.neckA *= 1 - Math.min(1, dt * 3); H.U.neck.value = H.neckA; horseFallStep(H, dt); continue; }
    H.t += dt; let bob = 0;
    // grazing, or looking about; the tied one stands easy with its head low
    H.mood -= dt; if (H.mood <= 0) { const up = H.neckT > 0.6; H.neckT = H.kind === "tied" ? (Math.random() < 0.5 ? 0.12 : 0.35) : up ? rnd(-0.05, 0.25) : rnd(1.26, 1.34); H.mood = up ? rnd(2, 4.5) : rnd(6, 14);
      if (H.path && H.neckT < 0.6 && !H.walk && Math.random() < 0.6) { H.pi = (H.pi + 1) % H.path.length; H.walk = { to: H.path[H.pi] }; H.neckT = 0.42; } }
    if (H.walk) { const to = H.walk.to, dx = to.x - H.x, dz = to.z - H.z, d = Math.hypot(dx, dz), want = Math.atan2(dx, dz), dy = ((want - H.yaw + Math.PI) % TAU + TAU) % TAU - Math.PI;
      H.yaw += clamp(dy, -dt * 0.9, dt * 0.9); const v = Math.abs(dy) > 0.6 ? 0.35 : 1.25; H.x += Math.sin(H.yaw) * v * dt; H.z += Math.cos(H.yaw) * v * dt;
      H.ph = (H.ph + dt * v / 1.6) % 1; H.U.walk.value.set(H.ph, 0.3 * Math.min(1, v), 0.08, 0); bob = Math.abs(Math.sin(H.ph * TAU * 2)) * 0.018; H.act.timeScale = 0.12;
      H.stepT -= dt; if (H.stepT <= 0) { H.stepT = 0.4; if (H.grp.position.distanceTo(R.camera.position) < 30) Sound.hoof(H.grp.position); }
      if (d < 0.4) { H.walk = null; H.neckT = rnd(1.26, 1.34); H.mood = rnd(8, 18); } }
    else { const k = H.U.walk.value; k.y *= 1 - Math.min(1, dt * 5); H.act.timeScale = 0; if (k.y < 0.002) k.y = 0; }
    H.neckA += (H.neckT - H.neckA) * Math.min(1, dt * (H.neckT > H.neckA ? 1.2 : 2.2));
    H.chew += dt; const chew = H.neckA > 0.8 ? 0.03 * Math.sin(H.chew * 7) * Math.max(0, Math.sin(H.chew * 0.9)) : 0; // (tearing at the grass)
    H.U.neck.value = H.neckA + chew;
    // its tail swishes now and then; it blows through its nose
    H.swishT -= dt; if (H.swishT <= 0) { H.swishT = rnd(3, 9); H.swish = 0.9; } if (H.swish > 0) { H.swish -= dt; H.act.time += dt * 2.2; }
    H.snortT -= dt; if (H.snortT <= 0) { H.snortT = rnd(10, 30); if (H.grp.position.distanceTo(R.camera.position) < 22) Sound.horseSnort(H.grp.localToWorld(_hd1.set(0, 1.4, 1.2))); }
    herdPlace(H, bob); if (H.grp.position.distanceToSquared(R.camera.position) < 2500 || H.walk || (H.t * 60 | 0) % 3 === 0) horseTackUpdate(H, dt);
  }
}
// a new round, or a new shootout: everyone back where they were, whole
function resetHerd() {
  for (const H of HERD.list) { if (!H.dead && !H.meat) continue; H.dead = H.meat = null; H.grp.visible = true; H.grp.scale.setScalar(1); H.grp.quaternion.identity(); horseTackShow(H, true);
    [H.x, H.z, H.yaw] = H.home; H.walk = null; H.neckA = H.neckT = H.kind === "tied" ? 0.3 : 1.3; H.U.walk.value.set(0, 0, 0, 0); herdPlace(H, 0); }
}
// the town's horses for a shot: the loose one (while it runs or lies there) and these
function herdRay(ro, rd) { let best = null; for (const H of HERD.list) { const t = horseRayOne(H, ro, rd); if (t > 0 && (!best || t < best.t)) best = { t, H }; } return best; }
