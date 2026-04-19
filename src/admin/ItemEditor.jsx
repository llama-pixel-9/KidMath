import { useState, useEffect } from "react";
import { validateBankItem } from "../itemBank";
import { upsertItem, deleteItem } from "./itemBankAdminApi";

const REVIEW_STATUSES = ["draft", "reviewed", "approved", "retired"];
const MODES = [
  "addition",
  "subtraction",
  "multiplication",
  "division",
  "comparing",
  "counting",
  "skipCounting",
  "placeValue",
];

function emptyItem() {
  return {
    itemId: "",
    modeId: "addition",
    itemFamily: "application",
    subskill: "",
    structureType: "",
    levelMin: 7,
    levelMax: 10,
    reviewStatus: "draft",
    payload: {
      a: 0,
      b: 0,
      op: "+",
      answer: 0,
      display: { promptText: "" },
    },
  };
}

function bankShape(form) {
  return {
    itemId: form.itemId,
    modeId: form.modeId,
    itemFamily: form.itemFamily,
    subskill: form.subskill,
    structureType: form.structureType,
    levelRange: [Number(form.levelMin), Number(form.levelMax)],
    reviewStatus: form.reviewStatus,
    question: form.payload,
  };
}

export default function ItemEditor({ item, onSaved, onCancel, onDeleted }) {
  const [form, setForm] = useState(item || emptyItem());
  const [payloadText, setPayloadText] = useState(JSON.stringify(form.payload, null, 2));
  const [errors, setErrors] = useState([]);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  useEffect(() => {
    setForm(item || emptyItem());
    setPayloadText(JSON.stringify((item || emptyItem()).payload, null, 2));
    setErrors([]);
  }, [item]);

  function update(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function syncPayload(text) {
    setPayloadText(text);
    try {
      const parsed = JSON.parse(text);
      setForm((f) => ({ ...f, payload: parsed }));
    } catch {
      // keep editing; we'll surface JSON errors on save
    }
  }

  async function handleSave(nextStatus) {
    let payload;
    try {
      payload = JSON.parse(payloadText);
    } catch (err) {
      setErrors([`Payload JSON is invalid: ${err.message}`]);
      return;
    }
    const candidate = bankShape({ ...form, payload, reviewStatus: nextStatus || form.reviewStatus });
    const { valid, errors: validationErrors } = validateBankItem(candidate);
    if (!valid) {
      setErrors(validationErrors);
      return;
    }
    setSaving(true);
    setErrors([]);
    try {
      const saved = await upsertItem({
        ...form,
        payload,
        reviewStatus: nextStatus || form.reviewStatus,
      });
      onSaved?.(saved);
    } catch (err) {
      setErrors([err.message || "Save failed"]);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!form.itemId) return;
    setSaving(true);
    try {
      await deleteItem(form.itemId);
      onDeleted?.(form.itemId);
    } catch (err) {
      setErrors([err.message || "Delete failed"]);
    } finally {
      setSaving(false);
      setDeleteConfirm(false);
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <label className="text-sm font-medium text-slate-700">
          Item ID
          <input
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            value={form.itemId}
            onChange={(e) => update("itemId", e.target.value)}
            placeholder="addition-app-099"
          />
        </label>
        <label className="text-sm font-medium text-slate-700">
          Mode
          <select
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            value={form.modeId}
            onChange={(e) => update("modeId", e.target.value)}
          >
            {MODES.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-medium text-slate-700">
          Subskill
          <input
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            value={form.subskill}
            onChange={(e) => update("subskill", e.target.value)}
            placeholder="makeTen"
          />
        </label>
        <label className="text-sm font-medium text-slate-700">
          Structure Type
          <input
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            value={form.structureType}
            onChange={(e) => update("structureType", e.target.value)}
            placeholder="joinResultUnknown"
          />
        </label>
        <label className="text-sm font-medium text-slate-700">
          Level Min
          <input
            type="number"
            min={1}
            max={10}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            value={form.levelMin}
            onChange={(e) => update("levelMin", Number(e.target.value))}
          />
        </label>
        <label className="text-sm font-medium text-slate-700">
          Level Max
          <input
            type="number"
            min={1}
            max={10}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            value={form.levelMax}
            onChange={(e) => update("levelMax", Number(e.target.value))}
          />
        </label>
        <label className="text-sm font-medium text-slate-700 md:col-span-2">
          Review Status
          <select
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            value={form.reviewStatus}
            onChange={(e) => update("reviewStatus", e.target.value)}
          >
            {REVIEW_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div>
        <label className="text-sm font-medium text-slate-700 block">
          Payload (JSON)
          <textarea
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-xs font-mono"
            rows={10}
            value={payloadText}
            onChange={(e) => syncPayload(e.target.value)}
          />
        </label>
        <p className="text-xs text-slate-500 mt-1">
          Required keys: <code>answer</code>, <code>display.promptText</code>. For arithmetic modes
          also include <code>a</code>, <code>b</code>, <code>op</code>.
        </p>
      </div>

      {errors.length > 0 && (
        <ul className="text-xs text-red-600 list-disc pl-5 space-y-1">
          {errors.map((msg, i) => (
            <li key={i}>{msg}</li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
        <button
          type="button"
          className="px-4 py-2 rounded-xl bg-violet-600 text-white text-sm font-bold disabled:opacity-50"
          onClick={() => handleSave()}
          disabled={saving}
        >
          {saving ? "Saving..." : "Save"}
        </button>
        <button
          type="button"
          className="px-4 py-2 rounded-xl bg-amber-500 text-white text-sm font-bold disabled:opacity-50"
          onClick={() => handleSave("reviewed")}
          disabled={saving}
        >
          Submit for review
        </button>
        <button
          type="button"
          className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-bold disabled:opacity-50"
          onClick={() => handleSave("approved")}
          disabled={saving}
        >
          Approve
        </button>
        <button
          type="button"
          className="px-4 py-2 rounded-xl bg-slate-500 text-white text-sm font-bold disabled:opacity-50"
          onClick={() => handleSave("retired")}
          disabled={saving}
        >
          Retire
        </button>
        <div className="flex-1" />
        <button
          type="button"
          className="px-4 py-2 rounded-xl bg-gray-100 text-slate-700 text-sm font-bold"
          onClick={onCancel}
        >
          Close
        </button>
        {item && (
          <button
            type="button"
            className="px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-bold disabled:opacity-50"
            onClick={() => (deleteConfirm ? handleDelete() : setDeleteConfirm(true))}
            disabled={saving}
          >
            {deleteConfirm ? "Confirm delete" : "Delete"}
          </button>
        )}
      </div>
    </div>
  );
}
