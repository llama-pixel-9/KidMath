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
  payload: { a: 2, b: 3, op: "+", answer: 5, display: { promptText: "2 birds and 3 birds. How many?" } },
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

  it("flags a placeholder leak as a failure", () => {
    const qc = runChecksOnAdminItem(
      adminItem({ payload: { a: 2, b: 3, op: "+", answer: 5, display: { promptText: "{actor} has 2 and 3." } } })
    );
    expect(qc.pass).toBe(false);
    expect(qc.findings.some((f) => f.id === "placeholderLeak")).toBe(true);
  });

  it("reconciles the admin field shape (payload, levelMin/Max) with the check inputs", () => {
    // A malformed adapter would silently pass everything by feeding undefined.
    const qc = runChecksOnAdminItem(adminItem({ payload: undefined }));
    expect(qc.findings.length).toBeGreaterThan(0);
  });
});
