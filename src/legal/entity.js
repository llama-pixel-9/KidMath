/**
 * Legal entity + contact details, in ONE place.
 *
 * Every legal document (privacy policy, terms, VDP) references these as
 * {{TOKENS}}; `renderLegal` substitutes them at render time. Fill these in
 * once and all three documents update together — no find-and-replace across
 * markdown, no risk of the Terms naming a different entity than the paywall.
 *
 * ⚠️ The four TODO values below MUST be real before you collect a dollar.
 * State auto-renewal laws require the *legal business name* in the checkout
 * disclosure and the confirmation email, and a Terms of Service with a
 * placeholder contracting party is not an enforceable contract.
 */
export const ENTITY = {
  // Exact name as registered with the Commonwealth of Pennsylvania.
  ENTITY_NAME: "Larkit Labs LLC",

  // State of formation. Also the governing law in the Terms.
  ENTITY_STATE: "Pennsylvania",

  ENTITY_ADDRESS: "502 W 7th St, Ste 100, Erie, PA 16502-1333",

  // Monitored telephone number. NOT optional — 16 CFR §312.4(d)(1) requires
  // the online notice to state "the name, address, telephone number, and
  // email address of all operators." Set 2026-09-13.
  ENTITY_PHONE: "(814) 273-8760",

  // TODO: confirm these mailboxes exist and are monitored. `privacy@` is
  // named in the privacy policy as the deletion-request channel, which
  // creates a 30-day obligation the moment mail arrives. `legal@` is the
  // address of record for arbitration opt-out notices under Terms §19.7 —
  // a missed opt-out notice can invalidate the arbitration agreement.
  PRIVACY_EMAIL: "privacy@larkit.io",
  SUPPORT_EMAIL: "support@larkit.io",
  SECURITY_EMAIL: "security@larkit.io",
  LEGAL_EMAIL: "legal@larkit.io",

  PRODUCT_NAME: "larkit",
  SITE_URL: "https://larkit.io",
};

/** Substitute {{TOKENS}} in a markdown string. Unknown tokens are left as-is
 *  and are loud on the page, which is the point — you should notice them. */
export function fillTokens(markdown) {
  return markdown.replace(/\{\{(\w+)\}\}/g, (whole, key) =>
    Object.prototype.hasOwnProperty.call(ENTITY, key) ? ENTITY[key] : whole
  );
}
