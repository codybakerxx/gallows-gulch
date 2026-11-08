// ---------- THE GUNSMITH'S RANGE (v54) ----------
// An Easter egg: the gunsmith's front door (the ASSAY OFFICE with GUNSMITH hanging under its sign, up the street on the right) glimmers
// while you're free in a round: light runs round its frame and the knob catches the sun. Tap it and you're out the back, at the firing
// line of his range, his weapons on a rack beside you (12t: nine of them). Pick one and shoot: everything downrange moves.
//   - bottles on a fence (1 point), three tin plates riding a rail back and forth (2), bandit cut-outs popping up from the dirt (3, 5 for
//     the head), a jackrabbit cut-out running a track (4), clays thrown across from a trap house (5), and a gong far back (2)
//   - free practice, or a timed round of a minute (the targets come faster), scored, the best with each weapon kept on this device
//   - Leave the range and you're back in the round where you left it, at the barrel, the weapon in your hand (12q, the revolver's rules:
//     shoot one of the townsfolk and the town draws on you, and you fight with it). Holster it and the round goes on; Draw takes it up
//     again; it's the gun you fight any shootout with, from the sword too (12d).
const RANGE = { on: false, built: false, grp: null, o: new THREE.Vector3(), f: new THREE.Vector3(), r: new THREE.Vector3(), tg: [], t: 0, score: 0, round: null, best: {}, pickOpen: false,
  door: null, doorSparks: [], doorGlow: null, doorT: 0, clayT: 2, fromCam: null, popT: 0, metaT: 0, sign: false, hint: false };
const RANGE_PTS = { bottle: 1, plate: 2, bandit: 3, head: 5, rabbit: 4, clay: 5, gong: 2 };
const RANGE_DOWN = Math.PI / 2; // (a bandit cut-out lying flat, fallen away from you)
const _rg1 = new THREE.Vector3(), _rg2 = new THREE.Vector3(), _rg3 = new THREE.Vector3();
function rangeLoadBest() { try { RANGE.best = JSON.parse(localStorage.getItem("gg_range_best") || "{}") || {}; } catch (e) { RANGE.best = {}; } }
function rangeSaveBest() { try { localStorage.setItem("gg_range_best", JSON.stringify(RANGE.best)); } catch (e) {} }

// ---- the door that glimmers ----
// warm light leaking round its edges and under it (pulsing), a soft halo on it, sparks running along the frame and one on the knob; the
// sparks and the halo keep a size on the screen however far off you are, so it can be picked out from down the street
function buildRangeDoor() {
  const B = (WORLD.blds || []).find(b => b.name === "ASSAY OFFICE"); if (!B) return; const zx = V3(B.s, 0, B.c), xx = V3(B.c, 0, -B.s);
  const at = (lx, ly, lz) => V3(B.x, B.y0, B.z).addScaledVector(xx, lx).addScaledVector(zx, lz).add(V3(0, ly, 0)), fz = B.d / 2 + 0.27;
  RANGE.door = { B, c: at(0, 1.35, fz), knob: at(0.4, 1.3, fz + 0.02), out: zx, frame: [[-0.58, 0.28], [-0.58, 2.47], [0.58, 2.47], [0.58, 0.28]].map(([x, y]) => at(x, y, fz)) };
  const tex = starTex(), spr = (c, s, map = tex) => { const m = new THREE.Sprite(new THREE.SpriteMaterial({ fog: false, map, color: new THREE.Color(c, c * 0.9, c * 0.62), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0 }));
    m.renderOrder = 5; m.scale.setScalar(s); m.visible = false; R.scene.add(m); return m; };
  RANGE.doorSparks = Array.from({ length: 7 }, () => ({ s: spr(1.5, 0.4), t: 1, wait: Math.random(), u: 0, life: 0.5 })); RANGE.doorGlow = spr(1.2, 0.6);
  RANGE.doorHalo = spr(0.9, 2.6, rangeGlowTex()); RANGE.doorHalo.position.copy(RANGE.door.c);
  // the light at the edges: strips of a soft band (bright down the middle, nothing at its sides) round the door, a little in front of it
  const c = document.createElement("canvas"); c.width = 64; c.height = 4; const g = c.getContext("2d"), gr = g.createLinearGradient(0, 0, 64, 0);
  gr.addColorStop(0, "rgba(255,200,120,0)"); gr.addColorStop(0.5, "rgba(255,214,150,1)"); gr.addColorStop(1, "rgba(255,200,120,0)"); g.fillStyle = gr; g.fillRect(0, 0, 64, 4);
  const band = canvasTex(c), mat = new THREE.MeshBasicMaterial({ map: band, color: 0xffc27a, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, side: THREE.DoubleSide });
  const edge = new THREE.Group(), strip = (w, h, x, y, rz) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); m.position.set(x, y, 0); m.rotation.z = rz; m.renderOrder = 4; edge.add(m); };
  strip(0.16, 2.22, -0.57, 1.36, 0); strip(0.16, 2.22, 0.57, 1.36, 0); strip(0.16, 1.26, 0, 2.47, Math.PI / 2); strip(0.22, 1.2, 0, 0.27, Math.PI / 2);
  edge.position.copy(at(0, 0, fz - 0.01)); edge.rotation.y = Math.atan2(B.s, B.c); edge.visible = false; R.scene.add(edge); RANGE.doorEdge = edge; RANGE.doorMat = mat;
  rangeLoadBest();
}
const doorLive = () => !!RANGE.door && !RANGE.on && STATE.played && !STATE.locked && !STATE.trap && (!STATE.over || STATE.lastWon) && !SIEGE.on && !CHASE.on && !ARMED.on && $("menu").hidden;
function updateRangeDoor(rdt) {
  const D = RANGE.door; if (!D) return; const on = doorLive(), T0 = RANGE.doorT += rdt, g = RANGE.doorGlow, h = RANGE.doorHalo; g.visible = h.visible = RANGE.doorEdge.visible = on; if (!on) { for (const p of RANGE.doorSparks) p.s.visible = false; return; }
  const cam = R.camera.position, dist = D.c.distanceTo(cam), px = dist * Math.tan(THREE.MathUtils.degToRad(R.camera.fov) / 2) / 420; // (a pixel on a phone's screen, in metres there)
  const facing = clamp(_rg1.copy(cam).sub(D.c).normalize().dot(D.out) * 1.4, 0, 1), beat = 0.5 + 0.5 * Math.sin(T0 * 2.2); // (the light's for the street side)
  RANGE.doorMat.opacity = (0.35 + 0.4 * beat) * facing; h.material.opacity = (0.14 + 0.16 * beat) * facing; h.scale.setScalar(Math.max(2.6, px * 70));
  g.position.copy(D.knob); g.material.opacity = (0.6 + 0.4 * Math.sin(T0 * 3.1)) * facing; g.scale.setScalar(Math.max(0.45 + 0.2 * Math.sin(T0 * 2.3), px * 20)); g.material.rotation += rdt * 0.8;
  // light running round the frame: sparks that travel a little way along it and go out
  for (const p of RANGE.doorSparks) {
    if (p.t < 1) { p.t = Math.min(1, p.t + rdt / p.life); const e = Math.sin(p.t * Math.PI), F = D.frame, u = ((p.u + p.t * 0.12) % 1) * 3, i = Math.min(2, Math.floor(u)), f = u - i;
      p.s.position.lerpVectors(F[i], F[i + 1], f); p.s.material.opacity = e * facing; p.s.scale.setScalar(Math.max(0.22 + 0.45 * e, px * 26 * e)); p.s.material.rotation += rdt * 2.5; if (p.t >= 1) { p.s.visible = false; p.wait = rnd(0.1, 0.6); } }
    else if ((p.wait -= rdt) <= 0) { p.t = 0; p.u = Math.random(); p.life = rnd(0.45, 0.8); p.s.visible = true; } }
}
function doorTap(e) {
  if (!doorLive()) return false; const D = RANGE.door, r = $("scene").getBoundingClientRect(), p = _rg1.copy(D.c).project(R.camera); if (p.z > 1 || Math.abs(p.x) > 1.05 || Math.abs(p.y) > 1.05) return false;
  const sx = r.left + (p.x * 0.5 + 0.5) * r.width, sy = r.top + (-p.y * 0.5 + 0.5) * r.height, rad = Math.max(40, 1.2 / Math.max(1, D.c.distanceTo(R.camera.position)) / Math.tan(THREE.MathUtils.degToRad(R.camera.fov) / 2) * r.height * 0.5);
  if (Math.hypot(e.clientX - sx, e.clientY - sy) > rad) return false;
  if (e.cancelable) e.preventDefault(); rangeEnter(); return true;
}

// ---- the range itself: out the back of the gunsmith's, in its own frame (u across to the right, v downrange, y up) ----
function rangePt(u, v, y = 0, out = new THREE.Vector3()) { out.copy(RANGE.o).addScaledVector(RANGE.r, u).addScaledVector(RANGE.f, v); out.y = groundVis(out.x, out.z) + y; return out; }
const rangeYaw = () => Math.atan2(RANGE.f.x, RANGE.f.z);
function buildRange() {
  if (RANGE.built || !RANGE.door) return; RANGE.built = true; const B = RANGE.door.B, zx = V3(B.s, 0, B.c);
  RANGE.f.copy(zx).negate(); RANGE.r.set(-RANGE.f.z, 0, RANGE.f.x); RANGE.o.set(B.x, 0, B.z).addScaledVector(zx, -B.d / 2 - 2.6); // (r: to your right as you face downrange)
  const G = RANGE.grp = new THREE.Group(); R.scene.add(G); const M = armsMats(), yaw = rangeYaw();
  // ry turns a thing from facing downrange (its +z away from you); RANGE_FACE turns it round to face you
  const put = (o, u, v, y = 0, ry = 0) => { rangePt(u, v, y, o.position); o.rotation.order = "YXZ"; o.rotation.y = yaw + ry; G.add(o); o.traverse(q => { if (q.isMesh) { q.castShadow = true; q.receiveShadow = true; } }); return o; };
  const box = (w, h, d, mat) => woodBox(w, h, d, mat), dyn = o => { o.traverse(q => { if (q.isMesh) q.userData.dyn = true; }); return o; };
  // the firing line: a bench, the rack of his weapons, posts and rope down both sides; the backstop: an earth bank behind a plank wall
  { const b = new THREE.Group(); const top = box(1.8, 0.07, 0.62, MAT.woodDark); top.position.y = 0.9; b.add(top); for (const x of [-0.8, 0.8]) for (const z of [-0.25, 0.25]) { const l = box(0.08, 0.9, 0.08, MAT.wood); l.position.set(x, 0.45, z); b.add(l); } put(b, 0.6, 0.85); }
  { const rack = new THREE.Group(), bd = box(2.4, 1.3, 0.06, MAT.woodDark); bd.position.y = 1.35; rack.add(bd); for (const x of [-1.1, 1.1]) { const l = box(0.1, 2.1, 0.1, MAT.wood); l.position.set(x, 1.05, 0); rack.add(l); }
    ARMS_LIST.forEach((id, i) => { const m = armsBuild(id); const col = i % 3, row = (i / 3) | 0, s = id === "bow" ? 0.5 : id === "gatling" ? 0.7 : ["winchester", "sharps", "shotgun"].includes(id) ? 0.85 : 1.6;
      m.scale.setScalar(s); m.position.set(-0.75 + col * 0.75, 1.82 - row * 0.4, 0.07); m.rotation.set(0, -Math.PI / 2, id === "bow" ? Math.PI / 2 : 0); if (id === "bow") m.position.x += 0.25; rack.add(m); });
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 0.34), new THREE.MeshStandardMaterial({ map: signTex("GUNSMITH'S RANGE", 1024, 158, "#d9c8a4", "#3a2214"), roughness: 0.9 })); sign.position.set(0, 2.24, 0.05); rack.add(sign);
    put(rack, -3.4, 1.4, 0, Math.atan2(-3.4, -1.4)); } // (turned to face you: you're 3.4 m to its right and 1.4 back)
  for (const s of [-1, 1]) for (let v = 1; v <= 31; v += 6) { const p = box(0.12, 1.1, 0.12, MAT.wood); put(p, s * 7.8, v, 0.55); }
  for (const s of [-1, 1]) { const pts = []; for (let v = 1; v <= 31; v += 1) pts.push(rangePt(s * 7.8, v, 0.95)); G.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 60, 0.012, 4), MAT.rope)); }
  { const bank = new THREE.Mesh(new THREE.BoxGeometry(19, 3.4, 4), new THREE.MeshStandardMaterial({ color: 0x8a6a48, roughness: 1 })); bank.rotation.x = -0.2; put(bank, 0, 33.6, 1.0); bank.rotation.x = -0.2;
    const wall = new THREE.Group(); for (let i = 0; i < 9; i++) { const pl = box(1.95, 2.4, 0.08, i % 2 ? MAT.wood : MAT.woodDark); pl.position.set(-8 + i * 2, 1.2, 0); wall.add(pl); } put(wall, 0, 31.2); }
  RANGE.tg = [];
  // bottles on a fence, 6.5 m out
  const bottleM = [0x2f5a2a, 0x6a3a14, 0x3a5a6a].map(c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.12, metalness: 0.1, transparent: true, opacity: 0.9 }));
  { const f = new THREE.Group(), rail = box(4.6, 0.08, 0.1, MAT.woodDark); rail.position.y = 0.82; f.add(rail); for (const x of [-2.2, 0, 2.2]) { const p = box(0.1, 0.86, 0.1, MAT.wood); p.position.set(x, 0.43, 0); f.add(p); } put(f, 0, 6.5); }
  for (let i = 0; i < 6; i++) { const b = new THREE.Group(), mt = bottleM[i % 3], body = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.036, 0.17, 10), mt); body.position.y = 0.085; b.add(body);
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.032, 0.08, 8), mt); neck.position.y = 0.21; b.add(neck); put(b, -1.75 + i * 0.7, 6.5, 0.86); dyn(b);
    RANGE.tg.push({ kind: "bottle", m: b, down: 0, r: 0.045, h: 0.25 }); }
  // three tin plates hung from a rail, 10.5 m out, riding it back and forth
  { const rail = new THREE.Group(), bar = box(7.4, 0.06, 0.06, MAT.iron); bar.position.y = 1.85; rail.add(bar); for (const x of [-3.7, 3.7]) { const p = box(0.12, 1.9, 0.12, MAT.wood); p.position.set(x, 0.95, 0); rail.add(p); } put(rail, 0, 10.5); }
  const tinM = new THREE.MeshStandardMaterial({ color: 0xd8d4c8, metalness: 0.7, roughness: 0.35 }), dotM = new THREE.MeshStandardMaterial({ color: 0xa8241a, roughness: 0.6 });
  for (let i = 0; i < 3; i++) { const piv = new THREE.Group(), rod = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.32, 5), MAT.iron); rod.position.y = -0.16; piv.add(rod);
    const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.012, 22).rotateX(Math.PI / 2), tinM); plate.position.y = -0.47; piv.add(plate);
    const dot = new THREE.Mesh(new THREE.CircleGeometry(0.05, 16), dotM); dot.position.set(0, -0.47, -0.007); dot.rotation.y = Math.PI; piv.add(dot); put(piv, 0, 10.5, 1.82); dyn(piv);
    RANGE.tg.push({ kind: "plate", m: piv, plate, off: (i - 1) * 1.2, swing: 0, sv: 0, r: 0.16 }); }
  // bandits on boards that pop up from the dirt, 14 to 22 m out
  const banditTex = rangeBanditTex();
  [[-4.4, 14], [-1.5, 18], [1.7, 15.5], [4.6, 21.5]].forEach(([u, v]) => { const piv = new THREE.Group(), cut = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 1.25), new THREE.MeshStandardMaterial({ map: banditTex, transparent: true, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.9 }));
    cut.position.y = 0.66; cut.rotation.y = Math.PI; piv.add(cut); const base = box(0.7, 0.1, 0.14, MAT.woodDark); put(base, u, v + 0.12, 0.05); put(piv, u, v, 0.03); piv.rotation.x = RANGE_DOWN; dyn(piv);
    RANGE.tg.push({ kind: "bandit", m: piv, st: "down", t: rnd(0.5, 2.5), ang: RANGE_DOWN }); });
  // a jackrabbit on a board, running a track across at 19.5 m, hay bales at either end
  { const tr = box(14, 0.05, 0.25, MAT.woodDark); put(tr, 0, 19.5, 0.02); for (const s of [-1, 1]) { const hb = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.7, 0.6), MAT.hay); put(hb, s * 7.4, 19.4, 0.35); }
    const piv = new THREE.Group(), rab = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.42), new THREE.MeshStandardMaterial({ map: rangeRabbitTex(), transparent: true, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.9 }));
    rab.position.y = 0.23; piv.add(rab); put(piv, -7.2, 19.5, 0.05); piv.visible = false; dyn(piv); RANGE.tg.push({ kind: "rabbit", m: piv, st: "wait", t: 1.5, dir: 1, u: -7.2, flip: 0 }); }
  // the trap house on the left, 12 m out, and its clays
  { const th = new THREE.Group(), hs = box(1.2, 1.0, 1.2, MAT.woodDark); hs.position.y = 0.5; th.add(hs); const rf = box(1.4, 0.08, 1.4, MAT.wood); rf.position.y = 1.04; th.add(rf); put(th, -8.2, 12); }
  const clayM = new THREE.MeshStandardMaterial({ color: 0xe0662a, roughness: 0.7 });
  for (let i = 0; i < 3; i++) { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.045, 0.022, 14), clayM); c.visible = false; G.add(c); dyn(c); RANGE.tg.push({ kind: "clay", m: c, live: false, vel: V3(), r: 0.075 }); }
  // and a gong far back, 27 m out
  { const fr = new THREE.Group(); for (const x of [-0.7, 0.7]) { const p = box(0.1, 2.4, 0.1, MAT.wood); p.position.set(x, 1.2, 0); fr.add(p); } const cb = box(1.6, 0.1, 0.1, MAT.wood); cb.position.y = 2.38; fr.add(cb); put(fr, -2.4, 27);
    const piv = new THREE.Group(), disc = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.025, 28).rotateX(Math.PI / 2), MAT.brass); disc.position.y = -0.72; piv.add(disc); const ch = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.34, 4), MAT.iron); ch.position.y = -0.18; piv.add(ch);
    put(piv, -2.4, 27, 2.33); dyn(piv); RANGE.tg.push({ kind: "gong", m: piv, disc, swing: 0, sv: 0, r: 0.36 }); }
  G.visible = false;
}
function rangeGlowTex() { const c = document.createElement("canvas"); c.width = c.height = 64; const g = c.getContext("2d"), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, "rgba(255,226,170,1)"); gr.addColorStop(0.35, "rgba(255,190,110,0.45)"); gr.addColorStop(1, "rgba(255,170,90,0)"); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return canvasTex(c); }
// the bandit and the rabbit, painted on their boards
function rangeBanditTex() { const c = document.createElement("canvas"); c.width = 256; c.height = 512; const x = c.getContext("2d");
  x.fillStyle = "#5a3a22"; x.beginPath(); x.moveTo(40, 512); x.lineTo(46, 250); x.quadraticCurveTo(128, 196, 210, 250); x.lineTo(216, 512); x.fill(); // (his coat)
  x.fillStyle = "#d2a27a"; x.beginPath(); x.arc(128, 172, 56, 0, TAU); x.fill(); x.fillStyle = "#7a1a14"; x.fillRect(72, 178, 112, 40); // (his face, a bandana over his mouth)
  x.fillStyle = "#1e1612"; x.fillRect(40, 110, 176, 18); x.beginPath(); x.moveTo(80, 112); x.lineTo(92, 42); x.lineTo(164, 42); x.lineTo(176, 112); x.fill(); x.fillRect(100, 152, 14, 10); x.fillRect(142, 152, 14, 10); // (his hat, his eyes)
  x.strokeStyle = "#f0e4cb"; x.lineWidth = 6; x.beginPath(); x.arc(128, 360, 60, 0, TAU); x.stroke(); x.beginPath(); x.arc(128, 360, 28, 0, TAU); x.stroke(); // (rings on his chest)
  return canvasTex(c); }
function rangeRabbitTex() { const c = document.createElement("canvas"); c.width = 256; c.height = 174; const x = c.getContext("2d"); x.fillStyle = "#8a6440";
  x.beginPath(); x.ellipse(120, 115, 88, 46, 0, 0, TAU); x.fill(); x.beginPath(); x.ellipse(196, 82, 34, 28, 0, 0, TAU); x.fill();
  x.beginPath(); x.ellipse(196, 34, 9, 34, -0.25, 0, TAU); x.fill(); x.beginPath(); x.ellipse(214, 36, 9, 32, 0.15, 0, TAU); x.fill();
  x.fillStyle = "#f0e4cb"; x.beginPath(); x.arc(32, 104, 16, 0, TAU); x.fill(); x.fillStyle = "#1e1612"; x.beginPath(); x.arc(206, 78, 5, 0, TAU); x.fill(); return canvasTex(c); }

// ---- each frame: the door, and out on the range the targets move ----
function updateRange(rdt) {
  updateRangeDoor(rdt); if (!RANGE.on) return; RANGE.t += rdt; const T0 = RANGE.t, fast = RANGE.round ? 1.6 : 1, yaw = rangeYaw();
  RANGE.slide = (RANGE.slide || 0) + rdt * (RANGE.round ? 1.45 : 1.1);
  for (const g of RANGE.tg) {
    if (g.kind === "bottle") { if (g.down > 0 && (g.down -= rdt) <= 0) g.m.visible = true; }
    else if (g.kind === "plate") { rangePt(Math.sin(RANGE.slide) * 2.2 + g.off, 10.5, 1.82, g.m.position);
      g.sv += (-g.swing * 40 - g.sv * 3) * rdt; g.swing += g.sv * rdt; g.m.rotation.x = -g.swing; }
    else if (g.kind === "bandit") { g.t -= rdt * fast;
      if (g.st === "down" && g.t <= 0) { g.st = "rise"; g.t = 0.25; Sound.knock(g.m.position, 0.15); }
      else if (g.st === "rise") { g.ang = RANGE_DOWN * Math.max(0, g.t) / 0.25; if (g.t <= 0) { g.st = "up"; g.t = rnd(1.8, 2.8); g.ang = 0; } }
      else if (g.st === "up" && g.t <= 0) g.st = "fall";
      else if (g.st === "fall" || g.st === "hit") { g.ang = Math.min(RANGE_DOWN, g.ang + rdt * (g.st === "hit" ? 9 : 5)); if (g.ang >= RANGE_DOWN) { g.st = "down"; g.t = rnd(0.6, 2.6); } }
      g.m.rotation.x = g.ang; }
    else if (g.kind === "rabbit") { g.t -= rdt * fast;
      if (g.st === "wait" && g.t <= 0) { g.st = "run"; g.flip = 0; g.m.visible = true; g.m.rotation.z = 0; }
      if (g.st === "run") { g.u += g.dir * 6.2 * rdt * (RANGE.round ? 1.25 : 1); rangePt(g.u, 19.5, 0.05 + Math.abs(Math.sin(T0 * 11)) * 0.18, g.m.position); g.m.rotation.y = yaw + (g.dir > 0 ? Math.PI : 0);
        if (Math.abs(g.u) > 7.2) { g.u = Math.sign(g.u) * 7.2; g.dir = -g.dir; g.st = "wait"; g.t = rnd(1.0, 2.2); g.m.visible = false; } }
      else if (g.st === "hit") { g.flip += rdt * 9; g.m.rotation.z = g.flip * (g.dir > 0 ? -1 : 1); g.m.position.y -= rdt * 0.6; if (g.flip > 2.4) { g.m.visible = false; g.st = "wait"; g.t = rnd(1.4, 2.4); g.u = g.dir > 0 ? -7.2 : 7.2; } } }
    else if (g.kind === "clay") { if (!g.live) continue; g.vel.y -= 9.8 * rdt; g.m.position.addScaledVector(g.vel, rdt); g.m.rotation.y += rdt * 14;
      if (g.m.position.y < groundVis(g.m.position.x, g.m.position.z) + 0.02) { g.live = false; g.m.visible = false; Sound.knock(g.m.position, 0.2); } }
    else if (g.kind === "gong") { g.sv += (-g.swing * 9 - g.sv * 0.6) * rdt; g.swing += g.sv * rdt; g.m.rotation.x = -g.swing; }
  }
  // a clay thrown across from the trap house now and then
  if ((RANGE.clayT -= rdt * fast) <= 0) { RANGE.clayT = rnd(2.8, 4.2); const c = RANGE.tg.find(g => g.kind === "clay" && !g.live); if (c) { c.live = true; c.m.visible = true; rangePt(-7.6, 12, 1.1, c.m.position);
    c.vel.copy(RANGE.r).multiplyScalar(rnd(7.5, 10.5)).addScaledVector(RANGE.f, rnd(-1.2, 1.8)); c.vel.y = rnd(6.5, 8.5); Sound.clank(c.m.position); } }
  const Rd = RANGE.round; if (Rd && (Rd.t -= rdt) <= 0) rangeRoundEnd(false);
  if (RANGE.popT > 0 && (RANGE.popT -= rdt) <= 0) $("rangePop").hidden = true;
  if ((RANGE.metaT -= rdt) <= 0) { RANGE.metaT = 0.25; if (ARMED.reloadT <= 0) $("meta").textContent = rangeMeta(); }
}
function rangeMeta() { const Rd = RANGE.round, b = RANGE.best[ARMS.cur]; return Rd ? `Score ${RANGE.score} · 0:${String(Math.max(0, Math.ceil(Rd.t))).padStart(2, "0")}` : `Score ${RANGE.score}${b ? ` · Best ${b}` : ""}`; }

// ---- what a shot meets out there ----
// the first target along ro + t rd (t up to far), or the backstop, the bench, the posts, the ground; null if nothing
function rangeHit(ro, rd, far, done) { // (done: what this shot's already hit, a shotgun's pellets after the first: each target scores once a shot)
  let best = null; const tryT = (t, g, part) => { if (t > 0 && t <= far && (!best || t < best.t)) best = { t, g, part }; };
  for (const g of RANGE.tg) { if (done && done.has(g)) continue;
    if (g.kind === "bottle") { if (g.down > 0) continue; const a = g.m.getWorldPosition(V3()), b = a.clone(); b.y += g.h; tryT(rayCapsule(ro, rd, a, b, g.r + 0.012), g); }
    else if (g.kind === "plate" || g.kind === "gong") { if (g.kind === "plate" && Math.abs(g.swing) > 0.3) continue; const c = (g.kind === "plate" ? g.plate : g.disc).getWorldPosition(_rg1); tryT(raySphere(ro, rd, c, g.r), g); }
    else if (g.kind === "bandit") { if ((g.st !== "up" && g.st !== "rise") || g.ang > 0.9) continue; g.m.updateMatrixWorld(true); const head = g.m.localToWorld(V3(0, 1.08, 0)), th = raySphere(ro, rd, head, 0.16);
      const tb = rayCapsule(ro, rd, g.m.localToWorld(V3(0, 0.12, 0)), g.m.localToWorld(V3(0, 0.86, 0)), 0.25); if (th > 0 && (tb <= 0 || th <= tb + 0.05)) tryT(th, g, "head"); else tryT(tb, g); }
    else if (g.kind === "rabbit") { if (g.st !== "run") continue; g.m.updateMatrixWorld(true); tryT(raySphere(ro, rd, g.m.localToWorld(V3(0, 0.23, 0)), 0.27), g); }
    else if (g.kind === "clay") { if (!g.live) continue; tryT(raySphere(ro, rd, g.m.position, g.r + Math.min(0.06, g.m.position.distanceTo(ro) * 0.004)), g); } }
  const env = sceneryRay(ro, rd, far);
  if (env && (!best || env.distance < best.t)) return { t: env.distance, at: env.point.clone(), apply: () => envShot(env, rd) };
  if (!best) return null; const at = ro.clone().addScaledVector(rd, best.t), g = best.g, part = best.part;
  return { t: best.t, at, apply: () => { if (done) done.add(g); rangeScore(g, at, part); } };
}
function raySphere(ro, rd, c, r) { const ox = ro.x - c.x, oy = ro.y - c.y, oz = ro.z - c.z, b = ox * rd.x + oy * rd.y + oz * rd.z, h = b * b - (ox * ox + oy * oy + oz * oz - r * r); if (h < 0) return -1; const t = -b - Math.sqrt(h); return t > 0 ? t : -1; }
// a target hit: what it does, and the points
function rangeScore(g, at, part) {
  let pts = RANGE_PTS[g.kind] || 1, what = g.kind;
  if (g.kind === "bottle") { g.m.visible = false; g.down = RANGE.round ? 2.2 : 3.5; Sound.clip(siegePick("glass", 3), at, 0.9, 0, 0.2, rnd(0.95, 1.08)); puff(at, 10, 0.25, 0.05, 0.6, 0.6, 0xbfe0c0); }
  else if (g.kind === "plate") { g.sv += 9; Sound.tinTick(at, 1); Sound.clank(at); }
  else if (g.kind === "bandit") { g.st = "hit"; Sound.knock(at, 0.8); if (part === "head") { pts = RANGE_PTS.head; what = "head"; } puff(at, 6, 0.15, 0.05, 0.6, 0.6, 0x8a6a48); }
  else if (g.kind === "rabbit") { g.st = "hit"; g.flip = 0; Sound.knock(at, 0.7); }
  else if (g.kind === "clay") { g.live = false; g.m.visible = false; Sound.crack(at, 0.4); puff(at, 18, 0.35, 0.07, 0.9, 0.8, 0xe0662a); }
  else if (g.kind === "gong") { g.sv += 2.2; Sound.bell(at, 0.55); }
  RANGE.score += pts; const P = $("rangePop"); P.textContent = `+${pts} ${{ bottle: "Bottle", plate: "Tin plate", bandit: "Bandit", head: "Head shot!", rabbit: "Jackrabbit", clay: "Clay", gong: "Gong" }[what]}`;
  P.hidden = false; P.classList.remove("pop"); void P.offsetWidth; P.classList.add("pop"); RANGE.popT = 1.1; if (ARMED.reloadT <= 0) $("meta").textContent = rangeMeta();
}
// dynamite out on the range: everything up within its reach
function rangeBlast(at, rad) { for (const g of RANGE.tg) { const p = (g.kind === "plate" ? g.plate : g.kind === "gong" ? g.disc : g.m).getWorldPosition(V3()); if (g.kind === "bandit") p.y += 0.6;
  if (p.distanceTo(at) > rad) continue; if ((g.kind === "bottle" && g.down <= 0) || g.kind === "plate" || (g.kind === "bandit" && (g.st === "up" || g.st === "rise")) || (g.kind === "rabbit" && g.st === "run") || (g.kind === "clay" && g.live) || g.kind === "gong") rangeScore(g, p, null); } }

// the desert's scatter (scrub, grass, stones, cacti: instanced, 06 and 07c) standing in the lanes is put out of the way while you're
// there, and back as it was when you go
function rangeClear(on) {
  if (!on) { for (const [o, list] of RANGE.cleared || []) { for (const [i, m] of list) o.setMatrixAt(i, m); o.instanceMatrix.needsUpdate = true; } RANGE.cleared = null; return; }
  if (RANGE.cleared) return; RANGE.cleared = []; const m4 = new THREE.Matrix4(), p = new THREE.Vector3(), none = new THREE.Matrix4().makeScale(0, 0, 0);
  for (const o of R.scene.children) { if (!o.isInstancedMesh || (DRESS.weeds && o === DRESS.weeds.im)) continue; /* (not the street's tumbleweeds: they roll) */ let list = null;
    for (let i = 0; i < o.count; i++) { o.getMatrixAt(i, m4); p.setFromMatrixPosition(m4).sub(RANGE.o); const u = p.dot(RANGE.r), v = p.dot(RANGE.f);
      if (Math.abs(u) < 9 && v > -2 && v < 37) { (list || (list = [])).push([i, m4.clone()]); o.setMatrixAt(i, none); } }
    if (list) { o.instanceMatrix.needsUpdate = true; RANGE.cleared.push([o, list]); } }
}
// ---- going in, picking, and coming out ----
function rangeFade(dur, mid) { const f = $("rangeFade"), tok = RANGE.tok = (RANGE.tok || 0) + 1; f.hidden = false; f.style.transition = `opacity ${dur}s`; requestAnimationFrame(() => { f.style.opacity = 1; });
  setTimeout(() => { if (RANGE.tok === tok) mid(); requestAnimationFrame(() => { f.style.opacity = 0; setTimeout(() => { if (f.style.opacity === "0") f.hidden = true; }, dur * 1000 + 60); }); }, dur * 1000 + 30); }
const camFrom = () => { R.camera.updateMatrixWorld(); const f = _rg1.set(0, 0, -1).applyQuaternion(R.camera.quaternion);
  return { pos: CAM.pos.clone(), tgt: CAM.tgt.clone(), fov: CAM.fov, name: CAM.name, follow: CAM.follow, cpos: R.camera.position.clone(), yaw: Math.atan2(f.x, f.z), pitch: Math.asin(clamp(f.y, -1, 1)) }; };
function rangeEnter() {
  if (RANGE.on || RANGE.going) return; RANGE.going = true; buildRange(); Sound.creak(RANGE.door.c, 0.6); STATE.locked = true; LOOK.drag = null;
  if (FREE.on) { const el = FREE.which; freeReset(); if (el) el.hidden = false; } // (a sign put away: it comes back when you're back in the round)
  RANGE.sign = !$("sign").hidden; RANGE.hint = !$("hintBox").hidden; RANGE.fromCam = camFrom();
  rangeFade(0.35, () => { const A = ARMED; RANGE.going = false; RANGE.on = true; RANGE.grp.visible = true; rangeClear(true); RANGE.score = 0; RANGE.round = null; RANGE.t = 0; RANGE.clayT = 1.5;
    $("sign").hidden = true; $("skip").hidden = true; showHintBox(false); LOOK.yaw = LOOK.pitch = 0; LOOK.ease = false;
    A.on = true; A.range = true; A.t = 0; A.cool = 0; A.lift = null; A.back = null; rangePt(0, 0, 1.56, A.eye); A.yaw = rangeYaw(); A.pitch = -0.03;
    A.from = { pos: A.eye.clone(), tgt: A.eye.clone().add(RANGE.f), fov: 54, name: "armed", follow: null, cpos: A.eye.clone(), yaw: A.yaw, pitch: A.pitch };
    armsEquip(ARMS.own || "colt"); armsLoad(A); A.reloads = 99; ARMS.mode = "range"; ARMS.drawT = 0; SIEGE.vm.kick = 0; SIEGE.recoil = 0;
    showArmedUI(true); $("armBack").hidden = true; $("rangeBar").hidden = false; $("siegeTip").hidden = true; A.tip = 0; A.tipNext = null; armedHud(); rangePicker(true); });
}
function rangePicker(on) { RANGE.pickOpen = on; $("rangePick").hidden = !on; if (on) { ARMS.trig = false; for (const b of document.querySelectorAll("#rangePick .rpw")) b.classList.toggle("cur", b.dataset.w === ARMS.cur); } }
function rangePick(id) { const A = ARMED; armsEquip(id); armsLoad(A); A.reloads = 99; ARMS.mode = "range"; ARMS.drawT = 0; Sound.clip("cock0", null, 0.8, 0, 0.05); rangePicker(false); armedHud();
  const t = $("siegeTip"); t.textContent = `${ARMS_DEF[id].name}: ${ARMS_DEF[id].blurb}`; t.hidden = false; A.tip = 3.5; A.tipNext = id === "sharps" ? "Scope to look down it" : null; }
function rangeRoundStart() { if (RANGE.round) return; RANGE.score = 0; RANGE.round = { t: 60 }; RANGE.clayT = 1; for (const g of RANGE.tg) if (g.kind === "bandit" && g.st === "down") g.t = rnd(0.2, 1.2);
  armsLoad(ARMED); ARMED.reloads = 99; $("rangeRes").hidden = true; $("rangeRound").textContent = "Stop round"; Sound.bell(RANGE.o, 0.4); $("meta").textContent = rangeMeta(); armedHud(); }
function rangeRoundEnd(stopped) { const Rd = RANGE.round; if (!Rd) return; RANGE.round = null; $("rangeRound").textContent = "Timed round"; if (stopped) return; ARMS.trig = false;
  const id = ARMS.cur, prev = RANGE.best[id] || 0, best = Math.max(prev, RANGE.score); RANGE.best[id] = best; rangeSaveBest(); Sound.bell(RANGE.o, 0.6);
  $("rangeResScore").textContent = RANGE.score; $("rangeResLine").textContent = RANGE.score > prev && prev > 0 ? `A new best with the ${ARMS_DEF[id].short}!` : `Best with the ${ARMS_DEF[id].short}: ${best}`; $("rangeRes").hidden = false; }
// out the way you came: back in the round where you were, at the barrel, the weapon in your hand (a fresh load from the gunsmith)
function rangeLeave() {
  if (!RANGE.on || RANGE.going) return; RANGE.going = true; ARMS.trig = false;
  rangeFade(0.35, () => { const A = ARMED; RANGE.going = false; ARMS.own = ARMS.cur || ARMS.own || "colt"; rangeOff(); armsEquip(ARMS.own); armsLoad(A); ARMS.mode = "town"; ARMS.drawT = 0; armsStash();
    A.from = RANGE.fromCam; armedEye(A.eye); const to = _rg2.copy(SIEGE_FOCUS).sub(A.eye); A.yaw = Math.atan2(to.x, to.z); A.pitch = Math.atan2(to.y, Math.hypot(to.x, to.z)) * 0.5; A.t = 1;
    A.sign = RANGE.sign; A.hint = RANGE.hint; armedHud(); $("armBack").hidden = false; armBackLabel(true);
    const t = $("siegeTip"); t.textContent = `The ${ARMS_DEF[ARMS.own].short} is yours: Holster it and the round goes on`; t.hidden = false; A.tip = 3.8; A.tipNext = ARMED_TIP2; });
}
function rangeOff() { RANGE.on = false; RANGE.going = false; RANGE.tok = (RANGE.tok || 0) + 1; armsDropProj("range"); if (RANGE.grp) RANGE.grp.visible = false; rangeClear(false); RANGE.round = null; RANGE.pickOpen = false; for (const id of ["rangePick", "rangeBar", "rangeRes", "rangePop"]) $(id).hidden = true;
  $("rangeRound").textContent = "Timed round"; ARMED.range = false; armsScope(false); SIEGE.occ = null; for (const g of RANGE.tg) if (g.kind === "clay") { g.live = false; g.m.visible = false; } }

// ---- the weapon from the range, back in the round: Holster (12q armedPutBack: the round goes on), Draw (in your hand again, at the barrel) ----
function armBackLabel(arms) { const b = $("armBack"); b.textContent = arms ? "Holster" : "Put it back"; b.setAttribute("aria-label", arms ? "Holster the weapon" : "Put the revolver back on the barrel"); }
function armsDraw() { const A = ARMED, S = SIEGE; if (!drawLive()) return;
  A.on = true; A.t = 1; A.cool = 0; A.back = null; A.lift = null; A.range = false; LOOK.drag = null; LOOK.yaw = LOOK.pitch = 0; LOOK.ease = false;
  if (FREE.on) { const el = FREE.which; freeReset(); if (el) el.hidden = false; }
  A.sign = !$("sign").hidden; A.hint = !$("hintBox").hidden; $("sign").hidden = true; $("skip").hidden = true; showHintBox(false); STATE.locked = true;
  A.from = camFrom(); armedEye(A.eye); const to = _rg2.copy(SIEGE_FOCUS).sub(A.eye); A.yaw = Math.atan2(to.x, to.z); A.pitch = Math.atan2(to.y, Math.hypot(to.x, to.z)) * 0.5;
  A.t = 0; A.lift = { t: 0, dur: 0.5, p: null }; // (the view goes to the barrel as the weapon comes up: 12q armedLate)
  armsEquip(ARMS.own); armsUnstash(ARMS.own); ARMS.mode = "town"; ARMS.drawT = 0; S.vm.kick = 0; S.recoil = 0; Sound.clip("cock0", null, 0.9, 0, 0.1);
  showArmedUI(true); armBackLabel(true); armedHud(); }
const drawLive = () => !!ARMS.own && STATE.played && !STATE.locked && !STATE.trap && (!STATE.over || STATE.lastWon) && !SIEGE.on && !CHASE.on && !ARMED.on && !RANGE.on && !RANGE.going && $("menu").hidden;
// the Draw button: there while the weapon's yours and you could take it up (not over the round's sign)
function updateDrawBtn() { const b = $("drawBtn"); if (!b) return; const on = drawLive() && $("sign").hidden; if (b.hidden === on) { b.hidden = !on; if (on) b.textContent = `Draw the ${ARMS_DEF[ARMS.own].short}`; } }
// the Scope button: there while the Sharps is in your hand and you can shoot
function updateScopeBtn() { const b = $("scopeBtn"); if (!b) return; const S = SIEGE, on = ARMS.cur === "sharps" && !RANGE.pickOpen && $("rangeRes").hidden && ((ARMED.on && !ARMED.lift && !ARMED.back) || (S.on && (S.phase === "fight" || S.phase === "doomed" || S.phase === "cleared") && !laserHeld()));
  if (b.hidden === on) b.hidden = !on; if (!on && ARMS.zoom) armsScope(false); }

// ---- the screen ----
function buildRangeUI() {
  const st = $("stage"), mk = (tag, id, html, cls) => { const e = document.createElement(tag); e.id = id; if (cls) e.className = cls; e.hidden = true; e.innerHTML = html; if (tag === "button") e.type = "button"; st.appendChild(e); return e; };
  mk("div", "scope", `<svg viewBox="-50 -50 100 100" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><defs><mask id="scopeM"><rect x="-200" y="-200" width="400" height="400" fill="white"/><circle r="40" fill="black"/></mask></defs><rect x="-200" y="-200" width="400" height="400" fill="#050302" mask="url(#scopeM)"/><circle r="40" fill="none" stroke="#000" stroke-width="2.5"/><path d="M-40 0H-3M3 0H40M0 -40V-3M0 3V40" stroke="#0b0806" stroke-width="0.5"/><path d="M-40 0H-24M24 0H40M0 24V40" stroke="#0b0806" stroke-width="1.6"/></svg>`);
  mk("div", "rangePop", "");
  mk("div", "rangeBar", `<button type="button" id="rangeWeapons">Weapons</button><button type="button" id="rangeRound">Timed round</button><button type="button" id="rangeLeave">Leave range</button>`);
  const tile = id => { const d = ARMS_DEF[id], thin = id === "bow" ? `fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round"` : `fill="currentColor"`;
    return `<button type="button" class="rpw" data-w="${id}"><svg viewBox="-40 -40 80 80" aria-hidden="true"><path d="${ARMS_GLYPH[id]}" ${thin}/></svg><b>${d.name}</b><span>${d.blurb}</span><i>${d.auto ? "Hold Fire" : d.mag + " " + (d.mag === 1 ? d.unit1 || d.unit.replace(/s$/, "") : d.unit)}${d.zoom ? " · scope" : ""}</i></button>`; };
  mk("div", "rangePick", `<div class="rpp"><h2>The Gunsmith's Range</h2><p>Pick a weapon. Everything downrange moves.</p><div class="rpg">${ARMS_LIST.map(tile).join("")}</div><button type="button" class="rpLeave" id="rangePickLeave">Leave range</button></div>`);
  mk("div", "rangeRes", `<div class="rpp"><h2>Time!</h2><div id="rangeResScore">0</div><p id="rangeResLine"></p><div class="rrb"><button type="button" class="hbtn" id="rangeAgain">Again</button><button type="button" class="hbtn" id="rangeResClose">Keep practising</button></div></div>`);
  mk("button", "scopeBtn", "Scope"); $("scopeBtn").setAttribute("aria-label", "Look down the scope");
  mk("button", "drawBtn", "Draw");
  mk("div", "rangeFade", ""); $("rangeFade").style.opacity = 0;
  const on = (id, fn) => $(id).addEventListener("click", e => { e.stopPropagation(); fn(); });
  on("rangeWeapons", () => rangePicker(!RANGE.pickOpen)); on("rangeRound", () => RANGE.round ? rangeRoundEnd(true) : rangeRoundStart()); on("rangeLeave", rangeLeave); on("rangePickLeave", rangeLeave);
  on("rangeAgain", rangeRoundStart); on("rangeResClose", () => { $("rangeRes").hidden = true; });
  for (const b of document.querySelectorAll("#rangePick .rpw")) b.addEventListener("click", e => { e.stopPropagation(); rangePick(b.dataset.w); });
  on("scopeBtn", () => armsScope(!ARMS.zoom)); on("drawBtn", armsDraw);
  for (const id of ["rangePick", "rangeRes", "rangeBar"]) $(id).addEventListener("pointerdown", e => e.stopPropagation());
}
