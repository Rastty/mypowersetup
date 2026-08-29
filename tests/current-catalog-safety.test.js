import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const catalogs = [
  "data/products.json",
  "data/products-sk.json",
  "data/products-pl.json",
  "data/products-hu.json",
];

test("refreshed public catalogs never leave stale-source products recommendation-eligible", async () => {
  for (const path of catalogs) {
    const catalog = JSON.parse(await readFile(path, "utf8"));
    const sources = catalog.sources || {};
    const products = Array.isArray(catalog.products) ? catalog.products : [];

    for (const [merchant, source] of Object.entries(sources)) {
      if (source?.status === "ok" || source?.status === "disabled") continue;
      const merchantProducts = products.filter((product) => product.merchant === merchant);
      for (const product of merchantProducts) {
        assert.equal(product.available, false, `${path}:${merchant}:${product.id || product.name} must be unavailable when source is ${source?.status}`);
        assert.equal(product.staleSource, true, `${path}:${merchant}:${product.id || product.name} must carry staleSource when source is ${source?.status}`);
      }
    }
  }
});
