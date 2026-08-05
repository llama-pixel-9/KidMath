-- E7 hardening: entitlements become service-role-write only.
--
-- ⚠️ Review before applying — AND coordinate with the client release:
-- iOS builds older than the E7 change still write entitlements directly
-- (StoreService.syncToSupabase); applying this migration cuts them over to
-- read-only, after which only the verify-entitlement Edge Function and the
-- stripe-webhook keep rows fresh.
--
-- The v1 trust model let any signed-in client insert/update its own
-- entitlement row — a paywall bypass one curl away. Verification now lives
-- server-side: stripe-webhook (Stripe signature) and verify-entitlement
-- (Stripe lookup / App Store signed-transaction check) write with the
-- service role, which bypasses RLS. Users keep read access to their own row.

drop policy if exists "entitlements_insert_own" on public.entitlements;
drop policy if exists "entitlements_update_own" on public.entitlements;

-- entitlements_select_own remains as created in 20260720131000.
