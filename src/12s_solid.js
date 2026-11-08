// ---------- SOLID BUILDINGS (v53) ----------
// Nothing passes through the town's buildings now. Each building is solid from the ground up, its porch with it (the deck, the posts and
// the roof over them: in front of a building is as far as anything goes), and so are the church and the water tower's legs. In v52 the
// loose horse's run cut across the corner of the general store, the tumbleweeds blew through the buildings on both sides of the street
// (they came in from behind them), and a gunman shot down by a porch could fall through it; only the two roofs a gunman climbs were solid,
// and only to him.
//   - SOLID.fps: each building, the church and the tower legs as rectangles on the ground (centre, turn, half sizes; a building's porch as a
//     second one in front of it). solidPush moves a point (with a radius) out of them the shortest way; solidHit says whether it's in one.
//   - SOLID.boxes: every building as the boxes a falling body can't pass through (06 roofSolids, for every building now, not just the two
//     with men on their roofs, and the church and tower legs), given to a body that falls in town (12d shotHits, 12q).
//   - The loose horse's runs go round the buildings (10 updateHorse: its waypoints), the street's tumbleweeds come in only where nothing
//     stands in their way and fetch up against a porch, roll along it, or, held there, are blown off (07c), the physical one bounces off a
//     wall (10 updateWeed), and the herd and the townsfolk keep clear of them (12n herdPlace, 09 walking).
const SOLID = { fps: [], boxes: [] };
function buildSolids() {
  const F = SOLID.fps, rect = (name, x, z, yaw, hx, hz, oz = 0, h = 9) => { const c = Math.cos(yaw), s = Math.sin(yaw); F.push({ name, x: x + s * oz, z: z + c * oz, c, s, hx, hz, h }); };
  for (const B of WORLD.blds || []) { const yaw = Math.atan2(B.s, B.c), d = B.d, pd = B.pd;
    rect(B.name, B.x, B.z, yaw, B.w / 2, (d + 0.18) / 2, 0.09, B.h + 1.8); // the building and its false front
    rect(B.name + " porch", B.x, B.z, yaw, B.w / 2, (pd + 0.18) / 2, d / 2 + 0.18 + (pd + 0.18) / 2 - 0.09, 3.3); // the porch, to the posts
    const Rf = roofInfo(B.x, B.z, yaw, B.w, B.h, B.d, B.name, B.opt || {}); SOLID.boxes.push(...Rf.solids); }
  if (WORLD.church) { const c = WORLD.church.position, y = WORLD.church.yaw; rect("CHURCH", c.x, c.z, y, 4.1, 7.1, 0, 17);
    const ax = (x, yy, z) => V3(x * Math.cos(y) + z * Math.sin(y), yy, -x * Math.sin(y) + z * Math.cos(y)), ux = ax(1, 0, 0), uy = V3(0, 1, 0), uz = ax(0, 0, 1);
    SOLID.boxes.push({ c: c.clone().add(V3(0, 3, 0)), u: [ux, uy, uz], h: [4, 3, 7] }, { c: c.clone().add(ax(0, 8.5, 6.5)), u: [ux, uy, uz], h: [1.3, 2.5, 1.3] }); }
  if (WORLD.tower) for (const [lx, lz] of [[-1.8, -1.8], [1.8, -1.8], [-1.8, 1.8], [1.8, 1.8]]) { const p = WORLD.tower; rect("WATER TOWER", p.x + lx, p.z + lz, 0, 0.16, 0.16, 0, 6);
    SOLID.boxes.push({ c: V3(p.x + lx, p.y + 3, p.z + lz), u: [V3(1, 0, 0), V3(0, 1, 0), V3(0, 0, 1)], h: [0.13, 3, 0.13] }); }
}
// the rectangle a ground point (with radius r) is inside, and how far it goes in: { f, d, nx, nz } (the way out), or null
const _sp = { f: null, d: 0, nx: 0, nz: 0 };
function solidHit(x, z, r = 0, y) {
  let best = null;
  for (const f of SOLID.fps) { if (y !== undefined && y > f.h) continue; const dx = x - f.x, dz = z - f.z, lx = dx * f.c - dz * f.s, lz = dx * f.s + dz * f.c, ex = f.hx + r, ez = f.hz + r;
    if (Math.abs(lx) >= ex || Math.abs(lz) >= ez) continue;
    const px = ex - Math.abs(lx), pz = ez - Math.abs(lz), sx = Math.sign(lx) || 1, sz = Math.sign(lz) || 1;
    const d = Math.min(px, pz), nlx = px < pz ? sx : 0, nlz = px < pz ? 0 : sz;
    if (!best || d > best.d) { best = _sp; best.f = f; best.d = d; best.nx = nlx * f.c + nlz * f.s; best.nz = -nlx * f.s + nlz * f.c; } }
  return best;
}
// push p (x, z; y kept) out of whatever it's in; returns the way it was pushed (a unit vector on the ground) or null
const _spn = new THREE.Vector3();
function solidPush(p, r = 0) { let n = null; for (let k = 0; k < 3; k++) { const h = solidHit(p.x, p.z, r, p.y); if (!h) break; p.x += h.nx * (h.d + 1e-3); p.z += h.nz * (h.d + 1e-3); n = _spn.set(h.nx, 0, h.nz); } return n; }
// is the straight way from a to b clear for something of radius r (sampled every 25 cm)?
function solidClear(ax, az, bx, bz, r = 0) { const L = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.ceil(L / 0.25)); for (let i = 0; i <= n; i++) { const t = i / n; if (solidHit(ax + (bx - ax) * t, az + (bz - az) * t, r)) return false; } return true; }
// the boxes near p (for a body falling there)
function solidBoxesNear(p, rad = 9) { return SOLID.boxes.filter(b => Math.hypot(b.c.x - p.x, b.c.z - p.z) < rad + Math.max(b.h[0], b.h[2]) * 1.5); }
