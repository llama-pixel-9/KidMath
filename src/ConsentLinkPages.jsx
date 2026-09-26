// The branded landing pages for the two links in the COPPA consent emails.
//
// The email links point here (larkit.io/confirm-consent, /revoke-consent)
// rather than at the raw Supabase functions host — a parent deciding whether
// to consent for their child should land on a page that looks like the
// product, at the product's own URL. The page POSTs the token to the Edge
// Function only on an explicit button tap: the tap is the parent's
// affirmative act, and it keeps email-scanner prefetches from granting (or,
// worse, revoking) consent on their own.

import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { confirmOutcome } from "./consent/confirmOutcome.js";

const FUNCTIONS_BASE = import.meta.env.VITE_SUPABASE_URL
  ? `${import.meta.env.VITE_SUPABASE_URL.replace(/\/$/, "")}/functions/v1`
  : null;

async function postToken(fn, token) {
  if (!FUNCTIONS_BASE) throw new Error("Service not configured");
  const response = await fetch(`${FUNCTIONS_BASE}/${fn}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  });
  const data = await response.json().catch(() => ({}));
  return { status: response.status, ...data };
}

function useTokenFromUrl() {
  return useMemo(() => {
    try {
      return new URLSearchParams(window.location.search).get("token") ?? "";
    } catch {
      return "";
    }
  }, []);
}

function Shell({ title, children }) {
  return (
    <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-10">
      <h1 className="font-display font-semibold text-4xl text-ink m-0">{title}</h1>
      {children}
    </main>
  );
}

const bodyText = "mt-3 text-base font-semibold text-ink/70 max-w-xl";
const smallText = "mt-3 text-sm font-semibold text-ink/60 max-w-xl";
const bigButton =
  "px-8 h-14 bg-teal text-cream font-display font-semibold text-xl rounded-[18px] shadow-[0_5px_0_#064A41] btn-press cursor-pointer disabled:opacity-40";

/**
 * larkit.io/confirm-consent?token=… — the link in the direct-notice email.
 *
 * The email button IS the consent ("I give my consent for Aaru"), so this page
 * confirms as soon as it loads — no second button. It confirms from script (a
 * POST), never from the link itself, so an email security scanner that
 * prefetches links cannot consent on a parent's behalf.
 *
 * Failures are told apart: a token that is really expired or was replaced by
 * a resend sends the parent back to the app; anything else (the service down,
 * a deploy without --no-verify-jwt answering 401, no network) is a retry —
 * that catch-all once read "Link expired" and sent two families in a loop.
 */
export function ConfirmConsentPage() {
  const token = useTokenFromUrl();
  const [state, setState] = useState("busy"); // busy | done | already | superseded | expired | unavailable
  const [kidName, setKidName] = useState("");
  const [detail, setDetail] = useState("");

  const confirm = useCallback(async () => {
    let result;
    try {
      result = await postToken("consent-confirm", token);
    } catch {
      result = { status: 0 };
    }
    const outcome = confirmOutcome(result);
    if (outcome.state === "done") setKidName(outcome.kidFirstName);
    if (outcome.state === "unavailable") {
      setDetail(
        outcome.reason === "network"
          ? "We couldn't reach the server — check your connection and try again."
          : "We couldn't confirm just now. Your link is still good — try again in a moment."
      );
    }
    setState(outcome.state);
  }, [token]);

  // Confirm on load. (The state changes happen after the network round trip,
  // never synchronously inside the effect.)
  useEffect(() => {
    if (!token) return;
    const run = () => confirm();
    const id = setTimeout(run, 0);
    return () => clearTimeout(id);
  }, [token, confirm]);

  if (!token) {
    return (
      <Shell title="Parental consent">
        <p className={bodyText}>
          This page needs the link from your consent email. Open the email we sent you and tap the
          confirmation link — or start again from <Link to="/onboarding" className="underline text-teal">the app</Link>.
        </p>
      </Shell>
    );
  }

  if (state === "busy") {
    return (
      <Shell title="Confirming…">
        <p className={bodyText} role="status" aria-live="polite">Recording your consent — one moment.</p>
      </Shell>
    );
  }

  if (state === "done") {
    return (
      <Shell title={`Done — ${kidName} is ready`}>
        <p className={bodyText}>
          Your consent is recorded and {kidName}'s profile is ready. If larkit is still open on
          another tab or device, it will move on by itself.
        </p>
        <p className={smallText}>
          A confirmation email is on its way; it includes the link to revoke this consent at any
          time. You can also review or delete everything we hold from your account page.
        </p>
        <div className="mt-8">
          <Link to="/profiles" className={`${bigButton} inline-flex items-center no-underline`}>
            Back to larkit
          </Link>
        </div>
      </Shell>
    );
  }

  if (state === "superseded") {
    // A resend replaced this email. Say so — "expired" here sent a parent
    // back to re-add their child when their newest email was fine.
    return (
      <Shell title="This link was replaced">
        <p className={bodyText}>
          You asked us to resend the consent email, so this older link no longer works. Open the
          most recent email from hello@larkit.io and tap the link there.
        </p>
        <p className={smallText}>
          Already confirmed from the newer email? Then you're all set.
        </p>
        <div className="mt-8">
          <Link to="/profiles" className={`${bigButton} inline-flex items-center no-underline`}>
            Go to profiles
          </Link>
        </div>
      </Shell>
    );
  }

  if (state === "already") {
    return (
      <Shell title="Already confirmed">
        <p className={bodyText}>
          This consent was already confirmed — nothing more to do. If your child's profile
          exists, you're all set; otherwise just add them again from the app.
        </p>
        <div className="mt-8">
          <Link to="/profiles" className={`${bigButton} inline-flex items-center no-underline`}>
            Go to profiles
          </Link>
        </div>
      </Shell>
    );
  }

  if (state === "expired") {
    return (
      <Shell title="Link expired">
        <p className={bodyText}>
          Consent links work for 14 days, and this one has run out. Add your child again from the
          app and we'll send a fresh one.
        </p>
        <div className="mt-8">
          <Link to="/onboarding" className={`${bigButton} inline-flex items-center no-underline`}>
            Add your child again
          </Link>
        </div>
      </Shell>
    );
  }

  return (
    <Shell title="We couldn't confirm just now">
      <p className={bodyText} role="alert">{detail}</p>
      <div className="mt-8">
        <button type="button" className={bigButton} onClick={() => { setState("busy"); confirm(); }}>
          Try again
        </button>
      </div>
    </Shell>
  );
}

/** larkit.io/revoke-consent?token=… — the link in the confirmation email. */
export function RevokeConsentPage() {
  const token = useTokenFromUrl();
  const [state, setState] = useState("ready"); // ready | busy | done | failed
  const [message, setMessage] = useState("");

  const revoke = async () => {
    setState("busy");
    try {
      const result = await postToken("revoke-consent", token);
      if (result.ok) {
        setState("done");
      } else {
        setMessage(
          "This revocation link is invalid or has expired. You can still delete your child's profile any time from your account settings, or email us and we will do it for you."
        );
        setState("failed");
      }
    } catch {
      setMessage("We couldn't reach the server — check your connection and try again.");
      setState("ready");
    }
  };

  if (!token) {
    return (
      <Shell title="Revoke consent">
        <p className={bodyText}>
          This page needs the link from your confirmation email. You can also delete your child's
          profile any time from <Link to="/account" className="underline text-teal">your account page</Link>.
        </p>
      </Shell>
    );
  }

  if (state === "done") {
    return (
      <Shell title="Consent revoked">
        <p className={bodyText}>
          Done. Your child's profile and its data have been deleted, and no further information will
          be collected about them.
        </p>
        <p className={smallText}>You can close this page.</p>
      </Shell>
    );
  }

  if (state === "failed") {
    return (
      <Shell title="Link expired">
        <p className={bodyText}>{message}</p>
        <div className="mt-8">
          <Link to="/account" className={`${bigButton} inline-flex items-center no-underline`}>
            Go to your account
          </Link>
        </div>
      </Shell>
    );
  }

  return (
    <Shell title="Revoke consent?">
      <p className={bodyText}>
        This deletes your child's profile and all associated information, and stops any further
        collection. It cannot be undone — practice history, levels, and rewards are gone with it.
      </p>
      {message && <p className="mt-4 text-sm font-bold text-ember">{message}</p>}
      <div className="mt-8 flex items-center gap-4 flex-wrap">
        <button type="button" disabled={state === "busy"} className={bigButton} onClick={revoke}>
          {state === "busy" ? "Revoking…" : "Yes, revoke and delete"}
        </button>
        <Link to="/" className="text-teal font-bold text-base no-underline">
          Keep the profile
        </Link>
      </div>
    </Shell>
  );
}
