#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { projectInverterCalculatorOffers } from "../src/calculator-offer-catalog.js";
import { acceptInverterCalculatorSnapshot } from "../src/verified-offer-catalog-fetch.js";

try {
  const [fullText, compactText] = await Promise.all([
    readFile("data/products.json", "utf8"),
    readFile("data/inverter-calculator-offers-cz.json", "utf8"),
  ]);
  const full = JSON.parse(fullText);
  const compact = JSON.parse(compactText);
  const expected = projectInverterCalculatorOffers(full, Date.parse(full.generatedAt));
  if (!acceptInverterCalculatorSnapshot(compact)) throw Error("INVERTER_CATALOG_SCHEMA_INVALID");
  if (JSON.stringify(compact) !== JSON.stringify(expected)) throw Error("INVERTER_CATALOG_SOURCE_DRIFT");
  if (Buffer.byteLength(compactText) > 8500) throw Error("INVERTER_CATALOG_TOO_LARGE");
  console.log(JSON.stringify({
    status: "INVERTER_CZ_VERIFIED", reviewedOffers: compact.products.length,
    bytes: Buffer.byteLength(compactText), productionActions: 0,
  }));
} catch (error) {
  console.error("INVERTER_CATALOG_CHECK_FAILED:" + String(error.message).slice(0, 110));
  process.exitCode = 1;
}
