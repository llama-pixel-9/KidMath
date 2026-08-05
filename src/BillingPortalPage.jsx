import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./useAuth";
import { openBillingPortal } from "./premium";

/**
 * /account/billing — the one-step online cancellation path. A signed-in
 * subscriber lands here (from the paywall disclosure, the navbar, or a
 * confirmation email) and is sent straight into the Stripe Billing Portal,
 * which is configured for immediate cancellation with no retention flow.
 * One click after authentication, no survey, no phone step — that is the
 * legal bar (CA/CO/IL/VA/MA/CT/NY ARL statutes), not a UX nicety.
 */
export default function BillingPortalPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const launched = useRef(false);

  useEffect(() => {
    if (!loading && !user) navigate("/signup", { replace: true });
  }, [user, loading, navigate]);

  useEffect(() => {
    if (loading || !user || launched.current) return;
    launched.current = true;
    openBillingPortal().catch((e) => {
      setError(e.message || "Could not open the billing portal.");
    });
  }, [user, loading]);

  if (loading || !user) return null;

  return (
    <main className="flex-1 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md text-center">
        {error ? (
          <>
            <h1 className="font-display font-semibold text-2xl text-ink m-0">Billing</h1>
            <p className="mt-3 text-base font-semibold text-ember">{error}</p>
            <p className="mt-2 text-sm text-ink/60">
              If you subscribed on an iPhone or iPad, manage or cancel in the App Store's
              Subscriptions settings instead.
            </p>
          </>
        ) : (
          <p className="text-base font-semibold text-ink/60">Opening your billing portal…</p>
        )}
      </div>
    </main>
  );
}
