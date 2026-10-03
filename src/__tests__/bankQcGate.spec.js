import { describe, expect, it } from "vitest";
import { runChecks } from "../itemBank/qc/checks.js";
import { workedStepFinding } from "../itemBank/qc/workedStep.js";
import { sequenceCardFinding, sequenceNextTerm } from "../itemBank/qc/sequenceCard.js";
import { britishSpellingFinding, questionNotLastFinding, teacherVoiceFinding } from "../itemBank/qc/kidVoice.js";
import { modeRegistry } from "../modes/index.js";
import { FULL_ITEMS } from "../itemBank/fullBank.js";

// Sai, 2026-10-02: no item reaches the bank without the QC checks. The admin
// approve button and the authoring scripts run them; this spec runs them over
// every item the app ships, so a bundle edit that skips the gate fails CI.
describe("shipped bank passes the QC gate", () => {
  it("has no item with a fail finding", () => {
    const failing = [];
    for (const item of FULL_ITEMS) {
      const { findings } = runChecks(item);
      const fails = findings.filter((f) => f.severity === "fail");
      if (fails.length) failing.push(`${item.itemId}: ${fails.map((f) => `${f.id} (${f.message})`).join("; ")}`);
    }
    expect(failing.slice(0, 20)).toEqual([]);
    expect(failing.length).toBe(0);
  }, 120000);
});

const item = (promptText, answer) => ({ question: { answer, display: { promptText } } });

describe("workedStepGiveaway", () => {
  it.each([
    ["Use compensation: 29 + 41 = 30 + 40. Compute the value.", 70],
    ["Use make-ten: 45 + 7 = 45 + 5 + 2. Compute the sum.", 52],
    ["Add by place value: 30 + 20 = 50, and 5 + 5 = 10, so 35 + 25 equals?", 60],
    ["If 9 + 8 = 17, what is 8 + 9?", 17],
    ["16 is 8 + 8. Use that to find 16 − 8.", 8],
    ["Think of 14 as 4 + 10. What is 14 − 4?", 10],
    ["If 6 × 7 = 42, then 7 × 6 = ?", 42],
    ["Since 5 + 5 = 10, what is 10 − 5?", 5],
    ["Rewrite 7 + 6 as (7 + 3) + 3. What is the total?", 13],
    ["Distributive: 7 × 11 = 7 × 10 + 7 × 1. What is the product?", 77],
  ])("fails a prompt that prints its own worked step: %s", (prompt, answer) => {
    expect(workedStepFinding(item(prompt, answer))?.id).toBe("workedStepGiveaway");
  });

  it.each([
    ["9 + 9 = 18. What is 9 + 10?", 19],
    ["Use near-doubles: since 25 + 25 = 50, what is 25 + 26?", 51],
    ["13 − 8 = 5, so 23 − 8 = ?", 15],
    ["What is 8 + 9?", 17],
    ["What is 16 − 8?", 8],
    ["Make a ten: 8 + 5 = 10 + ?", 3],
    ["29 + 41 = 30 + ? What number goes in the box?", 40],
    ["Think: 6 × ? = 54", 9],
    ["Use 5 × 6 = 30 to find 5 × 7.", 35],
    ["Ben pours 1/3 of a cup at a time to reach 2/3 of a cup. How many pours is that?", 2],
    ["Diego saves 1/4 of 16 dollars. How many dollars does Diego save?", 4],
    // A wrong result to check, where the answer happens to be printed.
    ["Ravi says 28 − 14 = 15. What is the correct answer?", 14],
  ])("passes a prompt that leaves the step to the kid: %s", (prompt, answer) => {
    expect(workedStepFinding(item(prompt, answer))).toBeNull();
  });

  it("ignores items whose answer is not a number", () => {
    expect(workedStepFinding(item("Is 29 + 41 = 30 + 40 true?", "Yes"))).toBeNull();
  });
});

describe("sequence card", () => {
  it.each([
    [[2, 4, 6], 8],
    [[20, 15, 10], 5],
    [[1, 2, 4, 8], 16],
    [[1.4, 1.6, 1.8], 2],
    [["red", "blue", "red", "blue"], "red"],
    [["circle", "square", "triangle", "circle", "square"], "triangle"],
  ])("knows the next term of %j", (seq, next) => {
    expect(sequenceNextTerm(seq)).toBe(next);
  });

  it.each([[[3, 6]], [[4, "?", 8]], [[1, 2, 4, 7]]])("does not guess past %j", (seq) => {
    expect(sequenceNextTerm(seq)).toBeNull();
  });

  const seqItem = (sequence, answer, step) => ({ question: { answer, display: { sequence, step, promptText: "x" } } });
  it("fails a card whose answer is not the next term", () => {
    expect(sequenceCardFinding(seqItem([16, 20, 24], "No"))?.id).toBe("sequenceCardMismatch");
    expect(sequenceCardFinding(seqItem([3, 6], 12))?.id).toBe("sequenceCardMismatch");
    expect(sequenceCardFinding(seqItem([526, 539, "?", 565], 552))?.id).toBe("sequenceCardMismatch");
  });
  it("passes a true next-term card", () => {
    expect(sequenceCardFinding(seqItem([16, 20, 24], 28))).toBeNull();
    expect(sequenceCardFinding(seqItem([10, 15], 20, 5))).toBeNull();
  });

  // The generator is the fallback for an empty cell: what it draws must be
  // honest too.
  it.each(["patterns", "skipCounting", "counting"])("%s generator never draws a mismatched card", (modeId) => {
    const mode = modeRegistry[modeId];
    const bad = [];
    for (let level = 1; level <= 10; level++) {
      for (let i = 0; i < 200; i++) {
        const q = mode.generate(level, {});
        const hit = sequenceCardFinding({ question: q });
        if (hit) bad.push(`${level}: ${JSON.stringify(q.display)} -> ${JSON.stringify(q.answer)}`);
      }
    }
    expect(bad.slice(0, 5)).toEqual([]);
  });
});

describe("kid voice", () => {
  it.each([
    "Use compensation: 29 + 41 = 30 + ? What number goes in the box?",
    "Leo rotates a telescope mount through a quarter turn. Determine the rotation in degrees.",
    "Mia certifies that 0.5 = 0.50. Is the certification valid?",
    "Audit the statement 3/4 > 2/3. Clean audit?",
    "Find the subtrahend: 12 - ? = 7.",
  ])("fails test-maker wording: %s", (prompt) => {
    expect(teacherVoiceFinding(item(prompt, 1))?.id).toBe("teacherVoice");
  });
  it.each([
    "Make a ten: 8 + 5 = 10 + ? What number goes in the box?",
    "What is the value of the 4 in 342?",
    "Mia says 0.5 = 0.50. Is Mia right?",
    "Use a tape diagram. What is the missing part?",
  ])("passes kid wording: %s", (prompt) => {
    expect(teacherVoiceFinding(item(prompt, 1))).toBeNull();
  });

  it("fails British spelling anywhere on the card", () => {
    expect(britishSpellingFinding(item("How many centimetres longer is the rope?", 4))?.id).toBe("britishSpelling");
    expect(britishSpellingFinding({ question: { answer: "2 litres", choices: ["2 litres", "20 mL"], display: { promptText: "Which holds more?" } } })?.id).toBe("britishSpelling");
    expect(britishSpellingFinding(item("A tank holds 3 L. How many milliliters is that?", 3000))).toBeNull();
    expect(britishSpellingFinding(item("How many meters of fence does Ana need?", 20))).toBeNull();
  });

  it("fails a sentence after the question", () => {
    expect(questionNotLastFinding(item("What is 9 + 9? Diego checks.", 18))?.id).toBe("questionNotLast");
    expect(questionNotLastFinding(item("Which two pairs both make 11? Choose them.", 1))?.id).toBe("questionNotLast");
  });
  it("passes a prompt that ends on its question", () => {
    expect(questionNotLastFinding(item("Diego has 9 cars. He gets 9 more. How many cars does Diego have now?", 18))).toBeNull();
    expect(questionNotLastFinding(item("Fill the gap: 4, __, 8.", 6))).toBeNull();
    // The picture row being counted may follow the question.
    expect(questionNotLastFinding(item("How many apples are there? 🍎🍎🍎", 3))).toBeNull();
    // So may the number sentence the question asks about.
    expect(questionNotLastFinding(item("What number makes this true? 84 + 9 = 90 + □", 3))).toBeNull();
    expect(questionNotLastFinding(item("What number makes this true? □ − 30 = 29", 59))).toBeNull();
  });
});

// The runtime generators are the fallback a kid gets when a bank cell is
// empty, so their prose answers to the same kid-voice checks as the bank.
// Each mode is drawn untargeted and per family / per subskill (some varieties,
// like numberBonds' split drill, only appear when a skill session targets
// their subskill).
describe("generators speak kid voice", () => {
  const CHECKS = [teacherVoiceFinding, questionNotLastFinding, workedStepFinding, britishSpellingFinding];
  it.each(Object.keys(modeRegistry))("%s draws no teacherVoice / questionNotLast / workedStepGiveaway / britishSpelling prompt", (modeId) => {
    const mode = modeRegistry[modeId];
    const contexts = [
      [{}, 150],
      ...(mode.families || []).map((itemFamily) => [{ itemFamily }, 40]),
      ...(mode.subskills || []).map((targetSubskill) => [{ targetSubskill }, 40]),
    ];
    const bad = new Map();
    for (const [context, samples] of contexts) {
      for (let level = 1; level <= 10; level++) {
        for (let i = 0; i < samples; i++) {
          const q = mode.generate(level, { ...context });
          for (const check of CHECKS) {
            const hit = check({ itemId: "generated", modeId, question: q });
            if (hit && !bad.has(`${hit.id}:${q.display?.promptText}`)) {
              bad.set(`${hit.id}:${q.display?.promptText}`, `${hit.id} @${level} ${JSON.stringify(context)}: ${q.display?.promptText}`);
            }
          }
        }
      }
    }
    expect([...bad.values()].slice(0, 5)).toEqual([]);
  });
});
