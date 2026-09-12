---
name: item-authoring
description: Author, review, or fix items for the KidMath item bank. Use whenever writing or editing item prompts, running the itemGen pipeline, tightening wording rules, or triaging the admin Review queue.
---

# KidMath item authoring

## Sources of truth

- `docs/word-problem-authoring-guide.md` — wording and style rules. Read it
  before writing or editing any item prompt.
- `scripts/itemGen/structureRules.js` — `RULES` (per-structure contracts),
  `NARRATIVE_RULES`, `GOLD_EXAMPLES`; fed to every LLM pass.
- `src/modes/structures/` — structure definitions and payload conventions.
- `resources/` — openly licensed curricula (CCSS Progressions, all EngageNY
  K-4 modules; see its README for the module→mode map). **When the reviewer
  is unsure how a problem type should be presented, check the shelf first**
  — "drills are drills" was settled by reading how EngageNY runs fluency,
  not by taste.

## The rule ladder — where a new rule must land

When the reviewer flags a wording pattern, the fix is never one edit:

1. **Guide** — rule + good/bad example (cite the resource that grounds it).
2. **Templates** — `src/modes/structures/*.js` so engine prose models it.
3. **Generator prompts** — `NARRATIVE_RULES` in `structureRules.js` reaches
   all pipelines (`authorStructures`, `rewordItems`, `prompt.js`).
4. **QC gate** — a check in `src/itemBank/qc/checks.js` (`fail` if it must
   never reach a child; `warn` if advisory). The only drift-proof layer. Pin
   with a spec fixture.
5. **Sweep the live bank for the same class immediately** — every finding so
   far had many live siblings. Dry-run first, gate-verify every change,
   then `--write`. Models: `scripts/fixNounlessQuestions.js` and the
   scratchpad sweeps referenced in the commit log.

## Wording rules learned from review (all machine-enforced)

- **Restate the counted noun** — "How many toy cars does Lily have?", never
  "How many does Lily have?" (`nounlessQuestion`, fail)
- **Context must matter** — no decorative story on a bare-number question:
  "Emma has 53 pencils. How many tens are in 53?" → drop the story or make
  it load-bearing. (`decorativeContext`, fail)
- **Never self-answering** — the prompt's only number must not BE the answer
  ("Jordan hung 47 photos. How many photos?"). Visual payloads are exempt —
  there the prose count is a caption. (`selfAnswering`, fail)
- **Drills are drills** — sequence continuation is bare fluency form
  ("Count by 4s: 16, 20, 24. What number comes next?"), never narrated.
  Stories are only for questions about real quantities.
  (`storyWrappedDrill`, warn)
- Register: person-first, chronological, one tense, simple verbs, explicit
  "at the start", 2-4 short sentences (`NARRATIVE_RULES` has the full list).

## Hard-won invariants (violating these has burned us)

- **Batch tags**: every `authorStructures` run stamps item ids with `--tag`
  (defaults to date). Without it, a rerun UPSERTS OVER the previous batch's
  reviewed/approved items.
- **Payload convention**: `a`/`b` hold the two GIVENS in the structure's
  declared slots (compare: bigger/diff order matters). The gate's arithmetic
  is position-agnostic (trio rule: max = sum/product of the others), so it
  will NOT catch swapped slots or a sibling structure's payload — verify
  slots when authoring compares. Embedded unknowns (`? - 12 = 31`) legally
  fail strict `a op b = answer`.
- **Every Supabase read on item_bank MUST paginate** — supabase-js silently
  caps selects at 1,000 rows; unpaginated reads truncated the admin, the
  runtime bank, and the exporter at various times.
- **Gate exemplars before export** — approved-but-legacy items are not
  gate-clean; ungated exemplars taught the model the self-answering disease.
  `exportExemplars.js` runs `runChecks` on every candidate.
- **Figure rules land in `src/itemBank/figureContracts.js`**, not in a prompt
  tweak: each mode declares which item classes MUST show a figure and which
  are legitimately verbal. `missingRequiredFigure` (fail) enforces it at the
  assembler, admin Review and `bank:qc`; `modeFigures.spec.js` sweeps both
  the generator and the shipped bank. A NEW structureType under a contracted
  mode fails CI until declared. Text describing a visual is not the visual
  (clock incident, PR #78/#79).
- **Visual subskills are not text-authorable** — "count the objects" needs a
  picture; a text pipeline degenerates it into self-answering prose. Refill
  such cells from the mode's own engine templates (within the 3-per-signature
  application cap), not from an LLM.
- When a finding appears, **QC-sweep all live items for the class** — 25
  legacy APPROVED items carried the self-answering shape for months.

## Reword-and-choose + batch-trust review

- `rewordItems.js` writes 1-3 gate-verified rewrites per item as ranked
  `payload.display.promptOptions` (skips items that already have options;
  `--family X` sweeps a family bank-wide including approved items).
- Review queue **Batch view** groups by provenance × mode; reviewer
  spot-checks a frozen ~10% sample, then approve-all (QC-fails held back,
  top-pick wording applied). Card view keeps per-item radios.
- Approval writes the pick into `promptText` and strips options
  (`src/admin/reviewChoice.js`, `reviewBatches.js`).

## Pipeline commands

- `node --import ./scripts/lib/registerResolve.js scripts/itemGen/authorStructures.js --per N --tag bMMDD --write` — author difficult structures (chunked calls; gate-verified drafts)
- `... scripts/itemGen/rewordItems.js [--family application] [--write]` — ranked rewrite options
- `... scripts/itemGen/exportExemplars.js --modes m1,m2` — gate-checked exemplars from the approved bank
- `... scripts/itemGen/generateDrafts.js --all --mode m1,m2 --families application,conceptual --provider claudeCode --limit N` — exemplar-pipeline drafts
- `npm run bank:variety` / `bank:audit` / `bank:qc` — coverage & QC reports
- `npm run bank:export && npm run bank:seed:build` — snapshot approved rows into the bundle + rebuild the offline seed (always both, then run `npm test`)
- DB scripts need `set -a && source .env.local && set +a`

## Review flow

New drafts are written as `draft`, promoted to `reviewed` (scoped by
generator/mode), and appear in `/admin` → Review queue. Approved items serve
immediately from the cloud; `bank:export` + deploy bakes them into the
offline bundle. Human review is for wording and kid-appropriateness — the
gate already verified math and structure, and the whole live bank is kept
gate-clean.
