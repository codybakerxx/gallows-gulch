// ---------- ASH (v37): a man the laser touches burns to ash ----------
// He's caught where he stands: a blue flash, and he goes black and glowing in the same moment, cracks of fire running through him.
// Then he crumbles from the top down, a line of embers sinking through him, and what's above it falls away as ash, a grey snow of it,
// which settles at his feet in a small heap that smoulders a while. His gun drops. (ashHit, from laserBeam in 12k.)
// For that second each of his meshes wears a charred material that cuts away everything above the falling line (ASH_SHADER); his own
// are put back, and he's whole again, for the next shootout (resetAsh).
const ASH = { list: [], piles: [], flakes: null, embers: null, mat: null };
const ASH_T = { heat: 0.22, crumble: 1.05, gone: 1.35 }; // (seconds: charred and glowing; the crumble from head to feet; out of sight)
const _a1 = new THREE.Vector3(), _a2 = new THREE.Vector3(), _a3 = new THREE.Vector3();

// the charred material: dark and mottled, cracks glowing; everything above uCut (world height, broken up by noise) is gone, and a band of
// fire burns along the edge
function ashMat() {
  const m = new THREE.MeshStandardMaterial({ color: 0x2c2723, roughness: 0.96, metalness: 0 }), A = m.userData.A = { cut: { value: 9 }, glow: { value: 1 } };
  m.onBeforeCompile = sh => { sh.uniforms.uCut = A.cut; sh.uniforms.uGlow = A.glow;
    sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nvarying vec3 vAshW;")
      .replace("#include <project_vertex>", "#include <project_vertex>\nvAshW = (modelMatrix * vec4(transformed, 1.0)).xyz;");
    sh.fragmentShader = sh.fragmentShader.replace("#include <common>", `#include <common>
      uniform float uCut, uGlow; varying vec3 vAshW;
      float ahh(vec3 p) { p = fract(p * 0.1031); p += dot(p, p.zyx + 31.32); return fract((p.x + p.y) * p.z); }
      float avn(vec3 p) { vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
        return mix(mix(mix(ahh(i), ahh(i + vec3(1.0, 0.0, 0.0)), f.x), mix(ahh(i + vec3(0.0, 1.0, 0.0)), ahh(i + vec3(1.0, 1.0, 0.0)), f.x), f.y),
                   mix(mix(ahh(i + vec3(0.0, 0.0, 1.0)), ahh(i + vec3(1.0, 0.0, 1.0)), f.x), mix(ahh(i + vec3(0.0, 1.0, 1.0)), ahh(i + vec3(1.0)), f.x), f.y), f.z); }`)
      .replace("#include <clipping_planes_fragment>", `#include <clipping_planes_fragment>
        float aN = avn(vAshW * 9.0) * 0.6 + avn(vAshW * 27.0) * 0.4, aEdge = uCut + (aN - 0.5) * 0.24, aD = aEdge - vAshW.y;
        if (aD < 0.0) discard;`)
      .replace("#include <map_fragment>", `#include <map_fragment>
        diffuseColor.rgb *= 0.35 + 0.75 * aN; diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.42, 0.4, 0.38), smoothstep(0.78, 0.92, avn(vAshW * 61.0)) * 0.7);`)
      .replace("#include <emissivemap_fragment>", `#include <emissivemap_fragment>
        { float crack = smoothstep(0.016, 0.0, abs(avn(vAshW * 17.0 + 3.0) - 0.5)) * smoothstep(0.35, 0.75, avn(vAshW * 4.0));
          totalEmissiveRadiance += vec3(1.0, 0.3, 0.05) * (smoothstep(0.08, 0.0, aD) * 3.0 + crack * 0.9) * uGlow; }`); };
  m.customProgramCacheKey = () => "gulchAsh"; return m;
}
// a heap of ash: a low mound, lumpy, grey with darker cinders and paler flecks (vertex colours)
function ashPileGeo() {
  const prof = []; for (let i = 0; i <= 8; i++) { const t = i / 8; prof.push(new THREE.Vector2(0.3 * Math.sin(Math.acos(t * 0.98)) * (1 - 0.12 * t), 0.15 * Math.pow(t, 0.85))); }
  prof.push(new THREE.Vector2(0, 0.152)); const g = new THREE.LatheGeometry(prof, 22), p = g.attributes.position, col = new Float32Array(p.count * 3), r = rng(91);
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), a = Math.atan2(z, x), k = 1 + 0.16 * Math.sin(a * 3 + 1.3) + 0.1 * Math.sin(a * 7 + y * 30);
    p.setXYZ(i, x * k, y * (0.85 + 0.3 * (0.5 + 0.5 * Math.sin(a * 2 + 0.4))), z * k);
    const c = 0.24 + r() * 0.2 + (r() < 0.1 ? 0.3 : 0) - (r() < 0.12 ? 0.14 : 0); col[i * 3] = c * 1.02; col[i * 3 + 1] = c; col[i * 3 + 2] = c * 0.95; }
  g.setAttribute("color", new THREE.BufferAttribute(col, 3)); g.computeVertexNormals(); return g;
}
// floating points: grey flakes that drift down slowly and settle, and embers that glow and fade on the heap
function ashPoints(n, size, col, additive) {
  const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(n * 3).fill(-50), 3)); geo.setAttribute("color", new THREE.BufferAttribute(new Float32Array(n * 3), 3));
  const m = new THREE.PointsMaterial({ map: SIEGE.gore && SIEGE.gore.dot || dotTex(), size, vertexColors: true, color: col, transparent: true, depthWrite: false, alphaTest: 0.02, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending });
  const pts = new THREE.Points(geo, m); pts.frustumCulled = false; pts.visible = false; R.scene.add(pts);
  return { pts, n, next: 0, v: new Float32Array(n * 3), life: new Float32Array(n), life0: new Float32Array(n), floor: new Float32Array(n), c: new Float32Array(n), land: new Float32Array(n) };
}
function ashEmit(P, at, vx, vy, vz, life, c, floor) { const j = P.next; P.next = (P.next + 1) % P.n; P.pts.geometry.attributes.position.setXYZ(j, at.x, at.y, at.z);
  P.v[j * 3] = vx; P.v[j * 3 + 1] = vy; P.v[j * 3 + 2] = vz; P.life[j] = P.life0[j] = life; P.c[j] = c; P.floor[j] = floor; P.land[j] = 0; P.pts.visible = true; }
function ashPointsStep(P, dt, fall) {
  if (!P.pts.visible) return; const a = P.pts.geometry.attributes.position.array, col = P.pts.geometry.attributes.color.array; let any = false;
  for (let j = 0; j < P.n; j++) { if (P.life[j] <= 0) continue; any = true; const k = j * 3; P.life[j] -= dt;
    if (fall && !P.land[j]) { P.v[k + 1] = Math.max(-1.1, P.v[k + 1] - 4.5 * dt); P.v[k] *= 1 - 1.6 * dt; P.v[k + 2] *= 1 - 1.6 * dt; // (light: it soon drifts rather than falls)
      a[k] += (P.v[k] + Math.sin(P.life[j] * 5 + j) * 0.12) * dt; a[k + 1] += P.v[k + 1] * dt; a[k + 2] += P.v[k + 2] * dt;
      if (a[k + 1] <= P.floor[j]) { a[k + 1] = P.floor[j] + 0.004; P.land[j] = 1; P.life[j] = Math.min(P.life[j], 0.35); } } // (landed: it's part of the heap now)
    const f = Math.min(1, P.life[j] / Math.min(0.8, P.life0[j])) * P.c[j]; col[k] = col[k + 1] = col[k + 2] = f;
    if (P.life[j] <= 0) a[k + 1] = -50; }
  P.pts.geometry.attributes.position.needsUpdate = true; P.pts.geometry.attributes.color.needsUpdate = true; if (!any) P.pts.visible = false;
}

// ---- the moment: a gunman touched by the beam ----
function ashHit(E, at, rd) {
  const S = SIEGE, a = E.a; if (!E.alive) return;
  E.alive = false; E.state = "dead"; a.path = null; a.arrive = null; a.setIK("R", null, 0); a.setIK("L", null, 0); a.setGrip("R", 0); a.setGrip("L", 0); a.lookPt = null; a.pre = null;
  a.frozen = true; a.talkAmt = 0; // (caught as he stood)
  if (!ASH.flakes) { ASH.flakes = ashPoints(900, 0.034, 0x9a948c, false); ASH.embers = ashPoints(160, 0.06, 0xff8a3a, true); }
  // his own materials kept, and the charred one on everything (hair, lashes and anything see-through just burn away)
  const keep = [], m = ashMat(); a.root.traverse(o => { if (!o.isMesh && !o.isPoints) return; keep.push([o, o.material, o.castShadow, o.visible]);
    const see = (Array.isArray(o.material) ? o.material : [o.material]).some(q => q && (q.transparent || q.alphaTest > 0)) || o.isPoints;
    if (see) { o.visible = false; return; } o.material = Array.isArray(o.material) ? o.material.map(() => m) : m; o.castShadow = false; });
  const base = a.pos.y, top = a.ch.bones.HeadTop_End ? a.ch.bones.HeadTop_End.getWorldPosition(_a1).y + 0.18 : base + 1.95;
  const A = E.ash = { t: 0, keep, m, base, top, at: at.clone(), feet: V3(a.pos.x, base, a.pos.z), pile: null, acc: 0, emberT: 0 };
  m.userData.A.cut.value = top + 0.2; m.userData.A.glow.value = 1.6; ASH.list.push(E);
  // the gun drops out of what was his hand
  E.gunV = rd.clone().setY(0).multiplyScalar(0.6).add(V3(rnd(-0.4, 0.4), 0.8, rnd(-0.4, 0.4))); E.gunW = V3(rnd(-6, 6), rnd(-6, 6), rnd(-6, 6));
  zapFx(a.ch.bones.Spine2.getWorldPosition(_a2), 1.0); Sound.ash(at, 1); Sound.clip(E.female ? siegePick("painf", 3) : siegePick("painm", 7), a.ch.bones.Head.getWorldPosition(_a3), 0.7, 0.02, 0.2, rnd(1.1, 1.2), 4);
  crowsStartle(at, 30, 1); siegeHud();
  if (S.enemies.every(q => !q.alive)) SLOW.t = 0; else if (S.enemies.filter(q => q.alive).length === 1) S.lastAt = S.t + 1.4;
}
function updateAsh(dt) {
  for (const E of ASH.list) { const A = E.ash; if (!A || A.t > 9) continue; A.t += dt; const a = E.a, U = A.m.userData.A, t = A.t;
    const k = clamp((t - ASH_T.heat) / ASH_T.crumble, 0, 1), cut = lerp(A.top + 0.2, A.base - 0.15, Ease.inOut(k) * 0.55 + k * 0.45);
    U.cut.value = cut; U.glow.value = t < ASH_T.heat ? 1.6 + t * 4 : lerp(2.2, 1.0, k);
    // the ash falling from the line as it sinks (a cylinder round him, wider at the shoulders and hips)
    if (k > 0 && k < 1) { A.acc += dt * 330; const y = cut, h = (y - A.base) / Math.max(0.5, A.top - A.base), rad = 0.12 + 0.12 * Math.sin(Math.min(1, h * 1.25) * Math.PI);
      while (A.acc >= 1) { A.acc -= 1; const an = Math.random() * TAU, rr = Math.sqrt(Math.random()) * rad;
        _a1.set(A.feet.x + Math.cos(an) * rr, y - Math.random() * 0.05, A.feet.z + Math.sin(an) * rr);
        const pale = Math.random() < 0.12; ashEmit(ASH.flakes, _a1, rnd(-0.35, 0.35), rnd(-0.1, 0.5), rnd(-0.35, 0.35), rnd(2.5, 4.5), pale ? rnd(0.85, 1) : rnd(0.35, 0.7), A.base + Math.random() * 0.02);
        if (Math.random() < 0.06) ashEmit(ASH.embers, _a1, rnd(-0.2, 0.2), rnd(0.2, 0.9), rnd(-0.2, 0.2), rnd(0.5, 1.2), 1, A.base); }
      if (Math.random() < dt * 9) puff(_a2.set(A.feet.x, y, A.feet.z), 2, 0.3, 0.2, 0.9, 0.35, 0x6a625c); }
    // the heap: it builds as the ash comes down
    if (!A.pile && t > ASH_T.heat + 0.25) { A.pile = new THREE.Mesh(ASH.pileGeo || (ASH.pileGeo = ashPileGeo()), ASH.mat || (ASH.mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 0 })));
      A.pile.position.copy(A.feet); A.pile.rotation.y = Math.random() * TAU; A.pile.scale.setScalar(0.001); A.pile.receiveShadow = true; A.pile.castShadow = true; A.pile.userData.dyn = true; R.scene.add(A.pile); ASH.piles.push(A.pile); }
    if (A.pile) { const g = clamp((t - ASH_T.heat - 0.25) / (ASH_T.crumble + 0.3), 0, 1), s = Ease.out(g); A.pile.scale.set(0.35 + 0.65 * s, Math.max(0.001, s), 0.35 + 0.65 * s); }
    if (t > ASH_T.heat + ASH_T.gone && a.root.visible) a.root.visible = false;
    // embers on the heap for a few seconds after
    if (A.pile && t > 1 && t < 6) { A.emberT -= dt; if (A.emberT <= 0) { A.emberT = rnd(0.05, 0.16); const an = Math.random() * TAU, rr = Math.random() * 0.22;
      ashEmit(ASH.embers, _a1.set(A.feet.x + Math.cos(an) * rr, A.base + 0.12 * (1 - rr / 0.3), A.feet.z + Math.sin(an) * rr), rnd(-0.04, 0.04), rnd(0.05, 0.25), rnd(-0.04, 0.04), rnd(0.4, 1.0), (6 - t) / 5, A.base);
      if (Math.random() < 0.15) puff(_a2.set(A.feet.x, A.base + 0.1, A.feet.z), 1, 0.15, 0.12, 0.6, 0.25, 0x5a5450); } } }
  if (ASH.flakes) { ashPointsStep(ASH.flakes, dt, true); ashPointsStep(ASH.embers, dt, true); }
}
// back as they were, for the next shootout
function resetAsh() {
  for (const E of ASH.list) { const A = E.ash; if (!A) continue; for (const [o, mat, sh, vis] of A.keep) { o.material = mat; o.castShadow = sh; o.visible = vis; }
    A.m.dispose(); E.a.frozen = false; E.a.root.visible = true; E.ash = null; }
  ASH.list = []; for (const p of ASH.piles) R.scene.remove(p); ASH.piles = [];
  for (const P of [ASH.flakes, ASH.embers]) if (P) { P.life.fill(0); P.pts.geometry.attributes.position.array.fill(-50); P.pts.geometry.attributes.position.needsUpdate = true; P.pts.visible = false; }
}
// compile the charred material up front with everyone else's (12c boot): worn for a moment by the first of the crowd
function ashPrecompile(on) {
  const a = LIFE.crowd[0]; if (!a) return;
  if (on) { ASH.pre = []; const m = ASH.preMat || (ASH.preMat = ashMat()); a.root.traverse(o => { if (o.isMesh && !(Array.isArray(o.material) ? o.material : [o.material]).some(q => q && (q.transparent || q.alphaTest > 0))) { ASH.pre.push([o, o.material]); o.material = Array.isArray(o.material) ? o.material.map(() => m) : m; } }); }
  else if (ASH.pre) { for (const [o, mat] of ASH.pre) o.material = mat; ASH.pre = null; }
}
