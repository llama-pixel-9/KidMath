const STORAGE_KEY = "kidmath-muted";

let audioCtx = null;

function getCtx() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }
  return audioCtx;
}

export function isMuted() {
  try {
    return localStorage.getItem(STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

export function setMuted(muted) {
  try {
    localStorage.setItem(STORAGE_KEY, muted ? "true" : "false");
  } catch {}
}

function playTone(frequency, startTime, duration, type = "sine", volume = 0.15) {
  const ctx = getCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = frequency;
  gain.gain.setValueAtTime(volume, startTime);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(startTime);
  osc.stop(startTime + duration);
}

export function playCorrectSound() {
  if (isMuted()) return;
  const ctx = getCtx();
  const now = ctx.currentTime;
  playTone(523.25, now, 0.15);        // C5
  playTone(659.25, now + 0.1, 0.15);  // E5
  playTone(783.99, now + 0.2, 0.2);   // G5
}

export function playStreakSound() {
  if (isMuted()) return;
  const ctx = getCtx();
  const now = ctx.currentTime;
  const notes = [523.25, 659.25, 783.99, 1046.5]; // C5 E5 G5 C6
  notes.forEach((freq, i) => {
    playTone(freq, now + i * 0.08, 0.15, "sine", 0.12);
  });
}

export function playLevelUpSound() {
  if (isMuted()) return;
  const ctx = getCtx();
  const now = ctx.currentTime;
  const notes = [392, 440, 493.88, 523.25, 587.33, 659.25, 783.99]; // G4 to G5 scale
  notes.forEach((freq, i) => {
    playTone(freq, now + i * 0.06, 0.12, "triangle", 0.13);
  });
}

export function playWrongSound() {
  if (isMuted()) return;
  const ctx = getCtx();
  const now = ctx.currentTime;
  playTone(220, now, 0.25, "sine", 0.08);
}

export function playCompleteSound() {
  if (isMuted()) return;
  const ctx = getCtx();
  const now = ctx.currentTime;
  const notes = [523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5];
  notes.forEach((freq, i) => {
    playTone(freq, now + i * 0.1, 0.2, "sine", 0.12);
  });
}
