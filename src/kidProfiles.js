import { supabase } from "./supabaseClient";

/**
 * Kid profiles (§20 first flight): one parent account, up to four kids, and
 * we store first name, age and grade — nothing else. Rows live in
 * public.kid_profiles behind own-rows RLS; the active kid is a local pointer
 * only (localStorage keys stay `kidmath-*` — renaming wipes kids' progress).
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

export async function addKid(userId, { firstName, age, grade }) {
  if (!supabase || !userId) throw new Error("Sign in first");
  const { data, error } = await supabase
    .from("kid_profiles")
    .insert({ user_id: userId, first_name: firstName.trim(), age, grade })
    .select("id, first_name, age, grade, created_at")
    .single();
  if (error) throw new Error(error.message);
  return data;
}
