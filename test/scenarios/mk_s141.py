# builds test/s141.json: v41.
#   - after a hanging, with the GAME OVER sign put away (a drag looking round), a tap on the sword still cuts him down: the shootout starts
#   - the getaway's run is longer (1000 m of course) and builds speed as it goes, 19.5 m/s to 24.5 m/s, riding it with the autopilot
# Prints one JSON line per check; "ok" is true when it passed.
import json, os, sys
pre = sys.argv[1] if len(sys.argv) > 1 else "g141"
HERE = os.path.dirname(os.path.abspath(__file__))
steps = []
E = lambda js: steps.append(["eval", js])
shot = lambda f: steps.append(["shot", f"test/{pre}_{f}.png"])
E("""window.__errs = []; window.addEventListener('error', e => __errs.push(String(e.message) + ' @' + (e.filename || '').split('/').pop() + ':' + (e.lineno || ''))); 1""")
steps.append(["wait", 2500])
E("""new Promise(res => { const to = setTimeout(() => res('no frame in 120 s'), 120000); requestAnimationFrame(() => requestAnimationFrame(() => { clearTimeout(to); res(1); })); })""")
steps.append(["wait", 600]); steps.append(["click", "#startBtn"]); steps.append(["wait", 1500])
E(open(os.path.join(HERE, "chase_helpers.js")).read())
E("""window.__check = (name, ok, info) => JSON.stringify({ check: name, ok: !!ok, info, errs: __errs.slice(0, 3) });
window.__ptr = (type, x, y, id = 7) => { const tg = type === 'pointerdown' ? $('scene') : window; tg.dispatchEvent(new PointerEvent(type, { pointerId: id, pointerType: 'touch', isPrimary: true, bubbles: true, cancelable: true, clientX: x, clientY: y })); }; 1""")
E("""(async () => { await __go(120, () => !STATE.locked); STATE.misses = STATE.maxWrong - 1; MAN.pathIdx = TRAP_I; MAN.place(MAN_PATH[TRAP_I][0], MAN_PATH[TRAP_I][1], trapYaw()); GAL.rope.onNeck = true; EXEC.gripping = true; hud();
  const miss = [...'QZXJVKWYFBPGMHUDCLNRSTOIEA'].filter(c => !STATE.word.includes(c) && !STATE.guessed.has(c)); guess(miss[0]);
  const iv = setInterval(() => { if (!STATE.trap && STATE.locked) STATE.ts = 6; }, 10); await __go(4000, () => !$('sign').hidden); clearInterval(iv); await __go(10);
  document.querySelector('#sign .signMin').click(); await __go(2); const away = FREE.on && $('sign').hidden, phase = SIEGE.phase;
  const r = $('scene').getBoundingClientRect(); let s = swordScreen([0, 0, 0, 0, 0]); FREE.yaw = 0.4; await __go(40); FREE.yaw = 0; await __go(60); s = swordScreen([0, 0, 0, 0, 0]);
  const x = r.left + (s[0] + s[2]) / 2, y = r.top + (s[1] + s[3]) / 2; __ptr('pointerdown', x, y); __ptr('pointerup', x, y); await __go(400, () => SIEGE.phase === 'fight' && !SIEGE.run); __calm();
  return __check('the sign away: the sword still cuts him down', away && (phase === 'late' || phase === 'window') && s[4] && SIEGE.on && SIEGE.phase === 'fight' && !FREE.on && !__vis('signShow'), { away, phaseBefore: phase, onScreen: s[4], siege: SIEGE.on, phase: SIEGE.phase, free: FREE.on }); })()""")
shot("a_cut_down")
E("""(async () => { RUN.strikes = 99; await __shootBell(); await __lastOne(1); const C = CHASE; await __go(600, () => C.state === 'ride'); const sp = []; let next = 100;
  await __go(5000, () => { __auto(); if (C.s > next) { sp.push([Math.round(C.s), +C.speed.toFixed(1)]); next += 150; } return C.state !== 'ride'; });
  const top = Math.max(...sp.map(p => p[1])); return __check('the run: longer, and faster as it goes', C.courseEnd === RUN.first + 1000 && sp[0][1] < 20.5 && top > 23.8 && (C.state === 'turn' || C.state === 'combat'), { speeds: sp, rideTime: +C.stats.t.toFixed(1), state: C.state, bumps: C.stats.bumps }); })()""")
E("""JSON.stringify({ errs: __errs })""")
json.dump(steps, open("test/s141.json", "w"), indent=0)
print(len(steps), "steps")
