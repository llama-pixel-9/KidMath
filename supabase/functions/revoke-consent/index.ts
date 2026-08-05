// COPPA consent revocation endpoint.
//
// The consent confirmation message advertises this link — a parent taps it
// to revoke consent for a child, no sign-in required. It must work: an
// advertised revocation link that 404s is worse than not offering one.
//
// GET  /revoke-consent?token=...   (the link in the email — deploy with
//                                   --no-verify-jwt so the bare tap works)
// POST { token }                   (programmatic)
//
// The token is HMAC-signed by us when the confirmation message is sent
// (CONSENT_REVOCATION_SECRET). On a valid token: the child profile and its
// data are deleted, collection stops (the profile is gone), and a
// consent_events row with kind "coppa_revoked" records the act.

import { createClient } from "npm:@supabase/supabase-js@2";
import { purgeKidData } from "../_shared/accountPurge.ts";
import { verifyRevocationToken } from "../_shared/revocationToken.ts";

Deno.serve(async (request) => {
  try {
    const secret = Deno.env.get("CONSENT_REVOCATION_SECRET");
    if (!secret) {
      return html("This revocation link is temporarily unavailable. Please email us instead.", 500);
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
      return html(
        "This revocation link is invalid or has expired. " +
          "You can still delete your child's profile any time from your account settings, " +
          "or email us and we will do it for you.",
        400,
      );
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

    return html(
      "Done. Your child's profile and its data have been deleted, and no further " +
        "information will be collected about them. You can close this page.",
      200,
    );
  } catch (error) {
    return html(`Something went wrong: ${error}. Please email us and we will handle it.`, 500);
  }
});

// Parents open this from an email — answer with a small readable page, not JSON.
function html(message: string, status: number) {
  return new Response(
    `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">` +
      `<title>larkit — consent revocation</title>` +
      `<body style="font-family: system-ui, sans-serif; max-width: 32rem; margin: 4rem auto; padding: 0 1rem; color: #14231f;">` +
      `<h1 style="font-size: 1.25rem;">larkit</h1><p style="line-height: 1.6;">${message}</p></body>`,
    { status, headers: { "Content-Type": "text/html; charset=utf-8" } },
  );
}
