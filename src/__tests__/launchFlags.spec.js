import { describe, it, expect } from "vitest";
import { signupsOpen } from "../launchFlags.js";

// Private-test mode: prod sets VITE_SIGNUPS_DISABLED=true so new visitors
// can't create accounts (and can't reach the consent flow before its email
// sender exists) — while invited testers pass through.

describe("signupsOpen", () => {
  it("defaults open when the flag is unset", () => {
    expect(signupsOpen({}, false)).toBe(true);
    expect(signupsOpen(undefined, false)).toBe(true);
  });

  it("closes when the deploy sets VITE_SIGNUPS_DISABLED=true", () => {
    expect(signupsOpen({ VITE_SIGNUPS_DISABLED: "true" }, false)).toBe(false);
  });

  it("always lets invited browsers through", () => {
    expect(signupsOpen({ VITE_SIGNUPS_DISABLED: "true" }, true)).toBe(true);
  });

  it("treats anything but the literal string true as open", () => {
    expect(signupsOpen({ VITE_SIGNUPS_DISABLED: "1" }, false)).toBe(true);
    expect(signupsOpen({ VITE_SIGNUPS_DISABLED: "false" }, false)).toBe(true);
  });
});
