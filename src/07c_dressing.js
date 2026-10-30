// ---------- SET DRESSING (v33): the small things that make the town lived in ----------
// Porch props on every building (lanterns that light at dusk, benches, shutters, crates, sacks, barrels, a step, wanted posters),
// the litter of the street (stones, broken boards, bottles, cans, horseshoes) and tumbleweeds rolling through on the wind.
// How much there is follows the quality tier (TIERS.clutter). All of it is either baked into the town's merged meshes or instanced.
const DRESS = { weeds: null, rng: null };

// a barrel as a group (body, two hoops), standing on y = 0, for anything that bakes it
function barrelMesh(s = 1) {
  if (!DRESS.barrelGeo) { const g = new THREE.CylinderGeometry(0.29, 0.29, 0.86, 22, 6), p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const y = p.getY(i), k = 1 + 0.13 * (1 - Math.pow(y / 0.43, 2)); p.setX(i, p.getX(i) * k); p.setZ(i, p.getZ(i) * k); } g.computeVertexNormals();
    const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 2.2, uv.getY(i) * 0.9); DRESS.barrelGeo = g; }
  const grp = new THREE.Group(), m = new THREE.Mesh(DRESS.barrelGeo, MAT.wood); m.position.y = 0.43; m.castShadow = m.receiveShadow = true; grp.add(m);
  for (const y of [-0.3, 0.3]) { const h = new THREE.Mesh(new THREE.TorusGeometry(0.31, 0.012, 6, 28), MAT.iron); h.rotation.x = Math.PI / 2; h.position.y = 0.43 + y; h.scale.setScalar(1 + 0.13 * (1 - (y / 0.43) ** 2)); grp.add(h); }
  grp.scale.setScalar(s); return grp;
}
// a lantern: tin cap and base, four glass panes that glow at dusk (WORLD.windows drives them, 06), a wire bail
function lanternMesh() {
  if (!WORLD.lampMat) { WORLD.lampMat = new THREE.MeshStandardMaterial({ color: 0x2a2014, emissive: 0xffa040, emissiveIntensity: 0, roughness: 0.15, metalness: 0.1 }); WORLD.windows.push(WORLD.lampMat); }
  const grp = new THREE.Group(), tin = MAT.iron;
  const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.085, 0.2, 8), WORLD.lampMat); glass.position.y = 0; grp.add(glass);
  const cap = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.09, 8), tin); cap.position.y = 0.145; grp.add(cap);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.035, 8), tin); base.position.y = -0.115; grp.add(base);
  for (let i = 0; i < 4; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.2, 0.008), tin); const a = i * Math.PI / 2 + Math.PI / 4; b.position.set(Math.cos(a) * 0.088, 0, Math.sin(a) * 0.088); grp.add(b); }
  const bail = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.004, 4, 12, Math.PI), tin); bail.position.y = 0.19; grp.add(bail);
  return grp;
}
// a wall bracket a lantern hangs from
function bracketMesh(len = 0.32) { const g = new THREE.Group(), arm = woodBox(0.04, 0.04, len, MAT.iron); arm.position.set(0, 0, len / 2); g.add(arm);
  const brace = woodBox(0.03, 0.03, len * 0.9, MAT.iron); brace.rotation.x = 0.7; brace.position.set(0, -0.14, len * 0.33); g.add(brace); return g; }
// a burlap sack, slumped
function sackMesh(r) {
  if (!MAT.burlap) MAT.burlap = new THREE.MeshStandardMaterial({ color: 0xa88e66, map: TEX.fabric.map, normalMap: TEX.fabric.normalMap, normalScale: new THREE.Vector2(1.4, 1.4), roughness: 0.97 });
  const g = new THREE.SphereGeometry(0.3, 14, 10), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { let x = p.getX(i), y = p.getY(i), z = p.getZ(i); const k = 1 + 0.08 * Math.sin(x * 21 + z * 17) + 0.05 * Math.sin(y * 29);
    y = y < 0 ? y * 0.55 : y * (1.05 + 0.25 * r()); x *= k * (1 + 0.15 * Math.max(0, -y * 3)); z *= k * 0.85; p.setXYZ(i, x, y, z); }
  g.computeVertexNormals(); g.translate(0, 0.17, 0); const m = new THREE.Mesh(g, MAT.burlap); m.castShadow = m.receiveShadow = true;
  const tie = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.09, 0.12, 8), MAT.burlap); tie.position.y = 0.52; const grp = new THREE.Group(); grp.add(m, tie); return grp;
}
// a bench: a plank seat on two pairs of splayed legs
function benchMesh(len) { const g = new THREE.Group(), seat = woodBox(len, 0.06, 0.34, MAT.wood, true); seat.position.y = 0.45; g.add(seat);
  for (const e of [-1, 1]) for (const f of [-1, 1]) { const l = woodBox(0.06, 0.46, 0.06, MAT.woodDark); l.position.set(e * (len / 2 - 0.15), 0.22, f * 0.11); l.rotation.x = f * 0.12; g.add(l); }
  const st = woodBox(len - 0.3, 0.05, 0.04, MAT.woodDark); st.position.y = 0.16; g.add(st); return g; }
// wanted posters: each its own face, name and price, a sketch over aged paper with torn corners and the nail holes
function posterMat(i) {
  DRESS.posters = DRESS.posters || [];
  if (DRESS.posters[i]) return DRESS.posters[i];
  const c = document.createElement("canvas"); c.width = 256; c.height = 360; const g = c.getContext("2d"), r = rng(300 + i);
  g.fillStyle = "#d9c79c"; g.fillRect(0, 0, 256, 360);
  for (let k = 0; k < 500; k++) { g.fillStyle = `rgba(${90 + r() * 40 | 0},${60 + r() * 30 | 0},${20},${r() * 0.1})`; g.fillRect(r() * 256, r() * 360, r() * 14, r() * 14); }
  const vg = g.createRadialGradient(128, 180, 60, 128, 180, 230); vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(80,50,10,0.45)"); g.fillStyle = vg; g.fillRect(0, 0, 256, 360);
  g.fillStyle = "#2a1a10"; g.textAlign = "center"; g.font = '64px "Sancreek","Rye",Georgia,serif'; g.fillText("WANTED", 128, 66);
  g.font = '700 17px "Zilla Slab",Georgia,serif'; g.fillText("DEAD OR ALIVE", 128, 92);
  // the sketch: a face in hatching, under a hat
  g.save(); g.translate(128, 175); g.strokeStyle = "rgba(40,25,12,0.85)"; g.lineWidth = 1.2;
  g.beginPath(); g.ellipse(0, 6, 34, 44, 0, 0, TAU); g.stroke();
  for (let k = 0; k < 40; k++) { const y = -30 + k * 1.8, w = Math.sqrt(Math.max(0, 1 - Math.pow((y - 6) / 44, 2))) * 34; g.beginPath(); g.moveTo(-w, y); g.lineTo(-w + 8 + r() * 6, y + 3); g.stroke(); }
  g.fillStyle = "rgba(40,25,12,0.9)"; g.beginPath(); g.ellipse(0, -36, 58, 9, 0, 0, TAU); g.fill(); g.fillRect(-30, -66, 60, 32);
  g.beginPath(); g.arc(-13, 0, 3, 0, TAU); g.arc(13, 0, 3, 0, TAU); g.fill();
  if (r() < 0.6) { g.beginPath(); g.moveTo(-22, 22); g.quadraticCurveTo(0, 14 + r() * 6, 22, 22); g.lineTo(18, 34); g.quadraticCurveTo(0, 28, -18, 34); g.closePath(); g.fill(); } // (a moustache)
  else { g.beginPath(); g.moveTo(-10, 26); g.lineTo(10, 26); g.stroke(); }
  for (let k = 0; k < 24; k++) { g.beginPath(); g.moveTo(-34 + r() * 68, 24 + r() * 26); g.lineTo(-34 + r() * 68, 30 + r() * 26); g.stroke(); } // (stubble and jaw)
  g.restore();
  const names = ["BLACK JACK KETCHUM", "DUTCH HENRY", "KID CURRY", "BIG NOSE GEORGE", "DIRTY DAVE", "SNAKE-EYE PETE", "CALICO JOE", "THE TULSA JACK"], price = ["$500", "$1,000", "$250", "$750", "$2,000"];
  g.font = '700 18px "Zilla Slab",Georgia,serif'; g.fillText(names[i % names.length], 128, 262);
  g.font = '15px Georgia,serif'; g.fillText("for robbery & murder", 128, 284);
  g.font = '48px "Sancreek","Rye",Georgia,serif'; g.fillText(price[(i * 3) % price.length], 128, 334); g.font = '700 12px Georgia,serif'; g.fillText("REWARD", 128, 352);
  g.globalCompositeOperation = "destination-out"; // torn corners
  for (const [x, y] of [[0, 0], [256, 0], [0, 360], [256, 360]]) if (r() < 0.6) { g.beginPath(); g.moveTo(x, y); g.lineTo(x + (x ? -1 : 1) * (6 + r() * 22), y); g.lineTo(x, y + (y ? -1 : 1) * (6 + r() * 26)); g.closePath(); g.fill(); }
  const m = new THREE.MeshStandardMaterial({ map: canvasTex(c), roughness: 0.95, alphaTest: 0.5, side: THREE.DoubleSide });
  DRESS.posters[i] = m; return m;
}

// ---- on every building: called by building() (06) with the group it's building, before the town is baked ----
function buildingProps(grp, w, h, d, pd, name, opt) {
  const k = TIERS[R.tier].clutter; if (!k) return;
  let seed = 0; for (const ch of name || "x") seed = (seed * 31 + ch.charCodeAt(0)) | 0; const r = rng(seed);
  const deckY = 0.25, front = d / 2 + 0.2;
  // lanterns either side of the door on iron brackets
  for (const e of [-1, 1]) { const b = bracketMesh(); b.position.set(e * 0.95, 2.45, front); grp.add(b); const l = brkTag(lanternMesh(), "lantern"); l.position.set(e * 0.95, 2.22, front + 0.3); grp.add(l); }
  // a step up onto the porch, in front of the door
  { const st = woodBox(1.7, 0.13, 0.36, MAT.plank, true); st.position.set(0, 0.065, d / 2 + pd + 0.36); grp.add(st); }
  // shutters beside the ground-floor windows, some hanging open at an angle
  if (!opt.brick && r() < 0.75) for (const sx of [-1, 1]) for (const e of [-1, 1]) { const sh = brkTag(woodBox(0.48, 1.32, 0.035, MAT.door), "shutter"); const open = r() < 0.25 ? (0.4 + r() * 0.5) * e * sx : 0;
    sh.position.set(sx * w * 0.3 + e * 0.76, 1.7, front + 0.02); if (open) { sh.rotation.y = open; sh.position.z += 0.12; } grp.add(sh); }
  // a bench against the wall
  if (r() < 0.7) { const b = brkTag(benchMesh(1.3 + r() * 0.4), "bench"), side = r() < 0.5 ? -1 : 1; b.position.set(side * (w * 0.3), deckY, front + 0.32); grp.add(b); }
  // things stacked at the ends of the porch: crates, sacks, a barrel
  for (const side of [-1, 1]) { if (r() > 0.75 * Math.min(1, k)) continue; const x0 = side * (w / 2 - 0.55), z0 = d / 2 + 0.75 + r() * 0.8, kind = r();
    if (kind < 0.4) { const s = 0.5 + r() * 0.2, c = brkTag(woodBox(s, s, s, MAT.woodDark), "crate", { hp: 2 }); c.position.set(x0, deckY + s / 2, z0); c.rotation.y = r() * 0.6; grp.add(c);
      if (r() < 0.6) { const s2 = s * (0.6 + r() * 0.25), c2 = brkTag(woodBox(s2, s2, s2, MAT.wood), "crate", { hp: 2 }); c2.position.set(x0 + (r() - 0.5) * 0.15, deckY + s + s2 / 2, z0); c2.rotation.y = r(); grp.add(c2); } }
    else if (kind < 0.7) { for (let i = 0; i < 2 + (r() * 2 | 0); i++) { const sk = brkTag(sackMesh(r), "sack"); sk.position.set(x0 + (r() - 0.5) * 0.6, deckY, z0 + (r() - 0.5) * 0.5); sk.rotation.y = r() * TAU; sk.scale.setScalar(0.85 + r() * 0.3); grp.add(sk); } }
    else { const b = brkTag(barrelMesh(0.9 + r() * 0.15), "barrel"); b.position.set(x0, deckY, z0); grp.add(b); } }
  // weeds along the front of the porch and at the foot of the side walls
  for (let i = 0; i < 4 + (r() * 4 | 0); i++) weedSpot(grp, (r() - 0.5) * (w + 0.4), d / 2 + pd + 0.3 + r() * 0.25, 0.25 + r() * 0.3);
  for (const e of [-1, 1]) for (let i = 0; i < 3 + (r() * 3 | 0); i++) weedSpot(grp, e * (w / 2 + 0.12 + r() * 0.2), (r() - 0.5) * d, 0.3 + r() * 0.4);
  // a rain barrel at a back corner
  if (r() < 0.6 * k) { const e = r() < 0.5 ? -1 : 1, b = brkTag(barrelMesh(1.05), "barrel"); b.position.set(e * (w / 2 + 0.45), 0, -d / 2 + 0.6); grp.add(b); }
  // wanted posters on the wall and on a porch post
  const pn = r() * 8 | 0, p1 = brkTag(new THREE.Mesh(new THREE.PlaneGeometry(0.36, 0.5), posterMat(pn)), "poster"); p1.position.set(-w * 0.12, 1.5 + r() * 0.2, front - 0.005); p1.rotation.z = (r() - 0.5) * 0.1; grp.add(p1); // (the NOTICE bills are at -0.42 w and 0.12 w)
  if (r() < 0.6) { const p2 = brkTag(new THREE.Mesh(new THREE.PlaneGeometry(0.14, 0.2), posterMat((pn + 3) % 8)), "poster"); p2.position.set(-w / 2 + 0.2 + (r() < 0.5 ? 0 : 3) * (w - 0.4) / 3, 1.55, d / 2 + pd + 0.185); p2.rotation.z = (r() - 0.5) * 0.08; grp.add(p2); } // (a handbill on a porch post)
}

// ---- the street's litter: instanced, a handful of draw calls ----
function buildClutter() {
  const k = TIERS[R.tier].clutter; if (!k) return; const r = rng(4242), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), sc = new THREE.Vector3();
  const inTown = (x, z) => { const dx = x - STREET.o[0], dz = z - STREET.o[1], al = dx * STREET.a[0] + dz * STREET.a[1], sd = dx * STREET.r[0] + dz * STREET.r[1]; return { al, sd }; };
  const avoid = (x, z) => Math.abs(x - LAY.board.x) < 1.6 && Math.abs(z - LAY.board.z) < 1.6; // (not under the word board)
  const pick = (alA, alB, sdA, sdB) => { for (let t = 0; t < 20; t++) { const al = lerp(alA, alB, r()), sd = lerp(sdA, sdB, r()), [x, z] = streetPt(al, sd); if (!avoid(x, z)) return [x, z]; } return streetPt(alA, sdA); };
  const put = (geo, mat, n, place, shadow) => { if (n <= 0) return null; const im = new THREE.InstancedMesh(geo, mat, n);
    for (let i = 0; i < n; i++) { const o = place(i); m4.compose(V3(o.x, groundVis(o.x, o.z) + (o.y || 0), o.z), q.setFromEuler(e.set(o.rx || 0, o.ry || 0, o.rz || 0)), sc.set(o.sx, o.sy ?? o.sx, o.sz ?? o.sx)); im.setMatrixAt(i, m4); if (o.col) im.setColorAt(i, o.col); }
    im.castShadow = !!shadow; im.receiveShadow = true; R.scene.add(im); return im; };
  // stones: a lot of little ones all over, some bigger at the edges of the street and round the porches
  const pg = [new THREE.IcosahedronGeometry(1, 1), new THREE.IcosahedronGeometry(1, 0)].map((g, gi) => { const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const v = _v1.fromBufferAttribute(p, i); v.multiplyScalar(1 + 0.3 * Math.sin(v.x * 5 + gi * 3) * Math.cos(v.z * 4 - gi)); v.y *= 0.55; p.setXYZ(i, v.x, v.y, v.z); } g.computeVertexNormals(); return g; });
  pg.forEach((g, gi) => put(g, MAT.rock, Math.round(380 * k), () => { const [x, z] = r() < 0.75 ? pick(-14, 62, -12, 12) : pick(-14, 62, (r() < 0.5 ? -1 : 1) * 8, (r() < 0.5 ? -1 : 1) * 12); const s = 0.018 + Math.pow(r(), 3) * (gi ? 0.16 : 0.09);
    return { x, z, y: -s * 0.2, sx: s * (0.8 + r() * 0.5), sy: s, sz: s * (0.8 + r() * 0.5), ry: r() * TAU, rx: (r() - 0.5) * 0.5 }; }, gi === 1));
  // broken boards and sticks, near the buildings and the gallows
  { const g = boxUV(new THREE.BoxGeometry(1, 1, 1), 1, 0.03, 0.12); put(g, MAT.woodDark, Math.round(34 * k), () => { const near = r() < 0.3, [x, z] = near ? [LAY.plat.x + (r() - 0.5) * 9, LAY.plat.z + (r() - 0.5) * 7] : pick(-4, 60, (r() < 0.5 ? -1 : 1) * 7.5, (r() < 0.5 ? -1 : 1) * 10.5);
    const len = 0.25 + r() * 1.1, wd = 0.04 + r() * 0.1; return { x, z, y: 0.012, sx: len, sy: 0.022 + r() * 0.012, sz: wd, ry: r() * TAU, rz: (r() - 0.5) * 0.08 }; }, true); }
  // bottles outside the saloon (some standing, most lying), cans, a few horseshoes
  { const prof = [[0, 0], [0.034, 0], [0.036, 0.01], [0.036, 0.15], [0.03, 0.175], [0.012, 0.2], [0.011, 0.245], [0.014, 0.25], [0.0, 0.25]].map(([a, b]) => new THREE.Vector2(a, b));
    const g = new THREE.LatheGeometry(prof, 10), mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.08, metalness: 0.0, envMapIntensity: 1.4 }), cols = [0x2c3a1c, 0x4a2a12, 0x23302a, 0x5a4022].map(c => new THREE.Color(c));
    put(g, mat, Math.round(16 * k), () => { const [x, z] = pick(14, 24, -9.5, -6.5), lying = r() < 0.7; return { x, z, y: lying ? 0.034 : 0, sx: 1, ry: r() * TAU, rz: lying ? Math.PI / 2 : 0, col: cols[r() * 4 | 0] }; }); }
  { const g = new THREE.CylinderGeometry(0.034, 0.034, 0.11, 12), mat = new THREE.MeshStandardMaterial({ color: 0x8a6a48, roughness: 0.55, metalness: 0.7, map: TEX.leather.map }), col = [0x9a7a58, 0x6a4a30, 0xa89070].map(c => new THREE.Color(c));
    put(g, mat, Math.round(12 * k), () => { const [x, z] = pick(4, 50, -10, 10); return { x, z, y: 0.034, sx: 1, ry: r() * TAU, rz: Math.PI / 2, rx: (r() - 0.5) * 0.3, col: col[r() * 3 | 0] }; }); }
  { const g = new THREE.TorusGeometry(0.058, 0.011, 5, 14, Math.PI * 1.45); g.rotateX(Math.PI / 2); put(g, MAT.iron, Math.round(7 * k), () => { const [x, z] = pick(30, 44, 5, 9.5); return { x, z, y: 0.008, sx: 1, sy: 1.6, ry: r() * TAU }; }); }
}

// ---- tumbleweeds: a tangle of dry twigs rolling and bouncing through on the wind, from upwind of the town and out the other side ----
function tumbleweedGeo(seed) {
  const r = rng(seed), parts = [];
  for (let i = 0; i < 46; i++) { const ax = V3(r() - 0.5, r() - 0.5, r() - 0.5).normalize(), u = V3(1, 0, 0).cross(ax).normalize(), v = ax.clone().cross(u), rad = 0.18 + r() * 0.2, a0 = r() * TAU, span = 1 + r() * 3, pts = [];
    for (let k = 0; k <= 6; k++) { const a = a0 + span * k / 6, rr = rad * (1 + 0.12 * Math.sin(k * 2.1 + i)); pts.push(u.clone().multiplyScalar(Math.cos(a) * rr).addScaledVector(v, Math.sin(a) * rr).addScaledVector(ax, (r() - 0.5) * 0.06)); }
    const tg = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 7, 0.0045 + r() * 0.004, 3, false); parts.push({ geo: tg.toNonIndexed() }); }
  for (const p of parts) for (const k of Object.keys(p.geo.attributes)) if (!["position", "normal", "uv"].includes(k)) p.geo.deleteAttribute(k);
  const g = mergeGeos(parts); g.clearGroups(); return g;
}
function buildTumbleweeds() {
  const k = TIERS[R.tier].clutter; if (!k) return; const n = Math.max(2, Math.round(3 * k)), mat = new THREE.MeshStandardMaterial({ color: 0xa4835a, roughness: 0.95, side: THREE.DoubleSide });
  const geo = tumbleweedGeo(77), im = new THREE.InstancedMesh(geo, mat, n); im.castShadow = true; im.receiveShadow = true; im.frustumCulled = false; R.scene.add(im);
  const r = rng(91), weeds = []; for (let i = 0; i < n; i++) weeds.push(tumbleSpawn({ r, rad: 0.32 + r() * 0.12, q: new THREE.Quaternion(), ph: r() * TAU }, true));
  DRESS.weeds = { im, weeds, m4: new THREE.Matrix4(), ax: new THREE.Vector3(), dq: new THREE.Quaternion(), s: new THREE.Vector3() };
}
// start one upwind of the street (or anywhere along it, at first)
function tumbleSpawn(w, anywhere) { const r = w.r, al = lerp(16, 62, r()), sd = anywhere ? lerp(-14, 14, r()) : -16 - r() * 8, wd = WIND.v.clone().setY(0).normalize();
  const [x, z] = streetPt(al, 0); w.p = V3(x, 0, z).addScaledVector(wd, anywhere ? sd : sd); w.v = 0; w.life = 0; w.hop = 0; w.vy = 0; w.y = 0; return w; }
function updateTumbleweeds(dt) {
  const D = DRESS.weeds; if (!D || !D.im.visible) return; const wind = WIND.v, ws = Math.hypot(wind.x, wind.z) || 1, dir = _v1.set(wind.x / ws, 0, wind.z / ws);
  D.weeds.forEach((w, i) => {
    const target = (0.9 + 0.5 * Math.sin(w.ph + w.life * 0.7)) * Math.min(3.2, ws * 1.4) * (1 + WIND.gust * 0.8); w.v += (target - w.v) * Math.min(1, dt * 1.5); w.life += dt;
    const step = w.v * dt; w.p.addScaledVector(dir, step); if (w.kick) { w.p.addScaledVector(w.kick, dt); w.kick.multiplyScalar(Math.max(0, 1 - 2.2 * dt)); } /* (a shot knocked it on: 12j) */ w.p.addScaledVector(V3(-dir.z, 0, dir.x), Math.sin(w.life * 0.9 + w.ph) * 0.15 * dt); // (a little drift across the wind)
    w.vy -= 9.8 * dt; w.y += w.vy * dt; if (w.y <= 0) { w.y = 0; w.vy = w.v > 0.8 && w.r() < dt * (0.5 + 0.35 * w.v) ? 1.0 + w.r() * 1.6 : 0; } // (it hops now and then on a stone)
    D.ax.set(dir.z, 0, -dir.x); D.dq.setFromAxisAngle(D.ax, step / w.rad); w.q.premultiply(D.dq); // (rolling: turned by the distance over its radius)
    const gy = groundVis(w.p.x, w.p.z); D.s.setScalar(w.rad / 0.38); D.m4.compose(_v2.set(w.p.x, gy + w.rad * 0.9 + w.y, w.p.z), w.q, D.s); D.im.setMatrixAt(i, D.m4);
    const dx = w.p.x - STREET.o[0], dz = w.p.z - STREET.o[1], sd = dx * STREET.r[0] + dz * STREET.r[1], al = dx * STREET.a[0] + dz * STREET.a[1];
    if (Math.abs(sd) > 30 || al < 8 || al > 90) tumbleSpawn(w); });
  D.im.instanceMatrix.needsUpdate = true;
}

// ---- painted advertisements on the side walls, faded to ghosts: sun-bleached lettering with the boards showing through ----
const GHOST_ADS = [["DR. HARTLEY'S", "ELIXIR", "CURES ALL ILLS", "#e8dcc0", "#7a2418"], ["BULL DURHAM", "TOBACCO", "SMOKE & CHEW", "#2a2018", "#e0c890"], ["COLD BEER", "5¢", "FREE LUNCH", "#e4d6b8", "#2a3a5a"],
  ["OATS · HAY", "GRAIN", "SOLD HERE", "#d8c8a0", "#3a2a18"], ["SARSAPARILLA", "", "FOR THE THIRSTY", "#6a2018", "#ecdcb4"], ["GUNS", "& AMMUNITION", "REPAIRS DONE", "#1e1c1a", "#d8b264"]];
function ghostAdMat(i) {
  DRESS.ads = DRESS.ads || []; if (DRESS.ads[i]) return DRESS.ads[i];
  const [a, b, c2, bg, fg] = GHOST_ADS[i % GHOST_ADS.length], W = 512, H = 320, c = document.createElement("canvas"); c.width = W; c.height = H; const g = c.getContext("2d"), r = rng(500 + i);
  g.fillStyle = bg; g.fillRect(0, 0, W, H); g.strokeStyle = fg; g.lineWidth = 8; g.strokeRect(14, 14, W - 28, H - 28);
  g.fillStyle = fg; g.textAlign = "center"; g.textBaseline = "middle";
  g.font = `${b ? 58 : 70}px "Sancreek","Rye",Georgia,serif`; g.fillText(a, W / 2, b ? 74 : 120, W - 60);
  if (b) { g.font = `700 ${b.length > 6 ? 70 : 110}px "Zilla Slab",Georgia,serif`; g.fillText(b, W / 2, 168, W - 60); }
  g.font = `italic 34px Georgia,serif`; g.fillText(c2, W / 2, 262, W - 80);
  // weathering: the paint gone where the boards are (vertical streaks), flaked patches, washed out toward the bottom
  g.globalCompositeOperation = "destination-out";
  for (let x = 0; x < W; x += 2) { const s = r(); if (s < 0.25) { g.fillStyle = `rgba(0,0,0,${0.3 + r() * 0.5})`; g.fillRect(x, 0, 1 + r() * 3, H); } }
  for (let k = 0; k < 160; k++) { g.fillStyle = `rgba(0,0,0,${0.4 + r() * 0.6})`; g.beginPath(); g.ellipse(r() * W, r() * H, 3 + r() * 18, 2 + r() * 10, r() * 3, 0, TAU); g.fill(); }
  const fade = g.createLinearGradient(0, 0, 0, H); fade.addColorStop(0, "rgba(0,0,0,0.25)"); fade.addColorStop(1, "rgba(0,0,0,0.6)"); g.fillStyle = fade; g.fillRect(0, 0, W, H);
  const m = new THREE.MeshStandardMaterial({ map: canvasTex(c), transparent: true, opacity: 0.85, roughness: 0.95, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  DRESS.ads[i] = m; return m;
}
// put one on whichever side wall of a building looks back up the street toward the gallows (where the game's camera is)
function buildingAd(grp, x, z, ry, w, h, d, idx) {
  if (!TIERS[R.tier].clutter) return; const lx = Math.cos(ry), lz = -Math.sin(ry), side = lx * -STREET.a[0] + lz * -STREET.a[1] > 0 ? 1 : -1; // (the local +x side faces down the street if this is positive)
  const bottom = 2.65, ph = h - 0.25 - bottom, pw = Math.min(d * 0.72, ph * 1.6); if (ph < 1.2) return; const m = new THREE.Mesh(new THREE.PlaneGeometry(pw, ph), ghostAdMat(idx)); // (above the side windows, under the eaves)
  m.position.set(side * (w / 2 + 0.012), bottom + ph / 2, -d * 0.08); m.rotation.y = side * Math.PI / 2; m.renderOrder = 2; grp.add(m);
}

// ---- dry grass and weeds where feet and wheels don't go: along the porches and walls, round posts, at the street's edges ----
DRESS.weedSpots = [];
function weedSpot(grp, lx, lz, s) { DRESS.weedSpots.push({ grp, lx, lz, s }); } // (in a building's own frame; made world once it's placed)
function buildTownWeeds() {
  const k = TIERS[R.tier].clutter; if (!k) return; const r = rng(777), pts = [];
  for (const W of DRESS.weedSpots) { W.grp.updateMatrixWorld(true); const p = W.grp.localToWorld(V3(W.lx, 0, W.lz)); pts.push([p.x, p.z, W.s]); }
  for (const px of LAY.postX) for (const dz of [-1.6, 1.6]) for (let i = 0; i < 3; i++) pts.push([px + (r() - 0.5) * 0.6, LAY.plat.z + dz + (r() - 0.5) * 0.5, 0.35 + r() * 0.3]); // (round the gallows' feet)
  for (let i = 0; i < Math.round(90 * k); i++) { const side = r() < 0.5 ? -1 : 1, [x, z] = streetPt(lerp(8, 60, r()), side * (8.6 + r() * 1.6)); pts.push([x, z, 0.3 + r() * 0.45]); } // (along the edges of the street)
  const cross = new THREE.PlaneGeometry(1, 1); cross.translate(0, 0.5, 0); const g2 = cross.clone(); g2.rotateY(Math.PI / 2); const geo = mergeGeos([{ geo: cross.toNonIndexed() }, { geo: g2.toNonIndexed() }]); geo.clearGroups();
  const mat = swayMat(new THREE.MeshStandardMaterial({ map: TEX.grass, alphaTest: 0.45, side: THREE.DoubleSide, roughness: 0.95, color: 0xcdb98a }), 0.3);
  const im = new THREE.InstancedMesh(geo, mat, pts.length), m4 = new THREE.Matrix4(), q = new THREE.Quaternion();
  pts.forEach(([x, z, s], i) => { q.setFromEuler(new THREE.Euler(0, r() * TAU, 0)); m4.compose(V3(x, groundVis(x, z) - 0.03, z), q, V3(s * 1.4, s, s * 1.4)); im.setMatrixAt(i, m4); });
  im.receiveShadow = true; R.scene.add(im); DRESS.weedSpots = [];
}

// ---- a windmill past the end of the street: a timber tower, a wheel of steel blades that turns with the wind, a tail vane ----
function buildWindmill() {
  if (!TIERS[R.tier].clutter) return; const [x, z] = streetPt(64, 15), y0 = groundVis(x, z), grp = new THREE.Group(), H = 10.5;
  const steel = new THREE.MeshStandardMaterial({ color: 0x8c8a84, metalness: 0.75, roughness: 0.45, map: TEX.leather.map });
  for (const [a, b] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { const leg = woodBox(0.16, H + 0.4, 0.16, MAT.woodDark); leg.position.set(a * 0.95, H / 2, b * 0.95); leg.rotation.set(-b * 0.075, 0, a * 0.075); grp.add(leg); }
  for (let k = 1; k < 5; k++) { const yy = k * H / 5, half = 0.95 + (H / 2 - yy) * Math.tan(0.075); // (girts round the tower where the legs are at that height, braces across each face)
    for (const [ax, rot] of [[0, 0], [1, Math.PI / 2]]) for (const e of [-1, 1]) { const girt = woodBox(half * 2 + 0.1, 0.07, 0.05, MAT.wood); girt.position.set(ax ? e * half : 0, yy, ax ? 0 : e * half); girt.rotation.y = rot; grp.add(girt);
      const len = Math.hypot(half * 2, H / 5), br = woodBox(0.05, len, 0.04, MAT.wood); br.position.set(ax ? e * half : 0, yy - H / 10, ax ? 0 : e * half); br.rotation.set(0, rot, (k % 2 ? 1 : -1) * Math.atan2(half * 2, H / 5)); grp.add(br); } }
  const deck = woodBox(1.0, 0.08, 1.0, MAT.plank); deck.position.y = H; grp.add(deck);
  const head = new THREE.Group(); head.position.y = H + 0.35; grp.add(head);
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 0.7, 12), steel); hub.rotation.x = Math.PI / 2; head.add(hub);
  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.8, 1.3), steel); tail.position.set(0, 0.1, -1.9); head.add(tail); const boom = woodBox(0.06, 0.06, 1.6, MAT.iron); boom.position.set(0, 0.0, -1.0); head.add(boom);
  const wheel = new THREE.Group(), parts = new THREE.Group(); // (the wheel's blades and rings merged into one mesh: one draw call, not twenty)
  for (let i = 0; i < 18; i++) { const bl = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.35, 0.012), steel); const a = i / 18 * TAU; bl.position.set(Math.sin(a) * 1.02, Math.cos(a) * 1.02, 0); bl.rotation.set(0, 0.45, -a, "ZYX"); parts.add(bl); } // (each blade twisted about its own length, then turned out to its place)
  for (const rr of [0.4, 1.68]) parts.add(new THREE.Mesh(new THREE.TorusGeometry(rr, 0.018, 4, 36), steel));
  parts.updateMatrixWorld(true); for (const m of bakeStatic(parts.children)) wheel.add(m); wheel.position.z = 0.42; head.add(wheel);
  head.rotation.y = Math.atan2(-WIND.v.x, -WIND.v.z); // (facing into the wind)
  grp.position.set(x, y0, z); grp.updateMatrixWorld(true);
  const tower = grp.children.filter(o => o.isMesh); for (const m of bakeStatic(tower)) R.scene.add(m); for (const m of tower) grp.remove(m); // (the tower merged by material too)
  head.position.y = H + 0.35; grp.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } }); R.scene.add(grp); DRESS.mill = { wheel, head, spin: 0 };
}
function updateWindmill(dt) { const M = DRESS.mill; if (!M) return; const ws = Math.hypot(WIND.v.x, WIND.v.z);
  M.spin += ((0.9 + ws * 0.9) * (1 + WIND.gust * 0.6) - M.spin) * Math.min(1, dt * 0.5); M.wheel.rotation.z -= M.spin * dt;
  const want = Math.atan2(-WIND.v.x, -WIND.v.z); M.head.rotation.y += Math.atan2(Math.sin(want - M.head.rotation.y), Math.cos(want - M.head.rotation.y)) * Math.min(1, dt * 0.3); }
