import test from "node:test";
import assert from "node:assert/strict";

import { syncAmpulExpansion, verifiedAmpulMarkets } from "../scripts/lib/sync-ampul-expansion.mjs";

const now = Date.parse("2026-09-07T18:00:00.000Z");
const verification = {
  markets: {
    pt: { verified: false, evidenceUrl: null, verifiedAt: null },
    ro: { verified: true, evidenceUrl: "https://evidence.example/ro", verifiedAt: "2026-09-07" },
    si: { verified: false, evidenceUrl: null, verifiedAt: null },
  },
};

function sourceCatalog({ generatedAt = "2026-09-07T17:00:00.000Z", dcdcAvailable = true, inverterAvailable = null } = {}) {
  return {
    generatedAt,
    market: "cs-CZ",
    currency: "CZK",
    sources: { ampul_cz: { status: "ok" } },
    products: [
      {
        id: "ampul_cz:6195",
        merchant: "ampul_cz",
        name: "DC/DC nabíječka LiFePO4 baterií 14.6V, 30A, 400W, IP68",
        description: "Input 10-36 V DC; output 14.6 V 30 A; LiFePO4.",
        categoryPath: "Nabíječky",
        category: "dc_charger",
        brand: "",
        priceCzk: 6800,
        priceCurrency: "CZK",
        available: dcdcAvailable,
        productUrl: "https://ampul.eu/cs/nabijecky/6195-dc-dc-nabijecka-lifepo4-baterii-146v-30a-400w-ip68",
        affiliateUrl: "ignored-source-link",
        imageUrl: "https://ampul.eu/example.jpg",
        specs: {},
      },
      {
        id: "ampul_cz:5577-7392",
        merchant: "ampul_cz",
        name: "Měnič napětí z DC na 230V AC, 50Hz, 2000W - 24 V DC",
        description: "Pure sine inverter.",
        categoryPath: "Měniče napětí",
        category: "inverter",
        priceCzk: 8398,
        priceCurrency: "CZK",
        available: inverterAvailable,
        productUrl: "https://ampul.eu/cs/menice-napeti/5577-7392-menic-napeti-z-dc-na-230v-ac-50hz-2000w",
        specs: {},
      },
    ],
  };
}

test("AMPUL expansion sync remains silent for an unverified market", () => {
  const result = syncAmpulExpansion(sourceCatalog(), "pt-PT", verification, { now });
  assert.deepEqual(result.products, []);
  assert.equal(result.source.status, "blocked");
  assert.equal(result.source.blocker, "market_shipping_checkout_unverified");
  assert.deepEqual(result.source.verifiedMarkets, ["ro"]);
});

test("verified market gets only the exact live 30A DC-DC product", () => {
  const result = syncAmpulExpansion(sourceCatalog(), "ro-RO", verification, { now });
  assert.equal(result.source.status, "ok");
  assert.equal(result.source.exactProducts, 1);
  assert.equal(result.products.length, 1);

  const product = result.products[0];
  assert.equal(product.id, "ampul-eu-dcdc-12v-30a");
  assert.equal(product.merchant, "ampul_eu");
  assert.equal(product.category, "dc_charger");
  assert.equal(product.market, "ro");
  assert.equal(product.available, true);
  assert.equal(product.marketEligible, true);
  assert.equal(product.specs.currentA, 30);
  assert.deepEqual(product.specs.chargingInputVoltagesV, [12, 24]);
  assert.deepEqual(product.specs.chargingVoltagesV, [12]);
  assert.deepEqual(product.specs.chargingBatteryTypes, ["lifepo4"]);
  assert.equal(new URL(product.affiliateUrl).searchParams.get("desturl"), product.productUrl);
});

test("unknown inverter availability never becomes expansion stock", () => {
  const result = syncAmpulExpansion(sourceCatalog({ inverterAvailable: null }), "ro-RO", verification, { now });
  assert.equal(result.products.some((product) => product.category === "inverter"), false);
});

test("24V inverter appears only when the exact feed variant explicitly becomes available", () => {
  const result = syncAmpulExpansion(sourceCatalog({ inverterAvailable: true }), "ro-RO", verification, { now });
  const inverter = result.products.find((product) => product.category === "inverter");
  assert.ok(inverter);
  assert.equal(inverter.id, "ampul-eu-inverter-24v-2000w");
  assert.equal(inverter.specs.voltageV, 24);
  assert.equal(inverter.specs.powerW, 2000);
  assert.equal(inverter.specs.pureSine, true);
});

test("stale or unhealthy AMPUL source catalog fails closed", () => {
  const stale = syncAmpulExpansion(sourceCatalog({ generatedAt: "2026-09-04T17:00:00.000Z" }), "ro-RO", verification, { now });
  assert.deepEqual(stale.products, []);
  assert.equal(stale.source.blocker, "ampul_source_catalog_not_fresh");

  const unhealthy = sourceCatalog();
  unhealthy.sources.ampul_cz.status = "stale";
  const result = syncAmpulExpansion(unhealthy, "ro-RO", verification, { now });
  assert.deepEqual(result.products, []);
  assert.equal(result.source.blocker, "ampul_source_catalog_not_fresh");
});

test("market verification requires explicit evidence and date", () => {
  assert.deepEqual(verifiedAmpulMarkets({
    markets: {
      pt: { verified: true, evidenceUrl: null, verifiedAt: "2026-09-07" },
      ro: { verified: true, evidenceUrl: "https://evidence.example/ro", verifiedAt: "2026-09-07" },
      si: { verified: true, evidenceUrl: "https://evidence.example/si", verifiedAt: null },
    },
  }), ["ro"]);
});
