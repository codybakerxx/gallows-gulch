# builds test/s148.json: the gunsmith's range (v54; v55: still targets, Reset, challenges against the clock, the laser).
#   - the door glimmers in a round (v56: the side door of the GUNS & AMMUNITION store; light round its edges, sparks along the frame,
#     the knob), not with a gun in hand
#   - a tap on it: out the back at his range (ten weapons to pick from, the bar along the top (v56: evenly spaced; the bench bare), the lanes cleared of scrub, the host's
#     bubble kept off the screen); a second tap while the view fades doesn't set the town running at six times speed (v55)
#   - practice: nothing moves; what's shot stays down (a bottle broken, a tin target flipped up, a cut-out flat) till Reset stands it all up
#   - each weapon on its targets (the Colt, the Derringer, the Winchester's head shot, the Sharps through its scope, the coach gun's pellets
#     a target once, the bow and the knives, the Gatling held, the dynamite); the laser: a cut-out burns away, a bottle melts, a tin target
#     goes red-hot and flips, and the hum stops when Fire's let go
#   - challenges: a count of three, then the clock; Bottles to the last one, the time and the best with that weapon kept on the device;
#     the bandits popping up and dropping back, the tin targets sliding, Everything with the jackrabbit running and the clays thrown; Stop
#   - Leave range with the laser in hand: the last of his guns you had instead (the Winchester); Holster: the round goes on and Draw is
#     there; Draw: the same load; the barrel's revolver its own, a full cylinder
#   - a townsman shot with it: the shootout with the Winchester; the laser taken from the crate leaves the Winchester there (v55), and a tap
#     gives it back; the spare rounds its own box; dynamite, the last gunman with it; the getaway is the revolver's, the Winchester still yours
# Prints one JSON line per check; "ok" is true when it passed.
import json, os, sys
pre = sys.argv[1] if len(sys.argv) > 1 else "g148"
HERE = os.path.dirname(os.path.abspath(__file__))
steps = []
E = lambda js: steps.append(["eval", js])
shot = lambda f: steps.append(["shot", f"test/{pre}_{f}.png"])
E("""window.__errs = []; window.addEventListener('error', e => __errs.push(String(e.message) + ' @' + (e.filename || '').split('/').pop() + ':' + (e.lineno || ''))); window.addEventListener('unhandledrejection', e => __errs.push('rej ' + String(e.reason && e.reason.stack || e.reason))); 1""")
steps.append(["wait", 2500])
E("""new Promise(res => { const to = setTimeout(() => res('no frame in 120 s'), 120000); requestAnimationFrame(() => requestAnimationFrame(() => { clearTimeout(to); res(1); })); })""")
steps.append(["wait", 600]); steps.append(["click", "#startBtn"]); steps.append(["wait", 1500])
E(open(os.path.join(HERE, "chase_helpers.js")).read())
E("""window.__check = (name, ok, info) => JSON.stringify({ check: name, ok: !!ok, info, errs: __errs.slice(0, 3) }); 1""")
E("""window.__sleep = ms => new Promise(r => setTimeout(r, ms));
  window.__tapAt = p => { const r = $('scene').getBoundingClientRect(), q = p.clone().project(R.camera); return { clientX: r.left + (q.x * 0.5 + 0.5) * r.width, clientY: r.top + (-q.y * 0.5 + 0.5) * r.height, cancelable: false }; };
  window.__aimA = p => { const A = ARMED, d = p.clone().sub(A.eye); A.yaw = Math.atan2(d.x, d.z); A.pitch = Math.atan2(d.y, Math.hypot(d.x, d.z)); };
  window.__tg = k => RANGE.tg.filter(g => g.kind === k);
  window.__pick = async id => { rangePick(id); await __go(30); ARMED.cool = 0; };
  window.__fire = async (aim, wait = 4) => { for (let i = 0; i < 3; i++) { CAM.shake = 0; SIEGE.recoil = 0; if (aim) __aimA(aim()); await __go(1); } ARMED.cool = 0; const n0 = RANGE.tg.filter(g => g.done).length, b0 = ARMED.bullets; armedFire(); await __go(wait);
    return { d: RANGE.tg.filter(g => g.done).length - n0, spent: b0 - ARMED.bullets }; };
  window.__beam = async (aim, frames) => { for (let i = 0; i < 2; i++) { CAM.shake = 0; __aimA(aim()); await __go(1); } armedFire(); for (let i = 0; i < frames; i++) { CAM.shake = 0; __aimA(aim()); await __go(1); } const on = ARMS.beam && LASER.beam.visible; armsTrigger(false); await __go(2); return on; };
  window.__still = async (n, rot = true) => { const p0 = RANGE.tg.map(g => [g.m.position.clone(), g.m.rotation.x, g.m.visible]); await __go(n); /* (rot false: a struck gong or target still swinging on its hanger doesn't count) */
    return RANGE.tg.reduce((m, g, i) => Math.max(m, g.m.position.distanceTo(p0[i][0]) + (rot ? Math.abs(g.m.rotation.x - p0[i][1]) : 0) + (g.m.visible !== p0[i][2] ? 1 : 0)), 0); }; 1""")
# ---- the door
E("""(async () => { await __go(200, () => !STATE.locked); STATE.hintShown = true; await __go(90); const D = RANGE.door, sp = RANGE.doorSparks.filter(p => p.s.visible).length;
  const near = D.c.distanceTo(new THREE.Vector3(D.B.x, D.B.y0 + 1.35, D.B.z)), edge = RANGE.doorEdge.visible, glow = RANGE.doorGlow.visible && RANGE.doorHalo.visible;
  armedStart(); await __go(60, () => !ARMED.lift); const offArmed = !doorLive() && !RANGE.doorEdge.visible; armedPutBack(); await __go(80, () => !ARMED.on);
  return __check("the door in the GUNS & AMMUNITION store's side wall glimmers in a round; not with a gun in hand", doorLive() && sp >= 1 && edge && glow && offArmed && near < D.B.d / 2 + 0.6, { sp, edge, glow, offArmed, near: +near.toFixed(2) }); })()""")
E("""(async () => { const D = RANGE.door; const at = D.c.clone().addScaledVector(D.out, 9).add(new THREE.Vector3(0, 0.3, 0)), fn = () => { CAM.pos.copy(at); CAM.tgt.copy(D.c); CAM.fov = 50; CAM.name = 'look'; CAM.to = null; CAM.follow = null; };
  for (let i = 0; i < 4; i++) { fn(); await __go(1, () => { fn(); return false; }); } const miss = doorTap(Object.assign(__tapAt(D.c), { clientX: __tapAt(D.c).clientX + 160 })); const ok = doorTap(__tapAt(D.c));
  const r = $('scene').getBoundingClientRect(), ev = { clientX: r.left + 150, clientY: r.top + 250, pointerId: 9, button: 0, cancelable: false, type: 'pointerdown', preventDefault() {} }; lookDown(ev, 'town'); lookUp(Object.assign({}, ev, { type: 'pointerup' })); const tsTap = STATE.ts; /* (a second tap while it fades) */
  await __sleep(1000); await __go(60); const tiles = document.querySelectorAll('#rangePick .rpw').length, scrub = (RANGE.cleared || []).reduce((n, [o, l]) => n + l.length, 0);
  const bb = [...$('rangeBar').children].map(b => b.getBoundingClientRect()), gaps = bb.slice(1).map((b, i) => Math.round(b.left - bb[i].right)), even = bb.length === 4 && Math.max(...gaps) - Math.min(...gaps) <= 1 && bb.every(b => b.width > 30); /* (v56: the four spread evenly) */
  let benchGun = 0; RANGE.grp.traverse(o => { if (o.isMesh && LASER.geo && o.geometry === LASER.geo) benchGun++; }); /* (v56: nothing lying on the bench) */
  return __check("a tap on it: out the back at his range, ten weapons to pick from, the four buttons along the top evenly spaced, the bench bare; a second tap as it fades doesn't speed the town up", !miss && ok && RANGE.on && ARMED.on && ARMED.range && RANGE.grp.visible && __vis('rangePick') && tiles === 10 && __vis('rangeBar') && even && benchGun === 0 && !__vis('armBack') && __vis('pad') && STATE.locked && $('bubble').hidden && tsTap === 1 && STATE.ts === 1,
    { miss, ok, tiles, gaps, benchGun, scrub, tsTap, ts: STATE.ts, cur: ARMS.cur }); })()""")
steps.append(["wait", 600]); shot("a_picker")
E("""(async () => { await __pick('colt'); const moved = await __still(180), n = RANGE.tg.length;
  return __check('practice: nothing downrange moves; all 22 standing', moved < 1e-4 && n === 22 && /0 of 22/.test($('meta').textContent) && RANGE.tg.every(g => !g.done && g.m.visible) && !__vis('rangePick'), { moved, n, meta: $('meta').textContent }); })()""")
# ---- the weapons
E("""(async () => { const res = {}; rangeReset(); await __go(5);
  await __pick('colt'); res.colt = await __fire(() => __tg('bottle')[0].m.getWorldPosition(V3()).add(V3(0, 0.1, 0)));
  const ds = ARMS_DEF.derringer.spread; ARMS_DEF.derringer.spread = 0; await __pick('derringer'); res.derringer = await __fire(() => __tg('bottle')[1].m.getWorldPosition(V3()).add(V3(0, 0.1, 0))); ARMS_DEF.derringer.spread = ds; /* (its spread is wide for a bottle: aimed true here) */
  await __pick('winchester'); const b = __tg('bandit')[1]; b.m.updateMatrixWorld(true); res.winchester = await __fire(() => b.m.localToWorld(V3(0, 1.08, 0)), 30); res.head = $('rangePop').textContent; res.band = b.st;
  await __pick('sharps'); armsScope(true); await __go(3); const fz = CAM.fov, scope = __vis('scope') && __vis('scopeBtn'); res.sharps = await __fire(() => __tg('gong')[0].disc.getWorldPosition(V3())); armsScope(false); await __go(2); res.scope = { fz: +fz.toFixed(1), scope, back: +CAM.fov.toFixed(1) };
  await __pick('shotgun'); const sp = ARMS_DEF.shotgun.spread; ARMS_DEF.shotgun.spread = 0; const pl = __tg('plate')[0]; res.shotgun = await __fire(() => pl.plate.getWorldPosition(V3()), 30); ARMS_DEF.shotgun.spread = sp; res.plate = { st: pl.st, fl: +pl.fl.toFixed(2) };
  const stay = await __still(240, false); res.stay = +stay.toFixed(4); res.down = { b0: __tg('bottle')[0].st, band: b.st, plate: pl.st };
  const ok = res.colt.d === 1 && res.derringer.d === 1 && res.winchester.d === 1 && /Head shot/.test(res.head) && res.band === 'dead' && res.sharps.d === 1 && res.scope.fz < 20 && res.scope.scope && res.scope.back > 50 && res.shotgun.d === 1 && res.shotgun.spent === 1
    && res.plate.st === 'flip' && res.plate.fl === 1 && stay < 1e-4 && res.down.b0 === 'broke' && res.down.band === 'dead' && /5 of 22/.test($('meta').textContent);
  return __check("the guns: the Colt, the Derringer, a head shot with the Winchester (he falls flat), the Sharps through its scope, the coach gun's pellets a target once (it flips up); all of it stays down", ok, Object.assign(res, { meta: $('meta').textContent })); })()""")
shot("b_down")
E("""(async () => { const res = {};
  await __pick('bow'); res.bow = await __fire(() => __tg('bottle')[2].m.getWorldPosition(V3()).add(V3(0, 0.12, 0)), 40); res.bowStuck = ARMS.stuck.length;
  await __pick('knives'); res.knives = await __fire(() => __tg('bottle')[3].m.getWorldPosition(V3()).add(V3(0, 0.12, 0)), 40);
  await __pick('gatling'); const g0 = ARMED.bullets, n0 = RANGE.tg.filter(g => g.done).length; const bs = __tg('bandit').slice(2, 4); bs[0].m.updateMatrixWorld(true); __aimA(bs[0].m.localToWorld(V3(0, 0.5, 0))); CAM.shake = 0; await __go(2);
  armedFire(); await __go(40, () => { CAM.shake = 0; return false; }); armsTrigger(false); await __go(20); res.gatling = { fired: g0 - ARMED.bullets, d: RANGE.tg.filter(g => g.done).length - n0, spin: +ARMS.spin.toFixed(1) };
  await __pick('dynamite'); const n1 = RANGE.tg.filter(g => g.done).length; const p = rangePt(0.4, 7.5, 0); __aimA(p); await __go(2); __aimA(p); await __go(1); ARMED.cool = 0; armedFire(); await __go(200, () => !ARMS.proj.length);
  res.dynamite = { d: RANGE.tg.filter(g => g.done).length - n1, bottles: __tg('bottle').filter(g => g.st === 'broke').length };
  const ok = res.bow.d >= 1 && res.knives.d >= 1 && res.gatling.fired >= 4 && res.gatling.d >= 1 && res.dynamite.d >= 1 && res.dynamite.bottles === 6;
  return __check('the bow and the knives at what is under the sight, the Gatling while Fire is held, the dynamite', ok, res); })()""")
shot("c_after_blast")
E("""(async () => { rangeReset(); await __go(60); const up = RANGE.tg.every(g => !g.done && g.m.visible && (g.kind !== 'bandit' || (g.st === 'up' && g.ang === 0)) && (g.kind !== 'plate' || (g.st === 'up' && g.fl === 0))), stuck = ARMS.stuck.length;
  return __check('Reset: every one of them standing again', up && /0 of 22/.test($('meta').textContent) && stuck === 0, { up, stuck, meta: $('meta').textContent, sts: RANGE.tg.map(g => g.st).join(',') }); })()""")
# ---- the laser
E("""(async () => { await __pick('laser'); const res = { tile: document.querySelector('#rangePick .rpw.beam') !== null, hud: $('cyl').innerHTML.includes(ARMS_GLYPH.laser) };
  const b = __tg('bandit')[0]; b.m.updateMatrixWorld(true); res.beam = await __beam(() => b.m.localToWorld(V3(0.05, 0.6, 0)), 25); res.st0 = b.st; res.flames = fireLive(); await __go(40); res.uBurn = +b.U.uBurn.value.toFixed(2); await __go(150); res.st1 = b.st; res.vis = b.m.visible;
  const bt = __tg('bottle')[4]; await __beam(() => bt.m.getWorldPosition(V3()).add(V3(0, 0.1, 0)), 20); await __go(90); res.bottle = { st: bt.st, sy: +bt.m.scale.y.toFixed(2) };
  const pl = __tg('plate')[2]; await __beam(() => pl.plate.getWorldPosition(V3()), 20); await __go(10); res.plate = { st: pl.st, heat: +pl.U.uHeat.value.toFixed(2) };
  await __go(5); res.hum = ARMS.beam; res.beamAfter = LASER.beam.visible;
  const ok = res.tile && res.hud && res.beam && res.st0 === 'burn' && res.flames > 5 && res.uBurn > 0.2 && res.st1 === 'gone' && !res.vis && res.bottle.st === 'melt' && res.bottle.sy < 0.5 && res.plate.st === 'flip' && res.plate.heat > 0.6 && !res.hum && !res.beamAfter;
  return __check('the laser: a cut-out burns away where the beam caught it, a bottle melts, a tin target goes red-hot and flips; the hum stops with Fire', ok, res); })()""")
shot("d_laser")
# ---- challenges
E("""(async () => { await __pick('colt'); rangeModes(true); await __go(2); const rows = document.querySelectorAll('#rangeModes .rpm').length, none = /No time with the Colt/.test($('rangeModesList').textContent);
  rangeModeStart('bottles'); await __go(10); const ready = !RANGE.run.go && /3/.test($('rangePop').textContent), blocked = (armedFire(), ARMED.bullets === 6); await __go(200, () => RANGE.run && RANGE.run.go);
  const others = RANGE.tg.filter(g => g.kind !== 'bottle').every(g => !g.m.visible); let shots = 0;
  for (const bt of __tg('bottle')) { if (!RANGE.run) break; await __fire(() => bt.m.getWorldPosition(V3()).add(V3(0, 0.1, 0)), 2); shots++; if (ARMED.bullets <= 0) await __go(120, () => ARMED.reloadT <= 0); }
  await __go(3); let saved = null; try { saved = JSON.parse(localStorage.getItem('gg_range_times') || '{}')['bottles:colt']; } catch (e) {}
  const t = RANGE.best['bottles:colt'];
  return __check('a challenge: the count of three (no shooting in it), then the clock till the last bottle; the time and the best with the Colt kept on the device', rows === 4 && none && ready && blocked && others && __vis('rangeRes') && t > 0.5 && saved === t && $('rangeResTime').textContent === rangeTime(t, 2) && /6 down with/.test($('rangeResShots').textContent) && /first time with the Colt/.test($('rangeResLine').textContent),
    { rows, none, ready, blocked, others, t, saved, time: $('rangeResTime').textContent, shots: $('rangeResShots').textContent, line: $('rangeResLine').textContent }); })()""")
shot("e_result")
E("""(async () => { $('rangeAgain').click(); await __go(200, () => RANGE.run && RANGE.run.go); const res = { mode: RANGE.run.id }; $('rangeModesBtn').click(); await __go(3); res.stopped = !RANGE.run && /0 of 22/.test($('meta').textContent);
  rangeModeStart('bandits'); await __go(200, () => RANGE.run && RANGE.run.go); const seen = new Set(); await __go(300, () => { for (const b of __tg('bandit')) if (b.st === 'up') seen.add(b.i); return false; }); res.popped = seen.size; res.down = __tg('bandit').filter(b => b.st === 'down').length;
  for (let k = 0; k < 6 && RANGE.run; k++) { const b = __tg('bandit').find(q => !q.done); b.st = 'up'; b.ang = 0; b.t = 99; b.m.rotation.x = 0; b.m.updateMatrixWorld(true); await __fire(() => b.m.localToWorld(V3(0, 0.5, 0)), 2); ARMED.reloadT = 0; ARMED.bullets = 6; }
  await __go(3); res.done = __vis('rangeRes') && $('rangeResTitle').textContent === 'Bandits'; $('rangeResClose').click(); await __go(3);
  rangeModeStart('plates'); await __go(200, () => RANGE.run && RANGE.run.go); const p0 = __tg('plate')[0].m.position.clone(); await __go(40); res.slid = +__tg('plate')[0].m.position.distanceTo(p0).toFixed(2); rangeModeStop();
  rangeModeStart('all'); await __go(200, () => RANGE.run && RANGE.run.go); let ran = 0, fly = 0; await __go(300, () => { if (__tg('rabbit')[0].st === 'run') ran = 1; if (__tg('clay').some(c => c.st === 'fly')) fly = 1; return false; }); res.all = { ran, fly, n: RANGE.tg.filter(g => !g.out).length }; rangeModeStop(); await __go(3);
  const ok = res.mode === 'bottles' && res.stopped && res.popped >= 3 && res.done && res.slid > 0.2 && ran && fly && res.all.n === 22 && !RANGE.run;
  return __check('the bandits pop up and drop back till each is shot; the tin targets slide; Everything has the rabbit running and the clays thrown; Stop', ok, res); })()""")
shot("f_practice_again")
# ---- leaving with it
E("""(async () => { await __pick('winchester'); await __pick('laser'); rangeLeave(); await __sleep(1000); await __go(20); const A = ARMED, scrub = RANGE.cleared;
  const ok = !RANGE.on && !RANGE.grp.visible && A.on && !A.range && ARMS.cur === 'winchester' && ARMS.own === 'winchester' && A.bullets === 14 && A.reloads === 1 && __vis('armBack') && $('armBack').textContent === 'Holster' && !__vis('rangeBar') && !__vis('rangePick') && !scrub && A.eye.distanceTo(armedEye(V3())) < 0.01 && /laser stays/.test($('siegeTip').textContent) && !ARMS.beam && STATE.ts === 1;
  return __check('Leave range with the laser in hand: back at the barrel with the Winchester (the laser stays with the gunsmith), the range and the scrub as they were', ok, { cur: ARMS.cur, own: ARMS.own, bullets: A.bullets, reloads: A.reloads, back: $('armBack').textContent, tip: $('siegeTip').textContent, scrub: !!scrub }); })()""")
shot("g_back_in_town")
E("""(async () => { const A = ARMED; A.pitch = 0.8; await __go(3); A.cool = 0; armedFire(); await __go(20); const left = A.bullets; $('armBack').click(); await __go(80, () => !A.on);
  const n = STATE.guessed.size, c = [...'ETAOINSHRDLU'].find(q => !STATE.guessed.has(q)); guess(c); const g = STATE.guessed.size === n + 1; await __go(1500, () => !STATE.locked || STATE.over); await __go(5);
  return __check('Holster: the round goes on, and Draw is there', !A.on && !ARMS.cur && ARMS.own === 'winchester' && !SIEGE.vm.gun.visible && g && __vis('drawBtn') && /Winchester/.test($('drawBtn').textContent) && left === 13, { left, guessed: g, draw: $('drawBtn').textContent }); })()""")
shot("h_holstered")
E("""(async () => { $('drawBtn').click(); await __go(60, () => !ARMED.lift); const A = ARMED, w = { cur: ARMS.cur, b: A.bullets, label: $('armBack').textContent }; $('armBack').click(); await __go(80, () => !A.on);
  armedStart(); await __go(60, () => !A.lift); const rev = { cur: ARMS.cur, b: A.bullets, label: $('armBack').textContent }; armedPutBack(); await __go(80, () => !A.on); await __go(3);
  return __check("Draw: the same load in hand; the barrel's revolver still its own, a full cylinder", w.cur === 'winchester' && w.b === 13 && w.label === 'Holster' && rev.cur === null && rev.b === SIEGE_ROUNDS && rev.label === 'Put it back' && __vis('drawBtn'), { w, rev }); })()""")
# ---- the shootout with it
E("""(async () => { await __go(200, () => drawLive()); armsDraw(); await __go(60, () => !ARMED.lift); const b0 = ARMED.bullets, pick = await __armShoot(); await __go(5); const S = SIEGE;
  return __check('a townsman shot with it: the shootout, fought with the Winchester', pick && S.on && S.phase === 'fight' && ARMS.cur === 'winchester' && ARMS.mode === 'siege' && S.bullets === b0 - 1 && S.reloads === 1 && /Winchester/.test(SIEGE_TIP2 || '') && $('cyl').innerHTML.includes(ARMS_GLYPH.winchester),
    { pick: !!pick, on: S.on, cur: ARMS.cur, b0, bullets: S.bullets, tip: SIEGE_TIP2 }); })()""")
E("""(async () => { await __go(400, () => !SIEGE.run); __calm(); const S = SIEGE, r0 = S.reloads; ammoTake(); await __go(3, () => { __calm(); return false; }); const msg = $('hitMsg').textContent;
  return __check("the spare rounds give the Winchester's own box", S.reloads === r0 + 1 && /[+]14 rounds/.test(msg), { r0, r1: S.reloads, msg }); })()""")
E("""(async () => { const S = SIEGE, L = LASER; laserTake(); await __go(40, () => { __calm(); return L.state === 'held'; }); const on = { shows: L.revShows, kid: L.rev.children[0] === ARMS.crate.winchester, vis: L.rev.visible };
  revTake(); await __go(40, () => { __calm(); return !S.vm.lift; }); const back = { cur: ARMS.cur, kid: S.vm.gun.children[0] === ARMS.models.winchester, laser: L.state, tip: $('siegeTip').textContent };
  return __check('the laser taken from the crate leaves the Winchester there, and a tap gives it back', on.shows === 'winchester' && on.kid && on.vis && back.cur === 'winchester' && back.kid && back.laser === 'crate' && /Winchester again/.test(back.tip), { on, back }); })()""")
shot("i_siege_winchester")
E("""(async () => { const S = SIEGE, E = S.enemies.find(q => q.alive && !q.roof), at = E.a.ch.bones.Spine2.getWorldPosition(V3()); armsBlast('siege', at.clone().add(V3(0.5, -0.8, 0)), 3.8); await __go(3, () => { __calm(); return false; });
  const r = await __lastOne(5, 0); await __go(400, () => S.phase === 'won' || !S.on);
  return __check('dynamite in the shootout takes a gunman; the last one shot with the Winchester, and the town is won', !E.alive && r.would && r.killed && (S.phase === 'cleared' || S.phase === 'won' || !S.on), { blast: !E.alive, r, phase: S.phase }); })()""")
E("""(async () => { startGetaway(); await __go(400, () => CHASE.state === 'ride'); const g = { cur: ARMS.cur, own: ARMS.own, kids: SIEGE.vm.gun.children.length };
  return __check("the getaway is the revolver's; the Winchester's still yours", g.cur === null && g.own === 'winchester' && g.kids === ARMS.revKids.length, g); })()""")
E("""JSON.stringify({ errs: __errs })""")
json.dump(steps, open("test/s148.json", "w"), indent=0)
