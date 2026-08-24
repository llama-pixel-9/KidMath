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
