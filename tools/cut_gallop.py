#!/usr/bin/env python3
"""Cut the repository owner's galloping recording into a bank of single hoof hits for the getaway (assets/audio/sfx/gallop.mp3).

    python3 tools/cut_gallop.py recording.m4a assets/audio/sfx/gallop.mp3     (needs ffmpeg, numpy and scipy)

The recording (62 s, a 22 s take played nearly three times over) is declipped, made mono and high-passed at 32 Hz. Each hoof hit is
found by its rise out of the floor; the clean ones (nothing from the last hit still ringing under them, at least 90 ms to the next) are
cut, rung out to 34 dB down and faded. The 24 strongest, at least 0.25 s apart in the take, are evened out to one loudness and strung
together with 0.3 s of silence after each: the game finds them from those gaps (03_audio.js, gallopHits) and plays one per hoof beat.
"""
import numpy as np, scipy.io.wavfile as w, scipy.signal as ss, scipy.interpolate as si, sys, subprocess, tempfile, os
SRC, OUT = sys.argv[1], sys.argv[2]
tmp = tempfile.mkdtemp(); subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", SRC, "-ac", "2", "-ar", "44100", os.path.join(tmp, "src.wav")], check=True)
sr, x = w.read(os.path.join(tmp, "src.wav")); x = x.astype(np.float64) / 32768
def declip(c):
    a = np.abs(c) >= 0.998; d = np.diff(np.r_[0, a.astype(int), 0]); st = np.where(d == 1)[0]; en = np.where(d == -1)[0]; c = c.copy()
    for s, e in zip(st, en):
        k = 6; L = max(0, s - k); R = min(len(c), e + k); idx = np.r_[np.arange(L, s), np.arange(e, R)]
        if len(idx) < 4: continue
        c[s:e] = si.CubicSpline(idx, c[idx])(np.arange(s, e))
    return c
x = np.stack([declip(x[:, 0]), declip(x[:, 1])], 1)
m = x.mean(1)
m = ss.sosfiltfilt(ss.butter(2, 32, "highpass", fs=sr, output="sos"), m)
hop = int(sr * 0.002); n = len(m) // hop
env = np.abs(m[:n * hop]).reshape(n, hop).max(1); db = 20 * np.log10(env + 1e-9)
sm = np.convolve(db, np.ones(5) / 5, "same")
pk, _ = ss.find_peaks(sm, height=-26, distance=int(0.05 / 0.002), prominence=9)
starts = []
for p in pk:  # back from the peak to where it rose out of the floor
    j = p
    while j > 0 and sm[j - 1] > sm[p] - 26 and p - j < 15: j -= 1
    starts.append(j)
starts = np.array(sorted(set(starts)))
hits = []
for i, s in enumerate(starts):
    t0 = s * hop - int(sr * 0.003); nxt = starts[i + 1] * hop - int(sr * 0.004) if i + 1 < len(starts) else len(m)
    if t0 < sr * 0.5 or t0 > sr * 22.4: continue  # (the recording is a 22 s take played nearly three times over: the first only)
    avail = (nxt - t0) / sr
    if avail < 0.09: continue
    L = int(sr * min(avail, 0.24)); seg = m[t0:t0 + L].copy()
    pre = m[max(0, t0 - int(sr * 0.03)):t0]; pk_ = np.abs(seg).max()
    preR = 20 * np.log10((np.sqrt((pre ** 2).mean()) + 1e-9) / pk_)
    if preR > -22: continue  # (the last hit still ringing under it)
    # the tail: let it ring out to where it's 30 dB down, then fade
    e2 = np.abs(seg); cut = len(seg)
    lvl = 20 * np.log10(np.convolve(e2, np.ones(220) / 220, "same") / pk_ + 1e-9)
    after = np.where(lvl[int(sr * 0.04):] < -34)[0]
    if len(after): cut = min(cut, int(sr * 0.04) + after[0] + int(sr * 0.02))
    seg = seg[:cut]
    if len(seg) < sr * 0.06: continue
    fo = min(len(seg) // 3, int(sr * 0.04)); seg[-fo:] *= np.cos(np.linspace(0, np.pi / 2, fo)) ** 2
    seg[:44] *= np.linspace(0, 1, 44)
    f, P = ss.welch(seg, sr, nperseg=min(1024, len(seg)))
    low = 10 * np.log10(P[(f > 40) & (f < 250)].sum() / P[(f > 250) & (f < 4000)].sum())
    cen = (f * P).sum() / P.sum()
    hits.append(dict(t=t0 / sr, len=len(seg) / sr, peak=20 * np.log10(pk_), pre=preR, low=low, cen=cen, seg=seg))
print("candidates", len(hits))
hits.sort(key=lambda h: -h["peak"])
# the strongest clean ones, spread through the recording (no two within 0.6 s)
pick = []
for h in hits:
    if h["peak"] < -20: break
    if all(abs(h["t"] - q["t"]) > 0.25 for q in pick): pick.append(h)
    if len(pick) >= 24: break
pick.sort(key=lambda h: h["t"])
for h in pick: print(f'{h["t"]:6.2f}s len {h["len"]*1000:4.0f}ms peak {h["peak"]:5.1f} pre {h["pre"]:5.1f} low/high {h["low"]:5.1f} cen {h["cen"]:5.0f}')
# even them out: each to the same loudness over its first 50 ms (the game sets each beat's weight)
out = []; gap = np.zeros(int(sr * 0.3))
for h in pick:
    s = h["seg"]; r = np.sqrt((s[:int(sr * 0.05)] ** 2).mean()); out += [s * (0.1 / r), gap]
y = np.concatenate([gap] + out); y *= 0.89 / np.abs(y).max()
w.write(os.path.join(tmp, "gallop.wav"), sr, (y * 32767).astype(np.int16))
subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", os.path.join(tmp, "gallop.wav"), "-ac", "1", "-c:a", "libmp3lame", "-b:a", "128k", OUT], check=True)
print("bank", round(len(y) / sr, 2), "s")
