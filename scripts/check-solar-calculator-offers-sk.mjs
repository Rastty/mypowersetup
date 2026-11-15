#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { projectSkSolarCalculatorOffers, selectSkSolarCalculatorOffers } from "../src/sk-solar-calculator-offers.js";
import { acceptSkSolarCalculatorSnapshot } from "../src/verified-offer-catalog-fetch.js";

const [full, serialized] = await Promise.all([
  readFile("data/products-sk.json", "utf8").then(JSON.parse),
  readFile("data/solar-calculator-offers-sk.json", "utf8"),
]);
const compact = JSON.parse(serialized);
const expected = projectSkSolarCalculatorOffers(full, Date.parse(full.generatedAt));
if (serialized !== JSON.stringify(expected) + "\n")
  throw new Error("SK_SOLAR_CATALOG_SOURCE_DRIFT");
if (!acceptSkSolarCalculatorSnapshot(compact) || Buffer.byteLength(serialized) > 2500)
  throw new Error("SK_SOLAR_CATALOG_INVALID");
const eligible = selectSkSolarCalculatorOffers(compact, { solarWatts: 450, systemVoltage: 12 }, Date.parse(compact.generatedAt) + 60000);
// All tracked panels may become unavailable. Zero offers is a safe outcome,
// never a reason to block a healthy source refresh.
console.log(`SK solar compact catalog PASS: ${compact.products.length} verified SKUs, ${eligible.length} offers for 450 Wp`);
