// ---------- WORD BANK: useful vocabulary, each with a one-line clue that never names the word ----------
// e = everyday words worth using, m = sharper vocabulary (the default), h = rare, high-level words
const VOCAB = {
  e: `VAGUE|Fuzzy on the details, like directions that leave you guessing.
BLUNT|Said straight out, with no cushioning for anyone's feelings.
FRANK|Open and honest, even about awkward things.
KEEN|Sharp and eager, quick to catch on.
WARY|Keeping one eye open for trouble.
TERSE|So short with words it sounds a little rude.
ADEPT|Skilled at something from plenty of practice.
AVID|Hungry for more of a favorite pastime.
HASTY|Done in a rush, without enough thought.
NAIVE|Too trusting, from not knowing how the world works.
PETTY|Fussing over small things that don't matter.
SMUG|Pleased with yourself in a way that annoys everyone else.
VIVID|Bright and intense, like a memory you can almost touch.
SAVVY|Practical know-how that makes a person hard to fool.
QUIRK|An odd little habit that makes someone one of a kind.
NICHE|A small, specialized corner where something fits just right.
TACT|Saying the right thing without giving offense.
GIST|The main point, minus all the details.
WHIM|A sudden fancy with no real reason behind it.
BIAS|A tilt in judgment that quietly favors one side.
HUNCH|A gut feeling you can't prove yet.
AMPLE|More than enough to go around.
BRISK|Quick and lively, like a walk on a cold morning.
DREAD|A heavy fear of something that's coming.
RIGID|Stiff and unbending, in body or in rules.
STERN|Strict and serious, with no room for nonsense.
TIMID|Shy and easily spooked.
VALID|Sound and well founded; it holds up.
YEARN|To long for something with an ache.
DEFT|Quick and nimble with the hands or the mind.
WITTY|Quick with clever humor.
IRONY|When things turn out the opposite of what you'd expect.
LOYAL|Sticking by someone through thick and thin.
MERIT|Worth or quality that deserves credit.
FEUD|A long, bitter quarrel that won't die.
CANDID|Honest and direct, even when the truth stings.
FRUGAL|Careful with money; wastes nothing.
HUMBLE|Doesn't brag about their own importance.
SUBTLE|So slight or delicate it's easy to miss.
MODEST|Not showy; keeps achievements quiet.
GENUINE|The real thing, not a fake.
NOTABLE|Worth paying attention to; it stands out.
BIZARRE|Strange enough to make you look twice.
CLARIFY|To make something easier to understand.
COMPLEX|Made of many tangled parts; far from simple.
CONCISE|Short but complete, with no wasted words.
DILEMMA|A tough choice where every option has a downside.
ELEGANT|Graceful and stylish, or cleverly simple.
FRAGILE|Easily broken; handle with care.
GRADUAL|Happening slowly, a little at a time.
HOSTILE|Unfriendly and spoiling for a fight.
INSIGHT|A deep understanding that suddenly makes things click.
MOTIVE|The reason behind what someone did.
NEUTRAL|Not taking either side.
OBVIOUS|Plain to see; no explanation needed.
PATIENT|Able to wait calmly without a fuss.
RESOLVE|Firm determination to see something through.
SINCERE|Meaning exactly what you say.
TEDIOUS|Long, dull, and tiring.
TRIVIAL|Of very little importance.
URGENT|Needs attention right now.
ANXIOUS|Uneasy about what might happen next.
CRUCIAL|Absolutely essential; everything hinges on it.
DECENT|Respectable, fair, and good enough.
EXCERPT|A short piece lifted from something longer.
GLIMPSE|A quick, partial look.
IMPULSE|A sudden urge to act without thinking.
JARGON|Insider talk that outsiders struggle to follow.
LOGICAL|Following clear, step-by-step reasoning.
OUTCOME|How things finally turn out.
PERSIST|To keep going despite the obstacles.
SCARCE|In short supply; hard to come by.
SHREWD|Sharp and clever about practical matters.
THRIVE|To grow strong and flourish.
UPHOLD|To keep something standing, like a rule or a promise.
VERDICT|A final decision after weighing the evidence.
CAUTION|Care taken to avoid danger or mistakes.
EMPATHY|Feeling what someone else feels, as if in their shoes.
CONFIDE|To share a secret with someone you trust.
RELIEF|The easing of worry or pain.
ACCURATE|Exactly right, with no errors.
ADEQUATE|Good enough for the job, but no more.
CONVINCE|To bring someone around to your way of thinking.
CREDIBLE|Believable and worthy of trust.
DECISIVE|Makes choices quickly and firmly.
DILIGENT|Hardworking and careful; never cuts corners.
FLEXIBLE|Able to bend or adapt without breaking.
GENEROUS|Gives freely, more than anyone expects.
GRATEFUL|Full of thanks for what you've received.
HESITATE|To pause before acting, out of doubt.
IMPROVISE|To make it up on the spot.
INEVITABLE|Bound to happen, no matter what.
MOTIVATE|To give someone a reason to get moving.
OPTIMISM|The habit of expecting things to turn out well.
PERSUADE|To talk someone into it.
RELEVANT|Connected to the matter at hand.
RELIABLE|Dependable; there when you need it.
STUBBORN|Won't budge or change their mind.
TOLERANT|Accepting of views and ways unlike your own.
VERSATILE|Handles many different jobs well.
VULNERABLE|Exposed and open to harm.
ARTICULATE|Puts ideas into words clearly and well.
ASSERTIVE|Confident about speaking up for what you want.
COMPROMISE|A deal where each side gives a little.
ENDEAVOR|A serious attempt at something difficult.
EVIDENCE|Facts that show something is true.
INITIATIVE|Taking action without being told to.
NEGOTIATE|To bargain your way toward a deal.
NOSTALGIA|A warm, wistful longing for the past.
PERSPECTIVE|A particular way of seeing things.
PRIORITY|The thing that comes first.
SPONTANEOUS|Done on the spur of the moment, without planning.
THOROUGH|Complete and careful, leaving nothing out.
TRANSPARENT|Clear enough to see through; open and honest.
CURIOSITY|The itch to find out more.
DETERMINED|Set on reaching a goal, whatever it takes.
GRACIOUS|Kind and courteous, especially as a host.
HUMILITY|Not thinking yourself better than anyone else.
INTEGRITY|Sticking to your principles when no one is watching.
PATIENCE|The ability to wait without getting upset.`,
  m: `ALOOF|Cool and distant, standing a little apart from everyone.
CURT|So brief it borders on rude.
DOUR|Gloomy and stern in manner.
EDICT|An official order handed down from the top.
FEIGN|To fake a feeling you don't have.
GLIB|Smooth with words, but shallow.
INEPT|Clumsy and lacking skill.
LUCID|Clear and easy to follow; clear-headed.
MOOT|Open to debate, or no longer worth debating.
ONUS|The burden of responsibility.
PLOY|A cunning move to gain an advantage.
RIFE|Full of something, usually something bad.
RUSE|A trick meant to deceive.
SCANT|Barely any at all.
STOIC|Endures hardship without complaint.
TACIT|Understood without being said out loud.
TRITE|Worn out from overuse; stale.
WANE|To gradually shrink or fade.
ZEAL|Fiery enthusiasm for a cause.
AVERT|To turn away, or to head off something bad.
COAX|To persuade gently, little by little.
DEFER|To put off until later, or to yield to another's judgment.
GAUNT|Thin and bony, worn down by hunger or worry.
QUELL|To put an end to unrest or fear.
TENET|A core belief or principle.
EXTOL|To praise to the skies.
IRATE|Boiling mad.
LITHE|Graceful and limber.
OMEN|A sign of things to come.
SNUB|To deliberately brush someone off.
SPURN|To reject with contempt.
TAUNT|To provoke with mocking words.
INFER|To work something out from clues rather than being told.
VIGOR|Strength and energy.
ADAGE|An old saying that holds a truth.
CLOUT|Influence or pull, especially in business or politics.
HEED|To pay attention to advice or a warning.
MEEK|Quiet, gentle, and easily pushed around.
RASH|Acting without thinking about the consequences.
SPITE|A wish to hurt or annoy someone.
AFFABLE|Friendly and easy to talk to.
APATHY|A lack of interest or caring.
ASTUTE|Quick to notice what others miss.
BENIGN|Gentle and harmless.
CANDOR|Openness and honesty in what you say.
CYNICAL|Doubts that people act from good motives.
DEBACLE|A sudden, humiliating failure.
DEPLETE|To use up a supply until little is left.
DUBIOUS|Doubtful; not to be trusted.
ELICIT|To draw out a response or reaction.
EMULATE|To copy someone you admire, hoping to match them.
ENIGMA|A person or thing that's a puzzle.
EXEMPT|Free from a rule that applies to everyone else.
FERVENT|Burning with heartfelt feeling.
FICKLE|Changes loyalties or moods often.
FUTILE|Pointless; it won't work however hard you try.
HINDER|To get in the way and slow things down.
HUBRIS|Excessive pride that invites a fall.
IMPEDE|To block or slow progress.
INNATE|Present from birth.
LENIENT|More forgiving than strict.
MUNDANE|Ordinary and everyday; nothing special.
NUANCE|A subtle shade of difference in meaning or tone.
OBSCURE|Hard to see, understand, or find; little known.
PENSIVE|Lost in quiet, serious thought.
PLACATE|To calm someone down by giving them something.
PRUDENT|Shows good sense and caution about the future.
RAPPORT|An easy connection and understanding between people.
RECTIFY|To put a mistake right.
REFUTE|To prove a claim wrong.
SOLEMN|Serious and formal.
TACTFUL|Careful not to offend.
TENUOUS|Very thin or weak, like a shaky connection.
THWART|To stop someone's plans in their tracks.
VERBOSE|Uses far more words than needed.
ZEALOUS|Full of passionate eagerness.
AUSTERE|Severe and plain, without comfort or decoration.
BOLSTER|To prop up or strengthen.
CONCEDE|To admit, often grudgingly, that something is true.
DIGRESS|To wander off topic.
EVASIVE|Dodges giving a straight answer.
OPULENT|Rich and lavish.
PARODY|An imitation made to mock.
REVERE|To hold in the deepest respect.
SCOURGE|Something that causes widespread suffering.
SERENE|Calm and peaceful.
STIGMA|A mark of shame attached to something.
DISDAIN|The feeling that something is beneath you.
INFAMY|A reputation for all the wrong reasons.
MEDIATE|To help two sides reach an agreement.
AMBIGUOUS|Open to more than one reading.
AMBIVALENT|Pulled both ways by mixed feelings.
ALLEVIATE|To make pain or trouble easier to bear.
COHERENT|Logical and consistent; it all hangs together.
COMPLACENT|Too satisfied to notice the danger ahead.
CONSENSUS|Broad agreement among a group.
CONTRITE|Truly sorry for having done wrong.
DISCREET|Careful to keep things private.
ELOQUENT|Fluent and moving in speech or writing.
FEASIBLE|Possible to actually pull off.
FRIVOLOUS|Silly and not serious.
IMPARTIAL|Fair, favoring no side.
INHERENT|Built into the very nature of something.
METICULOUS|Extremely careful about every small detail.
MITIGATE|To make something less severe.
OBSOLETE|Out of date and no longer used.
PLAUSIBLE|Sounds reasonable; could well be true.
POIGNANT|Sharply touching, stirring sadness or regret.
PRAGMATIC|Practical; focused on what actually works.
PROLIFIC|Producing a great deal.
QUANDARY|A state of not knowing what to do.
RELUCTANT|Unwilling and hesitant.
RESILIENT|Bounces back after hard times.
SCRUTINY|Close, critical examination.
SKEPTICAL|Doubtful until shown proof.
SPORADIC|Happening now and then, at irregular times.
STAGNANT|Still and stale; going nowhere.
SUCCINCT|Brief and clearly put.
TANGIBLE|Real enough to touch.
TENACIOUS|Holds on firmly and refuses to quit.
UNANIMOUS|With everyone in full agreement.
VIGILANT|Watchful for danger or trouble.
VOLATILE|Liable to change suddenly and explosively.
WHIMSICAL|Playfully odd or fanciful.
CONTINGENCY|A backup plan for something that might happen.
DETERRENT|Something that discourages an action.
EXPEDITE|To speed up a process.
INCENTIVE|A reward that spurs you to act.
INTUITIVE|Easy to grasp without being taught.
LETHARGIC|Sluggish and short on energy.
MALLEABLE|Easily shaped or influenced.
PARADIGM|A model for how things are done.
PRECEDENT|An earlier case that sets the example.
REDUNDANT|No longer needed, since something else does the job.
SUPERFICIAL|Only skin deep; shallow.
CATALYST|Something that sparks or speeds up change.
RETICENT|Reluctant to share thoughts or feelings.
VINDICATE|To clear someone of blame or suspicion.
OBLIVIOUS|Completely unaware of what's going on around you.
MEDIOCRE|Only average; not very good.
INDIFFERENT|Not caring one way or the other.`,
  h: `BANAL|Painfully ordinary; lacking any originality.
ENNUI|A weary, listless boredom.
GAFFE|An embarrassing social blunder.
NADIR|The lowest point of all.
PITHY|Short but packed with meaning.
SURLY|Bad-tempered and unfriendly.
VAPID|Dull and lacking substance.
DROLL|Amusing in a dry, odd way.
INURE|To get someone used to something unpleasant.
QUAFF|To drink heartily.
STAID|Sedate, respectable, and unadventurous.
USURP|To seize power or a place without right.
VENAL|Open to bribery.
WILY|Crafty at tricking others.
ABHOR|To hate with disgust.
ACRID|Sharp and bitter to smell or taste.
CAVIL|To raise petty objections.
FETID|Smelling foul.
LIVID|Furiously angry.
OPINE|To offer your view on something.
PIQUE|A flash of irritation from wounded pride.
AVER|To state firmly as fact.
AUGUR|To foretell what's coming.
MIRTH|Laughter and lighthearted fun.
TRYST|A secret romantic meeting.
AMITY|Friendly relations between people or nations.
SCION|A descendant of a notable family.
FLOUT|To openly disregard a rule.
ACUMEN|Sharp judgment, especially in business.
APLOMB|Cool self-assurance under pressure.
ARDUOUS|Hard, tiring, and long.
CAJOLE|To coax someone with flattery.
CAUSTIC|Bitingly sarcastic; or able to burn.
COGENT|Clear, logical, and convincing.
DEARTH|A scarcity or lack.
ERUDITE|Deeply learned.
ERSATZ|A poor imitation or substitute.
FATUOUS|Silly and pointless.
FOIBLE|A minor flaw of character.
GAUCHE|Socially awkward.
LACONIC|Using very few words.
MAUDLIN|Tearfully sentimental.
MOLLIFY|To soothe someone's anger.
NASCENT|Just beginning to exist.
PARIAH|An outcast.
PLACID|Calm and not easily upset.
RANCOR|Long-held bitterness.
RIBALD|Rudely humorous.
SORDID|Dirty or dishonorable.
TORPID|Sluggish and inactive.
TRUISM|A statement so obviously true it's hardly worth saying.
UMBRAGE|Offense or annoyance.
ZENITH|The highest point.
ASCETIC|Living by strict self-denial.
BUCOLIC|Of the countryside; rustic.
CALLOW|Young and inexperienced.
INSIPID|Flavorless; lacking interest.
JOCULAR|Fond of joking.
LAMBAST|To criticize harshly.
PALTRY|Pitifully small.
PEDANT|Someone overly fussy about small rules.
RAUCOUS|Loud and harsh.
VACUOUS|Empty-headed.
WISTFUL|Longing with a hint of sadness.
CHAGRIN|Annoyance mixed with embarrassment.
CAPRICE|A sudden change of mind.
PROBITY|Strong moral uprightness.
DEMURE|Reserved and modest in manner.
HAPLESS|Unlucky.
ALACRITY|Brisk and cheerful readiness.
ANATHEMA|Something deeply detested.
BELLICOSE|Eager to fight.
CAPRICIOUS|Given to sudden changes of mood.
CIRCUMSPECT|Careful to consider every consequence.
CLANDESTINE|Kept secret, often for shady reasons.
DELETERIOUS|Causing harm or damage.
DILETTANTE|A dabbler without real commitment.
EBULLIENT|Bubbling over with cheerful energy.
EGREGIOUS|Shockingly bad.
EPHEMERAL|Lasting a very short time.
EQUANIMITY|Calm composure under stress.
EXACERBATE|To make a bad situation worse.
FASTIDIOUS|Exacting about detail; hard to please.
GARRULOUS|Talks too much about trivial things.
GREGARIOUS|Loves company; sociable.
IDIOSYNCRASY|A peculiar personal habit.
IMPETUOUS|Acts quickly without thinking.
INEFFABLE|Too great to be put into words.
INSIDIOUS|Spreading harm gradually and quietly.
INTRANSIGENT|Refusing to budge on one's views.
LOQUACIOUS|Very talkative.
MAGNANIMOUS|Generous and forgiving, especially toward a rival.
MERCURIAL|Prone to sudden swings of mood.
NEFARIOUS|Wicked and criminal.
OBSEQUIOUS|Too eager to please or obey.
OSTENTATIOUS|Showy, designed to impress.
PERFUNCTORY|Done as a routine chore, with minimal effort.
PERNICIOUS|Quietly and steadily harmful.
PETULANT|Childishly sulky.
QUIXOTIC|Idealistic to the point of being impractical.
RECALCITRANT|Stubbornly resisting authority.
SANGUINE|Cheerfully optimistic, even when things look bad.
SARDONIC|Grimly mocking.
SERENDIPITY|A happy accident.
SYCOPHANT|A flatterer seeking favor.
TACITURN|Reserved and saying little.
TRUCULENT|Eager to argue or fight.
UBIQUITOUS|Seemingly everywhere at once.
VICARIOUS|Experienced secondhand, through someone else.
VITRIOLIC|Filled with bitter, biting criticism.
OBSTINATE|Stubbornly refusing to change.
PRESCIENT|Seeing what's coming before others do.
JUXTAPOSE|To place side by side for contrast.
OBFUSCATE|To make deliberately unclear.
PLATITUDE|A dull, overused remark.
PROCLIVITY|A natural tendency.
SUPERCILIOUS|Behaving as if everyone else is beneath you.
UNCTUOUS|Oily and excessively flattering.
ACQUIESCE|To accept something reluctantly, without protest.
ESOTERIC|Understood only by a select few.
MUNIFICENT|Lavishly generous.`
};

const WORDS = [];
for (const d of ["e", "m", "h"]) for (const line of VOCAB[d].split("\n")) {
  const [raw, hint] = line.split("|"), w = (raw || "").trim().toUpperCase();
  if (/^[A-Z]{4,12}$/.test(w) && hint && !WORDS.some(x => x.w === w)) WORDS.push({ w, hint: hint.trim(), d });
}

const LEN_RANGE = { short: [4, 5], medium: [6, 7], long: [8, 12], any: [4, 12] };
const DIFF_POOL = { easy: ["e"], medium: ["e", "m"], hard: ["m", "h"] };
const recentWords = [];

function pickWord(lenKey, diff) {
  const [lo, hi] = LEN_RANGE[lenKey] || LEN_RANGE.any;
  const pools = DIFF_POOL[diff] || DIFF_POOL.medium;
  const inLen = x => x.w.length >= lo && x.w.length <= hi;
  // each level leans on its own list and now and then borrows from the one below
  const prefer = diff === "hard" ? "h" : diff === "easy" ? "e" : "m";
  let cands = WORDS.filter(x => inLen(x) && x.d === prefer && !recentWords.includes(x.w));
  if (cands.length < 3 || Math.random() < 0.2) {
    cands = WORDS.filter(x => inLen(x) && pools.includes(x.d) && !recentWords.includes(x.w));
  }
  if (!cands.length) cands = WORDS.filter(x => inLen(x));
  if (!cands.length) cands = WORDS;
  const pick = cands[Math.floor(Math.random() * cands.length)];
  recentWords.push(pick.w);
  if (recentWords.length > 40) recentWords.shift();
  return pick;
}

// the host's lines. A round never repeats one (at most 9 hits and 10 misses can come up in a round, so each pool holds more than that),
// and lines heard last round are passed over while fresher ones remain
const QUIPS = {
  intro: ["Spell it out, partner.", "Talk fast, stranger.", "Step right up. A man's neck rides on this.", "Pick your letters careful now."],
  hit: ["Well, I'll be damned.", "Keep talkin', partner.", "Rope's stayin' hungry.", "Lucky guess. Do it again.", "Now that's sharp shootin'.", "He might see sunrise yet.",
        "Hot damn, that's one.", "The preacher can wait.", "The crowd don't like that.", "That'll buy him a minute.", "Well, look at you go.", "Right on the money."],
  miss: ["That's a damn shame.", "Undertaker's grinnin'.", "Rope's gettin' thirsty.", "Hell's bells, partner.", "Somebody fetch the preacher.", "He's sweatin' bullets now.",
         "Wrong, and he knows it.", "Buzzards are circlin'.", "That knot's gettin' tighter.", "Crowd's lovin' this.", "Ooh, that'll cost him.", "Not even close, stranger."],
  hint: ["Last chance. Look at the top.", "One more miss and he swings. Read the top.", "Fine. Look at the top."],
  lose: ["Should've picked another letter.", "Folks came for a hangin'. They got one.", "Dig a hole out back, boys.", "The rope don't forgive."],
  win: ["Go on, git. Before I change my mind.", "Ride on, you lucky son of a gun.", "Rope goes home empty tonight.", "Buy that stranger a whiskey!"]
};
const QUIP_SAID = new Set(); let QUIP_LAST = new Set();
function quipNewRound() { QUIP_LAST = new Set(QUIP_SAID); QUIP_SAID.clear(); }
function pickQuip(k) {
  let c = (QUIPS[k] || []).filter(q => !QUIP_SAID.has(q)); if (!c.length) return null; // never the same line twice in a round
  const fresh = c.filter(q => !QUIP_LAST.has(q)); if (fresh.length) c = fresh;
  const q = c[Math.floor(Math.random() * c.length)]; QUIP_SAID.add(q); return q;
}
// the host's recorded line for each subtitle: text -> [file id, seconds]; files are <kind><index>.mp3 in QUIPS order
const VOICE_SEC = {
  intro: [2.13, 1.87, 3.79, 2.27], hit: [2.49, 1.75, 2.81, 2.59, 2.29, 3.24, 2.53, 1.87, 2.07, 1.83, 3.24, 1.95],
  miss: [2.07, 2.27, 2.21, 3.04, 2.35, 3.16, 2.79, 2.22, 2.32, 2.78, 2.65, 2.49], hint: [3.21, 3.69, 2.99], lose: [2.41, 3.75, 2.91, 2.51], win: [3.52, 3.84, 3.21, 2.22]
};
const VOICE_LINES = {}; for (const k in QUIPS) QUIPS[k].forEach((q, i) => VOICE_LINES[q] = [k + i, (VOICE_SEC[k] || [])[i] || 1.6]);
// the host during the shootout at the gallows (12d)
const SIEGE_LINES = { start: "He cut him down! Shoot that stranger!", win: "Go on, git. Before I change my mind.", lose: "Should've minded your own business, stranger." }; // (he walks out alive: the host lets him go)
// the first round after the page loads opens with a nudge toward the game's secret (the bell, 12f), then the usual intro
const MYSTERY_LINE = "There's more to this game than you think. Find the mystery."; VOICE_LINES[MYSTERY_LINE] = ["mystery0", 3.87];
VOICE_LINES[SIEGE_LINES.start] = ["siege0", 2.73]; VOICE_LINES[SIEGE_LINES.lose] = ["siege2", 3.18]; // (the win line is the host's own "Go on, git")
