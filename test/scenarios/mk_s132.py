# builds test/s132.json: v29, the getaway on a phone (run it at 390 x 844), driven with touch events.
#  the bell and the win; the ride steered with the Left / Right pads and with a swipe on the view; the page never scrolls; the fight
#  aimed with a drag on the view while Fire is pressed with another finger (two touches at once), Reload from its pad; the cliff with
#  the sound muted (the scream still plays, through the muted output) and the results; Reduce motion: the camera's bob and shake
#  cut down while the reticle still drifts with the horse
import json, os, sys
pre = sys.argv[1] if len(sys.argv) > 1 else "g132"
HERE = os.path.dirname(os.path.abspath(__file__))
steps = []
E = lambda js: steps.append(["eval", js])
shot = lambda f: steps.append(["shot", f"test/{pre}_{f}.png"])
E("""window.__errs = []; window.addEventListener('error', e => __errs.push(String(e.message) + ' @' + (e.filename || '').split('/').pop() + ':' + (e.lineno || ''))); window.addEventListener('unhandledrejection', e => __errs.push('rej ' + String(e.reason && e.reason.stack || e.reason))); 1""")
steps.append(["click", "#startBtn"]); steps.append(["wait", 1500])
E(open(os.path.join(HERE, "chase_helpers.js")).read())
E("""(async () => { try { await __siege(); const out = {}; out.bell = await __shootBell(); out.win = await __lastOne(2); await __go(400, () => CHASE.state === 'ride');
  out.ride = { state: CHASE.state, pads: [__vis('padLeft'), __vis('padRight')], pursuit: __vis('pursuit') }; out.errs = __errs; return JSON.stringify(out); } catch (e) { return 'ERR ' + e.stack; } })()""")
shot("a_ride")
E("""(async () => { try { const C = CHASE, out = {}, st = document.getElementById('stage').getBoundingClientRect(), pl = document.getElementById('padLeft').getBoundingClientRect(), pr = document.getElementById('padRight').getBoundingClientRect();
  out.touchAction = [getComputedStyle(document.getElementById('stage')).touchAction, getComputedStyle(document.getElementById('padLeft')).touchAction];
  let lat = C.lat; out.leftPrevented = __touch('#padLeft', 'pointerdown', 5, pl.x + 40, pl.y + 40); await __go(30); out.left = { steerPad: C.steerPad, moved: __r(C.lat - lat) }; __touch('#padLeft', 'pointerup', 5, pl.x + 40, pl.y + 40); await __go(2); out.leftUp = C.steerPad;
  lat = C.lat; __touch('#padRight', 'pointerdown', 6, pr.x + 40, pr.y + 40); await __go(30); out.right = { steerPad: C.steerPad, moved: __r(C.lat - lat) }; __touch('#padRight', 'pointerup', 6, pr.x + 40, pr.y + 40); await __go(2);
  // a swipe on the view: hold and drag a thumb to the left
  lat = C.lat; const x0 = st.x + st.width / 2, y0 = st.y + st.height * 0.6; __touch('#scene', 'pointerdown', 7, x0, y0); for (let i = 1; i <= 6; i++) { __touch('#scene', 'pointermove', 7, x0 - i * 14, y0); await __go(2); }
  await __go(24); out.swipe = { steerDrag: __r(C.steerDrag), moved: __r(C.lat - lat) }; window.dispatchEvent(new PointerEvent('pointerup', { pointerId: 7, pointerType: 'touch', bubbles: true })); await __go(2); out.swipeUp = C.steerDrag;
  out.scroll = [window.scrollY, document.scrollingElement.scrollTop]; out.errs = __errs; return JSON.stringify(out); } catch (e) { return 'ERR ' + e.stack; } })()""")
# Reduce motion: the camera's bob on the gallop with it off and on
E("""(async () => { const C = CHASE, H = C.horse.grp, m = document.getElementById('motion'); const bob = async () => { const ys = []; await __go(90, () => { __auto(); ys.push(R.camera.position.y - H.position.y); return false; }); const a = ys.reduce((s, v) => s + v, 0) / ys.length; return __r(Math.sqrt(ys.reduce((s, v) => s + (v - a) ** 2, 0) / ys.length) * 1000); };
  m.checked = false; m.dispatchEvent(new Event('change')); const off = await bob(); m.checked = true; m.dispatchEvent(new Event('change')); const on = await bob();
  return JSON.stringify({ bobMm: { off, on }, pref: STATE.reduceMotion, saved: loadPrefs().motion }); })()""")
E("""(async () => { const C = CHASE; C.s = C.turnAt - 4; for (const ob of C.obs) dropObstacle(ob); C.obs = []; C.rows = []; C.nextRow = 1e9; await __go(400, () => C.state === 'combat' && C.safeT <= 0);
  return JSON.stringify({ state: C.state, pads: [__vis('padReload'), __vis('padShoot'), __vis('padLeft')], ret: __vis('chaseRet'), tip: document.getElementById('chaseTip').textContent, errs: __errs }); })()""")
shot("b_combat")
E("""(async () => { try { const C = CHASE, out = {}, st = document.getElementById('stage').getBoundingClientRect(), fb = document.getElementById('padShoot').getBoundingClientRect(), rb = document.getElementById('padReload').getBoundingClientRect();
  const x0 = st.x + st.width * 0.5, y0 = st.y + st.height * 0.5; C.ay = C.ap = 0; await __go(4); const a0 = [C.ay, C.ap], s0 = C.stats.shots;
  __touch('#scene', 'pointerdown', 21, x0, y0); for (let i = 1; i <= 5; i++) { __touch('#scene', 'pointermove', 21, x0 - i * 12, y0); await __go(1); } // finger one: drag the aim left
  const a1 = [C.ay, C.ap]; out.shootPrevented = __touch('#padShoot', 'pointerdown', 22, fb.x + 50, fb.y + 40); await __go(2); const s1 = C.stats.shots; // finger two: Fire, while finger one stays down
  for (let i = 1; i <= 5; i++) { __touch('#scene', 'pointermove', 21, x0 - 60 + i * 6, y0 - i * 8); await __go(1); } const a2 = [C.ay, C.ap];
  __touch('#padShoot', 'pointerup', 22, fb.x + 50, fb.y + 40); await __go(20); __touch('#padShoot', 'pointerdown', 23, fb.x + 50, fb.y + 40); await __go(2); const s2 = C.stats.shots; __touch('#padShoot', 'pointerup', 23, fb.x + 50, fb.y + 40);
  window.dispatchEvent(new PointerEvent('pointerup', { pointerId: 21, pointerType: 'touch', bubbles: true }));
  out.multi = { aimStart: a0.map(__r), afterDrag: a1.map(__r), afterSecondDrag: a2.map(__r), shots: [s1 - s0, s2 - s0], drag: C.drag, mouse: C.mouse };
  __touch('#padReload', 'pointerdown', 24, rb.x + 30, rb.y + 30); out.reload = { reloadT: __r(C.reloadT), rounds: C.rounds }; __touch('#padReload', 'pointerup', 24, rb.x + 30, rb.y + 30);
  await __go(120, () => C.reloadT <= 0); out.reloaded = C.rounds; out.scroll = [window.scrollY, document.scrollingElement.scrollTop]; out.errs = __errs; return JSON.stringify(out); } catch (e) { return 'ERR ' + e.stack; } })()""")
# Reduce motion on: does the reticle still drift with the horse?
E("""(async () => { const C = CHASE; let maxSway = 0, maxOff = 0; await __go(240, () => { maxSway = Math.max(maxSway, Math.abs(C.sway.y)); return false; }); return JSON.stringify({ reduce: STATE.reduceMotion, maxSway: __r(maxSway), ret: __retCheck() }); })()""")
shot("c_drag_fire")
# the sound off for the end: the scream still runs, through the muted output
E("""(async () => { try { const C = CHASE, out = {}; setSound(false); out.muted = { muted: Sound.muted, master: Sound.masterGain }; const m = document.getElementById('motion'); m.checked = false; m.dispatchEvent(new Event('change'));
  let guard = 0; while (C.state === 'combat' && guard++ < 400) { C.hp = 3; if (C.rounds <= 0) { chaseReload(); await __go(100, () => C.reloadT <= 0); continue; } const alive = C.riders.filter(r => r.alive && r.state !== 'wait').sort((a, b) => a.d - b.d); if (alive[0]) __fireAt(alive[0]); await __go(20, () => C.state !== 'combat'); }
  await __go(300, () => C.cine && C.cine.t > CHASE_CFG.cliff.celebrate + CHASE_CFG.cliff.turn + 0.3); out.state = C.state; return JSON.stringify(out); } catch (e) { return 'ERR ' + e.stack; } })()""")
shot("d_cliff")
E("""(async () => { const C = CHASE; await __go(300, () => C.cine && C.cine.phase === 'fall' && C.cine.ft > 1.0); return JSON.stringify({ tracks: __cnt.tracks, master: Sound.masterGain }); })()""")
shot("e_fall")
E("""(async () => { const C = CHASE; await __go(900, () => C.state === 'results'); setSound(true); return JSON.stringify({ state: C.state, title: document.getElementById('resTitle').textContent, line: document.getElementById('resLine').textContent, unmuted: Sound.masterGain, errs: __errs }); })()""")
shot("f_results")
json.dump(steps, open("test/s132.json", "w"), indent=0)
print(len(steps), "steps")
