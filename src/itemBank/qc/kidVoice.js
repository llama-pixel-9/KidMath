/**
 * Kid voice on the question card.
 *
 * The 2026-10-02 drill sweep read every v1 drill template and found two
 * shapes that read wrong to a kid on every platform, both now `fail` checks:
 *
 * - teacherVoice: test-maker or adult wording ("Use compensation", "Compute
 *   the value", "certifies … Is the certification valid?", "Audit … Clean
 *   audit?", "subtrahend"). Kids answer questions the way a K-5 textbook or a
 *   state test asks them; strategy names they learn (make a ten, doubles,
 *   number bond, tape diagram) are fine.
 * - questionNotLast: a sentence after the question. The card shows the last
 *   sentence big, so "What is 9 + 9? Diego checks." puts "Diego checks." in
 *   the big line and the real question in the small one.
 * - britishSpelling: "centimetre", "litre" and the rest. Larkit uses US
 *   spelling (Sai, 2026-10-03); Measurement shipped about 1,000 British
 *   spellings beside US ones in the same topic.
 */
import { promptSentences } from "../../promptLayout.js";

const TEACHER_VOICE = [
  /\bcompensation\b/i,
  /\bhalve[- ]and[- ]double\b/i,
  /\b(subtrahend|minuend)s?\b/i,
  /\bsolve for the unknown\b/i,
  /\bopen (number sentence|equation)\b/i,
  /\bexpress (it |this |the \w+ )?as\b/i,
  /\b(compute|evaluate|determine)\b/i,
  /\b(compute|find|give|state|calculate) the value\b/i,
  /\bthe value\s*\?/i,
  /\bcertif(y|ies|ied|ication)\b/i,
  /\baudit(s|ed|ing)?\b/i,
  /\bassert(s|ion)\b/i,
  /\b(sound|valid) (logic|statement|argument|reasoning|claim)\b/i,
  /\bis the (work|logic|reasoning|argument) sound\b/i,
  /(^|[.!?]\s+)(valid|sound|clean)( audit)?\?\s*$/i,
  /\breasoning:/i,
];

export function teacherVoiceFinding(item) {
  const text = item?.question?.display?.promptText || "";
  if (!text) return null;
  for (const re of TEACHER_VOICE) {
    const m = text.match(re);
    if (m) {
      return {
        id: "teacherVoice",
        severity: "fail",
        message: `"${m[0].trim()}" is test-maker wording; ask it the way a K-5 textbook asks a kid`,
      };
    }
  }
  return null;
}

const PICTURE_ROW = /^[\p{Extended_Pictographic}\u{FE0F}\u{200D}\s|]+$/u;
// Digits, signs and blanks only: no word in it, so nothing for a kid to read past.
const MATH_ROW = /^(?=.*[\d□_])[\d\s+\-−×÷=<>≤≥□_?.,()/]+$/u;

export function questionNotLastFinding(item) {
  const text = item?.question?.display?.promptText || "";
  // A trailing picture row (🍎🍎🍎) or number sentence ("84 + 9 = 90 + □")
  // is the thing the question is about, not a sentence after it, and showing
  // it big is right.
  const lines = promptSentences(text).filter((l) => !PICTURE_ROW.test(l) && !MATH_ROW.test(l));
  if (lines.length < 2) return null;
  const last = lines[lines.length - 1];
  if (/\?\s*$/.test(last)) return null;
  const qi = lines.findLastIndex((l) => /\?\s*$/.test(l));
  if (qi < 0) return null;
  return {
    id: "questionNotLast",
    severity: "fail",
    message: `"${last}" comes after the question, so the card shows it as the big line; end on the question`,
  };
}

const BRITISH_UNIT = /\b(?:centi|milli|kilo)?metres?\b|\b(?:milli)?litres?\b/i;

function kidStrings(value, out = []) {
  if (typeof value === "string") out.push(value);
  else if (Array.isArray(value)) value.forEach((v) => kidStrings(v, out));
  else if (value && typeof value === "object") Object.values(value).forEach((v) => kidStrings(v, out));
  return out;
}

// Every string the item carries (prompt, choices, answer, labels), not only
// the prompt: a choice reading "3 metres" shows on the card too.
export function britishSpellingFinding(item) {
  for (const text of kidStrings(item?.question)) {
    const m = text.match(BRITISH_UNIT);
    if (m) {
      return {
        id: "britishSpelling",
        severity: "fail",
        message: `"${m[0]}" is British spelling; write ${m[0].toLowerCase().replace(/tre(s?)$/, "ter$1")}`,
      };
    }
  }
  return null;
}
