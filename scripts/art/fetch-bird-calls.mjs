#!/usr/bin/env node
/**
 * fetch-bird-calls.mjs — downloads commercial-safe bird call candidates for the
 * Meadow roster from xeno-canto, trims/normalizes them with ffmpeg, and writes
 * an attribution manifest.
 *
 * LICENSE POLICY (KidMath is a paid app — this is the point of the script):
 *   ✅ CC0 / public domain
 *   ✅ CC-BY (attribution required — credits manifest is generated)
 *   ⚠️  CC BY-SA only with --allow-sa (trimmed clips are derivatives → clip must
 *       be redistributed BY-SA; legal-check before shipping)
 *   ❌ Anything -NC- or -ND- is rejected unconditionally.
 *
 * Usage:
 *   XC_API_KEY=... node scripts/art/fetch-bird-calls.mjs [--species skylark,robin]
 *       [--per-species 3] [--allow-sa] [--out public/calls]
 *
 *   Get a free key at https://xeno-canto.org/account (API v3 requires one).
 *   Requires ffmpeg on PATH. Verify EVERY recording's license page before ship —
 *   same per-item discipline as the EngageNY rule in CLAUDE.md.
 *
 * Output:
 *   <out>/candidates/<speciesId>.<n>.mp3   trimmed, normalized candidates
 *   <out>/credits.json                     machine manifest (id, recordist, lic, url)
 *   <out>/CREDITS.md                       human credits page content
 * Pick the best candidate per species by ear, rename to <speciesId>.mp3, and
 * prune the rest (their credits rows too).
 */

import { execFile } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { promisify } from "node:util";

const run = promisify(execFile);

// Roster speciesId → { latin, extra query terms }. Latin names from
// src/engagement/roster.js — keep in sync if the roster changes.
const SPECIES = {
  skylark: { latin: "Alauda arvensis" },
  houseFinch: { latin: "Haemorhous mexicanus" },
  mourningDove: { latin: "Zenaida macroura" },
  chickadee: { latin: "Poecile atricapillus" },
  houseWren: { latin: "Troglodytes aedon" },
  robin: { latin: "Turdus migratorius" },
  junco: { latin: "Junco hyemalis" },
  cardinal: { latin: "Cardinalis cardinalis" },
  downyWoodpecker: { latin: "Dryobates pubescens", extra: 'type:"drumming"' },
  goldfinch: { latin: "Spinus tristis" },
  blueJay: { latin: "Cyanocitta cristata" },
  hummingbird: { latin: "Archilochus colubris" },
  kingfisher: { latin: "Megaceryle alcyon" },
  barnSwallow: { latin: "Hirundo rustica" },
  barnOwl: { latin: "Tyto alba" },
  puffin: { latin: "Fratercula arctica" },
  sandhillCrane: { latin: "Antigone canadensis" },
  paintedBunting: { latin: "Passerina ciris" },
  kestrel: { latin: "Falco sparverius" },
  snowyOwl: { latin: "Bubo scandiacus" },
  whoopingCrane: { latin: "Grus americana" },
  condor: { latin: "Gymnogyps californianus" },
  // §8 Unveiling beat 1: the chick's soft baby call, heard nowhere else.
  whoopingCraneChick: { latin: "Grus americana", extra: 'stage:juvenile' },
  condorChick: { latin: "Gymnogyps californianus", extra: 'stage:juvenile' },
};

const args = process.argv.slice(2);
const flag = (name, dflt) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : dflt;
};
const ALLOW_SA = args.includes("--allow-sa");
const OUT = flag("out", "public/calls");
const PER_SPECIES = Number(flag("per-species", 3));
const ONLY = flag("species", "")?.split(",").filter(Boolean);
const KEY = process.env.XC_API_KEY;

if (!KEY) {
  console.error("XC_API_KEY is required (free at https://xeno-canto.org/account).");
  process.exit(1);
}

function licenseOk(licUrl = "") {
  const l = licUrl.toLowerCase();
  if (l.includes("-nc") || l.includes("-nd")) return false;
  if (l.includes("zero") || l.includes("publicdomain") || l.includes("cc0")) return true;
  if (l.includes("by-sa")) return ALLOW_SA;
  if (l.includes("/by/") || l.endsWith("/by") || l.includes("licenses/by/")) return true;
  return false; // unknown license → reject
}

function licenseLabel(licUrl = "") {
  const l = licUrl.toLowerCase();
  if (l.includes("zero") || l.includes("cc0") || l.includes("publicdomain")) return "CC0";
  if (l.includes("by-sa")) return "CC BY-SA";
  return "CC BY";
}

async function xcQuery(query) {
  const url = `https://xeno-canto.org/api/3/recordings?query=${encodeURIComponent(query)}&key=${KEY}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`xeno-canto ${res.status} for ${query}`);
  return res.json();
}

function score(rec) {
  // Prefer quality A→B, short clean recordings, song/call types.
  let s = 0;
  s += { A: 40, B: 25, C: 5 }[rec.q] ?? 0;
  const secs = (rec.length || "9:99").split(":").reduce((a, b) => a * 60 + +b, 0);
  if (secs >= 3 && secs <= 45) s += 20;
  const type = (rec.type || "").toLowerCase();
  if (/song|call|drum/.test(type)) s += 10;
  if (/alarm|flight call only|wing/.test(type)) s -= 5;
  return s;
}

async function trimNormalize(src, dest) {
  // Strip leading silence, keep up to 5s, fade edges, loudness-normalize,
  // mono 44.1k mp3 — small enough to bundle.
  await run("ffmpeg", [
    "-y", "-i", src,
    "-af",
    "silenceremove=start_periods=1:start_threshold=-35dB:start_silence=0.15," +
      "atrim=0:5,afade=t=in:d=0.15,afade=t=out:st=4.7:d=0.3,loudnorm=I=-16:TP=-1.5:LRA=11",
    "-ac", "1", "-ar", "44100", "-b:a", "96k",
    dest,
  ]);
}

const credits = [];
const missing = [];
await mkdir(path.join(OUT, "candidates"), { recursive: true });

for (const [id, spec] of Object.entries(SPECIES)) {
  if (ONLY?.length && !ONLY.includes(id)) continue;
  const q = [`sp:"${spec.latin}"`, spec.extra].filter(Boolean).join(" ");
  let data;
  try {
    data = await xcQuery(q);
  } catch (e) {
    console.error(`✗ ${id}: ${e.message}`);
    missing.push(id);
    continue;
  }
  const ok = (data.recordings || [])
    .filter((r) => licenseOk(r.lic))
    .sort((a, b) => score(b) - score(a))
    .slice(0, PER_SPECIES);
  if (!ok.length) {
    console.warn(`✗ ${id}: no commercial-safe recordings — try US-government/public-domain sources`);
    missing.push(id);
    continue;
  }
  let n = 0;
  for (const rec of ok) {
    n += 1;
    const raw = path.join(OUT, "candidates", `${id}.${n}.raw`);
    const dest = path.join(OUT, "candidates", `${id}.${n}.mp3`);
    if (existsSync(dest)) continue; // resumable
    const fileUrl = rec.file?.startsWith("//") ? `https:${rec.file}` : rec.file;
    const audio = await fetch(fileUrl);
    if (!audio.ok) { console.warn(`  skip XC${rec.id} (${audio.status})`); continue; }
    await writeFile(raw, Buffer.from(await audio.arrayBuffer()));
    await trimNormalize(raw, dest);
    await run("rm", [raw]);
    credits.push({
      speciesId: id,
      candidate: n,
      xcId: `XC${rec.id}`,
      recordist: rec.rec,
      license: licenseLabel(rec.lic),
      licenseUrl: rec.lic?.startsWith("//") ? `https:${rec.lic}` : rec.lic,
      source: `https://xeno-canto.org/${rec.id}`,
      quality: rec.q,
      type: rec.type,
    });
    console.log(`✓ ${id} #${n} — XC${rec.id} (${rec.q}, ${licenseLabel(rec.lic)}, ${rec.rec})`);
  }
}

await writeFile(path.join(OUT, "credits.json"), JSON.stringify(credits, null, 2));
const md = [
  "# Bird call recording credits",
  "",
  "Recordings from [xeno-canto](https://xeno-canto.org), used under the license",
  "noted per recording. Clips are trimmed and loudness-normalized.",
  "",
  ...credits.map(
    (c) =>
      `- **${c.speciesId}** (candidate ${c.candidate}): [${c.xcId}](${c.source}) by ${c.recordist} — [${c.license}](${c.licenseUrl})`
  ),
  "",
  missing.length ? `Unresolved species (need manual sourcing): ${missing.join(", ")}` : "",
].join("\n");
await writeFile(path.join(OUT, "CREDITS.md"), md);
console.log(`\nDone. ${credits.length} candidates. Manifest: ${OUT}/credits.json`);
if (missing.length) console.log(`Missing: ${missing.join(", ")}`);
