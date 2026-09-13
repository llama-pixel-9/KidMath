// Subscription-started confirmation — the acknowledgment the automatic-renewal
// statutes require right after signup (CA B&P §17602(a)(3) and siblings): a
// retainable copy of the terms — trial length and END DATE, first-charge
// amount and DATE, renewal amount and frequency, "until you cancel" — plus how
// to cancel, in the same medium the subscription was bought in. Stripe sends
// nothing for a $0 trial start, so this is ours.
//
// The plain-text part is the legally load-bearing copy; the HTML part is the
// same content, branded. Sent from stripe-webhook on checkout.session.completed.

import type { OutboundEmail } from "./emailTransport.ts";
import { subscriptionStartedEmailHtml } from "./emailTemplates.ts";

export type SubscriptionStartedArgs = {
  to: string;
  /** "$39.99" — already formatted, exactly what Checkout showed. */
  amount: string;
  interval: "month" | "year";
  /** Trial end (= first charge date); null when there was no trial. */
  trialEndsAt: Date | null;
  /** Where the one-step cancel lives. */
  billingUrl: string;
  appBaseUrl: string;
  now?: Date;
};

/** "September 27, 2026" — a calendar date, never a relative phrase. */
export function formatEmailDate(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
}

export function buildSubscriptionStartedEmail(args: SubscriptionStartedArgs): OutboundEmail {
  const { amount, interval, trialEndsAt, billingUrl, appBaseUrl } = args;
  const per = interval === "year" ? "year" : "month";
  const planName = interval === "year" ? "annual" : "monthly";
  const trialLine = trialEndsAt
    ? `Your free trial ends on ${formatEmailDate(trialEndsAt)}. Your payment method will be charged ${amount} on that date.`
    : `Your payment method has been charged ${amount} today.`;
  const renewLine = `After that, your subscription renews automatically at ${amount} per ${per} until you cancel.`;
  const cancelLine =
    `Cancel any time in one step at ${billingUrl} — no phone call, no survey. ` +
    `If you cancel during the trial you will not be charged. ` +
    `If you cancel later, you keep access until the end of the period you already paid for.`;

  const subject = trialEndsAt
    ? `Your larkit Plus trial has started — first charge ${amount} on ${formatEmailDate(trialEndsAt)}`
    : `Your larkit Plus subscription has started`;

  const text = [
    `Thanks for subscribing to larkit Plus (${planName} plan).`,
    ``,
    `Here is your copy of the terms you agreed to:`,
    ``,
    `- Plan: larkit Plus, ${planName} — ${amount} per ${per}`,
    `- ${trialLine}`,
    `- ${renewLine}`,
    `- One subscription covers every child in your household, on the web, iPad, and iPhone.`,
    ``,
    `How to cancel`,
    cancelLine,
    ``,
    `Terms: ${appBaseUrl}/terms`,
    `Privacy: ${appBaseUrl}/privacy`,
    ``,
    `Questions? Reply to this email or write to support@larkit.io.`,
    ``,
    `Larkit Labs LLC · 502 W 7th St, Ste 100, Erie, PA 16502 · (814) 273-8760`,
  ].join("\n");

  const html = subscriptionStartedEmailHtml({
    planName,
    amount,
    per,
    trialLine,
    renewLine,
    billingUrl,
    appBaseUrl,
  });

  return { to: args.to, subject, text, html };
}
