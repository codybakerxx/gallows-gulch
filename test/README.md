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
| `mk_s131.py` | v29, the bell and the getaway at desktop size (1280 × 720), keyboard and mouse (the run as of v31): an early bell hit spends a bullet and marks the round without starting anything; the win on the last bullet starts the getaway, once; a new round clears the mark; rung and then lost, no getaway; the cleared street stays live and three bell hits start one getaway. The run: no pad, the view the whole page; a lane per key press (held or repeated, still one; the trail's edge stops it); ↑, Space and W jump; no scrolling; riding into a tall thing costs ground but not the chase; a low thing jumped clean; the course ridden by the autopilot to the turn. The turn never reverses or allows damage. The fight: mouse aim and click, no R key, the automatic reload, the reticle on the shot through swerves, the horse clear of everything, a lasso landing, a windup shot through. The end: the shots of the fall in order (slow leap, down, the long view), letterboxed, focus on the leap, the canyon in the sun's shadow, the scream through the master output, completion, results; retry, captured in the run and in the fight, the skip, back to the hangman |
| `mk_s132.py` | The getaway on a phone (390 × 844) with touch (the run as of v31): nothing on screen in the run and the view the whole screen; a swipe left or right changes one lane, the horse sidestepping; a long swipe is still one lane; a tap or a wobble does nothing; a swipe up jumps; no scrolling; Reduce motion cuts the bob; the fight: the Aim pad drags the aim while another finger holds Fire, a drag on the view aims, no Reload button, the gun reloads itself, two speedloaders; the cliff with the sound muted (the scream still plays through the master output) |
| `mk_s133.py` | v30, the gun and the hearts (run at 390 × 844 and 1280 × 720; v31 gives the getaway two reloads): five hearts, six rounds and one automatic reload in the shootout, the top bar fitting, firing blocked while it reloads, running dry and being finished off with five shots; the getaway's bar the same, with two speedloaders, in the run and the fight; every rider in the fight on screen; running dry in the getaway and being caught |
| `mk_s134.py` | v32, the run can always be ridden clean (v34: flat out the whole way, and `freeRows` must be 0: no row can be ridden through without a swipe or a jump): 300 courses from the game's own generator (seed by seed) searched frame by frame for a way through with no hit, as the game has it, with a horse 12 cm wider either side and 40 cm longer at each end, with lane changes and jumps only every 0.1 s, with both, and with both every 0.15 s; also the most of each obstacle a course has out at once against the pool the game keeps. Uses `course_solver.js`. Slow: about half an hour |
| `course_solver.js` | Used by `mk_s134.py`: `__courses(seeds, opt)` lays each course with the game's own row code (recording what it places) and runs a breadth-first search over (lane from, lane to, how far through the change, how far through the jump) frame by frame at 60 fps |
| `chase_helpers.js` | Shared by `mk_s131.py`, `mk_s132.py`, `mk_s133.py` and `screens.py`: the clock stepper, setting up a shootout, shooting the bell, the last gunman, the run's autopilot (reads the next row, takes an open lane, jumps what it has to), aiming at a rider through the drift, touch and key events |
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
