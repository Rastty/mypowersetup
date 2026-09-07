import test from "node:test";
import assert from "node:assert/strict";

import {
  syncAmpulExpansion,
  verifiedAmpulMarkets,
  verifiedAmpulProductMarkets,
  verifiedAmpulProductMarketsMap,
} from "../scripts/lib/sync-ampul-expansion.mjs";

const DCDC_ID = "ampul-eu-dcdc-12v-30a";
const INVERTER_ID = "ampul-eu-inverter-24v-2000w";
const now = Date.parse("2026-09-07T18:00:00.000Z");

function marketRecord(verified = false, suffix = "") {
  return {
    verified,
    evidenceUrl: verified ? `https://evidence.example/${suffix || "market"}` : null,
    verifiedAt: verified ? "2026-09-07" : null,
  };
}

function verification({ dcdc = [], inverter = [] } = {}) {
  return {
    schemaVersion: 2,
    products: {
      [DCDC_ID]: {
        markets: {
          pt: marketRecord(dcdc.includes("pt"), "dcdc-pt"),
          ro: marketRecord(dcdc.includes("ro"), "dcdc-ro"),
          si: marketRecord(dcdc.includes("si"), "dcdc-si"),
        },
      },
      [INVERTER_ID]: {
        markets: {
          pt: marketRecord(inverter.includes("pt"), "inverter-pt"),
          ro: marketRecord(inverter.includes("ro"), "inverter-ro"),
          si: marketRecord(inverter.includes("si"), "inverter-si"),
        },
      },
    },
  };
}

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

test("AMPUL expansion sync remains silent when no exact product is verified for the market", () => {
  const result = syncAmpulExpansion(sourceCatalog(), "pt-PT", verification(), { now });
  assert.deepEqual(result.products, []);
  assert.equal(result.source.status, "blocked");
  assert.equal(result.source.blocker, "product_market_shipping_checkout_unverified");
  assert.deepEqual(result.source.verifiedMarkets, []);
  assert.deepEqual(result.source.verifiedProductMarkets[DCDC_ID], []);
  assert.deepEqual(result.source.verifiedProductMarkets[INVERTER_ID], []);
});

test("verifying Romania DC-DC does not unlock the inverter even when its feed variant is available", () => {
  const result = syncAmpulExpansion(
    sourceCatalog({ inverterAvailable: true }),
    "ro-RO",
    verification({ dcdc: ["ro"] }),
    { now }
  );

  assert.equal(result.source.status, "ok");
  assert.equal(result.source.exactProducts, 1);
  assert.deepEqual(result.source.verifiedProductMarkets[DCDC_ID], ["ro"]);
  assert.deepEqual(result.source.verifiedProductMarkets[INVERTER_ID], []);
  assert.equal(result.products.length, 1);
  assert.equal(result.products[0].id, DCDC_ID);
  assert.equal(result.products.some((product) => product.category === "inverter"), false);
});

test("verified Romania DC-DC keeps its exact technical and affiliate evidence", () => {
  const result = syncAmpulExpansion(sourceCatalog(), "ro-RO", verification({ dcdc: ["ro"] }), { now });
  const product = result.products[0];

  assert.equal(product.id, DCDC_ID);
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

test("inverter appears only when that exact inverter-market pair is independently verified", () => {
  const result = syncAmpulExpansion(
    sourceCatalog({ inverterAvailable: true }),
    "ro-RO",
    verification({ inverter: ["ro"] }),
    { now }
  );
  assert.equal(result.products.length, 1);
  const inverter = result.products[0];
  assert.equal(inverter.id, INVERTER_ID);
  assert.equal(inverter.category, "inverter");
  assert.equal(inverter.specs.voltageV, 24);
  assert.equal(inverter.specs.powerW, 2000);
  assert.equal(inverter.specs.pureSine, true);
  assert.deepEqual(result.source.verifiedProductMarkets[INVERTER_ID], ["ro"]);
  assert.deepEqual(result.source.verifiedProductMarkets[DCDC_ID], []);
});

test("stale or unhealthy AMPUL source catalog fails closed after product-market verification", () => {
  const evidence = verification({ dcdc: ["ro"] });
  const stale = syncAmpulExpansion(sourceCatalog({ generatedAt: "2026-09-04T17:00:00.000Z" }), "ro-RO", evidence, { now });
  assert.deepEqual(stale.products, []);
  assert.equal(stale.source.blocker, "ampul_source_catalog_not_fresh");
  assert.deepEqual(stale.source.verifiedProductMarkets[DCDC_ID], ["ro"]);

  const unhealthy = sourceCatalog();
  unhealthy.sources.ampul_cz.status = "stale";
  const result = syncAmpulExpansion(unhealthy, "ro-RO", evidence, { now });
  assert.deepEqual(result.products, []);
  assert.equal(result.source.blocker, "ampul_source_catalog_not_fresh");
});

test("product-market verification requires explicit evidence URL and date", () => {
  const evidence = verification({ dcdc: ["ro"], inverter: ["si"] });
  evidence.products[DCDC_ID].markets.pt = { verified: true, evidenceUrl: null, verifiedAt: "2026-09-07" };
  evidence.products[INVERTER_ID].markets.pt = { verified: true, evidenceUrl: "https://evidence.example/inverter-pt", verifiedAt: null };

  assert.deepEqual(verifiedAmpulProductMarkets(evidence, DCDC_ID), ["ro"]);
  assert.deepEqual(verifiedAmpulProductMarkets(evidence, INVERTER_ID), ["si"]);
  assert.deepEqual(verifiedAmpulMarkets(evidence), ["ro", "si"]);
  assert.deepEqual(verifiedAmpulProductMarketsMap(evidence), {
    [DCDC_ID]: ["ro"],
    [INVERTER_ID]: ["si"],
  });
});
