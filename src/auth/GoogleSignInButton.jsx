import { useEffect, useRef, useState } from "react";
import { supabase } from "../supabaseClient";
import { GOOGLE_CLIENT_ID, loadGis, createNonce } from "./googleIdentity";

/**
 * The one Google button. Renders the official GIS button and signs in via
 * signInWithIdToken — no redirect, no supabase.co in Google's account
 * chooser, and (for the in-session prompt) the kid's session survives.
 *
 * `fallback` is the caller's old redirect-flow button. It renders whenever
 * GIS can't run: VITE_GOOGLE_CLIENT_ID unset, Supabase unconfigured, the
 * script blocked by an ad blocker, or a token exchange failure. Ship-safe
 * before the Google Cloud setup is done — behavior is identical until the
 * env var appears.
 */
export default function GoogleSignInButton({ onSignedIn, fallback }) {
  const containerRef = useRef(null);
  const [mode, setMode] = useState(
    GOOGLE_CLIENT_ID && supabase ? "loading" : "fallback"
  );

  // GIS's callback outlives any single render; the ref keeps it pointed at
  // the freshest onSignedIn without re-initializing the button.
  const onSignedInRef = useRef(onSignedIn);
  useEffect(() => {
    onSignedInRef.current = onSignedIn;
  }, [onSignedIn]);

  useEffect(() => {
    if (mode !== "loading") return;
    let cancelled = false;

    (async () => {
      try {
        const [gis, { nonce, hashedNonce }] = await Promise.all([
          loadGis(),
          createNonce(),
        ]);
        if (cancelled || !containerRef.current) return;

        gis.initialize({
          client_id: GOOGLE_CLIENT_ID,
          nonce: hashedNonce,
          callback: async (response) => {
            const { error } = await supabase.auth.signInWithIdToken({
              provider: "google",
              token: response.credential,
              nonce,
            });
            if (error) {
              console.error("Google ID-token sign-in failed", error);
              setMode("fallback");
              return;
            }
            onSignedInRef.current?.();
          },
        });
        gis.renderButton(containerRef.current, {
          type: "standard",
          theme: "outline",
          size: "large",
          text: "continue_with",
          shape: "pill",
          logo_alignment: "left",
          width: Math.min(400, containerRef.current.offsetWidth || 368),
        });
        setMode("ready");
      } catch (error) {
        console.warn("GIS unavailable, using redirect sign-in", error);
        if (!cancelled) setMode("fallback");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [mode]);

  if (mode === "fallback") return fallback;

  // min-height ≈ the GIS large button, so the surface doesn't jump when it
  // pops in (or when we bail to the fallback).
  return (
    <div
      ref={containerRef}
      className="w-full min-h-[44px] flex items-center justify-center"
    />
  );
}
