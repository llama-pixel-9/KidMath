const STORAGE_KEY = "kidmath-muted";

let audioCtx = null;
let mutedCache = null;
const activeSources = new Set();
const MAX_ACTIVE_SOURCES = 48;

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
  if (mutedCache != null) return mutedCache;
  try {
    mutedCache = localStorage.getItem(STORAGE_KEY) === "true";
  } catch {
    mutedCache = false;
  }
  return mutedCache;
}

export function setMuted(muted) {
  mutedCache = Boolean(muted);
  try {
    localStorage.setItem(STORAGE_KEY, mutedCache ? "true" : "false");
  } catch {
    // Ignore storage failures and keep runtime mute state.
  }
}

function playTone(frequency, startTime, duration, type = "sine", volume = 0.15) {
  const ctx = getCtx();
  if (activeSources.size >= MAX_ACTIVE_SOURCES) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = frequency;
  const safeStart = Number.isFinite(startTime) ? startTime : ctx.currentTime;
  const safeDuration = Number.isFinite(duration) ? Math.max(0.01, duration) : 0.15;
  gain.gain.setValueAtTime(volume, safeStart);
  gain.gain.exponentialRampToValueAtTime(0.001, safeStart + safeDuration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  activeSources.add(osc);
  osc.onended = () => {
    activeSources.delete(osc);
    try {
      osc.disconnect();
      gain.disconnect();
    } catch {
      // Node may already be disconnected in some browsers.
    }
  };
  osc.start(safeStart);
  osc.stop(safeStart + safeDuration);
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
