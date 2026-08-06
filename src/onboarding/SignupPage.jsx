import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../useAuth";
import { signupsOpen } from "../launchFlags";

/**
 * §20 screen 02 — parent account. Apple + Google only, centred on cream,
 * plain-English copy. Signing in and signing up are the same OAuth buttons;
 * both land on /onboarding, which sends parents with kids straight through.
 */

function AppleLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.05 12.53c-.02-2.06 1.68-3.05 1.76-3.1-.96-1.4-2.45-1.6-2.98-1.62-1.27-.13-2.48.75-3.12.75-.64 0-1.64-.73-2.7-.71-1.39.02-2.67.8-3.38 2.04-1.44 2.5-.37 6.2 1.03 8.23.69 1 1.5 2.11 2.57 2.07 1.03-.04 1.42-.67 2.67-.67 1.24 0 1.6.67 2.69.65 1.11-.02 1.81-1.01 2.49-2.01.78-1.15 1.1-2.27 1.12-2.33-.02-.01-2.14-.82-2.15-3.3zM15 5.4c.57-.69.95-1.65.85-2.6-.82.03-1.8.54-2.39 1.23-.52.6-.98 1.58-.86 2.51.91.07 1.84-.46 2.4-1.14z" />
    </svg>
  );
}

function GoogleLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

export default function SignupPage() {
  const { user, loading, signInWithProvider } = useAuth();
  const navigate = useNavigate();

  // Already signed in? Straight to onboarding — it routes returning parents
  // with kids to the profile picker, never back to a login form.
  useEffect(() => {
    if (!loading && user) navigate("/onboarding", { replace: true });
  }, [user, loading, navigate]);

  // Private-test mode (VITE_SIGNUPS_DISABLED): the free tier stays open to
  // everyone, but account creation is paused. Testers arrive via the
  // ?invite=1 link (see src/launchFlags.js).
  if (!signupsOpen()) {
    return (
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md text-center">
          <h1 className="font-display font-semibold text-3xl sm:text-4xl text-ink m-0">
            Accounts are almost ready
          </h1>
          <p className="mt-3 text-base font-semibold text-ink/60">
            We're putting the finishing touches on family accounts. Meanwhile, every free game
            works right now — no account needed.
          </p>
          <button
            type="button"
            className="mt-8 px-8 h-14 bg-teal text-cream font-display font-semibold text-xl rounded-[18px] shadow-[0_5px_0_#064A41] btn-press cursor-pointer"
            onClick={() => navigate("/play")}
          >
            Play free games
          </button>
          <p className="mt-6 text-sm text-ink/60 leading-relaxed">
            Testing with us? Open your invite link first, then come back here.{" "}
            <Link to="/privacy" className="underline text-ink/60">Privacy Policy</Link>
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md text-center">
        <h1 className="font-display font-semibold text-3xl sm:text-4xl text-ink m-0">
          Create your parent account
        </h1>
        <p className="mt-2 text-base font-semibold text-ink/60">
          You'll add your kids next. One account covers up to four.
        </p>

        <div className="mt-8 space-y-3">
          <button
            type="button"
            className="w-full h-14 rounded-[14px] bg-ink text-white font-bold text-base inline-flex items-center justify-center gap-2.5 cursor-pointer"
            onClick={() => signInWithProvider("apple", "/onboarding")}
          >
            <AppleLogo />
            Continue with Apple
          </button>
          <button
            type="button"
            className="w-full h-14 rounded-[14px] bg-white border-[1.5px] border-ink/15 text-ink font-bold text-base inline-flex items-center justify-center gap-2.5 cursor-pointer hover:border-ink/30"
            onClick={() => signInWithProvider("google", "/onboarding")}
          >
            <GoogleLogo />
            Continue with Google
          </button>
        </div>

        <p className="mt-6 text-sm text-ink/60 leading-relaxed">
          By continuing you agree to the{" "}
          <Link to="/terms" className="underline text-ink/60">Terms</Link> and{" "}
          <Link to="/privacy" className="underline text-ink/60">Privacy Policy</Link>. We never
          show ads and never sell data about your kids.
        </p>

        <p className="mt-6 text-base font-bold text-teal">
          Already have an account? The same buttons sign you in.
        </p>
      </div>
    </main>
  );
}
