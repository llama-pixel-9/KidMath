import { useCallback, useContext, useEffect, useState } from "react";
import { AuthContext } from "./AuthContextValue";
import { PremiumContext } from "./PremiumContextValue";
import { entitlementIsActive, fetchEntitlement } from "./premium";
import PaywallModal from "./PaywallModal";

/**
 * Premium state for the web app. Loads the shared entitlement row whenever
 * auth changes (Stripe on web and StoreKit on iOS both write it), and hosts
 * the paywall modal so any component can call openPaywall().
 */
export function PremiumProvider({ children }) {
  const { user, loading: authLoading } = useContext(AuthContext);
  const [entitlement, setEntitlement] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paywallOpen, setPaywallOpen] = useState(false);

  const refresh = useCallback(async () => {
    if (!user) {
      setEntitlement(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setEntitlement(await fetchEntitlement(user.id));
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (!authLoading) refresh();
  }, [authLoading, refresh]);

  // Returning from Stripe Checkout (?checkout=success): the webhook races
  // the redirect, so poll briefly until the entitlement lands.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("checkout") !== "success" || !user) return;
    let attempts = 0;
    const timer = setInterval(async () => {
      attempts += 1;
      const row = await fetchEntitlement(user.id);
      if (entitlementIsActive(row) || attempts >= 10) {
        setEntitlement(row);
        setLoading(false);
        clearInterval(timer);
      }
    }, 1500);
    return () => clearInterval(timer);
  }, [user]);

  const value = {
    isPremium: entitlementIsActive(entitlement),
    loading: loading || authLoading,
    refresh,
    openPaywall: () => setPaywallOpen(true),
  };

  return (
    <PremiumContext.Provider value={value}>
      {children}
      {paywallOpen && <PaywallModal onClose={() => setPaywallOpen(false)} />}
    </PremiumContext.Provider>
  );
}

export function usePremium() {
  return useContext(PremiumContext);
}
