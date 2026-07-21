#!/usr/bin/env node
/**
 * Bundle the KidMath generation/scoring engine into a single IIFE for
 * JavaScriptCore (the native iOS app loads it into a JSContext).
 *
 * Input:  src/engine/nativeEntry.js  (exposes globalThis.KidMath)
 * Output: ios/KidMath/Resources/KidMathEngine.bundle.js
 *
 * The bundle is fully self-contained: no imports, no network, no browser APIs.
 * If esbuild ever pulls in a browser/network module (supabaseClient,
 * progressStore, cloudLoader, modeLoader, components) the build FAILS loudly —
 * that would drag import.meta/fetch into a context that lacks them.
 *
 * Usage: npm run build:engine
 */

import { build } from "esbuild";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outfile = resolve(root, "ios/KidMath/Resources/KidMathEngine.bundle.js");

const FORBIDDEN = [
  "supabaseClient",
  "progressStore",
  "itemBank/cloudLoader",
  "itemBank/modeLoader",
  "/components/",
  "@supabase",
];

// Fail the build if any browser/network module makes it into the graph.
const guardPlugin = {
  name: "no-browser-modules",
  setup(b) {
    b.onResolve({ filter: /.*/ }, (args) => {
      if (args.kind === "entry-point") return null;
      const bad = FORBIDDEN.find((f) => args.path.includes(f));
      if (bad) {
        throw new Error(
          `Engine bundle would include a forbidden browser/network module: "${args.path}" (matched "${bad}"). ` +
            `The native engine must stay pure — check imports in the core path.`
        );
      }
      return null;
    });
  },
};

const result = await build({
  entryPoints: [resolve(root, "src/engine/nativeEntry.js")],
  outfile,
  bundle: true,
  format: "iife",
  platform: "neutral",
  target: "es2020",
  minify: false, // readable for debugging; JSC parses it fine
  legalComments: "none",
  logLevel: "info",
  // Guard against a browser global sneaking in: these must be UNDEFINED in the
  // bundle, not referenced. If the core path touched them, define surfaces it.
  define: { "import.meta.env": "undefined" },
  plugins: [guardPlugin],
  metafile: true,
});

// Report size + a scan for stray browser globals as a second safety net.
const code = readFileSync(outfile, "utf8");
const kb = (code.length / 1024).toFixed(0);
const strayGlobals = ["import.meta", "window.", "document.", "localStorage", "XMLHttpRequest"].filter(
  (g) => code.includes(g)
);

process.stdout.write(`\nBuilt ios/KidMath/Resources/KidMathEngine.bundle.js (${kb} KB)\n`);
if (strayGlobals.length) {
  process.stderr.write(`WARNING: bundle references browser globals: ${strayGlobals.join(", ")}\n`);
  process.exit(1);
}
process.stdout.write("Clean: no browser globals in the bundle.\n\n");

// Silence unused-var lint on result; metafile is available for deeper audits.
void result.metafile;
