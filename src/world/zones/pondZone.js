/**
 * The pond — the Add & Subtract island's walkable zone, and the proof of
 * the Phase 4 claim: a new island is a content drop, not code. This file is
 * pure data against the same object/step vocabulary as the meadow
 * (`bridge` = a slot-row crossing, `feeder` = a fill-to-capacity container,
 * `nests` = grouped containers, `gate` = the ten-frame door, `chicks` = a
 * scatter hunt); the scene renders it with pond styling from the def.
 *
 * Math register shifts from counting to addition: every quest asks
 * "how many more?" or a sum — still intrinsically the fix/feed/open action.
 */
export const POND_ZONE = {
  id: "pond",
  islandId: "addSubtract",
  backdrop: "pond",
  bounds: { width: 2048, height: 1176 },
  spawn: { x: 320, y: 920 },

  npcs: [
    { id: "kingfisher", name: "Kingfisher", art: "/meadow/birds/kingfisher.webp", w: 512, h: 463, x: 660, y: 560, size: 115, questId: "pondStones", thanks: "The crossing is solid — seven stones strong!" },
    { id: "puffin", name: "Puffin", art: "/meadow/birds/puffin.webp", w: 512, h: 512, x: 1280, y: 900, size: 120, questId: "pondPicnic", thanks: "Eight berries! Best picnic ever." },
    { id: "dove", name: "Mourning Dove", art: "/meadow/birds/mourningDove.webp", w: 512, h: 427, x: 1720, y: 540, size: 110, questId: "pondNests", thanks: "The floating nests are full and warm." },
  ],

  objects: {
    // Stepping stones across the pond: the meadow's bridge mechanic in
    // pond clothing (round stones, deep water).
    bridge: {
      x: 1024, y: 620, slots: 7, present: 3, fixture: "pondStonesFixed",
      style: "stones", waterColor: 0x5fa8c9, plankColor: 0x9aa8b6, plankEdge: 0x6b7885,
    },
    // Puffin's picnic log: eight berries fit on top.
    feeder: {
      x: 1460, y: 830, art: "/meadow/props/log.webp", w: 640, h: 259, size: 200,
      capacity: 8, present: 3, fixture: "pondPicnicFull",
      itemColor: 0xc94f6d, fillYOffset: 46,
    },
    // Floating nests among the lily pads.
    nests: {
      x: 1770, y: 660,
      art: "/meadow/props/nestSmall.webp", w: 320, h: 237, size: 105,
      spots: [
        { x: 1690, y: 700 },
        { x: 1800, y: 650 },
        { x: 1900, y: 710 },
      ],
      eggsPer: 2,
      eggArt: "/meadow/egg/stage0.webp",
      fixture: "pondNestsFull",
    },
    // The reed gate: same ten-frame door, six lit this time.
    gate: { x: 380, y: 330, art: "/meadow/props/fence.webp", w: 580, h: 361, size: 190, tenFrameFilled: 6, fixture: "pondGateOpen", questId: "pondGate" },
    // Ducklings hiding around the water.
    chicks: {
      art: "/meadow/birds/whoopingCraneChick.webp", w: 512, h: 512, size: 72, homeNpcId: "kingfisher",
      spots: [
        { x: 240, y: 620 },
        { x: 900, y: 980 },
        { x: 1420, y: 1060 },
        { x: 1960, y: 900 },
        { x: 1180, y: 420 },
      ],
      fixture: "ducklingsFound",
    },
  },

  feathers: [
    { id: "reedFeather", art: "/meadow/feathers/streak7.webp", x: 1560, y: 380 },
    { id: "mistFeather", art: "/meadow/feathers/stars100.webp", x: 140, y: 1050 },
  ],

  quests: [
    {
      id: "pondStones",
      npcId: "kingfisher",
      steps: [
        { type: "talk", line: "Seven stones make the crossing, but some sank!" },
        { type: "countTap", line: "Tap each empty spot in the water!", targets: "bridge-slots" },
        { type: "pickNumber", line: "Three stones plus how many more make seven?", options: [3, 4, 5], answer: 4 },
        { type: "placeItems", line: "Tap the water to roll each stone in!", target: "bridge", count: 4 },
        { type: "celebrate", line: "Three and four make seven — the crossing holds!", stars: 3, fixture: "pondStonesFixed" },
      ],
    },
    {
      id: "pondPicnic",
      npcId: "puffin",
      steps: [
        { type: "talk", line: "Picnic day! I need eight berries and I picked three." },
        { type: "pickNumber", line: "Three plus how many more make eight?", options: [4, 5, 6], answer: 5 },
        { type: "placeItems", line: "Tap the log to set out each berry!", target: "feeder", count: 5 },
        { type: "celebrate", line: "Three plus five — eight berries! Dig in!", stars: 3, fixture: "pondPicnicFull" },
      ],
    },
    {
      id: "pondNests",
      npcId: "dove",
      steps: [
        { type: "talk", line: "My three floating nests each need two eggs." },
        { type: "placeItems", line: "Tap each nest to settle the eggs in!", target: "nests", count: 6 },
        { type: "pickNumber", line: "Two and two and two — how many eggs is that?", options: [5, 6, 7], answer: 6 },
        { type: "celebrate", line: "Six eggs bobbing safe and sound!", stars: 3, fixture: "pondNestsFull" },
      ],
    },
    {
      id: "pondGate",
      npcId: null,
      steps: [
        { type: "talk", line: "The reed gate opens for a full ten frame." },
        { type: "pickNumber", line: "Six dots are lit. How many more make ten?", options: [3, 4, 5], answer: 4 },
        { type: "placeItems", line: "Tap the gate to light each dot!", target: "gate", count: 4 },
        { type: "celebrate", line: "Six plus four is ten — the reeds part!", stars: 4, fixture: "pondGateOpen" },
      ],
    },
    {
      id: "ducklings",
      npcId: "kingfisher",
      requiresFixture: "pondStonesFixed",
      steps: [
        { type: "talk", line: "The ducklings paddled off across your stones!" },
        { type: "countTap", line: "Find every duckling and tap it!", targets: "chicks" },
        { type: "pickNumber", line: "Five ducklings and two parents — how many swim home?", options: [6, 7, 8], answer: 7 },
        { type: "celebrate", line: "Seven paddlers, all together again!", stars: 5, fixture: "ducklingsFound" },
      ],
    },
  ],
};
