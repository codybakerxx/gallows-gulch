# builds test/s132.json: the getaway on a phone (run it at 390 x 844), driven with touch events.
#  the bell and the win; the run (v31): the view takes the whole screen with nothing on it to press; a swipe left or right changes lane, one
#  lane per swipe however long it is, the horse sidestepping rather than turning; a swipe up jumps; a tap or a small wobble
#  does nothing; the page never scrolls; the fight aimed with the Aim pad while Fire is pressed with another finger
#  (two touches at once), and by dragging on the view; no Reload button, the gun reloads itself; the cliff with the sound muted (the scream
#  still plays, through the muted output) and the results; Reduce motion: the camera's bob and shake cut down while the reticle still
#  drifts with the horse
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
  out.ride = { state: CHASE.state, pad: __vis('chasePad'), buttons: ['padSteer', 'padLeft', 'padRight', 'padReload'].filter(id => document.getElementById(id)), pursuit: __vis('pursuit'),
    kb: getComputedStyle(document.getElementById('kb')).display, stageH: document.getElementById('stage').clientHeight, pageH: window.innerHeight,
    gun: { rounds: CHASE.rounds, reloads: CHASE.reloads, hp: CHASE.hp, hearts: document.querySelectorAll('#hp svg').length, badges: document.querySelectorAll('#reloads svg').length, shown: getComputedStyle(document.getElementById('gun')).visibility } };
  out.errs = __errs; return JSON.stringify(out); } catch (e) { return 'ERR ' + e.stack; } })()""")
shot("a_ride")
E("""(async () => { try { const C = CHASE, out = {}, st = document.getElementById('stage').getBoundingClientRect(), x0 = st.x + st.width / 2, y0 = st.y + st.height * 0.6;
  out.touchAction = getComputedStyle(document.getElementById('stage')).touchAction; await __go(60, () => !C.shift && !C.air);
  const swipe = async (id, dx, dy, steps = 4) => { __touch('#scene', 'pointerdown', id, x0, y0); for (let i = 1; i <= steps; i++) { __touch('#scene', 'pointermove', id, x0 + dx * i / steps, y0 + dy * i / steps); await __go(1); }
    window.dispatchEvent(new PointerEvent('pointerup', { pointerId: id, pointerType: 'touch', bubbles: true, clientX: x0 + dx, clientY: y0 + dy })); };
  // a swipe left, a swipe right: a lane each, straight across, the body hardly turning
  let maxYaw = 0; const yawWatch = () => { const h = trailAt(C.s, 0, {}); maxYaw = Math.max(maxYaw, Math.abs(((C.horse.yaw - h.yaw + Math.PI) % TAU + TAU) % TAU - Math.PI)); return false; };
  const l0 = C.lane, lat0 = C.lat; out.prevented = __touch('#scene', 'pointerdown', 5, x0, y0); window.dispatchEvent(new PointerEvent('pointerup', { pointerId: 5, pointerType: 'touch', bubbles: true }));
  await swipe(6, -70, 6); await __go(30, yawWatch); out.left = { lane: C.lane, from: l0, moved: __r(C.lat - lat0), maxYawDeg: __r(maxYaw * 180 / Math.PI) };
  const lat1 = C.lat; await swipe(7, 70, -4); await __go(30); out.right = { lane: C.lane, moved: __r(C.lat - lat1) };
  // a long swipe left: still just the one lane; then a tap and a wobble: nothing
  const lat2 = C.lat; await swipe(8, -160, 0, 6); await __go(30); out.long = { lane: C.lane, moved: __r(C.lat - lat2) };
  const l3 = C.lane, j3 = C.stats.jumps; __touch('#scene', 'pointerdown', 9, x0, y0); __touch('#scene', 'pointermove', 9, x0 + 9, y0 - 8); window.dispatchEvent(new PointerEvent('pointerup', { pointerId: 9, pointerType: 'touch', bubbles: true })); await __go(10);
  out.tap = { lane: C.lane === l3, jumps: C.stats.jumps - j3 };
  // a swipe up: a jump, high enough to clear a fence
  let peak = 0; await swipe(10, 4, -80); await __go(60, () => { peak = Math.max(peak, C.jy); return !C.air; }); out.jump = { jumps: C.stats.jumps - j3, peak: __r(peak), lane: C.lane };
  out.scroll = [window.scrollY, document.scrollingElement.scrollTop]; out.errs = __errs; return JSON.stringify(out); } catch (e) { return 'ERR ' + e.stack; } })()""")
# Reduce motion: the camera's bob on the gallop with it off and on
E("""(async () => { const C = CHASE, H = C.horse.grp, m = document.getElementById('motion'); const bob = async () => { const ys = []; await __go(90, () => { __auto(); ys.push(R.camera.position.y - H.position.y); return false; }); const a = ys.reduce((s, v) => s + v, 0) / ys.length; return __r(Math.sqrt(ys.reduce((s, v) => s + (v - a) ** 2, 0) / ys.length) * 1000); };
  m.checked = false; m.dispatchEvent(new Event('change')); const off = await bob(); m.checked = true; m.dispatchEvent(new Event('change')); const on = await bob();
  return JSON.stringify({ bobMm: { off, on }, pref: STATE.reduceMotion, saved: loadPrefs().motion }); })()""")
E("""(async () => { const C = CHASE; C.s = C.turnAt - 4; for (const ob of C.obs) dropObstacle(ob); C.obs = []; C.rows = []; C.nextRow = 1e9; await __go(400, () => C.state === 'combat' && C.safeT <= 0);
  await __go(3); return JSON.stringify({ state: C.state, pads: { aim: __vis('padAim2'), fire: __vis('padShoot'), steer: !!document.getElementById('padSteer'), reloadButton: !!document.getElementById('padReload') }, aimLabel: document.getElementById('padAim2').textContent, ret: __vis('chaseRet'), tip: document.getElementById('chaseTip').textContent, kb: getComputedStyle(document.getElementById('kb')).display, reloads: C.reloads, badges: document.querySelectorAll('#reloads svg').length, errs: __errs }); })()""")
shot("b_combat")
E("""(async () => { try { const C = CHASE, out = {}, fb = document.getElementById('padShoot').getBoundingClientRect(), ab = document.getElementById('padAim2').getBoundingClientRect(), st = document.getElementById('stage').getBoundingClientRect();
  C.ay = C.ap = 0; await __go(4); const s0 = C.stats.shots;
  // finger one on the Aim pad, dragging; finger two presses Fire while it's still down; finger one carries on
  const ax = ab.x + ab.width / 2, ay = ab.y + ab.height / 2; __touch('#padAim2', 'pointerdown', 21, ax, ay); for (let i = 1; i <= 5; i++) { __touch('#padAim2', 'pointermove', 21, ax - i * 12, ay); await __go(1); }
  const a1 = [C.ay, C.ap]; out.shootPrevented = __touch('#padShoot', 'pointerdown', 22, fb.x + 50, fb.y + 40); await __go(2); const s1 = C.stats.shots;
  for (let i = 1; i <= 5; i++) { __touch('#padAim2', 'pointermove', 21, ax - 60 + i * 6, ay - i * 8); await __go(1); } const a2 = [C.ay, C.ap];
  __touch('#padShoot', 'pointerup', 22, fb.x + 50, fb.y + 40); await __go(20); __touch('#padShoot', 'pointerdown', 23, fb.x + 50, fb.y + 40); await __go(2); const s2 = C.stats.shots; __touch('#padShoot', 'pointerup', 23, fb.x + 50, fb.y + 40);
  __touch('#padAim2', 'pointerup', 21, ax, ay);
  out.aimPad = { afterDrag: a1.map(__r), afterSecondDrag: a2.map(__r), shots: [s1 - s0, s2 - s0] };
  // and a drag on the view aims too
  const b0 = [C.ay, C.ap], x0 = st.x + st.width / 2, y0 = st.y + st.height / 2; __touch('#scene', 'pointerdown', 25, x0, y0); for (let i = 1; i <= 4; i++) { __touch('#scene', 'pointermove', 25, x0 + i * 10, y0 + i * 5); await __go(1); }
  window.dispatchEvent(new PointerEvent('pointerup', { pointerId: 25, pointerType: 'touch', bubbles: true })); out.viewDrag = [__r(C.ay - b0[0]), __r(C.ap - b0[1])];
  // empty the cylinder: it reloads by itself, once
  C.rounds = 1; C.cool = 0; chaseFire(); out.auto = { rounds: C.rounds, reloadT: __r(C.reloadT), reloads: C.reloads, badgeUsed: document.getElementById('reloads').classList.contains('used') };
  await __go(140, () => C.reloadT <= 0); out.reloaded = C.rounds; out.scroll = [window.scrollY, document.scrollingElement.scrollTop]; out.errs = __errs; return JSON.stringify(out); } catch (e) { return 'ERR ' + e.stack; } })()""")
# Reduce motion on: does the reticle still drift with the horse?
E("""(async () => { const C = CHASE; let maxSway = 0; await __go(240, () => { C.hp = Math.max(C.hp, 3); maxSway = Math.max(maxSway, Math.abs(C.sway.y)); return false; }); return JSON.stringify({ reduce: STATE.reduceMotion, maxSway: __r(maxSway), ret: __retCheck() }); })()""")
shot("c_drag_fire")
# the sound off for the end: the scream still runs, through the muted output
E("""(async () => { try { const C = CHASE, out = {}; setSound(false); out.muted = { muted: Sound.muted, master: Sound.masterGain }; const m = document.getElementById('motion'); m.checked = false; m.dispatchEvent(new Event('change'));
  let guard = 0; while (C.state === 'combat' && guard++ < 400) { C.hp = 5; if (C.rounds <= 0 || C.reloadT > 0) { if (C.reloadT <= 0) { C.reloads = Math.max(C.reloads, 1); chaseReload(); } await __go(110, () => C.reloadT <= 0); continue; } const alive = C.riders.filter(r => r.alive && r.state !== 'wait').sort((a, b) => a.d - b.d); if (alive[0]) __fireAt(alive[0]); await __go(20, () => C.state !== 'combat'); }
  await __go(300, () => C.cine && C.cine.t > CHASE_CFG.cliff.celebrate + CHASE_CFG.cliff.turn + 0.3); out.state = C.state; return JSON.stringify(out); } catch (e) { return 'ERR ' + e.stack; } })()""")
shot("d_cliff")
E("""(async () => { const C = CHASE; await __go(300, () => C.cine && C.cine.phase === 'fall' && C.cine.ft > 1.0); return JSON.stringify({ tracks: __cnt.tracks, master: Sound.masterGain }); })()""")
shot("e_fall")
E("""(async () => { const C = CHASE; await __go(900, () => C.state === 'results'); setSound(true); return JSON.stringify({ state: C.state, title: document.getElementById('resTitle').textContent, line: document.getElementById('resLine').textContent, unmuted: Sound.masterGain, errs: __errs }); })()""")
shot("f_results")
json.dump(steps, open("test/s132.json", "w"), indent=0)
print(len(steps), "steps")
