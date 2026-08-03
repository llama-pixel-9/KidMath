import { supabase } from "./supabaseClient";

/**
 * Premium split (pricing decision 2026-07-21; free tier extended to iOS
 * 2026-08-02 with the §20 soft paywall — free is a real plan on both
 * platforms): the four operations + counting stay unlimited and free forever
 * on web and iOS — the top of the funnel. Everything else (the other 17
 * modes, PDF worksheet export, cross-device cloud sync) is premium:
 * $8.99/month or $54.99/year (49% off), every child in the household
 * included, 14-day trial.
 *
 * The entitlement row in public.entitlements is the shared truth: Stripe
 * writes it here (via the stripe-webhook Edge Function), StoreKit writes it
 * from the iOS app — either unlocks both platforms.
 *
 * Mirrored by StoreService.freeModeIds on iOS — keep the two lists identical.
 */
export const FREE_MODE_IDS = ["addition", "subtraction", "multiplication", "division", "counting"];

/**
 * Launch switch. The paywall is OFF unless the deploy explicitly sets
 * VITE_PAYWALL_ENABLED=true (Vercel env var) — with it off, every visitor is
 * treated as premium: all 22 modes and worksheets stay free, no locks, no
 * paywall, no Stripe calls. Flip the env var and redeploy to launch billing
 * once the Stripe account setup (docs/stripe-setup.md) is live. Entitlement
 * reads/writes still work while it's off, so nothing resets at launch.
 */
export function paywallEnabled(env = import.meta.env) {
  return env?.VITE_PAYWALL_ENABLED === "true";
}

export function isFreeMode(modeId) {
  return FREE_MODE_IDS.includes(modeId);
}

/**
 * Mirror of the iOS StoreService.rowIsActive rules: status must be
 * active/grace, and expires_at (when present) must be in the future.
 */
export function entitlementIsActive(row, now = Date.now()) {
  if (!row) return false;
  if (row.status !== "active" && row.status !== "grace") return false;
  if (!row.expires_at) return true; // e.g. promotional grant
  const expires = Date.parse(row.expires_at);
  return Number.isFinite(expires) ? expires > now : true;
}

export async function fetchEntitlement(userId) {
  if (!supabase || !userId) return null;
  const { data, error } = await supabase
    .from("entitlements")
    .select("status, source, product_id, expires_at")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) return null;
  return data;
}

/**
 * Start a Stripe Checkout session (via the stripe-checkout Edge Function)
 * and send the browser there. `plan` is "annual" or "monthly".
 */
export async function startCheckout(plan) {
  if (!supabase) throw new Error("Supabase not configured");
  const { data, error } = await supabase.functions.invoke("stripe-checkout", {
    body: { plan, origin: window.location.origin },
  });
  if (error || !data?.url) {
    throw new Error(error?.message || "Could not start checkout");
  }
  window.location.assign(data.url);
}
