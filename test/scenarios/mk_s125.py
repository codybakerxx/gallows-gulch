# builds test/s125.json: v21 checks. Seven bullets and no reloading; hiding is safe while you still have one; a hit breaks a heart in
# the top bar and says what's left; running dry with gunmen standing brings "Out of bullets", a word from one of them, and a heart lost
# per shot till you're down; seven for seven still wins; the second tip
import json, sys
pre = sys.argv[1] if len(sys.argv) > 1 else "g106"
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
# 1) the tips, then no reloading: two shots spent, three seconds down behind cover, still five
E("""(async () => { await __siege(); const S = SIEGE; __calm(); const tip1 = document.getElementById('siegeTip').textContent;
  await __go(330); const tip2 = document.getElementById('siegeTip').hidden ? null : document.getElementById('siegeTip').textContent;
  await __miss(); await __miss(); const spent = S.bullets; S.holding = false; await __go(180); const after = S.bullets;
  return JSON.stringify({ tip1, tip2, spent, afterThreeSecondsDown: after, cyl: document.querySelectorAll('#cyl circle[fill="#d8a246"]').length, hearts: __hearts(), errs: __errs }); })()""")
# 2) hiding is safe while you've a bullet; up, a hit breaks a heart and says what's left
E("""(async () => { const S = SIEGE; __calm(); SIEGE_CFG.hitUp = 1; S.holding = false; await __go(20); const h0 = S.health;
  for (let i = 0; i < 20; i++) for (const q of S.enemies) if (q.alive) { enemyFire(q); playerHit(q); } const hidden = { before: h0, after: S.health };
  const M = S.enemies.find(q => q.alive && inView(q, 0.9)) || S.enemies.find(q => q.alive); S.holding = true; await __go(30); __aimAt(M); await __go(2); enemyFire(M); await __go(6);
  const hit = { hearts: __hearts(), banner: document.getElementById('hitMsg').hidden ? null : document.getElementById('hitMsg').textContent };
  SIEGE_CFG.hitUp = 0.5; return JSON.stringify({ hidden, hit, errs: __errs }); })()""")
shot("a_hit")
E("""(async () => { await __go(150); return JSON.stringify({ bannerGone: document.getElementById('hitMsg').hidden, hearts: __hearts() }); })()""")
# 3) run dry with two of them standing: "Out of bullets", one of them speaks, and a heart goes with each shot till you're down
E("""(async () => { const S = SIEGE; __calm(); S.health = 3; S.hurt = 0; siegeHud(); await __go(30); const alive = S.enemies.filter(q => q.alive), keep = [alive.find(q => q.a === EXEC), alive.find(q => q.a !== EXEC && !q.female)].filter(Boolean);
  for (const q of alive) if (!keep.includes(q)) shotHits(q, SIEGE_PARTS[2], q.a.ch.bones.Spine2.getWorldPosition(V3()), V3(0, 0, -1));
  await __go(30); STATE.bubble = null; S.talkUntil = 0; S.bullets = 1; siegeHud(); S.holding = false; await __go(10); // he's behind cover when it happens
  await __miss(); S.holding = false; const t0 = S.t, log = [];
  const doom = { phase: S.phase, banner: document.getElementById('doomMsg').hidden ? null : document.getElementById('doomMsg').innerText.replace(/\\n/g, ' / ') };
  let said = null; await __go(400, () => { if (!said && STATE.bubble && STATE.bubble.who) said = [STATE.bubble.text, STATE.bubble.who.name, +(S.t - t0).toFixed(2)];
    if (!log.length || log[log.length - 1][1] !== S.health) log.push([+(S.t - t0).toFixed(2), S.health, document.querySelectorAll('#hp svg.gone').length, document.getElementById('hitMsg').hidden ? null : document.getElementById('hitMsg').textContent]);
    return S.phase === 'dead'; }); // (sampled every tick, drawn once at the end)
  const dry = (S.cool = 0, fireTap(), S.bullets);
  return JSON.stringify({ doom, said, log, phase: S.phase, dryFire: dry, errs: __errs }); })()""")
shot("b_doomed")
E("""(async () => { await __go(1200, () => !document.getElementById('sign').hidden); return JSON.stringify({ sign: document.getElementById('signTitle').textContent, line: document.getElementById('signLine').textContent, doomShown: !document.getElementById('doomMsg').hidden, errs: __errs }); })()""")
# 4) seven for seven still wins (each shot aimed square at whoever's in sight)
E("""(async () => { document.getElementById('againBtn').click(); await __go(90); await __siege(); const S = SIEGE; __calm(); SIEGE_CFG.hitUp = 0; const log = [];
  for (let round = 0; round < 12 && S.enemies.some(q => q.alive); round++) { const E = S.enemies.find(q => q.alive); let ci = -1; S.occ = null;
    for (let i = 0; i < 3; i++) { const C = S.covers[i], eye = V3(C.stand.x, SIEGE_CFG.eye, C.stand.z).addScaledVector(C.side, 0.08), p = E.a.ch.bones.Spine2.getWorldPosition(V3()), d = V3().subVectors(p, eye), L = d.length(), y = Math.atan2(p.x - eye.x, p.z - eye.z); let dy = ((y - C.yaw0 + Math.PI) % TAU + TAU) % TAU - Math.PI; if (!sceneryRay(eye, d.normalize(), L) && Math.abs(dy) <= SIEGE_CFG.yawLim) { ci = i; if (i === S.cover) break; } }
    if (ci < 0) { const sp = E.spots[E.i ^ 1]; E.i ^= 1; E.a.place(sp[0], sp[1], E.a.yaw); continue; }
    S.cover = ci; S.run = null; S.holding = true; await __go(14); for (let k = 0; k < 3; k++) { __aimAt(E, 'Spine2'); await __go(1); } S.cool = 0; fireTap(); log.push(E.a.name + ':' + (E.alive ? 'MISS' : 'hit')); await __go(10); }
  S.holding = false; SIEGE_CFG.hitUp = 0.5; await __go(1500, () => !document.getElementById('sign').hidden);
  return JSON.stringify({ log, bullets: S.bullets, sign: document.getElementById('signTitle').textContent, line: document.getElementById('signLine').textContent, errs: __errs }); })()""")
json.dump(steps, open("test/s125.json", "w"), indent=0)
print(len(steps), "steps")
