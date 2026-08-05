import { describe, it, expect } from "vitest";
import {
  buildAutoRenewalDisclosure,
  planButtonsDisabled,
  formatDisclosureDate,
  AUTORENEW_ACK_DEFAULT,
  PLAN_PRICING,
  TRIAL_DAYS,
} from "../legal/disclosures.js";

// The auto-renewal disclosure is a legal instrument, not copy. These tests
// hold the three lines the statutes draw: the checkbox starts unticked, the
// purchase buttons stay dead until it is ticked, and the rendered disclosure
// carries real dates and amounts rather than relative phrases.

const FIXED_NOW = new Date("2026-08-05T12:00:00Z");
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
});

describe("buildAutoRenewalDisclosure", () => {
  it("renders the trial end as a formatted calendar date, not a relative phrase", () => {
    const { label } = buildAutoRenewalDisclosure("annual", { now: FIXED_NOW });
    expect(label).toMatch(MONTH_DAY_YEAR);
    expect(label).toContain("ends on August 19, 2026");
    // The trial length is required too — but never as the only time reference.
    expect(label).toContain(`${TRIAL_DAYS}-day free trial`);
  });

  it("states the exact first-charge amount and date", () => {
    const { label } = buildAutoRenewalDisclosure("annual", { now: FIXED_NOW });
    expect(label).toContain("charged $54.99 on August 19, 2026");
  });

  it("states the renewal frequency and amount, and that it renews until cancelled", () => {
    const annual = buildAutoRenewalDisclosure("annual", { now: FIXED_NOW });
    expect(annual.label).toContain("renews at $54.99 per year until I cancel");
    const monthly = buildAutoRenewalDisclosure("monthly", { now: FIXED_NOW });
    expect(monthly.label).toContain("renews at $8.99 per month until I cancel");
  });

  it("returns machine-readable dates for the consent_events meta", () => {
    const d = buildAutoRenewalDisclosure("monthly", { now: FIXED_NOW });
    expect(d.trialEndsOn).toBe("2026-08-19");
    expect(d.firstChargeOn).toBe("2026-08-19");
    expect(d.price).toBe("$8.99/month");
  });

  it("covers exactly the locked plans", () => {
    expect(Object.keys(PLAN_PRICING).sort()).toEqual(["annual", "monthly"]);
    expect(() => buildAutoRenewalDisclosure("weekly")).toThrow();
  });
});

describe("formatDisclosureDate", () => {
  it("produces Month D, YYYY", () => {
    expect(formatDisclosureDate(new Date(2026, 7, 19))).toBe("August 19, 2026");
  });
});
