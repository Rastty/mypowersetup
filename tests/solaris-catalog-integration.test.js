import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { syncSolarisEu } from "../scripts/lib/sync-solaris-eu.mjs";
import { validatePtCatalog } from "../src/products-pt.js";
import { validateRomaniaCatalog } from "../src/ro-recommendations.js";
import { validateSloveniaCatalog } from "../src/si-recommendations.js";

const NOW = Date.parse("2026-09-16T20:00:00.000Z");
const PRODUCT_IDS = [
  "solaris-victron-phoenix-12-250",
  "solaris-victron-phoenix-24-250",
];

async function activatedForAllMarkets() {
  const activation = JSON.parse(await readFile(new URL("../data/solaris-affiliate-activation.json", import.meta.url), "utf8"));
  activation.approvalConfirmed = true;
  activation.approvalSource = "owner_confirmed";
  for (const id of PRODUCT_IDS) {
    activation.products[id].exactAffiliateUrl = `https://tracking.example/${id}`;
    activation.products[id].trackingVerifiedAt = "2026-09-16";
    for (const market of ["pt", "ro", "si"]) {
      activation.products[id].markets[market] = {
        verified: true,
        evidenceUrl: `https://evidence.example/${id}/${market}`,
        verifiedAt: "2026-09-16",
      };
    }
  }
  return activation;
}

async function liveCatalog(path) {
  return JSON.parse(await readFile(new URL(path, import.meta.url), "utf8"));
}

test("activated Solaris Phoenix inverters pass PT RO SI catalog validators without weakening other merchants", async () => {
  const activation = await activatedForAllMarkets();
  const cases = [
    ["pt-PT", "../data/products-pt.json", validatePtCatalog],
    ["ro-RO", "../data/products-ro.json", validateRomaniaCatalog],
    ["sl-SI", "../data/products-si.json", validateSloveniaCatalog],
  ];

  for (const [market, path, validate] of cases) {
    const base = await liveCatalog(path);
    const solaris = syncSolarisEu(market, activation, { now: NOW });
    assert.equal(solaris.source.status, "ok", market);
    assert.equal(solaris.products.length, 2, market);

    const catalog = structuredClone(base);
    catalog.sources.solaris_store = solaris.source;
    catalog.products.push(...solaris.products);
    const validated = validate(catalog);
    const solarisProducts = validated.products.filter(({ merchant }) => merchant === "solaris_store");
    assert.equal(solarisProducts.length, 2, market);
    assert.deepEqual(solarisProducts.map(({ specs }) => specs.voltageV).sort((a, b) => a - b), [12, 24], market);
  }
});

test("catalog validation rejects Solaris product copied into an unverified market source", async () => {
  const activation = await activatedForAllMarkets();
  const base = await liveCatalog("../data/products-ro.json");
  const solaris = syncSolarisEu("ro-RO", activation, { now: NOW });
  const catalog = structuredClone(base);
  catalog.sources.solaris_store = structuredClone(solaris.source);
  catalog.sources.solaris_store.verifiedProductMarkets[PRODUCT_IDS[0]] = [];
  catalog.products.push(solaris.products[0]);

  assert.throws(() => validateRomaniaCatalog(catalog), /SOLARIS_PRODUCT_MARKET_UNVERIFIED/);
});
