// Public, read-only: the two subscription prices the web paywall sells.
//
// The paywall and the auto-renewal disclosure must show the EXACT amount
// Stripe will charge (CA B&P §17602 and siblings). Rather than keep a literal
// in the client that can drift from the dashboard, the client asks here and
// this function reads the configured prices straight from Stripe. Whatever
// STRIPE_PRICE_MONTHLY / STRIPE_PRICE_ANNUAL point at is what gets displayed,
// disclosed, and sold — one source of truth.
//
// No auth (deploy with --no-verify-jwt): prices are public, and the paywall
// renders before sign-in. Nothing here writes anything.
// Secrets: STRIPE_SECRET_KEY, STRIPE_PRICE_MONTHLY, STRIPE_PRICE_ANNUAL.

import Stripe from "npm:stripe@17";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PLANS: Record<string, string> = {
  monthly: "STRIPE_PRICE_MONTHLY",
  annual: "STRIPE_PRICE_ANNUAL",
};

function describe(price: Stripe.Price) {
  if (price.unit_amount == null || !price.recurring) {
    throw new Error(`price ${price.id} is not a fixed recurring price`);
  }
  const currency = price.currency.toUpperCase();
  const amount = new Intl.NumberFormat("en-US", { style: "currency", currency })
    .format(price.unit_amount / 100);
  return {
    id: price.id,
    cents: price.unit_amount,
    currency,
    amount, // "$8.99" — the literal the disclosure shows
    interval: price.recurring.interval, // "month" | "year"
    intervalCount: price.recurring.interval_count,
    nickname: price.nickname ?? null,
  };
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  try {
    const out: Record<string, unknown> = {};
    for (const [plan, envName] of Object.entries(PLANS)) {
      const id = Deno.env.get(envName);
      if (!id) return json({ error: `${envName} not configured` }, 500);
      out[plan] = describe(await stripe.prices.retrieve(id));
    }
    return json(out, 200, { "Cache-Control": "public, max-age=300" });
  } catch (error) {
    return json({ error: `${error}` }, 500);
  }
});

function json(body: unknown, status = 200, extra: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", ...extra },
  });
}
