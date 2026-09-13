/**
 * The Meadow — home of Counting & Numbers, and the island's front door.
 * This module is CONTENT, not code (the shape a `world_defs` row will
 * carry). Coordinates are region-local: x in 0..2048, y on the walkable
 * ground band (810..1130); the scene offsets by the region's x0.
 *
 * Quests follow the intrinsic-integration law (plan principle 1): the math
 * IS the world interaction — counting plank slots, dropping seeds, making
 * ten at the gate. Never "answer 5 questions to continue".
 *
 * Quest step DSL (interpreted by the quest runner):
 *   talk        — NPC line (audio-first; text is support for readers)
 *   countTap    — tap each highlighted thing once; the count pops as you go.
 *                 Un-failable: taps only ever count up. (kishōtenketsu "ki")
 *   pickNumber  — choose among number signs; a wrong pick wobbles and asks
 *                 again — costs time, never progress (plan principle 3)
 *   placeItems  — tap the target N times; each tap places one item with its
 *                 running count
 *   celebrate   — stars + a permanent world change (fixture)
 *
 * The five quests walk kishōtenketsu: bridge = safe intro, seeds/nests =
 * develop, gate = the make-ten twist (and it opens the way to the pond),
 * chicks = joyful conclusion.
 */
export const MEADOW_ZONE = {
  id: "meadow",
  regionId: "meadow",
  spawn: { x: 440, y: 1010 },

  npcs: [
    { id: "robin", name: "Robin", bird: "robin", x: 760, y: 960, size: 118, questId: "bridge", thanks: "My bridge is perfect. You fixed it!", voice: 1 },
    { id: "cardinal", name: "Cardinal", bird: "cardinal", x: 1290, y: 1070, size: 112, questId: "seeds", thanks: "The feeder is full. Thank you again!", voice: 2 },
    { id: "blueJay", name: "Blue Jay", bird: "blueJay", x: 1560, y: 930, size: 114, questId: "nests", thanks: "The eggs are cozy. You counted them all!", voice: 3 },
  ],

  objects: {
    // A stream cuts the meadow; the bridge is a row of plank slots across it.
    bridge: { x: 1010, y: 1000, slots: 6, present: 2, fixture: "bridgeFixed", style: "planks", span: 150 },
    // The bird feeder holds six seeds in its tray.
    feeder: { x: 1180, y: 1010, prop: "feeder", size: 210, capacity: 6, present: 2, fixture: "feederFull", item: "seed" },
    nests: {
      prop: "nestSmall",
      size: 96,
      spots: [
        { x: 1430, y: 850 },
        { x: 1580, y: 838 },
        { x: 1720, y: 862 },
      ],
      eggsPer: 2,
      fixture: "nestsFull",
    },
    // The gate in the hedge at the far end — a full ten frame swings it open
    // and lets the mist beyond roll back.
    gate: { x: 1930, y: 985, prop: "fence", size: 190, tenFrameFilled: 7, fixture: "gateOpen", questId: "gate" },
    chicks: {
      bird: "condorChick",
      size: 62,
      label: "chicks",
      homeNpcId: "robin",
      spots: [
        { x: 190, y: 870 },
        { x: 640, y: 1112 },
        { x: 1120, y: 856 },
        { x: 1660, y: 1104 },
        { x: 1380, y: 940 },
      ],
      fixture: "chicksFound",
    },
  },

  // ------------------------------------------------ ownership (plan Phase 3)
  // The home nest by the front door: the pet egg lives here, decorations
  // bought with stars appear in fixed slots. Premium-only items are simply
  // absent from the child's shop when the family isn't subscribed —
  // cosmetic breadth is the membership perk, and nothing child-facing ever
  // upsells (principle 5).
  home: {
    x: 300,
    y: 1095,
    shop: [
      { id: "nestbox", name: "Nest Box", prop: "nestbox", size: 150, cost: 5, x: 150, y: 1000 },
      { id: "hedge", name: "Cozy Hedge", prop: "hedgeL", size: 170, cost: 8, x: 60, y: 1120 },
      { id: "rocks", name: "Sunning Rocks", prop: "rocks", size: 120, cost: 8, x: 520, y: 1120 },
      { id: "sign", name: "Welcome Sign", prop: "sign", size: 130, cost: 12, x: 560, y: 1010 },
      { id: "fancyFence", name: "Garden Fence", prop: "fence", size: 150, cost: 10, x: 330, y: 1150, premium: true },
      { id: "grandTree", name: "Shade Tree", prop: "tree", size: 300, cost: 15, x: 200, y: 900, premium: true },
    ],
  },

  // Collectible feathers hidden around the region — spotting games between
  // quests. Art is the existing feather badge set.
  feathers: [
    // The first tap of the game: two hops from where the skylark lands.
    { id: "welcomeFeather", art: "comeback5", x: 660, y: 1050 },
    { id: "sunFeather", art: "firstSession", x: 1400, y: 830 },
    { id: "songFeather", art: "perfectRound", x: 95, y: 905 },
    { id: "cloudFeather", art: "streak3", x: 1840, y: 1122 },
  ],

  // The seed plot by the feeder: plant today, sprout tomorrow, bloom the day
  // after — the "come back tomorrow" hook as growth, never streak guilt.
  seedPlot: { x: 1320, y: 1125 },

  quests: [
    {
      id: "bridge",
      npcId: "robin",
      steps: [
        { type: "talk", line: "My bridge is broken! Some planks are missing." },
        { type: "countTap", line: "Tap each empty spot so we can count them!", targets: "bridge-slots" },
        { type: "pickNumber", line: "How many planks do we need?", options: [3, 4, 5], answer: 4, hint: { target: "bridge", mode: "empty" } },
        { type: "placeItems", line: "Tap the bridge to lay each plank!", target: "bridge", count: 4 },
        { type: "celebrate", line: "You fixed my bridge! Thank you!", stars: 3, fixture: "bridgeFixed" },
      ],
    },
    {
      id: "seeds",
      npcId: "cardinal",
      steps: [
        { type: "talk", line: "The feeder holds six seeds. I only found two." },
        { type: "pickNumber", line: "How many more seeds do we need?", options: [3, 4, 6], answer: 4, hint: { target: "feeder", mode: "empty" } },
        { type: "placeItems", line: "Tap the feeder to drop each seed in!", target: "feeder", count: 4 },
        { type: "celebrate", line: "Six seeds! Every bird eats today!", stars: 3, fixture: "feederFull" },
      ],
    },
    {
      id: "nests",
      npcId: "blueJay",
      steps: [
        { type: "talk", line: "Three nests, and every nest needs two eggs." },
        { type: "placeItems", line: "Tap each nest to tuck the eggs in!", target: "nests", count: 6 },
        { type: "pickNumber", line: "How many eggs did you tuck in all together?", options: [5, 6, 7], answer: 6, hint: { target: "nests", mode: "eggs" } },
        { type: "celebrate", line: "Two and two and two. Six warm eggs!", stars: 3, fixture: "nestsFull" },
      ],
    },
    {
      id: "gate",
      npcId: null, // the gate itself asks — the skylark reads it out
      steps: [
        { type: "talk", line: "The old gate only opens for a full ten frame." },
        { type: "pickNumber", line: "Seven dots are lit. How many more make ten?", options: [2, 3, 4], answer: 3, hint: { target: "gate", mode: "unlit" } },
        { type: "placeItems", line: "Tap the gate to light each dot!", target: "gate", count: 3 },
        { type: "celebrate", line: "Ten! The gate swings open!", stars: 4, fixture: "gateOpen" },
      ],
    },
    {
      id: "chicks",
      npcId: "robin",
      requiresFixture: "bridgeFixed", // the chicks wandered over the bridge
      steps: [
        { type: "talk", line: "The chicks wandered off across your new bridge!" },
        { type: "countTap", line: "Find every chick and tap it!", targets: "chicks" },
        { type: "pickNumber", line: "How many chicks did you find?", options: [4, 5, 6], answer: 5, hint: { target: "chicks", mode: "found" } },
        { type: "celebrate", line: "All five chicks are safe. You are a hero!", stars: 5, fixture: "chicksFound" },
      ],
    },
  ],
};

export const STEP_TYPES = ["talk", "countTap", "pickNumber", "placeItems", "celebrate"];
