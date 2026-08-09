/**
 * The first walkable island (plan Phase 2): the meadow, home of
 * Counting & Numbers. This module is CONTENT, not code — it is exactly the
 * shape a `world_defs` row will carry, so shipping it from Supabase later is
 * a loader change, not a rewrite.
 *
 * Quests follow the intrinsic-integration law (plan principle 1): the math
 * IS the world interaction — counting plank slots, placing seeds, making
 * ten at the gate. Never "answer 5 questions to continue".
 *
 * Quest step DSL (interpreted by IslandScene's quest runner):
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
 * develop, gate = the make-ten twist, chicks = joyful conclusion.
 */
export const MEADOW_ZONE = {
  id: "meadow",
  islandId: "numbers",
  backdrop: "meadow",
  // Walkable world = the backdrop's native pixels.
  bounds: { width: 2048, height: 1176 },
  spawn: { x: 380, y: 900 },

  npcs: [
    { id: "robin", name: "Robin", art: "/meadow/birds/robin.webp", w: 507, h: 512, x: 620, y: 640, size: 120, questId: "bridge" },
    { id: "cardinal", name: "Cardinal", art: "/meadow/birds/cardinal.webp", w: 456, h: 511, x: 1210, y: 860, size: 115, questId: "seeds" },
    { id: "blueJay", name: "Blue Jay", art: "/meadow/birds/blueJay.webp", w: 512, h: 470, x: 1660, y: 560, size: 115, questId: "nests" },
  ],

  // World objects quests act on. `fixture` names the permanent state a
  // celebrate step flips; fixed objects stay fixed on every revisit.
  objects: {
    bridge: { x: 850, y: 560, slots: 6, present: 2, fixture: "bridgeFixed" },
    feeder: { x: 1330, y: 780, art: "/meadow/props/feeder.webp", w: 302, h: 640, size: 170, capacity: 6, present: 2, fixture: "feederFull" },
    nests: {
      x: 1750, y: 660,
      art: "/meadow/props/nestSmall.webp", w: 320, h: 237, size: 110,
      spots: [
        { x: 1680, y: 690 },
        { x: 1790, y: 640 },
        { x: 1880, y: 700 },
      ],
      eggsPer: 2,
      eggArt: "/meadow/egg/stage0.webp",
      fixture: "nestsFull",
    },
    gate: { x: 420, y: 330, art: "/meadow/props/fence.webp", w: 580, h: 361, size: 200, tenFrameFilled: 7, fixture: "gateOpen" },
    chicks: {
      art: "/meadow/birds/condorChick.webp", w: 452, h: 512, size: 74,
      spots: [
        { x: 260, y: 560 },
        { x: 980, y: 950 },
        { x: 1520, y: 1040 },
        { x: 1930, y: 880 },
        { x: 1100, y: 420 },
      ],
      fixture: "chicksFound",
    },
  },

  quests: [
    {
      id: "bridge",
      npcId: "robin",
      steps: [
        { type: "talk", line: "My bridge is broken! Some planks are missing." },
        { type: "countTap", line: "Tap each empty spot so we can count them!", targets: "bridge-slots" },
        { type: "pickNumber", line: "How many planks do we need?", options: [3, 4, 5], answer: 4 },
        { type: "placeItems", line: "Tap the bridge to lay each plank!", target: "bridge", count: 4 },
        { type: "celebrate", line: "You fixed my bridge! Thank you!", stars: 3, fixture: "bridgeFixed" },
      ],
    },
    {
      id: "seeds",
      npcId: "cardinal",
      steps: [
        { type: "talk", line: "The feeder holds six seeds. I only found two." },
        { type: "pickNumber", line: "How many more seeds do we need?", options: [3, 4, 6], answer: 4 },
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
        { type: "pickNumber", line: "How many eggs did you tuck in all together?", options: [5, 6, 7], answer: 6 },
        { type: "celebrate", line: "Two and two and two — six warm eggs!", stars: 3, fixture: "nestsFull" },
      ],
    },
    {
      id: "gate",
      npcId: null, // the gate itself asks — the skylark reads it out
      steps: [
        { type: "talk", line: "The old gate only opens for a full ten frame." },
        { type: "pickNumber", line: "Seven dots are lit. How many more make ten?", options: [2, 3, 4], answer: 3 },
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
        { type: "pickNumber", line: "How many chicks did you find?", options: [4, 5, 6], answer: 5 },
        { type: "celebrate", line: "All five chicks are safe. You are a hero!", stars: 5, fixture: "chicksFound" },
      ],
    },
  ],
};

export const STEP_TYPES = ["talk", "countTap", "pickNumber", "placeItems", "celebrate"];
