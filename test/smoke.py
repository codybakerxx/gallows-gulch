"""Smoke test of the built game (dist/index.html), the way a phone would load it.

    python3 build.py
    python3 -m http.server 8765 --bind 127.0.0.1 &
    python3 test/smoke.py [tier]

Loads dist/ in headless Chromium at phone size (390x844), with the three.js CDN requests answered from vendor/three-r147
so it runs offline, then taps Ride Out, waits for the first round to deal and checks that every model, texture and sound
loaded, the soundtrack decoded and the page logged no errors. Exits non-zero on a failure.
"""
import asyncio
import os
import sys

from playwright.async_api import async_playwright

BASE = os.environ.get("GULCH_URL", "http://127.0.0.1:8765").rstrip("/")
CDN = "https://cdn.jsdelivr.net/npm/three@0.147.0/"
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CHROME_ARGS = ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist",
               "--autoplay-policy=no-user-gesture-required"]


async def main():
    tier = sys.argv[1] if len(sys.argv) > 1 else "medium"
    async with async_playwright() as p:
        browser = await p.chromium.launch(args=CHROME_ARGS)
        pg = await browser.new_page(viewport={"width": 390, "height": 844})
        errors, failed, loaded = [], [], []
        pg.on("console", lambda m: errors.append(m.text[:300]) if m.type == "error" and "fonts.g" not in m.text and "ERR_TUNNEL" not in m.text else None)
        pg.on("pageerror", lambda e: errors.append("pageerror: " + str(e)[:300]))
        pg.on("response", lambda r: (loaded if r.ok else failed).append((r.status, r.url.split("/dist/")[-1])) if "/dist/" in r.url else None)

        async def from_vendor(route):
            name = route.request.url[len(CDN):].split("/")[-1]
            await route.fulfill(path=os.path.join(ROOT, "vendor", "three-r147", name), content_type="application/javascript")
        await pg.route(CDN + "**", from_vendor)

        await pg.goto(f"{BASE}/dist/index.html?tier={tier}")
        await pg.wait_for_function("document.getElementById('loading').hidden === true || /wrong|couldn/.test(document.getElementById('loadText').textContent)", timeout=240000)
        status = await pg.evaluate("document.getElementById('loadText').textContent")
        start = await pg.evaluate("document.getElementById('startBtn').textContent")
        await pg.click("#startBtn")
        await pg.wait_for_function("document.getElementById('kb').classList.contains('up')", timeout=240000)
        await pg.wait_for_function("Sound.songReady", timeout=60000)
        await pg.wait_for_timeout(3000)
        state = await pg.evaluate("({ tier: R.tier, word: STATE.word.length, songReady: Sound.songReady, book: typeof BOOK })")
        await browser.close()

    print("loader:", status, "| menu button:", start)
    print("state:", state)
    print(len(loaded), "files loaded from dist/")
    ok = not failed and not errors and state["songReady"] and start == "Ride Out" and state["word"] > 0
    for f in failed:
        print("FAILED", f)
    for e in errors:
        print("ERROR", e)
    print("PASS" if ok else "FAIL")
    sys.exit(0 if ok else 1)

asyncio.run(main())
