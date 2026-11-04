# builds test/s145.json: v51.
#   - the gallop: the repository owner's recording, cut into hoof hits (audio/sfx/gallop.mp3), is what's heard through the run, from your
#     own horse and the posse's; none of the made hoofbeats once it's decoded
#   - the getaway's last sign ("The End") in the middle of the screen; on a screen too short for it, it starts at the top and scrolls
# Prints one JSON line per check; "ok" is true when it passed.
import json, os, sys
pre = sys.argv[1] if len(sys.argv) > 1 else "g145"
HERE = os.path.dirname(os.path.abspath(__file__))
steps = []
E = lambda js: steps.append(["eval", js])
shot = lambda f: steps.append(["shot", f"test/{pre}_{f}.png"])
E("""window.__errs = []; window.addEventListener('error', e => __errs.push(String(e.message) + ' @' + (e.filename || '').split('/').pop() + ':' + (e.lineno || ''))); window.addEventListener('unhandledrejection', e => __errs.push('rej ' + String(e.reason && e.reason.stack || e.reason))); 1""")
steps.append(["wait", 2500]) # (and the page drawing again before the click: under SwiftShader at desktop size the first frames behind the menu can take a while)
E("""new Promise(res => { const to = setTimeout(() => res('no frame in 120 s'), 120000); requestAnimationFrame(() => requestAnimationFrame(() => { clearTimeout(to); res(1); })); })""")
steps.append(["wait", 600]); steps.append(["click", "#startBtn"]); steps.append(["wait", 1500])
E(open(os.path.join(HERE, "chase_helpers.js")).read())
E("""window.__check = (name, ok, info) => JSON.stringify({ check: name, ok: !!ok, info, errs: __errs.slice(0, 3) }); 1""")
E("""(async () => { await __go(200, () => !STATE.locked); await __siege(); startGetaway(); await __go(600, () => CHASE.state === 'ride'); const made0 = Sound.gallopBank.made; /* (__go steps frames without letting the page fetch or decode: give it real time to, as the game's own frames would) */ for (let i = 0; i < 60 && !Sound.gallopBank.hits; i++) { await new Promise(r => setTimeout(r, 250)); await __go(1); } const b0 = Sound.gallopBank; await __go(80); const b1 = Sound.gallopBank;
  const hits = b1.hits, played = b1.played - b0.played, made = b1.made - b0.made;
  return __check("the gallop: the recording's hoof hits, not made ones", hits === 24 && played > 30 && made === 0, { hits, played, made, madeWhileLoading: b0.made - made0, state: b1.state }); })()""")
E("""(async () => { CHASE.state = 'victory'; chaseResults(true); await __go(60); for (const a of document.getAnimations()) if (a.effect && a.effect.target && a.effect.target.closest && a.effect.target.closest('#chaseRes')) a.finish(); /* (the sign swings in on the clock, not the stepped frames: settled) */ const w = $('chaseRes'), r = w.querySelector('.sign').getBoundingClientRect(), vh = innerHeight, tall = r.height > vh - 36;
  w.scrollTop = 0; const r0 = w.querySelector('.sign').getBoundingClientRect(), mid = (r.top + r.bottom) / 2;
  const ok = tall ? r0.top >= 0 && w.scrollHeight > w.clientHeight : Math.abs(mid - vh / 2) < 12 && r.top > 18 && r.bottom < vh - 18;
  return __check("the getaway's last sign in the middle of the screen", ok && $('resTitle').textContent === 'The End', { tall, top: +r.top.toFixed(1), bottom: +r.bottom.toFixed(1), mid: +mid.toFixed(1), vh, topScrolled: +r0.top.toFixed(1), scrolls: w.scrollHeight > w.clientHeight }); })()""")
shot("a_the_end")
E("""JSON.stringify({ errs: __errs })""")
json.dump(steps, open("test/s145.json", "w"), indent=0)
