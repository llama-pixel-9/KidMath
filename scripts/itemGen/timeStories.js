/* time application stories — clocks and calendars in a kid's day.
 *
 * Contexts: swim practice, baking with a timer, the school bus, movie
 * night, library due dates, and garden club meetings. Claims ride countMath
 * ({gap} on absolute minutes, {sum}, {countOn}) or display.time claims
 * verified by authorTime.js. Band 1 speaks in word times only (o'clock /
 * half past) — digital "6:30" would state 30 and trip the band-1 gate.
 */

import { rotor, shuffled, NAMES } from "./countingTemplates.js";
import { LEVELS, HOUR_WORDS } from "./timeTemplates.js";
import { WEEKDAYS } from "./timeTemplates2.js";

const nameAt = (i) => NAMES[i % NAMES.length];
const B1 = "band1";
const B2 = "band2";
const B3 = "band3";
const pad = (n) => String(n).padStart(2, "0");
const fmt = (h, m) => `${h}:${pad(m)}`;

const mk = (subskill, structureType, band, question) => {
  if (band === B1) {
    const nums = (String(question.display?.promptText).match(/\d+/g) || []).map(Number);
    if (Math.max(0, ...nums) > 20) throw new Error(`band1 story exceeds 20: ${question.display?.promptText}`);
  }
  return {
    modeId: "time",
    subskill,
    itemFamily: "application",
    structureType,
    levelRange: LEVELS[band],
    question: { a: null, b: null, op: "count", ...question },
  };
};

const EVENTS = ["swim practice", "art club", "the puppet show", "garden club"];

function cycle(count, space, skeletons, offset, emit) {
  const items = [];
  for (let i = 0; i < count; i += 1) {
    items.push(emit(space[i % space.length], skeletons[(i + offset) % skeletons.length], nameAt(i + offset), i));
  }
  return items;
}

export function buildStoryItems() {
  const items = [];

  /* ---------------- readClock stories ---------------- */

  // Band 1: hands described -> what time does the event start (words).
  const HANDS_SKELETONS = [
    (nm, ev, hw, half) => `${nm} checks the clock before ${ev}: the minute hand points at ${half ? "six" : "twelve"} and the hour hand ${half ? `just past ${hw}` : `at ${hw}`}. What time is it?`,
    (nm, ev, hw, half) => `Right before ${ev}, ${nm} sees the hour hand ${half ? `halfway past ${hw}` : `on ${hw}`} and the minute hand on ${half ? "the six" : "the twelve"}. Which time is that?`,
  ];
  const handsEmit = ([h, half, ei], sk, nm) => {
    const good = half ? `half past ${HOUR_WORDS[h]}` : `${HOUR_WORDS[h]} o'clock`;
    const wrong = [half ? `${HOUR_WORDS[h]} o'clock` : `half past ${HOUR_WORDS[h]}`, `${HOUR_WORDS[(h % 12) + 1]} o'clock`, `half past ${HOUR_WORDS[(h % 12) + 1]}`];
    return mk("readClock", "storyHandsRead", B1, {
      answer: good,
      choices: shuffled([good, ...wrong], h + (half ? 3 : 0)),
      display: { time: { kind: "handsWords", hour: h, minute: half ? 30 : 0 }, promptText: sk(nm, EVENTS[ei % 4], HOUR_WORDS[h], half) },
    });
  };
  const hB1 = [[3, false, 0], [7, true, 1], [5, false, 2], [9, true, 3], [2, false, 0], [11, true, 1], [4, false, 2], [8, true, 3], [6, false, 0], [1, true, 1], [10, false, 2], [12, true, 3], [3, true, 0], [7, false, 1], [5, true, 2], [9, false, 3], [2, true, 0]];
  items.push(...cycle(17, hB1, HANDS_SKELETONS, 0, handsEmit));

  // Band 2: schedule board (digital) -> read for an event.
  const BOARD_SKELETONS = [
    (nm, ev, t) => `The schedule board says ${ev} starts at "${t}". ${nm} reads it out loud in words. Which reading is right?`,
    (nm, ev, t) => `${nm} sees "${t}" next to ${ev} on the board. Which words say that time?`,
  ];
  const boardEmit = ([h, m, good, ei], sk, nm, i) => {
    const wrong = [`half past ${HOUR_WORDS[h]}`, `${HOUR_WORDS[h]} o'clock`, `quarter past ${HOUR_WORDS[h]}`].filter((x) => x !== good);
    return mk("readClock", "storyBoardRead", B2, {
      answer: good,
      choices: shuffled([good, ...wrong.slice(0, 3)], i + 5),
      display: { time: { kind: "digitalWords", hour: h, minute: m, words: good }, promptText: sk(nm, EVENTS[ei % 4], fmt(h, m)) },
    });
  };
  const bB2 = [[3, 15, "quarter past three", 0], [8, 45, "quarter to nine", 1], [2, 30, "half past two", 2], [6, 10, "ten past six", 3], [11, 40, "twenty to twelve", 0], [5, 5, "five past five", 1], [9, 50, "ten to ten", 2], [1, 20, "twenty past one", 3], [7, 15, "quarter past seven", 0], [4, 45, "quarter to five", 1], [10, 30, "half past ten", 2], [12, 15, "quarter past twelve", 3], [3, 40, "twenty to four", 0], [8, 20, "twenty past eight", 1], [2, 45, "quarter to three", 2], [6, 55, "five to seven", 3], [11, 25, "twenty-five past eleven", 0]];
  items.push(...cycle(17, bB2, BOARD_SKELETONS, 1, boardEmit));

  // Band 3: to-the-minute arrivals.
  const ARRIVE_SKELETONS = [
    (nm, ev, h, m) => `${nm} arrives at ${ev} when the clock shows ${m} minutes past ${h}. Which digital time is on ${nm}'s watch?`,
    (nm, ev, h, m) => `The wall clock reads ${m} minutes after ${h} as ${nm} walks into ${ev}. Pick the matching digital time.`,
  ];
  const arriveEmit = ([h, m, ei], sk, nm, i) => {
    const good = fmt(h, m);
    const wrong = [...new Set([fmt(h, (m + 5) % 60), fmt((h % 12) + 1, m), fmt(h, 60 - m)])].filter((x) => x !== good);
    return mk("readClock", "storyArrive", B3, {
      answer: good,
      choices: shuffled([good, ...wrong.slice(0, 3)], i + 7),
      display: { time: { kind: "wordsDigital", hour: h, minute: m }, promptText: sk(nm, EVENTS[ei % 4], h, m) },
    });
  };
  const aB3 = [[3, 7, 0], [8, 23, 1], [2, 48, 2], [6, 11, 3], [11, 37, 0], [5, 52, 1], [9, 16, 2], [1, 41, 3], [7, 28, 0], [12, 57, 1], [4, 13, 2], [10, 34, 3], [3, 49, 0], [8, 2, 1], [2, 26, 2], [6, 44, 3], [11, 58, 0]];
  items.push(...cycle(17, aB3, ARRIVE_SKELETONS, 2, arriveEmit));

  /* ---------------- elapsedTime stories ---------------- */

  // Band 1: whole-hour events (words).
  const HOURS_SKELETONS = [
    (nm, ev, s, e) => `${ev} starts at ${HOUR_WORDS[s]} o'clock and ends at ${HOUR_WORDS[e]} o'clock. ${nm} wants to know: how many hours is that?`,
    (nm, ev, s, e) => `${nm} stays at ${ev} from ${HOUR_WORDS[s]} o'clock until ${HOUR_WORDS[e]} o'clock. How many hours does it last?`,
  ];
  const hoursEmit = ([s, e, ei], sk, nm) =>
    mk("elapsedTime", "storyWholeHours", B1, {
      answer: e - s,
      answerType: "numberPad",
      display: { counting: { kind: "gap", have: s, target: e }, promptText: sk(nm, EVENTS[ei % 4], s, e) },
    });
  const whB1 = [[2, 5, 0], [1, 4, 1], [3, 7, 2], [6, 9, 3], [2, 8, 0], [4, 6, 1], [1, 3, 2], [5, 11, 3], [7, 10, 0], [3, 4, 1], [8, 12, 2], [2, 6, 3], [1, 7, 0], [4, 9, 1], [6, 10, 2], [3, 8, 3], [5, 7, 0]];
  items.push(...cycle(17, whB1, HOURS_SKELETONS, 0, hoursEmit));

  // Band 2: timers within the hour.
  const TIMER_SKELETONS = [
    (nm, s, e) => `${nm} slides cookies into the oven at ${s} and takes them out at ${e}. How many minutes did they bake?`,
    (nm, s, e) => `The kitchen timer for ${nm}'s muffins runs from ${s} to ${e}. How many minutes is that?`,
  ];
  const timerEmit = (band) => ([h1, m1, h2, m2], sk, nm) =>
    mk("elapsedTime", `storyTimer_${band}`, band, {
      answer: h2 * 60 + m2 - (h1 * 60 + m1),
      answerType: "numberPad",
      display: { counting: { kind: "gap", have: h1 * 60 + m1, target: h2 * 60 + m2 }, promptText: sk(nm, fmt(h1, m1), fmt(h2, m2)) },
    });
  const tB2 = [[3, 10, 3, 45], [8, 5, 8, 30], [2, 15, 2, 50], [6, 20, 6, 55], [11, 10, 11, 40], [5, 25, 5, 45], [9, 5, 9, 35], [1, 15, 1, 40], [7, 10, 7, 25], [4, 30, 4, 55], [10, 5, 10, 50], [12, 20, 12, 45], [3, 15, 3, 35], [8, 25, 8, 50], [2, 5, 2, 20], [6, 10, 6, 50], [11, 30, 11, 45]];
  items.push(...cycle(17, tB2, TIMER_SKELETONS, 1, timerEmit(B2)));

  // Band 3: across the hour + end unknown.
  const tB3 = [[2, 40, 3, 25], [5, 50, 6, 20], [8, 35, 9, 10], [11, 45, 12, 30], [3, 55, 4, 15], [6, 40, 7, 5], [9, 30, 10, 25], [1, 50, 2, 40], [4, 45, 5, 35], [7, 55, 8, 30], [10, 40, 11, 20], [2, 35, 3, 15], [5, 45, 6, 40], [8, 50, 9, 45], [11, 35, 12, 10], [3, 40, 4, 30], [6, 55, 7, 35]];
  items.push(...cycle(17, tB3, TIMER_SKELETONS, 0, timerEmit(B3)));

  const BUS_SKELETONS = [
    (nm, s, d) => `${nm}'s bus leaves at ${s} and the ride takes ${d} minutes. Which time does the bus arrive?`,
    (nm, s, d) => `The trip to the museum starts at ${s} and lasts ${d} minutes. When does ${nm} arrive? Pick the time.`,
  ];
  const busEmit = ([h, m, d], sk, nm, i) => {
    const total = h * 60 + m + d;
    const eh = ((Math.floor(total / 60) - 1) % 12) + 1;
    const em = total % 60;
    const good = fmt(eh, em);
    const wrong = [...new Set([fmt(eh, (em + 5) % 60), fmt((eh % 12) + 1, em), fmt(eh, (em + 55) % 60)])].filter((x) => x !== good);
    return mk("elapsedTime", "storyBusArrive", B3, {
      answer: good,
      choices: shuffled([good, ...wrong.slice(0, 3)], i + 9),
      display: { time: { kind: "endTime", startH: h, startM: m, dur: d }, promptText: sk(nm, fmt(h, m), d) },
    });
  };
  const busB3 = [[2, 40, 35], [5, 50, 25], [8, 35, 45], [11, 45, 30], [3, 55, 20], [6, 40, 40], [9, 30, 50], [1, 50, 35], [4, 45, 25], [7, 55, 15], [10, 40, 35], [2, 35, 45], [5, 45, 30], [8, 50, 20], [11, 35, 40], [3, 40, 25], [6, 55, 15]];
  items.push(...cycle(17, busB3, BUS_SKELETONS, 1, busEmit));

  // Band 1/2 fill: hour-later plans.
  const PLAN_SKELETONS = [
    (nm, ev, hw, k) => `${ev} starts at ${hw} o'clock. ${nm} must leave home ${HOUR_WORDS[k]} ${k === 1 ? "hour" : "hours"} earlier. What hour does ${nm} leave? Answer with the hour number.`,
    (nm, ev, hw, k) => `${nm} finishes ${ev} ${HOUR_WORDS[k]} ${k === 1 ? "hour" : "hours"} after it starts at ${hw} o'clock. What hour does it finish? Answer with the hour number.`,
  ];
  const planEmit = ([h, k, ei], sk, nm, i) => {
    const later = (i + ei) % 2 === 1;
    const skel = PLAN_SKELETONS[later ? 1 : 0];
    const answer = later ? ((h + k - 1) % 12) + 1 : ((h - k + 11) % 12) + 1;
    return mk("elapsedTime", "storyHourPlan", B1, {
      answer,
      answerType: "numberPad",
      display: { time: { kind: "hourLater", hour: h, delta: later ? k : -k }, promptText: skel(nm, EVENTS[ei % 4], HOUR_WORDS[h], k) },
    });
  };
  const plB1 = [[3, 1, 0], [7, 2, 1], [5, 1, 2], [9, 2, 3], [2, 1, 0], [11, 1, 1], [4, 2, 2], [8, 1, 3], [6, 2, 0], [10, 1, 2], [12, 1, 3], [3, 2, 1], [7, 1, 0], [5, 2, 3], [9, 1, 2], [2, 2, 1], [4, 1, 0]];
  items.push(...cycle(17, plB1, [PLAN_SKELETONS[0]], 0, planEmit));

  /* ---------------- timeConcepts stories ---------------- */

  const ROUTINE_SKELETONS = [
    (nm, act, part) => `${nm} ${act}. Which part of the day is it?`,
    (nm, act, part) => `When ${nm} ${act}, is it morning, afternoon, or night?`,
  ];
  const routineEmit = ([act, part], sk, nm, i) =>
    mk("timeConcepts", "storyDayPart", B1, {
      answer: part,
      choices: shuffled(["morning", "afternoon", "night"], i + 3),
      display: { time: { kind: "dayPart", part }, promptText: sk(nm, act, part) },
    });
  const rtB1 = [["feeds the cat before school", "morning"], ["reads under the covers before sleep", "night"], ["kicks a ball after lunch", "afternoon"], ["pours cereal at sunrise", "morning"], ["counts fireflies in the dark", "night"], ["does homework when school lets out", "afternoon"], ["zips up a backpack before the bus", "morning"], ["listens to a bedtime story", "night"], ["snacks on apple slices after recess ends the school day", "afternoon"], ["watches the sun come up", "morning"], ["spots the first star", "night"], ["builds a fort after coming home from school", "afternoon"], ["makes the bed after waking", "morning"], ["yawns and turns off the lamp", "night"], ["waters plants in the late-day sun", "afternoon"], ["hears the rooster crow", "morning"], ["brushes teeth before lights-out", "night"]];
  items.push(...cycle(17, rtB1, ROUTINE_SKELETONS, 0, routineEmit));

  const RECIPE_SKELETONS = [
    (nm, h, m) => `${nm}'s bread recipe needs ${h} ${h === 1 ? "hour" : "hours"} and ${m} minutes in the oven. How many minutes is that in all?`,
    (nm, h, m) => `The model glue must dry for ${h} ${h === 1 ? "hour" : "hours"} ${m} minutes, ${nm} reads. How many total minutes of waiting?`,
  ];
  const recipeEmit = (band) => ([h, m], sk, nm) =>
    mk("timeConcepts", `storyRecipe_${band}`, band, {
      answer: h * 60 + m,
      answerType: "numberPad",
      display: { counting: { kind: "sum", parts: [h * 60, m] }, promptText: sk(nm, h, m) },
    });
  const rcB2 = [[1, 15], [1, 30], [1, 45], [2, 10], [2, 30], [2, 45], [3, 20], [3, 40], [1, 5], [1, 50], [2, 5], [2, 55], [3, 15], [4, 10], [1, 25], [1, 40], [2, 20]];
  items.push(...cycle(17, rcB2, RECIPE_SKELETONS, 1, recipeEmit(B2)));
  const rcB3 = [[5, 25], [6, 10], [4, 35], [5, 50], [7, 15], [6, 40], [4, 5], [7, 55], [5, 5], [6, 25], [4, 50], [7, 30], [5, 40], [6, 55], [4, 20], [7, 45], [5, 15]];
  items.push(...cycle(17, rcB3, RECIPE_SKELETONS, 0, recipeEmit(B3)));

  const GUESS_SKELETONS = [
    (nm, task, good) => `${nm} guesses how long it takes to ${task}. Which guess makes sense?`,
    (nm, task, good) => `About how long does it take ${nm} to ${task}? Pick the sensible time.`,
  ];
  const guessEmit = ([task, good, wrong], sk, nm, i) =>
    mk("timeConcepts", "storyBenchmark", B1, {
      answer: good,
      choices: shuffled([good, ...wrong], i + 6),
      display: { time: { kind: "benchmark" }, promptText: sk(nm, task, good) },
    });
  const gsB1 = [["pour a glass of milk", "10 seconds", ["10 hours", "10 days", "10 minutes"]], ["walk to a nearby park", "15 minutes", ["15 seconds", "15 hours", "15 days"]], ["hop once", "1 second", ["1 minute", "1 hour", "1 day"]], ["bake cookies", "12 minutes", ["12 seconds", "12 hours", "12 days"]], ["do a puzzle", "20 minutes", ["20 seconds", "20 hours", "20 days"]], ["wash hands", "20 seconds", ["20 minutes", "20 hours", "20 days"]], ["a car wash", "5 minutes", ["5 seconds", "5 hours", "5 days"]], ["a night of sleep", "9 hours", ["9 seconds", "9 minutes", "9 days"]], ["zip a jacket", "5 seconds", ["5 minutes", "5 hours", "5 days"]], ["a recess break", "15 minutes", ["15 seconds", "15 hours", "15 days"]], ["drink a cup of water", "8 seconds", ["8 minutes", "8 hours", "8 days"]], ["a school morning", "4 hours", ["4 seconds", "4 minutes", "4 days"]], ["a cartoon episode", "11 minutes", ["11 seconds", "11 hours", "11 days"]], ["put on shoes", "14 seconds", ["14 minutes", "14 hours", "14 days"]], ["a piano lesson", "16 minutes", ["16 seconds", "16 hours", "16 days"]], ["one jumping jack", "2 seconds", ["2 minutes", "2 hours", "2 days"]], ["paint a small picture", "18 minutes", ["18 seconds", "18 hours", "18 days"]]];
  items.push(...cycle(17, gsB1, GUESS_SKELETONS, 1, guessEmit));

  const TIMER_LEFT_SKELETONS = [
    (nm, total, used) => `${nm}'s screen-time timer holds ${total} minutes. ${used} minutes are used up. How many minutes remain?`,
    (nm, total, used) => `Of the ${total} minutes on ${nm}'s practice timer, ${used} have ticked by. How many minutes are left?`,
  ];
  const leftEmit = (band) => ([total, used], sk, nm) =>
    mk("timeConcepts", `storyTimerLeft_${band}`, band, {
      answer: total - used,
      answerType: "numberPad",
      display: { counting: { kind: "gap", have: used, target: total }, promptText: sk(nm, total, used) },
    });
  const tlB2 = [[60, 25], [45, 20], [90, 35], [60, 45], [30, 15], [45, 30], [90, 55], [60, 10], [30, 25], [45, 15], [90, 70], [60, 35], [30, 5], [45, 40], [90, 45], [60, 50], [75, 30]];
  items.push(...cycle(17, tlB2, TIMER_LEFT_SKELETONS, 0, leftEmit(B2)));
  const tlB3 = [[120, 45], [150, 65], [180, 95], [120, 75], [240, 130], [150, 85], [180, 115], [120, 25], [240, 165], [150, 35], [180, 65], [120, 95], [240, 185], [150, 115], [180, 145], [120, 55], [200, 125]];
  items.push(...cycle(17, tlB3, TIMER_LEFT_SKELETONS, 1, leftEmit(B3)));

  /* ---------------- calendar stories ---------------- */

  const TRIP_SKELETONS = [
    (nm, k) => `${nm}'s camping trip is ${k} days away. How many days will have passed after one week? Wait — simpler: in ${k} days the trip starts. After ${k} days pass, how many days remain?`,
  ];
  // (Replaced below by clean skeletons — kept out of the item set.)

  const DUE_SKELETONS = [
    (nm, d, k) => `${nm} borrows a library book on ${d}. It is due ${k} days later. On which day is it due?`,
    (nm, d, k) => `A book checked out on ${d} must come back after ${k} days. Which weekday is that? ${nm} checks.`,
  ];
  const dueEmit = (band) => ([d, k], sk, nm, i) => {
    const idx = WEEKDAYS.indexOf(d);
    const good = WEEKDAYS[(idx + k) % 7];
    const wrong = [...new Set([WEEKDAYS[(idx + k + 1) % 7], WEEKDAYS[(idx + k + 6) % 7], WEEKDAYS[(idx + 7 - k) % 7]])].filter((x) => x !== good);
    return mk("calendar", `storyDueDay_${band}`, band, {
      answer: good,
      choices: shuffled([good, ...wrong.slice(0, 3)], i + 11),
      display: { time: { kind: "weekdayHop", from: d, k }, promptText: sk(nm, d, k) },
    });
  };
  const duB1 = [["Monday", 3], ["Tuesday", 2], ["Wednesday", 4], ["Thursday", 3], ["Friday", 2], ["Saturday", 4], ["Sunday", 3], ["Monday", 5], ["Tuesday", 6], ["Wednesday", 2], ["Thursday", 5], ["Friday", 6], ["Saturday", 2], ["Sunday", 5], ["Monday", 2], ["Tuesday", 4], ["Friday", 3]];
  items.push(...cycle(17, duB1, DUE_SKELETONS, 0, dueEmit(B1)));

  const COUNTDOWN_SKELETONS = [
    (nm, total, passed) => `${nm}'s class trip is ${total} days away. ${passed} days already passed. How many days are left to wait?`,
    (nm, total, passed) => `The bake sale comes in ${total} days. After ${passed} days go by, how many days does ${nm} still wait?`,
  ];
  const countdownEmit = (band) => ([total, passed], sk, nm) =>
    mk("calendar", `storyCountdown_${band}`, band, {
      answer: total - passed,
      answerType: "numberPad",
      display: { counting: { kind: "gap", have: passed, target: total }, promptText: sk(nm, total, passed) },
    });
  const cdB1 = [[10, 3], [14, 6], [9, 4], [12, 5], [8, 2], [15, 7], [11, 3], [13, 8], [7, 3], [16, 9], [10, 6], [14, 5], [9, 2], [18, 11], [12, 7], [17, 8], [20, 13]];
  items.push(...cycle(17, cdB1, COUNTDOWN_SKELETONS, 1, countdownEmit(B1)));
  const cdB2 = [[30, 12], [28, 15], [45, 23], [31, 14], [60, 27], [42, 19], [35, 16], [50, 28], [29, 13], [56, 31], [38, 17], [63, 34], [33, 15], [49, 26], [40, 18], [58, 32], [36, 21]];
  items.push(...cycle(17, cdB2, COUNTDOWN_SKELETONS, 0, countdownEmit(B2)));

  const WEEKS_SKELETONS = [
    (nm, w, d) => `Soccer season lasts ${w} weeks and ${d} more days. How many days is that for ${nm}?`,
    (nm, w, d) => `${nm}'s reading challenge runs ${w} weeks plus ${d} days. What is the total number of days?`,
  ];
  const weeksEmit = (band) => ([w, d], sk, nm) =>
    mk("calendar", `storyWeeksDays_${band}`, band, {
      answer: w * 7 + d,
      answerType: "numberPad",
      display: { counting: { kind: "sum", parts: [w * 7, d] }, promptText: sk(nm, w, d) },
    });
  const wkB2 = [[3, 2], [4, 3], [5, 1], [3, 5], [6, 2], [4, 6], [5, 4], [7, 1], [3, 4], [6, 5], [4, 1], [8, 2], [5, 6], [7, 3], [3, 6], [6, 1], [4, 4]];
  items.push(...cycle(17, wkB2, WEEKS_SKELETONS, 1, weeksEmit(B2)));

  const DATE_SKELETONS = [
    (nm, m, a, b) => `${nm} plants seeds on ${m} ${a} and the sprouts appear on ${m} ${b}. How many days did they take?`,
    (nm, m, a, b) => `From ${m} ${a}, when the cast went on, to ${m} ${b}, when it came off — how many days did ${nm} wear it?`,
  ];
  const dateEmit = ([m, a, b], sk, nm) =>
    mk("calendar", "storyDateSpan", B3, {
      answer: b - a,
      answerType: "numberPad",
      display: { counting: { kind: "gap", have: a, target: b }, promptText: sk(nm, m, a, b) },
    });
  const dtB3 = [["March", 4, 18], ["June", 6, 27], ["October", 9, 30], ["April", 3, 24], ["August", 7, 28], ["January", 5, 26], ["May", 10, 31], ["September", 4, 22], ["November", 8, 29], ["July", 2, 23], ["February", 6, 25], ["December", 11, 30], ["March", 13, 29], ["June", 12, 28], ["October", 3, 20], ["April", 10, 28], ["August", 14, 30]];
  items.push(...cycle(17, dtB3, DATE_SKELETONS, 0, dateEmit));

  const EVERY_WEEK_SKELETONS = [
    (nm, d, w) => `${nm}'s music lesson lands every ${d}. After ${w} more weeks, on which day is the lesson?`,
    (nm, d, w) => `Game night is always on a ${d}. In ${w} weeks, which day of the week is game night for ${nm}?`,
  ];
  const everyWeekEmit = ([d, w], sk, nm, i) =>
    mk("calendar", "storySameWeekday", B3, {
      answer: d,
      choices: shuffled([d, WEEKDAYS[(WEEKDAYS.indexOf(d) + 1) % 7], WEEKDAYS[(WEEKDAYS.indexOf(d) + 6) % 7], WEEKDAYS[(WEEKDAYS.indexOf(d) + 3) % 7]], i + 13),
      display: { time: { kind: "weekdayHop", from: d, k: w * 7 }, promptText: sk(nm, d, w) },
    });
  const ewB3 = [["Monday", 2], ["Tuesday", 3], ["Wednesday", 4], ["Thursday", 2], ["Friday", 5], ["Saturday", 3], ["Sunday", 4], ["Monday", 6], ["Tuesday", 2], ["Wednesday", 5], ["Thursday", 3], ["Friday", 2], ["Saturday", 6], ["Sunday", 2], ["Monday", 3], ["Tuesday", 4], ["Wednesday", 2]];
  items.push(...cycle(17, ewB3, EVERY_WEEK_SKELETONS, 1, everyWeekEmit));

  /* ---------------- top-ups to the 50-per-cell floor ---------------- */

  // readClock app: two more patterns per band.
  const WAKE_SKELETONS = [
    (nm, hw, half) => `${nm} wakes when the clock says ${half ? `half past ${hw}` : `${hw} o'clock`}. Later ${nm} draws that clock. Where does the minute hand point?`,
    (nm, hw, half) => `The alarm rings at ${half ? `half past ${hw}` : `${hw} o'clock`}. ${nm} pictures the clock face. Which way does the minute hand point?`,
  ];
  const wakeEmit = ([h, half], sk, nm, i) =>
    mk("readClock", "storyMinuteHand", B1, {
      answer: half ? "straight down at the six" : "straight up at the twelve",
      choices: shuffled(["straight up at the twelve", "straight down at the six"], i + 3),
      display: { time: { kind: "minuteHandDir", minute: half ? 30 : 0 }, promptText: sk(nm, HOUR_WORDS[h], half) },
    });
  const wkB1r = [[3, false], [7, true], [5, false], [9, true], [2, false], [11, true], [4, false], [8, true], [6, false], [1, true], [10, false], [12, true], [3, true], [7, false], [5, true], [9, false], [2, true]];
  items.push(...cycle(17, wkB1r, WAKE_SKELETONS, 1, wakeEmit));
  const STORYTIME_SKELETONS = [
    (nm, hw, half) => `Storytime begins at ${half ? `half past ${hw}` : `${hw} o'clock`}. ${nm} tells a friend the time in another way. Which reading matches?`,
    (nm, hw, half) => `${nm}'s chore chart says ${half ? `half past ${hw}` : `${hw} o'clock`}. Which clock reading is the same time?`,
  ];
  const storytimeEmit = ([h, half], sk, nm, i) => {
    const good = half ? `half past ${HOUR_WORDS[h]}` : `${HOUR_WORDS[h]} o'clock`;
    const wrong = [half ? `${HOUR_WORDS[h]} o'clock` : `half past ${HOUR_WORDS[h]}`, `half past ${HOUR_WORDS[(h % 12) + 1]}`, `${HOUR_WORDS[(h % 12) + 1]} o'clock`];
    return mk("readClock", "storySameTime", B1, {
      answer: good,
      choices: shuffled([good, ...wrong], i + 5),
      display: { time: { kind: "handsWords", hour: h, minute: half ? 30 : 0 }, promptText: sk(nm, HOUR_WORDS[h], half) },
    });
  };
  const stB1 = [[4, false], [8, true], [6, false], [10, true], [1, false], [12, true], [3, false], [5, true], [7, false], [9, true], [11, false], [2, true], [4, true], [6, true], [8, false], [10, false], [12, false]];
  items.push(...cycle(17, stB1, STORYTIME_SKELETONS, 0, storytimeEmit));

  const TV_SKELETONS = [
    (nm, t) => `The show guide lists ${nm}'s cartoon at ${t}. Which words say that time?`,
    (nm, t) => `${nm} circles ${t} on the show guide. How is that time said in words?`,
  ];
  const tvEmit = ([h, m, good], sk, nm, i) => {
    const wrong = [`half past ${HOUR_WORDS[h]}`, `quarter past ${HOUR_WORDS[h]}`, `${HOUR_WORDS[h]} o'clock`].filter((x) => x !== good);
    return mk("readClock", "storyGuideWords", B2, {
      answer: good,
      choices: shuffled([good, ...wrong.slice(0, 3)], i + 7),
      display: { time: { kind: "digitalWords", hour: h, minute: m, words: good }, promptText: sk(nm, fmt(h, m)) },
    });
  };
  const tvB2 = [[4, 15, "quarter past four"], [9, 30, "half past nine"], [2, 45, "quarter to three"], [7, 10, "ten past seven"], [11, 20, "twenty past eleven"], [5, 40, "twenty to six"], [1, 15, "quarter past one"], [8, 30, "half past eight"], [3, 45, "quarter to four"], [6, 5, "five past six"], [10, 45, "quarter to eleven"], [12, 30, "half past twelve"], [4, 55, "five to five"], [9, 15, "quarter past nine"], [2, 20, "twenty past two"], [7, 50, "ten to eight"], [11, 35, "twenty-five to twelve"]];
  items.push(...cycle(17, tvB2, TV_SKELETONS, 0, tvEmit));
  const SETCLOCK_SKELETONS = [
    (nm, w) => `${nm} must set a digital timer to "${w}". Which digits does ${nm} type?`,
    (nm, w) => `The recipe says start at "${w}". Which digital time does ${nm} punch in?`,
  ];
  const setClockEmit = ([w, h, m], sk, nm, i) => {
    const good = fmt(h, m);
    const wrong = [...new Set([fmt(h, (m + 30) % 60), fmt((h % 12) + 1, m), fmt(h, (m + 15) % 60)])].filter((x) => x !== good);
    return mk("readClock", "storySetClock", B2, {
      answer: good,
      choices: shuffled([good, ...wrong.slice(0, 3)], i + 9),
      display: { time: { kind: "wordsDigital", hour: h, minute: m }, promptText: sk(nm, w) },
    });
  };
  const scB2 = [["quarter past six", 6, 15], ["half past one", 1, 30], ["quarter to eight", 7, 45], ["ten past nine", 9, 10], ["twenty to three", 2, 40], ["five past ten", 10, 5], ["quarter past eleven", 11, 15], ["half past seven", 7, 30], ["quarter to two", 1, 45], ["ten to five", 4, 50], ["twenty past twelve", 12, 20], ["five to nine", 8, 55], ["quarter past five", 5, 15], ["half past three", 3, 30], ["quarter to seven", 6, 45], ["ten past two", 2, 10], ["twenty to ten", 9, 40]];
  items.push(...cycle(17, scB2, SETCLOCK_SKELETONS, 1, setClockEmit));

  const TICKET_SKELETONS = [
    (nm, h, m) => `${nm}'s ticket reads ${fmt(h, m)}. How many minutes past ${h} o'clock is that?`,
    (nm, h, m) => `The stamp on ${nm}'s ticket says ${fmt(h, m)}. How many minutes past ${h} is that?`,
  ];
  const ticketEmit = ([h, m], sk, nm) =>
    mk("readClock", "storyTicketMinutes", B3, {
      answer: m,
      answerType: "numberPad",
      display: { time: { kind: "faceRead", minute: m }, promptText: sk(nm, h, m) },
    });
  const tkB3 = [[3, 7], [8, 23], [2, 48], [6, 11], [11, 37], [5, 52], [9, 16], [1, 41], [7, 28], [12, 57], [4, 13], [10, 34], [3, 49], [8, 2], [2, 26], [6, 44], [11, 58]];
  items.push(...cycle(17, tkB3, TICKET_SKELETONS, 0, ticketEmit));
  const LEFT_HOUR_SKELETONS = [
    (nm, h, m) => `${nm} checks the pool clock: ${fmt(h, m)}. Swim time ends at the next o'clock. How many minutes are left?`,
    (nm, h, m) => `At ${fmt(h, m)}, ${nm} knows the game stops on the next full hour. How many minutes remain?`,
  ];
  const leftHourEmit = ([h, m], sk, nm) =>
    mk("readClock", "storyMinutesLeft", B3, {
      answer: 60 - m,
      answerType: "numberPad",
      display: { counting: { kind: "gap", have: m, target: 60 }, promptText: sk(nm, h, m) },
    });
  const lhB3 = [[3, 47], [8, 23], [2, 51], [6, 12], [11, 38], [5, 55], [9, 17], [1, 42], [7, 29], [12, 56], [4, 8], [10, 24], [3, 36], [8, 14], [2, 41], [6, 53], [11, 3]];
  items.push(...cycle(17, lhB3, LEFT_HOUR_SKELETONS, 1, leftHourEmit));

  // elapsedTime app top-ups.
  const NAP_SKELETONS = [
    (nm, s, e) => `${nm}'s puppy naps from ${HOUR_WORDS[s]} o'clock to ${HOUR_WORDS[e]} o'clock. How many hours does the puppy sleep?`,
    (nm, s, e) => `The bakery oven runs from ${HOUR_WORDS[s]} o'clock until ${HOUR_WORDS[e]} o'clock while ${nm} watches. How many hours is that?`,
  ];
  const napEmit = ([s, e], sk, nm) =>
    mk("elapsedTime", "storyNapHours", B1, {
      answer: e - s,
      answerType: "numberPad",
      display: { counting: { kind: "gap", have: s, target: e }, promptText: sk(nm, s, e) },
    });
  const npB1 = [[1, 2], [9, 12], [2, 3], [4, 10], [7, 11], [1, 6], [5, 9], [3, 10], [6, 11], [2, 7], [4, 8], [1, 5], [8, 11], [3, 6], [5, 10], [2, 4], [6, 12]];
  items.push(...cycle(17, npB1, NAP_SKELETONS, 0, napEmit));
  const PRACTICE_SKELETONS = [
    (nm, s, e) => `Piano practice for ${nm} runs ${s} to ${e}. How many minutes of practice is that?`,
    (nm, s, e) => `${nm} shoots hoops from ${s} until ${e}. How many minutes does ${nm} play?`,
  ];
  const practiceEmit = (band) => ([h1, m1, h2, m2], sk, nm) =>
    mk("elapsedTime", `storyPractice_${band}`, band, {
      answer: h2 * 60 + m2 - (h1 * 60 + m1),
      answerType: "numberPad",
      display: { counting: { kind: "gap", have: h1 * 60 + m1, target: h2 * 60 + m2 }, promptText: sk(nm, fmt(h1, m1), fmt(h2, m2)) },
    });
  const prB2 = [[4, 5, 4, 40], [9, 10, 9, 55], [1, 25, 1, 50], [5, 15, 5, 30], [10, 20, 10, 45], [12, 5, 12, 35], [2, 25, 2, 40], [7, 30, 7, 55], [3, 5, 3, 50], [8, 10, 8, 35], [11, 15, 11, 55], [6, 25, 6, 45], [4, 20, 4, 35], [9, 25, 9, 45], [1, 5, 1, 30], [5, 35, 5, 55], [10, 10, 10, 30]];
  items.push(...cycle(17, prB2, PRACTICE_SKELETONS, 1, practiceEmit(B2)));
  const GAME_SKELETONS = [
    (nm, s, e) => `The board game starts at ${s} and the last move lands at ${e}. How many minutes did ${nm} play?`,
    (nm, s, e) => `${nm}'s hike begins at ${s} and ends at ${e}. How many minutes long is the hike?`,
  ];
  const gmB2 = [[3, 50, 4, 20], [8, 45, 9, 15], [2, 55, 3, 30], [6, 35, 7, 10], [11, 40, 12, 25], [5, 55, 6, 35], [9, 35, 10, 5], [1, 45, 2, 25], [7, 50, 8, 40], [4, 40, 5, 15], [10, 45, 11, 30], [12, 35, 1, 20], [3, 45, 4, 35], [8, 55, 9, 25], [2, 50, 3, 45], [6, 45, 7, 15], [11, 50, 12, 45]];
  const gameEmit = ([h1, m1, h2, m2], sk, nm) => {
    const e = (h2 < h1 ? h2 + 12 : h2) * 60 + m2;
    return mk("elapsedTime", "storyGameAcross", B2, {
      answer: e - (h1 * 60 + m1),
      answerType: "numberPad",
      display: { counting: { kind: "gap", have: h1 * 60 + m1, target: e }, promptText: GAME_SKELETONS[0](nm, fmt(h1, m1), fmt(h2, m2)) },
    });
  };
  items.push(...cycle(17, gmB2, [GAME_SKELETONS[1]], 0, ([h1, m1, h2, m2], sk, nm) => {
    const e = (h2 < h1 ? h2 + 12 : h2) * 60 + m2;
    return mk("elapsedTime", "storyGameAcross", B2, {
      answer: e - (h1 * 60 + m1),
      answerType: "numberPad",
      display: { counting: { kind: "gap", have: h1 * 60 + m1, target: e }, promptText: sk(nm, fmt(h1, m1), fmt(h2, m2)) },
    });
  }));
  const LEAVE_SKELETONS = [
    (nm, e, d) => `The movie ends at ${e} after running ${d} minutes. Which time did it start? ${nm} works backward.`,
    (nm, e, d) => `${nm}'s train pulls in at ${e} after a ${d}-minute ride. Pick the departure time.`,
  ];
  const leaveEmit = ([h, m, d], sk, nm, i) => {
    const total = h * 60 + m - d;
    const sh = ((Math.floor(total / 60) - 1 + 12) % 12) + 1;
    const sm = ((total % 60) + 60) % 60;
    const good = fmt(sh, sm);
    const wrong = [...new Set([fmt(sh, (sm + 5) % 60), fmt((sh % 12) + 1, sm), fmt(sh, (sm + 50) % 60)])].filter((x) => x !== good);
    return mk("elapsedTime", "storyStartBack", B3, {
      answer: good,
      choices: shuffled([good, ...wrong.slice(0, 3)], i + 15),
      display: { time: { kind: "startTime", endH: h, endM: m, dur: d }, promptText: sk(nm, fmt(h, m), d) },
    });
  };
  const lvB3 = [[3, 25, 40], [6, 20, 35], [9, 10, 45], [12, 30, 55], [4, 15, 30], [7, 5, 40], [10, 25, 50], [2, 40, 55], [5, 35, 45], [8, 30, 25], [11, 20, 40], [3, 15, 55], [6, 40, 50], [9, 45, 30], [12, 10, 45], [4, 30, 40], [7, 35, 25]];
  items.push(...cycle(17, lvB3, LEAVE_SKELETONS, 1, leaveEmit));

  // timeConcepts app top-ups: unit conversions in context.
  const CHORE_SKELETONS = [
    (nm, n) => `${nm} promises ${n} half hours of reading this week. How many minutes of reading is that?`,
    (nm, n) => `The chore chart gives ${nm} ${n} half-hour blocks. How many minutes do the blocks add up to?`,
  ];
  const choreEmit = ([n], sk, nm) =>
    mk("timeConcepts", "storyHalfHours", B1, {
      answer: n * 30,
      answerType: "numberPad",
      display: { time: { kind: "halfHours", n }, promptText: sk(nm, n) },
    });
  const chB1 = [[2], [3], [4], [5], [6], [7], [8], [9], [10], [11], [12], [13], [14], [15], [16], [17], [18]];
  items.push(...cycle(17, chB1, CHORE_SKELETONS, 0, choreEmit));
  const TRAIN_SKELETONS = [
    (nm, h, m) => `${nm}'s bus pass lasts ${h} ${h === 1 ? "hour" : "hours"} and ${m} minutes today. How many total minutes can ${nm} ride?`,
    (nm, h, m) => `The museum lets ${nm} stay ${h} ${h === 1 ? "hour" : "hours"} ${m} minutes. How many minutes of visiting is that?`,
  ];
  const trainEmit = ([h, m], sk, nm) =>
    mk("timeConcepts", "storyPassMinutes", B2, {
      answer: h * 60 + m,
      answerType: "numberPad",
      display: { counting: { kind: "sum", parts: [h * 60, m] }, promptText: sk(nm, h, m) },
    });
  const trB2 = [[1, 10], [2, 15], [1, 35], [3, 25], [2, 50], [1, 20], [4, 5], [3, 45], [2, 40], [1, 55], [4, 25], [3, 10], [2, 25? 0 : 25], [1, 45], [4, 40], [3, 30], [2, 35]];
  items.push(...cycle(17, trB2.map(([a, b]) => [a, b]), TRAIN_SKELETONS, 1, trainEmit));
  const CAMP_SKELETONS = [
    (nm, d, h) => `Camp lasts ${d} days and ${h} extra hours for the sleepover. How many hours is that in all for ${nm}?`,
    (nm, d, h) => `${nm}'s science timer must run ${d} days plus ${h} hours. How many total hours will it run?`,
  ];
  const campEmit = ([d, h], sk, nm) =>
    mk("timeConcepts", "storyDaysHours", B3, {
      answer: d * 24 + h,
      answerType: "numberPad",
      display: { counting: { kind: "sum", parts: [d * 24, h] }, promptText: sk(nm, d, h) },
    });
  const cpB3 = [[2, 6], [3, 12], [1, 18], [4, 3], [2, 15], [5, 9], [1, 7], [3, 21], [2, 20], [4, 16], [1, 11], [6, 2], [3, 5], [5, 14], [2, 9], [4, 22], [7, 10]];
  items.push(...cycle(17, cpB3, CAMP_SKELETONS, 0, campEmit));

  // calendar app top-ups.
  const PLANT_SKELETONS = [
    (nm, w) => `${nm} waters a cactus once a week for ${w} weeks. How many days pass from the first watering to the last?`,
    (nm, w) => `For ${w} weeks ${nm} feeds the class fish every single day. How many days of feeding is that?`,
  ];
  const plantEmit = ([w], sk, nm, i) => {
    const feeding = i % 2 === 1;
    return mk("calendar", "storyWeeksSpan", B1, {
      answer: feeding ? w * 7 : (w - 1) * 7,
      answerType: "numberPad",
      display: { time: { kind: "weeksDays", w, feeding }, promptText: sk(nm, w) },
    });
  };
  // Keep it simple and verifiable: use only the "feeds every day" skeleton.
  items.push(...cycle(17, [[1], [2], [3], [4], [5], [6], [7], [8], [9], [10], [11], [12], [13], [14], [15], [16], [17]].slice(0, 17).map(([w]) => [w]), [PLANT_SKELETONS[1]], 0, ([w], sk, nm) =>
    mk("calendar", "storyWeeksFeed", B1, {
      answer: w * 7,
      answerType: "numberPad",
      display: { counting: { kind: "sum", parts: Array.from({ length: w }, () => 7) }, promptText: sk(nm, w) },
    })
  ));
  const CLUB_SKELETONS = [
    (nm, d, k) => `Craft club met on ${d}. The next meeting is ${k} days later. Which day is that meeting?`,
    (nm, d, k) => `${nm} returns skates ${k} days after renting them on ${d}. On which day are they returned?`,
  ];
  const clubEmit = (band) => ([d, k], sk, nm, i) => {
    const idx = WEEKDAYS.indexOf(d);
    const good = WEEKDAYS[(idx + k) % 7];
    const wrong = [...new Set([WEEKDAYS[(idx + k + 1) % 7], WEEKDAYS[(idx + k + 6) % 7], WEEKDAYS[(idx + 7 - (k % 7)) % 7]])].filter((x) => x !== good);
    return mk("calendar", `storyClubDay_${band}`, band, {
      answer: good,
      choices: shuffled([good, ...wrong.slice(0, 3)], i + 17),
      display: { time: { kind: "weekdayHop", from: d, k }, promptText: sk(nm, d, k) },
    });
  };
  const clB2 = [["Monday", 9], ["Tuesday", 8], ["Wednesday", 10], ["Thursday", 9], ["Friday", 8], ["Saturday", 12], ["Sunday", 9], ["Monday", 11], ["Tuesday", 10], ["Wednesday", 8], ["Thursday", 12], ["Friday", 10], ["Saturday", 8], ["Sunday", 11], ["Monday", 8], ["Tuesday", 12], ["Friday", 9]];
  items.push(...cycle(17, clB2, CLUB_SKELETONS, 0, clubEmit(B2)));
  const HOLIDAY_SKELETONS = [
    (nm, m, a, k) => `${nm}'s recital is ${k} days after ${m} ${a}. On which date of ${m} is the recital?`,
    (nm, m, a, k) => `The fair opens on ${m} ${a} and ${nm} goes ${k} days later. Which date is that?`,
  ];
  const holidayEmit = ([m, a, k], sk, nm) =>
    mk("calendar", "storyLaterDate", B3, {
      answer: a + k,
      answerType: "numberPad",
      display: { counting: { kind: "countOn", start: a, more: k }, promptText: sk(nm, m, a, k) },
    });
  const hoB3 = [["March", 5, 9], ["June", 7, 12], ["October", 4, 14], ["April", 6, 17], ["August", 8, 11], ["January", 9, 16], ["May", 3, 13], ["September", 5, 18], ["November", 6, 15], ["July", 4, 19], ["February", 7, 12], ["December", 8, 14], ["March", 11, 12], ["June", 10, 13], ["October", 5, 16], ["April", 8, 13], ["August", 12, 17]];
  items.push(...cycle(17, hoB3, HOLIDAY_SKELETONS, 1, holidayEmit));

  return items;
}
