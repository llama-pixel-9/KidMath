/**
 * Read-aloud for young readers (kid-sim fix plan, PR D). K–1 prompts average
 * eleven words and a quarter of K kids cannot yet read them; the browser's
 * speech synthesis is free and good enough. iOS mirrors this with
 * AVSpeechSynthesizer (not wired yet — web only for now).
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

export function speechAvailable() {
  return typeof window !== "undefined" && "speechSynthesis" in window && typeof SpeechSynthesisUtterance !== "undefined";
}

let preferredVoice = null;
function pickVoice() {
  if (preferredVoice || !speechAvailable()) return preferredVoice;
  const voices = window.speechSynthesis.getVoices() || [];
  const english = voices.filter((v) => /^en/i.test(v.lang));
  // A natural/premium voice reads to a five-year-old far better than the default.
  preferredVoice =
    english.find((v) => /samantha|karen|moira|natural|premium|enhanced/i.test(v.name)) ||
    english.find((v) => v.default) ||
    english[0] ||
    null;
  return preferredVoice;
}

/** Speak the prompt; any speech already playing is cut off first. */
export function speak(promptText, opts = {}) {
  if (!speechAvailable()) return false;
  const text = speakableText(promptText, opts);
  if (!text) return false;
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    const voice = pickVoice();
    if (voice) u.voice = voice;
    u.rate = 0.9;
    u.pitch = 1.05;
    window.speechSynthesis.speak(u);
    return true;
  } catch {
    return false;
  }
}

export function stopSpeaking() {
  if (speechAvailable()) window.speechSynthesis.cancel();
}
