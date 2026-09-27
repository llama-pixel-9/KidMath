#!/usr/bin/env node
/**
 * Build docs/marketing/dashboard.html from docs/marketing/launch-tracker.md.
 *
 *   npm run marketing:dashboard          # build + open
 *   node scripts/marketingDashboard.mjs --no-open
 *
 * Zero dependencies. Parses: `## ` sections, `- [ ]` / `- [x]` items (with
 * `### ` sub-groups), and the two tables under `## Metrics` and `## Gates`.
 * Keep those shapes in the tracker and this keeps working.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const src = resolve(here, "../docs/marketing/launch-tracker.md");
const out = resolve(here, "../docs/marketing/dashboard.html");
const md = readFileSync(src, "utf8");

// ---------- parse ----------
const sections = []; // { title, groups: [{ title, items: [{done, text}] }], table }
let cur = null, grp = null;
for (const raw of md.split("\n")) {
  const line = raw.replace(/\r$/, "");
  let m;
  if ((m = line.match(/^## (.+)$/))) {
    cur = { title: m[1].trim(), groups: [], rows: [] };
    grp = null;
    sections.push(cur);
  } else if (cur && (m = line.match(/^### (.+)$/))) {
    grp = { title: m[1].trim(), items: [] };
    cur.groups.push(grp);
  } else if (cur && (m = line.match(/^- \[( |x|X)\] (.+)$/))) {
    if (!grp) { grp = { title: "", items: [] }; cur.groups.push(grp); }
    grp.items.push({ done: m[1] !== " ", text: m[2].trim() });
  } else if (cur && /^\|/.test(line) && !/^\|\s*-/.test(line)) {
    cur.rows.push(line.split("|").slice(1, -1).map((c) => c.trim()));
  }
}
const phases = sections.filter((s) => /^\d ·/.test(s.title));
const metrics = sections.find((s) => s.title === "Metrics");
const gates = sections.find((s) => s.title === "Gates");
const decisions = md.split("## Decisions log")[1]?.trim() ?? "";

const count = (s) => s.groups.reduce((a, g) => { a.t += g.items.length; a.d += g.items.filter((i) => i.done).length; return a; }, { t: 0, d: 0 });
const total = phases.reduce((a, p) => { const c = count(p); a.t += c.t; a.d += c.d; return a; }, { t: 0, d: 0 });
const esc = (s) => s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
const inline = (s) => esc(s).replace(/`([^`]+)`/g, "<code>$1</code>").replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>");

// gate status: pass / miss / blank per row
const gateRows = gates ? gates.rows.slice(1) : [];
const gateState = gateRows.length && gateRows.every((r) => /pass/i.test(r[4] ?? "")) ? "pass" : gateRows.some((r) => /miss/i.test(r[4] ?? "")) ? "miss" : "pending";

// ---------- render ----------
const bar = (d, t) => {
  const pct = t ? Math.round((100 * d) / t) : 0;
  return `<div class="bar"><span style="width:${pct}%"></span></div><div class="pct">${d}/${t} · ${pct}%</div>`;
};
const phaseHtml = phases.map((p) => {
  const c = count(p);
  return `<section class="phase">
    <header><h2>${esc(p.title)}</h2>${bar(c.d, c.t)}</header>
    ${p.groups.map((g) => `<div class="grp">${g.title ? `<h3>${esc(g.title)}</h3>` : ""}<ul>${g.items.map((i) => `<li class="${i.done ? "done" : ""}"><i></i>${inline(i.text)}</li>`).join("")}</ul></div>`).join("")}
  </section>`;
}).join("");

const table = (s, cls) => !s || s.rows.length < 2 ? "" : `<table class="${cls}"><thead><tr>${s.rows[0].map((c) => `<th>${esc(c)}</th>`).join("")}</tr></thead><tbody>${s.rows.slice(1).map((r) => `<tr>${r.map((c, i) => `<td class="${i === 0 ? "k" : ""} ${/pass/i.test(c) ? "pass" : /miss/i.test(c) ? "miss" : ""}">${inline(c) || "<span class=empty>—</span>"}</td>`).join("")}</tr>`).join("")}</tbody></table>`;

const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Larkit launch dashboard</title>
<style>
:root{--bg:#F2F5F8;--card:#fff;--ink:#172433;--ink2:#3E5063;--mut:#6E8093;--line:#D3DCE5;--sky:#2C77B0;--gold:#D99A14;--good:#2E8B57;--bad:#C2621B;color-scheme:light dark}
@media(prefers-color-scheme:dark){:root{--bg:#0F161E;--card:#17212B;--ink:#E8EEF4;--ink2:#B8C5D2;--mut:#8496A8;--line:#2C3946;--sky:#6FB0E6;--gold:#F0B429;--good:#5CC38A;--bad:#E8894A}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.5 -apple-system,"IBM Plex Sans","Segoe UI",sans-serif;padding:32px 20px 80px}
.wrap{max-width:1080px;margin:0 auto}h1{font-size:28px;margin:0 0 4px;letter-spacing:-.01em}h1 span{color:var(--gold)}
.sub{color:var(--mut);font-size:13px;margin:0 0 24px}code{font:12.5px ui-monospace,Menlo,monospace;background:var(--line);padding:1px 5px;border-radius:3px}
.top{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;margin-bottom:28px}
.tile{background:var(--card);border:1px solid var(--line);padding:14px 16px}.tile .k{font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:var(--mut)}.tile .v{font-size:22px;font-weight:700;margin-top:4px}
.tile.pass .v{color:var(--good)}.tile.miss .v{color:var(--bad)}.tile.pending .v{color:var(--gold)}
.bar{height:8px;background:var(--line);border-radius:4px;overflow:hidden;margin-top:8px}.bar span{display:block;height:100%;background:var(--sky)}.pct{font-size:12px;color:var(--mut);margin-top:4px;font-variant-numeric:tabular-nums}
.phase{background:var(--card);border:1px solid var(--line);padding:18px 20px;margin-bottom:16px}.phase header{margin-bottom:10px}.phase h2{font-size:18px;margin:0}
.grp h3{font-size:12px;text-transform:uppercase;letter-spacing:.07em;color:var(--mut);margin:14px 0 6px}ul{list-style:none;margin:0;padding:0}
li{display:flex;gap:10px;padding:5px 0;border-bottom:1px solid var(--line);color:var(--ink2)}li:last-child{border:0}li i{flex:none;width:16px;height:16px;border:1.5px solid var(--mut);border-radius:3px;margin-top:3px}
li.done{color:var(--mut);text-decoration:line-through}li.done i{background:var(--good);border-color:var(--good)}
.grid2{display:grid;grid-template-columns:repeat(auto-fit,minmax(340px,1fr));gap:16px;margin-top:8px}
table{width:100%;border-collapse:collapse;background:var(--card);border:1px solid var(--line);font-size:14px}th,td{text-align:left;padding:8px 10px;border-bottom:1px solid var(--line);vertical-align:top}th{font-size:11px;text-transform:uppercase;letter-spacing:.07em;color:var(--mut);font-weight:500}
td.k{font-weight:600}td.pass{color:var(--good);font-weight:600}td.miss{color:var(--bad);font-weight:600}.empty{color:var(--line)}
h2.sec{font-size:18px;margin:32px 0 10px}pre{white-space:pre-wrap;background:var(--card);border:1px solid var(--line);padding:14px 16px;font:13px/1.5 ui-monospace,Menlo,monospace;color:var(--ink2)}
</style></head><body><div class="wrap">
<h1>Lark<span>it</span> launch dashboard</h1>
<p class="sub">Built ${new Date().toISOString().slice(0, 16).replace("T", " ")} from <code>docs/marketing/launch-tracker.md</code> · edit the markdown, re-run <code>npm run marketing:dashboard</code></p>
<div class="top">
  <div class="tile"><div class="k">Overall</div><div class="v">${total.t ? Math.round((100 * total.d) / total.t) : 0}%</div>${bar(total.d, total.t)}</div>
  ${phases.map((p) => { const c = count(p); return `<div class="tile"><div class="k">${esc(p.title.replace(/^\d · /, ""))}</div><div class="v">${c.d}/${c.t}</div>${bar(c.d, c.t)}</div>`; }).join("")}
  <div class="tile ${gateState}"><div class="k">Ramp gates</div><div class="v">${gateState}</div><div class="pct">Phase 3 stays locked until pass</div></div>
</div>
<div class="grid2"><div><h2 class="sec">Metrics</h2>${table(metrics, "metrics")}</div><div><h2 class="sec">Gates</h2>${table(gates, "gates")}</div></div>
<h2 class="sec">Checklist</h2>
${phaseHtml}
<h2 class="sec">Decisions log</h2><pre>${esc(decisions)}</pre>
</div></body></html>`;

writeFileSync(out, html);
console.log(`wrote ${out} — ${total.d}/${total.t} items done`);
if (!process.argv.includes("--no-open")) {
  try {
    const { execSync: run } = await import("node:child_process");
    run(`${process.platform === "darwin" ? "open" : "xdg-open"} "${out}"`, { stdio: "ignore" });
  } catch { /* no opener available; the file is written */ }
}
