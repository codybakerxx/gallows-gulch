// ---------- CROWS (v35): a few crows about the gallows and the street ----------
// They perch on the gallows beam and the tops of its posts, the rail at the back of the deck, the false fronts of the two nearest
// buildings and the hitching rails, and pick about in the street. Perched, a crow turns its head in quick snaps, hops along, turns
// round, pecks, preens, stretches a wing and calls (the repository owner's recordings, strung into calls by 03 crowCall); the others sometimes answer.
// Now and then one flies to another perch, or off out of town and back a while later. A gunshot, the trap slamming, the bell or
// someone coming close puts them up. In the shootout they can be shot (12d fireTap): blood and feathers burst out of it, it drops,
// tumbling, bounces once and lies where it lands, bleeding into the dirt. Each new round the dead are gone and others fly in.
const CROWS = { list: [], perches: [], people: [], peopleT: 0 };
const _cw1 = new THREE.Vector3(), _cw2 = new THREE.Vector3(), _cw3 = new THREE.Vector3(), _cwq = new THREE.Quaternion(), _cwq2 = new THREE.Quaternion(), _cwm = new THREE.Matrix4(), _cwe = new THREE.Euler();

// ---- the bird: a lathed body with its tail and legs, a head with the beak and eyes, two wings. All one dark, glossy material ----
function crowGeos() {
  const parts = [], colour = (g, hex) => { const c = new THREE.Color(hex).convertSRGBToLinear(), n = g.attributes.position.count, a = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; } g.setAttribute("color", new THREE.BufferAttribute(a, 3));
    for (const k of Object.keys(g.attributes)) if (!["position", "normal", "color"].includes(k)) g.deleteAttribute(k); return g.index ? g.toNonIndexed() : g; };
  // body: a teardrop along z, chest forward, narrowing to the root of the tail (the pivot it's turned about is the hip)
  const prof = [[0, -0.15], [0.017, -0.14], [0.04, -0.095], [0.056, -0.035], [0.061, 0.015], [0.055, 0.06], [0.042, 0.095], [0.024, 0.122], [0, 0.132]].map(([r, h]) => new THREE.Vector2(r, h));
  const body = new THREE.LatheGeometry(prof, 12); body.rotateX(Math.PI / 2); body.scale(0.9, 1, 1); body.translate(0, 0.036, 0.005); parts.push(colour(body, 0x1c1c24));
  const tailS = new THREE.Shape([[-0.028, 0], [0.028, 0], [0.05, 0.15], [0.02, 0.162], [0, 0.158], [-0.02, 0.162], [-0.05, 0.15]].map(([x, z]) => new THREE.Vector2(x, z)));
  const tail = new THREE.ExtrudeGeometry(tailS, { depth: 0.007, bevelEnabled: false }); tail.rotateX(Math.PI / 2); tail.rotateY(Math.PI); tail.rotateX(-0.22); tail.translate(0, 0.031, -0.125); parts.push(colour(tail, 0x18181e));
  for (const e of [-1, 1]) { const leg = new THREE.CylinderGeometry(0.0042, 0.0038, 0.066, 5); leg.translate(e * 0.022, -0.026, 0.005); parts.push(colour(leg, 0x26262a));
    for (const [a, l] of [[-0.35, 0.034], [0, 0.038], [0.35, 0.034], [Math.PI, 0.026]]) { const t = new THREE.BoxGeometry(0.0055, 0.004, l); t.translate(0, 0, l / 2); t.rotateY(a); t.translate(e * 0.022, -0.058, 0.005); parts.push(colour(t, 0x26262a)); } }
  const bodyG = mergeGeos(parts.map(geo => ({ geo }))); // (each part keeps its own smooth normals)
  // head: round, a heavy beak pointing a little down, small bright eyes
  const hp = [], head = new THREE.SphereGeometry(0.044, 12, 9); head.scale(0.86, 0.88, 1.22); head.translate(0, 0.006, 0.022); hp.push(colour(head, 0x1c1c24));
  const beak = new THREE.ConeGeometry(0.017, 0.07, 8); beak.rotateX(Math.PI / 2); beak.scale(0.78, 1.05, 1); beak.rotateX(0.14); beak.translate(0, -0.004, 0.09); hp.push(colour(beak, 0x2a2a2e));
  for (const e of [-1, 1]) { const eye = new THREE.SphereGeometry(0.0072, 6, 5); eye.translate(e * 0.031, 0.014, 0.038); hp.push(colour(eye, 0x020202)); }
  const headG = mergeGeos(hp.map(geo => ({ geo })));
  // a wing (the left one: span along +x, leading edge +z), the primaries spread like fingers at the tip
  const outline = [[0, 0.045], [0.12, 0.06], [0.22, 0.055], [0.33, 0.03], [0.41, -0.01], [0.445, -0.045], [0.405, -0.06], [0.43, -0.085], [0.385, -0.095], [0.4, -0.12],
    [0.35, -0.125], [0.36, -0.15], [0.31, -0.145], [0.22, -0.14], [0.12, -0.135], [0.04, -0.12], [0, -0.09]];
  const wingG = new THREE.ShapeGeometry(new THREE.Shape(outline.map(([x, z]) => new THREE.Vector2(x, -z)))); wingG.rotateX(-Math.PI / 2); wingG.computeVertexNormals();
  return { bodyG, headG, wingG };
}
function crowMats() {
  return { body: new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: 0.46, metalness: 0.0, envMapIntensity: 0.9 }),
    wing: new THREE.MeshStandardMaterial({ color: new THREE.Color(0x1a1a22).convertSRGBToLinear(), roughness: 0.5, metalness: 0.0, side: THREE.DoubleSide, envMapIntensity: 0.9 }) };
}
// the wing's pose: folded along the flank (span back, leading edge up) or spread (span out, tipped up by the flap angle)
const CROW_FOLD = new THREE.Quaternion();
(() => { const X = V3(0.1, 0.06, -1).normalize(), Z0 = V3(0.12, 1, 0.06), Z = Z0.sub(X.clone().multiplyScalar(Z0.dot(X))).normalize(), Y = new THREE.Vector3().crossVectors(Z, X);
  CROW_FOLD.setFromRotationMatrix(new THREE.Matrix4().makeBasis(X, Y, Z)); })();
function crowSpreadQ(a, out) { const c = Math.cos(a), s = Math.sin(a); return out.setFromRotationMatrix(_cwm.makeBasis(_cw1.set(c, s, 0), _cw2.set(-s, c, 0), _cw3.set(0, 0, 1))); }

function makeCrow(G, M, i) {
  const root = new THREE.Group(), body = new THREE.Group(), head = new THREE.Group(), s = 1.15 + Math.random() * 0.17;
  root.scale.setScalar(s); root.add(body); body.position.y = 0.062;
  const bm = new THREE.Mesh(G.bodyG, M.body); bm.castShadow = true; body.add(bm);
  head.position.set(0, 0.084, 0.112); body.add(head); const hm = new THREE.Mesh(G.headG, M.body); head.add(hm);
  const wings = [1, -1].map(e => { const side = new THREE.Group(), p = new THREE.Group(); side.scale.x = e; body.add(side); p.position.set(0.04, 0.069, 0.045); side.add(p); // (the bird's left is +x; its right wing is the left one mirrored outside the pivot)
    const m = new THREE.Mesh(G.wingG, M.wing); m.castShadow = true; p.add(m); return p; });
  root.traverse(o => { if (o.isMesh) { o.receiveShadow = true; o.userData.crow = i; o.userData.dyn = true; } }); root.visible = false; R.scene.add(root); // (dyn: not scenery a shot stops at, 12d sceneryRay; crowRay finds them)
  return { i, root, body, head, wings, s, voice: Sound.crowVoice(), state: "away", t: 3 + i * 4 + Math.random() * 6, pos: new THREE.Vector3(), yaw: 0, yawT: 0,
    perch: null, u: 0, hop: null, act: null, idle: 1, cawT: 10 + Math.random() * 40, since: 0, scareT: 0,
    bodyPitch: 0.42, bodyPitchT: 0.42, headYaw: 0, headYawT: 0, headPitch: -0.3, headPitchT: -0.3, spread: 0, spreadT: 0, flap: 0, flapPh: Math.random() * TAU, wingL: 0, wingR: 0,
    fl: null, v: new THREE.Vector3(), w: new THREE.Vector3(), q: new THREE.Quaternion(), rest: false, bounced: 0, dripT: 0, deadT: 0 };
}

// ---- where they perch: [kind, a, b] segments (a point when a = b). The far ones (the water tower, the telegraph poles) are where a bird
// goes when it leaves for a while ----
function crowPerches() {
  const P = LAY.plat, L = CROWS.perches, WT = { beam: 3, post: 1.5, rail: 1, cap: 1, ground: 1.2, far: 0 };
  const add = (kind, a, b, o = {}) => L.push(Object.assign({ kind, a, b: b || a.clone(), ground: kind === "ground", wt: WT[kind] }, o));
  const yb = LAY.beamY + 0.13;
  add("beam", V3(LAY.postX[0] - 0.25, yb, P.z), V3(P.x - 0.4, yb, P.z), { face: [0, Math.PI] });
  add("beam", V3(P.x + 0.4, yb, P.z), V3(LAY.postX[1] + 0.25, yb, P.z), { face: [0, Math.PI] });
  for (const x of LAY.postX) add("post", V3(x, LAY.beamY + 0.35, P.z), null, { face: [0, Math.PI, Math.PI / 2, -Math.PI / 2] });
  add("rail", V3(P.x - P.w / 2 + 0.15, P.h + 1.035, P.z - P.d / 2 + 0.1), V3(P.x + P.w / 2 - 0.15, P.h + 1.035, P.z - P.d / 2 + 0.1), { face: [0, Math.PI], wt: 2 });
  for (const B of WORLD.blds || []) { const near = B.along < 22, f = Math.atan2(B.s, B.c); // (the building's own +z, toward the street)
    if (B.roofGun) add("cap", roofWorld(B, -(B.w + 0.3) / 2 + 0.2, B.h + 1.76, B.d / 2 + 0.1), roofWorld(B, (B.w + 0.3) / 2 - 0.2, B.h + 1.76, B.d / 2 + 0.1), { face: [f, f + Math.PI] });
    if (near && B.rail) add("rail", roofWorld(B, -B.w * 0.3, 0.995, B.d / 2 + B.pd + 1.0), roofWorld(B, B.w * 0.3, 0.995, B.d / 2 + B.pd + 1.0), { face: [f, f + Math.PI] }); }
  for (const [al, sd, len] of [[5.5, 1.2, 2.4], [9, -2.5, 2.6], [12.5, 3, 2.2]]) { const [x0, z0] = streetPt(al - len / 2, sd), [x1, z1] = streetPt(al + len / 2, sd);
    add("ground", V3(x0, groundHeight(x0, z0), z0), V3(x1, groundHeight(x1, z1), z1)); }
  for (const p of WORLD.farPerches || []) add("far", p, null, { far: true });
}
// a free place on a perch: not within 0.4 m of another bird (or where one is landing), nobody standing right there
function crowSpot(P, c) {
  for (let k = 0; k < 8; k++) { const u = P.a.equals(P.b) ? 0 : 0.05 + Math.random() * 0.9, p = P.a.clone().lerp(P.b, u);
    if (P.ground) { const side = V3(P.b.z - P.a.z, 0, P.a.x - P.b.x).normalize(); p.addScaledVector(side, (Math.random() - 0.5) * 1.4); p.y = groundHeight(p.x, p.z); }
    if (CROWS.list.some(o => o !== c && (o.state === "perch" || o.state === "fly") && (o.fl ? o.fl.p1 : o.pos).distanceTo(p) < (P.kind === "post" ? 0.3 : 0.42))) continue;
    if (crowPeopleNear(p, P.ground ? 2.6 : 1.3)) continue;
    return { u, p };
  }
  return null;
}
function crowPickPerch(c, near) {
  const L = CROWS.perches.filter(P => !P.far && P !== c.perch); if (!L.length) return null;
  const sum = L.reduce((a, P) => a + P.wt, 0);
  for (let k = 0; k < 12; k++) { let x = Math.random() * sum, P = L[0]; for (const q of L) { x -= q.wt; if (x <= 0) { P = q; break; } } // (the gallows most of all)
    if (near && c.pos.distanceTo(P.a) > 28) continue; const sp = crowSpot(P, c); if (sp) return Object.assign(sp, { P }); }
  return null;
}
// who's about: everyone on foot, refreshed a few times a second
function crowPeople() { const L = CROWS.people; L.length = 0;
  for (const a of [HOST, MAN, EXEC, ...LIFE.crowd, ...(SIEGE.roofActors || [])]) if (a && a.root.visible) L.push(a.hang && a.hang.P ? a.hang.P("hips", V3()) : a.pos);
  const H = LIFE.horse; if (H && H.run && H.grp.visible) L.push(H.grp.position, H.grp.position.clone().add(V3(Math.sin(H.yaw || 0) * 2, 0, Math.cos(H.yaw || 0) * 2)));
  if (typeof CHASE !== "undefined" && CHASE.on) for (const q of CHASE.riders || []) if (q && q.H && q.H.grp) L.push(q.H.grp.position); } // (and the loose horse and where it's headed, and the posse riding in)
function crowPeopleNear(p, r) { for (const q of CROWS.people) { const dy = p.y - q.y; if (dy > -0.5 && dy < 2.2 && Math.hypot(p.x - q.x, p.z - q.z) < r) return true; } return false; }

function buildCrows() {
  const k = TIERS[R.tier].clutter, n = k >= 1.4 ? 7 : k >= 1.1 ? 6 : k >= 0.7 ? 5 : 3, G = crowGeos(), M = crowMats();
  crowPerches(); crowPeople(); buildFeathers();
  for (let i = 0; i < n; i++) CROWS.list.push(makeCrow(G, M, i));
  // three are already about when the game opens; the rest come in over the first half minute
  CROWS.list.slice(0, 3).forEach((c, i) => { const B = CROWS.perches.filter(P => P.kind === "beam"), sp = i < 2 && B.length ? Object.assign(crowSpot(B[i % B.length], c) || {}, { P: B[i % B.length] }) : crowPickPerch(c);
    if (sp && sp.p) crowSettle(c, sp, crowFace(sp.P)); }); // (two of them on the gallows beam)
}
function crowSettle(c, sp, yaw) {
  c.state = "perch"; c.perch = sp.P; c.u = sp.u; c.pos.copy(sp.p); c.root.visible = true; c.fl = null; c.hop = null; c.act = null; c.since = 0; c.idle = 0.5 + Math.random();
  c.yaw = c.yawT = yaw ?? crowFace(sp.P); c.spreadT = 0; c.bodyPitchT = sp.P.ground ? 0.2 : 0.42;
}
function crowFace(P) { return P.face ? P.face[Math.random() * P.face.length | 0] + (Math.random() - 0.5) * 0.5 : Math.random() * TAU; }

// ---- flying: a curve up off the perch and down onto the next, wings beating on the climb, held out on the glide, a flare to land ----
function crowFlyTo(c, sp, opt = {}) {
  if (!sp) return crowLeave(c, opt.sound === false);
  const p0 = c.pos.clone(), p1 = sp.p.clone(), d = p0.distanceTo(p1), up = Math.min(3, 0.8 + d * 0.15);
  const c1 = p0.clone().lerp(p1, 0.25).add(_cw1.set(0, up + Math.random() * 0.8, 0)), c2 = p0.clone().lerp(p1, 0.75).add(_cw1.set(0, up * 0.7 + 0.5, 0));
  c.state = "fly"; c.root.visible = true; c.hop = null; c.act = null; c.perch = null;
  c.fl = { p0, c1, c2, p1, t: 0, dur: Math.max(1.1, d / (opt.fast ? 8 : 6.2) + 0.5), to: sp, away: false, prev: p0.clone() };
  if (opt.sound !== false) Sound.flap(p0, 1, 1.12 - (c.s - 1.15));
}
function crowLeave(c, quiet) { // off out of town for a while, or to the water tower or a telegraph pole to sit it out
  const F = CROWS.perches.filter(P => P.far);
  if (F.length && Math.random() < 0.35) { const P = F[Math.random() * F.length | 0], sp = crowSpot(P, c); if (sp) { crowFlyTo(c, Object.assign(sp, { P }), { fast: true, sound: !quiet }); c.farT = 15 + Math.random() * 30; return; } }
  const a = Math.random() * TAU, far = V3(LAY.plat.x + Math.cos(a) * 75, 16 + Math.random() * 12, LAY.plat.z + Math.sin(a) * 75);
  crowFlyTo(c, { p: far, P: null, u: 0 }, { fast: true, sound: !quiet }); c.fl.away = true; c.fl.dur = Math.max(3.5, c.fl.dur * 0.9);
}
function crowReturn(c) {
  const sp = crowPickPerch(c); if (!sp) { c.t = 4 + Math.random() * 6; return; }
  const a = Math.atan2(sp.p.z - LAY.plat.z, sp.p.x - LAY.plat.x) + (Math.random() - 0.5) * 2.2;
  c.pos.set(LAY.plat.x + Math.cos(a) * 60, 14 + Math.random() * 10, LAY.plat.z + Math.sin(a) * 60); crowFlyTo(c, sp, { sound: false }); c.fl.dur *= 0.8;
  if (Math.random() < 0.25) crowCaw(c, false, 1);
}
function crowFly(c, dt) {
  const F = c.fl; F.t += dt; const s = Math.min(1, F.t / F.dur), e = s * s * (3 - 2 * s), m = 1 - e;
  F.prev.copy(c.pos);
  c.pos.set(0, 0, 0).addScaledVector(F.p0, m * m * m).addScaledVector(F.c1, 3 * m * m * e).addScaledVector(F.c2, 3 * m * e * e).addScaledVector(F.p1, e * e * e);
  const v = _cw1.subVectors(c.pos, F.prev).divideScalar(Math.max(dt, 1e-4)), hs = Math.hypot(v.x, v.z);
  if (hs > 0.3) { const yaw = Math.atan2(v.x, v.z); let dy = ((yaw - c.yaw + Math.PI) % TAU + TAU) % TAU - Math.PI; c.bank = clamp(-dy * 6, -0.7, 0.7); c.yaw += dy * Math.min(1, dt * 9); }
  const landing = !F.away && F.dur - F.t < 0.45;
  c.fpitch = landing ? -0.75 : clamp(-Math.atan2(v.y, Math.max(hs, 0.5)) * 0.8, -0.6, 0.6); // (nose up into the flare; down a little in a dive)
  c.spreadT = 1; c.flapAmp = landing ? 0.35 : v.y > -0.6 || s < 0.35 ? 1 : 0.25; c.flapRate = landing ? 7 : 4.6;
  if (s >= 1) { if (F.away) { c.state = "away"; c.root.visible = false; c.t = 18 + Math.random() * 32; c.fl = null; return; }
    crowSettle(c, F.to, c.yaw); c.spread = 0.7; c.bodyPitch = 0.9; c.fpitch = 0; c.bank = 0; c.hop = { from: c.pos.clone(), to: c.pos.clone(), t: 0.6, dur: 0.25, h: 0.02 }; }
}

// ---- on the perch ----
function crowPerch(c, dt) {
  c.since += dt; c.idle -= dt; c.cawT -= dt;
  if ((c.scareT -= dt) <= 0) { c.scareT = 0.25 + Math.random() * 0.1;
    if (crowPeopleNear(c.pos, c.perch.ground ? 2.2 : 1.05)) { if (c.perch.ground && Math.random() < 0.4) crowHop(c, 0.6, true); else crowFlyTo(c, crowPickPerch(c, true)); return; } }
  if (c.hop) { const H = c.hop; H.t += dt / H.dur; const k = Math.min(1, H.t), e = k * k * (3 - 2 * k);
    c.pos.lerpVectors(H.from, H.to, e); c.pos.y += Math.sin(Math.PI * k) * H.h; c.spreadT = H.wings ? 0.35 * Math.sin(Math.PI * k) : 0;
    if (k >= 1) { c.hop = null; c.spreadT = 0; } }
  if (c.act) { const A = c.act; A.t += dt; const k = A.t / A.dur;
    if (A.kind === "peck") { const ph = (A.t * A.n / A.dur) % 1; c.headPitchT = ph < 0.35 ? 1.25 : 0.2; c.bodyPitchT = c.perch.ground ? -0.15 : 0.15; }
    else if (A.kind === "preen") { c.headYawT = A.side * (2.1 + 0.15 * Math.sin(A.t * 9)); c.headPitchT = 0.5 + 0.12 * Math.sin(A.t * 13); }
    else if (A.kind === "stretch") { c.stretch = A.side * Math.sin(Math.PI * Math.min(1, k)); }
    else if (A.kind === "caw") { const ph = A.t / A.per, j = Math.floor(ph), f = ph - j, on = j < A.n && f < 0.45;
      c.bodyPitchT = on ? 0.05 - 0.25 * Math.sin(Math.PI * f / 0.45) : 0.35; c.headPitchT = on ? -0.05 : -0.2; c.spreadT = on ? 0.12 * Math.sin(Math.PI * f / 0.45) : 0; c.beak = on; }
    if (k >= 1) { c.act = null; c.stretch = 0; c.beak = false; c.bodyPitchT = c.perch.ground ? 0.2 : 0.42; c.headPitchT = -0.3; c.headYawT *= 0.3; c.spreadT = 0; } }
  else if (c.perch.far) { if (c.idle <= 0) { c.idle = 0.5 + Math.random() * 2; c.headYawT = (Math.random() - 0.5) * 2.4; }
    if (c.since > (c.farT || 20)) crowFlyTo(c, crowPickPerch(c)); }
  else if (c.idle <= 0 && !c.hop) { c.idle = 0.35 + Math.random() * 1.6; const r = Math.random(), P = c.perch;
    if (r < 0.5) { c.headYawT = (Math.random() - 0.5) * 2.4; c.headPitchT = -0.45 + Math.random() * 0.55; } // a look round: the head snaps to it
    else if (r < 0.66) crowHop(c, P.ground ? 0.25 + Math.random() * 0.3 : 0.12 + Math.random() * 0.22);
    else if (r < 0.74) { crowHop(c, 0.05, false, true); } // turns about
    else if (r < 0.84) c.act = { kind: "peck", t: 0, dur: 0.7 + Math.random() * 0.8, n: 2 + (Math.random() * 3 | 0) };
    else if (r < 0.9) c.act = { kind: "preen", t: 0, dur: 1 + Math.random() * 1.2, side: Math.random() < 0.5 ? -1 : 1 };
    else if (r < 0.93) c.act = { kind: "stretch", t: 0, dur: 0.9, side: Math.random() < 0.5 ? -1 : 1 };
    else if (c.since > 10 && Math.random() < 0.5) crowFlyTo(c, Math.random() < 0.12 ? null : crowPickPerch(c)); }
  if (c.cawT <= 0 && !c.act) { c.cawT = 25 + Math.random() * 45; crowCaw(c); } // (v38: each bird calls less often, and 03 crowCall keeps the town quiet of crows between calls)
}
// a hop: along the perch (or anywhere about on the ground), turning to face the way it goes or right round
function crowHop(c, dist, away, turn) {
  const P = c.perch, from = c.pos.clone(), to = c.pos.clone();
  if (turn) c.yawT = c.yaw + Math.PI * (0.75 + Math.random() * 0.5);
  else if (P.ground) { let a = c.yaw + (Math.random() - 0.5) * 2.4;
      if (away) { const q = CROWS.people.reduce((b, p) => !b || p.distanceToSquared(c.pos) < b.distanceToSquared(c.pos) ? p : b, null); if (q) a = Math.atan2(c.pos.x - q.x, c.pos.z - q.z); }
      to.x += Math.sin(a) * dist; to.z += Math.cos(a) * dist; to.y = groundHeight(to.x, to.z); c.yawT = a; }
  else if (!P.a.equals(P.b)) { const L = P.a.distanceTo(P.b), dir = Math.random() < 0.5 ? -1 : 1, u = clamp(c.u + dir * dist / L, 0.03, 0.97);
      if (CROWS.list.some(o => o !== c && o.state === "perch" && o.perch === P && Math.abs(o.u - u) * L < 0.38)) return; c.u = u; to.lerpVectors(P.a, P.b, u); }
  c.hop = { from, to, t: 0, dur: turn ? 0.18 : 0.2 + dist * 0.25, h: turn ? 0.03 : 0.05 + dist * 0.12, wings: !turn && (dist > 0.25 || Math.random() < 0.3) };
}
// a call; another bird may answer it (depth: how far down a chain of answers this is)
function crowCaw(c, alarm = false, depth = 0, answer = false) {
  if (!answer && !Sound.crowFree(alarm)) return; // (another crow was heard a moment ago: this one keeps quiet, beak and all)
  const n = alarm ? 3 + (Math.random() * 3 | 0) : [1, 2, 2, 3, 3, 3, 4, 4][Math.random() * 8 | 0];
  if (c.state === "perch" && !c.hop) c.act = { kind: "caw", t: 0, dur: n * c.voice.period * (alarm ? 0.72 : 1) + 0.2, per: c.voice.period * (alarm ? 0.72 : 1), n };
  Sound.crowCall(c.pos.clone(), { v: c.voice, n, alarm, gain: 0.6, answer }).then(len => {
    if (len <= 0 || depth >= 1 || Math.random() > (alarm ? 0.2 : 0.22)) return; // (one answer at most, now and then)
    const others = CROWS.list.filter(o => o !== c && (o.state === "perch" || o.state === "fly")); if (!others.length) return;
    const o = others[Math.random() * others.length | 0]; setTimeout(() => { if (o.state === "perch" || o.state === "fly") crowCaw(o, alarm && Math.random() < 0.5, depth + 1, true); }, (len + 0.25 + Math.random() * 1.2) * 1000); });
}
// something loud at `at`: within r the birds flinch, call out, move to another perch or leave, the closer the likelier (k: how loud;
// later: seconds before any of them calls out, so as not to talk over something)
function crowsStartle(at, r, k = 1, later = 0) {
  if (!CROWS.list.length) return; let called = 0;
  for (const c of CROWS.list) { if (c.state !== "perch" && c.state !== "fly") continue; const d = c.pos.distanceTo(at); if (d > r) continue;
    const p = k * (1 - d / r), u = Math.random();
    if (c.state === "fly") { if (u < 0.3 * p && !c.fl.away) crowLeave(c, later > 0); continue; }
    if (d < 2.5 * k || u < 0.18 * p) crowLeave(c, later > 0); // (with `later`, they go without a sound of wings too)
    else if (u < 0.5 * p) crowFlyTo(c, crowPickPerch(c, true), { fast: true, sound: !later });
    else { c.bodyPitchT = 0.1; c.spread = Math.max(c.spread, 0.5); c.headYawT = (Math.random() - 0.5) * 1.6; if (!c.hop && Math.random() < 0.6) crowHop(c, 0.15, false, Math.random() < 0.3); c.idle = 0.6; }
    if (called < 1 && Math.random() < 0.4 * Math.min(1, p + 0.3)) { called++; setTimeout(() => { if (c.state === "perch" || c.state === "fly") crowCaw(c, true, 1); }, later * 1000 + 120 + Math.random() * 500); } }
}
// the shootout's started: a few that had gone come back to see what the noise is
function crowsGather() { CROWS.list.forEach((c, i) => { if (c.state === "away") c.t = Math.min(c.t, 3 + i * 2.5 + Math.random() * 3); }); }

// ---- a shot ----
// the distance along a ray to the nearest bird it would hit (with a little extra width for one far off), or null
function crowRay(ro, rd) {
  let best = null;
  for (const c of CROWS.list) { if (c.state === "away" || c.state === "meat" || !c.root.visible) continue;
    const ctr = c.body.getWorldPosition(_cw1).add(_cw2.set(0, 0.04 * c.s, 0)), far = ctr.distanceTo(ro), r = (c.state === "fly" ? 0.17 : 0.11) * c.s + clamp((far - 8) * 0.006, 0, 0.1) + (c.state === "dead" ? -0.03 : 0);
    const ox = ro.x - ctr.x, oy = ro.y - ctr.y, oz = ro.z - ctr.z, b = ox * rd.x + oy * rd.y + oz * rd.z, h = b * b - (ox * ox + oy * oy + oz * oz - r * r);
    if (h < 0) continue; const t = -b - Math.sqrt(h); if (t > 0 && (!best || t < best.t)) best = { t, c }; }
  return best;
}
function crowShot(c, at, rd) {
  const G = SIEGE.gore, wasDead = c.state === "dead";
  Sound.crowHit(at); featherBurst(at, rd, wasDead ? 6 : 16, c.s);
  if (G) { const b = G.bursts.find(q => q.t >= 1) || G.bursts[0]; b.t = 0; b.s.visible = true; b.s.position.copy(at); b.size = wasDead ? 0.14 : rnd(0.26, 0.34); b.s.material.rotation = Math.random() * TAU;
    for (let i = 0; i < (wasDead ? 8 : 34); i++) spray(G.fine, at, _cw1.copy(rd).multiplyScalar(rnd(1.2, 4.5)).add(_cw2.set(rnd(-1, 1), rnd(-0.2, 1.4), rnd(-1, 1))), rnd(2, 3.5));
    for (let i = 0; i < (wasDead ? 2 : 9); i++) spray(G.fat, at, _cw1.copy(rd).multiplyScalar(rnd(0.8, 3)).add(_cw2.set(rnd(-0.7, 0.7), rnd(0, 1.2), rnd(-0.7, 0.7))), rnd(2, 3.5));
    if (!wasDead) { const m = G.mist.find(q => q.t >= 1) || G.mist[0]; m.t = 0; m.s.visible = true; m.s.position.copy(at); m.v.copy(rd).multiplyScalar(0.5); m.size = 0.32; m.dur = 0.6; m.s.material.color.setHex(0x8a0c0c); } }
  c.state = "dead"; c.fl = null; c.hop = null; c.act = null; c.perch = null; c.rest = false; c.bounced = 0; c.deadT = 0; c.dripT = 0; c.beak = false; c.stretch = 0;
  c.q.copy(c.root.quaternion); c.v.copy(rd).multiplyScalar(wasDead ? rnd(1.2, 2) : rnd(2.2, 3.4)).add(_cw1.set(rnd(-0.5, 0.5), wasDead ? rnd(1.2, 1.8) : rnd(0.5, 1.4), rnd(-0.5, 0.5)));
  c.w.set(rnd(-11, 11), rnd(-6, 6), rnd(-11, 11)); c.spread = 0.8;
  if (!wasDead) { crowsStartle(at, 40, 1.3); SIEGE.crowKills = (SIEGE.crowKills || 0) + 1; }
}
function crowFall(c, dt) {
  c.deadT += dt; if (c.rest) return;
  c.v.y -= 9.81 * dt; c.v.multiplyScalar(1 - 0.6 * dt); c.pos.addScaledVector(c.v, dt);
  _cwq.setFromAxisAngle(_cw1.copy(c.w).normalize(), c.w.length() * dt); c.q.premultiply(_cwq);
  c.spreadT = 0.55 + 0.3 * Math.sin(c.deadT * 16) * Math.exp(-c.deadT * 2); c.flapAmp = 0; // (the wings limp, flapping in the wind of the fall)
  const G = SIEGE.gore; if (G && (c.dripT -= dt) <= 0) { c.dripT = 0.035; spray(G.fine, c.pos.clone().add(_cw1.set(0, 0.08 * c.s, 0)), _cw2.set(rnd(-0.2, 0.2), rnd(-0.4, 0.1), rnd(-0.2, 0.2)), 3); }
  const fl = (typeof goreFloor === "function" ? goreFloor(c.pos.x, c.pos.z, c.pos.y + 0.1) : surfaceAt(c.pos.x, c.pos.z, c.pos.y + 0.1));
  if (c.pos.y > fl + 0.02) return;
  c.pos.y = fl + 0.02;
  if (!c.bounced && c.v.y < -1.6) { c.bounced = 1; c.v.y = -c.v.y * 0.22; c.v.x *= 0.35; c.v.z *= 0.35; c.w.multiplyScalar(0.35); Sound.thud(c.pos, 0.4); featherBurst(c.pos.clone().add(_cw1.set(0, 0.06, 0)), _cw2.set(0, 1, 0), 4, c.s); return; }
  // at rest: on its side, one wing out and the other under it, the head lolled
  c.rest = true; c.v.set(0, 0, 0); const roll = (Math.random() < 0.5 ? -1 : 1) * rnd(0.35, 0.6);
  _cwe.set(rnd(0.05, 0.25), Math.random() * TAU, roll, "YXZ"); c.q.setFromEuler(_cwe); c.pos.y = fl - 0.02 * c.s;
  c.wingL = roll > 0 ? 0.85 : 0.5; c.wingR = roll > 0 ? 0.5 : 0.85; c.headYawT = rnd(0.6, 1.2) * (Math.random() < 0.5 ? -1 : 1); c.headPitchT = rnd(0.4, 0.9); c.bodyPitchT = 0.1;
  if (G) { const m = new THREE.Mesh(SIEGE.poolGeo || (SIEGE.poolGeo = new THREE.PlaneGeometry(2, 2)), SIEGE.bloodMat); m.rotation.x = -Math.PI / 2; m.rotation.z = Math.random() * TAU;
    m.position.set(c.pos.x, fl + 0.006 + SIEGE.pools.length * 0.0004, c.pos.z); m.scale.set(0.01, 0.01, 1); m.receiveShadow = true; R.scene.add(m); SIEGE.pools.push({ m, t: 0, r: rnd(0.13, 0.2) * c.s }); }
}

// ---- the pose, from the state: where it is, which way it faces, body and head, the wings ----
function crowPose(c, dt) {
  const R0 = c.root; R0.position.copy(c.pos);
  if (c.state === "dead") { R0.quaternion.copy(c.q); }
  else { let dy = ((c.yawT - c.yaw + Math.PI) % TAU + TAU) % TAU - Math.PI; if (c.state === "perch") c.yaw += dy * Math.min(1, dt * 14);
    _cwe.set(c.state === "fly" ? c.fpitch || 0 : 0, c.yaw, c.state === "fly" ? c.bank || 0 : 0, "YXZ"); R0.quaternion.setFromEuler(_cwe); }
  const fast = Math.min(1, dt * 26), mid = Math.min(1, dt * 9);
  c.headYaw += (c.headYawT - c.headYaw) * fast; c.headPitch += (c.headPitchT - c.headPitch) * fast; c.bodyPitch += ((c.state === "fly" ? 0 : c.bodyPitchT) - c.bodyPitch) * mid;
  c.body.rotation.x = -c.bodyPitch; c.head.rotation.set(c.headPitch + (c.state === "fly" ? 0.25 : c.bodyPitch * 0.7), c.headYaw * (c.state === "fly" ? 0.2 : 1), 0, "YXZ");
  c.spread += (c.spreadT - c.spread) * Math.min(1, dt * (c.spreadT > c.spread ? 14 : 6));
  if (c.state === "fly") c.flapPh += dt * TAU * (c.flapRate || 4.6);
  const amp = c.state === "fly" ? (c.flapAmp ?? 1) : 0, flap = 0.18 + amp * 0.78 * Math.sin(c.flapPh);
  c.wings.forEach((w, j) => { let s = c.spread; if (c.state === "dead" && c.rest) s = j ? c.wingR : c.wingL; else if (c.stretch && (c.stretch > 0) === (j > 0)) s = Math.max(s, Math.abs(c.stretch) * 0.85);
    crowSpreadQ(c.state === "dead" && c.rest ? -0.3 - (j ? c.wingR : c.wingL) * 0.15 : flap - (c.state === "dead" ? 0.4 : 0), _cwq2); /* (lying dead, the wings droop to the ground) */ w.quaternion.copy(CROW_FOLD).slerp(_cwq2, clamp(s, 0, 1)); w.children[0].scale.set(lerp(0.6, 1, s), 1, lerp(0.75, 1, s)); w.children[0].castShadow = s > 0.3; }); // (a folded wing's shadow is in the body's)
}
function updateCrows(dt) {
  if (!CROWS.list.length) return;
  if ((CROWS.peopleT -= dt) <= 0) { CROWS.peopleT = 0.2; crowPeople(); }
  for (const c of CROWS.list) {
    if (c.state === "away") { c.t -= dt; if (c.t <= 0) crowReturn(c); continue; }
    if (c.state === "meat") { if (c.root.visible) crowMeatStep(c, dt); continue; } // (the laser: 12l)
    if (c.state === "fly") crowFly(c, dt); else if (c.state === "perch") crowPerch(c, dt); else if (c.state === "dead") crowFall(c, dt);
    if (c.state !== "away") crowPose(c, dt);
  }
  updateFeathers(dt);
}
// a new round: the dead are cleared away (their blood goes with the shootout's, 12d resetSiege) and the living stay where they are
function resetCrows() {
  for (const c of CROWS.list) if (c.state === "dead" || c.state === "meat") { c.state = "away"; c.root.visible = false; c.root.scale.setScalar(c.s); c.t = 4 + Math.random() * 20; c.q.identity(); c.wingL = c.wingR = 0; c.spread = c.spreadT = 0; c.headYawT = 0; }
  clearFeathers();
}

// ---- feathers: black feathers bursting out of a hit bird and see-sawing down to lie on the ground ----
function featherTex() {
  const c = document.createElement("canvas"); c.width = 32; c.height = 128; const g = c.getContext("2d"); g.fillStyle = "#000"; g.fillRect(0, 0, 32, 128);
  g.fillStyle = "#fff"; g.beginPath(); g.moveTo(16, 4); g.bezierCurveTo(30, 30, 28, 90, 17, 122); g.lineTo(15, 122); g.bezierCurveTo(3, 90, 2, 30, 16, 4); g.fill();
  g.globalCompositeOperation = "destination-out"; for (let i = 0; i < 9; i++) { const y = 30 + i * 10, e = i % 2 ? 1 : -1; g.beginPath(); g.moveTo(16 + e * 15, y); g.lineTo(16 + e * 4, y + 6); g.lineTo(16 + e * 15, y + 3); g.fill(); }
  return canvasTex(c, false);
}
const FEATHERS = { im: null, n: 60, next: 0, f: [] };
function buildFeathers() {
  const g = new THREE.PlaneGeometry(0.035, 0.11), m = new THREE.MeshStandardMaterial({ color: 0x141418, roughness: 0.5, alphaMap: featherTex(), alphaTest: 0.4, side: THREE.DoubleSide });
  const im = FEATHERS.im = new THREE.InstancedMesh(g, m, FEATHERS.n); im.frustumCulled = false; im.castShadow = false; im.receiveShadow = true; im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  for (let i = 0; i < FEATHERS.n; i++) { FEATHERS.f.push({ on: false, p: new THREE.Vector3(), v: new THREE.Vector3(), q: new THREE.Quaternion(), ph: 0, rest: false, s: 1 }); im.setMatrixAt(i, _cwm.makeScale(0, 0, 0)); }
  R.scene.add(im);
}
function featherBurst(at, rd, n, s = 1) {
  if (!FEATHERS.im) return;
  for (let i = 0; i < n; i++) { const F = FEATHERS.f[FEATHERS.next]; FEATHERS.next = (FEATHERS.next + 1) % FEATHERS.n;
    F.on = true; F.rest = false; F.p.copy(at).add(_cw1.set(rnd(-0.05, 0.05), rnd(-0.03, 0.05), rnd(-0.05, 0.05)));
    F.v.copy(rd).multiplyScalar(rnd(0.4, 2.2)).add(_cw1.set(rnd(-1.2, 1.2), rnd(0.2, 1.8), rnd(-1.2, 1.2))); F.ph = Math.random() * TAU; F.s = s * rnd(0.6, 1.15);
    F.q.setFromEuler(_cwe.set(rnd(-1, 1), Math.random() * TAU, rnd(-1, 1))); F.spin = rnd(-6, 6); }
}
function updateFeathers(dt) {
  const FE = FEATHERS; if (!FE.im) return; let any = false;
  FE.f.forEach((F, i) => { if (!F.on || F.rest) return; any = true;
    F.v.y -= 9.81 * dt; const drag = Math.min(1, dt * 5.5); F.v.x += (WIND.v.x * 0.35 - F.v.x) * drag; F.v.z += (WIND.v.z * 0.35 - F.v.z) * drag; F.v.y += (-0.45 - F.v.y) * drag; // (they fall slowly, drifting on the wind)
    F.ph += dt * 5; F.p.addScaledVector(F.v, dt); F.p.x += Math.cos(F.ph) * 0.25 * dt; F.p.z += Math.sin(F.ph * 0.7) * 0.25 * dt;
    _cwq.setFromEuler(_cwe.set(Math.sin(F.ph) * 0.9 * dt * 4, F.spin * dt, Math.cos(F.ph) * 0.8 * dt * 4)); F.q.multiply(_cwq);
    const fl = surfaceAt(F.p.x, F.p.z, F.p.y + 0.05) + 0.004;
    if (F.p.y <= fl) { F.p.y = fl; F.rest = true; F.q.setFromEuler(_cwe.set(-Math.PI / 2, 0, Math.random() * TAU)); }
    FE.im.setMatrixAt(i, _cwm.compose(F.p, F.q, _cw2.setScalar(F.s))); });
  if (any || FE.dirty) { FE.im.instanceMatrix.needsUpdate = true; FE.dirty = false; }
}
function clearFeathers() { const FE = FEATHERS; if (!FE.im) return; FE.f.forEach((F, i) => { F.on = false; FE.im.setMatrixAt(i, _cwm.makeScale(0, 0, 0)); }); FE.dirty = true; FE.im.instanceMatrix.needsUpdate = true; }
