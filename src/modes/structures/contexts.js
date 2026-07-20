import { randInt } from "../helpers";

/**
 * Story vocabulary, deliberately decoupled from problem structure.
 *
 * Structures say what is unknown; contexts say what the problem is about. Any
 * context can dress any structure, which is what turns ~29 structures into
 * hundreds of distinct prompts (spec §A5).
 *
 * Under the static-authored bank model these pools are for generated items and
 * as authoring vocabulary; they are not a substitute for reviewed prose.
 */

// Rotated so no name dominates a cell (authoring guide).
export const ACTORS = [
  "Mina", "Ravi", "Lucy", "Julie", "Sam", "Ana", "Kofi", "Mei",
  "Omar", "Nina", "Theo", "Ava", "Luca", "Priya", "Jonah", "Zara",
];

/** Countables: [singular, plural]. Concrete, picturable, K-appropriate. */
export const OBJECTS = [
  ["apple", "apples"],
  ["sticker", "stickers"],
  ["marble", "marbles"],
  ["shell", "shells"],
  ["book", "books"],
  ["pencil", "pencils"],
  ["button", "buttons"],
  ["crayon", "crayons"],
  ["card", "cards"],
  ["block", "blocks"],
  ["bead", "beads"],
  ["leaf", "leaves"],
];

export const SETTINGS = [
  "on the table", "in the box", "on the shelf", "in the basket",
  "in the jar", "on the desk", "in the bag",
];

/** Verbs that add to a group. */
export const JOIN_VERBS = ["joined", "arrived", "hopped over", "showed up"];

/** Verbs that remove from a group. Past tense, subject = the actor. */
export const TAKE_VERBS = ["ate", "gave away", "lost", "used", "sold"];

/** Two-colour splits for put-together / take-apart problems. */
export const ATTRIBUTE_PAIRS = [
  ["red", "green"],
  ["blue", "yellow"],
  ["big", "small"],
  ["striped", "plain"],
  ["new", "old"],
];

function pick(list) {
  return list[randInt(0, list.length - 1)];
}

/**
 * One story setting. `avoid` keeps the two actors in a comparison distinct.
 */
export function pickContext(avoid = {}) {
  let actor = pick(ACTORS);
  while (actor === avoid.actor) actor = pick(ACTORS);
  let actor2 = pick(ACTORS);
  while (actor2 === actor) actor2 = pick(ACTORS);

  const [singular, plural] = pick(OBJECTS);
  const [attrA, attrB] = pick(ATTRIBUTE_PAIRS);

  return {
    actor,
    actor2,
    singular,
    plural,
    setting: pick(SETTINGS),
    joinVerb: pick(JOIN_VERBS),
    takeVerb: pick(TAKE_VERBS),
    attrA,
    attrB,
  };
}

/** "1 apple" / "3 apples" — avoids the "1 apples" bug in generated prose. */
export function count(n, ctx) {
  return `${n} ${n === 1 ? ctx.singular : ctx.plural}`;
}

/** "1 red apple" / "3 red apples". */
export function countWith(n, attr, ctx) {
  return `${n} ${attr} ${n === 1 ? ctx.singular : ctx.plural}`;
}
