// COPPA consent revocation endpoint.
//
// The consent confirmation message advertises this link — a parent taps it
// to revoke consent for a child, no sign-in required. It must work: an
// advertised revocation link that 404s is worse than not offering one.
//
// The link lands on the branded app page (larkit.io/revoke-consent), which
// shows what revoking does and POSTs the token here on an explicit button
// tap — deletion never fires from a bare page load, so an email scanner
// prefetching the link cannot delete a child's profile.
//
// POST { token } → JSON — what the app page calls (cross-origin, hence CORS).
// GET  ?token=…  → small HTML page — kept for links in already-sent emails.
//   (Historic GETs still revoke: those emails promised the tap would work.)
//
// Deploy with --no-verify-jwt so the bare tap works signed-out. The token is
// HMAC-signed by us when the confirmation message is sent
// (CONSENT_REVOCATION_SECRET). On a valid token: the child profile and its
// data are deleted, collection stops (the profile is gone), and a
// consent_events row with kind "coppa_revoked" records the act.

import { createClient } from "npm:@supabase/supabase-js@2";
import { purgeKidData } from "../_shared/accountPurge.ts";
import { verifyRevocationToken } from "../_shared/revocationToken.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  const wantsJson = request.method !== "GET";
  try {
    const secret = Deno.env.get("CONSENT_REVOCATION_SECRET");
    if (!secret) {
      return respond(wantsJson, { ok: false, reason: "unavailable" }, 500,
        "This revocation link is temporarily unavailable. Please email us instead.");
    }

    let token = "";
    if (request.method === "GET") {
      token = new URL(request.url).searchParams.get("token") ?? "";
    } else {
      const body = await request.json().catch(() => ({}));
      token = typeof body.token === "string" ? body.token : "";
    }

    const claims = await verifyRevocationToken(token, secret);
    if (!claims) {
      return respond(wantsJson, { ok: false, reason: "invalid_or_expired" }, 400,
        "This revocation link is invalid or has expired. " +
          "You can still delete your child's profile any time from your account settings, " +
          "or email us and we will do it for you.");
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    await purgeKidData(admin, { userId: claims.userId, kidId: claims.kidId });

    // Evidence of the revocation. Deliberately child-free: ids and time only.
    await admin.from("consent_events").insert({
      user_id: claims.userId,
      kind: "coppa_revoked",
      terms_version: "n/a",
      privacy_version: "n/a",
      disclosure_text: "Parental consent revoked via emailed revocation link.",
      meta: { kidProfileId: claims.kidId, method: "revocation-link" },
    });

    return respond(wantsJson, { ok: true }, 200,
      "Done. Your child's profile and its data have been deleted, and no further " +
        "information will be collected about them. You can close this page.");
  } catch (error) {
    return respond(wantsJson, { ok: false, reason: `error: ${error}` }, 500,
      `Something went wrong: ${error}. Please email us and we will handle it.`);
  }
});

function respond(asJson: boolean, body: Record<string, unknown>, status: number, message: string) {
  if (asJson) {
    return new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  // Parents opened this from an older email — answer with a small readable
  // page, not JSON.
  return new Response(
    `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">` +
      `<title>larkit — consent revocation</title>` +
      `<body style="font-family: system-ui, sans-serif; max-width: 32rem; margin: 4rem auto; padding: 0 1rem; color: #14231f;">` +
      `<h1 style="font-size: 1.25rem;">larkit</h1><p style="line-height: 1.6;">${message}</p></body>`,
    { status, headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" } },
  );
}
