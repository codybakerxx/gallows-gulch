// ---------- THE GUNSMITH'S RANGE (v54, v55, v56) ----------
// An Easter egg: a door glimmers while you're free in a round, and a tap on it takes you out the back, to the firing line of the
// gunsmith's range, his weapons on a rack beside you (12t: nine of them, and his laser).
//   - The door (v56): in the side wall of the GENERAL STORE, the one with GUNS & AMMUNITION painted on it that looks back up the street
//     toward the gallows, between its two side windows. It was the assay office's front door (GUNSMITH hangs under its sign), facing
//     across the street and easy to miss; then a board out over the street in front of it, too far off. The range is still out the back
//     of the assay office (RANGE.home): you go in by the fade, and come back out at the store. Till you've been once, a twinkle at the
//     edge of the picture now and then shows which way to look (rangeEdgeGlint).
//   - Practice (v55): nothing moves. Six bottles on a fence, five tin targets hanging from a rail, six bandit cut-outs standing, a jackrabbit
//     cut-out, three clays standing on the trap house's roof and a gong at the back. Shot, a bottle or a clay breaks, a tin target flips up
//     on its hanger, a cut-out falls back flat, and they stay that way till Reset stands them all up again. (In v54 they all moved, all
//     the time, and came back up by themselves.)
//   - Challenges (v55): a time trial on one lot, moving: the bottles, the tin targets (sliding along the rail), the bandits (popping up and
//     dropping back: each has to be shot while he's up), or everything (and the jackrabbit running its track, the clays thrown one at a time
//     till each is hit, the gong). A count of three, then the clock runs till the last is down; your best time with each weapon is kept on
//     this device. (It replaces v54's minute of points.)
//   - The laser (v55): hold Fire and its beam heats whatever it's on: a cut-out catches fire where the beam struck and burns away, a bottle
//     melts, a tin target or the gong glows red-hot (the target flips), a clay bursts. It stays at the range when you leave.
//   - Leave the range and you're back in the round where you left it, at the barrel, the weapon in your hand (12q, the revolver's rules:
//     shoot one of the townsfolk and the town draws on you, and you fight with it). Holster it and the round goes on; Draw takes it up
//     again; it's the gun you fight any shootout with, from the sword too (12d).
const RANGE = { on: false, going: false, built: false, grp: null, o: new THREE.Vector3(), f: new THREE.Vector3(), r: new THREE.Vector3(), tg: [], t: 0, run: null, best: {}, pickOpen: false, modesOpen: false,
  door: null, doorSparks: [], doorGlow: null, doorT: 0, fromCam: null, popT: 0, metaT: 0, sign: false, hint: false, slide: 0, clayT: 0, lastGun: null, lastMode: null };
const RANGE_LIST = [...ARMS_LIST, "laser"]; // (the picker: the nine, and the laser, which doesn't leave the range)
const RANGE_MODES = [
  { id: "bottles", name: "Bottles", what: "All six bottles on the fence", kinds: ["bottle"] },
  { id: "plates", name: "Tin targets", what: "Five tin targets sliding along the rail", kinds: ["plate"] },
  { id: "bandits", name: "Bandits", what: "Six cut-outs popping up: get each one while he's up", kinds: ["bandit"] },
  { id: "all", name: "Everything", what: "The lot: the jackrabbit on the run, three clays thrown, and the gong", kinds: ["bottle", "plate", "bandit", "rabbit", "clay", "gong"] }];
const RANGE_NAME = { bottle: "Bottle", plate: "Tin target", bandit: "Bandit", head: "Head shot!", rabbit: "Jackrabbit", clay: "Clay", gong: "Gong" };
const RANGE_DOWN = Math.PI / 2; // (a cut-out lying flat, fallen away from you)
const RANGE_PLATE_U = [-2.8, -1.4, 0, 1.4, 2.8];
const _rg1 = new THREE.Vector3(), _rg2 = new THREE.Vector3(), _rg3 = new THREE.Vector3();
function rangeLoadBest() { try { RANGE.best = JSON.parse(localStorage.getItem("gg_range_times") || "{}") || {}; } catch (e) { RANGE.best = {}; } }
function rangeSaveBest() { try { localStorage.setItem("gg_range_times", JSON.stringify(RANGE.best)); } catch (e) {} }
const rangeTime = (t, dp = 1) => `${Math.floor(t / 60)}:${(t % 60).toFixed(dp).padStart(3 + dp, "0")}`;

// ---- the door that glimmers ----
// warm light leaking round its edges and under it (pulsing), a soft halo on it, sparks running along the frame and one on the knob; the
// sparks and the halo keep a size on the screen however far off you are, so it can be picked out from down the street
function buildRangeDoor() {
  const H = RANGE.home = (WORLD.blds || []).find(b => b.name === "ASSAY OFFICE"), B = (WORLD.blds || []).find(b => b.name === "GENERAL STORE"); if (!B || !H) return;
  const zx = V3(B.s, 0, B.c), xx = V3(B.c, 0, -B.s), side = xx.x * -STREET.a[0] + xx.z * -STREET.a[1] > 0 ? 1 : -1; // (the side wall that looks up the street: 07c buildingAd)
  const out = xx.clone().multiplyScalar(side), wx = side * (B.w / 2 + 0.03), dz = -0.18; // (between the side windows, at -0.22 d and 0.18 d: 06 building)
  const at = (u, y, o = 0) => V3(B.x, B.y0, B.z).addScaledVector(xx, wx).addScaledVector(out, o).addScaledVector(zx, dz + u).add(V3(0, y, 0)); // (u along the wall, o out from it)
  const D = RANGE.door = { B, c: at(0, 1.35, 0.06), knob: at(-side * 0.4, 1.3, 0.1), out, frame: [[-0.58, 0.28], [-0.58, 2.47], [0.58, 2.47], [0.58, 0.28]].map(([u, y]) => at(u, y, 0.08)) };
  // the door itself, as the fronts' (06 building): planks, a frame, a knob, a step up to it
  const dg = new THREE.Group(); dg.position.copy(at(0, 0)); dg.rotation.y = Math.atan2(out.x, out.z); R.scene.add(dg); // (its +z out of the wall, +x along it)
  const slab = new THREE.Mesh(boxUV(new THREE.BoxGeometry(1.05, 2.15, 0.06), 1.05, 2.15, 0.06), MAT.door); slab.position.set(0, 1.33, 0.02); dg.add(slab);
  for (const e of [-1, 1]) { const j = woodBox(0.09, 2.3, 0.08, MAT.woodDark); j.position.set(e * 0.575, 1.35, 0.04); dg.add(j); }
  const lintel = woodBox(1.25, 0.1, 0.09, MAT.woodDark); lintel.position.set(0, 2.47, 0.04); dg.add(lintel);
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 8), MAT.iron); knob.position.set(-side * 0.4, 1.3, 0.08); dg.add(knob);
  const gy = groundVis(D.c.x, D.c.z) - B.y0, step = woodBox(1.2, Math.max(0.08, 0.27 - gy), 0.42, MAT.wood); step.position.set(0, (0.27 + gy) / 2, 0.24); dg.add(step);
  dg.traverse(o => { if (o.isMesh) o.castShadow = o.receiveShadow = true; });
  const tex = starTex(), spr = (c, s, map = tex) => { const m = new THREE.Sprite(new THREE.SpriteMaterial({ fog: false, map, color: new THREE.Color(c, c * 0.9, c * 0.62), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0 }));
    m.renderOrder = 5; m.scale.setScalar(s); m.visible = false; R.scene.add(m); return m; };
  RANGE.doorSparks = Array.from({ length: 7 }, () => ({ s: spr(1.5, 0.4), t: 1, wait: Math.random(), u: 0, life: 0.5 })); RANGE.doorGlow = spr(1.2, 0.6);
  RANGE.doorHalo = spr(0.9, 2.6, rangeGlowTex()); RANGE.doorHalo.position.copy(D.c);
  // the light at the edges: strips of a soft band (bright down the middle, nothing at its sides) round the door, a little in front of it
  const c = document.createElement("canvas"); c.width = 64; c.height = 4; const g = c.getContext("2d"), gr = g.createLinearGradient(0, 0, 64, 0);
  gr.addColorStop(0, "rgba(255,200,120,0)"); gr.addColorStop(0.5, "rgba(255,214,150,1)"); gr.addColorStop(1, "rgba(255,200,120,0)"); g.fillStyle = gr; g.fillRect(0, 0, 64, 4);
  const band = canvasTex(c), mat = new THREE.MeshBasicMaterial({ map: band, color: 0xffc27a, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, side: THREE.DoubleSide });
  const edge = new THREE.Group(), strip = (w, h, x, y, rz) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); m.position.set(x, y, 0); m.rotation.z = rz; m.renderOrder = 4; edge.add(m); };
  strip(0.16, 2.22, -0.57, 1.36, 0); strip(0.16, 2.22, 0.57, 1.36, 0); strip(0.16, 1.26, 0, 2.47, Math.PI / 2); strip(0.22, 1.2, 0, 0.27, Math.PI / 2);
  edge.position.copy(at(0, 0, 0.1)); edge.rotation.y = dg.rotation.y; edge.visible = false; R.scene.add(edge); RANGE.doorEdge = edge; RANGE.doorMat = mat;
  rangeLoadBest(); try { RANGE.seen = localStorage.getItem("gg_range_seen") === "1"; } catch (e) { RANGE.seen = false; } // (been there: no more twinkles at the edge)
}
const doorLive = () => !!RANGE.door && !RANGE.on && STATE.played && !STATE.locked && !STATE.trap && (!STATE.over || STATE.lastWon) && !SIEGE.on && !CHASE.on && !ARMED.on && $("menu").hidden;
function updateRangeDoor(rdt) {
  const D = RANGE.door; if (!D) return; const on = doorLive(), T0 = RANGE.doorT += rdt, g = RANGE.doorGlow, h = RANGE.doorHalo; g.visible = h.visible = RANGE.doorEdge.visible = on;
  const pxAt = p => p.distanceTo(R.camera.position) * Math.tan(THREE.MathUtils.degToRad(R.camera.fov) / 2) / 420; // (a pixel on a phone's screen, in metres there)
  rangeEdgeGlint(rdt, on); if (!on) { for (const p of RANGE.doorSparks) p.s.visible = false; return; }
  const cam = R.camera.position, px = pxAt(D.c);
  const facing = clamp(_rg1.copy(cam).sub(D.c).normalize().dot(D.out) * 1.6, 0, 1), beat = 0.5 + 0.5 * Math.sin(T0 * 2.2); // (the light's for the side it opens on: v56 more of it, a little brighter)
  RANGE.doorMat.opacity = (0.45 + 0.45 * beat) * facing; h.material.opacity = (0.18 + 0.18 * beat) * facing; h.scale.setScalar(Math.max(2.6, px * 70));
  g.position.copy(D.knob); g.material.opacity = (0.6 + 0.4 * Math.sin(T0 * 3.1)) * facing; g.scale.setScalar(Math.max(0.45 + 0.2 * Math.sin(T0 * 2.3), px * 20)); g.material.rotation += rdt * 0.8;
  // light running round the frame: sparks that travel a little way along it and go out
  for (const p of RANGE.doorSparks) {
    if (p.t < 1) { p.t = Math.min(1, p.t + rdt / p.life); const e = Math.sin(p.t * Math.PI), F = D.frame, u = ((p.u + p.t * 0.12) % 1) * 3, i = Math.min(2, Math.floor(u)), f = u - i;
      p.s.position.lerpVectors(F[i], F[i + 1], f); p.s.material.opacity = e * facing; p.s.scale.setScalar(Math.max(0.22 + 0.45 * e, px * 26 * e)); p.s.material.rotation += rdt * 2.5; if (p.t >= 1) { p.s.visible = false; p.wait = rnd(0.1, 0.6); } }
    else if ((p.wait -= rdt) <= 0) { p.t = 0; p.u = Math.random(); p.life = rnd(0.45, 0.8); p.s.visible = true; } }
}
// v56: till you've found the range (kept on the device), now and then a twinkle at the edge of the picture, on the side the door is,
// while it's not on the screen (and not behind you): something catching the light, over there
function rangeEdgeGlint(rdt, on) {
  let el = RANGE.glintEl; if (!el) { el = RANGE.glintEl = document.createElement("div"); el.id = "rangeGlint"; el.setAttribute("aria-hidden", "true"); el.style.backgroundImage = `url(${starTex().image.toDataURL()})`; document.body.appendChild(el); }
  RANGE.glintT = on && !RANGE.seen ? (RANGE.glintT || 0) + rdt : 0; const t = RANGE.glintT - 4, cyc = t % 5.5, e = t > 0 && cyc < 1.1 ? Math.sin(cyc / 1.1 * Math.PI) : 0; // (after a few seconds free in the round, a twinkle every five and a half)
  const onScr = c => { const p = _rg2.copy(c).project(R.camera); return p.z < 1 && Math.abs(p.x) < 0.98 && Math.abs(p.y) < 0.98; };
  let show = false;
  if (e > 0 && !onScr(RANGE.door.c)) { const v = _rg1.copy(RANGE.door.c).applyMatrix4(R.camera.matrixWorldInverse);
    if (v.z < 0 && Math.abs(Math.atan2(v.x, -v.z)) < 1.4) { const p = _rg2.copy(RANGE.door.c).project(R.camera), k = 1 / Math.max(Math.abs(p.x), Math.abs(p.y), 1e-3), r = $("scene").getBoundingClientRect(), m = 24;
      const x = r.left + m + (p.x * k * 0.5 + 0.5) * (r.width - 2 * m), y = r.top + m + (-p.y * k * 0.5 + 0.5) * (r.height - 2 * m);
      el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -50%) rotate(${(cyc * 50).toFixed(1)}deg) scale(${(0.55 + 0.6 * e).toFixed(3)})`; el.style.opacity = (e * 0.9).toFixed(3); show = true; } }
  if (!show && el.style.opacity !== "0") el.style.opacity = "0"; RANGE.glintOn = show;
}
function doorTap(e) {
  if (!doorLive()) return false; const r = $("scene").getBoundingClientRect();
  const near = (c, size) => { const p = _rg1.copy(c).project(R.camera); if (p.z > 1 || Math.abs(p.x) > 1.05 || Math.abs(p.y) > 1.05) return false;
    const sx = r.left + (p.x * 0.5 + 0.5) * r.width, sy = r.top + (-p.y * 0.5 + 0.5) * r.height, rad = Math.max(40, size / Math.max(1, c.distanceTo(R.camera.position)) / Math.tan(THREE.MathUtils.degToRad(R.camera.fov) / 2) * r.height * 0.5);
    return Math.hypot(e.clientX - sx, e.clientY - sy) <= rad; };
  if (!near(RANGE.door.c, 1.2)) return false;
  if (e.cancelable) e.preventDefault(); rangeEnter(); return true;
}

// ---- the range itself: out the back of the gunsmith's, in its own frame (u across to the right, v downrange, y up) ----
function rangePt(u, v, y = 0, out = new THREE.Vector3()) { out.copy(RANGE.o).addScaledVector(RANGE.r, u).addScaledVector(RANGE.f, v); out.y = groundVis(out.x, out.z) + y; return out; }
const rangeYaw = () => Math.atan2(RANGE.f.x, RANGE.f.z);
// v55: a target's own material, able to glow hot and burn away. uHeat lights it orange (the laser on it, or cooling after); uBurn eats it
// away from uFrom (where the beam struck it, in its own frame) outward, charred ahead of a glowing edge (a cut-out on fire)
function rangeHot(mat, g) {
  const m = mat.clone(), U = g.U = { uHeat: { value: 0 }, uBurn: { value: 0 }, uFrom: { value: new THREE.Vector3() } }; m.customProgramCacheKey = () => "rangeHot";
  m.onBeforeCompile = sh => { Object.assign(sh.uniforms, U);
    sh.vertexShader = "varying vec3 vRgP;\n" + sh.vertexShader.replace("#include <begin_vertex>", "#include <begin_vertex>\n  vRgP = position;");
    sh.fragmentShader = `uniform float uHeat, uBurn; uniform vec3 uFrom; varying vec3 vRgP;
float rgH(vec3 p) { return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }
float rgN(vec3 p) { vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(rgH(i), rgH(i + vec3(1.0, 0.0, 0.0)), f.x), mix(rgH(i + vec3(0.0, 1.0, 0.0)), rgH(i + vec3(1.0, 1.0, 0.0)), f.x), f.y),
             mix(mix(rgH(i + vec3(0.0, 0.0, 1.0)), rgH(i + vec3(1.0, 0.0, 1.0)), f.x), mix(rgH(i + vec3(0.0, 1.0, 1.0)), rgH(i + vec3(1.0, 1.0, 1.0)), f.x), f.y), f.z); }
` + sh.fragmentShader.replace("#include <alphatest_fragment>", `#include <alphatest_fragment>
  float rgEdge = 0.0;
  if (uBurn > 0.0) { float n = 0.55 * rgN(vRgP * 11.0) + 0.2 * rgN(vRgP * 29.0) + 0.45 * clamp(length(vRgP - uFrom) / 0.85, 0.0, 1.0);
    if (n < uBurn) discard; float e = n - uBurn; rgEdge = 1.0 - smoothstep(0.0, 0.07, e); diffuseColor.rgb *= mix(0.05, 1.0, smoothstep(0.03, 0.3, e)); }`)
      .replace("#include <emissivemap_fragment>", `#include <emissivemap_fragment>
  totalEmissiveRadiance += vec3(1.0, 0.36, 0.06) * (uHeat * 1.8 + rgEdge * 3.2);`); };
  return m;
}
function buildRange() {
  if (RANGE.built || !RANGE.home) return; RANGE.built = true; const B = RANGE.home, zx = V3(B.s, 0, B.c); // (out the back of the assay office, where it's always been)
  RANGE.f.copy(zx).negate(); RANGE.r.set(-RANGE.f.z, 0, RANGE.f.x); RANGE.o.set(B.x, 0, B.z).addScaledVector(zx, -B.d / 2 - 2.6); // (r: to your right as you face downrange)
  const G = RANGE.grp = new THREE.Group(); R.scene.add(G); const yaw = rangeYaw();
  // ry turns a thing from facing downrange (its +z away from you)
  const put = (o, u, v, y = 0, ry = 0) => { rangePt(u, v, y, o.position); o.rotation.order = "YXZ"; o.rotation.y = yaw + ry; G.add(o); o.traverse(q => { if (q.isMesh) { q.castShadow = true; q.receiveShadow = true; } }); return o; };
  const box = (w, h, d, mat) => woodBox(w, h, d, mat), dyn = o => { o.traverse(q => { if (q.isMesh) q.userData.dyn = true; }); return o; };
  // the firing line: a bench, the rack of his weapons, posts and rope down both sides; the backstop: an earth bank behind a plank wall
  { const b = new THREE.Group(); const top = box(1.8, 0.07, 0.62, MAT.woodDark); top.position.y = 0.9; b.add(top); for (const x of [-0.8, 0.8]) for (const z of [-0.25, 0.25]) { const l = box(0.08, 0.9, 0.08, MAT.wood); l.position.set(x, 0.45, z); b.add(l); }
    put(b, 0.6, 0.85); } // (v56: bare: his laser's on the rack's list, not lying here)
  { const rack = new THREE.Group(), bd = box(2.4, 1.3, 0.06, MAT.woodDark); bd.position.y = 1.35; rack.add(bd); for (const x of [-1.1, 1.1]) { const l = box(0.1, 2.1, 0.1, MAT.wood); l.position.set(x, 1.05, 0); rack.add(l); }
    ARMS_LIST.forEach((id, i) => { const m = armsBuild(id); const col = i % 3, row = (i / 3) | 0, s = id === "bow" ? 0.5 : id === "gatling" ? 0.7 : ["winchester", "sharps", "shotgun"].includes(id) ? 0.85 : 1.6;
      m.scale.setScalar(s); m.position.set(-0.75 + col * 0.75, 1.82 - row * 0.4, 0.07); m.rotation.set(0, -Math.PI / 2, id === "bow" ? Math.PI / 2 : 0); if (id === "bow") m.position.x += 0.25; rack.add(m); });
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 0.34), new THREE.MeshStandardMaterial({ map: signTex("GUNSMITH'S RANGE", 1024, 158, "#d9c8a4", "#3a2214"), roughness: 0.9 })); sign.position.set(0, 2.24, 0.05); rack.add(sign);
    put(rack, -3.4, 1.4, 0, Math.atan2(-3.4, -1.4)); } // (turned to face you: you're 3.4 m to its right and 1.4 back)
  for (const s of [-1, 1]) for (let v = 1; v <= 31; v += 6) { const p = box(0.12, 1.1, 0.12, MAT.wood); put(p, s * 7.8, v, 0.55); }
  for (const s of [-1, 1]) { const pts = []; for (let v = 1; v <= 31; v += 1) pts.push(rangePt(s * 7.8, v, 0.95)); G.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 60, 0.012, 4), MAT.rope)); }
  { const bank = new THREE.Mesh(new THREE.BoxGeometry(19, 3.4, 4), new THREE.MeshStandardMaterial({ color: 0x8a6a48, roughness: 1 })); put(bank, 0, 33.6, 1.0); bank.rotation.x = -0.2;
    const wall = new THREE.Group(); for (let i = 0; i < 9; i++) { const pl = box(1.95, 2.4, 0.08, i % 2 ? MAT.wood : MAT.woodDark); pl.position.set(-8 + i * 2, 1.2, 0); wall.add(pl); } put(wall, 0, 31.2); }
  RANGE.tg = []; const T = g => { RANGE.tg.push(g); return g; };
  // six bottles on a fence, 6.5 m out
  const bottleC = [0x2f5a2a, 0x6a3a14, 0x3a5a6a];
  { const f = new THREE.Group(), rail = box(4.6, 0.08, 0.1, MAT.woodDark); rail.position.y = 0.82; f.add(rail); for (const x of [-2.2, 0, 2.2]) { const p = box(0.1, 0.86, 0.1, MAT.wood); p.position.set(x, 0.43, 0); f.add(p); } put(f, 0, 6.5); }
  for (let i = 0; i < 6; i++) { const g = T({ kind: "bottle", i, r: 0.045, h: 0.25 }), mt = rangeHot(new THREE.MeshStandardMaterial({ color: bottleC[i % 3], roughness: 0.12, metalness: 0.1, transparent: true, opacity: 0.9 }), g);
    const b = g.m = new THREE.Group(), body = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.036, 0.17, 10), mt); body.position.y = 0.085; b.add(body);
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.032, 0.08, 8), mt); neck.position.y = 0.21; b.add(neck); put(b, -1.75 + i * 0.7, 6.5, 0.86); dyn(b); }
  // five tin targets hung from a rail, 10.5 m out
  { const rail = new THREE.Group(), bar = box(7.4, 0.06, 0.06, MAT.iron); bar.position.y = 1.85; rail.add(bar); for (const x of [-3.7, 3.7]) { const p = box(0.12, 1.9, 0.12, MAT.wood); p.position.set(x, 0.95, 0); rail.add(p); } put(rail, 0, 10.5); }
  const tinM = new THREE.MeshStandardMaterial({ color: 0xd8d4c8, metalness: 0.7, roughness: 0.35 }), dotM = new THREE.MeshStandardMaterial({ color: 0xa8241a, roughness: 0.6 });
  for (let i = 0; i < 5; i++) { const g = T({ kind: "plate", i, r: 0.15, swing: 0, sv: 0, fl: 0 }), piv = g.m = new THREE.Group(), rod = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.32, 5), MAT.iron); rod.position.y = -0.16; piv.add(rod);
    const plate = g.plate = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.012, 22).rotateX(Math.PI / 2), rangeHot(tinM, g)); plate.position.y = -0.46; piv.add(plate);
    const dot = new THREE.Mesh(new THREE.CircleGeometry(0.05, 16), dotM); dot.position.set(0, -0.46, -0.007); dot.rotation.y = Math.PI; piv.add(dot); put(piv, RANGE_PLATE_U[i], 10.5, 1.82); dyn(piv); }
  // six bandits on boards, 14 to 26 m out, on hinges at their feet
  const banditTex = rangeBanditTex();
  [[-4.4, 14], [-1.5, 18], [1.7, 15.5], [4.6, 21.5], [-6.0, 24.5], [3.0, 26.2]].forEach(([u, v], i) => { const g = T({ kind: "bandit", i, ang: 0 }), piv = g.m = new THREE.Group();
    const cut = g.cut = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 1.25), rangeHot(new THREE.MeshStandardMaterial({ map: banditTex, transparent: true, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.9 }), g));
    cut.position.y = 0.66; cut.rotation.y = Math.PI; piv.add(cut); const base = box(0.7, 0.1, 0.14, MAT.woodDark); put(base, u, v + 0.12, 0.05); put(piv, u, v, 0.03); dyn(piv); });
  // a jackrabbit on a board, on a track across at 19.5 m, hay bales at either end
  { const tr = box(14, 0.05, 0.25, MAT.woodDark); put(tr, 0, 19.5, 0.02); for (const s of [-1, 1]) { const hb = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.7, 0.6), MAT.hay); put(hb, s * 7.4, 19.4, 0.35); }
    const g = T({ kind: "rabbit", ang: 0, dir: 1, u: 2.5 }), piv = g.m = new THREE.Group(), rab = g.cut = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.42), rangeHot(new THREE.MeshStandardMaterial({ map: rangeRabbitTex(), transparent: true, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.9 }), g));
    rab.position.y = 0.23; piv.add(rab); put(piv, 2.5, 19.5, 0.05, Math.PI); dyn(piv); }
  // the trap house on the left, 12 m out; its three clays standing on its roof (thrown from it in a challenge)
  { const th = new THREE.Group(), hs = box(1.2, 1.0, 1.2, MAT.woodDark); hs.position.y = 0.5; th.add(hs); const rf = box(1.4, 0.08, 1.4, MAT.wood); rf.position.y = 1.04; th.add(rf); put(th, -8.2, 12); }
  const clayM = new THREE.MeshStandardMaterial({ color: 0xe0662a, roughness: 0.7 });
  for (let i = 0; i < 3; i++) { const g = T({ kind: "clay", i, r: 0.075, vel: V3(), home: rangePt(-8.6 + i * 0.4, 11.5, 1.08 + 0.056) }), c = g.m = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.045, 0.022, 14), rangeHot(clayM, g));
    c.rotation.order = "YXZ"; c.castShadow = true; G.add(c); dyn(c); }
  // and a gong far back, 27 m out
  { const fr = new THREE.Group(); for (const x of [-0.7, 0.7]) { const p = box(0.1, 2.4, 0.1, MAT.wood); p.position.set(x, 1.2, 0); fr.add(p); } const cb = box(1.6, 0.1, 0.1, MAT.wood); cb.position.y = 2.38; fr.add(cb); put(fr, -2.4, 27);
    const g = T({ kind: "gong", r: 0.36, swing: 0, sv: 0 }), piv = g.m = new THREE.Group(), disc = g.disc = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.025, 28).rotateX(Math.PI / 2), rangeHot(MAT.brass, g)); disc.position.y = -0.72; piv.add(disc);
    const ch = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.34, 4), MAT.iron); ch.position.y = -0.18; piv.add(ch); put(piv, -2.4, 27, 2.33); dyn(piv); }
  rangeStand(null, true); G.visible = false;
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


// ---- standing them up: all of them for practice (Reset), or the lot a challenge is on (the rest put out of the way) ----
// now: at once (a challenge's start, building); otherwise what's down comes back up as you watch
function rangeStand(mode, now) {
  const kinds = mode ? RANGE_MODES.find(m => m.id === mode).kinds : null, run = !!mode, yaw = rangeYaw(); if (RANGE.on) armsDropProj("range"); RANGE.slide = 0; RANGE.clayT = 1.2;
  for (const g of RANGE.tg) { g.out = !!kinds && !kinds.includes(g.kind); g.done = false; g.heat = 0; g.lasedT = -9; g.burn = null; g.cool = 0; g.U.uHeat.value = 0; g.U.uBurn.value = 0;
    g.m.visible = !g.out; g.m.scale.setScalar(1);
    if (g.kind === "bottle") g.st = "up";
    else if (g.kind === "plate") { g.st = "up"; g.swing = g.sv = 0; if (now || run) g.fl = 0; rangePt(RANGE_PLATE_U[g.i], 10.5, 1.82, g.m.position); }
    else if (g.kind === "bandit") { if (run) { g.st = "down"; g.ang = RANGE_DOWN; g.t = rnd(0.3, 1.6); } else if (now || g.ang < 0.01) { g.st = "up"; g.ang = 0; } else g.st = "rise"; g.m.rotation.x = g.ang; }
    else if (g.kind === "rabbit") { g.u = run ? -7.2 : 2.5; g.dir = 1; g.t = 1.2; rangePt(g.u, 19.5, 0.05, g.m.position); g.m.rotation.set(0, yaw + Math.PI, 0); g.face = -1;
      if (run) { g.st = "wait"; g.ang = 0; g.m.visible = false; } else if (now || g.ang < 0.01) { g.st = "stand"; g.ang = 0; } else g.st = "rise"; g.m.rotation.x = g.face * g.ang; }
    else if (g.kind === "clay") { g.st = run ? "wait" : "perch"; g.m.position.copy(g.home); g.m.rotation.set(Math.PI / 2, yaw, 0); if (run) g.m.visible = false; }
    else if (g.kind === "gong") { g.swing = g.sv = 0; g.m.rotation.x = 0; } }
  if (RANGE.on && !now && !run) Sound.knock(RANGE.o, 0.4);
}

// ---- each frame: the door, and out on the range what's moving (only in a challenge), falling, burning, cooling ----
function updateRange(rdt) {
  updateRangeDoor(rdt); if (!RANGE.on) return; RANGE.t += rdt; const T0 = RANGE.t, Rn = RANGE.run, yaw = rangeYaw();
  if (Rn && !Rn.go) { Rn.cd -= rdt; const n = Math.ceil(Rn.cd / 0.8); if (n !== Rn.n) { Rn.n = n; if (n > 0) { rangePopShow(String(n), true); Sound.knock(null, 0.5); } }
    if (Rn.cd <= 0) { Rn.go = true; Rn.t = 0; rangePopShow("Go!", true); Sound.bell(RANGE.o, 0.5); } }
  else if (Rn) Rn.t += rdt;
  const go = !!(Rn && Rn.go); if (go) RANGE.slide += rdt * 1.25;
  for (const g of RANGE.tg) { if (g.out) continue;
    if (!g.burn && T0 - g.lasedT > 0.06 && g.heat > 0) g.heat = Math.max(0, g.heat - rdt * 0.5); // (the beam's moved off it: it cools)
    if (g.burn) rangeBurnStep(g, rdt); else if (g.cool > 0) { g.cool = Math.max(0, g.cool - rdt); g.U.uHeat.value = Math.min(1, g.cool / 2.5); } else g.U.uHeat.value = Math.min(1, g.heat / 0.22) * 0.85;
    if (g.kind === "plate") { if (go) rangePt(RANGE_PLATE_U[g.i] * 0.9 + Math.sin(RANGE.slide) * 1.05, 10.5, 1.82, g.m.position);
      g.sv += (-g.swing * 40 - g.sv * 3) * rdt; g.swing += g.sv * rdt; g.fl = g.st === "flip" ? Math.min(1, g.fl + rdt * 5) : Math.max(0, g.fl - rdt * 4); g.m.rotation.x = -(g.swing + Ease.inOut(g.fl) * 1.4); }
    else if (g.kind === "bandit") rangeBanditStep(g, rdt, go);
    else if (g.kind === "rabbit") rangeRabbitStep(g, rdt, go, T0, yaw);
    else if (g.kind === "clay" && g.st === "fly") { g.vel.y -= 9.8 * rdt; g.m.position.addScaledVector(g.vel, rdt); g.m.rotation.y += rdt * 14;
      if (g.m.position.y < groundVis(g.m.position.x, g.m.position.z) + 0.02) { g.st = "wait"; g.m.visible = false; Sound.knock(g.m.position, 0.2); RANGE.clayT = rnd(0.8, 1.5); } } // (missed: it comes round again)
    else if (g.kind === "gong") { g.sv += (-g.swing * 9 - g.sv * 0.6) * rdt; g.swing += g.sv * rdt; g.m.rotation.x = -g.swing; } }
  // a challenge with the clays in it: thrown across from the trap house one at a time, till each has been hit
  if (go && !RANGE.tg.some(g => g.kind === "clay" && g.st === "fly") && (RANGE.clayT -= rdt) <= 0) { const c = RANGE.tg.find(g => g.kind === "clay" && !g.out && !g.done && g.st === "wait");
    if (c) { c.st = "fly"; c.m.visible = true; rangePt(-7.6, 12, 1.1, c.m.position); c.m.rotation.set(0, 0, 0); c.vel.copy(RANGE.r).multiplyScalar(rnd(7.5, 10)).addScaledVector(RANGE.f, rnd(-1, 1.5)); c.vel.y = rnd(6.5, 8.2); Sound.clank(c.m.position); } }
  if (go && RANGE.tg.every(g => g.out || g.done)) rangeFinish();
  if (RANGE.popT > 0 && (RANGE.popT -= rdt) <= 0) $("rangePop").hidden = true;
  if ((RANGE.metaT -= rdt) <= 0) { RANGE.metaT = 0.1; if (ARMED.reloadT <= 0) $("meta").textContent = rangeMeta(); }
}
// a bandit: in practice he stands till he's shot, then lies flat; in a challenge he comes up, stands a moment and drops back, over and over, till he's shot
function rangeBanditStep(g, rdt, go) {
  if (g.st === "burn" || g.st === "gone") return;
  if (g.st === "hit") { g.ang = Math.min(RANGE_DOWN, g.ang + rdt * 9); if (g.ang >= RANGE_DOWN) g.st = "dead"; }
  else if (g.st === "rise") { g.ang = Math.max(0, g.ang - rdt * 6.3); if (g.ang <= 0) { g.st = "up"; g.t = rnd(1.4, 2.2); } }
  else if (go && !g.done) { g.t -= rdt;
    if (g.st === "down" && g.t <= 0) { g.st = "rise"; Sound.knock(g.m.position, 0.15); }
    else if (g.st === "up" && g.t <= 0) g.st = "fall";
    else if (g.st === "fall") { g.ang = Math.min(RANGE_DOWN, g.ang + rdt * 5); if (g.ang >= RANGE_DOWN) { g.st = "down"; g.t = rnd(0.4, 1.8); } } }
  g.m.rotation.x = g.ang;
}
// the jackrabbit: standing in practice; in Everything he runs the track, ducking behind the bales at each end
function rangeRabbitStep(g, rdt, go, T0, yaw) {
  if (g.st === "burn" || g.st === "gone") return;
  if (g.st === "hit") { g.ang = Math.min(RANGE_DOWN, g.ang + rdt * 9); if (g.ang >= RANGE_DOWN) g.st = "dead"; }
  else if (g.st === "rise") { g.ang = Math.max(0, g.ang - rdt * 6.3); if (g.ang <= 0) g.st = "stand"; }
  else if (go && !g.done) { g.t -= rdt;
    if (g.st === "wait" && g.t <= 0) { g.st = "run"; g.m.visible = true; }
    if (g.st === "run") { g.u += g.dir * 5.6 * rdt; rangePt(g.u, 19.5, 0.05 + Math.abs(Math.sin(T0 * 11)) * 0.16, g.m.position); g.m.rotation.y = yaw + (g.dir > 0 ? Math.PI : 0); g.face = g.dir > 0 ? -1 : 1;
      if (Math.abs(g.u) > 7.2) { g.u = Math.sign(g.u) * 7.2; g.dir = -g.dir; g.st = "wait"; g.t = rnd(0.6, 1.4); g.m.visible = false; } } }
  g.m.rotation.x = g.face * g.ang;
}
function rangeMeta() { const Rn = RANGE.run;
  if (Rn) { const M = RANGE_MODES.find(m => m.id === Rn.id), left = RANGE.tg.filter(g => !g.out && !g.done).length; return Rn.go ? `${M.name} ${rangeTime(Rn.t)} · ${left} left` : `${M.name} · ready…`; }
  return `Practice · ${RANGE.tg.filter(g => g.done).length} of ${RANGE.tg.length} down`; }
const rangeCanFire = () => !RANGE.on || (!RANGE.pickOpen && !RANGE.modesOpen && $("rangeRes").hidden && !(RANGE.run && !RANGE.run.go));
function rangePopShow(text, big) { const P = $("rangePop"); P.textContent = text; P.classList.toggle("count", !!big); P.hidden = false; P.classList.remove("pop"); void P.offsetWidth; P.classList.add("pop"); RANGE.popT = big ? 0.75 : 1.1; }

// ---- what a shot meets out there ----
// the first target standing along ro + t rd (t up to far), or the backstop, the bench, the posts, the ground; null if nothing.
// { t, at, g (the target), part, apply (what the shot does) }, or { t, at, env, apply }
function rangeHit(ro, rd, far, done) { // (done: what this shot's already hit, a shotgun's pellets after the first: each target once a shot)
  let best = null; const tryT = (t, g, part) => { if (t > 0 && t <= far && (!best || t < best.t)) best = { t, g, part }; };
  for (const g of RANGE.tg) { if (g.out || (done && done.has(g))) continue;
    if (g.kind === "bottle") { if (g.st !== "up") continue; const a = g.m.getWorldPosition(V3()), b = a.clone(); b.y += g.h; tryT(rayCapsule(ro, rd, a, b, g.r + 0.012), g); }
    else if (g.kind === "plate") { if (g.st !== "up" || Math.abs(g.swing) > 0.3) continue; tryT(raySphere(ro, rd, g.plate.getWorldPosition(_rg1), g.r), g); }
    else if (g.kind === "gong") tryT(raySphere(ro, rd, g.disc.getWorldPosition(_rg1), g.r), g);
    else if (g.kind === "bandit") { if (!(g.st === "up" || g.st === "rise" || g.st === "fall" || g.st === "burn") || g.ang > 0.9) continue; g.m.updateMatrixWorld(true); const head = g.m.localToWorld(V3(0, 1.08, 0)), th = raySphere(ro, rd, head, 0.16);
      const tb = rayCapsule(ro, rd, g.m.localToWorld(V3(0, 0.12, 0)), g.m.localToWorld(V3(0, 0.86, 0)), 0.25); if (th > 0 && (tb <= 0 || th <= tb + 0.05)) tryT(th, g, "head"); else tryT(tb, g); }
    else if (g.kind === "rabbit") { if (!(g.st === "stand" || g.st === "run" || g.st === "burn")) continue; g.m.updateMatrixWorld(true); tryT(raySphere(ro, rd, g.m.localToWorld(V3(0, 0.23, 0)), 0.27), g); }
    else if (g.kind === "clay") { if (g.st !== "perch" && g.st !== "fly") continue; tryT(raySphere(ro, rd, g.m.position, g.r + Math.min(0.06, g.m.position.distanceTo(ro) * 0.004)), g); } }
  const env = sceneryRay(ro, rd, far);
  if (env && (!best || env.distance < best.t)) return { t: env.distance, at: env.point.clone(), env, apply: () => envShot(env, rd) };
  if (!best) return null; const at = ro.clone().addScaledVector(rd, best.t), g = best.g, part = best.part;
  return { t: best.t, at, g, part, apply: () => { if (done) done.add(g); if (g.st !== "burn") rangeStrike(g, at, part, "shot"); } };
}
function raySphere(ro, rd, c, r) { const ox = ro.x - c.x, oy = ro.y - c.y, oz = ro.z - c.z, b = ox * rd.x + oy * rd.y + oz * rd.z, h = b * b - (ox * ox + oy * oy + oz * oz - r * r); if (h < 0) return -1; const t = -b - Math.sqrt(h); return t > 0 ? t : -1; }
// a target hit (how: "shot", a bullet, an arrow, a knife; "blast", dynamite; "burn", the laser): what it does, and the count
function rangeStrike(g, at, part, how) {
  const burn = how === "burn", first = !g.done; let what = g.kind;
  if (g.kind === "bottle") { if (burn) rangeBurnStart(g, at); else { g.st = "broke"; g.m.visible = false; Sound.clip(siegePick("glass", 3), at, 0.9, 0, 0.2, rnd(0.95, 1.08)); puff(at, 10, 0.25, 0.05, 0.6, 0.6, 0xbfe0c0); } }
  else if (g.kind === "plate") { g.st = "flip"; if (burn) rangeBurnStart(g, at); else { g.sv += 6; Sound.tinTick(at, 1); Sound.clank(at); } }
  else if (g.kind === "bandit" || g.kind === "rabbit") { if (burn) rangeBurnStart(g, at); else { g.st = "hit"; Sound.knock(at, 0.8); puff(at, 6, 0.15, 0.05, 0.6, 0.6, 0x8a6a48); if (part === "head") what = "head"; } }
  else if (g.kind === "clay") { g.st = "broke"; g.m.visible = false; Sound.crack(at, 0.4); puff(at, 18, 0.35, 0.07, 0.9, 0.8, 0xe0662a);
    if (burn) { fireInit(); Sound.fireCatch(at, 0.5); for (let i = 0; i < 14; i++) fireEmit(FIREFX.flames, _rg1.set(at.x + rnd(-0.08, 0.08), at.y + rnd(-0.05, 0.05), at.z + rnd(-0.08, 0.08)), rnd(-0.6, 0.6), rnd(0.2, 1.2), rnd(-0.6, 0.6), rnd(0.25, 0.5), rnd(0.12, 0.22), rnd(0.7, 1)); } }
  else if (g.kind === "gong") { if (burn) rangeBurnStart(g, at); else { g.sv += 2.2; Sound.bell(at, 0.55); } }
  if (!first) return; g.done = true; const Rn = RANGE.run, left = RANGE.tg.filter(q => !q.out && !q.done).length; if (Rn && Rn.go) Rn.hits++;
  rangePopShow((burn && g.kind !== "clay" ? `${RANGE_NAME[g.kind]} ${g.kind === "bottle" ? "melts" : g.kind === "plate" || g.kind === "gong" ? "red-hot" : "on fire"}` : RANGE_NAME[what]) + (Rn && Rn.go && left ? ` · ${left} left` : ""));
  if (ARMED.reloadT <= 0) $("meta").textContent = rangeMeta();
}
// dynamite out on the range: everything standing within its reach
function rangeBlast(at, rad) { for (const g of RANGE.tg) { if (g.out) continue; const p = (g.kind === "plate" ? g.plate : g.kind === "gong" ? g.disc : g.m).getWorldPosition(V3()); if (g.kind === "bandit") p.y += 0.6;
  if (p.distanceTo(at) > rad) continue; const up = { bottle: g.st === "up", plate: g.st === "up", bandit: g.st === "up" || g.st === "rise" || g.st === "fall", rabbit: g.st === "stand" || g.st === "run", clay: g.st === "perch" || g.st === "fly", gong: true }[g.kind];
  if (up) rangeStrike(g, p, null, "blast"); } }

// ---- the laser on a target (12t armsBeamLate): it heats where the beam is, and catches (or melts, or goes red-hot) ----
function rangeHeat(g, dt, at) {
  g.lasedT = RANGE.t; if (g.burn || (g.done && g.kind !== "gong")) return; g.heat += dt;
  (g.cut || g.plate || g.disc || g.m).worldToLocal(g.U.uFrom.value.copy(at)); // (where it catches, in its own frame: it burns out from there)
  if (g.heat >= (g.kind === "clay" ? 0.08 : 0.22)) rangeStrike(g, at, null, "burn");
}
function rangeBurnStart(g, at) {
  fireInit(); g.burn = { t: 0, acc: 0, sAcc: 0, crackT: 0.2 }; g.heat = 0;
  if (g.kind === "bandit" || g.kind === "rabbit") { g.st = "burn"; Sound.fireCatch(at, 0.8); Sound.fireCrackle(at, 0.6); crowsStartle(at, 15, 0.6); }
  else if (g.kind === "bottle") { g.st = "melt"; Sound.sizzle(at, 0.5); } else { Sound.sizzle(at, 0.6); if (g.kind === "gong") Sound.bell(at, 0.35); }
}
// each frame while it burns: a cut-out burns away from where it caught, in flames and smoke, embers and ash; a bottle slumps into a glowing
// lump; a tin target or the gong glows red-hot and cools
function rangeBurnStep(g, rdt) {
  const B = g.burn, U = g.U; B.t += rdt; const t = B.t;
  if (g.kind === "bandit" || g.kind === "rabbit") { const D = 2.6, w = 0.27, h = g.kind === "bandit" ? 0.6 : 0.19, cut = g.cut, pt = (y0, y1) => cut.localToWorld(_rg1.set(rnd(-w, w), rnd(y0, y1) * h, 0));
    U.uBurn.value = smoothstep(0.1, D - 0.15, t) * 1.25; U.uHeat.value = 0.2 * (1 - smoothstep(0, 0.8, t)); const blaze = smoothstep(0, 0.35, t) * (1 - smoothstep(D - 0.7, D, t));
    B.acc += rdt * 70 * blaze; while (B.acc >= 1) { B.acc -= 1; fireEmit(FIREFX.flames, pt(-1, 1), rnd(-0.1, 0.1), rnd(0.5, 1.0), rnd(-0.1, 0.1), rnd(0.3, 0.6), rnd(0.13, 0.24) * (g.kind === "bandit" ? 1 : 0.7), rnd(0.7, 1)); }
    B.sAcc += rdt * 14 * blaze; while (B.sAcc >= 1) { B.sAcc -= 1; fireEmit(FIREFX.smoke, pt(0.3, 1.2), rnd(-0.1, 0.1), rnd(0.5, 0.9), rnd(-0.1, 0.1), rnd(1.8, 3), rnd(0.35, 0.6), 0.5); }
    if (Math.random() < rdt * 12 * blaze) ashEmit(ASH.embers, pt(-1, 1), rnd(-0.1, 0.1), rnd(0.2, 0.6), rnd(-0.1, 0.1), rnd(0.5, 1.0), 1, g.m.position.y);
    if (Math.random() < rdt * 25 * smoothstep(0.5, D, t)) ashEmit(ASH.flakes, pt(-1, 1), rnd(-0.2, 0.2), rnd(-0.1, 0.2), rnd(-0.2, 0.2), rnd(1.5, 3), rnd(0.35, 0.7), g.m.position.y);
    B.crackT -= rdt; if (B.crackT <= 0 && blaze > 0.2) { B.crackT = rnd(0.15, 0.35); Sound.fireCrackle(g.m.position, 0.35 + 0.4 * blaze); }
    fireGlow(g.m.position, 0.3, blaze * 0.8);
    if (t >= D) { g.burn = null; g.st = "gone"; g.m.visible = false; U.uBurn.value = 0; U.uHeat.value = 0; } }
  else if (g.kind === "bottle") { const e = smoothstep(0.15, 1.3, t); U.uHeat.value = 1 - 0.6 * smoothstep(1.3, 4, t); g.m.scale.set(1 + 0.6 * e, 1 - 0.74 * e, 1 + 0.6 * e);
    if (Math.random() < rdt * 5 * (1 - e * 0.6)) puff(g.m.position.clone().add(_rg1.set(0, 0.12 * (1 - e) + 0.04, 0)), 2, 0.1, 0.06, 0.8, 0.35, 0xd8d0c8);
    if (t >= 4) { g.burn = null; g.cool = 1; } } // (a lump of glass, still warm)
  else { const D = g.kind === "gong" ? 4.5 : 3.5; U.uHeat.value = smoothstep(0, 0.25, t) * (1 - smoothstep(0.6, D, t) * 0.95); if (t >= D) { g.burn = null; g.cool = 0.12; } }
}

// ---- the challenges: a lot stood up, a count of three, the clock till the last is down ----
function rangeModeStart(id) {
  if (!RANGE_MODES.some(m => m.id === id)) return; rangeModes(false); rangePicker(false); $("rangeRes").hidden = true; rangeStand(id, true);
  RANGE.run = { id, cd: 2.4, n: 0, go: false, t: 0, hits: 0, shots0: ARMED.shots || 0, weapon: ARMS.cur }; RANGE.lastMode = id;
  armsLoad(ARMED); if (ARMS_DEF[ARMS.cur].kind !== "beam") ARMED.reloads = 99; ARMED.reloadT = 0; ARMS.trig = false; armedHud(); $("rangeModesBtn").textContent = "Stop"; $("siegeTip").hidden = true; ARMED.tip = 0; ARMED.tipNext = null;
  $("meta").textContent = rangeMeta();
}
function rangeModeStop() { if (!RANGE.run) return; RANGE.run = null; $("rangeModesBtn").textContent = "Challenges"; $("rangePop").hidden = true; rangeStand(null, true); $("meta").textContent = rangeMeta(); }
function rangeFinish() {
  const Rn = RANGE.run, M = RANGE_MODES.find(m => m.id === Rn.id), d = ARMS_DEF[Rn.weapon], key = `${Rn.id}:${Rn.weapon}`, prev = RANGE.best[key], t = Rn.t, best = prev ? Math.min(prev, t) : t;
  RANGE.run = null; ARMS.trig = false; RANGE.best[key] = best; rangeSaveBest(); Sound.bell(RANGE.o, 0.7); $("rangeModesBtn").textContent = "Challenges";
  const shots = Math.max(1, (ARMED.shots || 0) - Rn.shots0), n = Rn.hits, unit = d.kind === "arrow" ? "arrow" : d.kind === "knife" ? "knife" : d.kind === "bomb" ? "stick" : "shot";
  $("rangeResTitle").textContent = M.name; $("rangeResTime").textContent = rangeTime(t, 2);
  $("rangeResShots").textContent = d.kind === "beam" ? `${n} burnt with the laser` : `${n} down with ${shots} ${unit === "knife" && shots !== 1 ? "knives" : unit + (shots === 1 ? "" : "s")}`;
  $("rangeResLine").textContent = !prev ? `Your first time with the ${d.short}` : t < prev ? `A new best with the ${d.short}! (It was ${rangeTime(prev, 2)})` : `Your best with the ${d.short}: ${rangeTime(best, 2)}`;
  $("rangeRes").hidden = false; $("meta").textContent = rangeMeta();
}

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
  if (RANGE.on || RANGE.going) return; RANGE.going = true; buildRange(); RANGE.seen = true; try { localStorage.setItem("gg_range_seen", "1"); } catch (e) {} Sound.creak(RANGE.door.c, 0.6); STATE.locked = true; STATE.ts = 1; LOOK.drag = null;
  if (FREE.on) { const el = FREE.which; freeReset(); if (el) el.hidden = false; } // (a sign put away: it comes back when you're back in the round)
  RANGE.sign = !$("sign").hidden; RANGE.hint = !$("hintBox").hidden; RANGE.fromCam = camFrom();
  rangeFade(0.35, () => { const A = ARMED; RANGE.going = false; RANGE.on = true; RANGE.grp.visible = true; rangeClear(true); RANGE.run = null; RANGE.t = 0; rangeStand(null, true); STATE.ts = 1;
    $("sign").hidden = true; $("skip").hidden = true; showHintBox(false); LOOK.yaw = LOOK.pitch = 0; LOOK.ease = false;
    A.on = true; A.range = true; A.t = 0; A.cool = 0; A.lift = null; A.back = null; rangePt(0, 0, 1.56, A.eye); A.yaw = rangeYaw(); A.pitch = -0.03;
    A.from = { pos: A.eye.clone(), tgt: A.eye.clone().add(RANGE.f), fov: 54, name: "armed", follow: null, cpos: A.eye.clone(), yaw: A.yaw, pitch: A.pitch };
    const id = ARMS.own || "colt"; RANGE.lastGun = id; armsEquip(id); armsLoad(A); A.reloads = 99; ARMS.mode = "range"; ARMS.drawT = 0; SIEGE.vm.kick = 0; SIEGE.recoil = 0;
    showArmedUI(true); $("armBack").hidden = true; $("rangeBar").hidden = false; $("siegeTip").hidden = true; A.tip = 0; A.tipNext = null; armedHud(); rangePicker(true); });
}
// the panels: the weapons, and the challenges (one at a time; either stops a challenge that's running)
function rangePicker(on) { RANGE.pickOpen = on; $("rangePick").hidden = !on; if (on) { rangeModeStop(); rangeModes(false); armsBeamOff(); for (const b of document.querySelectorAll("#rangePick .rpw")) b.classList.toggle("cur", b.dataset.w === ARMS.cur); } }
function rangeModes(on) { RANGE.modesOpen = on; const P = $("rangeModes"); P.hidden = !on; if (!on) return; rangePicker(false); rangeModeStop(); armsBeamOff(); const id = ARMS.cur, d = ARMS_DEF[id];
  $("rangeModesSub").textContent = `Against the clock with the ${d.short}: down every one of them, as fast as you can.`;
  $("rangeModesList").innerHTML = RANGE_MODES.map(M => { const b = RANGE.best[`${M.id}:${id}`]; return `<button type="button" class="rpm" data-m="${M.id}"><b>${M.name}</b><span>${M.what}</span><i>${b ? `Best with the ${d.short}: ${rangeTime(b, 2)}` : `No time with the ${d.short} yet`}</i></button>`; }).join("");
  for (const b of P.querySelectorAll(".rpm")) b.addEventListener("click", e => { e.stopPropagation(); rangeModeStart(b.dataset.m); }); }
function rangePick(id) { const A = ARMED; armsEquip(id); armsLoad(A); if (ARMS_DEF[id].kind !== "beam") { A.reloads = 99; RANGE.lastGun = id; } ARMS.mode = "range"; ARMS.drawT = 0; Sound.clip("cock0", null, 0.8, 0, 0.05); rangePicker(false); armedHud();
  const t = $("siegeTip"); t.textContent = `${ARMS_DEF[id].name}: ${ARMS_DEF[id].blurb}`; t.hidden = false; A.tip = 3.5; A.tipNext = id === "sharps" ? "Scope to look down it" : id === "laser" ? "It stays here when you leave" : null; }
function rangeReset() { rangeModeStop(); $("rangeRes").hidden = true; rangeStand(null); $("meta").textContent = rangeMeta(); }
// out the way you came: back in the round where you were, at the barrel, the weapon in your hand (a fresh load from the gunsmith). Not the
// laser: it's his, and stays at the range; you take the last of his guns you had, or the Colt
function rangeLeave() {
  if (!RANGE.on || RANGE.going) return; RANGE.going = true; armsBeamOff();
  rangeFade(0.35, () => { const A = ARMED, laser = ARMS.cur === "laser"; RANGE.going = false; ARMS.own = laser ? RANGE.lastGun || ARMS.own || "colt" : ARMS.cur || ARMS.own || "colt"; rangeOff(); STATE.ts = 1;
    armsEquip(ARMS.own); armsLoad(A); ARMS.mode = "town"; ARMS.drawT = 0; armsStash();
    A.from = RANGE.fromCam; armedEye(A.eye); const to = _rg2.copy(SIEGE_FOCUS).sub(A.eye); A.yaw = Math.atan2(to.x, to.z); A.pitch = Math.atan2(to.y, Math.hypot(to.x, to.z)) * 0.5; A.t = 1;
    A.sign = RANGE.sign; A.hint = RANGE.hint; armedHud(); $("armBack").hidden = false; armBackLabel(true); const nm = ARMS_DEF[ARMS.own].short;
    const t = $("siegeTip"); t.textContent = laser ? `The laser stays with the gunsmith: you've the ${nm}` : `The ${nm} is yours: Holster it and the round goes on`; t.hidden = false; A.tip = 3.8; A.tipNext = laser ? "Holster it and the round goes on" : ARMED_TIP2; });
}
function rangeOff() { RANGE.on = false; RANGE.going = false; RANGE.tok = (RANGE.tok || 0) + 1; RANGE.run = null; armsDropProj("range"); armsBeamOff(); if (RANGE.grp) RANGE.grp.visible = false; rangeClear(false); RANGE.pickOpen = RANGE.modesOpen = false;
  for (const id of ["rangePick", "rangeModes", "rangeBar", "rangeRes", "rangePop"]) $(id).hidden = true; $("rangeModesBtn").textContent = "Challenges"; ARMED.range = false; armsScope(false); SIEGE.occ = null;
  for (const g of RANGE.tg) if (g.kind === "clay" && g.st === "fly") { g.st = "wait"; g.m.visible = false; } }

// ---- the weapon from the range, back in the round: Holster (12q armedPutBack: the round goes on), Draw (in your hand again, at the barrel) ----
function armBackLabel(arms) { const b = $("armBack"); b.textContent = arms ? "Holster" : "Put it back"; b.setAttribute("aria-label", arms ? "Holster the weapon" : "Put the revolver back on the barrel"); }
function armsDraw() { const A = ARMED, S = SIEGE; if (!drawLive()) return;
  A.on = true; A.t = 1; A.cool = 0; A.back = null; A.lift = null; A.range = false; LOOK.drag = null; LOOK.yaw = LOOK.pitch = 0; LOOK.ease = false;
  if (FREE.on) { const el = FREE.which; freeReset(); if (el) el.hidden = false; }
  A.sign = !$("sign").hidden; A.hint = !$("hintBox").hidden; $("sign").hidden = true; $("skip").hidden = true; showHintBox(false); STATE.locked = true; STATE.ts = 1;
  A.from = camFrom(); armedEye(A.eye); const to = _rg2.copy(SIEGE_FOCUS).sub(A.eye); A.yaw = Math.atan2(to.x, to.z); A.pitch = Math.atan2(to.y, Math.hypot(to.x, to.z)) * 0.5;
  A.t = 0; A.lift = { t: 0, dur: 0.5, p: null }; // (the view goes to the barrel as the weapon comes up: 12q armedLate)
  armsEquip(ARMS.own); armsUnstash(ARMS.own); ARMS.mode = "town"; ARMS.drawT = 0; S.vm.kick = 0; S.recoil = 0; Sound.clip("cock0", null, 0.9, 0, 0.1);
  showArmedUI(true); armBackLabel(true); armedHud(); }
const drawLive = () => !!ARMS.own && STATE.played && !STATE.locked && !STATE.trap && (!STATE.over || STATE.lastWon) && !SIEGE.on && !CHASE.on && !ARMED.on && !RANGE.on && !RANGE.going && $("menu").hidden;
// the Draw button: there while the weapon's yours and you could take it up (not over the round's sign)
function updateDrawBtn() { const b = $("drawBtn"); if (!b) return; const on = drawLive() && $("sign").hidden; if (b.hidden === on) { b.hidden = !on; if (on) b.textContent = `Draw the ${ARMS_DEF[ARMS.own].short}`; } }
// the Scope button: there while the Sharps is in your hand and you can shoot
function updateScopeBtn() { const b = $("scopeBtn"); if (!b) return; const S = SIEGE, on = ARMS.cur === "sharps" && !RANGE.pickOpen && !RANGE.modesOpen && $("rangeRes").hidden && ((ARMED.on && !ARMED.lift && !ARMED.back) || (S.on && (S.phase === "fight" || S.phase === "doomed" || S.phase === "cleared") && !laserHeld()));
  if (b.hidden === on) b.hidden = !on; if (!on && ARMS.zoom) armsScope(false); }

// ---- the screen ----
function buildRangeUI() {
  const st = $("stage"), mk = (tag, id, html, cls) => { const e = document.createElement(tag); e.id = id; if (cls) e.className = cls; e.hidden = true; e.innerHTML = html; if (tag === "button") e.type = "button"; st.appendChild(e); return e; };
  mk("div", "scope", `<svg viewBox="-50 -50 100 100" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><defs><mask id="scopeM"><rect x="-200" y="-200" width="400" height="400" fill="white"/><circle r="40" fill="black"/></mask></defs><rect x="-200" y="-200" width="400" height="400" fill="#050302" mask="url(#scopeM)"/><circle r="40" fill="none" stroke="#000" stroke-width="2.5"/><path d="M-40 0H-3M3 0H40M0 -40V-3M0 3V40" stroke="#0b0806" stroke-width="0.5"/><path d="M-40 0H-24M24 0H40M0 24V40" stroke="#0b0806" stroke-width="1.6"/></svg>`);
  mk("div", "rangePop", "");
  mk("div", "rangeBar", `<button type="button" id="rangeLeave" aria-label="Leave the range">Leave</button><button type="button" id="rangeWeapons">Weapons</button><button type="button" id="rangeModesBtn">Challenges</button><button type="button" id="rangeReset" aria-label="Stand the targets back up">Reset</button>`);
  const tile = id => { const d = ARMS_DEF[id], thin = id === "bow" ? `fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round"` : `fill="currentColor"`;
    return `<button type="button" class="rpw${id === "laser" ? " beam" : ""}" data-w="${id}"><svg viewBox="-40 -40 80 80" aria-hidden="true"><path d="${ARMS_GLYPH[id]}" ${thin}/></svg><b>${d.name}</b><span>${d.blurb}</span><i>${d.kind === "beam" ? "Hold Fire · range only" : d.auto ? "Hold Fire" : d.mag + " " + (d.mag === 1 ? d.unit1 || d.unit.replace(/s$/, "") : d.unit)}${d.zoom ? " · scope" : ""}</i></button>`; };
  mk("div", "rangePick", `<div class="rpp"><h2>The Gunsmith's Range</h2><p>Pick a weapon. Shoot what you like; Reset stands it all back up.</p><div class="rpg">${RANGE_LIST.map(tile).join("")}</div><button type="button" class="rpLeave" id="rangePickLeave">Leave range</button></div>`);
  mk("div", "rangeModes", `<div class="rpp"><h2>Challenges</h2><p id="rangeModesSub"></p><div class="rpml" id="rangeModesList"></div><button type="button" class="rpLeave" id="rangeModesClose">Back to practice</button></div>`);
  mk("div", "rangeRes", `<div class="rpp"><h2 id="rangeResTitle">Bottles</h2><div id="rangeResTime">0:00.00</div><p id="rangeResShots"></p><p id="rangeResLine"></p><div class="rrb"><button type="button" class="hbtn" id="rangeAgain">Again</button><button type="button" class="hbtn" id="rangeResClose">Practice</button></div></div>`);
  mk("button", "scopeBtn", "Scope"); $("scopeBtn").setAttribute("aria-label", "Look down the scope");
  mk("button", "drawBtn", "Draw");
  mk("div", "rangeFade", ""); $("rangeFade").style.opacity = 0;
  const on = (id, fn) => $(id).addEventListener("click", e => { e.stopPropagation(); fn(); });
  on("rangeWeapons", () => rangePicker(!RANGE.pickOpen)); on("rangeModesBtn", () => RANGE.run ? rangeModeStop() : rangeModes(!RANGE.modesOpen)); on("rangeReset", rangeReset);
  on("rangeLeave", rangeLeave); on("rangePickLeave", rangeLeave); on("rangeModesClose", () => rangeModes(false));
  on("rangeAgain", () => rangeModeStart(RANGE.lastMode)); on("rangeResClose", rangeReset);
  for (const b of document.querySelectorAll("#rangePick .rpw")) b.addEventListener("click", e => { e.stopPropagation(); rangePick(b.dataset.w); });
  on("scopeBtn", () => armsScope(!ARMS.zoom)); on("drawBtn", armsDraw);
  for (const id of ["rangePick", "rangeModes", "rangeRes", "rangeBar"]) $(id).addEventListener("pointerdown", e => e.stopPropagation());
}
