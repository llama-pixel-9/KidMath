/* Sweep the numberBonds bank:
 *  A) reword period-separated double equations to ", so " (decimal misread)
 *  B) give the bond visual (answerType "numberBond") to items whose cherry
 *     diagram depicts the asked relation — missing-part items via
 *     {whole, part}, whole-unknown items via display.parts.
 * Dry-run by default; --write updates DB payloads in place.
 */
import { createClient } from '@supabase/supabase-js';
import { FULL_ITEMS } from '/Users/sai/KidMath-counting/src/itemBank/fullBank.js';
import { runChecks } from '/Users/sai/KidMath-counting/src/itemBank/qc/checks.js';
import { validateBankItem } from '/Users/sai/KidMath-counting/src/itemBank/index.js';

const WRITE = process.argv.includes('--write');

const REWORD = new Set(['bondPatternStep', 'commutativeFlip', 'teenBridgePair', 'ladderPair', 'takeFromTenChain']);
// Missing-part: cherry shows whole + given part, blank = answer.
const PART_WIDGET = new Set([
  'bondPatternStep', 'commutativeFlip', 'bondSentence', 'nonCanonicalSplit',
  'errorAtMagnitude', 'errorPartWholeSwap', 'teenBondSentence', 'takeOutTen',
  'takeOutTenSplit', 'teenBridgePair', 'ladderPair', 'takeFromTenChain',
  'partnersOf1000', 'bondStoryPartUnknown', 'bondStoryFillTen',
  'bondStoryMakeTen', 'bondStoryPartnerToTen', 'bondStoryTakeOutTen',
  'bondStoryTensSingles',
]);
// Whole-unknown: cherry shows the known parts, blank on top.
const WHOLE_WIDGET = new Set([
  'wholeFromParts', 'pictureWholeUnknown', 'bondStoryWholeUnknown',
  'tensOnesCompose', 'teenFromTen', 'tensOnesWhole', 'bigDouble',
  'hundredsCompose', 'unitFormWhole', 'threeAddendBond', 'threePartWhole',
]);
// Deliberately excluded: equalSplit + bondStoryEqualSplit (the shown part IS
// the answer), makeTenSplit + makeNextTen (strategy splits — the cherry's
// whole is not the number under discussion).

const nb = FULL_ITEMS.filter((i) => i.modeId === 'numberBonds');
const changed = [];
let failures = 0;

for (const item of nb) {
  const st = item.structureType;
  const q = item.question;
  const d = q.display || {};
  let touched = false;
  const next = { ...q, display: { ...d } };

  if (REWORD.has(st) && / \S+\. \d/.test(d.promptText || '')) {
    next.display.promptText = d.promptText.replace('. ', ', so ');
    touched = true;
  }
  if (PART_WIDGET.has(st) && q.answerType === 'numberPad') {
    if (!(Number.isInteger(d.whole) && Number.isInteger(d.part) && q.answer === d.whole - d.part)) {
      console.error('SKIP bad part payload', item.itemId, JSON.stringify(d).slice(0, 100));
      failures += 1;
      continue;
    }
    next.answerType = 'numberBond';
    touched = true;
  }
  if (WHOLE_WIDGET.has(st) && q.answerType === 'numberPad') {
    const parts = d.parts;
    if (!(Array.isArray(parts) && parts.length >= 2 && parts.length <= 3 && parts.every(Number.isInteger) && q.answer === parts.reduce((x, y) => x + y, 0))) {
      console.error('SKIP bad parts payload', item.itemId, JSON.stringify(d).slice(0, 100));
      failures += 1;
      continue;
    }
    next.answerType = 'numberBond';
    touched = true;
  }
  if (!touched) continue;

  const candidate = { ...item, question: next };
  const { valid, errors } = validateBankItem(candidate);
  if (!valid) { console.error('INVALID', item.itemId, errors.join('; ')); failures += 1; continue; }
  const qc = runChecks(candidate);
  const fails = qc.findings.filter((f) => f.severity === 'fail');
  if (fails.length) { console.error('QC FAIL', item.itemId, fails.map((f) => f.id + ': ' + f.message).join('; ')); failures += 1; continue; }
  changed.push({ itemId: item.itemId, st, question: next, reworded: next.display.promptText !== d.promptText });
}

// Reworded prompts must stay globally unique.
const allPrompts = new Map();
for (const i of FULL_ITEMS) allPrompts.set(i.question?.display?.promptText, i.itemId);
for (const c of changed) {
  const t = c.question.display.promptText;
  if (allPrompts.has(t) && allPrompts.get(t) !== c.itemId) { console.error('DUP', c.itemId, t); failures += 1; }
}

const bySt = {};
for (const c of changed) bySt[c.st] = (bySt[c.st] || 0) + 1;
console.log('planned changes:', changed.length, 'failures:', failures);
console.log(bySt);
console.log('reworded:', changed.filter((c) => c.reworded).length);

if (failures) process.exit(1);
if (!WRITE) { console.log('(dry run)'); process.exit(0); }

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
let wrote = 0;
for (const c of changed) {
  const { error } = await sb.from('item_bank').update({ payload: c.question }).eq('item_id', c.itemId);
  if (error) throw new Error(c.itemId + ': ' + error.message);
  wrote += 1;
  if (wrote % 200 === 0) console.log('updated', wrote);
}
console.log('updated', wrote, 'rows');
