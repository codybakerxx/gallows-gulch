# Assets

Every file the game loads, with its measurements. This page is generated: run `python3 tools/asset_report.py` after changing an asset.
Where each one came from, and its licence, is in [CREDITS.md](CREDITS.md).

## 3D models (`assets/models/`)

glTF 2.0 binary. The build writes each one to `dist/models/<name>.glb.txt` as base64 text.

| File | Bytes | Meshes (primitives) | Vertices | Triangles | Skeleton | Morph targets | Animations | Embedded textures |
|---|---:|---:|---:|---:|---:|---:|---:|---|
| `Horse.glb` | 177.5 KB | 1 (1) | 796 | 984 | – | 15 | 1 | – |
| `LeePerrySmith.glb` | 395.5 KB | 1 (1) | 9,279 | 17,684 | – | – | – | – |
| `Stork.glb` | 75.1 KB | 1 (1) | 358 | 542 | – | 13 | 1 | – |
| `Xbot.glb` | 2.79 MB | 2 (2) | 28,374 | 49,112 | 67 joints | – | 7 | – |

**`Horse.glb`** — The loose horse that now and then bolts down the street, and in the getaway your horse and the posse's five (coats painted and tinted in code; galloping by its morph targets).
Mesh extent (model units, before node transforms): 61.1 × 182 × 322. 1 nodes, 1 material.

| Animation | Length | Channels |
|---|---:|---:|
| horse_A_ | 1.50 s | 1 |

**`LeePerrySmith.glb`** — The scanned head every face is made from: skinned onto the body, given eyes, hair and hats in code, with the three textures below.
Mesh extent (model units, before node transforms): 8.55 × 7.95 × 5.18. 3 nodes, 1 material.

**`Stork.glb`** — The vultures circling over the gulch (re-coloured in code; flapping by its morph targets).
Mesh extent (model units, before node transforms): 197 × 29.9 × 174. 1 nodes, 1 material.

| Animation | Length | Channels |
|---|---:|---:|
| storkFly_B_ | 1.30 s | 1 |

**`Xbot.glb`** — Every person in town: the host, the executioner, the hanged man, the crowd and the gunmen. One rigged body, dressed and re-proportioned in code; its motion-capture clips drive walking, idling and reactions.
Mesh extent (model units, before node transforms): 1.81 × 1.81 × 0.321. 70 nodes, 2 materials.

| Animation | Length | Channels |
|---|---:|---:|
| agree | 1.83 s | 201 |
| headShake | 2.57 s | 201 |
| idle | 2.50 s | 201 |
| run | 0.70 s | 201 |
| sad_pose | 0.07 s | 201 |
| sneak_pose | 0.07 s | 201 |
| walk | 0.97 s | 201 |

## Textures (`assets/textures/`)

Copied into `dist/models/` by the build.

| File | Pixels | Mode | Bytes | Use |
|---|---:|---|---:|---|
| `Infinite-Level_02_Tangent_SmoothUV.jpg` | 1024×1024 | RGB | 143.4 KB | Tangent-space normal map for the head scan |
| `Map-COL.jpg` | 1024×1024 | RGB | 144.8 KB | Skin colour map for the head scan |
| `skin-spec.jpg` | 512×512 | L | 61.8 KB | Skin specular map, a 512 px greyscale version of the scan's Map-SPEC.jpg |

## Music (`assets/audio/`)

| File | Length | Sample rate | Channels | Bit rate | Bytes | Use |
|---|---:|---:|---|---:|---:|---|
| `soundtrack.mp3` | 168.14 s | 48,000 Hz | stereo | 128 kb/s | 2.57 MB | The soundtrack, “Eagle's Caw”. Plays looped from 1.0 s to 167.1 s, and brightens as the man gets closer to the rope. |
| `silence.mp3` | 1.04 s | 44,100 Hz | mono | 33 kb/s | 4.3 KB | One second of silence, looped on an audio element so iPhones play the game's sound with the ring/silent switch on. |

## Voice lines (`assets/audio/voice/`)

The host, who runs the hanging and calls every letter. The subtitle shown on screen is the same text.

| File | Length | Sample rate | Channels | Bit rate | Bytes | When | Line |
|---|---:|---:|---|---:|---:|---|---|
| `hint0.mp3` | 3.24 s | 44,100 Hz | mono | 64 kb/s | 25.6 KB | one guess left (points you to the hint) | “Last chance. Look at the top.” |
| `hint1.mp3` | 3.74 s | 44,100 Hz | mono | 64 kb/s | 29.4 KB | one guess left (points you to the hint) | “One more miss and he swings. Read the top.” |
| `hint2.mp3` | 3.03 s | 44,100 Hz | mono | 64 kb/s | 23.9 KB | one guess left (points you to the hint) | “Fine. Look at the top.” |
| `hit0.mp3` | 2.53 s | 44,100 Hz | mono | 64 kb/s | 20.0 KB | a right letter | “Well, I'll be damned.” |
| `hit1.mp3` | 1.78 s | 44,100 Hz | mono | 65 kb/s | 14.1 KB | a right letter | “Keep talkin', partner.” |
| `hit2.mp3` | 2.85 s | 44,100 Hz | mono | 64 kb/s | 22.5 KB | a right letter | “Rope's stayin' hungry.” |
| `hit3.mp3` | 2.64 s | 44,100 Hz | mono | 64 kb/s | 20.9 KB | a right letter | “Lucky guess. Do it again.” |
| `hit4.mp3` | 2.32 s | 44,100 Hz | mono | 64 kb/s | 18.4 KB | a right letter | “Now that's sharp shootin'.” |
| `hit5.mp3` | 3.29 s | 44,100 Hz | mono | 64 kb/s | 26.0 KB | a right letter | “He might see sunrise yet.” |
| `hit6.mp3` | 2.56 s | 44,100 Hz | mono | 64 kb/s | 20.2 KB | a right letter | “Hot damn, that's one.” |
| `hit7.mp3` | 1.91 s | 44,100 Hz | mono | 65 kb/s | 15.1 KB | a right letter | “The preacher can wait.” |
| `hit8.mp3` | 2.12 s | 44,100 Hz | mono | 64 kb/s | 16.8 KB | a right letter | “The crowd don't like that.” |
| `hit9.mp3` | 1.88 s | 44,100 Hz | mono | 65 kb/s | 14.9 KB | a right letter | “That'll buy him a minute.” |
| `hit10.mp3` | 3.29 s | 44,100 Hz | mono | 64 kb/s | 26.0 KB | a right letter | “Well, look at you go.” |
| `hit11.mp3` | 1.99 s | 44,100 Hz | mono | 65 kb/s | 15.8 KB | a right letter | “Right on the money.” |
| `intro0.mp3` | 2.17 s | 44,100 Hz | mono | 64 kb/s | 17.2 KB | a round starts | “Spell it out, partner.” |
| `intro1.mp3` | 1.91 s | 44,100 Hz | mono | 65 kb/s | 15.1 KB | a round starts | “Talk fast, stranger.” |
| `intro2.mp3` | 3.84 s | 44,100 Hz | mono | 64 kb/s | 30.2 KB | a round starts | “Step right up. A man's neck rides on this.” |
| `intro3.mp3` | 2.30 s | 44,100 Hz | mono | 64 kb/s | 18.2 KB | a round starts | “Pick your letters careful now.” |
| `lose0.mp3` | 2.46 s | 44,100 Hz | mono | 64 kb/s | 19.4 KB | the man hangs | “Should've picked another letter.” |
| `lose1.mp3` | 3.79 s | 44,100 Hz | mono | 64 kb/s | 29.8 KB | the man hangs | “Folks came for a hangin'. They got one.” |
| `lose2.mp3` | 2.95 s | 44,100 Hz | mono | 64 kb/s | 23.3 KB | the man hangs | “Dig a hole out back, boys.” |
| `lose3.mp3` | 2.56 s | 44,100 Hz | mono | 64 kb/s | 20.2 KB | the man hangs | “The rope don't forgive.” |
| `miss0.mp3` | 2.12 s | 44,100 Hz | mono | 64 kb/s | 16.8 KB | a wrong letter | “That's a damn shame.” |
| `miss1.mp3` | 2.30 s | 44,100 Hz | mono | 64 kb/s | 18.2 KB | a wrong letter | “Undertaker's grinnin'.” |
| `miss2.mp3` | 2.25 s | 44,100 Hz | mono | 64 kb/s | 17.8 KB | a wrong letter | “Rope's gettin' thirsty.” |
| `miss3.mp3` | 3.08 s | 44,100 Hz | mono | 64 kb/s | 24.3 KB | a wrong letter | “Hell's bells, partner.” |
| `miss4.mp3` | 2.38 s | 44,100 Hz | mono | 64 kb/s | 18.8 KB | a wrong letter | “Somebody fetch the preacher.” |
| `miss5.mp3` | 3.19 s | 44,100 Hz | mono | 64 kb/s | 25.1 KB | a wrong letter | “He's sweatin' bullets now.” |
| `miss6.mp3` | 2.82 s | 44,100 Hz | mono | 64 kb/s | 22.3 KB | a wrong letter | “Wrong, and he knows it.” |
| `miss7.mp3` | 2.25 s | 44,100 Hz | mono | 64 kb/s | 17.8 KB | a wrong letter | “Buzzards are circlin'.” |
| `miss8.mp3` | 2.35 s | 44,100 Hz | mono | 64 kb/s | 18.6 KB | a wrong letter | “That knot's gettin' tighter.” |
| `miss9.mp3` | 2.82 s | 44,100 Hz | mono | 64 kb/s | 22.3 KB | a wrong letter | “Crowd's lovin' this.” |
| `miss10.mp3` | 2.69 s | 44,100 Hz | mono | 64 kb/s | 21.3 KB | a wrong letter | “Ooh, that'll cost him.” |
| `miss11.mp3` | 2.53 s | 44,100 Hz | mono | 64 kb/s | 20.0 KB | a wrong letter | “Not even close, stranger.” |
| `siege0.mp3` | 2.77 s | 44,100 Hz | mono | 64 kb/s | 21.9 KB | the rope is cut and the shootout starts | “He cut him down! Shoot that stranger!” |
| `siege2.mp3` | 3.21 s | 44,100 Hz | mono | 64 kb/s | 25.3 KB | the gunmen shoot you down | “Should've minded your own business, stranger.” |
| `win0.mp3` | 3.55 s | 44,100 Hz | mono | 64 kb/s | 28.0 KB | the word is solved | “Go on, git. Before I change my mind.” |
| `win1.mp3` | 3.87 s | 44,100 Hz | mono | 64 kb/s | 30.5 KB | the word is solved | “Ride on, you lucky son of a gun.” |
| `win2.mp3` | 3.24 s | 44,100 Hz | mono | 64 kb/s | 25.6 KB | the word is solved | “Rope goes home empty tonight.” |
| `win3.mp3` | 2.25 s | 44,100 Hz | mono | 64 kb/s | 17.8 KB | the word is solved | “Buy that stranger a whiskey!” |

## Sound effects (`assets/audio/sfx/`)

Short, trimmed and level-matched mono clips, placed in 3D around the listener when they play.

| File | Length | Sample rate | Channels | Bit rate | Bytes | What it is |
|---|---:|---:|---|---:|---:|---|
| `canyon0.mp3` | 2.04 s | 44,100 Hz | mono | 58 kb/s | 14.7 KB | The getaway: horse and rider hitting the canyon floor, far below |
| `cock0.mp3` | 0.18 s | 44,100 Hz | mono | 111 kb/s | 2.5 KB | A gunman cocking his hammer: your cue to duck |
| `cock1.mp3` | 0.29 s | 44,100 Hz | mono | 105 kb/s | 3.7 KB | A gunman cocking his hammer: your cue to duck |
| `cough0.mp3` | 0.89 s | 44,100 Hz | mono | 66 kb/s | 7.2 KB | The cut-down man gasping and coughing for air |
| `cough1.mp3` | 0.42 s | 44,100 Hz | mono | 68 kb/s | 3.5 KB | The cut-down man gasping and coughing for air |
| `cut0.mp3` | 0.42 s | 44,100 Hz | mono | 102 kb/s | 5.2 KB | The rope cut through |
| `dry0.mp3` | 0.29 s | 44,100 Hz | mono | 105 kb/s | 3.7 KB | Empty revolver: the hammer falls on nothing |
| `far0.mp3` | 0.99 s | 44,100 Hz | mono | 98 kb/s | 12.0 KB | A gunman's shot from across the street |
| `far1.mp3` | 0.97 s | 44,100 Hz | mono | 98 kb/s | 11.7 KB | A gunman's shot from across the street |
| `far2.mp3` | 1.02 s | 44,100 Hz | mono | 98 kb/s | 12.3 KB | A gunman's shot from across the street |
| `far3.mp3` | 0.86 s | 44,100 Hz | mono | 99 kb/s | 10.5 KB | A gunman's shot from across the street |
| `hurt0.mp3` | 0.37 s | 44,100 Hz | mono | 69 kb/s | 3.1 KB | You, hit (a grunt as a heart goes) |
| `hurt1.mp3` | 0.47 s | 44,100 Hz | mono | 68 kb/s | 3.9 KB | You, hit (a grunt as a heart goes) |
| `hurt2.mp3` | 0.39 s | 44,100 Hz | mono | 69 kb/s | 3.3 KB | You, hit (a grunt as a heart goes) |
| `painf0.mp3` | 0.99 s | 44,100 Hz | mono | 66 kb/s | 8.0 KB | A woman crying out when your shot lands |
| `painf1.mp3` | 0.94 s | 44,100 Hz | mono | 66 kb/s | 7.6 KB | A woman crying out when your shot lands |
| `painf2.mp3` | 2.04 s | 44,100 Hz | mono | 64 kb/s | 16.2 KB | A woman crying out when your shot lands |
| `painm0.mp3` | 0.50 s | 44,100 Hz | mono | 68 kb/s | 4.1 KB | A gunman crying out when your shot lands |
| `painm1.mp3` | 1.52 s | 44,100 Hz | mono | 65 kb/s | 12.1 KB | A gunman crying out when your shot lands |
| `painm2.mp3` | 0.68 s | 44,100 Hz | mono | 66 kb/s | 5.6 KB | A gunman crying out when your shot lands |
| `painm3.mp3` | 1.59 s | 44,100 Hz | mono | 65 kb/s | 12.7 KB | A gunman crying out when your shot lands |
| `painm4.mp3` | 1.88 s | 44,100 Hz | mono | 65 kb/s | 14.9 KB | A gunman crying out when your shot lands |
| `painm5.mp3` | 1.72 s | 44,100 Hz | mono | 65 kb/s | 13.7 KB | A gunman crying out when your shot lands |
| `painm6.mp3` | 0.94 s | 44,100 Hz | mono | 66 kb/s | 7.6 KB | A gunman crying out when your shot lands |
| `scream0.mp3` | 4.55 s | 44,100 Hz | mono | 66 kb/s | 36.8 KB | The getaway: his scream as he goes over the cliff (it falls away with him) |
| `shot0.mp3` | 1.85 s | 44,100 Hz | mono | 97 kb/s | 22.1 KB | Your revolver firing, close up |
| `shot1.mp3` | 1.72 s | 44,100 Hz | mono | 97 kb/s | 20.6 KB | Your revolver firing, close up |
| `shot2.mp3` | 1.88 s | 44,100 Hz | mono | 97 kb/s | 22.4 KB | Your revolver firing, close up |
| `shout0.mp3` | 2.30 s | 44,100 Hz | mono | 57 kb/s | 16.0 KB | The getaway: a posse rider coming down the street, “There he is! Get him, boys!” |
| `shout1.mp3` | 1.41 s | 44,100 Hz | mono | 62 kb/s | 10.7 KB | The getaway: a posse rider as you ride off, “Don’t let him get away!” |
| `shout2.mp3` | 2.09 s | 44,100 Hz | mono | 55 kb/s | 14.1 KB | The getaway: a posse rider when your horse hits something, “Ha! We got him now!” |
| `shout3.mp3` | 2.27 s | 44,100 Hz | mono | 58 kb/s | 16.2 KB | The getaway: a posse rider at the halfway shot, “Shoot him off that damn horse!” |
| `shout4.mp3` | 3.60 s | 44,100 Hz | mono | 66 kb/s | 29.5 KB | The getaway: the last rider, coming alongside, “Just you and me now, you son of a bitch.” |
| `shout5.mp3` | 2.87 s | 44,100 Hz | mono | 58 kb/s | 20.6 KB | The getaway: a posse rider when the first of them falls, “Aw, hell! He shot Earl!” |
| `sword0.mp3` | 0.76 s | 44,100 Hz | mono | 99 kb/s | 9.2 KB | The sword pulled from the ground |
| `taunt0.mp3` | 1.07 s | 44,100 Hz | mono | 65 kb/s | 8.6 KB | Taunt, said by a townsman: “Take this!” |
| `taunt1.mp3` | 1.83 s | 44,100 Hz | mono | 65 kb/s | 14.5 KB | Taunt, said by a townsman: “Thought you could get away, huh?” |
| `taunt2.mp3` | 1.52 s | 44,100 Hz | mono | 65 kb/s | 12.1 KB | Taunt, said by a townsman: “Come on out and fight!” |
| `taunt3.mp3` | 1.80 s | 44,100 Hz | mono | 65 kb/s | 14.3 KB | Taunt, said by a townsman: “Just you and me now!” |
| `taunt4.mp3` | 1.46 s | 44,100 Hz | mono | 65 kb/s | 11.7 KB | Taunt, said by a townsman: “Any last words?” |
| `taunt5.mp3` | 1.85 s | 44,100 Hz | mono | 65 kb/s | 14.7 KB | Taunt, said by the executioner: “Your time has come, kid!” |
| `taunt6.mp3` | 1.38 s | 44,100 Hz | mono | 65 kb/s | 11.1 KB | Taunt, said by the executioner: “Any last words?” |
| `whiz0.mp3` | 0.76 s | 44,100 Hz | mono | 99 kb/s | 9.2 KB | A bullet passing close by your head |
| `whiz1.mp3` | 0.47 s | 44,100 Hz | mono | 102 kb/s | 5.9 KB | A bullet passing close by your head |
| `whiz2.mp3` | 0.84 s | 44,100 Hz | mono | 99 kb/s | 10.1 KB | A bullet passing close by your head |
| `wood0.mp3` | 0.50 s | 44,100 Hz | mono | 101 kb/s | 6.2 KB | A bullet striking wood (your cover, the gallows) |
| `wood1.mp3` | 0.37 s | 44,100 Hz | mono | 103 kb/s | 4.6 KB | A bullet striking wood (your cover, the gallows) |
| `wood2.mp3` | 0.76 s | 44,100 Hz | mono | 99 kb/s | 9.2 KB | A bullet striking wood (your cover, the gallows) |
| `wood3.mp3` | 0.50 s | 44,100 Hz | mono | 101 kb/s | 6.2 KB | A bullet striking wood (your cover, the gallows) |

## Made by the code at load time

Most of the world has no asset file: it is generated when the page loads, sized to the graphics tier (Low / Medium / High, picked from the device or set in the menu).

| What | Size | Where |
|---|---|---|
| Material sets for ground, wood, fabric, leather, felt, rope and rock (colour, normal and roughness maps) | 512×512 on Medium and High, 256×256 on Low; fabric, leather and rock at half that (not below 128); felt 128×128; rope 64×256 | `src/02_textures.js` |
| Sprites: grass 256×256, sagebrush 256×256, dust 64×64, bunting 256×64, shop window 128×160 | fixed | `src/02_textures.js` |
| Sky, sun and clouds | shader | `src/05_sky.js` |
| Town, gallows, props and cover | geometry | `src/06_world.js`, `src/07_props.js`, `src/12d_siege.js` |
| Clothes, hats, hair and faces fitted to the base body | geometry | `src/08a_bodygeo.js`, `src/08b_chars.js`, `src/08c_headdata.js` |
| Footsteps, crowd murmur, wind, and a fallback score if the soundtrack can't load | Web Audio synthesis | `src/03_audio.js` |
| Word list (382 words) and their definitions | text | `src/11_words.js`, `src/11b_defs.js` |

## Screenshots (`docs/screenshots/`)

| File | Pixels | Bytes |
|---|---:|---:|
| `00-wide.png` | 1920×1080 | 2.09 MB |
| `01-title.png` | 780×1688 | 657.0 KB |
| `02-round.png` | 780×1688 | 1.42 MB |
| `03-solved.png` | 780×1688 | 1.33 MB |
| `04-sword.png` | 780×1688 | 1.49 MB |
| `05-shootout.png` | 780×1688 | 1.50 MB |
| `06-game-over.png` | 780×1688 | 1.33 MB |
| `07-word-book.png` | 780×1688 | 518.7 KB |
| `08-rooftops.png` | 780×1688 | 1.44 MB |

## Totals

99 asset files: models 3.43 MB, textures 349.9 KB, audio 3.97 MB (together 7.74 MB).
