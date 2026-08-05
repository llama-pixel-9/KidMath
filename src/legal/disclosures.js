/**
 * Auto-renewal disclosure builder — the single source of the literal string a
 * subscriber sees next to the auto-renewal checkbox, on every surface that
 * starts a subscription (PaywallModal, OnboardingFlow's plan step; mirrored
 * in Swift by AutoRenewalDisclosure.swift).
 *
 * State auto-renewal statutes (CA B&P §17602 and friends) require, before the
 * card field: that it auto-renews until cancelled; the trial length AND the
 * actual end date rendered as a date; the exact first-charge amount AND date;
 * and the renewal frequency and amount. The same literal string is what gets
 * stored in consent_events via logConsent — "$8.99/mo" proves nothing,
 * "first charge $8.99 on August 19, 2026" proves what the subscriber saw.
 */

export const TRIAL_DAYS = 14;

/** Pricing is locked (CLAUDE.md): $8.99/mo · $54.99/yr, all kids included. */
export const PLAN_PRICING = {
  annual: { amount: "$54.99", period: "year" },
  monthly: { amount: "$8.99", period: "month" },
};

/** The auto-renewal checkbox must NEVER start ticked — California requires
 *  the consent to be its own affirmative act. Components read their initial
 *  checkbox state from here so the spec can hold the line. */
export const AUTORENEW_ACK_DEFAULT = false;

/** "August 19, 2026" — a real date, never a relative phrase. */
export function formatDisclosureDate(date) {
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Build the full disclosure for one plan. `now` is injectable for tests;
 * callers use the real clock so the rendered date is the subscriber's actual
 * trial end.
 */
export function buildAutoRenewalDisclosure(plan, { now = new Date() } = {}) {
  const pricing = PLAN_PRICING[plan];
  if (!pricing) throw new Error(`Unknown plan: ${plan}`);
  const trialEnds = new Date(now.getTime() + TRIAL_DAYS * 864e5);
  const endsOn = formatDisclosureDate(trialEnds);
  const label =
    `I understand that my ${TRIAL_DAYS}-day free trial ends on ${endsOn}, ` +
    `that my payment method will then be charged ${pricing.amount} on ${endsOn}, ` +
    `and that my subscription automatically renews at ${pricing.amount} per ${pricing.period} until I cancel.`;
  return {
    plan,
    label,
    price: `${pricing.amount}/${pricing.period}`,
    trialDays: TRIAL_DAYS,
    trialEndsOn: trialEnds.toISOString().slice(0, 10),
    firstChargeOn: trialEnds.toISOString().slice(0, 10),
  };
}

/** Plan/purchase buttons stay dead until the auto-renewal box is ticked. */
export function planButtonsDisabled({ autoRenewAck, busy = false }) {
  return busy || !autoRenewAck;
}

/** The literal sentence rendered beside the OAuth buttons at account
 *  creation — logged with kind "account". Keep in sync with SignupPage. */
export const ACCOUNT_CONSENT_TEXT =
  "By continuing you agree to the Terms of Service and Privacy Policy. " +
  "We never show ads and never sell data about your kids.";
