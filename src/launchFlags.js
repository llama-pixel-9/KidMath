/**
 * Launch switches (companions to premium.js's paywallEnabled).
 *
 * Private-test mode: set VITE_SIGNUPS_DISABLED=true in the Vercel prod env
 * and the signup door closes — new visitors can still play the account-free
 * free tier, but cannot create an account (and therefore never reach the
 * add-a-kid consent flow, which is waiting on the real email sender — see
 * docs/go-live-tracker.md §3). Unset the var and redeploy to open signups.
 *
 * Testers get in with the invite link: https://larkit.io/?invite=1 sets a
 * localStorage marker that survives the session. This is a soft gate for a
 * quiet-test window, not a security boundary — anyone who reads the bundle
 * can find it, and that's fine; RLS and the consent flow are the real
 * controls.
 */

const INVITE_KEY = "larkit-invite";

/** Call once at boot: ?invite=1 marks this browser as a test participant. */
export function captureInvite() {
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get("invite") === "1") localStorage.setItem(INVITE_KEY, "1");
  } catch {
    /* private mode */
  }
}

export function hasInvite() {
  try {
    return localStorage.getItem(INVITE_KEY) === "1";
  } catch {
    return false;
  }
}

/** Signups are open unless the deploy says otherwise; invited browsers are
 *  always let through. */
export function signupsOpen(env = import.meta.env, invited = hasInvite()) {
  if (invited) return true;
  return env?.VITE_SIGNUPS_DISABLED !== "true";
}
