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

/**
 * The two plans we sell. Amounts are NOT literals in the client: they come
 * from Stripe via the `stripe-prices` Edge Function (see fetchPlanPricing in
 * premium.js), which resolves the same lookup keys checkout sells, so the
 * paywall, the disclosure, and the charge can never disagree. A plan's `period` is what the disclosure says after "per".
 */
export const PLAN_IDS = ["annual", "monthly"];
const INTERVAL_PERIOD = { year: "year", month: "month" };

/**
 * Shape the `stripe-prices` response into what the disclosure builder needs:
 * `{ annual: { amount: "$54.99", period: "year", cents }, monthly: {...} }`.
 * Throws if either plan is missing or malformed — the caller must then keep
 * the purchase buttons disabled rather than show a guessed number.
 */
export function normalizePlanPricing(raw) {
  const out = {};
  for (const plan of PLAN_IDS) {
    const p = raw?.[plan];
    const period = INTERVAL_PERIOD[p?.interval];
    if (!p || typeof p.amount !== "string" || !Number.isInteger(p.cents) || !period) {
      throw new Error(`Plan pricing for "${plan}" is missing or malformed`);
    }
    if (p.intervalCount != null && p.intervalCount !== 1) {
      throw new Error(`Plan "${plan}" must bill every 1 ${p.interval}`);
    }
    out[plan] = { amount: p.amount, period, cents: p.cents, currency: p.currency };
  }
  return out;
}

/** "$4.58" — the annual price spread over 12 months, for the plan card. */
export function perMonthOfAnnual(pricing) {
  const cents = Math.round(pricing.annual.cents / 12);
  return formatCents(cents, pricing.annual.currency);
}

/** Whole-percent saving of annual vs 12 × monthly; 0 if annual isn't cheaper. */
export function annualSavingsPercent(pricing) {
  const yearOfMonthly = pricing.monthly.cents * 12;
  if (yearOfMonthly <= 0 || pricing.annual.cents >= yearOfMonthly) return 0;
  return Math.round((1 - pricing.annual.cents / yearOfMonthly) * 100);
}

function formatCents(cents, currency = "USD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(cents / 100);
}

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
 * Build the full disclosure for one plan. `pricing` is the normalized Stripe
 * pricing (normalizePlanPricing) — required, never defaulted, so a disclosure
 * can only ever state what Stripe will actually charge. `now` is injectable
 * for tests; callers use the real clock so the rendered date is the
 * subscriber's actual trial end.
 */
export function buildAutoRenewalDisclosure(plan, { now = new Date(), pricing: planPricing } = {}) {
  if (!PLAN_IDS.includes(plan)) throw new Error(`Unknown plan: ${plan}`);
  const pricing = planPricing?.[plan];
  if (!pricing) throw new Error(`No pricing loaded for plan: ${plan}`);
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
export function planButtonsDisabled({ autoRenewAck, busy = false, pricing = undefined }) {
  // `pricing === null` means "not loaded from Stripe yet" — no purchase
  // without a real, disclosed amount. Callers that pre-load may omit it.
  if (pricing === null) return true;
  return busy || !autoRenewAck;
}

/** The literal sentence rendered beside the OAuth buttons at account
 *  creation — logged with kind "account". Keep in sync with SignupPage. */
export const ACCOUNT_CONSENT_TEXT =
  "By continuing you agree to the Terms of Service and Privacy Policy. " +
  "We never show ads and never sell data about your kids.";
