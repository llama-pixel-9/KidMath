import { describe, expect, it } from "vitest";
import { FREE_MODE_IDS, entitlementIsActive, isFreeMode, paywallEnabled } from "../premium";
import { MODE_IDS } from "../modes";

// The web premium split (pricing decision 2026-07-21): four operations +
// counting free forever; the other 17 modes premium. These tests mirror the
// iOS suite's StoreTests so both platforms enforce the same rules.
describe("free tier", () => {
  it("keeps exactly the four operations plus counting free", () => {
    expect(FREE_MODE_IDS.sort()).toEqual(
      ["addition", "counting", "division", "multiplication", "subtraction"].sort()
    );
  });

  it("every free mode is a real engine mode", () => {
    for (const id of FREE_MODE_IDS) {
      expect(MODE_IDS).toContain(id);
    }
  });

  it("locks the remaining 17 modes", () => {
    const locked = MODE_IDS.filter((id) => !isFreeMode(id));
    expect(locked).toHaveLength(MODE_IDS.length - FREE_MODE_IDS.length);
    expect(locked).toContain("fractions");
    expect(locked).toContain("time");
  });
});

describe("entitlementIsActive (mirror of iOS StoreService.rowIsActive)", () => {
  const now = Date.parse("2026-07-21T12:00:00Z");
  const future = "2026-07-22T12:00:00Z";
  const past = "2026-07-20T12:00:00Z";

  it("accepts active and grace rows with future expiry", () => {
    expect(entitlementIsActive({ status: "active", expires_at: future }, now)).toBe(true);
    expect(entitlementIsActive({ status: "grace", expires_at: future }, now)).toBe(true);
  });

  it("rejects expired timestamps even when status is stale-active", () => {
    expect(entitlementIsActive({ status: "active", expires_at: past }, now)).toBe(false);
  });

  it("rejects non-active statuses regardless of expiry", () => {
    expect(entitlementIsActive({ status: "expired", expires_at: future }, now)).toBe(false);
    expect(entitlementIsActive({ status: "none", expires_at: null }, now)).toBe(false);
  });

  it("treats a missing expiry as active (promotional grant)", () => {
    expect(entitlementIsActive({ status: "active", expires_at: null }, now)).toBe(true);
  });

  it("handles null rows (signed out / no row yet)", () => {
    expect(entitlementIsActive(null, now)).toBe(false);
    expect(entitlementIsActive(undefined, now)).toBe(false);
  });
});

describe("paywallEnabled — the launch switch", () => {
  it("is OFF by default: no env var means everything stays free", () => {
    expect(paywallEnabled({})).toBe(false);
    expect(paywallEnabled(undefined)).toBe(false);
    expect(paywallEnabled({ VITE_PAYWALL_ENABLED: undefined })).toBe(false);
  });

  it("only the exact string 'true' arms the paywall", () => {
    expect(paywallEnabled({ VITE_PAYWALL_ENABLED: "true" })).toBe(true);
    expect(paywallEnabled({ VITE_PAYWALL_ENABLED: "1" })).toBe(false);
    expect(paywallEnabled({ VITE_PAYWALL_ENABLED: "TRUE" })).toBe(false);
    expect(paywallEnabled({ VITE_PAYWALL_ENABLED: true })).toBe(false);
  });

  it("is off in this test build (no VITE_PAYWALL_ENABLED in the env)", () => {
    expect(paywallEnabled()).toBe(false);
  });
});
