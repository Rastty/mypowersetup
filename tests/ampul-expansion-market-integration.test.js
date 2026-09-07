import test from "node:test";
import assert from "node:assert/strict";

import { syncAmpulExpansion } from "../scripts/lib/sync-ampul-expansion.mjs";
import { validatePtCatalog } from "../src/products-pt.js";
import { validateRomaniaCatalog } from "../src/ro-recommendations.js";
import { validateSloveniaCatalog } from "../src/si-recommendations.js";

const now = Date.parse("2026-09-07T18:00:00.000Z");
const sourceCatalog = {
  generatedAt: "2026-09-07T17:00:00.000Z",
  market: "cs-CZ",
  currency: "CZK",
  sources: { ampul_cz: { status: "ok" } },
  products: [{
    id: "ampul_cz:6195",
    merchant: "ampul_cz",
    name: "DC/DC nabíječka LiFePO4 baterií 14.6V, 30A, 400W, IP68",
    description: "Input 10-36V DC, output 14.6V 30A, LiFePO4.",
    categoryPath: "Nabíječky",
    category: "dc_charger",
    brand: "",
    priceCzk: 6800,
    priceCurrency: "CZK",
    available: true,
    productUrl: "https://ampul.eu/cs/nabijecky/6195-dc-dc-nabijecka-lifepo4-baterii-146v-30a-400w-ip68",
    affiliateUrl: "source-link-not-reused",
    imageUrl: "https://ampul.eu/25626-large_default/example.jpg",
    specs: {},
  }],
};

function verification(market) {
  return {
    markets: {
      pt: { verified: market === "pt", evidenceUrl: market === "pt" ? "https://evidence.example/pt" : null, verifiedAt: market === "pt" ? "2026-09-07" : null },
      ro: { verified: market === "ro", evidenceUrl: market === "ro" ? "https://evidence.example/ro" : null, verifiedAt: market === "ro" ? "2026-09-07" : null },
      si: { verified: market === "si", evidenceUrl: market === "si" ? "https://evidence.example/si" : null, verifiedAt: market === "si" ? "2026-09-07" : null },
    },
  };
}

function sourceFor(sync) {
  return { ampul_eu: { ...sync.source, affiliateApprovalConfirmed: true } };
}

test("exact AMPUL 30A DC-DC can pass PT RO SI runtime validation only after that market is verified", () => {
  const cases = [
    ["pt-PT", "pt", validatePtCatalog],
    ["ro-RO", "ro", validateRomaniaCatalog],
    ["sl-SI", "si", validateSloveniaCatalog],
  ];

  for (const [catalogMarket, market, validate] of cases) {
    const sync = syncAmpulExpansion(sourceCatalog, catalogMarket, verification(market), { now });
    assert.equal(sync.products.length, 1, catalogMarket);
    const base = {
      generatedAt: "2026-09-07T18:00:00.000Z",
      market: catalogMarket,
      currency: "EUR",
      private: false,
      sources: sourceFor(sync),
      products: sync.products,
    };
    const catalog = catalogMarket === "pt-PT" ? base : {
      ...base,
      shippingEligibility: { country: catalogMarket === "ro-RO" ? "Romania" : "Slovenia", eligible: true },
    };
    const validated = validate(catalog);
    assert.equal(validated.products[0].merchant, "ampul_eu");
    assert.equal(validated.products[0].specs.currentA, 30);
  }
});

test("runtime rejects AMPUL product when source evidence no longer verifies the current market", () => {
  const sync = syncAmpulExpansion(sourceCatalog, "ro-RO", verification("ro"), { now });
  const catalog = {
    generatedAt: "2026-09-07T18:00:00.000Z",
    market: "ro-RO",
    currency: "EUR",
    private: false,
    shippingEligibility: { country: "Romania", eligible: true },
    sources: { ampul_eu: { ...sync.source, verifiedMarkets: [] } },
    products: sync.products,
  };
  assert.throws(() => validateRomaniaCatalog(catalog), /AMPUL_EXPANSION_MARKET_UNVERIFIED/);
});

test("runtime rejects modified AMPUL affiliate tracking", () => {
  const sync = syncAmpulExpansion(sourceCatalog, "sl-SI", verification("si"), { now });
  const bad = { ...sync.products[0], affiliateUrl: sync.products[0].affiliateUrl.replace("ddb5edae", "wrong") };
  assert.throws(() => validateSloveniaCatalog({
    generatedAt: "2026-09-07T18:00:00.000Z",
    market: "sl-SI",
    currency: "EUR",
    private: false,
    shippingEligibility: { country: "Slovenia", eligible: true },
    sources: sourceFor(sync),
    products: [bad],
  }), /AMPUL_EXPANSION_AFFILIATE_INVALID/);
});
