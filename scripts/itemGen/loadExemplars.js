#!/usr/bin/env node
/* Load exemplars for a specific cell from data/exemplars/. */

import fs from "node:fs";
import path from "node:path";
import url from "node:url";

const __filename = url.fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(__filename), "..", "..");
const EXEMPLAR_ROOT = path.join(ROOT, "data", "exemplars");

const ALLOWLIST = new Set([
  "CC-BY-4.0",
  "CC0",
  "public-domain",
]);

export function exemplarPath({ modeId, subskill, itemFamily, levelBand }) {
  return path.join(EXEMPLAR_ROOT, modeId, subskill, itemFamily, `${levelBand}.json`);
}

export function loadExemplars(cell) {
  const file = exemplarPath(cell);
  if (!fs.existsSync(file)) return [];
  const raw = fs.readFileSync(file, "utf8");
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) {
    throw new Error(`Exemplar file is not an array: ${file}`);
  }
  return parsed;
}

export function listCellsWithExemplars() {
  if (!fs.existsSync(EXEMPLAR_ROOT)) return [];
  const out = [];
  for (const modeId of fs.readdirSync(EXEMPLAR_ROOT)) {
    const modeDir = path.join(EXEMPLAR_ROOT, modeId);
    if (!fs.statSync(modeDir).isDirectory()) continue;
    for (const subskill of fs.readdirSync(modeDir)) {
      const subDir = path.join(modeDir, subskill);
      if (!fs.statSync(subDir).isDirectory()) continue;
      for (const itemFamily of fs.readdirSync(subDir)) {
        const famDir = path.join(subDir, itemFamily);
        if (!fs.statSync(famDir).isDirectory()) continue;
        for (const file of fs.readdirSync(famDir)) {
          if (!file.endsWith(".json")) continue;
          const levelBand = path.basename(file, ".json");
          out.push({ modeId, subskill, itemFamily, levelBand });
        }
      }
    }
  }
  return out;
}

export function licenseAllowed(exemplar) {
  const license = exemplar?.source?.license;
  if (!license) return true; // no license = not a verbatim restriction concern
  return ALLOWLIST.has(license);
}
