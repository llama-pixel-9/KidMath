/* The printed sheet. Exported piece by piece so the public worksheet pages can
 * render the same paper the generator screen does.
 *
 * §15 brand rule: every mark on a sheet is 100% black — no tints, no colour,
 * no decorative glyphs. Fredoka for the maths, Nunito for the rest.
 *
 * One sheet, one layout (layouts.js): a parent never sees problems 1–12
 * stacked and 13–18 sideways.
 */
import LarkMark from "../components/LarkMark.jsx";
import { getPaperFigure } from "../components/figureRegistry";
import { isYesNoJudgment, printOptionBank } from "../mathEngine";
import { LAYOUTS, STORY_WORK_SPACE, printedAnswer } from "./layouts.js";

// Question ops are ASCII; the printed sheet uses the maths symbols.
const OP_SYMBOL = { "+": "+", "-": "−", "x": "×", "/": "÷" };
const MONO_THEME = { textPrimary: "text-black", textSecondary: "text-black", textMuted: "text-black" };
const GRID_COLUMNS = { 2: "grid-cols-2", 3: "grid-cols-3", 4: "grid-cols-4" };

export function ItemNumber({ n }) {
  return (
    <span className="w-5 flex-none text-right text-[11px] font-bold text-black leading-[1.4] pt-[3px]">
      {n}.
    </span>
  );
}

export function AnswerBox({ value = null, wide = false }) {
  return (
    <span
      className={`inline-flex items-center justify-center align-middle border-[1.5px] border-black h-[28px] ${wide ? "min-w-[64px] px-2" : "w-[44px]"} font-display font-semibold text-[16px] text-black`}
    >
      {value}
    </span>
  );
}

// Both operands right-aligned in one digit column, the operator hanging left
// on the second line, one 1.5px rule, then clear space for the child's own
// writing — `workSpace` is taller where partial products have to fit.
export function StackedItem({ question: q, number, answer = null, workSpace = 34 }) {
  return (
    <div className="flex gap-1.5" style={{ breakInside: "avoid" }}>
      <ItemNumber n={number} />
      <div
        className="w-[88px] font-display font-semibold text-[20px] text-black leading-[1.25]"
        style={{ fontVariantNumeric: "tabular-nums" }}
      >
        <div className="text-right pr-1">{q.a}</div>
        <div className="flex justify-between pr-1">
          <span>{OP_SYMBOL[q.op]}</span>
          <span>{q.b}</span>
        </div>
        <div className="border-t-[1.5px] border-black mt-[3px]" />
        <div className="text-right pr-1" style={{ height: workSpace }}>{answer}</div>
      </div>
    </div>
  );
}

// `a + b =` then the box. The box IS the blank — never a printed "?".
export function InlineItem({ question: q, number, answer = null }) {
  return (
    <div className="flex items-start gap-1.5" style={{ breakInside: "avoid" }}>
      <ItemNumber n={number} />
      <span className="font-display font-semibold text-[18px] text-black leading-[1.4]">
        {q.a} {OP_SYMBOL[q.op]} {q.b} ={" "}
      </span>
      <AnswerBox value={answer} />
    </div>
  );
}

// Division the way it is worked on paper: divisor, bracket over the dividend,
// the quotient written above the bar, work space underneath. Never stacked
// like a subtraction.
export function LongDivisionItem({ question: q, number, answer = null, workSpace = 92 }) {
  return (
    <div className="flex gap-1.5" style={{ breakInside: "avoid" }}>
      <ItemNumber n={number} />
      <div
        className="font-display font-semibold text-[20px] text-black leading-[1.25]"
        style={{ fontVariantNumeric: "tabular-nums" }}
      >
        <div className="h-[26px] pl-[44px] text-[17px]">{answer}</div>
        <div className="flex items-start">
          <span className="w-[36px] text-right pr-1.5">{q.b}</span>
          <span className="border-l-[1.5px] border-t-[1.5px] border-black rounded-tl-[6px] pl-2 pr-3 min-w-[64px]">
            {q.a}
          </span>
        </div>
        <div style={{ height: workSpace }} />
      </div>
    </div>
  );
}

function PromptFigure({ question: q, settled }) {
  const figure = getPaperFigure(q);
  if (!figure) return null;
  return (
    // Figures that are drawn in soft tints on screen (bar graph, disc mat,
    // clock) have a print design of their own, asked for with `paper: true`.
    // A blanket contrast filter is NOT the fix: it turned pale bars white.
    <div className="max-w-[240px] mb-1.5" style={{ filter: "grayscale(1)" }}>
      <figure.Component theme={MONO_THEME} {...(figure.props ? figure.props(q, { settled, paper: true }) : {})} />
    </div>
  );
}

// Worded items. The option bank prints only when the options ARE the question
// (#34) — a plain numeric answer gets just the blank box. Judgment items print
// as circle-Yes-or-No, and figure questions print their figure: a graph
// question without its graph is unanswerable on paper.
export function PromptItem({ question: q, number, answer = null }) {
  let body = null;
  if (q.display?.promptText) {
    body = q.display.promptText;
  } else if (q.display?.sequence) {
    body = `${q.display.sequence.join(", ")}, …`;
  } else if (q.display?.emoji) {
    body = Array.from({ length: q.display.count }, () => q.display.emoji).join(" ");
  }
  const subPrompt = q.subPrompt ?? q.display?.subPrompt;
  const judgment = isYesNoJudgment(q);
  const bank = printOptionBank(q);
  return (
    <div className="flex items-start gap-1.5" style={{ breakInside: "avoid" }}>
      <ItemNumber n={number} />
      <div className="flex-1 text-[13px] font-semibold text-black leading-[1.45]">
        <PromptFigure question={q} settled={answer != null} />
        <span>{body} </span>
        {subPrompt && <span>{subPrompt} </span>}
        {/* A printed option bank is answered by circling: a blank box beside
            four choices asks the child to copy one of them out. The key marks
            the right one with a heavy border. */}
        {bank && (
          <span className="flex flex-wrap items-center gap-1.5 mt-1 font-display font-semibold text-[13px]">
            <span className="mr-0.5 text-[14px]">Circle one:</span>
            {bank.map((c, i) => (
              <span
                key={i}
                className={`inline-flex items-center justify-center rounded-full px-2.5 min-h-[24px] ${
                  answer != null && String(c) === String(answer) ? "border-[2.5px] border-black" : "border border-black/40"
                }`}
              >
                {String(c)}
              </span>
            ))}
          </span>
        )}
        {bank ? null : judgment ? (
          <span className="inline-flex items-center gap-2 align-middle mx-1 font-display font-semibold text-[14px]">
            <span className="mr-0.5">Circle one:</span>
            {["Yes", "No"].map((label) => (
              <span
                key={label}
                className={`inline-flex items-center justify-center rounded-full px-2.5 h-[24px] ${
                  answer === label ? "border-[2.5px] border-black" : "border border-black/40"
                }`}
              >
                {label}
              </span>
            ))}
          </span>
        ) : (
          <AnswerBox value={answer} wide />
        )}
      </div>
    </div>
  );
}

// A word problem under a practice block, full width. A "pick two numbers"
// prompt (legacy sheets only) prints the number bank it picks from and a
// structured answer line (☐ + ☐ = 6).
export function WordProblem({ item, number, showAnswer = false, workSpace = 0 }) {
  if (!item) return null;
  const q = item.question;
  if (item.kind === "pickTwo") {
    const pair = Array.isArray(q.answer?.[0]) ? q.answer[0] : q.answer;
    return (
      <div className="flex items-start gap-1.5">
        <ItemNumber n={number} />
        <div className="space-y-3">
          <p className="text-[14px] font-semibold text-black leading-[1.5] m-0">
            {q.display.promptText.replace("Pick two numbers", "Pick two numbers from the box")}
          </p>
          <div className="flex gap-2">
            {q.display.options.map((opt, i) => (
              <span
                key={i}
                className="inline-flex items-center justify-center border-[1.5px] border-black w-[34px] h-[30px] font-display font-semibold text-[17px] text-black"
              >
                {opt}
              </span>
            ))}
          </div>
          <div className="flex items-center gap-2 font-display font-semibold text-[19px] text-black">
            <AnswerBox value={showAnswer ? pair?.[0] : null} />
            <span>+</span>
            <AnswerBox value={showAnswer ? pair?.[1] : null} />
            <span>= {q.a}</span>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="flex items-start gap-1.5" style={{ breakInside: "avoid" }}>
      <ItemNumber n={number} />
      <div className="flex-1 text-[14px] font-semibold text-black leading-[1.5]">
        <PromptFigure question={q} settled={showAnswer} />
        <span>{q.display?.promptText} </span>
        <AnswerBox value={showAnswer ? q.answer : null} wide />
        {workSpace > 0 && <div style={{ height: workSpace }} />}
      </div>
    </div>
  );
}

// A word-problems-only sheet gives every story a bordered box: the story on
// top, room to draw and work underneath, the answer line at the bottom.
export function StoryBox({ item, number, showAnswer = false, tall = true }) {
  const q = item.question;
  return (
    <div
      className="flex flex-col border-[1.5px] border-black rounded-[10px] p-3"
      style={{ breakInside: "avoid", minHeight: tall ? 264 : 0 }}
    >
      <div className="flex items-start gap-1.5">
        <ItemNumber n={number} />
        <div className="flex-1 text-[14px] font-semibold text-black leading-[1.5]">
          <PromptFigure question={q} settled={showAnswer} />
          {q.display?.promptText}
        </div>
      </div>
      <div className="mt-auto pt-3 flex items-center justify-end gap-2 text-[12px] font-bold text-black">
        Answer
        <AnswerBox value={showAnswer ? q.answer : null} wide />
      </div>
    </div>
  );
}

/** Header lockup + right-aligned title line, shared by every sheet. */
export function SheetHeader({ line }) {
  return (
    <div className="flex items-center gap-2.5 border-b-2 border-black pb-3">
      <LarkMark size={32} color="#000000" accent="#000000" eye="#FFFFFF" />
      <span className="font-display font-semibold text-2xl lowercase leading-none tracking-[-0.01em]">larkit</span>
      <span className="ml-auto pl-6 text-[12px] font-bold text-right leading-snug">{line}</span>
    </div>
  );
}

/** Name/Date rules — or "Answer key" on the key sheet. */
export function NameDateRow({ answerKey }) {
  if (answerKey) return <p className="text-[12px] font-semibold py-3 m-0">Answer key</p>;
  return (
    <div className="flex gap-8 py-3 text-[12px] font-semibold">
      <label className="flex items-end gap-2 flex-1">
        Name
        <span className="inline-block border-b border-black flex-1 max-w-64" />
      </label>
      <label className="flex items-end gap-2">
        Date
        <span className="inline-block border-b border-black w-32" />
      </label>
    </div>
  );
}

export function SheetFooter({ itemCount, right }) {
  return (
    <div className="mt-6 pt-2 border-t border-black flex items-center justify-between text-[10px] font-bold">
      <span>larkit.io</span>
      <span className="inline-flex items-center gap-1.5">
        Landed
        <span className="inline-block w-[14px] h-[14px] border-[1.5px] border-black align-middle" />
        of {itemCount}
      </span>
      <span>{right}</span>
    </div>
  );
}

export const SHEET_FRAME =
  "bg-white rounded-3xl shadow-lg p-8 print:shadow-none print:rounded-none print:p-0 text-black";

function PracticeItem({ layout, ...props }) {
  const { workSpace } = LAYOUTS[layout];
  if (layout === "stacked" || layout === "stackedWide") return <StackedItem {...props} workSpace={workSpace} />;
  if (layout === "horizontal") return <InlineItem {...props} />;
  if (layout === "longDivision") return <LongDivisionItem {...props} workSpace={workSpace} />;
  return <PromptItem {...props} />;
}

/**
 * One sheet for one skill — or its answer key (same grid, answers filled in,
 * "Answer key" in place of Name and Date; always its own page).
 *
 * `sheet` is what generateWorksheet returns; `title` / `footer` are the
 * skill's header line and footer tag (skillIndex.headerLine).
 */
export default function WorksheetSheet({ sheet, title, footer, answerKey = false, sheetIndex = 0, sheetCount = 1, breakBefore = false }) {
  let n = 0;
  const next = () => ++n;
  const storiesOnly = sheet.layout === "stories";
  const practiceLayout = storiesOnly ? null : sheet.layout;
  const withFigures = sheet.wordProblems.some((item) => getPaperFigure(item.question));

  return (
    <div className={SHEET_FRAME} style={breakBefore ? { pageBreakBefore: "always" } : undefined}>
      <SheetHeader line={`${title}${sheetCount > 1 ? ` · Sheet ${sheetIndex + 1} of ${sheetCount}` : ""}`} />
      <NameDateRow answerKey={answerKey} />

      {practiceLayout && sheet.items.length > 0 && (
        <div
          className={`mt-4 grid ${GRID_COLUMNS[LAYOUTS[practiceLayout].columns]} gap-x-6`}
          style={{ rowGap: LAYOUTS[practiceLayout].rowGap }}
        >
          {sheet.items.map((q, i) => (
            <PracticeItem
              key={i}
              layout={practiceLayout}
              question={q}
              number={next()}
              answer={answerKey ? printedAnswer(q) : null}
            />
          ))}
        </div>
      )}

      {storiesOnly ? (
        <div className={`mt-4 grid ${withFigures ? "grid-cols-1" : "grid-cols-2"} gap-x-4`} style={{ rowGap: 14 }}>
          {sheet.wordProblems.map((item, i) => (
            <StoryBox key={i} item={item} number={next()} showAnswer={answerKey} tall={!withFigures} />
          ))}
        </div>
      ) : (
        sheet.wordProblems.length > 0 && (
          <div className="mt-6 space-y-4">
            {sheet.wordProblems.map((item, i) => (
              <WordProblem key={i} item={item} number={next()} showAnswer={answerKey} workSpace={STORY_WORK_SPACE} />
            ))}
          </div>
        )
      )}

      <SheetFooter itemCount={sheet.itemCount} right={footer} />
    </div>
  );
}
