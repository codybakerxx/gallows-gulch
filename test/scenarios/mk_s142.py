# builds test/s142.json: v42.
#   - the shootout with the laser: a tumbleweed in the beam catches fire, rolls on ablaze and blackening, burns down to ash; another blows in later
#   - a gunman shot down, then held in the beam: he burns to ash where he lies, a long low heap under him
#   - the meat: STEAK! over it as it comes, a ring and sparks; thicker; steaming once it's down
#   - v47: the tumbleweed bouncing past the gallows and the covers (a second one, of its own) burns in the beam too, and a bullet knocks it on
#   - v43: the weed on the ground, as it rolls; the fire drawn over the scene; out of bullets and down behind cover, safe from their shots
#     till one of them comes round the side of it; the laser on the crate silent, and no hum left after
#   - the getaway: the run from 70 km/h to 90; the revolver five in the gun and one reload; the riders sitting up straight
# Prints one JSON line per check; "ok" is true when it passed.
import json, os, sys
pre = sys.argv[1] if len(sys.argv) > 1 else "g142"
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
# ---- into the shootout, the laser in hand ----
E("""(async () => { await __go(200, () => !STATE.locked); await __siege(); const S = SIEGE, L = LASER; await __go(600, () => L.ready); S.cover = 1; laserTake(); await __go(40, () => { __calm(); return false; }); L.charge = 20; S.holding = true; await __go(40, () => { __calm(); return false; }); // (stood up, over the cover)
  return __check('the shootout, the laser in hand', laserHeld() && S.phase === 'fight', { held: laserHeld(), phase: S.phase }); })()""")
# ---- a tumbleweed in the beam catches fire, burns down to ash, and another blows in later ----
E("""(async () => { const S = SIEGE, D = DRESS.weeds; if (!D) return __check('a tumbleweed in the beam catches fire', false, { err: 'no tumbleweeds at this tier' });
  const w = D.weeds[0], C = S.covers[S.cover], savedV = WIND.v.clone(); WIND.v.set(0.001, 0, 0); window.__windBack = () => WIND.v.copy(savedV); window.__W = w; let spot = null; const why = { moved: 0, blocked: 0 }; // (somewhere in the street in plain sight of the cover, and it stays put)
  for (let al = 9; al <= 45; al += 3) { for (const sd of [0, 3, -3, 6, -6, 9, -9, 12, -12]) { const ro = upEye(V3()), at = V3(STREET.o[0] + STREET.a[0] * al + STREET.r[0] * sd, 0, STREET.o[1] + STREET.a[1] * al + STREET.r[1] * sd); /* (in the street, where tumbleweeds roll: not within 8 m of the gallows) */ w.p.set(at.x, 0, at.z); w.kick = null; w.v = 0; w.y = 0; w.vy = 0; await __go(2, () => { w.vy = Math.min(w.vy, 0); return false; }); /* (v42b: on the ground, rolling as it would: no lift) */
      if (w.p.distanceTo(at.setY(0)) > 0.3) { why.moved++; continue; } const c = w.c.clone(), rd = c.clone().sub(ro).normalize(), e = sceneryRay(ro, rd, 80); if (!e || e.distance > c.distanceTo(ro)) { spot = c; break; } why.blocked++; why.last = [+c.distanceTo(ro).toFixed(1), e && +e.distance.toFixed(1)]; } if (spot) break; }
  if (!spot) { __windBack(); return __check('a tumbleweed in the beam catches fire', false, { err: 'no clear spot', why }); }
  const got = await __track(() => { w.vy = Math.min(w.vy, 0); return w.c.clone(); }, (ro, rd) => { const h = targetRay(ro, rd), e = sceneryRay(ro, rd, 80); return h && h.weed === w && (!e || h.t < e.distance); }, 120);
  laserTrigger(true); await __go(8); laserTrigger(false); const lit = !!w.fire; /* (the beam comes on a frame or two after the trigger) */ await __go(30); const flames = fireLive(); const col = new THREE.Color(); D.im.getColorAt(0, col);
  return __check('a tumbleweed on the ground in the beam catches fire', got && lit && flames > 10 && col.r < 0.8, /* (v48: it chars over 1.3 s now, from where it caught) */ { got, lit, flames, colour: +col.r.toFixed(2), spot: spot.toArray().map(v => +v.toFixed(1)) }); })()""")
shot("a_weed_fire")
E("""(async () => { const p = __W.c; window.__cam = { p: [p.x + 3.2, p.y + 1.4, p.z + 3.2], t: [p.x, p.y + 0.6, p.z], fov: 45 }; await __go(2); return 1; })()""")
shot("a2_weed_fire_close")
E("""(async () => { window.__cam = null; await __go(1); return 1; })()""")
E("""(async () => { const w = __W, D = DRESS.weeds; await __go(400, () => w.gone > 0); const gone = w.gone > 0, m = new THREE.Matrix4(); D.im.getMatrixAt(0, m); const s = new THREE.Vector3().setFromMatrixScale(m).x;
  const hit = targetRay(upEye(V3()), w.p.clone().sub(upEye(V3())).normalize()); const ignored = !hit || hit.weed !== w; w.gone = 0.05; await __go(10); const back = !w.gone && !w.fire; const col = new THREE.Color(); D.im.getColorAt(0, col); __windBack();
  return __check('it burns down to ash, and another blows in later', gone && s < 0.01 && ignored && back && col.r > 0.99, { gone, scale: +s.toFixed(3), ignoredWhileGone: ignored, back, colour: +col.r.toFixed(2) }); })()""")
# ---- v47: the tumbleweed you see, bouncing past the gallows and the covers (10 LIFE.weed): the laser sets it alight too ----
E("""(async () => { const S = SIEGE, W = LIFE.weed, C = S.covers[S.cover], savedV = WIND.v.clone(); WIND.v.set(0.001, 0, 0); window.__windBack = () => WIND.v.copy(savedV);
  if (!W.on) { W.wait = 0; await __go(3); } let spot = null; const why = { blocked: 0 };
  for (const dist of [4, 5, 6, 3.5, 7, 8]) { for (const da of [0, 0.25, -0.25, 0.5, -0.5, 0.8, -0.8]) { const ro = upEye(V3()), at = ro.clone().addScaledVector(V3(Math.sin(C.yaw0 + da), 0, Math.cos(C.yaw0 + da)), dist);
      at.y = groundHeight(at.x, at.z) + W.r; W.p.copy(at); W.v.set(0, 0, 0); W.w.set(0, 0, 0); await __go(2, () => { W.p.x = at.x; W.p.z = at.z; W.v.set(0, Math.min(0, W.v.y), 0); return false; }); /* (held where it's put: the breeze would roll it off) */
      const c = W.p.clone(), rd = c.clone().sub(ro).normalize(), e = sceneryRay(ro, rd, 80), h = targetRay(ro, rd); if (h && h.weed === W && (!e || e.distance > h.t)) { spot = at; break; } why.blocked++; } if (spot) break; }
  if (!spot) { __windBack(); return __check('the tumbleweed by the gallows catches fire in the beam', false, { err: 'no clear spot', why }); }
  const hold = () => { W.p.x = spot.x; W.p.z = spot.z; W.v.x = W.v.z = 0; return false; };
  const got = await __track(() => { hold(); return W.p.clone(); }, (ro, rd) => { const h = targetRay(ro, rd), e = sceneryRay(ro, rd, 80); return h && h.weed === W && (!e || e.distance > h.t); }, 120);
  laserTrigger(true); await __go(8, hold); laserTrigger(false); const lit = !!W.fire; await __go(30, hold); const flames = fireLive(), col = W.m.material.color.r / W.base.r;
  return __check('the tumbleweed by the gallows catches fire in the beam', got && lit && flames > 10 && col < 0.8, { got, lit, flames, colour: +col.toFixed(2), at: spot.toArray().map(v => +v.toFixed(1)) }); })()""")
E("""(async () => { const p = LIFE.weed.p; window.__cam = { p: [p.x + 3.2, p.y + 1.4, p.z + 3.2], t: [p.x, p.y + 0.6, p.z], fov: 45 }; await __go(2); return 1; })()""")
shot("a3_gallows_weed_fire")
E("""(async () => { window.__cam = null; await __go(1); return 1; })()""")
E("""(async () => { const W = LIFE.weed; await __go(600, () => !W.on); const gone = !W.on && !W.m.visible && !W.fire, waiting = W.wait > 1; W.wait = 0.05; await __go(10); const back = W.on && W.m.visible && !W.fire && W.m.scale.x === 1 && W.m.material.color.equals(W.base);
  const hit = targetRay(W.p.clone().add(V3(0, 0, 4)), V3(0, 0, -1)); const v0 = W.v.clone(); targetShot({ weed: W }, W.p.clone(), V3(0, 0, -1)); const kicked = W.v.clone().sub(v0).length(); __windBack();
  return __check('it burns away; the next blows in unburnt; a bullet knocks it on', gone && waiting && back && !!hit && hit.weed === W && kicked > 3, { gone, waiting, back, inRay: !!hit && hit.weed === W, kicked: +kicked.toFixed(2) }); })()""")
# ---- a dead man in the beam: he burns to ash where he lies ----
E("""(async () => { const S = SIEGE, ro = upEye(V3()); const list = S.enemies.filter(q => q.alive).map(q => [q, q.a.ch.bones.Spine2.getWorldPosition(V3())]).filter(([q, p]) => { const rd = p.clone().sub(ro).normalize(), e = sceneryRay(ro, rd, 80); return !e || e.distance > p.distanceTo(ro); }).sort((a, b) => a[1].distanceTo(ro) - b[1].distanceTo(ro)).map(x => x[0]);
  let E = null, got = false, tried = 0; for (const q of list) { tried++; shotHits(q, SIEGE_PARTS[2], q.a.ch.bones.Spine2.getWorldPosition(V3()), V3(0, -0.2, -1).normalize()); await __go(120, () => { __calm(); return false; }); // (shot down; then if he fell where the cover hides him, the next one)
    got = await __track(() => q.a.ch.bones.Hips.getWorldPosition(V3()), (ro, rd) => { const b = bodyRay(S.enemies, ro, rd), e = sceneryRay(ro, rd, 80); return b && b.E === q && (!e || b.t < e.distance); }, 160); if (got) { E = q; break; } if (tried >= 5) break; }
  if (!E) return __check('a dead man in the beam burns to ash where he lies', false, { err: 'none lying in sight', tried });
  const h0 = E.a.ch.bones.Hips.getWorldPosition(V3()); for (let i = 0; i < 20 && !E.ash; i++) { __aimPt(E.a.ch.bones.Hips.getWorldPosition(V3())); laserTrigger(true); await __go(1, () => { __calm(); return false; }); } laserTrigger(false);
  const ash = !!(E.ash && E.ash.lying); await __go(150, () => { __calm(); return false; }); const A = E.ash, pile = A && A.pile, d = pile && Math.hypot(pile.position.x - h0.x, pile.position.z - h0.z);
  return __check('a dead man in the beam burns to ash where he lies', got && ash && !E.a.root.visible && pile && pile.scale.z > pile.scale.x * 1.8 && d < 1.2, { got, tried, ash, gone: !E.a.root.visible, heap: pile && pile.scale.toArray().map(v => +v.toFixed(2)), fromHips: d && +d.toFixed(2) }); })()""")
shot("b_body_ash")
# ---- the meat: thicker, a reward, and steaming ----
E("""(async () => { const S = SIEGE, ro = upEye(V3()), C = S.covers[S.cover], at = ro.clone().addScaledVector(V3(Math.sin(C.yaw0), 0, Math.cos(C.yaw0)), 6); at.y = groundVis(at.x, at.z) + 1.5; const n0 = MEAT.list.length;
  spawnMeat('steak', at, V3(0, 2, 0), 3); const M = MEAT.list[n0]; await __go(3); const label = MEAT.labels.find(L => L.t < 1 && L.word === 'STEAK!' && L.s.visible), ring = MEAT.rings.some(g => g.t < 1 && g.m.visible);
  await __go(240, () => M.landT != null); await __go(20); const steam = M.landT != null, bb = new THREE.Box3().setFromObject(M.m), sz = bb.getSize(V3()); window.__M = M;
  return __check('the meat: thicker, steaming once down, and (v48) no words over it', !label && ring && steam && STEAK.T >= 0.11 && sz.y > 0.3, { label: !!label, ring, steam, thick: +sz.y.toFixed(2), T: STEAK.T }); })()""")
E("""(async () => { const p = __M.m.position; window.__cam = { p: [p.x + 2.4, p.y + 1.6, p.z + 2.2], t: [p.x, p.y + 0.3, p.z], fov: 42 }; await __go(2); return 1; })()""")
shot("c_steak_steaming")
E("""(async () => { window.__cam = null; await __go(1); return 1; })()""")
# ---- the getaway: the run 70 to 90, the revolver five and one reload ----
E("""(async () => { const S = SIEGE; revTake && LASER.state === 'held' && (S.cover = 1, revTake()); await __go(40, () => { __calm(); return false; }); bellShot(bellCentre(V3()), V3(1, 0, 0));
  for (const q of S.enemies) if (q.alive) shotHits(q, SIEGE_PARTS[2], q.a.ch.bones.Spine2.getWorldPosition(V3()), V3(0, -0.2, -1).normalize()); siegeWin(); const C = CHASE; await __go(600, () => C.state === 'ride');
  const v0 = C.speed; RUN.strikes = 99; C.s = C.turnAt - 30; await __go(60); const v1 = C.speed;
  return __check('the run: 70 km/h at the start (as set), 100 by the end (v46; 90 in v42)', !C.laser && RUN.speed0 * 3.6 > 69 && RUN.speed0 * 3.6 < 71 && Math.round(RUN.speed1 * 3.6) === 100 && v1 > v0 + 3, { start: +(v0 * 3.6).toFixed(0), end: +(v1 * 3.6).toFixed(0), cfg: [RUN.speed0, RUN.speed1] }); })()""")
E("""(async () => { const C = CHASE; for (const ob of C.obs) dropObstacle(ob); C.obs = []; C.rows = []; C.nextRow = 1e9; await __go(400, () => C.state === 'combat' && C.safeT <= 0); C.hp = 99; C.attackT = 99;
  const r0 = C.rounds, n0 = C.reloads; C.ay = 0.9; C.ap = 0.6; for (let i = 0; i < r0; i++) { C.cool = 0; chaseFire(); await __go(2); } await __go(140, () => C.reloadT <= 0); const after = [C.rounds, C.reloads];
  for (let i = 0; i < 5; i++) { C.cool = 0; chaseFire(); await __go(2); } await __go(60); const dry = { rounds: C.rounds, reloads: C.reloads, doom: !!C.doom };
  const badge = getComputedStyle($('reloads')).visibility; return __check('the getaway revolver: nine in the gun, no reload (v50; four and one reload in v49)', r0 === 9 && n0 === 0 && after[0] === 0 && after[1] === 0 && dry.rounds === 0 && dry.reloads === 0 && dry.doom && badge === 'hidden' && document.querySelectorAll('#cyl circle[r="8.4"]').length === 9, { first: r0, reloads: n0, after, dry, speedloader: badge }); })()""")
# ---- the riders sit upright ----
E("""(async () => { chaseRetry(); const C = CHASE; await __go(600, () => C.state === 'ride'); C.s = C.turnAt - 4; for (const ob of C.obs) dropObstacle(ob); C.obs = []; C.rows = []; C.nextRow = 1e9; await __go(400, () => C.state === 'combat' && C.safeT <= 0);
  let worst = 0, side = 0; for (let k = 0; k < 40; k++) { C.hp = 99; await __go(3, () => { C.hp = 99; return false; }); for (const r of C.riders) { if (!r.alive) continue; const B = r.a.ch.bones, d = B.Head.getWorldPosition(V3()).sub(B.Spine.getWorldPosition(V3())).applyQuaternion(r.a.root.quaternion.clone().invert());
    worst = Math.max(worst, Math.abs(Math.atan2(d.z, d.y))); side = Math.max(side, Math.abs(Math.atan2(d.x, d.y))); } }
  return __check('the riders sit upright in the saddle', worst < 0.12 && side < 0.06, { forwardDeg: +(worst * 57.3).toFixed(1), sideDeg: +(side * 57.3).toFixed(1) }); })()""")
shot("d_riders_upright")
# ---- v43: out of bullets and down behind cover: their shots go into it; one comes round the side and finishes you there; no hum, then or after ----
E("""(async () => { chaseHome(); await __go(30); await __siege(); const S = SIEGE, L = LASER; await __go(600, () => L.ready); S.holding = S.keyAim = false; await __go(30);
  const onCrate = L.state === 'crate', h0 = S.health; S.bullets = 0; S.reloads = 0; siegeDoomed(); let hum = false, hitAt = null, thereAt = null, near = null, walked = false;
  await __go(3600, () => { S.holding = S.keyAim = false; hum = hum || Sound.hums.wake; const F = S.flanker; if (F && F.state === 'move') walked = true;
    if (F && F.flank && F.flank.there && thereAt === null) { thereAt = +S.doomT.toFixed(2); near = +F.a.pos.distanceTo(S.covers[S.cover].stand).toFixed(2); } if (S.health < h0 && hitAt === null) hitAt = +S.doomT.toFixed(2); return S.phase === 'dead'; });
  const dead = S.phase === 'dead'; await __go(10); const afterDeath = Sound.hums; newRound(); await __go(30); const nextRound = Sound.hums;
  return __check('out of bullets behind cover: safe till one comes round it; no hum', onCrate && walked && thereAt !== null && hitAt !== null && hitAt >= thereAt && near < 2.6 && dead && !hum && !afterDeath.wake && !afterDeath.charge && !afterDeath.beam && !nextRound.wake && !nextRound.charge && !nextRound.beam,
    { onCrate, walked, flankerThereAt: thereAt, fromYou: near, firstHitAt: hitAt, dead, hum, afterDeath, nextRound }); })()""")
E("""JSON.stringify({ errs: __errs })""")
json.dump(steps, open("test/s142.json", "w"), indent=0)
print(len(steps), "steps")
