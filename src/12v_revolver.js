// ---------- THE REVOLVER (v56) ----------
// Your revolver is the detailed single-action model made in another chat for the repository owner (assets/models/Revolver.glb, packed by
// tools/pack_revolver.py): a nickel frame, a blued cylinder with six rounds in it, brass trigger guard, backstrap and butt cap, ebony
// grips and a case-hardened hammer. It's fetched once the game's up; until it's in (or if it can't be had) the simple one built in 12d
// (revolver) stands in. Wherever it's shown (in your hand, on the barrel by the gallows, on the crate where the laser lay, the gunsmith's
// Colt) it's a holder (revHolder) the model is put into the moment it arrives. In your hand the hammer's back; at each shot it falls and
// is thumbed back again, the cylinder turning a sixth (updateRevolver). The townsfolk's and the riders' guns stay the simple ones.
const REV = { proto: null, holders: [], fireT: 9, turn: 0 };
const REV_SCALE = 0.9; // (the model's 33 cm long; a touch smaller sits in the hand and on the barrel where the old one did)
// the model in the game's frame: barrel along +z, the bore on (0, 0.035) and the muzzle at z 0.2, as the simple one's (so the flash and the
// laser's beam line up: 12d revolver, 12k LASER_BORE)
const REV_BORE = [0.2749, 0.0593]; // (in the model's own frame, barrel along +x: the muzzle's x, the bore's height)
function prepRevolver(gltf) {
  const src = gltf.scene, top = src.getObjectByName("Revolver"); src.updateMatrixWorld(true);
  const proto = new THREE.Group(); proto.name = "revolverModel";
  const fr = new THREE.Group(); fr.rotation.y = -Math.PI / 2; fr.scale.setScalar(REV_SCALE); fr.position.set(0, 0.035 - REV_BORE[1] * REV_SCALE, 0.2 - REV_BORE[0] * REV_SCALE); proto.add(fr);
  const into = { Revolver: fr }; for (const nm of ["Hammer", "Trigger", "Cylinder"]) { const p = top.getObjectByName(nm), g = new THREE.Group(); g.name = nm; g.position.copy(p.position); fr.add(g); into[nm] = g; }
  const rel = new THREE.Matrix4(), inv = new THREE.Matrix4();
  src.traverse(o => { if (!o.isMesh) return; let pv = o.parent; while (pv && !into[pv.name]) pv = pv.parent; if (!pv) return; // (each part under its own pivot)
    const a = o.geometry.attributes, ud = o.geometry.userData, g = new THREE.BufferGeometry(), n = a.position.count;
    const fl = (attr, it, f) => { const arr = new Float32Array(n * it); for (let i = 0; i < n; i++) for (let k = 0; k < it; k++) arr[i * it + k] = f(attr, i, k); return new THREE.BufferAttribute(arr, it); };
    const get = (attr, i, k) => k === 0 ? attr.getX(i) : k === 1 ? attr.getY(i) : attr.getZ(i);
    g.setAttribute("position", fl(a.position, 3, get)); g.setAttribute("normal", fl(a.normal, 3, get));
    const uo = ud.uvo || [0, 0], us = ud.uvs || [1, 1]; g.setAttribute("uv", fl(a.uv, 2, (attr, i, k) => uo[k] + us[k] * get(attr, i, k))); // (the grain repeats along a part: pack_revolver.py)
    if (a.uv2) g.setAttribute("uv2", fl(a.uv2, 2, get));
    g.setIndex(new THREE.BufferAttribute(n > 65535 ? new Uint32Array(o.geometry.index.array) : new Uint16Array(o.geometry.index.array), 1));
    rel.copy(inv.copy(pv.matrixWorld).invert()).multiply(o.matrixWorld); g.applyMatrix4(rel); g.computeBoundingSphere();
    const mat = o.material; mat.envMapIntensity = 1.15; const m = new THREE.Mesh(g, mat); m.name = o.name; into[pv.name === "Revolver" ? "Revolver" : pv.name].add(m); });
  REV.proto = proto; for (const h of REV.holders) revFill(h); if (typeof SIEGE !== "undefined") SIEGE.occ = null; // (put into every place it's already shown)
}
// a place the revolver is shown. opts: each (called on every mesh of what's put in), mat (a material swapped for each of the model's:
// the barrel's gleam, 12p), cocked (the hammer back: in your hand), hand (the first-person one: no shadow)
function revHolder(opts = {}) { const h = new THREE.Group(); h.userData.revHolder = opts; REV.holders.push(h); revFill(h); return h; }
function revFill(h) {
  const o = h.userData.revHolder; for (const c of h.children.slice()) h.remove(c);
  let m; if (REV.proto) { m = REV.proto.clone(true); h.userData.rev = { hammer: m.getObjectByName("Hammer"), trigger: m.getObjectByName("Trigger"), cyl: m.getObjectByName("Cylinder") }; if (o.cocked) h.userData.rev.hammer.rotation.z = 0.6; }
  else { m = revolver(true); h.userData.rev = null; if (o.blued) for (let i = 0; i < 3; i++) m.children[i].material = armsMats().blued; }
  m.traverse(q => { if (!q.isMesh) return; q.castShadow = !REV.proto; q.userData.dyn = true; if (o.mat) q.material = o.mat(q.material); if (o.each) o.each(q); }); h.add(m);
  // its shadow: the simple one's, drawn into the shadow map only (the detailed one is 160,000 triangles: drawn into the sun's shadow map
  // every frame it'd cost a phone more than it shows). Not the one in your hand (hand): that casts none
  if (REV.proto && !o.hand) { const s = revolver(false), inv = REV.noColour || (REV.noColour = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false }));
    s.traverse(q => { if (q.isMesh) { q.material = inv; q.castShadow = true; q.userData.dyn = true; } }); h.add(s); }
}
// in your hand, tilted a little in the wrist (rolled about the barrel), so you see some of its side (the cylinder, the frame, the grips)
// and not only the back of the hammer. Still pointing straight down the sight: turned out, it pointed off to the right, which is how the
// Derringer was held till v55 and wasn't wanted. On a phone held upright it's near the middle and seen from behind, so it's tilted more;
// on a wide screen it's off to the side already
REV.pose = [0.4, 0.25]; // (the roll: upright phone; wide screen)
function revCant(vm) { if (!REV.proto || (ARMS.cur && ARMS.cur !== "colt")) return; const b = 0.035 * vm.scale.y; // (about the bore, so its line, the flash's and the laser's, doesn't move)
  vm.translateY(b); vm.rotateZ(lerp(REV.pose[0], REV.pose[1], clamp((R.camera.aspect - 0.6) / 1.2, 0, 1))); vm.translateY(-b); }
// a shot from the revolver in your hand (12d siegeFire, 12q armedFire, 12g chase, 12t the Colt): the hammer falls, and is thumbed back
function revShot() { REV.fireT = 0; REV.turn++; }
function updateRevolver(rdt) {
  if (!REV.proto) return; REV.fireT += rdt; const vm = SIEGE.vm && SIEGE.vm.gun; if (!vm || !vm.visible) return;
  let h = null; vm.traverse(o => { if (!h && o.userData.revHolder && o.userData.rev) h = o; }); if (!h) return;
  const P = h.userData.rev, t = REV.fireT, back = smoothstep(0.12, 0.34, t);
  P.hammer.rotation.z = t < 0.04 ? 0.6 * (1 - t / 0.04) : 0.6 * back; // (falls, then thumbed back)
  P.trigger.rotation.z = t < 0.12 ? -0.2 : -0.2 * (1 - smoothstep(0.12, 0.22, t));
  P.cyl.rotation.x = (REV.turn - 1 + back) * Math.PI / 3; // (a sixth of a turn as the hammer comes back: the next round under it)
}
