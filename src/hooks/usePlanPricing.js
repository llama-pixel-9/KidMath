import { useEffect, useState } from "react";
import { fetchPlanPricing } from "../premium";

/**
 * Plan prices for any surface that starts a subscription. `pricing` is null
 * until Stripe answers; callers must keep purchase buttons disabled and show
 * no amount while it is null — a disclosure may only state what Stripe will
 * actually charge. `retry` re-fetches after a failure.
 */
export function usePlanPricing() {
  const [pricing, setPricing] = useState(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetchPlanPricing().then(
      (p) => { if (!cancelled) setPricing(p); },
      (e) => { if (!cancelled) setError(e.message || "Could not load prices"); },
    );
    return () => { cancelled = true; };
  }, [attempt]);

  const retry = () => {
    setError("");
    setAttempt((n) => n + 1);
  };

  return { pricing, error, retry };
}
