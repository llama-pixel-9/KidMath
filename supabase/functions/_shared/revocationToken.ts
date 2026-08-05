// Signed revocation tokens for the COPPA consent confirmation message.
//
// The confirming message a parent receives after granting consent MUST carry
// a working revocation link (16 CFR §312.5(b)(2)(viii)). That link encodes
// { userId, kidId, expiresAt } signed with an HMAC secret
// (CONSENT_REVOCATION_SECRET) so the revoke-consent endpoint can act on it
// without the parent being signed in. Web Crypto only — runs in Deno (Edge
// Functions) and Node (vitest) unchanged.

export type RevocationClaims = {
  userId: string;
  kidId: string;
  /** epoch millis */
  expiresAt: number;
};

const encoder = new TextEncoder();

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(text: string): Uint8Array {
  const padded = text.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(padded + "=".repeat((4 - (padded.length % 4)) % 4));
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

async function hmacKey(secret: string, usage: KeyUsage): Promise<CryptoKey> {
  return await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    [usage],
  );
}

export async function signRevocationToken(
  claims: RevocationClaims,
  secret: string,
): Promise<string> {
  const payload = encoder.encode(JSON.stringify(claims));
  const key = await hmacKey(secret, "sign");
  const signature = new Uint8Array(await crypto.subtle.sign("HMAC", key, payload));
  return `${toBase64Url(payload)}.${toBase64Url(signature)}`;
}

/** Returns the claims when the signature is valid and the token unexpired;
 *  null otherwise. Never throws on malformed input. */
export async function verifyRevocationToken(
  token: string,
  secret: string,
  now: number = Date.now(),
): Promise<RevocationClaims | null> {
  try {
    const [payloadPart, signaturePart] = token.split(".");
    if (!payloadPart || !signaturePart) return null;
    const payload = fromBase64Url(payloadPart);
    const signature = fromBase64Url(signaturePart);
    const key = await hmacKey(secret, "verify");
    const valid = await crypto.subtle.verify("HMAC", key, signature, payload);
    if (!valid) return null;
    const claims = JSON.parse(new TextDecoder().decode(payload)) as RevocationClaims;
    if (!claims || typeof claims.userId !== "string" || typeof claims.kidId !== "string") {
      return null;
    }
    if (typeof claims.expiresAt !== "number" || claims.expiresAt < now) return null;
    return claims;
  } catch {
    return null;
  }
}
