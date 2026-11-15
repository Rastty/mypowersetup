#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { projectMarketSolarCalculatorOffers, selectMarketSolarCalculatorOffers } from "../src/pl-hu-solar-calculator-offers.js";
import { acceptMarketSolarCalculatorSnapshot } from "../src/verified-offer-catalog-fetch.js";

for (const market of ["pl", "hu"]) {
  const [full, serialized] = await Promise.all([
    readFile(`data/products-${market}.json`, "utf8").then(JSON.parse),
    readFile(`data/solar-calculator-offers-${market}.json`, "utf8"),
  ]);
  const small = JSON.parse(serialized);
  const expected = projectMarketSolarCalculatorOffers(market, full, Date.parse(full.generatedAt));
  if (serialized !== JSON.stringify(expected) + "\n")
    throw new Error(`${market.toUpperCase()}_SOLAR_CATALOG_SOURCE_DRIFT`);
  if (!acceptMarketSolarCalculatorSnapshot(market, small) || Buffer.byteLength(serialized) > 1600)
    throw new Error(`${market.toUpperCase()}_SOLAR_CATALOG_INVALID`);
  // In-stock panels may legitimately disappear; zero is a safe result.
  const options = selectMarketSolarCalculatorOffers(market, small, { solarWatts: 450, systemVoltage: 12 },
    Date.parse(small.generatedAt) + 60_000);
  console.log(`${market.toUpperCase()} solar catalog PASS: ${small.products.length} reviewed SKUs, ${options.length} offers at 450 Wp`);
}
