# builds test/s146.json: v52. Once a round's over, the bottom panel (the letters, or the shootout's aim | fire pad) is gone and the view
# fills the screen, for each way a round ends:
#   - the word missed: GAME OVER, then put away to look round; a revolver taken up from the barrel brings the pad back, put back it goes
#     again; Play Again brings the letters back
#   - the word guessed: YOU SAVED HIM
#   - the shootout: Done, then YOU SURVIVED; shot dead, then GAME OVER
#   - the getaway's results; a retry brings the panel back
# Prints one JSON line per check; "ok" is true when it passed.
import json, os, sys
pre = sys.argv[1] if len(sys.argv) > 1 else "g146"
HERE = os.path.dirname(os.path.abspath(__file__))
steps = []
E = lambda js: steps.append(["eval", js])
shot = lambda f: steps.append(["shot", f"test/{pre}_{f}.png"])
E("""window.__errs = []; window.addEventListener('error', e => __errs.push(String(e.message) + ' @' + (e.filename || '').split('/').pop() + ':' + (e.lineno || ''))); window.addEventListener('unhandledrejection', e => __errs.push('rej ' + String(e.reason && e.reason.stack || e.reason))); 1""")
steps.append(["wait", 2500]) # (and the page drawing again before the click: under SwiftShader at desktop size the first frames behind the menu can take a while)
E("""new Promise(res => { const to = setTimeout(() => res('no frame in 120 s'), 120000); requestAnimationFrame(() => requestAnimationFrame(() => { clearTimeout(to); res(1); })); })""")
steps.append(["wait", 600]); steps.append(["click", "#startBtn"]); steps.append(["wait", 1500])
E(open(os.path.join(HERE, "chase_helpers.js")).read())
E("""window.__check = (name, ok, info) => JSON.stringify({ check: name, ok: !!ok, info, errs: __errs.slice(0, 3) }); 1""")
E("""window.__panel = () => { const kb = $('kb'), st = $('stage').getBoundingClientRect(), app = $('app').getBoundingClientRect(), shown = getComputedStyle(kb).display !== 'none';
  return { over: $('app').classList.contains('over'), shown, kbH: Math.round(kb.getBoundingClientRect().height), stageH: Math.round(st.height), appH: Math.round(app.height), full: Math.abs(st.height - app.height) < 2 }; };
  window.__gone = p => !p.shown && p.over && p.full; window.__back = p => p.shown && !p.over && p.kbH > 60 && p.stageH < p.appH - 60; 1""")
E("""(async () => { await __go(200, () => !STATE.locked); const before = __panel(); STATE.over = true; showSign(false); await __go(3); const sign = __panel();
  signMinimize($('sign')); await __go(3); const away = __panel();
  return __check('the word missed: no panel under GAME OVER, nor with the sign put away', __back(before) && __gone(sign) && __gone(away), { before, sign, away }); })()""")
shot("a_game_over_away")
E("""(async () => { armedStart(); await __go(120, () => ARMED.on && !ARMED.lift); await __go(5); const armed = __panel(), padUp = !$('pad').hidden, lift = !!ARMED.lift; armedPutBack(); await __go(120, () => !ARMED.on); await __go(3); const back = __panel(), signUp = !$('sign').hidden;
  return __check('a revolver taken up from the barrel brings the pad back; put back, it goes again', ARMED.on === false && __back(armed) && padUp && __gone(back) && signUp, { armed, padUp, lift, back, signUp, on: ARMED.on }); })()""")
E("""(async () => { $('againBtn').click(); await __go(60); const p = __panel(), keys = document.querySelectorAll('#kb .key').length, vis = getComputedStyle(document.querySelector('#kb .krow')).visibility;
  return __check('Play Again: the letters back', __back(p) && keys >= 26 && vis === 'visible', { p, keys, vis }); })()""")
E("""(async () => { await __go(200, () => !STATE.locked); STATE.over = true; showSign(true); await __go(3); const p = __panel(); $('againBtn').click(); await __go(60); const q = __panel();
  return __check('the word guessed: no panel under YOU SAVED HIM', __gone(p) && __back(q), { p, q }); })()""")
E("""(async () => { await __go(200, () => !STATE.locked); await __siege(); await __go(400, () => SIEGE.phase === 'fight'); const fight = __panel(), pad = !$('pad').hidden;
  SIEGE.phase = 'cleared'; finishCleared(); await __go(3); const won = __panel(); await __go(200, () => !$('sign').hidden); const sign = __panel(), title = $('signTitle').textContent;
  return __check('the shootout won: the pad while fighting; gone after Done and under YOU SURVIVED', __back(fight) && pad && __gone(won) && __gone(sign) && title === 'YOU SURVIVED', { fight, pad, won, sign, title }); })()""")
shot("b_survived")
E("""(async () => { $('againBtn').click(); await __go(200, () => !STATE.locked); await __siege(); await __go(400, () => SIEGE.phase === 'fight'); const fight = __panel();
  siegeDie(); await __go(3); const dead = __panel(); await __go(400, () => !$('sign').hidden); const sign = __panel(), title = $('signTitle').textContent;
  return __check('the shootout lost: gone once shot dead and under GAME OVER', __back(fight) && __gone(dead) && __gone(sign) && title === 'GAME OVER', { fight, dead, sign, title }); })()""")
E("""(async () => { $('againBtn').click(); await __go(200, () => !STATE.locked); await __siege(); startGetaway(); await __go(600, () => CHASE.state === 'ride');
  CHASE.state = 'victory'; chaseResults(true); await __go(30); const res = __panel(); signMinimize($('chaseRes')); await __go(3); const away = __panel(); $('signShow').click(); await __go(3);
  chaseRetry(); await __go(5); const retry = __panel();
  return __check("the getaway's results: no panel; a retry brings it back", __gone(res) && __gone(away) && !retry.over, { res, away, retry }); })()""")
shot("c_after_retry")
E("""JSON.stringify({ errs: __errs })""")
json.dump(steps, open("test/s146.json", "w"), indent=0)
