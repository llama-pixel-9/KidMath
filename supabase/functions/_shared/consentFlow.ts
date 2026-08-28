// Email-plus verifiable parental consent — 16 CFR §312.5(b)(2)(viii).
//
// The state machine, kept pure so src/__tests__/consentFlow.spec.js can
// drive it against a fake db and prove the load-bearing invariant: NO
// kid_profiles row exists before consent is received. §312.5(c)(1) permits
// holding the parent's contact details (and the pending names) for the sole
// purpose of obtaining consent, and nothing more — the consent_requests row
// is that holding pen, and a scheduled job deletes it if consent never
// arrives.
//
// The two-step shape is what makes email-plus a valid enumerated method:
//   1. beginConsentRequest — deliver the direct notice (content, not a link)
//   2. parent taps the confirmation link
//   3. grant_parental_consent (SQL, one transaction): kid_profiles row +
//      consent_events kind "coppa_vpc"
//   4. confirmConsent sends the confirming message, which MUST carry the
//      revocation notice and a working revocation link — omit it and the
//      method fails in terms.

import { signRevocationToken, verifyRevocationToken } from "./revocationToken.ts";
import type { EmailTransport } from "./emailTransport.ts";

/** "Reasonable time" to hold the parent's contact info awaiting consent —
 *  after this the scheduled job deletes the pending request outright. */
export const CONSENT_REQUEST_TTL_MS = 14 * 24 * 60 * 60 * 1000;

/** Revocation links from the confirmation message stay valid for a year;
 *  after that the account area (or an email to us) still works. */
export const REVOCATION_LINK_TTL_MS = 365 * 24 * 60 * 60 * 1000;

// deno-lint-ignore no-explicit-any
type Db = any;

export type ConsentDeps = {
  db: Db;
  transport: EmailTransport;
  /** HMAC secret shared with the revoke-consent endpoint. */
  secret: string;
  /** e.g. https://<ref>.supabase.co/functions/v1 */
  functionsBaseUrl: string;
  /** Where the branded consent pages live, e.g. https://larkit.io — email
   *  links land there (a parent-facing URL, not the raw functions host) and
   *  the page POSTs the token back to the function. */
  appBaseUrl: string;
  now?: () => number;
};

export type PendingKid = { firstName: string; age: string; grade: string };

/**
 * Step 1 — the parent has begun creating their first child profile. Record
 * the pending request (NOT a kid profile) and deliver the direct notice
 * itself to the parent's email, with the one-tap confirmation link.
 */
export async function beginConsentRequest(
  deps: ConsentDeps,
  args: {
    userId: string;
    parentEmail: string;
    kid: PendingKid;
    /** The rendered parental-consent-notice markdown — delivered in full. */
    noticeText: string;
    termsVersion: string;
    privacyVersion: string;
  },
): Promise<{ requestId: string; confirmUrl: string }> {
  const now = deps.now?.() ?? Date.now();
  const { data, error } = await deps.db
    .from("consent_requests")
    .insert({
      user_id: args.userId,
      kid_first_name: args.kid.firstName,
      kid_age: args.kid.age,
      kid_grade: args.kid.grade,
      terms_version: args.termsVersion,
      privacy_version: args.privacyVersion,
      status: "pending",
      notice_sent_at: new Date(now).toISOString(),
    })
    .select("id")
    .single();
  if (error) throw new Error(`consent request insert: ${error.message}`);

  const confirmToken = await signRevocationToken(
    { userId: args.userId, kidId: data.id, expiresAt: now + CONSENT_REQUEST_TTL_MS },
    deps.secret,
  );
  const confirmUrl = `${deps.appBaseUrl}/confirm-consent?token=${encodeURIComponent(confirmToken)}`;

  await deps.transport.send({
    to: args.parentEmail,
    subject: "Your consent is needed before your child can start practising",
    text:
      `${args.noticeText}\n\n` +
      `------------------------------------------------------------\n` +
      `TO GIVE CONSENT, open this link and tap the Confirm button:\n${confirmUrl}\n\n` +
      `If you do nothing, we will delete your contact information and the ` +
      `name you entered within 14 days, and no profile will be created.\n`,
  });

  return { requestId: data.id, confirmUrl };
}

/** The confirming message — carries (a) what was consented to, (b) that
 *  consent can be revoked, and (c) a working revocation link. All three are
 *  required in terms by §312.5(b)(2)(viii). */
export function buildConfirmationMessage(args: {
  kidFirstName: string;
  revocationUrl: string;
}): string {
  return (
    `You gave your consent — ${args.kidFirstName}'s profile is ready.\n\n` +
    `WHAT YOU CONSENTED TO: we collect ${args.kidFirstName}'s first name, age, ` +
    `and grade (entered by you), a random profile identifier, and practice ` +
    `activity (questions shown, answers given, levels, and rewards earned). ` +
    `Nothing else, no ads, and no sale of data — the full notice is at ` +
    `/parental-consent and the Privacy Policy at /privacy.\n\n` +
    `YOU CAN REVOKE THIS CONSENT AT ANY TIME. Revoking deletes ` +
    `${args.kidFirstName}'s profile and all associated information, and stops ` +
    `any further collection. To revoke, open this link:\n` +
    `${args.revocationUrl}\n\n` +
    `You can also review or delete everything we hold from your account page ` +
    `at any time.\n`
  );
}

/**
 * Steps 3 + 4 — the parent tapped the confirmation link. Verify the token,
 * grant consent in ONE transaction (the grant_parental_consent SQL function
 * writes kid_profiles + consent_events together), then send the confirming
 * message and stamp confirmation_sent_at.
 */
export async function confirmConsent(
  deps: ConsentDeps,
  token: string,
): Promise<
  | { ok: true; kidProfileId: string; kidFirstName: string; revocationUrl: string }
  | { ok: false; reason: string }
> {
  const now = deps.now?.() ?? Date.now();
  const claims = await verifyRevocationToken(token, deps.secret, now);
  if (!claims) return { ok: false, reason: "invalid_or_expired" };

  const { data, error } = await deps.db.rpc("grant_parental_consent", {
    p_request_id: claims.kidId,
  });
  if (error) return { ok: false, reason: error.message };
  const grant = Array.isArray(data) ? data[0] : data;
  if (!grant?.kid_profile_id) return { ok: false, reason: "request_not_pending" };

  const revocationToken = await signRevocationToken(
    { userId: claims.userId, kidId: grant.kid_profile_id, expiresAt: now + REVOCATION_LINK_TTL_MS },
    deps.secret,
  );
  const revocationUrl = `${deps.appBaseUrl}/revoke-consent?token=${encodeURIComponent(revocationToken)}`;

  await deps.transport.send({
    to: grant.parent_email,
    subject: `Consent confirmed — ${grant.kid_first_name} is ready to practise`,
    text: buildConfirmationMessage({ kidFirstName: grant.kid_first_name, revocationUrl }),
  });

  // The confirming message is part of the method — record when it went out,
  // completing the noticeSentAt / consentReceivedAt / confirmationSentAt
  // triple on the consent event. Service-role-only jsonb merge; clients
  // still cannot touch consent_events.
  const confirmationSentAt = new Date(now).toISOString();
  await deps.db.rpc("stamp_consent_confirmation", {
    p_consent_event_id: grant.consent_event_id,
    p_sent_at: confirmationSentAt,
  });
  await deps.db
    .from("consent_requests")
    .update({ confirmation_sent_at: confirmationSentAt })
    .eq("id", claims.kidId);

  return {
    ok: true,
    kidProfileId: grant.kid_profile_id,
    kidFirstName: grant.kid_first_name,
    revocationUrl,
  };
}
