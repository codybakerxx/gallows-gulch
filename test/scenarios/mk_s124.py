# builds test/s124.json: v20 checks. Every word has a meaning; a won round and a lost round each put the meaning on the sign and the word
# in the Word Book (marked solved / missed); the book in the menu (count, list, search, order, Escape); the copy kept in this browser;
# the account copy, run against a stand-in for the platform's db (merge both ways, never a write from a snapshot); and the shootout's
# new numbers (0.8 s, faster gunmen, their cover set out only for the fight)
import json, sys
pre = sys.argv[1] if len(sys.argv) > 1 else "g103"
steps = []
E = lambda js: steps.append(["eval", js])
shot = lambda f: steps.append(["shot", f"test/{pre}_{f}.png"])
E("""window.__errs = []; window.addEventListener('error', e => __errs.push(String(e.message) + ' @' + (e.lineno||''))); window.addEventListener('unhandledrejection', e => __errs.push('rej ' + String(e.reason && e.reason.stack || e.reason))); 1""")
steps.append(["click", "#startBtn"]); steps.append(["wait", 1500])
E("""window.__go = async (n, until) => { window.GULCH_PAUSE = true; const RF = window.renderFrame; window.renderFrame = () => {}; let t = performance.now(); last = t;
  try { for (let i = 0; i < n; i++) { t += 1000/60; tick(t); await null; await null; if (until && until()) break; } } finally { window.renderFrame = RF; } t += 16.7; tick(t); return 1; };
window.__sign = () => ({ title: document.getElementById('signTitle').textContent, word: document.getElementById('signWord').textContent, def: document.getElementById('signDef').hidden ? null : document.getElementById('signDef').textContent, isNew: !document.getElementById('signNew').hidden });
1""")
# 1) the bank: a meaning for every word
E("""JSON.stringify({ words: WORDS.length, withDef: WORDS.filter(x => x.def && x.pos).length, sample: (({ w, pos, def }) => ({ w, pos, def }))(wordInfo('ENIGMA')), bookStart: Object.keys(BOOK.words).length, badge: document.getElementById('bookN').textContent })""")
# 2) win a round: the sign gives the meaning and the word goes in, solved
E("""(async () => { const w = STATE.word, letters = [...new Set(w)];
  for (const c of letters) { await __go(900, () => !STATE.locked); guess(c); }
  await __go(4000, () => !document.getElementById('sign').hidden); await __go(30);
  return JSON.stringify({ word: w, sign: __sign(), entry: BOOK.words[w], badge: document.getElementById('bookN').textContent, errs: __errs }); })()""")
shot("a_win_sign")
# 3) lose the next one (no sword): GAME OVER, the meaning, the word goes in, missed
E("""(async () => { document.getElementById('againBtn').click(); await __go(120); const w = STATE.word;
  STATE.misses = STATE.maxWrong - 1; STATE.hintShown = true; MAN.pathIdx = TRAP_I; MAN.place(MAN_PATH[TRAP_I][0], MAN_PATH[TRAP_I][1], trapYaw()); GAL.rope.onNeck = true; EXEC.gripping = true; hud();
  const miss = [...'QZXJVKWYFBPGMHUDCLNRSTOIEA'].filter(c => !w.includes(c) && !STATE.guessed.has(c)); guess(miss[0]);
  const iv = setInterval(() => { if (!STATE.trap && STATE.locked) STATE.ts = 6; }, 10); await __go(3000, () => SIEGE.phase === 'window'); clearInterval(iv); STATE.ts = 1;
  SIEGE.winEnd = performance.now() - 1; await __go(2000, () => !document.getElementById('sign').hidden); await __go(30);
  return JSON.stringify({ word: w, sign: __sign(), entry: BOOK.words[w], count: Object.keys(BOOK.words).length, errs: __errs }); })()""")
shot("b_lose_sign")
# 4) the book in the menu: count, both words with meanings and marks, search, A-Z, Escape
E("""(async () => { document.getElementById('setBtn').click(); await __go(10); const out = { menuBadge: document.getElementById('bookN').textContent, btnLabel: document.getElementById('bookBtn').getAttribute('aria-label') };
  document.getElementById('bookBtn').click(); await __go(5);
  const rows = () => [...document.querySelectorAll('#bookList li')].map(li => [li.querySelector('b').textContent, li.querySelector('i').textContent, li.querySelector('.lmark').textContent, li.querySelector('p').textContent.slice(0, 40)]);
  out.open = !document.getElementById('book').hidden; out.count = document.getElementById('bookCount').textContent; out.rows = rows(); out.sync = document.getElementById('bookSync').textContent;
  const f = document.getElementById('bookFind'), first = out.rows[0][0]; f.value = first.slice(0, 3).toLowerCase(); f.dispatchEvent(new Event('input')); out.search = rows().map(r => r[0]);
  f.value = 'zzzz'; f.dispatchEvent(new Event('input')); out.none = [rows().length, document.getElementById('bookEmpty').textContent];
  f.value = ''; f.dispatchEvent(new Event('input'));
  document.querySelector('#book .lsort button[data-sort=az]').click(); out.az = rows().map(r => r[0]);
  return JSON.stringify(out); })()""")
shot("c_book")
E("""(async () => { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })); await __go(2); const out = { bookClosed: document.getElementById('book').hidden, menuStillOpen: !document.getElementById('menu').hidden };
  // the copy in this browser: what a reload would read
  const saved = Object.keys(BOOK.words).sort().join(','); BOOK.words = {}; bookLoadLocal(); out.reloaded = Object.keys(BOOK.words).sort().join(',') === saved && saved.length > 0;
  return JSON.stringify(out); })()""")
# 5) the account copy, against a stand-in db: not touched at load while the page would still have to ask; on opening the book it reads
# the account's copy, folds it in, and sends up what only this browser had; a change from another device folds in without a write
E("""(async () => { const log = { sets: [], gets: 0, snaps: 0 }; let doc = { v: 1, words: { ZENITH: { t: 1000, n: 2, s: 1 } } }, snap = null, perm = 'prompt';
  const ref = { get: async () => { log.gets++; return { exists: true, data: () => doc, metadata: {} }; }, set: async b => { log.sets.push(Object.keys(b.words).sort().join(',')); doc = b; },
    onSnapshot: (next) => { log.snaps++; snap = next; return () => { snap = null; }; } };
  window.claude = { use: async n => n === 'permissions' ? { state: async () => perm } : n === 'user' ? { id: async () => 'u_test' } : n === 'db' ? { doc: p => { log.path = p; return ref; } } : null };
  BOOK.ref = null; await bookConnect(false); await __go(2); const atLoad = { connected: !!BOOK.ref, gets: log.gets };
  await bookConnect(true); await __go(2); await BOOK.chain;
  const afterOpen = { connected: !!BOOK.ref, path: log.path, gets: log.gets, sets: log.sets.slice(), hasZenith: !!BOOK.words.ZENITH, zenith: BOOK.words.ZENITH };
  // another device adds a word: it folds in, and nothing is written back from the snapshot
  const before = log.sets.length; snap({ exists: true, data: () => ({ v: 1, words: Object.assign({}, doc.words, { ABHOR: { t: 2000, n: 1, s: 0 } }) }), metadata: {} }); await BOOK.chain;
  const fromSnap = { hasAbhor: !!BOOK.words.ABHOR, writes: log.sets.length - before };
  // a round ends here: the whole book goes up, once
  bookAdd('GAFFE', true); await BOOK.chain; const afterAdd = { lastSet: log.sets[log.sets.length - 1], writes: log.sets.length - before };
  // a refused write (a view-only visitor): the book carries on in this browser
  ref.set = async () => { throw { code: 'invalid_argument', message: 'no' }; }; bookAdd('NADIR', false); await BOOK.chain.catch(() => {}); await __go(1);
  const refused = { connected: !!BOOK.ref, kept: !!BOOK.words.NADIR, note: document.getElementById('bookSync').textContent };
  delete window.claude; return JSON.stringify({ atLoad, afterOpen, fromSnap, afterAdd, refused, errs: __errs }); })()""")
# 6) the shootout's new numbers: 0.8 s, faster gunmen, their cover out only for the fight
E("""(async () => { const out = { react: SIEGE_CFG.react, speed: SIEGE_CFG.speed, hold: SIEGE_CFG.hold, propsBefore: SIEGE.props.visible, pieces: SIEGE.props.children.length };
  document.getElementById('resumeBtn').hidden || document.getElementById('resumeBtn').click(); document.getElementById('menu').hidden = true; document.getElementById('againBtn').click(); await __go(120);
  STATE.misses = STATE.maxWrong - 1; STATE.hintShown = true; MAN.pathIdx = TRAP_I; MAN.place(MAN_PATH[TRAP_I][0], MAN_PATH[TRAP_I][1], trapYaw()); GAL.rope.onNeck = true; EXEC.gripping = true; hud();
  const miss = [...'QZXJVKWYFBPGMHUDCLNRSTOIEA'].filter(c => !STATE.word.includes(c) && !STATE.guessed.has(c)); guess(miss[0]);
  const iv = setInterval(() => { if (!STATE.trap && STATE.locked) STATE.ts = 6; }, 10); await __go(3000, () => SIEGE.phase === 'window'); clearInterval(iv); STATE.ts = 1; SIEGE.winEnd += 60000; await __go(4);
  startSiege(); await __go(900, () => SIEGE.phase === 'fight' && !SIEGE.run); await __go(240);
  out.propsInFight = SIEGE.props.visible; const sp = SIEGE.enemies.filter(E => E.alive).map(E => +E.a.speed.toFixed(2)); out.speeds = sp;
  SIEGE.yaw = SIEGE.covers[SIEGE.cover].yaw0 - 0.35; SIEGE.holding = true; await __go(40); return JSON.stringify(out); })()""")
shot("d_fight_props")
E("""(async () => { const S = SIEGE; for (const E of S.enemies) { E.state = 'pause'; E.t = 999; E.a.path = null; }
  // the reaction: how long after you come up until a shot can land (every exposed shot made to hit for this)
  SIEGE_CFG.hitUp = 1; S.holding = false; await __go(40); const res = [];
  for (let k = 0; k < 4; k++) { S.holding = true; await __go(30); const M = S.enemies.find(q => q.alive && inView(q)); S.holding = false; await __go(30); S.health = 3; if (!M) { res.push('none in view'); continue; }
    M.state = 'aim'; M.t = 0.05; M.a.path = null; S.nextShot = 99; const t0 = S.t; S.holding = true; let hitAt = -1; for (let i = 0; i < 200; i++) { await __go(1); if (S.health < 3) { hitAt = +(S.t - t0).toFixed(2); break; } } res.push(hitAt); }
  SIEGE_CFG.hitUp = 0.5; S.health = 3; S.holding = false;
  document.getElementById('againBtn').click(); await __go(60);
  return JSON.stringify({ firstHitAfter: res, propsAfterReset: S.props.visible, errs: __errs }); })()""")
json.dump(steps, open("test/s124.json", "w"), indent=0)
print(len(steps), "steps")
