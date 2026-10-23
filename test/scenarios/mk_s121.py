# builds test/s121.json: a whole fight played the way a person plays it (peek, aim at someone, fire, mostly hit, duck, reload, switch
# cover when nobody's in sight), logging every taunt heard: when, what, who. Checks the spacing and that nothing repeats.
import json, sys
pre = sys.argv[1] if len(sys.argv) > 1 else "g101"
steps = []
E = lambda js: steps.append(["eval", js])
shot = lambda f: steps.append(["shot", f"test/{pre}_{f}.png"])
E("""window.__errs = []; window.addEventListener('error', e => __errs.push(String(e.message) + ' @' + (e.lineno||''))); window.addEventListener('unhandledrejection', e => __errs.push('rej ' + String(e.reason && e.reason.stack || e.reason))); 1""")
steps.append(["click", "#startBtn"]); steps.append(["wait", 1500])
E("""window.__go = async (n, until) => { window.GULCH_PAUSE = true; const RF = window.renderFrame; window.renderFrame = () => {}; let t = performance.now(); last = t;
  try { for (let i = 0; i < n; i++) { t += 1000/60; tick(t); await null; await null; if (until && until()) break; } } finally { window.renderFrame = RF; } t += 16.7; tick(t); return 1; };
window.__aimAt = (E, part) => { const p = E.a.ch.bones[part || 'Spine2'].getWorldPosition(V3()), c = R.camera.position; SIEGE.yaw = Math.atan2(p.x - c.x, p.z - c.z); SIEGE.pitch = Math.atan2(p.y - c.y, Math.hypot(p.x - c.x, p.z - c.z)); };
window.__siege = async () => { STATE.misses = STATE.maxWrong - 1; STATE.hintShown = true; MAN.pathIdx = TRAP_I; MAN.place(MAN_PATH[TRAP_I][0], MAN_PATH[TRAP_I][1], trapYaw()); GAL.rope.onNeck = true; EXEC.gripping = true; hud();
  const miss = [...'QZXJVKWYFBPGMHUDCLNRSTOIEA'].filter(c => !STATE.word.includes(c) && !STATE.guessed.has(c)); guess(miss[0]);
  const iv = setInterval(() => { if (!STATE.trap && STATE.locked) STATE.ts = 6; }, 10); await __go(3000, () => SIEGE.phase === 'window'); clearInterval(iv); STATE.ts = 1; SIEGE.winEnd += 60000; await __go(4);
  startSiege(); return 1; }; 1""")
E("""(async () => { await __siege(); const S = SIEGE, heard = [], t0 = S.t; let lastText = null, peeks = 0, blind = 0, hits = 0, misses = 0, minHealth = 3;
  const sample = () => { const b = STATE.bubble; if (b && b.text !== lastText) heard.push([+(S.t - t0).toFixed(1), b.text, b.who ? b.who.name : 'host']); lastText = b ? b.text : null; minHealth = Math.min(minHealth, S.health); if (S.health <= 1) SIEGE_CFG.hitUp = 0; };
  const go = async n => { await __go(n, () => { sample(); return S.phase !== 'fight' && S.phase !== 'cut'; }); }; // (sampled every tick, drawn once at the end)
  await go(200);
  for (let k = 0; k < 80 && S.phase === 'fight'; k++) {
    const alive = S.enemies.filter(q => q.alive); if (!alive.length) break;
    S.holding = true; await go(40); // up, and the 1.2 s grace runs while he finds someone
    const vis = alive.filter(q => inView(q, 0.9)); const tgt = vis[0] || alive[k % alive.length];
    __aimAt(tgt); await go(20);
    if (inView(tgt, 1.0) && S.bullets > 0) { const off = Math.random() > 0.75; if (off) S.pitch += 0.25; await go(1); S.cool = 0; fireTap(); if (tgt.alive) misses++; else hits++; blind = 0; }
    else if (++blind >= 2) { S.cover = (S.cover + 1) % 3; S.yaw = S.covers[S.cover].yaw0; blind = 0; }
    S.holding = false; await go(50 + (k % 5 === 4 ? 520 : 0)); peeks++; } // now and then he stays down a good while
  await go(300);
  const gaps = heard.filter(h => h[2] !== 'host').map(h => h[0]).map((t, i, a) => i ? +(t - a[i - 1]).toFixed(1) : null).slice(1);
  return JSON.stringify({ phase: S.phase, peeks, hits, misses, minHealth, aims: S.aims, heard, gaps, said: [...S.said], errs: __errs }); })()""")
shot("a_end")
json.dump(steps, open("test/s121.json", "w"), indent=0)
print(len(steps), "steps")
