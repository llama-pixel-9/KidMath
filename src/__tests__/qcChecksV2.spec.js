import { describe, it, expect } from "vitest";
import { CHECK_IDS, runChecks, runChecksOnAdminItem } from "../itemBank/qc/checks.js";

/**
 * The item bank v2 checks (plan sections 6 and 9): kid-safe text, one
 * question, question word vs answer type, objects from the context table,
 * realistic prices, and per-item hints that stop before the answer.
 *
 * Two invariants matter more than any single check:
 *   - every check has a passing item and a failing item;
 *   - a v1 row (version 1, or no version at all) never picks up a new fail.
 */

const V2_ONLY = ["oneQuestionMark", "questionWordMatchesAnswerType", "contextObjectKnown", "priceInRange", "hintPresent"];
const NEW_IDS = ["kidSafe", ...V2_ONLY, "hintNoAnswer"];

const find = (qc, id) => qc.findings.find((f) => f.id === id) || null;

// A sound v2 money story: a table object priced inside its range, one
// question, a typed number, and a hint that stops before the answer.
const v2 = (over = {}) => ({
  itemId: "addition-app-v2-001",
  modeId: "addition",
  itemFamily: "application",
  subskill: "makeChange",
  structureType: "changeFromPurchase",
  levelRange: [4, 6],
  levelBand: "2-3",
  reviewStatus: "approved",
  version: 2,
  hint: {
    nudge: "The question asks how much change Amara gets. Start with what she paid.",
    steps: ["Count up from $2 to $5.", "Count the dollars you hopped."],
  },
  question: {
    a: 5,
    b: 2,
    op: "-",
    answer: 3,
    answerType: "numberPad",
    display: { promptText: "Amara buys a bookmark for $2. She pays with $5. How many dollars of change does Amara get?" },
  },
  ...over,
});

// A v2 item with other prose. The payload numbers are dropped unless the
// test supplies its own, so the structure checks judge only what is given.
const withPrompt = (promptText, questionOver = {}, over = {}) =>
  v2({ ...over, question: { ...v2().question, a: null, b: null, op: null, ...questionOver, display: { promptText } } });

describe("v2 checks are registered", () => {
  it("adds every new check to CHECK_IDS", () => {
    for (const id of NEW_IDS) expect(CHECK_IDS).toContain(id);
  });

  it("passes a sound v2 item with no v2 finding at all", () => {
    const qc = runChecks(v2());
    expect(qc.findings).toEqual([]);
    expect(qc.pass).toBe(true);
  });
});

describe("kidSafe", () => {
  it("fails a v2 prompt with a listed word", () => {
    const qc = runChecks(withPrompt("Dad buys 6 beers for $12. He pays with $20. How many dollars of change does Dad get?"));
    expect(find(qc, "kidSafe")?.severity).toBe("fail");
    expect(find(qc, "kidSafe").message).toMatch(/"beers" \(substances\)/);
    expect(qc.pass).toBe(false);
  });

  it("scans the choices and the hint too", () => {
    const choices = withPrompt("Which prize does Sam pick?", { answer: "a toy gun", answerType: "choice", choices: ["a toy gun", "a kite"] });
    expect(find(runChecks(choices), "kidSafe")?.severity).toBe("fail");
    const hint = v2({ hint: { nudge: "Think about the beer first.", steps: ["Count up."] } });
    expect(find(runChecks(hint), "kidSafe")?.severity).toBe("fail");
  });

  it("only warns on a v1 row, which was scanned separately", () => {
    const qc = runChecks(withPrompt("Dad buys 6 beers for $12. How many dollars is that?", {}, { version: 1 }));
    expect(find(qc, "kidSafe")?.severity).toBe("warn");
    expect(qc.pass).toBe(true);
  });

  it("leaves dice and a basketball shot alone", () => {
    const qc = runChecks(withPrompt("Mina rolls two dice. One die shows 3 dots and the other shows 4 dots. Leo makes 7 basketball shots. How many dots does Mina see in all?"));
    expect(find(qc, "kidSafe")).toBeNull();
  });
});

describe("oneQuestionMark", () => {
  it("passes exactly one question", () => {
    expect(find(runChecks(v2()), "oneQuestionMark")).toBeNull();
  });

  it("fails a v2 prompt with no question mark", () => {
    const qc = runChecks(withPrompt("Amara buys a bookmark for $1.09 and pays with $2.00. Type the change in cents."));
    expect(find(qc, "oneQuestionMark")?.severity).toBe("fail");
    expect(find(qc, "oneQuestionMark").message).toMatch(/no question/);
  });

  it("fails a v2 prompt with two questions", () => {
    const qc = runChecks(withPrompt("Amara buys a bookmark for $1.09. How much does she pay? How many cents of change does Amara get from $2.00?"));
    expect(find(qc, "oneQuestionMark")?.severity).toBe("fail");
    expect(find(qc, "oneQuestionMark").message).toMatch(/2 questions/);
  });

  it("does not count the unknown slot in an equation as a question", () => {
    const one = withPrompt("8 + ? = 15. What number goes in the blank?", { a: 8, b: 7, op: "+", answer: 7 });
    expect(find(runChecks(one), "oneQuestionMark")).toBeNull();
    const bare = withPrompt("? − 12 = 31", { a: 12, b: 31, op: "-", answer: 43 }, { itemFamily: "procedural" });
    expect(find(runChecks(bare), "oneQuestionMark")?.message).toMatch(/no question/);
    // "box?" ends in x but is a word, not "x ?".
    const box = withPrompt("Which box holds more marbles?", { answer: "the red box", answerType: "choice", choices: ["the red box", "the blue box"] });
    expect(find(runChecks(box), "oneQuestionMark")).toBeNull();
  });

  it("never flags a v1 row", () => {
    const qc = runChecks(withPrompt("Type the change in cents.", {}, { version: 1 }));
    expect(find(qc, "oneQuestionMark")).toBeNull();
  });
});

describe("questionWordMatchesAnswerType", () => {
  const choice = (promptText, answer, choices, extra = {}) =>
    withPrompt(promptText, { answer, answerType: "choice", choices, a: null, b: null, op: null, ...extra });

  it("who and which ask for a pick from choices", () => {
    const ok = choice("Luca has 5 stickers. Ava has 3 stickers. Who has more stickers?", "Luca", ["Luca", "Ava"]);
    expect(find(runChecks(ok), "questionWordMatchesAnswerType")).toBeNull();
    const typed = withPrompt("Which number comes just after 12?", { a: null, b: null, op: null, answer: 13, answerType: "numberPad" });
    const f = find(runChecks(typed), "questionWordMatchesAnswerType");
    expect(f?.severity).toBe("fail");
    expect(f.message).toMatch(/"which" asks for a pick/);
    // A symbol pick is a pick.
    const symbol = withPrompt("Which symbol goes between 9 and 4?", { a: 9, b: 4, op: "vs", answer: ">", answerType: "symbolSelect" });
    expect(find(runChecks(symbol), "questionWordMatchesAnswerType")).toBeNull();
  });

  it("how many and how much ask for a number or money", () => {
    expect(find(runChecks(v2()), "questionWordMatchesAnswerType")).toBeNull();
    // Numeric choices are the state-test format and stay a number.
    const numericChoices = choice("Theo has 5 fewer stickers than Ava, who has 14. How many stickers does Theo have?", 9, [9, 19, 14, 5]);
    expect(find(runChecks(numericChoices), "questionWordMatchesAnswerType")).toBeNull();
    const money = choice("Omar cuts 125 cm from a 3 m roll of ribbon. How much remains?", "175 cm", ["175 cm", "125 cm", "3 m"]);
    expect(find(runChecks(money), "questionWordMatchesAnswerType")).toBeNull();
    const yesNo = choice("Mia has 4 apples and gets 3 more. How many apples does Mia have now?", "Yes", ["Yes", "No"]);
    expect(find(runChecks(yesNo), "questionWordMatchesAnswerType")?.severity).toBe("fail");
    const clock = withPrompt("How many apples does Mia have now?", { answer: 7, answerType: "clock", a: 4, b: 3, op: "+" });
    expect(find(runChecks(clock), "questionWordMatchesAnswerType")?.severity).toBe("fail");
  });

  it("what time is answered on a clock or by choosing a time", () => {
    const clock = withPrompt("Sam checks the clock before swim practice. What time does the clock show?", {
      a: null, b: null, op: "time", answer: 30, answerType: "clock", display: { figure: "clockFace", clock: { hour: 3, minute: 30 }, promptText: "Sam checks the clock before swim practice. What time does the clock show?" },
    });
    expect(find(runChecks(clock), "questionWordMatchesAnswerType")).toBeNull();
    const timeChoice = choice("What time does the clock show?", "3:15", ["3:15", "3:45", "2:15"]);
    expect(find(runChecks(timeChoice), "questionWordMatchesAnswerType")).toBeNull();
    const typed = withPrompt("What time does the clock show?", { a: null, b: null, op: null, answer: 315, answerType: "numberPad" });
    expect(find(runChecks(typed), "questionWordMatchesAnswerType")?.severity).toBe("fail");
  });

  it("skips prompts without one of the five question words, and every v1 row", () => {
    const what = withPrompt("What is 8 + 7?", { a: 8, b: 7, op: "+", answer: 15 }, { itemFamily: "procedural" });
    expect(find(runChecks(what), "questionWordMatchesAnswerType")).toBeNull();
    const v1 = withPrompt("Which number comes just after 12?", { a: null, b: null, op: null, answer: 13, answerType: "numberPad" }, { version: 1 });
    expect(find(runChecks(v1), "questionWordMatchesAnswerType")).toBeNull();
  });
});

describe("contextObjectKnown", () => {
  it("passes a story about a table object listed for the item's band", () => {
    expect(find(runChecks(v2()), "contextObjectKnown")).toBeNull();
  });

  it("warns when no table object is in the prompt", () => {
    const qc = runChecks(withPrompt("Priya has 8 zorbs. She gets 3 more zorbs. How many zorbs does Priya have now?", { a: 8, b: 3, op: "+", answer: 11 }));
    expect(find(qc, "contextObjectKnown")?.severity).toBe("warn");
    expect(qc.pass).toBe(true);
  });

  it("fails an object the table does not list for the item's kids", () => {
    // "pitcher" is listed for 2-3 and 4-5 only.
    const prompt = "A pitcher is 3/4 full. Omar pours out 1/4 of the pitcher. What fraction of the pitcher is still full?";
    const young = withPrompt(prompt, { a: null, b: null, op: null, answer: "2/4", answerType: "fraction" }, { levelRange: [1, 3], levelBand: "K-1", modeId: "fractions" });
    const f = find(runChecks(young), "contextObjectKnown");
    expect(f?.severity).toBe("fail");
    expect(f.message).toMatch(/"pitcher" is not listed for K-1/);
    const older = withPrompt(prompt, { a: null, b: null, op: null, answer: "2/4", answerType: "fraction" }, { levelRange: [4, 6], levelBand: "2-3", modeId: "fractions" });
    expect(find(runChecks(older), "contextObjectKnown")).toBeNull();
  });

  it("reads the band from a grade tag, the row's band, or the level range", () => {
    const prompt = "A pitcher is 3/4 full. Omar pours out 1/4 of the pitcher. What fraction of the pitcher is still full?";
    const base = { a: null, b: null, op: null, answer: "2/4", answerType: "fraction" };
    const tagged = withPrompt(prompt, base, { levelRange: [4, 6], levelBand: null, tags: { grade: "K" }, modeId: "fractions" });
    expect(find(runChecks(tagged), "contextObjectKnown")?.severity).toBe("fail");
    const spanning = withPrompt(prompt, base, { levelRange: [2, 5], levelBand: null, modeId: "fractions" });
    expect(find(runChecks(spanning), "contextObjectKnown")?.severity).toBe("fail");
    const inBand = withPrompt(prompt, base, { levelRange: [4, 6], levelBand: null, tags: { grade: 3 }, modeId: "fractions" });
    expect(find(runChecks(inBand), "contextObjectKnown")).toBeNull();
  });

  it("does not read a verb as the story's object", () => {
    // "pins" is listed for older kids only, but here Luca pins a graph up.
    const qc = runChecks(
      withPrompt("Luca pins the pet fair graph to the wall and counts the bunnies bar. How many bunnies does the bar show?", { a: null, b: null, op: null, answer: 3 }, { levelRange: [1, 3], levelBand: "K-1", modeId: "dataGraphs", structureType: "readBar" })
    );
    expect(find(qc, "contextObjectKnown")?.severity).not.toBe("fail");
  });

  it("only looks at v2 application items", () => {
    const zorbs = "Priya has 8 zorbs. She gets 3 more zorbs. How many zorbs does Priya have now?";
    const conceptual = withPrompt(zorbs, { a: 8, b: 3, op: "+", answer: 11 }, { itemFamily: "conceptual" });
    expect(find(runChecks(conceptual), "contextObjectKnown")).toBeNull();
    const v1 = withPrompt(zorbs, { a: 8, b: 3, op: "+", answer: 11 }, { version: 1 });
    expect(find(runChecks(v1), "contextObjectKnown")).toBeNull();
  });
});

describe("priceInRange", () => {
  const money = (promptText, answer = 1) => withPrompt(promptText, { a: null, b: null, op: null, answer, answerType: "decimal" });

  it("passes a price inside the table's range and a cent price", () => {
    expect(find(runChecks(v2()), "priceInRange")).toBeNull();
    expect(find(runChecks(money("A pencil costs 45¢. Mia pays with $1. How many cents of change does Mia get?", 55)), "priceInRange")).toBeNull();
  });

  it("fails a price outside the range for the object in the sentence", () => {
    const qc = runChecks(money("A pencil costs $40. Mia pays with $50. How many dollars of change does Mia get?", 10));
    const f = find(qc, "priceInRange");
    expect(f?.severity).toBe("fail");
    expect(f.message).toMatch(/\$40 for "pencil" is outside the realistic \$0\.10-\$0\.50/);
    expect(qc.pass).toBe(false);
  });

  it("uses the pack price when the sentence sells a pack, box or bag", () => {
    expect(find(runChecks(money("A pack of 12 pencils costs $3. Mia pays with $5. How many dollars of change does Mia get?", 2)), "priceInRange")).toBeNull();
    expect(find(runChecks(money("A box of pencils costs $4. Mia pays with $5. How many dollars of change does Mia get?", 1)), "priceInRange")).toBeNull();
    const f = find(runChecks(money("A pack of pencils costs $40. Mia pays with $50. How many dollars of change does Mia get?", 10)), "priceInRange");
    expect(f?.severity).toBe("fail");
    expect(f.message).toMatch(/pack price/);
  });

  it("allows the total for a counted quantity", () => {
    expect(find(runChecks(money("Ava buys 4 pencils for $2. She pays with $5. How many dollars of change does Ava get?", 3)), "priceInRange")).toBeNull();
    expect(find(runChecks(money("Ava buys 4 pencils for $30. She pays with $50. How many dollars of change does Ava get?", 20)), "priceInRange")?.severity).toBe("fail");
  });

  it("ignores amounts with no priced object in the sentence, and coins being counted", () => {
    expect(find(runChecks(money("Mia has $200 saved. She spends $3 on a bookmark and a pencil. How many dollars are left?", 197)), "priceInRange")).toBeNull();
    expect(find(runChecks(money("Mia has 9 quarters. That is $2.25 in quarters. How many more quarters make $3?", 3)), "priceInRange")).toBeNull();
    expect(find(runChecks(money("Sam finds 3 seashells and buys a bucket for $60. How many dollars does the bucket cost after a $10 coupon?", 50)), "priceInRange")).toBeNull();
  });

  it("holds a sentence with several priced objects between the cheapest and their total", () => {
    expect(find(runChecks(money("A pencil and a bookmark cost $3 together. Mia pays with $5. How many dollars of change does Mia get?", 2)), "priceInRange")).toBeNull();
    expect(find(runChecks(money("A pencil and a bookmark cost $50 together. Mia pays with $60. How many dollars of change does Mia get?", 10)), "priceInRange")?.severity).toBe("fail");
  });

  it("never flags a v1 row", () => {
    const qc = runChecks(withPrompt("A pencil costs $40. Mia pays with $50. How many dollars of change does Mia get?", { a: null, b: null, op: null, answer: 10, answerType: "decimal" }, { version: 1 }));
    expect(find(qc, "priceInRange")).toBeNull();
  });
});

describe("hintNoAnswer", () => {
  it("passes a hint that stops before the answer", () => {
    expect(find(runChecks(v2()), "hintNoAnswer")).toBeNull();
  });

  it("fails a nudge, step or feedback line that states the answer on v2, and only warns on v1", () => {
    const nudge = v2({ hint: { nudge: "The change is 3 dollars.", steps: ["Count up."] } });
    expect(find(runChecks(nudge), "hintNoAnswer")?.severity).toBe("fail");
    const step = v2({ hint: { nudge: "Count up.", steps: ["$2 + $3 = $5."] } });
    expect(find(runChecks(step), "hintNoAnswer")?.severity).toBe("fail");
    const feedback = v2({ hint: { nudge: "Count up.", feedback: { 7: "You added. The change is $3." } } });
    expect(find(runChecks(feedback), "hintNoAnswer")?.severity).toBe("fail");
    const v1 = v2({ version: 1, hint: { nudge: "Count up.", feedback: { 7: "You added. The change is $3." } } });
    const qc = runChecks(v1);
    expect(find(qc, "hintNoAnswer")?.severity).toBe("warn");
    expect(qc.pass).toBe(true);
  });

  it("lets the worked example and the solution state an answer", () => {
    const item = v2({ hint: { ...v2().hint, example: { problem: "$4 from $10", steps: ["$4 + $6 = $10."], answer: 6 }, solution: { steps: ["$2 + $3 = $5."], answer: 3 } } });
    expect(find(runChecks(item), "hintNoAnswer")).toBeNull();
  });

  it("ignores rows without a hint", () => {
    expect(find(runChecks(v2({ hint: null })), "hintNoAnswer")).toBeNull();
    expect(find(runChecks(v2({ hint: undefined, version: 1 })), "hintNoAnswer")).toBeNull();
  });
});

describe("hintPresent", () => {
  it("warns on a v2 item without a hint and passes one with a hint", () => {
    const qc = runChecks(v2({ hint: null }));
    expect(find(qc, "hintPresent")?.severity).toBe("warn");
    expect(qc.pass).toBe(true);
    expect(find(runChecks(v2()), "hintPresent")).toBeNull();
  });

  it("never flags a v1 row", () => {
    expect(find(runChecks(v2({ hint: null, version: 1 })), "hintPresent")).toBeNull();
    expect(find(runChecks(v2({ hint: null, version: undefined })), "hintPresent")).toBeNull();
  });
});

describe("v1 rows keep their verdict", () => {
  // A bundled v1 row: no version, no hint, no band — exactly what the
  // shipped bank looks like — written the way v1 prose is (two questions,
  // "which" typed on a number pad, a made-up price).
  const bundled = {
    itemId: "money-app-legacy",
    modeId: "money",
    itemFamily: "application",
    subskill: "makeChange",
    structureType: "changeFromPurchase",
    levelRange: [4, 6],
    reviewStatus: "approved",
    question: {
      a: null, b: null, op: null, answer: 60, answerType: "numberPad",
      display: { promptText: "A pencil costs $40. Which number is the change from $100? How many dollars is that?" },
    },
  };

  it("gets no v2-only finding, whatever its prose", () => {
    for (const row of [bundled, { ...bundled, version: 1 }, { ...bundled, version: "1" }, { ...bundled, version: null }]) {
      const qc = runChecks(row);
      for (const id of V2_ONLY) expect(find(qc, id), id).toBeNull();
      expect(qc.findings.filter((f) => f.severity === "fail" && NEW_IDS.includes(f.id))).toEqual([]);
    }
  });

  it("the same prose at version 2 is held to the new rules", () => {
    const qc = runChecks({ ...bundled, version: 2 });
    expect(find(qc, "oneQuestionMark")?.severity).toBe("fail");
    expect(find(qc, "priceInRange")?.severity).toBe("fail");
    expect(find(qc, "hintPresent")?.severity).toBe("warn");
  });
});

describe("runChecksOnAdminItem", () => {
  const admin = (over = {}) => ({
    itemId: "addition-app-v2-admin",
    modeId: "addition",
    itemFamily: "application",
    structureType: "changeFromPurchase",
    levelMin: 4,
    levelMax: 6,
    levelBand: "2-3",
    version: 2,
    hint: v2().hint,
    payload: v2().question,
    ...over,
  });

  it("carries version, hint, family and band into the checks", () => {
    expect(runChecksOnAdminItem(admin()).findings).toEqual([]);
    expect(find(runChecksOnAdminItem(admin({ hint: null })), "hintPresent")?.severity).toBe("warn");
    expect(find(runChecksOnAdminItem(admin({ hint: { nudge: "It is 3." } })), "hintNoAnswer")?.severity).toBe("fail");
    expect(find(runChecksOnAdminItem(admin({ itemFamily: "conceptual", payload: { ...v2().question, display: { promptText: "Priya has 8 zorbs and gets 3 more. How many zorbs is that?" } } })), "contextObjectKnown")).toBeNull();
    expect(find(runChecksOnAdminItem(admin({ payload: { ...v2().question, display: { promptText: "Priya has 8 zorbs and gets 3 more. How many zorbs is that?" } } })), "contextObjectKnown")?.severity).toBe("warn");
  });

  it("treats a row fetched without the v2 columns as v1", () => {
    const row = admin({ version: undefined, hint: undefined, levelBand: undefined });
    row.payload = { ...v2().question, display: { promptText: "Type the change in cents." } };
    const qc = runChecksOnAdminItem(row);
    for (const id of V2_ONLY) expect(find(qc, id), id).toBeNull();
  });
});
