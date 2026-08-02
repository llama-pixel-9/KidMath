import { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";
import { AuthContext } from "./AuthContextValue";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(supabase));

  useEffect(() => {
    if (!supabase) return;

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
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
