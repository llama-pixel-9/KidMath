// Complimentary ("comp") entitlements — pilot families, reviewers, make-goods.
//
// A comp is an entitlements row with product_id 'comp', no source, and either
// no expiry or one the admin chose. Both clients treat a missing expires_at as
// a promotional grant (premium.js entitlementIsActive / StoreService.rowIsActive).
// The decision logic lives here, pure, so it is testable from vitest and
// shared by the admin-comps function and scripts/grantEntitlement.mjs.

export const COMP_PRODUCT = "comp";

export type EntitlementRow = {
  user_id: string;
  status: "none" | "active" | "grace" | "expired";
  source: "appstore" | "stripe" | null;
  product_id: string | null;
  expires_at: string | null;
};

export type CompDecision =
  | { kind: "write"; row: Omit<EntitlementRow, "user_id"> }
  | { kind: "skip"; reason: string }
  | { kind: "error"; reason: string };

export function isComp(row: Pick<EntitlementRow, "product_id"> | null | undefined): boolean {
  return row?.product_id === COMP_PRODUCT;
}

function isLive(row: Pick<EntitlementRow, "status"> | null | undefined): boolean {
  return row?.status === "active" || row?.status === "grace";
}

/** YYYY-MM-DD → end of that day, UTC; null → no expiry. */
export function untilToExpiresAt(until: string | null | undefined): string | null {
  if (!until) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(until)) throw new Error("until must be YYYY-MM-DD");
  return `${until}T23:59:59.000Z`;
}

export function planGrant(existing: EntitlementRow | null, until: string | null | undefined): CompDecision {
  if (existing && !isComp(existing) && isLive(existing)) {
    return {
      kind: "skip",
      reason: `already has a live ${existing.source ?? "unknown"} subscription (${existing.product_id ?? "?"}) — leaving it alone`,
    };
  }
  let expires_at: string | null;
  try {
    expires_at = untilToExpiresAt(until);
  } catch (e) {
    return { kind: "error", reason: `${(e as Error).message}` };
  }
  return { kind: "write", row: { status: "active", source: null, product_id: COMP_PRODUCT, expires_at } };
}

export function planRevoke(existing: EntitlementRow | null, now = new Date()): CompDecision {
  if (!existing) return { kind: "skip", reason: "no entitlement row — nothing to revoke" };
  if (!isComp(existing)) {
    return {
      kind: "error",
      reason: `entitlement is ${existing.source ?? "unknown"}/${existing.product_id ?? "?"}, not a comp — revoke it in Stripe or the App Store instead`,
    };
  }
  if (!isLive(existing)) return { kind: "skip", reason: "comp already revoked" };
  return {
    kind: "write",
    row: { status: "expired", source: null, product_id: COMP_PRODUCT, expires_at: now.toISOString() },
  };
}
