// Google Identity Services (GIS) — branded, redirect-free Google sign-in.
//
// Why this exists: the signInWithOAuth redirect flow bounces through
// <ref>.supabase.co, so Google's account chooser shows the raw Supabase
// project domain instead of "Larkit". GIS runs entirely on our origin and
// hands back an ID token that supabase.auth.signInWithIdToken() exchanges
// for the same session — supabase.co never appears in the UI.
//
// Requires VITE_GOOGLE_CLIENT_ID (a Web OAuth client with our origins
// authorized) AND that same client ID listed under the Google provider's
// authorized client IDs in the Supabase dashboard. When either is missing,
// callers fall back to the old redirect flow — see GoogleSignInButton.

export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

const GIS_SRC = "https://accounts.google.com/gsi/client";

let gisPromise = null;

export function loadGis() {
  if (gisPromise) return gisPromise;
  gisPromise = new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) {
      resolve(window.google.accounts.id);
      return;
    }
    const script = document.createElement("script");
    script.src = GIS_SRC;
    script.async = true;
    script.onload = () => {
      if (window.google?.accounts?.id) resolve(window.google.accounts.id);
      else reject(new Error("GIS script loaded but google.accounts.id missing"));
    };
    script.onerror = () => {
      gisPromise = null; // allow a retry on the next mount
      reject(new Error("Failed to load Google Identity Services"));
    };
    document.head.appendChild(script);
  });
  return gisPromise;
}

// GIS wants the SHA-256 of the nonce; Supabase wants the raw nonce back so it
// can verify the token was minted for this exact sign-in attempt.
export async function createNonce() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  let raw = "";
  for (const b of bytes) raw += String.fromCharCode(b);
  const nonce = btoa(raw).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(nonce));
  const hashedNonce = Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return { nonce, hashedNonce };
}
