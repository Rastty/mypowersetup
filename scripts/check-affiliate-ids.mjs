#!/usr/bin/env node
// Read-only gate on published product snapshots. It neither follows affiliate
// redirects nor generates synthetic click events or commission claims.
import { readFile } from "node:fs/promises";
import { hasApprovedAffiliateIdentity } from "../src/commercial-coverage.js";

export const PUBLIC_CATALOGS = Object.freeze([
  "products.json", "products-ampul-cz.json", "products-sk.json",
  "products-pl.json", "products-hu.json", "products-pt.json",
  "products-ro.json", "products-si.json",
]);

export function auditAffiliateIds(catalogs) {
  const failures = [];
  const markets = [];
  for (const { file, data } of catalogs) {
    if (!Array.isArray(data?.products) || data.products.length === 0) {
      failures.push({ file, reason: "PRODUCT_LIST_INVALID_OR_EMPTY" });
      markets.push({ file, checked: 0, valid: 0 });
      continue;
    }
    let valid = 0;
    for (const product of data.products) {
      if (hasApprovedAffiliateIdentity(product)) valid++;
      else failures.push({ file, productId: String(product?.id || "unknown").slice(0, 120),
        merchant: String(product?.merchant || "unknown").slice(0, 60),
        reason: "AFFILIATE_ID_OR_EXACT_DESTINATION_NOT_APPROVED" });
    }
    markets.push({ file, checked: data.products.length, valid });
  }
  return Object.freeze({
    status: failures.length ? "BLOCKED" : "PASS",
    checked: markets.reduce((total, row) => total + row.checked, 0),
    valid: markets.reduce((total, row) => total + row.valid, 0),
    failures, markets,
    commissionVerified: false,
  });
}

export async function checkPublicAffiliateCatalogIds(readCatalog = async (file) =>
  JSON.parse(await readFile(new URL(`../data/${file}`, import.meta.url), "utf8"))) {
  const catalogs = [];
  for (const file of PUBLIC_CATALOGS) {
    try { catalogs.push({ file, data: await readCatalog(file) }); }
    catch { catalogs.push({ file, data: null }); }
  }
  return auditAffiliateIds(catalogs);
}

if (process.argv[1] && import.meta.url === new URL("file://" + process.argv[1]).href) {
  const report = await checkPublicAffiliateCatalogIds();
  console.log(JSON.stringify(report, null, 2));
  if (report.status !== "PASS") process.exitCode = 1;
}
