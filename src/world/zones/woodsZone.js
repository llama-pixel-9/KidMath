/**
 * The Woods — Multiply & Divide. Same object vocabulary, and the math
 * register moves to equal groups: rows of acorns, eggs shared equally,
 * planks in bundles. Every question is still the fix/feed/open action.
 */
export const WOODS_ZONE = {
  id: "woods",
  regionId: "woods",
  spawn: { x: 260, y: 1020 },

  npcs: [
    { id: "wren", name: "House Wren", bird: "houseWren", x: 700, y: 950, size: 100, questId: "logBridge", thanks: "Bundles of two, every time. Thanks!", voice: 7 },
    { id: "chickadee", name: "Chickadee", bird: "chickadee", x: 520, y: 1110, size: 96, questId: "acornRows", thanks: "Four rows of three. What a pantry!", voice: 8 },
    { id: "woodpecker", name: "Woodpecker", bird: "downyWoodpecker", x: 1720, y: 860, size: 108, questId: "shareEggs", thanks: "Every nest got its fair share.", voice: 9 },
  ],

  objects: {
    // A log bridge over the gully; planks arrive in bundles of two.
    bridge: { x: 1010, y: 1000, slots: 8, present: 2, fixture: "logBridgeFixed", style: "logs", span: 170 },
    // The chickadee's pantry log: twelve acorns in four rows of three.
    feeder: { x: 380, y: 1120, prop: "log", size: 128, capacity: 12, present: 3, fixture: "pantryFull", item: "acorn", rows: 3 },
    nests: {
      prop: "nestSmall",
      size: 92,
      spots: [
        { x: 1340, y: 850 },
        { x: 1490, y: 836 },
        { x: 1640, y: 858 },
        { x: 1830, y: 1010 },
      ],
      eggsPer: 3,
      fixture: "woodsNestsFull",
    },
    gate: { x: 1930, y: 995, prop: "fence", size: 185, tenFrameFilled: 5, fixture: "woodsGateOpen", questId: "woodsGate" },
    chicks: {
      bird: "condorChick",
      size: 60,
      label: "chicks",
      homeNpcId: "wren",
      spots: [
        { x: 160, y: 880 },
        { x: 860, y: 1120 },
        { x: 1180, y: 870 },
        { x: 1560, y: 1110 },
        { x: 1300, y: 1000 },
        { x: 620, y: 830 },
      ],
      fixture: "woodsChicksFound",
    },
  },

  feathers: [
    { id: "mossFeather", art: "comeback5", x: 1120, y: 1122 },
    { id: "barkFeather", art: "peakClimber", x: 1880, y: 850 },
  ],

  quests: [
    {
      id: "logBridge",
      npcId: "wren",
      steps: [
        { type: "talk", line: "The log bridge lost its planks. They come in bundles of two!" },
        { type: "countTap", line: "Tap each empty spot so we know how many planks!", targets: "bridge-slots" },
        { type: "pickNumber", line: "Six planks, two in each bundle. How many bundles?", options: [2, 3, 4], answer: 3, hint: { target: "bridge", mode: "pairs" } },
        { type: "placeItems", line: "Tap the bridge to lay each plank!", target: "bridge", count: 6 },
        { type: "celebrate", line: "Three bundles of two. Six planks. Solid!", stars: 3, fixture: "logBridgeFixed" },
      ],
    },
    {
      id: "acornRows",
      npcId: "chickadee",
      steps: [
        { type: "talk", line: "My pantry log holds four rows of three acorns. I only have three so far." },
        { type: "pickNumber", line: "Four rows of three. How many acorns fill the log?", options: [7, 12, 14], answer: 12, hint: { target: "feeder", mode: "all" } },
        { type: "placeItems", line: "Tap the log to tuck in each acorn!", target: "feeder", count: 9 },
        { type: "celebrate", line: "Four threes make twelve. The pantry is full!", stars: 4, fixture: "pantryFull" },
      ],
    },
    {
      id: "shareEggs",
      npcId: "woodpecker",
      steps: [
        { type: "talk", line: "Twelve eggs, four nests, and every nest gets the same." },
        { type: "pickNumber", line: "Twelve eggs shared into four nests. How many in each nest?", options: [2, 3, 4], answer: 3, hint: { target: "nests", mode: "perNest" } },
        { type: "placeItems", line: "Tap each nest to share the eggs out!", target: "nests", count: 12 },
        { type: "celebrate", line: "Three in every nest. Fair and square!", stars: 4, fixture: "woodsNestsFull" },
      ],
    },
    {
      id: "woodsGate",
      npcId: null,
      steps: [
        { type: "talk", line: "The gate to the cliffs opens for a full ten frame." },
        { type: "pickNumber", line: "Five dots are lit, half the frame. How many more make ten?", options: [4, 5, 6], answer: 5, hint: { target: "gate", mode: "unlit" } },
        { type: "placeItems", line: "Tap the gate to light each dot!", target: "gate", count: 5 },
        { type: "celebrate", line: "Five and five, two equal halves. Ten! The way is open!", stars: 4, fixture: "woodsGateOpen" },
      ],
    },
    {
      id: "woodsChicks",
      npcId: "wren",
      requiresFixture: "logBridgeFixed",
      steps: [
        { type: "talk", line: "The chicks scattered across your new bridge, two by two!" },
        { type: "countTap", line: "Find every chick and tap it!", targets: "chicks" },
        { type: "pickNumber", line: "Six chicks in pairs. How many pairs is that?", options: [2, 3, 4], answer: 3, hint: { target: "chicks", mode: "pairs" } },
        { type: "celebrate", line: "Three pairs, six chicks, all home!", stars: 5, fixture: "woodsChicksFound" },
      ],
    },
  ],
};
