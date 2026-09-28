import { describe, it, expect } from "vitest";
import {
  CONTEXT_OBJECTS,
  findObjectsInText,
  objectById,
  objectMatchesInText,
  objectsFor,
  packFor,
  priceRangeFor,
} from "../content/contextTable.js";
import { STATE_TERMS, localize, moneyRuleFor, swapsFor } from "../content/stateWords.js";
import { KID_SAFE_TERMS, findKidSafeHits } from "../content/kidSafeList.js";

/**
 * The content tables behind the v2 checks: the context table (objects kids
 * care about, with realistic numbers), the state word swaps, and the
 * kid-safe list. The checks are only as precise as these helpers.
 */

describe("context table", () => {
  it("loads the objects with the fields the checks read", () => {
    expect(CONTEXT_OBJECTS.length).toBeGreaterThan(100);
    for (const o of CONTEXT_OBJECTS) {
      expect(typeof o.id).toBe("string");
      expect(typeof o.singular).toBe("string");
      expect(Array.isArray(o.age_bands)).toBe(true);
      expect(o.age_bands.every((b) => ["K-1", "2-3", "4-5"].includes(b))).toBe(true);
    }
    expect(objectById("seashell")?.plural).toBe("seashells");
    expect(objectById("no-such-thing")).toBeNull();
  });

  it("objectsFor filters by skill and band and keeps appeal at 2 or more", () => {
    const money = objectsFor({ skill: "money", band: "K-1" });
    expect(money.length).toBeGreaterThan(0);
    for (const o of money) {
      expect(o.skills).toContain("money");
      expect(o.age_bands).toContain("K-1");
      expect(o.appeal).toBeGreaterThanOrEqual(2);
    }
    const older = objectsFor({ skill: "money", band: "4-5" }).map((o) => o.id);
    // A band that an object is not listed for leaves it out.
    const kOnly = CONTEXT_OBJECTS.find((o) => o.age_bands.length === 1 && o.age_bands[0] === "K-1");
    if (kOnly) expect(older).not.toContain(kOnly.id);
    // minAppeal narrows further; 1 admits everything.
    expect(objectsFor({ skill: "money", minAppeal: 3 }).every((o) => o.appeal === 3)).toBe(true);
    expect(objectsFor({ minAppeal: 1 }).length).toBe(CONTEXT_OBJECTS.length);
  });

  it("findObjectsInText matches singular and plural forms, whole words only", () => {
    const found = findObjectsInText("Mina found 9 seashells at the beach and one acorn.").map((o) => o.id);
    expect(found).toEqual(["seashell", "acorn"]);
    // "car" is an object; "carpet" and "scar" are not cars.
    const ids = findObjectsInText("A carpet with a scar sits by a car.").map((o) => o.id);
    expect(ids).toContain("car");
    expect(ids.filter((id) => id === "car")).toHaveLength(1);
    expect(findObjectsInText("The carpet has a scar.")).toEqual([]);
    expect(findObjectsInText("")).toEqual([]);
    expect(findObjectsInText(null)).toEqual([]);
  });

  it("prefers the longest name at a position and reports positions", () => {
    const hits = objectMatchesInText("Sam has 3 toy cars and a car.");
    expect(hits.map((h) => h.object.id)).toEqual(["toy-car", "car"]);
    expect(hits[0].form).toBe("toy cars");
    expect(hits[0].index).toBe(10);
    expect(hits[0].length).toBe(8);
    // Case does not matter; each object is listed once per text.
    expect(findObjectsInText("SEASHELLS and seashells").map((o) => o.id)).toEqual(["seashell"]);
  });

  it("priceRangeFor and packFor read the table, null when unpriced", () => {
    expect(priceRangeFor("marble")).toEqual([0.1, 0.5]);
    expect(packFor("marble")).toEqual({ size: 50, price_usd: 8 });
    expect(priceRangeFor("seashell")).toBeNull();
    expect(packFor("seashell")).toBeNull();
    expect(priceRangeFor("no-such-thing")).toBeNull();
  });
});

describe("state words", () => {
  it("Common Core is the default and every state entry has notes", () => {
    expect(STATE_TERMS.CC).toBeDefined();
    for (const [code, entry] of Object.entries(STATE_TERMS)) {
      expect(typeof entry.notes, `${code} notes`).toBe("string");
    }
    expect(swapsFor("CC")).toEqual([]);
    expect(swapsFor("GA")).toEqual([]);
  });

  it("swaps whole phrases only, keeping case, plurals and articles", () => {
    expect(localize("Draw a tape diagram for the story.", "TX")).toBe("Draw a strip diagram for the story.");
    expect(localize("Tape diagrams help. Two tape diagrams.", "TX")).toBe("Strip diagrams help. Two strip diagrams.");
    expect(localize("Write an equation.", "TX")).toBe("Write a number sentence.");
    expect(localize("An equation is shown.", "TX")).toBe("A number sentence is shown.");
    // "equation" inside another word is untouched.
    expect(localize("Inequations are not equations.", "TX")).toBe("Inequations are not number sentences.");
    // A number line stays a number line in Texas.
    expect(localize("Use a number line.", "TX")).toBe("Use a number line.");
  });

  it("limits a swap to its grades when the grade is known", () => {
    expect(localize("Write an equation.", "TX", { grade: "2" })).toBe("Write a number sentence.");
    expect(localize("Write an equation.", "TX", { grade: "K" })).toBe("Write a number sentence.");
    expect(localize("Write an equation.", "TX", { grade: 4 })).toBe("Write an equation.");
    expect(localize("Draw a tape diagram.", "TX", { grade: 4 })).toBe("Draw a strip diagram.");
    expect(localize("Write an equation.", "VA", { grade: "1" })).toBe("Write a number sentence.");
    expect(localize("Write an equation.", "VA", { grade: "3" })).toBe("Write an equation.");
  });

  it("leaves other states and unknown states untouched", () => {
    const text = "Draw a tape diagram and write an equation.";
    expect(localize(text, "GA")).toBe(text);
    expect(localize(text, "FL")).toBe(text);
    expect(localize(text, "CC")).toBe(text);
    expect(localize(text, "ZZ")).toBe(text);
    expect(localize(text, null)).toBe(text);
    expect(localize(text, undefined)).toBe(text);
  });

  it("Florida writes money with a dollar sign and decimal from grade 2", () => {
    expect(moneyRuleFor("FL")).toMatchObject({ fromGrade: "2", style: "dollarsDecimal" });
    expect(moneyRuleFor("TX")).toBeNull();
  });
});

describe("kid-safe list", () => {
  const terms = (text) => findKidSafeHits(text).map((h) => h.term);

  it("is categorized", () => {
    for (const key of ["weapons", "violence", "substances", "gambling", "bodyWeight", "romance", "religion", "politics", "scary", "unsafeAlone", "putDowns", "brands"]) {
      expect(Array.isArray(KID_SAFE_TERMS[key]), key).toBe(true);
      expect(KID_SAFE_TERMS[key].length, key).toBeGreaterThan(0);
    }
  });

  it("flags a gun and a beer, with their categories", () => {
    expect(findKidSafeHits("Dad has 3 guns in the truck.")).toEqual([{ term: "guns", category: "weapons" }]);
    expect(findKidSafeHits("Mom buys 6 beers for $12.")).toEqual([{ term: "beers", category: "substances" }]);
    const both = findKidSafeHits("A gun and a beer, then a Beer.");
    expect(both).toEqual([
      { term: "gun", category: "weapons" },
      { term: "beer", category: "substances" },
    ]);
  });

  it("does not flag dice, tug-of-war or a basketball shot", () => {
    expect(terms("Mina rolls two dice. One die shows 3 dots.")).toEqual([]);
    expect(terms("Ava's scavenger hunt card shows a taut tug-of-war rope.")).toEqual([]);
    expect(terms("Leo makes 7 basketball shots out of 10.")).toEqual([]);
    expect(terms("Mina shoots hoops from 4:05 until 4:40.")).toEqual([]);
    expect(terms("Nia took 12 shots and made 8 shots.")).toEqual([]);
  });

  it("keeps the unsafe senses of the same words", () => {
    expect(terms("The plants will die without water.")).toEqual(["die"]);
    expect(terms("They fight over the last cookie.")).toEqual(["fight"]);
    expect(terms("Sam shot at the sign.")).toEqual(["shot"]);
    expect(terms("Mom drives to Target for milk.")).toEqual(["target"]);
  });

  it("reads a target as a goal, fruit punch, a class president and the Amazon river as safe", () => {
    expect(terms("The gym's target is 100 visitors. How many more does it need?")).toEqual([]);
    expect(terms("Into the punch bowl Mina pours 250 mL of fruit punch.")).toEqual([]);
    expect(terms("Rosa is class president for 3 weeks.")).toEqual([]);
    expect(terms("The Amazon River is 6,400 km long.")).toEqual([]);
    expect(terms("Ida pulls 12 weeds from the garden.")).toEqual([]);
  });

  it("matches whole words, case-insensitively", () => {
    expect(terms("The gunwale of the boat is 4 m long.")).toEqual([]);
    expect(terms("A wine-colored ribbon is 30 cm long.")).toEqual(["wine"]);
    expect(terms("GUN")).toEqual(["gun"]);
    expect(terms("Pokémon cards and LEGO bricks.")).toEqual(["pokémon", "lego"]);
  });

  it("flags personal-data shapes", () => {
    expect(findKidSafeHits("Call 555-123-4567 to order.")).toEqual([{ term: "phone number", category: "personalData" }]);
    expect(findKidSafeHits("Mia lives at 42 Maple Street.")).toEqual([{ term: "street address", category: "personalData" }]);
    expect(findKidSafeHits("Email mia@example.com for tickets.")).toEqual([{ term: "email address", category: "personalData" }]);
    expect(terms("A ribbon 12 m long. Bus 42 leaves at 3:15.")).toEqual([]);
  });

  it("returns nothing for empty or non-text input", () => {
    expect(findKidSafeHits("")).toEqual([]);
    expect(findKidSafeHits(null)).toEqual([]);
    expect(findKidSafeHits(undefined)).toEqual([]);
  });
});
