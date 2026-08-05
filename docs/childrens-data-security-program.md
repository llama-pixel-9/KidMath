# Children's Personal Information Security Program

**Larkit LLC · larkit**
**Version 1.0 · Adopted August 3, 2026 · Next review due August 3, 2027**

> **INTERNAL — do not publish.** This document is required by 16 CFR §312.8(b),
> which took full effect on April 22, 2026. It must exist in writing, but it is
> not a public notice. Expect to hand it over if the FTC asks, or when a school
> district sends a security questionnaire. Keep it honest — an aspirational
> version is worse than none, because it documents a standard you're failing.
>
> Replace every "TODO" and every date before you treat this as adopted.

---

## 1. Purpose and scope

This program covers all personal information that larkit collects from or about children under 13, specifically:

- Child profile records: first name, age, grade (`kid_profiles`)
- Practice progress: levels, answered items, correctness, stars, mistake queue (`progress`, `item_stats`)
- Persistent identifiers associated with a child profile (`kid_profiles.id`, `auth.users.id`)
- Diagnostic session records that may originate from a child's device (`session_diagnostics`)

It also covers the parent account data that these records hang from, because compromising a parent account exposes the children's records underneath it.

It applies to production systems, backups, the admin interface, and any laptop or device used to administer them.

---

## 2. Program coordinator (§312.8(b)(1))

**Coordinator: Sai — founder and sole operator of Larkit LLC.**

The coordinator is accountable for maintaining this program, performing the annual assessment, approving vendors that will receive children's data, and responding to security incidents.

Contact: security@larkit.io

*As the team grows, name a deputy here. A program with exactly one person and no backup is itself a documented risk — see §7.*

---

## 3. Risk assessment (§312.8(b)(2))

Performed at least annually and after any material architecture change. Findings and remediation are logged in §8.

### 3.1 Assessment of August 3, 2026

| # | Risk | Likelihood | Impact | Status |
|---|---|---|---|---|
| R1 | Compromise of a parent's Apple/Google account exposes their children's profiles and progress | Low | Moderate | **Accepted.** We delegate authentication to Apple and Google rather than storing passwords. Their account security exceeds anything we would build. |
| R2 | Row Level Security misconfiguration lets one account read another's child data | Low | **High** | **Mitigated.** All child-bearing tables enforce `auth.uid() = user_id` on select, insert, update and delete. Verified in `20260802150000_create_kid_profiles.sql`. → Control C3 |
| R3 | `session_diagnostics` accepts unauthenticated writes and updates on any row, keyed by a client-supplied session id | **High** | Low–Moderate | **OPEN.** Anyone holding the anon key (which ships in the client bundle) can overwrite or flood the table. No child PI is stored there, so impact is availability and data integrity rather than disclosure. → Remediation A1 |
| R4 | Supabase anon key transmitted in a URL query string on the telemetry beacon path, landing in CDN and proxy logs | **High** | Low | **OPEN.** The anon key is public by design, so this is hygiene rather than secret leakage — but it normalizes a bad pattern. → Remediation A2 |
| R5 | Diagnostic records retained indefinitely; no TTL, no scheduled purge | **High** | Moderate | **OPEN.** Directly contrary to §312.10's prohibition on indefinite retention and to our own published policy. → Remediation A3 |
| R6 | Entitlements are client-written and not server-verified | **High** | Low (security) / **High** (revenue) | **OPEN.** Not a children's-data risk, but it is the finding a district security questionnaire will surface. → Remediation A4 |
| R7 | Service-role key exposure via `.env.local` on the development machine or in a script | Low | **Critical** | **Mitigated.** `.env*` is gitignored; the service key is used only in local scripts, never in client code or CI. → Control C5 |
| R8 | Vendor breach at Supabase, Vercel, or Stripe | Low | **High** | **Transferred and monitored.** Written data protection commitments on file; see §5. |
| R9 | Sole-operator risk — one person holds all production credentials | **Certain** | **High** | **OPEN.** No continuity plan exists. → Remediation A5 |
| R10 | Account deletion does not actually purge child records | **High** | **High** | **OPEN.** No deletion path exists at all today; the published policy promises one. → Remediation A6 |

---

## 4. Safeguards in place (§312.8(b)(3))

| ID | Control |
|---|---|
| **C1** | **No passwords stored.** Authentication is delegated to Apple and Google via OAuth. We never hold, transmit, or reset a credential. |
| **C2** | **Encryption in transit and at rest.** All traffic is TLS. Supabase encrypts data at rest. |
| **C3** | **Row Level Security on every table containing child data**, scoped to `auth.uid() = user_id` for all four operations. Enabled at the table level, not just via policy. |
| **C4** | **Admin access is role-gated**, both in the UI (`RequireAdmin` + `useIsAdmin`) and in the database (`public.is_admin(auth.uid())` in the select policies). Server-side enforcement is the control; the UI check is convenience. |
| **C5** | **Secrets are never committed.** `.env`, `.env.local` are gitignored. The service-role key exists only on the operator's machine and in Supabase's own dashboard. |
| **C6** | **Data minimization by design.** There is no field anywhere in the product for a child's last name, birthdate, photo, address, phone, school, or free text. This is enforced by schema `CHECK` constraints, not just by UI. |
| **C7** | **No third-party code in the child-facing iOS app.** The only network peer is our own backend. |
| **C8** | **No advertising or marketing technology anywhere**, on any platform. There is no ad SDK, no pixel, no tag manager. |
| **C9** | **Profile cap enforced in the database** — the insert policy on `kid_profiles` rejects a fifth child, so a compromised client cannot mass-create records. |
| **C10** | **Cascade deletion** — `kid_profiles.user_id` references `auth.users(id) ON DELETE CASCADE`, so removing the auth user removes the children's rows. |

---

## 5. Vendor due diligence (§312.8(c))

Before any provider receives children's personal information, we confirm it is capable of protecting it and obtain **written assurances**. Current providers:

| Provider | Role | Written assurance | Reviewed |
|---|---|---|---|
| Supabase | Database, auth, storage | DPA — TODO: download, countersign, file at `docs/vendor-dpas/` | TODO |
| Vercel | Hosting, analytics | DPA — TODO | TODO |
| Stripe | Payments (no child data) | DSA / DPA — TODO | TODO |
| Apple | Auth, IAP (no child data reaches us) | Developer Program agreements | N/A |
| Google | Auth only | Google API Services terms | TODO |

**Rule: no new vendor touches children's data without a signed DPA on file and a line in this table.** If a vendor would receive children's data and is *not* integral to running larkit, we must obtain separate parental consent first (§312.5(a)(2)) — in practice that means the answer is no.

---

## 6. Testing and monitoring (§312.8(b)(4))

| Activity | Frequency | Owner |
|---|---|---|
| RLS policy verification — attempt cross-account reads with a second test account | Every release touching a table policy, and quarterly | Coordinator |
| Dependency audit (`npm audit`, Dependabot) | Monthly, and before each release | Coordinator |
| Verify the retention purge actually ran and deleted rows | Monthly | Coordinator |
| End-to-end account deletion test — create, populate, delete, confirm zero rows remain across every table | Quarterly | Coordinator |
| Review Supabase auth logs for anomalous access | Monthly | Coordinator |
| Confirm no new third-party script has entered the bundle | Every release | Coordinator |
| External penetration test | Before the first district sale | External |

---

## 7. Incident response

1. **Contain** — revoke keys, disable the affected path, take the feature down if needed. Availability loses to confidentiality.
2. **Assess** — what data, whose, how many, over what window. Write it down as you go.
3. **Notify** — affected parents without unreasonable delay. State law breach deadlines vary; **assume 7 calendar days** as the working clock, because that is New York's standard for education contractors and it is the tightest you will face. Meeting the tightest one satisfies the rest.
4. **Remediate** — fix the root cause, not the symptom, and add a regression test.
5. **Record** — log it in §8 and revise this program if the cause reveals a gap.

Breach counsel and notification vendor: **TODO — identify these before launch, not during an incident.**

---

## 8. Remediation log and annual review (§312.8(b)(5))

### Open remediation items

| ID | Item | Priority | Target | Done |
|---|---|---|---|---|
| A1 | Scope `session_diagnostics` RLS: drop blanket anon update; restrict update to the row's own session; add a rate limit | High | Before launch | ☐ |
| A2 | Move the anon key out of the telemetry beacon query string into a header | Medium | Before launch | ☐ |
| A3 | Add a 90-day `pg_cron` purge on `session_diagnostics` and verify it runs | **Critical** | Before launch | ☐ |
| A4 | Server-side entitlement verification via Edge Function; make `entitlements` service-role-write only | High | Post-launch, before district sales | ☐ |
| A5 | Continuity plan — sealed credential escrow, documented recovery runbook | Medium | Q4 2026 | ☐ |
| A6 | Build real account and profile deletion, verified to purge every table | **Critical** | Before launch | ☐ |
| A7 | Reduce telemetry fingerprint surface — drop `hardwareConcurrency`, `deviceMemory`, `maxTouchPoints` | High | Before launch | ☐ |
| A8 | Collect and file all vendor DPAs (§5) | High | Before launch | ☐ |

### Review history

| Date | Reviewer | Changes |
|---|---|---|
| 2026-08-03 | Sai | Program adopted. Initial risk assessment recorded. |

**Next scheduled review: August 3, 2027.** Put it in your calendar now — an annual review that everyone forgot to do is the most common way this requirement is failed.
