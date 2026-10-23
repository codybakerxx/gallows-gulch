# builds test/s123.json: where the gunmen's new cover sits. Overlaps with the scenery already there, clearance from each man's dash
# between his spots, and for every spot how much of a man shows from each of your covers, with and without it
import json
steps = []
E = lambda js: steps.append(["eval", js])
E("""window.__errs = []; window.addEventListener('error', e => __errs.push(String(e.message) + ' @' + (e.lineno||''))); 1""")
steps.append(["click", "#startBtn"]); steps.append(["wait", 1500])
E("""(() => { const S = SIEGE; const out = {};
  const vis = () => { S.occ = null; const r = {}; const spots = SIEGE_SPOTS.map((sp, i) => ['E' + i, sp]).concat([['EX', EXEC_SPOTS]]);
    for (const [name, sp] of spots) r[name] = sp.map(([x, z]) => S.covers.map(C => { const eye = V3(C.stand.x, SIEGE_CFG.eye, C.stand.z).addScaledVector(C.side, 0.08), y0 = floorAt(x, z);
      return [0.45, 0.85, 1.2, 1.5].map(h => { const p = V3(x, y0 + h, z), d = V3().subVectors(p, eye), L = d.length(); d.normalize(); const hit = sceneryRay(eye, d, L - 0.05); return hit ? '.' : 'o'; }).join(''); }).join(' '));
    return r; };
  for (const C of S.covers) C.grp.visible = true;
  S.props.visible = false; out.before = vis(); S.props.visible = true; out.after = vis();
  // overlaps with other small scenery
  S.props.updateMatrixWorld(true); const pb = S.props.children.map(o => new THREE.Box3().setFromObject(o)); const own = new Set(S.props.children); const ov = [];
  for (const o of S.occ) { if (own.has(o)) continue; const b = new THREE.Box3().setFromObject(o), sz = b.getSize(V3()); if (sz.x > 5 || sz.z > 5) continue;
    pb.forEach((B, i) => { if (B.intersectsBox(b)) ov.push([i, o.geometry.type, b.min.toArray().map(v => +v.toFixed(2)), b.max.toArray().map(v => +v.toFixed(2))]); }); }
  out.overlaps = ov;
  // clearance: the dash between a man's two spots (either end shifted up to 0.35 m) against each piece's footprint
  const rect = (B, x, z) => Math.hypot(Math.max(B.min.x - x, 0, x - B.max.x), Math.max(B.min.z - z, 0, z - B.max.z));
  // (in each piece's own frame, so a turned box counts as the box it is, not the square around it)
  const pieces = S.props.children.filter(o => o.isMesh && o.geometry.type !== 'PlaneGeometry' && o.geometry.type !== 'TorusGeometry').map(o => { o.geometry.computeBoundingBox(); return { inv: o.matrixWorld.clone().invert(), bb: o.geometry.boundingBox, s: o.scale.x }; });
  const odist = (x, z) => { let m = 9; for (const P of pieces) for (const y of [0.3, 0.8]) { const q = V3(x, y, z).applyMatrix4(P.inv), b = P.bb;
      const dx = Math.max(b.min.x - q.x, 0, q.x - b.max.x), dy = Math.max(b.min.y - q.y, 0, q.y - b.max.y), dz = Math.max(b.min.z - q.z, 0, q.z - b.max.z); if (dy > 0) continue; m = Math.min(m, Math.hypot(dx, dz) * P.s); } return m; };
  const clear = {}, offs = [-0.35, 0, 0.35];
  SIEGE_SPOTS.forEach((sp, i) => { let m = 9; for (const ax of offs) for (const az of offs) for (const bx of offs) for (const bz of offs) for (let k = 0; k <= 30; k++) { const t = k / 30;
      const x = (sp[0][0] + ax) + ((sp[1][0] + bx) - (sp[0][0] + ax)) * t, z = (sp[0][1] + az) + ((sp[1][1] + bz) - (sp[0][1] + az)) * t; m = Math.min(m, odist(x, z)); } clear['E' + i] = +m.toFixed(2); });
  out.pathClearWorst = clear;
  out.spotClear = SIEGE_SPOTS.map(sp => sp.map(([x, z]) => +odist(x, z).toFixed(2)));
  for (const C of S.covers) C.grp.visible = false; S.props.visible = false; S.occ = null;
  return JSON.stringify(out); })()""")
json.dump(steps, open("test/s123.json", "w"), indent=0)
