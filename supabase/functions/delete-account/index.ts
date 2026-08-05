// In-app deletion: a signed-in parent deletes one child profile, or the whole
// account and everything in it.
//
// Apple guideline 5.1.1(v) requires in-app account deletion; 16 CFR §312.6
// gives parents the right to delete a child's data and refuse further
// collection. Deletion must be deletion — rows are purged, not deactivated.
//
// Body: { action: "account" } or { action: "kid", kidId: "<uuid>" }.
//
// PostgREST cannot span one SQL transaction across calls, so the purge runs
// as an ordered sweep (child data first, auth user last) — a failure midway
// leaves the auth user intact, and re-running completes the purge. The
// auth.users ON DELETE CASCADE is the final backstop for anything missed.

import { createClient } from "npm:@supabase/supabase-js@2";
import { purgeAccountData, purgeKidData } from "../_shared/accountPurge.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Identify the caller from their JWT — deletion is self-service only.
    const asCaller = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: request.headers.get("Authorization") ?? "" } } },
    );
    const { data: { user } } = await asCaller.auth.getUser();
    if (!user) {
      return json({ error: "Sign in first" }, 401);
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const body = await request.json().catch(() => ({}));

    if (body.action === "kid") {
      if (typeof body.kidId !== "string" || !body.kidId) {
        return json({ error: "kidId required" }, 400);
      }
      await purgeKidData(admin, { userId: user.id, kidId: body.kidId });
      return json({ deleted: "kid", kidId: body.kidId });
    }

    if (body.action === "account") {
      await purgeAccountData(admin, user.id);

      // TODO(B2): Sign in with Apple token revocation. Apple guideline
      // 5.1.1(v) also requires revoking SIWA tokens on account deletion via
      // POST https://appleid.apple.com/auth/revoke (client_id, a
      // client_secret signed with our Apple Developer key, and the user's
      // refresh or access token). Blocked on Apple Developer credentials —
      // see the skipped test in src/__tests__/accountDeletion.spec.js.

      const { error } = await admin.auth.admin.deleteUser(user.id);
      if (error) {
        return json({ error: `auth user deletion failed: ${error.message}` }, 500);
      }
      return json({ deleted: "account" });
    }

    return json({ error: "action must be \"account\" or \"kid\"" }, 400);
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
