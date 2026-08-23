// The canonical purge sequence for account and child-profile deletion.
//
// Used by the delete-account and revoke-consent Edge Functions (with a
// service-role client) and exercised directly by
// src/__tests__/accountDeletion.spec.js against a fake client — that spec is
// the artifact a school district asks to see: seed an account, delete it,
// prove zero rows remain in every table.
//
// Deletion must be deletion (16 CFR §312.6; Apple 5.1.1(v)) — rows are
// removed, not flagged. Keep this list in sync with the schema: any new
// table holding child or account data MUST be added here, and the spec's
// seed data extended to match.

/** Every table holding data keyed to a parent account (user_id). Engagement
 *  state is localStorage-only in v1 and never reaches the cloud. */
export const USER_DATA_TABLES = [
  "kid_profiles",
  "progress",
  "progress_item_stats",
  "practice_sessions",
  "user_preferences",
  "entitlements",
  "session_diagnostics",
  "consent_events",
  "profiles",
] as const;

type Db = {
  from(table: string): {
    delete(): {
      eq(column: string, value: string): PromiseLike<{ error: { message: string } | null }> & {
        eq(column: string, value: string): PromiseLike<{ error: { message: string } | null }>;
      };
    };
  };
};

/**
 * Purge every row belonging to a user, across every table. The auth.users
 * row itself is deleted by the caller afterwards (auth.admin.deleteUser) —
 * its ON DELETE CASCADE is the backstop if a future table is missed here,
 * but the explicit sweep is what the deletion test proves.
 */
export async function purgeAccountData(db: Db, userId: string): Promise<void> {
  for (const table of USER_DATA_TABLES) {
    const { error } = await db.from(table).delete().eq("user_id", userId);
    if (error) throw new Error(`purge ${table}: ${error.message}`);
  }
}

/**
 * Delete one child profile. Cloud progress in v1 is account-level (keyed
 * user_id + mode, no kid_id column); the practice log (practice_sessions)
 * is the one kid-scoped table, so both go; deleting it also stops any further collection
 * about that child (§312.6(a)(2)). Scoped to the owning user so a forged
 * kidId can never cross accounts.
 */
export async function purgeKidData(
  db: Db,
  { userId, kidId }: { userId: string; kidId: string },
): Promise<void> {
  // The practice log is child-scoped (kid_id) — remove it outright rather
  // than leaving detached rows behind; the FK's SET NULL is only a backstop.
  const sessions = await db.from("practice_sessions").delete().eq("kid_id", kidId).eq("user_id", userId);
  if (sessions.error) throw new Error(`purge practice_sessions: ${sessions.error.message}`);
  const { error } = await db.from("kid_profiles").delete().eq("id", kidId).eq("user_id", userId);
  if (error) throw new Error(`purge kid_profiles: ${error.message}`);
}
