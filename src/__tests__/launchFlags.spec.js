import { describe, it, expect } from "vitest";
import { signupsOpen, appleSignInEnabled } from "../launchFlags.js";

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

describe("appleSignInEnabled", () => {
  it("is hidden by default — a half-configured Apple provider must never show a dead button", () => {
    expect(appleSignInEnabled({})).toBe(false);
    expect(appleSignInEnabled(undefined)).toBe(false);
    expect(appleSignInEnabled({ VITE_APPLE_SIGNIN_ENABLED: "1" })).toBe(false);
  });

  it("shows only when the deploy sets VITE_APPLE_SIGNIN_ENABLED=true", () => {
    expect(appleSignInEnabled({ VITE_APPLE_SIGNIN_ENABLED: "true" })).toBe(true);
  });
});
