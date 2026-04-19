import { useEffect, useState } from "react";
import { useAuth } from "./useAuth";
import { supabase } from "./supabaseClient";

/**
 * Returns { isAdmin, loading } for the currently signed-in user.
 * Reads from the public.profiles row (RLS lets users read their own row).
 *
 * The "no fetch needed" cases (auth still loading, no supabase, no user)
 * are derived synchronously from the auth state to avoid setState-in-effect
 * cascades. Only the cloud lookup uses setState, and only inside the async
 * resolution callback.
 */
export function useIsAdmin() {
  const { user, loading: authLoading } = useAuth();
  const skipFetch = authLoading || !supabase || !user;
  const [fetched, setFetched] = useState(null);

  useEffect(() => {
    if (skipFetch) return undefined;
    let cancelled = false;
    supabase
      .from("profiles")
      .select("is_admin")
      .eq("user_id", user.id)
      .single()
      .then(({ data, error }) => {
        if (cancelled) return;
        setFetched({ isAdmin: !error && Boolean(data?.is_admin), userId: user.id });
      });
    return () => {
      cancelled = true;
    };
  }, [skipFetch, user]);

  if (skipFetch) {
    return { isAdmin: false, loading: Boolean(authLoading) };
  }
  if (!fetched || fetched.userId !== user.id) {
    return { isAdmin: false, loading: true };
  }
  return { isAdmin: fetched.isAdmin, loading: false };
}
