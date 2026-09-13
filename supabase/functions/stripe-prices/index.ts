// Public, read-only: the two subscription prices the web paywall sells.
//
// The paywall and the auto-renewal disclosure must show the EXACT amount
// Stripe will charge (CA B&P §17602 and siblings). Rather than keep a literal
// in the client that can drift from the dashboard, the client asks here and
// this function reads the prices straight from Stripe — the same resolution
// stripe-checkout uses to sell them (lookup keys, see _shared/stripePrices.ts),
// so what is displayed, disclosed, and charged is one thing.
//
// No auth (deploy with --no-verify-jwt): prices are public, and the paywall
// renders before sign-in. Nothing here writes anything.
// Secrets: STRIPE_SECRET_KEY only.

import Stripe from "npm:stripe@17";
import { PLAN_LOOKUP_KEYS, resolvePlanPrice } from "../_shared/stripePrices.ts";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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
    for (const plan of Object.keys(PLAN_LOOKUP_KEYS)) {
      out[plan] = describe(await resolvePlanPrice(stripe, plan));
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
