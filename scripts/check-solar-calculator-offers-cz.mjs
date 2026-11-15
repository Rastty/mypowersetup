import { readFile } from "node:fs/promises";
import { projectSolarCalculatorOffers } from "../src/calculator-offer-catalog.js";
import { acceptSolarCalculatorSnapshot } from "../src/verified-offer-catalog-fetch.js";

const [full, compact, raw] = await Promise.all([
  readFile("data/products.json", "utf8").then(JSON.parse),
  readFile("data/solar-calculator-offers-cz.json", "utf8").then(JSON.parse),
  readFile("data/solar-calculator-offers-cz.json", "utf8"),
]);
const expected = projectSolarCalculatorOffers(full, Date.parse(full.generatedAt));
if (!acceptSolarCalculatorSnapshot(compact)
    || Buffer.byteLength(raw) > 2701
    || JSON.stringify(expected) !== JSON.stringify(compact)) {
  throw new Error("SOLAR_CATALOG_SOURCE_DRIFT");
}
console.log(JSON.stringify({ status: "PASS", products: compact.products.length, bytes: Buffer.byteLength(raw) }));
