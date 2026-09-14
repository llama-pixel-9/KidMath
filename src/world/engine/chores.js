/**
 * Daily chores (Animal Crossing's clock, in growth framing): once a bird's
 * own quest is done, it has a little something again each day — the feeder
 * emptied, a few planks came loose, the nests need eggs, the gate's frame
 * dimmed. Same fixtures, new numbers seeded by the date, so the "!" markers
 * come back every morning and the math keeps flowing. Worth 2 stars each,
 * two per region per day. Nothing is lost by missing a day.
 */

/** Small deterministic hash → [0, 1). */
function rand(seed) {
  let h = 2166136261;
  for (const ch of String(seed)) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 16777619) >>> 0;
  }
  h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 3266489909) >>> 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
const between = (seed, lo, hi) => lo + Math.floor(rand(seed) * (hi - lo + 1));

/** Three options that always include the answer and stay positive. */
function optionsAround(answer, seed) {
  const r = rand(seed);
  const set = r < 0.33 ? [answer - 2, answer - 1, answer] : r < 0.66 ? [answer - 1, answer, answer + 1] : [answer, answer + 1, answer + 2];
  return set.map((n) => Math.max(1, n)).filter((n, i, a) => a.indexOf(n) === i).length === 3 ? set.map((n) => Math.max(1, n)) : [answer, answer + 1, answer + 2];
}

const ITEM_NAMES = { seed: "seeds", berry: "berries", acorn: "acorns" };
const PIECE_NAMES = { planks: "planks", logs: "logs", rope: "planks", stones: "stones" };

/**
 * The chores available today in a zone. `doneFixtures` is the store's
 * fixture map: a chore only exists where the original quest is done.
 */
export function choresFor(zone, dayKey, doneFixtures) {
  const out = [];
  const o = zone.objects;
  const day = `${dayKey}|${zone.id}`;

  if (o.feeder && doneFixtures[o.feeder.fixture]) {
    const present = between(`${day}|feeder`, 1, o.feeder.capacity - 2);
    const need = o.feeder.capacity - present;
    const npc = zone.quests.find((q) => q.steps.some((s) => s.target === "feeder"))?.npcId ?? zone.npcs[0].id;
    const item = ITEM_NAMES[o.feeder.item] ?? "seeds";
    out.push({
      id: `chore-${zone.id}-feeder-${dayKey}`,
      chore: { target: "feeder", present },
      npcId: npc,
      steps: [
        { type: "talk", line: `Breakfast time! The ${item === "seeds" ? "feeder" : "log"} holds ${o.feeder.capacity} ${item}, and only ${present} are left.` },
        { type: "pickNumber", line: `How many more ${item} fill it up?`, options: optionsAround(need, `${day}|feeder|opt`), answer: need, hint: { target: "feeder", mode: "empty" } },
        { type: "placeItems", line: `Tap to add each one!`, target: "feeder", count: need },
        { type: "celebrate", line: `${present} and ${need} make ${o.feeder.capacity}. Full again!`, stars: 2, fixture: null },
      ],
    });
  }

  if (o.bridge && doneFixtures[o.bridge.fixture]) {
    const present = between(`${day}|bridge`, Math.max(1, o.bridge.slots - 4), o.bridge.slots - 2);
    const need = o.bridge.slots - present;
    const npc = zone.quests.find((q) => q.steps.some((s) => s.target === "bridge"))?.npcId ?? zone.npcs[0].id;
    const piece = PIECE_NAMES[o.bridge.style ?? "planks"];
    out.push({
      id: `chore-${zone.id}-bridge-${dayKey}`,
      chore: { target: "bridge", present },
      npcId: npc,
      steps: [
        { type: "talk", line: `The wind was wild last night. Some ${piece} came loose!` },
        { type: "countTap", line: "Tap each empty spot to count them!", targets: "bridge-slots" },
        { type: "pickNumber", line: `How many ${piece} do we need?`, options: optionsAround(need, `${day}|bridge|opt`), answer: need, hint: { target: "bridge", mode: "empty" } },
        { type: "placeItems", line: `Tap the crossing to fix each one!`, target: "bridge", count: need },
        { type: "celebrate", line: `${need} back in place. Solid again!`, stars: 2, fixture: null },
      ],
    });
  }

  if (o.gate && doneFixtures[o.gate.fixture]) {
    const lit = between(`${day}|gate`, 3, 8);
    const need = 10 - lit;
    out.push({
      id: `chore-${zone.id}-gate-${dayKey}`,
      chore: { target: "gate", present: lit },
      npcId: null,
      steps: [
        { type: "talk", line: `The frame dimmed overnight. ${lit} dots are still lit.` },
        { type: "pickNumber", line: `How many more make ten?`, options: optionsAround(need, `${day}|gate|opt`), answer: need, hint: { target: "gate", mode: "unlit" } },
        { type: "placeItems", line: "Tap the frame to light each dot!", target: "gate", count: need },
        { type: "celebrate", line: `${lit} and ${need} make ten. Bright again!`, stars: 2, fixture: null },
      ],
    });
  }

  if (o.nests && doneFixtures[o.nests.fixture]) {
    const total = o.nests.spots.length * o.nests.eggsPer;
    const npc = zone.quests.find((q) => q.steps.some((s) => s.target === "nests"))?.npcId ?? zone.npcs[0].id;
    out.push({
      id: `chore-${zone.id}-nests-${dayKey}`,
      chore: { target: "nests", present: 0 },
      npcId: npc,
      steps: [
        { type: "talk", line: `The chicks all hatched and flew! ${o.nests.spots.length} empty nests, ${o.nests.eggsPer} eggs each.` },
        { type: "placeItems", line: "Tap each nest to tuck the eggs in!", target: "nests", count: total },
        { type: "pickNumber", line: `How many eggs did you tuck in all together?`, options: optionsAround(total, `${day}|nests|opt`), answer: total, hint: { target: "nests", mode: "eggs" } },
        { type: "celebrate", line: `${o.nests.spots.length} nests of ${o.nests.eggsPer}. ${total} eggs!`, stars: 2, fixture: null },
      ],
    });
  }

  // Two a day, rotating with the date so every bird gets its turn.
  if (out.length <= 2) return out;
  const start = Math.floor(rand(`${day}|pick`) * out.length);
  return [out[start % out.length], out[(start + 1) % out.length]];
}
