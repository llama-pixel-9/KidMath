/**
 * The Pond — Add & Subtract. Pure data against the meadow's object/step
 * vocabulary (`bridge` = a slot-row crossing, `feeder` = a fill-to-capacity
 * container, `nests` = grouped containers, `gate` = the ten-frame door,
 * `chicks` = a scatter hunt); the scene renders it with pond styling.
 *
 * The pond backdrop is mostly water across the ground band, so birds stand
 * on the banks, the rocks and the lily pads, and the skylark flies rather
 * than hops whenever a path crosses water (`water` rects, region-local).
 *
 * Math register shifts from counting to addition: every quest asks "how
 * many more?" or a sum — still intrinsically the fix/feed/open action.
 */
export const POND_ZONE = {
  id: "pond",
  regionId: "pond",
  spawn: { x: 300, y: 1112 },
  water: [{ x: 0, y: 800, w: 2048, h: 290 }],
  // Dry footing inside the water: the mossy rocks and the lily-pad corner.
  land: [
    { x: 1280, y: 790, w: 470, h: 95 },
    { x: 40, y: 850, w: 440, h: 175 },
  ],

  npcs: [
    { id: "kingfisher", name: "Kingfisher", bird: "kingfisher", x: 1480, y: 840, size: 110, questId: "pondStones", thanks: "The crossing is solid. Seven stones strong!", voice: 4 },
    { id: "puffin", name: "Puffin", bird: "puffin", x: 1230, y: 1112, size: 118, questId: "pondPicnic", thanks: "Eight berries! Best picnic ever.", voice: 5 },
    { id: "dove", name: "Mourning Dove", bird: "mourningDove", x: 320, y: 985, size: 100, questId: "pondNests", thanks: "The floating nests are full and warm.", voice: 6 },
  ],

  objects: {
    // Stepping stones from the near bank to the far bank — the meadow's
    // bridge mechanic in pond clothing (round stones, deep water).
    bridge: { x: 1010, y: 950, slots: 7, present: 3, fixture: "pondStonesFixed", style: "stones", span: 300, vertical: true },
    // Puffin's picnic log on the bank: eight berries fit on top.
    feeder: { x: 1420, y: 1115, prop: "log", size: 118, capacity: 8, present: 3, fixture: "pondPicnicFull", item: "berry" },
    // Floating nests among the lily pads.
    nests: {
      prop: "nestSmall",
      size: 90,
      spots: [
        { x: 230, y: 900 },
        { x: 400, y: 950 },
        { x: 150, y: 1000 },
      ],
      eggsPer: 2,
      fixture: "pondNestsFull",
    },
    // The gate between the trees at the far end: six dots lit this time.
    gate: { x: 1930, y: 1000, prop: "fence", size: 185, tenFrameFilled: 6, fixture: "pondGateOpen", questId: "pondGate" },
    // Ducklings hiding around the water.
    chicks: {
      bird: "whoopingCraneChick",
      size: 60,
      label: "ducklings",
      homeNpcId: "kingfisher",
      spots: [
        { x: 120, y: 1120 },
        { x: 820, y: 1122 },
        { x: 1250, y: 862 },
        { x: 1720, y: 1120 },
        { x: 900, y: 830 },
      ],
      fixture: "ducklingsFound",
    },
  },

  feathers: [
    { id: "reedFeather", art: "streak7", x: 1620, y: 1122 },
    { id: "mistFeather", art: "stars100", x: 60, y: 850 },
  ],

  quests: [
    {
      id: "pondStones",
      npcId: "kingfisher",
      steps: [
        { type: "talk", line: "Seven stones make the crossing, but some sank!" },
        { type: "countTap", line: "Tap each empty spot in the water!", targets: "bridge-slots" },
        { type: "pickNumber", line: "Three stones plus how many more make seven?", options: [3, 4, 5], answer: 4, hint: { target: "bridge", mode: "empty" } },
        { type: "placeItems", line: "Tap the water to roll each stone in!", target: "bridge", count: 4 },
        { type: "celebrate", line: "Three and four make seven. The crossing holds!", stars: 3, fixture: "pondStonesFixed" },
      ],
    },
    {
      id: "pondPicnic",
      npcId: "puffin",
      steps: [
        { type: "talk", line: "Picnic day! I need eight berries and I picked three." },
        { type: "pickNumber", line: "Three plus how many more make eight?", options: [4, 5, 6], answer: 5, hint: { target: "feeder", mode: "empty" } },
        { type: "placeItems", line: "Tap the log to set out each berry!", target: "feeder", count: 5 },
        { type: "celebrate", line: "Three plus five. Eight berries! Dig in!", stars: 3, fixture: "pondPicnicFull" },
      ],
    },
    {
      id: "pondNests",
      npcId: "dove",
      steps: [
        { type: "talk", line: "My three floating nests each need two eggs." },
        { type: "placeItems", line: "Tap each nest to settle the eggs in!", target: "nests", count: 6 },
        { type: "pickNumber", line: "Two and two and two. How many eggs is that?", options: [5, 6, 7], answer: 6, hint: { target: "nests", mode: "eggs" } },
        { type: "celebrate", line: "Six eggs bobbing safe and sound!", stars: 3, fixture: "pondNestsFull" },
      ],
    },
    {
      id: "pondGate",
      npcId: null,
      steps: [
        { type: "talk", line: "The gate between the trees opens for a full ten frame." },
        { type: "pickNumber", line: "Six dots are lit. How many more make ten?", options: [3, 4, 5], answer: 4, hint: { target: "gate", mode: "unlit" } },
        { type: "placeItems", line: "Tap the gate to light each dot!", target: "gate", count: 4 },
        { type: "celebrate", line: "Six plus four is ten. The gate swings wide!", stars: 4, fixture: "pondGateOpen" },
      ],
    },
    {
      id: "ducklings",
      npcId: "kingfisher",
      requiresFixture: "pondStonesFixed",
      steps: [
        { type: "talk", line: "The ducklings paddled off across your stones!" },
        { type: "countTap", line: "Find every duckling and tap it!", targets: "chicks" },
        { type: "pickNumber", line: "How many ducklings did you find?", options: [4, 5, 6], answer: 5, hint: { target: "chicks", mode: "found" } },
        { type: "celebrate", line: "Five paddlers, all together again!", stars: 5, fixture: "ducklingsFound" },
      ],
    },
  ],
};
