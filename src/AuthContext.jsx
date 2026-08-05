import { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";
import { AuthContext } from "./AuthContextValue";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(supabase));

  useEffect(() => {
    if (!supabase) return;

    // supabase-js re-emits auth events on every tab refocus (token refresh),
    // each carrying a NEW user object for the same signed-in user. Swapping
    // the context value on every event made everything keyed off `user`
    // re-run — mid-session rebuilds included — so the same identity keeps the
    // same object reference.
    const applySession = (session) => {
      const next = session?.user ?? null;
      setUser((prev) => (prev?.id === next?.id ? prev : next));
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      applySession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        applySession(session);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // §20: Apple or Google only — no email/password anywhere. `redirectPath`
  // lets the signup screen land the parent on /onboarding after the OAuth
  // round-trip (the path must be allow-listed in the Supabase auth config).
  const signInWithProvider = async (provider, redirectPath = "/") => {
    if (!supabase) {
      console.warn("Supabase not configured — set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env");
      return;
    }
    await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: window.location.origin + redirectPath },
    });
  };

  // Kept without parameters: existing callers pass it straight to onClick.
  const signInWithGoogle = async () => signInWithProvider("google");

  const signOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signInWithGoogle, signInWithProvider, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
