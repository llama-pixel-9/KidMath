import { describe, it, expect } from "vitest";
import {
  beginConsentRequest,
  confirmConsent,
  buildConfirmationMessage,
} from "../../supabase/functions/_shared/consentFlow.ts";

// The email-plus VPC state machine (E5). The two invariants the law draws:
//   1. NO kid_profiles row exists between the direct notice going out and
//      the parent's consent arriving (§312.5(c)(1)).
//   2. The confirming message carries the revocation notice and a WORKING
//      revocation link (§312.5(b)(2)(viii) requires it in terms).

const SECRET = "consent-secret";
const NOW = 1_800_000_000_000;
const BASE = "https://example.supabase.co/functions/v1";
const APP = "https://app.example";

/** Fake service-role client: tables + the two SQL functions the migration
 *  defines, with grant_parental_consent behaving transactionally. */
function fakeDb() {
  const tables = {
    consent_requests: [],
    kid_profiles: [],
    consent_events: [],
  };
  let nextId = 0;
  const id = (prefix) => `${prefix}-${++nextId}`;

  return {
    tables,
    from(name) {
      return {
        insert(row) {
          const stored = { id: id(name), ...row };
          tables[name].push(stored);
          return {
            select() {
              return {
                single: () => Promise.resolve({ data: stored, error: null }),
              };
            },
          };
        },
        update(patch) {
          return {
            eq(column, value) {
              tables[name].forEach((row) => {
                if (row[column] === value) Object.assign(row, patch);
              });
              return Promise.resolve({ error: null });
            },
          };
        },
      };
    },
    rpc(fn, args) {
      if (fn === "grant_parental_consent") {
        const req = tables.consent_requests.find(
          (r) => r.id === args.p_request_id && r.status === "pending",
        );
        if (!req) return Promise.resolve({ data: [], error: null });
        const kid = {
          id: id("kid"),
          user_id: req.user_id,
          first_name: req.kid_first_name,
          age: req.kid_age,
          grade: req.kid_grade,
        };
        tables.kid_profiles.push(kid);
        req.status = "granted";
        req.consent_received_at = new Date(NOW).toISOString();
        const event = {
          id: id("evt"),
          user_id: req.user_id,
          kind: "coppa_vpc",
          terms_version: req.terms_version,
          privacy_version: req.privacy_version,
          meta: {
            method: "email-plus",
            noticeSentAt: req.notice_sent_at,
            consentReceivedAt: req.consent_received_at,
            childProfileId: kid.id,
          },
        };
        tables.consent_events.push(event);
        return Promise.resolve({
          data: [{
            kid_profile_id: kid.id,
            consent_event_id: event.id,
            kid_first_name: kid.first_name,
            parent_email: "parent@example.com",
          }],
          error: null,
        });
      }
      if (fn === "stamp_consent_confirmation") {
        const event = tables.consent_events.find((e) => e.id === args.p_consent_event_id);
        if (event) event.meta = { ...event.meta, confirmationSentAt: args.p_sent_at };
        return Promise.resolve({ data: null, error: null });
      }
      return Promise.resolve({ data: null, error: { message: `unknown rpc ${fn}` } });
    },
  };
}

function fakeTransport() {
  const sent = [];
  return { sent, send: (email) => (sent.push(email), Promise.resolve()) };
}

function deps(db, transport) {
  return { db, transport, secret: SECRET, functionsBaseUrl: BASE, appBaseUrl: APP, now: () => NOW };
}

const KID = { firstName: "Maya", age: "7", grade: "2nd" };

async function begin(db, transport) {
  return await beginConsentRequest(deps(db, transport), {
    userId: "user-1",
    parentEmail: "parent@example.com",
    kid: KID,
    noticeText: "## Parental Consent Notice\n(full rendered direct notice)",
    termsVersion: "2026-08-05",
    privacyVersion: "2026-08-05",
  });
}

describe("email-plus consent flow", () => {
  it("delivers the notice content and holds the request — NO kid_profiles row before consent", async () => {
    const db = fakeDb();
    const transport = fakeTransport();
    await begin(db, transport);

    // The invariant: between steps 1 and 3, no child profile exists.
    expect(db.tables.kid_profiles).toEqual([]);
    expect(db.tables.consent_events).toEqual([]);

    expect(db.tables.consent_requests).toHaveLength(1);
    expect(db.tables.consent_requests[0]).toMatchObject({
      status: "pending",
      kid_first_name: "Maya",
    });

    // The notice itself is delivered — content, not merely a link.
    expect(transport.sent).toHaveLength(1);
    expect(transport.sent[0].to).toBe("parent@example.com");
    expect(transport.sent[0].text).toContain("Parental Consent Notice");
    // The link lands on the BRANDED APP page, never the raw functions host.
    expect(transport.sent[0].text).toContain(`${APP}/confirm-consent?token=`);
    expect(transport.sent[0].text).not.toContain("supabase.co");
  });

  it("on confirmation: profile + consent event appear together, with all three timestamps", async () => {
    const db = fakeDb();
    const transport = fakeTransport();
    const { confirmUrl } = await begin(db, transport);
    const token = new URL(confirmUrl).searchParams.get("token");

    const result = await confirmConsent(deps(db, transport), token);
    expect(result.ok).toBe(true);

    expect(db.tables.kid_profiles).toHaveLength(1);
    expect(db.tables.kid_profiles[0]).toMatchObject({ first_name: "Maya", user_id: "user-1" });

    expect(db.tables.consent_events).toHaveLength(1);
    const event = db.tables.consent_events[0];
    expect(event.kind).toBe("coppa_vpc");
    expect(event.meta.noticeSentAt).toBeTruthy();
    expect(event.meta.consentReceivedAt).toBeTruthy();
    expect(event.meta.confirmationSentAt).toBeTruthy();
    expect(event.meta.childProfileId).toBe(db.tables.kid_profiles[0].id);

    expect(db.tables.consent_requests[0].status).toBe("granted");
    expect(db.tables.consent_requests[0].confirmation_sent_at).toBeTruthy();
  });

  it("the confirming message carries the revocation notice and a working revocation link", async () => {
    const db = fakeDb();
    const transport = fakeTransport();
    const { confirmUrl } = await begin(db, transport);
    const token = new URL(confirmUrl).searchParams.get("token");
    const result = await confirmConsent(deps(db, transport), token);

    const confirmation = transport.sent[1];
    expect(confirmation.to).toBe("parent@example.com");
    expect(confirmation.text).toContain("YOU CAN REVOKE THIS CONSENT AT ANY TIME");
    expect(confirmation.text).toContain(`${APP}/revoke-consent?token=`);
    expect(confirmation.text).not.toContain("supabase.co");
    expect(confirmation.text).toContain(result.revocationUrl);
    expect(confirmation.text).toContain("WHAT YOU CONSENTED TO");
  });

  it("rejects an invalid or expired token without writing anything", async () => {
    const db = fakeDb();
    const transport = fakeTransport();
    await begin(db, transport);

    const bad = await confirmConsent(deps(db, transport), "garbage-token");
    expect(bad.ok).toBe(false);
    expect(db.tables.kid_profiles).toEqual([]);
    expect(db.tables.consent_events).toEqual([]);
  });

  it("a second tap on the same link cannot create a second profile", async () => {
    const db = fakeDb();
    const transport = fakeTransport();
    const { confirmUrl } = await begin(db, transport);
    const token = new URL(confirmUrl).searchParams.get("token");

    expect((await confirmConsent(deps(db, transport), token)).ok).toBe(true);
    const again = await confirmConsent(deps(db, transport), token);
    expect(again.ok).toBe(false);
    expect(again.reason).toBe("request_not_pending");
    expect(db.tables.kid_profiles).toHaveLength(1);
  });
});

describe("buildConfirmationMessage", () => {
  it("names the child, the collected categories, and revocability", () => {
    const text = buildConfirmationMessage({
      kidFirstName: "Maya",
      revocationUrl: "https://x/revoke-consent?token=t",
    });
    expect(text).toContain("Maya");
    expect(text).toContain("first name, age");
    expect(text).toContain("REVOKE");
    expect(text).toContain("https://x/revoke-consent?token=t");
  });
});
