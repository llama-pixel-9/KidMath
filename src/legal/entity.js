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
  // TODO: exact name as registered with the state, including the suffix.
  ENTITY_NAME: "Larkit LLC",

  // TODO: state of formation. Also the governing law in the Terms.
  ENTITY_STATE: "Delaware",

  // TODO: a real mailing address. A registered-agent or virtual-office
  // address is fine; a PO box is accepted by most, but Apple's App Store
  // Connect and several ARL statutes expect a street address.
  ENTITY_ADDRESS: "1234 Example St, Suite 100, Wilmington, DE 19801",

  // TODO: a monitored telephone number. NOT optional — 16 CFR §312.4(d)(1)
  // requires the online notice to state "the name, address, telephone number,
  // and email address of all operators." The telephone number is the element
  // operators most often omit. A Google Voice line that forwards is fine.
  ENTITY_PHONE: "(555) 555-0100",

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
