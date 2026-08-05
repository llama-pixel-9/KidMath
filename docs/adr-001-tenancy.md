# ADR-001 — Tenancy: what owns a learner

**Status:** proposed (design only — no schema change until Sai approves)
**Date:** 2026-08-05
**Context:** E9 in [launch-compliance-checklist.md](./launch-compliance-checklist.md). Written before we have real users, because the cost of this decision is front-loaded into Row Level Security: today every child-bearing table is scoped `auth.uid() = user_id`, which hard-codes "a household owns a learner." Districts own learners too, and a teacher must see a roster without seeing billing. Retrofitting at zero production users is a weekend; at ten thousand it is a migration project with a rollback plan, executed while live families read through the policies being rewritten.

---

## Decision 1 — A `learners` table with exactly one owner

Replace `kid_profiles` with `learners`, owned by **either** a household **or** an org — never both, never neither:

```sql
create table public.learners (
  id             uuid primary key default gen_random_uuid(),
  -- Exactly one owner. The CHECK is the tenancy model.
  owner_user_id  uuid references auth.users(id),        -- household channel
  org_id         uuid references public.orgs(id),       -- school channel
  first_name     text not null check (char_length(first_name) between 1 and 40),
  age            text not null,
  grade          text not null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint learners_exactly_one_owner
    check (num_nonnulls(owner_user_id, org_id) = 1)
);
```

**Why a CHECK and not two tables:** one table means `progress`, `item_stats`, and every future child-bearing table foreign-keys to a single `learner_id`, and RLS is written **once**, against the question "may this actor see this learner?" — not twice against two ownership models. The constraint makes an ambiguous row (both owners, or orphaned) unrepresentable rather than merely invalid.

RLS then becomes one predicate, shared by every child-bearing table:

```sql
-- One function answers visibility for every table that carries learner data.
create function public.can_access_learner(p_learner_id uuid)
returns boolean language sql stable security definer as $$
  select exists (
    select 1 from public.learners l
     where l.id = p_learner_id
       and (
         l.owner_user_id = auth.uid()                       -- their parent
         or (l.org_id is not null and exists (              -- or org staff
           select 1 from public.org_members m
            where m.user_id = auth.uid()
              and m.org_id in (select public.org_and_ancestors(l.org_id))
         ))
       )
  );
$$;
```

Every child-bearing table's policy is then `using (public.can_access_learner(learner_id))`. When district requirements sharpen (per-classroom teacher scoping, read-only district admins), the *function* changes; the per-table policies do not. That is the whole point of doing this now.

## Decision 2 — One org hierarchy, self-referencing

```sql
create table public.orgs (
  id         uuid primary key default gen_random_uuid(),
  parent_id  uuid references public.orgs(id),   -- district → school → classroom
  kind       text not null check (kind in ('district','school','classroom')),
  name       text not null,
  created_at timestamptz not null default now()
);

create table public.org_members (
  org_id   uuid not null references public.orgs(id) on delete cascade,
  user_id  uuid not null references auth.users(id) on delete cascade,
  role     text not null check (role in ('district_admin','school_admin','teacher')),
  primary key (org_id, user_id)
);
```

A self-referencing parent makes district → school → classroom one hierarchy rather than three tables, so "delete the district" and "export the school" are subtree walks (a recursive `org_and_ancestors` / `org_and_descendants` helper), not three hand-maintained join paths. Membership grants access to the member's org **and its descendants** for admins; a plain `teacher` role is scoped to exactly the orgs (classrooms) they are a member of — a teacher sees a roster and progress, never billing, never another classroom. Billing stays keyed to `auth.users` (consumer) or to a future `org_billing` table (district contracts); nothing in the learner path touches it.

## Decision 3 — A learner never moves between household and school

**Recommendation: no linkage, ever.** If the same child practises at home and at school, that is **two learner records** with independent progress.

What this buys:

- **Consent separation stays structural** (standing rule; E9f). The household record exists under COPPA parental consent obtained via email-plus; the school record exists under school-authorized consent that covers *educational use only*. A single record serving both channels would need per-field provenance to answer "which consent covers this row?" — the hardest data-governance question in edtech, and one we simply refuse to pose. An org-owned learner has no parent email anywhere on it, so it is *structurally incapable* of entering a consumer email flow, exactly what E9f asks the schema (not a code comment) to enforce.
- **Deletion stays answerable.** District termination (NDPA Exhibit D) deletes the org subtree's learners without touching any family's data; a parent revoking consent deletes the household record without a district's data agreement being implicated.
- **The FERPA/COPPA boundary stays clean.** School-channel records are education records under the district's control; household records are consumer records under the parent's. Merging them puts one row under two legal regimes with different access, retention, and disclosure rules.

The cost — a child's home stars don't show up in their classroom — is a product feature we deliberately do not build. If it is ever demanded, the answer is an *export/import* of progress snapshots (a copy crossing the boundary with fresh consent), never a shared row.

## Decision 4 — Denormalise `org_id` onto `progress` and `item_stats`: **yes**

Add a nullable `org_id` to `progress` and `progress_item_stats` (and future child-bearing tables), copied from the learner at row creation, indexed.

**Justification:** district-scoped deletion and export are the operations we must be able to *prove* (E9c: per-learner, per-classroom, per-school, per-district). With the denormalised column, "delete everything the district owns" is one indexed predicate per table — `delete from progress where org_id in (select org_and_descendants(:district))` — auditable in a test and cheap at any scale. Without it, every deletion/export joins through `learners`, and a future bug that orphans a learner row silently orphans its progress out of the deletion sweep. The denormalisation risk (drift between `progress.org_id` and `learners.org_id`) is neutralised by Decision 3: a learner's owner **never changes**, so the copied value can never go stale. A one-line trigger enforces the copy at insert. This is the rare denormalisation with no update anomaly by construction.

RLS on these tables still goes through `can_access_learner(learner_id)` — the `org_id` column is for bulk operations and reporting predicates, not the access check.

## Decision 5 — What breaks: the `auth.users` cascade

Today `kid_profiles.user_id` is `references auth.users(id) on delete cascade` — account deletion cascades the children. An org-owned learner has **no** `auth.users` parent; nothing cascades it.

Replacement:

- `learners.owner_user_id` keeps `on delete cascade` — the household path behaves exactly as today.
- `learners.org_id` gets `on delete cascade` from `orgs`, and `orgs.parent_id` cascades within the hierarchy — deleting a district cascades schools → classrooms → learners.
- Child-bearing tables (`progress`, `item_stats`, …) change their FK root: today they cascade from `auth.users(user_id)`; after the refactor they carry `learner_id references learners(id) on delete cascade`. The E4 purge test extends to the org side: seed a district with two schools and three classrooms, delete at each level, assert zero rows (that test is E9c's deliverable and the guard against a future migration silently orphaning rows).
- The explicit purge path (`accountPurge.ts`, E4) remains the primary mechanism with cascades as backstop, and gains an org-scoped variant.

Open sub-question for implementation (not blocking the ADR): whether `progress` keeps its `user_id` column for the household channel's "family-level progress" v1 semantics, or moves fully to `learner_id`. Recommendation: move fully to `learner_id` during step 3 below — per-learner progress is what both channels ultimately need, and v1's family-level progress is an artifact of not having had per-kid keys, not a feature.

## Decision 6 — Migration sequence (each step independently revertible)

1. **Create `orgs` + `org_members`** (new tables, no readers). Revert: drop.
2. **Create `learners`** with the ownership CHECK; backfill one row per `kid_profiles` row (`owner_user_id = user_id`); add `kid_profiles.learner_id` for the transition. Revert: drop `learners` (kid_profiles untouched).
3. **Add `learner_id` (+ nullable `org_id`) to `progress` and `progress_item_stats`**; backfill by joining through `kid_profiles`… noting the v1 wrinkle: cloud progress is keyed `(user_id, mode)` with no kid dimension, so backfill assigns existing progress to the household's learners per the sub-question above. Dual-write from the app (write both keys). Revert: drop columns, stop dual-write.
4. **Rewrite RLS once**: introduce `can_access_learner()` and repoint every child-bearing table's policies at it. Old policies are kept in the migration file as comments for one-step revert. This step is the actual work; it happens *after* the data is in place so it can be tested against real rows.
5. **Cut reads over** (app queries by `learner_id`), then drop the legacy `user_id` scoping and rename/retire `kid_profiles`. Revert: repoint reads back (the old columns still exist until this step completes).
6. **School channel stays dormant behind a flag** — no org UI, no org signup. The seam is what we are buying now, not the features.

Steps 1–2 are pure additions and can ship immediately after approval; steps 3–5 each carry their own test gate (the extended zero-rows deletion spec must pass at every step).

---

## Consequences

- RLS is written once, against "may this actor see this learner," before any real users exist.
- The consumer launch is unaffected: household flows keep identical behaviour through step 5, and E5's consent plumbing attaches to the household owner path unchanged.
- District features (rostering, SSO, audit logging — E9d/E9e) become additive work on top of a stable seam instead of a schema rewrite.
- We accept two records for a child who uses both channels, permanently, as a feature of the consent model rather than a limitation.
