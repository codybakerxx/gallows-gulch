// shared by mk_s131.py and mk_s132.py: steps the game's clock without drawing, sets up a shootout, aims, rides and fights the getaway
window.__errs = window.__errs || [];
window.__go = async (n, until) => { window.GULCH_PAUSE = true; const RF = window.renderFrame; window.renderFrame = () => {}; let t = performance.now(); last = t;
  try { for (let i = 0; i < n; i++) { t += 1000 / 60; tick(t); await null; await null; if (until && until()) break; } } finally { window.renderFrame = RF; } t += 16.7; tick(t); return 1; };
window.__r = v => +(+v).toFixed(3);
window.__siege = async () => { STATE.misses = STATE.maxWrong - 1; STATE.hintShown = true; MAN.pathIdx = TRAP_I; MAN.place(MAN_PATH[TRAP_I][0], MAN_PATH[TRAP_I][1], trapYaw()); GAL.rope.onNeck = true; EXEC.gripping = true; hud();
  const miss = [...'QZXJVKWYFBPGMHUDCLNRSTOIEA'].filter(c => !STATE.word.includes(c) && !STATE.guessed.has(c)); guess(miss[0]);
  const iv = setInterval(() => { if (!STATE.trap && STATE.locked) STATE.ts = 6; }, 10); await __go(3000, () => SIEGE.phase === 'window'); clearInterval(iv); STATE.ts = 1; SIEGE.winEnd += 60000; await __go(4);
  startSiege(); await __go(1200, () => SIEGE.phase === 'fight' && !SIEGE.run); __calm(); return 1; };
window.__calm = () => { SIEGE.nextShot = 999; for (const q of SIEGE.enemies) if (q.alive) { if (q.state === 'aim' || q.state === 'recover') q.state = 'pause'; q.t = 999; } };
window.__aimPt = p => { const c = R.camera.position; SIEGE.yaw = Math.atan2(p.x - c.x, p.z - c.z); SIEGE.pitch = Math.atan2(p.y - c.y, Math.hypot(p.x - c.x, p.z - c.z)); };
window.__up = async () => { const S = SIEGE; S.holding = true; await __go(90, () => { __calm(); return S.cv < 0.05 && !S.crouch; }); };
// what a shot fired now would hit first: 'bell', an enemy, 'env' or null (the same tests fireTap makes)
window.__wouldHit = () => { const S = SIEGE; R.camera.updateMatrixWorld(); const ro = R.camera.position.clone(), rd = V3(0, 0, -1).applyQuaternion(R.camera.quaternion).normalize();
  let hit = null; for (const E of S.enemies) { if (!E.alive) continue; const far = E.a.ch.bones.Spine2.getWorldPosition(V3()).distanceTo(ro); const h = rayActor(E.a, ro, rd, E.female, clamp((far - 12) * 0.007, 0, 0.12)); if (h && (!hit || h.t < hit.t)) hit = Object.assign(h, { E }); }
  const env = sceneryRay(ro, rd, 80), bt = bellRay(ro, rd);
  if (bt > 0 && (!hit || bt < hit.t) && (!env || bt < env.distance)) return 'bell'; if (hit && (!env || hit.t < env.distance)) return hit.E; return env ? 'env' : null; };
// up from cover, find a cover from which the bell can be shot, aim at it and fire
window.__shootBell = async () => { const S = SIEGE; await __up();
  for (const c of [S.cover, 0, 1, 2]) { if (c !== S.cover) { S.cover = c; S.yaw = S.covers[c].yaw0; await __go(60, () => { __calm(); return !S.run && S.cv < 0.05; }); }
    for (let i = 0; i < 4; i++) { __aimPt(bellCentre(V3())); await __go(3, () => { __calm(); return false; }); }
    if (__wouldHit() === 'bell') { S.cool = 0; const b0 = S.bullets; fireTap(); return { cover: c, spent: b0 - S.bullets, unlocked: BELL.unlocked, swing: __r(BELL.angV) }; } }
  return { err: 'no cover could hit the bell' }; };
// one gunman you can shoot from where you are: kill the rest outright (no bullets spent), then put a real shot (fireTap) into him
window.__lastOne = async (bullets) => { const S = SIEGE; await __up(); let pick = null;
  for (const c of [S.cover, 0, 1, 2]) { if (c !== S.cover) { S.cover = c; S.yaw = S.covers[c].yaw0; await __go(60, () => { __calm(); return !S.run && S.cv < 0.05; }); }
    for (const q of S.enemies.filter(q => q.alive && !q.roof)) { q.a.path = null; q.state = 'pause'; q.t = 999; for (let i = 0; i < 3; i++) { const p = q.a.ch.bones.Spine2.getWorldPosition(V3()); __aimPt(p); await __go(2, () => { __calm(); return false; }); } if (__wouldHit() === q) { pick = q; break; } }
    if (pick) break; }
  if (!pick) return { err: 'nobody in a clear shot' };
  for (const q of S.enemies) if (q.alive && q !== pick) shotHits(q, SIEGE_PARTS[2], q.a.ch.bones.Spine2.getWorldPosition(V3()), V3(0, -0.2, -1).normalize());
  await __go(3, () => { __calm(); return false; }); for (let i = 0; i < 3; i++) { __aimPt(pick.a.ch.bones.Spine2.getWorldPosition(V3())); await __go(1); }
  S.bullets = bullets; S.cool = 0; const would = __wouldHit() === pick; fireTap(); return { would, killed: !pick.alive, bulletsLeft: S.bullets, phase: S.phase, alive: S.enemies.filter(q => q.alive).length }; };
// counters on the transitions that must happen once
window.__cnt = { sg: 0, victory: 0, results: 0, capture: 0, tracks: [], begins: 0 };
if (!window.__wrapped) { window.__wrapped = true;
  const w = (name, key) => { const f = window[name]; window[name] = function () { __cnt[key]++; return f.apply(this, arguments); }; };
  w('startGetaway', 'sg'); w('beginVictory', 'victory'); w('chaseResults', 'results'); w('chaseCapture', 'capture'); w('chaseBegin', 'begins');
  const tr = Sound.track; Sound.track = function (nm) { __cnt.tracks.push({ nm, muted: Sound.muted, master: Sound.masterGain, ready: Sound.ready }); return tr.apply(Sound, arguments); }; }
// riding: steer for the middle of the next row's way through
window.__auto = () => { const C = CHASE; const next = C.rows.find(r => r.s > C.s - 1.2); if (!next) { C.steerPad = 0; return; } const d = next.g - C.lat; C.steerPad = Math.abs(d) < 0.2 ? 0 : Math.sign(d) * Math.min(1, Math.abs(d) / 0.6); };
// the fight: point the gun (ay/ap, the way a drag or the mouse does) so that, with the drift the horse puts on it right now, it's on his chest
window.__aimRider = (R0, part = 'Spine2') => { const C = CHASE, K = CHASE_CFG, Sw = C.sway || { y: 0, p: 0 }, c = R.camera.position, p = R0.a.ch.bones[part].getWorldPosition(V3());
  const yawAbs = Math.atan2(p.x - c.x, p.z - c.z), pitchAbs = Math.atan2(p.y - c.y, Math.hypot(p.x - c.x, p.z - c.z));
  let ay = yawAbs - (C.horse.yaw + Math.PI) - Sw.y; ay = ((ay + Math.PI) % TAU + TAU) % TAU - Math.PI; C.ay = ay; C.ap = pitchAbs - Sw.p; C.mouse = null; return Math.abs(ay) <= K.yawLim; };
window.__fireAt = R0 => { const C = CHASE; if (!__aimRider(R0)) return 'out of reach'; C.cool = 0; const h0 = C.stats.hits; chaseFire(); return C.stats.hits > h0 ? 'hit' : 'miss'; };
// where the reticle is drawn vs where a shot goes, this frame
window.__retCheck = () => { const C = CHASE, cam = R.camera, ret = document.getElementById('chaseRet'), st = document.getElementById('stage').getBoundingClientRect();
  const px = parseFloat(ret.style.left), py = parseFloat(ret.style.top), rd = aimDir(V3()).normalize(), p = cam.position.clone().addScaledVector(rd, 40).project(cam);
  const sx = (p.x * 0.5 + 0.5) * R.w, sy = (-p.y * 0.5 + 0.5) * R.h;
  const ndc = V3((px / R.w) * 2 - 1, -(py / R.h) * 2 + 1, 0.5).unproject(cam).sub(cam.position).normalize(); // the ray back out through the drawn reticle
  return { dx: __r(px - sx), dy: __r(py - sy), angle: __r(ndc.angleTo(rd) * 1000), sway: [__r(C.sway.y), __r(C.sway.p)], seg: C.swerve && C.swerve.seg }; };
window.__touch = (el, type, id, x, y) => { const e = new PointerEvent(type, { pointerId: id, pointerType: 'touch', isPrimary: id === 1, bubbles: true, cancelable: true, clientX: x, clientY: y }); (typeof el === 'string' ? document.querySelector(el) : el).dispatchEvent(e); return e.defaultPrevented; };
window.__key = (key, down) => document.dispatchEvent(new KeyboardEvent(down ? 'keydown' : 'keyup', { key, bubbles: true, cancelable: true }));
window.__vis = id => { const e = document.getElementById(id); return !!e && !e.hidden && getComputedStyle(e).display !== 'none' && getComputedStyle(e).visibility !== 'hidden'; };
// the posse's state, short
window.__posse = () => CHASE.riders.map(r => [r.kind, r.alive ? r.state : 'down', __r(r.d), __r(r.l)]);
1
