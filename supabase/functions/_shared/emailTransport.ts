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

/** Resend (chosen for B7, 2026-09-12). Plain fetch — no SDK dependency. */
export function resendTransport(apiKey: string, from: string): EmailTransport {
  return {
    async send(email) {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from,
          to: email.to,
          subject: email.subject,
          text: email.text,
        }),
      });
      if (!res.ok) {
        // The consent flow treats a failed send as a failed request — that is
        // correct (email-plus consent REQUIRES the notice to go out), so
        // surface enough to diagnose without logging the recipient.
        const body = await res.text().catch(() => "");
        throw new Error(`resend send failed: ${res.status} ${body.slice(0, 300)}`);
      }
    },
  };
}

/** The single swap point: Resend when RESEND_API_KEY is set, stub otherwise
 *  (dev/staging and tests keep working unchanged). */
export function getTransport(): EmailTransport {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  if (!apiKey) return stubTransport();
  const from = Deno.env.get("EMAIL_FROM") ?? "Larkit <hello@larkit.io>";
  return resendTransport(apiKey, from);
}
