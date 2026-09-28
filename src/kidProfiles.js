import { supabase } from "./supabaseClient";
import { getLegalDoc, CURRENT_CONSENT_VERSIONS } from "./legal";
import { isUsStateCode } from "./usStates";

/**
 * Kid profiles (§20 first flight): one parent account, up to four kids, and
 * we store first name, age and grade — plus, when the parent sets it, the
 * state whose test wording the kid sees. Rows live in public.kid_profiles
 * behind own-rows RLS; the active kid is a local pointer only (localStorage
 * keys stay `kidmath-*` — renaming wipes kids' progress).
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
// Cached beside the pointer so the synchronous progress seams (first paint,
// fresh-entry seeding) can read the kid's grade without a round-trip.
const ACTIVE_KID_GRADE_KEY = "kidmath-active-kid-grade";
// The kid's state sits next to the grade for the same reason: a session
// localizes wording (src/content/stateWords.js) before any fetch resolves.
const ACTIVE_KID_STATE_KEY = "kidmath-active-kid-state";

// Selected on every read; the pre-state list is the fallback until the
// 20260928110000 migration lands (PostgREST rejects a select naming a
// column the table lacks, and an empty kid list would lock the family out).
const KID_COLUMNS = "id, first_name, age, grade, state, created_at";
const KID_COLUMNS_PRE_STATE = "id, first_name, age, grade, created_at";
// 42703 is a select naming the column; PGRST204 ("Could not find the 'state'
// column ... in the schema cache") is an update or insert body naming it.
const missingStateColumn = (error) =>
  error?.code === "42703" ||
  error?.code === "PGRST204" ||
  /'state' column|column .*\bstate\b/i.test(error?.message || "");

/** Friendly copy for a state code that is not a US state or DC. */
export const KID_STATE_MESSAGE = "Pick a state from the list, or leave it unset for Common Core wording.";

/**
 * Trim and upper-case a state code; "" / null / undefined mean "not set".
 * Throws on anything outside src/usStates.js so a bad code never reaches the
 * DB check constraint, whose error is not parent language.
 */
export function normalizeKidState(state) {
  if (state == null || String(state).trim() === "") return null;
  const code = String(state).trim().toUpperCase();
  if (!isUsStateCode(code)) throw new Error(KID_STATE_MESSAGE);
  return code;
}

/** Friendly copy for the one DB error a parent can hit while adding a kid. */
export const KID_LIMIT_MESSAGE = `Four kids is the limit for one account. Remove a profile on the account page to add another.`;

export function activeKidGrade() {
  try {
    return localStorage.getItem(ACTIVE_KID_GRADE_KEY) || null;
  } catch {
    return null;
  }
}

/** The active kid's state code, or null: Common Core wording. */
export function activeKidState() {
  try {
    return localStorage.getItem(ACTIVE_KID_STATE_KEY) || null;
  } catch {
    return null;
  }
}

export function activeKidId() {
  try {
    return localStorage.getItem(ACTIVE_KID_KEY);
  } catch {
    return null;
  }
}

export function setActiveKid(id, grade = null, state = null) {
  // A stray code in storage must not throw at a picker tap; treat it as unset.
  let code = null;
  try {
    code = normalizeKidState(state);
  } catch {
    code = null;
  }
  try {
    if (id) {
      localStorage.setItem(ACTIVE_KID_KEY, id);
      if (grade) localStorage.setItem(ACTIVE_KID_GRADE_KEY, String(grade));
      else localStorage.removeItem(ACTIVE_KID_GRADE_KEY);
      if (code) localStorage.setItem(ACTIVE_KID_STATE_KEY, code);
      else localStorage.removeItem(ACTIVE_KID_STATE_KEY);
    } else {
      localStorage.removeItem(ACTIVE_KID_KEY);
      localStorage.removeItem(ACTIVE_KID_GRADE_KEY);
      localStorage.removeItem(ACTIVE_KID_STATE_KEY);
    }
  } catch {
    /* private mode — the picker will just show again next visit */
  }
}

export async function fetchKids(userId) {
  if (!supabase || !userId) return [];
  const read = (columns) =>
    supabase
      .from("kid_profiles")
      .select(columns)
      .eq("user_id", userId)
      .order("created_at", { ascending: true })
      .limit(MAX_KIDS);
  let { data, error } = await read(KID_COLUMNS);
  if (error && missingStateColumn(error)) ({ data, error } = await read(KID_COLUMNS_PRE_STATE));
  if (error) return [];
  // Same shape either way: a row from the fallback read has no `state` key.
  return (data ?? []).map((row) => ({ ...row, state: row.state ?? null }));
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
export async function requestParentalConsent({ firstName, age, grade, state }) {
  if (!supabase) throw new Error("Sign in first");
  const notice = getLegalDoc("parental-consent");
  const { data, error } = await supabase.functions.invoke("request-consent", {
    body: {
      firstName: firstName.trim(),
      age,
      grade,
      // Sent for when the function stores it; today it reads only the fields
      // above, so a kid added this way starts at Common Core wording.
      state: normalizeKidState(state),
      noticeText: notice?.markdown ?? "",
      termsVersion: CURRENT_CONSENT_VERSIONS.terms,
      privacyVersion: CURRENT_CONSENT_VERSIONS.privacy,
    },
  });
  if (error || !data?.requested) {
    throw new Error(error?.message || "Could not send the consent email — try again.");
  }
  // `sentAt` is the server's send time; older deploys don't return it.
  return { ...data, sentAt: data.sentAt || new Date().toISOString() };
}

/**
 * Where a consent request stands — polled by the "Check your email" screen so
 * the app moves on by itself the moment the parent taps the emailed link.
 * "pending" | "granted" | "superseded" | "expired" | null (not ours / gone).
 * RLS: a parent reads only their own requests.
 */
export async function consentRequestStatus(requestId) {
  if (!supabase || !requestId) return null;
  const { data } = await supabase.from("consent_requests").select("status").eq("id", requestId).maybeSingle();
  return data?.status ?? null;
}

/**
 * Update a kid's profile fields. Grade changes every September, so this is
 * routine maintenance, not new collection — the fields are the same three
 * the consent already covers, plus the state, which only picks test wording.
 * `state` left out leaves the stored one alone; "" or null clears it.
 * RLS scopes the write to the parent's own rows.
 */
export async function updateKid(kidId, { firstName, age, grade, state }) {
  if (!supabase || !kidId) throw new Error("Sign in first");
  const fields = { first_name: firstName.trim(), age, grade };
  const patch = state !== undefined ? { ...fields, state: normalizeKidState(state) } : fields;
  const write = (body, columns) =>
    supabase.from("kid_profiles").update(body).eq("id", kidId).select(columns).single();
  let { data, error } = await write(patch, KID_COLUMNS);
  // Until the 20260928110000 migration lands the table has no `state`: the
  // edit form always sends one, so without this retry a parent could not save
  // a grade change. The other fields are saved; a state picked now is dropped,
  // and the card shows Common Core wording, which is what the kid gets.
  if (error && missingStateColumn(error)) ({ data, error } = await write(fields, KID_COLUMNS_PRE_STATE));
  if (error) throw new Error(error.message);
  return { ...data, state: data.state ?? null };
}

/**
 * Add a kid. Without parental consent on file this does NOT write — it
 * kicks off the consent flow and returns `{ pendingConsent: true }`; the
 * profile appears (via the one-transaction grant) when the parent confirms.
 */
export async function addKid(userId, { firstName, age, grade, state }) {
  if (!supabase || !userId) throw new Error("Sign in first");
  const code = normalizeKidState(state);
  if (!(await hasParentalConsent(userId))) {
    const { sentAt, requestId } = await requestParentalConsent({ firstName, age, grade, state: code });
    return { pendingConsent: true, firstName: firstName.trim(), age, grade, state: code, sentAt, requestId };
  }
  const row = { user_id: userId, first_name: firstName.trim(), age, grade };
  // Only name the column when there is a state to store, so an insert from a
  // caller that never asks for one also works before the migration lands.
  if (code) row.state = code;
  const { data, error } = await supabase
    .from("kid_profiles")
    .insert(row)
    .select(code ? KID_COLUMNS : KID_COLUMNS_PRE_STATE)
    .single();
  if (error) {
    // The 4-kid cap lives in the kid_profiles RLS insert policy, which
    // surfaces as a row-level-security violation; say it in parent language.
    if (/row-level security/i.test(error.message)) throw new Error(KID_LIMIT_MESSAGE);
    throw new Error(error.message);
  }
  return { ...data, state: data.state ?? null };
}
