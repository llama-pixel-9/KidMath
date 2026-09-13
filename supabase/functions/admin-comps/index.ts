// Admin-only: grant / revoke / list complimentary entitlements.
//
// The entitlements table is service-role-write only (E7), so the /admin Comps
// page cannot write it from the browser. This function verifies the caller's
// JWT, checks profiles.is_admin, and performs the write with the service role.
// Decision logic is in _shared/comps.ts (pure, unit-tested).
//
// POST { action: "list" }
// POST { action: "grant", email, until?: "YYYY-MM-DD" }
// POST { action: "revoke", email }

import { createClient } from "npm:@supabase/supabase-js@2";
import { COMP_PRODUCT, planGrant, planRevoke, type EntitlementRow } from "../_shared/comps.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const admin = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  { auth: { persistSession: false } },
);

async function findUserByEmail(email: string) {
  const wanted = email.trim().toLowerCase();
  for (let page = 1; page < 100; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const hit = data.users.find((u) => (u.email ?? "").toLowerCase() === wanted);
    if (hit) return hit;
    if (data.users.length < 200) return null;
  }
  return null;
}

async function readRow(userId: string): Promise<EntitlementRow | null> {
  const { data, error } = await admin
    .from("entitlements")
    .select("user_id, status, source, product_id, expires_at")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return (data as EntitlementRow | null) ?? null;
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    // Who is calling?
    const caller = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: request.headers.get("Authorization") ?? "" } } },
    );
    const { data: { user } } = await caller.auth.getUser();
    if (!user) return json({ error: "Sign in required" }, 401);
    const { data: profile } = await admin
      .from("profiles").select("is_admin").eq("user_id", user.id).maybeSingle();
    if (!profile?.is_admin) return json({ error: "Admin access required" }, 403);

    const body = await request.json().catch(() => ({}));
    const action = body?.action;

    if (action === "list") {
      const { data, error } = await admin
        .from("entitlements")
        .select("user_id, status, expires_at, updated_at")
        .eq("product_id", COMP_PRODUCT)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      const rows = [];
      for (const row of data ?? []) {
        const { data: u } = await admin.auth.admin.getUserById(row.user_id);
        rows.push({ ...row, email: u?.user?.email ?? null });
      }
      return json({ comps: rows });
    }

    if (action !== "grant" && action !== "revoke") return json({ error: "Unknown action" }, 400);
    const email = typeof body.email === "string" ? body.email.trim() : "";
    if (!email) return json({ error: "Email is required" }, 400);

    const target = await findUserByEmail(email);
    if (!target) {
      return json({ error: `No account for ${email} — they need to sign in on larkit.io once first.` }, 404);
    }
    const existing = await readRow(target.id);
    const decision = action === "grant" ? planGrant(existing, body.until ?? null) : planRevoke(existing);

    if (decision.kind === "error") return json({ error: decision.reason }, 400);
    if (decision.kind === "skip") return json({ ok: true, skipped: true, message: `${email}: ${decision.reason}` });

    const { error } = await admin
      .from("entitlements")
      .upsert({ user_id: target.id, ...decision.row }, { onConflict: "user_id" });
    if (error) throw error;

    const message = action === "grant"
      ? `${email}: larkit Plus granted${decision.row.expires_at ? ` until ${decision.row.expires_at.slice(0, 10)}` : " (no expiry)"}.`
      : `${email}: comp revoked.`;
    console.log(`admin-comps ${action} by ${user.id} → ${target.id}`);
    return json({ ok: true, message });
  } catch (error) {
    console.error("admin-comps failed", error);
    return json({ error: `${error}` }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
