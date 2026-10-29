# Changelog

The version numbers are the published versions of the game (first published as a claude.ai artifact). Newest first.

## v33
- **More detail everywhere.**
  - **A new Ultra graphics tier**: textures at twice the resolution, a sun shadow map four times the size, more grass,
    stronger ambient occlusion and volumetric light, and the most of the new detail. Auto now starts computers on
    Ultra and phones on High (it was Balanced); as before, it steps down by itself if frames run long, now from Ultra
    too.
  - **Close-up detail textures**: the ground has sand grains, grit and little stones; timber has fibres, splinters and
    fine checks; rock and boulders, in town and along the getaway, have grit over their own texture. They fade out
    with distance, where they'd be too fine to see.
  - **The town's porches**: lanterns on iron brackets either side of every door that light at dusk, a step up, shutters
    (some hanging open), benches, crates, sacks and barrels at the ends of the porches, rain barrels, and wanted
    posters, each with its own sketched face, name and reward.
  - **The street**: stones large and small, broken boards and sticks, bottles outside the saloon, rusty cans and
    horseshoes by the livery. Tumbleweeds roll and hop down the street on the wind (a few at a time, away from the
    gallows and the word board).
  - **The getaway's desert**: dead trees, ocotillo, flat ledges of rock and loose stones along the trail.
  - How much of the new clutter there is follows the tier.

## v32
- **The course is checked.** Every run of the getaway can be ridden without a hit: 300 courses from the game's own
  generator were searched frame by frame for a clean way through, also with a horse 12 cm wider and 40 cm longer,
  and with lane changes and jumps only every 0.1 or 0.15 s. All 300 passed every time.
  - Two things were tightened along the way. A zig-zag pattern (a row, then a second row soon after) could, at top
    speed and with the slowest inputs, leave too little time to get from one gap to the next; the second row now
    comes at least 0.7 s later, however fast you're going. And the pools of obstacles kept for the run were made big
    enough for the busiest stretch of any course.
- **Three horse trails.** The run's three lanes are now three trails worn into the desert: packed dirt sunk a little
  down the middle, low banks of loose dirt and pebbles at the sides, ragged edges, and hoofprints old and new, some
  skidded. Dry grass grows between them. (The worn track that was meant to show the lanes in v31 never drew: its
  triangles faced down.)
- **Horses with hair and a real coat.**
  - The coat has fine hair lying back along the body and down the legs, in its colour and its surface, uneven colour
    with a darker back, dark points (legs, muzzle, ear tips), hooves, wet eyes, and the hollows between the muscles
    shaded.
  - Each horse is different: you ride a dark bay with a blaze and one sock. The posse ride a bay, a chestnut with a
    blaze, white socks and a flaxen mane, a dapple grey, a brown with one sock and a black.
  - The mane is hair: a layer lying down the far side of the neck and locks over it that lift and flick in the
    gallop. From the saddle you see it fall over the neck.
  - The tail is fuller (three layers of hair round it), and hair has a soft sheen along the strands instead of
    reflecting the sky.

## v31
- **The getaway's run is now a three-lane runner.**
  - Swipe left or right to change lane and swipe up to jump; on a keyboard, ← / → or A / D, and ↑, W or Space. There
    is nothing on screen to press, and the view takes the whole screen (no bottom panel) until the fight.
  - Tall things (boulders, saguaro, stacked freight, wagons down a lane) have to be gone round; low ones (logs, hay
    bales, troughs, fences, sometimes a fence right across the trail) can be jumped.
  - It's faster (13 m/s rising to 19.5) and the rows come quicker and harder as it goes. Riding into something,
    tripping or clipping something while changing lane each give the posse ground. Once they're close they shoot,
    and the screen's edges pulse.
  - Speed shows: the view widens and its edges blur, and sand blows past.
- **The posse sit their horses.** The horses' backs are measured from the gallop every frame, so riders sit on them
  instead of sinking in, with feet in the stirrups outside the horse.
- **Horses up close:** a smoother body that shades properly as it gallops, a western saddle and blanket, a mane, a
  tail of hair that streams out at the gallop, and reins to the bit.
- **The fight:** a second automatic reload (18 rounds). The shootout keeps one.
- **The desert along the trail:** sage, dry grass, broken boulders and cactus all the way out; weathered stone
  instead of smooth orange lumps; three trodden paths down the trail.
- **The canyon and the end:**
  - The canyon is deeper and rebuilt: a wandering rim, walls stepped into cliffs, talus and benches, banded rock
    with fine grain up close, a river at the bottom. At the end the sun's shadows cover the whole canyon.
  - The end is letterboxed and filmed: the view stretches as the ground runs out, then a slow-motion shot of horse
    and rider leaping off the edge with stones going over, a look straight down from the rim, and a long view down
    the canyon with the dust rising from the bottom.
- Fixes: the posse's loose horses no longer run out over the canyon; a statement in the shootout's UI that a comment
  had swallowed now runs; resizing during the getaway no longer throws, and the view is redrawn at once.
- `tools/check_build.py` now also fails when a comment put in the middle of a line has swallowed the code after it.

## v30
- **The shootout:** you now have 5 hearts, and the revolver holds 6 rounds with one reload, 12 rounds in all. The
  reload is automatic when the cylinder empties, and you can't fire while it runs. A speedloader beside the cylinder
  shows whether your reload is still there.
- **The getaway:**
  - It uses the same gun and hearts as the shootout, drawn the same way. That's 5 hearts and 6 rounds with one
    automatic reload, instead of unlimited reloads and 3 hearts.
  - Run dry with riders still coming and they finish you.
  - Steering in the ride is a swipe or drag left and right anywhere on the screen. The Left and Right buttons are
    gone. The horse moves straight across the trail instead of turning diagonally.
  - The fight's pad is Aim | Fire, as in the shootout. There is no Reload button and no R key.
  - The posse stays in view. On a phone held upright they used to ride off the sides of the narrow view; now they keep
    within it, follow the trail's bends, and keep pace when your horse swerves. The second wave waits closer, and the
    last rider comes in close behind you rather than out to the side.

## v29
- A brass bell now hangs off the gallows. It stirs in the wind and catches the light now and then. In the shootout
  it can be shot like anything else, and the bullet is spent as usual.
- Winning the shootout no longer jumps straight to the end sign. A "You survived" banner comes up, and the street
  stays yours with the gun in hand until you press **Done**.
- New in the menu: **Reduce motion**, which cuts the camera's shake and bob. It starts on if your device asks for
  reduced motion.
- Spoiler, a hidden getaway: ring the bell in a shootout you win and the posse rides in. You take a horse and run.
  - **First half:** you steer through rocks, cactus, wagons and broken fences while they close in behind you.
  - **Second half:** halfway, a shot past your shoulder turns you round in the saddle with a six-shooter. The horse
    keeps to the trail and you shoot it out with the posse: gunmen, lasso men and one hard case who rides up
    alongside.
  - **The end:** drop the last of them and things do not end well. Retry the chase, or go back to the hangman.
  - The README has the details, in a spoiler section.

## v28
- Two more gunmen, on the roofs of the sheriff's office and the general store. They stand up behind the false
  front to shoot and duck out of sight between shots; crossing the ridge, their hats show. Shot, a man on a roof
  may pitch over the false front onto the porch roof or the street, fold over the top of it, or fall back out of
  sight.
- Nine gunmen in all, so the revolver now holds 11 bullets, keeping two to spare.
- A red arc around the crosshair warns of a gunman taking aim at you from outside your view and points toward
  him. It flares when he fires.
- Gunmen outside your view can now shoot at you, if they have a clear line to you and you could turn to face
  them. They take 0.5 s longer to aim than a man on your screen.
- Far targets are a little easier to hit: the men on the roofs are 20–27 m away.

## Repository — 2026-10-23

- The project's first commit. It holds the game as of v27, rearranged into `src/`, `assets/`, `vendor/`, `tools/`
  and `test/`.
- `build.py` now writes a standalone page that any web server or GitHub Pages can serve. It also builds the base64
  models and copies the textures and audio into `dist/`. `--fragment` writes the artifact-style page instead.
- Added the README, ASSETS (generated by `tools/asset_report.py`), CREDITS, this changelog, screenshots, a build
  check, and a GitHub Pages workflow.
- Left out four sound files the game never plays: two groans, a spare rope-cut and an unused host line.

## v27
- The GAME OVER sign comes up 4 seconds after he hangs, down from 6.

## v26
- The sword is thicker. A sheen sweeps along the blade every couple of seconds and sparks glint off it, so it catches
  your eye.
- The sword can still be tapped after the GAME OVER sign is up. Cutting him down then carries on into the shootout,
  and the streak you had is given back.

## v25
- Gunmen fire 0.3 s after you come up, down from 0.5 s.

## v24
- 9 bullets in the shootout, up from 7.

## v23
- The menu's main button reads **Ride Out** when the game first opens, **Restart** during a game, and **Try Again**
  or **Play Again** after one ends. The end sign's button reads **Try Again** after a loss.

## v22
- Gunmen fire 0.5 s after you come up, down from 0.8 s.

## v21
- Bullets are single-use: no reloading. When you run out with gunmen still standing, an "Out of bullets" banner comes
  up and they finish you, one heart at a time.
- Losing a heart is easy to see. The heart empties to an outline with a short animation and a "hit" banner shows.
  The hearts are bigger.

## v20
- Gunmen fire 0.8 s after you come up, down from 1.2 s. They move faster, and they get three new pieces of cover (a
  trough, a stack of crates and barrels) that appear only for the fight.
- The end sign shows the word's part of speech and meaning, with definitions written for all 382 words.
- New **Word Book** in the menu. It holds every word you've finished, with its meaning and whether you solved or
  missed it. You can search it and sort it by newest or A–Z. It's saved in the browser and, on claude.ai, to your
  account.

## v19
- Hiding behind cover is safe: nobody can hit you while you're down.
- The shootout no longer shows a number for your bullets. The cylinder at the top left already shows them.
- The gunmen taunt you now and then: "Take this!", "Thought you could get away, huh?", "Come on out and fight!",
  "Just you and me now!", "Any last words?", "Your time has come, kid!". Each line is heard at most once a fight,
  and never two close together.
- More time to grab the sword: 6 seconds, up from 3.
- Fixed a bug that could kill you at once with hearts left when you ran out of bullets.

## v18
- The shootout gives you 3 hearts.
- Once cut down, the hanged man is you: the shootout is played through his eyes.

## v1 – v17
Built up the game itself:
- the 3D frontier town at sunset, with its physically based sky, procedural materials and graphics tiers;
- the gallows, with a simulated rope, trapdoor and lever, and the hanging with ragdoll physics;
- townsfolk made from a motion-captured body and a head scan, with clothes, hats and hair;
- the word bank, the difficulty and word-length settings, and the hint;
- the soundtrack, the 3D sound effects and the voiced host (ElevenLabs);
- the sword and the shootout.
