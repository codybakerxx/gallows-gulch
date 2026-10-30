# builds test/s131.json: the hidden getaway (v29; the run v31), at desktop size with the keyboard and mouse.
#  1) the bell: an early hit spends a bullet and marks the round but changes nothing else; three hits, no duplicates; the last gunman
#     dropped with the last bullet (0 left) and the getaway starts on its own, once
#  2) a new round clears the mark; the bell rung and then the fight lost: no getaway
#  3) a win without the bell: the street stays live (you can still fire); the bell rung three times then: one getaway
#  4) the run: nothing to press on screen and the view takes the whole page; a key per lane (← → and A / D), ↑ / W / Space to jump; the page doesn't scroll;
#     riding into something costs ground but not the chase; low things jumped clear; the course ridden (by the test's autopilot) to the turn
#  5) the turn: the horse keeps going the same way while the view comes round; nothing can hurt you through it
#  6) the fight: mouse aim and click, no R key (the gun reloads itself, twice out here), the reticle is where the shot goes while the horse swerves, the horse steers itself
#     clear of everything, a lasso that lands costs a heart, a windup shot through is called off
#  7) the last one down: the cliff, once; the scream through the master output; completion; the results
#  8) retry: straight back in the saddle, everything cleaned up; caught in the ride, caught in the fight, retry after each; the cliff
#     skipped the second time; back to the hangman
import json, os, sys
pre = sys.argv[1] if len(sys.argv) > 1 else "g131"
HERE = os.path.dirname(os.path.abspath(__file__))
steps = []
E = lambda js: steps.append(["eval", js])
shot = lambda f: steps.append(["shot", f"test/{pre}_{f}.png"])
E("""window.__errs = []; window.addEventListener('error', e => __errs.push(String(e.message) + ' @' + (e.filename || '').split('/').pop() + ':' + (e.lineno || ''))); window.addEventListener('unhandledrejection', e => __errs.push('rej ' + String(e.reason && e.reason.stack || e.reason))); 1""")
steps.append(["click", "#startBtn"]); steps.append(["wait", 1500])
E(open(os.path.join(HERE, "chase_helpers.js")).read())

# ---- 1) an early bell, then the win on the last bullet ----
E("""(async () => { try { await __siege(); const S = SIEGE, out = { start: { phase: S.phase, bullets: S.bullets, unlocked: BELL.unlocked } };
  out.hit1 = await __shootBell(); await __go(30, () => { __calm(); return false; });
  out.after1 = { phase: S.phase, bullets: S.bullets, unlocked: BELL.unlocked, chase: CHASE.on, sg: __cnt.sg, alive: S.enemies.filter(q => q.alive).length };
  for (let i = 0; i < 2; i++) { await __go(25, () => { __calm(); return false; }); out['hit' + (i + 2)] = await __shootBell(); }
  await __go(60, () => { __calm(); return false; }); out.after3 = { phase: S.phase, bullets: S.bullets, chase: CHASE.on, sg: __cnt.sg };
  out.win = await __lastOne(1); out.brief = { shown: !document.getElementById('clearMsg').hidden, text: document.getElementById('clearMsg').textContent, streak: STATE.streak };
  await __go(400, () => CHASE.on); out.getaway = { on: CHASE.on, state: CHASE.state, phase: S.phase, bulletsLeft: S.bullets, sg: __cnt.sg };
  await __go(120); out.later = { sg: __cnt.sg, begins: __cnt.begins, state: CHASE.state };
  out.errs = __errs; return JSON.stringify(out); } catch (e) { return 'ERR ' + e.stack; } })()""")
shot("a_mount")
# ---- 2) a new round clears the mark; rung and then lost ----
E("""(async () => { try { const S = SIEGE, out = {}; newRound(); await __go(30); out.reset = { chase: CHASE.on, state: CHASE.state, unlocked: BELL.unlocked, siege: S.on, horse: CHASE.horse.grp.visible, man: MAN.root.visible };
  await __siege(); out.start = { unlocked: BELL.unlocked }; out.hit = await __shootBell();
  // throw the rest away: out of bullets with them standing, and they finish you
  S.bullets = 1; S.reloads = 0; S.pitch = 0.9; await __go(2); S.cool = 0; fireTap(); out.doomed = S.phase; await __go(3000, () => S.phase === 'dead');
  await __go(400); out.lost = { phase: S.phase, unlocked: BELL.unlocked, chase: CHASE.on, sg: __cnt.sg, sign: !document.getElementById('sign').hidden };
  out.errs = __errs; return JSON.stringify(out); } catch (e) { return 'ERR ' + e.stack; } })()""")
shot("b_lost")
# ---- 3) a win without the bell; then the bell, three times ----
E("""(async () => { try { const S = SIEGE, out = {}; document.getElementById('sign').hidden = true; newRound(); await __go(30); await __siege(); out.start = { unlocked: BELL.unlocked };
  out.win = await __lastOne(6); await __go(90, () => { __calm(); return false; });
  out.cleared = { phase: S.phase, chase: CHASE.on, banner: !document.getElementById('clearMsg').hidden, done: __vis('clearDone'), line: document.getElementById('clearLine').textContent, xhair: !document.getElementById('xhair').hidden };
  S.pitch = 0.9; await __go(2); S.cool = 0; const b0 = S.bullets; fireTap(); out.liveFire = { spent: b0 - S.bullets, phase: S.phase };
  await __go(20); out.bell = [await __shootBell()]; for (let i = 0; i < 2; i++) { S.cool = 0; fireTap(); out.bell.push({ bullets: S.bullets, pending: BELL.pending }); }
  out.beforeTimer = { chase: CHASE.on, sg: __cnt.sg, pending: BELL.pending }; return JSON.stringify(out); } catch (e) { return 'ERR ' + e.stack; } })()""")
steps.append(["wait", 1400])
E("""(async () => { await __go(5); const out = { afterTimer: { chase: CHASE.on, state: CHASE.state, sg: __cnt.sg, pending: BELL.pending } }; await __go(240, () => CHASE.state === 'ride');
  out.ride = { state: CHASE.state, sg: __cnt.sg, pad: [__vis('chasePad'), !!document.getElementById('padSteer'), __vis('padShoot')], pursuit: __vis('pursuit'), tip: document.getElementById('chaseTip').textContent,
    kb: getComputedStyle(document.getElementById('kb')).display, app: document.getElementById('app').className, stageH: document.getElementById('stage').clientHeight, pageH: window.innerHeight };
  out.errs = __errs; return JSON.stringify(out); })()""")
shot("c_ride_start")
# ---- 4) the ride ----
E("""(async () => { try { const C = CHASE, out = {}; await __go(30);
  const lat0 = C.lat; __key('d', true); await __go(30); out.keyD = { lane: C.lane, moved: __r(C.lat - lat0) }; __key('d', false); await __go(2);
  __key('d', true); await __go(3); __key('d', true); await __go(30); out.keyEdge = { lane: C.lane, lat: __r(C.lat) }; __key('d', false); // (held and repeated: a lane per press, and the trail's edge stops it)
  const lat1 = C.lat; __key('ArrowLeft', true); await __go(2); __key('ArrowLeft', false); __key('a', true); await __go(30); __key('a', false); out.keyLeft = { lane: C.lane, moved: __r(C.lat - lat1) };
  __key('ArrowRight', true); await __go(30); __key('ArrowRight', false);
  const jumps0 = C.stats.jumps; let peak = 0; __key('ArrowUp', true); await __go(60, () => { peak = Math.max(peak, C.jy); return !C.air; }); __key('ArrowUp', false);
  __key(' ', true); await __go(2); __key(' ', false); const airSpace = !!C.air; await __go(60, () => !C.air); __key('w', true); await __go(2); __key('w', false); const airW = !!C.air; await __go(60, () => !C.air);
  out.jump = { jumps: C.stats.jumps - jumps0, peak: __r(peak), airSpace, airW, lane: C.lane };
  out.scroll = [window.scrollY, document.scrollingElement.scrollTop, getComputedStyle(document.getElementById('stage')).touchAction];
  // one collision: ride straight at the next tall thing in your lane's way
  const next = () => C.obs.filter(o => o.run && !o.low && !o.hit && o.s > C.s + 14).sort((a, b) => a.s - b.s)[0];
  await __go(600, () => { __auto(); return !!next() && C.ghostT <= 0; }); const ob = next(), g0 = C.gap, b0 = C.stats.bumps; // (v34: every row needs an action, so the autopilot may have clipped something on the way: count from here)
  await __go(400, () => { __steerTo(ob.lat); return C.stats.bumps > b0 || C.s > ob.s + 3; }); out.target = [ob.kind, __r(ob.lat), __r(ob.halfLat)];
  out.bump = { bumps: C.stats.bumps - b0, gapBefore: __r(g0), gapAfter: __r(C.gap), speed: __r(C.speed), state: C.state, lane: C.lane, msg: document.getElementById('chaseMsg').textContent };
  // and a low one jumped clean
  const low = () => C.obs.filter(o => o.run && o.low && !o.hit && o.s > C.s + 16).sort((a, b) => a.s - b.s)[0]; await __go(1200, () => { __auto(); return !!low() && C.ghostT <= 0; }); const lo = low(), b1 = C.stats.bumps;
  await __go(600, () => { if (!C.shift) __steerTo(lo.lat); if (!C.air && !C.shift && lo.s - C.s < C.speed * 0.36 + 1.5 && __laneOf(lo.lat) === C.lane) runJump(); return C.s > lo.s + 3; });
  out.lowJumped = { kind: lo.kind, height: lo.low, bumps: C.stats.bumps - b1, hit: lo.hit };
  await __go(6); out.errs = __errs; return JSON.stringify(out); } catch (e) { return 'ERR ' + e.stack; } })()""")
shot("d_bump")
E("""(async () => { const C = CHASE; await __go(800, () => { __auto(); return C.s > 200; }); return 1; })()""")
shot("e_ride_rows")
E("""(async () => { try { const C = CHASE, out = {}; const b0 = C.stats.bumps; let minGap = C.gap, near = false;
  await __go(4000, () => { __auto(); minGap = Math.min(minGap, C.gap); near = near || document.getElementById('pursuit').classList.contains('near'); return C.state !== 'ride'; });
  out.ride = { state: C.state, newBumps: C.stats.bumps - b0, rideTime: __r(C.stats.t), s: __r(C.s), turnAt: C.turnAt, rowsLaid: C.rowsLaid, jumps: C.stats.jumps, topSpeed: __r(C.speed), gap: __r(C.gap), minGap: __r(minGap), near };
  // ---- 5) the turn ----
  const H = C.horse.grp, prev = H.position.clone(), track = []; let backwards = 0, attacks = 0, hp0 = C.hp, maxSafe = C.safeT;
  await __go(400, () => { const p = H.position, h = trailAt(C.s, 0, {}), d = p.clone().sub(prev); prev.copy(p);
    const f = V3(0, 0, -1).applyQuaternion(R.camera.quaternion); const along = d.x * h.hx + d.z * h.hz; if (along <= 0) backwards++; if (C.attacker) attacks++;
    track.push([__r(C.yawOff), __r(f.x * h.hx + f.z * h.hz), __r(along)]); return C.state === 'combat' && C.safeT <= 0; });
  out.turn = { frames: track.length, backwardsFrames: backwards, attacksDuring: attacks, hpBefore: hp0, hpAfter: C.hp, safe: __r(maxSafe), first: track[0], mid: track[Math.floor(track.length * 0.4)], end: track[track.length - 1],
    gun: SIEGE.vm.gun.visible, ret: __vis('chaseRet'), pads: [__vis('padAim2'), __vis('padShoot'), __vis('padSteer'), !!document.getElementById('padReload')], tip: document.getElementById('chaseTip').textContent, posse: __posse() };
  out.errs = __errs; return JSON.stringify(out); } catch (e) { return 'ERR ' + e.stack; } })()""")
shot("f_combat")
# ---- 6) the fight ----
# the mouse: move it, click to fire
steps.append(["moveto", "(() => { const r = document.getElementById('stage').getBoundingClientRect(); return [r.left + r.width * 0.62, r.top + r.height * 0.38, 4]; })()"])
E("""(async () => { await __go(3); const C = CHASE, r = document.getElementById('stage').getBoundingClientRect(), ret = document.getElementById('chaseRet');
  return JSON.stringify({ mouse: C.mouse && [__r(C.mouse.x), __r(C.mouse.y)], ret: [Math.round(parseFloat(ret.style.left)), Math.round(parseFloat(ret.style.top))], cursorAt: [Math.round(r.width * 0.62), Math.round(r.height * 0.38)], sway: [__r(C.sway.y), __r(C.sway.p)], cursor: getComputedStyle(document.getElementById('stage')).cursor }); })()""")
steps.append(["press", "(() => { const r = document.getElementById('stage').getBoundingClientRect(); return [r.left + r.width * 0.62, r.top + r.height * 0.38]; })()"])
steps.append(["release", ""])
E("""(async () => { const C = CHASE, out = { click: { shots: C.stats.shots, rounds: C.rounds } }; await __go(20);
  __key('r', true); __key('r', false); out.rKey = { reloadT: __r(C.reloadT), rounds: C.rounds }; // (no manual reload any more)
  C.rounds = 1; C.cool = 0; chaseFire(); out.auto = { rounds: C.rounds, reloadT: __r(C.reloadT), reloads: C.reloads, meta: document.getElementById('meta').textContent }; C.cool = 0; const s0 = C.stats.shots; chaseFire(); out.fireWhileReloading = C.stats.shots - s0;
  await __go(140, () => C.reloadT <= 0); out.reloaded = { rounds: C.rounds, reloads: C.reloads, meta: document.getElementById('meta').textContent }; return JSON.stringify(out); })()""")
# the reticle against the shot, through a swerve; the horse's own line past everything
E("""(async () => { try { const C = CHASE, K = CHASE_CFG, out = { ret: [] }; C.mouse = null; let minMargin = 99, passes = 0, maxSway = 0; const seen = new Set();
  const reach = 1.3, half = 0.46; // (the horse: nose to rump half-length, half its width)
  const watch = () => { for (const ob of C.obs) { if (!ob.halfLat || Math.abs(ob.s - C.s) > ob.halfS + reach) continue; const m = Math.abs(ob.lat - C.lat) - (ob.halfLat + half); minMargin = Math.min(minMargin, m); if (!seen.has(ob)) { seen.add(ob); passes++; } } maxSway = Math.max(maxSway, Math.abs(C.sway.y)); };
  C.ay = 0.05; C.ap = 0.02; for (let i = 0; i < 8; i++) { await __go(12, () => { watch(); return false; }); out.ret.push(__retCheck()); }
  out.dodge = { passes, minMargin: __r(minMargin), maxSway: __r(maxSway), bumps: C.stats.bumps };
  // a shot through the reticle while it's drifting: aim it at a rider (the reticle shows where), and fire
  await __go(200, () => { watch(); return C.swerve.seg === 'move' && Math.abs(C.sway.y) > 0.01; }); const tgt = C.riders.find(r => r.alive && r.kind === 'gun') || C.riders.find(r => r.alive);
  __aimRider(tgt); await __go(1); const rc = __retCheck(); C.cool = 0; const h0 = C.stats.hits, hp0 = tgt.hp; chaseFire(); // (the reticle as drawn this frame, the shot fired this frame)
  out.driftShot = { ret: rc, hit: C.stats.hits > h0, riderHp: [hp0, tgt.hp, tgt.alive], posse: __posse() };
  out.errs = __errs; return JSON.stringify(out); } catch (e) { return 'ERR ' + e.stack; } })()""")
shot("g_drift")
# attacks: a lasso that lands; a windup shot through
E("""(async () => { try { const C = CHASE, out = {}; C.rounds = 6; let warnSeen = false, arcSeen = false, swish = 0;
  await __go(1500, () => { const A = C.attacker; if (A && A.state === 'windup') { warnSeen = warnSeen || __vis('warn'); arcSeen = arcSeen || __vis('threat'); } return A && A.kind === 'lasso' && A.state === 'windup' && A.t > 1.2; });
  out.lassoWindup = { who: C.attacker && C.attacker.kind, warnSeen, arcSeen, loop: C.lasso.loop.visible };
  return JSON.stringify(out); } catch (e) { return 'ERR ' + e.stack; } })()""")
shot("h_lasso")
E("""(async () => { try { const C = CHASE, out = {}; C.hp = Math.max(C.hp, 2); const hp0 = C.hp; await __go(400, () => !C.attacker || C.attacker.state !== 'windup'); await __go(90, () => C.hp < hp0 || !C.lasso.fly);
  await __go(20); out.lassoLanded = { hpBefore: hp0, hpAfter: C.hp, msg: document.getElementById('chaseMsg').textContent, hearts: document.querySelectorAll('#hp svg.gone').length };
  // the next windup: shoot him during it
  out.interrupt = [];
  for (let k = 0; k < 4; k++) { // (a shot can be stopped by another rider in the way: then try the next windup)
    await __go(1500, () => { C.hp = Math.max(C.hp, 2); return C.attacker && C.attacker.state === 'windup' && C.attacker.t > 0.4; }); const A = C.attacker; if (!A) break; const hp2 = C.hp, ahp = A.hp;
    __fireAt(A); const struck = !A.alive || A.hp < ahp; const rec = { who: A.kind, struck, windupCancelled: C.attacker !== A };
    await __go(Math.round(((A.wind || 2) + 0.8) * 60), () => C.attacker && C.attacker !== A); rec.hp = [hp2, C.hp]; rec.aState = A.alive ? A.state : 'down'; out.interrupt.push(rec); if (struck) break; }
  out.errs = __errs; return JSON.stringify(out); } catch (e) { return 'ERR ' + e.stack; } })()""")
# the rest of the fight, played: shoot whoever's lining up, else whoever's nearest; reload when empty; record what happens
E("""(async () => { try { const C = CHASE, out = { log: [] }; let guard = 0, dropped = 0, maxAlive = 0; const t0 = C.stats.t; let minMargin = 99, passes = 0; const seen = new Set(), K = CHASE_CFG;
  const reach = 1.3, half = 0.46;
  const watch = () => { for (const ob of C.obs) { if (!ob.halfLat || Math.abs(ob.s - C.s) > ob.halfS + reach) continue; minMargin = Math.min(minMargin, Math.abs(ob.lat - C.lat) - (ob.halfLat + half)); if (!seen.has(ob)) { seen.add(ob); passes++; } } return C.state !== 'combat'; };
  while (C.state === 'combat' && guard++ < 400) { C.hp = Math.max(C.hp, 2); // (so the run reaches the end; being caught is tested on its own below)
    const alive = C.riders.filter(r => r.alive); maxAlive = Math.max(maxAlive, alive.filter(r => r.state !== 'wait').length);
    if (C.rounds <= 0 || C.reloadT > 0) { if (C.reloadT <= 0) { C.reloads = Math.max(C.reloads, 1); chaseReload(); } await __go(110, () => C.reloadT <= 0); continue; } // (topped up: running dry is tested in s133)
    const tgt = (C.attacker && C.attacker.state === 'windup') ? C.attacker : alive.filter(r => r.state !== 'wait').sort((a, b) => a.d - b.d)[0];
    if (tgt && Math.abs(tgt.d) < 40) { const r = __fireAt(tgt); if (r === 'hit' && !tgt.alive) { dropped++; out.log.push([__r(C.stats.t - t0), tgt.kind, 'down']); } }
    await __go(24 + (guard % 3 === 0 ? 90 : 0), watch); } // (with pauses, so the horse swerves round a few more things)
  out.dodgeWholeFight = { passes, minMargin: __r(minMargin) };
  out.end = { state: C.state, fightTime: __r(C.stats.t - t0), dropped, shots: C.stats.shots, hits: C.stats.hits, victory: __cnt.victory, posse: __posse() };
  out.errs = __errs; return JSON.stringify(out); } catch (e) { return 'ERR ' + e.stack; } })()""")
shot("i_last_down")
# ---- 7) the cliff ----
E("""(async () => { try { const C = CHASE, out = {}; const s0 = C.stats.shots; C.cool = 0; chaseFire(); out.inputOff = { shotsAfterFire: C.stats.shots - s0, ret: __vis('chaseRet'), pad: __vis('chasePad'), skip: __vis('chaseSkip') };
  await __go(200, () => C.cine && C.cine.t > 0.8); out.celebrate = { t: __r(C.cine.t), yawOff: __r(C.yawOff), gun: SIEGE.vm.gun.visible, sEdge: __r(C.cine.sEdge), s: __r(C.s), canyon: WORLD.canyonU.on.value };
  return JSON.stringify(out); } catch (e) { return 'ERR ' + e.stack; } })()""")
shot("j_celebrate")
E("""(async () => { const C = CHASE, K = CHASE_CFG.cliff; await __go(300, () => C.cine && C.cine.t > K.celebrate + K.turn + 0.25); const f = V3(0, 0, -1).applyQuaternion(R.camera.quaternion), h = trailAt(C.s, 0, {});
  return JSON.stringify({ t: __r(C.cine.t), yawOff: __r(C.yawOff), facingForward: __r(f.x * h.hx + f.z * h.hz), toEdge: __r(C.cine.sEdge - C.s), speed: __r(C.speed) }); })()""")
shot("k_cliff_reveal")
E("""(async () => { const C = CHASE; const shots = []; await __go(1200, () => { const V = C.cine; if (V && V.phase === 'fall') { const S = cineShot(0), k = V.ft < CINE.leap ? 'leap' : V.ft < CINE.down ? 'down' : 'wide'; if (!shots.length || shots[shots.length - 1][0] !== k) shots.push([k, __r(V.ft), __r(V.ts), !!(S && S.dof)]); } return V && V.phase === 'fall' && V.ft > 1.1; });
  return JSON.stringify({ phase: C.cine.phase, ft: __r(C.cine.ft), st: __r(C.cine.st), slow: __r(C.cine.ts), shots, cinema: document.getElementById('app').classList.contains('cinema'), dof: __r(R.post.uniforms.amount.value), man: MAN.root.visible, tracks: __cnt.tracks, scream: !!C.scream, y: __r(C.horse.grp.position.y), floor: __r(C.canyonAt.floor), shadow: SKY.sun.shadow.camera.right }); })()""")
shot("l_fall_wide")
E("""(async () => { try { const C = CHASE, out = {}; let impactAt = null, fallAt = null, t = 0; const tv = C.cine.t;
  const seenShots = new Set(); await __go(1400, () => { if (C.cine && C.cine.phase === 'fall') seenShots.add(C.cine.ft < CINE.leap ? 'leap' : C.cine.ft < CINE.down ? 'down' : 'wide'); if (C.cine && C.cine.impact && impactAt === null) impactAt = C.cine.t; return C.state === 'results'; });
  out.results = { state: C.state, victory: __cnt.victory, results: __cnt.results, captured: __cnt.capture, title: document.getElementById('resTitle').textContent, line: document.getElementById('resLine').textContent,
    stats: document.getElementById('resStats').textContent, score: document.getElementById('resScore').textContent, hp: C.hp, impactAt: __r(impactAt), cineLength: __r(impactAt + CHASE_CFG.cliff.pause + CHASE_CFG.cliff.fade),
    cliffSeen: STATE.cliffSeen, rides: STATE.rides, best: STATE.bestRide, saved: (() => { const p = loadPrefs(); return [p.cliff, p.ride, p.rides]; })(), scream: !!C.scream, retry: __vis('resRetry'), home: __vis('resHome'),
    shotsSeen: [...seenShots], cinemaAfter: document.getElementById('app').classList.contains('cinema'), shadowAfter: SKY.sun.shadow.camera.right };
  await __go(60); out.once = { victory: __cnt.victory, results: __cnt.results }; out.errs = __errs; return JSON.stringify(out); } catch (e) { return 'ERR ' + e.stack; } })()""")
shot("m_results")
# ---- 8) retry; caught in the ride; caught in the fight; the cliff skipped; home ----
steps.append(["click", "#resRetry"])
E("""(async () => { const C = CHASE, out = {}; out.retry = { state: C.state, res: __vis('chaseRes'), obs: C.obs.length, rows: C.rows.length, canyon: WORLD.canyonU.on.value, canyonMesh: C.canyon && C.canyon.visible, man: MAN.root.visible, hp: C.hp, rounds: C.rounds, gap: C.gap,
    riders: C.riders.filter(r => r.alive && !r.a.hang && r.H.grp.visible).length, used: Object.values(C.pool).flat().filter(o => o.used).length, dustLive: [...C.dust.life].filter(v => v > 0).length, begins: __cnt.begins };
  await __go(200, () => C.state === 'ride'); out.ride = { state: C.state, st: __r(C.st), s: __r(C.s) };
  // caught in the ride: run into row after row
  await __go(4000, () => { const ob = C.obs.filter(o => o.run && !o.low && !o.hit && o.s > C.s + 0.5).sort((a, b) => a.s - b.s)[0]; if (ob) __steerTo(ob.lat); return C.state !== 'ride'; });
  out.caught = { state: C.state, bumps: C.stats.bumps, gap: __r(C.gap), msg: document.getElementById('chaseMsg').textContent, capture: __cnt.capture };
  await __go(400, () => C.state === 'results'); out.res = { title: document.getElementById('resTitle').textContent, line: document.getElementById('resLine').textContent, rides: STATE.rides, results: __cnt.results, kb: getComputedStyle(document.getElementById('kb')).display };
  out.errs = __errs; return JSON.stringify(out); })()""")
shot("n_caught_ride")
steps.append(["click", "#resRetry"])
E("""(async () => { try { const C = CHASE, out = {}; await __go(200, () => C.state === 'ride'); out.used0 = Object.values(C.pool).flat().filter(o => o.used).length;
  C.s = C.turnAt - 4; for (const ob of C.obs) dropObstacle(ob); C.obs = []; C.rows = []; C.nextRow = 1e9; await __go(400, () => C.state === 'combat' && C.safeT <= 0);
  C.hp = 1; let hits = 0; await __go(3000, () => C.state !== 'combat');
  out.caught = { state: C.state, hp: C.hp, msg: document.getElementById('chaseMsg').textContent, capture: __cnt.capture };
  await __go(400, () => C.state === 'results'); out.res = { title: document.getElementById('resTitle').textContent, line: document.getElementById('resLine').textContent };
  out.errs = __errs; return JSON.stringify(out); } catch (e) { return 'ERR ' + e.stack; } })()""")
shot("o_caught_fight")
steps.append(["click", "#resRetry"])
E("""(async () => { try { const C = CHASE, out = {}; await __go(200, () => C.state === 'ride'); C.s = C.turnAt - 4; for (const ob of C.obs) dropObstacle(ob); C.obs = []; C.rows = []; C.nextRow = 1e9;
  await __go(400, () => C.state === 'combat' && C.safeT <= 0); const v0 = __cnt.victory; let guard = 0;
  while (C.state === 'combat' && guard++ < 400) { C.hp = 3; if (C.rounds <= 0 || C.reloadT > 0) { if (C.reloadT <= 0) { C.reloads = Math.max(C.reloads, 1); chaseReload(); } await __go(110, () => C.reloadT <= 0); continue; } const alive = C.riders.filter(r => r.alive && r.state !== 'wait').sort((a, b) => a.d - b.d); if (alive[0]) __fireAt(alive[0]); await __go(20, () => C.state !== 'combat'); }
  await __go(30); out.skip = { state: C.state, shown: __vis('chaseSkip'), cliffSeen: STATE.cliffSeen, victory: __cnt.victory - v0 }; return JSON.stringify(out); } catch (e) { return 'ERR ' + e.stack; } })()""")
# (the page drawing again first: under SwiftShader the first frames of the ending can hold up the compositor for many seconds,
#  and Playwright clicks only a button it has seen hold still over two drawn frames; 6.6 s here in v35, over 25 s in one v36 run)
E("""new Promise(res => { const to = setTimeout(() => res('no frame in 90 s'), 90000); requestAnimationFrame(() => requestAnimationFrame(() => { clearTimeout(to); res(1); })); })""")
steps.append(["wait", 600])  # (a real moment for the button to settle: Playwright clicks only a button that has stopped moving)
steps.append(["click", "#chaseSkip"])
E("""(async () => { const C = CHASE; await __go(5); return JSON.stringify({ state: C.state, title: document.getElementById('resTitle').textContent, scream: !!C.scream, victory: __cnt.victory, rides: STATE.rides, errs: __errs }); })()""")
steps.append(["click", "#resHome"])
E("""(async () => { await __go(60); const C = CHASE; return JSON.stringify({ chase: C.on, state: C.state, siege: SIEGE.on, phase: SIEGE.phase, locked: STATE.locked, word: STATE.word.length, misses: STATE.misses,
  kbSiege: document.getElementById('kb').classList.contains('siege'), letters: getComputedStyle(document.querySelector('.krow')).visibility, horse: C.horse.grp.visible, riders: C.riders.filter(r => r.a.root.visible).length,
  man: MAN.root.visible, ribbon: C.ribbon.visible, canyon: WORLD.canyonU.on.value, unlocked: BELL.unlocked, app: document.getElementById('app').className, hud: document.getElementById('hud').className, res: __vis('chaseRes'), cam: CAM.name, errs: __errs }); })()""")
shot("p_home")
json.dump(steps, open("test/s131.json", "w"), indent=0)
print(len(steps), "steps")
