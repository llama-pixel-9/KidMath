import { describe, it, expect } from "vitest";
import {
  buildSubscriptionStartedEmail,
  formatEmailDate,
} from "../../supabase/functions/_shared/billingEmails.ts";

// The subscription-started acknowledgment is a legal instrument (CA B&P
// §17602(a)(3) and siblings): a retainable copy of the auto-renewal terms
// with real dates and amounts, plus how to cancel, delivered right after
// signup. The plain-text part is what we would produce in a dispute.

const TRIAL_END = new Date("2026-09-27T17:59:24Z");
const BASE = {
  to: "parent@example.com",
  amount: "$39.99",
  interval: "year",
  trialEndsAt: TRIAL_END,
  billingUrl: "https://larkit.io/account/billing",
  appBaseUrl: "https://larkit.io",
};

describe("buildSubscriptionStartedEmail", () => {
  it("states the trial end as a calendar date and the exact first charge", () => {
    const { text, subject } = buildSubscriptionStartedEmail(BASE);
    expect(text).toContain("Your free trial ends on September 27, 2026");
    expect(text).toContain("charged $39.99 on that date");
    expect(subject).toContain("$39.99");
    expect(subject).toContain("September 27, 2026");
    expect(text).not.toMatch(/in 14 days|two weeks/i);
  });

  it("states the renewal amount, frequency, and that it continues until cancelled", () => {
    const annual = buildSubscriptionStartedEmail(BASE);
    expect(annual.text).toContain("renews automatically at $39.99 per year until you cancel");
    const monthly = buildSubscriptionStartedEmail({ ...BASE, amount: "$8.99", interval: "month" });
    expect(monthly.text).toContain("renews automatically at $8.99 per month until you cancel");
    expect(monthly.text).toContain("monthly plan");
  });

  it("tells the subscriber how to cancel, in the same medium, with the link", () => {
    const { text, html } = buildSubscriptionStartedEmail(BASE);
    expect(text).toContain("Cancel any time in one step at https://larkit.io/account/billing");
    expect(text).toMatch(/no phone call, no survey/);
    expect(html).toContain('href="https://larkit.io/account/billing"');
  });

  it("handles a no-trial start as a charge today", () => {
    const { text, subject } = buildSubscriptionStartedEmail({ ...BASE, trialEndsAt: null });
    expect(text).toContain("has been charged $39.99 today");
    expect(subject).not.toContain("trial");
  });

  it("carries the operator identity and the legal links", () => {
    const { text } = buildSubscriptionStartedEmail(BASE);
    expect(text).toContain("Larkit Labs LLC");
    expect(text).toContain("(814) 273-8760");
    expect(text).toContain("https://larkit.io/terms");
    expect(text).toContain("https://larkit.io/privacy");
  });

  it("keeps the text part plain — no markup", () => {
    const { text, html } = buildSubscriptionStartedEmail(BASE);
    expect(text).not.toMatch(/<[a-z]+[\s>]/i);
    expect(html).toMatch(/^<!doctype html>/i);
    expect(html).toContain("Welcome to larkit Plus");
  });
});

describe("formatEmailDate", () => {
  it("renders Month D, YYYY in UTC regardless of server zone", () => {
    expect(formatEmailDate(new Date("2026-09-27T23:30:00Z"))).toBe("September 27, 2026");
  });
});
