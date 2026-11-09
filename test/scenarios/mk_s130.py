# builds test/s130.json: v28 checks. Two gunmen on the roofs (the sheriff's office and the general store), nine in all, eleven bullets;
# where they stand against the false front (up: seen from the waist; ducked: out of sight), what each of your covers can see of them;
# a man taking aim from outside your view gets the red arc on his side (and longer to do it); one shot off each roof and where he lands
import json, sys
pre = sys.argv[1] if len(sys.argv) > 1 else "g111"
falls = (sys.argv[2] if len(sys.argv) > 2 else "over,over").split(",")  # how each roof man goes when shot: over, drape or back
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
  startSiege(); await __go(1200, () => SIEGE.phase === 'fight' && !SIEGE.run); return 1; };
window.__calm = () => { SIEGE.nextShot = 999; for (const q of SIEGE.enemies) if (q.state === 'aim' || q.state === 'recover') { q.state = 'pause'; q.t = 999; } };
window.__roof = () => SIEGE.enemies.filter(q => q.roof);
window.__r = v => +v.toFixed(2);
1""")
# 1) the line-up and the roof men's footing
E("""(async () => { await __siege(); const S = SIEGE; __calm(); await __go(200, () => __roof().every(q => q.state === 'pause')); for (const q of __roof()) { q.a.path = null; q.state = 'pause'; q.t = 999; } await __go(40);
  const out = { phase: S.phase, enemies: S.enemies.length, bullets: S.bullets, tip2: SIEGE_TIP2, meta: document.getElementById('meta').textContent, cylinder: document.querySelectorAll('#cyl circle[stroke="#6b5a45"]').length };
  out.roof = __roof().map(q => { const a = q.a, R0 = q.roof, l = roofLocal(R0, a.pos.x, a.pos.z), B = a.ch.bones;
    return { name: R0.name, state: q.state, local: [__r(l[0]), __r(l[1])], feet: __r(a.pos.y), roofTop: __r(roofTop(R0, l[0])), capTop: __r(R0.y0 + R0.top),
      spine2: __r(B.Spine2.getWorldPosition(V3()).y), head: __r(B.HeadTop_End.getWorldPosition(V3()).y), hips: __r(B.Hips.getWorldPosition(V3()).y) }; });
  // what each cover can see of each roof man standing up, and once he has ducked
  out.cover = []; for (let c = 0; c < 3; c++) { S.cover = c; const row = { cover: c };
    for (const q of __roof()) { const R0 = q.roof; S.yaw = S.covers[c].yaw0; await __go(2); __aimAt(q); const dy = ((S.yaw - S.covers[c].yaw0 + Math.PI) % TAU + TAU) % TAU - Math.PI;
      row[R0.name] = { turn: __r(dy), withinLimit: Math.abs(dy) <= SIEGE_CFG.yawLim, canFace: canFace(q), pitch: __r(S.pitch), clear: clearShot(q) }; }
    out.cover.push(row); }
  S.cover = 1; S.yaw = S.covers[1].yaw0; S.pitch = 0; await __go(4);
  const q0 = __roof()[0]; q0.state = 'duck'; q0.t = 999; await __go(30); out.ducked = { yOff: q0.a.yOff, feet: __r(q0.a.pos.y), head: __r(q0.a.ch.bones.HeadTop_End.getWorldPosition(V3()).y), capTop: __r(q0.roof.y0 + q0.roof.top), clear: clearShot(q0) };
  q0.state = 'pause'; q0.t = 999; await __go(30);
  out.errs = __errs; return JSON.stringify(out); })()""")
# 2) the view: up from the crates, aimed at each roof
E("""(async () => { const S = SIEGE; S.cover = 1; S.holding = true; await __go(30); __aimAt(__roof()[0]); await __go(6); return 1; })()""")
shot("a_sheriff_roof")
E("""(async () => { const S = SIEGE; __aimAt(__roof()[1]); await __go(6); return 1; })()""")
shot("b_store_roof")
# 3) a close look from beside each roof, to see him stand behind the false front (a camera put there for the picture only)
E("""(async () => { const q = __roof()[0], R0 = q.roof, c = R.camera; const eye = roofWorld(R0, -6.5, R0.top + 1.8, R0.d / 2 + 5.5), at = q.a.ch.bones.Spine2.getWorldPosition(V3());
  c.position.copy(eye); c.lookAt(at); c.updateMatrixWorld(); renderFrame(T); return 1; })()""")
shot("c_sheriff_side")
E("""(async () => { const q = __roof()[1], R0 = q.roof, c = R.camera; const eye = roofWorld(R0, 6.5, R0.top + 1.8, R0.d / 2 + 5.5), at = q.a.ch.bones.Spine2.getWorldPosition(V3());
  c.position.copy(eye); c.lookAt(at); c.updateMatrixWorld(); renderFrame(T); return 1; })()""")
shot("d_store_side")
# 4) the red arc: you face the gallows; the sheriff's man takes aim from off to your left
E("""(async () => { const S = SIEGE; S.cover = 1; S.yaw = S.covers[1].yaw0; S.pitch = 0.02; S.holding = false; await __go(20);
  const q = __roof()[0], seen = onFrame(q, 1.0); for (const o of S.enemies) if (o !== q && o.alive) { o.state = 'recover'; o.t = 999; } // (everyone else busy)
  q.state = 'pause'; q.t = 999; S.nextShot = 0; S.scanT = 0; await __go(2); const picked = S.enemies.find(o => o.state === 'aim');
  if (picked !== q) return JSON.stringify({ err: 'roof man did not take aim', picked: picked && picked.a.name, seen, canFace: canFace(q), clear: clearShot(q) });
  const tAim = q.t; await __go(8); const th = document.getElementById('threat'), r = th.getBoundingClientRect();
  return JSON.stringify({ seenOnScreen: seen, tAim: __r(tAim), arcShown: !th.hidden, arcTransform: th.style.transform, arcBox: [Math.round(r.x), Math.round(r.y), Math.round(r.width)], chevron: !document.getElementById('warn').hidden }); })()""")
shot("e_arc_left")
E("""(async () => { await __go(60, () => __roof()[0].state === 'recover'); await __go(3); const th = document.getElementById('threat'); return JSON.stringify({ afterShot: { state: __roof()[0].state, arcShown: !th.hidden, fire: th.classList.contains('fire'), op: th.style.opacity, health: SIEGE.health } }); })()""")
shot("f_arc_fired")
# 5) one shot off each roof (a body hit, so most of the time he pitches forward), and where each comes to rest
E("""(async () => { const S = SIEGE; __calm(); SIEGE_CFG.hitUp = 0; const res = [];
  const F = __FALLS__; let i = 0; S.holding = true;
  for (const q of __roof()) { q.state = 'pause'; q.t = 999; await __go(20); window.GULCH_ROOFFALL = F[i++]; const ro = upEye(V3()), at = q.a.ch.bones.Spine1.getWorldPosition(V3()), rd = at.clone().sub(ro).normalize();
    shotHits(q, SIEGE_PARTS[3], at, rd); if (i === 1) { __aimAt(q); await __go(28); break; } }
  return 1; })()""")
shot("g0_sheriff_falling")
E("""(async () => { const q1 = __roof()[1]; window.GULCH_ROOFFALL = __FALLS__[1]; await __go(10); const ro = upEye(V3()), at = q1.a.ch.bones.Spine1.getWorldPosition(V3()), rd = at.clone().sub(ro).normalize();
  shotHits(q1, SIEGE_PARTS[3], at, rd); __aimAt(q1); await __go(28); return 1; })()""")
shot("g1_store_falling")
E("""(async () => { const S = SIEGE, res = []; window.GULCH_ROOFFALL = null;
  await __go(420);
  for (const q of __roof()) { const H = q.a.hang, hips = H.P('hips', V3()), l = roofLocal(q.roof, hips.x, hips.z); res.push({ name: q.roof.name, hips: [__r(hips.x), __r(hips.y), __r(hips.z)], local: [__r(l[0]), __r(l[1])], frontAt: __r(q.roof.d / 2), ground: __r(groundHeight(hips.x, hips.z)), porch: __r(q.roof.y0 + q.roof.porchY), asleep: H.asleep, gun: q.gun.position.toArray().map(__r) }); }
  return JSON.stringify({ res, left: S.enemies.filter(o => o.alive).length, meta: document.getElementById('meta').textContent, errs: __errs }); })()""")
E("""(async () => { const q = __roof()[0], R0 = q.roof, c = R.camera; const at = q.a.hang.P('hips', V3()), eye = at.clone().add(roofWorld(R0, -5, 0, 7).sub(roofWorld(R0, 0, 0, 0))); eye.y = at.y + 3.2;
  c.position.copy(eye); c.lookAt(at); c.updateMatrixWorld(); renderFrame(T); return 1; })()""")
shot("g_sheriff_fallen")
E("""(async () => { const q = __roof()[1], R0 = q.roof, c = R.camera; const at = q.a.hang.P('hips', V3()), eye = at.clone().add(roofWorld(R0, 5, 0, 7).sub(roofWorld(R0, 0, 0, 0))); eye.y = at.y + 3.2;
  c.position.copy(eye); c.lookAt(at); c.updateMatrixWorld(); renderFrame(T); return JSON.stringify({ errs: __errs }); })()""")
shot("h_store_fallen")
steps = [[a, b.replace("__FALLS__", json.dumps(falls)) if isinstance(b, str) else b] for a, b in steps]
json.dump(steps, open("test/s130.json", "w"), indent=0)
print(len(steps), "steps")
