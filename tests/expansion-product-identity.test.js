import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { validatePtCatalog } from "../src/products-pt.js";

const read = (relative) => readFile(new URL(`../${relative}`, import.meta.url), "utf8");

test("Portugal runtime catalog is public even before the next feed refresh", async () => {
  const raw = JSON.parse(await read("data/products-pt.json"));
  const normalized = validatePtCatalog(raw);
  assert.equal(normalized.private, false);

  const syncSource = await read("scripts/sync-products-pt.mjs");
  assert.match(syncSource, /private:\s*false/);
});

test("expansion recommendation views preserve stable product identity", async () => {
  for (const path of ["src/pt-recommendations.js", "src/si-recommendations.js", "src/ro-recommendations.js"]) {
    const source = await read(path);
    assert.match(source, /id:\s*product\.id/, `${path} must preserve product.id`);
    assert.match(source, /merchant:\s*product\.merchant/, `${path} must preserve merchant identity`);
  }
});

test("expansion affiliate cards send exact product identity through the shared tracker", async () => {
  const source = await read("src/expansion-calculator-browser.js");
  assert.match(source, /data-product-id=/);
  assert.match(source, /data-source="product-card"/);
  assert.match(source, /trackAffiliateClick\(affiliate, track\)/);
  assert.doesNotMatch(source, /mypowersetup:affiliate-click/);
  assert.doesNotMatch(source, /affiliate_product_click/);
});
