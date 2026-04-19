import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const isConfigured =
  supabaseUrl && supabaseAnonKey && !supabaseUrl.startsWith("your-");

export const supabase = isConfigured ? createClient(supabaseUrl, supabaseAnonKey) : null;
export const supabaseRestUrl = isConfigured ? `${supabaseUrl.replace(/\/$/, "")}/rest/v1` : null;
export const supabaseAnonKeyValue = isConfigured ? supabaseAnonKey : null;
