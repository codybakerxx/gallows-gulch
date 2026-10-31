# builds test/s139.json: v39.
#   - the revolver on the barrel is there for the taking from the start of a round (before any guess), shining; a tap puts it in your
#     hand at the barrel: the Aim | Fire pad and Put it back instead of the letters, guessing blocked, eight in the gun
#   - a drag turns you; a shot at nothing human starts nothing (a bullet gone); Put it back and the round goes on (a guess works)
#   - taken up again, a townsman shot: the shootout from the barrel, the hangman and the rope skipped: he's down, the condemned man gone,
#     what's left in the gun carried over, and you run for the nearest cover, facing the street when you get there
#   - the laser taken up leaves the revolver on the crate; a tap on it swaps back (the laser back on the crate, its charge kept); and again
#   - a town horse in the beam: a steak three times the size (about 2 m), lying flat on the ground; in the beam it burns to ash and
#     leaves a scatter of heaps; a drumstick on the ground does the same
#   - the street cleared with the laser in hand: the getaway's fight with the laser: a rider in the beam burns to ash in the saddle
#     while his horse runs on; a posse horse in the beam is a steak and its rider's thrown; the fight won; a retry has them whole and
#     the laser charged; and with the revolver swapped back before the end, the getaway is the revolver's
# Prints one JSON line per check; "ok" is true when it passed.
import json, os, sys
pre = sys.argv[1] if len(sys.argv) > 1 else "g139"
HERE = os.path.dirname(os.path.abspath(__file__))
steps = []
E = lambda js: steps.append(["eval", js])
shot = lambda f: steps.append(["shot", f"test/{pre}_{f}.png"])
E("""window.__errs = []; window.addEventListener('error', e => __errs.push(String(e.message) + ' @' + (e.filename || '').split('/').pop() + ':' + (e.lineno || ''))); window.addEventListener('unhandledrejection', e => __errs.push('rej ' + String(e.reason && e.reason.stack || e.reason))); 1""")
steps.append(["wait", 2500]) # (and the page drawing again before the click: under SwiftShader at desktop size the first frames behind the menu can take a while)
E("""new Promise(res => { const to = setTimeout(() => res('no frame in 120 s'), 120000); requestAnimationFrame(() => requestAnimationFrame(() => { clearTimeout(to); res(1); })); })""")
steps.append(["wait", 600]); steps.append(["click", "#startBtn"]); steps.append(["wait", 1500])
E(open(os.path.join(HERE, "chase_helpers.js")).read())
E("""window.__check = (name, ok, info) => JSON.stringify({ check: name, ok: !!ok, info, errs: __errs.slice(0, 3) });
window.__ptr = (type, x, y, id = 7) => { const tg = type === 'pointerdown' ? $('scene') : window; tg.dispatchEvent(new PointerEvent(type, { pointerId: id, pointerType: 'touch', isPrimary: true, bubbles: true, cancelable: true, clientX: x, clientY: y })); };
window.__tapAt = p3 => { const p = p3.clone().project(R.camera), r = $('scene').getBoundingClientRect(), x = r.left + (p.x * 0.5 + 0.5) * r.width, y = r.top + (-p.y * 0.5 + 0.5) * r.height; __ptr('pointerdown', x, y); __ptr('pointerup', x, y); return [x | 0, y | 0]; };
window.__drag = async (dx, dy, steps = 10) => { const r = $('scene').getBoundingClientRect(), x0 = r.left + r.width / 2, y0 = r.top + r.height * 0.4; __ptr('pointerdown', x0, y0);
  for (let i = 1; i <= steps; i++) { __ptr('pointermove', x0 + dx * i / steps, y0 + dy * i / steps); await __go(1); } __ptr('pointerup', x0 + dx, y0 + dy); await __go(1); };
window.__yawOf = () => { const f = V3(0, 0, -1).applyQuaternion(R.camera.quaternion); return Math.atan2(f.x, f.z); };
window.__dy = (a, b) => ((a - b + Math.PI) % TAU + TAU) % TAU - Math.PI;
window.__track = async (pt, ok, n = 240) => { for (let i = 0; i < n; i++) { __calm(); __aimPt(pt()); await __go(1); R.camera.updateMatrixWorld(); const ro = R.camera.position.clone(), rd = V3(0, 0, -1).applyQuaternion(R.camera.quaternion).normalize(); if (i > 6 && ok(ro, rd)) return true; } return false; };
window.__toFight = async () => { const C = CHASE; await __go(600, () => C.state === 'ride'); await __go(10); C.s = C.turnAt - 4; for (const ob of C.obs) dropObstacle(ob); C.obs = []; C.rows = []; C.nextRow = 1e9; await __go(400, () => C.state === 'combat' && C.safeT <= 0); await __go(5); };
window.__cam = null; if (!window.__camHook) { window.__camHook = true; const rf0 = window.renderFrame; window.renderFrame = function (t) { const C = window.__cam; if (C) { R.camera.position.set(...C.p); R.camera.lookAt(...C.t); R.camera.fov = C.fov || 50; R.camera.updateProjectionMatrix(); R.camera.updateMatrixWorld(); } return rf0.apply(this, arguments); }; }
window.__aimHorse = R0 => { const C = CHASE, c = R.camera.position, p = R0.H.grp.localToWorld(V3(0, 1.0, 0.2)), Sw = C.sway || { y: 0, p: 0 }; let ay = Math.atan2(p.x - c.x, p.z - c.z) - (C.horse.yaw + Math.PI) - Sw.y; ay = ((ay + Math.PI) % TAU + TAU) % TAU - Math.PI;
  C.ay = ay; C.ap = Math.atan2(p.y - c.y, Math.hypot(p.x - c.x, p.z - c.z)) - Sw.p; C.mouse = null; }; 1""")
# ---- the revolver from the start ----
E("""(async () => { await __go(200, () => !STATE.locked); const live = gunPropLive(); await __go(30); const p = GUNPROP.gun.getWorldPosition(V3()), c = R.camera.position;
  LOOK.yaw += __dy(Math.atan2(p.x - c.x, p.z - c.z), __yawOf()); await __go(3); LOOK.pitch += Math.atan2(p.y - c.y, Math.hypot(p.x - c.x, p.z - c.z)) - Math.asin(V3(0, 0, -1).applyQuaternion(R.camera.quaternion).y); await __go(3);
  return __check('there for the taking from the start of a round, shining', live && !STATE.over && !STATE.guessed.size && GUNPROP.glint.visible, { live, over: STATE.over, guessed: STATE.guessed.size, glint: GUNPROP.glint.visible }); })()""")
shot("a_revolver_at_start")
E("""(async () => { const xy = __tapAt(GUNPROP.gun.localToWorld(V3(0, 0.02, 0.04))); await __go(2); const lifting = !!ARMED.lift; await __go(60, () => !ARMED.lift);
  const A = ARMED, kbHidden = getComputedStyle(document.querySelector('.krow')).visibility === 'hidden', n = STATE.guessed.size; guess('E'); guess('A'); const blocked = STATE.guessed.size === n, d = R.camera.position.distanceTo(GUNPROP.gun.getWorldPosition(V3()));
  return __check('a tap: in your hand at the barrel', A.on && lifting && !GUNPROP.gun.visible && SIEGE.vm.gun.visible && __vis('pad') && __vis('armBack') && kbHidden && blocked && !SIEGE.on && A.bullets === 8 && d < 2 && document.querySelectorAll('#cyl circle[r="8.4"]').length === 8,
    { xy, on: A.on, lifting, pad: __vis('pad'), putBack: __vis('armBack'), kbHidden, guessingBlocked: blocked, bullets: A.bullets, fromBarrel: +d.toFixed(2) }); })()""")
shot("b_in_hand")
E("""(async () => { const y0 = ARMED.yaw; await __drag(-300, 0); const turned = ARMED.yaw - y0; ARMED.yaw = y0; await __go(3); return __check('a drag turns you', Math.abs(turned) > 0.4, { turned: +turned.toFixed(2) }); })()""")
E("""(async () => { const A = ARMED; A.pitch = 0.7; await __go(3); A.cool = 0; armedFire(); await __go(20); return __check('a shot in the air: no shootout, a bullet gone', !SIEGE.on && A.on && A.bullets === 7, { siege: SIEGE.on, bullets: A.bullets }); })()""")
E("""(async () => { $('armBack').click(); await __go(80, () => !ARMED.on); const ok = !ARMED.on && GUNPROP.gun.visible && !SIEGE.vm.gun.visible && !STATE.locked && !__vis('pad') && !__vis('armBack');
  const kb = getComputedStyle(document.querySelector('.krow')).visibility !== 'hidden', n = STATE.guessed.size, c = [...'ETAOINSHRDLU'].find(q => !STATE.guessed.has(q)); guess(c); const g = STATE.guessed.size === n + 1;
  await __go(1500, () => !STATE.locked || STATE.over); return __check('Put it back: the round goes on', ok && kb && g, { ok, letters: kb, guessed: g, view: CAM.name }); })()""")
E("""(async () => { await __go(200, () => gunPropLive()); armedStart(); await __go(60, () => !ARMED.lift); const b0 = ARMED.bullets, pick = await __armShoot(); const S = SIEGE, E = pick && S.enemies.find(q => q.a === pick);
  return __check('a townsman shot: the shootout from the barrel', pick && S.on && S.phase === 'fight' && E && !E.alive && !ARMED.on && b0 === 7 && S.bullets === 6 && !MAN.root.visible && S.enemies.length >= 7 && !!S.run && STATE.over && !STATE.lastWon,
    { shot: pick && pick.name, on: S.on, phase: S.phase, dead: E && !E.alive, carried: [b0, S.bullets], man: MAN.root.visible, enemies: S.enemies.length, running: !!S.run }); })()""")
shot("c_townsman_shot")
E("""(async () => { const S = SIEGE; await __go(300, () => { __calm(); return !S.run; }); const d = __dy(__yawOf(), S.covers[S.cover].yaw0);
  return __check('ran for the nearest cover, turning to the street', !S.run && Math.abs(d) < 0.08, { cover: S.cover, offStreet: +d.toFixed(3) }); })()""")
# ---- the swap at the crate ----
E("""(async () => { const S = SIEGE, L = LASER; await __go(600, () => L.ready);
  if (S.cover !== 1) { const C = S.covers[1]; S.run = { from: CAM.pos.clone(), to: C.stand.clone(), t: 0, dur: 0.6, to_i: 1 }; await __go(80, () => { __calm(); return !S.run; }); }
  S.holding = false; await __go(40, () => { __calm(); return false; }); for (let i = 0; i < 20; i++) { __aimPt(L.crate.position); await __go(1, () => { __calm(); return false; }); }
  __tapAt(L.crate.position); await __go(40, () => { __calm(); return false; });
  return __check('the laser taken: the revolver left on the crate', L.state === 'held' && L.rev.visible && !L.crate.visible && L.rev.position.distanceTo(L.crate.position) < 0.05, { state: L.state, revolver: L.rev.visible, laserOnCrate: L.crate.visible }); })()""")
E("""(async () => { const p = LASER.rev.position; window.__cam = { p: [p.x + 0.5, p.y + 0.42, p.z + 0.5], t: [p.x, p.y, p.z], fov: 38 }; await __go(2); return 1; })()""")
shot("d_revolver_on_crate")
E("""(async () => { window.__cam = null; await __go(1); return 1; })()""")
E("""(async () => { const S = SIEGE, L = LASER; L.charge = 12.5; for (let i = 0; i < 20; i++) { __aimPt(L.rev.position); await __go(1, () => { __calm(); return false; }); }
  __tapAt(L.rev.localToWorld(V3(0, 0.02, 0.05))); await __go(2); const lifting = !!S.vm.lift; await __go(40, () => { __calm(); return false; }); const cyl = document.querySelectorAll('#cyl circle[r="8.4"]').length;
  return __check('a tap on the revolver: swapped back', L.state === 'crate' && L.crate.visible && !L.rev.visible && lifting && !S.vm.lift && Math.abs(L.charge - 12.5) < 0.01 && !laserHeld() && cyl === 8, { state: L.state, laserOnCrate: L.crate.visible, revolver: L.rev.visible, lifting, charge: +L.charge.toFixed(2), chambers: cyl }); })()""")
E("""(async () => { const S = SIEGE, L = LASER; for (let i = 0; i < 10; i++) { __aimPt(L.crate.position); await __go(1, () => { __calm(); return false; }); } __tapAt(L.crate.position); await __go(40, () => { __calm(); return false; });
  return __check('and the laser again, its charge kept', L.state === 'held' && L.rev.visible && Math.abs(L.charge - 12.5) < 0.01, { state: L.state, charge: +L.charge.toFixed(2) }); })()""")
# ---- the steak, and meat to ash ----
E("""(async () => { const S = SIEGE, L = LASER; L.charge = 20; S.holding = true; await __go(30, () => { __calm(); return false; }); const n0 = MEAT.list.length;
  const H = HERD.list.filter(h => !h.dead && !h.meat).sort((a, b) => a.grp.position.distanceTo(R.camera.position) - b.grp.position.distanceTo(R.camera.position)).find(h => { const ro = upEye(V3()), rd = h.grp.localToWorld(V3(0, 1.2, 0)).sub(ro).normalize(), t = horseRayOne(h, ro, rd), e = sceneryRay(ro, rd, 80); return t > 0 && (!e || t < e.distance); });
  if (!H) return __check('a horse in the beam: a steak three times the size', false, { err: 'no horse in sight' });
  const got = await __track(() => H.grp.localToWorld(V3(0, 1.2, 0)), (ro, rd) => { const t = horseRayOne(H, ro, rd), e = sceneryRay(ro, rd, 80); return t > 0 && (!e || t < e.distance); }, 120);
  laserTrigger(true); await __go(4); laserTrigger(false); const M = MEAT.list[n0]; await __go(240, () => M && M.rest && !M.settle);
  const bb = M && new THREE.Box3().setFromObject(M.m), sz = bb && bb.getSize(V3()), fl = M && meatFloor(M); window.__M = M;
  return __check('a horse in the beam: a steak three times the size', got && M && M.steak && M.s === 3 && M.rest && Math.max(sz.x, sz.z) > 1.8 && Math.abs(bb.min.y - fl) < 0.04 && Math.abs(M.m.quaternion.x) + Math.abs(M.m.quaternion.z) < 0.01,
    { got, scale: M && M.s, size: sz && sz.toArray().map(v => +v.toFixed(2)), onGround: bb && +(bb.min.y - fl).toFixed(3) }); })()""")
E("""(async () => { const p = __M.m.position; window.__cam = { p: [p.x + 2.6, p.y + 2.1, p.z + 2.3], t: [p.x, p.y, p.z], fov: 40 }; await __go(2); return 1; })()""")
shot("e_steak")
E("""(async () => { window.__cam = null; await __go(1); return 1; })()""")
E("""(async () => { const M = __M; const got = await __track(() => M.m.position.clone().add(V3(0, 0.05, 0)), (ro, rd) => { const h = meatRay(ro, rd), e = sceneryRay(ro, rd, 80); return h && h.M === M && (!e || h.t < e.distance); }, 120);
  laserTrigger(true); await __go(12); laserTrigger(false); const ash = !!M.ash; await __go(80); const piles = M.ash && M.ash.piles;
  return __check('the steak in the beam burns to ash', got && ash && !M.m.visible && piles && piles.length >= 5 && piles.every(([p]) => p.scale.y > 0.2), { got, ash, gone: !M.m.visible, heaps: piles && piles.length }); })()""")
E("""(async () => { const S = SIEGE, ro = upEye(V3()), C = S.covers[S.cover], at = ro.clone().addScaledVector(V3(Math.sin(C.yaw0), 0, Math.cos(C.yaw0)), 4.5); at.y = groundVis(at.x, at.z) + 1.2; const n0 = MEAT.list.length;
  spawnMeat('leg', at, V3(0, 0, 0), 0.66); const M = MEAT.list[n0]; await __go(240, () => M.rest && !M.settle);
  const got = await __track(() => M.m.position.clone(), (ro, rd) => { const h = meatRay(ro, rd), e = sceneryRay(ro, rd, 80); return h && h.M === M && (!e || h.t < e.distance); }, 120);
  laserTrigger(true); await __go(12); laserTrigger(false); const ash = !!M.ash; await __go(90);
  return __check('a drumstick on the ground burns to ash', got && ash && !M.m.visible && M.ash.piles && M.ash.piles.length === 1, { got, ash, gone: !M.m.visible }); })()""")
# ---- the getaway with the laser ----
E("""(async () => { const S = SIEGE; bellShot(bellCentre(V3()), V3(1, 0, 0)); for (const q of S.enemies) if (q.alive) shotHits(q, SIEGE_PARTS[2], q.a.ch.bones.Spine2.getWorldPosition(V3()), V3(0, -0.2, -1).normalize());
  siegeWin(); await __go(600, () => CHASE.state === 'ride'); const ring = /M5 -25/.test($('cyl').innerHTML); await __toFight(); const C = CHASE;
  return __check('the street cleared with the laser in hand: the getaway with it', C.laser && C.state === 'combat' && ring && LASER.state === 'held' && /s ·/.test($('meta').textContent), { laser: C.laser, state: C.state, ring, meta: $('meta').textContent }); })()""")
E("""(async () => { const C = CHASE, R0 = C.riders.filter(r => r.alive && r.kind !== 'last').sort((a, b) => a.d - b.d)[0]; window.__R0 = R0; const s0 = C.stats.shots;
  for (let i = 0; i < 200; i++) { C.attackT = 99; C.safeT = 99; __aimRider(R0); laserTrigger(true); await __go(1); if (R0.ash) break; }
  const ash = !!R0.ash, beam = LASER.beam.visible; await __go(10); laserTrigger(false); await __go(2); // (held on a moment: the beam can go on to the man behind him)
  return __check('a rider in the beam burns to ash in the saddle', ash && !R0.alive && beam && !LASER.beam.visible && C.stats.downed >= 1 && C.stats.shots > s0, { ash, beam, downed: C.stats.downed, shots: C.stats.shots - s0 }); })()""")
shot("f_rider_ash")
E("""(async () => { const R0 = __R0, h0 = R0.H.grp.position.clone(); await __go(20); const moved = R0.H.grp.position.distanceTo(h0), withIt = R0.a.root.position.distanceTo(R0.H.grp.position); await __go(90);
  return __check('his horse runs on, and he burns on it till he\\'s gone', moved > 3 && withIt < 0.05 && !R0.a.root.visible, { horseMoved: +moved.toFixed(2), riderOnHorse: +withIt.toFixed(3), gone: !R0.a.root.visible }); })()""")
E("""(async () => { const C = CHASE, R0 = C.riders.filter(r => r.alive).sort((a, b) => a.d - b.d)[0], n0 = MEAT.list.length; let steak = false;
  for (let i = 0; i < 200; i++) { C.attackT = 99; C.safeT = 99; __aimHorse(R0); laserTrigger(true); await __go(1); if (MEAT.list.length > n0) { steak = true; break; } if (!R0.alive) break; }
  laserTrigger(false); const M = MEAT.list[n0]; await __go(10);
  return __check('a posse horse in the beam: a steak, and its rider thrown', steak && M.steak && M.s === 3 && !R0.H.grp.visible && !R0.alive && !!R0.a.hang, { steak, horse: R0.H.grp.visible, riderDown: !R0.alive, thrown: !!R0.a.hang }); })()""")
shot("g_posse_steak")
E("""(async () => { const C = CHASE; for (const r of C.riders) if (r.alive) chaseAsh(r, r.a.ch.bones.Spine2.getWorldPosition(V3()), V3(0, 0, 1)); await __go(900, () => C.state === 'results');
  return __check('the getaway won with the laser', C.state === 'results' && C.result === 'won', { state: C.state, result: C.result, stats: $('resStats').textContent }); })()""")
E("""(async () => { chaseRetry(); await __go(5); const C = CHASE, whole = C.riders.every(r => !r.ash && !r.a.frozen && r.a.root.visible);
  return __check('a retry: the riders whole, the laser charged', whole && C.laser && LASER.charge === 20 && LASER.rechargeT === 0, { whole, laser: C.laser, charge: LASER.charge }); })()""")
# ---- the revolver swapped back before the end: the getaway is the revolver's ----
E("""(async () => { chaseHome(); await __go(30); const back = !CHASE.on && !SIEGE.on && !STATE.over && $('reloads').style.display === '' && !LASER.rev.visible;
  await __siege(); const S = SIEGE, L = LASER; await __go(10); S.cover = 1; laserTake(); await __go(40, () => { __calm(); return false; }); revTake(); await __go(40, () => { __calm(); return false; });
  bellShot(bellCentre(V3()), V3(1, 0, 0)); for (const q of S.enemies) if (q.alive) shotHits(q, SIEGE_PARTS[2], q.a.ch.bones.Spine2.getWorldPosition(V3()), V3(0, -0.2, -1).normalize()); siegeWin(); await __toFight(); const C = CHASE;
  return __check('back to the hangman; and the revolver last in hand, the getaway is the revolver\\'s', back && !C.laser && C.state === 'combat' && C.rounds === GUN.rounds && !/M5 -25/.test($('cyl').innerHTML), { back, laser: C.laser, state: C.state, rounds: C.rounds }); })()""")
E("""JSON.stringify({ errs: __errs })""")
json.dump(steps, open("test/s139.json", "w"), indent=0)
print(len(steps), "steps")
