/**
 * Deterministic QC checks — run BEFORE any model is asked for an opinion.
 *
 * An LLM reviewing another LLM's output shares its blind spots: if the author
 * misread "3 times as much" as additive, a reviewer can accept it for the same
 * reason. So everything decidable by code is decided by code, and the model is
 * only asked about things code genuinely cannot judge (does this read naturally
 * to a 7-year-old, is the context sensible, is the situation coherent).
 *
 * Every check returns { id, severity, message } or null.
 *   fail  — must not reach a child
 *   warn  — a human or the model should look
 */

import { contractVerdict, rendersAnything } from "../figureContracts.js";
import { checkStructure } from "./structureCheck.js";

const fail = (id, message) => ({ id, severity: "fail", message });
const warn = (id, message) => ({ id, severity: "warn", message });

const numbersIn = (text) => (text.match(/\d+/g) || []).map(Number);

/**
 * Plurals of the countable nouns items actually use. Deliberately a closed
 * list: any heuristic broad enough to catch unknown plurals also catches verbs
 * and prepositions that happen to end in "s".
 */
const COUNTABLE_PLURALS = new Set([
  "apples", "stickers", "marbles", "shells", "books", "pencils", "buttons",
  "bundles", "rods", "wires", "sheets", "crates", "packs", "straws",
  "crayons", "cards", "blocks", "beads", "leaves", "bunnies", "birds",
  "flowers", "cookies", "plums", "chairs", "coins", "bags", "boxes", "baskets",
  "jars", "plates", "shelves", "rows", "groups", "bears", "ducks", "frogs",
  "cats", "dogs", "fish", "stars", "balls", "hats", "cups", "spoons", "eggs",
  "oranges", "bananas", "grapes", "berries", "seeds", "stones", "tiles",
  "stamps", "ribbons", "balloons", "candles", "muffins", "trucks", "trains",
]);

const OPS = {
  "+": (a, b) => a + b,
  "-": (a, b) => a - b,
  "−": (a, b) => a - b,
  x: (a, b) => a * b,
  "*": (a, b) => a * b,
  "×": (a, b) => a * b,
  "/": (a, b) => (b === 0 ? null : a / b),
  "÷": (a, b) => (b === 0 ? null : a / b),
};

/**
 * Recompute the answer from the payload rather than trusting it.
 *
 * When `op` is known, check EXACTLY that operation — an earlier version
 * accepted the answer if any operation reached it, so `2 + 3 = 6` passed
 * because 2 x 3 = 6. That is precisely the class of error this check exists to
 * catch, so it was worse than useless.
 *
 * Two legitimate shapes: `a op b = answer`, and the embedded-unknown form where
 * the answer is a missing operand (`? + 3 = 5` stores a=null or a=one part).
 */
function arithmeticCheck(item) {
  const q = item.question || {};
  const { a, b, answer, op } = q;
  if (typeof answer !== "number") return null;
  if (typeof a !== "number" || typeof b !== "number") return null;
  const fn = OPS[op];
  if (!fn) return null; // no operator to check against

  // Addition and subtraction share ONE constraint over the three quantities
  // {a, b, answer}: whichever operand the prose leaves blank, the largest of
  // the three equals the sum of the other two (x - y = z means x = y + z). So a
  // Take From / Start Unknown (`? - 12 = 8`, answer 20) and a plain sum
  // (`12 + 8 = 20`) both satisfy "the max is the sum of the other two",
  // regardless of which number the payload stored where.
  //
  // Multiplication and division likewise: the largest equals the product of the
  // other two.
  //
  // This stays exact — 2 + 3 = 6 fails (max 6 != 2 + 3), 3 x 6 = 20 fails
  // (max 20 != 3 x 6) — it is only agnostic to operand POSITION, which is what
  // word-problem payloads genuinely leave unspecified.
  const [lo, mid, hi] = [a, b, answer].sort((x, y) => x - y);
  const additive = op === "+" || op === "-" || op === "−";
  if (additive ? lo + mid === hi : lo * mid === hi) return null;

  return fail("arithmetic", `answer ${answer} is not consistent with ${a} and ${b} under ${op}`);
}

// Kid-facing vocabulary the pedagogy register leaks into prompts (teacherJargon).
const TEACHER_JARGON =
  /\b(subitiz\w*|cardinalit\w*|decompos\w*|commutativ\w*|associativ\w*|identity|inverse|equivalen\w*|numerals?|partition\w*|one-to-one|conserv\w*)\b/i;
// Emoji presentation characters — an emoji run in the prompt IS the picture.
const EMOJI_RUN = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;
// "4 dots", "a set of 10 items", "a ten frame with 8 counters" … (figurelessQuantity)
// Only DESCRIPTIONS of a picture count — "a set of 4 dots", "a card shows 3
// red buttons", "a ten frame with 8 counters". A story quantity ("Lia has 9
// marbles") is a word problem, not a missing figure.
const QUANTITY_OF_OBJECTS =
  /\b(?:(?:small |big )?(?:set|group|row|pile|collection|array) of (?:\d+|some|these) (?:dots?|items?|objects?|counters?|chips?|cubes?|blocks?|stars?|circles?|squares?|buttons?|marbles?|beads?|things)|card (?:shows|with|has) \d+|\d+ (?:dots?|counters?|chips?) (?:filled|in a row|on (?:the|a) (?:top|bottom|first|second) row)|ten[- ]frames?)\b/i;

export const CHECKS = [
  {
    id: "structureMatch",
    run: (item) => {
      const { ok, problems } = checkStructure(item);
      return ok ? null : fail("structureMatch", problems.join("; "));
    },
  },

  { id: "arithmetic", run: arithmeticCheck },

  {
    // `op: "vs"`/`op: "?"` (comparing) skips arithmeticCheck; verify what the
    // payload lets us: symbol answers against numeric a/b, and numeric
    // answers against a display.compare claim
    // (docs/comparing-bank-design.md).
    id: "compareMath",
    run: (item) => {
      const q = item.question || {};
      if (q.op !== "vs" && q.op !== "?") return null;
      if (typeof q.answer === "string" && /^[<>=]$/.test(q.answer)) {
        if (typeof q.a === "number" && typeof q.b === "number") {
          const want = q.a > q.b ? ">" : q.a < q.b ? "<" : "=";
          return q.answer === want
            ? null
            : fail("compareMath", `symbol ${q.answer} does not relate ${q.a} and ${q.b}`);
        }
        return null; // expression strings — assembler-level asserts cover them
      }
      const c = q.display?.compare;
      if (!c || typeof q.answer !== "number") return null;
      let want = null;
      if (c.kind === "difference") want = c.bigger - c.smaller;
      else if (c.kind === "gap") want = c.target - c.have;
      else if (c.kind === "oneMoreLess") want = c.n + c.delta;
      else if (c.kind === "closerTo") want = c.n - c.lo < c.hi - c.n ? c.lo : c.hi;
      else if (c.kind === "midpoint") want = (c.lo + c.hi) / 2;
      if (want == null) return null;
      return q.answer === want
        ? null
        : fail("compareMath", `answer ${q.answer} != ${want} from ${c.kind} claim`);
    },
  },

  {
    // `op: "bond"` skips arithmeticCheck entirely (no OPS entry), so bond
    // items get their own consistency rule, keyed off the display payload.
    // Bank convention (docs/numberbonds-bank-design.md): missing-part items
    // set display.whole + display.part; three-part items set display.whole +
    // display.parts (the givens); whole-unknown items set display.parts only.
    id: "bondMath",
    run: (item) => {
      const q = item.question || {};
      if (q.op !== "bond" || typeof q.answer !== "number") return null;
      const d = q.display || {};
      const whole = typeof d.whole === "number" ? d.whole : null;
      const part = typeof d.part === "number" ? d.part : null;
      const parts = Array.isArray(d.parts) && d.parts.every((p) => typeof p === "number") ? d.parts : null;

      if (whole != null && part != null && parts == null) {
        return part + q.answer === whole
          ? null
          : fail("bondMath", `part ${part} + answer ${q.answer} != whole ${whole}`);
      }
      if (whole != null && parts != null) {
        const given = parts.reduce((s, p) => s + p, 0);
        return given + q.answer === whole
          ? null
          : fail("bondMath", `given parts sum ${given} + answer ${q.answer} != whole ${whole}`);
      }
      if (whole == null && parts != null) {
        const sum = parts.reduce((s, p) => s + p, 0);
        return sum === q.answer
          ? null
          : fail("bondMath", `parts sum ${sum} != answer ${q.answer} (whole-unknown bond)`);
      }
      return null; // no numeric bond payload to verify (judged/choice forms)
    },
  },

  {
    // `op: "count"` likewise has no OPS entry. Counting bank items declare
    // their claim in `display.counting` (docs/counting-bank-design.md) and
    // this check recomputes the answer from it. Items without the field
    // (legacy prose) are skipped; judged/choice forms carry no claim.
    id: "countMath",
    run: (item) => {
      const q = item.question || {};
      if (q.op !== "count" || typeof q.answer !== "number") return null;
      const c = q.display?.counting;
      if (!c || typeof c !== "object") return null;
      const n = (k) => (typeof c[k] === "number" ? c[k] : null);
      let expected = null;
      switch (c.kind) {
        case "set":
          expected = n("count");
          break;
        case "countOn":
          expected = n("start") != null && n("more") != null ? c.start + c.more : null;
          break;
        case "countBack":
          expected = n("start") != null && n("back") != null ? c.start - c.back : null;
          break;
        case "next": {
          const seq = Array.isArray(c.sequence) && c.sequence.every((x) => typeof x === "number") ? c.sequence : null;
          expected = seq && seq.length && n("step") != null ? seq[seq.length - 1] + c.step : null;
          break;
        }
        case "between":
          // Midpoint of the neighbours — covers unit steps (before+1) AND
          // skip-count gaps (before + step), as long as the gap is even.
          expected =
            n("before") != null && n("after") != null && (c.after - c.before) % 2 === 0 && c.after > c.before
              ? (c.before + c.after) / 2
              : null;
          break;
        case "hidden":
          expected = n("total") != null && n("seen") != null ? c.total - c.seen : null;
          break;
        case "gap":
          expected = n("have") != null && n("target") != null ? c.target - c.have : null;
          break;
        case "moreLess":
          expected = n("n") != null && n("delta") != null ? c.n + c.delta : null;
          break;
        case "groups":
          expected = n("tens") != null && n("ones") != null ? c.tens * 10 + c.ones : null;
          break;
        case "units":
          expected =
            n("hundreds") != null && n("tens") != null && n("ones") != null
              ? c.hundreds * 100 + c.tens * 10 + c.ones
              : null;
          break;
        case "digit":
          // The digit standing in `place` (1, 10, or 100) of n.
          expected = n("n") != null && n("place") != null ? Math.floor(c.n / c.place) % 10 : null;
          break;
        case "placeValueOf":
          expected = n("n") != null && n("place") != null ? (Math.floor(c.n / c.place) % 10) * c.place : null;
          break;
        case "sum": {
          const parts = Array.isArray(c.parts) && c.parts.every((x) => typeof x === "number") ? c.parts : null;
          expected = parts && parts.length ? parts.reduce((s, x) => s + x, 0) : null;
          break;
        }
        default:
          return fail("countMath", `unknown counting claim kind "${c.kind}"`);
      }
      if (expected == null) return fail("countMath", `counting claim "${c.kind}" is missing its givens`);
      return expected === q.answer
        ? null
        : fail("countMath", `counting claim "${c.kind}" gives ${expected} but answer is ${q.answer}`);
    },
  },

  {
    id: "answerGivenAway",
    run: (item) => {
      const text = item.question?.display?.promptText || "";
      const answer = item.question?.answer;
      if (typeof answer !== "number") return null;

      // An explicit unknown marker IS the answer slot, so nothing is given
      // away no matter which numbers appear. `4 + ? = 8` has answer 4 — the
      // answer coincides with a given because it is a double, not because the
      // item leaks. Checking for the digit alone flagged 220 such items.
      if (/[?_]|___/.test(text)) return null;

      const nums = numbersIn(text);
      if (!nums.includes(answer)) return null;

      // In prose, the answer appearing is only suspicious when it is a number
      // ADDITIONAL to the givens; equalling a given is arithmetic coincidence.
      const givens = [item.question?.a, item.question?.b].filter((n) => typeof n === "number");
      if (givens.includes(answer)) return null;

      return warn("answerGivenAway", `the answer ${answer} appears in the prompt — check it is not stated outright`);
    },
  },

  {
    id: "negativeOrFractionalAnswer",
    run: (item) => {
      const answer = item.question?.answer;
      if (typeof answer !== "number") return null;
      if (answer < 0) return fail("negativeAnswer", `answer is negative (${answer})`);
      if (!Number.isInteger(answer) && !/decimal|fraction/i.test(item.modeId || "")) {
        return fail("fractionalAnswer", `answer is not a whole number (${answer})`);
      }
      return null;
    },
  },

  {
    id: "promptLength",
    run: (item) => {
      const text = (item.question?.display?.promptText || "").trim();
      if (!text) return fail("emptyPrompt", "prompt is empty");
      if (text.length > 220) return fail("promptLength", `prompt is ${text.length} chars (limit 220)`);
      if (text.split(/[.!?]+/).filter((s) => s.trim()).length > 4) {
        return warn("promptSentences", "more than 4 sentences — the authoring guide asks for 2-4 short chronological steps");
      }
      return null;
    },
  },

  {
    id: "placeholderLeak",
    run: (item) => {
      const text = item.question?.display?.promptText || "";
      if (/\{|\}|\bundefined\b|\bNaN\b|\bnull\b|\$\{/.test(text)) {
        return fail("placeholderLeak", "prompt contains an unfilled placeholder or undefined value");
      }
      return null;
    },
  },

  {
    id: "grammarAgreement",
    run: (item) => {
      const text = item.question?.display?.promptText || "";
      // "1 apples" — the classic generated-prose tell.
      //
      // Matching "1 <word ending in s>" is far too naive: it flags "1 plus",
      // "1 times", "1 is itself" and "1 glass bead", all correct English. It
      // produced eight findings on the real bank and every one was wrong.
      // Checking against the actual countable-noun vocabulary instead makes
      // this precise — a check that cries wolf gets ignored.
      const match = text.match(/\b1 ([a-z]+)\b/i);
      if (match && COUNTABLE_PLURALS.has(match[1].toLowerCase())) {
        return fail("grammarAgreement", `"${match[0]}" — singular noun needed after 1`);
      }
      return null;
    },
  },

  {
    id: "storyWrappedDrill",
    run: (item) => {
      if (item.modeId !== "skipCounting" && item.modeId !== "patterns") return null;
      const text = (item.question?.display?.promptText || "").trim();
      // Sequence continuation is a fluency drill and is presented bare
      // ("Count by 4s: 16, 20, 24. What number comes next?") — narrating it
      // ("A timer beeps every 4 seconds…") adds reading load and no math.
      const run = text.match(/(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
      if (!run || !/next/i.test(text)) return null;
      const [a, b, c] = run.slice(1).map(Number);
      if (b - a !== c - b || b === a) return null;
      if (/^(count|skip|continue|complete|fill|what|say|find|name|identify|which|the next)/i.test(text)) return null;
      return warn("storyWrappedDrill", "sequence drills read best bare — drop the story wrapper (authoring guide: drills are drills)");
    },
  },

  {
    id: "selfAnswering",
    run: (item) => {
      const d = item.question?.display || {};
      const text = d.promptText || "";
      const answer = item.question?.answer;
      if (typeof answer !== "number" || !text) return null;
      if (!/how many|name the total|what number/i.test(text)) return null;
      // A visual payload (emoji set, discs, sequence…) means the child counts
      // the PICTURE — prose stating the count is then the caption, not the
      // giveaway. Text-only items get no such excuse.
      // Only keys that actually put pixels on screen count — display.time /
      // display.truth / display.compare are structured data nothing renders,
      // and dead data must not exempt an item (the clock-incident loophole).
      if (rendersAnything(item.question)) return null;
      const nums = [...new Set((text.match(/\d+/g) || []).map(Number))];
      if (nums.length === 1 && nums[0] === answer) {
        return fail(
          "selfAnswering",
          `the prompt's only number IS the answer (${answer}) — the question answers itself`
        );
      }
      return null;
    },
  },

  {
    id: "decorativeContext",
    run: (item) => {
      const text = (item.question?.display?.promptText || "").trim();
      // "Emma has 53 pencils. How many tens are in 53?" — the question asks
      // about the BARE numeral, so the story sentence does no work. Either
      // the story must be load-bearing or the question stands alone.
      const sentences = text.match(/[^.!?]+[.!?]/g)?.map((s) => s.trim());
      if (!sentences || sentences.length < 2) return null;
      const q = sentences[sentences.length - 1];
      const m = q.match(/^(?:How many|What)\b[^?]*\b(?:in|of)\s+(\d+)\s*\?$/i);
      if (!m) return null;
      const lead = sentences.slice(0, -1).join(" ");
      if (new RegExp(`\\b${m[1]}\\b`).test(lead)) {
        return fail(
          "decorativeContext",
          `the story sentence does no work — the question asks about the bare number ${m[1]}; drop the story or make it load-bearing`
        );
      }
      return null;
    },
  },

  {
    id: "nounlessQuestion",
    run: (item) => {
      const text = item.question?.display?.promptText || "";
      // "How many does Lily have?" makes a young reader resolve the referent
      // from an earlier sentence; the question must restate what is counted:
      // "How many toy cars does Lily have?". A closed list of the words that
      // legally follow a noun-less "How many" keeps this precise — a broad
      // "no noun detected" heuristic would flag correct prose.
      if (/how many\s*[?.!]|how many (does|do|did|is|are|was|were|in|now)\b/i.test(text)) {
        return fail(
          "nounlessQuestion",
          'question does not name what is counted — write "How many toy cars does Lily have?", not "How many does Lily have?"'
        );
      }
      return null;
    },
  },

  {
    id: "missingRequiredFigure",
    run: (item) => {
      const v = contractVerdict(item.modeId, item.question, item);
      if (!v.covered || v.ok) return null;
      if (v.reason === "undeclared") {
        return fail(
          "undeclaredFigureClass",
          `"${v.cls}" has no line in figureContracts.js — declare whether it needs a figure or is legitimately verbal`
        );
      }
      return fail(
        "missingRequiredFigure",
        `${v.cls} items must show ${v.satisfiedBy.join(" or ")} — text describing the visual is not the visual`
      );
    },
  },

  {
    id: "describedClockHands",
    run: (item) => {
      const choices = (item.question?.choices || []).filter((c) => typeof c === "string").join(". ");
      const text = `${item.question?.display?.promptText || ""} ${choices}`;
      const display = item.question?.display || {};
      // A clock item must SHOW the face. Stating where the hands point in
      // words turns clock-reading into reading comprehension (and a judged
      // mismatch gives itself away: "hour hand on six ... as seven o'clock").
      // Items where the hands are the SUBJECT ("which hand tells the hour?")
      // don't state positions and stay exempt.
      const statesHandPosition =
        /\b(hour|minute|long|short) hand\b[^.?!]{0,40}\b(points? (at|to)|is (on|at|near)|on|at|near|just past|halfway past)\b[^.?!]{0,20}\b(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|\d{1,2})\b/i.test(
          text
        );
      const showsFace = display.figure === "clockFace" || display.type === "clock";
      if (statesHandPosition && !showsFace) {
        return fail(
          "describedClockHands",
          "the prompt states clock-hand positions in words with no clock face shown — attach the clockFace figure and ask for the time instead"
        );
      }
      return null;
    },
  },

  {
    id: "readability",
    run: (item) => {
      const text = item.question?.display?.promptText || "";
      const words = text.split(/\s+/).filter(Boolean);
      const long = words.filter((w) => w.replace(/[^a-z]/gi, "").length > 10);
      if (long.length) {
        return warn("readability", `long words for K-4: ${long.join(", ")}`);
      }
      if (words.length > 40) return warn("readability", `${words.length} words is long for K-4`);
      return null;
    },
  },

  {
    id: "bandAppropriate",
    run: (item) => {
      const [min] = item.levelRange || [];
      const nums = numbersIn(item.question?.display?.promptText || "");
      const max = Math.max(0, ...nums);
      if (min <= 3 && max > 20) {
        return fail("bandAppropriate", `Kindergarten band item uses ${max}; totals should stay within 20`);
      }
      if (min <= 6 && max > 100) {
        return warn("bandAppropriate", `Grade 1-2 band item uses ${max}`);
      }
      return null;
    },
  },

  {
    // Kid-facing prompts must not use the teacher's vocabulary. "Subitize the
    // count" / "what is the cardinality" reached kindergartners — 216 shipped
    // items (kid-sim QA 2026-08-23). The blocklist is the pedagogy register;
    // plain words ("how many", "split 7 into two parts") say the same thing.
    id: "teacherJargon",
    run: (item) => {
      const text = item.question?.display?.promptText || "";
      const hit = text.match(TEACHER_JARGON);
      return hit ? fail("teacherJargon", `"${hit[0]}" is teacher vocabulary — say it in kid words`) : null;
    },
  },

  {
    // A counting question must show the objects. "A small set of 4 dots.
    // Subitize the count." with no figure hands the answer to the kid in the
    // prompt — 66 shipped counting items did this. Any visual payload key
    // (emoji, counting, tenFrame, …) exempts the item; an emoji run inside
    // the prompt text is a picture too.
    id: "figurelessQuantity",
    run: (item) => {
      const d = item.question?.display || {};
      const text = d.promptText || "";
      const answer = item.question?.answer;
      if (typeof answer !== "number" || !text) return null;
      // Only keys that actually render count (phantom-data loophole closed —
      // display.time/.truth/.data exempted 400+ described-not-shown items).
      if (rendersAnything(item.question)) return null;
      if (EMOJI_RUN.test(text)) return null;
      if (/[?_]\s*[+\-×x÷=]|[+\-×x÷=]\s*[?_]/.test(text)) return null; // equations are not pictures
      const m = text.match(QUANTITY_OF_OBJECTS);
      if (!m) return null;
      return fail(
        "figurelessQuantity",
        `"${m[0]}" describes a picture the kid never sees — give the item a figure or reword it`
      );
    },
  },

  {
    id: "distractorSanity",
    run: (item) => {
      const choices = item.question?.choices;
      const answer = item.question?.answer;
      if (!Array.isArray(choices)) return null;
      if (!choices.includes(answer)) return fail("distractorSanity", "choices do not include the answer");
      if (new Set(choices).size !== choices.length) {
        return fail("distractorSanity", "choices contain a duplicate");
      }
      if (choices.some((c) => typeof c === "number" && c < 0)) {
        return fail("distractorSanity", "a choice is negative");
      }
      return null;
    },
  },
];

/** Run every deterministic check. */
export function runChecks(item) {
  const findings = [];
  for (const check of CHECKS) {
    try {
      const result = check.run(item);
      if (result) findings.push(result);
    } catch (err) {
      findings.push(warn(check.id, `check threw: ${err.message}`));
    }
  }
  return {
    itemId: item.itemId,
    pass: !findings.some((f) => f.severity === "fail"),
    findings,
  };
}

export const CHECK_IDS = CHECKS.map((c) => c.id);

/**
 * Run the checks on an item in the ADMIN shape (payload / levelMin / levelMax)
 * rather than the in-memory bank shape (question / levelRange). The admin UI
 * and the CLI QC run the exact same checks; this only reconciles the two field
 * conventions so there is one source of truth for what "a bad item" means.
 */
export function runChecksOnAdminItem(adminItem) {
  return runChecks({
    itemId: adminItem.itemId,
    modeId: adminItem.modeId,
    structureType: adminItem.structureType,
    levelRange: [Number(adminItem.levelMin), Number(adminItem.levelMax)],
    question: adminItem.payload,
  });
}
