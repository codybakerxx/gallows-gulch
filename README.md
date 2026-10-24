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
    <td align="center"><img src="docs/screenshots/08-rooftops.png" alt="Up from cover aiming at a gunman on the general store roof, while a red arc at the left warns of the gunman on the sheriff's roof" width="100%"><br><sub>Rooftop gunmen and the red arc</sub></td>
    <td align="center"><img src="docs/screenshots/07-word-book.png" alt="The Word Book: every word played, its meaning, and whether it was solved or missed" width="100%"><br><sub>The Word Book</sub></td>
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

**The shootout.** Now you're the stranger, behind cover, and nine gunmen are out for you: seven in the street and
two on the rooftops, behind the false fronts of the sheriff's office and the general store.
- You have **11 bullets and no reloads**, and **3 hearts**. Hearts you lose show as empty outlines.
- **Hold Aim** to rise up and drag to aim. **Fire** shoots. **Tap a piece of cover** to run to it.
  On a keyboard, hold **Shift** or **A** to rise and press **Space** or **Enter** to fire.
- While you're down behind cover, nobody can hit you. Once you're up, a gunman takes **0.3 s** to fire, and his
  hammer cocks just before he does. A red chevron marks the man taking aim.
- A gunman outside your view can take aim at you too, but he takes longer about it, and a **red arc** around the
  crosshair points toward him. Duck, or turn and take him first.
- The men on the roofs stand up at the false front to shoot and duck out of sight between shots. Hit one and he
  may pitch over the edge.
- They taunt you now and then. In the street they hide behind their own cover too: a trough, a crate stack and
  barrels.
- Run out of bullets with gunmen still standing and they know your gun is empty. They finish you off.
- Down all nine and you survive. The street stays yours, gun still in hand, until you press **Done**.
- There's a bell on the gallows. It's a target like any other, and it costs a bullet like any other.

<details>
<summary><b>Spoiler: the getaway</b> (what the bell is for)</summary>

<br>

<table>
  <tr>
    <td align="center" width="33%"><img src="docs/screenshots/09-getaway-ride.png" alt="Riding out across the desert, the horse's head and ears in front, rocks and a wagon ahead, the posse's distance shown at the top" width="100%"><br><sub>The ride</sub></td>
    <td align="center" width="33%"><img src="docs/screenshots/10-getaway-fight.png" alt="Turned round in the saddle with the revolver, a lasso man spinning his rope as the posse rides up through the dust" width="100%"><br><sub>The fight</sub></td>
    <td align="center" width="33%"><img src="docs/screenshots/11-getaway-cliff.png" alt="Horse and rider in mid-air off the edge of a canyon at sunset" width="100%"><br><sub>Should've watched the road</sub></td>
  </tr>
</table>

Shoot the bell during a shootout and the round is marked. Nothing else changes: the fight goes on, and the bullet
counts. Then:
- **Win, having rung it.** "You survived" flashes up, the posse comes down the street, you get on a horse and ride.
  It doesn't matter if your gun is empty by then.
- **Win without ringing it.** The street stays live, and you can still shoot the bell (if you have a bullet left).
  Ring it then and you ride.
- **Lose, having rung it.** Nothing happens. A new shootout starts the bell over.

**First half, the ride.** The horse gallops on its own and you steer: **A / D** or **← / →**, the Left and Right
pads, or a drag on the view. Rocks, cactus, wagons and broken fences come at you in rows, closer together as you go,
and there's always a way through. Hit something and you slow down and the posse gains on you. The bar at the top
shows how close they are, and their hoofbeats get louder. Let them catch you and you're captured.

**The turn.** Halfway, a shot whistles past your shoulder. You twist round in the saddle and draw. The horse goes on
the same way, keeping to the trail, and nobody can hurt you while you turn.

**Second half, the fight.**
- Aim with the mouse or by dragging on the view, which works while another finger holds Fire. **Click** or **Fire**
  shoots, and **R** or **Reload** reloads. You have six rounds and as many reloads as you like, but you're open while
  you reload.
- The horse swerves round things on its own. Each swerve pulls your aim to one side, so watch the reticle and fire in
  the steady spells. Shots go exactly where the reticle is.
- Gunmen hang back and take aim. Lasso men ride in close and spin a loop. The last rider comes up alongside and takes
  two hits.
- A red mark shows who's about to attack, and the red arc points to anyone attacking from off the screen. Hit a man
  while he winds up and he loses the attack.
- You have three hearts. Lose them all and you're captured.

**The end.** Drop the last rider and you've won. What happens next is a short scene you can't control. You can skip
it after the first time. Then **Retry chase** (straight back in the saddle) or **Return to Hangman**.

The ride takes about 40 seconds and the fight about 20–40, depending on your shooting. Every number (speeds, row
spacing, the posse's pace, sway, attack timings, damage, reload, the ending's timing) is in `CHASE_CFG` at the top of
`src/12g_chase.js`.

</details>

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
  switch on (there's a mute button), and keyboard play on desktop. A **Reduce motion** setting cuts camera shake.
- Something hidden, for anyone who rings the bell.

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
src/                     the game: one HTML shell and 24 JavaScript modules, loaded in the order build.py lists
  00_head.html           page markup and all CSS: HUD, keyboard, menu poster, end sign, Word Book, the getaway's HUD
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
  12f_bell.js            the bell, and the cleared street after a win
  12g_chase.js           the getaway: posse, horses, the ride, the fight, the canyon, the results
  12c_boot.js            loading, menu, input, main loop
assets/
  models/                Xbot.glb, LeePerrySmith.glb, Horse.glb, Stork.glb
  textures/              the head scan's colour, normal and specular maps
  audio/                 soundtrack.mp3, silence.mp3, voice/ (41 host lines), sfx/ (49 effects, taunts and shouts)
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
