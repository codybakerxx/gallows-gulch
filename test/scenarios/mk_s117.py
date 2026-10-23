# builds test/s117.json: three hearts; after the cut the hanged man is you (his body and noose gone, you get up from the ground and run
# for the crates); the win seen through his eyes; the reset brings him back; then a death and its line
import json, sys
pre = sys.argv[1] if len(sys.argv) > 1 else "g98"
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
E("""(async () => { await __siege(); await __go(600, () => SIEGE.run && SIEGE.run.look); await __go(2); const S = SIEGE;
  return JSON.stringify({ man: MAN.root.visible, knot: GAL.rope.knot.visible, low: GAL.rope.tube2 ? GAL.rope.tube2.mesh.visible : null, tie: MAN.tie ? MAN.tie.visible : null, cam: R.camera.position.toArray().map(q => +q.toFixed(2)) }); })()""")
shot("a_getup")
E("""(async () => { await __go(30); return R.camera.position.toArray().map(q => +q.toFixed(2)).join(','); })()""")
shot("b_run")
E("""(async () => { await __go(30); return R.camera.position.toArray().map(q => +q.toFixed(2)).join(','); })()""")
shot("c_run2")
E("""(async () => { await __go(400, () => SIEGE.phase === 'fight' && !SIEGE.run); await __go(10); const S = SIEGE; return JSON.stringify({ phase: S.phase, health: S.health, hearts: document.querySelectorAll('#hp svg').length, man: MAN.root.visible }); })()""")
shot("d_cover")
# win
E("""(async () => { const S = SIEGE; SIEGE_CFG.hitUp = 0; for (const q of S.enemies) { q.state = 'pause'; q.t = 999; q.a.path = null; } const log = [];
  for (let round = 0; round < 9; round++) { const E = S.enemies.find(q => q.alive); if (!E) break; await __go(3); let ci = -1; S.occ = null;
    for (let i = 0; i < 3; i++) { const C = S.covers[i], eye = V3(C.stand.x, SIEGE_CFG.eye, C.stand.z).addScaledVector(C.side, 0.08), p = E.a.ch.bones.Spine2.getWorldPosition(V3()), d = V3().subVectors(p, eye), L = d.length(), y = Math.atan2(p.x - eye.x, p.z - eye.z); let dy = ((y - C.yaw0 + Math.PI) % TAU + TAU) % TAU - Math.PI; if (!sceneryRay(eye, d.normalize(), L) && Math.abs(dy) <= SIEGE_CFG.yawLim) { ci = i; if (i === S.cover) break; } }
    if (ci < 0) { const sp = E.spots[E.i ^ 1]; E.i ^= 1; E.a.place(sp[0], sp[1], E.a.yaw); continue; }
    S.cover = ci; S.run = null; S.holding = true; await __go(14); for (let k = 0; k < 3; k++) { __aimAt(E, 'Spine2'); await __go(1); } S.cool = 0; fireTap(); log.push(E.a.name + ':' + (E.alive ? 'MISS' : 'hit')); await __go(10); }
  S.holding = false; await __go(900, () => CAM.to && CAM.t > 0.95); await __go(30); return JSON.stringify({ log, phase: S.phase, man: MAN.root.visible, bubble: STATE.bubble && STATE.bubble.text }); })()""")
shot("e_win_view")
E("""(async () => { await __go(1200, () => !document.getElementById('sign').hidden); return JSON.stringify({ sign: document.getElementById('signTitle').textContent, line: document.getElementById('signLine').textContent, streak: STATE.streak, errs: __errs }); })()""")
shot("f_sign")
E("""(async () => { document.getElementById('againBtn').click(); await __go(90); return JSON.stringify({ man: MAN.root.visible, knot: GAL.rope.knot.visible, low: GAL.rope.tube2 ? GAL.rope.tube2.mesh.visible : null, tie: MAN.tie ? MAN.tie.visible : null, cut: GAL.rope.sim.cut, errs: __errs }); })()""")
shot("g_reset")
# and a death: out of bullets
E("""(async () => { await __siege(); await __go(900, () => SIEGE.phase === 'fight' && !SIEGE.run); const S = SIEGE; const health = S.health;
  for (let k = 0; k < 7; k++) { S.holding = true; await __go(16); S.pitch = 0.5; S.yaw = S.covers[S.cover].yaw0 + 1.1; await __go(2); S.cool = 0; fireTap(); await __go(3); }
  await __go(1500, () => !document.getElementById('sign').hidden);
  return JSON.stringify({ startHealth: health, sign: document.getElementById('signTitle').textContent, line: document.getElementById('signLine').textContent, said: STATE.bubble && STATE.bubble.text, errs: __errs }); })()""")
shot("h_dead")
json.dump(steps, open("test/s117.json", "w"), indent=0)
