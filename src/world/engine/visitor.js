import { SEA_LEFT_W } from "../regions";
import { todayKey } from "../worldStore";

/**
 * Today's visitor: one bird a day lands on the beach with one small problem
 * worth two stars. Deterministic by date so every device agrees; gone once
 * helped, back tomorrow as somebody else. Growth framing: nothing is lost
 * by missing a day.
 */
export const VISITORS = [
  { bird: "goldfinch", name: "Goldfinch", voice: 4, line: "I picked four thistle seeds, then three more.", question: "How many seeds do I have now?", options: [6, 7, 8], answer: 7, thanks: "Seven seeds! Thank you, friend." },
  { bird: "paintedBunting", name: "Painted Bunting", voice: 6, line: "I found eight berries and ate three on the way.", question: "How many berries are left?", options: [4, 5, 6], answer: 5, thanks: "Five left, just enough to share." },
  { bird: "junco", name: "Junco", voice: 2, line: "Two nests back home, with five eggs in each.", question: "How many eggs is that all together?", options: [8, 10, 12], answer: 10, thanks: "Ten eggs. I had better fly home!" },
  { bird: "houseFinch", name: "House Finch", voice: 5, line: "I sang six songs this morning and six more after lunch.", question: "How many songs did I sing?", options: [10, 12, 14], answer: 12, thanks: "Twelve songs! My throat is tired." },
  { bird: "hummingbird", name: "Hummingbird", voice: 9, line: "I visited nine flowers, but four of them were empty.", question: "How many flowers had nectar?", options: [4, 5, 6], answer: 5, thanks: "Five sweet ones. Zoom!" },
  { bird: "barnSwallow", name: "Barn Swallow", voice: 3, line: "I caught twelve bugs to share equally with my three chicks.", question: "How many bugs does each chick get?", options: [3, 4, 5], answer: 4, thanks: "Four each. Fair is fair." },
  { bird: "mourningDove", name: "Dove", voice: 1, line: "I saw three boats on the sea, then two more sailed by.", question: "How many boats did I see?", options: [4, 5, 6], answer: 5, thanks: "Five boats. What a busy sea." },
];

/** Where the visitor stands: on the beach, a few hops from the front door. */
export const VISITOR_SPOT = { x: SEA_LEFT_W + 120, y: 1075 };

export function visitorForDate(date = new Date()) {
  const key = todayKey(date);
  const n = key.split("-").reduce((a, b) => a + Number(b), 0);
  return { ...VISITORS[n % VISITORS.length], day: key };
}

/** The visitor's quest in the runner's step DSL (talk → pick → celebrate). */
export function visitorQuest(v) {
  return {
    id: `visitor-${v.day}`,
    npcId: "visitor",
    steps: [
      { type: "talk", line: v.line },
      { type: "pickNumber", line: v.question, options: v.options, answer: v.answer },
      { type: "celebrate", line: v.thanks, stars: 2, fixture: null },
    ],
  };
}
