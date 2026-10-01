import fs from "node:fs";
import path from "node:path";
import { describe, it, expect } from "vitest";
import {
  FRAMEWORKS,
  GRADES,
  LOADED_FRAMEWORKS,
  ccssAliases,
  crosswalkFor,
  findStandard,
  normalizeCode,
  standardByCode,
  standardsFor,
  txAliases,
  unknownCodes,
  validateCrosswalk,
  validateStandardsFile,
} from "../standards/index.js";
import CCSS_FILE from "../standards/ccss.json";
import TX_FILE from "../standards/tx.json";
import { BLUEPRINT_ROWS, validateBlueprintRow } from "../blueprints/index.js";
import { blueprintStandardDbRows, checkSql, crosswalkDbRows, loadSql, sqlLiteral, standardsDbRows } from "../standards/dbRows.js";
import { COVERAGE_STATUSES, catalogSkillsFor, coverageTotals, rowToCoverage, statusLabel } from "../standards/coverage.js";
import { WORKSHEET_SKILLS } from "../skills/catalog.js";
import { GRADE2_MONEY_MODELS } from "../itemModels/samples/grade2Money.js";

/**
 * The standards gate (docs/standards-coverage.md): the code lists are well
 * formed, and every code the app cites (item models, blueprint rows, catalog
 * skills) is a real code in the list of each loaded framework. A typo'd code
 * fails here, before it can reach the database, where the link tables'
 * foreign keys would also refuse it.
 */

const MODELS_DIR = path.resolve(__dirname, "../itemModels");

function modelFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return modelFiles(p);
    return e.name.endsWith(".json") ? [p] : [];
  });
}

function allModels() {
  const fromFiles = modelFiles(MODELS_DIR).flatMap((file) => {
    let data = JSON.parse(fs.readFileSync(file, "utf8"));
    if (!Array.isArray(data)) data = data.models || Object.values(data);
    return data.map((m) => ({ ...m, _file: path.relative(MODELS_DIR, file) }));
  });
  return [...fromFiles, ...GRADE2_MONEY_MODELS.map((m) => ({ ...m, _file: "samples/grade2Money.js" }))];
}

describe("the code lists", () => {
  it("are well formed", () => {
    expect(validateStandardsFile(CCSS_FILE, "ccss")).toEqual([]);
    expect(validateStandardsFile(TX_FILE, "tx")).toEqual([]);
    for (const fw of LOADED_FRAMEWORKS) expect(FRAMEWORKS).toContain(fw);
  });

  it("hold every Texas K-5 student expectation, process standards included", () => {
    // Counted from 19 TAC §111.2-111.7 on 2026-10-01.
    const perGrade = Object.fromEntries(GRADES.map((g) => [g, standardsFor("tx").filter((s) => s.grade === g).length]));
    expect(perGrade).toEqual({ K: 36, 1: 50, 2: 50, 3: 53, 4: 53, 5: 46 });
    const codes = standardsFor("tx").map((s) => s.code);
    expect(codes[0]).toBe("K.1A");
    expect(codes.at(-1)).toBe("5.10F");
    expect(codes).toContain("K.4");
    // Process standards run through the content items; coverage leaves them out.
    const process = standardsFor("tx").filter((s) => /^[K1-5]\.1[A-G]$/.test(s.code));
    expect(process).toHaveLength(42);
    expect(process.every((s) => s.in_scope === "no")).toBe(true);
  });

  it("hold every Common Core K-5 code, sub-parts included, in the official order", () => {
    // Counted from the domain pages at thecorestandards.org on 2026-10-01.
    const perGrade = Object.fromEntries(GRADES.map((g) => [g, standardsFor("ccss").filter((s) => s.grade === g).length]));
    expect(perGrade).toEqual({ K: 25, 1: 24, 2: 28, 3: 37, 4: 37, 5: 40 });
    const codes = standardsFor("ccss").map((s) => s.code);
    expect(codes[0]).toBe("K.CC.A.1");
    expect(codes.at(-1)).toBe("5.G.B.4");
    expect(codes.indexOf("3.NF.A.2")).toBeLessThan(codes.indexOf("3.NF.A.2a"));
    expect(standardByCode("ccss", "3.NF.A.2a").parent).toBe("3.NF.A.2");
  });

  it("find a code by its short form or official dotted sub-part", () => {
    expect(ccssAliases("3.OA.C.7")).toEqual(["3.OA.7"]);
    expect(ccssAliases("3.NF.A.2a")).toEqual(["3.NF.2a", "3.NF.A.2.a"]);
    expect(normalizeCode("ccss", "2.MD.8")).toBe("2.MD.C.8");
    expect(normalizeCode("ccss", " 3.NF.A.2.a ")).toBe("3.NF.A.2a");
    expect(findStandard("ccss", "9.ZZ.Z.9")).toBeNull();
    expect(txAliases("3.4F")).toEqual(["3.4(F)", "3.4.F"]);
    expect(txAliases("K.4")).toEqual([]);
    expect(normalizeCode("tx", "3.4(F)")).toBe("3.4F");
    expect(normalizeCode("tx", "2.5.A")).toBe("2.5A");
    expect(normalizeCode("tx", "2.12A")).toBeNull();
  });

  it("report aliases and typos as unknown, and skip frameworks not loaded yet", () => {
    expect(unknownCodes({ ccss: ["2.MD.C.8"], fl: ["not-checked-yet"] })).toEqual([]);
    expect(unknownCodes({ tx: ["3.4F", "3.4(F)"] })).toEqual([{ framework: "tx", code: "3.4(F)", canonical: "3.4F" }]);
    expect(unknownCodes({ ccss: ["2.MD.8", "2.MD.C.80"] })).toEqual([
      { framework: "ccss", code: "2.MD.8", canonical: "2.MD.C.8" },
      { framework: "ccss", code: "2.MD.C.80" },
    ]);
  });

  it("mark anything not fully in scope with a reason", () => {
    for (const s of [...standardsFor("ccss"), ...standardsFor("tx")]) {
      if (s.in_scope !== "yes") expect(s.scope_note, s.code).toBeTruthy();
    }
    expect(standardByCode("ccss", "K.G.B.5").in_scope).toBe("no");
  });
});

describe("the Texas crosswalk", () => {
  it("links real codes, once each, with a known match", () => {
    expect(validateCrosswalk("tx")).toEqual([]);
  });

  it("calls the fluency codes the same as Common Core's", () => {
    const match = (code, ccss) => crosswalkFor("tx").find((l) => l.code === code && l.ccss_code === ccss)?.match;
    expect(match("1.3D", "1.OA.C.6")).toBe("same");
    expect(match("2.4A", "2.OA.B.2")).toBe("same");
    expect(match("3.4F", "3.OA.C.7")).toBe("same");
    // Texas money stops at coins to $1 in Grade 2; Common Core adds bills.
    expect(match("2.5A", "2.MD.C.8")).toBe("narrower");
  });

  it("leaves process standards unlinked", () => {
    expect(crosswalkFor("tx").filter((l) => /^[K1-5]\.1[A-G]$/.test(l.code))).toEqual([]);
  });
});

describe("every code the app cites is a real code", () => {
  it("item models", () => {
    const bad = [];
    for (const m of allModels()) {
      for (const u of unknownCodes(m.standards)) bad.push(`${m._file} ${m.id}: ${u.framework} ${u.code}${u.canonical ? ` (write ${u.canonical})` : ""}`);
    }
    expect(bad).toEqual([]);
  });

  it("catalog skills", () => {
    const bad = [];
    for (const skill of WORKSHEET_SKILLS) {
      for (const code of [].concat(skill.ccss || [])) {
        if (!standardByCode("ccss", code)) bad.push(`${skill.id}: ${code}`);
      }
    }
    expect(bad).toEqual([]);
  });

  it("blueprint rows", () => {
    const ids = new Set();
    const bad = [];
    for (const row of BLUEPRINT_ROWS) {
      if (ids.has(row.id)) bad.push(`${row.id}: duplicate id`);
      ids.add(row.id);
      for (const e of validateBlueprintRow(row)) bad.push(`${row.id}: ${e}`);
      for (const u of unknownCodes(row.standards)) bad.push(`${row.id}: ${u.framework} ${u.code}`);
    }
    expect(bad).toEqual([]);
  });
});

describe("the fact fluency rows", () => {
  const fluency = BLUEPRINT_ROWS.filter((r) => r.track === "fluency");
  const facts = (op, band) =>
    fluency.filter((r) => r.spec.op === op && (!band || r.spec.band === band)).reduce((n, r) => n + r.spec.facts, 0);

  it("cover every fact once, in the plan's totals", () => {
    // Ordered facts, both turnarounds counted: 0-10 addends; 0-10 or 0-12 factors.
    expect(facts("add")).toBe(121);
    expect(facts("sub")).toBe(121);
    expect(facts("mul", "core")).toBe(121);
    expect(facts("mul", "ext")).toBe(48);
    expect(facts("div", "core")).toBe(110);
    expect(facts("div", "ext")).toBe(46);
  });

  it("link each fact band to the Common Core fluency codes that ask for it", () => {
    const ccss = (id) => BLUEPRINT_ROWS.find((r) => r.id === id).standards.ccss;
    expect(ccss("facts-add-zero-to5")).toEqual(["K.OA.A.5", "1.OA.C.6", "2.OA.B.2"]);
    expect(ccss("facts-sub-maketen87-11to20")).toEqual(["1.OA.C.6", "2.OA.B.2"]);
    expect(ccss("facts-div-lastone")).toEqual(["3.OA.C.7"]);
    // 11s and 12s are a Florida and Virginia ask; Common Core stops at 10 x 10.
    expect(ccss("facts-mul-times12")).toEqual([]);
    for (const r of fluency) {
      for (const fw of ["ccss", "tx"]) {
        for (const code of r.standards[fw]) expect(standardByCode(fw, code).kind, `${r.id} ${fw} ${code}`).toBe("fluency");
      }
    }
  });
});

describe("the load", () => {
  it("writes one row per code and one link per row and loaded code", () => {
    expect(standardsDbRows()).toHaveLength(standardsFor("ccss").length + standardsFor("tx").length);
    expect(crosswalkDbRows()).toHaveLength(crosswalkFor("tx").length);
    const links = blueprintStandardDbRows();
    expect(links.every((l) => LOADED_FRAMEWORKS.includes(l.framework))).toBe(true);
    expect(new Set(links.map((l) => `${l.blueprint_id}|${l.framework}|${l.code}`)).size).toBe(links.length);
  });

  it("quotes values safely and keeps reviewed blueprint rows", () => {
    expect(sqlLiteral("can't")).toBe("'can''t'");
    expect(sqlLiteral(null)).toBe("null");
    expect(sqlLiteral(["a", "b'c"])).toBe("array['a', 'b''c']::text[]");
    expect(sqlLiteral([])).toBe("'{}'::text[]");
    expect(sqlLiteral({ a: "it's" })).toBe(`'{"a":"it''s"}'::jsonb`);
    const sql = loadSql();
    expect(sql.startsWith("begin;")).toBe(true);
    expect(sql.trim().endsWith("commit;")).toBe(true);
    expect(sql).toContain("where public.blueprint_rows.status = 'draft'");
    expect(sql).not.toContain("delete from public.standards");
    expect(loadSql({ prune: true })).toContain("delete from public.standards");
    expect(checkSql()).toContain("'missing code'");
    expect(checkSql()).toContain("'changed link'");
  });
});

describe("the Standards tab's arithmetic", () => {
  const row = (code, status, extra = {}) => ({ code, status, inScope: "yes", parentCode: null, ...extra });

  it("counts codes through their sub-parts and leaves out-of-scope codes out of the percentage", () => {
    const rows = [
      row("3.NF.A.2", "not_planned"),
      row("3.NF.A.2a", "covered", { parentCode: "3.NF.A.2" }),
      row("3.NF.A.2b", "building", { parentCode: "3.NF.A.2" }),
      row("3.OA.C.7", "covered"),
      row("K.G.B.5", "out_of_scope", { inScope: "no" }),
    ];
    const t = coverageTotals(rows);
    expect(t.codes).toBe(4);
    expect(t.inScope).toBe(3);
    expect(t.covered).toBe(2);
    expect(t.percent).toBe(67);
    expect(t.byStatus.building).toBe(1);
    expect(t.byStatus.not_planned).toBe(0);
    expect(coverageTotals([]).percent).toBe(0);
  });

  it("maps the view's row and labels every status", () => {
    const r = rowToCoverage({ framework: "ccss", code: "2.MD.C.8", grade: "2", planned_rows: 3, models_approved: 26, status: "building" });
    expect(r).toMatchObject({ code: "2.MD.C.8", plannedRows: 3, modelsApproved: 26, itemsLive: 0, status: "building" });
    for (const s of COVERAGE_STATUSES) expect(statusLabel(s.id)).toBe(s.label);
  });

  it("finds today's catalog skills for a Common Core code", () => {
    expect(catalogSkillsFor("3.OA.C.7").length).toBeGreaterThan(0);
    expect(catalogSkillsFor("K.G.B.5")).toEqual([]);
  });
});
