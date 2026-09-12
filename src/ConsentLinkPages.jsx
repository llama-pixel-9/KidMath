// The branded landing pages for the two links in the COPPA consent emails.
//
// The email links point here (larkit.io/confirm-consent, /revoke-consent)
// rather than at the raw Supabase functions host — a parent deciding whether
// to consent for their child should land on a page that looks like the
// product, at the product's own URL. The page POSTs the token to the Edge
// Function only on an explicit button tap: the tap is the parent's
// affirmative act, and it keeps email-scanner prefetches from granting (or,
// worse, revoking) consent on their own.

import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

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

/** larkit.io/confirm-consent?token=… — the link in the direct-notice email. */
export function ConfirmConsentPage() {
  const token = useTokenFromUrl();
  const [state, setState] = useState("ready"); // ready | busy | done | already | failed
  const [kidName, setKidName] = useState("");
  const [message, setMessage] = useState("");

  const confirm = async () => {
    setState("busy");
    try {
      const result = await postToken("consent-confirm", token);
      if (result.ok) {
        setKidName(result.kidFirstName || "your child");
        setState("done");
      } else if (result.reason === "request_not_pending") {
        setState("already");
      } else {
        setMessage(
          "This confirmation link is invalid or has expired. Start adding your child again from the app and we'll send a fresh one."
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
      <Shell title="Parental consent">
        <p className={bodyText}>
          This page needs the link from your consent email. Open the email we sent you and tap the
          confirmation link — or start again from <Link to="/onboarding" className="underline text-teal">the app</Link>.
        </p>
      </Shell>
    );
  }

  if (state === "done") {
    return (
      <Shell title="Consent confirmed">
        <p className={bodyText}>
          Thank you — your consent is recorded and {kidName}'s profile is ready.
        </p>
        <p className={smallText}>
          A confirmation email is on its way; it includes the link to revoke this consent at any
          time. You can also review or delete everything we hold from your account page.
        </p>
        <div className="mt-8">
          <Link to="/profiles" className={`${bigButton} inline-flex items-center no-underline`}>
            Start practising
          </Link>
        </div>
      </Shell>
    );
  }

  if (state === "already") {
    return (
      <Shell title="Already confirmed">
        <p className={bodyText}>
          This consent was already confirmed (or the request expired). If your child's profile
          exists, you're all set — otherwise just add them again from the app.
        </p>
        <div className="mt-8">
          <Link to="/profiles" className={`${bigButton} inline-flex items-center no-underline`}>
            Go to profiles
          </Link>
        </div>
      </Shell>
    );
  }

  if (state === "failed") {
    return (
      <Shell title="Link expired">
        <p className={bodyText}>{message}</p>
        <div className="mt-8">
          <Link to="/onboarding" className={`${bigButton} inline-flex items-center no-underline`}>
            Add your child again
          </Link>
        </div>
      </Shell>
    );
  }

  return (
    <Shell title="One last tap">
      <p className={bodyText}>
        You're confirming your parental consent, as described in the email we sent you: we'll create
        your child's profile and collect only what the notice lists — first name, age, grade, and
        practice activity. No ads, no sale of data, and you can revoke at any time.
      </p>
      <p className={smallText}>
        The full notice is at{" "}
        <Link to="/parental-consent" className="underline text-teal">larkit.io/parental-consent</Link>{" "}
        and our Privacy Policy at <Link to="/privacy" className="underline text-teal">larkit.io/privacy</Link>.
      </p>
      {message && <p className="mt-4 text-sm font-bold text-ember">{message}</p>}
      <div className="mt-8">
        <button type="button" disabled={state === "busy"} className={bigButton} onClick={confirm}>
          {state === "busy" ? "Confirming…" : "I give my consent"}
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
