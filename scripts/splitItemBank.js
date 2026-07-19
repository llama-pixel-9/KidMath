#!/usr/bin/env node
// One-shot (and re-runnable) split of the item bank into per-mode files.
//
// Reads the current APPLICATION_ITEM_BANK into memory, then rewrites
// src/itemBank/applicationItems.js as a thin aggregator plus one data file per
// mode under src/itemBank/items/. Item content and order are preserved, so
// `npm run bank:report` output is unchanged. Safe to re-run.
//
//   npm run bank:split

import { APPLICATION_ITEM_BANK } from "../src/itemBank/applicationItems.js";
import { writeSplitBank } from "./lib/itemBankFiles.js";

const { modeOrder, counts } = writeSplitBank(APPLICATION_ITEM_BANK);
console.log(
  `Split ${APPLICATION_ITEM_BANK.length} items into ${modeOrder.length} per-mode files:`
);
for (const mode of modeOrder) console.log(`  ${mode}: ${counts[mode]}`);
