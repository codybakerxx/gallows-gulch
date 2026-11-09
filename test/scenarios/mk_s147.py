# builds test/s147.json: v53.
#   - spare rounds by the board: they glimmer; in the town shootout a tap on them is one more reload (two speedloaders by the cylinder,
#     "+7 rounds"); with the gun dry and the gunmen closing in, they put you back in the fight; not to be had outside the shootout; back
#     for the next shootout
#   - the buildings are solid: in a long run of the town (the loose horse sent through again and again, the herd, the townsfolk, both kinds of
#     tumbleweed) nothing goes into a building, a church or the tower; every way the loose horse can run is clear of them; a gunman shot
#     down falls against the buildings near him, and nothing of him ends up inside one
#   - the gunmen hold their revolvers: the grip in the palm (to the centimetre), the barrel along the line he means to shoot down, the grip
#     up through his curled fingers, at the ready and taking aim
#   - the laser in your hand where the revolver is: the same line, the bores within a centimetre
#   - the noose: going on, sitting there 12 s, and coming off (a reprieve), it, its knot and the rope never go more than a centimetre or so
#     into his head or neck, and the executioner's fists no more than two (a hand pressed to a head); his fists turned so the knot runs up
#     through the left and the loop through the curl of the right
# Prints one JSON line per check; "ok" is true when it passed.
import json, os, sys
pre = sys.argv[1] if len(sys.argv) > 1 else "g147"
HERE = os.path.dirname(os.path.abspath(__file__))
steps = []
E = lambda js: steps.append(["eval", js])
shot = lambda f: steps.append(["shot", f"test/{pre}_{f}.png"])
E("""window.__errs = []; window.addEventListener('error', e => __errs.push(String(e.message) + ' @' + (e.filename || '').split('/').pop() + ':' + (e.lineno || ''))); window.addEventListener('unhandledrejection', e => __errs.push('rej ' + String(e.reason && e.reason.stack || e.reason))); 1""")
steps.append(["wait", 2500]) # (and the page drawing again before the click: under SwiftShader at desktop size the first frames behind the menu can take a while)
E("""new Promise(res => { const to = setTimeout(() => res('no frame in 120 s'), 120000); requestAnimationFrame(() => requestAnimationFrame(() => { clearTimeout(to); res(1); })); })""")
steps.append(["wait", 600]); steps.append(["click", "#startBtn"]); steps.append(["wait", 1500])
E(open(os.path.join(HERE, "chase_helpers.js")).read())
E(open(os.path.join(HERE, "nz_helpers.js")).read())
E("""window.__check = (name, ok, info) => JSON.stringify({ check: name, ok: !!ok, info, errs: __errs.slice(0, 3) }); 1""")
E("""window.__tapAt = p => { const r = $('scene').getBoundingClientRect(), q = p.clone().project(R.camera); return { clientX: r.left + (q.x * 0.5 + 0.5) * r.width, clientY: r.top + (-q.y * 0.5 + 0.5) * r.height, cancelable: false }; }; 1""")
# ---- the noose first (a fresh round, the man at the trap)
E("""(async () => { await __go(200, () => !STATE.locked); STATE.hintShown = true; MAN.pathIdx = TRAP_I; MAN.place(MAN_PATH[TRAP_I][0], MAN_PATH[TRAP_I][1], trapYaw()); MAN.face(trapYaw()); await __go(30);
  const on = await __nzRun(execNoose, 900), H = EXEC.hold; const after = await __nzRun(() => wait(12), 800); await __go(60); const off = await __nzRun(execNooseOff, 600);
  const W = (o, k) => o[k][0], ok = ['on', 'after', 'off'].every(ph => { const o = { on, after, off }[ph]; return W(o, 'ring') > -0.008 && W(o, 'knot') > -0.017 && W(o, 'rope') > -0.008 && W(o, 'hand') > -0.024; });
  return __check("the noose clears his head going on, sitting there and coming off; the executioner's fists on it", ok && GAL.rope.onNeck === false, { on: Object.fromEntries(Object.entries(on).map(([k, v]) => [k, v.slice(0, 3)])), after: Object.fromEntries(Object.entries(after).map(([k, v]) => [k, v.slice(0, 2)])), off: Object.fromEntries(Object.entries(off).map(([k, v]) => [k, v.slice(0, 3)])) }); })()""")
# ---- the spare rounds
E("""(async () => { await __go(200, () => !STATE.locked); let peak = 0, sparks = 0; await __go(150, () => { peak = Math.max(peak, AMMO.glow.value); if (AMMO.sparks.some(p => p.s.visible)) sparks++; return false; });
  const near = AMMO.at.distanceTo(BOARD.group.position), tapOut = ammoTap(__tapAt(AMMO.at));
  return __check('spare rounds by the board, glimmering; not to be had outside the shootout', AMMO.box.visible && near < 1.2 && peak > 0.5 && sparks > 10 && !tapOut && !AMMO.taken, { near: +near.toFixed(2), peak: +peak.toFixed(2), sparks, tapOut }); })()""")
E("""(async () => { await __siege(); await __up(); __calm(); __aimPt(AMMO.at); await __go(30, () => { __calm(); return false; }); const r0 = SIEGE.reloads, n0 = document.querySelectorAll('#reloads svg').length;
  let peak = 0; await __go(130, () => { __calm(); peak = Math.max(peak, AMMO.glow.value); return false; }); const ok = ammoTap(__tapAt(AMMO.at)); await __go(6, () => { __calm(); return false; });
  const r1 = SIEGE.reloads, n1 = document.querySelectorAll('#reloads svg.full').length, msg = $('hitMsg').textContent, gone = !AMMO.box.visible;
  return __check('in the shootout a tap on them is one more reload: two speedloaders by the cylinder, +7 rounds', ok && r1 === r0 + 1 && n1 === 2 && gone && /[+]7 rounds/i.test(msg) && peak > 1, { r0, r1, n0, n1, msg, gone, peak: +peak.toFixed(2) }); })()""")
shot("a_rounds_taken")
E("""(async () => { const S = SIEGE; ammoReset(); S.bullets = 0; S.reloads = 0; siegeDoomed(); await __go(5); const doomed = S.phase, dm = !$('doomMsg').hidden; __aimPt(AMMO.at); await __go(10);
  const ok = ammoTap(__tapAt(AMMO.at)); await __go(3); const ph = S.phase, rl = S.reloadT > 0; await __go(150, () => S.reloadT <= 0); __calm();
  return __check('with the gun dry and them closing in, the spare rounds put you back in the fight', doomed === 'doomed' && dm && ok && ph === 'fight' && rl && S.bullets === SIEGE_ROUNDS && $('doomMsg').hidden, { doomed, ph, rl, bullets: S.bullets }); })()""")
# ---- the gunmen's grip, and the laser in your hand
E("""(async () => { const S = SIEGE, out = []; const men = S.enemies.filter(q => q.alive && !q.roof).slice(0, 3);
  for (const st of ['pause', 'aim']) { for (const E of men) { E.a.path = null; E.state = st; E.t = 999; if (st === 'aim') E.aimW = 1; } await __go(45, () => { for (const E of men) { E.state = st; E.t = 999; } return false; });
    for (const E of men) { const a = E.a, g = E.gun, gp = gripPt(a, 'R', new THREE.Vector3()), gc = g.localToWorld(GUN_GRIP.at.clone()), fwd = new THREE.Vector3(0, 0, 1).applyQuaternion(g.quaternion), B = a.ch.bones;
      const s = new THREE.Vector3().subVectors(B.RightHandIndex1.getWorldPosition(new THREE.Vector3()), B.RightHandPinky1.getWorldPosition(new THREE.Vector3())).normalize(), ga = GUN_GRIP.s.clone().applyQuaternion(g.quaternion);
      out.push({ st, who: a.name, grip: +gp.distanceTo(gc).toFixed(4), dir: +fwd.dot(E.gdir).toFixed(4), axis: +s.dot(ga).toFixed(3) }); } }
  const ok = out.length >= 4 && out.every(o => o.grip < 0.01 && o.dir > 0.995 && o.axis > 0.97);
  return __check('the gunmen hold their revolvers: the grip in the palm, the barrel on the line, the grip up through the fingers', ok, out); })()""")
E("""(async () => { const S = SIEGE; __calm(); await __go(20, () => { __calm(); return false; }); S.vm.gun.updateMatrixWorld(true); const rv = S.vm.gun, rO = rv.localToWorld(new THREE.Vector3(0, 0.035, 0)), rD = new THREE.Vector3(0, 0, 1).applyQuaternion(rv.getWorldQuaternion(new THREE.Quaternion()));
  laserTake(); await __go(60, () => { __calm(); return LASER.state === 'held'; }); await __go(5, () => { __calm(); return false; }); const L = LASER.vm; L.updateMatrixWorld(true);
  const lO = L.localToWorld(new THREE.Vector3(0, 0, 0)), lD = new THREE.Vector3(0, 0, 1).applyQuaternion(L.getWorldQuaternion(new THREE.Quaternion())), off = lO.clone().sub(rO), perp = off.clone().addScaledVector(rD, -off.dot(rD)).length(), ang = Math.acos(Math.min(1, lD.dot(rD))) * 180 / Math.PI;
  return __check('the laser in your hand where the revolver is: the same line, the bores within a centimetre', LASER.state === 'held' && ang < 0.6 && perp < 0.01, { angDeg: +ang.toFixed(2), perp: +perp.toFixed(4) }); })()""")
shot("b_laser_held")
# ---- the buildings are solid
E("""window.__solidHits = {}; window.__solidNote = (who, x, z, r, y) => { const h = solidHit(x, z, Math.max(0, r - 0.02), y != null ? y - groundHeight(x, z) : undefined); if (!h) return; const k = who + ' @ ' + h.f.name; const o = __solidHits[k] || (__solidHits[k] = { n: 0, at: [+x.toFixed(2), +z.toFixed(2)] }); o.n++; };
  window.__solidSample = () => { const H = LIFE.horse; if (H && H.grp.visible && H.run) { const p = H.grp.position, f = [Math.sin(H.yaw), Math.cos(H.yaw)]; for (const o of [-1.1, 0, 1.1]) __solidNote('loose horse', p.x + f[0] * o, p.z + f[1] * o, 0.35); }
    for (const h of HERD.list) { if (!h.grp.visible) continue; const f = [Math.sin(h.yaw), Math.cos(h.yaw)]; for (const o of [-1.1, 0, 1.1]) __solidNote('herd ' + h.kind, h.x + f[0] * o, h.z + f[1] * o, 0.35); }
    for (const a of [...LIFE.crowd, HOST, EXEC, MAN]) { if (!a || !a.root.visible) continue; const p = a.root.position; if (p.y > groundHeight(p.x, p.z) + 1.5) continue; __solidNote('townsfolk ' + a.name, p.x, p.z, 0.25); }
    const W = LIFE.weed; if (W && W.on && W.p) __solidNote('tumbleweed', W.p.x, W.p.z, W.r * 0.85); if (DRESS.weeds) for (const w of DRESS.weeds.weeds) if (!(w.gone > 0)) __solidNote('street tumbleweed', w.p.x, w.p.z, w.rad * 0.95); return false; }; 1""")
E("""(async () => { const H = LIFE.horse, bad = []; for (const fight of [false, true]) { const on = SIEGE.on, ph = SIEGE.phase; SIEGE.on = fight; SIEGE.phase = fight ? 'fight' : null;
    for (let k = 0; k < 40; k++) { H.run = null; H.wait = 0; updateHorse(0.0001); const P = H.run.pts; for (let i = 0; i + 1 < P.length; i++) if (!solidClear(P[i].x, P[i].z, P[i + 1].x, P[i + 1].z, 0.5)) bad.push([fight, i]); for (let i = 1; i + 1 < P.length; i++) if (solidHit(P[i].x, P[i].z, 1.2)) bad.push(['corner', fight, i]); }
    SIEGE.on = on; SIEGE.phase = ph; } H.run = null; H.grp.visible = false; horseTackShow(H, false); H.wait = 0;
  return __check('every way the loose horse can run is clear of the buildings', !bad.length && SOLID.fps.length >= 20, { bad: bad.slice(0, 6), fps: SOLID.fps.length, boxes: SOLID.boxes.length }); })()""")
E("""(async () => { const S = SIEGE, men = S.enemies.filter(E => E.alive); for (const E of men) { const p = E.a.ch.bones.Spine2.getWorldPosition(new THREE.Vector3()); shotHits(E, SIEGE_PARTS[2], p, p.clone().sub(R.camera.position).normalize()); }
  await __go(240); let inside = 0, near = 0, solids = 0, worst = 0; const inBox = (b, p) => { const d = p.clone().sub(b.c); let m = 9; for (let i = 0; i < 3; i++) { const l = Math.abs(d.dot(b.u[i])); if (l >= b.h[i]) return 0; m = Math.min(m, b.h[i] - l); } return m; };
  for (const E of men) { const H = E.a.hang, nb = solidBoxesNear(E.a.root.position); if (nb.length) { near++; if (H && H.solids && H.solids.length >= nb.length) solids++; }
    for (const nm of ['Hips', 'Spine2', 'Head', 'LeftFoot', 'RightFoot', 'LeftHand', 'RightHand']) { const p = E.a.ch.bones[nm].getWorldPosition(new THREE.Vector3()); for (const b of SOLID.boxes) { const m = inBox(b, p); if (m > 0.04) inside++; worst = Math.max(worst, m); } } }
  return __check('a gunman shot down falls against the buildings near him, and none of him ends up in one', solids === near && inside === 0, { men: men.length, near, solids, inside, worst: +worst.toFixed(3) }); })()""")
E("""(async () => { window.__solidHits = {}; resetSiege(); STATE.over = false; newRound(); await __go(200, () => !STATE.locked); for (let i = 0; i < 5; i++) { if (LIFE.horse && !LIFE.horse.run) LIFE.horse.wait = 0; await __go(900, __solidSample); }
  const H = __solidHits; return __check('a long run of the town: the loose horse, the herd, the townsfolk and the tumbleweeds never go into a building', !Object.keys(H).length && AMMO.box.visible, { hits: H, boxBack: AMMO.box.visible }); })()""")
E("""JSON.stringify({ errs: __errs })""")
json.dump(steps, open("test/s147.json", "w"), indent=0)
