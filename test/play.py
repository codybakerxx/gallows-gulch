"""Drive the game in headless Chromium (software WebGL) through a scripted list of steps.

    python3 test/play.py WIDTH HEIGHT script.json [maxdt] [tier]

Run from the repo root while the root is served at $GULCH_URL (default http://127.0.0.1:8765), e.g.
    python3 -m http.server 8765 --bind 127.0.0.1

script.json is a list of [action, argument] pairs:
    ["eval", js]          run JavaScript in the page and print the result
    ["wait", ms]          let real time pass
    ["waitfor", js]       wait until the expression is true
    ["shot", file.png]    save a screenshot of the viewport
    ["click", selector]   click an element
    ["press", js]         move the mouse to the [x, y] the expression returns and hold the button down
    ["moveto", js]        move the held mouse to the [x, y, steps] the expression returns
    ["release", ""]       let the button go
    ["viewport", [w, h]]  resize the page
maxdt caps the game's frame step (seconds), tier forces a graphics tier (low, medium, high). Set DPR for a higher
device pixel ratio. The scenario builders in test/scenarios write these scripts.

Offline (no Google Fonts), set GULCH_FONT_DIR to a folder holding Sancreek-Regular.ttf, ZillaSlab-Medium.ttf,
ZillaSlab-Bold.ttf and PermanentMarker-Regular.ttf (from github.com/google/fonts) and the page gets those instead.
"""
import asyncio
import base64
import json
import os
import sys
import time

from playwright.async_api import async_playwright

BASE = os.environ.get("GULCH_URL", "http://127.0.0.1:8765").rstrip("/")
FONTS = [("Sancreek", 400, "Sancreek-Regular.ttf"), ("Zilla Slab", 500, "ZillaSlab-Medium.ttf"),
         ("Zilla Slab", 700, "ZillaSlab-Bold.ttf"), ("Permanent Marker", 400, "PermanentMarker-Regular.ttf")]
CHROME_ARGS = ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist",
               "--autoplay-policy=no-user-gesture-required"]


async def main():
    W, H = int(sys.argv[1]), int(sys.argv[2])
    with open(sys.argv[3]) as f:
        steps = json.load(f)
    maxdt = sys.argv[4] if len(sys.argv) > 4 else "0.05"
    tier = sys.argv[5] if len(sys.argv) > 5 else ""
    dpr = float(os.environ.get("DPR", "1"))
    async with async_playwright() as p:
        browser = await p.chromium.launch(args=CHROME_ARGS)
        pg = await browser.new_page(viewport={"width": W, "height": H}, device_scale_factor=dpr)
        logs = []
        pg.on("console", lambda m: logs.append(m.type + ": " + m.text[:300]) if m.type in ("error", "warning") else None)
        pg.on("pageerror", lambda e: logs.append("pageerror: " + str(e)[:600]))
        font_dir = os.environ.get("GULCH_FONT_DIR")
        if font_dir:  # answer the Google Fonts requests from local files
            css = "".join(f"@font-face{{font-family:'{fam}';font-style:normal;font-weight:{wt};font-display:swap;"
                          f"src:url(https://fonts.gstatic.com/local/{fn}) format('truetype')}}" for fam, wt, fn in FONTS)
            await pg.route("https://fonts.googleapis.com/**", lambda r: r.fulfill(body=css, content_type="text/css"))
            await pg.route("https://fonts.gstatic.com/**", lambda r: r.fulfill(path=os.path.join(font_dir, r.request.url.split("/")[-1]), content_type="font/ttf"))
        await pg.goto(f"{BASE}/test/game.html?maxdt={maxdt}&tier={tier}")
        await pg.wait_for_function("document.getElementById('loading').hidden === true || /wrong|couldn/.test(document.getElementById('loadText').textContent)", timeout=240000)
        t0 = time.time()
        for act, arg in steps:
            if act == "eval":
                r = await pg.evaluate(arg)
                print("eval ->", str(r)[:4000])
            elif act == "wait":
                await pg.wait_for_timeout(int(arg))
            elif act == "waitfor":
                await pg.wait_for_function(arg, timeout=300000)
            elif act == "shot":
                cdp = await pg.context.new_cdp_session(pg)
                d = await cdp.send("Page.captureScreenshot", {"format": "png", "clip": {"x": 0, "y": 0, "width": W, "height": H, "scale": dpr}})
                os.makedirs(os.path.dirname(arg) or ".", exist_ok=True)
                with open(arg, "wb") as out:
                    out.write(base64.b64decode(d["data"]))
                print("shot", arg, round(time.time() - t0, 1))
            elif act == "click":
                await pg.click(arg)
            elif act == "press":
                x, y = await pg.evaluate(arg)
                await pg.mouse.move(x, y)
                await pg.mouse.down()
                print("press", round(x), round(y))
            elif act == "moveto":
                x, y, n = await pg.evaluate(arg)
                await pg.mouse.move(x, y, steps=int(n))
                print("move", round(x), round(y))
            elif act == "release":
                await pg.mouse.up()
            elif act == "viewport":
                W, H = int(arg[0]), int(arg[1])
                await pg.set_viewport_size({"width": W, "height": H})
                print("viewport", W, H)
        for line in logs[:15]:
            print(line)
        await browser.close()

asyncio.run(main())
