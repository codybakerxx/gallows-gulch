# builds test/s137.json: v37.
#   - in the hangman part a drag on the picture looks round (all the way) and the next shot the director cuts to turns you back
#   - a revolver on a barrel, off to the side (out of the view the round ends on): it shines and can be taken up only once the round's won;
#     taken up, the shootout starts with you running from it to the nearest cover, the saved man gone, eight in the gun
#   - the shootout: you can turn all the way round (a drag on the picture, crouched or up) and look from your boots to straight up; a tap
#     without a drag still takes cover; the revolver holds eight, and its reload is eight
#   - the laser can be taken up with rounds left in the revolver; a man in its beam burns to ash: he's gone in under two seconds and a heap
#     of ash is left where he stood; a crow comes out as a drumstick more than twice the crow's size
#   - the town's horses: standing on the ground, grazing ones with their heads down, a walker that moves; one shot with the revolver goes
#     down; one in the beam comes out as a steak
#   - things that break: a gunman's crate takes its bullets and breaks (and the one stacked on it, and the bottle on it falls); a shot then
#     goes through where it was; a barrel breaks under the beam; a new round puts it all back
# Prints one JSON line per check; "ok" is true when it passed.
import json, os, sys
pre = sys.argv[1] if len(sys.argv) > 1 else "g137"
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
window.__step = async n => { const RF = window.renderFrame; window.renderFrame = () => {}; try { await __go(n); } finally { window.renderFrame = RF; } return 1; };
window.__ray = () => { R.camera.updateMatrixWorld(); return [R.camera.position.clone(), V3(0, 0, -1).applyQuaternion(R.camera.quaternion).normalize()]; };
window.__track = async (pt, ok, n = 240) => { for (let i = 0; i < n; i++) { __calm(); __aimPt(pt()); await __step(1); const [ro, rd] = __ray(); if (i > 6 && ok(ro, rd)) return true; } return false; };
window.__ptr = (type, x, y, id = 7) => { const tg = type === 'pointerdown' ? $('scene') : window; tg.dispatchEvent(new PointerEvent(type, { pointerId: id, pointerType: 'touch', isPrimary: true, bubbles: true, cancelable: true, clientX: x, clientY: y })); };
window.__drag = async (dx, dy, steps = 10) => { const r = $('scene').getBoundingClientRect(), x0 = r.left + r.width / 2, y0 = r.top + r.height * 0.4; __ptr('pointerdown', x0, y0);
  for (let i = 1; i <= steps; i++) { __ptr('pointermove', x0 + dx * i / steps, y0 + dy * i / steps); await __go(1); } __ptr('pointerup', x0 + dx, y0 + dy); await __go(1); };
window.__yawOf = () => { const f = V3(0, 0, -1).applyQuaternion(R.camera.quaternion); return Math.atan2(f.x, f.z); };
window.__dy = (a, b) => ((a - b + Math.PI) % TAU + TAU) % TAU - Math.PI; 1""")
# ---- the hangman part ----
E("""(async () => { await __go(120, () => !STATE.locked); const y0 = __yawOf(); await __drag(-260, 0); await __go(2); const turned = Math.abs(__dy(__yawOf(), y0)), ly = LOOK.yaw;
  await __drag(-900, 0, 24); await __go(2); const far = Math.abs(LOOK.yaw);
  const miss = [...'QZXJVKWYFBPGMHUDCLNRSTOIEA'].find(c => !STATE.word.includes(c) && !STATE.guessed.has(c)); guess(miss); await __go(70); const back = Math.abs(LOOK.yaw);
  await __go(1200, () => !STATE.locked);
  return __check('looking round in the hangman part', turned > 0.5 && far > 2.5 && back < 0.05, { turned: +turned.toFixed(2), lookYaw: +ly.toFixed(2), far: +far.toFixed(2), afterAGuess: +back.toFixed(3) }); })()""")
E("""(async () => { const live0 = gunPropLive(); const left = [...new Set(STATE.word)].filter(c => !STATE.guessed.has(c)); for (const c of left) { guess(c); await __go(1500, () => !STATE.locked || STATE.over); }
  await __go(1800, () => !$('sign').hidden); await __go(30); const p = GUNPROP.gun.getWorldPosition(V3()), q = p.clone().project(R.camera), off = !(Math.abs(q.x) < 1 && Math.abs(q.y) < 1 && q.z < 1);
  const c = R.camera.position, turn = __dy(Math.atan2(p.x - c.x, p.z - c.z), __yawOf());
  return __check('the revolver: off to the side, shining once the round is won', !live0 && STATE.lastWon && gunPropLive() && GUNPROP.glint.visible && off && Math.abs(turn) > 0.6, { liveBefore: live0, won: STATE.lastWon, glint: GUNPROP.glint.visible, offScreen: off, turn: +turn.toFixed(2) }); })()""")
E("""(async () => { const p = GUNPROP.gun.getWorldPosition(V3()), c = R.camera.position; LOOK.yaw += __dy(Math.atan2(p.x - c.x, p.z - c.z), __yawOf()); await __go(3);
  LOOK.pitch += Math.atan2(p.y - c.y, Math.hypot(p.x - c.x, p.z - c.z)) - Math.asin(V3(0, 0, -1).applyQuaternion(R.camera.quaternion).y); await __go(3); return 1; })()""")
shot("a_revolver")
E("""(async () => { const p = GUNPROP.gun.getWorldPosition(V3()).project(R.camera), r = $('scene').getBoundingClientRect(); __ptr('pointerdown', r.left + (p.x * 0.5 + 0.5) * r.width, r.top + (-p.y * 0.5 + 0.5) * r.height);
  await __go(300, () => SIEGE.phase === 'fight' && !SIEGE.run); __calm(); const S = SIEGE, cyl = document.querySelectorAll('#cyl circle[r="8.4"]').length;
  return __check('taken up: the shootout from the revolver', S.on && S.fromRevolver && S.phase === 'fight' && !GUNPROP.gun.visible && !MAN.root.visible && S.bullets === 8 && cyl === 8 && S.enemies.length >= 7, { on: S.on, from: S.fromRevolver, phase: S.phase, cover: S.cover, bullets: S.bullets, chambers: cyl, man: MAN.root.visible, enemies: S.enemies.length }); })()""")
# ---- the shootout ----
E("""(async () => { const S = SIEGE; SIEGE_CFG.hitUp = 0; SIEGE_CFG.hitRun = 0; S.holding = false; await __go(30, () => { __calm(); return false; }); const y0 = S.yaw;
  await __drag(-700, 0, 20); const crouchTurn = __dy(S.yaw, y0); S.holding = true; await __go(30, () => { __calm(); return false; });
  for (let i = 0; i < 6; i++) await __drag(-700, 0, 12); const total = S.yaw - y0;
  await __drag(0, -2000, 20); const up = S.pitch; await __drag(0, 4000, 30); const down = S.pitch; S.pitch = 0;
  return __check('the shootout: all the way round, boots to sky', Math.abs(crouchTurn) > 0.6 && Math.abs(total) > TAU && up > 1.4 && down < -1.4, { crouchTurn: +crouchTurn.toFixed(2), total: +total.toFixed(2), up: +up.toFixed(2), down: +down.toFixed(2) }); })()""")
E("""(async () => { const S = SIEGE, b0 = S.bullets; S.yaw = S.covers[S.cover].yaw0; S.pitch = 1.3; await __go(40, () => { __calm(); return false; }); for (let i = 0; i < b0; i++) { S.cool = 0; fireTap(); await __go(2); }
  const reloading = S.reloadT > 0, spent = S.bullets === 0; await __go(200, () => { __calm(); return S.reloadT <= 0; });
  return __check('eight in the gun, and the reload is eight', b0 === 8 && spent && reloading && S.bullets === 8 && S.reloads === 0 && /Eight in the gun/.test(SIEGE_TIP2), { first: b0, reloading, after: S.bullets, tip: SIEGE_TIP2 }); })()""")
# the laser, with rounds still in the revolver
E("""(async () => { const S = SIEGE, L = LASER, b = S.bullets; if (S.cover !== 1) { const C = S.covers[1]; S.run = { from: CAM.pos.clone(), to: C.stand.clone(), t: 0, dur: 0.6, to_i: 1 }; await __go(80, () => { __calm(); return !S.run; }); }
  S.holding = true; __aimPt(L.crate.position); await __go(30, () => { __calm(); __aimPt(L.crate.position); return false; });
  const p = L.crate.position.clone().project(R.camera), r = $('scene').getBoundingClientRect(); __ptr('pointerdown', r.left + (p.x * 0.5 + 0.5) * r.width, r.top + (-p.y * 0.5 + 0.5) * r.height); __ptr('pointerup', r.left + (p.x * 0.5 + 0.5) * r.width, r.top + (-p.y * 0.5 + 0.5) * r.height);
  await __go(50, () => { __calm(); return false; });
  return __check('the laser taken up with rounds in the revolver', L.state === 'held' && b > 0 && S.bullets === b, { state: L.state, revolver: b }); })()""")
E("""(async () => { const S = SIEGE, E = S.enemies.find(q => q.alive && !q.roof && inView(q, 1.2)) || S.enemies.find(q => q.alive && !q.roof); window.__E = E;
  const got = await __track(() => E.a.ch.bones.Spine2.getWorldPosition(V3()), (ro, rd) => { const h = rayActor(E.a, ro, rd, E.female), e = sceneryRay(ro, rd, 80); return h && (!e || h.t < e.distance); }, 160);
  laserTrigger(true); await __go(8); laserTrigger(false); const ash = !!E.ash && !E.alive, frozen = !!E.a.frozen; await __go(30); const midVis = E.a.root.visible;
  await __go(80); const gone = !E.a.root.visible, pile = ASH.piles[ASH.piles.length - 1], fl = floorAt(E.a.pos.x, E.a.pos.z);
  return __check('a man in the beam burns to ash', got && ash && frozen && midVis && gone && pile && Math.abs(pile.position.y - fl) < 0.06 && pile.scale.y > 0.9, { got, ash, frozen, gone, pile: !!pile, pileY: pile && +(pile.position.y - fl).toFixed(3), pileScale: pile && +pile.scale.y.toFixed(2) }); })()""")
E("""(async () => { const p = ASH.piles[ASH.piles.length - 1].position; window.__cam = { p: [p.x + 1.2, p.y + 1.0, p.z + 1.4], t: [p.x, p.y + 0.1, p.z], fov: 40 }; await __go(2); window.__cam = null; return 1; })()""")
shot("b_ash")
E("""(async () => { const c = CROWS.list.find(q => q.state !== 'dead' && q.state !== 'meat' && q.state !== 'away') || CROWS.list.find(q => q.state !== 'meat'), P = CROWS.perches.find(q => q.kind === 'beam');
  c.root.visible = true; crowSettle(c, { P, u: 0.5, p: P.a.clone().lerp(P.b, 0.5) }, 0); c.idle = 99; c.cawT = 99; await __go(2); const n0 = MEAT.list.length;
  await __track(() => c.body.getWorldPosition(V3()).add(V3(0, 0.05, 0)), (ro, rd) => { const h = crowRay(ro, rd); return h && h.c === c; }, 60); laserTrigger(true); await __go(4); laserTrigger(false); const M = MEAT.list[n0]; await __go(150);
  return __check('a crow comes out as a big drumstick', M && !M.steak && M.s >= c.s * 2.2 && M.rest, { s: M && +M.s.toFixed(2), crow: +c.s.toFixed(2), length: M && +(0.226 * M.s).toFixed(2) }); })()""")
# the town's horses
E("""(async () => { const n = HERD.list.length, grounded = HERD.list.every(H => H.dead || Math.abs(H.grp.position.y - groundVis(H.x, H.z)) < 0.05), grazers = HERD.list.filter(H => H.kind === 'graze'), heads = grazers.filter(H => H.neckA > 0.9).length;
  const W = HERD.list.find(H => H.kind === 'walk'); let moved = 0; if (W) { const p0 = W.grp.position.clone(); W.mood = 0; W.neckT = 0.1; W.walk = { to: W.path[(W.pi + 1) % W.path.length] }; await __go(240, () => { __calm(); return false; }); moved = p0.distanceTo(W.grp.position); }
  return __check('the town horses: standing, grazing, walking', n >= 4 && grounded && heads >= 1 && moved > 1, { n, grounded, grazers: grazers.length, headsDown: heads, walkerMoved: +moved.toFixed(2) }); })()""")
E("""(async () => { const S = SIEGE, L = LASER; L.state = 'crate'; L.lift = null; L.hold = false; L.hudKey = ''; gunHud.key = null; await __go(3); // (the laser back on its crate: the revolver for this)
  const H = HERD.list.find(q => q.kind === 'graze' && !q.dead); const got = await __track(() => H.grp.localToWorld(V3(0, 1.2, 0)), (ro, rd) => { const h = townHorseRay(ro, rd), e = sceneryRay(ro, rd, 80); return h && h.H === H && (!e || h.t < e.distance); }, 200);
  S.cool = 0; S.reloadT = 0; S.bullets = 8; fireTap(); await __go(3); const down = !!H.dead; await __go(110, () => { __calm(); return false; }); const c = H.grp.localToWorld(V3(0, 1.15, 0));
  window.__H = H; return __check('a town horse shot goes down', got && down && H.dead.landed && c.y - groundVis(c.x, c.z) < 0.6, { got, down, landed: H.dead && H.dead.landed, body: +(c.y - groundVis(c.x, c.z)).toFixed(2) }); })()""")
shot("c_horse_down")
# things that break
E("""(async () => { const S = SIEGE; laserTrigger(false); S.vm.gun.visible = true; const crates = BRK.list.filter(B => B.set.parent === S.props && B.kind === 'crate'), top = crates.find(B => crates.some(A => A.onTop.includes(B.id))), base = crates.find(B => B.onTop.includes(top.id));
  const bottle = TGT.items.find(T => T.kind === 'bottle' && Math.abs(T.mesh.position.y - top.box.max.y) < 0.15 && T.mesh.position.distanceTo(top.c) < 0.6);
  const hit = (ro, rd) => { const e = sceneryRay(ro, rd, 80); return e && brkFromHit(e) === base; };
  let shots = 0; while (base.alive && shots < 8) { const got = await __track(() => base.c, hit, 80); if (!got) break; S.cool = 0; S.reloadT = 0; S.bullets = 8; const hp = base.hp; fireTap(); shots++; await __go(2); }
  await __go(30, () => { __calm(); return false; });
  const [ro] = __ray(), rd = base.c.clone().sub(ro).normalize(), e = sceneryRay(ro, rd, 80), through = !e || brkFromHit(e) !== base;
  return __check('a crate in the gunmen\\'s cover breaks, and what was on it', !base.alive && shots === base.hp0 && !top.alive && (!bottle || bottle.state !== 'stand') && through, { shots, hp: base.hp0, broken: !base.alive, stackedBroken: !top.alive, bottle: bottle && bottle.state, through, pieces: TGT.debris.plankD.P.filter(D => D.on).length }); })()""")
shot("d_crate")
E("""(async () => { const S = SIEGE, L = LASER; L.state = 'crate'; laserTake(); await __go(45, () => { __calm(); return false; });
  const B = BRK.list.filter(q => q.alive && q.kind === 'barrel').sort((a, b) => a.c.distanceTo(R.camera.position) - b.c.distanceTo(R.camera.position)).find(q => { const ro = upEye(V3()), rd = q.c.clone().sub(ro).normalize(), e = sceneryRay(ro, rd, 80); return e && brkFromHit(e) === q; });
  if (!B) return __check('a barrel breaks in the beam', false, { none: true });
  const got = await __track(() => B.c, (ro, rd) => { const e = sceneryRay(ro, rd, 80); return e && brkFromHit(e) === B; }, 80); const t0 = S.t; laserTrigger(true); await __go(90, () => { __calm(); return !B.alive; }); const took = S.t - t0; laserTrigger(false); await __go(10);
  return __check('a barrel breaks in the beam', got && !B.alive && took < 1.2, { got, broken: !B.alive, seconds: +took.toFixed(2), kind: B.kind, d: +B.c.distanceTo(R.camera.position).toFixed(1) }); })()""")
E("""(async () => { newRound(); await __go(30); const H = __H;
  return __check('a new round puts it back', BRK.list.every(B => B.alive && B.hp === B.hp0) && !__E.ash && __E.a.root.visible && !ASH.piles.length && !H.dead && H.grp.visible && GUNPROP.gun.visible && !SIEGE.fromRevolver,
    { broken: BRK.list.filter(B => !B.alive).length, ashed: !!__E.ash, horse: !H.dead, gun: GUNPROP.gun.visible }); })()""")
E("""JSON.stringify({ errs: __errs })""")
json.dump(steps, open("test/s137.json", "w"), indent=0)
print(len(steps), "steps")
