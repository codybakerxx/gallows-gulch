# Changelog

The version numbers are the published versions of the game (first published as a claude.ai artifact). Newest first.

## v57
- **The way to the range is a side door now.** The board out over the street (v56) was too far down the street to
  notice, so it's gone. Instead there's a new door in the side wall of the store with **GUNS & AMMUNITION** painted on
  it, the wall that looks back up the street toward the gallows. It sits between the two side windows, under the
  painted sign, and it glimmers the way the gunsmith's front door used to (light round its edges, sparks along the
  frame); a tap on it takes you to the range. The assay office's front door is just a door again. The star that
  twinkles at the edge of the picture until you've been to the range now shows the way to the new door.
- **No laser lying on the range's bench.** The gunsmith's laser is still on his list of weapons to pick from.
- **Your revolver is held upright.** v56 tilted it in the wrist to show more of its side; now it's held square, as
  the Derringer and the laser are, pointing straight down the sight. The gunsmith's Colt too.
- **The range's four buttons are evenly spaced.** Leave, Weapons, Challenges and Reset are spread across the top
  with the same gap between each (Leave used to sit alone at the left, the other three bunched at the right).

## v56
- **The way to the gunsmith's range is easier to find.** A board now hangs on a post out over the street in front of
  the gunsmith's, **SHOOTING RANGE · OUT BACK** with an arrow, and while the door is glimmering a band of light runs
  along the board's paint and stars wink at its ends. The door used to be the only sign, and it faces across the
  street, so it was easy to miss. The board can be seen from down the street, and a tap on it takes you to the range
  like the door does. The door's own glow is a little brighter and can be seen from more of the street. Until you've
  been to the range once (remembered on the device), a small star twinkles every few seconds at the edge of the picture
  on the side where the door is, while the door is off the screen.
- **Bottles melt in the town too.** In the shootout, a bottle held in the laser's beam glows orange where it's struck,
  then slumps into a glowing lump of glass and cools, just as the gunsmith's bottles do at his range (it used to shatter
  as if shot). A bullet still shatters it, whole or melted; they're all set back up for the next shootout. Cans in the
  beam still jump.
- **Your revolver is the detailed one.** The repository owner's single-action revolver model (made with Claude in
  another chat) replaces the simple blocky one everywhere it's shown: on the barrel by the gallows (still gleaming to be
  picked up), in your hand, on the laser's crate, and as the gunsmith's Colt. Nickel frame, blued cylinder with six
  rounds, brass trigger guard and backstrap, ebony grips with the star, case-hardened hammer. In your hand the hammer is
  back and the gun is tilted a little in the wrist, so you see some of its side (it still points straight down the
  sight); at each shot the hammer falls and is thumbed back
  and the cylinder turns a sixth. It's fetched once the game is up (about 5 MB), the simple one standing in until it
  arrives. The townsfolk's and the riders' guns stay simple.
- The laser gun's lighting is as it was modelled: the way its packed meshes were placed bent its surface normals, so
  some faces caught the light wrongly.

## v55
- **No more fast-forward with a gun in hand.** A tap while the round is held up (the host answering a guess) hurries
  him along at six times speed. Holding a gun, at the range and on the way there hold the round up too, so a second
  tap on the gunsmith's door while the view faded (or a tap with the gun just coming up) set the whole town running at
  six times speed for as long as you held the gun. Those taps don't hurry anything now, and the speed is always normal
  with a gun in hand.
- **The Derringer held straight.** It was turned a quarter-turn out so its side showed, which had it pointing off to
  the right of the sight. It's held down the line now, the same as the Colt and the barrel's revolver, and remodelled:
  a nickel over-under with rosewood bird's-head grips (the old one was a white block from behind).
- **Your own weapon on the laser's crate.** In the shootout, taking the laser leaves on the crate whatever you were
  holding (the Winchester, the bow, the Gatling...), not always the revolver, and a tap on it gives that back.
- **The range reworked:**
  - **Practice:** nothing moves. Six bottles, five tin targets (two more), six bandit cut-outs (two more), the
    jackrabbit standing, three clays standing on the trap house roof, the gong. What you shoot stays down (a bottle or
    a clay broken, a tin target flipped up on its hanger, a cut-out fallen flat) until **Reset** stands them all back up.
  - **Challenges** (in place of the timed minute of points): Bottles, Tin targets (sliding along the rail), Bandits
    (popping up and dropping back: each has to be shot while he's up) and Everything (with the jackrabbit running and
    the clays thrown one at a time till each is hit). A count of three (no shooting in it), then the clock to the last
    target; the time, how many shots it took, and your best with that weapon, kept on the device. **Stop** gives up.
  - **The laser** is the tenth weapon there: hold Fire and the beam heats what it's on. A cut-out catches where the beam
    struck and burns away from there, in flames, smoke and ash; a bottle slumps into a glowing lump; a tin target goes
    red-hot and flips; the gong glows; a clay bursts into flame. It stays with the gunsmith: leave with it in hand and
    you're back in the round with the last of his guns you held (or the Colt).
  - The bar along the top: Leave, Weapons, Challenges (Stop during one), Reset.

## v54
- **The gunsmith's range** (an Easter egg, `12u_range.js`). The door of the assay office, where GUNSMITH hangs, glimmers
  in a round: warm light leaking round its edges and under it, a soft glow, sparks running along the frame, all of it
  kept big enough on the screen to be picked out from down the street. Tap it and you're out the back at his range,
  the lanes clear of scrub, a rack of his weapons beside you and a picker of nine:
  - the **Colt Peacemaker**, the **Derringer**, the **Winchester '73** (the lever worked between shots), a **coach gun**
    (nine pellets a barrel, each target scored once a shot), the **Sharps buffalo rifle** (one round, a brass scope:
    **Scope** narrows the view to a dark round sight);
  - a **bow** and **throwing knives**, which fly at what's under the sight and drop as they go (they stick where they
    hit for a while), the **Gatling gun** (hold Fire: it spins up and fires nine a second), and **dynamite** (thrown,
    it lands and goes off when its fuse is done, taking everything within four metres).
  Each is its own model, held its own way in the first-person view (a pistol low on the right, a long gun up from the
  foot of the screen to the sight, so on a phone it doesn't stand in front of what you're aiming at, the bow upright
  on the left), with its own sign and count in the cylinder at the top left (`12t_arms.js`).
- **Everything downrange moves**: bottles on a fence (1 point), three tin plates sliding along a rail and swinging when
  hit (2), four bandit cut-outs popping up from the dirt and falling back when hit (3, 5 for a head shot), a jackrabbit
  running a track (4), clays thrown across from a trap house (5) and a gong at the back (2). Free practice (the reloads
  never run out), or a **timed round**: a minute, the targets faster, then the score and your best with that weapon,
  kept on the device.
- **Leave range** fades you back to the round where you left it, at the barrel, with the weapon in your hand: the
  revolver's rules (shoot one of the townsfolk, the executioner or the host and the town draws on you; you fight them
  with it). **Holster** and the round goes on; **Draw** (top left) takes it up again with what was left in it. It's
  the weapon you fight any town shootout with, from the sword too: its own count, its own reloads, the spare rounds by
  the board giving its own box (+14 rounds for the Winchester, +3 sticks of dynamite). It stays yours from round to
  round. The barrel's revolver is still there with its own cylinder, and the getaway is still the revolver's.
- The host's speech bubbles don't follow you out to the range.
- A posse rider burning in the saddle is carried where his horse is this frame, not where it was last drawn (he could
  trail it by a step; a test that steps frames without drawing could find him metres behind it).

## v53
- **Spare rounds by the board.** A box of cartridges leans against the front of the hangman board, glimmering (light
  runs over the brass, sparks twinkle over it). In the town shootout a tap on it is one more reload, seven rounds, for
  that shootout only (`12r_ammo.js`): a second speedloader shows by the cylinder and "+7 rounds" comes up. If the gun's
  already dry and they're closing in, it puts you back in the fight. When your last load is in the gun, a tip points
  it out. It's back for the next shootout.
- **Solid buildings** (`12s_solid.js`). Every building and its porch, the church and the water tower's legs are solid:
  - the loose horse's run went through the general store's porch and front: it goes round the corner now;
  - the street's tumbleweeds blew through the buildings on both sides (they came in from behind them): they come in
    only along a clear line, fetch up against a porch, roll along it, or are blown off it after a while;
  - the physical tumbleweed bounces off walls;
  - a gunman shot down falls against the buildings near him (only the two climbed roofs were solid before).
  Measured: a long run of the town (the loose horse sent through ten times, the herd, the townsfolk, both kinds of
  tumbleweed) and every way the horse can run: nothing inside.
- **The gunmen hold their revolvers.** The grip sits in the palm, up through the curled fingers, the palm against its
  side, the barrel along the forearm on the line he means; the other hand round the first (`alignHand`, 09, and
  `gunFrame`, 12d). Before, the gun hung from the wrist with its grip back inside the forearm.
- **The laser held as the revolver.** Same place, barrel straight down the line of sight, its bore on the revolver's
  (in town and in the getaway). It was turned 15 degrees out to the right to show its side.
- **The noose, made right.** Fitted to the condemned man's head and neck, measured vertex by vertex:
  - the executioner carries the loop up behind his head and over it, held open and flat, brings it down round his head
    along its middle, and only below the jaw turns it and draws it in (it used to come straight up through the face,
    and close as it came down, through the chin);
  - where it sits: low at the throat and the right of the neck, resting on the collar, high round the back to the knot
    behind the left ear (it used to be 8 cm across at the height of the jaw, through the beard and chin);
  - the knot's top goes with his head, and with the noose on his head turns with his neck and can't drop or tip far;
  - the rope above the knot rides round two spheres fitted to his head (one 8.5 cm sphere before), and only its end is
    free of them (34 cm was);
  - the executioner's fists turn so what they hold lies in their grip: the rope just above the knot up through the
    left, the loop through the curl of the right fingers. The reprieve takes it off the same way, backward.
  Measured over putting it on, 12 s with it on and taking it off: the loop, knot and rope stay out of him (to within a
  centimetre where they press), his hands to within two (pressed to his head).

## v52
- **No empty panel once a round's over.** Under every end screen (GAME OVER, YOU SAVED HIM, YOU SURVIVED, the
  getaway's results) and with the sign put away to look round, the bottom panel is gone and the view fills the screen.
  The same goes from the moment the shootout's won (after Done) or you're shot dead. It's back the moment there's
  something in it to press: a revolver taken up from the barrel (the pad), a retry of the getaway, or a new round (the
  letters). (`endPanel`, `#app.over`.)

## v51
- **The getaway's hoofbeats are the repository owner's recording.** The recording is cut into 24 single hoof hits on
  dirt (`tools/cut_gallop.py`, `assets/audio/sfx/gallop.mp3`), and one is played for every hoof that lands, your own
  horse's and the posse's: never the same one twice running, a little faster or slower each time, each beat of the
  stride its own weight. They're a little louder to the ear than v50's made hoofbeats were. The made ones are only heard
  if the recording can't be had (and for the first hoof or two if it isn't decoded yet). v50's breathing and jingle are
  gone with them.
- **The End in the middle.** The getaway's results sign sits in the middle of the screen, not down at its foot.

## v50
- **A fairer run.** The rows are a little further apart (23 m on average, was 21), and "doubles" (the only way on two
  lanes over, a swipe right across the trail) are a third as common (about 3 a run, was 9), and all but never two in a
  row (about 3 back to back a run, before).
- **The gallop, not the wind.** The run's wind was a loud band of white noise over everything; now it's a low, quiet push
  of air. The hooves are made over: a dull clop on packed dirt, the weight landing (a thump you feel through the
  saddle), a gritty scatter of dirt, each beat of the stride its own weight; your horse breathes with the stride, and the
  bit and rings jingle now and then. The swish of a lane change is softer too.
- **Nine in the gun, no reload** for the horseback fight. The speedloader's gone from beside the cylinder.

## v49
- **The menu gives the sign back.** Opening the menu over an end sign (GAME OVER, YOU SURVIVED, the getaway's results)
  with the Menu button or Change Settings put the sign away; shutting the menu again with its X (or Resume, or Escape)
  left it gone, and nothing on the screen to carry on with. Now it comes back, as long as you didn't start a new round.
- **Four in the gun for the getaway.** One more round a load in the horseback fight: 4, with one reload (8 in all).

## v48
- **Three in the gun for the getaway.** The horseback fight's revolver holds 3 (was 5), with one reload: 6 rounds in
  all.
- **Shot off the horse, and you see it.** Caught after two strikes in the run, the shot from behind now throws blood
  across your view (and more as you hit the dirt), as a hit does in a fight.
- **No words, no chime.** The laser no longer puts STEAK! or DRUMSTICK! over the meat, or plays a chime; and the sound
  of it striking a horse, a crow or a man is no longer a cartoon "pew" but a hard crack, a thump, and a searing hiss
  with a few pops in it.
- **Fire that looks like fire.** The burning tumbleweeds are lit with a new particle fire: hundreds of small tongues of
  flame, torn and flickering, coloured by how hot they are (yellow at the root through orange to dark red at the tips),
  with sparks flung up, thick black smoke that greys as it smoulders and drifts on the wind, a warm glow on the ground
  around it, and the twigs themselves glowing hot in patches before they char black. It catches where it's hit,
  spreads over the weed in under a second, blazes, dies down to embers, and falls in to ash; it crackles as it burns.

## v47
- **The tumbleweed you see burns.** There are two kinds of tumbleweed: a few rolling far down the street, and one that
  bounces right past the gallows and the covers. Only the far ones could be shot or set alight (and from the covers the
  gallows hides most of them), so the one in front of you didn't catch fire. Now it does: in the laser's beam it goes up
  in flames, rolls on burning and blackening, and falls away to ash, and the next one blows in later. A bullet knocks it
  on, spinning.

## v46
- **The host gets back up.** Shot from the barrel, the host lay where he fell even after a restart, and once he walked
  his head spun round and round. His standing animation had been left paused; it runs again now when the round
  restarts.
- **The chambers stop spinning.** The cylinder in the top left spins while a reload goes in. If the shootout or the
  revolver from the barrel ended mid-reload, it went on spinning for good, even in the hangman game.
- **No ropes on the end signs.** GAME OVER and the getaway's results no longer hang from two ropes.
- **A harder run.** Half as many obstacles again: about 120 a course (was 79), with the rows closer together, most of
  all early on, over a course 10% longer. The horse builds to 100 km/h by the end (was 90).

## v45
- **The host can be shot.** From the barrel, before any shootout, a shot at the host used to whip past him. Now he goes
  down where he stood, and the town draws on you just as it does when you shoot one of the townsfolk (with nobody left
  to call "Shoot that stranger!"). He's back, whole, the next round.
- **Tighter horse hit shapes, and a head.** The horses' hit shapes are now fitted to the horse model itself: the body,
  the neck, the head and the four legs, each squeezed side to side to the horse's own width. The old shapes had no head
  at all (a shot at the face went through), sat too low on the back and stood too wide at the sides. A grazing horse's
  lowered head is hit where it's drawn.

## v44
- **Cover saves you when you're out of bullets.** Out of bullets, the gunmen used to shoot you dead through your cover,
  crouched or not. Now cover still stops their bullets: they shoot you only if you show yourself, and instead one of
  them walks round the side of your cover to finish you where you hide. That takes him a few seconds, time to get to
  the laser if it's still on its crate ("One of them's coming round your cover…"). A man on a roof can still see down
  behind it once there's nobody left in the street.
- **No hum from the laser on the crate.** When your revolver runs dry, its lights pulse, silently.

## v43
- **Tumbleweeds you can see burn.** The v42 fire was drawn by adding light, and against the sunset's orange street it
  hardly showed. Now it's tall tongues of flame drawn over the scene, yellow-white at the root and dark red at the tips,
  with a bright glow at the heart and black smoke rolling off. The weed goes up with a whoomph, crackles as it burns,
  is charred black in under a second, and burns for 4.5 s (was 3.2). It's a little easier to hit, too.
- **No humming after you're dead.** Out of bullets in the town shootout with the laser still on its crate, the laser
  wakes and hums so you can find it. If they finished you first, the hum never stopped: it went on through GAME OVER
  and into the next round. It's stopped now as soon as the fight is over, and the laser's other running sounds (the
  beam, the recharge) can't be left on either.

## v42
- **A faster, busier run.** The getaway's run builds from 70 km/h to 90 (19.5 to 25 m/s; it topped out at 88), and
  there's more on the trail: the rows come about 10% closer together (so there are more of them), fewer of them
  have only one thing in the way, and rocks and cactus line the trailside more often.
- **Tumbleweeds burn.** A tumbleweed in the laser's beam catches fire: it rolls on ablaze, blackening, throwing
  embers and smoke, then falls away to ash. Another blows in after a while.
- **The dead burn to ash.** A gunman already down in the street, or a rider shot off his horse lying on the trail,
  burns to ash where he lies in the beam, leaving a long, low heap.
- **The meat's a reward.** A horse or a crow in the beam pops out its meat with a gold flash, a ring, a chime and
  STEAK! or DRUMSTICK! rising over it; it squashes and springs as it lands, with a slap and a gush of steam, and
  steams hard for a few seconds after. The steak and the drumstick are thicker.
- **The posse sits up straight.** Riders sit tall in the saddle now (they leaned forward over their horses' necks,
  and from in front could look as if they were lying on them).
- **Five in the gun, one reload** for the getaway's fight: 10 rounds in all (was six and two reloads).

## v41
- **The sword with the sign away.** After a hanging, with GAME OVER put away to look round, a tap on the sword didn't
  cut him down (the drag to look round took it). Now it does, as it does with the sign up.
- **A longer, harder run.** The getaway's course is about a third longer (1,000 m of rows, was 760), and the horse
  builds speed the whole way, from 19.5 m/s at the start to 24.5 m/s at the end (it was 19.5 all the way). The rows
  near the end come a little closer together too.

## v40
- **Close the menu.** The menu has a red X at its top right that closes it, as well as Resume.
- **Put the end signs away.** GAME OVER, YOU SAVED HIM, YOU SURVIVED and the getaway's results (The End, Captured)
  each have a button to hide them. With the sign away, drag anywhere to look round: all the way round, and from your
  boots to the sky. **Show the sign** brings it back. A touch on a hanging body still handles it, and the revolver on
  the barrel can still be taken up.
- **No more floating scenery at the end.** The getaway's trail curls back, and the canyon at its end reached the town:
  with the ground cut away for the canyon, the town's buildings, props and grass were left hanging in the air over
  the drop in the long views of the fall. Anything over the canyon is put away while it's there.
- **Straight back to town.** Returning to the hangman from the getaway (or starting a new round from its results) no
  longer flies the camera back across the desert, through hills and scenery; you're in town at once, fading in from
  black. A retry of the getaway fades in too.
- **The neck snap on time.** The sound is decoded ahead of time, so it no longer plays a beat after he reaches the end
  of the rope (it was being decoded at that moment).
- **Seven in the gun.** The town shootout's revolver holds seven, one fewer, and its reload is seven (14 rounds).
- **Two strikes in the run.** The first thing you ride into, trip on or clip warns you ("One more and they've got
  you"); the second and they have you. They don't take you back now: a shot from behind, and you go over the side
  into the dirt while your horse runs on. The results say **Shot Down**.

## v39
- **The revolver from the start.** The revolver on the barrel can be taken up from the first moment of a round, not
  only after a win (it shines whenever it's there for the taking). Tap it and you're standing at the barrel with it in
  your hand: the letters give way to the Aim and Fire pad, and a **Put it back** button. Look round and shoot what you
  like: crows, horses, the bell, the barrels, crates and lanterns about the town; every shot makes the crowd jump.
  Shoot one of the townsfolk or the executioner and the town draws on you: the shootout starts right there ("Shoot
  that stranger!"), with no hangman to finish and no rope to cut, and you run for the nearest cover with what's left
  in the gun. The host and the condemned man aren't targets: a shot at them whips past. Put it back and the round
  goes on where it was. After a win it works the same way: take it up, then shoot someone to start the fight.
- **Swap guns at the crate.** Taking up the laser leaves the revolver lying on the crate where the laser was. Tap the
  revolver and it's back in your hand, with the laser back on the crate keeping its charge (it goes on recharging
  there). You can swap as often as you like.
- **The laser in the getaway.** If the laser is the gun in your hand when the street's cleared, it's the gun you ride
  out with. In the getaway's fight, hold Fire for the beam: a rider in it burns to ash in the saddle while his horse
  runs on without him, and a horse in it is a steak, with its rider thrown into the dirt. Each ride starts fully
  charged. Swap back to the revolver before the last man falls and you ride out with the revolver.
- **The steak.** Three times the size it was, about 2 m across, and made to look like a ribeye off the grill: a thick
  slab with an uneven edge, a browned cap of fat down one side and a seam of fat through it, a dark glossy crust with
  criss-cross grill marks burnt in, cracked pepper and salt. It tumbles down onto its edge and flops flat.
- **Meat to ash.** A drumstick or a steak lying on the ground burns to ash in the laser's beam, the same way a man
  does, and leaves a scatter of grey heaps where it lay.

## v38
- **Fewer crows.** They were heard far too often: the perched birds, the unseen ones out past the town and the
  vultures overhead each called every few seconds between them, and every shot set some off. Now, once a crow has been
  heard, the town is quiet of crows for 10–20 s before the next (an alarm after a shot needs 2.5–4.5 s), each bird calls
  less often (the perched ones every 25–70 s, the unseen ones every 28–60 s, the vultures every 40–80 s), a call is
  answered now and then by one other bird at most, and a shot or a slam sets off one alarm at most. A bird that would
  have called while another was heard keeps its beak shut too.

## v37
- **Look round.** In the hangman part, a drag on the picture turns your head, all the way round and up and down; the
  game turns you back each time it cuts to a new view. In the shootout you can now turn all the way round and look from
  your boots to straight up (it was about 70° either side and a little up or down), by the Aim pad or by dragging on
  the picture, even down behind cover. A quick drag turns you further.
- **A revolver on a barrel.** Off to the side of the street, out of the view the round ends on, a revolver lies on a
  barrel. Win the round and it catches the light, a glint swelling and fading and sparks along the steel. Tap it and
  you're in the shootout: the host calls "Shoot that stranger!", the man you saved slips away, and you run for the
  nearest cover.
- **Eight in the gun.** The town shootout's revolver holds eight, and its reload is eight (16 rounds in all). The
  getaway's is still six.
- **The laser any time.** It can be taken up from the crate whenever you like, rounds left or not.
- **Ash.** A man in the laser's beam goes black and glowing in a blue flash, then crumbles from the head down with a
  line of embers sinking through him, the ash drifting down into a small heap that smoulders a while. His gun drops.
- **Bigger drumsticks.** A crow in the beam comes down as a drumstick about 0.6–0.7 m long (it was the crow's size).
- **The town's horses.** Two to six more horses, by quality setting: one saddled and tied at the hitching rail by the
  trough, others loose at the edge of town and behind the street's cover, heads down tearing at tufts of grass, looking
  up now and then, swishing their tails; on the higher settings one or two wander at a walk from patch to patch. They can be shot (and lasered).
- **Things that break.** Crates, barrels, the coffin, the trough and hitching rail, the wagon wheel, the barrels and
  crates along the boardwalks, the benches, crates, sacks, barrels, lanterns, shutters and wanted posters on every
  porch, and the gunmen's trough, crates and barrels. Each takes a few bullets (or under a second of the beam) and
  bursts into planks, staves and hoops, glass, straw, grain or paper, with water out of a barrel or trough. A crate
  stacked on it goes too, and a bottle or can on it falls. A gunman whose cover is gone is in the open. A new
  sound for wood breaking (ElevenLabs).

## v36
- **A laser gun on the crate.** The ARC-09 (a model the repository owner made in another chat) lies on its side on the
  crate at your middle cover, down by your left hip: out of sight in the usual view, there when you look down. While
  there's a round left in the revolver, tapping it only gets a "not while there's a round left" tip. Once the revolver
  is empty (no reload left either), it wakes: its lights come up and it hums, so you might hear where it is, and the
  gunmen hold off a few seconds longer before they start on you. Tap it (from another cover you run back for it) and
  it rises into your hand and the fight's back on.
- **The beam.** Hold Fire: a blue beam, with a low futuristic hum and a whine over it. It drops a gunman almost at once,
  scorches what it touches (wood, ground, iron; it cracks windows), rings the bell, knocks bottles and cans about,
  and throws blue sparks and smoke.
- **The charge.** 20 seconds of firing in all, shown as a blue ring where the revolver's cylinder was, with the seconds
  left in the top bar. Empty, it won't fire for 7 seconds while it charges itself, the ring filling amber with a rising
  whine, then a chime.
- **Horses go down.** The town horse now crosses the street just past the gallows during the shootout, and shot with
  the revolver it screams, crashes onto its side and lies in its blood. A posse horse shot in the getaway goes down
  the same way, sliding along the trail, and throws its rider.
- **Meat.** A horse touched by the beam is gone in a flash, blue and white, a tenth of a second, and a big grilled
  steak drops out of it, bounces and lies steaming. A crow comes out as a roast chicken leg the same way.
- New sounds: the horse's cry (ElevenLabs), and synthesized ones for the laser (hum, whine, charge, chime, the zap),
  the meat landing and its sizzle.

## v35
- **The neck snap is a real recording** (the repository owner's), trimmed and played dry at the neck, and nothing else
  sounds with it: the faint ring that played as the sword began to glint is gone (the glint is only seen now), and no
  crow is heard over the drop and the snap.
- **Crows that sound like crows.** Every caw in the game is from the repository owner's two recordings, cleaned up and
  cut into 20 single caws. The game strings them into calls the way crows call: runs of one to five, evenly paced,
  trailing off, the last one dropping; each bird with its own pitch and pace, some with the long, drawn caw. Others
  answer. Out past the buildings three or four unseen crows call now and then from about the same places, softened
  and echoing with distance. Startled birds give a faster alarm call.
- **Real crows.** Up to seven (fewer on the lower graphics tiers) perch on the gallows beam and the tops of its posts,
  the rail at the back of the deck, the false fronts and hitching rails, and pick about in the street. They look
  about in quick turns of the head, hop along, turn round, peck, preen, stretch a wing, and fly from perch to perch or
  off out of town and back. The trap slamming, a shot, the bell or someone coming close puts them up. In the
  shootout they can be shot: a burst of blood and feathers, and the bird tumbles down, bounces once and lies where
  it lands in a spreading pool of blood. Each new round the dead are gone and others fly in.
- **More to shoot in the shootout.**
  - Bottles and tin cans on the gunmen's crates, barrels and trough, and a bottle on the post at the foot of the
    gallows stairs. A bottle bursts into glass and whatever was in it, leaving its jagged bottom standing; a can
    jumps, spinning, bounces and can be shot again where it lies.
  - The gallows lanterns shatter, swing hard and go dark.
  - Shop windows crack round the bullet hole and drop glass.
  - Barrels and the side of the trough spout water from the hole for a few seconds; a shot into the trough throws up
    a splash (the trough now shows its water).
  - Hay bursts into straw; iron throws sparks and the bullet whines off it; wood splinters and keeps the hole; the
    street spits dirt; a tumbleweed jumps and sheds twigs.
  - New sounds for glass, windows, cans, ricochets, barrels and a crow's wings (ElevenLabs), and synthesized ones for
    straw, splashes, dirt and a can's bounces.
- **A swipe every row in the run.** Whatever lane you came through one row in, the next row blocks it with something
  you can't jump, so every row needs a move left or right (some a jump as well). Still always possible: 300 courses
  searched frame by frame came out clean in all five tests, and not one row in 7,967 could be got through without
  changing lane.

## v34
- **The host's first words.** The first round after the game loads, he opens with "There's more to this game than you
  think. Find the mystery." before his usual line. Recorded in his voice like the rest.
- **The bell shines.** Polished brass: a band of light slides down it every couple of seconds, it glows warm
  at its edges, a big glint crosses it every 1.4–2.6 s (it was every 4–7 s), and small sparkles pop on its lip and
  shoulder.
- **The word board is old newsprint**: a yellowed, warm off-white sheet with darker edges, fibres, a few foxing spots and
  the ghost of the print on its back, matte instead of glossy white.
- **A harder run.**
  - Flat out from the start: 19.5 m/s the whole way, the speed it used to reach only at the end.
  - No free rides: every row blocks every lane you could have come through the row before without touching anything,
    so every row needs a swipe or a jump. The first row blocks the middle lane you start in.
  - Still always possible: 300 courses searched frame by frame came out clean in all five tests (as the game has it,
    a bigger horse, slower inputs, both, and both slower still), with no free row in 7,486.

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
