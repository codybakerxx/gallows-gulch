# builds test/s120.json: v19 checks. Hiding is safe (no hit can land while you're down), running dry with one gunman left no longer kills
# you (you reload behind cover instead), the bullet number is gone from the top bar, the gunmen's taunts (who says what, the gap between
# them, the jaw, the bubble over the speaker), and the sword's six-second window holding back the game-over sign
import json, sys
pre = sys.argv[1] if len(sys.argv) > 1 else "g100"
steps = []
E = lambda js: steps.append(["eval", js])
shot = lambda f: steps.append(["shot", f"test/{pre}_{f}.png"])
E("""window.__errs = []; window.addEventListener('error', e => __errs.push(String(e.message) + ' @' + (e.lineno||''))); window.addEventListener('unhandledrejection', e => __errs.push('rej ' + String(e.reason && e.reason.stack || e.reason))); 1""")
steps.append(["click", "#startBtn"]); steps.append(["wait", 1500])
E("""window.__go = async (n, until) => { window.GULCH_PAUSE = true; const RF = window.renderFrame; window.renderFrame = () => {}; let t = performance.now(); last = t;
  try { for (let i = 0; i < n; i++) { t += 1000/60; tick(t); await null; await null; if (until && until()) break; } } finally { window.renderFrame = RF; } t += 16.7; tick(t); return 1; };
window.__aimAt = (E, part) => { const p = E.a.ch.bones[part || 'Spine2'].getWorldPosition(V3()), c = R.camera.position; SIEGE.yaw = Math.atan2(p.x - c.x, p.z - c.z); SIEGE.pitch = Math.atan2(p.y - c.y, Math.hypot(p.x - c.x, p.z - c.z)); };
window.__hang = async () => { STATE.misses = STATE.maxWrong - 1; STATE.hintShown = true; MAN.pathIdx = TRAP_I; MAN.place(MAN_PATH[TRAP_I][0], MAN_PATH[TRAP_I][1], trapYaw()); GAL.rope.onNeck = true; EXEC.gripping = true; hud();
  const miss = [...'QZXJVKWYFBPGMHUDCLNRSTOIEA'].filter(c => !STATE.word.includes(c) && !STATE.guessed.has(c)); guess(miss[0]);
  const iv = setInterval(() => { if (!STATE.trap && STATE.locked) STATE.ts = 6; }, 10); await __go(3000, () => SIEGE.phase === 'window'); clearInterval(iv); STATE.ts = 1; return 1; };
window.__siege = async () => { await __hang(); SIEGE.winEnd += 60000; await __go(4); startSiege(); await __go(900, () => SIEGE.phase === 'fight' && !SIEGE.run); await __go(5); return 1; };
window.__clips = []; const C0 = Sound.clip; Sound.clip = function (nm, ...a) { __clips.push(nm); return C0.call(this, nm, ...a); };
window.__calm = () => { for (const q of SIEGE.enemies) { if (q.alive) { q.state = 'pause'; q.t = 999; q.a.path = null; } } SIEGE.nextShot = 999; }; 1""")
# 1) into the fight: the top bar
E("""(async () => { await __siege(); const S = SIEGE;
  return JSON.stringify({ phase: S.phase, window: SIEGE_CFG.window, health: S.health, hearts: document.querySelectorAll('#hp svg').length, bullets: S.bullets,
    leftHidden: document.getElementById('left').hidden, leftShown: getComputedStyle(document.getElementById('left')).display, meta: document.getElementById('meta').textContent, gunTitle: document.getElementById('gun').title }); })()""")
shot("a_topbar")
# 2) down behind cover nothing can hit you, whatever fires at you; up, it can
E("""(async () => { const S = SIEGE; __calm(); SIEGE_CFG.hitUp = 1; SIEGE_CFG.hitRun = 1; S.holding = false; await __go(30); const h0 = S.health, out = {};
  for (let i = 0; i < 40; i++) for (const q of S.enemies) if (q.alive) { enemyFire(q); playerHit(q); }
  out.hidden = { before: h0, after: S.health, crouch: S.crouch, exposed: playerExposed() };
  const M = S.enemies.find(q => q.alive && inView(q)) || S.enemies.find(q => q.alive);
  S.holding = true; await __go(30); __aimAt(M); await __go(3); const h1 = S.health; enemyFire(M);
  out.up = { before: h1, after: S.health, exposed: playerExposed(), inView: inView(M, 1.0) };
  S.holding = false; await __go(1); const h2 = S.health; enemyFire(M); playerHit(M); out.letGo = { before: h2, after: S.health, exposed: playerExposed() };
  S.health = 3; S.hurt = 0; siegeHud(); SIEGE_CFG.hitUp = 0.5; SIEGE_CFG.hitRun = 0.3; await __go(60); return JSON.stringify(out); })()""")
# 3) taunts, called directly: who may say what, the gap, the jaw, the bubble
E("""(async () => { const S = SIEGE; __calm(); S.said.clear(); S.tauntT = 0; S.talkUntil = 0; STATE.bubble = null; __clips.length = 0; S.holding = true; await __go(20);
  const men = S.enemies.filter(q => tauntMan(q)), M = men.find(q => onScreen(q)) || men[0], W = S.enemies.find(q => q.alive && q.female), X = S.enemies.find(q => q.a === EXEC), out = {};
  __aimAt(M, 'Head'); await __go(4);
  out.womanTake = taunt('take', W); out.manTime = taunt('time', M);
  out.getaway = taunt('getaway', M); out.bubble = STATE.bubble && STATE.bubble.text; out.who = STATE.bubble && STATE.bubble.who && STATE.bubble.who.name; out.speaker = M.a.name; out.clips = __clips.slice();
  out.again = taunt('take', M); await __go(10); out.jaw = +M.a.ch.skin.userData.U.jaw.value.toFixed(3);
  const b = document.getElementById('bubble'), r = b.getBoundingClientRect(), h = M.a.ch.bones.Head.getWorldPosition(V3()).project(R.camera);
  out.bubbleBox = { shown: !b.hidden, cx: Math.round(r.left + r.width / 2), bottom: Math.round(r.bottom), headX: Math.round((h.x * 0.5 + 0.5) * R.w), headY: Math.round((-h.y * 0.5 + 0.5) * R.h), tail: b.style.getPropertyValue('--tail') };
  return JSON.stringify(out); })()""")
shot("b_taunt")
E("""(async () => { const S = SIEGE, out = {}; const men = S.enemies.filter(q => tauntMan(q)), M = men[0];
  await __go(120); out.jawAfter = +M.a.ch.skin.userData.U.jaw.value.toFixed(3); out.bubbleGone = !STATE.bubble;
  out.tooSoon = taunt('take', M); out.forced = taunt('take', M, true); out.repeat = (STATE.bubble = null, S.talkUntil = 0, taunt('getaway', M, true));
  // one heart left: "Any last words?", from the executioner while he stands
  await __go(90); STATE.bubble = null; S.talkUntil = 0; S.health = 2; S.holding = true; await __go(5); playerHit(S.enemies.find(q => q.alive));
  await __go(90); out.words = STATE.bubble && STATE.bubble.text; out.wordsWho = STATE.bubble && STATE.bubble.who && STATE.bubble.who.name; out.health = S.health;
  // stay down a while: "Come on out and fight!"
  S.health = 3; S.hurt = 0; siegeHud(); S.holding = false; await __go(150); STATE.bubble = null; S.talkUntil = 0; S.tauntT = 0;
  await __go(600, () => S.said.has('Come on out and fight!')); out.comeout = S.said.has('Come on out and fight!'); out.downT = +S.downT.toFixed(1);
  out.clips = __clips.filter(c => c.startsWith('taunt')); out.errs = __errs; return JSON.stringify(out); })()""")
# 4) the bug: one gunman left, your last round misses. Nothing happens to you; duck and you load up again
E("""(async () => { const S = SIEGE; __calm(); STATE.bubble = null; S.talkUntil = 0; const alive = S.enemies.filter(q => q.alive), last = alive.find(q => q.a === EXEC) || alive[alive.length - 1];
  for (const q of alive) if (q !== last) shotHits(q, SIEGE_PARTS[2], q.a.ch.bones.Spine2.getWorldPosition(V3()), V3(0, 0, -1));
  await __go(30); last.state = 'pause'; last.t = 0.5; S.nextShot = 0; // he's free to take aim and fire again as usual
  S.bullets = 1; S.holding = true; await __go(20); S.pitch = 0.5; S.yaw = S.covers[S.cover].yaw0 + 1.1; await __go(2); S.cool = 0; fireTap(); const afterShot = { bullets: S.bullets, phase: S.phase, alive: S.enemies.filter(q => q.alive).length };
  await __go(3); const tip = document.getElementById('siegeTip'); const tipText = tip.hidden ? null : tip.textContent;
  S.holding = false; const log = []; for (let k = 0; k < 8; k++) { await __go(30); log.push([+(k * 0.5 + 0.5).toFixed(1), S.bullets, S.health, S.phase]); }
  // and he's still there to shoot: up, and the round you just loaded takes him
  S.holding = true; await __go(30); __aimAt(last); await __go(2); S.cool = 0; fireTap(); await __go(5);
  return JSON.stringify({ afterShot, tipText, log, finalPhase: S.phase, health: S.health, errs: __errs }); })()""")
shot("c_after_last")
E("""(async () => { await __go(1200, () => !document.getElementById('sign').hidden); return JSON.stringify({ sign: document.getElementById('signTitle').textContent, line: document.getElementById('signLine').textContent, shots: SIEGE.shots, errs: __errs }); })()""")
shot("d_sign")
# 5) reloading: a round at a time from a moment after you duck; coming up stops it
E("""(async () => { document.getElementById('againBtn').click(); await __go(90); const left = { hidden: document.getElementById('left').hidden, text: document.getElementById('left').textContent, meta: document.getElementById('meta').textContent };
  await __siege(); const S = SIEGE; __calm(); S.holding = true; await __go(30); S.bullets = 0; siegeHud(); S.holding = false; const t = [];
  for (let k = 0; k < 9; k++) { await __go(6); t.push(S.bullets); } // every 0.1 s for 0.9 s
  S.holding = true; await __go(60); const up = S.bullets; S.holding = false; await __go(150); const full = S.bullets;
  return JSON.stringify({ afterReset: left, everyTenth: t, upAfterOneSec: up, after2_5sDown: full, cyl: document.querySelectorAll('#cyl circle[fill="#d8a246"]').length, errs: __errs }); })()""")
shot("e_reloaded")
# 6) a natural stretch of the fight with the player peeking on and off: every taunt is spaced out, none repeats
E("""(async () => { const S = SIEGE; for (const q of S.enemies) if (q.alive) { q.state = 'pause'; q.t = Math.random(); } S.nextShot = 0.5; SIEGE_CFG.hitUp = 0;
  const heard = [], seen = new Set(); let last = null;
  for (let k = 0; k < 40; k++) { S.holding = k % 3 !== 2; await __go(45); const b = STATE.bubble; if (b && b.who && b.text !== last) { heard.push([+S.t.toFixed(1), b.text, b.who.name]); } last = b && b.text; }
  const gaps = heard.slice(1).map((h, i) => +(h[0] - heard[i][0]).toFixed(1)); SIEGE_CFG.hitUp = 0.5;
  return JSON.stringify({ heard, gaps, t: +S.t.toFixed(1), errs: __errs }); })()""")
# 7) the sword's six seconds: the window is 6 s, and while it's open the game-over sign stays down
E("""(async () => { document.getElementById('againBtn').click(); await __go(90); await __hang(); const w = (SIEGE.winEnd - performance.now()) / 1000;
  SIEGE.winEnd = performance.now() + 600000; await __go(480); const during = { phase: SIEGE.phase, sign: !document.getElementById('sign').hidden };
  SIEGE.winEnd = performance.now() - 1; await __go(2); const closed = SIEGE.phase; await __go(120, () => !document.getElementById('sign').hidden);
  return JSON.stringify({ windowSecs: +w.toFixed(2), during, closed, signAfter: !document.getElementById('sign').hidden, title: document.getElementById('signTitle').textContent, errs: __errs }); })()""")
shot("f_lost")
json.dump(steps, open("test/s120.json", "w"), indent=0)
print(len(steps), "steps")
