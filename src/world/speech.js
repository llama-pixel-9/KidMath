/**
 * Audio-first dialog (plan Phase 2): many players can't read yet, so every
 * line is spoken. Web Speech API — free, offline-capable, no assets to ship.
 * Recorded voice can replace this later without touching call sites.
 *
 * Browsers gate speech behind a user gesture; every quest line follows a
 * tap, so that's naturally satisfied.
 */
const PREFERRED = ["Samantha", "Karen", "Moira", "Google US English", "Microsoft Aria", "Daniel"];
let chosenVoice = null;

function pickVoice() {
  if (chosenVoice) return chosenVoice;
  const voices = window.speechSynthesis.getVoices?.() ?? [];
  if (!voices.length) return null;
  const en = voices.filter((v) => /^en/i.test(v.lang));
  chosenVoice = PREFERRED.map((name) => en.find((v) => v.name.includes(name))).find(Boolean) ?? en.find((v) => v.default) ?? en[0] ?? null;
  return chosenVoice;
}

export function speak(line) {
  try {
    if (!("speechSynthesis" in window) || !line) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(line);
    utterance.rate = 0.92; // a touch slower for K-3 ears
    utterance.pitch = 1.15;
    const voice = pickVoice();
    if (voice) utterance.voice = voice;
    window.speechSynthesis.speak(utterance);
  } catch {
    /* speech is enhancement, never a dependency */
  }
}

export function stopSpeaking() {
  try {
    window.speechSynthesis?.cancel();
  } catch {
    /* ignore */
  }
}
