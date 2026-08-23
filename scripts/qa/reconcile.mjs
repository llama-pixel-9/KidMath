/**
 * Reconcile the persona runner's ground truth (qa-out/sessions/*.json) with
 * what the app persisted: practice_sessions (household kids, via service key)
 * or the kid's localStorage dump (anonymous kids, qa-out/state/*.json).
 *   set -a && source .env.local && set +a && node scripts/qa/reconcile.mjs
 */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const rows = [];
for (const f of readdirSync("qa-out/sessions")) {
  if (!f.endsWith(".json") || f.startsWith("smoke")) continue;
  const { kid, sessions, problems, pageErrors } = JSON.parse(readFileSync(`qa-out/sessions/${f}`));
  let persisted = [];
  if (kid.kidId) {
    const { data, error } = await admin.from("practice_sessions").select("mode, started_at, questions, first_try_correct, retries_mastered, level_start, level_end, duration_ms, active_ms, attempts").eq("kid_id", kid.kidId).order("started_at");
    if (error) throw error;
    persisted = data.map((r) => ({ mode: r.mode, startedAt: new Date(r.started_at).getTime(), questions: r.questions, firstTryCorrect: r.first_try_correct, retriesMastered: r.retries_mastered, levelStart: r.level_start, levelEnd: r.level_end, durationMs: r.duration_ms, activeMs: r.active_ms, attempts: r.attempts?.length }));
  } else if (existsSync(`qa-out/state/${kid.kid}.json`)) {
    const st = JSON.parse(readFileSync(`qa-out/state/${kid.kid}.json`));
    persisted = JSON.parse(st["kidmath-sessions"] || "[]").map((r) => ({ mode: r.mode, startedAt: r.startedAt, questions: r.questions, firstTryCorrect: r.firstTryCorrect, retriesMastered: r.retriesMastered, levelStart: r.levelStart, levelEnd: r.levelEnd, durationMs: r.durationMs, activeMs: r.activeMs, attempts: r.attempts?.length }));
  }
  const truthQ = sessions.reduce((n, s) => n + s.questions, 0), truthC = sessions.reduce((n, s) => n + s.firstTryCorrect, 0);
  const persQ = persisted.reduce((n, s) => n + s.questions, 0), persC = persisted.reduce((n, s) => n + s.firstTryCorrect, 0);
  const mism = [];
  for (const s of sessions) {
    if (!Number.isFinite(s.startedAt)) { mism.push(`${s.mode}: no startedAt (schedule short)`); continue; }
    const p = persisted.find((x) => x.mode === s.mode && Math.abs(x.startedAt - s.startedAt) < 5000);
    if (!p) { mism.push(`missing ${s.mode} @${new Date(s.startedAt).toISOString()}`); continue; }
    if (p.questions !== s.questions || p.firstTryCorrect !== s.firstTryCorrect) mism.push(`${s.mode}: truth ${s.firstTryCorrect}/${s.questions} vs saved ${p.firstTryCorrect}/${p.questions}`);
    if (p.levelEnd !== s.levelEnd) mism.push(`${s.mode}: levelEnd truth ${s.levelEnd} vs saved ${p.levelEnd}`);
    if (Math.abs(p.activeMs - s.activeMs) > 1500) mism.push(`${s.mode}: activeMs truth ${s.activeMs} vs saved ${p.activeMs}`);
    if (p.durationMs < s.activeMs * 0.9) mism.push(`${s.mode}: durationMs ${p.durationMs} < activeMs ${s.activeMs}`);
  }
  rows.push({ kid: kid.kid, persona: kid.persona, grade: kid.grade, truth: `${truthC}/${truthQ} in ${sessions.length}`, saved: `${persC}/${persQ} in ${persisted.length}`, levels: kid.modes.map((m) => { const ss = sessions.filter((s) => s.mode === m); return `${m}:${ss[0]?.levelStart}→${ss.at(-1)?.levelEnd}`; }).join(" "), mismatches: mism.length, problems: problems.length, errors: pageErrors.length, detail: mism.slice(0, 3) });
}
console.table(rows.map(({ detail, ...r }) => r));
for (const r of rows) if (r.detail.length) console.log(r.kid, r.detail);
