import { useEffect, useState } from "react";
import QuestionPreview from "./QuestionPreview.jsx";

/**
 * Layout sweep (DEV only, driven by scripts/layoutSweep.mjs): renders bank
 * rows from /__sweep.json one at a time through the real QuestionPreview at
 * phone width and measures anything that spills past the card or answer
 * pane. Results accumulate on window.__sweep for Playwright to collect. This
 * is how "approve the sentence, not the screen" regressions get caught in
 * bulk — it found the long-label emoji overflow class across 160 rows.
 */
export default function LayoutSweepPage() {
  const [items, setItems] = useState(null);
  const [i, setI] = useState(0);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const from = Number(params.get("from") || 0), to = Number(params.get("to") || 1e9);
    fetch("/__sweep.json").then((r) => r.json()).then((all) => { window.__sweep = { results: [], done: false, total: 0 }; const s = all.slice(from, to); window.__sweep.total = s.length; setItems(s); });
  }, []);
  useEffect(() => {
    if (!items) return;
    if (i >= items.length) { window.__sweep.done = true; return; }
    const t = setTimeout(() => {
      const it = items[i];
      const root = document.getElementById("sweep-root");
      const card = root?.querySelector('[aria-label="Math question"]');
      const err = root?.querySelector(".text-red-700")?.textContent || null;
      let spill = 0, widest = null;
      const paneRight = root.getBoundingClientRect().right + 1, paneLeft = root.getBoundingClientRect().left - 1;
      for (const el of root.querySelectorAll("*")) {
        const r = el.getBoundingClientRect();
        if (r.width === 0) continue;
        const over = Math.max(r.right - paneRight, paneLeft - r.left);
        if (over > spill) { spill = over; widest = (el.textContent || "").slice(0, 40); }
      }
      const cardSpill = card ? Math.max(0, card.scrollWidth - card.clientWidth) : 0;
      window.__sweep.results.push({ itemId: it.itemId, modeId: it.modeId, structureType: it.structureType, spill: Math.round(Math.max(spill, cardSpill)), widest, err, answerType: it.payload?.answerType || "choice" });
      setI(i + 1);
    }, 160);
    return () => clearTimeout(t);
  }, [items, i]);
  if (!items) return <p>loading</p>;
  if (i >= items.length) return <p>done</p>;
  return <div id="sweep-root" className="p-3 w-[26rem] bg-white overflow-visible"><QuestionPreview key={items[i].itemId} item={items[i]} /></div>;
}
