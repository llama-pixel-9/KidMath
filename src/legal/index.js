import privacyMd from "./privacy-policy.md?raw";
import termsMd from "./terms-of-service.md?raw";
import securityMd from "./vulnerability-disclosure.md?raw";
import consentMd from "./parental-consent-notice.md?raw";
import { fillTokens } from "./entity.js";

/**
 * The legal document registry.
 *
 * Every document has a `version` string. That version is what gets recorded
 * against a user's consent event, so that if anyone ever asks "what exactly
 * did this parent agree to on the day they subscribed?", the answer is a
 * lookup, not an archaeology project. California requires you to be able to
 * answer that question for 3 years (or 1 year post-termination, whichever is
 * longer) — see `logConsent` below.
 *
 * ⚠️ RULE: if you change the *substance* of a document, bump its version.
 * Fixing a typo doesn't need a bump; changing what you collect, what you
 * charge, or how someone cancels absolutely does. The version must match the
 * "**Version:**" line at the top of the markdown file — `legalDocs.spec.js`
 * enforces that, so a mismatch fails CI rather than shipping.
 */
export const LEGAL_DOCS = {
  privacy: {
    slug: "privacy",
    title: "Privacy Policy",
    version: "2026-08-05",
    markdown: privacyMd,
    // Doubles as the COPPA online notice under 16 CFR §312.4(d). A link to it
    // must appear on the home screen AND at every point where personal
    // information is collected from a child — §312.4(d) is explicit that one
    // footer link is not enough.
  },
  terms: {
    slug: "terms",
    title: "Terms of Service",
    version: "2026-08-05",
    markdown: termsMd,
  },
  security: {
    slug: "security",
    title: "Vulnerability Disclosure Policy",
    version: "2026-08-05",
    markdown: securityMd,
  },
  "parental-consent": {
    slug: "parental-consent",
    title: "Parental Consent Notice",
    version: "2026-08-05",
    markdown: consentMd,
    /**
     * The DIRECT notice under 16 CFR §312.4(c)(1) — a distinct legal
     * instrument from the online notice, and one that must be *delivered to
     * the parent*, not merely posted. Send it by email when the parent begins
     * creating their first child profile; the published copy exists so the
     * Privacy Policy can link to it.
     *
     * The seven statutory elements, and where each lives in the document —
     * check these still hold before editing:
     *   (i)   contact info collected to obtain consent ......... "About this notice"
     *   (ii)  parental consent is required .................... "About this notice"
     *   (iii) items collected, use, disclosure opportunities .. §§1–3
     *   (iv)  third-party identities/categories + purposes,
     *         AND the right to consent to collection without
     *         consenting to third-party disclosure ........... §3
     *   (v)   hyperlink to the online notice .................. §7
     *   (vi)  means of providing verifiable consent ........... §4
     *   (vii) deletion of contact info if no consent .......... §5
     */
  },
};

/** The pair a parent accepts at signup and at checkout. Bump-safe: read this
 *  rather than hardcoding version strings at the call sites. */
export const CURRENT_CONSENT_VERSIONS = {
  privacy: LEGAL_DOCS.privacy.version,
  terms: LEGAL_DOCS.terms.version,
};

export function getLegalDoc(slug) {
  const doc = LEGAL_DOCS[slug];
  if (!doc) return null;
  return { ...doc, markdown: fillTokens(doc.markdown) };
}

/**
 * Record what a user agreed to, when, and what they were shown.
 *
 * Call this at exactly two moments:
 *   1. account creation  — kind: "account"    (terms + privacy acceptance)
 *   2. subscribe confirm — kind: "autorenew"  (the SEPARATE auto-renewal tick)
 *
 * `disclosureText` should be the literal string rendered next to the checkbox,
 * not a summary of it. That is the whole point — you are preserving evidence
 * of what the person actually read. Store the rendered price and dates too;
 * "$8.99/mo" is not enough, "first charge $8.99 on 2026-08-17" is.
 *
 * Requires the `consent_events` table (see docs/legal-implementation.md).
 * Never throws — a logging failure must not block a signup, but it should be
 * loud in the console so you notice it in staging.
 */
export async function logConsent(supabase, { userId, kind, disclosureText, meta = {} }) {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from("consent_events")
      .insert({
        user_id: userId,
        kind,
        terms_version: CURRENT_CONSENT_VERSIONS.terms,
        privacy_version: CURRENT_CONSENT_VERSIONS.privacy,
        disclosure_text: disclosureText,
        user_agent: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 500) : null,
        meta,
      })
      .select("id, created_at")
      .single();
    if (error) throw error;
    return data;
  } catch (e) {
    console.error("[legal] consent logging failed — investigate:", e);
    return null;
  }
}
