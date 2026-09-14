import { describe, it, expect } from "vitest";
import {
  buildAutoRenewalDisclosure,
  planButtonsDisabled,
  formatDisclosureDate,
  AUTORENEW_ACK_DEFAULT,
  PLAN_IDS,
  TRIAL_DAYS,
  normalizePlanPricing,
  perMonthOfAnnual,
  annualSavingsPercent,
} from "../legal/disclosures.js";

// The auto-renewal disclosure is a legal instrument, not copy. These tests
// hold the three lines the statutes draw: the checkbox starts unticked, the
// purchase buttons stay dead until it is ticked, and the rendered disclosure
// carries real dates and amounts rather than relative phrases.

const FIXED_NOW = new Date("2026-08-05T12:00:00Z");

// What the stripe-prices Edge Function returns for the locked prices.
const STRIPE_PRICES = {
  monthly: { id: "price_m", cents: 899, currency: "USD", amount: "$8.99", interval: "month", intervalCount: 1 },
  annual: { id: "price_a", cents: 5499, currency: "USD", amount: "$54.99", interval: "year", intervalCount: 1 },
};
const PRICING = normalizePlanPricing(STRIPE_PRICES);
// 14 days after Aug 5 2026.
const MONTH_DAY_YEAR = /(January|February|March|April|May|June|July|August|September|October|November|December) \d{1,2}, \d{4}/;

describe("auto-renewal checkbox default", () => {
  it("is unchecked — never pre-ticked", () => {
    expect(AUTORENEW_ACK_DEFAULT).toBe(false);
  });
});

describe("planButtonsDisabled", () => {
  it("keeps plan buttons disabled at the default (unticked) state", () => {
    expect(planButtonsDisabled({ autoRenewAck: AUTORENEW_ACK_DEFAULT })).toBe(true);
  });

  it("enables plan buttons only once the box is ticked", () => {
    expect(planButtonsDisabled({ autoRenewAck: false })).toBe(true);
    expect(planButtonsDisabled({ autoRenewAck: true })).toBe(false);
  });

  it("stays disabled while a checkout is in flight", () => {
    expect(planButtonsDisabled({ autoRenewAck: true, busy: true })).toBe(true);
  });

  it("stays disabled until real prices have loaded from Stripe", () => {
    expect(planButtonsDisabled({ autoRenewAck: true, pricing: null })).toBe(true);
    expect(planButtonsDisabled({ autoRenewAck: true, pricing: PRICING })).toBe(false);
  });
});

describe("normalizePlanPricing", () => {
  it("maps the stripe-prices payload to disclosure pricing", () => {
    expect(PRICING.annual).toEqual({ amount: "$54.99", period: "year", cents: 5499, currency: "USD" });
    expect(PRICING.monthly).toEqual({ amount: "$8.99", period: "month", cents: 899, currency: "USD" });
  });

  it("refuses a missing or malformed plan rather than guessing", () => {
    expect(() => normalizePlanPricing({ monthly: STRIPE_PRICES.monthly })).toThrow(/annual/);
    expect(() => normalizePlanPricing({ ...STRIPE_PRICES, annual: { ...STRIPE_PRICES.annual, interval: "week" } })).toThrow();
    expect(() => normalizePlanPricing({ ...STRIPE_PRICES, annual: { ...STRIPE_PRICES.annual, intervalCount: 2 } })).toThrow();
    expect(() => normalizePlanPricing(null)).toThrow();
  });

  it("derives the plan-card math from the loaded cents", () => {
    expect(perMonthOfAnnual(PRICING)).toBe("$4.58");
    expect(annualSavingsPercent(PRICING)).toBe(49);
    const founding = normalizePlanPricing({ ...STRIPE_PRICES, annual: { ...STRIPE_PRICES.annual, cents: 3999, amount: "$39.99" } });
    expect(perMonthOfAnnual(founding)).toBe("$3.33");
    expect(annualSavingsPercent(founding)).toBe(63);
  });
});

describe("buildAutoRenewalDisclosure", () => {
  it("renders the trial end as a formatted calendar date, not a relative phrase", () => {
    const { label } = buildAutoRenewalDisclosure("annual", { now: FIXED_NOW, pricing: PRICING });
    expect(label).toMatch(MONTH_DAY_YEAR);
    expect(label).toContain("ends on August 19, 2026");
    // The trial length is required too — but never as the only time reference.
    expect(label).toContain(`${TRIAL_DAYS}-day free trial`);
  });

  it("states the exact first-charge amount and date", () => {
    const { label } = buildAutoRenewalDisclosure("annual", { now: FIXED_NOW, pricing: PRICING });
    expect(label).toContain("charged $54.99 on August 19, 2026");
  });

  it("states the renewal frequency and amount, and that it renews until cancelled", () => {
    const annual = buildAutoRenewalDisclosure("annual", { now: FIXED_NOW, pricing: PRICING });
    expect(annual.label).toContain("renews at $54.99 per year until I cancel");
    const monthly = buildAutoRenewalDisclosure("monthly", { now: FIXED_NOW, pricing: PRICING });
    expect(monthly.label).toContain("renews at $8.99 per month until I cancel");
  });

  it("returns machine-readable dates for the consent_events meta", () => {
    const d = buildAutoRenewalDisclosure("monthly", { now: FIXED_NOW, pricing: PRICING });
    expect(d.trialEndsOn).toBe("2026-08-19");
    expect(d.firstChargeOn).toBe("2026-08-19");
    expect(d.price).toBe("$8.99/month");
  });

  it("covers exactly the locked plans", () => {
    expect([...PLAN_IDS].sort()).toEqual(["annual", "monthly"]);
    expect(() => buildAutoRenewalDisclosure("weekly", { pricing: PRICING })).toThrow();
  });

  it("states whatever Stripe is configured to charge — never a literal", () => {
    const founding = normalizePlanPricing({ ...STRIPE_PRICES, annual: { ...STRIPE_PRICES.annual, cents: 3999, amount: "$39.99" } });
    const { label, price } = buildAutoRenewalDisclosure("annual", { now: FIXED_NOW, pricing: founding });
    expect(label).toContain("charged $39.99 on August 19, 2026");
    expect(label).toContain("renews at $39.99 per year until I cancel");
    expect(price).toBe("$39.99/year");
  });

  it("refuses to build a disclosure without loaded pricing", () => {
    expect(() => buildAutoRenewalDisclosure("annual", { now: FIXED_NOW })).toThrow(/pricing/);
  });
});

describe("formatDisclosureDate", () => {
  it("produces Month D, YYYY", () => {
    expect(formatDisclosureDate(new Date(2026, 7, 19))).toBe("August 19, 2026");
  });
});
