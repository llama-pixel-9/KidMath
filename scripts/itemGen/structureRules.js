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
  "Vary the packaging across a set: fold two facts into one sentence, ask the question first on harder items, let a picture carry the numbers, and (hard only) add one detail the kid must ignore. Ten items of one shape read as a worksheet, not a test.",
  'Context must MATTER. Never bolt a name onto a bare number question: "Emma has 53 pencils. How many tens are in 53?" is wrong — the story does no work. Either ask the bare question ("How many tens are in 53?") or make the story load-bearing ("Emma bundles her 53 pencils into packs of 10 — how many full packs?").',
  'Kid words only. Never the teacher\'s vocabulary in the prompt: no "subitize", "cardinality", "decompose", "commutative", "identity", "inverse", "equivalent", "numeral", "partition". Say "How many?", "Split 7 into two parts", "9 + 9 = 18. What is 9 + 10?".',
  'Show the picture, never describe it. "A small set of 4 dots. How many?" hands the kid the answer — a counting item either carries a figure (emoji run, ten frame, object set) or asks something the kid can work out from the words alone.',
  'The figure carries the clock. Never state where the hands point in words ("the hour hand on six, the minute hand on twelve") — a clock item shows the face (clockFace figure or the clock widget) and asks for the time. Words about hands are only for items where the hands themselves are the subject ("which hand tells the hour?").',
  'Make the kid do the step. Keep the strategy but never print its worked step or a fact that already holds the answer: "9 + 9 = 18. What is 9 + 10?" and "Make a ten: 8 + 5 = 10 + __" are right; "Use compensation: 29 + 41 = 30 + 40. Compute the value." and "If 6 × 7 = 42, then 7 × 6 = ?" give it away.',
  'Ask like a K-5 textbook, not a test-maker. No "compute", "determine", "evaluate", "find the value", "the value?", "certifies", "audit", "assert", "Is the work sound?", "Valid?" or "Clean audit?" — ask "What is 6 × 7?", "How many cards are left?", "Mia says 0.5 = 0.50. Is Mia right?".',
  'End on the question. The card shows the last sentence big, so nothing comes after the question: no "Pick it.", "Type it.", "Choose them." and no "Diego checks." Put a lead-in or a name before the question ("Diego checks the graph. Which bar is tallest?").',
  'A blank the kid fills is "__", never "?": "Fill the gap: 4, __, 8", "7 + __ = 12". A "?" only ends a question.',
  'US spelling: meter, centimeter, kilometer, liter, milliliter. Never "metre" or "litre".',
  'Drills are drills. Sequence continuation is presented BARE, the way curricula run fluency (EngageNY "Happy Counting"): "Count by 4s: 16, 20, 24. What number comes next?" — never narrated ("A timer beeps every 4 seconds…"). A story is only justified when the question asks a real-world quantity, not the next term of a sequence.',
];

// Reviewer-approved gold examples of the target register.
export const GOLD_EXAMPLES = [
  "Carlos started with some trading cards. He added 23 cards. Now he has 68 cards. How many cards did he have at the start?",
  "Maria's garden had some flowers. Then 11 more flowers bloomed. Now there are 44 flowers. How many flowers were there at first?",
  "Maria's fish tank had some fish. She added 8 more fish. Now there are 35 fish. How many fish were in the tank at the start?",
];
