// v53, mk_s147.py: how close the noose, its knot, the rope and the executioner's hands come to the condemned man's head and neck, measured
// against his skinned mesh vertex by vertex while it goes on (and comes off). Negative: into him (by that many metres)
window.__nzSkin = (stride = 2) => { const out = [], v = new THREE.Vector3(), nk = MAN.ch.bones.Neck.getWorldPosition(new THREE.Vector3()), up = new THREE.Vector3(0, 1, 0);
  for (const m of [MAN.ch.headMesh, MAN.ch.body]) { const P = m.geometry.attributes.position; m.updateMatrixWorld(true);
    for (let i = 0; i < P.count; i += stride) { v.fromBufferAttribute(P, i); m.boneTransform(i, v); v.applyMatrix4(m.matrixWorld); const dy = v.y - nk.y, dx = v.x - nk.x, dz = v.z - nk.z;
      if (dy > 0.022 && dy < 0.34 && dx * dx + dz * dz < 0.06) out.push(v.x, v.y, v.z); } }
  return new Float32Array(out); };
window.__nzMin = (pts, q, r) => { let m = 9, w = 0; for (let i = 0; i < pts.length; i += 3) { const d = Math.hypot(pts[i] - q.x, pts[i + 1] - q.y, pts[i + 2] - q.z); if (d < m) { m = d; w = i; } } window.__nzW = [pts[w], pts[w + 1], pts[w + 2]]; return m - r; };
window.__nzL = p => { const nk = MAN.ch.bones.Neck.getWorldPosition(new THREE.Vector3()), q = MAN.root.quaternion.clone().invert(); return new THREE.Vector3(...p).sub(nk).applyQuaternion(q).toArray().map(x => +x.toFixed(3)); };
window.__nzSeg = (pts, a, b, r) => { let m = 9; const ab = new THREE.Vector3().subVectors(b, a), L2 = ab.lengthSq() || 1e-9, q = new THREE.Vector3();
  for (let i = 0; i < pts.length; i += 3) { q.set(pts[i], pts[i + 1], pts[i + 2]); const t = Math.max(0, Math.min(1, q.clone().sub(a).dot(ab) / L2)); const d = q.distanceTo(a.clone().addScaledVector(ab, t)); if (d < m) m = d; } return m - r; };
window.__nzCheck = () => { const pts = __nzSkin(2), d = GAL.rope.drawn, n = new THREE.Vector3(0, 0, 1).applyQuaternion(d.q), X = new THREE.Vector3(1, 0, 0).applyQuaternion(d.q), Y = new THREE.Vector3(0, 1, 0).applyQuaternion(d.q);
  let ring = 9, rw = null; for (let k = 0; k < 48; k++) { const t = k / 48 * Math.PI * 2, p = d.c.clone().addScaledVector(X, Math.cos(t) * d.R).addScaledVector(Y, Math.sin(t) * d.R), m = __nzMin(pts, p, 0.013); if (m < ring) { ring = m; const qi = MAN.root.quaternion.clone().invert(); rw = [__nzL(__nzW), __nzL(p.toArray()), 'c', __nzL(d.c.toArray()), 'R', +d.R.toFixed(3), 'n', n.clone().applyQuaternion(qi).toArray().map(x => +x.toFixed(2)), 'gL', __nzL(gripPt(EXEC, 'L', new THREE.Vector3()).toArray()), 'gR', __nzL(gripPt(EXEC, 'R', new THREE.Vector3()).toArray())]; } }
  const sim = GAL.rope.sim, E = sim.P(sim.n - 1, new THREE.Vector3()), knot = __nzSeg(pts, d.attach.clone().lerp(E, 0.08), E, 0.025);
  let rope = 9; for (let i = sim.n - 12; i < sim.n - 1; i++) { const a = sim.P(i, new THREE.Vector3()), b = sim.P(i + 1, new THREE.Vector3()); rope = Math.min(rope, __nzSeg(pts, a, b, 0.019)); }
  let hand = 9, hw = null; for (const S of ["Left", "Right"]) for (const F of ["Index", "Middle", "Ring", "Pinky", "Thumb"]) for (let j = 1; j <= 4; j++) { const b = EXEC.ch.bones[S + "Hand" + F + j]; if (b) { const m = __nzMin(pts, b.getWorldPosition(new THREE.Vector3()), 0.011); if (m < hand) { hand = m; hw = [S + F + j, __nzL(__nzW)]; } } }
  for (const S of ["Left", "Right"]) hand = Math.min(hand, __nzMin(pts, EXEC.ch.bones[S + "Hand"].getWorldPosition(new THREE.Vector3()), 0.03));
  const reach = ['L', 'R'].map(S => { const k = EXEC.ik[S]; if (k.w < 0.97 || k.goal < 0.5) return 0; return EXEC.ch.bones[(S === 'L' ? 'Left' : 'Right') + 'Hand'].getWorldPosition(new THREE.Vector3()).distanceTo(k.t); });
  window.__nzWhere = { ring: rw, hand: hw }; return { ring, knot, rope, hand, reachL: -reach[0], reachR: -reach[1] }; };
window.__nzRun = async (fn, frames, every = 3) => { const worst = { ring: [9], knot: [9], rope: [9], hand: [9], reachL: [9], reachR: [9] }; const t0 = T; let i = 0; let done = false; fn().then(() => done = true);
  await __go(frames, () => { if (++i % every) return done; const c = __nzCheck(); for (const k in c) if (c[k] < worst[k][0]) worst[k] = [+c[k].toFixed(4), +(T - t0).toFixed(2), ROPE.mode, JSON.stringify(__nzWhere[k] || '')]; return done; }); return worst; };
1
