import { isMuted } from "../sounds.js";

/**
 * World sound — small synthesized cues (no assets to ship, works offline).
 * Every cue is short, soft, and pitched in a friendly major register; the
 * app-wide mute (sounds.js / kidmath-muted) silences all of it.
 */
let ctx = null;

function ac() {
  if (!ctx) {
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  return ctx;
}

function tone(freq, { type = "sine", dur = 0.16, vol = 0.1, at = 0, slideTo = null, attack = 0.006 } = {}) {
  const c = ac();
  if (!c) return;
  const t0 = c.currentTime + at;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(vol, t0 + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain);
  gain.connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
  osc.onended = () => {
    try {
      osc.disconnect();
      gain.disconnect();
    } catch {
      /* already gone */
    }
  };
}

let noiseBuffer = null;
function noise({ dur = 0.12, vol = 0.05, at = 0, freq = 900, q = 0.8 } = {}) {
  const c = ac();
  if (!c) return;
  if (!noiseBuffer) {
    noiseBuffer = c.createBuffer(1, c.sampleRate * 0.5, c.sampleRate);
    const d = noiseBuffer.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const t0 = c.currentTime + at;
  const src = c.createBufferSource();
  src.buffer = noiseBuffer;
  const filter = c.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = freq;
  filter.Q.value = q;
  const gain = c.createGain();
  gain.gain.setValueAtTime(vol, t0);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(filter);
  filter.connect(gain);
  gain.connect(c.destination);
  src.start(t0);
  src.stop(t0 + dur + 0.02);
}

const on = () => !isMuted();

export const sfx = {
  /** Tiny upward blip as the skylark leaves the ground. */
  hop() {
    if (!on()) return;
    tone(520, { type: "triangle", dur: 0.09, vol: 0.05, slideTo: 760 });
  },
  land() {
    if (!on()) return;
    noise({ dur: 0.08, vol: 0.035, freq: 500, q: 0.6 });
  },
  takeoff() {
    if (!on()) return;
    noise({ dur: 0.28, vol: 0.05, freq: 1400, q: 0.5 });
    tone(440, { type: "sine", dur: 0.3, vol: 0.05, slideTo: 880 });
  },
  /** A wingbeat whoosh; called on each beat while flying. */
  flap() {
    if (!on()) return;
    noise({ dur: 0.07, vol: 0.02, freq: 1800, q: 0.7 });
  },
  /** Counting pops climb in pitch with n so a count "sounds" like a climb. */
  pop(n = 1) {
    if (!on()) return;
    const f = 440 * Math.pow(2, Math.min(n, 12) / 12);
    tone(f, { type: "sine", dur: 0.14, vol: 0.09 });
    tone(f * 2, { type: "sine", dur: 0.08, vol: 0.03 });
  },
  /** Wood on wood — a plank or stone settling. */
  thunk() {
    if (!on()) return;
    tone(150, { type: "triangle", dur: 0.14, vol: 0.12, slideTo: 90 });
    noise({ dur: 0.06, vol: 0.05, freq: 300, q: 0.9 });
  },
  /** Right answer: a bright three-note rise. */
  chime() {
    if (!on()) return;
    tone(523.25, { dur: 0.16, vol: 0.09 });
    tone(659.25, { dur: 0.16, vol: 0.09, at: 0.09 });
    tone(783.99, { dur: 0.26, vol: 0.09, at: 0.18 });
  },
  /** Wrong pick: a soft wobble, never a buzzer. */
  wobble() {
    if (!on()) return;
    tone(330, { type: "triangle", dur: 0.14, vol: 0.06, slideTo: 290 });
    tone(310, { type: "triangle", dur: 0.16, vol: 0.05, slideTo: 270, at: 0.13 });
  },
  /** Stars flying to the pocket — sparkly ascending arpeggio. */
  stars(count = 3) {
    if (!on()) return;
    const notes = [659.25, 783.99, 987.77, 1174.66, 1318.51, 1567.98];
    for (let i = 0; i < Math.min(count, 6); i++) {
      tone(notes[i], { dur: 0.22, vol: 0.06, at: i * 0.07 });
    }
  },
  /** Mist rolling back to reveal a new region. */
  reveal() {
    if (!on()) return;
    noise({ dur: 1.2, vol: 0.03, freq: 600, q: 0.3 });
    [392, 523.25, 659.25, 783.99, 1046.5].forEach((f, i) =>
      tone(f, { dur: 0.5, vol: 0.05, at: 0.25 + i * 0.12 }),
    );
  },
  creak() {
    if (!on()) return;
    tone(180, { type: "sawtooth", dur: 0.5, vol: 0.025, slideTo: 240 });
  },
  /** Picking up a feather. */
  collect() {
    if (!on()) return;
    tone(880, { dur: 0.1, vol: 0.06 });
    tone(1318.51, { dur: 0.18, vol: 0.06, at: 0.08 });
  },
  /** A two-note bird call; `seed` makes each species sound like itself. */
  chirp(seed = 0) {
    if (!on()) return;
    const base = 900 + (seed % 7) * 110;
    tone(base, { type: "sine", dur: 0.09, vol: 0.05, slideTo: base * 1.25 });
    tone(base * 1.3, { type: "sine", dur: 0.12, vol: 0.045, slideTo: base * 1.1, at: 0.11 });
  },
  /** Hearts / happy hop from a thankful NPC. */
  happy() {
    if (!on()) return;
    tone(784, { dur: 0.09, vol: 0.05 });
    tone(988, { dur: 0.09, vol: 0.05, at: 0.08 });
    tone(784, { dur: 0.12, vol: 0.05, at: 0.16 });
  },
  plant() {
    if (!on()) return;
    noise({ dur: 0.14, vol: 0.05, freq: 350, q: 0.7 });
  },
  bloom() {
    if (!on()) return;
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, { dur: 0.3, vol: 0.05, at: i * 0.06 }));
  },
  /** The egg hatching: crack, crack, chirp! */
  hatch() {
    if (!on()) return;
    noise({ dur: 0.05, vol: 0.06, freq: 2200, q: 1 });
    noise({ dur: 0.05, vol: 0.06, freq: 2600, q: 1, at: 0.25 });
    tone(1200, { dur: 0.12, vol: 0.06, slideTo: 1600, at: 0.55 });
    tone(1500, { dur: 0.16, vol: 0.06, slideTo: 1300, at: 0.7 });
  },
};
