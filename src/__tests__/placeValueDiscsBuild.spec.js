import { describe, it, expect } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import PlaceValueDiscs from "../components/PlaceValueDiscs.jsx";
import { WIDGETS } from "../components/widgetRegistry.js";
import { checkAnswer } from "../mathEngine.js";
import { promptIdentity } from "../itemBank/index.js";
import { paperBuildMat, paperFigureKey } from "../worksheets/generateWorksheet.js";
import { PromptItem } from "../worksheets/WorksheetSheet.jsx";
import { answerFormat, describeFigure } from "../../scripts/itemGen/qc/kidView.js";

/**
 * The placeValueDiscs widget's two modes, and the surfaces that must know the
 * tappable mat (build mode) exists: the registry, scoring, the blind-solve
 * view, paper, and the prompt identity. Read mode — every v1 bank row — must
 * render exactly as before: the mat plus the digit pad.
 */

const THEME = { cardBg: "bg-white/80", textPrimary: "text-ink", textSecondary: "text-ink/70", textMuted: "text-ink/50" };
const COLS = [{ place: 100, count: 1 }, { place: 10, count: 1 }, { place: 1, count: 4 }];

const render = (props) =>
  renderToStaticMarkup(
    createElement(PlaceValueDiscs, { onSubmit: () => {}, feedback: null, theme: THEME, lowMotionMode: true, cols: COLS, ...props })
  );
// The <button …> tag carrying this aria-label, or null.
const buttonTag = (html, label) => html.match(new RegExp(`<button[^>]*aria-label="${label}"[^>]*>`))?.[0] ?? null;
const discCount = (html) => (html.match(/disc-label/g) || []).length;
// What a sighted kid reads, tags stripped.
const textOf = (html) => html.replace(/<[^>]+>/g, "");

const buildQuestion = (over = {}) => ({
  answer: 921,
  answerType: "placeValueDiscs",
  display: { mode: "build", cols: COLS, promptText: "Add 8 hundreds and 7 ones to the mat. What number does your mat show?" },
  ...over,
});

describe("read mode is unchanged", () => {
  it("renders the fixed mat and the digit pad, no build controls", () => {
    for (const mode of [undefined, "read"]) {
      const html = render(mode ? { mode } : {});
      for (const d of "0123456789") expect(html).toMatch(new RegExp(`>${d}</button>`));
      expect(html).toContain('aria-label="Delete"');
      expect(html).toContain('aria-label="Submit answer"');
      expect(html).toContain('aria-label="Place value discs"');
      expect(html).not.toContain("Add a one disc");
      expect(html).not.toContain("Start over");
      // read mode's mat draws one disc per count, labelled with its place
      expect((html.match(/>100<\/div>/g) || []).length).toBe(1);
      expect((html.match(/>1<\/div>/g) || []).length).toBe(4);
    }
  });

  it("the registry keeps sending read mode to every v1 payload", () => {
    expect(WIDGETS.placeValueDiscs.props({ display: { cols: COLS } })).toEqual({ cols: COLS, mode: "read" });
    expect(WIDGETS.placeValueDiscs.props({ display: { cols: COLS, mode: "read" } }).mode).toBe("read");
    expect(WIDGETS.placeValueDiscs.props({ display: { cols: COLS, mode: "count" } }).mode).toBe("read");
  });
});

describe("build mode renders the tappable mat", () => {
  it("the registry passes display.mode and the start mat through", () => {
    expect(WIDGETS.placeValueDiscs.props(buildQuestion())).toEqual({ cols: COLS, mode: "build" });
  });

  it("labels the columns in words and draws the start mat's discs", () => {
    const html = render({ mode: "build" });
    for (const word of ["hundreds", "tens", "ones"]) expect(html).toContain(`>${word}</p>`);
    expect(html).not.toContain(">thousands</p>");
    expect(discCount(html)).toBe(6);
    expect(html).toContain('aria-label="1 hundred disc"');
    expect(html).toContain('aria-label="4 one discs"');
  });

  it("has − and + on every place and the break-downs, all plainly labelled", () => {
    const html = render({ mode: "build" });
    for (const place of ["hundred", "ten", "one"]) {
      expect(buttonTag(html, `Add a ${place} disc`), place).not.toBeNull();
      expect(buttonTag(html, `Take away a ${place} disc`), place).not.toBeNull();
    }
    expect(buttonTag(html, "Trade 1 hundred for 10 tens")).not.toBeNull();
    expect(buttonTag(html, "Trade 1 ten for 10 ones")).not.toBeNull();
    expect(textOf(html)).toContain("1 ten → 10 ones");
    expect(buttonTag(html, "Start over")).not.toBeNull();
    expect(buttonTag(html, "Check")).not.toBeNull();
    // no digit pad, and no running number while the kid builds
    expect(html).not.toContain('aria-label="Submit answer"');
    expect(html).not.toContain(">114<");
  });

  it("shows a trade up only when it can happen", () => {
    expect(buttonTag(render({ mode: "build" }), "Trade 10 ones for 1 ten")).toBeNull();
    const over = render({ mode: "build", cols: [{ place: 10, count: 1 }, { place: 1, count: 12 }] });
    expect(buttonTag(over, "Trade 10 ones for 1 ten")).not.toBeNull();
    expect(textOf(over)).toContain("10 ones → 1 ten");
  });

  it("holds Check while a place has 10 or more, and says why", () => {
    const ok = render({ mode: "build" });
    expect(buttonTag(ok, "Check")).not.toMatch(/ disabled=""/);
    const over = render({ mode: "build", cols: [{ place: 10, count: 1 }, { place: 1, count: 12 }] });
    expect(buttonTag(over, "Check")).toMatch(/ disabled=""/);
    expect(over).toContain("The ones have 12 discs. Trade 10 ones for 1 ten.");
    expect(over).toMatch(/aria-live="polite"[^>]*>The ones have 12 discs/);
  });

  it("disables − at 0, + at the cap, a break-down that cannot happen, and Start over at the start", () => {
    const html = render({ mode: "build", cols: [{ place: 100, count: 0 }, { place: 10, count: 19 }, { place: 1, count: 0 }] });
    expect(buttonTag(html, "Take away a hundred disc")).toMatch(/ disabled=""/);
    expect(buttonTag(html, "Add a ten disc")).toMatch(/ disabled=""/);
    expect(buttonTag(html, "Trade 1 hundred for 10 tens")).toMatch(/ disabled=""/); // 0 hundreds
    expect(buttonTag(html, "Trade 1 ten for 10 ones")).not.toMatch(/ disabled=""/);
    expect(buttonTag(html, "Start over")).toMatch(/ disabled=""/);
  });

  it("fits 19 discs in a place: four rows of five, slots for all of them", () => {
    const html = render({ mode: "build", cols: [{ place: 10, count: 19 }, { place: 1, count: 19 }] });
    expect(discCount(html)).toBe(38);
    expect(html).toContain('aria-label="19 one discs"');
    const empty = render({ mode: "build", cols: [{ place: 10, count: 0 }, { place: 1, count: 3 }] });
    expect(empty).toContain('aria-label="No ten discs"'); // what a screen reader hears, as on iOS
  });

  it("is locked while feedback shows", () => {
    for (const feedback of ["correct", "wrong"]) {
      const html = render({ mode: "build", feedback });
      for (const label of ["Add a one disc", "Take away a ten disc", "Trade 1 ten for 10 ones", "Check"]) {
        expect(buttonTag(html, label), `${feedback} ${label}`).toMatch(/ disabled=""/);
      }
    }
  });

  it("adds a thousands column when the start mat has one; − and + stack in a narrow column", () => {
    const html = render({
      mode: "build",
      cols: [{ place: 1000, count: 0 }, { place: 100, count: 9 }, { place: 10, count: 0 }, { place: 1, count: 0 }],
    });
    expect(html).toContain(">thousands</p>");
    expect(buttonTag(html, "Trade 1 thousand for 10 hundreds")).not.toBeNull();
    // stacked (+ on top) by default, side by side once a column is 92px wide
    expect(html).toContain("flex flex-col-reverse gap-1 @min-[92px]:grid @min-[92px]:grid-cols-2");
  });
});

describe("build mode scores through the same path", () => {
  it("a Number submission is judged numerically, as in read mode", () => {
    const q = buildQuestion();
    expect(checkAnswer(q, 921)).toBe(true);
    expect(checkAnswer(q, 911)).toBe(false);
    expect(checkAnswer({ ...q, display: { cols: COLS } }, 921)).toBe(true);
  });
});

describe("the blind solver sees the build mat as the kid does", () => {
  it("describes the start mat and the answer the mat gives", () => {
    const q = buildQuestion();
    expect(describeFigure(q)).toBe(
      "A disc mat you can change: 1 hundred disc, 1 ten disc, 4 one discs. You can add or take away discs and trade 10 of a place for 1 of the next."
    );
    expect(answerFormat(q)).toBe("the number your finished mat shows (each place 9 discs or fewer), as a whole number");
  });

  it("read mode reads as before", () => {
    const q = { answer: 114, answerType: "placeValueDiscs", display: { cols: COLS, promptText: "What number?" } };
    expect(describeFigure(q)).toBe("Place-value discs: 1 disc worth 100, 1 disc worth 10, 4 discs worth 1.");
    expect(answerFormat(q)).toBe("type a whole number (digits only, no units)");
  });
});

describe("on paper", () => {
  it("prints the start mat as the question's disc mat", () => {
    const q = paperBuildMat(buildQuestion());
    expect(q.display.figure).toBe("discMat");
    expect(q.display.discMat).toEqual({ cols: COLS });
    expect(paperFigureKey(q)).toBe("discMat");
    expect(buildQuestion().display.figure).toBeUndefined(); // a copy, not the bank row
  });

  it("leaves read mode, other widgets and authored figures alone", () => {
    const read = { answer: 114, answerType: "placeValueDiscs", display: { cols: COLS, promptText: "x" } };
    expect(paperBuildMat(read)).toBe(read);
    const pad = { answer: 3, answerType: "numberPad", display: { mode: "build", cols: COLS } };
    expect(paperBuildMat(pad)).toBe(pad);
    const authored = buildQuestion({ display: { ...buildQuestion().display, figure: "discMat", discMat: { cols: [{ place: 10, count: 2 }] } } });
    expect(paperBuildMat(authored)).toBe(authored);
  });

  it("renders on a sheet with the mat and the answer box, without crashing", () => {
    const html = renderToStaticMarkup(createElement(PromptItem, { question: paperBuildMat(buildQuestion()), number: 1 }));
    expect(html).toContain("Add 8 hundreds and 7 ones to the mat.");
    // PaperMat: outlined discs, one per start count
    expect((html.match(/rounded-full border-\[1\.5px\] border-black/g) || []).length).toBe(6);
    const key = renderToStaticMarkup(createElement(PromptItem, { question: paperBuildMat(buildQuestion()), number: 1, answer: 921 }));
    expect(key).toContain("921");
  });
});

describe("prompt identity", () => {
  it("counts the start mat as part of the question", () => {
    const item = (cols) => ({ modeId: "multiDigit", question: { answerType: "placeValueDiscs", display: { mode: "build", cols } } });
    const text = "Add 2 tens. What number does your mat show?";
    expect(promptIdentity(item(COLS), text)).not.toBe(promptIdentity(item([{ place: 10, count: 3 }, { place: 1, count: 4 }]), text));
    expect(promptIdentity(item(COLS), text)).toBe(promptIdentity(item(COLS.map((c) => ({ ...c }))), text));
  });

  it("read-mode identity is unchanged", () => {
    const read = { modeId: "placeValueDiscs", question: { answerType: "placeValueDiscs", display: { cols: COLS } } };
    expect(promptIdentity(read, "What number do the discs show?")).toBe("What number do the discs show?");
  });
});
