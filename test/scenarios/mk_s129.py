# builds test/s129.json: from the moment he hangs (the sword starts to glint) to the GAME OVER sign: four seconds; the sword still works after
import json
steps = []
E = lambda js: steps.append(["eval", js])
shot = lambda f: steps.append(["shot", f"test/g110_{f}.png"])
E("""window.__errs = []; window.addEventListener('error', e => __errs.push(String(e.message) + ' @' + (e.lineno||''))); 1""")
steps.append(["click", "#startBtn"]); steps.append(["wait", 1500])
E("""window.__go = async (n, until) => { window.GULCH_PAUSE = true; const RF = window.renderFrame; window.renderFrame = () => {}; let t = performance.now(); last = t;
  try { for (let i = 0; i < n; i++) { t += 1000/60; tick(t); await null; await null; if (until && until()) break; } } finally { window.renderFrame = RF; } t += 16.7; tick(t); return 1; };
1""")
E("""(async () => { const out = [];
  for (let k = 0; k < 2; k++) { if (k) { document.getElementById('againBtn').click(); await __go(120); }
    const w = STATE.word; STATE.misses = STATE.maxWrong - 1; STATE.hintShown = true; MAN.pathIdx = TRAP_I; MAN.place(MAN_PATH[TRAP_I][0], MAN_PATH[TRAP_I][1], trapYaw()); GAL.rope.onNeck = true; EXEC.gripping = true; hud();
    const miss = [...'QZXJVKWYFBPGMHUDCLNRSTOIEA'].filter(c => !w.includes(c) && !STATE.guessed.has(c)); guess(miss[0]);
    let frames = 0, opened = -1, shown = -1, lateAt = -1;
    await __go(4000, () => { frames++; if (opened < 0 && SIEGE.phase === 'window') opened = frames; if (lateAt < 0 && SIEGE.phase === 'late') lateAt = frames; if (shown < 0 && !document.getElementById('sign').hidden) shown = frames; return shown > 0; });
    out.push({ fromHangToSign: +((shown - opened) / 60).toFixed(2), fromHangToLate: +((lateAt - opened) / 60).toFixed(2), phaseAfter: SIEGE.phase }); }
  return JSON.stringify({ out, errs: __errs }); })()""")
shot("a_sign")
json.dump(steps, open("test/s129.json", "w"), indent=0)
