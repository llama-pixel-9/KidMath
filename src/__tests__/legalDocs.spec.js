import { describe, it, expect } from "vitest";
import { LEGAL_DOCS, CURRENT_CONSENT_VERSIONS } from "../legal/index.js";
import { ENTITY, fillTokens } from "../legal/entity.js";

/**
 * ⚠️ Add this file to the `test` script's file list in package.json — that
 * list is hand-maintained, not a glob, so a spec that isn't listed silently
 * never runs.
 *
 * These are cheap guards against the three ways legal documents rot:
 * a version string drifting from the document it labels, a placeholder
 * shipping to production, and a token nobody defined.
 */

const docs = Object.values(LEGAL_DOCS);

describe("legal documents", () => {
  it("every document declares a version that matches its markdown header", () => {
    for (const doc of docs) {
      const declared = /\*\*Version:\*\*\s*(\S+)/.exec(doc.markdown)?.[1];
      expect(declared, `${doc.slug}: no "**Version:**" line in the markdown`).toBeDefined();
      expect(declared, `${doc.slug}: registry version !== markdown version`).toBe(doc.version);
    }
  });

  it("every document has an effective date and a title", () => {
    for (const doc of docs) {
      expect(doc.markdown, `${doc.slug}: missing effective date`).toMatch(/\*\*Effective date:\*\*/);
      expect(doc.markdown.trimStart(), `${doc.slug}: must open with an H1`).toMatch(/^# \S/);
    }
  });

  it("leaves no unresolved {{TOKENS}} after substitution", () => {
    for (const doc of docs) {
      const unresolved = fillTokens(doc.markdown).match(/\{\{\w+\}\}/g);
      expect(unresolved, `${doc.slug}: undefined tokens ${unresolved?.join(", ")}`).toBeNull();
    }
  });

  it("consent versions point at real documents", () => {
    expect(CURRENT_CONSENT_VERSIONS.terms).toBe(LEGAL_DOCS.terms.version);
    expect(CURRENT_CONSENT_VERSIONS.privacy).toBe(LEGAL_DOCS.privacy.version);
  });

  it("the privacy policy retains every COPPA §312.4(d) element", () => {
    const md = LEGAL_DOCS.privacy.markdown;
    // (d)(1) operator identity — all four elements. The telephone number is
    // the one operators most often drop; assert it explicitly.
    expect(md).toMatch(/\*\*Telephone\*\*/);
    expect(md).toMatch(/\*\*Address\*\*/);
    // (d)(2) named third parties — categories alone are not sufficient in the
    // ONLINE notice, only in the direct notice.
    for (const vendor of ["Supabase", "Vercel", "Stripe", "Apple", "Google"]) {
      expect(md, `privacy policy must name ${vendor}`).toContain(vendor);
    }
    // (d)(2) retention policy, published in the notice, with real timeframes.
    expect(md).toMatch(/Data retention and deletion/i);
    expect(md).toMatch(/do not retain children's personal information indefinitely/i);
    for (const period of ["30 days", "90 days", "24 months", "7 years"]) {
      expect(md, `retention schedule must state ${period}`).toContain(period);
    }
    // (d)(3) persistent identifiers — specific internal operations AND the
    // means of preventing other uses.
    expect(md).toMatch(/support for internal operations/i);
    expect(md).toMatch(/312\.5\(c\)\(7\)/);
    // §312.6 parental rights.
    expect(md).toMatch(/Parental rights and how to exercise them/i);
    // §312.5(a)(2) unbundled consent.
    expect(md).toMatch(/without consenting to disclosure/i);
    // CalOPPA §22575(b)(5) Do Not Track disclosure — no size threshold, so
    // this one binds regardless of how small we are.
    expect(md).toMatch(/Do Not Track/);
  });

  it("the parental consent notice retains every COPPA §312.4(c)(1) element", () => {
    const md = LEGAL_DOCS["parental-consent"].markdown;
    expect(md).toMatch(/collected your email address for the sole purpose of obtaining your consent/i);
    expect(md).toMatch(/Your consent is required/i);
    expect(md).toMatch(/What we intend to collect/i);
    expect(md).toMatch(/How we intend to use it/i);
    expect(md).toMatch(/consent to our collection and use .* without consenting to the disclosure/is);
    expect(md).toMatch(/How to give your consent/i);
    expect(md).toMatch(/delete your and your child's online contact information/i);
    expect(md).toMatch(/\/privacy/); // hyperlink to the online notice
  });

  it("the terms retain the load-bearing consumer-protection clauses", () => {
    const md = LEGAL_DOCS.terms.markdown;
    // ARL / ROSCA: online cancellation, one step, no harder than signup.
    expect(md).toMatch(/Cancellation is available online, in a single step/i);
    expect(md).toMatch(/AUTOMATICALLY RENEWING SUBSCRIPTION/);
    // No unilateral amendment — the clause that kills the FERPA "direct
    // control" test in district review if it ever creeps back in.
    expect(md).toMatch(/do not reserve the right to bind you to material changes/i);
    // Conspicuous disclaimer must name merchantability (UCC §2-316(2)).
    expect(md).toMatch(/MERCHANTABILITY/);
    expect(md).toMatch(/DISCLAIMER OF WARRANTIES/);
    expect(md).toMatch(/LIMITATION OF LIABILITY/);
    // Arbitration must keep its opt-out; without one, enforceability suffers.
    expect(md).toMatch(/CLASS ACTION WAIVER/);
    expect(md).toMatch(/thirty \(30\) days/);
    expect(md).toMatch(/Arbitration Opt-Out/);
    // Infancy-doctrine backstop.
    expect(md).toMatch(/disaffirm/i);
    // Statutory notices.
    expect(md).toMatch(/1789\.3/);
    expect(md).toMatch(/Complaint Assistance Unit/);
    expect(md).toMatch(/7001/); // E-SIGN
    // Apple's required rider.
    expect(md).toMatch(/third-party beneficiaries of these Terms/i);
    expect(md).toMatch(/no obligation whatsoever to furnish any maintenance/i);
  });

  it("has no unfilled entity placeholders", () => {
    // Guards against shipping the scaffold values. Delete the Example St
    // assertion once you have set a real address.
    for (const [key, value] of Object.entries(ENTITY)) {
      expect(value, `ENTITY.${key} is empty`).toBeTruthy();
      expect(value, `ENTITY.${key} still contains a TODO`).not.toMatch(/TODO|CHANGEME|XXX/i);
    }
    expect(
      ENTITY.ENTITY_ADDRESS,
      "ENTITY_ADDRESS is still the scaffold placeholder — set a real address before launch"
    ).not.toMatch(/Example St/i);
  });
});
