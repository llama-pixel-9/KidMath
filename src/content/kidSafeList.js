/**
 * The kid-safe list (plan: "a dedicated check on every item, hint, object,
 * name and setting"). Every v2 item, hint, object name and setting is scanned
 * against it; a hit fails a v2 item and warns on a v1 row (the live v1 bank
 * was scanned separately).
 *
 * Precision matters more than reach: a check that flags "dice", "tug-of-war"
 * or "a basketball shot" gets ignored. So:
 *   - terms match whole words only, case-insensitive, listed with their
 *     inflections rather than stemmed (a stem broad enough to catch "killing"
 *     also catches "skilling");
 *   - a multi-word term is a phrase ("home alone") — ambiguous single words
 *     are listed as the unsafe phrase, never bare ("box of matches", not
 *     "matches", which every "which equation matches?" would trip);
 *   - ALLOWLIST holds the known-safe uses of a listed word — a game die,
 *     tug-of-war, a target as a goal, a shot in basketball — as regexes; a
 *     hit inside an allowed span is dropped.
 *
 * Pure, so the native engine and Node scripts can bundle it.
 */

/** Category -> terms. A term with a space is a phrase; all are whole-word. */
export const KID_SAFE_TERMS = Object.freeze({
  weapons: [
    "gun", "guns", "rifle", "rifles", "pistol", "pistols", "shotgun", "shotguns", "handgun", "handguns",
    "revolver", "revolvers", "bullet", "bullets", "ammo", "ammunition", "firearm", "firearms",
    "knife", "knives", "dagger", "daggers", "sword", "swords", "machete", "spear", "spears",
    "bomb", "bombs", "grenade", "grenades", "missile", "missiles", "explosive", "explosives",
    "weapon", "weapons", "pepper spray", "taser",
    "shot", "shots", "shoot", "shoots", "shooting", "shooter", "gunshot", "gunshots", "gunfire",
  ],
  violence: [
    "kill", "kills", "killed", "killing", "killer", "murder", "murders", "murdered", "murderer",
    "die", "dies", "died", "dying", "dead", "death", "deaths", "deadly",
    "funeral", "funerals", "grave", "graves", "graveyard", "cemetery", "coffin", "suicide",
    "stab", "stabs", "stabbed", "stabbing", "punch", "punches", "punched", "punching",
    "fight", "fights", "fought", "fighting", "war", "wars", "attack", "attacks", "attacked", "attacking",
    "beat up", "beats up", "beaten up", "slap", "slaps", "slapped", "bully", "bullies", "bullied", "bullying",
    // "wound" is left out: a wind-up toy's key is wound.
    "wounded", "torture", "tortured", "hostage", "hostages", "terrorist", "terrorists",
    "strangle", "strangled", "choke", "chokes", "choked", "abuse", "abused", "violent", "violence",
  ],
  substances: [
    "beer", "beers", "wine", "wines", "vodka", "whiskey", "whisky", "rum", "gin", "tequila", "liquor",
    "alcohol", "alcoholic", "champagne", "cocktail", "cocktails", "drunk", "drunken", "hangover",
    "cigarette", "cigarettes", "cigar", "cigars", "tobacco", "vape", "vapes", "vaping", "nicotine",
    "marijuana", "weed", "cocaine", "heroin", "meth", "opioid", "opioids", "drugs", "drug dealer",
    "overdose", "smokes", "smoking",
  ],
  gambling: [
    "casino", "casinos", "poker", "blackjack", "bet", "bets", "betting", "wager", "wagers",
    "lottery", "lotto", "slot machine", "slot machines", "jackpot", "roulette",
    "gamble", "gambles", "gambling", "scratch-off", "scratch-offs", "bookie",
  ],
  bodyWeight: [
    "diet", "diets", "dieting", "calorie", "calories", "lose weight", "loses weight", "losing weight",
    "weight loss", "fat", "skinny", "obese", "overweight", "chubby",
  ],
  romance: [
    "kiss", "kisses", "kissed", "kissing", "boyfriend", "boyfriends", "girlfriend", "girlfriends",
    "dating", "on a date", "crush on", "has a crush", "in love", "falls in love", "fell in love",
    "romantic", "romance", "sexy", "sex", "honeymoon", "flirt", "flirts", "flirting",
  ],
  religion: [
    "church", "churches", "mosque", "mosques", "temple", "temples", "synagogue", "synagogues", "chapel",
    "cathedral", "bible", "bibles", "quran", "koran", "torah", "pray", "prays", "prayed", "praying",
    "prayer", "prayers", "god", "gods", "goddess", "jesus", "christ", "allah", "buddha",
    "priest", "priests", "pastor", "rabbi", "imam", "nun", "nuns", "baptism", "communion",
    "heaven", "hell", "devil", "satan", "holy", "sermon", "worship", "hymn", "hymns", "crucifix",
    "rosary", "menorah", "nativity",
  ],
  politics: [
    "democrat", "democrats", "republican", "republicans", "liberal", "liberals", "conservative",
    "conservatives", "political", "politics", "politician", "politicians", "congress", "senator",
    "senators", "senate", "parliament", "president", "presidents", "prime minister", "protest",
    "protests", "protesters", "impeach", "border wall", "trump", "biden", "obama",
  ],
  scary: [
    "zombie", "zombies", "vampire", "vampires", "haunted", "nightmare", "nightmares", "horror",
    "terrifying", "blood", "bloody", "corpse", "corpses", "ghost", "ghosts", "monster", "monsters",
    "demon", "demons", "creepy", "scream", "screams", "screamed", "screaming", "skull", "skulls",
    "kidnap", "kidnapped", "kidnapping", "abducted",
  ],
  unsafeAlone: [
    "home alone", "alone at home", "left alone", "swims alone", "swim alone", "swimming alone",
    "alone in the pool", "fireworks", "firecracker", "firecrackers", "chainsaw", "bleach", "poison",
    "pills", "sleeping pills", "climbs onto the roof", "climbed onto the roof", "climb onto the roof",
    "climbs on the roof", "climbed on the roof", "climb on the roof", "climbs the roof", "hitchhike",
    "hitchhikes", "hitchhiking", "stranger", "strangers", "box of matches", "book of matches",
    "lights a match", "light a match", "lit a match", "strike a match", "strikes a match",
    "struck a match", "plays with matches", "playing with matches", "play with matches",
    "cigarette lighter",
  ],
  putDowns: [
    "stupid", "dumb", "dumber", "dumbest", "dummy", "idiot", "idiots", "moron", "morons", "loser",
    "losers", "ugly", "fatso", "retard", "retarded", "sissy", "crybaby", "freak", "freaks", "weirdo",
    "lame", "shut up", "like a girl", "for boys only", "for girls only", "girls can't", "boys can't",
    "boys don't cry",
  ],
  brands: [
    "lego", "legos", "nintendo", "xbox", "playstation", "pokemon", "pokémon", "barbie", "barbies",
    "minecraft", "roblox", "fortnite", "disney", "mcdonald's", "mcdonalds", "starbucks", "walmart",
    "target", "amazon", "iphone", "iphones", "ipad", "ipads", "google", "youtube", "tiktok", "netflix",
    "instagram", "snapchat", "facebook", "oreo", "oreos", "skittles", "m&m", "m&ms", "m&m's",
    "cheerios", "doritos", "coca-cola", "coke", "cokes", "pepsi", "nike", "adidas", "hot wheels",
    "nerf", "play-doh", "playdoh", "crayola", "sharpie", "sharpies", "kleenex", "jell-o", "jello",
    "kool-aid", "gatorade", "happy meal", "happy meals", "chick-fil-a", "dunkin", "krispy kreme",
    "pop-tart", "pop-tarts", "lunchables", "hershey", "hershey's", "kit kat", "snickers", "twix",
    "reese's", "nutella", "pringles", "jenga", "monopoly", "star wars", "marvel", "spider-man",
    "spiderman", "batman", "superman", "paw patrol", "peppa pig", "bluey", "hello kitty",
    "squishmallow", "squishmallows", "beyblade", "beyblades", "hatchimals", "shopkins", "furby",
    "tamagotchi", "uber", "lyft", "tesla", "toyota", "honda", "dollar tree", "dollar general",
    "costco", "kroger", "publix", "trader joe's", "whole foods", "7-eleven", "pizza hut",
    "taco bell", "wendy's", "burger king", "kfc", "chipotle",
  ],
});

/**
 * Personal-data shapes: a phone number, a street address, an email, a web
 * address, a social security number. Matched as patterns, reported under the
 * `personalData` category with a descriptive term.
 */
export const PERSONAL_DATA_PATTERNS = Object.freeze([
  // Separators are a space, dash or dot on one line: choices joined by newlines
  // ("600\n800\n1000") are not a phone number.
  { term: "phone number", re: /(?:\(\d{3}\) ?|\b\d{3}[-. ])\d{3}[-. ]\d{4}\b/g },
  { term: "social security number", re: /\b\d{3}-\d{2}-\d{4}\b/g },
  {
    term: "street address",
    re: /\b\d{1,5}\s+(?:[A-Z][a-z]+\s+){1,3}(?:Street|St\.|Avenue|Ave\.|Road|Rd\.|Lane|Ln\.|Drive|Dr\.|Boulevard|Blvd\.|Court|Ct\.|Way|Place|Pl\.)(?=[\s.,;:!?]|$)/g,
  },
  { term: "email address", re: /\b[\w.+-]+@[\w-]+\.[\w.-]+\b/g },
  { term: "web address", re: /\b(?:https?:\/\/|www\.)\S+/gi },
]);

/**
 * Known-safe uses of listed words. A term hit that lies inside a span one of
 * these matches is not a hit. Each entry says which listed sense it clears.
 */
export const KID_SAFE_ALLOWLIST = Object.freeze([
  // A game die: "one die", "a six-sided die", "the die shows 4", "rolls a die".
  /\b(?:a|an|one|the|each|every|another|this|that|his|her|their|my|your|our|first|second|other|same|sided|game|number|dotted|red|blue|green|white|black|\d+)[- ]die\b/giu,
  /\bdie\s+(?:shows?|showed|lands?|landed|rolls?|rolled|has|comes?|came|faces?)\b/giu,
  /\b(?:rolls?|rolled|rolling|toss(?:es|ed)?|throws?|threw|picks? up)\s+(?:\w+\s+){0,2}die\b/giu,
  // Tug-of-war is a playground game.
  /\btug[- ]of[- ]war\b/giu,
  // A dead battery or a dead end, not a death.
  /\b(?:battery|batteries|phone|tablet|remote|flashlight)\s+(?:is|was|are|were|went|goes?)\s+dead\b/giu,
  /\bdead\s+(?:battery|batteries|end|ends|leaf|leaves|branch|branches)\b/giu,
  // A shot in a sport (or of a camera, or from the nurse).
  /\b(?:basketball|jump|free[- ]throw|hockey|soccer|three[- ]point(?:er)?|layup|lay-up|bank|foul|penalty|slap|corner|goal|arrow|archery|bow|golf|tennis|lacrosse|hoop|trick|half-court|long|short|good|great|best|first|last|next|each|every|per|more|fewer|flu|vaccine|booster|allergy|\d+)\s+shots?\b/giu,
  /\bshots?\s+(?:on goal|at the (?:hoop|basket|net|goal|rim)|from the (?:free[- ]throw|three[- ]point|foul) line|in a row|out of \d+|of \d+)\b/giu,
  /\b(?:made|makes?|making|miss(?:ed|es)?|missing|took|takes?|taking|scored?|scores|attempt(?:ed|s)?|sank|sinks?|sunk|blocks?|blocked|counts?|counted|lands?|landed|hits?)\s+(?:\w+\s+){0,2}shots?\b/giu,
  /\bshoots?\s+(?:hoops|baskets|free throws|the ball|a basket|at the (?:hoop|basket|net|goal|rim)|for goal|(?:\w+\s+)?(?:pictures?|photos?|a video|videos?))\b/giu,
  /\bshooting\s+(?:hoops|baskets|free throws|star|stars|guard|percentage|the ball|at the (?:hoop|basket|net|goal|rim))\b/giu,
  // A target as a goal or a game piece, not the store. The goal is written
  // in lower case ("the target is 100 visitors"); the store keeps its
  // capital mid-sentence ("drives to Target"), so these are case-sensitive
  // apart from a sentence that starts with the goal.
  /\btarget\s+(?:number|score|total|time|amount|weight|distance|length|height|of|is|was|for|to|board|game)\b/gu,
  /(?:^|[.!?]\s+)Target\s+(?:number|score|total|time|amount|of|is|was|for)\b/gu,
  /\b(?:the|a|an|her|his|their|its|my|our|your|new|daily|weekly|reading|savings|step|point|points|goal|sales|fundraising|class|team|circle|paper|round|bullseye|dart|archery|beanbag|bean bag|ring toss)\s+target\b/gu,
  /\b(?:reach(?:ed|es|ing)?|hits?|meets?|met|beats?|sets?|below|above|under|over|past|toward|towards|at|on)\s+(?:the |a |her |his |their |its |my |our |your )?target\b/gu,
  // Fruit punch, a hole punch, and punching in a time or a code.
  /\b(?:fruit|party|holiday|tropical|pink|red|orange|hole|paper|ticket|card)\s+punch(?:es)?\b/giu,
  /\b(?:of|the|some|more|less|cups? of|glass(?:es)? of|liters? of|litres? of|ml of|bowl of)\s+punch\b/giu,
  /\bpunch(?:es|ed)?\s+(?:bowls?|cards?|holes?|a hole|\d+ holes|tickets?|in\b|the (?:numbers?|code|time|buttons?|keys?))/giu,
  // Light or water shooting out of something.
  /\b(?:beam|light|water|fountain|sprinkler|geyser|lava|steam|confetti|sparks?|flames?)\s+shooting\b/giu,
  /\bshooting\s+(?:up|out|across|through|from|into|over)\b/giu,
  // A snowball or pillow fight.
  /\b(?:snowball|pillow|water[- ]balloon|water)\s+fights?\b/giu,
  // A garden weed.
  /\b(?:pull(?:s|ed|ing)?|garden|yard|dandelion|tall|green|a|one|each|the|that|this)\s+weeds?\b/giu,
  /\bweeds?\s+(?:in|from|grows?|growing|out of)\b/giu,
  // The river and the rainforest.
  /\bamazon\s+(?:river|rainforest|rain forest|jungle|basin)\b/giu,
  // A class president; a class or school election is never listed.
  /\b(?:class|student council|student-council|club|team|school)\s+president\b/giu,
  /\bpresident\s+of\s+the\s+(?:class|club|student council|team)\b/giu,
  // Root beer and ginger beer; gin rummy.
  /\b(?:root|ginger)\s+beer\b/giu,
  /\bgin\s+rummy\b/giu,
  // A toy or tool gun.
  /\b(?:water|squirt|bubble|glue|hot glue)\s+guns?\b/giu,
  // A butter knife.
  /\b(?:butter|plastic)\s+kni(?:fe|ves)\b/giu,
  // A paper monster or a monster truck.
  /\b(?:paper|cardboard|cookie|friendly|cute|fuzzy|felt|sock|puppet|stuffed|clay|pretend|silly)\s+monsters?\b/giu,
  /\bmonster\s+(?:trucks?|costumes?|puppets?|drawings?|cookies?)\b/giu,
  // "I bet" is kid talk, not a wager.
  /\bI\s+bet\b/gu,
]);

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// One regex per category, longest terms first so a phrase ("drug dealer")
// is reported as itself rather than as the word inside it. Whole-word: the
// term may not touch a letter or digit on either side (apostrophes and
// hyphens inside a term are literal). The u flag keeps "pokémon" whole.
const CATEGORY_RES = Object.entries(KID_SAFE_TERMS).map(([category, terms]) => {
  const sorted = [...terms].sort((a, b) => b.length - a.length || a.localeCompare(b));
  return {
    category,
    re: new RegExp(`(^|[^\\p{L}\\p{N}])(${sorted.map(escapeRe).join("|")})(?![\\p{L}\\p{N}])`, "giu"),
  };
});

function allowedSpans(text) {
  const spans = [];
  for (const re of KID_SAFE_ALLOWLIST) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(text)) !== null) {
      spans.push([m.index, m.index + m[0].length]);
      if (m[0].length === 0) re.lastIndex += 1;
    }
  }
  return spans;
}

const inside = (spans, start, end) => spans.some(([a, b]) => start >= a && end <= b);

/**
 * Every listed term or personal-data pattern in `text`, as [{ term,
 * category }] in reading order, one entry per distinct term. Empty when the
 * text is clean. Case-insensitive, whole words, allowlist applied.
 */
export function findKidSafeHits(text) {
  if (typeof text !== "string" || !text) return [];
  const spans = allowedSpans(text);
  const found = [];
  const seen = new Set();
  const add = (index, term, category) => {
    const key = `${category}:${term.toLowerCase()}`;
    if (seen.has(key)) return;
    seen.add(key);
    found.push({ index, term, category });
  };
  for (const { category, re } of CATEGORY_RES) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(text)) !== null) {
      const start = m.index + m[1].length;
      const end = start + m[2].length;
      if (!inside(spans, start, end)) add(start, m[2].toLowerCase(), category);
      if (m[0].length === 0) re.lastIndex += 1;
    }
  }
  for (const { term, re } of PERSONAL_DATA_PATTERNS) {
    re.lastIndex = 0;
    const m = re.exec(text);
    if (m) add(m.index, term, "personalData");
  }
  return found.sort((a, b) => a.index - b.index).map(({ term, category }) => ({ term, category }));
}
