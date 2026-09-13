import { REGIONS } from "../regions";

/**
 * The Big Migration: the island's finale (a Nintendo world caps with a boss
 * that tests everything you learned — gently). Opening the lookout gate on
 * the cliffs starts it: one bird after another lands on the lookout with
 * one last thing it needs before it can fly, one per strand, no fail state.
 * Each right answer sends that bird off into the sky with a star; when the
 * last one goes, the whole flock crosses and the island celebrates.
 */
export const MIGRATION_STOPS = [
  { bird: "robin", name: "Robin", voice: 1, line: "Three chicks were on the rail, then two more hopped up.", question: "How many chicks are on the rail?", options: [4, 5, 6], answer: 5, thanks: "Five! Off we go." },
  { bird: "kingfisher", name: "Kingfisher", voice: 4, line: "Six stones on my side, four on yours.", question: "How many stones in the crossing?", options: [8, 10, 12], answer: 10, thanks: "Ten stones. Wings up!" },
  { bird: "chickadee", name: "Chickadee", voice: 8, line: "Three rows of four acorns, packed for the trip.", question: "How many acorns did I pack?", options: [7, 12, 14], answer: 12, thanks: "Twelve. Perfect packing." },
  { bird: "kestrel", name: "Kestrel", voice: 10, line: "Ten seeds, and I only need half of them.", question: "How many seeds is half of ten?", options: [4, 5, 6], answer: 5, thanks: "Five it is. See you next spring!" },
  { bird: "goldfinch", name: "Goldfinch", voice: 4, line: "I fly two hours, rest, then fly three more.", question: "How many hours do I fly?", options: [4, 5, 6], answer: 5, thanks: "Five hours. Not far at all." },
  { bird: "blueJay", name: "Blue Jay", voice: 3, line: "My travel box is a square.", question: "How many sides does a square have?", options: [3, 4, 5], answer: 4, thanks: "Four sides. Snug as can be." },
];

/** Where the migrating birds land: the lookout, by the cliffs gate. */
export function migrationSpot() {
  const cliffs = REGIONS[REGIONS.length - 1];
  return { x: cliffs.x0 + 1700, y: 1060 };
}

export function migrationQuest(stop, index) {
  return {
    id: `migration-${index}`,
    npcId: "migrant",
    steps: [
      { type: "talk", line: stop.line },
      { type: "pickNumber", line: stop.question, options: stop.options, answer: stop.answer },
      { type: "celebrate", line: stop.thanks, stars: 1, fixture: null },
    ],
  };
}
