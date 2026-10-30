# builds test/s136.json: v36, the laser gun on the crate, and horses and crows that fall (or come out as meat).
#   - the laser lies on the crate at your first cover, out of sight in the usual view and in sight when you look down at it
#   - tapping it with a round left in the revolver does nothing but say so
#   - the town horse shot with the revolver goes down and lies on the ground
#   - the revolver empty: the laser wakes, a tap picks it up, the fight goes on with it
#   - the beam: a gunman goes down; a crow comes out as a chicken leg that lands; the town horse comes out as a steak, quickly, and it lands
#   - the charge: 20 s of firing empties it, it won't fire while recharging, and it's full again 7 s later
#   - a new round: the laser back on the crate, full, the meat gone, the horse up again
#   - the next shootout has the laser on the crate again; in the getaway after it, a posse horse shot goes down, throws its rider, and lies on the trail
# Prints one JSON line per check; "ok" is true when it passed.
import json, os, sys
pre = sys.argv[1] if len(sys.argv) > 1 else "g136"
HERE = os.path.dirname(os.path.abspath(__file__))
steps = []
E = lambda js: steps.append(["eval", js])
shot = lambda f: steps.append(["shot", f"test/{pre}_{f}.png"])
E("""window.__errs = []; window.addEventListener('error', e => __errs.push(String(e.message) + ' @' + (e.filename || '').split('/').pop() + ':' + (e.lineno || ''))); window.addEventListener('unhandledrejection', e => __errs.push('rej ' + String(e.reason && e.reason.stack || e.reason))); 1""")
steps.append(["wait", 2500]); steps.append(["click", "#startBtn"]); steps.append(["wait", 1500])
E(open(os.path.join(HERE, "chase_helpers.js")).read())
E("""window.__check = (name, ok, info) => JSON.stringify({ check: name, ok: !!ok, info, errs: __errs.slice(0, 3) });
window.__onScreen = p => { R.camera.updateMatrixWorld(); const q = p.clone().project(R.camera); return Math.abs(q.x) < 1 && Math.abs(q.y) < 1 && q.z < 1; };
window.__tapAt = p => { const r = $('scene').getBoundingClientRect(), q = p.clone().project(R.camera); return { clientX: r.left + (q.x * 0.5 + 0.5) * r.width, clientY: r.top + (-q.y * 0.5 + 0.5) * r.height, cancelable: false, preventDefault() {} }; };
window.__ray = () => { R.camera.updateMatrixWorld(); return [R.camera.position.clone(), V3(0, 0, -1).applyQuaternion(R.camera.quaternion).normalize()]; };
window.__track = async (pt, ok, n = 240) => { for (let i = 0; i < n; i++) { __calm(); __aimPt(pt()); await __go(1); const [ro, rd] = __ray(); if (i > 12 && ok(ro, rd)) return true; } return false; };
window.__horseFirst = (ro, rd) => { const h = townHorseRay(ro, rd), e = sceneryRay(ro, rd, 80); return h && (!e || h.t < e.distance); };
window.__horseInView = () => { const H = LIFE.horse; if (!H.run || !H.grp.visible) return false; const c = H.grp.localToWorld(V3(0, 1.2, 0)), ro = R.camera.position, rd = c.clone().sub(ro), d = rd.length(); rd.normalize(); const e = sceneryRay(ro, rd, d + 1);
  return (!e || e.distance > d - 0.6) && Math.abs(((Math.atan2(rd.x, rd.z) - SIEGE.covers[SIEGE.cover].yaw0 + Math.PI) % TAU + TAU) % TAU - Math.PI) < 1.1; };
window.__horseUp = async () => { const H = LIFE.horse; H.wait = 0; SIEGE.holding = true; await __go(600, () => { __calm(); return H.run && H.run.seg >= 1 && __horseInView(); });
  return __track(() => H.grp.localToWorld(V3(0, 1.2, 0)), __horseFirst); }; 1""")
# the laser on the crate
E("""(async () => { for (let i = 0; i < 100 && !LASER.ready; i++) await new Promise(r => setTimeout(r, 200)); SIEGE_CFG.hitUp = 0; SIEGE_CFG.hitRun = 0; await __siege(); const S = SIEGE, L = LASER;
  const normal = []; for (const up of [false, true]) for (const pitch of [-0.15, 0, 0.15]) { S.holding = up; S.yaw = S.covers[S.cover].yaw0; S.pitch = pitch; await __go(30, () => { __calm(); return false; }); normal.push(__onScreen(L.crate.position)); }
  S.holding = true; __aimPt(L.crate.position); await __go(20, () => { __calm(); __aimPt(L.crate.position); return false; }); const seen = __onScreen(L.crate.position), pitch = +S.pitch.toFixed(2);
  const [ro] = __ray(), to = L.crate.position.clone().sub(ro), d = to.length(), e = sceneryRay(ro, to.normalize(), d + 1), clear = !e || e.distance > d - 0.08;
  return __check('laser on the crate', L.ready && L.state === 'crate' && L.crate.visible && S.cover === 1 && !normal.some(Boolean) && seen && clear && pitch < -0.5, { cover: S.cover, normal, seen, clear, pitch }); })()""")
shot("a_crate")
E("""(async () => { const L = LASER, used = laserTap(__tapAt(L.crate.position)); await __go(2);
  return __check('not while the revolver is loaded', used && L.state === 'crate' && /revolver/.test($('siegeTip').textContent) && !$('siegeTip').hidden, { used, state: L.state, tip: $('siegeTip').textContent }); })()""")
# the town horse, shot with the revolver
E("""(async () => { const H = LIFE.horse, S = SIEGE, got = await __horseUp(); const p0 = S.pools.length; S.cool = 0; S.reloadT = 0; S.bullets = 6; fireTap(); await __go(3); const shot = !!H.dead && !H.run;
  await __go(110, () => { __calm(); return false; }); const c = H.grp.localToWorld(V3(0, 1.15, 0)), fl = groundVis(c.x, c.z);
  return __check('the horse falls (revolver)', got && shot && H.dead.landed && H.grp.visible && c.y - fl < 0.6 && S.pools.length > p0, { got, shot, landed: H.dead && H.dead.landed, body: +(c.y - fl).toFixed(2), pools: S.pools.length - p0 }); })()""")
shot("b_horse_down")
# out of bullets: the laser wakes; picked up
E("""(async () => { const S = SIEGE, L = LASER; S.bullets = 0; S.reloads = 0; S.reloadT = 0; siegeDoomed(); await __go(30); const awake = L.awake, phase0 = S.phase; __aimPt(L.crate.position); await __go(20);
  const ok = siegeTap(__tapAt(L.crate.position)); await __go(4); const lifting = L.state === 'lift'; await __go(40); __calm();
  return __check('picked up when the revolver is empty', awake && phase0 === 'doomed' && lifting && L.state === 'held' && S.phase === 'fight' && !L.crate.visible && L.charge === LASER_CFG.charge, { awake, phase0, lifting, state: L.state, phase: S.phase }); })()""")
# the beam: a gunman
E("""(async () => { const S = SIEGE, L = LASER, E = S.enemies.find(q => q.alive && inView(q, 1.2)) || S.enemies.find(q => q.alive);
  const got = await __track(() => E.a.ch.bones.Spine2.getWorldPosition(V3()), (ro, rd) => { const h = rayActor(E.a, ro, rd, E.female), e = sceneryRay(ro, rd, 80); return h && (!e || h.t < e.distance); }, 160);
  const c0 = L.charge; laserTrigger(true); await __go(8); const firing = L.firing, beam = L.beam.visible, dead = !E.alive; laserTrigger(false); await __go(2);
  return __check('the beam takes a gunman', got && firing && beam && dead && L.charge < c0, { got, firing, beam, dead, used: +(c0 - L.charge).toFixed(2) }); })()""")
shot("c_beam")
# a crow: a chicken leg
E("""(async () => { const c = CROWS.list.find(q => q.state !== 'dead' && q.state !== 'meat' && q.state !== 'away') || CROWS.list.find(q => q.state !== 'meat'), P = CROWS.perches.find(q => q.kind === 'beam');
  c.root.visible = true; crowSettle(c, { P, u: 0.5, p: P.a.clone().lerp(P.b, 0.5) }, 0); c.idle = 99; c.cawT = 99; await __go(2);
  const n0 = MEAT.list.length, got = await __track(() => c.body.getWorldPosition(V3()).add(V3(0, 0.05, 0)), (ro, rd) => { const h = crowRay(ro, rd); return h && h.c === c; }, 60);
  laserTrigger(true); await __go(4); laserTrigger(false); const meat = c.state === 'meat', M = MEAT.list[n0]; await __go(10); const gone = !c.root.visible; await __go(150);
  const fl = M ? goreFloor(M.m.position.x, M.m.position.z, M.m.position.y + 0.1) : 0;
  return __check('a crow comes out as a chicken leg', meat && M && !M.steak && gone && M.rest && Math.abs(M.m.position.y - fl - M.half) < 0.03, { got, meat, leg: !!M && !M.steak, gone, rest: M && M.rest, y: M && +(M.m.position.y - fl).toFixed(3) }); })()""")
shot("d_leg")
# the horse: a steak
E("""(async () => { resetMeat(); const H = LIFE.horse, got = await __horseUp(); laserTrigger(true); await __go(3); laserTrigger(false); const meat = !!H.meat, M = MEAT.list.find(m => m.steak);
  await __go(8); const quick = !H.grp.visible; await __go(160); const fl = M ? goreFloor(M.m.position.x, M.m.position.z, M.m.position.y + 0.1) : 0;
  return __check('the horse comes out as a steak', got && meat && M && quick && M.rest && Math.abs(M.m.position.y - fl - M.half) < 0.03, { got, meat, steak: !!M, goneIn8Frames: quick, rest: M && M.rest, y: M && +(M.m.position.y - fl).toFixed(3) }); })()""")
E("""(async () => { const M = MEAT.list.find(m => m.steak); __aimPt(M.m.position); await __go(10); return 1; })()""")
shot("e_steak")
# the charge: 20 s, then 7 s to charge
E("""(async () => { const S = SIEGE, L = LASER; L.charge = LASER_CFG.charge; __aimPt(V3(-3.2, 0.5, -12)); await __go(10); laserTrigger(true); let f = 0;
  await __go(1500, () => { __calm(); f++; return L.rechargeT > 0; }); const empty = !L.firing && L.charge < 0.05;
  laserTrigger(true); await __go(2); const blocked = !L.firing; laserTrigger(false); await __go(60 * 6.7); const notYet = L.rechargeT > 0 && L.charge < LASER_CFG.charge; await __go(60 * 0.4);
  return __check('20 s of charge, 7 s to recharge', f >= 1190 && f <= 1210 && empty && blocked && notYet && L.rechargeT <= 0 && L.charge === LASER_CFG.charge, { seconds: +(f / 60).toFixed(2), empty, blocked, notYet, charge: L.charge }); })()""")
# a new round
E("""(async () => { newRound(); await __go(30); const L = LASER, H = LIFE.horse;
  return __check('a new round', L.state === 'crate' && !L.vm.visible && L.charge === LASER_CFG.charge && !MEAT.list.length && !H.dead && !H.meat, { state: L.state, charge: L.charge, meat: MEAT.list.length }); })()""")
# the getaway: a posse horse shot
E("""(async () => { try { document.getElementById('sign').hidden = true; await __siege(); const again = LASER.crate.visible && LASER.state === 'crate'; await __shootBell(); await __lastOne(1); await __go(600, () => CHASE.state === 'ride'); await __go(10); const C = CHASE;
  C.s = C.turnAt - 4; for (const ob of C.obs) dropObstacle(ob); C.obs = []; C.rows = []; C.nextRow = 1e9; await __go(400, () => C.state === 'combat' && C.safeT <= 0); await __go(5); C.hp = 99;
  const aimP = p => { const Sw = C.sway || { y: 0, p: 0 }, c = R.camera.position; let ay = Math.atan2(p.x - c.x, p.z - c.z) - (C.horse.yaw + Math.PI) - Sw.y; ay = ((ay + Math.PI) % TAU + TAU) % TAU - Math.PI; C.ay = ay; C.ap = Math.atan2(p.y - c.y, Math.hypot(p.x - c.x, p.z - c.z)) - Sw.p; C.mouse = null; return Math.abs(ay) <= CHASE_CFG.yawLim; };
  let R0 = null; for (let i = 0; i < 900 && !R0; i++) { C.safeT = 999; if (C.attacker) endAttack(C.attacker);
    for (const r of C.riders) { if (!r.alive || !r.H.grp.visible || !aimP(r.H.grp.localToWorld(V3(0, 1.0, 0.5)))) continue; await __go(1); R.camera.updateMatrixWorld(); const ro = R.camera.position.clone(), rd = aimDir(V3()).normalize(), hh = chaseHorseRay(ro, rd), h = rayActor(r.a, ro, rd, false, 0);
      if (hh && hh.R0 === r && !(h && h.t < hh.t)) { R0 = r; break; } }
    if (!R0) await __go(1); }
  if (!R0) return __check('a posse horse falls', false, { found: false });
  C.cool = 0; C.rounds = 6; C.reloadT = 0; chaseFire(); const down = !!(R0.free && R0.free.down) && !R0.alive; await __go(70); const D = R0.free && R0.free.down, H = R0.H, c = H.grp.localToWorld(V3(0, 1.15, 0));
  return __check('a posse horse falls', again && down && D.landed && H.grp.visible && c.y - groundVis(c.x, c.z) < 0.7, { laserOnCrateAgain: again, down, landed: D && D.landed, body: +(c.y - groundVis(c.x, c.z)).toFixed(2) }); } catch (e) { return __check('a posse horse falls', false, { err: e.stack }); } })()""")
shot("f_posse_horse")
E("""JSON.stringify({ errs: __errs })""")
json.dump(steps, open("test/s136.json", "w"), indent=0)
print(len(steps), "steps")
