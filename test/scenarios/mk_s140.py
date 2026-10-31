# builds test/s140.json: v40.
#   - the menu has a red X that closes it (shown once a game's been started)
#   - the end signs can be put away: GAME OVER after a hanging (the body still handled by a touch on it), and the getaway's results; while
#     away a drag turns the view all the way round and up and down; Show the sign brings it back and turns you back
#   - the town shootout's revolver holds seven, and its reload is seven
#   - the run: the first thing ridden into warns you; the second and they have you: shot out of the saddle, the view going over into the
#     dirt while the horse runs on; the results say Shot Down
#   - the end of the getaway: nothing left standing over the canyon (the town, its props and tufts are put away while it's there, and come
#     back with it gone); back to the hangman from the results the view is in town at once, out of black, with no flight across the desert
# Prints one JSON line per check; "ok" is true when it passed.
import json, os, sys
pre = sys.argv[1] if len(sys.argv) > 1 else "g140"
HERE = os.path.dirname(os.path.abspath(__file__))
steps = []
E = lambda js: steps.append(["eval", js])
shot = lambda f: steps.append(["shot", f"test/{pre}_{f}.png"])
E("""window.__errs = []; window.addEventListener('error', e => __errs.push(String(e.message) + ' @' + (e.filename || '').split('/').pop() + ':' + (e.lineno || ''))); window.addEventListener('unhandledrejection', e => __errs.push('rej ' + String(e.reason && e.reason.stack || e.reason))); 1""")
steps.append(["wait", 2500]) # (and the page drawing again before the click: under SwiftShader the first frames behind the menu can take a while)
E("""new Promise(res => { const to = setTimeout(() => res('no frame in 120 s'), 120000); requestAnimationFrame(() => requestAnimationFrame(() => { clearTimeout(to); res(1); })); })""")
steps.append(["wait", 600]); steps.append(["click", "#startBtn"]); steps.append(["wait", 1500])
E(open(os.path.join(HERE, "chase_helpers.js")).read())
E("""window.__check = (name, ok, info) => JSON.stringify({ check: name, ok: !!ok, info, errs: __errs.slice(0, 3) });
window.__ptr = (type, x, y, id = 7) => { const tg = type === 'pointerdown' ? $('scene') : window; tg.dispatchEvent(new PointerEvent(type, { pointerId: id, pointerType: 'touch', isPrimary: true, bubbles: true, cancelable: true, clientX: x, clientY: y })); };
window.__drag = async (dx, dy, steps = 10, x0f = 0.5, y0f = 0.3) => { const r = $('scene').getBoundingClientRect(), x0 = r.left + r.width * x0f, y0 = r.top + r.height * y0f; __ptr('pointerdown', x0, y0);
  for (let i = 1; i <= steps; i++) { __ptr('pointermove', x0 + dx * i / steps, y0 + dy * i / steps); await __go(1); } __ptr('pointerup', x0 + dx, y0 + dy); await __go(1); };
window.__fwd = () => { R.camera.updateMatrixWorld(); return V3(0, 0, -1).applyQuaternion(R.camera.quaternion); };
window.__yawOf = () => { const f = __fwd(); return Math.atan2(f.x, f.z); };
window.__dy = (a, b) => ((a - b + Math.PI) % TAU + TAU) % TAU - Math.PI;
window.__toCombat = async () => { const C = CHASE; await __go(600, () => C.state === 'ride'); await __go(10); C.s = C.turnAt - 4; for (const ob of C.obs) dropObstacle(ob); C.obs = []; C.rows = []; C.nextRow = 1e9; await __go(600, () => C.state === 'combat' && C.safeT <= 0); }; 1""")
# ---- the menu's X ----
E("""(async () => { await __go(120, () => !STATE.locked); openMenu(); await __go(2); const shown = __vis('menuClose'); $('menuClose').click(); await __go(2);
  return __check('the menu: a red X closes it', shown && $('menu').hidden && getComputedStyle($('menuClose')).backgroundImage.includes('gradient'), { shown, closed: $('menu').hidden }); })()""")
# ---- GAME OVER put away ----
E("""(async () => { STATE.misses = STATE.maxWrong - 1; MAN.pathIdx = TRAP_I; MAN.place(MAN_PATH[TRAP_I][0], MAN_PATH[TRAP_I][1], trapYaw()); GAL.rope.onNeck = true; EXEC.gripping = true; hud();
  const miss = [...'QZXJVKWYFBPGMHUDCLNRSTOIEA'].filter(c => !STATE.word.includes(c) && !STATE.guessed.has(c)); guess(miss[0]);
  const iv = setInterval(() => { if (!STATE.trap && STATE.locked) STATE.ts = 6; }, 10); await __go(4000, () => !$('sign').hidden); clearInterval(iv); await __go(10);
  const btn = document.querySelector('#sign .signMin'), had = !!btn && __vis('sign'); btn.click(); await __go(2); const away = $('sign').hidden && __vis('signShow') && FREE.on;
  const y0 = __yawOf(), p0 = Math.asin(__fwd().y); await __drag(-900, 0, 24, 0.85, 0.15); const turned = Math.abs(__dy(__yawOf(), y0)), total = Math.abs(FREE.yaw); await __drag(0, -1500, 20, 0.85, 0.2); const up = Math.asin(__fwd().y);
  await __drag(0, 3000, 30, 0.85, 0.1); const down = Math.asin(__fwd().y); return __check('GAME OVER put away: look all the way round', had && away && total > 3.2 && up > 1.3 && down < -1.3, { had, away, total: +total.toFixed(2), up: +up.toFixed(2), down: +down.toFixed(2), playing: PLAY.on }); })()""")
shot("a_game_over_away")
E("""(async () => { $('signShow').click(); await __go(80); return __check('Show the sign: back, and turned back', !$('sign').hidden && !__vis('signShow') && !FREE.on && Math.abs(FREE.yaw) < 0.01 && Math.abs(FREE.pitch) < 0.01, { sign: !$('sign').hidden, yaw: FREE.yaw }); })()""")
# ---- seven in the gun ----
E("""(async () => { $('sign').hidden = true; newRound(); await __go(30); await __siege(); const S = SIEGE, b0 = S.bullets, tip = SIEGE_TIP2; S.holding = true; S.pitch = 1.3; await __go(40, () => { __calm(); return false; });
  for (let i = 0; i < b0; i++) { S.cool = 0; fireTap(); await __go(2); } const reloading = S.reloadT > 0; await __go(200, () => { __calm(); return S.reloadT <= 0; });
  return __check('seven in the gun, and the reload is seven', SIEGE_ROUNDS === 7 && b0 === 7 && reloading && S.bullets === 7 && /Seven in the gun/.test(tip) && document.querySelectorAll('#cyl circle[r="8.4"]').length === 7, { first: b0, reloading, after: S.bullets, tip }); })()""")
# ---- the run: two strikes, and shot ----
E("""(async () => { const S = SIEGE; await __shootBell(); await __lastOne(1); const C = CHASE; await __go(600, () => C.state === 'ride'); await __go(20); const g0 = C.gap;
  const hit = () => { const ob = C.obs.find(o => o.run && !o.hit) || C.obs[0]; runHit(ob, 'crash'); }; hit(); await __go(3); const after1 = { state: C.state, msg: $('chaseMsg').textContent, gap: +C.gap.toFixed(1) };
  await __go(60); hit(); await __go(3); const after2 = { state: C.state, from: C.cap && C.cap.from, falling: !!(C.cap && C.cap.fall) }; const y0 = R.camera.position.y; await __go(50); const y1 = R.camera.position.y, roll = Math.abs(new THREE.Euler().setFromQuaternion(R.camera.quaternion, 'YXZ').z);
  return __check('the run: warned at the first, shot at the second', after1.state === 'ride' && /One more/.test(after1.msg) && after2.state === 'captured' && after2.from === 'ride' && after2.falling && y0 - y1 > 1 && roll > 0.6, { after1, after2, drop: +(y0 - y1).toFixed(2), roll: +roll.toFixed(2) }); })()""")
shot("b_shot_off_the_horse")
E("""(async () => { const C = CHASE; await __go(600, () => C.state === 'results'); await __go(30); return __check('the results: Shot Down', C.state === 'results' && $('resTitle').textContent === 'Shot Down' && /shot you out of the saddle/.test($('resLine').textContent), { title: $('resTitle').textContent, line: $('resLine').textContent }); })()""")
# ---- the end of the getaway: nothing floating over the canyon ----
E("""(async () => { chaseRetry(); const C = CHASE; await __toCombat(); for (const r of C.riders) if (r.alive) { r.hp = 1; riderHit(r, SIEGE_PARTS[2], r.a.ch.bones.Spine2.getWorldPosition(V3()), V3(0, 0, 1)); }
  await __go(900, () => C.cine && C.cine.phase === 'fall' && C.cine.ft > 0.5); const A = C.canyonAt, v = V3(), Mi = new THREE.Matrix4(), out = [];
  const over = p => { const dx = p.x - A.p.x, dz = p.z - A.p.z, lx = dx * A.n.x + dz * A.n.z, lz = dx * A.h.x + dz * A.h.z; return Math.abs(lx) < A.half && lz > canyonRim(lx, false) + 1 && lz < A.W + canyonRim(lx, true) - 1; };
  const shown = o => { for (let q = o; q; q = q.parent) if (!q.visible) return false; return true; };
  R.scene.traverse(o => { if (!o.isMesh || !shown(o) || o.userData.dyn || o.isSkinnedMesh || !o.frustumCulled || o === C.canyon || o === C.river || (C.pebbles || []).some(p => p.m === o)) return; // (the stones going over with him) if (!o.geometry.boundingSphere) o.geometry.computeBoundingSphere(); o.updateMatrixWorld();
    if (o.isInstancedMesh) { for (let i = 0; i < o.count; i++) { o.getMatrixAt(i, Mi); if (Mi.elements[0] === 0 && Mi.elements[5] === 0 && Mi.elements[10] === 0) continue; Mi.premultiply(o.matrixWorld); v.setFromMatrixPosition(Mi); if (over(v)) { out.push('inst'); break; } } return; }
    if (o.geometry.boundingSphere.radius * o.matrixWorld.getMaxScaleOnAxis() > 250) return; v.copy(o.geometry.boundingSphere.center).applyMatrix4(o.matrixWorld); if (over(v)) out.push(o.material && o.material.type); });
  window.__hid = (C.canyonHid || []).length; return __check('the fall: nothing left standing over the canyon', !out.length && __hid > 20, { left: out.slice(0, 8), putAway: __hid, instanced: (C.canyonIm || []).length }); })()""")
shot("c_fall")
E("""(async () => { const C = CHASE; await __go(900, () => C.state === 'results'); await __go(20); const btn = document.querySelector('#chaseRes .signMin'); btn.click(); await __go(2); const away = $('chaseRes').hidden && FREE.on;
  const y0 = __yawOf(); await __drag(-900, 0, 24, 0.5, 0.3); const total = Math.abs(FREE.yaw), turned = Math.abs(__dy(__yawOf(), y0)); await __go(2);
  return __check('the results put away: look round', away && total > 3.2 && turned > 0.3, { away, total: +total.toFixed(2), turned: +turned.toFixed(2) }); })()""")
shot("d_results_away")
E("""(async () => { $('signShow').click(); await __go(5); const back = !$('chaseRes').hidden; chaseHome(); await __go(2); const d = R.camera.position.length(), fade = +getComputedStyle($('chaseFade')).opacity, F = !$('chaseFade').hidden;
  return __check('back to the hangman: in town at once, out of black', back && d < 40 && F && !CHASE.on && C_hidRestored(), { back, camFromTown: +d.toFixed(1), fading: F, opacity: fade, restored: C_hidRestored() }); })()""".replace("C_hidRestored()", "(CHASE.canyonHid || []).length === 0 && (CHASE.canyonIm || []).length === 0"))
shot("e_home")
E("""(async () => { await __go(60); return 1; })()""")
shot("f_home_later")
E("""JSON.stringify({ errs: __errs })""")
json.dump(steps, open("test/s140.json", "w"), indent=0)
print(len(steps), "steps")
