# builds test/s135.json: v35, the crows, the neck snap and the things to shoot in the shootout.
#   - crows are about from the start (two on the gallows beam), and perched where their perch is
#   - the snap: the recorded snap (neck0) plays as the rope catches him, and no glint, bell or crow's wings with it
#   - in the shootout: a bottle breaks, a can flies and comes to rest on the ground, a crow on the beam is shot and lies on
#     the floor under it, a gallows lantern breaks and goes out, a window cracks, a barrel spouts water
#   - a new round puts it all back: bottles and cans home, the lantern lit, the dead crow gone
# Prints one JSON line per check; "ok" is true when it passed.
import json, sys
pre = sys.argv[1] if len(sys.argv) > 1 else "g135"
steps = []
E = lambda js: steps.append(["eval", js])
shot = lambda f: steps.append(["shot", f"test/{pre}_{f}.png"])
E("""window.__errs = []; window.addEventListener('error', e => __errs.push(String(e.message) + ' @' + (e.lineno||''))); window.addEventListener('unhandledrejection', e => __errs.push('rej ' + String(e.reason && e.reason.stack || e.reason))); 1""")
steps.append(["wait", 2500]); steps.append(["click", "#startBtn"]); steps.append(["wait", 1500]) # (a moment for the menu to settle: Playwright waits for the button to stop moving)
E("""window.__go = async (n, until) => { window.GULCH_PAUSE = true; const RF = window.renderFrame; window.renderFrame = () => {}; let t = performance.now(); last = t;
  try { for (let i = 0; i < n; i++) { t += 1000/60; tick(t); await null; await null; if (until && until()) break; } } finally { window.renderFrame = RF; } t += 16.7; tick(t); return 1; };
window.__aimPt = p => { const c = R.camera.position; SIEGE.yaw = Math.atan2(p.x - c.x, p.z - c.z); SIEGE.pitch = Math.atan2(p.y - c.y, Math.hypot(p.x - c.x, p.z - c.z)); };
window.__fireAt = async p => { const S = SIEGE; S.holding = true; await __go(40); __aimPt(p); await __go(12); __aimPt(p); await __go(2); S.cool = 0; S.reloadT = 0; S.bullets = 6; fireTap(); return 1; };
window.__snd = []; for (const k of Object.keys(Sound)) { const d = Object.getOwnPropertyDescriptor(Sound, k); if (!d || typeof d.value !== 'function' || /^(setListener|setDusk|setLevel)$/.test(k)) continue; const f = d.value;
  Sound[k] = function () { __snd.push([performance.now() / 1000, k, typeof arguments[0] === 'string' ? arguments[0] : '']); return f.apply(this, arguments); }; }
window.__check = (name, ok, info) => JSON.stringify({ check: name, ok: !!ok, info, errs: __errs.slice(0, 3) }); 1""")
E("""(async () => { await __go(240); const L = CROWS.list.filter(c => c.state === 'perch'), onBeam = L.filter(c => c.perch.kind === 'beam').length;
  const placed = L.every(c => { const P = c.perch; if (P.ground) return Math.abs(c.pos.y - groundHeight(c.pos.x, c.pos.z)) < 0.2; const a = P.a, b = P.b, ab = b.clone().sub(a), t = ab.lengthSq() ? clamp(c.pos.clone().sub(a).dot(ab) / ab.lengthSq(), 0, 1) : 0; return a.clone().addScaledVector(ab, t).distanceTo(c.pos) < 0.2; });
  return __check('crows about', L.length >= 2 && onBeam >= 1 && placed, { perched: L.length, onBeam, placed, of: CROWS.list.length }); })()""")
shot("a_crows")
E("""(async () => { STATE.misses = STATE.maxWrong - 1; STATE.hintShown = true; MAN.pathIdx = TRAP_I; MAN.place(MAN_PATH[TRAP_I][0], MAN_PATH[TRAP_I][1], trapYaw()); GAL.rope.onNeck = true; EXEC.gripping = true; hud();
  const miss = [...'QZXJVKWYFBPGMHUDCLNRSTOIEA'].filter(c => !STATE.word.includes(c) && !STATE.guessed.has(c)); __snd.length = 0; guess(miss[0]);
  await __go(3000, () => MAN.hang && MAN.hang.caught); const tc = performance.now() / 1000; await __go(90);
  const near = __snd.filter(e => Math.abs(e[0] - tc) < 1.5).map(e => e[1] + (e[2] ? ':' + e[2] : '')), snap = near.includes('clip:neck0');
  const bad = near.filter(k => /glint|bell|flap/.test(k)); // (a crow call asked for in that time is hushed inside the audio: 03 Sound.hush)
  return __check('the snap', snap && !bad.length, { near, bad }); })()""")
E("""(async () => { SIEGE_CFG.hitUp = 0; SIEGE_CFG.hitRun = 0; const iv = setInterval(() => { if (!STATE.trap && STATE.locked) STATE.ts = 6; }, 10); await __go(3000, () => SIEGE.phase === 'window'); clearInterval(iv); STATE.ts = 1; await __go(4);
  startSiege(); await __go(240, () => SIEGE.phase === 'fight'); await __go(60); return __check('shootout', SIEGE.phase === 'fight' && TGT.grp.visible && TGT.items.every(T => T.state === 'stand'), { phase: SIEGE.phase, items: TGT.items.length }); })()""")
E("""(async () => { const T = TGT.items.find(q => q.kind === 'bottle' && q.home.z > -1); await __fireAt(T.mesh.position.clone().add(V3(0, 0.13, 0))); await __go(30); return __check('bottle', T.state === 'broken' && !T.mesh.visible, { st: T.state }); })()""")
shot("b_bottle")
E("""(async () => { const T = TGT.items.find(q => q.kind === 'can'); await __fireAt(T.mesh.position.clone()); await __go(4); const flew = T.state === 'fly'; await __go(240);
  const p = T.mesh.position, fl = surfaceAt(p.x, p.z, p.y + 0.1) + 0.034; return __check('can', flew && T.state === 'rest' && Math.abs(p.y - fl) < 0.05 && p.distanceTo(T.home) > 0.3, { flew, st: T.state, y: +p.y.toFixed(3), floor: +fl.toFixed(3) }); })()""")
E("""(async () => { const c = CROWS.list.find(q => q.state !== 'dead'), P = CROWS.perches.find(q => q.kind === 'beam'); crowSettle(c, { P, u: 0.5, p: P.a.clone().lerp(P.b, 0.5) }, 0); c.idle = 99; c.cawT = 99; window.__dead = c; await __go(2);
  await __fireAt(c.body.getWorldPosition(V3()).add(V3(0, 0.05, 0))); await __go(4); const hit = c.state === 'dead'; await __go(240);
  const fl = goreFloor(c.pos.x, c.pos.z, c.pos.y + 0.2); return __check('crow shot', hit && c.rest && c.pos.y < fl + 0.1 && c.pos.y > fl - 0.1 && SIEGE.pools.length >= 1, { hit, rest: c.rest, y: +c.pos.y.toFixed(3), floor: +fl.toFixed(3), pools: SIEGE.pools.length, kills: SIEGE.crowKills }); })()""")
shot("c_crow")
E("""(async () => { const L = TGT.lamps[1], p = L.glass.getWorldPosition(V3()); await __fireAt(p); await __go(10); return __check('lantern', L.broken && !GAL.lanterns.includes(L.glass.material) && (!L.light || L.light.intensity === 0), { broken: L.broken }); })()""")
E("""(async () => { const B = WORLD.blds.find(b => b.name === 'SHERIFF'), p = roofWorld(B, B.w * 0.3, 1.7, B.d / 2 + 0.24); await __fireAt(p); await __go(10); return __check('window', TGT.cracks.used === 1, { cracks: TGT.cracks.used }); })()""")
E("""(async () => { const [k, x, z, ry] = ENEMY_COVER.find(c => c[0] === 'barrels'), p = V3(x - Math.cos(ry) * 0.31, 0.5, z + Math.sin(ry) * 0.31); await __fireAt(p); await __go(30); return __check('barrel', TGT.spouts.length === 1, { spouts: TGT.spouts.length }); })()""")
shot("d_barrel")
E("""(async () => { newRound(); await __go(30); const c = __dead, L = TGT.lamps[1];
  const home = TGT.items.every(T => T.state === 'stand' && T.mesh.visible && T.mesh.position.distanceTo(T.home) < 1e-6);
  return __check('new round', home && !L.broken && GAL.lanterns.includes(L.glass.material) && c.state === 'away' && !c.root.visible && TGT.cracks.used === 0 && !TGT.grp.visible, { home, lamp: !L.broken, crow: c.state }); })()""")
E("""JSON.stringify({ errs: __errs })""")
json.dump(steps, open("test/s135.json", "w"), indent=0)
print(len(steps), "steps")
