# Builds test/screens_phone.json and test/screens_wide.json: the README screenshots, played through for real.
#   python3 test/scenarios/screens.py
#   DPR=2 python3 test/play.py 390 844 test/screens_phone.json 0.05 high
#   python3 test/play.py 1280 720 test/screens_wide.json 0.05 high
# Phone: the title menu; a round under way; a solved word with its meaning; the sword glinting at the gallows; the shootout; the rooftop
# gunmen and the red arc; GAME OVER; the Word Book holding the words from those rounds. Wide: a round on a landscape screen.
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


def phone():
    steps = []
    E = lambda js: steps.append(["eval", js])
    shot = lambda f: steps.append(["shot", f"{OUT}/{f}.png"])
    steps.append(["wait", 2500])
    shot("01-title")
    steps.append(["click", "#startBtn"])
    steps.append(["wait", 1500])
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
      siegeWin(); await __go(2400, () => !document.getElementById('sign').hidden); SIEGE_CFG.hitUp = 0.5;
      document.getElementById('againBtn').click(); await __go(200); await __guess(__right()[0]); await __toRope();
      SIEGE.winEnd = performance.now() - 1; await __go(2400, () => !document.getElementById('sign').hidden); await __go(40);
      return JSON.stringify({ sign: document.getElementById('signTitle').textContent, again: document.getElementById('againBtn').textContent }); })()""")
    shot("06-game-over")
    # the Word Book, from the menu
    E("""(async () => { document.getElementById('menuBtn').click(); await __go(4); document.getElementById('bookBtn').click(); await __go(6);
      return JSON.stringify({ count: document.getElementById('bookCount').textContent, words: Object.keys(BOOK.words), errs: __errs }); })()""")
    shot("07-word-book")
    return steps


def wide():
    steps = []
    E = lambda js: steps.append(["eval", js])
    steps.append(["click", "#startBtn"])
    steps.append(["wait", 1500])
    E(GO)
    E(ROUND)
    steps.append(["shot", f"{OUT}/00-wide.png"])
    return steps


json.dump(phone(), open("test/screens_phone.json", "w"), indent=0)
json.dump(wide(), open("test/screens_wide.json", "w"), indent=0)
print("wrote test/screens_phone.json and test/screens_wide.json")
