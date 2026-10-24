# Tests

The game is tested by driving it in headless Chromium with software WebGL (SwiftShader), so it runs on a machine with no
GPU. These tests aren't unit tests: they play the game. A scenario script starts rounds, guesses letters, hangs the
man, takes the sword, fights and checks what happened at each step, taking screenshots along the way.

## Setup

```sh
pip install playwright && python3 -m playwright install chromium
python3 build.py                                   # also writes test/game.html
python3 -m http.server 8765 --bind 127.0.0.1       # from the repo root, in another terminal
```

## Smoke test

```sh
python3 test/smoke.py [low|medium|high]
```

This loads the built `dist/` page at phone size with three.js answered from `vendor/`. It taps **Ride Out**, waits
for the first round and fails if any model, texture or sound didn't load, the soundtrack didn't decode, or the page
logged an error.

## Scenario runs

```sh
python3 test/scenarios/mk_s129.py                  # writes test/s129.json
python3 test/play.py 390 844 test/s129.json 0.05 medium
```

`play.py` loads `test/game.html`, which runs each module from `src/` separately so errors name the right file. It then
runs the steps in the JSON: `eval`, `wait`, `waitfor`, `shot`, `click`, `press`, `moveto`, `release` and `viewport`.
The scenarios define `__go(frames, until)`, which steps the game's clock frame by frame without drawing, so a whole
round plays in seconds and only the screenshots are rendered.

| Builder | Checks |
|---|---|
| `mk_s116.py` | How soon after you come up from cover a gunman's bullet can hit you |
| `mk_s117.py` | Three hearts; after the cut the hanged man is you; the win seen through his eyes; the reset; a death |
| `mk_s120.py` | v19: hiding is safe, the bullet number is gone from the top bar, who says which taunt and the gaps between them |
| `mk_s121.py` | A whole fight played the way a person plays it, logging every taunt: spacing, no repeats |
| `mk_s123.py` | Where the gunmen's cover sits: overlaps with the scenery, room to run, how much of each man shows from each of your covers |
| `mk_s124.py` | v20: definitions on the end sign; the Word Book (count, list, search, order, saving, account sync against a stand-in); the shootout's numbers |
| `mk_s125.py` | v21: no reloading, hearts visibly lost, "Out of bullets" |
| `mk_s126.py` | The menu button reads Ride Out, Restart, Try Again, Play Again |
| `mk_s127.py` | v24: nine bullets |
| `mk_s128.py` | The thicker sword, its sheen and sparks; tapping it after GAME OVER; the streak given back; the Word Book entry made once |
| `mk_s129.py` | GAME OVER four seconds after he hangs; the sword still works after |
| `mk_s130.py` | v28: the rooftop gunmen (footing, standing and ducked against the false front, what each cover can see), the red arc for a man aiming from outside the view, and how a man shot off a roof falls (`mk_s130.py PREFIX over,drape`) |
| `mk_s131.py` | v29, the bell and the getaway at desktop size (1280 × 720), keyboard and mouse: an early bell hit spends a bullet and marks the round without starting anything; the win on the last bullet starts the getaway, once; a new round clears the mark; rung then lost, no getaway; a win without the bell leaves the street live, and ringing it then starts one getaway however often it's hit; keys steer and the page doesn't scroll; one collision costs ground but not the chase; the course ridden clean; the turn (travel never reverses, no attacks, no damage); mouse aim, click, R; the reticle against the shot through swerves; the horse's line past everything; a lasso that lands, a windup shot through; the cliff once, the scream, completion, the results; retry and its clean-up; caught in the ride and in the fight; the skip; back to the hangman |
| `mk_s132.py` | v29, the getaway on a phone (390 × 844) with touch: the Left / Right pads and a swipe steer; no scrolling; a drag aims while another finger holds Fire; Reload; Reduce motion (camera bob with it off and on, and the reticle still drifting); the scream played with the sound off goes through the muted output |
| `chase_helpers.js` | Shared by `mk_s131.py` and `mk_s132.py`: the clock stepper, setting up a shootout, shooting the bell, the last gunman, the riding autopilot, aiming at a rider through the drift, touch and key events |
| `screens.py` | The README screenshots |

Some builders check numbers from an older version, such as reaction times or the bullet count, so read a builder's
header comment before relying on what it prints. Screenshots and the generated `s*.json` files are git-ignored.

To regenerate the README screenshots:

```sh
python3 test/scenarios/screens.py
DPR=2 python3 test/play.py 390 844 test/screens_phone.json 0.05 high
DPR=1.5 python3 test/play.py 1280 720 test/screens_wide.json 0.05 high
DPR=2 python3 test/play.py 390 844 test/screens_getaway.json 0.05 high
```

Without internet access the Google Fonts won't load, and the screenshots fall back to system fonts. To avoid that,
point `GULCH_FONT_DIR` at a folder holding the four font files from [google/fonts](https://github.com/google/fonts):
`Sancreek-Regular.ttf`, `ZillaSlab-Medium.ttf`, `ZillaSlab-Bold.ttf` and `PermanentMarker-Regular.ttf`.
