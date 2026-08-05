import { supabase } from "./supabaseClient";
import { getLegalDoc, CURRENT_CONSENT_VERSIONS } from "./legal";

/**
 * Kid profiles (§20 first flight): one parent account, up to four kids, and
 * we store first name, age and grade — nothing else. Rows live in
 * public.kid_profiles behind own-rows RLS; the active kid is a local pointer
 * only (localStorage keys stay `kidmath-*` — renaming wipes kids' progress).
 *
 * COPPA (16 CFR §312.5): nothing about a child is written until the parent's
 * email-plus consent completes. The FIRST addKid on an account routes
 * through the request-consent Edge Function — the profile row is created
 * server-side, in one transaction with the consent record, only when the
 * parent taps the confirmation link in the direct-notice email.
 */

export const MAX_KIDS = 4;

export const KID_AGES = ["5", "6", "7", "8", "9", "10", "11", "12+"];
export const KID_GRADES = ["K", "1st", "2nd", "3rd", "4th", "5th", "6th"];

const ACTIVE_KID_KEY = "kidmath-active-kid";

export function activeKidId() {
  try {
    return localStorage.getItem(ACTIVE_KID_KEY);
  } catch {
    return null;
  }
}

export function setActiveKid(id) {
  try {
    if (id) localStorage.setItem(ACTIVE_KID_KEY, id);
    else localStorage.removeItem(ACTIVE_KID_KEY);
  } catch {
    /* private mode — the picker will just show again next visit */
  }
}

export async function fetchKids(userId) {
  if (!supabase || !userId) return [];
  const { data, error } = await supabase
    .from("kid_profiles")
    .select("id, first_name, age, grade, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(MAX_KIDS);
  if (error) return [];
  return data ?? [];
}

/**
 * Does this account hold verifiable parental consent? True when the latest
 * coppa_vpc / coppa_revoked event is a grant.
 */
export async function hasParentalConsent(userId) {
  if (!supabase || !userId) return false;
  const { data, error } = await supabase
    .from("consent_events")
    .select("kind")
    .eq("user_id", userId)
    .in("kind", ["coppa_vpc", "coppa_revoked"])
    .order("created_at", { ascending: false })
    .limit(1);
  if (error) return false;
  return data?.[0]?.kind === "coppa_vpc";
}

/**
 * Start the email-plus consent flow: the direct notice (rendered, content
 * included — not a link) goes to the account email with a one-tap
 * confirmation link. The kid's details wait server-side in consent_requests;
 * no kid_profiles row exists until the parent confirms.
 */
export async function requestParentalConsent({ firstName, age, grade }) {
  if (!supabase) throw new Error("Sign in first");
  const notice = getLegalDoc("parental-consent");
  const { data, error } = await supabase.functions.invoke("request-consent", {
    body: {
      firstName: firstName.trim(),
      age,
      grade,
      noticeText: notice?.markdown ?? "",
      termsVersion: CURRENT_CONSENT_VERSIONS.terms,
      privacyVersion: CURRENT_CONSENT_VERSIONS.privacy,
    },
  });
  if (error || !data?.requested) {
    throw new Error(error?.message || "Could not send the consent email — try again.");
  }
  return data;
}

/**
 * Add a kid. Without parental consent on file this does NOT write — it
 * kicks off the consent flow and returns `{ pendingConsent: true }`; the
 * profile appears (via the one-transaction grant) when the parent confirms.
 */
export async function addKid(userId, { firstName, age, grade }) {
  if (!supabase || !userId) throw new Error("Sign in first");
  if (!(await hasParentalConsent(userId))) {
    await requestParentalConsent({ firstName, age, grade });
    return { pendingConsent: true, firstName: firstName.trim(), age, grade };
  }
  const { data, error } = await supabase
    .from("kid_profiles")
    .insert({ user_id: userId, first_name: firstName.trim(), age, grade })
    .select("id, first_name, age, grade, created_at")
    .single();
  if (error) throw new Error(error.message);
  return data;
}
