#!/usr/bin/env node
/**
 * The live step's spill check: every item drawn by the session's own
 * question card (the DEV-only /__sweep page, src/admin/LayoutSweepPage.jsx)
 * at phone width, measuring anything that spills past the card, as
 * scripts/layoutSweep.mjs does for bank rows. One PNG per model, the way
 * the item-models pipeline screenshots fills, for a person to look at.
 *
 *   node --import ./scripts/lib/registerResolve.js scripts/live/layout.mjs <items.json> <outDir>
 *
 * Starts its own vite (port LIVE_LAYOUT_PORT, default 5207) and writes
 * public/__sweep.json, removed on exit, so run it from a worktree with its
 * own `npm ci`. Chromium: PW_CHROMIUM, else /opt/pw-browsers/chromium when
 * it exists, else Playwright's own.
 */
import { spawn } from "node:child_process";
import { existsSync, readFileSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { modelIdOfItem } from "../../src/itemModels/live/liveRules.js";

/** Pixels an element may stick out before it counts (layoutSweep.mjs uses 2). */
export const SPILL_PX = 2;
export const VIEWPORT = Object.freeze({ width: 390, height: 900 });

/** A bank item in the shape the sweep page renders (QuestionPreview's admin shape). */
export function sweepRow(item) {
  return {
    itemId: item.itemId,
    modeId: item.modeId,
    itemFamily: item.itemFamily,
    subskill: item.subskill,
    structureType: item.structureType,
    levelMin: item.levelRange?.[0] ?? 1,
    levelMax: item.levelRange?.[1] ?? 10,
    reviewStatus: item.reviewStatus || "approved",
    payload: item.question,
    version: item.version ?? 2,
    itemModelId: item.itemModelId ?? null,
    difficulty: item.difficulty ?? null,
    hint: item.hint ?? null,
    tags: item.tags ?? null,
  };
}

async function waitForServer(url, ms) {
  const until = Date.now() + ms;
  while (Date.now() < until) {
    try {
      const r = await fetch(url);
      if (r.ok) return true;
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  return false;
}

/**
 * Sweep `items`. Resolves to Map(itemId -> { spill, widest, err, png }),
 * with a PNG of the first item of each model (and of every spilled item)
 * in `outDir`. Throws when the page never comes up or a chunk never ends,
 * so a sweep that did not run never reads as a clean one.
 */
export async function runLayout(items, { cwd = process.cwd(), outDir, port = Number(process.env.LIVE_LAYOUT_PORT || 5207), pages = 4, log = () => {} } = {}) {
  const results = new Map();
  if (!items.length) return results;
  const { chromium } = await import(pathToFileURL(join(cwd, "node_modules/playwright/index.mjs")).href);
  const sweepFile = join(cwd, "public/__sweep.json");
  if (existsSync(sweepFile)) throw new Error(`${sweepFile} exists: another sweep is running, or one did not clean up`);
  const rows = items.map(sweepRow);
  writeFileSync(sweepFile, JSON.stringify(rows));
  if (outDir) mkdirSync(outDir, { recursive: true });
  // Its own process group, so killing it stops vite too (shots.mjs).
  const vite = spawn(join(cwd, "node_modules/.bin/vite"), ["--port", String(port), "--strictPort"], { cwd, stdio: "ignore", detached: true });
  const cleanup = () => {
    try {
      process.kill(-vite.pid);
    } catch {
      // already gone
    }
    rmSync(sweepFile, { force: true });
  };
  process.once("exit", cleanup);
  try {
    if (!(await waitForServer(`http://localhost:${port}/`, 60000))) throw new Error(`vite did not come up on ${port}`);
    const executablePath = process.env.PW_CHROMIUM || (existsSync("/opt/pw-browsers/chromium") ? "/opt/pw-browsers/chromium" : undefined);
    const browser = await chromium.launch(executablePath ? { executablePath } : {});
    try {
      const ctx = await browser.newContext({ viewport: VIEWPORT });
      const per = Math.ceil(rows.length / pages);
      const chunk = async (from) => {
        const p = await ctx.newPage();
        await p.goto(`http://localhost:${port}/__sweep?from=${from}&to=${from + per}`);
        let done = false;
        for (let t = 0; t < 1800 && !done; t += 1) {
          await p.waitForTimeout(500);
          done = await p.evaluate(() => Boolean(window.__sweep?.done));
        }
        if (!done) throw new Error(`sweep chunk from ${from} never finished`);
        const r = await p.evaluate(() => window.__sweep.results);
        await p.close();
        return r;
      };
      const starts = [];
      for (let f = 0; f < rows.length; f += per) starts.push(f);
      const all = (await Promise.all(starts.map(chunk))).flat();
      for (const r of all) results.set(r.itemId, { spill: r.spill, widest: r.widest, err: r.err, png: null });
      const missing = rows.filter((r) => !results.has(r.itemId));
      if (missing.length) throw new Error(`sweep returned no result for ${missing.length} items (${missing[0].itemId} ...)`);
      log(`swept ${all.length}; spilled ${all.filter((r) => r.spill > SPILL_PX || r.err).length}`);

      if (outDir) {
        const seen = new Set();
        const p = await ctx.newPage();
        for (let i = 0; i < rows.length; i += 1) {
          const id = rows[i].itemId;
          const model = modelIdOfItem(id) || rows[i].structureType;
          const bad = results.get(id).spill > SPILL_PX || results.get(id).err;
          if (seen.has(model) && !bad) continue;
          seen.add(model);
          await p.goto(`http://localhost:${port}/__sweep?from=${i}&to=${i + 1}`);
          await p.waitForSelector('#sweep-root [aria-label="Math question"]', { timeout: 15000 }).catch(() => {});
          const png = join(outDir, `${id}.png`);
          await p.locator("#sweep-root").screenshot({ path: png }).catch(() => {});
          results.get(id).png = existsSync(png) ? png : null;
        }
        await p.close();
      }
    } finally {
      await browser.close();
    }
  } finally {
    cleanup();
    process.removeListener("exit", cleanup);
  }
  return results;
}

/** Is a sweep result a fail? */
export const spilled = (r) => !r || Boolean(r.err) || r.spill > SPILL_PX;

async function main() {
  const [file, outDir] = process.argv.slice(2);
  if (!file || !outDir) {
    process.stdout.write("usage: layout.mjs <items.json> <outDir>\n");
    return 2;
  }
  const parsed = JSON.parse(readFileSync(file, "utf8"));
  const items = Array.isArray(parsed) ? parsed : parsed.items;
  const results = await runLayout(items, { outDir: resolve(outDir), log: (m) => process.stderr.write(`${m}\n`) });
  const bad = [...results].filter(([, r]) => spilled(r));
  writeFileSync(join(outDir, "layout.json"), `${JSON.stringify(Object.fromEntries(results), null, 2)}\n`);
  for (const [id, r] of bad) process.stdout.write(`  ${r.err ? "ERROR" : `${r.spill}px`}  ${id}  ${r.err || JSON.stringify(r.widest)}\n`);
  process.stdout.write(`${results.size} items swept, ${bad.length} spilled\n`);
  return bad.length ? 1 : 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main()
    .then((code) => process.exit(code))
    .catch((err) => {
      process.stderr.write(`layout: ${err.message}\n`);
      process.exit(2);
    });
}
