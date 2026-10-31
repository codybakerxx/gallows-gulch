# Builds test/screens_phone.json and test/screens_wide.json: the README screenshots, played through for real.
#   python3 test/scenarios/screens.py
#   DPR=2 python3 test/play.py 390 844 test/screens_phone.json 0.05 high
#   python3 test/play.py 1280 720 test/screens_wide.json 0.05 high
#   DPR=2 python3 test/play.py 390 844 test/screens_getaway.json 0.05 high
# Phone: the title menu; a round under way; a solved word with its meaning; the sword glinting at the gallows; the shootout; the rooftop
# gunmen and the red arc; GAME OVER; the Word Book holding the words from those rounds. Wide: a round on a landscape screen. Getaway (phone):
# the ride, the fight, the cliff.
import json

OUT = "docs/screenshots"
GO = """window.__go = async (n, until) => { window.GULCH_PAUSE = true; const RF = window.renderFrame; window.renderFrame = () => {}; let t = performance.now(); last = t;
  try { for (let i = 0; i < n; i++) { t += 1000/60; tick(t); await null; await null; if (until && until()) break; } } finally { window.renderFrame = RF; } t += 16.7; tick(t); return 1; };
window.__wrong = n => [...'QZXJVKWYFBPGMHUDCLNRSTOIEA'].filter(c => !STATE.word.includes(c) && !STATE.guessed.has(c)).slice(0, n);
window.__right = () => [...new Set(STATE.word)].filter(c => !STATE.guessed.has(c));
window.__guess = async c => { await __go(1200, () => !STATE.locked); guess(c); };
window.__solve = async () => { for (const c of __right()) await __guess(c); await __go(4000, () => !document.getElementById('sign').hidden); };
window.__toRope = async () => { STATE.misses = STATE.maxWrong - 1; STATE.hintShown = true; MAN.pathIdx = TRAP_I; MAN.place(MAN_PATH[TRAP_I][0], MAN_PATH[TRAP_I][1], trapYaw());
  GAL.rope.onNeck = true; EXEC.gripping = true; hud(); await __guess(__wrong(1)[0]);
  const iv = setInterval(() => { if (!STATE.trap && STATE.locked) STATE.ts = 6; }, 10); await __go(3000, () => SIEGE.phase === 'window'); clearInterval(iv); STATE.ts = 1; };
window.__aimAt = (E, part) => { const p = E.a.ch.bones[part || 'Spine2'].getWorldPosition(V3()), c = R.camera.position; SIEGE.yaw = Math.atan2(p.x - c.x, p.z - c.z); SIEGE.pitch = Math.atan2(p.y - c.y, Math.hypot(p.x - c.x, p.z - c.z)); };
window.__errs = []; window.addEventListener('error', e => __errs.push(String(e.message)));
1"""

# a round under way: two wrong, two right; once the last one has played out, the host's line is up and the board is clear
ROUND = """(async () => { await __go(600, () => !STATE.locked); const r = __right(), w = __wrong(2);
  await __guess(w[0]); await __guess(r[0]); await __guess(w[1]); await __guess(r[1]);
  await __go(1500, () => !STATE.locked && STATE.bubble); await __go(20);
  return JSON.stringify({ word: STATE.word, guessed: [...STATE.guessed].join(''), locked: STATE.locked, bubble: STATE.bubble && STATE.bubble.text, errs: __errs }); })()"""


FRAMES = "new Promise(res => { const to = setTimeout(() => res('no frame in 120 s'), 120000); requestAnimationFrame(() => requestAnimationFrame(() => { clearTimeout(to); res(1); })); })"
def phone():
    steps = []
    E = lambda js: steps.append(["eval", js])
    shot = lambda f: steps.append(["shot", f"{OUT}/{f}.png"])
    steps.append(["wait", 2500])
    shot("01-title")
    steps.append(["eval", FRAMES]); steps.append(["wait", 600])  # (the page drawing again first: under SwiftShader the first frames behind the menu can hold a click up)
    steps.append(["click", "#startBtn"])
    steps.append(["wait", 1500])
    E("document.getElementById('kb').classList.add('up'); 1")  # (the game adds this a frame after the round starts; a slow headless frame can miss the wait)
    steps.append(["wait", 900])
    E(GO)
    E(ROUND)
    shot("02-round")
    # solve it: the sign with the word's meaning, new in the Word Book
    E("""(async () => { await __solve(); await __go(40); return JSON.stringify({ sign: document.getElementById('signTitle').textContent, def: document.getElementById('signDef').textContent }); })()""")
    shot("03-solved")
    # another round, solved off camera, so the book holds more than one word
    E("""(async () => { document.getElementById('againBtn').click(); await __go(200); await __solve(); return JSON.stringify({ book: Object.keys(BOOK.words) }); })()""")
    # one guess too many: he hangs, and the sword glints on the post
    E("""(async () => { document.getElementById('againBtn').click(); await __go(200); await __guess(__right()[0]); await __toRope();
      const W = SIEGE.sword; await __go(240, () => W.shine.pos.value > 0.35 && W.shine.pos.value < 0.5 && W.sparks.some(p => p.t < 0.7));
      return JSON.stringify({ phase: SIEGE.phase, sheen: +W.shine.pos.value.toFixed(2) }); })()""")
    shot("04-sword")
    # take the sword: the rope is cut and the town comes for you. Up from cover, two shots spent, one heart gone, aiming at the next man
    E("""(async () => { SIEGE.winEnd += 60000; await __go(4); startSiege(); await __go(1200, () => SIEGE.phase === 'fight' && !SIEGE.run); SIEGE_CFG.hitUp = 0;
      const S = SIEGE; await __go(240); S.holding = true; await __go(40);
      let alive = S.enemies.filter(q => q.alive), tgt = alive.find(q => inView(q, 0.9)) || alive[0]; __aimAt(tgt); await __go(12); S.cool = 0; fireTap(); await __go(50);
      S.holding = false; await __go(60); playerHit(S.enemies.find(q => q.alive), true); await __go(90);
      S.holding = true; await __go(40); alive = S.enemies.filter(q => q.alive && q !== tgt); const next = alive.find(q => inView(q, 0.9)) || alive[0]; __aimAt(next, 'Spine2'); await __go(14);
      return JSON.stringify({ phase: S.phase, bullets: S.bullets, health: S.health, down: S.enemies.filter(q => !q.alive).length, bubble: STATE.bubble && STATE.bubble.text }); })()""")
    shot("05-shootout")
    # the rooftops: up at the crates and aimed at the man on the general store, while the one on the sheriff's office takes aim from off to
    # the left, and the red arc round the crosshair shows where
    E("""(async () => { const S = SIEGE, R2 = S.enemies.filter(q => q.roof && q.alive); S.cover = 1; S.holding = true;
      for (const q of S.enemies) if (q.alive) { q.state = 'recover'; q.t = 999; } for (const q of R2) { q.a.path = null; q.state = 'pause'; q.t = 999; } await __go(40);
      const store = R2.find(q => q.roof.name === 'GENERAL STORE'); __aimAt(store); await __go(4); store.state = 'recover'; S.nextShot = 0; S.scanT = 0; await __go(20);
      const A = S.enemies.find(q => q.state === 'aim'); return JSON.stringify({ aiming: A && A.a.name, arc: !document.getElementById('threat').hidden }); })()""")
    shot("08-rooftops")
    # a lost round with no rescue: GAME OVER, the word and its meaning, and the sword still there to take
    E("""(async () => { const S = SIEGE; for (const q of S.enemies.filter(q => q.alive)) shotHits(q, SIEGE_PARTS[2], q.a.ch.bones.Spine2.getWorldPosition(V3()), V3(0, 0, -1));
      siegeWin(); await __go(60); if (SIEGE.phase === 'cleared') finishCleared(); await __go(2400, () => !document.getElementById('sign').hidden); SIEGE_CFG.hitUp = 0.5; // (v29: a win leaves the street live until Done)
      document.getElementById('againBtn').click(); await __go(200); await __guess(__right()[0]); await __toRope();
      SIEGE.winEnd = performance.now() - 1; await __go(2400, () => !document.getElementById('sign').hidden); await __go(40);
      return JSON.stringify({ sign: document.getElementById('signTitle').textContent, again: document.getElementById('againBtn').textContent }); })()""")
    shot("06-game-over")
    # the Word Book, from the menu
    E("""(async () => { document.getElementById('menuBtn').click(); await __go(4); document.getElementById('bookBtn').click(); await __go(6);
      return JSON.stringify({ count: document.getElementById('bookCount').textContent, words: Object.keys(BOOK.words), errs: __errs }); })()""")
    shot("07-word-book")
    return steps


def getaway():
    """the getaway, at phone size: the run, the fight (a lasso man spinning his loop), and horse and rider off the cliff, letterboxed"""
    import os
    steps = []
    E = lambda js: steps.append(["eval", js])
    shot = lambda f: steps.append(["shot", f"{OUT}/{f}.png"])
    steps.append(["eval", FRAMES]); steps.append(["wait", 600])  # (the page drawing again first: under SwiftShader the first frames behind the menu can hold a click up)
    steps.append(["click", "#startBtn"])
    steps.append(["wait", 1500])
    E(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "chase_helpers.js")).read())
    E("""(async () => { await __siege(); await __shootBell(); await __lastOne(1); await __go(600, () => CHASE.state === 'ride'); const C = CHASE;
      await __go(3000, () => { __auto(); const ahead = C.obs.filter(o => o.halfLat && o.s > C.s + 12 && o.s < C.s + 28); return C.state !== 'ride' || (C.s > 150 && ahead.length >= 4); });
      await __go(30, () => { __auto(); return false; }); return JSON.stringify({ s: C.s, errs: __errs }); })()""")
    shot("09-getaway-ride")
    E("""(async () => { const C = CHASE; C.s = C.turnAt - 4; for (const ob of C.obs) dropObstacle(ob); C.obs = []; C.rows = []; C.nextRow = 1e9;
      await __go(600, () => C.state === 'combat' && C.safeT <= 0); C.hp = 3;
      if (C.attacker) endAttack(C.attacker); const L = C.riders.find(r => r.alive && r.kind === 'lasso'); L.d = 9; L.l = -1.5; startAttack(L); // (a lasso man spinning up, for the picture)
      await __go(240, () => { C.hp = 3; return L.state === 'windup' && L.t > 1.5; }); const A = C.attacker; __aimRider(A); C.ay -= 0.06; C.ap += 0.02; await __go(2); return JSON.stringify({ who: A && A.kind, errs: __errs }); })()""")
    shot("10-getaway-fight")
    E("""(async () => { const C = CHASE; let g = 0; while (C.state === 'combat' && g++ < 400) { C.hp = 3; if (C.rounds <= 0 || C.reloadT > 0) { if (C.reloadT <= 0) { C.reloads = Math.max(C.reloads, 1); chaseReload(); } await __go(110, () => C.reloadT <= 0); continue; }
        const a = C.riders.filter(r => r.alive && r.state !== 'wait').sort((x, y) => x.d - y.d); if (a[0]) __fireAt(a[0]); await __go(20, () => C.state !== 'combat'); }
      await __go(900, () => C.cine && C.cine.phase === 'fall' && C.cine.ft > 0.78); return JSON.stringify({ state: C.state, errs: __errs }); })()""")
    steps.append(["wait", 1400])  # (the letterbox slides in and the top bar fades on real time: let them finish)
    shot("11-getaway-cliff")
    return steps


def wide():
    steps = []
    E = lambda js: steps.append(["eval", js])
    steps.append(["eval", FRAMES]); steps.append(["wait", 600])  # (the page drawing again first: under SwiftShader the first frames behind the menu can hold a click up)
    steps.append(["click", "#startBtn"])
    steps.append(["wait", 1500])
    E(GO)
    E(ROUND)
    steps.append(["shot", f"{OUT}/00-wide.png"])
    return steps


json.dump(phone(), open("test/screens_phone.json", "w"), indent=0)
json.dump(wide(), open("test/screens_wide.json", "w"), indent=0)
json.dump(getaway(), open("test/screens_getaway.json", "w"), indent=0)
print("wrote test/screens_phone.json, test/screens_wide.json and test/screens_getaway.json")
