/**
 * Resend rules for the "Check your email" consent panel (OnboardingFlow).
 *
 * Seconds a parent must wait between consent emails. One tap was landing
 * twice (the old resend was a bare text link with no feedback), and each
 * email is a separate 14-day link — the newest supersedes the rest, see
 * the consent_requests supersede migration.
 */
export const RESEND_COOLDOWN_S = 60;

/** "10:58 PM" in the parent's locale; empty for an unparseable stamp. */
export function formatSentAt(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}
