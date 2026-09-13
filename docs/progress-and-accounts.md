# Progress, kid profiles, and the account page — how it all works

Reference for how student progress is stored and synced, how kid profiles are
modeled, and what the `/account` page does (and doesn't) surface. Written
2026-08-06 against branch `larkit-rebrand`.

**The one fact that explains most of this doc: math progress is stored per
household account, not per kid.** The `progress` table and the localStorage
blob are keyed by `(user_id, mode)` — there is no `kid_id` anywhere in the
progress data. Kid profiles exist (name/age/grade, COPPA surface, engagement
theming) but siblings on one account share a single set of levels, mistake
banks, and stats. That is why `/account` cannot show per-kid progress today.

---

## 1. Math progress — two stores, one shape

### Local (signed out / offline): `src/progressStore.js`

- One localStorage blob under key **`kidmath-progress`**, a JSON object keyed
  by mode id (`progressStore.js:3`).
- Per-mode fields (`saveLocal`, `progressStore.js:80-92`):
  - `level` — 1..10, clamped (`MAX_LEVEL = 10`)
  - `mistakeBank` — capped at 20 entries
  - `totalSessions` — monotonic counter, +1 per save
  - `lifetimeStars` — accumulates `starsEarned` (flight payout) or falls back
    to `firstTryCorrect`
  - `bankItemStats` — `itemId → {attempts, firstTryCorrect, correct,
    totalResponseMs, lastSeenAt}`, merged additively, trimmed to the 200
    most-recently-seen items
  - `recentBankItemIds` — last 12, used for repeat-avoidance
- **No schema version / migrations.** `readLocalStore` just parses and falls
  back to `{}`; per-field defaults in `loadLocal` are the only tolerance for
  old shapes.
- `loadProgressSync(mode)` is the local-only synchronous read used for first
  paint before auth resolves (`main.jsx`, `HomePage.jsx`, `GrownUpsPanel`).

### Cloud (signed in): Supabase

Two tables, own-row RLS, both keyed by `user_id` (household), **not** kid:

| Table | Key | Columns | Migration |
|---|---|---|---|
| `progress` | unique `(user_id, mode)` | `level`, `mistake_bank` jsonb, `total_sessions`, `lifetime_stars`, `updated_at` | `20260720130000_create_progress.sql` |
| `progress_item_stats` | PK `(user_id, mode, item_id)` | `attempts`, `first_try_correct`, `correct`, `total_response_ms`, `last_seen_at` | `0002_create_progress_item_stats.sql` |

`recentBankItemIds` is deliberately not persisted to cloud — treated as a
session-window concern (`progressStore.js:168-169`).

### Which store is used when

`loadProgress` / `saveProgress` (`progressStore.js:229-242`) branch on the
Supabase session: signed in → cloud, otherwise → localStorage. If the Supabase
env vars are unset, `supabase` is null and everything degrades to local.

### Sync timing

- **Saves happen only at session end** — `persistSession` in
  `src/MathExplorer.jsx` (called from `finishSession` and the fledging
  branch). Nothing is written per-answer, and there is no debounce because
  there is no mid-session write.
- `saveCloud` is a **read-modify-write**: it loads the cloud row first to
  compute `totalSessions + 1` and `lifetimeStars + earned`, then upserts.
  Two devices finishing sessions concurrently can race; last write wins on
  `level`/`mistake_bank` and one increment can be lost. Known, accepted for v1.
- **On sign-in**, `mergeLocalToCloud(userId)` (`progressStore.js:197-225`,
  triggered from the `userId` effect in `MathExplorer.jsx`) folds anonymous
  local progress into the cloud: `max(level)`, prefer cloud mistake bank, sum
  sessions/stars/item-stats — then deletes the local blob unconditionally.
  (iOS keeps the local copy on merge failure and retries next sign-in; web
  does not.)

## 2. Kid profiles — identity surface only

- Table **`kid_profiles`** (`20260802150000_create_kid_profiles.sql`): just
  `first_name`, `age`, `grade` + `user_id` and timestamps. The 4-kid cap
  (`MAX_KIDS = 4`, `src/kidProfiles.js:17`) is enforced *inside the RLS
  insert policy*, not only in the client.
- **The active kid is a device-local pointer**: `localStorage`
  key `kidmath-active-kid` (`kidProfiles.js:22-39`). No cloud record of who
  is playing. Switching kids on the profile picker changes engagement/theming
  only — it does **not** change math progress.
- **COPPA gate on the first kid** (`kidProfiles.js:100-113`): the first
  `addKid` on an account does not insert. It invokes the `request-consent`
  Edge Function; the kid's details wait server-side in `consent_requests`,
  and the `kid_profiles` row is created in one transaction with the consent
  record only when the parent taps the email confirmation link. Subsequent
  kids (consent already on file) insert directly.
  - ⚠️ iOS divergence: `KidProfilesService.addKid`
    (`ios/KidMath/Services/KidProfilesService.swift`) inserts directly with
    **no consent gate**.

### Where kids are added / selected / removed

| Action | Web | iOS |
|---|---|---|
| Add | Onboarding wizard only — `/onboarding`, or the "+ Add" tile on `/profiles` which routes to `/onboarding?add=1` | FirstFlight flow |
| Select | `/profiles` (`src/onboarding/ProfilePicker.jsx`); auto-redirect from Home when signed-in with kids but no active kid | `ProfilePickerView`, auto-route in `HomeView` |
| Remove | `/account` only — two-tap `DangerButton` per kid | Settings |
| Edit/rename | **nowhere** | **nowhere** |

## 3. Engagement state (stars wallet, stickers, streaks, birds) — localStorage only

`src/engagement/engagementStore.js`. Deliberately local-only in v1 behind a
swappable store API (see CLAUDE.md); confirmed cloud-side by the comment in
`supabase/functions/_shared/accountPurge.ts` ("never reaches the cloud").

- Keys: `kidmath-engagement` (anonymous), `kidmath-engagement:<kidId>`
  (per-kid), `kidmath-engagement-migrated` (records which single kid inherited
  the anonymous blob — the first kid inherits, later kids start empty).
- Written once per finished session via `recordSessionEnd`.
- **The asymmetry to keep in mind:** engagement is *per-kid but
  device-local*; math progress is *cross-device but per-household*. Neither
  is per-kid **and** synced. Any "see each kid's progress" feature needs one
  or both of these to move.

## 4. iOS — same shapes, same tables

`ios/KidMath/Services/ProgressStore.swift` is a faithful mirror of the web
module: UserDefaults under the *same* `kidmath-progress` key and JSON shape,
same caps (level 10 / 20 mistakes / 200 item stats / 12 recent ids), same
cloud branch to the same `progress` / `progress_item_stats` tables via
`SupabaseService`, same session-end-only save timing
(`SessionViewModel.swift`), same sign-in merge rules. Engagement
(`EngagementStore.swift`) is likewise UserDefaults-only with the identical
per-kid key scheme.

The iOS parallel to `/account` is `SettingsView.swift`, which is currently
*richer* than the web page: subscription + restore purchases, sound/calm
toggles, sign in/out, kid list with delete, delete account, engine
diagnostics.

## 5. The "For Grown-Ups" panel — the parent progress view

`src/engagement/GrownUpsPanel.jsx`, opened from the Home page button and the
profile picker's parent menu ("Progress report"). One modal answering "is my
kid practicing, and where do they stand?":

- **Stat tiles** from the active kid's engagement blob: day streak (+ best),
  stars earned (+ unspent), practice sessions (badge count when bird world is
  off), and — when `meadowEnabled()` — bird species collected with a
  rare/endangered count.
- **Per-skill table** from math progress, one row per mode with any play,
  sorted by stars: skill + grade span, "Level N of 10" (plain vocabulary;
  bird ranks are kid-surface only), lifetime stars, and "In review" = the
  mistake-bank count.
- Bird-world footnotes (real species, stars can never be bought, migrating
  birds return).

**Scoping caveats** (the copy says "Practice on this device" and means it):

1. ~~The skill table reads localStorage only~~ **Fixed — PR #31, merged to
   `main` 2026-08-08**: the panel paints the
   local snapshot, then hydrates from `loadProgressSummary()` — a new
   one-query-per-user read in `progressStore.js` that returns cloud rows for
   signed-in families and the local store otherwise, with a `source` tag the
   caption uses ("across your family account" vs "on this device").
2. Mixed scoping in one screen: the stat tiles are per-active-kid
   (engagement), the skill table is device/household-wide (math progress).
   Switching kids changes the tiles but not the table.

## 6. The `/account` page — what it is today

`src/account/AccountPage.jsx` (route in `App.jsx`; entry via the navbar
avatar). It was built as the **parental-rights surface** (16 CFR §312.6,
Apple 5.1.1(v)) — a COPPA disclosure/deletion page — not as an account
dashboard. What it renders:

1. Heading + the parent's email (plain text).
2. **Your kids** — card per kid (first name, age, grade, added date) with a
   two-tap delete. Deleting a kid is the "refuse further collection" right.
3. **Practice progress we hold** — reads the `progress` table directly and
   lists `mode — level N, S sessions, K stars` plus totals. Household-level,
   because that's the only granularity that exists.
4. **Billing** — a text link to `/account/billing`, which immediately
   redirects into the Stripe customer portal. Gated on `paywallEnabled()`.
5. **Delete my account** — invokes the `delete-account` Edge Function (full
   purge, nothing deactivated), wipes every `kidmath*`/`larkit*` localStorage
   key, signs out.

### What it does NOT have (current gaps)

- **No add-kid button** — adding lives only in onboarding / the profile
  picker's "+" tile. (Remove *is* here; add is not.)
- **No per-kid progress** — blocked on the data model (§1); progress has no
  `kid_id`. The page even says so in copy: "Practice progress is kept at the
  family-account level."
- No edit/rename kid (doesn't exist anywhere).
- No inline subscription status/plan/renewal date — it defers wholly to the
  Stripe portal; `PremiumContext` isn't consumed here.
- No sign-out button (navbar and profile-picker menu only), no email change,
  no preferences (word problems / calm mode / sound / theme), no data export,
  no consent-revocation control (a `revoke-consent` Edge Function exists but
  has no UI), and no engagement data (stars wallet/streaks live in the
  Grown-Ups panel, and only on the device that earned them).

### If/when we build per-kid progress

Not designed yet; the minimum shape would be: add `kid_id` to `progress` and
`progress_item_stats` (nullable for legacy household rows), key saves off the
active-kid pointer, decide a backfill story for existing household rows, and
mirror all of it in Swift (`ProgressStore.swift` + `SupabaseService.swift`)
plus the account-purge list in `accountPurge.ts`. Engagement cloud sync is a
separate, already-anticipated migration (store API is swappable by design).
