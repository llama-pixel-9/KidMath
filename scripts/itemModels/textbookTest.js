/**
 * The textbook test (Sai's bar, 2026-10-03): every question a model fills
 * should look at home on a practice page of Math in Focus or another premier
 * K-5 textbook.
 *
 * One reader asked "does it look at home?" answers differently from run to
 * run and can't say why. This test splits the question so most of it has
 * the same answer every time, and the rest has to quote its evidence:
 *
 *   1. MEASURES (code): 40 fixed fills per model. How many different things
 *      a story counts, whether the answer ever changes, test-engine words,
 *      letter-labelled pictures in a story, fills that fail to build.
 *   2. A RUBRIC of yes/no lines in place of one "does it look at home?".
 *   3. THREE READERS (editor, teacher, child) read the same 10 fills, each
 *      run twice: 6 votes per line. A "no" must quote the question and give
 *      a fix. 4+ no = the line fails; 2-3 = Sai sees the quotes; 1 = dropped.
 *
 * Variety ("fresh") is asked but not scored per model: a model is one
 * exercise type and keeps its question shape by design, so sameness inside
 * a model is counted by the measures and the readers' variety quotes are
 * kept as notes.
 *
 * Calibrated on 134 of Sai's own model decisions (docs/textbook-test.md).
 * Change a measure threshold, a rubric line or the vote rule only with a
 * fresh calibration run (`--calibrate`).
 *
 * This file is the pure part (no model calls), so the spec can run it.
 * The CLI is scripts/itemModels/textbookTest.mjs.
 */
import { fill } from "../../src/itemModels/fill.js";
import { kidView } from "../itemGen/qc/kidView.js";

export const MEASURE_SEEDS = 40;
export const READ_SEEDS = 10;
export const ROLES = ["editor", "teacher", "child"];
/** Votes per line = roles × runs. The thresholds below assume 2 runs. */
export const DEFAULT_RUNS = 2;
export const FAIL_VOTES = 4;
export const REVIEW_VOTES = 2;

// ── 1. Measures ──────────────────────────────────────────────────────────
const STIFF = [
  /\bcompute\b/i, /\bdetermine\b/i, /\bevaluate\b/i, /\bcalculate the value\b/i, /\bthe value of the expression\b/i,
  /\bthe following\b/i, /\buse (compensation|the strategy)\b/i, /\bsolve for\b/i, /\bunknown quantity\b/i,
];
// The letter is a capital, so story text like "set a goal" is not a label.
const LETTER_LABEL = /\b(?:[Bb]ar|[Mm]at|[Bb]ox|[Ss]et|[Gg]roup|[Pp]ile|[Ll]ine|[Ss]trip|[Tt]ape) [A-D]\b/;
/** "Bar A", "Mat B": a picture part named with a letter. */
export const hasLetterLabel = (text) => LETTER_LABEL.test(String(text || ""));
const words = (s) => s.match(/[A-Za-z']+/g) || [];
const orList = (xs) => (xs.length < 2 ? xs.join("") : `${xs.slice(0, -1).join(", ")} or ${xs[xs.length - 1]}`);

/** What the kid sees for one filled item, plus the key and the fill's tags. */
export function viewOf(item) {
  const v = kidView(item);
  return {
    prompt: v.prompt,
    subPrompt: v.subPrompt,
    figure: v.figure,
    choices: v.choices,
    answerFormat: v.answerFormat,
    answer: item.question?.answer,
    tags: item.tags || {},
  };
}

function gradeNumber(grade) {
  return Number(String(grade ?? "").replace(/^K$/i, "0")) || 0;
}

/**
 * The counting layer: the same answer on every run.
 * flags fail the model; notes are shown to Sai and fail nothing.
 */
export function measureModel(model, { seeds = MEASURE_SEEDS } = {}) {
  const fills = [];
  const errors = [];
  for (let seed = 1; seed <= seeds; seed++) {
    try {
      fills.push(viewOf(fill(model, { seed })));
    } catch (e) {
      errors.push(String(e?.message || e));
    }
  }
  const grade = gradeNumber(model.grade);
  const objects = new Set(fills.flatMap((f) => f.tags.objects || []));
  const settings = new Set(fills.map((f) => f.tags.setting).filter(Boolean));
  const answers = fills.map((f) => JSON.stringify(f.answer));
  const distinctAnswers = new Set(answers).size;
  const numeric = fills.length > 0 && fills.every((f) => typeof f.answer === "number");
  // A choice set that never changes (coins, yes/no) where some choice is
  // never the key: the kid can learn which ones to skip.
  const choiceSet = new Set(fills.flatMap((f) => (f.choices || []).map(String)));
  const fixedChoices = fills.length > 0 && fills.every((f) => f.choices && f.choices.every((c) => choiceSet.has(String(c)))) && choiceSet.size <= 6;
  const keys = new Set(fills.map((f) => String(f.answer)));
  const unusedChoice = fixedChoices && [...choiceSet].some((c) => !keys.has(c));
  const stiff = [...new Set(fills.flatMap((f) => STIFF.filter((re) => re.test(f.prompt || "")).map(String)))];
  const letterLabels = fills.some((f) => hasLetterLabel(f.prompt) || hasLetterLabel(f.figure));
  const sentences = fills.flatMap((f) => (f.prompt || "").split(/[.?!]+/).map((s) => s.trim()).filter(Boolean));
  const longest = Math.max(0, ...sentences.map((s) => words(s).length));
  // The session shuffles choices each time (as kidView does), so order is
  // not part of what makes a question the same.
  const keyOf = (f) => JSON.stringify([f.prompt, f.subPrompt, f.figure, f.choices ? f.choices.map(String).sort() : null]);
  const repeatsIn = (n) => n - new Set(fills.slice(0, n).map(keyOf)).size;
  const repeats10 = repeatsIn(Math.min(READ_SEEDS, fills.length));
  const repeatsAll = repeatsIn(fills.length);
  const isStory = objects.size > 0;

  const flags = [];
  const notes = [];
  if (errors.length) flags.push(`fill failed on ${errors.length} of ${seeds} seeds`);
  // Every model Sai rejected or we fixed for sameness had 4 or fewer things
  // to count in 40 fills; every model Sai approved as varied had 5 or more
  // (2026-10-03). Fit to that set: recheck it on the next skill.
  if (isStory && objects.size <= 4) {
    flags.push(`only ${objects.size} different thing${objects.size === 1 ? "" : "s"} to count in ${fills.length} questions`);
  }
  if (fills.length >= 20 && distinctAnswers === 1) flags.push(`the answer is the same in all ${fills.length} questions`);
  // Coin trades and estimates have few answers by nature: a note, not a fail.
  else if (fills.length >= 20 && numeric && distinctAnswers <= 3) notes.push(`only ${distinctAnswers} different answers in ${fills.length} questions`);
  else if (fills.length >= 20 && unusedChoice && distinctAnswers <= 3) notes.push(`the key is only ever ${orList([...keys])} in ${fills.length} questions`);
  if (stiff.length) flags.push(`test-engine wording: ${stiff.join(", ")}`);
  // In a story the parts have names to use (Sai, 2026-10-03); a bare
  // "Mat A and Mat B" drill has none, so there it is only a note.
  if (letterLabels) (isStory ? flags : notes).push("a picture part is named with a letter (bar A, mat B) instead of a name from the problem");
  if (longest > (grade <= 2 ? 20 : 25)) notes.push(`a ${longest}-word sentence for Grade ${model.grade}`);
  if (repeats10) notes.push(`${repeats10} of the first ${READ_SEEDS} questions repeat an earlier one word for word (${repeatsAll} of ${fills.length})`);

  return {
    stats: {
      fills: fills.length,
      prompts: new Set(fills.map((f) => f.prompt)).size,
      objects: objects.size,
      settings: settings.size,
      answers: distinctAnswers,
      repeats10,
      repeatsAll,
      longestSentence: longest,
    },
    flags,
    notes,
  };
}

/** The fills the readers see: the first READ_SEEDS seeds that build. */
export function readsOf(model, { count = READ_SEEDS } = {}) {
  const out = [];
  for (let seed = 1; out.length < count && seed <= count * 3; seed++) {
    try {
      out.push(viewOf(fill(model, { seed })));
    } catch {
      /* counted by the measures */
    }
  }
  return out;
}

// ── 2. The rubric ────────────────────────────────────────────────────────
/** [key, text]. "fresh" is asked but kept as a note (NOTE_LINES). */
export const RUBRIC = [
  // Sai, 2026-10-03: made-up prices are fine (textbook money pages use
  // them); only a place that plainly doesn't fit still fails.
  ["real", "Real situation: every count and time is one the situation really has (a real child would own that many), and the place fits what happens there: it sells or does that thing (bananas are not sold at the school store; a front office does not trade coins). Prices may be made up, as on any textbook money page: a waffle for 39¢ or chocolate milk for 60¢ at the dollar store passes. Never fail a price."],
  ["fresh", "Fresh stories: across these ten, the situations, objects, names and places change the way a well-made exercise page does. Fail when the stories repeat (the same object or activity in most questions) or two questions are word for word the same. This model is ONE exercise type and the app mixes it with the other models of the same skill, so the question shape, the kind of answer and which choice is right staying the same across the ten is by design: that passes. For plain number drills, fail only repeated questions or numbers that barely change."],
  ["voice", "Natural textbook voice: it reads like a well-edited textbook speaking to a child. Test-engine or teacher-manual phrasing (\"Compute the value\", \"Determine\"), padded or awkward sentences fail. House style that passes: the child's name repeats instead of he or she, and the question restates the counted noun (\"How many toy cars does Lily have?\")."],
  ["clear", "One clear task: a child knows exactly what to find and how to give it; the question asks for exactly what the answer is; nothing gives the answer away."],
  ["picture", "The picture works: when there is one, a child can use it to solve (in a story its parts carry the names or words the problem uses, never letters like A and B; values can be read from it). No picture passes when a textbook would ask the same thing in words: coins named in words (\"1 quarter and 2 dimes\") are ordinary textbook practice, a bare drill may call two mats Mat A and Mat B, and an easy item may show what its words say. Fail only a picture that misleads, cannot be read, or is missing when the child truly needs it to solve."],
  ["reading", "Reading load fits the grade: short sentences and familiar words, about a grade below the tested grade."],
  ["format", "Answer format fits: the way the child answers (type a number, choose, build with coins or discs) is how a textbook would ask for this."],
  ["kidWorld", "Kid's world: the context is one children of this age know and care about."],
];
export const NOTE_LINES = ["fresh"];
export const SCORED_LINES = RUBRIC.map(([k]) => k).filter((k) => !NOTE_LINES.includes(k));
export const LINE_NAMES = {
  real: "real situation",
  fresh: "fresh stories",
  voice: "textbook voice",
  clear: "one clear task",
  picture: "the picture",
  reading: "reading load",
  format: "answer format",
  kidWorld: "kid's world",
};

const ROLE_TEXT = {
  editor: "You are a senior editor at a premier K-5 math textbook publisher (the quality of Math in Focus). You decide whether exercises are ready to print on a student practice page.",
  teacher: "You are an experienced US public-school classroom teacher of the grade named below, choosing practice exercises for your own class from the best textbooks.",
  child: "You read each exercise the way a careful but ordinary child of the grade named below would, looking for anything that would confuse, bore or mislead that child. Answer as the adult who is reading on the child's behalf.",
};

/** The reader's system prompt for one role. Kept word for word as calibrated. */
export function systemFor(role) {
  const lines = RUBRIC.map(([k]) => `"${k}": {"pass": boolean, "evidence": string, "fix": string}`).join(", ");
  return `${ROLE_TEXT[role]}

The bar: every exercise should look at home on a practice page of Math in Focus or another premier K-5 textbook. Each model below is one exercise template; you see ten exercises it produced, exactly as the child sees them (words, a description of the picture, the answer choices, how the child answers).

The rubric:
${RUBRIC.map(([k, t], i) => `${i + 1}. ${k}: ${t}`).join("\n")}

For each model and each rubric line answer pass true or false.
- false needs evidence: the question number(s) and a short exact quote that fails the line, plus a one-line fix. A dislike you cannot quote is not a fail.
- true needs no evidence.
Judge only these lines. Arithmetic, answer keys and kid safety are checked elsewhere.

Reply with JSON only: an array with one object per model, in the order given:
  {"modelId": string, "lines": {${lines}}}
Include EVERY model you were given.`;
}

/** One model's block in a reader's prompt. */
export function modelBlock(id, grade, reads) {
  const lines = [`modelId: ${id}`, `grade: ${grade}`];
  reads.forEach((f, i) => {
    lines.push(`Q${i + 1}. ${f.prompt}`);
    if (f.subPrompt) lines.push(`    below the question: ${f.subPrompt}`);
    if (f.figure) lines.push(`    picture: ${f.figure}`);
    if (f.choices) lines.push(`    choices: ${f.choices.map(String).join(" | ")}`);
    lines.push(`    the child answers: ${f.answerFormat}`);
  });
  return lines.join("\n");
}

// ── 3. Scoring ───────────────────────────────────────────────────────────
const isNo = (x) => x != null && x.pass === false && String(x.evidence || "").trim() !== "";

/**
 * Score one model.
 *   measures: measureModel(model)
 *   replies:  [{ run, role, lines }] — every reader reply for this model
 * A line fails at FAIL_VOTES "no" votes with a quote, goes to Sai at
 * REVIEW_VOTES, and one "no" alone is dropped. The verdict is fail on any
 * measured flag or failed line, else review on any review line, else pass.
 */
export function scoreModel(measures, replies, { failVotes = FAIL_VOTES, reviewVotes = REVIEW_VOTES } = {}) {
  const noes = {};
  const pageNotes = [];
  for (const r of replies) {
    for (const [line, answer] of Object.entries(r.lines || {})) {
      if (!isNo(answer)) continue;
      const vote = { run: r.run, role: r.role, evidence: String(answer.evidence), fix: String(answer.fix || "") };
      if (NOTE_LINES.includes(line)) pageNotes.push({ line, ...vote });
      else if (SCORED_LINES.includes(line)) (noes[line] ||= []).push(vote);
    }
  }
  const fails = [];
  const reviews = [];
  for (const line of SCORED_LINES) {
    const votes = noes[line] || [];
    if (votes.length >= failVotes) fails.push({ line, votes });
    else if (votes.length >= reviewVotes) reviews.push({ line, votes });
  }
  const verdict = measures.flags.length || fails.length ? "fail" : reviews.length ? "review" : "pass";
  return { verdict, flags: measures.flags, notes: measures.notes, fails, reviews, pageNotes, readers: replies.length };
}

/**
 * Score one panel of reader runs as the CLI does. A fail stands on the votes
 * it has; any other verdict needs every expected reply, else the model is
 * "incomplete" (rerun it; nothing is stored).
 */
export function scorePanel(measures, replies, { expected = ROLES.length * DEFAULT_RUNS } = {}) {
  const s = scoreModel(measures, replies);
  if (s.readers < expected && s.verdict !== "fail") {
    return { ...s, verdict: "incomplete", notes: [...s.notes, `only ${s.readers} of ${expected} reader replies came back`] };
  }
  return s;
}

/**
 * The stored verdict for item_models.spec.checks.textbook, which the review
 * screen shows as a card (green pass, amber notes, red fail).
 */
export function checkEntry(score, { checkedAt } = {}) {
  const quote = (l) => `${LINE_NAMES[l.line] || l.line} (${l.votes.length} of ${score.readers}): ${l.votes[0].evidence}${l.votes[0].fix ? ` Fix: ${l.votes[0].fix}` : ""}`;
  const parts = [
    ...score.flags.map((f) => `Counted: ${f}.`),
    ...score.fails.map(quote),
    ...score.reviews.map(quote),
    ...score.notes.map((n) => `Note: ${n}.`),
  ];
  const n = score.reviews.length;
  const verdict = score.verdict === "review" ? `${n} reader note${n === 1 ? "" : "s"}` : score.verdict;
  const entry = { verdict, ok: score.verdict === "pass" ? true : score.verdict === "fail" ? false : null };
  if (parts.length) entry.reason = parts.join("\n");
  if (checkedAt) entry.checked_at = checkedAt;
  return entry;
}

/**
 * SQL that stores one checkEntry in a DRAFT model's spec.checks.textbook,
 * keeping its other checks (and replacing a checks value that is not an
 * object). sqlLiteral quotes a string for Postgres.
 */
export function checkSql(id, entry, sqlLiteral) {
  const checks = `case when jsonb_typeof(spec->'checks') = 'object' then spec->'checks' else '{}'::jsonb end`;
  return `update public.item_models set spec = jsonb_set(spec, '{checks}', ${checks} || jsonb_build_object('textbook', ${sqlLiteral(JSON.stringify(entry))}::jsonb)) where id = ${sqlLiteral(id)} and review_status = 'draft';`;
}
