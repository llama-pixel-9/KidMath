import { getModeConfig, MODE_IDS } from "../modes";
import { gradeSpanFor } from "../engagement/gradeSpans.js";
import { subskillLabel } from "./subskillLabels.js";
import { GRADE_LABELS, TOPIC_LABELS } from "../skills/catalog.js";
import { STATES, deriveMastery, progressToward, stateOf, summarize } from "../skills/mastery.js";
import { GRADE_UP } from "../skills/topicState.js";
import { gradeForModeLevel, nextTopicGrade, playSkills, skillsForPlay, topicGrades } from "../skills/play.js";

/**
 * Pure: practice-session records → the parent report. No I/O, no dates read
 * from the clock (callers pass `now`) so it is testable and, later, runnable
 * server-side for the emailed edition.
 */

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const WEEKDAY_NAMES = ["Sundays", "Mondays", "Tuesdays", "Wednesdays", "Thursdays", "Fridays", "Saturdays"];
/** Below this many first-try attempts a subskill is "not enough data". */
const MIN_ATTEMPTS = 4;
const SLOW_MS = 20000;

function localDayKey(ts) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function startOfLocalDay(ts) {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function pct(num, den) {
  return den > 0 ? Math.round((100 * num) / den) : null;
}

function minutes(ms) {
  return Math.round(ms / 60000);
}

function modeLabel(modeId) {
  try {
    return getModeConfig(modeId).shortLabel;
  } catch {
    return modeId;
  }
}

function firstTryAttempts(session) {
  return session.attempts.filter((a) => !a.retry);
}

function activityByWeek(sessions, now, weeks) {
  const end = startOfLocalDay(now) + DAY_MS; // tomorrow 00:00
  const out = [];
  for (let i = weeks - 1; i >= 0; i -= 1) {
    const to = end - i * 7 * DAY_MS;
    const from = to - 7 * DAY_MS;
    const inWeek = sessions.filter((s) => s.startedAt >= from && s.startedAt < to);
    const q = inWeek.reduce((n, s) => n + s.questions, 0);
    const c = inWeek.reduce((n, s) => n + s.firstTryCorrect, 0);
    out.push({
      from,
      to,
      label: new Date(from).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      sessions: inWeek.length,
      minutes: minutes(inWeek.reduce((n, s) => n + s.durationMs, 0)),
      questions: q,
      accuracy: pct(c, q),
    });
  }
  return out;
}

function activityByDay(sessions, now, days) {
  const end = startOfLocalDay(now) + DAY_MS;
  const out = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const to = end - i * DAY_MS;
    const from = to - DAY_MS;
    const inDay = sessions.filter((s) => s.startedAt >= from && s.startedAt < to);
    out.push({
      from,
      label: new Date(from).toLocaleDateString(undefined, { weekday: "short" }),
      sessions: inDay.length,
      minutes: minutes(inDay.reduce((n, s) => n + s.durationMs, 0)),
    });
  }
  return out;
}

function whenTheyPractice(sessions) {
  const byWeekday = WEEKDAYS.map((label) => ({ label, minutes: 0, sessions: 0 }));
  const slots = [
    { label: "Morning", from: 5, to: 12, minutes: 0, sessions: 0 },
    { label: "Afternoon", from: 12, to: 17, minutes: 0, sessions: 0 },
    { label: "Evening", from: 17, to: 21, minutes: 0, sessions: 0 },
    { label: "Night", from: 21, to: 29, minutes: 0, sessions: 0 },
  ];
  for (const s of sessions) {
    const d = new Date(s.startedAt);
    const wd = byWeekday[d.getDay()];
    wd.minutes += s.durationMs / 60000;
    wd.sessions += 1;
    const h = d.getHours();
    const slot = slots.find((x) => (h >= x.from && h < x.to) || (x.to > 24 && h < x.to - 24 && x.from > h));
    if (slot) {
      slot.minutes += s.durationMs / 60000;
      slot.sessions += 1;
    }
  }
  const round = (x) => ({ ...x, minutes: Math.round(x.minutes) });
  const busiestDay = byWeekday.reduce((a, b) => (b.minutes > a.minutes ? b : a), byWeekday[0]);
  const busiestSlot = slots.reduce((a, b) => (b.minutes > a.minutes ? b : a), slots[0]);
  return {
    byWeekday: byWeekday.map(round),
    byTimeOfDay: slots.map((x) => round({ label: x.label, minutes: x.minutes, sessions: x.sessions })),
    busiestDay: busiestDay.sessions > 0 ? WEEKDAY_NAMES[WEEKDAYS.indexOf(busiestDay.label)] : null,
    busiestSlot: busiestSlot.sessions > 0 ? busiestSlot.label.toLowerCase() : null,
  };
}

function subskillStats(attempts) {
  const map = new Map();
  for (const a of attempts) {
    const entry = map.get(a.subskill) || { id: a.subskill, label: subskillLabel(a.subskill), attempts: 0, correct: 0, totalMs: 0 };
    entry.attempts += 1;
    if (a.correct) entry.correct += 1;
    entry.totalMs += a.ms || 0;
    map.set(a.subskill, entry);
  }
  return [...map.values()]
    .map((e) => ({ ...e, accuracy: pct(e.correct, e.attempts), avgMs: Math.round(e.totalMs / e.attempts) }))
    .sort((a, b) => b.attempts - a.attempts);
}

/**
 * Where a kid stands in a topic, in the words a parent uses: "Grade 3
 * Subtraction · 2 of 4 skills mastered". The grade is the one the kid is
 * working in (saved with their progress once play is skill-based; until then
 * read off their level), and the skills are the catalog's — the same list the
 * worksheets print from, so a parent can print what their kid is stuck on.
 */
export function skillStanding(modeId, levelNow, progress, mastery, masteryBefore = mastery) {
  const grade = progress?.grade || gradeForModeLevel(modeId, levelNow);
  const skills = grade ? skillsForPlay(grade, modeId) : [];
  if (!skills.length) return null;
  const counts = summarize(mastery, skills);
  const list = skills.map((skill) => {
    const entry = mastery[skill.id];
    return {
      id: skill.id,
      title: skill.title,
      state: stateOf(mastery, skill.id),
      progress: progressToward(mastery, skill.id),
      attempts: entry?.attempts ?? 0,
      accuracy: entry ? pct(entry.correct, entry.attempts) : null,
      needsReview: Boolean(entry?.needsReview),
    };
  });
  const shaky = list
    .filter((s) => s.attempts >= MIN_ATTEMPTS && s.accuracy != null && (s.state === STATES.PRACTICING || s.needsReview))
    .sort((a, b) => a.accuracy - b.accuracy)[0];
  const newly = playSkills()
    .filter((skill) => skill.mode === modeId)
    .filter((skill) => stateOf(mastery, skill.id) === STATES.MASTERED && stateOf(masteryBefore, skill.id) !== STATES.MASTERED)
    .map((skill) => ({ id: skill.id, title: skill.title, grade: skill.grade }));
  return {
    grade,
    gradeLabel: GRADE_LABELS[grade],
    topicLabel: TOPIC_LABELS[modeId],
    // The grades the topic really has skills in — the old per-mode span said
    // "K–2" for a Subtraction that runs to grade 4.
    topicGrades: topicGrades(modeId),
    total: counts.total,
    mastered: counts.mastered,
    practicing: counts.practicing,
    complete: counts.complete,
    nextGrade: nextTopicGrade(modeId, grade),
    list,
    weakest: shaky || null,
    newlyMastered: newly,
  };
}

function modeSummaries(sessions, progressByMode, mastery = {}, masteryBefore = {}) {
  const byMode = new Map();
  for (const s of sessions) {
    const list = byMode.get(s.mode) || [];
    list.push(s);
    byMode.set(s.mode, list);
  }
  const ids = [...new Set([...byMode.keys()])].filter((id) => MODE_IDS.includes(id));
  return ids
    .map((id) => {
      const list = byMode.get(id).slice().sort((a, b) => a.startedAt - b.startedAt);
      const attempts = list.flatMap(firstTryAttempts);
      const q = list.reduce((n, s) => n + s.questions, 0);
      const c = list.reduce((n, s) => n + s.firstTryCorrect, 0);
      const ms = list.reduce((n, s) => n + s.durationMs, 0);
      const levelNow = progressByMode?.[id]?.level ?? list[list.length - 1].levelEnd;
      const levelStart = list[0].levelStart;
      const subs = subskillStats(attempts);
      const levelUps = list.filter((s) => s.levelEnd > s.levelStart).length;
      return {
        id,
        label: modeLabel(id),
        gradeSpan: gradeSpanFor(id),
        skills: skillStanding(id, levelNow, progressByMode?.[id], mastery, masteryBefore),
        sessions: list.length,
        minutes: minutes(ms),
        questions: q,
        correct: c,
        accuracy: pct(c, q),
        avgResponseMs: attempts.length ? Math.round(attempts.reduce((n, a) => n + (a.ms || 0), 0) / attempts.length) : null,
        levelStart,
        levelNow,
        levelDelta: levelNow - levelStart,
        levelUps,
        retriesMastered: list.reduce((n, s) => n + s.retriesMastered, 0),
        stars: list.reduce((n, s) => n + s.starsEarned, 0),
        lastPlayedAt: list[list.length - 1].startedAt,
        subskills: subs,
        strongest: subs.filter((x) => x.attempts >= MIN_ATTEMPTS).sort((a, b) => b.accuracy - a.accuracy)[0] || null,
        weakest: subs.filter((x) => x.attempts >= MIN_ATTEMPTS).sort((a, b) => a.accuracy - b.accuracy)[0] || null,
      };
    })
    .sort((a, b) => b.minutes - a.minutes || b.sessions - a.sessions);
}

/**
 * Missed questions, grouped by prompt so a repeatedly-missed item floats up.
 * Only first-try misses: a retry miss is the same confusion counted twice.
 */
function struggles(sessions, limit = 12) {
  const map = new Map();
  for (const s of sessions) {
    for (const a of s.attempts) {
      if (a.correct || a.retry || !a.prompt) continue;
      const key = `${s.mode}|${a.prompt}`;
      const e = map.get(key) || {
        mode: s.mode,
        modeLabel: modeLabel(s.mode),
        prompt: a.prompt,
        answer: a.answer,
        given: [],
        subskill: a.subskill,
        subskillLabel: subskillLabel(a.subskill),
        level: a.level,
        misses: 0,
        lastAt: 0,
        masteredLater: false,
      };
      e.misses += 1;
      if (a.given && !e.given.includes(a.given)) e.given.push(a.given);
      e.lastAt = Math.max(e.lastAt, a.t || s.startedAt);
      map.set(key, e);
    }
  }
  // Did a later retry of the same prompt land? That's a "figured it out".
  for (const s of sessions) {
    for (const a of s.attempts) {
      if (!a.retry || !a.correct) continue;
      const e = map.get(`${s.mode}|${a.prompt}`);
      if (e && (a.t || s.startedAt) >= e.lastAt) e.masteredLater = true;
    }
  }
  return [...map.values()].sort((a, b) => b.misses - a.misses || b.lastAt - a.lastAt).slice(0, limit);
}

function slowButRight(sessions, limit = 5) {
  return sessions
    .flatMap((s) => firstTryAttempts(s).filter((a) => a.correct && a.ms >= SLOW_MS).map((a) => ({ ...a, mode: s.mode, modeLabel: modeLabel(s.mode) })))
    .sort((a, b) => b.ms - a.ms)
    .slice(0, limit)
    .map((a) => ({ mode: a.mode, modeLabel: a.modeLabel, prompt: a.prompt, seconds: Math.round(a.ms / 1000), subskillLabel: subskillLabel(a.subskill) }));
}

function streakDays(sessions, now) {
  const days = new Set(sessions.map((s) => localDayKey(s.startedAt)));
  let streak = 0;
  let cursor = startOfLocalDay(now);
  // Today counts if played; otherwise a streak that ended yesterday still shows.
  if (!days.has(localDayKey(cursor))) cursor -= DAY_MS;
  while (days.has(localDayKey(cursor))) {
    streak += 1;
    cursor -= DAY_MS;
  }
  return streak;
}

function recommendations(modes, strugglesList, totals) {
  const out = [];
  const weak = modes
    .map((m) => m.weakest && m.weakest.accuracy != null && m.weakest.accuracy < 70 ? { mode: m, sub: m.weakest } : null)
    .filter(Boolean)
    .sort((a, b) => a.sub.accuracy - b.sub.accuracy)
    .slice(0, 2);
  // Parents get skills, never levels: "Subtract across zeros" is something a
  // grown-up can help with (and print a worksheet for); "Level 8" is not.
  const shakySkills = modes
    .filter((m) => m.skills?.weakest && m.skills.weakest.accuracy < 70)
    .sort((a, b) => a.skills.weakest.accuracy - b.skills.weakest.accuracy)
    .slice(0, 2);
  for (const mode of shakySkills) {
    const skill = mode.skills.weakest;
    out.push({
      kind: "focus",
      skillId: skill.id,
      text: `${mode.skills.topicLabel}: "${skill.title}" is the shaky spot (${skill.accuracy}% right on ${skill.attempts} tries). A few minutes there will help most.`,
    });
  }
  if (!shakySkills.length) {
    for (const { mode, sub } of weak) {
      out.push({
        kind: "focus",
        text: `${mode.label}: ${sub.label} is the shaky spot (${sub.accuracy}% right on ${sub.attempts} tries). A few minutes there will help most.`,
      });
    }
  }
  const newly = modes.flatMap((m) => (m.skills?.newlyMastered || []).map((s) => ({ ...s, topic: m.skills.topicLabel })));
  if (newly.length === 1) {
    out.push({ kind: "celebrate", text: `Mastered "${newly[0].title}" — worth a high-five.` });
  } else if (newly.length > 1) {
    out.push({ kind: "celebrate", text: `Mastered ${newly.length} new skills, "${newly[0].title}" among them — worth a high-five.` });
  }
  const finished = modes.filter((m) => m.skills?.complete);
  for (const mode of finished.slice(0, 2)) {
    const { gradeLabel, topicLabel, nextGrade } = mode.skills;
    out.push({
      kind: "stretch",
      text: nextGrade
        ? `Every ${gradeLabel} ${topicLabel} skill is mastered — ready for ${GRADE_LABELS[nextGrade]} ${topicLabel}.`
        : `Every ${topicLabel} skill is mastered — a new topic will stretch things.`,
    });
  }
  const ready = modes.filter((m) => !m.skills?.complete && m.accuracy != null && m.accuracy >= 90 && m.questions >= 20);
  if (ready.length && !finished.length) {
    out.push({ kind: "stretch", text: `${ready.map((m) => m.label).join(" and ")} ${ready.length > 1 ? "are" : "is"} consistently above 90% — the next skill, or a new topic, will stretch things.` });
  }
  if (totals.sessions > 0 && totals.activeDays < 3 && totals.days >= 14) {
    out.push({ kind: "habit", text: "Short and frequent beats long and rare: three 5-minute sessions a week builds fluency faster than one long one." });
  }
  if (strugglesList.some((s) => s.misses >= 2 && !s.masteredLater)) {
    out.push({ kind: "review", text: "A couple of questions were missed more than once — they're listed below. Talking one through out loud is usually all it takes." });
  }
  return out;
}

/**
 * @param {Array} allSessions  records from sessionLog (any kid filter applied already)
 * @param {object} opts        { now, days (null = all time), progressByMode }
 */
// A ladder Fledging Flight passes by raising the level. A grade-up one (a skill
// session: it carries a grade) never moves the level — it passes on its score.
const flightPassed = (s) => (s.grade ? s.firstTryCorrect >= GRADE_UP.pass : s.levelEnd > s.levelStart);

export function buildReport(allSessions, { now = Date.now(), days = 30, progressByMode = {} } = {}) {
  const ordered = (allSessions || []).filter((s) => s && s.endedAt).slice().sort((a, b) => a.startedAt - b.startedAt);
  const since = days ? startOfLocalDay(now) - (days - 1) * DAY_MS : -Infinity;
  // A "partial" record is a session the kid left before the end card (saved on
  // unmount since PR B): its minutes and questions are real practice, but it
  // never reached the level/perfect-session bookkeeping, so it is excluded from
  // those tallies.
  const practice = ordered.filter((s) => s.startedAt >= since && s.kind !== "fledging");
  const sessions = practice.filter((s) => s.kind !== "partial");
  const partials = practice.filter((s) => s.kind === "partial");
  const challenges = ordered.filter((s) => s.startedAt >= since && s.kind === "fledging");

  const questions = practice.reduce((n, s) => n + s.questions, 0);
  const correct = practice.reduce((n, s) => n + s.firstTryCorrect, 0);
  const totalMs = practice.reduce((n, s) => n + s.durationMs, 0);
  const activeDays = new Set(practice.map((s) => localDayKey(s.startedAt))).size;

  const totals = {
    days,
    sessions: sessions.length,
    partialSessions: partials.length,
    minutes: minutes(totalMs),
    avgSessionMinutes: practice.length ? Math.round((totalMs / practice.length / 60000) * 10) / 10 : 0,
    questions,
    correct,
    accuracy: pct(correct, questions),
    activeDays,
    streakDays: streakDays(ordered, now),
    stars: sessions.reduce((n, s) => n + s.starsEarned, 0),
    retriesMastered: sessions.reduce((n, s) => n + s.retriesMastered, 0),
    perfectSessions: sessions.filter((s) => s.questions > 0 && s.firstTryCorrect === s.questions).length,
    levelUps: sessions.filter((s) => s.levelEnd > s.levelStart).length,
    challengesPassed: challenges.filter(flightPassed).length,
    challengesTaken: challenges.length,
    firstSessionAt: ordered.length ? ordered[0].startedAt : null,
    lastSessionAt: practice.length ? practice[practice.length - 1].startedAt : null,
  };

  // Mastery is a fact about ALL of a kid's practice, not the report window:
  // fold the whole log, and again up to the window's start to see what is new.
  const mastery = deriveMastery(ordered);
  const masteryBefore = Number.isFinite(since) ? deriveMastery(ordered.filter((s) => s.startedAt < since)) : {};
  const modes = modeSummaries(practice, progressByMode, mastery, masteryBefore);
  totals.skillsMastered = modes.reduce((n, m) => n + (m.skills?.newlyMastered.length || 0), 0);
  const strugglesList = struggles(practice);
  const weeks = days ? Math.max(2, Math.min(12, Math.ceil(days / 7))) : 12;

  return {
    generatedAt: now,
    range: { days, since: Number.isFinite(since) ? since : null },
    totals,
    byWeek: activityByWeek(practice, now, weeks),
    byDay: days && days <= 14 ? activityByDay(practice, now, days) : null,
    when: whenTheyPractice(practice),
    modes,
    struggles: strugglesList,
    slowButRight: slowButRight(practice),
    strengths: modes
      .flatMap((m) => m.subskills.filter((s) => s.attempts >= MIN_ATTEMPTS && s.accuracy >= 90).map((s) => ({ ...s, mode: m.id, modeLabel: m.label })))
      .sort((a, b) => b.attempts - a.attempts)
      .slice(0, 6),
    needsWork: modes
      .flatMap((m) => m.subskills.filter((s) => s.attempts >= MIN_ATTEMPTS && s.accuracy < 70).map((s) => ({ ...s, mode: m.id, modeLabel: m.label, level: m.levelNow })))
      .sort((a, b) => a.accuracy - b.accuracy)
      .slice(0, 6),
    recommendations: recommendations(modes, strugglesList, totals),
  };
}

/** One-paragraph summary for the top of the page (and the email subject line later). */
export function headline(report, kidName) {
  const who = kidName || "Your kid";
  const t = report.totals;
  if (t.sessions === 0) return `${who} hasn't practiced in this period yet.`;
  const span = t.days ? `the last ${t.days} days` : "all time";
  const acc = t.accuracy != null ? `${t.accuracy}% right on the first try` : "";
  const parts = [`${who} practiced ${t.minutes} minute${t.minutes === 1 ? "" : "s"} over ${t.sessions} session${t.sessions === 1 ? "" : "s"} in ${span}`];
  if (acc) parts.push(acc);
  if (t.skillsMastered > 0) parts.push(`${t.skillsMastered} skill${t.skillsMastered > 1 ? "s" : ""} mastered`);
  return `${parts.join(", ")}.`;
}
