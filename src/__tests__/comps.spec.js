import { describe, it, expect } from "vitest";
import {
  planGrant,
  planRevoke,
  untilToExpiresAt,
  COMP_PRODUCT,
} from "../../supabase/functions/_shared/comps.ts";

// Comps must never clobber a paying subscription, and revoke must never
// touch a Stripe/App Store row (those are cancelled at the source).

const stripeLive = { user_id: "u", status: "active", source: "stripe", product_id: "price_x", expires_at: "2027-01-01T00:00:00Z" };
const stripeExpired = { ...stripeLive, status: "expired" };
const compLive = { user_id: "u", status: "active", source: null, product_id: COMP_PRODUCT, expires_at: null };

describe("planGrant", () => {
  it("grants a no-expiry comp to a user with no row", () => {
    const d = planGrant(null, null);
    expect(d.kind).toBe("write");
    expect(d.row).toEqual({ status: "active", source: null, product_id: "comp", expires_at: null });
  });

  it("honours --until as end of that UTC day", () => {
    const d = planGrant(null, "2027-03-01");
    expect(d.row.expires_at).toBe("2027-03-01T23:59:59.000Z");
    expect(untilToExpiresAt(null)).toBeNull();
  });

  it("rejects a malformed until", () => {
    expect(planGrant(null, "3/1/2027").kind).toBe("error");
  });

  it("never overwrites a live paid subscription", () => {
    const d = planGrant(stripeLive, null);
    expect(d.kind).toBe("skip");
    expect(d.reason).toMatch(/stripe/);
  });

  it("does replace an expired paid row (a lapsed family can be comped)", () => {
    expect(planGrant(stripeExpired, null).kind).toBe("write");
  });

  it("re-granting a live comp just rewrites it (e.g. to change the expiry)", () => {
    const d = planGrant(compLive, "2027-06-30");
    expect(d.kind).toBe("write");
    expect(d.row.expires_at).toBe("2027-06-30T23:59:59.000Z");
  });
});

describe("planRevoke", () => {
  it("expires a live comp now", () => {
    const now = new Date("2026-09-14T00:00:00Z");
    const d = planRevoke(compLive, now);
    expect(d.kind).toBe("write");
    expect(d.row.status).toBe("expired");
    expect(d.row.expires_at).toBe(now.toISOString());
  });

  it("refuses to touch a paid subscription", () => {
    const d = planRevoke(stripeLive);
    expect(d.kind).toBe("error");
    expect(d.reason).toMatch(/Stripe or the App Store/);
  });

  it("is a no-op with no row or an already-revoked comp", () => {
    expect(planRevoke(null).kind).toBe("skip");
    expect(planRevoke({ ...compLive, status: "expired" }).kind).toBe("skip");
  });
});
