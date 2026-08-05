// Open a Stripe Billing Portal session for the signed-in user.
//
// This is the online cancellation path the automatic-renewal statutes (CA,
// CO, IL, VA, MA, CT, NY, NYC) require: one click after authentication,
// immediate cancellation, no retention flow, no survey, no phone step, and
// full mobile-web parity ("use a desktop" was a named FTC violation in
// Chegg). The portal configuration below enforces that — do not add a
// retention/save-offer flow here without reading docs/legal-implementation.md
// step 6 first.
//
// The web app calls this with { origin } and redirects to the returned url.
// Secrets: STRIPE_SECRET_KEY (already set for stripe-checkout).

import Stripe from "npm:stripe@17";
import { createClient } from "npm:@supabase/supabase-js@2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// A dedicated portal configuration pinned to immediate cancellation with the
// cancellation-reason survey OFF. Created once, then reused (identified by
// metadata). Relying on the Stripe dashboard default would let a dashboard
// edit silently reintroduce a retention flow.
const PORTAL_CONFIG_MARKER = "kidmath_cancel_v1";

async function getPortalConfiguration(origin: string): Promise<string> {
  const existing = await stripe.billingPortal.configurations.list({ limit: 100 });
  const found = existing.data.find((c) => c.metadata?.marker === PORTAL_CONFIG_MARKER && c.active);
  if (found) return found.id;

  const created = await stripe.billingPortal.configurations.create({
    business_profile: {
      headline: "larkit — manage your subscription",
      privacy_policy_url: `${origin}/privacy`,
      terms_of_service_url: `${origin}/terms`,
    },
    features: {
      subscription_cancel: {
        enabled: true,
        mode: "immediately",
        proration_behavior: "none",
        cancellation_reason: { enabled: false, options: [] },
      },
      payment_method_update: { enabled: true },
      invoice_history: { enabled: true },
      customer_update: { enabled: false, allowed_updates: [] },
    },
    metadata: { marker: PORTAL_CONFIG_MARKER },
  });
  return created.id;
}

/** Find the Stripe customer for a Supabase user. The checkout function stamps
 *  supabase_user_id into the subscription metadata; email is the fallback for
 *  customers created before that or whose subscription already ended. */
async function findCustomerId(userId: string, email: string | undefined): Promise<string | null> {
  const bySubscription = await stripe.subscriptions.search({
    query: `metadata['supabase_user_id']:'${userId}'`,
    limit: 1,
  });
  const sub = bySubscription.data[0];
  if (sub) return typeof sub.customer === "string" ? sub.customer : sub.customer.id;

  if (email) {
    const byEmail = await stripe.customers.list({ email, limit: 1 });
    if (byEmail.data[0]) return byEmail.data[0].id;
  }
  return null;
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: request.headers.get("Authorization") ?? "" } } },
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return json({ error: "Sign in to manage your subscription" }, 401);
    }

    const { origin } = await request.json().catch(() => ({}));
    const base = typeof origin === "string" && origin.startsWith("http")
      ? origin
      : "https://kidmath.vercel.app";

    const customer = await findCustomerId(user.id, user.email ?? undefined);
    if (!customer) {
      return json({ error: "No subscription found for this account" }, 404);
    }

    const session = await stripe.billingPortal.sessions.create({
      customer,
      configuration: await getPortalConfiguration(base),
      return_url: base,
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
