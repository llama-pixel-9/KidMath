// Which Stripe price each plan sells — resolved by LOOKUP KEY, not by id.
//
// A price in the dashboard carries a lookup key (`larkit_monthly` /
// `larkit_annual`). Changing what we charge is then a dashboard-only act:
// create the new price with the same lookup key (Stripe moves the key off
// the old price via "transfer lookup key"), and every function here sells
// the new one on its next call. Existing subscriptions keep their price.
//
// STRIPE_PRICE_MONTHLY / STRIPE_PRICE_ANNUAL, if set, override the lookup
// (useful for a one-off test) — but they are not required.

import type Stripe from "npm:stripe@17";

export const PLAN_LOOKUP_KEYS: Record<string, string> = {
  monthly: "larkit_monthly",
  annual: "larkit_annual",
};

const OVERRIDE_ENV: Record<string, string> = {
  monthly: "STRIPE_PRICE_MONTHLY",
  annual: "STRIPE_PRICE_ANNUAL",
};

export async function resolvePlanPrice(stripe: Stripe, plan: string): Promise<Stripe.Price> {
  const key = PLAN_LOOKUP_KEYS[plan];
  if (!key) throw new Error(`Unknown plan: ${plan}`);

  const override = Deno.env.get(OVERRIDE_ENV[plan]);
  if (override) return await stripe.prices.retrieve(override);

  const { data } = await stripe.prices.list({ lookup_keys: [key], active: true, limit: 1 });
  const price = data[0];
  if (!price) {
    throw new Error(`No active Stripe price with lookup key "${key}" — set it on the price in the dashboard`);
  }
  return price;
}

/** "$8.99" — one formatter for everything a subscriber sees. */
export function formatMoney(cents: number, currency: string): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: currency.toUpperCase() })
    .format(cents / 100);
}

/** A recurring price as the subscriber will read it: amount + interval. */
export function describePrice(price: Stripe.Price): {
  amount: string;
  cents: number;
  currency: string;
  interval: "day" | "week" | "month" | "year";
  intervalCount: number;
} {
  if (price.unit_amount == null || !price.recurring) {
    throw new Error(`price ${price.id} is not a fixed recurring price`);
  }
  return {
    amount: formatMoney(price.unit_amount, price.currency),
    cents: price.unit_amount,
    currency: price.currency.toUpperCase(),
    interval: price.recurring.interval,
    intervalCount: price.recurring.interval_count,
  };
}
