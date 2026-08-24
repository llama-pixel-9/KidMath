import { describe, it, expect } from "vitest";
import { runChecksOnAdminItem } from "../itemBank/qc/checks.js";

/**
 * The review queue runs the SAME deterministic checks as the CLI QC and the
 * batch pre-screen. If the admin adapter drifts from the check inputs, a
 * reviewer sees a different verdict than the pipeline — the one thing this
 * integration must not do.
 */

const adminItem = (over = {}) => ({
  itemId: "addition-app-x",
  modeId: "addition",
  structureType: "addToResultUnknown",
  itemFamily: "application",
  levelMin: 1,
  levelMax: 3,
  payload: { a: 2, b: 3, op: "+", answer: 5, display: { promptText: "2 birds and 3 birds. How many birds in all?" } },
  ...over,
});

describe("review queue QC adapter", () => {
  it("passes a sound item", () => {
    const qc = runChecksOnAdminItem(adminItem());
    expect(qc.pass).toBe(true);
  });

  it("fails an item whose arithmetic is wrong", () => {
    const qc = runChecksOnAdminItem(
      adminItem({ payload: { a: 2, b: 3, op: "+", answer: 6, display: { promptText: "2 and 3?" } } })
    );
    expect(qc.pass).toBe(false);
    expect(qc.findings.some((f) => f.id === "arithmetic")).toBe(true);
  });

  it("fails a Kindergarten item with out-of-band numbers", () => {
    const qc = runChecksOnAdminItem(
      adminItem({
        levelMin: 1,
        levelMax: 3,
        payload: { a: 40, b: 55, op: "+", answer: 95, display: { promptText: "40 and 55?" } },
      })
    );
    expect(qc.pass).toBe(false);
    expect(qc.findings.some((f) => f.id === "bandAppropriate")).toBe(true);
  });

  it("fails a clock item that describes hand positions with no face", () => {
    const qc = runChecksOnAdminItem(
      adminItem({
        itemId: "time-conc-x",
        modeId: "time",
        structureType: "judgeOclockRead",
        itemFamily: "conceptual",
        payload: {
          a: null, b: null, op: "time", answer: "No", choices: ["Yes", "No"],
          display: { promptText: "Rosa reads a clock with the hour hand on six and the minute hand on twelve as seven o'clock. Is that right?" },
        },
      })
    );
    expect(qc.pass).toBe(false);
    expect(qc.findings.some((f) => f.id === "describedClockHands")).toBe(true);
  });

  it("passes the same claim when the clock face is shown", () => {
    const qc = runChecksOnAdminItem(
      adminItem({
        itemId: "time-conc-y",
        modeId: "time",
        structureType: "judgeOclockRead",
        itemFamily: "conceptual",
        payload: {
          a: null, b: null, op: "time", answer: "No", choices: ["Yes", "No"],
          display: { figure: "clockFace", clock: { hour: 6, minute: 0 }, promptText: "Rosa reads this clock as seven o'clock. Is that right?" },
        },
      })
    );
    expect(qc.findings.some((f) => f.id === "describedClockHands")).toBe(false);
  });

  it("fails hand-position words hiding in the choices", () => {
    const qc = runChecksOnAdminItem(
      adminItem({
        itemId: "time-conc-w",
        modeId: "time",
        structureType: "whichClockShowsHour",
        itemFamily: "conceptual",
        payload: {
          a: null, b: null, op: "time", answer: "long hand at 12, short hand at 3",
          choices: ["long hand at 12, short hand at 3", "long hand at 3, short hand at 12"],
          display: { promptText: "Which clock face shows 3 o'clock?" },
        },
      })
    );
    expect(qc.pass).toBe(false);
    expect(qc.findings.some((f) => f.id === "describedClockHands")).toBe(true);
  });

  it("leaves hands-as-subject prompts alone", () => {
    const qc = runChecksOnAdminItem(
      adminItem({
        itemId: "time-conc-z",
        modeId: "time",
        structureType: "whichHandHour",
        itemFamily: "conceptual",
        payload: {
          a: null, b: null, op: "time", answer: "the short hand", choices: ["the short hand", "the long hand"],
          display: { promptText: "Ava wants the hand that tells the HOUR. Which hand is it?" },
        },
      })
    );
    expect(qc.findings.some((f) => f.id === "describedClockHands")).toBe(false);
  });

  it("fails a covered clock class shipped without its face", () => {
    const base = {
      itemId: "time-conc-f", modeId: "time", structureType: "judgeFiveRead", itemFamily: "conceptual",
      payload: {
        a: null, b: null, op: "time", answer: "No", choices: ["Yes", "No"],
        display: { time: { kind: "judgeRead", hour: 3, minute: 15 }, promptText: "Mina reads this clock as 3:20. Is Mina right?" },
      },
    };
    const qc = runChecksOnAdminItem(adminItem(base));
    expect(qc.findings.some((f) => f.id === "missingRequiredFigure")).toBe(true);
    const fixed = runChecksOnAdminItem(
      adminItem({ ...base, payload: { ...base.payload, display: { ...base.payload.display, figure: "clockFace", clock: { hour: 3, minute: 15 } } } })
    );
    expect(fixed.findings.some((f) => f.id === "missingRequiredFigure")).toBe(false);
  });

  it("fails an undeclared class under a contracted mode", () => {
    const qc = runChecksOnAdminItem(
      adminItem({
        itemId: "time-conc-u", modeId: "time", structureType: "brandNewClockThing", itemFamily: "conceptual",
        payload: { a: null, b: null, op: "time", answer: "Yes", choices: ["Yes", "No"], display: { promptText: "A new kind of clock question?" } },
      })
    );
    expect(qc.findings.some((f) => f.id === "undeclaredFigureClass")).toBe(true);
  });

  it("phantom display keys no longer exempt a described picture", () => {
    const qc = runChecksOnAdminItem(
      adminItem({
        itemId: "counting-conc-p", modeId: "counting", structureType: "countObjects", itemFamily: "conceptual",
        payload: {
          a: null, b: null, op: "count", answer: 4,
          display: { time: { phantom: true }, promptText: "A small set of 4 dots. How many dots are there?" },
        },
      })
    );
    expect(qc.findings.some((f) => f.id === "figurelessQuantity")).toBe(true);
  });

  it("leaves widget-rendered items alone (the visual lives in the answer widget)", () => {
    const qc = runChecksOnAdminItem(
      adminItem({
        itemId: "numberBonds-conc-t", modeId: "numberBonds", structureType: "frameWholeUnknown", itemFamily: "conceptual",
        payload: {
          a: 6, b: 4, op: "bond", answer: 4, answerType: "tenFrame",
          display: { filled: 6, frames: 1, frameMode: "empty", promptText: "6 counters are in the ten frame. How many empty cells are left?" },
        },
      })
    );
    expect(qc.findings.some((f) => f.id === "figurelessQuantity")).toBe(false);
  });

  it("flags a placeholder leak as a failure", () => {
    const qc = runChecksOnAdminItem(
      adminItem({ payload: { a: 2, b: 3, op: "+", answer: 5, display: { promptText: "{actor} has 2 and 3." } } })
    );
    expect(qc.pass).toBe(false);
    expect(qc.findings.some((f) => f.id === "placeholderLeak")).toBe(true);
  });

  it("flags a self-answering prompt whose only number is the answer", () => {
    const qc = runChecksOnAdminItem(
      adminItem({
        payload: {
          a: 14, b: null, op: "count", answer: 14,
          display: { promptText: "There are 14 toy cars on a shelf. How many toy cars are there?" },
        },
      })
    );
    expect(qc.findings.some((f) => f.id === "selfAnswering" && f.severity === "fail")).toBe(true);
    // With a visual payload the prose count is a caption, not a giveaway.
    const visual = runChecksOnAdminItem(
      adminItem({
        payload: {
          a: 14, b: null, op: "count", answer: 14,
          display: { promptText: "Count the toy cars. How many are there in the picture?", emoji: "🚗", count: 14 },
        },
      })
    );
    expect(visual.findings.some((f) => f.id === "selfAnswering")).toBe(false);
  });

  it("flags a decorative story sentence on a bare-number question", () => {
    const qc = runChecksOnAdminItem(
      adminItem({
        levelMin: 7,
        levelMax: 10,
        payload: {
          a: 53, b: null, op: "place", answer: 5,
          display: { promptText: "Emma has 53 pencils. How many tens are in 53?" },
        },
      })
    );
    expect(qc.pass).toBe(false);
    expect(qc.findings.some((f) => f.id === "decorativeContext")).toBe(true);
    // The bare question alone is fine.
    const bare = runChecksOnAdminItem(
      adminItem({
        levelMin: 7,
        levelMax: 10,
        payload: { a: 53, b: null, op: "place", answer: 5, display: { promptText: "How many tens are in 53?" } },
      })
    );
    expect(bare.findings.some((f) => f.id === "decorativeContext")).toBe(false);
  });

  it("fails teacher vocabulary in a kid-facing prompt", () => {
    const qc = runChecksOnAdminItem(
      adminItem({
        modeId: "counting",
        payload: { a: 4, b: null, op: "count", answer: 4, display: { promptText: "A small set of 4 dots. Subitize the count.", emoji: "🟠", counting: { count: 4 } } },
      })
    );
    expect(qc.findings.some((f) => f.id === "teacherJargon" && f.severity === "fail")).toBe(true);
    const ok = runChecksOnAdminItem(
      adminItem({ payload: { a: 2, b: 3, op: "+", answer: 5, display: { promptText: "Split 5 into two parts: 2 and how many more?" } } })
    );
    expect(ok.findings.some((f) => f.id === "teacherJargon")).toBe(false);
  });

  it("fails a counting prompt that describes a picture the item never shows", () => {
    const bare = runChecksOnAdminItem(
      adminItem({
        modeId: "counting",
        payload: { a: 10, b: null, op: "count", answer: 10, display: { promptText: "A ten frame is filled with a blue chip in every space. How many chips are on the frame?" } },
      })
    );
    expect(bare.findings.some((f) => f.id === "figurelessQuantity" && f.severity === "fail")).toBe(true);
    const withFigure = runChecksOnAdminItem(
      adminItem({
        modeId: "counting",
        payload: { a: 4, b: null, op: "count", answer: 4, display: { promptText: "How many dots?", emoji: "🟠", counting: { count: 4 } } },
      })
    );
    expect(withFigure.findings.some((f) => f.id === "figurelessQuantity")).toBe(false);
    const emojiRun = runChecksOnAdminItem(
      adminItem({ modeId: "counting", payload: { a: 3, b: null, op: "count", answer: 3, display: { promptText: "🍎🍎🍎 = ?" } } })
    );
    expect(emojiRun.findings.some((f) => f.id === "figurelessQuantity")).toBe(false);
    const story = runChecksOnAdminItem(
      adminItem({ payload: { a: 5, b: 10, op: "-", answer: 5, display: { promptText: "There are 5 seats on the bus and 10 children. How many children have no seat?" } } })
    );
    expect(story.findings.some((f) => f.id === "figurelessQuantity")).toBe(false);
  });

  it("reconciles the admin field shape (payload, levelMin/Max) with the check inputs", () => {
    // A malformed adapter would silently pass everything by feeding undefined.
    const qc = runChecksOnAdminItem(adminItem({ payload: undefined }));
    expect(qc.findings.length).toBeGreaterThan(0);
  });
});
