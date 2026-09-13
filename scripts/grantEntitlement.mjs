#!/usr/bin/env node
// Grant (or revoke) a complimentary larkit Plus entitlement — for pilot
// families, reviewers, and make-goods. Writes the same public.entitlements
// row Stripe and StoreKit write, with NO expiry (or one you choose), so both
// platforms unlock it (entitlementIsActive / rowIsActive treat a missing
// expires_at as a promotional grant). Service role only.
//
//   set -a && source .env.local && set +a
//   node scripts/grantEntitlement.mjs parent@example.com                 # forever
//   node scripts/grantEntitlement.mjs parent@example.com --until 2027-03-01
//   node scripts/grantEntitlement.mjs parent@example.com --revoke
//   node scripts/grantEntitlement.mjs --list                             # all comps
//
// The parent must already have signed in once (an auth.users row). A later
// real Stripe subscription overwrites the comp row via the webhook, which is
// what you want.

import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required (source .env.local)");
  process.exit(1);
}
const admin = createClient(url, key, { auth: { persistSession: false } });

const args = process.argv.slice(2);
const email = args.find((a) => !a.startsWith("--"));
const revoke = args.includes("--revoke");
const list = args.includes("--list");
const untilIdx = args.indexOf("--until");
const until = untilIdx >= 0 ? args[untilIdx + 1] : null;
const COMP_PRODUCT = "comp";

async function findUserByEmail(target) {
  const wanted = target.toLowerCase();
  for (let page = 1; page < 100; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const hit = data.users.find((u) => (u.email ?? "").toLowerCase() === wanted);
    if (hit) return hit;
    if (data.users.length < 200) return null;
  }
  return null;
}

if (list) {
  const { data, error } = await admin
    .from("entitlements")
    .select("user_id, status, expires_at, updated_at")
    .eq("product_id", COMP_PRODUCT)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  for (const row of data) {
    const { data: u } = await admin.auth.admin.getUserById(row.user_id);
    console.log(`${row.status.padEnd(8)} ${(u?.user?.email ?? row.user_id).padEnd(36)} until ${row.expires_at ?? "—"}`);
  }
  console.log(`${data.length} comp row(s)`);
  process.exit(0);
}

if (!email) {
  console.error("usage: grantEntitlement.mjs <email> [--until YYYY-MM-DD] [--revoke] | --list");
  process.exit(1);
}
if (until && !/^\d{4}-\d{2}-\d{2}$/.test(until)) {
  console.error("--until must be YYYY-MM-DD");
  process.exit(1);
}

const user = await findUserByEmail(email);
if (!user) {
  console.error(`No account for ${email} — they need to sign in on larkit.io once first.`);
  process.exit(1);
}

const { data: existing } = await admin
  .from("entitlements")
  .select("status, source, product_id, expires_at")
  .eq("user_id", user.id)
  .maybeSingle();

if (revoke) {
  if (!existing) {
    console.log(`${email}: no entitlement row — nothing to revoke.`);
    process.exit(0);
  }
  if (existing.product_id !== COMP_PRODUCT) {
    console.error(`${email}: entitlement is ${existing.source}/${existing.product_id}, not a comp — revoke it in Stripe/App Store instead.`);
    process.exit(1);
  }
  const { error } = await admin
    .from("entitlements")
    .update({ status: "expired", expires_at: new Date().toISOString() })
    .eq("user_id", user.id);
  if (error) throw error;
  console.log(`${email}: comp revoked.`);
  process.exit(0);
}

if (existing && existing.product_id !== COMP_PRODUCT && (existing.status === "active" || existing.status === "grace")) {
  console.log(`${email}: already has a live ${existing.source} subscription (${existing.product_id}) — leaving it alone.`);
  process.exit(0);
}

const row = {
  user_id: user.id,
  status: "active",
  source: null, // neither appstore nor stripe — a grant
  product_id: COMP_PRODUCT,
  expires_at: until ? `${until}T23:59:59Z` : null,
};
const { error } = await admin.from("entitlements").upsert(row, { onConflict: "user_id" });
if (error) throw error;
console.log(`${email}: larkit Plus granted${until ? ` until ${until}` : " (no expiry)"}.`);
