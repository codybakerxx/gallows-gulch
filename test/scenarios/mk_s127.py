# builds test/s127.json: v24 check. Nine bullets: the fight starts with nine in the cylinder at the top left, all loaded
# (the rest of the v21 checks are in mk_s125.py)
import json, sys
pre = "g108"
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
  startSiege(); await __go(900, () => SIEGE.phase === 'fight' && !SIEGE.run); await __go(5); return 1; };
window.__calm = () => { for (const q of SIEGE.enemies) if (q.alive) { q.state = 'pause'; q.t = 999; q.a.path = null; } SIEGE.nextShot = 999; };
window.__hearts = () => ({ health: SIEGE.health, gone: document.querySelectorAll('#hp svg.gone').length, lost: document.querySelectorAll('#hp svg.lost').length, n: document.querySelectorAll('#hp svg').length });
window.__miss = async () => { const S = SIEGE; S.holding = true; await __go(16); S.pitch = 0.5; S.yaw = S.covers[S.cover].yaw0 + 1.1; await __go(2); S.cool = 0; fireTap(); await __go(3); };
1""")
E("""(async () => { await __siege(); const S = SIEGE; __calm(); const start = { bullets: S.bullets, chambers: document.querySelectorAll('#cyl g circle[stroke="#6b5a45"]').length, loaded: document.querySelectorAll('#cyl circle[fill="#d8a246"]').length };
  await __go(330); const tip2 = document.getElementById('siegeTip').hidden ? null : document.getElementById('siegeTip').textContent;
  return JSON.stringify({ start, tip2, errs: __errs }); })()""")
shot("a_nine")
E("""(async () => { const S = SIEGE; __calm(); SIEGE_CFG.hitUp = 0; await __miss(); await __miss(); const afterMisses = S.bullets; const log = [];
  for (let round = 0; round < 14 && S.enemies.some(q => q.alive); round++) { const E = S.enemies.find(q => q.alive); let ci = -1; S.occ = null;
    for (let i = 0; i < 3; i++) { const C = S.covers[i], eye = V3(C.stand.x, SIEGE_CFG.eye, C.stand.z).addScaledVector(C.side, 0.08), p = E.a.ch.bones.Spine2.getWorldPosition(V3()), d = V3().subVectors(p, eye), L = d.length(), y = Math.atan2(p.x - eye.x, p.z - eye.z); let dy = ((y - C.yaw0 + Math.PI) % TAU + TAU) % TAU - Math.PI; if (!sceneryRay(eye, d.normalize(), L) && Math.abs(dy) <= SIEGE_CFG.yawLim) { ci = i; if (i === S.cover) break; } }
    if (ci < 0) { const sp = E.spots[E.i ^ 1]; E.i ^= 1; E.a.place(sp[0], sp[1], E.a.yaw); continue; }
    S.cover = ci; S.run = null; S.holding = true; await __go(14); for (let k = 0; k < 3; k++) { __aimAt(E, 'Spine2'); await __go(1); } S.cool = 0; fireTap(); log.push(E.a.name + ':' + (E.alive ? 'MISS' : 'hit')); await __go(10); }
  S.holding = false; SIEGE_CFG.hitUp = 0.5; await __go(1500, () => !document.getElementById('sign').hidden);
  return JSON.stringify({ afterMisses, log, bulletsLeft: S.bullets, shots: S.shots, sign: document.getElementById('signTitle').textContent, line: document.getElementById('signLine').textContent, errs: __errs }); })()""")
json.dump(steps, open("test/s127.json", "w"), indent=0)
