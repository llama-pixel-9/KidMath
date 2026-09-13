/**
 * The Cliffs — Fractions & Decimals, the island's high end. Halves and
 * quarters of the same objects: a half-full tray, a three-quarters-built
 * crossing, eggs split fairly between two nests. The last gate is the
 * lookout: opening it brings the whole flock past the cliffs.
 */
export const CLIFFS_ZONE = {
  id: "cliffs",
  regionId: "cliffs",
  spawn: { x: 260, y: 1030 },

  npcs: [
    { id: "kestrel", name: "Kestrel", bird: "kestrel", x: 720, y: 930, size: 108, questId: "halfTray", thanks: "Half and half make a whole tray. Thanks!", voice: 10 },
    { id: "snowyOwl", name: "Snowy Owl", bird: "snowyOwl", x: 1340, y: 1080, size: 122, questId: "quarterCrossing", thanks: "Four quarters. The crossing is whole again.", voice: 11 },
    { id: "crane", name: "Sandhill Crane", bird: "sandhillCrane", x: 1700, y: 880, size: 150, questId: "fairNests", thanks: "Half each. My chicks are so pleased.", voice: 12 },
  ],

  objects: {
    // A rope crossing over the gap in the rocks: eight planks, quarters at a time.
    bridge: { x: 1010, y: 1000, slots: 8, present: 6, fixture: "ropeBridgeFixed", style: "rope", span: 180 },
    // The kestrel's seed tray, half full.
    feeder: { x: 480, y: 1050, prop: "feeder", size: 205, capacity: 8, present: 4, fixture: "trayFull", item: "seed" },
    nests: {
      prop: "nestSmall",
      size: 94,
      spots: [
        { x: 1560, y: 852 },
        { x: 1840, y: 870 },
      ],
      eggsPer: 3,
      fixture: "cliffNestsFull",
    },
    // The lookout gate at the island's edge. Opening it is the finale.
    gate: { x: 1930, y: 1000, prop: "fence", size: 185, tenFrameFilled: 5, fixture: "lookoutOpen", questId: "lookout" },
    chicks: {
      bird: "whoopingCraneChick",
      size: 62,
      label: "crane chicks",
      homeNpcId: "crane",
      spots: [
        { x: 180, y: 1120 },
        { x: 900, y: 1122 },
        { x: 1240, y: 860 },
        { x: 1880, y: 1120 },
      ],
      fixture: "craneChicksFound",
    },
  },

  feathers: [
    { id: "windFeather", art: "wordDetective", x: 1180, y: 1120 },
    { id: "skyFeather", art: "stars100", x: 1960, y: 860 },
  ],

  quests: [
    {
      id: "halfTray",
      npcId: "kestrel",
      steps: [
        { type: "talk", line: "My tray holds eight seeds. It is exactly half full." },
        { type: "pickNumber", line: "Half of eight is four. How many more seeds make it full?", options: [2, 4, 8], answer: 4, hint: { target: "feeder", mode: "empty" } },
        { type: "placeItems", line: "Tap the tray to drop each seed in!", target: "feeder", count: 4 },
        { type: "celebrate", line: "Two halves make one whole tray!", stars: 3, fixture: "trayFull" },
      ],
    },
    {
      id: "quarterCrossing",
      npcId: "snowyOwl",
      steps: [
        { type: "talk", line: "The rope crossing is three quarters done. Eight planks in all." },
        { type: "countTap", line: "Tap each empty spot on the crossing!", targets: "bridge-slots" },
        { type: "pickNumber", line: "One quarter of eight planks is missing. How many is that?", options: [2, 3, 4], answer: 2, hint: { target: "bridge", mode: "empty" } },
        { type: "placeItems", line: "Tap the crossing to tie on each plank!", target: "bridge", count: 2 },
        { type: "celebrate", line: "Four quarters. The crossing is whole!", stars: 3, fixture: "ropeBridgeFixed" },
      ],
    },
    {
      id: "fairNests",
      npcId: "crane",
      steps: [
        { type: "talk", line: "Six eggs and two nests. Each nest gets half." },
        { type: "pickNumber", line: "Half of six eggs. How many in each nest?", options: [2, 3, 4], answer: 3, hint: { target: "nests", mode: "perNest" } },
        { type: "placeItems", line: "Tap each nest to share the eggs!", target: "nests", count: 6 },
        { type: "celebrate", line: "Three and three. Half each, fair and warm!", stars: 4, fixture: "cliffNestsFull" },
      ],
    },
    {
      id: "lookout",
      npcId: null,
      steps: [
        { type: "talk", line: "The lookout gate opens for a full ten frame." },
        { type: "pickNumber", line: "Five dots are lit. That is one half. How many more make ten?", options: [4, 5, 6], answer: 5, hint: { target: "gate", mode: "unlit" } },
        { type: "placeItems", line: "Tap the gate to light each dot!", target: "gate", count: 5 },
        { type: "celebrate", line: "Ten! The lookout is open. Look who is flying past!", stars: 5, fixture: "lookoutOpen" },
      ],
    },
    {
      id: "craneChicks",
      npcId: "crane",
      requiresFixture: "ropeBridgeFixed",
      steps: [
        { type: "talk", line: "My chicks crossed your rope bridge and hid in the rocks!" },
        { type: "countTap", line: "Find every crane chick and tap it!", targets: "chicks" },
        { type: "pickNumber", line: "Four chicks, and half of them are hiding behind rocks. How many is half of four?", options: [1, 2, 3], answer: 2, hint: { target: "chicks", mode: "half" } },
        { type: "celebrate", line: "Half of four is two. All four are safe!", stars: 5, fixture: "craneChicksFound" },
      ],
    },
  ],
};
