/**
 * Read-aloud for young readers (kid-sim fix plan, PR D). K–1 prompts average
 * eleven words and a quarter of K kids cannot yet read them; the browser's
 * speech synthesis is free and good enough. iOS mirrors this with
 * AVSpeechSynthesizer over the same speakableText (src/speakable.js).
 */

import { speakableText } from "./speakable.js";

export { speakableText };


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
