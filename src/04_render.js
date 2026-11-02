// ---------- RENDERER + FILMIC POST ----------
const R = { renderer: null, scene: null, camera: null, composer: null, bloom: null, grade: null, tier: "high", dpr: 1, w: 1, h: 1, webgl2: false };
// detail: close-up detail textures layered over ground, wood and stone (0 off, 1 on, 2 with a second, finer octave); clutter: how much
// small stuff lies about the town and the desert (stones, debris, tumbleweeds, porch props), 0-1.5
const TIERS = {
  ultra: { dpr: 2.5, shadow: 4096, bloom: true, msaa: 4, tex: 1024, crowd: 12, grass: 1.6, ao: 16, shafts: 48, pcss: true, vol: 28, sss: 20, detail: 2, clutter: 1.5 },
  high: { dpr: 2, shadow: 2048, bloom: true, msaa: 4, tex: 512, crowd: 12, grass: 1.2, ao: 12, shafts: 40, pcss: true, vol: 20, sss: 16, detail: 2, clutter: 1.2 },
  medium: { dpr: 1.5, shadow: 1024, bloom: true, msaa: 2, tex: 512, crowd: 6, grass: 0.7, ao: 8, shafts: 24, pcss: true, vol: 0, sss: 10, detail: 1, clutter: 0.8 },
  low: { dpr: 1.25, shadow: 1024, bloom: false, msaa: 2, tex: 256, crowd: 3, grass: 0.35, ao: 0, shafts: 0, sss: 0, detail: 0, clutter: 0.4 }
};
const TIER_ORDER = ["ultra", "high", "medium", "low"];
const tierAtLeast = t => TIER_ORDER.indexOf(R.tier) <= TIER_ORDER.indexOf(t); // (the tier now is this one or better)
if (window.GULCH_TIER_PATCH) for (const k in window.GULCH_TIER_PATCH) Object.assign(TIERS[k], window.GULCH_TIER_PATCH[k]); // test hook
function pickTier(pref) {
  if (pref && TIERS[pref]) return pref;
  const mobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && Math.min(screen.width, screen.height) < 820);
  return mobile ? "high" : "ultra"; // (frames that run long step it down while playing: 12c)
}
const GradeShader = {
  uniforms: { tDiffuse: { value: null }, exposure: { value: 0.92 }, time: { value: 0 }, dusk: { value: 0 }, res: { value: new THREE.Vector2(1, 1) },
    vignette: { value: 1 }, grain: { value: 0.035 }, flash: { value: 0 }, fade: { value: 0 }, zoomBlur: { value: 0 },
    tDepth: { value: null }, sun: { value: new THREE.Vector2(0.5, 0.5) }, flare: { value: 0 }, sunCol: { value: new THREE.Color(1, 0.8, 0.6) } },
  vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
  fragmentShader: `
    uniform sampler2D tDiffuse, tDepth; uniform float exposure, time, dusk, vignette, grain, flash, fade, flare, zoomBlur; uniform vec2 res, sun; uniform vec3 sunCol; varying vec2 vUv;
    float gh(vec2 p){ return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5453); }
    float gn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(gh(i), gh(i + vec2(1.0, 0.0)), f.x), mix(gh(i + vec2(0.0, 1.0)), gh(i + vec2(1.0, 1.0)), f.x), f.y); }
    // a soft hexagonal iris ghost
    float ghost(vec2 p, vec2 c, float r) { vec2 q = abs((p - c) * vec2(res.x / res.y, 1.0)); float hx = max(q.x * 0.866 + q.y * 0.5, q.y); return smoothstep(r, r * 0.82, hx) * (0.55 + 0.45 * smoothstep(r * 0.4, r, hx)); }
    vec3 RRTAndODTFit(vec3 v){ vec3 a = v * (v + 0.0245786) - 0.000090537; vec3 b = v * (0.983729 * v + 0.4329510) + 0.238081; return a / b; }
    vec3 ACES(vec3 c){ const mat3 i = mat3(0.59719,0.07600,0.02840, 0.35458,0.90834,0.13383, 0.04823,0.01566,0.83777);
      const mat3 o = mat3(1.60475,-0.10208,-0.00327, -0.53108,1.10813,-0.07276, -0.07367,-0.00605,1.07602);
      c = i * c; c = RRTAndODTFit(c); c = o * c; return clamp(c, 0.0, 1.0); }
    float hash(vec2 p){ p = fract(p * vec2(443.897, 441.423)); p += dot(p, p.yx + 19.19); return fract((p.x + p.y) * p.x); }
    void main(){
      vec2 c = vUv - 0.5; float r2 = dot(c, c);
      vec2 off = c * r2 * 0.0035;
      vec3 col = vec3(texture2D(tDiffuse, vUv + off).r, texture2D(tDiffuse, vUv).g, texture2D(tDiffuse, vUv - off).b);
      // speed: the edges of the view smear outward from where you're heading (the getaway's run at a full gallop); the middle stays sharp
      if (zoomBlur > 0.002) { vec2 zc = vUv - vec2(0.5, 0.46); float zr = smoothstep(0.08, 0.5, length(zc * vec2(res.x / res.y, 1.0))); vec3 acc = col; float jit = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
        for (int i = 1; i <= 5; i++) acc += texture2D(tDiffuse, vUv - zc * zoomBlur * zr * (float(i) - jit) * 0.012).rgb; col = acc / 6.0; }
      // the lens: with the sun in frame and not blocked, ghosts of the iris line up through the centre and the glare lights the dust on the glass
      if (flare > 0.001) {
        float vis = 0.0; for (int k = 0; k < 5; k++) { vec2 o = vec2(cos(float(k) * 1.2566), sin(float(k) * 1.2566)) * 0.006 * float(k > 0); vis += step(0.9999995, texture2D(tDepth, clamp(sun + o, 0.001, 0.999)).x); }
        vis *= 0.2 * flare;
        if (vis > 0.001) {
          vec2 axis = vec2(0.5) - sun; vec3 fl = vec3(0.0);
          fl += ghost(vUv, sun + axis * 0.55, 0.035) * vec3(0.35, 0.55, 0.32);
          fl += ghost(vUv, sun + axis * 0.82, 0.018) * vec3(0.6, 0.35, 0.25);
          fl += ghost(vUv, sun + axis * 1.25, 0.06) * vec3(0.18, 0.28, 0.42);
          fl += ghost(vUv, sun + axis * 1.55, 0.026) * vec3(0.45, 0.32, 0.6);
          fl += ghost(vUv, sun + axis * 1.95, 0.09) * vec3(0.22, 0.2, 0.12);
          vec2 ds = (vUv - sun) * vec2(res.x / res.y, 1.0); float dd = length(ds);
          float streak = exp(-abs(ds.y) * 220.0) * exp(-abs(ds.x) * 2.2) * 0.6;   // a faint horizontal streak through the sun
          float glare = exp(-dd * 3.2);
          vec2 dq = vUv * vec2(res.x / res.y, 1.0);
          float dirt = smoothstep(0.5, 0.9, gn(dq * 5.0) * 0.55 + gn(dq * 17.0 + 7.0) * 0.3 + gn(dq * 47.0 + 3.0) * 0.15);
          col += (fl * 0.07 + sunCol * (streak * 0.35 + (0.25 + dirt) * glare * 0.06)) * vis;
        }
      }
      col *= exposure * (1.0 + 0.32 * dusk);
      col = ACES(col);
      float l = dot(col, vec3(0.2126, 0.7152, 0.0722));
      col = mix(col, col * vec3(1.05, 0.99, 0.90), smoothstep(0.35, 1.0, l));
      col = mix(col, col * vec3(0.90, 0.96, 1.07), (1.0 - smoothstep(0.0, 0.35, l)) * 0.8);
      col = mix(vec3(l), col, 1.18 + 0.12 * dusk);
      col = col * col * (3.0 - 2.0 * col) * 0.35 + col * 0.65;
      float vig = 1.0 - (0.5 + 0.15 * dusk) * smoothstep(0.42, 0.95, length(c) * 1.25);
      col *= mix(1.0, vig, vignette);
      col = pow(max(col, 0.0), vec3(1.0 / 2.2));
      col += (hash(vUv * res + fract(time) * 517.0) - 0.5) * grain;
      col = mix(col, vec3(1.0, 0.95, 0.88), flash);
      col *= 1.0 - fade;
      gl_FragColor = vec4(col, 1.0);
    }`
};
// one post pass after the scene: depth-of-field gather for close-ups (samples only count if their own blur reaches this
// pixel, so a sharp face never smears into the soft background) and the depth-aware upsample of the half-res AO
const PostShader = {
  uniforms: { tDiffuse: { value: null }, tDepth: { value: null }, tAO: { value: null }, tShafts: { value: null }, res: { value: new THREE.Vector2(1, 1) }, aoRes: { value: new THREE.Vector2(1, 1) },
    focus: { value: 1 }, aperture: { value: 2.0 }, maxCoC: { value: 10 }, amount: { value: 0 }, aoStrength: { value: 0 }, shaftAmt: { value: 0 }, near: { value: 0.1 }, far: { value: 4000 },
    sssAmt: { value: 0 }, sssWidth: { value: 0.0026 }, projScale: { value: 1000 },
    tVol: { value: null }, volRes: { value: new THREE.Vector2(1, 1) }, volAmt: { value: 0 }, volCol: { value: new THREE.Color(1, 0.7, 0.4) } },
  vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
  fragmentShader: `
    uniform sampler2D tDiffuse, tDepth, tAO, tShafts; uniform vec2 res, aoRes; uniform float focus, aperture, maxCoC, amount, aoStrength, shaftAmt, near, far, sssAmt, sssWidth, projScale;
    uniform sampler2D tVol; uniform vec2 volRes; uniform float volAmt; uniform vec3 volCol; varying vec2 vUv;
    float skinW(float a) { return clamp((0.72 - a) / 0.14, 0.0, 1.0) * step(0.3, a); }
    float lzd(float d) { return (near * far) / (far - (far - near) * d); }
    float coc(float d) { float z = lzd(d); return clamp(abs(z - focus) / z * aperture, 0.0, 1.0) * maxCoC * amount; }
    void main() {
      float d0 = texture2D(tDepth, vUv).x; vec4 c0 = texture2D(tDiffuse, vUv); vec3 col = c0.rgb;
      // screen-space subsurface scattering: light diffuses a few millimetres under living skin, red farthest, blue least
      float sk = skinW(c0.a);
      if (sssAmt > 0.001 && sk > 0.01) {
        float z0 = lzd(d0), rpx = min(sssWidth * projScale / z0, 40.0);
        if (rpx > 1.0) {
          vec3 acc = col, ws = vec3(1.0);
          float rot = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715)))) * 6.2832;
          for (int i = 0; i < SSS_N; i++) {
            float fi = (float(i) + 0.5) / float(SSS_N), r = sqrt(fi), a = float(i) * 2.39996 + rot;
            vec2 uv = vUv + vec2(cos(a), sin(a)) * r * rpx / res;
            vec4 s = texture2D(tDiffuse, uv); float dz = lzd(texture2D(tDepth, uv).x) - z0;
            vec3 w = skinW(s.a) * exp(-dz * dz * 90000.0) * exp(-r * r / vec3(0.72, 0.2, 0.09));
            acc += s.rgb * w; ws += w;
          }
          vec3 sc = acc / ws; float lc = dot(col, vec3(0.2126, 0.7152, 0.0722)), ls = dot(sc, vec3(0.2126, 0.7152, 0.0722));
          sc *= mix(1.0, lc / max(ls, 1e-4), 0.75); // keep the pore and stubble detail on top of the soft light
          col = mix(col, sc, sk * sssAmt);
        }
      }
      if (amount > 0.01) {
        float r0 = coc(d0);
        if (r0 >= 0.6) {
          vec3 acc = col; float ws = 1.0;
          for (int i = 0; i < DOF_N; i++) {
            float fi = float(i) + 0.5, r = sqrt(fi / float(DOF_N)) * r0, a = fi * 2.39996;
            vec2 uv = vUv + vec2(cos(a), sin(a)) * r / res;
            float rs = coc(texture2D(tDepth, uv).x), w = smoothstep(r - 1.5, r, rs);
            acc += texture2D(tDiffuse, uv).rgb * w; ws += w;
          }
          col = acc / ws;
        }
      }
      if (aoStrength > 0.001) {
        float z0 = lzd(d0), acc = 0.0, ws = 0.0;
        for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) {
          vec2 uv = vUv + vec2(float(i), float(j)) * 1.25 / aoRes;
          float w = 1.0 / (0.002 + abs(lzd(texture2D(tDepth, uv).x) - z0) / z0);
          acc += texture2D(tAO, uv).r * w; ws += w;
        }
        float l = dot(col, vec3(0.2126, 0.7152, 0.0722));
        col *= mix(1.0, acc / ws, aoStrength * (1.0 - 0.45 * smoothstep(0.6, 2.5, l)));
      }
      if (volAmt > 0.001) { // depth-aware upsample of the half-res light shafts
        float z0 = lzd(d0); vec4 acc = vec4(0.0); float ws = 0.0;
        for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) {
          vec2 uv = vUv + vec2(float(i), float(j)) * 1.5 / volRes;
          float w = 1.0 / (0.004 + abs(lzd(texture2D(tDepth, uv).x) - z0) / z0); acc += texture2D(tVol, uv) * w; ws += w; }
        acc /= ws; col = col * mix(1.0, acc.a, 0.35 * volAmt) + acc.rgb * volCol * volAmt;
      }
      if (shaftAmt > 0.001) col += texture2D(tShafts, vUv).rgb * shaftAmt; // sunlight scattering off the dust in the air, blocked by everything solid
      gl_FragColor = vec4(col, c0.a);
    }`
};
// dusty air: exponential haze that glows toward the setting sun (patched into every lit material)
function patchFog(sunAz) {
  const C = THREE.ShaderChunk, sx = Math.cos(sunAz).toFixed(4), sz = Math.sin(sunAz).toFixed(4);
  C.fog_pars_vertex = "#ifdef USE_FOG\n varying float vFogDepth; varying vec3 vFogVP; varying float vFogH;\n#endif";
  C.fog_vertex = "#ifdef USE_FOG\n vFogDepth = - mvPosition.z; vFogVP = mvPosition.xyz;\n #ifdef USE_INSTANCING\n vFogH = ( modelMatrix * instanceMatrix * vec4( transformed, 1.0 ) ).y;\n #else\n vFogH = ( modelMatrix * vec4( transformed, 1.0 ) ).y;\n #endif\n#endif";
  C.fog_pars_fragment = "#ifdef USE_FOG\n uniform vec3 fogColor; varying float vFogDepth; varying vec3 vFogVP; varying float vFogH;\n #ifdef FOG_EXP2\n uniform float fogDensity;\n #else\n uniform float fogNear; uniform float fogFar;\n #endif\n#endif";
  C.fog_fragment = `#ifdef USE_FOG
    #ifdef FOG_EXP2
      float fogFactor = 1.0 - exp(-fogDensity * vFogDepth * 1.7);
      // plus dust that hangs in the bottom few metres of air: exponential height fog integrated along the view ray
      float fh0 = max(cameraPosition.y, 0.0), fh1 = max(vFogH, 0.0), fdh = fh1 - fh0;
      float fhf = abs(fdh) > 0.05 ? (exp(-0.5 * fh0) - exp(-0.5 * fh1)) / (0.5 * fdh) : exp(-0.5 * fh0);
      fogFactor = 1.0 - (1.0 - fogFactor) * exp(-fogDensity * 1.6 * vFogDepth * fhf * mix(0.08, 1.0, smoothstep(-30.0, -2.0, vFogH))); // (down in a canyon the air is clearer than the dust over the plain)
    #else
      float fogFactor = smoothstep(fogNear, fogFar, vFogDepth);
    #endif
    vec3 fogDirW = normalize((vec4(vFogVP, 0.0) * viewMatrix).xyz);
    float fogMu = max(dot(fogDirW, normalize(vec3(${sx}, 0.07, ${sz}))), 0.0);
    vec3 fogCol = mix(fogColor, fogColor * vec3(1.75, 1.25, 0.82), pow(fogMu, 5.0) * 0.75 + pow(fogMu, 36.0) * 0.6);
    gl_FragColor.rgb = mix(gl_FragColor.rgb, fogCol, fogFactor);
  #endif`;
}
// contact-hardening sun shadows (PCSS): find the average blocker depth, then widen the filter with the gap between blocker
// and receiver — crisp where a boot meets the ground, soft at the far end of a long sunset shadow
function patchShadows(tier, ext = 30, depth = 159) {
  const C = THREE.ShaderChunk, src = C.shadowmap_pars_fragment, a = src.indexOf("#elif defined( SHADOWMAP_TYPE_PCF_SOFT )"), b = src.indexOf("#elif defined( SHADOWMAP_TYPE_VSM )");
  if (a < 0 || b < a) { console.warn("PCSS patch skipped"); return; }
  const hi = tier === "high" || tier === "ultra", km = (depth * Math.tan(THREE.MathUtils.degToRad(0.6)) / ext).toFixed(5);
  const pcss = `#elif defined( SHADOWMAP_TYPE_PCF_SOFT )
      vec2 texelSize = vec2( 1.0 ) / shadowMapSize;
      float zR = shadowCoord.z, rot = 6.2832 * fract( 52.9829189 * fract( dot( gl_FragCoord.xy, vec2( 0.06711056, 0.00583715 ) ) ) );
      float blk = 0.0, nb = 0.0;
      for ( int i = 0; i < ${hi ? 12 : 6}; i ++ ) {
        float fi = ( float( i ) + 0.5 ) / ${hi ? "12.0" : "6.0"}, an = float( i ) * 2.39996 + rot;
        float d = unpackRGBAToDepth( texture2D( shadowMap, shadowCoord.xy + vec2( cos( an ), sin( an ) ) * sqrt( fi ) * ${hi ? "14.0" : "9.0"} * texelSize ) );
        if ( d < zR ) { blk += d; nb += 1.0; }
      }
      if ( nb > 0.5 ) {
        float pen = clamp( ( zR - blk / nb ) * ${km} * shadowMapSize.x, 1.0, ${hi ? "14.0" : "9.0"} ), s = 0.0;
        for ( int i = 0; i < ${hi ? 20 : 10}; i ++ ) {
          float fi = ( float( i ) + 0.5 ) / ${hi ? "20.0" : "10.0"}, an = float( i ) * 2.39996 + rot * 1.618;
          s += texture2DCompare( shadowMap, shadowCoord.xy + vec2( cos( an ), sin( an ) ) * sqrt( fi ) * pen * texelSize, zR );
        }
        shadow = s / ${hi ? "20.0" : "10.0"};
      }
      `;
  C.shadowmap_pars_fragment = src.slice(0, a) + pcss + src.slice(b);
}
// screen-space ambient occlusion from the scene depth: half-res estimate, depth-aware upsample, darkens what the sky can't reach
class AOPass extends THREE.Pass {
  constructor(samples) {
    super(); this.needsSwap = false; this.strength = 0.85;
    this.rt = new THREE.WebGLRenderTarget(4, 4, { type: THREE.UnsignedByteType, depthBuffer: false });
    const vs = "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }";
    this.aoMat = new THREE.ShaderMaterial({ uniforms: { tDepth: { value: null }, projInv: { value: new THREE.Matrix4() }, aoRes: { value: new THREE.Vector2(1, 1) }, projScale: { value: 1 }, radius: { value: 0.8 } },
      vertexShader: vs, defines: { SAMPLES: samples },
      fragmentShader: `uniform sampler2D tDepth; uniform mat4 projInv; uniform vec2 aoRes; uniform float projScale, radius; varying vec2 vUv;
        vec3 vpos(vec2 uv) { float d = texture2D(tDepth, uv).x; vec4 p = projInv * vec4(uv * 2.0 - 1.0, d * 2.0 - 1.0, 1.0); return p.xyz / p.w; }
        void main() {
          if (texture2D(tDepth, vUv).x > 0.99995) { gl_FragColor = vec4(1.0); return; }
          vec3 P = vpos(vUv); vec2 tx = 1.0 / aoRes;
          vec3 pr = vpos(vUv + vec2(tx.x, 0.0)), pl = vpos(vUv - vec2(tx.x, 0.0)), pu = vpos(vUv + vec2(0.0, tx.y)), pd = vpos(vUv - vec2(0.0, tx.y));
          vec3 dx = abs(pr.z - P.z) < abs(P.z - pl.z) ? pr - P : P - pl, dy = abs(pu.z - P.z) < abs(P.z - pd.z) ? pu - P : P - pd;
          vec3 N = normalize(cross(dx, dy));
          float rpx = min(radius * projScale / -P.z, 48.0), a0 = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) * 6.2832, ao = 0.0, r2 = radius * radius;
          for (int i = 0; i < SAMPLES; i++) {
            float fi = (float(i) + 0.5) / float(SAMPLES), a = a0 + float(i) * 2.39996;
            vec3 v = vpos(vUv + vec2(cos(a), sin(a)) * rpx * (0.12 + 0.88 * fi) * tx) - P;
            float vv = dot(v, v);
            ao += max(0.0, dot(v, N) - 0.015 + P.z * 0.004) / (vv + 0.02 * r2) * smoothstep(r2 * 4.0, r2 * 0.5, vv);
          }
          ao = clamp(1.0 - radius * 3.0 * ao / float(SAMPLES), 0.0, 1.0);
          gl_FragColor = vec4(vec3(ao * ao), 1.0);
        }` });
    this.aoMat.depthTest = false; this.aoMat.depthWrite = false;
    this.quad = new THREE.FullScreenQuad(null);
  }
  setSize(w, h) { const a = Math.max(1, w >> 1), b = Math.max(1, h >> 1); this.rt.setSize(a, b); this.aoMat.uniforms.aoRes.value.set(a, b); if (R.post) R.post.uniforms.aoRes.value.set(a, b); }
  render(renderer) { // writes only its own half-res target; the post pass applies it
    const cam = R.camera, A = this.aoMat.uniforms;
    A.tDepth.value = R.sceneDepth; A.projInv.value.copy(cam.projectionMatrixInverse); A.projScale.value = A.aoRes.value.y / (2 * Math.tan(THREE.MathUtils.degToRad(cam.fov) / 2));
    renderer.setRenderTarget(this.rt); this.quad.material = this.aoMat; this.quad.render(renderer);
  }
}
// volumetric sunlight: march each half-res pixel's view ray through dusty air, testing the sun's shadow map at every step,
// so light beams form wherever the gallows, buildings and people block the sun (works with the sun off-screen too)
class VolumetricPass extends THREE.Pass {
  constructor(steps) {
    super(); this.needsSwap = false; this.amount = 0;
    this.rt = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, depthBuffer: false });
    this.mat = new THREE.ShaderMaterial({ defines: { STEPS: steps }, depthTest: false, depthWrite: false,
      uniforms: { tDepth: { value: null }, tShadow: { value: null }, shadowMatrix: { value: new THREE.Matrix4() }, invProj: { value: new THREE.Matrix4() }, camWorld: { value: new THREE.Matrix4() }, camPos: { value: new THREE.Vector3() }, near: { value: 0.1 }, far: { value: 4000 },
        sunDir: { value: new THREE.Vector3(0, 1, 0) }, dens: { value: 0.014 }, hFall: { value: 0.3 }, maxDist: { value: 70 }, shadowBias: { value: -0.0008 } },
      vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader: `#include <packing>
        uniform sampler2D tDepth, tShadow; uniform mat4 shadowMatrix, invProj, camWorld; uniform vec3 camPos, sunDir; uniform float dens, hFall, maxDist, shadowBias, near, far; varying vec2 vUv;
        float hg(float c, float g) { float g2 = g * g; return (1.0 - g2) / (12.566 * pow(1.0 + g2 - 2.0 * g * c, 1.5)); }
        void main() {
          float d = texture2D(tDepth, vUv).x;
          vec4 vr = invProj * vec4(vUv * 2.0 - 1.0, -1.0, 1.0); vec3 dv = normalize(vr.xyz / vr.w);
          float zl = (near * far) / (far - (far - near) * d), L = min(zl / max(-dv.z, 1e-3), maxDist);
          vec3 rd = normalize(mat3(camWorld) * dv);
          float ign = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))));
          float dt = L / float(STEPS), t = dt * ign, T = 1.0, acc = 0.0;
          for (int i = 0; i < STEPS; i++) {
            vec3 x = camPos + rd * t;
            float sig = dens * exp(-max(x.y, 0.0) * hFall);
            vec4 sc = shadowMatrix * vec4(x, 1.0); vec2 e = min(sc.xy, 1.0 - sc.xy);
            float inside = smoothstep(0.0, 0.06, min(e.x, e.y)) * step(sc.z, 1.0);
            float lit = 1.0;
            if (inside > 0.0) lit = mix(1.0, step(sc.z + shadowBias, unpackRGBAToDepth(texture2D(tShadow, sc.xy))), inside);
            acc += T * sig * lit * dt; T *= exp(-sig * dt); t += dt;
          }
          float c = dot(rd, sunDir), ph = mix(hg(c, 0.12), hg(c, 0.7), 0.5);
          gl_FragColor = vec4(vec3(acc * ph), T); // in-scattered sunlight (to be tinted by the sun colour) + transmittance
        }` });
    this.quad = new THREE.FullScreenQuad(this.mat);
  }
  setSize(w, h) { this.rt.setSize(Math.max(1, w >> 1), Math.max(1, h >> 1)); if (R.post) R.post.uniforms.volRes.value.set(Math.max(1, w >> 1), Math.max(1, h >> 1)); }
  render(renderer) {
    const sh = SKY.sun.shadow; if (this.amount < 0.001 || !sh.map) { if (R.post) R.post.uniforms.volAmt.value = 0; return; }
    const U = this.mat.uniforms, cam = R.camera; U.tDepth.value = R.sceneDepth; U.tShadow.value = sh.map.texture; U.shadowMatrix.value.copy(sh.matrix);
    U.invProj.value.copy(cam.projectionMatrixInverse); U.camWorld.value.copy(cam.matrixWorld); U.near.value = cam.near; U.far.value = cam.far;
    U.camPos.value.setFromMatrixPosition(cam.matrixWorld); U.sunDir.value.copy(SKY.sunDir);
    renderer.setRenderTarget(this.rt); this.quad.render(renderer);
  }
}
// crepuscular rays: march each pixel toward the sun through the depth buffer; only open sky lets light through, so beams and gaps cut shafts in the dusty air
class ShaftsPass extends THREE.Pass {
  constructor(samples) {
    super(); this.needsSwap = false; this.amount = 0;
    this.rt = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, depthBuffer: false });
    this.mat = new THREE.ShaderMaterial({ uniforms: { tDepth: { value: null }, sun: { value: new THREE.Vector2(0.5, 0.5) }, aspect: { value: 1 }, color: { value: new THREE.Color() }, density: { value: 0.92 }, decay: { value: 0.95 }, spread: { value: 6.5 } },
      defines: { N: samples }, depthTest: false, depthWrite: false,
      vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader: `uniform sampler2D tDepth; uniform vec2 sun; uniform float aspect, density, decay, spread; uniform vec3 color; varying vec2 vUv;
        void main() {
          vec2 d = (sun - vUv) * density / float(N), uv = vUv + d * fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
          float ill = 1.0, acc = 0.0, wsum = 0.0;
          for (int i = 0; i < N; i++) {
            vec2 q = (uv - sun) * vec2(aspect, 1.0);
            float sky = step(0.9999995, texture2D(tDepth, clamp(uv, 0.001, 0.999)).x);
            acc += sky * exp(-dot(q, q) * spread) * ill; wsum += ill; ill *= decay; uv += d;
          }
          gl_FragColor = vec4(color * acc / wsum, 1.0);
        }` });
    this.quad = new THREE.FullScreenQuad(this.mat);
  }
  setSize(w, h) { this.rt.setSize(Math.max(1, w >> 1), Math.max(1, h >> 1)); this.mat.uniforms.aspect.value = w / Math.max(1, h); }
  render(renderer) { if (this.amount < 0.001) return; this.mat.uniforms.tDepth.value = R.sceneDepth; renderer.setRenderTarget(this.rt); this.quad.render(renderer); }
}
const _sun = new THREE.Vector3(), _cf2 = new THREE.Vector3();
function updateShafts(dusk) { // where the sun sits on screen, and how strongly its beams show
  const S = R.shafts; if (!S || !TIERS[R.tier].shafts || R.lite) { if (S) S.amount = 0; if (R.vol) R.vol.amount = 0; if (R.post) { R.post.uniforms.shaftAmt.value = 0; R.post.uniforms.volAmt.value = 0; } R.grade.uniforms.flare.value = 0; return 0; } const cam = R.camera;
  cam.getWorldDirection(_cf2); const facing = _cf2.dot(SKY.sunDir);
  _sun.copy(SKY.sunDir).multiplyScalar(1000).add(cam.position).project(cam);
  const off = Math.hypot(_sun.x, _sun.y), vis = facing > 0 ? smoothstep(1.9, 0.9, off) * smoothstep(0.0, 0.25, facing) : 0;
  S.mat.uniforms.sun.value.set(_sun.x * 0.5 + 0.5, _sun.y * 0.5 + 0.5);
  S.mat.uniforms.color.value.copy(SKY.uniforms.sunCol.value).multiplyScalar(1.0 + 0.6 * dusk);
  S.amount = vis * lerp(0.6, 0.9, dusk) * (R.vol && TIERS[R.tier].vol ? 0.5 : 1); if (R.post) R.post.uniforms.shaftAmt.value = S.amount;
  if (R.vol && R.post) { const on = TIERS[R.tier].vol ? 1 : 0; R.vol.amount = on; R.post.uniforms.volAmt.value = on * lerp(1.0, 1.25, dusk);
    R.post.uniforms.volCol.value.copy(SKY.sun.color).multiplyScalar(SKY.sun.intensity * 0.8); }
  const G = R.grade.uniforms, onScreen = Math.abs(_sun.x) < 1.02 && Math.abs(_sun.y) < 1.02 && facing > 0.2;
  G.sun.value.copy(S.mat.uniforms.sun.value); G.flare.value = onScreen ? smoothstep(0.2, 0.5, facing) * lerp(0.9, 1.2, dusk) : 0; G.sunCol.value.copy(SKY.uniforms.sunCol.value);
  return S.amount;
}
function initRenderer(canvas, tierName) {
  R.tier = tierName; const T = TIERS[tierName];
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: "high-performance", stencil: false, depth: true });
  R.webgl2 = renderer.capabilities.isWebGL2;
  renderer.outputEncoding = THREE.LinearEncoding; renderer.toneMapping = THREE.NoToneMapping;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; renderer.shadowMap.autoUpdate = true;
  R.renderer = renderer; R.maxAniso = renderer.capabilities.getMaxAnisotropy(); if (T.pcss) patchShadows(tierName);
  R.scene = new THREE.Scene();
  R.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 4000);
  const hdrType = R.webgl2 || renderer.extensions.has("OES_texture_half_float") ? THREE.HalfFloatType : THREE.UnsignedByteType;
  const rt = new THREE.WebGLRenderTarget(4, 4, { type: hdrType, samples: R.webgl2 ? T.msaa : 0 });
  const depthOK = R.webgl2 || renderer.extensions.has("WEBGL_depth_texture");
  if (depthOK) rt.depthTexture = new THREE.DepthTexture(4, 4, THREE.UnsignedIntType);
  R.composer = new THREE.EffectComposer(renderer, rt);
  if (depthOK) R.composer.renderTarget2.depthTexture = new THREE.DepthTexture(4, 4, THREE.UnsignedIntType); // its own source: a clone would share the GL texture and form a feedback loop
  const rp = new THREE.RenderPass(R.scene, R.camera), rpr = rp.render.bind(rp); rp.render = (r, w, rb, dt, m) => { R.sceneDepth = rb.depthTexture; if (R.grade) R.grade.uniforms.tDepth.value = R.sceneDepth || null; rpr(r, w, rb, dt, m); R.stats = { calls: r.info.render.calls, tris: r.info.render.triangles }; }; R.composer.addPass(rp);
  if (depthOK) { // the post pass reads the scene target and writes the other one, so the scene depth is never overwritten mid-frame
    PostShader.defines = { DOF_N: tierName === "ultra" ? 40 : tierName === "high" ? 32 : 20, SSS_N: Math.max(4, T.sss || 4) }; const post = new THREE.ShaderPass(PostShader); post.needsSwap = true; post.enabled = false; const base = post.render.bind(post);
    post.render = (r, w, rb, dt, m) => { const P = post.uniforms; P.tDepth.value = R.sceneDepth; P.tAO.value = R.ao ? R.ao.rt.texture : null; P.tShafts.value = R.shafts ? R.shafts.rt.texture : null; P.tVol.value = R.vol ? R.vol.rt.texture : null; base(r, w, rb, dt, m); };
    R.post = R.dof = post;
    if (T.ao) { R.ao = new AOPass(T.ao); R.composer.addPass(R.ao); }
    if (T.shafts) { R.shafts = new ShaftsPass(T.shafts); R.composer.addPass(R.shafts); }
    if (T.vol) { R.vol = new VolumetricPass(T.vol); R.composer.addPass(R.vol); }
    R.composer.addPass(post); }
  if (T.bloom) { R.bloom = new THREE.UnrealBloomPass(new THREE.Vector2(256, 256), 0.22, 0.45, 1.5); R.composer.addPass(R.bloom);
    // halation: the wide, soft part of the glow bleeds warm red like light scattering back through film emulsion
    const tints = [new THREE.Vector3(1, 1, 1), new THREE.Vector3(1, 0.98, 0.95), new THREE.Vector3(1.02, 0.94, 0.87), new THREE.Vector3(1.05, 0.89, 0.78), new THREE.Vector3(1.08, 0.84, 0.7)];
    if (R.bloom.compositeMaterial && R.bloom.compositeMaterial.uniforms.bloomTintColors) R.bloom.compositeMaterial.uniforms.bloomTintColors.value = tints; }
  R.grade = new THREE.ShaderPass(GradeShader); R.composer.addPass(R.grade);
  for (const p of R.composer.passes) if (p.material) { p.material.depthTest = false; p.material.depthWrite = false; } // full-screen passes must never test against the scene depth
}
function resizeRenderer(w, h) {
  // whole-pixel buffer sizes: a fractional size (e.g. after the resolution step-down) leaves the multisampled colour and depth
  // attachments a pixel apart, the resolve blit then fails and every depth-based effect reads stale depth
  const T = TIERS[R.tier], want = Math.min(window.devicePixelRatio || 1, T.dpr) * (R.resScale || 1);
  const pw = Math.max(1, Math.round(w * want)), ph = Math.max(1, Math.round(h * want)); R.w = w; R.h = h; R.dpr = pw / w;
  R.renderer.setPixelRatio(1); R.renderer.setSize(pw, ph, false);
  R.composer.setPixelRatio(1); R.composer.setSize(pw, ph);
  // the depth textures ride on the resized targets; give them the new size now, before anything samples them. three allocates depth
  // textures with immutable storage on first upload, so one upload at the stale size would never match the colour buffer again
  for (const rt of [R.composer.renderTarget1, R.composer.renderTarget2]) if (rt.depthTexture) { rt.depthTexture.image.width = rt.width; rt.depthTexture.image.height = rt.height; }
  if (R.bloom) R.bloom.setSize(Math.round(pw / 2), Math.round(ph / 2));
  R.grade.uniforms.res.value.set(pw, ph);
  if (R.post) { R.post.uniforms.res.value.set(pw, ph); R.post.uniforms.maxCoC.value = 10 * R.dpr; }
  R.camera.aspect = w / h; R.camera.updateProjectionMatrix();
}
function renderFrame(t) {
  const G = R.grade.uniforms; G.time.value = t; // (its depth input is set by the scene pass each frame, so it is never last frame's target)
  R.composer.render();
}
