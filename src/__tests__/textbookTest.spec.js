import { describe, it, expect } from "vitest";
import {
  measureModel,
  scoreModel,
  scorePanel,
  checkEntry,
  checkSql,
  hasLetterLabel,
  systemFor,
  modelBlock,
  readsOf,
  RUBRIC,
  ROLES,
  SCORED_LINES,
  NOTE_LINES,
  FAIL_VOTES,
  REVIEW_VOTES,
  DEFAULT_RUNS,
} from "../../scripts/itemModels/textbookTest.js";
import { spawnSync } from "node:child_process";
import G2_WP_COMPARE from "../itemModels/g2Addsub/wpCompare.json";
import G2_MONEY from "../itemModels/pilot/grade2Money.json";

/**
 * The textbook test (Sai's bar, 2026-10-03; design in
 * scripts/itemModels/textbookTest.js, calibration in docs/textbook-test.md).
 * The readers need the `claude` CLI and stay out of CI; the counting layer
 * and the vote rule are pure and pinned here, because changing either moves
 * every verdict the calibration measured.
 */

const models = Array.isArray(G2_WP_COMPARE) ? G2_WP_COMPARE : G2_WP_COMPARE.models || Object.values(G2_WP_COMPARE);
const model = (id) => {
  const m = models.find((x) => x.id === id);
  if (!m) throw new Error(`no model ${id}`);
  return m;
};

describe("the counting layer", () => {
  it("fails the story Sai rejected for one context, and passes its fix", () => {
    // "every single one of this is read books on Saturday. need variety"
    const before = measureModel(model("wp-g2-compare-difference-fewer"));
    expect(before.flags.some((f) => /^only \d+ different things? to count/.test(f))).toBe(true);
    const after = measureModel(model("wp-g2-compare-difference-fewer-2"));
    expect(after.flags).toEqual([]);
    expect(after.stats.objects).toBeGreaterThanOrEqual(5);
  });

  it("fails a story whose bars are lettered, and passes the fix that names them", () => {
    // "label the bars as the names in the problem"
    const before = measureModel(model("wp-g2-tape-compare-bigger-fewer"));
    expect(before.flags).toContain("a picture part is named with a letter (bar A, mat B) instead of a name from the problem");
    const after = measureModel(model("wp-g2-tape-compare-bigger-fewer-2"));
    expect(after.flags.some((f) => /named with a letter/.test(f))).toBe(false);
  });

  it("reads a capital letter after a picture word as a label, and story words as words", () => {
    expect(hasLetterLabel("Bar A shows Mia's stickers.")).toBe(true);
    expect(hasLetterLabel("Put 3 tens on Mat B.")).toBe(true);
    expect(hasLetterLabel("Ana wants to set a goal of 40 laps.")).toBe(false);
    expect(hasLetterLabel("Leo can tape a note to the box a friend made.")).toBe(false);
  });

  it("notes a coin choice that is never the key", () => {
    const money = Array.isArray(G2_MONEY) ? G2_MONEY : G2_MONEY.models || Object.values(G2_MONEY);
    const m = measureModel(money.find((x) => x.id === "money-g2-equivWhichCoinWorth-easy"));
    expect(m.flags).toEqual([]);
    expect(m.notes.some((n) => /^the key is only ever .+ in 40 questions$/.test(n))).toBe(true);
  });

  it("gives the same answer every run", () => {
    const m = model("wp-g2-compare-difference-fewer-2");
    expect(measureModel(m)).toEqual(measureModel(m));
    // The readers see the same ten questions each run; only the choice order
    // is shuffled, as the session shuffles it for the kid.
    const unordered = (reads) => reads.map((r) => ({ ...r, choices: r.choices ? r.choices.map(String).sort() : r.choices }));
    expect(unordered(readsOf(m))).toEqual(unordered(readsOf(m)));
    expect(readsOf(m)).toHaveLength(10);
  });
});

const yes = { pass: true, evidence: "", fix: "" };
const no = (evidence = "Q1: \"a quote\"") => ({ pass: false, evidence, fix: "a fix" });
const reply = (run, role, lines) => ({ run, role, lines });
const clean = { flags: [], notes: [] };
const sixReplies = (line, noCount) => {
  const out = [];
  let n = 0;
  for (let run = 1; run <= DEFAULT_RUNS; run++) {
    for (const role of ROLES) out.push(reply(run, role, { [line]: n++ < noCount ? no() : yes }));
  }
  return out;
};

describe("the vote rule", () => {
  it("is six votes: three roles, two runs; 4 fail a line, 2 send it to Sai", () => {
    expect(ROLES.length * DEFAULT_RUNS).toBe(6);
    expect(FAIL_VOTES).toBe(4);
    expect(REVIEW_VOTES).toBe(2);
    expect(scoreModel(clean, sixReplies("real", 4)).verdict).toBe("fail");
    expect(scoreModel(clean, sixReplies("real", 3)).verdict).toBe("review");
    expect(scoreModel(clean, sixReplies("real", 2)).verdict).toBe("review");
    // One reader's taste is dropped.
    expect(scoreModel(clean, sixReplies("real", 1)).verdict).toBe("pass");
  });

  it("does not count a no that quotes nothing", () => {
    const replies = sixReplies("voice", 0).map((r) => ({ ...r, lines: { voice: { pass: false, evidence: "  ", fix: "" } } }));
    expect(scoreModel(clean, replies).verdict).toBe("pass");
  });

  it("keeps variety as a note: a model keeps one question shape by design", () => {
    expect(NOTE_LINES).toEqual(["fresh"]);
    expect(SCORED_LINES).not.toContain("fresh");
    const s = scoreModel(clean, sixReplies("fresh", 6));
    expect(s.verdict).toBe("pass");
    expect(s.pageNotes).toHaveLength(6);
  });

  it("fails on a counted flag whatever the readers say", () => {
    expect(scoreModel({ flags: ["only 1 different thing to count in 40 questions"], notes: [] }, sixReplies("real", 0)).verdict).toBe("fail");
  });

  it("calls a model incomplete when a reply is missing, unless it already fails", () => {
    expect(scorePanel(clean, sixReplies("real", 0)).verdict).toBe("pass");
    const five = scorePanel(clean, sixReplies("real", 0).slice(1));
    expect(five.verdict).toBe("incomplete");
    expect(five.notes).toContain("only 5 of 6 reader replies came back");
    expect(scorePanel(clean, []).verdict).toBe("incomplete");
    // Two notes out of five is still not a full read.
    expect(scorePanel(clean, sixReplies("real", 2).slice(0, 5)).verdict).toBe("incomplete");
    // Four no votes fail the line whatever the sixth reader would say.
    expect(scorePanel(clean, sixReplies("real", 4).slice(0, 5)).verdict).toBe("fail");
  });
});

describe("what the readers are asked", () => {
  it("asks every rubric line in the reply shape", () => {
    for (const role of ROLES) {
      const sys = systemFor(role);
      for (const [key] of RUBRIC) expect(sys).toContain(`"${key}": {"pass": boolean`);
      expect(sys).toMatch(/A dislike you cannot quote is not a fail/);
    }
  });

  it("never fails a made-up price (Sai, 2026-10-03), only a place that doesn't fit", () => {
    const real = RUBRIC.find(([k]) => k === "real")[1];
    expect(real).toMatch(/Never fail a price/);
    expect(real).toMatch(/bananas are not sold at the school store/);
  });

  it("shows each question as the child sees it", () => {
    const m = model("wp-g2-compare-difference-fewer-2");
    const block = modelBlock(m.id, m.grade, readsOf(m));
    expect(block).toMatch(/^modelId: wp-g2-compare-difference-fewer-2\ngrade: 2\nQ1\. /);
    expect(block).toContain("Q10. ");
    expect(block).toContain("the child answers: ");
  });
});

describe("the card on the review screen", () => {
  it("is green on pass, amber with the quotes on review, red on fail", () => {
    const pass = checkEntry(scoreModel(clean, sixReplies("real", 0)), { checkedAt: "2026-10-03T12:00:00Z" });
    expect(pass).toEqual({ verdict: "pass", ok: true, checked_at: "2026-10-03T12:00:00Z" });

    const review = checkEntry(scoreModel(clean, sixReplies("clear", 3)));
    // "notes" in the verdict is what turns the review screen's card amber.
    expect(review.verdict).toBe("1 reader note");
    expect(review.ok).toBeNull();
    expect(review.reason).toMatch(/^one clear task \(3 of 6\): Q1: "a quote" Fix: a fix$/);

    const fail = checkEntry(scoreModel({ flags: ["the answer is the same in all 40 questions"], notes: [] }, []));
    expect(fail).toMatchObject({ verdict: "fail", ok: false, reason: "Counted: the answer is the same in all 40 questions." });
  });

  it("is stored on drafts only, next to the model's other checks", () => {
    const lit = (x) => `'${String(x).replaceAll("'", "''")}'`;
    const sql = checkSql("wp-g2-x", { verdict: "pass", ok: true }, lit);
    expect(sql).toMatch(/^update public\.item_models set spec = jsonb_set\(spec, '\{checks\}', /);
    // A checks value that is not an object (null, an array) is replaced, not appended to.
    expect(sql).toContain("case when jsonb_typeof(spec->'checks') = 'object' then spec->'checks' else '{}'::jsonb end || jsonb_build_object('textbook', '{\"verdict\":\"pass\",\"ok\":true}'::jsonb)");
    expect(sql).toMatch(/ where id = 'wp-g2-x' and review_status = 'draft';$/);
  });
});

describe("the command line", () => {
  const cli = (...args) =>
    spawnSync(process.execPath, ["--import", "./scripts/lib/registerResolve.js", "scripts/itemModels/textbookTest.mjs", ...args], { encoding: "utf8" });

  it("refuses to store a counts-only run as a pass", () => {
    const r = cli("models.json", "--measures-only", "--sql", "out.sql");
    expect(r.status).toBe(2);
    expect(r.stderr).toMatch(/--sql needs the readers/);
  });

  it("refuses run, batch and concurrency settings the vote rule can't use", () => {
    expect(cli("models.json", "--runs", "4").status).toBe(2);
    expect(cli("models.json", "--batch", "0").status).toBe(2);
    expect(cli("models.json", "--concurrency", "x").status).toBe(2);
  });
});
