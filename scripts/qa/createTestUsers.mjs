/**
 * QA: create the two email/password test households and prove they can sign
 * in with the anon client (what the browser does). Idempotent — re-running
 * finds existing users by email and resets the password.
 *
 *   set -a && source .env.local && source .env && set +a
 *   node scripts/qa/createTestUsers.mjs
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anon = process.env.VITE_SUPABASE_ANON_KEY;
if (!url || !service || !anon) throw new Error("need SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, VITE_SUPABASE_ANON_KEY");

export const TEST_USERS = [
  { email: "qa-household-a@larkit.test", password: "larkit-qa-A-2026!" },
  { email: "qa-household-b@larkit.test", password: "larkit-qa-B-2026!" },
];

const admin = createClient(url, service, { auth: { persistSession: false } });
const out = [];
for (const u of TEST_USERS) {
  const { data: list } = await admin.auth.admin.listUsers({ perPage: 1000 });
  let user = list.users.find((x) => x.email === u.email);
  if (!user) {
    const { data, error } = await admin.auth.admin.createUser({ email: u.email, password: u.password, email_confirm: true });
    if (error) throw error;
    user = data.user;
    console.log("created", u.email, user.id);
  } else {
    const { error } = await admin.auth.admin.updateUserById(user.id, { password: u.password, email_confirm: true });
    if (error) throw error;
    console.log("exists ", u.email, user.id);
  }
  // Prove the browser path: anon client + signInWithPassword.
  const client = createClient(url, anon, { auth: { persistSession: false } });
  const { data, error } = await client.auth.signInWithPassword({ email: u.email, password: u.password });
  if (error) throw new Error(`signInWithPassword failed for ${u.email}: ${error.message}`);
  console.log("sign-in OK", u.email, data.user.id === user.id);
  out.push({ email: u.email, password: u.password, userId: user.id });
}
import { writeFileSync } from "node:fs";
writeFileSync("qa-out/testUsers.json", JSON.stringify(out, null, 2));
console.log("wrote qa-out/testUsers.json");
