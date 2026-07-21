---
name: item-authoring
description: Author, review, or fix word-problem items for the KidMath item bank. Use whenever writing or editing item prompts, running the itemGen pipeline, tightening wording rules, or triaging the admin Review queue.
---

# KidMath item authoring

## Source of truth

`docs/word-problem-authoring-guide.md` is the single source of truth for
wording and style rules. Read it before writing or editing any item prompt.
Structure definitions live in `src/modes/structures/` (the templates there are
the reference wording for each structure).

## The rule ladder — where a new rule must land

When the user flags a wording problem (or approves/rejects a pattern), the fix
is not one edit — apply it at every layer that expresses the rule, top to
bottom:

1. **Guide** — add the rule to `docs/word-problem-authoring-guide.md` with a
   good/bad example.
2. **Templates** — fix `src/modes/structures/additiveStructures.js` /
   `multiplicativeStructures.js` so engine-generated prose and the LLM's
   reference items model the rule.
3. **Generator prompt** — add the rule to `buildPrompt()` in
   `scripts/itemGen/authorStructures.js` (and `scripts/itemGen/prompt.js` for
   the exemplar pipeline).
4. **QC gate** — if the rule is mechanically checkable, add a check in
   `src/itemBank/qc/checks.js` (severity `fail` if it must never reach a
   child). This is the only layer that cannot drift; prose-only rules do.
   Pin it with a fixture in `src/__tests__/authorStructuresGate.spec.js`.
5. **Existing items** — sweep the live bank: `scripts/fixNounlessQuestions.js`
   is the model for a scoped, gate-verified batch repair (dry-run first, then
   `--write`).

Example rule enforced this way: the question sentence must restate the counted
noun — "How many toy cars does Lily have?", never "How many does Lily have?"
(`nounlessQuestion` check).

## Pipeline commands

- `node scripts/itemGen/authorStructures.js --dry` — generate + gate, write nothing
- `... --per N --write` — N items per structure, written as drafts
- `npm run bank:qc` / `npm run bank:audit` / `npm run bank:variety` — QC & coverage
- `npm run bank:export` — snapshot approved cloud rows into `src/itemBank/items/`
- DB scripts need `set -a && source .env.local && set +a` for the service key

## Review flow

Drafts → `/admin` → Items (status `draft`); promoted items → Review queue
(card view, bulk approve; Approve is blocked on any `fail` finding). Human
review is for wording and kid-appropriateness — the gate already verified the
math and structure.
