/**
 * QA bypass for the consent email (the transport is a stub): grant every
 * pending consent_requests row for a test user by calling the same SQL
 * function the consent-confirm Edge Function calls.
 *   set -a && source .env.local && set +a
 *   node scripts/qa/grantConsent.mjs <email>
 */
import { createClient } from "@supabase/supabase-js";
const email = process.argv[2];
if (!email) throw new Error("usage: grantConsent.mjs <email>");
const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const { data: list } = await admin.auth.admin.listUsers({ perPage: 1000 });
const user = list.users.find((u) => u.email === email);
if (!user) throw new Error("no such user");
const { data: reqs, error } = await admin.from("consent_requests").select("id, kid_first_name, status, notice_sent_at").eq("user_id", user.id).order("created_at");
if (error) throw error;
console.log("requests:", reqs);
for (const r of reqs.filter((x) => x.status === "pending")) {
  const { data, error: e2 } = await admin.rpc("grant_parental_consent", { p_request_id: r.id });
  if (e2) throw e2;
  console.log("granted", r.kid_first_name, data);
}
const { data: kids } = await admin.from("kid_profiles").select("id, first_name, age, grade").eq("user_id", user.id);
console.log("kids:", kids);
