// Email transport seam for the consent flow.
//
// The real transactional sender is not chosen yet (checklist item B7), so
// the flow runs against a stub that logs the full payload. Everything
// consent-related sends through THIS interface — when the sender is chosen
// (Resend/Postmark/SES…), implement it here and nothing in the flow changes.
//
// Deliverability is a compliance dependency for email-plus consent, not just
// a growth one: authenticate the domain (SPF/DKIM/DMARC), monitor bounces,
// and keep the "resend" control working. See docs/legal-implementation.md
// step 4.

export type OutboundEmail = {
  to: string;
  subject: string;
  text: string;
};

export type EmailTransport = {
  send(email: OutboundEmail): Promise<void>;
};

/** Logs the payload instead of sending. The log line is the "sent" event in
 *  dev/staging — grep for [email-stub]. */
export function stubTransport(log: (...args: unknown[]) => void = console.log): EmailTransport {
  return {
    // deno-lint-ignore require-await
    async send(email) {
      log(`[email-stub] to=${email.to} subject=${JSON.stringify(email.subject)}`);
      log(email.text);
    },
  };
}

/** The single swap point. */
export function getTransport(): EmailTransport {
  // TODO(B7): return the real transactional sender once chosen.
  return stubTransport();
}
