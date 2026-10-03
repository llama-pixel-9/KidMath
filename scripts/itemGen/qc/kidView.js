/**
 * What the kid sees, as plain text.
 *
 * The blind solve and the school-printable review both need the item the way
 * the session shows it, not the way the row stores it: the served choices
 * (shuffled, or generated when the row carries none), the sub-prompt, the
 * figure the question card draws and the widget the kid answers through.
 *
 * Descriptions are built from exactly the payload fields the renderers read
 * (figureRegistry, widgetRegistry, QuestionDisplay). A field the app never
 * draws — display.time on a verbal time item, display.money, display.counting
 * — is never described either: sending it would hand the solver a clue the
 * kid does not have, and the point of a blind solve is to have no more than
 * the kid.
 */

import { readFileSync } from "node:fs";
import { levelToGradeBand } from "../../../src/bands.js";
import { areaFigureSpec } from "../../../src/figures/areaFigureSpec.js";
import { placeName, startMat } from "../../../src/components/discMatBuild.js";
import { normalizeBankRow } from "../../../src/itemBank/normalize.js";
import { buildBankQuestion, questionAnswerType } from "../../../src/mathEngine.js";
import { skillForModeLevel } from "../../../src/skills/index.js";

/**
 * Items from a JSON file or the bundled bank.
 *
 * A file holds an array (or { items: [...] }) of bank items in the bundled
 * shape ({ itemId, modeId, question, ... }), raw item_bank rows ({ item_id,
 * payload, ... } — normalized the way the app normalizes them), or item model
 * specs ({ id, spec, ... } — kept as `kind: "model"` entries for the
 * kid-safe review; the blind solve refuses them).
 */
export async function loadItems({ file, fromBank, only = [], limit = 0 }) {
  let entries;
  let source;
  if (fromBank) {
    const { FULL_ITEMS } = await import("../../../src/itemBank/fullBank.js");
    entries = FULL_ITEMS.filter((i) => i.modeId === fromBank);
    if (!entries.length) {
      const modes = [...new Set(FULL_ITEMS.map((i) => i.modeId))].sort().join(", ");
      throw new Error(`no bundled items for mode "${fromBank}". Modes: ${modes}`);
    }
    source = `bundled bank, mode ${fromBank}`;
  } else {
    entries = readItemFile(file);
    source = file;
  }
  if (only.length) {
    const want = new Set(only);
    entries = entries.filter((e) => want.has(entryId(e)));
    const found = new Set(entries.map(entryId));
    const missing = only.filter((id) => !found.has(id));
    if (missing.length) throw new Error(`items not found: ${missing.join(", ")}`);
  }
  if (limit > 0) entries = entries.slice(0, limit);
  return { entries, source };
}

function entryId(entry) {
  return entry.kind === "model" ? entry.id : entry.itemId;
}

function readItemFile(file) {
  let parsed;
  try {
    parsed = JSON.parse(readFileSync(file, "utf8"));
  } catch (err) {
    throw new Error(`could not read ${file}: ${err.message}`);
  }
  const list = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.items) ? parsed.items : null;
  if (!list) throw new Error(`${file}: expected a JSON array of items (or { "items": [...] })`);
  return list.map((el, i) => {
    if (!el || typeof el !== "object") throw new Error(`${file}[${i}]: not an object`);
    if ("item_id" in el && "payload" in el) {
      const item = normalizeBankRow(el);
      if (!item) throw new Error(`${file}[${i}] (${el.item_id}): row fails bank validation`);
      return item;
    }
    if (el.itemId && el.question) return el;
    if (el.spec && typeof el.spec === "object") {
      return { kind: "model", id: String(el.id ?? el.itemModelId ?? `model-${i}`), grade: el.grade ?? null, modeId: el.mode_id ?? el.modeId ?? null, spec: el.spec };
    }
    throw new Error(`${file}[${i}]: not a bank item, an item_bank row or an item model spec`);
  });
}

/**
 * The item as the session would serve it — same merge, choices attached.
 * A row the engine cannot build (a draft with a broken payload) falls back
 * to its raw payload so it still gets reviewed rather than dropped.
 */
export function serve(item) {
  try {
    return buildBankQuestion(item);
  } catch {
    return { ...item.question, mode: item.modeId, metadata: { itemId: item.itemId, itemSource: "bank", modeId: item.modeId } };
  }
}

// "3 (level band 2-3)": a v2 grade tag when the row has one, else the grade of
// the catalog skill nearest the item's level, always with the app's own band.
function gradeOf(item, served) {
  const level = item.levelRange?.[0] ?? served.metadata?.level ?? 1;
  const band = item.levelBand ?? served.metadata?.gradeBand ?? levelToGradeBand(level);
  const grade = item.tags?.grade ?? skillForModeLevel(item.modeId, level)?.grade ?? null;
  return grade != null ? `${grade} (level band ${band})` : `level band ${band}`;
}

/**
 * The kid's view of one entry:
 *   { itemId, kind, grade, prompt, subPrompt, choices, requiredCount,
 *     figure, answerFormat, hint: string[], served }
 * `choices` is what the kid picks from (choice, symbol or multi-select
 * options) or null when the kid types. `figure` is a plain description of
 * what is drawn, or null when nothing is.
 */
export function kidView(entry) {
  if (entry.kind === "model") return modelView(entry);
  const served = serve(entry);
  const type = questionAnswerType(served);
  const d = served.display || {};
  const choices =
    type === "choice" ? (Array.isArray(served.choices) ? served.choices : null)
    : type === "multiSelect" ? d.options || []
    : type === "symbolSelect" ? ["<", ">", "="]
    : null;
  return {
    itemId: entry.itemId,
    kind: "item",
    grade: gradeOf(entry, served),
    prompt: promptShown(served),
    subPrompt: served.subPrompt ?? d.subPrompt ?? null,
    choices,
    requiredCount: type === "multiSelect" ? d.requiredCount ?? null : null,
    figure: describeFigure(served),
    answerFormat: answerFormat(served),
    hint: hintLines(entry.hint ?? served.hint),
    served,
  };
}

function modelView(entry) {
  return {
    itemId: entry.id,
    kind: "model",
    grade: entry.grade ?? "?",
    prompt: null,
    subPrompt: null,
    choices: null,
    requiredCount: null,
    figure: null,
    answerFormat: null,
    hint: [],
    text: collectStrings(entry.spec),
    served: null,
  };
}

/** Every string inside a nested object, in document order. */
export function collectStrings(value, out = []) {
  if (typeof value === "string") {
    if (value.trim()) out.push(value.trim());
  } else if (Array.isArray(value)) {
    for (const v of value) collectStrings(v, out);
  } else if (value && typeof value === "object") {
    for (const v of Object.values(value)) collectStrings(v, out);
  }
  return out;
}

// QuestionDisplay replaces the prompt for two payload shapes: an emoji set
// shows "How many?" over the objects, a sequence shows "What comes next?"
// over the run with a blank slot. The stored promptText is not shown then.
function promptShown(q) {
  const d = q.display || {};
  if (d.emoji) return "How many?";
  if (Array.isArray(d.sequence)) return `What comes next? ${d.sequence.join(", ")}, ?`;
  return d.promptText || "";
}

const lines = (x) => (Array.isArray(x) ? x : typeof x === "string" ? [x] : []);

/** The hint text a kid can open: nudge, steps, example, feedback, solution. */
export function hintLines(hint) {
  if (!hint || typeof hint !== "object") return [];
  const out = [...lines(hint.nudge), ...lines(hint.steps)];
  if (hint.example && typeof hint.example === "object") {
    out.push(...lines(hint.example.problem), ...lines(hint.example.steps));
    if (hint.example.answer != null) out.push(String(hint.example.answer));
  }
  if (hint.feedback && typeof hint.feedback === "object") out.push(...Object.values(hint.feedback).filter((s) => typeof s === "string"));
  if (hint.solution && typeof hint.solution === "object") {
    out.push(...lines(hint.solution.steps));
    if (hint.solution.answer != null) out.push(String(hint.solution.answer));
  }
  return out.filter((s) => typeof s === "string" && s.trim());
}

/** Everything readable on screen, joined, for the kid-safe list. */
export function kidFacingText(view) {
  if (view.kind === "model") return view.text.join("\n");
  const parts = [view.prompt, view.subPrompt, view.figure, ...(view.choices || []).map(String), ...view.hint];
  return parts.filter(Boolean).join("\n");
}

/** How the kid answers, in words the solver can follow. */
export function answerFormat(q) {
  const type = questionAnswerType(q);
  const d = q.display || {};
  switch (type) {
    case "choice":
      return "pick one of the choices (copy it exactly)";
    case "symbolSelect":
      return "pick one symbol: <, > or =";
    case "multiSelect":
      return `select every correct option${d.requiredCount ? ` (exactly ${d.requiredCount})` : ""}; answer with a list of the option texts`;
    case "fraction":
      return "type a fraction as a/b";
    case "decimal":
      return "type a decimal number";
    case "numberLine":
      // Jump mode draws one hop; the kid types its length on the keypad.
      return d.lineMode === "jump" ? "type the length of the drawn hop on the keypad under the line (a whole number)" : "tap a number on the number line; answer with that number";
    case "barGraph":
      return "tap a bar on the graph; answer with that bar's value as a number";
    case "coinTray":
      return d.coinMode === "build" ? "tap coins to build the amount; answer with the total in cents" : "answer with the amount in cents as a whole number";
    case "placeValueDiscs":
      // Build mode: the mat is changed, then checked — the answer is what it
      // shows, and Check stays off while any place holds 10 or more.
      return d.mode === "build" ? "the number your finished mat shows (each place 9 discs or fewer), as a whole number" : "type a whole number (digits only, no units)";
    default:
      return "type a whole number (digits only, no units)";
  }
}

const list = (xs) => xs.map(String).join(", ");
const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;
// Shape keys read noun-then-qualifier ("triangleRight"); a kid hears "right triangle".
const shapeName = (key) => String(key).replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase().split(" ").reverse().join(" ");

function clockText(hour, minute) {
  const h = (Number(hour) || 12) % 12 || 12;
  const m = Number(minute) || 0;
  const next = (h % 12) + 1;
  const minuteHand = m === 0 ? "on the 12" : m % 5 === 0 ? `on the ${m / 5}` : `just past the ${Math.floor(m / 5) || 12}`;
  const hourHand = m === 0 ? `on the ${h}` : m <= 20 ? `a little past the ${h}` : m < 40 ? `halfway between the ${h} and the ${next}` : `almost on the ${next}`;
  return `An analog clock face (1 to 12, no digital time). The short hour hand is ${hourHand}; the long minute hand is ${minuteHand}.`;
}

function discsText(cols) {
  if (!Array.isArray(cols) || !cols.length) return null;
  return `Place-value discs: ${cols.map((c) => `${plural(c.count, "disc")} worth ${c.place}`).join(", ")}.`;
}

// The tappable mat (placeValueDiscs build mode) starts from `cols`, read the
// way the widget reads them (discMatBuild.startMat), in the column's words.
function buildMatText(cols) {
  const mat = startMat(cols);
  const discs = mat.map((c) => `${c.count} ${placeName(c.place, 1)} disc${c.count === 1 ? "" : "s"}`).join(", ");
  return `A disc mat you can change: ${discs}. You can add or take away discs and trade 10 of a place for 1 of the next.`;
}

function areaText(q) {
  const spec = areaFigureSpec(q);
  if (!spec) return null;
  const unit = spec.unit ? ` ${spec.unit}` : "";
  const style = spec.perim ? "outline of a" : spec.grid ? "shaded rectangle divided into unit squares:" : "shaded";
  const dims = (w, h) => `${w ?? "?"} by ${h ?? "?"}${unit}`;
  let body;
  switch (spec.shape) {
    case "rect":
      body = `A ${style} rectangle labeled ${dims(spec.w, spec.h)}`;
      break;
    case "join":
      body = `Two rectangles joined edge to edge, labeled ${dims(spec.a, spec.b)} and ${dims(spec.c, spec.d)}`;
      break;
    case "cut":
      body = `A ${dims(spec.W, spec.H)} rectangle with a ${dims(spec.w, spec.h)} corner cut away`;
      break;
    case "split":
      body = `A rectangle split into two parts; labels shown: ${spec.a ?? "?"}, ${spec.b ?? "?"}, total ${spec.T ?? "?"}`;
      break;
    case "pair":
      body = `Two rectangles side by side, labeled ${(spec.rects || []).map(([w, h]) => dims(w, h)).join(" and ")}`;
      break;
    default:
      body = `A rectangle figure with labels ${JSON.stringify(spec)}`;
  }
  return `${body} (not to scale).`;
}

// A counting run drawn on a number line (QuestionDisplay's SequenceNumberLine):
// only unit steps, whole numbers and a short span get one. Every tick is
// labeled except the answer's, which shows "?" — exactly what the kid sees.
function sequenceLineText(sequence, step, answer) {
  if (Math.abs(step ?? 0) !== 1 || !Array.isArray(sequence) || !sequence.every(Number.isInteger) || !Number.isInteger(answer)) return null;
  const nums = [...sequence, answer];
  const lo = Math.min(...nums) - 1;
  const hi = Math.max(...nums) + 1;
  if (hi - lo > 10) return null;
  const labels = [];
  for (let n = lo; n <= hi; n++) labels.push(n === answer ? "?" : String(n));
  const dots = sequence.length === 1 ? `the number ${sequence[0]} has a dot on it` : `the numbers ${list(sequence)} have dots on them`;
  return `A number line with ticks labeled ${labels.join(", ")}; ${dots}.`;
}

/**
 * A plain description of whatever the question card or the answer widget
 * draws for this question, or null when the kid sees only text.
 */
export function describeFigure(q) {
  const d = q.display || {};
  const type = questionAnswerType(q);
  const parts = [];

  // Object rows and counting runs replace the prompt (see promptShown).
  if (d.emoji) parts.push(`${d.count} ${d.emoji} in a row (rows of ten, split five and five).`);
  if (Array.isArray(d.sequence)) {
    const line = sequenceLineText(d.sequence, d.step, q.answer);
    if (line) parts.push(line);
  }
  if (d.numberLine?.marks && !d.sequence) {
    const line = sequenceLineText(d.numberLine.marks, 1, q.answer);
    if (line) parts.push(line);
  }

  // A price list or menu under the story (QuestionDisplay's PriceList).
  if (Array.isArray(d.priceList?.rows) && d.priceList.rows.length) parts.push(priceListText(d.priceList));

  // The figure the card draws with the question (figureRegistry).
  const mode = q.mode || q.metadata?.modeId;
  const figure = d.figure || (mode === "areaPerimeter" && areaFigureSpec(q) ? "areaFigure" : null);
  switch (figure) {
    case "barGraph":
      if (type !== "barGraph") parts.push(barsText(d.bars));
      break;
    case "pictograph":
      parts.push(`A pictograph. Key: one symbol = ${d.keyValue ?? "?"}. Rows: ${(d.rows || []).map((r) => `${r.label} — ${r.symbols} symbols`).join("; ")}.`);
      break;
    case "tallyChart":
      parts.push(`A tally chart: ${(d.rows || []).map((r) => `${r.label} — ${plural(r.count, "tally mark")}`).join("; ")}.`);
      break;
    case "linePlot":
      parts.push(`A line plot${d.axisLabel ? ` (${d.axisLabel})` : ""} with points ${JSON.stringify(d.points)}.`);
      break;
    case "areaFigure":
      parts.push(areaText(q));
      break;
    case "discMat":
      // One mat ({cols}) or labelled mats side by side ({mats: [{label, cols}]}).
      if (Array.isArray(d.discMat?.mats)) parts.push(d.discMat.mats.map((m) => `${m?.label ?? "Mat"}: ${discsText(m?.cols) ?? "empty"}`).join(" "));
      else parts.push(discsText(d.discMat?.cols));
      break;
    case "clockFace":
      parts.push(clockText(d.clock?.hour ?? d.time?.hour, d.clock?.minute ?? d.time?.minute));
      break;
    case "cubeGrid":
      parts.push(`A solid built from unit cubes, ${d.cube?.l} long, ${d.cube?.w} wide and ${d.cube?.h} high (no numbers shown).`);
      break;
    case "array":
      // Math Facts times tables draw rows of dots with the fact.
      parts.push(`An array of dots: ${plural(d.array?.rows ?? 0, "row")} of ${d.array?.cols ?? 0} dots each.`);
      break;
    case "coordGrid":
      parts.push(`A coordinate grid from 0 to ${d.coord?.max} on both axes with points ${(d.coord?.points || []).map((p) => `${p.label ?? ""} at (${p.x}, ${p.y})`.trim()).join(", ")}.`);
      break;
    default:
      break;
  }

  // The widget the kid answers through, when it draws something (widgetRegistry).
  switch (type) {
    case "barGraph":
      parts.push(barsText(d.bars));
      break;
    case "angle":
      parts.push(`An angle drawn opening about ${d.degrees} degrees, with no measure written.`);
      break;
    case "clock":
      parts.push(clockText(d.hour, d.minute));
      break;
    case "fractionSet":
      parts.push(`A set of fraction pieces: ${JSON.stringify(d.set)}.`);
      break;
    case "placeValueDiscs":
      parts.push(d.mode === "build" ? buildMatText(d.cols) : discsText(d.cols));
      break;
    case "barModel":
      if (d.whole != null) parts.push(`A bar model: the whole bar is labeled ${d.whole}; one part is labeled ${d.part}, the other part is blank.`);
      else if (d.a != null && (d.labelA || d.labelB))
        parts.push(`A comparison bar model: the bar named ${d.labelA || "A"} is labeled ${d.a}; the longer bar named ${d.labelB || "B"} is labeled ${d.a} plus a segment labeled ${d.diff}, and its total is blank.`);
      else if (d.a != null) parts.push(`A comparison bar model: one bar labeled ${d.a}, a longer bar labeled ${d.a} plus a segment labeled ${d.diff}.`);
      break;
    case "numberBond":
      if (Array.isArray(d.parts)) parts.push(`A number bond: the two parts are ${list(d.parts)} and the whole is blank.`);
      else parts.push(`A number bond: the whole is ${d.whole}, one part is ${d.part} and the other part is blank.`);
      break;
    case "numberLine": {
      const jump = d.from != null && d.to != null ? (d.lineMode === "jump" ? ` One hop is drawn from ${d.from} to ${d.to}, with a keypad under the line.` : ` An arrow jumps from ${d.from} to ${d.to}.`) : "";
      parts.push(`A number line from ${d.min ?? 0} to ${d.max ?? 10}, a tick every ${d.step ?? 1}, a label every ${d.labelEvery ?? 1}.${jump}`);
      break;
    }
    case "shapeFigure":
      parts.push(`A drawing of a ${shapeName(d.shape)}${d.rotate ? `, turned ${d.rotate} degrees` : ""}${d.showSymmetry ? ", with its line of symmetry drawn" : ""}.`);
      break;
    case "coinTray":
      parts.push(`A tray of coins: ${list(d.coins || [])}.`);
      break;
    case "tenFrame":
      // A take-away frame crosses out the last `takeAway` counters (Math
      // Facts, 2026-10-01). Without this line the blind solver saw "7 red
      // counters" under "How many are left?" and could not know 3 were gone.
      parts.push(`${plural(d.frames ?? 1, "ten frame")} with ${plural(d.filled ?? 0, "red counter")}${d.filledB ? ` and ${plural(d.filledB, "blue counter")}` : ""}${d.takeAway ? `; the last ${d.takeAway} of those counters ${d.takeAway === 1 ? "is" : "are"} crossed out with an X` : ""}.`);
      break;
    default:
      break;
  }

  const text = parts.filter(Boolean).join(" ");
  return text || null;
}

// Every row in one style, as QuestionDisplay's formatListPrice prints it.
function priceListText(list) {
  const dollars = list.style === "dollars" || list.rows.some((r) => Number(r.cents) >= 100);
  const price = (cents) => (dollars ? `$${(Number(cents) / 100).toFixed(2)}` : `${cents}¢`);
  return `A table${list.title ? ` titled "${list.title}"` : ""}: ${list.rows.map((r) => `${r.item} ${price(r.cents)}`).join("; ")}.`;
}

// BarChart shows the values only after the answer is judged; before that the
// kid reads each bar's height against the axis.
function barsText(bars) {
  if (!Array.isArray(bars) || !bars.length) return null;
  return `A bar graph; reading each bar's height on the axis: ${bars.map((b) => `${b.label} ${b.value}`).join(", ")}.`;
}
