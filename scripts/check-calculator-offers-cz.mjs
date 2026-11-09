#!/usr/bin/env node
// Exact, read-only materialized-view validation. Not a price or stock oracle.
import { readFile } from "node:fs/promises";
import { acceptCalculatorOffersSnapshot, projectCalculatorOffers } from "../src/calculator-offer-catalog.js";

try {
  const [full, compact, compactText] = await Promise.all([
    readFile("data/products.json", "utf8").then(JSON.parse),
    readFile("data/calculator-offers-cz.json", "utf8").then(JSON.parse),
    readFile("data/calculator-offers-cz.json", "utf8"),
  ]);
  const expected = projectCalculatorOffers(full, Date.parse(full.generatedAt));
  if (!acceptCalculatorOffersSnapshot(compact)) throw new Error("CALCULATOR_OFFERS_SCHEMA_INVALID");
  if (JSON.stringify(compact) !== JSON.stringify(expected)) throw new Error("CALCULATOR_OFFERS_SOURCE_DRIFT");
  const bytes = Buffer.byteLength(compactText, "utf8");
  if (bytes > 12_000) throw new Error("CALCULATOR_OFFERS_TOO_LARGE");
  console.log(JSON.stringify({
    status: "CALCULATOR_OFFERS_CZ_VERIFIED",
    fullCatalogProducts: full.products.length,
    compactApprovedProducts: compact.products.length,
    bytes, fullCatalogBytes: Buffer.byteLength(JSON.stringify(full), "utf8"),
    productionActions: 0,
  }));
} catch (error) {
  console.error("CALCULATOR_OFFERS_CZ_CHECK_FAILED:" + String(error.message || error).slice(0,120));
  process.exitCode = 1;
}
