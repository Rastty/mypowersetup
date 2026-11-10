#!/usr/bin/env node
// Guard same-source provenance, compact size and exact eligible DC–DC SKUs.
// Called after the existing authorized feed sync, before committing public data.
import { readFile } from "node:fs/promises";
import { projectDcdcGuideOffers } from "../src/calculator-offer-catalog.js";
import { acceptDcdcGuideSnapshot } from "../src/verified-offer-catalog-fetch.js";

try {
  const [fullText, tinyText] = await Promise.all([
    readFile("data/products.json", "utf8"),
    readFile("data/dcdc-guide-offers-cz.json", "utf8"),
  ]);
  const full = JSON.parse(fullText);
  const tiny = JSON.parse(tinyText);
  const expected = projectDcdcGuideOffers(full, Date.parse(full.generatedAt));
  if (!acceptDcdcGuideSnapshot(tiny)) throw new Error("DCDC_GUIDE_SCHEMA_INVALID");
  if (JSON.stringify(tiny) !== JSON.stringify(expected))
    throw new Error("DCDC_GUIDE_SOURCE_DRIFT");
  const bytes = Buffer.byteLength(tinyText, "utf8");
  if (bytes > 6000) throw new Error("DCDC_GUIDE_TOO_LARGE");
  console.log(JSON.stringify({
    status: "DCDC_GUIDE_CZ_VERIFIED",
    reviewedOffers: tiny.products.length,
    bytes, fullCatalogBytes: Buffer.byteLength(fullText, "utf8"),
    productionActions: 0,
  }));
} catch (error) {
  console.error("DCDC_GUIDE_CZ_CHECK_FAILED:" + String(error.message || error).slice(0, 120));
  process.exitCode = 1;
}
