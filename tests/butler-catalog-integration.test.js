import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { syncButlerEu } from "../scripts/lib/sync-butler-eu.mjs";
import { validatePtCatalog } from "../src/products-pt.js";
import { validateRomaniaCatalog } from "../src/ro-recommendations.js";
import { validateSloveniaCatalog } from "../src/si-recommendations.js";

const NOW = Date.parse("2026-09-18T20:00:00.000Z");

async function approvedActivation() {
  const activation = JSON.parse(await readFile(new URL("../data/butler-affiliate-activation.json", import.meta.url), "utf8"));
  activation.approvalConfirmed = true;
  activation.approvalSource = "owner-confirmed Awin programme 31291 approval";
  activation.trackingVerifiedAt = "2026-09-16";
  return activation;
}

async function liveCatalog(path) {
  return JSON.parse(await readFile(new URL(path, import.meta.url), "utf8"));
}

test("activated Butler products pass PT RO SI catalog validators", async () => {
  const activation = await approvedActivation();
  const cases = [
    ["pt-PT", "../data/products-pt.json", validatePtCatalog],
    ["ro-RO", "../data/products-ro.json", validateRomaniaCatalog],
    ["sl-SI", "../data/products-si.json", validateSloveniaCatalog],
  ];

  for (const [market, path, validate] of cases) {
    const catalog = structuredClone(await liveCatalog(path));
    const butler = syncButlerEu(market, activation, { now: NOW });
    assert.equal(butler.source.status, "ok", market);
    assert.equal(butler.products.length, 2, market);
    catalog.sources.butler_technik = butler.source;
    catalog.products.push(...butler.products);

    const validated = validate(catalog);
    const products = validated.products.filter(({ merchant }) => merchant === "butler_technik");
    assert.equal(products.length, 2, market);
    assert.deepEqual(products.map(({ category }) => category).sort(), ["controller", "dc_charger"], market);
  }
});

test("catalog validation rejects Butler product with a non-ok Butler source", async () => {
  const activation = await approvedActivation();
  const catalog = structuredClone(await liveCatalog("../data/products-ro.json"));
  const butler = syncButlerEu("ro-RO", activation, { now: NOW });
  catalog.sources.butler_technik = { ...butler.source, status: "blocked" };
  catalog.products.push(butler.products[0]);

  assert.throws(() => validateRomaniaCatalog(catalog), /RO_BUTLER_SOURCE_INVALID/);
});
