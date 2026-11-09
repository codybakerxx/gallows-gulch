# builds test/s149.json: v56.
#   - the gunsmith's: a board on a post out over the street, SHOOTING RANGE · OUT BACK, twinkling while the door does; till you've been
#     to the range, a twinkle now and then at the edge of the picture on the side the door is (none when it's in view); a tap on the board
#     takes you there
#   - the detailed revolver (assets/models/Revolver.glb, 12v) arrives and takes the simple one's place: on the barrel by the gallows (the
#     gleam on every part of it), in your hand, as the gunsmith's Colt, on the crate where the laser lay
#   - in your hand: its muzzle where the shot's flash comes from (on the bore line the laser's beam is matched to), the hammer back; a shot:
#     the hammer falls and is thumbed back, the cylinder turned a sixth
#   - the town's bottles under the laser: one glows where the beam's on it, then slumps into a glowing lump of glass, as the gunsmith's do
#     (no shards, nothing spilt); it cools; a bullet still shatters the lump; set out whole and cold for the next shootout. A can in the
#     beam still jumps
# Prints one JSON line per check; "ok" is true when it passed.
import json, os, sys
pre = sys.argv[1] if len(sys.argv) > 1 else "g149"
HERE = os.path.dirname(os.path.abspath(__file__))
steps = []
E = lambda js: steps.append(["eval", js])
shot = lambda f: steps.append(["shot", f"test/{pre}_{f}.png"])
E("""window.__errs = []; window.addEventListener('error', e => __errs.push(String(e.message) + ' @' + (e.filename || '').split('/').pop() + ':' + (e.lineno || ''))); window.addEventListener('unhandledrejection', e => __errs.push('rej ' + String(e.reason && e.reason.stack || e.reason))); 1""")
steps.append(["wait", 2500])
E("""new Promise(res => { const to = setTimeout(() => res('no frame in 120 s'), 120000); requestAnimationFrame(() => requestAnimationFrame(() => { clearTimeout(to); res(1); })); })""")
steps.append(["wait", 600]); steps.append(["click", "#startBtn"]); steps.append(["wait", 1500])
E(open(os.path.join(HERE, "chase_helpers.js")).read())
E("""window.__check = (name, ok, info) => JSON.stringify({ check: name, ok: !!ok, info, errs: __errs.slice(0, 3) });
window.__rev = h => { let m = null; h.traverse(o => { if (!m && o.name === 'revolverModel') m = o; }); return m; };
window.__tapAt = p => { const r = $('scene').getBoundingClientRect(), q = p.clone().project(R.camera); return { clientX: r.left + (q.x * 0.5 + 0.5) * r.width, clientY: r.top + (-q.y * 0.5 + 0.5) * r.height, cancelable: false }; };
window.__tris = o => { let n = 0; o.traverse(q => { if (q.isMesh) n += q.geometry.index.count / 3; }); return n; };
window.__laserOn = (T, n) => (async () => { const p = () => T.mesh.position.clone().add(V3(0, 0.1 * T.mesh.scale.y, 0)); laserTrigger(true); await __go(n, () => { __calm(); __aimPt(p()); return false; }); })();
window.__live = K => K.P.filter(D => D.on).length; 1""")
# ---- the model comes in (fetched once the game's up), and takes the simple one's place on the barrel ----
E("""new Promise(res => { const t0 = performance.now(), iv = setInterval(() => { if ((REV.proto && LASER.ready) || performance.now() - t0 > 90000) { clearInterval(iv); res(1); } }, 100); })""")
E("""(async () => { await __go(200, () => !STATE.locked); STATE.hintShown = true; await __go(60); const g = GUNPROP.gun, m = __rev(g); let gleam = 0, n = 0, lit = 0, mats = new Set(); if (m) m.traverse(o => { if (o.isMesh) { n++; if (o.castShadow) lit++; mats.add(o.material); if (o.material.customProgramCacheKey && /gunPropShine/.test(o.material.customProgramCacheKey())) gleam++; } });
  let stand = 0; g.traverse(o => { if (o.isMesh && o.castShadow && o.material === REV.noColour) stand++; }); /* (its shadow from the simple one, drawn into the shadow map only) */
  return __check('the detailed revolver on the barrel by the gallows, gleaming (its shadow cast by the simple one)', !!REV.proto && !!m && __tris(m) > 100000 && gleam === n && mats.size >= 10 && GUNPROP.shine.k.value > 0.5 && !!g.userData.rev && lit === 0 && stand >= 3,
    { loaded: !!REV.proto, tris: m && __tris(m), parts: n, materials: mats.size, gleaming: gleam, castShadow: lit, shadowStandIn: stand, k: +GUNPROP.shine.k.value.toFixed(2) }); })()""")
shot("a_on_barrel")
# ---- the gunsmith's: a board out over the street, twinkling; till you've been, a twinkle at the edge of the picture, the side it's on ----
E("""(async () => { const D = RANGE.door, Bd = RANGE.board, B = D.B, ctr = new THREE.Vector3(B.x, Bd.c.y, B.z), out = Bd.c.clone().sub(ctr).dot(D.out); let stars = 0;
  await __go(90, () => { stars = Math.max(stars, RANGE.boardStars.filter(p => p.s.visible).length); return false; });
  return __check("the gunsmith's board, SHOOTING RANGE, out over the street past the porch, twinkling in a round", doorLive() && !!Bd && out > B.d / 2 + B.pd && RANGE.boardU.k.value > 0.9 && RANGE.boardHalo.visible && stars >= 1,
    { live: doorLive(), out: +out.toFixed(2), porch: B.d / 2 + B.pd, k: +RANGE.boardU.k.value.toFixed(2), stars }); })()""")
E("""(async () => { RANGE.glintT = 0; const scr = c => { const p = c.clone().project(R.camera); return p.z < 1 && Math.abs(p.x) < 0.98 && Math.abs(p.y) < 0.98; }, inView = scr(RANGE.door.c) || scr(RANGE.board.c); let seen = null;
  await __go(420, () => { if (RANGE.glintOn && !seen) { const r = $('rangeGlint').getBoundingClientRect(), sc = $('scene').getBoundingClientRect(); seen = { x: Math.round(r.left + r.width / 2 - sc.left), w: Math.round(sc.width), op: +$('rangeGlint').style.opacity }; } return false; });
  const p = RANGE.door.c.clone().project(R.camera), side = Math.sign(p.x), ok = inView ? !seen : !!seen && (side > 0 ? seen.x > seen.w * 0.8 : seen.x < seen.w * 0.2);
  return __check('till you have been there, a twinkle now and then at the edge of the picture on the side the door is (none with it in view)', ok, { inView, ndcX: +p.x.toFixed(2), seen }); })()""")
E("""(async () => { const Bd = RANGE.board, c = R.camera.position, d = Bd.c.clone().sub(c), f = new THREE.Vector3(0, 0, -1).applyQuaternion(R.camera.quaternion); /* (turned to it, as a drag would) */
  LOOK.yaw += Math.atan2(d.x, d.z) - Math.atan2(f.x, f.z); LOOK.pitch += Math.atan2(d.y, Math.hypot(d.x, d.z)) - Math.asin(f.y); await __go(4); const real = window.rangeEnter; let went = 0; window.rangeEnter = () => { went++; };
  const off = doorTap(Object.assign(__tapAt(Bd.c), { clientX: __tapAt(Bd.c).clientX + 170 })), on = doorTap(__tapAt(Bd.c)); window.rangeEnter = real; await __go(40, () => { lookHome(); return false; }); LOOK.yaw = LOOK.pitch = 0;
  return __check('a tap on the board takes you to the range', on && !off && went === 1, { on, off, went }); })()""")
# ---- in your hand ----
E("""(async () => { armedStart(); await __go(90, () => !ARMED.lift); await __go(20); const vm = SIEGE.vm.gun, h = vm.children[0], m = __rev(vm);
  const P = REV.proto; P.updateMatrixWorld(true); const box = new THREE.Box3().setFromObject(P), v = V3(), sum = V3(); let n = 0; // (the front of the barrel, in the gun's own frame: the muzzle and the bore)
  P.traverse(o => { if (!o.isMesh) return; const a = o.geometry.attributes.position; for (let i = 0; i < a.count; i++) { v.fromBufferAttribute(a, i).applyMatrix4(o.matrixWorld); if (v.z > box.max.z - 0.004) { sum.add(v); n++; } } }); sum.divideScalar(Math.max(1, n));
  const muz = { z: __r(box.max.z), x: __r(sum.x), y: __r(sum.y) }, cocked = __r(h.userData.rev.hammer.rotation.z);
  return __check('in your hand: the detailed revolver, the muzzle where the flash comes from (on the bore line), the hammer back', vm.visible && !!m && vm.children.length === (ARMS.revKids || vm.children).length && Math.abs(muz.z - 0.2) < 0.006 && Math.abs(muz.y - 0.035) < 0.004 && Math.abs(muz.x) < 0.004 && cocked > 0.55,
    { shown: vm.visible, model: !!m, muz, cocked }); })()""")
shot("b_in_hand")
E("""(async () => { const c = R.camera.position, P = SIEGE.vm.gun.children[0].userData.rev, t0 = REV.turn; __armAt(V3(c.x + 3, c.y + 6, c.z + 3)); await __go(30); ARMED.cool = 0; armedFire(); await __go(2);
  const fell = { hammer: __r(P.hammer.rotation.z), trigger: __r(P.trigger.rotation.z) }; await __go(40); const back = { hammer: __r(P.hammer.rotation.z), trigger: __r(P.trigger.rotation.z), cyl: __r(P.cyl.rotation.x) };
  return __check('a shot: the hammer falls and is thumbed back, the cylinder turned a sixth', REV.turn === t0 + 1 && fell.hammer < 0.3 && fell.trigger < -0.15 && back.hammer > 0.55 && Math.abs(back.trigger) < 0.02 && Math.abs(back.cyl - REV.turn * Math.PI / 3) < 0.01, { fell, back, turn: REV.turn }); })()""")
E("""(async () => { armsEquip('colt'); armsLoad(ARMED); ARMS.drawT = 1; await __go(20); const m = __rev(SIEGE.vm.gun); const c = !!m && !!ARMS.models.colt && !!__rev(ARMS.models.colt); armsEquip(null); await __go(5);
  return __check("the gunsmith's Colt is the same revolver", c, { colt: c }); })()""")
# ---- the shootout: on the crate where the laser lay ----
E("""(async () => { armedReset(); await __go(5); await __siege(); const S = SIEGE, L = LASER; S.cover = 1; laserTake(); await __go(40, () => { __calm(); return false; }); L.charge = 20; S.holding = true; await __go(40, () => { __calm(); return false; });
  const m = __rev(L.rev); return __check('the shootout: the detailed revolver on the crate where the laser lay', laserHeld() && L.rev.visible && L.revShows === 'rev' && !!m, { held: laserHeld(), shown: L.rev.visible, shows: L.revShows, model: !!m }); })()""")
# ---- a bottle in the beam ----
E("""(async () => { const S = SIEGE; let pick = null; const tried = [];
  for (const cv of [S.cover, 0, 2]) { if (cv !== S.cover) { S.cover = cv; S.yaw = S.covers[cv].yaw0; await __go(60, () => { __calm(); return !S.run && S.cv < 0.05; }); }
    for (const T of TGT.items.filter(T => T.kind === 'bottle' && T.state === 'stand')) { const p = T.mesh.position.clone().add(V3(0, 0.1, 0)); for (let i = 0; i < 4; i++) { __calm(); __aimPt(p); await __go(1); }
      R.camera.updateMatrixWorld(); const o = R.camera.position.clone(), rd = V3(0, 0, -1).applyQuaternion(R.camera.quaternion).normalize(), h = targetRay(o, rd), e = sceneryRay(o, rd, 80); tried.push([cv, +p.distanceTo(o).toFixed(1), !!h && h.T === T]);
      if (h && h.T === T && (!e || h.t < e.distance)) { pick = T; break; } } if (pick) break; }
  if (!pick) return __check('a bottle in the beam glows, then slumps into a glowing lump of glass', false, { err: 'no bottle in sight', tried });
  window.__B = pick; const g0 = __live(TGT.debris.glass), w0 = TGT.water.life.filter(l => l > 0).length; await __laserOn(pick, 9); const glow = { st: pick.state, heat: __r(pick.U.uHeat.value) };
  await __laserOn(pick, 50); const mid = { st: pick.state, sy: __r(pick.mesh.scale.y), heat: __r(pick.U.uHeat.value) };
  window.__glow = { glow, mid }; return JSON.stringify({ glow, mid, g0, w0 }); })()""")
shot("c_bottle_melting")
E("""(async () => { const T = __B; if (!T) return __check('a bottle in the beam glows, then slumps into a glowing lump of glass', false, {}); const g0 = __live(TGT.debris.glass); const p = () => T.mesh.position.clone().add(V3(0, 0.1 * T.mesh.scale.y, 0)); laserTrigger(true); await __go(300, () => { __calm(); __aimPt(p()); return T.state === 'melted'; }); const st = T.state; laserTrigger(false); await __go(3, () => { __calm(); return false; }); /* (just melted: still glowing) */
  const lump = { st, sy: __r(T.mesh.scale.y), sx: __r(T.mesh.scale.x), heat: __r(T.U.uHeat.value), shards: __live(TGT.debris.glass) - g0, visible: T.mesh.visible }, G = __glow;
  return __check('a bottle in the beam glows, then slumps into a glowing lump of glass (no shards)', G.glow.st === 'stand' && G.glow.heat > 0.3 && G.mid.st === 'melt' && G.mid.sy < 0.9 && st === 'melted' && lump.sy < 0.35 && lump.sx > 1.4 && lump.heat > 0.1 && lump.shards === 0 && lump.visible, Object.assign(lump, G)); })()""")
E("""(async () => { const T = __B; await __go(150, () => { __calm(); return false; }); const cool = __r(T.U.uHeat.value), g0 = __live(TGT.debris.glass), w0 = TGT.water.life.filter(l => l > 0).length;
  const at = T.mesh.position.clone().add(V3(0, 0.03, 0)), rd = at.clone().sub(R.camera.position).normalize(); targetShot({ t: 1, T }, at, rd); await __go(2, () => { __calm(); return false; });
  const shot = { st: T.state, shards: __live(TGT.debris.glass) - g0, spilt: TGT.water.life.filter(l => l > 0).length - w0, stump: T.base && T.base.visible };
  resetTargets(); const back = { st: T.state, sy: T.mesh.scale.y, heat: T.U.uHeat.value, visible: T.mesh.visible };
  return __check('it cools; a bullet still shatters the lump; set out whole and cold again', cool < 0.05 && shot.st === 'broken' && shot.shards > 4 && shot.spilt <= 0 && !shot.stump && back.st === 'stand' && back.sy === 1 && back.heat === 0 && back.visible, { cool, shot, back }); })()""")
E("""(async () => { const S = SIEGE; let pick = null;
  for (const T of TGT.items.filter(T => T.kind === 'can' && T.state === 'stand')) { const p = T.mesh.position.clone(); for (let i = 0; i < 4; i++) { __calm(); __aimPt(p); await __go(1); }
    R.camera.updateMatrixWorld(); const o = R.camera.position.clone(), rd = V3(0, 0, -1).applyQuaternion(R.camera.quaternion).normalize(), h = targetRay(o, rd), e = sceneryRay(o, rd, 80); if (h && h.T === T && (!e || h.t < e.distance)) { pick = T; break; } }
  if (!pick) return __check('a can in the beam still jumps', true, { skipped: 'no can in sight from here' });
  laserTrigger(true); await __go(6, () => { __calm(); __aimPt(pick.mesh.position); return false; }); laserTrigger(false); const st = pick.state; await __go(3, () => { __calm(); return false; });
  return __check('a can in the beam still jumps', st === 'fly' || st === 'rest', { st }); })()""")
E("""JSON.stringify({ errs: __errs })""")
json.dump(steps, open("test/s149.json", "w"), indent=0)
