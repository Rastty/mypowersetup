#!/usr/bin/env node
// Exact fail-closed public materialized view: the full PL feed remains Builder's
// source of truth; this tiny view serves only the two reviewed editorial SKUs.
import { readFile } from "node:fs/promises";
import { projectPlS400Offers, acceptPlS400OffersSnapshot, selectPlS400Comparison } from "../src/pl-s400-guide-offers.js";

try {
  const [fullText, compactText] = await Promise.all([
    readFile("data/products-pl.json", "utf8"),
    readFile("data/pl-s400-offers.json", "utf8"),
  ]);
  const full = JSON.parse(fullText), compact = JSON.parse(compactText);
  const now = Date.parse(full.generatedAt);
  if (!Number.isFinite(now)) throw Error("PL_S400_SOURCE_DATE_INVALID");
  if (Buffer.byteLength(compactText, "utf8") > 4000) throw Error("PL_S400_COMPACT_TOO_LARGE");
  if (!acceptPlS400OffersSnapshot(compact, now)) throw Error("PL_S400_COMPACT_SCHEMA_INVALID");
  const expected = projectPlS400Offers(full, now);
  if (JSON.stringify(compact) !== JSON.stringify(expected)) throw Error("PL_S400_SOURCE_DRIFT");
  console.log("PL_S400_COMPACT_VERIFIED " + JSON.stringify({
    fullBytes: Buffer.byteLength(fullText), compactBytes: Buffer.byteLength(compactText),
    projectedRows: compact.products.length,
    approvedRows: selectPlS400Comparison(compact, now).length,
    sourceStatus: compact.sources.oxe_pl.status,
    generatedAt: compact.generatedAt,
    productionActions: 0, commissionsVerified: false,
  }));
} catch (error) {
  console.error("PL_S400_COMPACT_INVALID:" + String(error.message || error).slice(0, 180));
  process.exitCode = 1;
}
