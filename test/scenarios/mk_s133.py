# builds test/s133.json: the gun and the hearts (v30; v31 gives the getaway a second reload; v37: eight in the town shootout's cylinder) (run it at 390 x 844, and at 1280 x 720)
#  1) the shootout: five hearts, six in the gun and one reload shown beside it; the top bar fits; empty the cylinder and it reloads itself
#     (you can't fire while it does, the spare goes); empty it again and you're out: they finish you, one heart a shot, five shots
#  2) the getaway: the same gun and hearts, drawn the same way, with two reloads (two speedloaders) in the run and the fight; every rider still
#     in the fight on screen (a phone held upright sees a narrow slice behind you), the last one too; down to the last reload, empty it,
#     empty it again with riders left: out of bullets, and caught
import json, os, sys
pre = sys.argv[1] if len(sys.argv) > 1 else "g133"
HERE = os.path.dirname(os.path.abspath(__file__))
steps = []
E = lambda js: steps.append(["eval", js])
shot = lambda f: steps.append(["shot", f"test/{pre}_{f}.png"])
E("""window.__errs = []; window.addEventListener('error', e => __errs.push(String(e.message) + ' @' + (e.filename || '').split('/').pop() + ':' + (e.lineno || ''))); window.addEventListener('unhandledrejection', e => __errs.push('rej ' + String(e.reason && e.reason.stack || e.reason))); 1""")
steps.append(["click", "#startBtn"]); steps.append(["wait", 1500])
E(open(os.path.join(HERE, "chase_helpers.js")).read())
E("""window.__bar = () => { const g = document.getElementById('gun'), m = document.getElementById('meta'), hud = document.getElementById('hud');
  return { chambers: document.querySelectorAll('#cyl g circle[stroke="#6b5a45"]').length, loaded: document.querySelectorAll('#cyl g circle[stroke="#6b5a45"][fill="#d8a246"]').length, hearts: document.querySelectorAll('#hp svg').length, full: document.querySelectorAll('#hp svg:not(.gone)').length,
    badge: __vis('reloads'), badges: document.querySelectorAll('#reloads svg').length, full: document.querySelectorAll('#reloads svg.full').length, badgeUsed: document.getElementById('reloads').classList.contains('used'), meta: m.textContent, metaClipped: m.scrollWidth > m.clientWidth + 1, barOverflow: hud.scrollWidth > hud.clientWidth + 1, title: g.title }; }; 1""")
# ---- 1) the shootout ----
E("""(async () => { try { await __siege(); const S = SIEGE, out = {}; await __go(30, () => { __calm(); return false; });
  out.start = { bullets: S.bullets, reloads: S.reloads, health: S.health, bar: __bar(), tip2: SIEGE_TIP2 };
  await __up(); S.pitch = 0.9; await __go(3, () => { __calm(); return false; }); S.bullets = 1; S.cool = 0; const sh0 = S.shots; fireTap();
  out.emptied = { bullets: S.bullets, reloadT: __r(S.reloadT), reloads: S.reloads, phase: S.phase, bar: __bar() };
  S.cool = 0; fireTap(); out.fireWhileReloading = S.shots - sh0 - 1;
  await __go(60, () => { __calm(); return false; }); out.midReload = __bar();
  await __go(120, () => { __calm(); return S.reloadT <= 0; }); out.reloaded = { bullets: S.bullets, reloads: S.reloads, bar: __bar() };
  out.errs = __errs; return JSON.stringify(out); } catch (e) { return 'ERR ' + e.stack; } })()""")
shot("a_shootout_reloaded")
E("""(async () => { try { const S = SIEGE, out = {}; S.bullets = 1; S.cool = 0; fireTap(); out.out = { bullets: S.bullets, reloads: S.reloads, phase: S.phase, doomMsg: !document.getElementById('doomMsg').hidden, bar: __bar() };
  const hits = []; let h = S.health; await __go(3000, () => { if (S.health < h) { hits.push(__r(S.t)); h = S.health; } return S.phase === 'dead'; });
  out.finished = { phase: S.phase, hitsTaken: hits.length, bar: __bar() }; out.errs = __errs; return JSON.stringify(out); } catch (e) { return 'ERR ' + e.stack; } })()""")
shot("b_shootout_out")
# ---- 2) the getaway ----
E("""(async () => { try { const out = {}; document.getElementById('sign').hidden = true; newRound(); await __go(30); await __siege(); await __shootBell(); out.win = await __lastOne(1);
  await __go(600, () => CHASE.state === 'ride'); await __go(10); const C = CHASE; out.ride = { rounds: C.rounds, reloads: C.reloads, hp: C.hp, bar: __bar() };
  C.s = C.turnAt - 4; for (const ob of C.obs) dropObstacle(ob); C.obs = []; C.rows = []; C.nextRow = 1e9; await __go(400, () => C.state === 'combat' && C.safeT <= 0); await __go(5);
  out.combat = { rounds: C.rounds, reloads: C.reloads, hp: C.hp, bar: __bar() }; out.errs = __errs; return JSON.stringify(out); } catch (e) { return 'ERR ' + e.stack; } })()""")
# everyone in view: the view resting (no aim), nobody attacking (so they ride as they will), for twelve seconds; then just the last one
E("""(async () => { try { const C = CHASE, out = {}; C.ay = C.ap = 0; C.mouse = null; const seen = {}, n = {};
  const sample = () => { C.safeT = 999; C.ay = C.ap = 0; const v = __inView(); const alive = C.riders.filter(r => r.alive); alive.forEach((r, i) => { const k = r.a.name + ':' + r.state; n[k] = (n[k] || 0) + 1; if (v[i]) seen[k] = (seen[k] || 0) + 1; }); };
  let f = 0; await __go(720, () => { if (++f % 6 === 0) sample(); return false; });
  out.front = Object.fromEntries(Object.keys(n).map(k => [k, __r((seen[k] || 0) / n[k])])); out.posse = __posse();
  return JSON.stringify(out); } catch (e) { return 'ERR ' + e.stack; } })()""")
shot("c_all_in_view")
E("""(async () => { try { const C = CHASE, out = {}; for (const r of C.riders) if (r.alive && r.kind !== 'last') { r.d = Math.max(8, r.d); riderHit(r, SIEGE_PARTS[2], r.a.ch.bones.Spine2.getWorldPosition(V3()), V3(0, 0, 1)); }
  const L = C.riders.find(r => r.kind === 'last'); let seen = 0, n = 0, f = 0; await __go(480, () => { C.safeT = 999; C.ay = C.ap = 0; if (++f > 120 && f % 6 === 0) { n++; if (__inView()[0]) seen++; } return false; });
  out.last = { state: L.state, d: __r(L.d), l: __r(L.l - C.lat), inView: __r(seen / Math.max(1, n)), aspect: __r(R.camera.aspect) }; out.errs = __errs; return JSON.stringify(out); } catch (e) { return 'ERR ' + e.stack; } })()""")
shot("d_last_in_view")
# out of bullets in the getaway: the reload spent, the last round gone, a rider left
E("""(async () => { try { const C = CHASE, out = {}; C.safeT = 0; C.hp = 5; C.rounds = 1; C.reloads = 1; C.cool = 0; C.ay = 0.9; chaseFire(); out.first = { rounds: C.rounds, reloads: C.reloads, reloadT: __r(C.reloadT) };
  await __go(140, () => C.reloadT <= 0); out.afterReload = { rounds: C.rounds, reloads: C.reloads, bar: __bar() };
  C.rounds = 1; C.cool = 0; chaseFire(); out.second = { rounds: C.rounds, reloads: C.reloads, reloadT: __r(C.reloadT), doom: !!C.doom, msg: document.getElementById('chaseMsg').textContent };
  C.cool = 0; const s0 = C.stats.shots; chaseFire(); out.dryClick = C.stats.shots - s0;
  const hits = []; let h = C.hp; await __go(900, () => { if (C.hp < h) { hits.push(__r(C.doom ? C.doom.t : -1)); h = C.hp; } return C.state !== 'combat'; });
  out.caught = { state: C.state, hits, capture: __cnt.capture }; await __go(400, () => C.state === 'results');
  out.res = { title: document.getElementById('resTitle').textContent, line: document.getElementById('resLine').textContent }; out.errs = __errs; return JSON.stringify(out); } catch (e) { return 'ERR ' + e.stack; } })()""")
shot("e_out_of_bullets")
json.dump(steps, open("test/s133.json", "w"), indent=0)
print(len(steps), "steps")
