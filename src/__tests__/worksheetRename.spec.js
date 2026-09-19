import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

// Parents search for "worksheets", not "flight logs". The rebrand's cute name
// is retired from everything a parent (or a crawler) can read. Comments are
// exempt — this guards COPY only.

const ROOT = join(import.meta.dirname, "..", "..");
const FLIGHT_LOG = /flight[\s-]?logs?/i;

function jsxFiles(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    if (name === "__tests__" || name === "node_modules") continue;
    const path = join(dir, name);
    if (statSync(path).isDirectory()) out.push(...jsxFiles(path));
    else if (name.endsWith(".jsx")) out.push(path);
  }
  return out;
}

// Drop comments and code identifiers; what is left is what renders.
function visibleText(source) {
  return source
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "")
    .replace(/\b\w*FlightLog\w*\b/g, "")
    .replace(/\bflightLog\w*\b/g, "");
}

describe("worksheet naming", () => {
  it("no screen says 'flight log'", () => {
    const offenders = [];
    for (const file of jsxFiles(join(ROOT, "src"))) {
      const lines = visibleText(readFileSync(file, "utf8")).split("\n");
      lines.forEach((line, i) => {
        if (FLIGHT_LOG.test(line)) offenders.push(`${relative(ROOT, file)}:${i + 1} ${line.trim()}`);
      });
    }
    expect(offenders).toEqual([]);
  });

  it("index.html meta tags say worksheets", () => {
    const html = readFileSync(join(ROOT, "index.html"), "utf8");
    expect(FLIGHT_LOG.test(html)).toBe(false);
    expect(html).toMatch(/name="description"[^>]*worksheets/);
  });
});
