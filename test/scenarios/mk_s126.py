# builds test/s126.json: the menu's big button reads Ride Out on first opening, Restart mid-game (the shootout too), Try Again after a
# loss and Play Again after a win; the end sign's button the same
import json
steps = []
E = lambda js: steps.append(["eval", js])
shot = lambda f: steps.append(["shot", f"test/g107_{f}.png"])
E("""window.__errs = []; window.addEventListener('error', e => __errs.push(String(e.message))); JSON.stringify({ first: document.getElementById('startBtn').textContent })""")
steps.append(["click", "#startBtn"]); steps.append(["wait", 1500])
E("""window.__go = async (n, until) => { window.GULCH_PAUSE = true; const RF = window.renderFrame; window.renderFrame = () => {}; let t = performance.now(); last = t;
  try { for (let i = 0; i < n; i++) { t += 1000/60; tick(t); await null; await null; if (until && until()) break; } } finally { window.renderFrame = RF; } t += 16.7; tick(t); return 1; };
window.__btn = () => ({ start: document.getElementById('startBtn').textContent, resume: !document.getElementById('resumeBtn').hidden });
window.__lose = async () => { const w = STATE.word; STATE.misses = STATE.maxWrong - 1; STATE.hintShown = true; MAN.pathIdx = TRAP_I; MAN.place(MAN_PATH[TRAP_I][0], MAN_PATH[TRAP_I][1], trapYaw()); GAL.rope.onNeck = true; EXEC.gripping = true; hud();
  const miss = [...'QZXJVKWYFBPGMHUDCLNRSTOIEA'].filter(c => !w.includes(c) && !STATE.guessed.has(c)); guess(miss[0]);
  const iv = setInterval(() => { if (!STATE.trap && STATE.locked) STATE.ts = 6; }, 10); await __go(3000, () => SIEGE.phase === 'window'); clearInterval(iv); STATE.ts = 1; };
1""")
E("""(async () => { await __go(60); document.getElementById('menuBtn').click(); await __go(2); const mid = __btn(); document.getElementById('resumeBtn').click(); await __go(2);
  const letters = [...new Set(STATE.word)]; for (const c of letters) { await __go(900, () => !STATE.locked); guess(c); } await __go(4000, () => !document.getElementById('sign').hidden);
  const winSign = document.getElementById('againBtn').textContent; document.getElementById('setBtn').click(); await __go(2); const afterWin = __btn();
  return JSON.stringify({ mid, winSign, afterWin, errs: __errs }); })()""")
shot("a_menu_after_win")
E("""(async () => { document.getElementById('startBtn').click(); await __go(120); await __lose(); SIEGE.winEnd = performance.now() - 1; await __go(2000, () => !document.getElementById('sign').hidden); await __go(20);
  const loseSign = document.getElementById('againBtn').textContent; document.getElementById('setBtn').click(); await __go(2); const afterLoss = __btn();
  return JSON.stringify({ loseSign, afterLoss, errs: __errs }); })()""")
shot("b_menu_after_loss")
E("""(async () => { document.getElementById('startBtn').click(); await __go(120); await __lose(); SIEGE.winEnd += 60000; await __go(4); startSiege(); await __go(900, () => SIEGE.phase === 'fight' && !SIEGE.run);
  document.getElementById('menuBtn').click(); await __go(2); const inFight = __btn(); document.getElementById('resumeBtn').click(); await __go(2);
  SIEGE.health = 1; SIEGE.holding = true; await __go(30); playerHit(SIEGE.enemies.find(q => q.alive), true); await __go(1200, () => !document.getElementById('sign').hidden);
  const deadSign = document.getElementById('againBtn').textContent; document.getElementById('menuBtn').click(); await __go(2); const afterDeath = __btn();
  return JSON.stringify({ inFight, deadSign, afterDeath, errs: __errs }); })()""")
shot("c_menu_after_death")
json.dump(steps, open("test/s126.json", "w"), indent=0)
