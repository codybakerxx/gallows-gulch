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
    startAmbience(); decodeSong(); setTimeout(() => { for (const id of voice.fetches.keys()) voiceBuffer(id); for (const nm of clips.fetches.keys()) clipBuffer(nm); }, 400); return true;
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
    if (!unlocked) { const b = ctx.createBuffer(1, 1, 22050), s0 = ctx.createBufferSource(); s0.buffer = b; s0.connect(ctx.destination); s0.start(0); unlocked = true; }
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
  function setListener(cam) {
    if (!ctx) return; const L = ctx.listener, p = cam.position, f = _v4.set(0, 0, -1).applyQuaternion(cam.quaternion), u = _v3.set(0, 1, 0).applyQuaternion(cam.quaternion);
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
    // the neck breaking as the rope catches him: one hard, dry crack, the rope's jerk and the weight of him all in the same instant, and nothing after
    neckSnap(neck, knot) { if (!ctx) return; const t = now(); noise(t, 0.045, 1.0, "highpass", 1900, 0.7, at(knot, 0.05)); drum(t, 100, 45, 0.11, 0.75, at(neck, 0.04, 3)); api.crack(neck, 2.6, 0.05); },
    preloadClips,
    clip(nm, pos, gain = 1, delay = 0, wet = 0.22, rate = 1, ref = 3) { if (!ctx) return; clipBuffer(nm).then(b => { if (!b || !ctx) return; const t = now() + delay, s = ctx.createBufferSource(); s.buffer = b;
      s.playbackRate.value = rate; const g = ctx.createGain(); g.gain.value = gain; s.connect(g); g.connect(at(pos, wet, ref)); s.start(t); }); },
    // a faint ring off polished steel, to catch the eye (and ear) when the sword glints
    glint(pos) { if (!ctx) return; const t = now(), d = at(pos, 0.35, 4); modes(t, [[3150, 0.05, 0.9], [4720, 0.035, 0.7], [6280, 0.02, 0.5]], d); },
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
    caw(pos) { if (!ctx) return; const d = at(pos, 0.4, 12), n = 2 + (Math.random() * 2 | 0);
      for (let k = 0; k < n; k++) { const t = now() + k * 0.42, o = ctx.createOscillator(), am = ctx.createOscillator(), ag = ctx.createGain(), v = ctx.createGain(); o.type = "sawtooth"; o.frequency.setValueAtTime(560, t); o.frequency.linearRampToValueAtTime(390, t + 0.3);
        am.type = "square"; am.frequency.value = 58; ag.gain.value = 0.35; am.connect(ag); ag.connect(v.gain); v.gain.setValueAtTime(0, t); v.gain.linearRampToValueAtTime(0.45, t + 0.03); v.gain.linearRampToValueAtTime(0, t + 0.32);
        const b1 = ctx.createBiquadFilter(); b1.type = "bandpass"; b1.frequency.value = 1350; b1.Q.value = 3; const b2 = ctx.createBiquadFilter(); b2.type = "bandpass"; b2.frequency.value = 2600; b2.Q.value = 4;
        o.connect(b1); o.connect(b2); b1.connect(v); b2.connect(v); v.connect(d); o.start(t); am.start(t); o.stop(t + 0.35); am.stop(t + 0.35); } },
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
    get muted() { return muted; }, get playing() { return playing; }, get ready() { return !!ctx; }, get songReady() { return !!song.buf; }, get songPlaying() { return !!song.src; }
  };
  return api;
})();
