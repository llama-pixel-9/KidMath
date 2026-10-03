import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  CheckCircle2,
  Dices,
  Flag,
  Pencil,
  Play,
  RefreshCw,
  Save,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import RequireAdmin from "../RequireAdmin";
import { useAuth } from "../useAuth";
import QuestionPreview from "./QuestionPreview.jsx";
import Scaffold from "../components/Scaffold.jsx";
import { listItemModels, setModelReview, saveModelSpec } from "./itemModelsApi.js";
import { GRADE2_MONEY_MODELS } from "../itemModels/samples/grade2Money.js";
import { fill } from "../itemModels/fill.js";
import { validateModel } from "../itemModels/validate.js";
import { runChecks } from "../itemBank/qc/checks.js";
import { buildBankQuestion } from "../mathEngine";
import { hintFor } from "../hints/index.js";
import { formatAnswer } from "./reviewFormat.js";
import { STATE_TERMS } from "../content/stateWords.js";

/**
 * /admin/models — review item models, one at a time (plan section 8). For
 * the model in front of you: the template with its slots, the spec line,
 * five filled samples rendered through the session stage at phone width
 * with their wrong answers, checks and hint panel, and the stored blind-solve
 * and kid-safe verdicts. A approve, E edit, R reject, F flag, Space rolls.
 * Decisions write to item_models one model at a time; the bundled pilot
 * samples stand in when the table is empty or unreachable and never write.
 */

const REJECT_REASONS = ["unrealistic", "unclear", "wrong words", "wrong widget", "too easy", "too hard", "kids will not care", "other"];

const STATUS_BADGE_CLASS = {
  draft: "bg-gray-100 text-slate-700",
  approved: "bg-emerald-100 text-emerald-800",
  rejected: "bg-red-100 text-red-800",
  flagged: "bg-amber-100 text-amber-800",
};

const PENDING = new Set(["draft", "flagged"]);

const SAMPLE_COUNT = 5;

// Scaffold draws these today (the same set HintPane keeps); a hint naming
// another kind is shown by name until that kind has a drawer.
const DRAWABLE_KINDS = new Set(["dots", "array", "strip", "numberLine"]);

// State wordings a reviewer can flip between; CC is the default every
// model is written in.
const STATE_CODES = Object.keys(STATE_TERMS).filter((code) => code !== "CC");

// Split keeps the tokens; the whole-string test is separate because a global
// regex carries lastIndex between .test calls.
const SLOT_SPLIT_RE = /(\{[A-Za-z_][A-Za-z0-9_]*\})/g;
const SLOT_TOKEN_RE = /^\{[A-Za-z_][A-Za-z0-9_]*\}$/;

function StatusBadge({ status }) {
  const cls = STATUS_BADGE_CLASS[status] || STATUS_BADGE_CLASS.draft;
  return <span className={`px-2 py-0.5 rounded-md text-xs font-bold ${cls}`}>{status}</span>;
}

/** The bundled pilot models in the review row shape, marked as samples. */
function sampleModels() {
  return GRADE2_MONEY_MODELS.map((spec) => ({
    id: spec.id,
    modeId: spec.modeId,
    subskill: spec.subskill,
    grade: spec.grade,
    difficulty: spec.difficulty,
    spec,
    reviewStatus: "draft",
    reviewNote: null,
    reviewedBy: null,
    reviewedAt: null,
    sample: true,
  }));
}

function randomSeed() {
  return 1 + Math.floor(Math.random() * 1_000_000);
}

// Five seeds, consecutive so a reviewer can read them back: 1..5 on first
// load, a fresh run on every roll.
function seedsFrom(base) {
  return Array.from({ length: SAMPLE_COUNT }, (_, i) => base + i);
}

/** The fill output (bank shape) in the admin shape QuestionPreview takes. */
function toAdminItem(item) {
  return {
    itemId: item.itemId,
    modeId: item.modeId,
    itemFamily: item.itemFamily,
    subskill: item.subskill,
    structureType: item.structureType,
    levelMin: item.levelRange?.[0] ?? 1,
    levelMax: item.levelRange?.[1] ?? 1,
    reviewStatus: item.reviewStatus,
    payload: item.question,
  };
}

/**
 * One sample: the filled item, its checks and its hint panel content. A
 * spec that cannot fill (mid-edit, or a slot the table has no object for)
 * yields an error card rather than an empty screen.
 */
function buildSample(spec, seed, state) {
  try {
    const item = fill(spec, { seed, state });
    const qc = runChecks(item);
    let hint = null;
    let hintError = null;
    try {
      // The served question is what the bulb reads, so build it the way the
      // session does and let hintFor pick the per-item fields.
      hint = hintFor(buildBankQuestion(item));
    } catch (err) {
      hintError = err?.message || String(err);
    }
    return { seed, item, adminItem: toAdminItem(item), qc, hint, hintError, error: null };
  } catch (err) {
    return { seed, item: null, adminItem: null, qc: null, hint: null, hintError: null, error: err?.message || String(err) };
  }
}

function describeSlot(slot) {
  if (!slot || typeof slot !== "object") return "?";
  switch (slot.kind) {
    case "name":
      return "a kid's name";
    case "object": {
      const price = Array.isArray(slot.priceCents) ? `, ${slot.priceCents[0]}–${slot.priceCents[1]}¢` : "";
      return `object (${slot.skill}, ${slot.band}${price})`;
    }
    case "setting":
      return slot.of ? `setting of ${slot.of}` : "setting";
    case "money":
      if (typeof slot.of === "number") return `${slot.of}¢ fixed`;
      if (Array.isArray(slot.of)) return `${slot.of[0]}–${slot.of[1]}¢`;
      return `price of ${slot.of}`;
    case "int":
      return `${slot.min}–${slot.max}${slot.step ? ` by ${slot.step}` : ""}`;
    case "coins":
      return `${slot.count?.[0]}–${slot.count?.[1]} coins${slot.sameKind ? ", one kind" : ""}${slot.maxCents ? `, ≤${slot.maxCents}¢` : ""}`;
    case "expr":
      return `= ${slot.expr}`;
    default:
      return slot.kind || "?";
  }
}

/** The template with every {slot} highlighted. */
function Template({ prompt }) {
  const parts = String(prompt || "").split(SLOT_SPLIT_RE);
  return (
    <p className="text-lg leading-relaxed text-slate-800">
      {parts.map((part, i) =>
        SLOT_TOKEN_RE.test(part) ? (
          <mark key={i} className="bg-violet-100 text-violet-800 rounded px-1 font-mono text-[0.85em]">
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </p>
  );
}

function standardsLine(standards) {
  if (!standards || typeof standards !== "object") return "no standards";
  const parts = Object.entries(standards)
    .filter(([, codes]) => Array.isArray(codes) && codes.length)
    .map(([key, codes]) => `${key.toUpperCase()} ${codes.join(", ")}`);
  return parts.length ? parts.join(" · ") : "no standards";
}

function fmtWhen(value) {
  if (!value) return "";
  try {
    return new Date(value).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  } catch {
    return String(value);
  }
}

/**
 * A stored verdict from spec.checks (blind solve, kid-safe, …). The shape is
 * whatever the check wrote, so this reads the common fields and shows the
 * rest as JSON rather than hiding it.
 */
function VerdictCard({ name, verdict }) {
  const label = { blindSolve: "Blind solve", kidSafe: "Kid-safe", schoolPrintable: "School-printable" }[name] || name;
  // A stored AI review that left notes ("3 reviewer notes") is advice, not a
  // failed check: it showed red as "fail" until 2026-10-03, which read as a
  // failed gate on models whose notes had already been fixed. Only a verdict
  // that says it failed is red; a model that fails a real check can't be
  // approved anyway (canApprove).
  const text = typeof verdict?.verdict === "string" ? verdict.verdict : null;
  const notes = text != null && /\bnotes?\b/i.test(text);
  const ok =
    verdict?.ok ?? verdict?.pass ?? (text == null || notes ? null : /^(pass|ok|safe|reviewed)/i.test(text) ? true : /^(fail|unsafe|block)/i.test(text) ? false : null);
  const reason = verdict?.reason || verdict?.note || verdict?.message || null;
  const when = verdict?.checked_at || verdict?.checkedAt || null;
  const tone =
    ok === true ? "bg-emerald-50 text-emerald-800" : ok === false ? "bg-red-50 text-red-800" : notes ? "bg-amber-50 text-amber-900" : "bg-slate-50 text-slate-700";
  return (
    <div className={`rounded-xl p-3 text-xs ${tone}`}>
      <p className="font-bold">
        {label}: {ok === true ? "pass" : ok === false ? "fail" : text || "recorded"}
        {when && <span className="ml-2 font-normal opacity-70">{fmtWhen(when)}</span>}
      </p>
      {reason && <p className="mt-1">{reason}</p>}
      {!reason && verdict && typeof verdict === "object" && (
        <pre className="mt-1 whitespace-pre-wrap font-mono text-[10px] opacity-80">{JSON.stringify(verdict, null, 1)}</pre>
      )}
    </div>
  );
}

function QcBadge({ qc }) {
  if (!qc) return null;
  if (qc.findings.length === 0) {
    return (
      <span className="flex items-center gap-1 text-xs font-bold text-emerald-700" title="Passes automated checks">
        <ShieldCheck className="h-4 w-4" /> checks
      </span>
    );
  }
  const fail = qc.pass === false;
  return (
    <span className={`flex items-center gap-1 text-xs font-bold ${fail ? "text-red-700" : "text-amber-700"}`}>
      {fail ? <XCircle className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
      {qc.findings.length}
    </span>
  );
}

/** The bulb panel content plus the after-miss layers, as text, per sample. */
function HintPanel({ hint, hintError, ownHint }) {
  if (hintError) {
    return <div className="rounded-xl bg-red-50 text-red-700 text-xs p-3">Can't build the hint: {hintError}</div>;
  }
  if (!hint) return null;
  return (
    <div className="rounded-xl bg-slate-50 p-3 space-y-2 text-xs text-slate-700">
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Hint panel</p>
      <p>
        <span className="font-bold">The idea.</span> {hint.idea}
      </p>
      <div>
        <p className="font-bold">Try this.</p>
        <ol className="list-decimal pl-4 space-y-0.5">
          {hint.steps.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ol>
      </div>
      {hint.visual && DRAWABLE_KINDS.has(hint.visual.kind) ? (
        <div className="rounded-xl bg-cream px-2 pb-2 text-ink">
          <Scaffold scaffold={hint.visual} />
        </div>
      ) : (
        <p className="italic text-slate-500">
          Picture: {hint.visual?.kind ? `${hint.visual.kind} (no drawer yet, shown by name)` : "none"}
        </p>
      )}
      {hint.example && (
        <div className="rounded-lg border border-seafoam bg-seafoam/20 p-2">
          <p className="font-bold">Worked example</p>
          <p>{hint.example.problem}</p>
          <ol className="list-decimal pl-4">
            {(hint.example.steps || []).map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ol>
          <p className="font-bold text-deep-teal">Answer: {String(hint.example.answer)}</p>
        </div>
      )}
      {ownHint?.solution && (
        <div>
          <p className="font-bold">Worked solution (after the second miss)</p>
          <ol className="list-decimal pl-4">
            {(ownHint.solution.steps || []).map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ol>
          <p className="font-bold">Answer: {String(ownHint.solution.answer)}</p>
        </div>
      )}
    </div>
  );
}

function SampleCard({ sample, onReroll }) {
  const { seed, item, adminItem, qc, error } = sample;
  return (
    // Session layout rule: the stage lives in a narrow centered column, never
    // edge to edge, so the reviewer sees the phone the kid sees.
    <div className="rounded-2xl border border-gray-200 bg-white p-3 space-y-3 w-full max-w-sm mx-auto">
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <span className="font-mono">seed {seed}</span>
        {item && <span className="px-1.5 py-0.5 rounded bg-violet-50 text-violet-700 font-bold">{item.difficulty}</span>}
        <QcBadge qc={qc} />
        <button
          type="button"
          className="ml-auto px-2 py-1 rounded-md border border-gray-300 text-slate-600 font-semibold inline-flex items-center gap-1"
          onClick={onReroll}
          title="Fill this sample again with a new seed"
        >
          <Dices className="h-3.5 w-3.5" /> Roll
        </button>
      </div>

      {error ? (
        <div className="rounded-xl bg-red-50 text-red-700 text-sm p-3">Can't fill this model: {error}</div>
      ) : (
        <>
          <QuestionPreview item={adminItem} />

          <div className="text-sm">
            <span className="text-slate-400">Answer </span>
            <span className="font-extrabold text-slate-800">{formatAnswer(item.question.answer)}</span>
          </div>

          <div className="text-xs">
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Wrong answers</p>
            <ul className="space-y-1">
              {Object.entries(item.tags?.mistakes || {}).map(([choice, mistake]) => (
                <li key={choice} className="flex flex-col">
                  <span>
                    <span className="font-bold text-slate-800">{choice}</span>
                    <span className="ml-2 font-mono text-violet-700">{mistake}</span>
                  </span>
                  {item.hint?.feedback?.[choice] && <span className="text-slate-500 italic">{item.hint.feedback[choice]}</span>}
                </li>
              ))}
              {Object.keys(item.tags?.mistakes || {}).length === 0 && <li className="text-slate-400 italic">no tagged wrong answers</li>}
            </ul>
            {item.tags?.notes?.length > 0 && (
              <ul className="mt-1 text-amber-700">
                {item.tags.notes.map((n, i) => (
                  <li key={i}>⚠ {n}</li>
                ))}
              </ul>
            )}
          </div>

          {qc && qc.findings.length > 0 && (
            <ul className="space-y-0.5 border-t border-gray-100 pt-2">
              {qc.findings.map((f, i) => (
                <li key={i} className={`text-xs ${f.severity === "fail" ? "text-red-700" : "text-amber-700"}`}>
                  {f.severity === "fail" ? "✗" : "⚠"} <span className="font-mono">{f.id}</span>: {f.message}
                </li>
              ))}
            </ul>
          )}

          <HintPanel hint={sample.hint} hintError={sample.hintError} ownHint={item.hint} />
        </>
      )}
    </div>
  );
}

function ModelReviewInner() {
  const { user } = useAuth();
  const [models, setModels] = useState([]);
  // { kind: "cloud" } or { kind: "samples", reason } — where the list came from.
  const [source, setSource] = useState({ kind: "cloud" });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [filterMode, setFilterMode] = useState("");
  const [pendingOnly, setPendingOnly] = useState(true);
  const [seeds, setSeeds] = useState(() => seedsFrom(1));
  const [state, setState] = useState("");
  // Inline edit: the JSON text, its parse error, and the spec it yields.
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState("");
  const [editError, setEditError] = useState(null);
  const [draftSpec, setDraftSpec] = useState(null);
  const [rejecting, setRejecting] = useState(false);
  // "other" needs a typed reason: the input opens on its tap.
  const [otherOpen, setOtherOpen] = useState(false);
  const [otherReason, setOtherReason] = useState("");

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const rows = await listItemModels();
      if (rows.length) {
        setModels(rows);
        setSource({ kind: "cloud" });
      } else {
        setModels(sampleModels());
        setSource({ kind: "samples", reason: "item_models is empty" });
      }
    } catch (err) {
      setModels(sampleModels());
      setSource({ kind: "samples", reason: err.message || "item_models unreachable" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const modes = useMemo(() => [...new Set(models.map((m) => m.modeId))].sort(), [models]);

  const listed = useMemo(
    () =>
      models.filter((m) => {
        if (filterMode && m.modeId !== filterMode) return false;
        if (pendingOnly && !PENDING.has(m.reviewStatus)) return false;
        return true;
      }),
    [models, filterMode, pendingOnly]
  );

  // The model in front of you: the chosen one, else the first pending, else
  // the first of all.
  const current = useMemo(() => {
    if (selectedId) {
      const chosen = models.find((m) => m.id === selectedId);
      if (chosen) return chosen;
    }
    return models.find((m) => PENDING.has(m.reviewStatus)) || models[0] || null;
  }, [models, selectedId]);

  const spec = draftSpec || current?.spec || null;
  const validation = useMemo(() => (spec ? validateModel(spec) : null), [spec]);

  const samples = useMemo(
    () => (spec ? seeds.map((seed) => buildSample(spec, seed, state || null)) : []),
    [spec, seeds, state]
  );

  function resetModelState() {
    setEditing(false);
    setEditText("");
    setEditError(null);
    setDraftSpec(null);
    setRejecting(false);
    setOtherOpen(false);
    setOtherReason("");
  }

  function selectModel(id) {
    setSelectedId(id);
    resetModelState();
  }

  // After a decision the next pending model loads: the next one down the
  // list, wrapping, else the model after this one, else stay.
  function advanceFrom(id, list) {
    const i = list.findIndex((m) => m.id === id);
    for (let k = 1; k < list.length; k += 1) {
      const candidate = list[(i + k) % list.length];
      if (PENDING.has(candidate.reviewStatus)) return candidate.id;
    }
    return list[Math.min(i + 1, list.length - 1)]?.id ?? id;
  }

  async function decide(reviewStatus, note = null) {
    if (!current || busy) return;
    const edited = draftSpec ? draftSpec : undefined;
    if (current.sample) {
      // Samples never write: the decision lives in this tab, labelled so.
      const next = models.map((m) =>
        m.id === current.id
          ? { ...m, reviewStatus, reviewNote: note, reviewedBy: user?.id ?? null, reviewedAt: new Date().toISOString(), spec: edited || m.spec, localOnly: true }
          : m
      );
      setModels(next);
      selectModel(advanceFrom(current.id, next));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const updated = await setModelReview(current.id, reviewStatus, { note, spec: edited });
      const next = models.map((m) => (m.id === updated.id ? updated : m));
      setModels(next);
      selectModel(advanceFrom(current.id, next));
    } catch (err) {
      setError(err.message || "Decision failed");
    } finally {
      setBusy(false);
    }
  }

  function toggleEdit() {
    if (!current) return;
    if (editing) {
      // Closing keeps an unsaved edit (the "edited" badge shows it) until
      // it is saved, carried by a decision, or discarded.
      setEditing(false);
      setEditError(null);
      return;
    }
    const base = draftSpec || current.spec;
    setEditText(JSON.stringify({ template: base.template, hint: base.hint }, null, 2));
    setEditError(null);
    setEditing(true);
  }

  // Save the edit on its own, without a decision, so a wording fix is not
  // lost when the reviewer closes the editor or moves on.
  async function saveEdit() {
    if (!current || busy || !draftSpec || editError) return;
    if (current.sample) {
      setError("The bundled samples are read-only; edits save once models are loaded into the table.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const updated = await saveModelSpec(current.id, draftSpec);
      setModels((list) => list.map((m) => (m.id === updated.id ? updated : m)));
      setDraftSpec(null);
      setEditText(JSON.stringify({ template: updated.spec.template, hint: updated.spec.hint }, null, 2));
    } catch (err) {
      setError(err.message || "Save failed");
    } finally {
      setBusy(false);
    }
  }

  function discardEdit() {
    setDraftSpec(null);
    setEditError(null);
    if (current) setEditText(JSON.stringify({ template: current.spec.template, hint: current.spec.hint }, null, 2));
  }

  // Live re-render: every keystroke that parses to a template and a hint
  // replaces the spec the samples fill from; a broken keystroke keeps the
  // last good one and says why.
  function onEditChange(text) {
    setEditText(text);
    try {
      const parsed = JSON.parse(text);
      if (!parsed || typeof parsed !== "object" || typeof parsed.template?.prompt !== "string" || !parsed.hint || typeof parsed.hint !== "object") {
        throw new Error("expected { template: { prompt }, hint: { … } }");
      }
      setDraftSpec({ ...current.spec, template: parsed.template, hint: parsed.hint });
      setEditError(null);
    } catch (err) {
      setEditError(err.message);
    }
  }

  function rollAll() {
    setSeeds(seedsFrom(randomSeed()));
  }

  function toggleReject() {
    setRejecting((r) => !r);
  }

  function rollOne(i) {
    setSeeds((prev) => prev.map((s, k) => (k === i ? randomSeed() : s)));
  }

  // A widget in a sample (the coin tray, the number pad) autofocuses its
  // input on mount, and the keys below stay out of inputs on purpose, so the
  // model section takes focus back whenever the samples (re)mount; a click
  // into a widget to try an answer still hands the keys to that input.
  const sectionRef = useRef(null);
  useEffect(() => {
    sectionRef.current?.focus({ preventScroll: true });
  }, [current?.id, seeds, state]);

  // Keys: A approve, E edit, S save the edit, R reject, F flag, Space rolls. The handlers
  // change every render, so the listener reads the latest through a ref
  // that an effect keeps current, and is registered once.
  const handlers = useRef({});
  useEffect(() => {
    handlers.current = { decide, toggleEdit, rollAll, toggleReject, saveEdit, canApprove };
  });
  useEffect(() => {
    function onKey(e) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target;
      const tag = target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target?.isContentEditable) return;
      const h = handlers.current;
      switch (e.key) {
        case "a":
        case "A":
          // Same rule as the Approve button: a failing check or fill error blocks it.
          if (h.canApprove) h.decide("approved");
          break;
        case "e":
        case "E":
          h.toggleEdit();
          break;
        case "r":
        case "R":
          h.toggleReject();
          break;
        case "f":
        case "F":
          h.decide("flagged");
          break;
        case "s":
        case "S":
          h.saveEdit();
          break;
        case " ":
          // A focused button keeps its own Space (it clicks).
          if (tag === "BUTTON") return;
          e.preventDefault();
          h.rollAll();
          break;
        default:
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const counts = useMemo(() => {
    const c = { draft: 0, approved: 0, rejected: 0, flagged: 0 };
    for (const m of models) c[m.reviewStatus] = (c[m.reviewStatus] || 0) + 1;
    return c;
  }, [models]);

  const canApprove = validation?.ok && samples.every((s) => !s.error && s.qc?.pass !== false);

  return (
    <div className="max-w-[96rem] mx-auto p-4 space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-extrabold text-slate-800">Item model review</h1>
        <nav className="flex items-center gap-3 text-sm font-semibold text-violet-700">
          <Link to="/admin" className="hover:underline">
            Items
          </Link>
          <Link to="/admin/switch" className="hover:underline">
            Version switch
          </Link>
        </nav>
        <div className="flex-1" />
        <button
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gray-100 text-slate-700 text-sm font-bold"
          onClick={load}
        >
          <RefreshCw className="h-4 w-4" /> Refresh
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
        <span>Models: {models.length}</span>
        {Object.entries(counts).map(([k, v]) => (
          <span key={k} className="flex items-center gap-1">
            <StatusBadge status={k} /> {v}
          </span>
        ))}
        <span className="ml-2 text-slate-400">Keys: A approve · E edit · R reject · F flag · Space rolls</span>
      </div>

      {source.kind === "samples" && (
        <div className="p-3 bg-amber-50 text-amber-800 rounded-xl text-sm">
          Showing the bundled pilot <b>sample models</b> (src/itemModels/samples/grade2Money.js), read-only: {source.reason}.
          Decisions here stay in this tab and are not saved.
        </div>
      )}
      {error && <div className="p-3 bg-red-50 text-red-700 rounded-xl text-sm">{error}</div>}
      {loading && <div className="p-6 text-center text-sm text-slate-500">Loading...</div>}

      {!loading && (
        <div className="grid gap-4 lg:grid-cols-[16rem_1fr]">
          {/* The queue. */}
          <aside className="space-y-2">
            <div className="flex flex-wrap gap-2">
              <select
                className="rounded-lg border border-gray-300 px-2 py-1.5 text-xs flex-1"
                value={filterMode}
                onChange={(e) => setFilterMode(e.target.value)}
              >
                <option value="">All modes</option>
                {modes.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
              <label className="flex items-center gap-1 text-xs text-slate-600">
                <input type="checkbox" checked={pendingOnly} onChange={(e) => setPendingOnly(e.target.checked)} /> pending only
              </label>
            </div>
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden max-h-[70vh] overflow-y-auto">
              {listed.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => selectModel(m.id)}
                  className={`w-full text-left px-3 py-2 border-b border-gray-100 hover:bg-violet-50 ${
                    current?.id === m.id ? "bg-violet-50" : ""
                  }`}
                >
                  <p className="font-mono text-[11px] text-slate-700 truncate">{m.id}</p>
                  <p className="flex items-center gap-1.5 text-[11px] text-slate-500">
                    <StatusBadge status={m.reviewStatus} />
                    <span>
                      {m.modeId} · G{m.grade} · {m.difficulty}
                    </span>
                  </p>
                </button>
              ))}
              {listed.length === 0 && <p className="px-3 py-6 text-center text-xs text-slate-500">Nothing to review with these filters.</p>}
            </div>
          </aside>

          {current && spec ? (
            <section ref={sectionRef} tabIndex={-1} className="space-y-4 min-w-0 outline-none">
              {/* The model: template, spec line, review record. */}
              <div className="rounded-2xl border border-gray-200 bg-white p-4 space-y-3">
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <span className="font-mono text-slate-700">{current.id}</span>
                  <StatusBadge status={current.reviewStatus} />
                  {current.sample && <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 font-bold">sample</span>}
                  {current.localOnly && <span className="text-amber-700">(decision not saved)</span>}
                  {draftSpec && <span className="text-violet-700 font-bold">edited</span>}
                  {current.reviewedAt && (
                    <span className="ml-auto">
                      {current.reviewStatus} by {current.reviewedBy === user?.id ? "you" : current.reviewedBy?.slice(0, 8) || "—"} · {fmtWhen(current.reviewedAt)}
                      {current.reviewNote && <span className="italic"> · {current.reviewNote}</span>}
                    </span>
                  )}
                </div>

                <Template prompt={spec.template?.prompt} />

                <p className="text-sm text-slate-700">
                  <span className="font-bold">{spec.modeId}</span> · {spec.subskill} · grade {spec.grade} ·{" "}
                  <span title={standardsLine(spec.standards)}>{(spec.standards?.ccss || []).join(", ") || "no CCSS code"}</span> ·{" "}
                  <span className="font-bold">{spec.difficulty}</span> · {spec.format}
                  {spec.widget ? ` / ${spec.widget}` : ""} · {spec.family || "application"}
                </p>
                <p className="text-xs text-slate-500">{standardsLine(spec.standards)}</p>

                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(spec.slots || {}).map(([name, slot]) => (
                    <span key={name} className="px-2 py-0.5 rounded-md bg-slate-100 text-[11px] text-slate-700">
                      <span className="font-mono text-violet-700">{`{${name}}`}</span> {describeSlot(slot)}
                    </span>
                  ))}
                </div>

                {validation && !validation.ok && (
                  <ul className="rounded-xl bg-red-50 text-red-700 text-xs p-3 space-y-0.5">
                    {validation.errors.map((e, i) => (
                      <li key={i}>✗ {e}</li>
                    ))}
                  </ul>
                )}

                {spec.checks && typeof spec.checks === "object" && (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {Object.entries(spec.checks).map(([name, verdict]) => (
                      <VerdictCard key={name} name={name} verdict={verdict} />
                    ))}
                  </div>
                )}

                {/* Actions. */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <button
                    type="button"
                    className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-bold disabled:opacity-30 flex items-center gap-1.5"
                    onClick={() => decide("approved")}
                    disabled={busy || !canApprove}
                    title={canApprove ? "A" : "Fix the failing check or fill error before approving"}
                  >
                    <CheckCircle2 className="h-4 w-4" /> Approve <kbd className="opacity-70">A</kbd>
                  </button>
                  <button
                    type="button"
                    className={`px-4 py-2 rounded-xl border text-sm font-semibold flex items-center gap-1.5 ${
                      editing ? "border-violet-400 bg-violet-50 text-violet-700" : "border-gray-300 text-slate-600"
                    }`}
                    onClick={toggleEdit}
                    disabled={busy}
                  >
                    <Pencil className="h-4 w-4" /> {editing ? "Close editor" : "Edit"} <kbd className="opacity-70">E</kbd>
                  </button>
                  <button
                    type="button"
                    className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-1.5 ${
                      rejecting ? "bg-red-600 text-white" : "border border-red-300 text-red-700"
                    }`}
                    onClick={toggleReject}
                    disabled={busy}
                  >
                    <XCircle className="h-4 w-4" /> Reject <kbd className="opacity-70">R</kbd>
                  </button>
                  <button
                    type="button"
                    className="px-4 py-2 rounded-xl border border-amber-300 text-amber-800 text-sm font-semibold flex items-center gap-1.5"
                    onClick={() => decide("flagged")}
                    disabled={busy}
                  >
                    <Flag className="h-4 w-4" /> Flag <kbd className="opacity-70">F</kbd>
                  </button>
                  <button
                    type="button"
                    className="px-4 py-2 rounded-xl border border-gray-300 text-slate-600 text-sm font-semibold flex items-center gap-1.5"
                    onClick={rollAll}
                    disabled={busy}
                  >
                    <Dices className="h-4 w-4" /> Roll all <kbd className="opacity-70">Space</kbd>
                  </button>
                  <select
                    className="rounded-lg border border-gray-300 px-2 py-2 text-sm"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    title="Render the samples in a state's wording and money notation"
                  >
                    <option value="">Common Core wording</option>
                    {STATE_CODES.map((code) => (
                      <option key={code} value={code}>
                        {code} wording
                      </option>
                    ))}
                  </select>
                  {/* TODO(play-these): a real session with these five samples
                      mixed among approved neighbours needs a session pin by
                      model (the /play pin takes one bank row id), out of
                      scope for the groundwork. */}
                  <button
                    type="button"
                    className="px-4 py-2 rounded-xl border border-dashed border-gray-300 text-slate-400 text-sm font-semibold flex items-center gap-1.5"
                    disabled
                    title="TODO: needs a session pin by model"
                  >
                    <Play className="h-4 w-4" /> Play these (TODO)
                  </button>
                </div>

                {rejecting && (
                  <div className="rounded-xl bg-red-50 p-3 space-y-2">
                    <p className="text-xs font-bold text-red-800">Reject because…</p>
                    <div className="flex flex-wrap gap-1.5">
                      {REJECT_REASONS.map((reason) => (
                        <button
                          key={reason}
                          type="button"
                          className="px-3 py-1.5 rounded-lg bg-white border border-red-200 text-sm text-red-800 font-semibold hover:bg-red-100 disabled:opacity-50"
                          onClick={() => (reason === "other" ? setOtherOpen(true) : decide("rejected", reason))}
                          disabled={busy}
                        >
                          {reason}
                        </button>
                      ))}
                    </div>
                    {otherOpen && (
                      <div className="flex flex-wrap gap-2">
                        <input
                          className="flex-1 min-w-[200px] rounded-lg border border-red-200 px-2 py-1.5 text-sm"
                          placeholder="What is wrong?"
                          value={otherReason}
                          onChange={(e) => setOtherReason(e.target.value)}
                          autoFocus
                        />
                        <button
                          type="button"
                          className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-sm font-bold disabled:opacity-50"
                          onClick={() => decide("rejected", `other: ${otherReason.trim()}`)}
                          disabled={busy || otherReason.trim() === ""}
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {editing && (
                  <div className="space-y-1">
                    <p className="text-xs text-slate-500">
                      Template and hint as JSON; the samples re-render as you type. Save keeps the edit on the model, and a decision (A, R, F)
                      saves it too. Closing the editor keeps an unsaved edit until you save, decide or discard it
                      {current.sample ? " (samples never save)" : ""}.
                    </p>
                    <textarea
                      className="w-full h-72 rounded-xl border border-gray-300 p-2 font-mono text-xs"
                      value={editText}
                      onChange={(e) => onEditChange(e.target.value)}
                      spellCheck={false}
                    />
                    {editError && <p className="text-xs text-red-700">✗ {editError}</p>}
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        className="px-4 py-2 rounded-xl bg-violet-600 text-white text-sm font-bold disabled:opacity-30 flex items-center gap-1.5"
                        onClick={saveEdit}
                        disabled={busy || !draftSpec || !!editError || !!current.sample}
                        title={current.sample ? "Samples never save" : draftSpec ? "S" : "Nothing changed yet"}
                      >
                        <Save className="h-4 w-4" /> Save edit <kbd className="opacity-70">S</kbd>
                      </button>
                      <button
                        type="button"
                        className="px-4 py-2 rounded-xl border border-gray-300 text-sm font-semibold text-slate-600 disabled:opacity-30"
                        onClick={discardEdit}
                        disabled={busy || !draftSpec}
                      >
                        Discard edit
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* The samples, as the kid sees them. */}
              <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
                {samples.map((sample, i) => (
                  <SampleCard key={`${current.id}:${sample.seed}:${state}`} sample={sample} onReroll={() => rollOne(i)} />
                ))}
              </div>
            </section>
          ) : (
            <div className="py-12 text-center text-sm text-slate-500">No item models yet.</div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ModelReviewPage() {
  return (
    <RequireAdmin>
      <ModelReviewInner />
    </RequireAdmin>
  );
}
