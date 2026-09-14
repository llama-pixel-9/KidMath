// Create a Stripe Checkout session for the signed-in user.
//
// The web paywall calls this with { plan: "annual" | "monthly", origin }.
// 14-day trial on both plans. The price to sell is found by Stripe lookup
// key (_shared/stripePrices.ts) — no price id or amount lives here, and
// test/live mode is just STRIPE_SECRET_KEY.
//
// The session carries the Supabase user id in client_reference_id AND in the
// subscription metadata, so the stripe-webhook function can write the shared
// entitlements row (the same row StoreKit writes from the iOS app).

import Stripe from "npm:stripe@17";
import { createClient } from "npm:@supabase/supabase-js@2";
import { resolvePlanPrice } from "../_shared/stripePrices.ts";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Resolve the caller from their Supabase JWT.
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: request.headers.get("Authorization") ?? "" } } },
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return json({ error: "Sign in before subscribing" }, 401);
    }

    const { plan, origin } = await request.json();
    if (plan !== "monthly" && plan !== "annual") {
      return json({ error: "Unknown plan" }, 400);
    }
    const price = (await resolvePlanPrice(stripe, plan)).id;

    const base = typeof origin === "string" && origin.startsWith("http")
      ? origin
      : "https://larkit.io";

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price, quantity: 1 }],
      customer_email: user.email ?? undefined,
      client_reference_id: user.id,
      subscription_data: {
        trial_period_days: 14,
        metadata: { supabase_user_id: user.id },
      },
      allow_promotion_codes: true,
      success_url: `${base}/?checkout=success`,
      cancel_url: `${base}/?checkout=cancelled`,
    });

    return json({ url: session.url });
  } catch (error) {
    return json({ error: `${error}` }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
