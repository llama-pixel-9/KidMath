/* Shared authoring rules for the LLM item pipelines (authorStructures,
 * rewordItems). Structure rules state exactly what checkStructure enforces;
 * narrative rules state the house prose style the reviewer expects.
 */

// The defining rule per structure — exactly what checkStructure enforces,
// stated for the author so it gets the hard ones right on the first try.
export const RULES = {
  addToStartUnknown:
    'The STARTING amount is unknown and must NOT be stated. Use "some" for it. State exactly two numbers: the change and the end total.',
  takeFromStartUnknown:
    'The STARTING amount is unknown and must NOT be stated. Use "some" for it. State the amount removed and the amount left.',
  compareBiggerMore:
    'Consistent-language compare: use the word "more", and the child ADDS. State the smaller quantity and the difference.',
  compareBiggerFewer:
    'LANGUAGE TRAP: use the word "fewer", even though the child must ADD. Never use "more". State the smaller quantity and the difference.',
  compareSmallerMore:
    'LANGUAGE TRAP: use the word "more", even though the child must SUBTRACT. Never use "fewer". State the larger quantity and the difference.',
  compareSmallerFewer:
    'Consistent-language compare: use the word "fewer", and the child SUBTRACTS. State the larger quantity and the difference.',
  compareProductUnknown:
    'Multiplicative compare: say "X times as much/many", never "more". State the smaller amount and the multiplier; ask for the larger.',
  compareSetSizeUnknown:
    'Multiplicative compare: say "X times as much/many". State the larger amount and the multiplier; ask for the smaller.',
  compareMultiplierUnknown:
    'Multiplicative compare: ask "how many times as much/many". State both amounts; ask for the multiplier.',
  arrayRowCountUnknown:
    'ARRAY structure — use ROWS, not groups or bunches. Say the items are "arranged in rows" with N in each row, and ask "how many ROWS". The word "rows" must appear.',
};

// House prose style (word-problem-authoring-guide.md, "Language and Style").
// Written by the reviewer after reading the first generated batch.
export const NARRATIVE_RULES = [
  "Anchor on a person first, not the objects: \"Carlos started with some trading cards\", never \"Some trading cards were in Carlos's deck\".",
  "Walk through the story step-by-step in the order it happens: starting amount, then what happened, then the total, then the question.",
  'Keep one consistent tense throughout; no jumping between "swam", "joined", and "are".',
  'Use short, simple, concrete verbs a young child knows: "added", "got", "gave away", "bloomed" — not "joined", "arrived", "appeared".',
  'End with an explicit time anchor: "at the start", "at first", "to begin with" — not a bare "before".',
  'The question must restate the thing being counted: "How many cards did he have at the start?", never "How many did he have?"',
  "2-4 short sentences, each easy to picture.",
];

// Reviewer-approved gold examples of the target register.
export const GOLD_EXAMPLES = [
  "Carlos started with some trading cards. He added 23 cards. Now he has 68 cards. How many cards did he have at the start?",
  "Maria's garden had some flowers. Then 11 more flowers bloomed. Now there are 44 flowers. How many flowers were there at first?",
  "Maria's fish tank had some fish. She added 8 more fish. Now there are 35 fish. How many fish were in the tank at the start?",
];
