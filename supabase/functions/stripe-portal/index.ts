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

// The portal is Stripe-hosted; its legal links point at the canonical pages,
// never the caller's origin (which is localhost in dev — Stripe rejects
// non-https URLs here).
const LEGAL_BASE = "https://larkit.io";

async function getPortalConfiguration(): Promise<string> {
  const existing = await stripe.billingPortal.configurations.list({ limit: 100 });
  const found = existing.data.find((c) => c.metadata?.marker === PORTAL_CONFIG_MARKER && c.active);
  if (found) return found.id;

  const created = await stripe.billingPortal.configurations.create({
    business_profile: {
      headline: "larkit — manage your subscription",
      privacy_policy_url: `${LEGAL_BASE}/privacy`,
      terms_of_service_url: `${LEGAL_BASE}/terms`,
    },
    features: {
      subscription_cancel: {
        enabled: true,
        mode: "immediately",
        proration_behavior: "none",
        // Survey OFF: leaving `cancellation_reason` out entirely is the only
        // form Stripe accepts (it demands `options` whenever the hash is sent,
        // even with enabled:false). Default is disabled.
      },
      payment_method_update: { enabled: true },
      invoice_history: { enabled: true },
      customer_update: { enabled: false },
    },
    metadata: { marker: PORTAL_CONFIG_MARKER },
  });
  return created.id;
}

/** Find the Stripe customer for a Supabase user. The checkout function stamps
 *  supabase_user_id into the subscription metadata. Stripe's search index can
 *  lag or be unavailable, so after search we scan subscriptions directly, and
 *  finally fall back to the account email. Returns the customer id plus which
 *  step found it (for the not-found message). */
async function findCustomerId(
  userId: string,
  email: string | undefined,
): Promise<{ customer: string | null; via: string }> {
  const customerOf = (sub: Stripe.Subscription) =>
    typeof sub.customer === "string" ? sub.customer : sub.customer.id;

  try {
    const bySearch = await stripe.subscriptions.search({
      query: `metadata['supabase_user_id']:'${userId}'`,
      limit: 1,
    });
    if (bySearch.data[0]) return { customer: customerOf(bySearch.data[0]), via: "search" };
  } catch (error) {
    console.warn("subscriptions.search unavailable, scanning", error);
  }

  let scanned = 0;
  for await (const sub of stripe.subscriptions.list({ status: "all", limit: 100 })) {
    scanned++;
    if (sub.metadata?.supabase_user_id === userId) return { customer: customerOf(sub), via: "scan" };
  }

  let byEmailCount = 0;
  if (email) {
    const byEmail = await stripe.customers.list({ email, limit: 1 });
    byEmailCount = byEmail.data.length;
    if (byEmail.data[0]) return { customer: byEmail.data[0].id, via: "email" };
  }
  return { customer: null, via: `none (scanned ${scanned} subscriptions, ${byEmailCount} customers with email ${email ? "present" : "missing"})` };
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
      : "https://larkit.io";

    const { customer, via } = await findCustomerId(user.id, user.email ?? undefined);
    if (!customer) {
      console.warn("stripe-portal: no customer", { userId: user.id, via });
      return json({ error: `No subscription found for this account [${via}]` }, 404);
    }

    const session = await stripe.billingPortal.sessions.create({
      customer,
      configuration: await getPortalConfiguration(),
      return_url: base,
    });

    return json({ url: session.url });
  } catch (error) {
    console.error("stripe-portal failed", error);
    return json({ error: `${error}` }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
