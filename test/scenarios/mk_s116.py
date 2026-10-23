# builds test/s116.json: how long after you come up from cover until a gunman's bullet hits you
# (every exposed shot is made to hit, so the time measured is the earliest you can be shot)
import json
steps = []
E = lambda js: steps.append(["eval", js])
E("""window.__errs = []; window.addEventListener('error', e => __errs.push(String(e.message) + ' @' + (e.lineno||''))); 1""")
steps.append(["click", "#startBtn"]); steps.append(["wait", 1500])
E("""window.__go = async (n, until) => { window.GULCH_PAUSE = true; const RF = window.renderFrame; window.renderFrame = () => {}; let t = performance.now(); last = t;
  try { for (let i = 0; i < n; i++) { t += 1000/60; tick(t); await null; await null; if (until && until()) break; } } finally { window.renderFrame = RF; } return 1; }; 1""")
E("""(async () => { STATE.misses = STATE.maxWrong - 1; STATE.hintShown = true; MAN.pathIdx = TRAP_I; MAN.place(MAN_PATH[TRAP_I][0], MAN_PATH[TRAP_I][1], trapYaw()); GAL.rope.onNeck = true; EXEC.gripping = true; hud();
  const miss = [...'QZXJVKWYFBPGMHUDCLNRSTOIEA'].filter(c => !STATE.word.includes(c)); guess(miss[0]);
  const iv = setInterval(() => { if (!STATE.trap && STATE.locked) STATE.ts = 6; }, 10); await __go(3000, () => SIEGE.phase === 'window'); clearInterval(iv); STATE.ts = 1; SIEGE.winEnd += 60000; await __go(4);
  startSiege(); await __go(900, () => SIEGE.phase === 'fight' && !SIEGE.run); SIEGE_CFG.hitUp = 1; return SIEGE.phase; })()""")
# A: a gunman is already taking aim when you come up (you pop up at different points in his count)
# B: nobody is aiming at the moment you come up
E("""(async () => { const S = SIEGE, res = { midAim: [], noneAiming: [] };
  const trial = async (kind, wait) => {
    S.holding = false; await __go(40); S.health = 5;
    if (kind === 'midAim') { await __go(900, () => S.enemies.some(E => E.alive && E.state === 'aim')); await __go(wait); }
    else { await __go(900, () => !S.enemies.some(E => E.alive && (E.state === 'aim' || E.state === 'recover')) && S.nextShot <= 0); }
    const t0 = S.t, h0 = S.health; S.holding = true; let hit = -1;
    await __go(400, () => S.health < h0); if (S.health < h0) hit = S.t - t0; // (sampled every tick)
    res[kind].push(+hit.toFixed(2)); S.health = 5; S.hurt = 0;
  };
  for (const w of [2, 12, 25, 40, 52, 58]) await trial('midAim', w);
  for (let k = 0; k < 4; k++) await trial('noneAiming', 0);
  const st = a => ({ fastest: Math.min(...a.filter(x => x >= 0)), slowest: Math.max(...a), all: a });
  return JSON.stringify({ midAim: st(res.midAim), noneAiming: st(res.noneAiming), errs: __errs }); })()""")
json.dump(steps, open("test/s116.json", "w"), indent=0)
