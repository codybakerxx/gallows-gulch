// ---------- AUDIO: looping soundtrack (procedural score fallback) + physically-modelled spatial SFX (Web Audio) ----------
const Sound = (() => {
  let ctx = null, master, music, sfx, amb, verbIn, verbFar, NOISE, duckG, voiceBus, muted = false, volume = 0.8, level = 0, playing = false, timer = null, nextT = 0, step = 0, murmur = [], murT = null, dusk = 0;
  // the host's recorded lines: fetched at boot, decoded once the AudioContext exists
  const voice = { fetches: new Map(), decoded: new Map(), token: 0, src: null, an: null, data: null, env: 0, until: 0 };
  const plucks = new Map(), mtof = m => 440 * Math.pow(2, (m - 69) / 12), HRTF = !/Android|iPhone|iPad|Mobile/i.test(navigator.userAgent);
  const song = { buf: null, src: null, gain: null, filter: null, PRE: 1.0, LOOP: 166.1, loading: null, ab: null, decoding: false, wanted: false };
  let silentEl = null, hbT = null, unlocked = false;
  const AUDIO = window.GULCH_AUDIO || "audio/";
  const now = () => ctx.currentTime;
  function buf(sec, fn, ch = 1) { const n = Math.max(1, Math.floor(ctx.sampleRate * sec)), b = ctx.createBuffer(ch, n, ctx.sampleRate); for (let c = 0; c < ch; c++) { const d = b.getChannelData(c); for (let i = 0; i < n; i++) d[i] = fn(i / ctx.sampleRate, i, c); } return b; }
  function init() {
    if (ctx) return true; const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return false;
    ctx = new AC(); const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -12; comp.ratio.value = 3;
    master = ctx.createGain(); master.gain.value = muted ? 0 : volume; master.connect(comp); comp.connect(ctx.destination);
    // everything musical runs through one ducker so the host's voice can sit on top of the score
    duckG = ctx.createGain(); duckG.gain.value = 1; duckG.connect(master);
    music = ctx.createGain(); music.gain.value = 0.5; music.connect(duckG);
    voiceBus = ctx.createGain(); voiceBus.gain.value = 1.0; voiceBus.connect(master);
    voice.an = ctx.createAnalyser(); voice.an.fftSize = 512; voice.an.smoothingTimeConstant = 0; voice.data = new Float32Array(512);
    const anSink = ctx.createGain(); anSink.gain.value = 0; voice.an.connect(anSink); anSink.connect(master); // keeps the analyser pulled on every browser
    sfx = ctx.createGain(); sfx.gain.value = 1; sfx.connect(master); amb = ctx.createGain(); amb.gain.value = 0.9; amb.connect(master);
    NOISE = buf(2, () => Math.random() * 2 - 1);
    // outdoor street reverb: early reflections off the facades + short diffuse tail
    const ir = buf(2.4, (t, i, c) => { let v = (Math.random() * 2 - 1) * Math.pow(1 - t / 2.4, 3.2) * 0.5; for (const e of [0.031, 0.047, 0.071, 0.093, 0.13]) if (Math.abs(t - e - c * 0.004) < 0.0012) v += 0.5 * (Math.random() * 2 - 1); return v; }, 2);
    const verb = ctx.createConvolver(); verb.buffer = ir; verbIn = ctx.createGain(); verbIn.gain.value = 0.35; verbIn.connect(verb); verb.connect(master);
    const far = ctx.createConvolver(); far.buffer = buf(4.5, (t) => (Math.random() * 2 - 1) * Math.pow(1 - t / 4.5, 2.2) * 0.35, 2);
    verbFar = ctx.createGain(); verbFar.gain.value = 0.5; verbFar.connect(far); far.connect(master);
    song.filter = ctx.createBiquadFilter(); song.filter.type = "lowpass"; song.filter.frequency.value = 20000; song.filter.Q.value = 0.5;
    song.gain = ctx.createGain(); song.gain.gain.value = 0; song.filter.connect(song.gain); song.gain.connect(duckG);
    startAmbience(); decodeSong(); crowAmb.t = setTimeout(crowAmbient, 6000); setTimeout(() => { for (const id of voice.fetches.keys()) voiceBuffer(id); for (const nm of clips.fetches.keys()) clipBuffer(nm); }, 400); return true;
  }
  function preloadVoices(ids) {
    for (const id of ids) if (!voice.fetches.has(id))
      voice.fetches.set(id, fetch(AUDIO + "voice/" + id + ".mp3").then(r => { if (!r.ok) throw new Error("HTTP " + r.status); return r.arrayBuffer(); }).catch(e => { console.warn("voice line unavailable", id, e); return null; }));
  }
  // recorded one-shot effects (audio/sfx/<name>.mp3), fetched at boot and decoded like the voice lines
  const clips = { fetches: new Map(), decoded: new Map() };
  function preloadClips(names) {
    for (const nm of names) if (!clips.fetches.has(nm))
      clips.fetches.set(nm, fetch(AUDIO + "sfx/" + nm + ".mp3").then(r => { if (!r.ok) throw new Error("HTTP " + r.status); return r.arrayBuffer(); }).catch(e => { console.warn("sound unavailable", nm, e); return null; }));
  }
  function clipBuffer(nm) {
    if (!ctx) return Promise.resolve(null);
    if (!clips.decoded.has(nm)) { preloadClips([nm]);
      clips.decoded.set(nm, clips.fetches.get(nm).then(ab => !ab ? null : new Promise(res => { const p = ctx.decodeAudioData(ab.slice(0), res, () => res(null)); if (p && p.then) p.then(res, () => res(null)); }))); }
    return clips.decoded.get(nm);
  }
  function voiceBuffer(id) {
    if (!ctx) return Promise.resolve(null);
    if (!voice.decoded.has(id)) { preloadVoices([id]);
      voice.decoded.set(id, voice.fetches.get(id).then(ab => !ab ? null : new Promise(res => { const p = ctx.decodeAudioData(ab.slice(0), res, () => res(null)); if (p && p.then) p.then(res, () => res(null)); }))); }
    return voice.decoded.get(id);
  }
  function resume() { if (init() && ctx.state !== "running") ctx.resume().catch(() => {}); }
  // iPhones mute Web Audio with the ring/silent switch; a playing media element (or the Audio Session API) moves the page to the playback channel
  function unlock() {
    try { if (navigator.audioSession && navigator.audioSession.type !== "playback") navigator.audioSession.type = "playback"; } catch (e) {}
    if (!init()) return; resume();
    if (!silentEl) { silentEl = new Audio(); silentEl.src = AUDIO + "silence.mp3"; silentEl.loop = true; silentEl.preload = "auto"; silentEl.setAttribute("playsinline", ""); silentEl.setAttribute("webkit-playsinline", ""); }
    if (!muted && silentEl.paused) silentEl.play().catch(() => {});
    if (!unlocked) { const b = ctx.createBuffer(1, 1, 22050), s0 = ctx.createBufferSource(); s0.buffer = b; s0.connect(ctx.destination); s0.start(0); unlocked = true; setTimeout(() => clipBuffer("neck0"), 400); } // (the snap decoded early: v40)
  }
  // the file is fetched at boot, but decoded only once the AudioContext exists (created inside the first tap, which iOS needs)
  function loadSong(url) {
    if (song.loading) return song.loading;
    song.loading = (async () => {
      const r = await fetch(url); if (!r.ok) throw new Error("HTTP " + r.status);
      song.ab = await r.arrayBuffer(); decodeSong();
    })().catch(songFailed);
    return song.loading;
  }
  function decodeSong() {
    if (!ctx || !song.ab || song.decoding) return; const ab = song.ab; song.ab = null; song.decoding = true;
    new Promise((res, rej) => { const p = ctx.decodeAudioData(ab, res, rej); if (p && p.then) p.then(res, rej); })
      .then(b => { song.buf = b; song.decoding = false; if (song.wanted) { if (timer) { clearInterval(timer); timer = null; } startSong(1.5); } })
      .catch(e => { song.decoding = false; songFailed(e); });
  }
  function songFailed(e) { console.warn("soundtrack unavailable", e); song.loading = null; song.ab = null; if (song.wanted && !song.buf && !timer) api.startMusic(); }
  function startSong(fadeIn = 2.5) {
    if (!ctx || !song.buf) return; const t = now(); stopSong(0.8);
    const s = ctx.createBufferSource(); s.buffer = song.buf; s.loop = true; s.loopStart = song.PRE; s.loopEnd = song.PRE + song.LOOP; s.connect(song.filter);
    song.gain.gain.cancelScheduledValues(t); song.gain.gain.setValueAtTime(song.gain.gain.value, t); song.gain.gain.setValueAtTime(0.0001, t + 0.05);
    song.gain.gain.linearRampToValueAtTime(lerp(0.78, 0.95, level), t + 0.05 + Math.max(0.05, fadeIn)); song.filter.frequency.cancelScheduledValues(t); song.filter.frequency.setValueAtTime(lerp(8500, 20000, level), t);
    s.start(t + 0.05, song.PRE); song.src = s;
  }
  function stopSong(fade = 0.8) {
    if (!song.src) return; const t = now(), old = song.src; song.src = null;
    const g = ctx.createGain(); g.gain.setValueAtTime(1, t); g.gain.linearRampToValueAtTime(0, t + fade); try { old.disconnect(); } catch (e) {} old.connect(g); g.connect(song.filter); try { old.stop(t + fade + 0.05); } catch (e) {}
  }
  function heartbeat() { if (!ctx || ctx.state !== "running") return; const t = now(), k = 0.4 + level * 0.6; drum(t, 64, 40, 0.16, 0.6 * k, sfx); drum(t + 0.27, 58, 38, 0.2, 0.45 * k, sfx); }
  function suspend() { if (ctx && ctx.state === "running") ctx.suspend(); }
  // spatial source: returns an input node placed at a world position
  function at(pos, wet = 0.3, ref = 3) {
    const g = ctx.createGain(); if (!pos) { g.connect(sfx); if (wet) { const w = ctx.createGain(); w.gain.value = wet; g.connect(w); w.connect(verbIn); } return g; }
    const p = ctx.createPanner(); p.panningModel = HRTF ? "HRTF" : "equalpower"; p.distanceModel = "inverse"; p.refDistance = ref; p.rolloffFactor = 1.1; p.maxDistance = 500;
    if (p.positionX) { p.positionX.value = pos.x; p.positionY.value = pos.y; p.positionZ.value = pos.z; } else p.setPosition(pos.x, pos.y, pos.z);
    g.connect(p); p.connect(sfx); const w = ctx.createGain(); w.gain.value = wet; g.connect(w); w.connect(verbIn); return g;
  }
  const lisPos = new THREE.Vector3(-2, 1.7, 6);
  function setListener(cam) {
    lisPos.copy(cam.position); if (!ctx) return; const L = ctx.listener, p = cam.position, f = _v4.set(0, 0, -1).applyQuaternion(cam.quaternion), u = _v3.set(0, 1, 0).applyQuaternion(cam.quaternion);
    if (L.positionX) { L.positionX.value = p.x; L.positionY.value = p.y; L.positionZ.value = p.z; L.forwardX.value = f.x; L.forwardY.value = f.y; L.forwardZ.value = f.z; L.upX.value = u.x; L.upY.value = u.y; L.upZ.value = u.z; }
    else { L.setPosition(p.x, p.y, p.z); L.setOrientation(f.x, f.y, f.z, u.x, u.y, u.z); }
  }
  function noise(t, dur, g, type, freq, q, dest, off) { const s = ctx.createBufferSource(); s.buffer = NOISE; const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q || 0.8;
    const v = ctx.createGain(); v.gain.setValueAtTime(0.0001, t); v.gain.linearRampToValueAtTime(g, t + 0.004); v.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(v); v.connect(dest); s.start(t, off ?? Math.random() * 1.5); s.stop(t + dur + 0.05); return v; }
  function modes(t, list, dest, gain = 1) { // [freq, amp, decay]
    for (const [f, a, d] of list) { const o = ctx.createOscillator(), v = ctx.createGain(); o.frequency.value = f * (1 + (Math.random() - 0.5) * 0.01);
      v.gain.setValueAtTime(0.0001, t); v.gain.linearRampToValueAtTime(a * gain, t + 0.002); v.gain.exponentialRampToValueAtTime(0.0001, t + d); o.connect(v); v.connect(dest); o.start(t); o.stop(t + d + 0.05); } }
  // stick-slip friction (creaks, squeaks): irregular impulse train through resonators
  function friction(t, dur, r0, r1, jit, res, dest, gain) {
    const b = buf(dur, () => 0), d = b.getChannelData(0), sr = ctx.sampleRate; let x = 0;
    while (x < dur) { const i = Math.floor(x * sr); if (i < d.length) d[i] = (0.4 + Math.random() * 0.6) * Math.sin(Math.PI * x / dur); x += 1 / (lerp(r0, r1, x / dur) * (1 + (Math.random() - 0.5) * jit)); }
    const s = ctx.createBufferSource(); s.buffer = b; const v = ctx.createGain(); v.gain.value = gain; v.connect(dest);
    for (const [f, q] of res) { const bp = ctx.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = f; bp.Q.value = q; s.connect(bp); bp.connect(v); }
    s.start(t);
  }
  // ---- crows (v35): the repository owner's two recordings, cleaned and cut into single caws in one file (audio/sfx/crows.mp3: 17 short caws from the
  // first, 3 long drawn ones from the second, each followed by silence). The caws are found from those gaps once the file is decoded, so
  // the cut points don't depend on how a browser's mp3 decoder pads the start. A crow's call is strung together from them the way crows
  // call: a run of one to five, evenly spaced, each bird with its own pitch and pace, the run trailing off a little, the last caw dropping
  const laz = { beam: null, charge: null, wake: null }; // (the laser's running sounds, 12k)
  const crowBank = { p: null, voices: [], live: [] }; let hushUntil = 0; const hushed = () => performance.now() / 1000 < hushUntil; // (hush: no crows over the drop and the snap)
  function crowCaws() {
    if (!ctx) return Promise.resolve(null);
    if (!crowBank.p) crowBank.p = clipBuffer("crows").then(b => { if (!b) return null;
      const D = b.getChannelData(0), sr = b.sampleRate, w = Math.floor(sr * 0.01), n = Math.floor(D.length / w), segs = []; let s0 = -1, quiet = 0;
      for (let i = 0; i < n; i++) { let m = 0; for (let j = i * w, e = j + w; j < e; j++) { const a = Math.abs(D[j]); if (a > m) m = a; }
        if (m > 0.012) { if (s0 < 0) s0 = i; quiet = 0; } else if (s0 >= 0 && ++quiet >= 8) { segs.push([s0, i - 7]); s0 = -1; quiet = 0; } }
      if (s0 >= 0) segs.push([s0, n]);
      const L = segs.filter(([a, e]) => e - a > 8).map(([a, e]) => [Math.max(0, a * w / sr - 0.012), (e - a) * w / sr + 0.06]);
      return L.length ? { b, short: L.filter(c => c[1] < 0.45), long: L.filter(c => c[1] >= 0.45) } : null; });
    return crowBank.p;
  }
  // a bird's own voice: the pitch it calls at, how fast it repeats, whether it's one of the long, drawn callers, and the few caws it uses
  function crowVoice() { const long = Math.random() < 0.22, pick = []; for (let i = 0; i < 5; i++) pick.push(Math.random());
    return { rate: 0.9 + Math.random() * 0.2, period: long ? 1.2 + Math.random() * 0.3 : 0.48 + Math.random() * 0.14, long, pick, last: -1 }; }
  // how often crows are heard, whoever's calling (v38: they were heard far too often): after a call, and any answer to it, the town is
  // quiet of crows for 10–20 s before the next one; an alarm (after a shot, the bell, the trap) needs only 2.5–4.5 s, so a shootout
  // isn't one long squawk. An answer (o.answer) comes in under the call it answers.
  const crowLim = { next: 0, nextAlarm: 0 }, CROW_GAP = [10, 20], CROW_ALARM_GAP = [2.5, 4.5];
  function crowFree(alarm) { return !!ctx && !hushed() && now() >= (alarm ? crowLim.nextAlarm : crowLim.next); }
  // one call: returns (as a promise) how many seconds from now it ends, so another bird can answer it (0 or less: it wasn't heard)
  function crowCall(pos, o = {}) {
    if (!ctx || hushed()) return Promise.resolve(0);
    if (!o.answer && !crowFree(o.alarm)) return Promise.resolve(-1);
    { const t = now() + (o.delay || 0) + 4; crowLim.next = Math.max(crowLim.next, t); crowLim.nextAlarm = Math.max(crowLim.nextAlarm, t); } // (booked now: two birds in the same moment don't both get through)
    return crowCaws().then(C => { if (!C || !ctx) return 0;
      const v = o.v || (o.v = crowVoice()), set = v.long && C.long.length ? C.long : C.short; if (!set.length) return 0;
      const alarm = !!o.alarm, far = o.far || 0, n = o.n || (alarm ? 4 + (Math.random() * 3 | 0) : [1, 2, 2, 3, 3, 3, 4, 4, 5][Math.random() * 9 | 0]);
      const per = v.period * (alarm ? 0.72 : 1), t0 = now() + (o.delay || 0) + 0.02;
      // the path out: placed where the bird is, distance takes the top off it (air), and a far bird is mostly echo off the town
      const d = at(pos, o.wet ?? lerp(0.22, 0.75, far), o.ref || 7); let dest = d;
      if (far > 0.02) { const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = lerp(9000, 2200, far); lp.Q.value = 0.5; lp.connect(d); dest = lp; }
      const cg = ctx.createGain(); cg.connect(dest); dest = cg; // (the whole call through one gain, so a hush can cut it short)
      let t = t0, end = t0;
      for (let k = 0; k < n; k++) {
        let i = v.pick[k % v.pick.length] * set.length | 0; if (i === v.last) i = (i + 1) % set.length; v.last = i; // (never the same caw twice running)
        const [off, dur] = set[i], s = ctx.createBufferSource(); s.buffer = C.b;
        const rate = v.rate * (alarm ? 1.06 : 1) * (1 + (Math.random() - 0.5) * 0.05) * (k === n - 1 && n > 1 ? 0.965 : 1); s.playbackRate.value = rate;
        const g = ctx.createGain(); g.gain.value = (o.gain ?? 0.55) * Math.pow(0.93, k) * (0.85 + Math.random() * 0.3); s.connect(g); g.connect(dest);
        s.start(t, off, dur); end = t + dur / rate; t += per * (0.92 + Math.random() * 0.16);
      }
      crowBank.live = crowBank.live.filter(L => L.end > now()); crowBank.live.push({ cg, end });
      crowLim.next = Math.max(crowLim.next, end + CROW_GAP[0] + Math.random() * (CROW_GAP[1] - CROW_GAP[0])); crowLim.nextAlarm = Math.max(crowLim.nextAlarm, end + CROW_ALARM_GAP[0] + Math.random() * (CROW_ALARM_GAP[1] - CROW_ALARM_GAP[0]));
      return end - now(); });
  }
  // the crows round the town that you never see: three or four birds out past the buildings, each always from about the same way
  // and with its own voice, calling now and then and answering one another
  const crowAmb = { on: true, t: null, birds: null };
  function crowAmbient() {
    clearTimeout(crowAmb.t); crowAmb.t = setTimeout(crowAmbient, (28 + Math.random() * 32) * 1000);
    if (!ctx || ctx.state !== "running" || !crowAmb.on || (api.crowGate && !api.crowGate())) return;
    if (!crowAmb.birds) crowAmb.birds = Array.from({ length: 4 }, (_, i) => ({ v: crowVoice(), a: i * 1.6 + Math.random(), r: 40 + Math.random() * 50, h: 6 + Math.random() * 14 }));
    const B = crowAmb.birds, first = B[Math.random() * B.length | 0], where = b => V3(lisPos.x + Math.cos(b.a) * b.r, b.h, lisPos.z + Math.sin(b.a) * b.r);
    crowCall(where(first), { v: first.v, far: clamp((first.r - 30) / 60, 0.25, 1), gain: 0.6 }).then(len => {
      if (len > 0 && Math.random() < 0.35) { const other = B.filter(b => b !== first)[Math.random() * (B.length - 1) | 0];
        crowCall(where(other), { v: other.v, far: clamp((other.r - 30) / 60, 0.25, 1), gain: 0.6, delay: len + 0.35 + Math.random() * 1.4, answer: true }).then(l2 => {
          if (l2 > 0 && Math.random() < 0.12) crowCall(where(first), { v: first.v, far: clamp((first.r - 30) / 60, 0.25, 1), gain: 0.55, delay: l2 + 0.3 + Math.random() * 1.2, answer: true }); }); } });
  }
  // ---- ambience ----
  function startAmbience() {
    // wind: broadband and slowly gusting. No narrow resonances anywhere in the bed (a high-Q band of noise reads as a whistle or a ringing tone).
    const w = ctx.createBufferSource(); w.buffer = buf(6, () => Math.random() * 2 - 1); w.loop = true;
    const bp = ctx.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 380; bp.Q.value = 0.45;
    const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = 0.07; lg.gain.value = 140; lfo.connect(lg); lg.connect(bp.frequency); lfo.start();
    const wg = ctx.createGain(); wg.gain.value = 0.055; const gust = ctx.createOscillator(), gg = ctx.createGain(); gust.frequency.value = 0.11; gg.gain.value = 0.028; gust.connect(gg); gg.connect(wg.gain); gust.start();
    w.connect(bp); bp.connect(wg); wg.connect(amb); w.start();
    for (let i = 0; i < 6; i++) { const s = ctx.createBufferSource(); s.buffer = NOISE; s.loop = true; const f1 = ctx.createBiquadFilter(); f1.type = "bandpass"; f1.Q.value = 3; f1.frequency.value = 450 + i * 60;
      const f2 = ctx.createBiquadFilter(); f2.type = "bandpass"; f2.Q.value = 2; f2.frequency.value = 1300 + i * 120; const g = ctx.createGain(); g.gain.value = 0; const p = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
      s.connect(f1); f1.connect(f2); f2.connect(g); if (p) { p.pan.value = (i / 5 - 0.5) * 1.4; g.connect(p); p.connect(amb); } else g.connect(amb); s.start(0, Math.random() * 2); murmur.push({ g, f1, f2 }); }
    murT = setInterval(() => { if (!ctx || ctx.state !== "running") return; const t = now(), base = 0.012 + level * 0.03;
      const talk = voice.until > t ? 0.45 : 1; // the crowd hushes while the host talks
      for (const v of murmur) { const on = Math.random() < 0.55; v.g.gain.setTargetAtTime(on ? base * talk * (0.5 + Math.random()) : 0.0, t, 0.05); v.f1.frequency.setTargetAtTime(380 + Math.random() * 380, t, 0.06); v.f2.frequency.setTargetAtTime(1000 + Math.random() * 900, t, 0.06); } }, 170);
  }
  // ---- music (fingerpicked Karplus-Strong guitar, whistle → harmonica, bass, percussion, tremolo strings) ----
  function pluckBuffer(m) { if (plucks.has(m)) return plucks.get(m); const sr = ctx.sampleRate, N = Math.max(2, Math.round(sr / mtof(m))), len = Math.floor(sr * 1.8);
    const b = ctx.createBuffer(1, len, sr), d = b.getChannelData(0), ring = new Float32Array(N); let p = 0; for (let i = 0; i < N; i++) { p = 0.55 * p + 0.45 * (Math.random() * 2 - 1); ring[i] = p; }
    let k = 0; const damp = m < 50 ? 0.997 : 0.995; for (let i = 0; i < len; i++) { const a = ring[k], c = ring[(k + 1) % N]; d[i] = a; ring[k] = damp * 0.5 * (a + c); k = (k + 1) % N; } plucks.set(m, b); return b; }
  function out(node, pan, wet) { const p = ctx.createStereoPanner ? ctx.createStereoPanner() : null; if (p) { p.pan.value = pan || 0; node.connect(p); p.connect(music); if (wet) p.connect(verbIn); } else { node.connect(music); if (wet) node.connect(verbIn); } }
  function pluck(m, t, g, pan) { const s = ctx.createBufferSource(); s.buffer = pluckBuffer(m); const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 3200;
    const v = ctx.createGain(); v.gain.setValueAtTime(g, t); v.gain.exponentialRampToValueAtTime(0.001, t + 1.7); s.connect(lp); lp.connect(v); out(v, pan, true); s.start(t); s.stop(t + 1.8); }
  function lead(m, t, dur, g, reed) { const o = ctx.createOscillator(), v = ctx.createGain(), vib = ctx.createOscillator(), vg = ctx.createGain(); o.type = reed ? "sawtooth" : "sine"; o.frequency.value = mtof(m);
    vib.frequency.value = reed ? 6.2 : 5.2; vg.gain.value = mtof(m) * (reed ? 0.012 : 0.008); vib.connect(vg); vg.connect(o.frequency); let node = o;
    if (reed) { const bp = ctx.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 1300; bp.Q.value = 1.2; o.connect(bp); node = bp; }
    v.gain.setValueAtTime(0.0001, t); v.gain.linearRampToValueAtTime(g, t + 0.05); v.gain.setTargetAtTime(g * 0.75, t + 0.1, 0.2); v.gain.setTargetAtTime(0.0001, t + dur, 0.06);
    node.connect(v); out(v, 0.15, true); o.start(t); vib.start(t); o.stop(t + dur + 0.4); vib.stop(t + dur + 0.4); }
  function bass(m, t, dur, g) { const o = ctx.createOscillator(), v = ctx.createGain(); o.type = "triangle"; o.frequency.value = mtof(m); v.gain.setValueAtTime(g, t); v.gain.exponentialRampToValueAtTime(0.001, t + dur); o.connect(v); out(v, 0, false); o.start(t); o.stop(t + dur + 0.05); }
  function drum(t, f0, f1, dur, g, dest) { const o = ctx.createOscillator(), v = ctx.createGain(); o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur); v.gain.setValueAtTime(g, t); v.gain.exponentialRampToValueAtTime(0.001, t + dur); o.connect(v); if (dest) v.connect(dest); else out(v, 0, false); o.start(t); o.stop(t + dur + 0.02); }
  function strings(chord, t, dur, g) { const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 1500; const v = ctx.createGain(), tr = ctx.createOscillator(), tg = ctx.createGain();
    v.gain.setValueAtTime(0.0001, t); v.gain.linearRampToValueAtTime(g, t + 0.25); v.gain.setTargetAtTime(0.0001, t + dur - 0.1, 0.1); tr.frequency.value = 9; tg.gain.value = g * 0.6; tr.connect(tg); tg.connect(v.gain); tr.start(t); tr.stop(t + dur + 0.3);
    lp.connect(v); out(v, -0.2, true); for (const m of chord) { const o = ctx.createOscillator(); o.type = "sawtooth"; o.frequency.value = mtof(m + 12); o.detune.value = (Math.random() - 0.5) * 14; o.connect(lp); o.start(t); o.stop(t + dur + 0.3); } }
  const MAJ = [{ b: 45, c: [57, 61, 64] }, { b: 50, c: [57, 62, 66] }, { b: 40, c: [56, 59, 64] }, { b: 45, c: [57, 61, 64] }];
  const MIN = [{ b: 45, c: [57, 60, 64] }, { b: 50, c: [57, 62, 65] }, { b: 40, c: [56, 59, 64] }, { b: 45, c: [57, 60, 64] }];
  const MEL = [[73, 0, 76, 78, 76, 0, 73, 71, 74, -1, 78, -1, 76, 74, 73, 0, 71, -1, 76, -1, 74, 71, 68, 0, 69, -1, -1, -1, -1, -1, 0, 0],
    [69, 0, 73, -1, 76, -1, 81, -1, 78, -1, 76, 74, 0, 73, 74, 0, 76, -1, 71, -1, 68, -1, 71, 0, 69, -1, -1, -1, 64, 0, 69, 0]];
  const toMinor = m => { const pc = ((m % 12) + 12) % 12; return pc === 1 || pc === 6 ? m - 1 : m; };
  const bpm = () => 80 + 50 * level;
  function scheduleStep(n, t) {
    const e = 30 / bpm(), bar = Math.floor(n / 8) % 4, s = n % 8, minor = level >= 0.55, ch = (minor ? MIN : MAJ)[bar];
    const pat = [ch.b, ch.c[0], ch.c[1], ch.c[2], ch.b + 7, ch.c[1], ch.c[2], ch.c[1]], pm = s === 4 && ch.b + 7 > 52 ? ch.b - 5 : pat[s];
    pluck(pm, t, s === 0 || s === 4 ? 0.34 : 0.2, s % 2 ? 0.25 : -0.15);
    if (level >= 0.7 && s % 2 === 1) pluck(ch.c[2] + 12, t, 0.08, 0.4);
    const ph = MEL[Math.floor(n / 32) % 2], idx = n % 32, note = ph[idx];
    if (note > 0) { let len = 1; while (idx + len < 32 && ph[idx + len] === -1) len++; const m = minor ? toMinor(note) : note; lead(m - 12, t, len * e * 0.95, level >= 0.45 ? 0.05 : 0.035, true); }
    if (level >= 0.12) noise(t, 0.04, s % 2 ? 0.03 : 0.045, "highpass", 7000, 0.7, music);
    if (level >= 0.22 && (s === 0 || s === 4)) bass(ch.b - 12 + (s === 4 ? 7 : 0), t, e * 3.5, 0.3);
    if (level >= 0.3 && (s === 0 || s === 4 || (level >= 0.7 && s === 7))) drum(t, 120, 42, 0.32, 0.5);
    if (level >= 0.45 && [0, 2, 3, 4, 6, 7].includes(s)) drum(t, s % 2 ? 820 : 640, s % 2 ? 700 : 520, 0.05, 0.08);
    if (level >= 0.6 && (s === 2 || s === 6)) noise(t, 0.16, 0.16, "bandpass", 1900, 0.8, music);
    if (level >= 0.6 && s === 0) strings(ch.c, t, e * 8, 0.03 + 0.03 * level);
    if (level >= 0.72 && (s === 0 || s === 1)) drum(t + (s ? 0.02 : 0), s ? 52 : 60, 38, 0.22, s ? 0.5 : 0.7, sfx);
  }
  function tick() { while (nextT < now() + 0.14) { scheduleStep(step, nextT); nextT += 30 / bpm(); step++; } }
  const api = {
    resume, suspend, setListener,
    unlock, loadSong,
    startMusic() { if (!init()) return; resume(); song.wanted = true; playing = true;
      if (song.buf) { if (timer) { clearInterval(timer); timer = null; }
        if (!song.src) { startSong(2.0); return; }
        // already looping: keep the place in the track and just bring it back up
        const t = now(), g = song.gain.gain; g.cancelScheduledValues(t); g.setValueAtTime(Math.max(0.0001, g.value), t); g.setTargetAtTime(lerp(0.78, 0.95, level), t, 0.6);
        song.filter.frequency.cancelScheduledValues(t); song.filter.frequency.setValueAtTime(song.filter.frequency.value, t); song.filter.frequency.setTargetAtTime(lerp(8500, 20000, level), t, 0.6); return; }
      if (song.loading) return; // the soundtrack starts the moment decoding finishes
      if (timer) clearInterval(timer); music.gain.cancelScheduledValues(now()); music.gain.setValueAtTime(0.5, now()); step = 0; nextT = now() + 0.1; timer = setInterval(tick, 25); },
    stopMusic(fade = 0.8) { playing = false; song.wanted = false; if (timer) clearInterval(timer); timer = null; if (ctx) stopSong(fade); },
    somber() { if (!ctx || !song.src) return; const t = now(); song.filter.frequency.setTargetAtTime(1600, t, 1.2); song.gain.gain.setTargetAtTime(0.42, t, 1.5); },
    setLevel(x) { level = clamp(x, 0, 1);
      if (ctx && song.src) { const t = now(); song.filter.frequency.setTargetAtTime(lerp(8500, 20000, level), t, 0.8); song.gain.gain.setTargetAtTime(lerp(0.78, 0.98, level), t, 0.8); }
      if (level >= 0.6 && !hbT) hbT = setInterval(heartbeat, 60000 / 92); else if (level < 0.6 && hbT) { clearInterval(hbT); hbT = null; } },
    setDusk(d) { dusk = d; },
    duck(to = 0.08, sec = 0.8) { if (ctx && song.gain) song.gain.gain.setTargetAtTime(to, now(), sec / 3); },
    breath(pos, k = 0.6) { if (!ctx) return; const t = now(), d = at(pos, 0.2, 3.5);
      const ins = ctx.createBufferSource(); ins.buffer = NOISE; const f1 = ctx.createBiquadFilter(); f1.type = "bandpass"; f1.Q.value = 1.6; f1.frequency.setValueAtTime(900, t); f1.frequency.linearRampToValueAtTime(1700, t + 0.28);
      const g1 = ctx.createGain(); g1.gain.setValueAtTime(0.0001, t); g1.gain.linearRampToValueAtTime(0.32 * k, t + 0.12); g1.gain.exponentialRampToValueAtTime(0.0001, t + 0.3); ins.connect(f1); f1.connect(g1); g1.connect(d); ins.start(t, Math.random()); ins.stop(t + 0.35);
      const ex = ctx.createBufferSource(); ex.buffer = NOISE; const f2 = ctx.createBiquadFilter(); f2.type = "bandpass"; f2.Q.value = 1.2; f2.frequency.setValueAtTime(1300, t + 0.32); f2.frequency.linearRampToValueAtTime(700, t + 0.62);
      const g2 = ctx.createGain(); g2.gain.setValueAtTime(0.0001, t + 0.3); g2.gain.linearRampToValueAtTime(0.4 * k, t + 0.36); g2.gain.exponentialRampToValueAtTime(0.0001, t + 0.66); ex.connect(f2); f2.connect(g2); g2.connect(d); ex.start(t + 0.3, Math.random()); ex.stop(t + 0.7);
      if (k > 0.75 && Math.random() < 0.45) { const o = ctx.createOscillator(), v = ctx.createGain(), bp = ctx.createBiquadFilter(); o.type = "sawtooth"; o.frequency.setValueAtTime(330 + Math.random() * 60, t + 0.33); o.frequency.linearRampToValueAtTime(240, t + 0.62);
        bp.type = "bandpass"; bp.frequency.value = 900; bp.Q.value = 2; v.gain.setValueAtTime(0, t + 0.33); v.gain.linearRampToValueAtTime(0.06 * k, t + 0.4); v.gain.linearRampToValueAtTime(0, t + 0.62); o.connect(bp); bp.connect(v); v.connect(d); o.start(t + 0.33); o.stop(t + 0.65); } },
    stinger() { if (!ctx) return; if (timer) { clearInterval(timer); timer = null; } api.duck(0.06, 1.0); const t = now(), lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.setValueAtTime(300, t); lp.frequency.exponentialRampToValueAtTime(4000, t + 1.2);
      const v = ctx.createGain(); v.gain.setValueAtTime(0.0001, t); v.gain.exponentialRampToValueAtTime(0.14, t + 1.15); v.gain.setValueAtTime(0.0001, t + 1.22); lp.connect(v); v.connect(music); v.connect(verbIn);
      for (const m of [45, 46, 52, 53, 58]) { const o = ctx.createOscillator(); o.type = "sawtooth"; o.frequency.value = mtof(m); o.connect(lp); o.start(t); o.stop(t + 1.3); }
      for (let i = 0; i < 26; i++) { const tt = t + 1.15 * (1 - Math.pow(1 - i / 26, 1.6)); noise(tt, 0.06, 0.05 + i * 0.006, "bandpass", 1800, 0.9, music); } },
    victory() { if (!ctx) return; if (hbT) { clearInterval(hbT); hbT = null; } level = 0;
      if (song.src) { const t = now(); song.filter.frequency.setTargetAtTime(20000, t, 0.3); song.gain.gain.setTargetAtTime(1.05, t, 0.4); song.gain.gain.setTargetAtTime(0.85, t + 3, 1.5); }
      else { api.stopMusic(); const t = now() + 0.05; [57, 61, 64, 69, 73, 76].forEach((m, i) => pluck(m, t + i * 0.09, 0.32, (i - 3) * 0.12)); lead(81, t + 0.55, 1.1, 0.09, false); bass(33, t, 2, 0.35); } },
    // ---- effects ----
    step(pos, surface, spurs, k = 1) { if (!ctx) return; const t = now(), d0 = at(pos, surface === "wood" ? 0.28 : 0.14, 4.5), d = ctx.createGain(); d.gain.value = 1.7 * k; d.connect(d0);
      if (surface === "wood") { const s = ctx.createBufferSource(); s.buffer = NOISE; const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 1400; const v = ctx.createGain(); v.gain.setValueAtTime(0.5, t); v.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
        s.connect(lp); lp.connect(v); for (const [f, q, g] of [[160, 7, 1.4], [410, 9, 0.8], [980, 6, 0.3]]) { const bp = ctx.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = f * (0.95 + Math.random() * 0.1); bp.Q.value = q; const gg = ctx.createGain(); gg.gain.value = g; v.connect(bp); bp.connect(gg); gg.connect(d); }
        s.start(t, Math.random()); s.stop(t + 0.15); noise(t + 0.03, 0.03, 0.12, "highpass", 2500, 0.7, d);
        if (Math.random() < 0.15) friction(t + 0.04, 0.3 + Math.random() * 0.25, 35, 60, 0.6, [[620, 6], [1150, 7], [2050, 5]], d, 0.3); }
      else { noise(t, 0.09, 0.45, "lowpass", 620, 0.9, d); noise(t + 0.004, 0.06, 0.18, "bandpass", 2600, 1.2, d); noise(t + 0.045, 0.05, 0.16, "lowpass", 900, 0.7, d); }
      // spur rowels: a short, dry chink of filtered noise (no sustained partials, so nothing rings on between steps)
      if (spurs && Math.random() < 0.55) { noise(t + 0.012, 0.03, 0.045, "bandpass", 3300 + Math.random() * 700, 2.0, d); if (Math.random() < 0.35) noise(t + 0.07, 0.025, 0.02, "bandpass", 3600, 2.0, d); } },
    creak(pos, k = 1) { if (ctx) friction(now(), 0.35 + Math.random() * 0.4, 28 + Math.random() * 20, 55 + Math.random() * 30, 0.7, [[560, 7], [1060, 8], [1900, 6]], at(pos, 0.3), 0.55 * k); },
    ropeCreak(pos, k = 1) { if (ctx) friction(now(), 0.6, 22, 34, 0.5, [[310, 6], [690, 7], [1250, 5]], at(pos, 0.3), 0.5 * k); },
    // felt-tip on the board (and rope rubbing): a soft broadband scratch following the strokes, not a tonal squeal
    squeak(pos, dur) { if (!ctx) return; const t = now(), d = at(pos, 0.12, 2), s = ctx.createBufferSource(); s.buffer = NOISE;
      const hp = ctx.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 1100; hp.Q.value = 0.5; const bp = ctx.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 2700; bp.Q.value = 0.6;
      const v = ctx.createGain(); v.gain.setValueAtTime(0.0001, t); let tt = t;
      while (tt < t + dur) { const len = 0.05 + Math.random() * 0.06; v.gain.linearRampToValueAtTime(0.05 + Math.random() * 0.035, tt + 0.012); v.gain.linearRampToValueAtTime(0.01, tt + len); tt += len; }
      v.gain.linearRampToValueAtTime(0.0001, tt + 0.03); s.connect(hp); hp.connect(bp); bp.connect(v); v.connect(d); s.start(t, Math.random()); s.stop(tt + 0.06); },
    cap(pos) { if (!ctx) return; const t = now(), d = at(pos, 0.1, 2); noise(t, 0.018, 0.3, "bandpass", 2600, 1.1, d); noise(t + 0.004, 0.03, 0.12, "lowpass", 900, 0.8, d); },
    clank(pos) { if (!ctx) return; const t = now(), d = at(pos, 0.4); noise(t, 0.03, 0.55, "highpass", 1500, 0.7, d); noise(t, 0.08, 0.5, "lowpass", 700, 0.8, d); modes(t, [[410, 0.3, 0.2], [1120, 0.14, 0.12], [2380, 0.05, 0.06]], d); friction(t + 0.05, 0.25, 60, 90, 0.4, [[900, 5], [1600, 6]], d, 0.4); },
    bang(pos) { if (!ctx) return; const t = now(), d = at(pos, 0.9, 4); noise(t, 0.35, 1.0, "lowpass", 850, 0.8, d); modes(t, [[72, 0.9, 0.55], [118, 0.6, 0.4], [190, 0.45, 0.3], [310, 0.3, 0.22], [520, 0.15, 0.14]], d); drum(t, 70, 32, 0.6, 1.0, d); const fw = ctx.createGain(); fw.gain.value = 0.6; d.connect(fw); fw.connect(verbFar); },
    snap(pos, k = 1) { if (!ctx) return; const t = now(), d = at(pos, 0.5); noise(t, 0.07, 0.8 * k, "highpass", 1800, 0.7, d); drum(t + 0.01, 90, 40, 0.3, 0.7 * k, d); friction(t + 0.03, 0.8, 30, 18, 0.5, [[300, 6], [700, 6]], d, 0.7 * k); },
    // the neck breaking as the rope catches him: the repository owner's own recording (audio/sfx/neck0.mp3), played dry at the neck. If the file can't be had,
    // the old synthesized crack stands in. Nothing else sounds with it: no ring, no glint
    neckSnap(neck, knot) { if (!ctx) return; const n = neck.clone(), k = knot.clone();
      clipBuffer("neck0").then(b => { if (!ctx) return; if (b) { api.clip("neck0", n, 1.6, 0, 0.05, 1, 5); return; }
        const t = now(); noise(t, 0.045, 1.0, "highpass", 1900, 0.7, at(k, 0.05)); drum(t, 100, 45, 0.11, 0.75, at(n, 0.04, 3)); api.crack(n, 2.6, 0.05); }); },
    preloadClips,
    prime(names) { for (const nm of names) clipBuffer(nm); }, // (fetched and decoded ahead, so the first time it plays it's on the moment: the neck, v40)
    clip(nm, pos, gain = 1, delay = 0, wet = 0.22, rate = 1, ref = 3) { if (!ctx) return; clipBuffer(nm).then(b => { if (!b || !ctx) return; const t = now() + delay, s = ctx.createBufferSource(); s.buffer = b;
      s.playbackRate.value = rate; const g = ctx.createGain(); g.gain.value = gain; s.connect(g); g.connect(at(pos, wet, ref)); s.start(t); }); },
    // the player's own heartbeat once he's hurt
    pulse(k = 1) { if (!ctx) return; const t = now(); drum(t, 62, 38, 0.18, 0.7 * k, sfx); drum(t + 0.26, 56, 36, 0.22, 0.5 * k, sfx); },
    // the neck giving way: a few tiny, dry fractures (sharp clicks rung through small stiff resonances) over a dull low knock. Kept quiet.
    crack(pos, k = 1, wet = 0.18) { if (!ctx) return; const t = now(), d = at(pos, wet, 3), sr = ctx.sampleRate, len = Math.floor(sr * 0.13), b = ctx.createBuffer(1, len, sr), D = b.getChannelData(0);
      const n = 3 + (Math.random() * 3 | 0);
      for (let c = 0; c < n; c++) { const i0 = Math.floor((c ? 0.003 + Math.random() * 0.045 : 0) * sr), a = c ? 0.3 + Math.random() * 0.45 : 1, f = 1600 + Math.random() * 2800, dec = 0.0012 + Math.random() * 0.0028, ph = Math.random() * 6;
        for (let i = i0; i < len; i++) { const tt = (i - i0) / sr, e = Math.exp(-tt / dec); if (e < 1e-4) break; D[i] += a * e * (0.65 * Math.sin(TAU * f * tt + ph) + 0.55 * (Math.random() * 2 - 1)); } }
      let ph = 0; for (let i = 0; i < len; i++) { const tt = i / sr; ph += TAU * (140 + 90 * Math.exp(-tt / 0.008)) / sr; D[i] += 0.55 * Math.exp(-tt / 0.02) * Math.sin(ph); }
      const s = ctx.createBufferSource(); s.buffer = b; const hp = ctx.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 80; const v = ctx.createGain(); v.gain.value = 0.3 * k;
      s.connect(hp); hp.connect(v); v.connect(d); s.start(t); },
    gasp(pos) { if (!ctx) return; const t = now(), d = at(pos, 0.5, 6);
      for (let i = 0; i < 6; i++) { const s = ctx.createBufferSource(); s.buffer = NOISE; const f = ctx.createBiquadFilter(); f.type = "bandpass"; f.Q.value = 2.5; f.frequency.setValueAtTime(900 + i * 150, t); f.frequency.linearRampToValueAtTime(2200 + i * 200, t + 0.35);
        const v = ctx.createGain(); v.gain.setValueAtTime(0.0001, t + i * 0.02); v.gain.linearRampToValueAtTime(0.12, t + 0.12 + i * 0.02); v.gain.exponentialRampToValueAtTime(0.001, t + 0.7); s.connect(f); f.connect(v); v.connect(d); s.start(t, Math.random()); s.stop(t + 0.8); }
      level = Math.max(level, 0.9); },
    applause(pos) { if (!ctx) return; const t = now(), d = at(pos, 0.5, 6); for (let i = 0; i < 260; i++) { const tt = t + Math.random() * 2.8 * Math.pow(Math.random(), 0.5); noise(tt, 0.03, 0.08 + Math.random() * 0.1, "bandpass", 900 + Math.random() * 1600, 1.1, d); }
      for (let k = 0; k < 6; k++) { const tt = t + 0.3 + Math.random() * 2.2; noise(tt, 0.35, 0.05, "lowpass", 600, 0.7, d); } }, // a few whoops/stomps, no whistles
    // crows: a call from a bird at pos (o: { v: its voice from crowVoice, n caws, alarm, far 0..1, gain, ref, delay }); resolves to when it ends
    crowCall, crowVoice, crowFree, caw(pos) { return crowCall(pos, { ref: 12 }); },
    set crowsAmbient(on) { crowAmb.on = on; }, crowGate: null,
    // wings: a crow taking off (two recordings, pitched to the bird and a little different each time)
    hush(sec) { hushUntil = Math.max(hushUntil, performance.now() / 1000 + sec); // (and any crow mid-call stops)
      if (ctx) { for (const L of crowBank.live) if (L.end > now()) L.cg.gain.setTargetAtTime(0, now(), 0.04); crowBank.live = []; } },
    get hushed() { return hushed(); }, get crowsCalling() { return ctx ? crowBank.live.filter(L => L.end > now()).length : 0; },
    flap(pos, k = 1, rate = 1) { if (!ctx || hushed()) return; api.clip("flap" + (Math.random() < 0.6 ? 0 : 1), pos, 0.75 * k, 0, 0.12, rate * (0.92 + Math.random() * 0.16), 4); },
    // a crow hit by a bullet: the smack of it, a cut-off squawk and a burst of feathers and wings
    crowHit(pos) { if (!ctx) return; const t = now(), d = at(pos, 0.15, 5); drum(t, 170, 70, 0.06, 0.6, d); noise(t, 0.05, 0.35, "bandpass", 2600, 0.9, d);
      crowCaws().then(C => { if (!C || !ctx || !C.short.length) return; const [off] = C.short[Math.random() * C.short.length | 0], s = ctx.createBufferSource(); s.buffer = C.b; s.playbackRate.value = 1.18 + Math.random() * 0.12;
        const g = ctx.createGain(), t1 = now() + 0.015; g.gain.setValueAtTime(0.6, t1); g.gain.setTargetAtTime(0, t1 + 0.09, 0.025); s.connect(g); g.connect(at(pos, 0.2, 6)); s.start(t1, off + 0.02, 0.22); });
      api.clip("flap0", pos, 0.5, 0.02, 0.1, 1.35, 3); },
    // the laser (v36, 12k): a hum while the beam is on (two buzzing saws a beating fifth apart under a wavering whine, a fast flutter
    // and a hiss of static), a zap as it opens up and a short fall as it closes; the charge spent; recharging; ready again; waking on the crate
    laser(on) { if (!ctx) return; const t = now();
      if (on) { if (laz.beam) return; const out = ctx.createGain(); out.gain.setValueAtTime(0.0001, t); out.gain.exponentialRampToValueAtTime(0.3, t + 0.05); out.connect(sfx);
        const w = ctx.createGain(); w.gain.value = 0.16; out.connect(w); w.connect(verbIn);
        const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 2400; lp.Q.value = 3; lp.connect(out);
        const o1 = ctx.createOscillator(), o2 = ctx.createOscillator(), o3 = ctx.createOscillator(), l1 = ctx.createOscillator(), l2 = ctx.createOscillator();
        o1.type = o2.type = "sawtooth"; o1.frequency.value = 92; o2.frequency.value = 138.9; o3.frequency.value = 1860; l1.frequency.value = 7.3; l2.frequency.value = 31;
        const g1 = ctx.createGain(); g1.gain.value = 26; l1.connect(g1); g1.connect(o3.frequency);
        const hum = ctx.createGain(); hum.gain.value = 0.42; const g2 = ctx.createGain(); g2.gain.value = 0.22; l2.connect(g2); g2.connect(hum.gain); o1.connect(hum); o2.connect(hum); hum.connect(lp);
        const g3 = ctx.createGain(); g3.gain.value = 0.12; o3.connect(g3); g3.connect(out);
        const ns = ctx.createBufferSource(); ns.buffer = NOISE; ns.loop = true; const nb = ctx.createBiquadFilter(); nb.type = "bandpass"; nb.frequency.value = 4200; nb.Q.value = 1.1; const ng = ctx.createGain(); ng.gain.value = 0.05; ns.connect(nb); nb.connect(ng); ng.connect(out);
        const srcs = [o1, o2, o3, l1, l2, ns]; for (const o of srcs) o.start(t);
        const z = ctx.createOscillator(), zg = ctx.createGain(); z.type = "sawtooth"; z.frequency.setValueAtTime(2600, t); z.frequency.exponentialRampToValueAtTime(240, t + 0.14); zg.gain.setValueAtTime(0.3, t); zg.gain.exponentialRampToValueAtTime(0.001, t + 0.16); z.connect(zg); zg.connect(lp); z.start(t); z.stop(t + 0.2);
        laz.beam = { out, srcs }; }
      else { const B = laz.beam; if (!B) return; laz.beam = null; B.out.gain.cancelScheduledValues(t); B.out.gain.setValueAtTime(Math.max(0.0001, B.out.gain.value), t); B.out.gain.exponentialRampToValueAtTime(0.0001, t + 0.1); for (const o of B.srcs) o.stop(t + 0.14);
        const z = ctx.createOscillator(), zg = ctx.createGain(), lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 1800; z.type = "sawtooth"; z.frequency.setValueAtTime(700, t); z.frequency.exponentialRampToValueAtTime(110, t + 0.18);
        zg.gain.setValueAtTime(0.12, t); zg.gain.exponentialRampToValueAtTime(0.001, t + 0.2); z.connect(lp); lp.connect(zg); zg.connect(sfx); z.start(t); z.stop(t + 0.22); } },
    laserEmpty() { if (!ctx) return; const t = now(), z = ctx.createOscillator(), zg = ctx.createGain(), lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.setValueAtTime(2400, t); lp.frequency.exponentialRampToValueAtTime(300, t + 0.8);
      z.type = "sawtooth"; z.frequency.setValueAtTime(1300, t); z.frequency.exponentialRampToValueAtTime(70, t + 0.8); zg.gain.setValueAtTime(0.22, t); zg.gain.exponentialRampToValueAtTime(0.001, t + 0.85); z.connect(lp); lp.connect(zg); zg.connect(sfx); z.start(t); z.stop(t + 0.9);
      drum(t + 0.05, 140, 60, 0.12, 0.35, sfx); noise(t, 0.05, 0.25, "highpass", 2500, 0.7, sfx); },
    laserCharge(on) { if (!ctx) return; const t = now();
      if (on) { if (laz.charge) return; const o = ctx.createOscillator(), g = ctx.createGain(), l = ctx.createOscillator(), lg = ctx.createGain(); o.type = "triangle"; o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(1100, t + 7);
        l.frequency.value = 6; lg.gain.value = 0.02; l.connect(lg); lg.connect(g.gain); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.045, t + 0.6); o.connect(g); g.connect(sfx); o.start(t); l.start(t); laz.charge = { g, srcs: [o, l] }; }
      else { const C = laz.charge; if (!C) return; laz.charge = null; C.g.gain.cancelScheduledValues(t); C.g.gain.setValueAtTime(Math.max(0.0001, C.g.gain.value), t); C.g.gain.exponentialRampToValueAtTime(0.0001, t + 0.08); for (const o of C.srcs) o.stop(t + 0.1); } },
    laserReady() { if (!ctx) return; const t = now(), z = ctx.createOscillator(), zg = ctx.createGain(), bp = ctx.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 900; bp.Q.value = 0.9;
      z.type = "sawtooth"; z.frequency.setValueAtTime(180, t); z.frequency.exponentialRampToValueAtTime(1000, t + 0.32); zg.gain.setValueAtTime(0.0001, t); zg.gain.exponentialRampToValueAtTime(0.16, t + 0.25); zg.gain.exponentialRampToValueAtTime(0.0001, t + 0.42);
      z.connect(bp); bp.connect(zg); zg.connect(sfx); z.start(t); z.stop(t + 0.45); drum(t + 0.36, 110, 70, 0.1, 0.3, sfx); drum(t + 0.5, 110, 70, 0.1, 0.25, sfx); },
    laserWake(pos, on) { if (!ctx) return; const t = now();
      if (on) { if (laz.wake) return; const d = at(pos, 0.05, 1.4), g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.5, t + 1.2); g.connect(d);
        const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 1300; lp.connect(g); const o1 = ctx.createOscillator(), o2 = ctx.createOscillator(), l = ctx.createOscillator(), lg = ctx.createGain(), am = ctx.createGain();
        o1.type = "sawtooth"; o1.frequency.value = 92; o2.type = "sine"; o2.frequency.value = 930; l.frequency.value = 1.3; lg.gain.value = 0.35; am.gain.value = 0.6; l.connect(lg); lg.connect(am.gain); o1.connect(am); o2.connect(am); am.connect(lp);
        for (const o of [o1, o2, l]) o.start(t); laz.wake = { g, srcs: [o1, o2, l] };
        const z = ctx.createOscillator(), zg = ctx.createGain(); z.type = "triangle"; z.frequency.setValueAtTime(120, t); z.frequency.exponentialRampToValueAtTime(900, t + 0.9); zg.gain.setValueAtTime(0.0001, t); zg.gain.exponentialRampToValueAtTime(0.25, t + 0.6); zg.gain.exponentialRampToValueAtTime(0.0001, t + 1); z.connect(zg); zg.connect(d); z.start(t); z.stop(t + 1.05); }
      else { const W = laz.wake; if (!W) return; laz.wake = null; W.g.gain.cancelScheduledValues(t); W.g.gain.setValueAtTime(Math.max(0.0001, W.g.gain.value), t); W.g.gain.exponentialRampToValueAtTime(0.0001, t + 0.1); for (const o of W.srcs) o.stop(t + 0.12); } },
    laserPick() { if (!ctx) return; const t = now(); noise(t, 0.04, 0.4, "highpass", 2200, 0.8, sfx); drum(t, 180, 90, 0.07, 0.35, sfx);
      const z = ctx.createOscillator(), zg = ctx.createGain(); z.type = "sawtooth"; z.frequency.setValueAtTime(160, t + 0.05); z.frequency.exponentialRampToValueAtTime(1500, t + 0.35); zg.gain.setValueAtTime(0.0001, t + 0.05); zg.gain.exponentialRampToValueAtTime(0.12, t + 0.25); zg.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
      const bp = ctx.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 1100; bp.Q.value = 0.8; z.connect(bp); bp.connect(zg); zg.connect(sfx); z.start(t + 0.05); z.stop(t + 0.42); },
    // meat (12l): the flash that turns a horse or a crow into meat, it landing, and the sizzle
    zap(pos, k = 1) { if (!ctx) return; const t = now(), d = at(pos, 0.3, 4 * k), z = ctx.createOscillator(), zg = ctx.createGain(); z.type = "square"; z.frequency.setValueAtTime(500, t); z.frequency.exponentialRampToValueAtTime(2600, t + 0.08); z.frequency.exponentialRampToValueAtTime(300, t + 0.22);
      zg.gain.setValueAtTime(0.0001, t); zg.gain.exponentialRampToValueAtTime(0.35 * Math.min(1, k), t + 0.02); zg.gain.exponentialRampToValueAtTime(0.0001, t + 0.24); const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 3500; z.connect(lp); lp.connect(zg); zg.connect(d); z.start(t); z.stop(t + 0.26);
      noise(t + 0.03, 0.12, 0.5, "bandpass", 1800, 0.7, d); drum(t + 0.02, 220, 80, 0.12, 0.5, d); },
    // a man burnt to ash (12o): a soft roar of flame that dies, a crackle through it, and a dry hiss as he falls in
    ash(pos, k = 1) { if (!ctx) return; const t = now(), d = at(pos, 0.3, 4);
      const s = ctx.createBufferSource(); s.buffer = buf(1.6, tt => (Math.random() * 2 - 1) * Math.min(1, tt * 12) * Math.exp(-tt * 2.2)); const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.setValueAtTime(700, t); lp.frequency.exponentialRampToValueAtTime(2600, t + 0.3); lp.frequency.exponentialRampToValueAtTime(500, t + 1.5);
      const g = ctx.createGain(); g.gain.value = 0.5 * k; s.connect(lp); lp.connect(g); g.connect(d); s.start(t);
      const c = ctx.createBufferSource(); c.buffer = buf(1.4, tt => (Math.random() < 0.012 ? (Math.random() * 2 - 1) : 0) * Math.exp(-tt * 1.4)); const hp = ctx.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 1500;
      const g2 = ctx.createGain(); g2.gain.value = 0.9 * k; c.connect(hp); hp.connect(g2); g2.connect(d); c.start(t + 0.05);
      noise(t + 0.35, 1.0, 0.22 * k, "bandpass", 3800, 0.5, d); drum(t, 90, 45, 0.25, 0.45 * k, d); },
    slap(pos, k = 1) { if (!ctx) return; const t = now(), d = at(pos, 0.15, 3); noise(t, 0.08, 0.5 * k, "lowpass", 1400, 0.8, d); drum(t, 130, 60, 0.08, 0.4 * k, d); },
    sizzle(pos, k = 1) { if (!ctx) return; const t = now(), d = at(pos, 0.15, 2.5), s = ctx.createBufferSource(); s.buffer = buf(1.8, (tt) => (Math.random() < 0.08 ? (Math.random() * 2 - 1) : (Math.random() * 2 - 1) * 0.25) * Math.exp(-tt * 1.6));
      const hp = ctx.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 2400; const g = ctx.createGain(); g.gain.value = 0.35 * k; s.connect(hp); hp.connect(g); g.connect(d); s.start(t); },
    // things hit in the shootout (12j): straw, water, dirt, a tin can landing
    straw(pos, k = 1) { if (!ctx) return; const t = now(), d = at(pos, 0.2, 3); noise(t, 0.22, 0.45 * k, "bandpass", 2600, 0.6, d); noise(t + 0.01, 0.1, 0.3 * k, "lowpass", 500, 0.8, d); drum(t, 110, 55, 0.08, 0.3 * k, d); },
    splash(pos, k = 1) { if (!ctx) return; const t = now(), d = at(pos, 0.3, 4); noise(t, 0.32, 0.55 * k, "lowpass", 1700, 0.7, d); noise(t + 0.015, 0.16, 0.35 * k, "bandpass", 650, 1.2, d);
      for (let i = 0; i < 9; i++) noise(t + 0.12 + Math.random() * 0.55, 0.035, (0.06 + Math.random() * 0.08) * k, "bandpass", 1300 + Math.random() * 2600, 4, d); },
    dirt(pos, k = 1) { if (!ctx) return; const t = now(), d = at(pos, 0.2, 3); noise(t, 0.035, 0.35 * k, "highpass", 2600, 0.7, d); noise(t, 0.16, 0.55 * k, "lowpass", 900, 0.8, d); drum(t, 120, 50, 0.09, 0.35 * k, d);
      for (let i = 0; i < 5; i++) noise(t + 0.25 + Math.random() * 0.35, 0.03, 0.05 * k, "bandpass", 1800 + Math.random() * 1500, 2, d); },
    tinTick(pos, k = 1) { if (!ctx) return; const t = now(), d = at(pos, 0.15, 3); noise(t, 0.02, 0.25 * k, "highpass", 3000, 0.8, d);
      modes(t, [[1850 + Math.random() * 300, 0.14, 0.09], [3100 + Math.random() * 400, 0.09, 0.06], [4700, 0.05, 0.04]], d, k); },
    // a brass bell: the strike, then the hum, prime, tierce, quint and nominal ringing on, each at its own rate
    bell(pos, k = 1) { if (!ctx || k <= 0.01) return; const t = now(), d = at(pos, 0.55, 7), f = 392;
      noise(t, 0.045, 0.6 * k, "bandpass", 3400, 1.3, d); noise(t, 0.02, 0.4 * k, "highpass", 5200, 0.8, d);
      modes(t, [[f * 0.5, 0.2 * k, 5.5], [f, 0.32 * k, 3.6], [f * 1.183, 0.17 * k, 2.6], [f * 1.506, 0.11 * k, 2.1], [f * 2.0, 0.24 * k, 2.4], [f * 2.514, 0.08 * k, 1.5], [f * 3.011, 0.06 * k, 1.2], [f * 4.166, 0.035 * k, 0.8]], d); },
    // one hoof of a galloping horse: the rider's own (pos null: close, dry, felt as much as heard) or a pursuer's out on the plain
    gallop(pos, k = 1) { if (!ctx) return; const t = now(), d = at(pos, pos ? 0.18 : 0.05, 5);
      noise(t, 0.09, 0.42 * k, "lowpass", 420, 0.9, d); drum(t, 120, 48, 0.12, 0.38 * k, d); noise(t + 0.004, 0.03, 0.1 * k, "bandpass", 1500, 1.2, d); },
    // a lasso going round: a swish that rises and falls with each turn of the loop
    swish(pos, k = 1, dur = 0.34) { if (!ctx) return; const t = now(), d = at(pos, 0.12, 4), s = ctx.createBufferSource(); s.buffer = NOISE;
      const f = ctx.createBiquadFilter(); f.type = "bandpass"; f.Q.value = 2.2; f.frequency.setValueAtTime(700, t); f.frequency.exponentialRampToValueAtTime(2300, t + dur * 0.55); f.frequency.exponentialRampToValueAtTime(900, t + dur);
      const v = ctx.createGain(); v.gain.setValueAtTime(0.0001, t); v.gain.linearRampToValueAtTime(0.32 * k, t + dur * 0.5); v.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      s.connect(f); f.connect(v); v.connect(d); s.start(t, Math.random() * 1.5); s.stop(t + dur + 0.05); },
    // wind rushing past at a gallop (a loop, its level set every frame; 0 stops it)
    rush(k) { if (!ctx) return; if (!api._rush) { const s = ctx.createBufferSource(); s.buffer = NOISE; s.loop = true; const f = ctx.createBiquadFilter(); f.type = "bandpass"; f.frequency.value = 520; f.Q.value = 0.5;
        const g = ctx.createGain(); g.gain.value = 0; s.connect(f); f.connect(g); g.connect(sfx); s.start(); api._rush = { s, f, g }; }
      const R0 = api._rush; R0.g.gain.setTargetAtTime(Math.max(0, k) * 0.16, now(), 0.15); R0.f.frequency.setTargetAtTime(380 + k * 380, now(), 0.3); },
    // a recorded sound that moves (a man falling away from you): returns a handle to move it each frame and to stop it. Through the same
    // output as everything else, so mute and the volume slider apply
    track(nm, gain = 1, ref = 4, wet = 0.3) { const h = { p: null, src: null, g: null, done: false, last: null,
        set(pos) { h.last = pos.clone ? pos.clone() : pos; const p = h.p; if (!p) return; if (p.positionX) { p.positionX.value = pos.x; p.positionY.value = pos.y; p.positionZ.value = pos.z; } else p.setPosition(pos.x, pos.y, pos.z); },
        level(k) { if (h.g && ctx) h.g.gain.setTargetAtTime(gain * k, now(), 0.12); }, // (a scream that fades as he drops away)
        stop(f = 0.3) { h.done = true; if (h.g && ctx) h.g.gain.setTargetAtTime(0.0001, now(), f / 3); if (h.src) { try { h.src.stop(now() + f + 0.1); } catch (e) {} } } };
      if (!ctx) return h;
      clipBuffer(nm).then(b => { if (!b || !ctx || h.done) return; const s = ctx.createBufferSource(); s.buffer = b; const g = ctx.createGain(); g.gain.value = gain;
        const p = ctx.createPanner(); p.panningModel = HRTF ? "HRTF" : "equalpower"; p.distanceModel = "inverse"; p.refDistance = ref; p.rolloffFactor = 1.15; p.maxDistance = 2000;
        s.connect(g); g.connect(p); p.connect(sfx); const w = ctx.createGain(); w.gain.value = wet; g.connect(w); w.connect(verbFar); s.start(); h.src = s; h.g = g; h.p = p; if (h.last) h.set(h.last); });
      return h; },
    hoof(pos) { if (!ctx) return; const t = now(), d = at(pos, 0.25, 4); for (let k = 0; k < 2; k++) { const tt = t + k * 0.11; noise(tt, 0.07, 0.4, "lowpass", 520, 1, d); modes(tt, [[255, 0.12, 0.08], [690, 0.06, 0.05]], d); } },
    horseSnort(pos) { if (!ctx) return; const t = now(), d = at(pos, 0.3, 4), s = ctx.createBufferSource(); s.buffer = NOISE; const f = ctx.createBiquadFilter(); f.type = "bandpass"; f.frequency.value = 850; f.Q.value = 0.9;
      const v = ctx.createGain(), fl = ctx.createOscillator(), fg = ctx.createGain(); fl.frequency.value = 32; fg.gain.value = 0.25; fl.connect(fg); fg.connect(v.gain);
      v.gain.setValueAtTime(0, t); v.gain.linearRampToValueAtTime(0.5, t + 0.05); v.gain.exponentialRampToValueAtTime(0.001, t + 0.6); s.connect(f); f.connect(v); v.connect(d); s.start(t, Math.random()); fl.start(t); s.stop(t + 0.65); fl.stop(t + 0.65); },
    rustle(pos, k) { if (!ctx) return; const t = now(), d = at(pos, 0.1, 2.5); const b = buf(0.18, () => Math.random() < 0.02 ? (Math.random() * 2 - 1) : 0), s = ctx.createBufferSource(); s.buffer = b;
      const f = ctx.createBiquadFilter(); f.type = "bandpass"; f.frequency.value = 3800; f.Q.value = 0.7; const v = ctx.createGain(); v.gain.value = 0.9 * k; s.connect(f); f.connect(v); v.connect(d); s.start(t); },
    click() { if (!ctx) return; noise(now(), 0.025, 0.18, "bandpass", 2200, 2, sfx); },
    // a dead weight being shoved or caught: a muffled body blow, no ring
    thud(pos, k = 1) { if (!ctx) return; const t = now(), d = at(pos, 0.2, 3); noise(t, 0.1, 0.55 * k, "lowpass", 360, 0.8, d); drum(t, 92, 44, 0.17, 0.5 * k, d); noise(t + 0.005, 0.04, 0.12 * k, "bandpass", 1300, 0.9, d); },
    knock(pos, k = 1) { if (!ctx) return; const t = now(), d = at(pos, 0.4, 4); noise(t, 0.12, 0.5 * k, "lowpass", 520, 0.8, d); modes(t, [[95, 0.5 * k, 0.22], [160, 0.3 * k, 0.14], [270, 0.15 * k, 0.08]], d); },
    // a wrong letter: a dull knuckle-on-wood knock, nothing metallic
    hammer() { if (!ctx) return; const t = now(); noise(t, 0.07, 0.4, "lowpass", 800, 0.7, sfx); modes(t, [[175, 0.3, 0.1], [390, 0.12, 0.06]], sfx); noise(t + 0.11, 0.06, 0.25, "lowpass", 800, 0.7, sfx); modes(t + 0.11, [[180, 0.2, 0.08]], sfx); },
    // ---- the host's voice ----
    preloadVoices,
    speak(id, pos, delay = 0) {
      if (!ctx) return; const tok = ++voice.token; if (voice.src) { try { voice.src.stop(); } catch (e) {} voice.src = null; }
      voiceBuffer(id).then(b => {
        if (!b || tok !== voice.token || !ctx) return; const t = now() + delay, s = ctx.createBufferSource(); s.buffer = b;
        const g = ctx.createGain(); g.gain.value = 1; s.connect(g); g.connect(voice.an);
        // mostly dry and centred so every word reads; a little panning and street reverb place him in the scene
        const p = pos && ctx.createStereoPanner ? ctx.createStereoPanner() : null;
        if (p) { p.pan.value = clamp(pos.pan || 0, -0.45, 0.45); g.connect(p); p.connect(voiceBus); } else g.connect(voiceBus);
        if (pos) { const w = ctx.createGain(); w.gain.value = 0.16; g.connect(w); w.connect(verbIn); }
        const dg = duckG.gain; dg.cancelScheduledValues(t); dg.setValueAtTime(dg.value, t); dg.setTargetAtTime(0.32, t, 0.06); dg.setTargetAtTime(1, t + b.duration + 0.1, 0.35);
        voice.until = t + b.duration; s.start(t); voice.src = s; s.onended = () => { if (voice.src === s) voice.src = null; };
      });
    },
    // the speech envelope (0..1) for head and bandana movement
    get talk() { if (!ctx || !voice.src) { voice.env *= 0.85; return voice.env; } voice.an.getFloatTimeDomainData(voice.data); let s = 0; for (let i = 0; i < voice.data.length; i++) s += voice.data[i] * voice.data[i];
      const r = Math.min(1, Math.sqrt(s / voice.data.length) * 5); voice.env += (r - voice.env) * (r > voice.env ? 0.6 : 0.25); return voice.env; },
    setMuted(m) { muted = m; if (ctx) master.gain.setTargetAtTime(m ? 0 : volume, now(), 0.05); if (silentEl) { if (m) silentEl.pause(); else silentEl.play().catch(() => {}); } },
    pauseAll() { if (silentEl) silentEl.pause(); suspend(); },
    wake() { resume(); if (silentEl && !muted && silentEl.paused) silentEl.play().catch(() => {}); },
    setVolume(v) { volume = v; if (ctx && !muted) master.gain.setTargetAtTime(v, now(), 0.05); },
    get muted() { return muted; }, get masterGain() { return master ? master.gain.value : null; }, /* (what everything, music, voices and effects, finally goes out through) */ get playing() { return playing; }, get ready() { return !!ctx; }, get songReady() { return !!song.buf; }, get songPlaying() { return !!song.src; }
  };
  return api;
})();
