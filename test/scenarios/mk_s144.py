# builds test/s144.json: v44.
#   - the horses' hit shapes, fitted to the mesh: a shot at the head hits, standing up and grazing; so do the top of the back and the
#     belly; a shot just past the muzzle, over the back, under the belly or beside the body misses
#   - the revolver from the barrel: the host can be shot; he goes down where he stood and the shootout starts; the next round he's whole
# Prints one JSON line per check; "ok" is true when it passed.
import json, os, sys
pre = sys.argv[1] if len(sys.argv) > 1 else "g144"
HERE = os.path.dirname(os.path.abspath(__file__))
steps = []
E = lambda js: steps.append(["eval", js])
shot = lambda f: steps.append(["shot", f"test/{pre}_{f}.png"])
E("""window.__errs = []; window.addEventListener('error', e => __errs.push(String(e.message) + ' @' + (e.filename || '').split('/').pop() + ':' + (e.lineno || ''))); window.addEventListener('unhandledrejection', e => __errs.push('rej ' + String(e.reason && e.reason.stack || e.reason))); 1""")
steps.append(["wait", 2500]) # (and the page drawing again before the click: under SwiftShader at desktop size the first frames behind the menu can take a while)
E("""new Promise(res => { const to = setTimeout(() => res('no frame in 120 s'), 120000); requestAnimationFrame(() => requestAnimationFrame(() => { clearTimeout(to); res(1); })); })""")
steps.append(["wait", 600]); steps.append(["click", "#startBtn"]); steps.append(["wait", 1500])
E(open(os.path.join(HERE, "chase_helpers.js")).read())
E("""window.__check = (name, ok, info) => JSON.stringify({ check: name, ok: !!ok, info, errs: __errs.slice(0, 3) });
window.__ptr = (type, x, y, id = 7) => { const tg = type === 'pointerdown' ? $('scene') : window; tg.dispatchEvent(new PointerEvent(type, { pointerId: id, pointerType: 'touch', isPrimary: true, bubbles: true, cancelable: true, clientX: x, clientY: y })); };
window.__tapAt = p3 => { const p = p3.clone().project(R.camera), r = $('scene').getBoundingClientRect(), x = r.left + (p.x * 0.5 + 0.5) * r.width, y = r.top + (-p.y * 0.5 + 0.5) * r.height; __ptr('pointerdown', x, y); __ptr('pointerup', x, y); return [x | 0, y | 0]; };
window.__drag = async (dx, dy, steps = 10) => { const r = $('scene').getBoundingClientRect(), x0 = r.left + r.width / 2, y0 = r.top + r.height * 0.4; __ptr('pointerdown', x0, y0);
  for (let i = 1; i <= steps; i++) { __ptr('pointermove', x0 + dx * i / steps, y0 + dy * i / steps); await __go(1); } __ptr('pointerup', x0 + dx, y0 + dy); await __go(1); };
window.__yawOf = () => { const f = V3(0, 0, -1).applyQuaternion(R.camera.quaternion); return Math.atan2(f.x, f.z); };
window.__dy = (a, b) => ((a - b + Math.PI) % TAU + TAU) % TAU - Math.PI;
window.__track = async (pt, ok, n = 240) => { for (let i = 0; i < n; i++) { __calm(); __aimPt(pt()); await __go(1); R.camera.updateMatrixWorld(); const ro = R.camera.position.clone(), rd = V3(0, 0, -1).applyQuaternion(R.camera.quaternion).normalize(); if (i > 6 && ok(ro, rd)) return true; } return false; };
window.__toFight = async () => { const C = CHASE; await __go(600, () => C.state === 'ride'); await __go(10); C.s = C.turnAt - 4; for (const ob of C.obs) dropObstacle(ob); C.obs = []; C.rows = []; C.nextRow = 1e9; await __go(400, () => C.state === 'combat' && C.safeT <= 0); await __go(5); };
window.__cam = null; if (!window.__camHook) { window.__camHook = true; const rf0 = window.renderFrame; window.renderFrame = function (t) { const C = window.__cam; if (C) { R.camera.position.set(...C.p); R.camera.lookAt(...C.t); R.camera.fov = C.fov || 50; R.camera.updateProjectionMatrix(); R.camera.updateMatrixWorld(); } return rf0.apply(this, arguments); }; }
window.__aimHorse = R0 => { const C = CHASE, c = R.camera.position, p = R0.H.grp.localToWorld(V3(0, 1.0, 0.2)), Sw = C.sway || { y: 0, p: 0 }; let ay = Math.atan2(p.x - c.x, p.z - c.z) - (C.horse.yaw + Math.PI) - Sw.y; ay = ((ay + Math.PI) % TAU + TAU) % TAU - Math.PI;
  C.ay = ay; C.ap = Math.atan2(p.y - c.y, Math.hypot(p.x - c.x, p.z - c.z)) - Sw.p; C.mouse = null; }; 1""")
# ---- the horses ----
E("""(async () => { await __go(200, () => !STATE.locked); const F = horseFit(), L = HERD.list.filter(h => !h.dead && !h.meat), H = L[0]; if (!F || !H) return __check('the horses: fitted hit shapes', false, { fit: !!F, horses: L.length });
  const g = H.grp; g.updateMatrixWorld(); const shoot = (from, to) => { const ro = g.localToWorld(V3(...from)), p = g.localToWorld(V3(...to)); return horseRayOne(H, ro, p.sub(ro).normalize()) > 0; };
  const res = {}; for (const [nm, a] of [['up', 0.3], ['grazing', 1.3]]) { H.neckA = H.neckT = a; H.U.neck.value = a; await __go(2); g.updateMatrixWorld(); const hd = F.head, c = horseFitPt(H, [(hd.a[0] + hd.b[0]) / 2, (hd.a[1] + hd.b[1]) / 2], [(hd.wa[0] + hd.wb[0]) / 2, (hd.wa[1] + hd.wb[1]) / 2], V3());
    res[nm] = { head: shoot([3, c.y, c.z], [0, c.y, c.z]), headFront: shoot([0, c.y + 0.05, c.z + 3], [0, c.y, c.z]) }; }
  const Pp = HORSE.stand.pos, Aa = HORSE.stand.aLeg; let top = -9, belly = 9; for (let i = 0; i < Pp.length / 3; i++) { if (Math.abs(Pp[i * 3 + 2] + 0.3) > 0.05 || Math.abs(Pp[i * 3]) > 0.1 || Aa[i * 4 + 3] > 0.15) continue; const y = Pp[i * 3 + 1]; if (y > 0.85) { top = Math.max(top, y); belly = Math.min(belly, y); } } // (the mesh itself, across the middle of the back)
  res.overBack = shoot([3, top + 0.1, -0.3], [0, top + 0.1, -0.3]); res.backTop = shoot([3, top - 0.06, -0.3], [0, top - 0.06, -0.3]); res.bellyLow = shoot([3, belly - 0.12, -0.3], [0, belly - 0.12, -0.3]); res.belly = shoot([3, belly + 0.06, -0.3], [0, belly + 0.06, -0.3]); res.mesh = [+top.toFixed(2), +belly.toFixed(2)];
  res.besideBody = shoot([0.47, 1.3, 4], [0.47, 1.3, -4]); res.flank = shoot([3, 1.35, -0.2], [0, 1.35, -0.2]); res.muzzlePast = shoot([3, 2.0, 1.95], [0, 2.0, 1.95]); H.neckA = H.neckT = 1.3;
  return __check('the horses: the head hits, standing or grazing; just off them misses', res.up.head && res.up.headFront && res.grazing.head && res.grazing.headFront && res.backTop && res.belly && !res.bellyLow && res.flank && !res.overBack && !res.besideBody && !res.muzzlePast,
    { res, head: { a: F.head.a.map(v => +v.toFixed(2)), b: F.head.b.map(v => +v.toFixed(2)), r: +F.head.r.toFixed(2) }, body: [F.bodyF, F.bodyB].map(c => ({ r: +c.r.toFixed(2), k: +c.k.toFixed(2) })) }); })()""")
# ---- the host, from the barrel ----
E("""(async () => { await __go(200, () => gunPropLive()); armedStart(); await __go(60, () => !ARMED.lift); const A = ARMED, p = HOST.ch.bones.Spine2.getWorldPosition(V3()), c = R.camera.position;
  A.yaw += __dy(Math.atan2(p.x - c.x, p.z - c.z), __yawOf()); await __go(3); A.pitch += Math.atan2(p.y - c.y, Math.hypot(p.x - c.x, p.z - c.z)) - Math.asin(V3(0, 0, -1).applyQuaternion(R.camera.quaternion).y); await __go(3);
  A.cool = 0; armedFire(); await __go(90); const S = SIEGE;
  return __check('the host shot from the barrel: down where he stood, and the shootout', S.on && S.phase === 'fight' && !!S.hostE && !!HOST.hang && HOST.root.visible && !ARMED.on && S.enemies.length >= 7 && S.enemies.filter(q => q.alive).length >= 7,
    { on: S.on, phase: S.phase, hostDown: !!HOST.hang, shown: HOST.root.visible, enemies: S.enemies.length, standing: S.enemies.filter(q => q.alive).length }); })()""")
shot("a_host_down")
E("""(async () => { const S = SIEGE; S.health = 0; siegeDie(); await __go(400, () => !$('sign').hidden); newRound(); await __go(120); const whole = !HOST.hang && HOST.root.visible && !S.hostE && (HOST.wounds || []).length === 0;
  return __check('the next round: the host whole again', whole && !S.on, { hang: !!HOST.hang, shown: HOST.root.visible, wounds: (HOST.wounds || []).length, on: S.on }); })()""")
shot("b_host_back")
E("""JSON.stringify({ errs: __errs })""")
json.dump(steps, open("test/s144.json", "w"), indent=0)
print(len(steps), "steps")
