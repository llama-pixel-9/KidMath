import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../useAuth";
import { fetchKids, activeKidId } from "../kidProfiles";
import { loadProgressSummary } from "../progressStore";
import { loadSessions, loadSessionsSync } from "./sessionLog.js";
import { buildReport, headline } from "./reportModel.js";

/**
 * /report — the parent report. One page answering, in grade language:
 * how much is my kid practicing, on what, at what level, and where are they
 * getting stuck. Built from the practice log (sessionLog) plus the progress
 * rows; the same `buildReport` model will feed the emailed edition.
 *
 * Single-series charts in Lark Teal on white; text always wears ink tokens.
 * Controls are hidden in print so "Print / Save as PDF" is a clean handout.
 */

const RANGES = [
  { days: 7, label: "7 days" },
  { days: 30, label: "30 days" },
  { days: 90, label: "90 days" },
  { days: null, label: "All time" },
];

function fmtDate(ts) {
  return ts ? new Date(ts).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "—";
}

function Tile({ value, label, sub }) {
  return (
    <div className="bg-white rounded-2xl border-[1.5px] border-ink/10 p-4 text-center">
      <p className="font-display text-3xl font-semibold text-ink leading-none">{value}</p>
      <p className="mt-1.5 text-[12px] font-bold text-ink/70">{label}</p>
      {sub && <p className="text-[11px] font-semibold text-ink/45">{sub}</p>}
    </div>
  );
}

function Section({ title, intro, children }) {
  return (
    <section className="mt-10 break-inside-avoid">
      <h2 className="font-display font-medium text-2xl text-ink m-0">{title}</h2>
      {intro && <p className="mt-1 text-sm font-semibold text-ink/60">{intro}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

/** Minutes per bucket as thin teal bars; accuracy rides under each bar as text. */
function BarChart({ buckets, valueKey = "minutes", unit = "min", subKey, compact = false }) {
  const max = Math.max(1, ...buckets.map((b) => b[valueKey]));
  // viewBox units scale with the box, so a half-width chart needs a narrower
  // coordinate space or its labels shrink to half size.
  const W = compact ? 320 : 640;
  const H = 150;
  const pad = { l: 8, r: 8, t: 18, b: subKey ? 40 : 26 };
  const slot = (W - pad.l - pad.r) / buckets.length;
  const barW = Math.min(40, slot * 0.6);
  const plotH = H - pad.t - pad.b;
  return (
    <div className="bg-white rounded-2xl border-[1.5px] border-ink/10 p-4 overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label={`${unit} per period`}>
        <line x1={pad.l} x2={W - pad.r} y1={pad.t + plotH} y2={pad.t + plotH} stroke="#14231f" strokeOpacity="0.15" />
        {buckets.map((b, i) => {
          const v = b[valueKey];
          const h = v > 0 ? Math.max(4, (v / max) * plotH) : 0;
          const x = pad.l + i * slot + (slot - barW) / 2;
          const y = pad.t + plotH - h;
          return (
            <g key={i}>
              <title>{`${b.label}: ${v} ${unit}${b.sessions != null ? `, ${b.sessions} session${b.sessions === 1 ? "" : "s"}` : ""}${subKey && b[subKey] != null ? `, ${b[subKey]}% right` : ""}`}</title>
              <rect x={x} y={y} width={barW} height={h} rx={4} fill="#0b7a6a" />
              {v > 0 && (
                <text x={x + barW / 2} y={y - 5} textAnchor="middle" fontSize="11" fontWeight="700" fill="#14231f">
                  {v}
                </text>
              )}
              <text x={x + barW / 2} y={pad.t + plotH + 15} textAnchor="middle" fontSize="11" fontWeight="600" fill="#14231f" fillOpacity="0.6">
                {b.label}
              </text>
              {subKey && b[subKey] != null && (
                <text x={x + barW / 2} y={pad.t + plotH + 30} textAnchor="middle" fontSize="10" fontWeight="600" fill="#14231f" fillOpacity="0.45">
                  {b[subKey]}% right
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function LevelBar({ start, now }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-24 rounded-full bg-ink/10 overflow-hidden relative" aria-hidden="true">
        <div className="absolute inset-y-0 left-0 bg-teal rounded-full" style={{ width: `${(now / 10) * 100}%` }} />
      </div>
      <span className="text-sm font-bold text-ink whitespace-nowrap">
        Level {now}
        {now > start && <span className="text-teal"> ↑{now - start}</span>}
        {now < start && <span className="text-ember"> ↓{start - now}</span>}
      </span>
    </div>
  );
}

function Accuracy({ value }) {
  if (value == null) return <span className="text-ink/30">—</span>;
  const tone = value >= 85 ? "text-teal" : value >= 70 ? "text-ink" : "text-ember";
  return <span className={`font-bold ${tone}`}>{value}%</span>;
}

function SkillRow({ m }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <tr className="border-t border-ink/10 align-top">
        <td className="py-3 pr-2">
          <button type="button" className="text-left cursor-pointer" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
            <p className="font-bold text-ink">
              {m.label} <span className="text-ink/40 text-xs">{open ? "▾" : "▸"}</span>
            </p>
            <p className="text-[11px] font-semibold text-ink/45">Grades {m.gradeSpan}</p>
          </button>
        </td>
        <td className="py-3 pr-2"><LevelBar start={m.levelStart} now={m.levelNow} /></td>
        <td className="py-3 pr-2 text-right text-sm font-semibold text-ink whitespace-nowrap">{m.minutes} min<br /><span className="text-[11px] text-ink/45">{m.sessions} session{m.sessions === 1 ? "" : "s"}</span></td>
        <td className="py-3 pr-2 text-right text-sm font-semibold text-ink whitespace-nowrap">{m.questions}<br /><span className="text-[11px] text-ink/45">{m.avgResponseMs != null ? `${Math.round(m.avgResponseMs / 1000)}s each` : ""}</span></td>
        <td className="py-3 text-right text-sm"><Accuracy value={m.accuracy} /></td>
      </tr>
      {open && (
        <tr className="bg-ink/[0.03]">
          <td colSpan={5} className="px-3 py-3">
            <p className="text-[11px] uppercase font-bold text-ink/45 mb-1.5">By skill</p>
            <div className="grid sm:grid-cols-2 gap-x-6 gap-y-1">
              {m.subskills.map((s) => (
                <div key={s.id} className="flex items-center justify-between gap-3 text-sm">
                  <span className="font-semibold text-ink/80">{s.label}</span>
                  <span className="whitespace-nowrap text-ink/60">
                    <Accuracy value={s.accuracy} /> <span className="text-[11px]">· {s.correct}/{s.attempts}</span>
                  </span>
                </div>
              ))}
            </div>
            {m.retriesMastered > 0 && (
              <p className="mt-2 text-[12px] font-semibold text-ink/60">
                {m.retriesMastered} tricky problem{m.retriesMastered === 1 ? "" : "s"} came back later and got solved.
              </p>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

export default function ParentReportPage() {
  const { user, loading } = useAuth();
  const [kids, setKids] = useState([]);
  const [kidId, setKidId] = useState(() => activeKidId());
  const [days, setDays] = useState(30);
  const [sessions, setSessions] = useState(() => loadSessionsSync());
  const [source, setSource] = useState("local");
  const [progress, setProgress] = useState({});
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    if (loading) return undefined;
    let cancelled = false;
    (async () => {
      if (user) {
        const list = await fetchKids(user.id);
        if (!cancelled) {
          setKids(list);
          if (!kidId && list.length) setKidId(list[0].id);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, loading]);

  useEffect(() => {
    if (loading) return undefined;
    let cancelled = false;
    setBusy(true);
    (async () => {
      const [log, summary] = await Promise.all([
        loadSessions({ kidId: kidId || null }).catch(() => ({ source: "local", sessions: loadSessionsSync(kidId) })),
        loadProgressSummary({ kidId: kidId || null }).catch(() => ({ byMode: {} })),
      ]);
      if (cancelled) return;
      setSessions(log.sessions);
      setSource(log.source);
      setProgress(summary.byMode || {});
      setBusy(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user, loading, kidId]);

  const report = useMemo(() => buildReport(sessions, { days, progressByMode: progress }), [sessions, days, progress]);
  const kid = kids.find((k) => k.id === kidId);
  const kidName = kid?.first_name;
  const t = report.totals;

  return (
    <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-10 print:py-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display font-semibold text-4xl text-ink m-0">
            {kidName ? `${kidName}'s progress report` : "Progress report"}
          </h1>
          <p className="mt-2 text-sm font-semibold text-ink/60">
            {source === "cloud" ? "Practice across your family account" : "Practice on this device"} ·
            generated {fmtDate(report.generatedAt)}
            {t.firstSessionAt && ` · practicing since ${fmtDate(t.firstSessionAt)}`}
          </p>
        </div>
        <button
          type="button"
          onClick={() => window.print()}
          className="print:hidden px-4 h-11 rounded-xl border-2 border-ink/15 text-sm font-bold text-ink cursor-pointer hover:border-ink/40"
        >
          Print / Save as PDF
        </button>
      </div>

      <div className="mt-5 flex flex-wrap gap-2 print:hidden">
        {kids.length > 1 &&
          kids.map((k) => (
            <button
              key={k.id}
              type="button"
              onClick={() => setKidId(k.id)}
              className={`px-3 h-9 rounded-full text-sm font-bold cursor-pointer border-2 ${
                k.id === kidId ? "bg-teal border-teal text-white" : "border-ink/15 text-ink hover:border-ink/40"
              }`}
            >
              {k.first_name}
            </button>
          ))}
        {kids.length > 1 && <span className="w-px bg-ink/10 mx-1" aria-hidden="true" />}
        {RANGES.map((r) => (
          <button
            key={r.label}
            type="button"
            onClick={() => setDays(r.days)}
            className={`px-3 h-9 rounded-full text-sm font-bold cursor-pointer border-2 ${
              r.days === days ? "bg-ink border-ink text-white" : "border-ink/15 text-ink hover:border-ink/40"
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      <p className="mt-6 text-lg font-semibold text-ink">{busy ? "Loading…" : headline(report, kidName)}</p>

      {!busy && t.sessions === 0 && (
        <div className="mt-6 bg-white rounded-2xl border-[1.5px] border-ink/10 p-6 text-sm font-semibold text-ink/60">
          <p>No finished practice sessions in this period.</p>
          <p className="mt-2">
            The practice log starts with the next session your kid finishes — earlier play is summarized
            in the <Link to="/" className="text-teal underline">home page's grown-ups panel</Link> as levels and stars.
            {!user && " Sign in to keep the log across devices."}
          </p>
        </div>
      )}

      {t.sessions > 0 && (
        <>
          <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 gap-3">
            <Tile value={t.minutes} label="minutes practiced" sub={`${t.avgSessionMinutes} min per session`} />
            <Tile value={t.sessions} label="sessions" sub={`on ${t.activeDays} day${t.activeDays === 1 ? "" : "s"}`} />
            <Tile value={t.questions} label="questions answered" />
            <Tile value={t.accuracy != null ? `${t.accuracy}%` : "—"} label="right on the first try" sub={t.retriesMastered > 0 ? `${t.retriesMastered} fixed on a retry` : undefined} />
            <Tile value={t.streakDays} label="day streak" sub={t.perfectSessions > 0 ? `${t.perfectSessions} perfect session${t.perfectSessions === 1 ? "" : "s"}` : undefined} />
            <Tile value={t.levelUps} label={`level-up${t.levelUps === 1 ? "" : "s"}`} sub={t.challengesTaken > 0 ? `${t.challengesPassed}/${t.challengesTaken} challenge flights passed` : undefined} />
          </div>

          {report.recommendations.length > 0 && (
            <Section title="What to do with this">
              <ul className="space-y-2">
                {report.recommendations.map((r, i) => (
                  <li key={i} className="bg-white rounded-2xl border-[1.5px] border-ink/10 px-4 py-3 text-sm font-semibold text-ink/80 flex gap-3">
                    <span aria-hidden="true">{r.kind === "focus" ? "🎯" : r.kind === "celebrate" ? "🎉" : r.kind === "stretch" ? "🚀" : r.kind === "habit" ? "📅" : "🔁"}</span>
                    <span>{r.text}</span>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          <Section title="Practice over time" intro={report.byDay ? "Minutes each day." : "Minutes each week, with first-try accuracy under each bar."}>
            {report.byDay ? <BarChart buckets={report.byDay} /> : <BarChart buckets={report.byWeek} subKey="accuracy" />}
          </Section>

          <Section title="Skills" intro="Levels climb by skill, not time: each activity has its own 10-level ladder, and the grade range says what it covers. Tap a row to see it broken down by skill.">
            <div className="bg-white rounded-2xl border-[1.5px] border-ink/10 px-4 py-1 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-[11px] uppercase text-ink/45">
                  <tr>
                    <th className="py-2 font-bold">Activity</th>
                    <th className="py-2 font-bold">Standing</th>
                    <th className="py-2 font-bold text-right">Time</th>
                    <th className="py-2 font-bold text-right">Questions</th>
                    <th className="py-2 font-bold text-right">First try</th>
                  </tr>
                </thead>
                <tbody>
                  {report.modes.map((m) => <SkillRow key={m.id} m={m} />)}
                </tbody>
              </table>
            </div>
          </Section>

          {(report.needsWork.length > 0 || report.strengths.length > 0) && (
            <Section title="Strengths and shaky spots" intro="Skills with at least four tries. Above 90% is solid; under 70% is worth a few extra minutes.">
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="bg-white rounded-2xl border-[1.5px] border-ink/10 p-4">
                  <p className="text-[11px] uppercase font-bold text-teal mb-2">Solid</p>
                  {report.strengths.length === 0 && <p className="text-sm text-ink/45 font-semibold">Not enough tries yet.</p>}
                  <ul className="space-y-1.5">
                    {report.strengths.map((s) => (
                      <li key={`${s.mode}-${s.id}`} className="text-sm font-semibold text-ink/80 flex justify-between gap-3">
                        <span>{s.label} <span className="text-ink/45">· {s.modeLabel}</span></span>
                        <span className="text-teal font-bold whitespace-nowrap">{s.accuracy}%</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="bg-white rounded-2xl border-[1.5px] border-ink/10 p-4">
                  <p className="text-[11px] uppercase font-bold text-ember mb-2">Needs work</p>
                  {report.needsWork.length === 0 && <p className="text-sm text-ink/45 font-semibold">Nothing under 70% — nice.</p>}
                  <ul className="space-y-1.5">
                    {report.needsWork.map((s) => (
                      <li key={`${s.mode}-${s.id}`} className="text-sm font-semibold text-ink/80 flex justify-between gap-3">
                        <span>{s.label} <span className="text-ink/45">· {s.modeLabel}, Level {s.level}</span></span>
                        <span className="text-ember font-bold whitespace-nowrap">{s.accuracy}%</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </Section>
          )}

          {report.struggles.length > 0 && (
            <Section title="Questions that tripped them up" intro="Missed on the first try, most-missed first. The app brings these back automatically; talking one through out loud helps too.">
              <ul className="space-y-2">
                {report.struggles.map((s) => (
                  <li key={`${s.mode}|${s.prompt}`} className="bg-white rounded-2xl border-[1.5px] border-ink/10 px-4 py-3">
                    <p className="text-sm font-semibold text-ink">{s.prompt}</p>
                    <p className="mt-1 text-[12px] font-semibold text-ink/60 flex flex-wrap gap-x-3 gap-y-0.5">
                      <span>{s.modeLabel} · Level {s.level} · {s.subskillLabel}</span>
                      {s.answer && <span>Answer: <span className="text-ink">{s.answer}</span></span>}
                      {s.given.length > 0 && <span>Tried: <span className="text-ember">{s.given.join(", ")}</span></span>}
                      {s.misses > 1 && <span className="text-ember">missed {s.misses}×</span>}
                      {s.masteredLater && <span className="text-teal">✓ got it on a later try</span>}
                    </p>
                  </li>
                ))}
              </ul>
              {report.slowButRight.length > 0 && (
                <div className="mt-3 bg-white rounded-2xl border-[1.5px] border-ink/10 px-4 py-3">
                  <p className="text-[11px] uppercase font-bold text-ink/45 mb-1">Right, but slow (20s+)</p>
                  <ul className="space-y-1">
                    {report.slowButRight.map((s, i) => (
                      <li key={i} className="text-sm font-semibold text-ink/80">
                        {s.prompt} <span className="text-ink/45">· {s.modeLabel} · {s.seconds}s</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </Section>
          )}

          <Section title="When they practice">
            <div className="grid sm:grid-cols-2 gap-3">
              <BarChart buckets={report.when.byWeekday} compact />
              <BarChart buckets={report.when.byTimeOfDay} compact />
            </div>
            {report.when.busiestDay && (
              <p className="mt-2 text-sm font-semibold text-ink/60">
                Most practice happens on {report.when.busiestDay}, in the {report.when.busiestSlot}.
              </p>
            )}
          </Section>
        </>
      )}

      <p className="mt-12 text-[12px] font-semibold text-ink/45 print:hidden">
        Time counts finished sessions only, capped at 30 minutes each. Accuracy is first-try only — a problem
        solved on a retry is counted as fixed, not as right.{" "}
        {user ? (
          <>Manage what we store on the <Link to="/account" className="text-teal underline">account page</Link>.</>
        ) : (
          <>Sign in to keep this report across devices.</>
        )}
      </p>
    </main>
  );
}
