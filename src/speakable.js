/**
 * Speakable prompt text — pure. speech.js wraps this with the browser's
 * speech synthesis; iOS reads it through the engine bundle and hands it to
 * AVSpeechSynthesizer, so both platforms say the same words.
 */

const EMOJI_RE = /(\p{Extended_Pictographic}[️‍]*)/gu;

/**
 * Turn a prompt into something that sounds right when spoken: emoji runs
 * become counts ("5 cookies" rather than silence), operators become words,
 * and a bare "?" becomes "what".
 */
export function speakableText(promptText, { noun = "things" } = {}) {
  if (!promptText) return "";
  let text = String(promptText);
  // Collapse each emoji run into "N <noun>".
  text = text.replace(/(?:\p{Extended_Pictographic}[️‍]*\s*){2,}/gu, (run) => {
    const n = [...run.matchAll(EMOJI_RE)].length;
    return ` ${n} ${noun} `;
  });
  text = text.replace(EMOJI_RE, "");
  text = text
    .replace(/\s*×\s*/g, " times ")
    .replace(/\s*÷\s*/g, " divided by ")
    .replace(/\s*−\s*|\s+-\s+/g, " minus ")
    .replace(/\s*\+\s*/g, " plus ")
    .replace(/\s*=\s*\?/g, " equals what")
    .replace(/\s*=\s*/g, " equals ")
    .replace(/\?(?=\s|$)/g, " what ")
    .replace(/\b(\d+)\/(\d+)\b/g, "$1 over $2")
    .replace(/\s+/g, " ")
    .trim();
  return text;
}
