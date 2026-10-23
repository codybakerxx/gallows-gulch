# Gallows Gulch

**A Wild West hangman game in 3D, made for phones.** Spell the word before the stranger swings. If he does, grab the
sword off the gallows, cut him down and shoot your way out of town.

It runs in the browser on three.js, with no install and no framework. It's built for a phone held upright, and plays
on a desktop too.

<p align="center">
  <img src="docs/screenshots/00-wide.png" alt="A round in progress on a wide screen: the dusty main street at sunset, the gallows, the host and the letter keyboard" width="100%">
</p>

<table>
  <tr>
    <td align="center" width="33%"><img src="docs/screenshots/01-title.png" alt="The WANTED poster menu: word length, difficulty, sound, graphics, Ride Out and the Word Book" width="100%"><br><sub>The menu</sub></td>
    <td align="center" width="33%"><img src="docs/screenshots/02-round.png" alt="A round under way: letters on the board, wrong guesses on the revolver, the host talking" width="100%"><br><sub>A round under way</sub></td>
    <td align="center" width="33%"><img src="docs/screenshots/03-solved.png" alt="YOU SAVED HIM sign showing the word, its part of speech and meaning, and New in your Word Book" width="100%"><br><sub>Solved, with what the word means</sub></td>
  </tr>
  <tr>
    <td align="center"><img src="docs/screenshots/04-sword.png" alt="The stranger hanging, a sword glinting in the ground beside him" width="100%"><br><sub>He swings, and the sword glints</sub></td>
    <td align="center"><img src="docs/screenshots/05-shootout.png" alt="The shootout from behind cover: aiming at a gunman, hearts and bullets at the top" width="100%"><br><sub>The shootout</sub></td>
    <td align="center"><img src="docs/screenshots/06-game-over.png" alt="GAME OVER sign with the word and its meaning, and a Try Again button" width="100%"><br><sub>Game over</sub></td>
  </tr>
  <tr>
    <td align="center"><img src="docs/screenshots/07-word-book.png" alt="The Word Book: every word played, its meaning, and whether it was solved or missed" width="100%"><br><sub>The Word Book</sub></td>
    <td></td>
    <td></td>
  </tr>
</table>

## How it plays

**The round.** A stranger stands condemned at the gallows, and the host calls your letters to the crowd. Each wrong
letter costs a bullet from the revolver at the top left and walks the man a step closer to the noose. Solve the word
and he goes free. On your last chance a clue appears at the top (except on Outlaw).

**Settings** (the WANTED poster menu):

| Word length | Letters |   | Difficulty | Misses | Words |
|---|---|---|---|---|---|
| Short | 4–5 | | Greenhorn | 10 | Familiar everyday words, a clue on your last chance |
| Medium | 6–7 | | Gunhand | 7 | Sharper vocabulary, a clue on your last chance |
| Long | 8+ | | Outlaw | 5 | Rare, high-level vocabulary, no hints |
| Any | 4–12 | | | | |

**When he hangs.** A sword glints, stuck in the ground under the gallows. Tap it within 4 seconds, or even after the GAME OVER sign comes
up, to cut him down and fight for the round.

**The shootout.** Now you're the stranger, behind cover, and seven gunmen are out for you.
- You have **9 bullets and no reloads**, and **3 hearts**. Hearts you lose show as empty outlines.
- **Hold Aim** to rise up and drag to aim. **Fire** shoots. **Tap a piece of cover** to run to it.
  On a keyboard, hold **Shift** or **A** to rise and press **Space** or **Enter** to fire.
- While you're down behind cover, nobody can hit you. Once you're up, a gunman takes **0.3 s** to fire, and his
  hammer cocks just before he does.
- They taunt you now and then. They hide behind their own cover too: a trough, a crate stack and barrels.
- Run out of bullets with gunmen still standing and they know your gun is empty. They finish you off.
- Down all seven and the host lets you go.

**The Word Book.** Every finished word goes in your book with its part of speech, its meaning, and whether you
solved or missed it. Open it from the menu, then search it or sort it by newest or A–Z. It's saved in your browser.
When the game runs as a claude.ai artifact it's also saved to your account, so it follows you between devices.

The menu's big button reads **Ride Out** the first time you open it, **Restart** during a game, and **Try Again**
or **Play Again** after one ends.

## Features

- A whole frontier town at golden hour: false-front buildings, a church spire, mesas, a working gallows with a
  simulated rope, trapdoor and lever, dust, tumbleweed, circling vultures and a horse that sometimes bolts down the
  street.
- Townsfolk built from one motion-captured body and a 3D head scan. Clothes, hats, hair and faces are fitted in
  code, and the bodies turn into ragdolls when they fall.
- A spoken host: 41 recorded lines, with matching subtitles, that react to every letter. Plus gunmen's taunts and
  positional sound effects.
- A looping soundtrack that brightens as the noose gets closer. Footsteps, wind and a crowd murmur are synthesized
  live.
- 382 vocabulary words, each with a definition written for the game.
- Graphics tiers (Low, Medium, High, or Auto) for older and newer phones. High adds the most bloom, soft shadows,
  ambient occlusion, light shafts and skin shading.
- Built for touch, with safe-area insets for notched phones, sound that plays even with an iPhone's ring/silent
  switch on (there's a mute button), and keyboard play on desktop.

## Run it

You need Python 3 and nothing else.

```sh
python3 build.py                        # writes dist/ (about a second)
python3 -m http.server 8000             # serve the repo
# open http://localhost:8000/dist/
```

The page must be served over HTTP. Opening `dist/index.html` straight from disk won't load the models and sounds.
three.js r147 and the fonts come from CDNs, so the first load needs internet.

### Put it online with GitHub Pages

The workflow in `.github/workflows/pages.yml` builds the game and publishes `dist/` on every push to `main`. To turn
it on, go to **Settings → Pages → Build and deployment → Source** and choose **GitHub Actions**, then push or re-run
the workflow. Until Pages is on, the workflow only builds and checks the game. On a free GitHub plan, Pages needs a
public repository.

## Project layout

```
build.py                 builds dist/ from src/ and assets/ (standard library only)
src/                     the game: one HTML shell and 22 JavaScript modules, loaded in the order build.py lists
  00_head.html           page markup and all CSS: HUD, keyboard, menu poster, end sign, Word Book
  01_util.js             helpers, seeded noise
  02_textures.js         procedural material textures and sprites
  03_audio.js            Web Audio: soundtrack, voice, 3D sound effects, synthesized ambience
  04_render.js           renderer, graphics tiers, post-processing, shaders
  05_sky.js              physically based sky and sun
  06_world.js            desert terrain, mesas, rocks, cacti, scrub and the frontier town
  07_props.js            the gallows (trapdoor, lever, rope and noose), the word board, set dressing
  07b_physics.js         wind, the rope simulation, the swinging trapdoor leaves and lanterns
  08a_bodygeo.js         clothing built around the mocap skeleton
  08b_chars.js           character assembly: rig, clothes, scanned head, hats, hood, mask
  08c_headdata.js        baked occlusion data for the head scan
  09_anim.js             walking, mocap blending, look-at, IK, the hanging body
  09b_ragdoll.js         ragdolls
  10_life.js             horse, vultures, tumbleweed, dust, townsfolk
  11_words.js            the word bank with clues, and the host's lines
  11b_defs.js            a plain-English meaning for every word
  12a_director.js        game state, camera, cutscenes
  12b_game.js            rounds: guessing, winning, losing, the end sign
  12b2_play.js           grabbing the hanged man
  12d_siege.js           the sword, the cut-down and the shootout
  12e_book.js            the Word Book
  12c_boot.js            loading, menu, input, main loop
assets/
  models/                Xbot.glb, LeePerrySmith.glb, Horse.glb, Stork.glb
  textures/              the head scan's colour, normal and specular maps
  audio/                 soundtrack.mp3, silence.mp3, voice/ (41 host lines), sfx/ (41 effects and taunts)
vendor/three-r147/       the nine three.js r147 files the game uses, for offline tests (MIT)
tools/
  check_build.py         checks the bundled script parses and every file the code asks for is in dist/
  asset_report.py        measures every asset and writes ASSETS.md
test/                    browser test harness (Playwright): see test/README.md
docs/screenshots/        the pictures above
```

More detail:
- [ASSETS.md](ASSETS.md) lists every model, texture and sound with its size, pixels, length, sample rate and bit
  rate, and what each voice line says.
- [CREDITS.md](CREDITS.md) says where each asset came from and its licence.
- [CHANGELOG.md](CHANGELOG.md) has the version history.

## Development

- Edit `src/`, then run `python3 build.py`. `python3 tools/check_build.py` checks the result (it needs Node.js).
- `test/game.html`, written by the build, loads each module separately with three.js from `vendor/`. This makes errors
  point at the right file.
- The test harness drives the game in headless Chromium with software WebGL and can play whole rounds faster than
  real time. See [test/README.md](test/README.md).
- Change an asset, then run `python3 tools/asset_report.py` (needs Pillow and FFmpeg) to refresh ASSETS.md.
- `python3 build.py --fragment` writes the page without its `<!doctype>`/`<head>` skeleton, for a host that adds its
  own, such as claude.ai artifacts.

## Credits

Built with [three.js](https://threejs.org). Head scan: Lee Perry-Smith by Infinite-Realities (CC BY 3.0).
Motion capture: Mixamo. Voices and sound effects: ElevenLabs. Music: "Eagle's Caw", made with Suno.
Fonts: Sancreek, Zilla Slab and Permanent Marker, from Google Fonts. Full details and licences are in
[CREDITS.md](CREDITS.md).

## License

No licence has been chosen for the game's own code yet, so for now all rights are reserved by the repository owner.
The third-party assets keep their own licences, listed in [CREDITS.md](CREDITS.md).
