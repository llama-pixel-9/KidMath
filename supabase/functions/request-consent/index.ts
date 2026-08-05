// Step 1 of email-plus VPC: a signed-in parent has begun creating their
// first child profile. Record the pending request and deliver the direct
// notice (16 CFR §312.4(c)) to the account email. NO kid_profiles row is
// written here — that happens only in grant_parental_consent when the
// parent's consent arrives.
//
// Body: { firstName, age, grade, noticeText }
//   noticeText is the rendered parental-consent-notice markdown (the client
//   renders it with entity tokens filled). Also republished at
//   /parental-consent; the email must carry the content itself, not a link.

import { createClient } from "npm:@supabase/supabase-js@2";
import { beginConsentRequest } from "../_shared/consentFlow.ts";
import { getTransport } from "../_shared/emailTransport.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const AGES = ["5", "6", "7", "8", "9", "10", "11", "12+"];
const GRADES = ["K", "1st", "2nd", "3rd", "4th", "5th", "6th"];

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const secret = Deno.env.get("CONSENT_REVOCATION_SECRET");
    if (!secret) return json({ error: "consent flow not configured" }, 500);

    const asCaller = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: request.headers.get("Authorization") ?? "" } } },
    );
    const { data: { user } } = await asCaller.auth.getUser();
    if (!user) return json({ error: "Sign in first" }, 401);
    if (!user.email) return json({ error: "Account has no email to notice" }, 400);

    const body = await request.json().catch(() => ({}));
    const firstName = typeof body.firstName === "string" ? body.firstName.trim() : "";
    if (!firstName || firstName.length > 40) return json({ error: "firstName required" }, 400);
    if (!AGES.includes(body.age)) return json({ error: "invalid age" }, 400);
    if (!GRADES.includes(body.grade)) return json({ error: "invalid grade" }, 400);
    const noticeText = typeof body.noticeText === "string" && body.noticeText.length > 200
      ? body.noticeText
      : null;
    if (!noticeText) return json({ error: "noticeText (rendered direct notice) required" }, 400);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const { requestId } = await beginConsentRequest(
      {
        db: admin,
        transport: getTransport(),
        secret,
        functionsBaseUrl: `${Deno.env.get("SUPABASE_URL")}/functions/v1`,
      },
      {
        userId: user.id,
        parentEmail: user.email,
        kid: { firstName, age: body.age, grade: body.grade },
        noticeText,
        termsVersion: typeof body.termsVersion === "string" ? body.termsVersion : "unversioned",
        privacyVersion: typeof body.privacyVersion === "string" ? body.privacyVersion : "unversioned",
      },
    );

    return json({ requested: true, requestId });
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
