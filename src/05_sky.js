// ---------- SKY: physically based atmosphere (Rayleigh + dusty Mie + ozone, single scattering baked into a sky-view LUT),
// sun-lit cloud layers, the sun, image-based lighting ----------
const SKY = { mesh: null, uniforms: null, sunDir: new THREE.Vector3(), sun: null, hemi: null, pmrem: null, envRT: null, envDusk: -1, scene: null, dusk: 0, horizon: new THREE.Color(),
  lutRT: null, lutElev: -9, lutMat: null };
const SUN_AZ = Math.atan2(-0.835, -0.55) + 0.05; // down the main street; direction (x,z) = (cos, sin)
// ---- the atmosphere model (shared by the GPU LUT and a small CPU version for fog/cloud colours) ----
const ATMO = { Re: 6360e3, Ra: 6460e3, bR: [5.802e-6, 13.558e-6, 33.1e-6], bMs: 3.996e-6, bMe: 4.44e-6, bO: [0.65e-6, 1.881e-6, 0.085e-6], mie: 0.9, g: 0.85, S: 42, W: 2.3, LUTK: 6 };
const ATMO_GLSL = `
  #define PI 3.14159265
  const float Re = 6360e3, Ra = 6460e3; const vec3 bR = vec3(5.802e-6, 13.558e-6, 33.1e-6), bO = vec3(0.65e-6, 1.881e-6, 0.085e-6); const float bMs = 3.996e-6, bMe = 4.44e-6;
  uniform float mieK, mieG;
  vec2 raySphere(vec3 ro, vec3 rd, float r) { float b = dot(ro, rd), c = dot(ro, ro) - r * r, d = b * b - c; if (d < 0.0) return vec2(-1.0); d = sqrt(d); return vec2(-b - d, -b + d); }
  vec3 atmDens(float h) { return vec3(exp(-h / 8000.0), exp(-h / 1200.0) * mieK, max(0.0, 1.0 - abs(h - 25000.0) / 15000.0)); }
  vec3 atmExt(vec3 dn) { return bR * dn.x + bMe * dn.y + bO * dn.z; }
  vec3 sunTrans(vec3 p, vec3 sd) {
    if (raySphere(p, sd, Re).x > 0.0) return vec3(0.0);
    float L = raySphere(p, sd, Ra).y, ds = L / 8.0; vec3 od = vec3(0.0);
    for (int i = 0; i < 8; i++) { vec3 q = p + sd * (float(i) + 0.5) * ds; od += atmExt(atmDens(length(q) - Re)) * ds; }
    return exp(-od);
  }`;
function atmoCPU(el, az, se, h0 = 2, albedo = [0.42, 0.32, 0.22]) { // radiance for sun irradiance 1
  const A = ATMO, rs = (ro, rd, r) => { const b = ro[0] * rd[0] + ro[1] * rd[1] + ro[2] * rd[2], c = ro[0] * ro[0] + ro[1] * ro[1] + ro[2] * ro[2] - r * r, d = b * b - c; if (d < 0) return [-1, -1]; const s = Math.sqrt(d); return [-b - s, -b + s]; };
  const dens = h => [Math.exp(-h / 8000), Math.exp(-h / 1200) * A.mie, Math.max(0, 1 - Math.abs(h - 25000) / 15000)], ext = (dn, c) => A.bR[c] * dn[0] + A.bMe * dn[1] + A.bO[c] * dn[2];
  const sunT = (p, sd) => { if (rs(p, sd, A.Re)[0] > 0) return [0, 0, 0]; const L = rs(p, sd, A.Ra)[1], ds = L / 8, od = [0, 0, 0];
    for (let i = 0; i < 8; i++) { const q = [p[0] + sd[0] * (i + 0.5) * ds, p[1] + sd[1] * (i + 0.5) * ds, p[2] + sd[2] * (i + 0.5) * ds], dn = dens(Math.hypot(q[0], q[1], q[2]) - A.Re); for (let c = 0; c < 3; c++) od[c] += ext(dn, c) * ds; }
    return od.map(v => Math.exp(-v)); };
  const rd = [Math.cos(el) * Math.cos(az), Math.sin(el), Math.cos(el) * Math.sin(az)], sd = [Math.cos(se), Math.sin(se), 0], ro = [0, A.Re + h0, 0];
  if (az === null) return sunT(ro, sd);
  const tg = rs(ro, rd, A.Re), hitG = tg[0] > 0, L = hitG ? tg[0] : rs(ro, rd, A.Ra)[1];
  const mu = rd[0] * sd[0] + rd[1] * sd[1], pR = 3 / (16 * Math.PI) * (1 + mu * mu), g = A.g, pM = 3 / (8 * Math.PI) * ((1 - g * g) * (1 + mu * mu)) / ((2 + g * g) * Math.pow(1 + g * g - 2 * g * mu, 1.5));
  const N = 24, acc = [0, 0, 0], od = [0, 0, 0];
  for (let i = 0; i < N; i++) { const f = (i + 0.5) / N, tt = L * f * f, ds = L * ((i + 1) * (i + 1) - i * i) / (N * N), p = [ro[0] + rd[0] * tt, ro[1] + rd[1] * tt, ro[2] + rd[2] * tt], dn = dens(Math.hypot(p[0], p[1], p[2]) - A.Re);
    for (let c = 0; c < 3; c++) od[c] += ext(dn, c) * ds * 0.5; const Ts = sunT(p, sd);
    for (let c = 0; c < 3; c++) acc[c] += Math.exp(-od[c]) * Ts[c] * (A.bR[c] * dn[0] * pR + A.bMs * dn[1] * pM) * ds;
    for (let c = 0; c < 3; c++) od[c] += ext(dn, c) * ds * 0.5; }
  return acc;
}
// exposure: scale, then compress the luminance so the glow round the sun stays inside a sane range (hue kept)
function atmoTone(c) { const l = 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2], ls = l * ATMO.S, lc = ls / (1 + ls / ATMO.W), k = ls > 1e-9 ? ATMO.S * lc / ls : ATMO.S; return [c[0] * k, c[1] * k, c[2] * k]; }
// ---- GPU sky-view LUT: u = azimuth from the sun (0..pi), v = elevation (squared mapping: detail at the horizon) ----
function lutMaterial() {
  return new THREE.ShaderMaterial({ uniforms: { sunElev: { value: 0.1 }, mieK: { value: ATMO.mie }, mieG: { value: ATMO.g }, S: { value: ATMO.S }, W: { value: ATMO.W }, K: { value: ATMO.LUTK } }, depthTest: false, depthWrite: false,
    vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }",
    fragmentShader: ATMO_GLSL + `
      uniform float sunElev, S, W, K; varying vec2 vUv;
      void main() {
        float az = vUv.x * PI, t = vUv.y * 2.0 - 1.0, el = sign(t) * t * t * PI * 0.5;
        vec3 rd = vec3(cos(el) * cos(az), sin(el), cos(el) * sin(az)), sd = vec3(cos(sunElev), sin(sunElev), 0.0), ro = vec3(0.0, Re + 2.0, 0.0);
        vec2 tg = raySphere(ro, rd, Re); bool hitG = tg.x > 0.0; float L = hitG ? tg.x : raySphere(ro, rd, Ra).y;
        float mu = dot(rd, sd), pR = 3.0 / (16.0 * PI) * (1.0 + mu * mu), g = mieG;
        float pM = 3.0 / (8.0 * PI) * ((1.0 - g * g) * (1.0 + mu * mu)) / ((2.0 + g * g) * pow(1.0 + g * g - 2.0 * g * mu, 1.5));
        vec3 acc = vec3(0.0), od = vec3(0.0);
        for (int i = 0; i < 32; i++) {
          float f = (float(i) + 0.5) / 32.0, tt = L * f * f, ds = L * (2.0 * float(i) + 1.0) / 1024.0;
          vec3 p = ro + rd * tt, dn = atmDens(length(p) - Re), e = atmExt(dn) * ds;
          od += e * 0.5; acc += exp(-od) * sunTrans(p, sd) * (bR * dn.x * pR + bMs * dn.y * pM) * ds; od += e * 0.5;
        }
        if (hitG) { vec3 p = ro + rd * L, n = normalize(p); acc += exp(-od) * sunTrans(p + n, sd) * max(dot(n, sd), 0.0) * vec3(0.42, 0.32, 0.22) / PI; }
        float l = dot(acc, vec3(0.2126, 0.7152, 0.0722)) * S, lc = l / (1.0 + l / W);
        gl_FragColor = vec4(acc * (l > 1e-9 ? S * lc / l : S) / K, 1.0);
      }` });
}
function updateLUT(elev) {
  const r = R.renderer, prev = r.getRenderTarget(); SKY.lutMat.uniforms.sunElev.value = elev; SKY.lutElev = elev;
  r.setRenderTarget(SKY.lutRT); SKY.lutQuad.render(r); r.setRenderTarget(prev);
}
function skyShader() {
  const uniforms = { sunDir: { value: new THREE.Vector3(0, 0.1, -1) }, time: { value: 0 }, cover: { value: 0.5 }, lut: { value: null }, K: { value: ATMO.LUTK },
    sunCol: { value: new THREE.Color() }, cloudSun: { value: new THREE.Color() }, cloudAmb: { value: new THREE.Color() }, gain: { value: 1 }, clouds: { value: 1 } };
  return new THREE.ShaderMaterial({ name: "GulchSky", uniforms, side: THREE.BackSide, depthWrite: false, fog: false,
    vertexShader: `varying vec3 vDir; void main(){ vDir = normalize((modelMatrix * vec4(position, 1.0)).xyz - cameraPosition);
      gl_Position = projectionMatrix * viewMatrix * vec4((modelMatrix * vec4(position, 1.0)).xyz, 1.0); gl_Position.z = gl_Position.w; }`,
    fragmentShader: `
      #define PI 3.14159265
      uniform sampler2D lut; uniform vec3 sunDir, sunCol, cloudSun, cloudAmb; uniform float time, cover, gain, K, clouds; varying vec3 vDir;
      float h2(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
        return mix(mix(h2(i), h2(i + vec2(1.0, 0.0)), f.x), mix(h2(i + vec2(0.0, 1.0)), h2(i + vec2(1.0, 1.0)), f.x), f.y); }
      const mat2 RT = mat2(1.6, 1.2, -1.2, 1.6);
      float fbm3(vec2 p){ float s = 0.5 * vn(p); p = RT * p; s += 0.25 * vn(p); p = RT * p; s += 0.125 * vn(p); return s / 0.875; }
      float fbm4(vec2 p){ float s = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { s += a * vn(p); p = RT * p + 3.7; a *= 0.5; } return s / 0.9375; }
      vec3 skyL(vec3 d) {
        vec2 dh = d.xz, sh = sunDir.xz; float lh = length(dh), ls = length(sh);
        float ca = (lh > 1e-5 && ls > 1e-5) ? clamp(dot(dh / lh, sh / ls), -1.0, 1.0) : 1.0;
        float el = asin(clamp(d.y, -1.0, 1.0)), t = sign(el) * sqrt(abs(el) / (PI * 0.5));
        vec3 c = texture2D(lut, vec2(acos(ca) / PI, t * 0.5 + 0.5)).rgb * K; float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
        return max(mix(vec3(l), c, 1.3), 0.0); // a touch of film saturation
      }
      // a low layer of fair-weather cumulus (km on the layer): domain-warped billows, eroded edges
      float cumulus(vec2 p, out float core) {
        vec2 w = vec2(time * 0.010, time * 0.0035), q = p * 0.16 + w;
        float wp = vn(q * 0.55 + 7.3) * 0.7 + vn(q * 1.1 + 3.1) * 0.3;
        float b = fbm4(q + vec2(wp, -wp) * 0.9);
        float d = smoothstep(cover, cover + 0.16, b);
        float ero = vn(q * 3.7 - w * 2.0) * 0.65 + vn(q * 7.9) * 0.35;
        core = d; return clamp(d - (1.0 - d) * ero * 0.85 - 0.08 * ero, 0.0, 1.0);
      }
      float cumulusLo(vec2 p) { vec2 w = vec2(time * 0.010, time * 0.0035), q = p * 0.16 + w; return smoothstep(cover, cover + 0.16, fbm3(q)); }
      void main(){
        vec3 d = normalize(vDir); float mu = dot(d, sunDir);
        vec3 col = skyL(d);
        // the sun: a hot disk with a darker limb
        float disk = smoothstep(0.99986, 0.99993, mu); col += sunCol * disk * mix(18.0, 34.0, smoothstep(0.99986, 0.999995, mu));
        if (d.y > 0.012 && clouds > 0.5) { // (skipped when the sky is baked into the lighting probe)
          vec3 hz = skyL(normalize(vec3(d.x, max(d.y, 0.0) * 0.25 + 0.012, d.z)));
          // high cirrus streaks at ~7 km: thin, lit warm by the low sun
          { float t = 7.0 / max(d.y, 0.03); vec2 p = d.xz * min(t, 120.0);
            vec2 q = vec2(p.x * 0.05 + p.y * 0.012, p.y * 0.2) + vec2(time * 0.004, 0.0);
            float c = smoothstep(0.55, 0.85, fbm4(q)) * smoothstep(0.35, 0.75, vn(p * 0.02 + 1.3));
            vec3 cc = cloudSun * (0.35 + 1.4 * pow(max(mu, 0.0), 4.0)) + cloudAmb * 0.6;
            col = mix(col, mix(hz, cc, exp(-t / 140.0)), c * 0.55 * smoothstep(0.0, 0.08, d.y)); }
          // cumulus at ~2 km: billow normals from the density slope give each puff a sun side and a shadow side
          float t = 2.2 / max(d.y, 0.03); t = min(t, 75.0); vec2 p = d.xz * t, sdir = normalize(sunDir.xz + 1e-5);
          float core, den = cumulus(p, core);
          if (den > 0.002) {
            // two probes: toward the sun (shadowing + slope) and across it (slope) give a billow normal
            vec2 sx = vec2(-sdir.y, sdir.x); float e = 0.45, cs = cumulusLo(p + sdir * e), cx = cumulusLo(p + sx * e);
            vec3 g = vec3(sdir.x, 0.0, sdir.y) * (cs - core) + vec3(sx.x, 0.0, sx.y) * (cx - core);
            vec3 n = normalize(vec3(-g.x * 2.6, 0.55, -g.z * 2.6));
            float lam = clamp(dot(n, normalize(vec3(sdir.x, 0.35, sdir.y))), 0.0, 1.0);
            float dl = cs;
            float sh = exp(-1.2 * dl * core) * (0.25 + 0.75 * lam);
            float ph = 0.55 + 0.8 * pow(max(mu, 0.0), 3.0) + 2.2 * pow(max(mu, 0.0), 14.0);
            vec3 cc = cloudSun * sh * ph + cloudAmb * (1.05 - 0.45 * core);
            cc += cloudSun * pow(max(mu, 0.0), 18.0) * (1.0 - core) * 3.5;     // silver lining where the cloud thins toward the sun
            cc = mix(hz, cc, exp(-t / 42.0));                                    // aerial perspective
            col = mix(col, cc, den * smoothstep(0.015, 0.13, d.y));
          }
        }
        gl_FragColor = vec4(col * gain, 1.0);
      }` });
}
function initSky() {
  const half = R.webgl2 || R.renderer.extensions.has("OES_texture_half_float");
  SKY.lutRT = new THREE.WebGLRenderTarget(160, 96, { type: half ? THREE.HalfFloatType : THREE.UnsignedByteType, depthBuffer: false, magFilter: THREE.LinearFilter, minFilter: THREE.LinearFilter, generateMipmaps: false });
  SKY.lutRT.texture.wrapS = SKY.lutRT.texture.wrapT = THREE.ClampToEdgeWrapping;
  SKY.lutMat = lutMaterial(); SKY.lutQuad = new THREE.FullScreenQuad(SKY.lutMat);
  const mat = skyShader(); SKY.uniforms = mat.uniforms; mat.uniforms.lut.value = SKY.lutRT.texture;
  SKY.mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), mat); SKY.mesh.frustumCulled = false; SKY.mesh.renderOrder = -10;
  R.scene.add(SKY.mesh);
  SKY.scene = new THREE.Scene(); SKY.envMesh = new THREE.Mesh(SKY.mesh.geometry, mat); SKY.scene.add(SKY.envMesh);
  const sun = new THREE.DirectionalLight(0xffd2a0, 3); sun.castShadow = true;
  const T = TIERS[R.tier]; sun.shadow.mapSize.set(T.shadow, T.shadow);
  const sc = sun.shadow.camera; sc.left = -15; sc.right = 15; sc.top = 15; sc.bottom = -15; sc.near = 1; sc.far = 160;
  sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.035; sun.shadow.radius = 3;
  sun.target.position.set(-1.2, 0, -3.2); R.scene.add(sun); R.scene.add(sun.target); SKY.sun = sun;
  SKY.hemi = new THREE.HemisphereLight(0x8fa3c4, 0x6b4a32, 0.35); R.scene.add(SKY.hemi);
  // bounce fill from behind the camera (the sun is behind the subjects)
  SKY.fill = new THREE.DirectionalLight(0xffd7b0, 0.9); SKY.fill.position.set(14, 6, 16); SKY.fill.target.position.set(-1.5, 1, -3); R.scene.add(SKY.fill); R.scene.add(SKY.fill.target);
  R.scene.fog = new THREE.FogExp2(0xd9a070, 0.0011);
  SKY.pmrem = new THREE.PMREMGenerator(R.renderer);
  setDusk(0, true);
}
const _sc = new THREE.Color(), _sc2 = new THREE.Color();
function setDusk(d, forceEnv) {
  SKY.dusk = d;
  const elev = THREE.MathUtils.degToRad(lerp(6.5, 1.0, d)), az = SUN_AZ + d * 0.04;
  SKY.sunDir.set(Math.cos(elev) * Math.cos(az), Math.sin(elev), Math.cos(elev) * Math.sin(az)).normalize();
  const U = SKY.uniforms; U.sunDir.value.copy(SKY.sunDir); U.cover.value = lerp(0.5, 0.47, d);
  if (forceEnv || Math.abs(elev - SKY.lutElev) > 0.003) {
    updateLUT(elev);
    // colours from the same atmosphere: the sun disk, the light on the clouds (at 2 km), their skylight, and the haze
    const tg = atmoCPU(0, null, elev, 2), tc = atmoCPU(0, null, elev, 2200), mx = Math.max(...tg) || 1;
    U.sunCol.value.setRGB(tg[0] / mx, tg[1] / mx, tg[2] / mx);
    U.cloudSun.value.setRGB(tc[0], tc[1], tc[2]).multiplyScalar(lerp(3.6, 4.6, d));
    const z = atmoTone(atmoCPU(Math.PI / 2 - 0.02, 0, elev)), hs = atmoTone(atmoCPU(0.05, Math.PI / 2, elev)), hz = atmoTone(atmoCPU(0.03, 1.2, elev));
    U.cloudAmb.value.setRGB(z[0] * 1.6 + hs[0] * 0.35, z[1] * 1.6 + hs[1] * 0.35, z[2] * 1.6 + hs[2] * 0.35);
    SKY.horizon.setRGB(hz[0], hz[1], hz[2]).multiplyScalar(0.75);
  }
  _sc.setRGB(1.0, lerp(0.74, 0.40, d), lerp(0.48, 0.17, d));
  const sun = SKY.sun; sun.color.copy(_sc); sun.intensity = lerp(4.2, 2.9, d);
  sun.position.copy(sun.target.position).addScaledVector(SKY.sunDir, 90);
  SKY.hemi.color.setRGB(lerp(0.62, 0.5, d), lerp(0.58, 0.38, d), lerp(0.62, 0.45, d)); SKY.hemi.groundColor.setRGB(lerp(0.5, 0.36, d), lerp(0.34, 0.22, d), lerp(0.2, 0.14, d));
  SKY.hemi.intensity = lerp(0.3, 0.24, d); if (SKY.fill) { SKY.fill.intensity = lerp(0.6, 0.55, d); SKY.fill.color.setRGB(lerp(0.92, 0.9, d), lerp(0.86, 0.7, d), lerp(0.84, 0.62, d)); }
  R.scene.fog.color.copy(SKY.horizon); R.scene.fog.density = lerp(0.0008, 0.0011, d);
  if (forceEnv || Math.abs(d - SKY.envDusk) > 0.12) updateEnv(d);
}
function updateEnv(d) {
  SKY.envDusk = d;
  const g = SKY.uniforms.gain.value; SKY.uniforms.gain.value = 0.55; SKY.uniforms.clouds.value = 0;
  const rt = SKY.pmrem.fromScene(SKY.scene, 0.02, 0.1, 100); SKY.uniforms.gain.value = g; SKY.uniforms.clouds.value = 1;
  if (SKY.envRT) SKY.envRT.dispose(); SKY.envRT = rt; R.scene.environment = rt.texture;
}
function updateSky(t, cam) { SKY.uniforms.time.value = t; SKY.mesh.position.copy(cam.position); }
