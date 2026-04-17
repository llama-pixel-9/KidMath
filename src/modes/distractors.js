import { randInt, shuffleArray } from "./helpers";

function addNumericCandidates(set, candidates, answer) {
  for (const candidate of candidates) {
    if (candidate >= 0 && candidate !== answer) {
      set.add(candidate);
    }
  }
}

export function buildArithmeticDistractors({ answer, a, b, misconceptions = [], min = 0 }) {
  const choices = new Set([answer]);
  const candidates = [];

  if (misconceptions.includes("operationSwap")) {
    candidates.push(Math.abs((a ?? 0) - (b ?? 0)));
  }
  if (misconceptions.includes("offByOne")) {
    candidates.push(answer + 1, answer - 1);
  }
  if (misconceptions.includes("placeValueSlip")) {
    candidates.push(answer + 10, answer - 10);
  }
  if (misconceptions.includes("factNeighbor")) {
    candidates.push(answer + (b ?? 1), answer - (b ?? 1));
  }

  const spread = Math.max(3, Math.ceil(Math.abs(answer) * 0.2));
  candidates.push(answer + spread, answer - spread, answer + spread + 1, answer - spread - 1);

  addNumericCandidates(choices, candidates.filter((n) => n >= min), answer);
  while (choices.size < 4) {
    const off = randInt(1, Math.max(4, spread)) * (Math.random() < 0.5 ? -1 : 1);
    const candidate = answer + off;
    if (candidate >= min && candidate !== answer) choices.add(candidate);
  }

  return shuffleArray([...choices].slice(0, 4));
}

export function buildSequenceDistractors({ answer, step }) {
  const choices = new Set([answer]);
  const candidates = [
    answer + step,
    answer - step,
    answer + step * 2,
    answer - step * 2,
    answer + 1,
    answer - 1,
  ];
  addNumericCandidates(choices, candidates, answer);
  while (choices.size < 4) {
    const candidate = answer + randInt(1, step * 3) * (Math.random() < 0.5 ? -1 : 1);
    if (candidate >= 0 && candidate !== answer) choices.add(candidate);
  }
  return shuffleArray([...choices].slice(0, 4));
}

export function buildComparingDistractors() {
  return shuffleArray([">", "<", "="]);
}
