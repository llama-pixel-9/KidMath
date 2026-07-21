// Stripe webhook -> the shared entitlements row.
//
// This function is the trusted writer for Stripe-sourced entitlements: it
// verifies Stripe's signature and upserts public.entitlements with the
// service role (bypassing RLS). The iOS app reads the same row, so a web
// subscription unlocks the app.
//
// Configure in Stripe: endpoint <project>.supabase.co/functions/v1/stripe-webhook
// with events checkout.session.completed, customer.subscription.updated,
// customer.subscription.deleted. Secrets:
//   supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
// Deploy with --no-verify-jwt (Stripe doesn't send a Supabase JWT).

import Stripe from "npm:stripe@17";
import { createClient } from "npm:@supabase/supabase-js@2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "");
const cryptoProvider = Stripe.createSubtleCryptoProvider();

const admin = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
);

/** Map a Stripe subscription status to the entitlements.status enum. */
function entitlementStatus(subscription: Stripe.Subscription): string {
  switch (subscription.status) {
    case "trialing":
    case "active":
      return "active";
    case "past_due":
      return "grace";
    default:
      return "expired"; // canceled, unpaid, incomplete_expired, paused
  }
}

async function upsertFromSubscription(subscription: Stripe.Subscription, fallbackUserId?: string) {
  const userId = subscription.metadata?.supabase_user_id || fallbackUserId;
  if (!userId) return;
  const priceId = subscription.items.data[0]?.price?.id ?? null;
  const periodEnd = subscription.items.data[0]?.current_period_end ??
    (subscription as unknown as { current_period_end?: number }).current_period_end;
  await admin.from("entitlements").upsert({
    user_id: userId,
    status: entitlementStatus(subscription),
    source: "stripe",
    product_id: priceId,
    expires_at: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
  }, { onConflict: "user_id" });
}

Deno.serve(async (request) => {
  const signature = request.headers.get("stripe-signature");
  const secret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!signature || !secret) {
    return new Response("missing signature", { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      await request.text(),
      signature,
      secret,
      undefined,
      cryptoProvider,
    );
  } catch (error) {
    return new Response(`signature verification failed: ${error}`, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.subscription) {
          const subscription = await stripe.subscriptions.retrieve(String(session.subscription));
          await upsertFromSubscription(subscription, session.client_reference_id ?? undefined);
        }
        break;
      }
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        await upsertFromSubscription(event.data.object as Stripe.Subscription);
        break;
      }
    }
    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(`handler error: ${error}`, { status: 500 });
  }
});
