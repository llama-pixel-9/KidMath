// Step 2 of email-plus VPC: the parent opened the confirmation link in the
// direct-notice email. The link lands on the branded app page
// (larkit.io/confirm-consent), which POSTs the token here; on a valid token,
// grant_parental_consent writes the kid_profiles row and the coppa_vpc
// consent event in one transaction, and the confirming message (with the
// required revocation notice + link) goes out.
//
// POST { token } → JSON — what the app page calls (cross-origin, hence CORS).
// GET  ?token=…  → small HTML page — kept for links in already-sent emails.
//
// Deploy with --no-verify-jwt — the parent arrives from an email, signed out;
// the signed token is the credential.

import { createClient } from "npm:@supabase/supabase-js@2";
import { confirmConsent } from "../_shared/consentFlow.ts";
import { getTransport } from "../_shared/emailTransport.ts";

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
        "This confirmation link is temporarily unavailable — please try again shortly.");
    }

    let token = "";
    if (request.method === "GET") {
      token = new URL(request.url).searchParams.get("token") ?? "";
    } else {
      const body = await request.json().catch(() => ({}));
      token = typeof body.token === "string" ? body.token : "";
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const result = await confirmConsent(
      {
        db: admin,
        transport: getTransport(),
        secret,
        functionsBaseUrl: `${Deno.env.get("SUPABASE_URL")}/functions/v1`,
        appBaseUrl: Deno.env.get("PUBLIC_APP_URL") ?? "https://larkit.io",
      },
      token,
    );

    if (!result.ok) {
      return respond(wantsJson, { ok: false, reason: result.reason }, 400,
        result.reason === "request_not_pending"
          ? "This consent was already confirmed (or the request expired). If your child's profile exists, you're all set — otherwise just add them again from the app."
          : "This confirmation link is invalid or has expired. Start adding your child again from the app and we'll send a fresh one.");
    }

    return respond(wantsJson, { ok: true, kidFirstName: result.kidFirstName }, 200,
      `Thank you — your consent is recorded and ${result.kidFirstName}'s profile is ready. ` +
        `A confirmation email is on its way; it includes the link to revoke this consent at any time. ` +
        `You can close this page and return to the app.`);
  } catch (error) {
    return respond(wantsJson, { ok: false, reason: `error: ${error}` }, 500,
      `Something went wrong: ${error}. Please try the link again.`);
  }
});

function respond(asJson: boolean, body: Record<string, unknown>, status: number, message: string) {
  if (asJson) {
    return new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  return new Response(
    `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">` +
      `<title>larkit — parental consent</title>` +
      `<body style="font-family: system-ui, sans-serif; max-width: 32rem; margin: 4rem auto; padding: 0 1rem; color: #14231f;">` +
      `<h1 style="font-size: 1.25rem;">larkit</h1><p style="line-height: 1.6;">${message}</p></body>`,
    { status, headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" } },
  );
}
