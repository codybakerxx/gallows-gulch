# builds test/s128.json: the thicker sword and its sheen and sparks while it can be taken; after the six seconds the GAME OVER sign comes
# up and the sword can still be tapped (through the sign's clear space) to cut him down; the streak he had comes back; the word goes in the
# Word Book once
import json
steps = []
E = lambda js: steps.append(["eval", js])
shot = lambda f: steps.append(["shot", f"test/g109_{f}.png"])
E("""window.__errs = []; window.addEventListener('error', e => __errs.push(String(e.message) + ' @' + (e.lineno||''))); 1""")
steps.append(["click", "#startBtn"]); steps.append(["wait", 1500])
E("""window.__go = async (n, until) => { window.GULCH_PAUSE = true; const RF = window.renderFrame; window.renderFrame = () => {}; let t = performance.now(); last = t;
  try { for (let i = 0; i < n; i++) { t += 1000/60; tick(t); await null; await null; if (until && until()) break; } } finally { window.renderFrame = RF; } t += 16.7; tick(t); return 1; };
window.__close = (pos, tgt, fov) => { const c = R.camera, p0 = c.position.clone(), q0 = c.quaternion.clone(), f0 = c.fov; c.position.copy(pos); c.lookAt(tgt); c.fov = fov; c.updateProjectionMatrix(); c.updateMatrixWorld(); renderFrame(T);
  window.__restore = () => { c.position.copy(p0); c.quaternion.copy(q0); c.fov = f0; c.updateProjectionMatrix(); }; return 1; };
1""")
# lose with a streak of 3 behind him; during the six seconds, a close look at the sword mid-sheen
E("""(async () => { STATE.streak = 3; const w = STATE.word; STATE.misses = STATE.maxWrong - 1; STATE.hintShown = true; MAN.pathIdx = TRAP_I; MAN.place(MAN_PATH[TRAP_I][0], MAN_PATH[TRAP_I][1], trapYaw()); GAL.rope.onNeck = true; EXEC.gripping = true; hud();
  const miss = [...'QZXJVKWYFBPGMHUDCLNRSTOIEA'].filter(c => !w.includes(c) && !STATE.guessed.has(c)); guess(miss[0]);
  const iv = setInterval(() => { if (!STATE.trap && STATE.locked) STATE.ts = 6; }, 10); await __go(3000, () => SIEGE.phase === 'window'); clearInterval(iv); STATE.ts = 1;
  const W = SIEGE.sword; await __go(200, () => W.shine.pos.value > 0.3 && W.shine.pos.value < 0.45 && W.sparks.some(p => p.t < 0.7));
  const out = { phase: SIEGE.phase, sheenK: W.shine.k.value, sheenPos: +W.shine.pos.value.toFixed(2), sparks: W.sparks.filter(p => p.s.visible).length, glint: W.glint.visible };
  const at = W.group.localToWorld(V3(0, 0.3, 0)); __close(at.clone().add(V3(0.55, 0.25, 0.75)), at, 40); return JSON.stringify(out); })()""")
shot("a_sword_close")
# the six seconds run out: GAME OVER, and the sword still shines
E("""(async () => { __restore(); SIEGE.winEnd = performance.now() - 1; await __go(2000, () => !document.getElementById('sign').hidden); await __go(30);
  const W = SIEGE.sword, s = swordScreen([0, 0, 0, 0, 0]), r = document.getElementById('scene').getBoundingClientRect();
  window.__tap = [r.left + (s[0] + s[2]) / 2, r.top + (s[1] + s[3]) / 2];
  return JSON.stringify({ phase: SIEGE.phase, sign: document.getElementById('signTitle').textContent, streak: STATE.streak, sheenK: W.shine.k.value, glint: W.glint.visible, tapAt: window.__tap.map(Math.round), signTop: Math.round(document.getElementById('signBoard').getBoundingClientRect().top), book: JSON.stringify(BOOK.words[STATE.word]) }); })()""")
shot("b_gameover_sword")
steps.append(["press", "window.__tap"]); steps.append(["release", ""])
E("""(async () => { await __go(5); const cut = { phase: SIEGE.phase, signHidden: document.getElementById('sign').hidden, streak: STATE.streak, sheenK: SIEGE.sword.shine.k.value };
  await __go(900, () => SIEGE.phase === 'fight' && !SIEGE.run); const S = SIEGE; for (const q of S.enemies) { q.state = 'pause'; q.t = 999; q.a.path = null; }
  for (const q of S.enemies.filter(q => q.alive)) shotHits(q, SIEGE_PARTS[2], q.a.ch.bones.Spine2.getWorldPosition(V3()), V3(0, 0, -1));
  siegeWin(); await __go(1500, () => !document.getElementById('sign').hidden);
  return JSON.stringify({ cut, sign: document.getElementById('signTitle').textContent, line: document.getElementById('signLine').textContent, streak: STATE.streak, book: BOOK.words[STATE.word], newNote: !document.getElementById('signNew').hidden, errs: __errs }); })()""")
json.dump(steps, open("test/s128.json", "w"), indent=0)
