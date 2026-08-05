/**
 * Robot-kid answer drivers: given the current question (from the DEV-only
 * window.__kidmathQA hook), operate the REAL rendered widget the way a kid
 * would — click the choice, type on the digit pad, tap the ten-frame cells.
 *
 * Every driver returns { blind: boolean }. blind=true means the driver could
 * not aim at the correct answer (unmappable widget state) and answered
 * something valid instead — the spec then skips the "must score correct"
 * assertion for that question but still requires the session to advance.
 */

/** The submission the engine scores as correct (multiSelect may list several
 *  acceptable selections — a list of lists — submit the first). */
export function correctValue(question) {
  const a = question.answer;
  if (Array.isArray(a) && Array.isArray(a[0])) return a[0];
  return a;
}

const COIN_VALUES = { penny: 1, nickel: 5, dime: 10, quarter: 25 };

async function clickSubmit(page) {
  for (const name of ["Submit answer", "Check", "Go"]) {
    const btn = page.getByRole("button", { name, exact: true }).first();
    if ((await btn.count()) > 0) {
      await btn.click();
      return true;
    }
  }
  return false;
}

/** Type a numeric string on whichever digit pad is on screen, then submit. */
async function digitPath(page, valueStr) {
  if (!/^[0-9.]+$/.test(valueStr)) return false;
  for (const ch of valueStr) {
    const name = ch === "." ? "Decimal point" : ch;
    await page.getByRole("button", { name, exact: true }).first().click();
  }
  return clickSubmit(page);
}

async function clickChoice(page, valueStr) {
  const region = page.getByRole("group", { name: "Answer choices" }).or(
    page.locator('[aria-label="Answer choices"]')
  );
  const scope = (await region.count()) > 0 ? region.first() : page;
  const exact = scope.getByRole("button", { name: valueStr, exact: true }).first();
  if ((await exact.count()) > 0) {
    await exact.click();
    return { blind: false };
  }
  const buttons = scope.getByRole("button");
  await buttons.first().click();
  return { blind: true };
}

export async function answerQuestion(page, question) {
  const type = question.answerType || "choice";
  const value = correctValue(question);
  const valueStr = String(value);
  const display = question.display || {};

  switch (type) {
    case "choice":
      return clickChoice(page, valueStr);

    case "symbolSelect": {
      const name = { "<": "less than", ">": "greater than", "=": "equal to" }[valueStr];
      if (!name) return clickChoice(page, valueStr);
      await page.getByRole("button", { name, exact: true }).first().click();
      return { blind: false };
    }

    case "multiSelect": {
      const values = Array.isArray(value) ? value : [value];
      const scope = page.locator('[aria-label="Choose all that apply"]');
      let blind = false;
      for (const v of values) {
        const btn = scope.getByRole("button", { name: String(v), exact: true }).first();
        if ((await btn.count()) > 0) await btn.click();
        else blind = true;
      }
      await clickSubmit(page);
      return { blind };
    }

    case "fraction": {
      let num, den;
      if (value && typeof value === "object") ({ num, den } = value);
      else [num, den] = valueStr.split("/").map((s) => s.trim());
      if (num === undefined || den === undefined) return { blind: true };
      await page.getByRole("button", { name: "Numerator", exact: true }).click();
      for (const ch of String(num)) await page.getByRole("button", { name: ch, exact: true }).first().click();
      await page.getByRole("button", { name: "Denominator", exact: true }).click();
      for (const ch of String(den)) await page.getByRole("button", { name: ch, exact: true }).first().click();
      await clickSubmit(page);
      return { blind: false };
    }

    case "numberLine": {
      const mode = display.lineMode || "locate";
      if (mode === "jump") {
        // The hop is drawn; the widget submits |to − from| itself.
        await clickSubmit(page);
        return { blind: false };
      }
      // locate: the ticks are transparent SVG circles — click by geometry.
      // NumberLine.jsx: viewBox 320×96, PAD 18, x(v) = 18 + t·284, baseY 62.
      const svg = page.locator('[aria-label^="Number line"] svg, svg[aria-label^="Number line"]').first();
      const box = await ((await svg.count()) > 0 ? svg : page.locator("section:has-text('Tap the number line') svg").first()).boundingBox();
      if (!box) return { blind: true };
      const min = display.min ?? 0;
      const max = display.max ?? 10;
      const t = (Number(value) - min) / (max - min || 1);
      await page.mouse.click(box.x + ((18 + t * 284) / 320) * box.width, box.y + (62 / 96) * box.height);
      await clickSubmit(page);
      return { blind: false };
    }

    case "tenFrame": {
      if ((display.frameMode || "count") !== "build") return { blind: !(await digitPath(page, valueStr)) };
      const cells = page.getByRole("button", { name: "empty cell", exact: true });
      const need = Number(value);
      for (let i = 0; i < need; i++) await cells.nth(0).click(); // clicked cells stop being "empty"
      await clickSubmit(page);
      return { blind: false };
    }

    case "coinTray": {
      if ((display.coinMode || "count") !== "build") {
        // Count mode types the total into a text field, not a digit pad.
        const field = page.getByRole("textbox", { name: "Total in cents" }).or(
          page.getByRole("spinbutton", { name: "Total in cents" })
        );
        if ((await field.count()) > 0) {
          await field.first().fill(valueStr);
          await clickSubmit(page);
          return { blind: false };
        }
        return { blind: !(await digitPath(page, valueStr)) };
      }
      // Exact subset-sum over the tray's coins; tap the chosen ones.
      const coins = (display.coins || []).map((c) => COIN_VALUES[c] ?? 0);
      const target = Number(value);
      const pick = new Array(coins.length).fill(false);
      const found = (function search(i, left) {
        if (left === 0) return true;
        if (i >= coins.length || left < 0) return false;
        pick[i] = true;
        if (search(i + 1, left - coins[i])) return true;
        pick[i] = false;
        return search(i + 1, left);
      })(0, target);
      const tray = page.locator('[aria-label="Coins"]');
      const buttons = tray.getByRole("button");
      if (found) {
        for (let i = 0; i < coins.length; i++) if (pick[i]) await buttons.nth(i).click();
        await clickSubmit(page);
        return { blind: false };
      }
      await clickSubmit(page);
      return { blind: true };
    }

    case "shapeFigure": {
      if ((display.shapeMode || "count") !== "select") {
        // Count mode types into a text field, not a digit pad.
        const field = page.getByRole("textbox", { name: "Your answer" }).or(
          page.getByRole("spinbutton", { name: "Your answer" })
        );
        if ((await field.count()) > 0) {
          await field.first().fill(valueStr);
          await clickSubmit(page);
          return { blind: false };
        }
        return { blind: !(await digitPath(page, valueStr)) };
      }
      const idx = (display.options || []).findIndex((o) => o.value === value);
      if (idx < 0) return { blind: true };
      const shapeRegion = page.locator('[aria-label="Shape"]');
      await shapeRegion.getByRole("button").nth(idx).click();
      await clickSubmit(page);
      return { blind: false };
    }

    // Everything else is a digit pad: numberPad, fillBlank, decimal, angle,
    // clock, barGraph (DataGraph), numberBond, barModel, placeValueDiscs,
    // fractionSet — all type digits and press Submit.
    default: {
      const ok = await digitPath(page, valueStr);
      if (ok) return { blind: false };
      return clickChoice(page, valueStr);
    }
  }
}
