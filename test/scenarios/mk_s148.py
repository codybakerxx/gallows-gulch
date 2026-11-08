# builds test/s148.json: v54, the gunsmith's range.
#   - the gunsmith's door glimmers in a round (light round its edges, sparks along the frame, the knob), not with a gun in hand
#   - a tap on it: out the back at his range (the picker of nine weapons up, the bar along the top, the lanes cleared of scrub, the
#     host's bubble kept off the screen); everything downrange moves (the plates slide, the rabbit runs, a clay is thrown)
#   - each of the nine fires and scores on its own target (the Colt, the Derringer, the Winchester's head shot, the Sharps through its scope,
#     the coach gun's pellets each target once a shot, the bow and the knives thrown at what's under the sight, the Gatling while Fire's
#     held, the dynamite's blast)
#   - a timed round: a minute, then the score and the best with that weapon, kept on the device
#   - Leave range: back at the barrel in the round, the weapon in hand (Holster), the range and its UI gone, the scrub back; Holster: the
#     round goes on and Draw is there; Draw: the same load in hand; the barrel's revolver still its own, with a full cylinder
#   - a townsman shot with it: the shootout, fought with it (its own count and sign); the spare rounds give its own box; the last gunman
#     shot with it; the getaway is the revolver's again, and the weapon is still yours for the next round
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
  window.__fresh = () => { for (const g of RANGE.tg) { if (g.kind === 'bottle') { g.down = 0; g.m.visible = true; } if (g.kind === 'bandit') { g.st = 'down'; g.t = 99; g.ang = RANGE_DOWN; } if (g.kind === 'plate') g.swing = g.sv = 0; } };
  window.__pick = async id => { rangePick(id); await __go(30); ARMED.cool = 0; };
  window.__fire = async (aim, wait = 4) => { for (let i = 0; i < 2; i++) { if (aim) __aimA(aim()); await __go(1); } ARMED.cool = 0; const s0 = RANGE.score, b0 = ARMED.bullets; armedFire(); await __go(wait); return { d: RANGE.score - s0, spent: b0 - ARMED.bullets }; }; 1""")
# ---- the door
E("""(async () => { await __go(200, () => !STATE.locked); STATE.hintShown = true; await __go(90); const D = RANGE.door, sp = RANGE.doorSparks.filter(p => p.s.visible).length;
  const near = D.c.distanceTo(new THREE.Vector3(D.B.x, D.B.y0 + 1.35, D.B.z)), edge = RANGE.doorEdge.visible, glow = RANGE.doorGlow.visible && RANGE.doorHalo.visible;
  armedStart(); await __go(60, () => !ARMED.lift); const offArmed = !doorLive() && !RANGE.doorEdge.visible; armedPutBack(); await __go(80, () => !ARMED.on);
  return __check("the gunsmith's door glimmers in a round; not with a gun in hand", doorLive() && sp >= 1 && edge && glow && offArmed && near < D.B.d / 2 + 0.6, { sp, edge, glow, offArmed, near: +near.toFixed(2) }); })()""")
E("""(async () => { const D = RANGE.door, keep = { p: CAM.pos.clone(), t: CAM.tgt.clone(), f: CAM.fov, n: CAM.name }; const at = D.c.clone().addScaledVector(D.out, 9).add(new THREE.Vector3(0, 0.3, 0)), fn = () => { CAM.pos.copy(at); CAM.tgt.copy(D.c); CAM.fov = 50; CAM.name = 'look'; CAM.to = null; CAM.follow = null; };
  for (let i = 0; i < 4; i++) { fn(); await __go(1, () => { fn(); return false; }); } const miss = doorTap(Object.assign(__tapAt(D.c), { clientX: __tapAt(D.c).clientX + 160 })); const ok = doorTap(__tapAt(D.c)); await __sleep(1000); await __go(5);
  const tiles = document.querySelectorAll('#rangePick .rpw').length, scrub = (RANGE.cleared || []).reduce((n, [o, l]) => n + l.length, 0);
  return __check("a tap on it: out the back at his range, the nine weapons to pick from", !miss && ok && RANGE.on && ARMED.on && ARMED.range && RANGE.grp.visible && __vis('rangePick') && tiles === 9 && __vis('rangeBar') && !__vis('armBack') && __vis('pad') && STATE.locked && $('bubble').hidden,
    { miss, ok, tiles, scrub, cur: ARMS.cur, cam: CAM.name, eye: ARMED.eye.distanceTo(RANGE.o).toFixed(2) }); })()""")
steps.append(["wait", 600]); shot("a_picker")
E("""(async () => { await __pick('colt'); const pl = __tg('plate')[0], p0 = pl.m.position.clone(), rb = __tg('rabbit')[0]; let ran = 0, clay = 0; RANGE.clayT = 0.5;
  await __go(240, () => { if (rb.st === 'run') ran = Math.max(ran, Math.abs(rb.u + 7.2) > 0.5 ? 1 : 0); if (__tg('clay').some(c => c.live)) clay = 1; return false; }); const moved = pl.m.position.distanceTo(p0);
  return __check('everything downrange moves: the plates slide, the rabbit runs, a clay flies', moved > 0.3 && ran && clay && !__vis('rangePick'), { moved: +moved.toFixed(2), ran, clay }); })()""")
# ---- the nine
E("""(async () => { const res = {}; __fresh();
  await __pick('colt'); res.colt = await __fire(() => __tg('bottle')[0].m.getWorldPosition(V3()).add(V3(0, 0.1, 0)));
  const ds = ARMS_DEF.derringer.spread; ARMS_DEF.derringer.spread = 0; await __pick('derringer'); res.derringer = await __fire(() => __tg('bottle')[1].m.getWorldPosition(V3()).add(V3(0, 0.1, 0))); ARMS_DEF.derringer.spread = ds; /* (its spread is wide for a bottle: aimed true here) */
  await __pick('winchester'); const b = __tg('bandit')[1]; b.st = 'up'; b.t = 99; b.ang = 0; await __go(2); b.m.updateMatrixWorld(true); res.winchester = await __fire(() => b.m.localToWorld(V3(0, 1.08, 0))); res.head = $('rangePop').textContent;
  await __pick('sharps'); armsScope(true); await __go(3); const fz = CAM.fov, scope = __vis('scope') && __vis('scopeBtn'); res.sharps = await __fire(() => __tg('gong')[0].disc.getWorldPosition(V3())); armsScope(false); await __go(2); res.scope = { fz: +fz.toFixed(1), scope, back: +CAM.fov.toFixed(1) };
  await __pick('shotgun'); const sp = ARMS_DEF.shotgun.spread; ARMS_DEF.shotgun.spread = 0; const pl = __tg('plate')[0]; pl.swing = pl.sv = 0; res.shotgun = await __fire(() => pl.plate.getWorldPosition(V3()), 2); ARMS_DEF.shotgun.spread = sp;
  const ok = res.colt.d === 1 && res.derringer.d === 1 && res.winchester.d === 5 && /Head shot/.test(res.head) && res.sharps.d === 2 && res.scope.fz < 20 && res.scope.scope && res.scope.back > 50 && res.shotgun.d === 2 && res.shotgun.spent === 1;
  return __check("the guns: the Colt, the Derringer, a head shot with the Winchester, the Sharps through its scope, the coach gun's nine pellets scoring a target once", ok, res); })()""")
shot("b_sharps")
E("""(async () => { const res = {}; __fresh();
  await __pick('bow'); res.bow = await __fire(() => __tg('bottle')[2].m.getWorldPosition(V3()).add(V3(0, 0.12, 0)), 40); res.bowStuck = ARMS.stuck.length;
  await __pick('knives'); res.knives = await __fire(() => __tg('bottle')[3].m.getWorldPosition(V3()).add(V3(0, 0.12, 0)), 40);
  await __pick('gatling'); const b = __tg('bandit')[2]; b.st = 'up'; b.t = 99; b.ang = 0; await __go(2); b.m.updateMatrixWorld(true); const c = b.m.localToWorld(V3(0, 0.5, 0)); __aimA(c); await __go(2);
  const g0 = ARMED.bullets, s0 = RANGE.score; armedFire(); await __go(40, () => { b.st = b.st === 'hit' ? 'up' : b.st; b.ang = 0; return false; }); armsTrigger(false); await __go(20); res.gatling = { fired: g0 - ARMED.bullets, d: RANGE.score - s0, spin: +ARMS.spin.toFixed(1) };
  __fresh(); await __pick('dynamite'); const s1 = RANGE.score; const p = rangePt(0.4, 7.5, 0); __aimA(p); await __go(2); __aimA(p); await __go(1); ARMED.cool = 0; armedFire(); await __go(200, () => !ARMS.proj.length); res.dynamite = { d: RANGE.score - s1, down: __tg('bottle').filter(g => g.down > 0).length };
  const ok = res.bow.d >= 1 && res.knives.d >= 1 && res.gatling.fired >= 4 && res.gatling.d >= 6 && res.dynamite.d >= 3 && res.dynamite.down >= 3;
  return __check('the bow and the knives thrown at what is under the sight, the Gatling while Fire is held, the dynamite blast', ok, res); })()""")
shot("c_after_blast")
# ---- the timed round
E("""(async () => { await __pick('colt'); rangeRoundStart(); const on = !!RANGE.round && /0:60|0:59/.test($('meta').textContent); RANGE.score = 0; await __go(30); RANGE.score = 11; await __go(3700, () => !RANGE.round);
  let saved = null; try { saved = JSON.parse(localStorage.getItem('gg_range_best') || '{}').colt; } catch (e) {}
  return __check('a timed round: a minute, then the score and the best with that weapon, kept on the device', on && __vis('rangeRes') && $('rangeResScore').textContent === '11' && RANGE.best.colt === 11 && saved === 11 && $('rangeRound').textContent === 'Timed round',
    { on, res: __vis('rangeRes'), score: $('rangeResScore').textContent, line: $('rangeResLine').textContent, saved }); })()""")
shot("d_result")
# ---- leaving with it
E("""(async () => { $('rangeResClose').click(); await __pick('winchester'); rangeLeave(); await __sleep(1000); await __go(20); const A = ARMED, scrub = RANGE.cleared;
  const ok = !RANGE.on && !RANGE.grp.visible && A.on && !A.range && ARMS.cur === 'winchester' && ARMS.own === 'winchester' && A.bullets === 14 && A.reloads === 1 && __vis('armBack') && $('armBack').textContent === 'Holster' && !__vis('rangeBar') && !__vis('rangePick') && !scrub && A.eye.distanceTo(armedEye(V3())) < 0.01;
  return __check('Leave range: back at the barrel in the round, the Winchester in hand, the range and the scrub as they were', ok, { cur: ARMS.cur, own: ARMS.own, bullets: A.bullets, reloads: A.reloads, back: $('armBack').textContent, scrub: !!scrub }); })()""")
shot("e_back_in_town")
E("""(async () => { const A = ARMED; A.pitch = 0.8; await __go(3); A.cool = 0; armedFire(); await __go(20); const left = A.bullets; $('armBack').click(); await __go(80, () => !A.on);
  const n = STATE.guessed.size, c = [...'ETAOINSHRDLU'].find(q => !STATE.guessed.has(q)); guess(c); const g = STATE.guessed.size === n + 1; await __go(1500, () => !STATE.locked || STATE.over); await __go(5);
  return __check('Holster: the round goes on, and Draw is there', !A.on && !ARMS.cur && ARMS.own === 'winchester' && !SIEGE.vm.gun.visible && g && __vis('drawBtn') && /Winchester/.test($('drawBtn').textContent) && left === 13, { left, guessed: g, draw: $('drawBtn').textContent }); })()""")
shot("f_holstered")
E("""(async () => { $('drawBtn').click(); await __go(60, () => !ARMED.lift); const A = ARMED, w = { cur: ARMS.cur, b: A.bullets, label: $('armBack').textContent }; $('armBack').click(); await __go(80, () => !A.on);
  armedStart(); await __go(60, () => !A.lift); const rev = { cur: ARMS.cur, b: A.bullets, label: $('armBack').textContent }; armedPutBack(); await __go(80, () => !A.on); await __go(3);
  return __check("Draw: the same load in hand; the barrel's revolver still its own, a full cylinder", w.cur === 'winchester' && w.b === 13 && w.label === 'Holster' && rev.cur === null && rev.b === SIEGE_ROUNDS && rev.label === 'Put it back' && __vis('drawBtn'), { w, rev }); })()""")
# ---- the shootout with it
E("""(async () => { await __go(200, () => drawLive()); armsDraw(); await __go(60, () => !ARMED.lift); const b0 = ARMED.bullets, pick = await __armShoot(); await __go(5); const S = SIEGE;
  return __check('a townsman shot with it: the shootout, fought with the Winchester', pick && S.on && S.phase === 'fight' && ARMS.cur === 'winchester' && ARMS.mode === 'siege' && S.bullets === b0 - 1 && S.reloads === 1 && /Winchester/.test(SIEGE_TIP2 || '') && $('cyl').innerHTML.includes(ARMS_GLYPH.winchester),
    { pick: !!pick, on: S.on, cur: ARMS.cur, b0, bullets: S.bullets, tip: SIEGE_TIP2 }); })()""")
E("""(async () => { await __go(400, () => !SIEGE.run); __calm(); const S = SIEGE, r0 = S.reloads; ammoTake(); await __go(3, () => { __calm(); return false; }); const msg = $('hitMsg').textContent;
  return __check("the spare rounds give the Winchester's own box", S.reloads === r0 + 1 && /[+]14 rounds/.test(msg), { r0, r1: S.reloads, msg }); })()""")
shot("g_siege_winchester")
E("""(async () => { const S = SIEGE, E = S.enemies.find(q => q.alive && !q.roof), at = E.a.ch.bones.Spine2.getWorldPosition(V3()); armsBlast('siege', at.clone().add(V3(0.5, -0.8, 0)), 3.8); await __go(3, () => { __calm(); return false; });
  const r = await __lastOne(5, 0); await __go(400, () => S.phase === 'won' || !S.on);
  return __check('dynamite in the shootout takes a gunman; the last one shot with the Winchester, and the town is won', !E.alive && r.would && r.killed && (S.phase === 'cleared' || S.phase === 'won' || !S.on), { blast: !E.alive, r, phase: S.phase }); })()""")
E("""(async () => { startGetaway(); await __go(400, () => CHASE.state === 'ride'); const g = { cur: ARMS.cur, own: ARMS.own, kids: SIEGE.vm.gun.children.length };
  return __check("the getaway is the revolver's; the Winchester's still yours", g.cur === null && g.own === 'winchester' && g.kids === ARMS.revKids.length, g); })()""")
E("""JSON.stringify({ errs: __errs })""")
json.dump(steps, open("test/s148.json", "w"), indent=0)
