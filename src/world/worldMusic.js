import { isMuted } from "../sounds.js";

/**
 * A soft generative melody per region — a slow pentatonic arpeggio over a
 * drone, quiet enough to sit under the bird calls. No audio files: it is
 * scheduled a beat ahead on the Web Audio clock. Pauses when the tab is
 * hidden, obeys the app-wide mute, changes key when the region changes.
 */
const REGION_KEYS = {
  meadow: { root: 261.63, mode: [0, 2, 4, 7, 9], bpm: 84 }, // C major pentatonic
  pond: { root: 293.66, mode: [0, 2, 5, 7, 10], bpm: 76 }, // D minor-ish pentatonic
  woods: { root: 196.0, mode: [0, 3, 5, 7, 10], bpm: 72 }, // G minor pentatonic
  cliffs: { root: 329.63, mode: [0, 2, 4, 7, 9], bpm: 92 }, // E major pentatonic
};

let ctx = null;
let master = null;
let timer = null;
let regionId = null;
let nextBeat = 0;
let step = 0;
let running = false;

function ac() {
  if (!ctx) {
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
    master = ctx.createGain();
    master.gain.value = 0.0;
    master.connect(ctx.destination);
  }
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  return ctx;
}

function note(freq, at, dur, vol, type = "sine") {
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(vol, at + 0.04);
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  osc.connect(g);
  g.connect(master);
  osc.start(at);
  osc.stop(at + dur + 0.05);
}

function schedule() {
  if (!running || !ctx) return;
  const key = REGION_KEYS[regionId] ?? REGION_KEYS.meadow;
  const beat = 60 / key.bpm;
  while (nextBeat < ctx.currentTime + 0.6) {
    const bar = Math.floor(step / 8);
    const pos = step % 8;
    // A gentle rising-falling pattern, transposed every other bar.
    const pattern = [0, 2, 4, 2, 3, 1, 4, 1];
    const degree = pattern[pos] + (bar % 2 ? 1 : 0);
    const octave = pos === 0 || pos === 4 ? 1 : 2;
    const semis = key.mode[degree % key.mode.length] + 12 * (Math.floor(degree / key.mode.length) + octave);
    const f = key.root * Math.pow(2, semis / 12);
    if (pos % 2 === 0 || Math.random() < 0.7) note(f, nextBeat, beat * 1.6, 0.05, "triangle");
    if (pos === 0) note(key.root, nextBeat, beat * 7.5, 0.035, "sine"); // drone
    nextBeat += beat;
    step += 1;
  }
}

export const music = {
  start(region) {
    if (isMuted()) return;
    const c = ac();
    if (!c) return;
    regionId = region ?? "meadow";
    if (running) return;
    running = true;
    nextBeat = c.currentTime + 0.2;
    step = 0;
    master.gain.cancelScheduledValues(c.currentTime);
    master.gain.setValueAtTime(0.0001, c.currentTime);
    master.gain.exponentialRampToValueAtTime(1, c.currentTime + 2.5);
    timer = setInterval(schedule, 250);
    schedule();
  },
  setRegion(region) {
    if (!region || region === regionId) return;
    regionId = region;
    step = 0;
  },
  stop() {
    if (!running) return;
    running = false;
    clearInterval(timer);
    timer = null;
    if (ctx && master) {
      master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.setValueAtTime(master.gain.value || 0.0001, ctx.currentTime);
      master.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1.2);
    }
  },
  /** Duck under a dialog or celebration, then come back. */
  duck(on) {
    if (!ctx || !master || !running) return;
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.setValueAtTime(Math.max(0.0001, master.gain.value), ctx.currentTime);
    master.gain.exponentialRampToValueAtTime(on ? 0.35 : 1, ctx.currentTime + 0.6);
  },
};

if (typeof document !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    if (!ctx) return;
    if (document.hidden) ctx.suspend?.().catch?.(() => {});
    else if (running) ctx.resume?.().catch?.(() => {});
  });
}
