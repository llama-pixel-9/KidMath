/**
 * Shared by unapprove.mjs and retire.mjs: the rows of one live-step run,
 * and the expected count from its manifest. SQL only; nothing runs here.
 */
import { refillManifest } from "../../../src/itemBank/v2/modelRows.js";
import { loadManifest, sqlString, writeText } from "./common.mjs";

/** A run's version-2 rows of a topic. */
export function liveRunWhere(topic, run) {
  if (!run) throw new Error("a run id is required (source->>'run')");
  return `mode_id = ${sqlString(topic)} and version = 2 and source->>'run' = ${sqlString(run)}`;
}

/** How many of a manifest's rows a run wrote. */
export async function runRowCount(path, run) {
  const manifest = await loadManifest(path);
  const { items, problems } = refillManifest(manifest);
  if (problems.length) throw new Error(`${path}: ${problems.join("; ")}`);
  return items.filter((i) => i.source?.run === run).length;
}

export function writeOrPrint(sql, out) {
  if (out) {
    writeText(out, sql);
    process.stdout.write(`${out}\n`);
  } else process.stdout.write(sql);
}
