// Server-side entitlement verification — the E7 hardening that retires the
// v1 client-write trust model (any signed-in client could upsert its own
// entitlement row; a paywall bypass one curl away).
//
// Body:
//   { source: "stripe" }                      — re-verify against Stripe and
//                                               write the row (web restore)
//   { source: "appstore", jws: "<signed tx>" } — verify the StoreKit 2 signed
//                                               transaction and write the row
//
// Writes use the service role; the companion migration
// (20260803150000_entitlements_service_write.sql) removes the client
// insert/update policies so this function and stripe-webhook become the only
// writers.
//
// App Store verification uses Apple's own library and needs secrets:
//   APPLE_ROOT_CERTS_B64  comma-separated base64 DER of Apple's root CAs
//                         (https://www.apple.com/certificateauthority/)
//   APP_BUNDLE_ID         defaults to com.kidmath.app — ⚠️ placeholder, must
//                         match the shipping bundle id
//   APPSTORE_ENV          "Production" | "Sandbox"
// Until those are set the appstore path answers 501 rather than trusting the
// client — fail closed, not open.

import Stripe from "npm:stripe@17";
import { createClient } from "npm:@supabase/supabase-js@2";
import { Buffer } from "node:buffer";
import {
  Environment,
  SignedDataVerifier,
} from "npm:@apple/app-store-server-library@1";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/** Same status mapping as stripe-webhook — keep the two in sync. */
function stripeStatus(subscription: Stripe.Subscription): string {
  switch (subscription.status) {
    case "trialing":
    case "active":
      return "active";
    case "past_due":
      return "grace";
    default:
      return "expired";
  }
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const asCaller = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: request.headers.get("Authorization") ?? "" } } },
    );
    const { data: { user } } = await asCaller.auth.getUser();
    if (!user) return json({ error: "Sign in first" }, 401);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const body = await request.json().catch(() => ({}));

    if (body.source === "stripe") {
      const found = await stripe.subscriptions.search({
        query: `metadata['supabase_user_id']:'${user.id}'`,
        limit: 1,
      });
      const subscription = found.data[0];
      if (!subscription) return json({ error: "No Stripe subscription found" }, 404);
      const priceId = subscription.items.data[0]?.price?.id ?? null;
      const periodEnd = subscription.items.data[0]?.current_period_end;
      await admin.from("entitlements").upsert({
        user_id: user.id,
        status: stripeStatus(subscription),
        source: "stripe",
        product_id: priceId,
        expires_at: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
      }, { onConflict: "user_id" });
      return json({ verified: true, status: stripeStatus(subscription) });
    }

    if (body.source === "appstore") {
      if (typeof body.jws !== "string" || !body.jws) {
        return json({ error: "jws (signed transaction) required" }, 400);
      }
      const rootsB64 = Deno.env.get("APPLE_ROOT_CERTS_B64");
      if (!rootsB64) {
        // Fail closed: without Apple's roots we cannot verify, and we will
        // not write an entitlement on the client's say-so.
        return json({ error: "App Store verification not configured yet" }, 501);
      }
      const roots = rootsB64.split(",").map((b64) => Buffer.from(b64.trim(), "base64"));
      const environment = Deno.env.get("APPSTORE_ENV") === "Sandbox"
        ? Environment.SANDBOX
        : Environment.PRODUCTION;
      const bundleId = Deno.env.get("APP_BUNDLE_ID") ?? "com.kidmath.app";
      const verifier = new SignedDataVerifier(roots, false, environment, bundleId);

      const tx = await verifier.verifyAndDecodeTransaction(body.jws);
      const expiresAt = tx.expiresDate ? new Date(tx.expiresDate) : null;
      const revoked = tx.revocationDate != null;
      const active = !revoked && (!expiresAt || expiresAt.getTime() > Date.now());
      await admin.from("entitlements").upsert({
        user_id: user.id,
        status: active ? "active" : "expired",
        source: "appstore",
        product_id: tx.productId ?? null,
        expires_at: expiresAt ? expiresAt.toISOString() : null,
      }, { onConflict: "user_id" });
      return json({ verified: true, status: active ? "active" : "expired" });
    }

    return json({ error: "source must be \"stripe\" or \"appstore\"" }, 400);
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
