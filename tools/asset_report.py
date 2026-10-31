#!/usr/bin/env python3
"""Measure every asset in the repo and write ASSETS.md.

    python3 tools/asset_report.py

Images: pixel size, colour mode, bytes (needs Pillow: pip install pillow).
Audio:  duration, sample rate, channels, bit rate, bytes (needs ffprobe, from FFmpeg).
Models: meshes, vertices, triangles, skeleton, morph targets, animations and their lengths, embedded textures, bytes
        (read straight from the .glb with the standard library).
What each sound says or is comes from the game's own tables (src/11_words.js, src/12d_siege.js), so the report stays in
step with the code.
"""
import io
import json
import os
import re
import struct
import subprocess

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
A = lambda *p: os.path.join(ROOT, "assets", *p)


def read(rel):
    with open(os.path.join(ROOT, rel), encoding="utf-8") as f:
        return f.read()


def kb(n):
    return f"{n / 1024:,.1f} KB" if n < 1024 * 1024 else f"{n / 1048576:,.2f} MB"


def rel(p):
    return os.path.relpath(p, ROOT).replace(os.sep, "/")


# ---------------- models ----------------
COMP = {5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4}


def glb(path):
    with open(path, "rb") as f:
        data = f.read()
    magic, version, length = struct.unpack_from("<4sII", data, 0)
    assert magic == b"glTF", path
    off, js, binc = 12, None, b""
    while off < length:
        clen, ctype = struct.unpack_from("<II", data, off)
        chunk = data[off + 8: off + 8 + clen]
        if ctype == 0x4E4F534A:
            js = json.loads(chunk)
        elif ctype == 0x004E4942:
            binc = chunk
        off += 8 + clen
    acc = js.get("accessors", [])
    verts = tris = morph = 0
    lo, hi = [1e9] * 3, [-1e9] * 3
    quant = False  # (a quantized mesh, KHR_mesh_quantization: its integer positions are measured through the scale and offset of its node)
    deq = {n["mesh"]: (n.get("scale", [1, 1, 1]), n.get("translation", [0, 0, 0])) for n in js.get("nodes", []) if "mesh" in n}
    for mi, m in enumerate(js.get("meshes", [])):
        for pr in m["primitives"]:
            pa = acc[pr["attributes"]["POSITION"]]
            verts += pa["count"]
            if "min" in pa:
                pmin, pmax = pa["min"], pa["max"]
                if pa.get("componentType", 5126) != 5126 and mi in deq:
                    quant = True; sc, tr = deq[mi]
                    pmin = [a * k + t for a, k, t in zip(pmin, sc, tr)]; pmax = [a * k + t for a, k, t in zip(pmax, sc, tr)]
                lo = [min(a, b) for a, b in zip(lo, pmin)]
                hi = [max(a, b) for a, b in zip(hi, pmax)]
            if pr.get("mode", 4) == 4:
                tris += (acc[pr["indices"]]["count"] if "indices" in pr else pa["count"]) // 3
            morph = max(morph, len(pr.get("targets", [])))
    anims = []
    for a in js.get("animations", []):
        dur = max((acc[s["input"]].get("max", [0])[0] for s in a["samplers"]), default=0)
        anims.append((a.get("name") or "(unnamed)", dur, len(a["channels"])))
    images = []
    for im in js.get("images", []):
        if "bufferView" in im:
            bv = js["bufferViews"][im["bufferView"]]
            raw = binc[bv.get("byteOffset", 0): bv.get("byteOffset", 0) + bv["byteLength"]]
            try:
                w, h = Image.open(io.BytesIO(raw)).size
                images.append(f"{w}×{h} {im.get('mimeType', '').split('/')[-1]}")
            except Exception:
                images.append(im.get("mimeType", "image"))
    joints = max((len(s["joints"]) for s in js.get("skins", [])), default=0)
    return dict(bytes=os.path.getsize(path), meshes=len(js.get("meshes", [])),
                prims=sum(len(m["primitives"]) for m in js.get("meshes", [])), verts=verts, tris=tris,
                nodes=len(js.get("nodes", [])), joints=joints, morph=morph, anims=anims, mats=len(js.get("materials", [])),
                images=images, size=[h - l for l, h in zip(lo, hi)] if verts else None, quant=quant, gen=js.get("asset", {}).get("generator", ""))


# ---------------- audio ----------------
def probe(path):
    out = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration,bit_rate:stream=sample_rate,channels,codec_name",
                          "-of", "json", path], capture_output=True, text=True, check=True).stdout
    d = json.loads(out)
    s, f = d["streams"][0], d["format"]
    return dict(dur=float(f["duration"]), sr=int(s["sample_rate"]), ch=int(s["channels"]), br=int(f.get("bit_rate", 0)), codec=s["codec_name"],
                bytes=os.path.getsize(path))


def chan(n):
    return {1: "mono", 2: "stereo"}.get(n, f"{n} ch")


# the game's own tables: what each recorded line says
def voice_texts():
    words = read("src/11_words.js")
    quips = re.search(r"const QUIPS = \{(.*?)\n\};", words, re.S).group(1)
    out = {}
    for kind, lines in re.findall(r"(\w+): \[(.*?)\]", quips, re.S):
        for i, t in enumerate(re.findall(r'"((?:[^"\\]|\\.)*)"', lines)):
            out[f"{kind}{i}"] = t
    siege = dict(re.findall(r'(\w+): "((?:[^"\\]|\\.)*)"', re.search(r"const SIEGE_LINES = \{(.*?)\};", words, re.S).group(1)))
    for key, clip in re.findall(r"SIEGE_LINES\.(\w+)\] = \[\"(siege\d)\"", words):
        out[clip] = siege[key]
        SIEGE_WHEN[clip] = SIEGE_WHEN.get(key, "the shootout")
    m = re.search(r'const MYSTERY_LINE = "((?:[^"\\]|\\.)*)"; VOICE_LINES\[MYSTERY_LINE\] = \["(\w+)"', words)
    if m: out[m.group(2)] = m.group(1)
    m = re.search(r'const REVOLVER_LINE = "((?:[^"\\]|\\.)*)"; VOICE_LINES\[REVOLVER_LINE\] = \["(\w+)"', read("src/12p_look.js"))
    if m: out[m.group(2)] = m.group(1); SIEGE_WHEN[m.group(2)] = "the shootout started from the revolver on the barrel, after a won round (cut from the end of siege0)"
    return out


def taunt_texts():
    src = read("src/12d_siege.js")
    block = re.search(r"const TAUNTS = \{(.*?)\};", src, re.S).group(1)
    who = {"man": "a townsman", "exec": "the executioner"}
    return {clip: (text, who[w]) for clip, text, w in re.findall(r'\["(taunt\d)", "((?:[^"\\]|\\.)*)", "(\w+)"', block)}


SIEGE_WHEN = {"start": "the rope is cut and the shootout starts", "lose": "the gunmen shoot you down"}
VOICE_KIND = {"intro": "a round starts", "hit": "a right letter", "miss": "a wrong letter", "hint": "one guess left (points you to the hint)",
              "lose": "the man hangs", "win": "the word is solved", "siege": "the shootout", "mystery": "the first round after the game loads, before the intro"}
SFX = {
    "shot": "Your revolver firing, close up",
    "far": "A gunman's shot from across the street",
    "wood": "A bullet striking wood (your cover, the gallows)",
    "whiz": "A bullet passing close by your head",
    "painm": "A gunman crying out when your shot lands",
    "painf": "A woman crying out when your shot lands",
    "hurt": "You, hit (a grunt as a heart goes)",
    "cough": "The cut-down man gasping and coughing for air",
    "sword": "The sword pulled from the ground",
    "cut": "The rope cut through",
    "dry": "Empty revolver: the hammer falls on nothing",
    "cock": "A gunman cocking his hammer: your cue to duck",
    "flap": "A crow's wings as it takes off (pitched to the bird)",
    "glass": "A bottle shot to pieces in the shootout (also the gallows lanterns)",
    "pane": "A shop window shot through",
    "tin": "A tin can hit and sent flying",
    "ric": "A bullet whining off iron",
    "keg": "A bullet into a barrel (or the trough's side) and the water spouting out",
    "horse": "The town horse (or a posse horse) crying out as it's shot and goes down",
    "smash": "Something wooden shot to pieces: a crate, barrel, bench, the coffin, the trough",
}
SFX_ONE = { # the getaway (hidden): one line each
    "shout0": "The getaway: a posse rider coming down the street, “There he is! Get him, boys!”",
    "shout1": "The getaway: a posse rider as you ride off, “Don’t let him get away!”",
    "shout2": "The getaway: a posse rider when your horse hits something, “Ha! We got him now!”",
    "shout3": "The getaway: a posse rider at the halfway shot, “Shoot him off that damn horse!”",
    "shout4": "The getaway: the last rider, coming alongside, “Just you and me now, you son of a bitch.”",
    "shout5": "The getaway: a posse rider when the first of them falls, “Aw, hell! He shot Earl!”",
    "scream0": "The getaway: his scream as he goes over the cliff (it falls away with him)",
    "canyon0": "The getaway: horse and rider hitting the canyon floor, far below",
    "neck0": "The neck breaking as the rope catches him (the repository owner's own recording)",
    "crows": "The crows: the repository owner's two recordings of crows, cleaned and cut into 20 single caws (17 short, 3 long) with silence between, strung into calls by the game",
}

MODEL_ABOUT = {
    "Xbot.glb": "Every person in town: the host, the executioner, the hanged man, the crowd and the gunmen. One rigged body, "
                "dressed and re-proportioned in code; its motion-capture clips drive walking, idling and reactions.",
    "LeePerrySmith.glb": "The scanned head every face is made from: skinned onto the body, given eyes, hair and hats in code, with the three textures below.",
    "Horse.glb": "The loose horse that now and then bolts down the street, and in the getaway your horse and the posse's five (coats painted and tinted in code; galloping by its morph targets).",
    "Stork.glb": "The vultures circling over the gulch (re-coloured in code; flapping by its morph targets).",
    "ARC09.glb": "The ARC-09 laser gun on the crate at your middle cover in the town shootout, and in your hand once you take it up "
                 "(the repository owner's model, packed by tools/pack_arc09.py; its meshes merged into one in code).",
}
TEX_ABOUT = {
    "Map-COL.jpg": "Skin colour map for the head scan",
    "Infinite-Level_02_Tangent_SmoothUV.jpg": "Tangent-space normal map for the head scan",
    "skin-spec.jpg": "Skin specular map, a 512 px greyscale version of the scan's Map-SPEC.jpg",
}


def main():
    L = []
    w = L.append
    w("# Assets")
    w("")
    w("Every file the game loads, with its measurements. This page is generated: run `python3 tools/asset_report.py` after changing an asset.")
    w("Where each one came from, and its licence, is in [CREDITS.md](CREDITS.md).")
    w("")
    total = {}

    # models
    w("## 3D models (`assets/models/`)")
    w("")
    w("glTF 2.0 binary. The build writes each one to `dist/models/<name>.glb.txt` as base64 text.")
    w("")
    w("| File | Bytes | Meshes (primitives) | Vertices | Triangles | Skeleton | Morph targets | Animations | Embedded textures |")
    w("|---|---:|---:|---:|---:|---:|---:|---:|---|")
    models = sorted(f for f in os.listdir(A("models")) if f.endswith(".glb"))
    infos = {}
    for m in models:
        g = infos[m] = glb(A("models", m))
        total["models"] = total.get("models", 0) + g["bytes"]
        w(f"| `{m}` | {kb(g['bytes'])} | {g['meshes']} ({g['prims']}) | {g['verts']:,} | {g['tris']:,} | "
          f"{(str(g['joints']) + ' joints') if g['joints'] else '–'} | {g['morph'] or '–'} | {len(g['anims']) or '–'} | {', '.join(g['images']) or '–'} |")
    w("")
    for m in models:
        g = infos[m]
        w(f"**`{m}`** — {MODEL_ABOUT.get(m, '')}")
        if g["size"]:
            w(f"Mesh extent (model units, {'quantized positions through their nodes\' scale and offset' if g.get('quant') else 'before node transforms'}): {g['size'][0]:.3g} × {g['size'][1]:.3g} × {g['size'][2]:.3g}. "
              f"{g['nodes']} nodes, {g['mats']} material{'s' if g['mats'] != 1 else ''}.")
        if g["anims"]:
            w("")
            w("| Animation | Length | Channels |")
            w("|---|---:|---:|")
            for name, dur, ch in g["anims"]:
                w(f"| {name} | {dur:.2f} s | {ch} |")
        w("")

    # textures
    w("## Textures (`assets/textures/`)")
    w("")
    w("Copied into `dist/models/` by the build.")
    w("")
    w("| File | Pixels | Mode | Bytes | Use |")
    w("|---|---:|---|---:|---|")
    for t in sorted(os.listdir(A("textures"))):
        im = Image.open(A("textures", t))
        b = os.path.getsize(A("textures", t))
        total["textures"] = total.get("textures", 0) + b
        w(f"| `{t}` | {im.size[0]}×{im.size[1]} | {im.mode} | {kb(b)} | {TEX_ABOUT.get(t, '')} |")
    w("")

    # music
    w("## Music (`assets/audio/`)")
    w("")
    w("| File | Length | Sample rate | Channels | Bit rate | Bytes | Use |")
    w("|---|---:|---:|---|---:|---:|---|")
    music_use = {"soundtrack.mp3": "The soundtrack, “Eagle's Caw”. Plays looped from 1.0 s to 167.1 s, and brightens as the man gets closer to the rope.",
                 "silence.mp3": "One second of silence, looped on an audio element so iPhones play the game's sound with the ring/silent switch on."}
    for f in ("soundtrack.mp3", "silence.mp3"):
        a = probe(A("audio", f))
        total["audio"] = total.get("audio", 0) + a["bytes"]
        w(f"| `{f}` | {a['dur']:.2f} s | {a['sr']:,} Hz | {chan(a['ch'])} | {a['br'] // 1000} kb/s | {kb(a['bytes'])} | {music_use[f]} |")
    w("")

    # voice
    texts = voice_texts()
    w("## Voice lines (`assets/audio/voice/`)")
    w("")
    w("The host, who runs the hanging and calls every letter. The subtitle shown on screen is the same text.")
    w("")
    w("| File | Length | Sample rate | Channels | Bit rate | Bytes | When | Line |")
    w("|---|---:|---:|---|---:|---:|---|---|")
    vfiles = sorted(os.listdir(A("audio", "voice")), key=lambda s: (re.match(r"[a-z]+", s).group(0), int(re.search(r"\d+", s).group(0)) if re.search(r"\d+", s) else 0))
    for f in vfiles:
        a = probe(A("audio", "voice", f))
        total["audio"] += a["bytes"]
        k = f[:-4]
        kind = re.match(r"[a-z]+", k).group(0)
        w(f"| `{f}` | {a['dur']:.2f} s | {a['sr']:,} Hz | {chan(a['ch'])} | {a['br'] // 1000} kb/s | {kb(a['bytes'])} | {SIEGE_WHEN.get(k) or VOICE_KIND.get(kind, '')} | “{texts.get(k, '')}” |")
    w("")

    # sfx
    taunts = taunt_texts()
    w("## Sound effects (`assets/audio/sfx/`)")
    w("")
    w("Short, trimmed and level-matched mono clips, placed in 3D around the listener when they play.")
    w("")
    w("| File | Length | Sample rate | Channels | Bit rate | Bytes | What it is |")
    w("|---|---:|---:|---|---:|---:|---|")
    sfiles = sorted(os.listdir(A("audio", "sfx")), key=lambda s: (re.match(r"[a-z]+", s).group(0), int(re.search(r"\d+", s).group(0)) if re.search(r"\d+", s) else 0))
    for f in sfiles:
        a = probe(A("audio", "sfx", f))
        total["audio"] += a["bytes"]
        k = f[:-4]
        kind = re.match(r"[a-z]+", k).group(0)
        what = f"Taunt, said by {taunts[k][1]}: “{taunts[k][0]}”" if k in taunts else SFX_ONE.get(k) or SFX.get(kind, "")
        w(f"| `{f}` | {a['dur']:.2f} s | {a['sr']:,} Hz | {chan(a['ch'])} | {a['br'] // 1000} kb/s | {kb(a['bytes'])} | {what} |")
    w("")

    # code-made
    w("## Made by the code at load time")
    w("")
    w("Most of the world has no asset file: it is generated when the page loads, sized to the graphics tier "
      "(Low / Medium / High, picked from the device or set in the menu).")
    w("")
    w("| What | Size | Where |")
    w("|---|---|---|")
    w("| Material sets for ground, wood, fabric, leather, felt, rope and rock (colour, normal and roughness maps) | 512×512 on Medium and High, 256×256 on Low; fabric, leather and rock at half that (not below 128); felt 128×128; rope 64×256 | `src/02_textures.js` |")
    w("| Sprites: grass 256×256, sagebrush 256×256, dust 64×64, bunting 256×64, shop window 128×160 | fixed | `src/02_textures.js` |")
    w("| Sky, sun and clouds | shader | `src/05_sky.js` |")
    w("| Town, gallows, props and cover | geometry | `src/06_world.js`, `src/07_props.js`, `src/12d_siege.js` |")
    w("| Clothes, hats, hair and faces fitted to the base body | geometry | `src/08a_bodygeo.js`, `src/08b_chars.js`, `src/08c_headdata.js` |")
    w("| Footsteps, crowd murmur, wind, and a fallback score if the soundtrack can't load | Web Audio synthesis | `src/03_audio.js` |")
    w("| Word list (382 words) and their definitions | text | `src/11_words.js`, `src/11b_defs.js` |")
    w("")

    # screenshots
    shots_dir = os.path.join(ROOT, "docs", "screenshots")
    if os.path.isdir(shots_dir) and os.listdir(shots_dir):
        w("## Screenshots (`docs/screenshots/`)")
        w("")
        w("| File | Pixels | Bytes |")
        w("|---|---:|---:|")
        for f in sorted(os.listdir(shots_dir)):
            if f.lower().endswith(".png"):
                im = Image.open(os.path.join(shots_dir, f))
                w(f"| `{f}` | {im.size[0]}×{im.size[1]} | {kb(os.path.getsize(os.path.join(shots_dir, f)))} |")
        w("")

    w("## Totals")
    w("")
    nfiles = len(models) + len(os.listdir(A("textures"))) + 2 + len(vfiles) + len(sfiles)
    w(f"{nfiles} asset files: models {kb(total['models'])}, textures {kb(total['textures'])}, audio {kb(total['audio'])} "
      f"(together {kb(sum(total.values()))}).")
    w("")
    with open(os.path.join(ROOT, "ASSETS.md"), "w", encoding="utf-8") as f:
        f.write("\n".join(L))
    print("wrote ASSETS.md:", nfiles, "assets")


if __name__ == "__main__":
    main()
