#!/usr/bin/env python3
"""Build Gallows Gulch.

    python3 build.py              a standalone page (any web server, GitHub Pages)
    python3 build.py --fragment   the page without its <!doctype>/<head> skeleton, for a host that adds its own
                                  (the claude.ai artifact the game was first published as)

Writes
  dist/index.html   the game in one page: src/00_head.html, then every module in ORDER inlined into one script.
                    three.js r147 comes from the jsDelivr CDN.
  dist/models/      each model in assets/models as base64 text (<name>.glb.txt), plus the textures in assets/textures.
  dist/audio/       the music, voice lines and sound effects in assets/audio, copied as they are.
  test/game.html    the same game unbundled for the test harness: one <script> per module, three.js from vendor/.

Only the Python 3 standard library is needed. Serve the repo root (or dist/) over HTTP to play; opening the file
straight from disk will not load the models and sounds.
"""
import base64
import os
import shutil
import sys

ROOT = os.path.dirname(os.path.abspath(__file__))

# the modules, in load order (later ones use what earlier ones define)
ORDER = ["01_util.js", "02_textures.js", "03_audio.js", "04_render.js", "05_sky.js", "06_world.js", "07_props.js",
         "07b_physics.js", "08a_bodygeo.js", "08b_chars.js", "08c_headdata.js", "09_anim.js", "09b_ragdoll.js",
         "10_life.js", "11_words.js", "11b_defs.js", "12a_director.js", "12b_game.js", "12b2_play.js", "12d_siege.js",
         "12e_book.js", "12f_bell.js", "12g_chase.js", "12c_boot.js"]

# three.js r147 files, in load order: their path on the CDN
VENDOR = {
    "three.min.js": "build/three.min.js",
    "GLTFLoader.js": "examples/js/loaders/GLTFLoader.js",
    "SkeletonUtils.js": "examples/js/utils/SkeletonUtils.js",
    "CopyShader.js": "examples/js/shaders/CopyShader.js",
    "LuminosityHighPassShader.js": "examples/js/shaders/LuminosityHighPassShader.js",
    "EffectComposer.js": "examples/js/postprocessing/EffectComposer.js",
    "RenderPass.js": "examples/js/postprocessing/RenderPass.js",
    "ShaderPass.js": "examples/js/postprocessing/ShaderPass.js",
    "UnrealBloomPass.js": "examples/js/postprocessing/UnrealBloomPass.js",
}
CDN = "https://cdn.jsdelivr.net/npm/three@0.147.0/"

# the document skeleton around the page (the same one the artifact host puts around it)
SKELETON = ('<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'
            '<style>:root{color-scheme:light}body{margin:0}[hidden]{display:none!important}</style></head><body>', "</body></html>")


def path(*parts):
    return os.path.join(ROOT, *parts)


def read(rel):
    with open(path(rel), encoding="utf-8") as f:
        return f.read()


def build(fragment=False):
    head = read("src/00_head.html")
    js = "\n".join(read("src/" + f) for f in ORDER)

    dist = path("dist")
    shutil.rmtree(dist, ignore_errors=True)
    os.makedirs(path("dist", "models"))

    with open(path("dist", "index.html"), "w", encoding="utf-8") as f:
        if not fragment:
            f.write(SKELETON[0])
        f.write(head)
        for v in VENDOR:
            f.write(f'\n<script src="{CDN}{VENDOR[v]}"></script>')
        f.write('\n<script>window.GULCH_ASSETS = "models/"; window.GULCH_AUDIO = "audio/";</script>\n<script>\n' + js + "\n</script>\n")
        if not fragment:
            f.write(SKELETON[1])

    # the models ship as base64 text: the page they were first published on serves text files but not binary .glb
    models = sorted(f for f in os.listdir(path("assets", "models")) if f.endswith(".glb"))
    for m in models:
        with open(path("assets", "models", m), "rb") as src, open(path("dist", "models", m + ".txt"), "w") as out:
            out.write(base64.b64encode(src.read()).decode("ascii"))
    textures = sorted(f for f in os.listdir(path("assets", "textures")) if not f.startswith("."))
    for t in textures:
        shutil.copy2(path("assets", "textures", t), path("dist", "models", t))
    shutil.copytree(path("assets", "audio"), path("dist", "audio"))

    with open(path("test", "game.html"), "w", encoding="utf-8") as f:
        f.write('<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'
                '<style>*{box-sizing:border-box}html,body{margin:0}[hidden]{display:none!important}</style></head><body>')
        f.write(head)
        for v in VENDOR:
            f.write(f'\n<script src="../vendor/three-r147/{v}"></script>')
        f.write('\n<script>window.GULCH_ASSETS = "../dist/models/"; window.GULCH_AUDIO = "../dist/audio/"; '
                'window.GULCH_MAXDT = +(new URLSearchParams(location.search).get("maxdt") || 0.05);</script>')
        for s in ORDER:
            f.write(f'\n<script src="../src/{s}"></script>')
        f.write("\n</body></html>")

    sounds = sum(len(files) for _, _, files in os.walk(path("dist", "audio")))
    print(f"built dist/index.html ({os.path.getsize(path('dist', 'index.html')):,} bytes), "
          f"{len(models)} models, {len(textures)} textures, {sounds} sound files")


if __name__ == "__main__":
    build(fragment="--fragment" in sys.argv[1:])
