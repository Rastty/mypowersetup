import test from "node:test";
import assert from "node:assert/strict";

import { syncAmpulRomaniaDcdc } from "../scripts/lib/sync-ampul-expansion.mjs";
import { buildRomaniaRecommendations, validateRomaniaCatalog } from "../src/ro-recommendations.js";

function ampulSourceCatalog({ status = "ok", available = true, specs = {} } = {}) {
  return {
    generatedAt: "2026-09-07T16:19:10.887Z",
    market: "cs-CZ",
    sources: {
      ampul_cz: {
        status,
        parsedProducts: 7678,
        relevantProducts: 15,
      },
    },
    products: [{
      id: "ampul_cz:6195",
      merchant: "ampul_cz",
      name: "DC/DC nabíječka LiFePO4 baterií 14.6V, 30A, 400W, IP68",
      category: "dc_charger",
      available,
      imageUrl: "https://ampul.eu/25626-large_default/dc-dc-nabijecka-lifepo4-baterii-146v-30a-400w-ip68.jpg",
      specs: {
        currentA: 30,
        chargingVoltagesV: [12],
        chargingInputVoltagesV: [12, 24],
        chargingBatteryTypes: ["lifepo4"],
        ...specs,
      },
    }],
  };
}

function roCatalog(syncResult) {
  return {
    generatedAt: "2026-09-07T18:00:00.000Z",
    market: "ro-RO",
    currency: "EUR",
    private: false,
    shippingEligibility: {
      country: "Romania",
      eligible: true,
      merchants: ["ampul_eu"],
    },
    sources: {
      ampul_eu: syncResult.source,
    },
    products: syncResult.products,
  };
}

const setup12 = {
  locale: "ro",
  systemVoltage: 12,
  batteryType: "lifepo4",
  batteryAh: 180,
  solarWatts: 200,
  controllerAmps: 20,
  inverterWatts: 0,
  charging: {
    starterVoltage: 12,
    dcDc: { suggestedCurrentAmps: 25 },
    shore: { suggestedCurrentAmps: 10 },
  },
};

test("fresh approved Ampul feed activates exactly one Romanian 30A DC-DC product", () => {
  const result = syncAmpulRomaniaDcdc(ampulSourceCatalog());
  assert.equal(result.source.status, "ok");
  assert.deepEqual(result.source.verifiedMarkets, ["ro"]);
  assert.equal(result.products.length, 1);

  const product = result.products[0];
  assert.equal(product.id, "ampul_eu:6195:ro");
  assert.equal(product.merchant, "ampul_eu");
  assert.equal(product.category, "dc_charger");
  assert.equal(product.available, true);
  assert.equal(product.marketEligible, true);
  assert.equal(product.priceCzk, null);
  assert.equal(product.priceCurrency, "EUR");
  assert.equal(product.specs.currentA, 30);
  assert.deepEqual(product.specs.chargingVoltagesV, [12]);
  assert.deepEqual(product.specs.chargingInputVoltagesV, [12, 24]);
  assert.deepEqual(product.specs.chargingBatteryTypes, ["lifepo4"]);
  assert.match(product.productUrl, /^https:\/\/ampul\.eu\/ro\/incarcatoare\/6195-/);
  assert.equal(new URL(product.affiliateUrl).searchParams.get("desturl"), product.productUrl);
});

test("Romania runtime accepts the activated Ampul product and recommends it for 12V LiFePO4", () => {
  const result = syncAmpulRomaniaDcdc(ampulSourceCatalog());
  const catalog = validateRomaniaCatalog(roCatalog(result));
  const recommendations = buildRomaniaRecommendations(catalog, setup12);

  assert.equal(recommendations.dc_charger.length, 1);
  assert.equal(recommendations.dc_charger[0].id, "ampul_eu:6195:ro");
  assert.equal(recommendations.dc_charger[0].merchant, "ampul_eu");
  assert.equal(recommendations.dc_charger[0].specs.currentA, 30);
});

test("Ampul Romania activation fails closed on stale feed, stock loss or technical drift", () => {
  assert.equal(syncAmpulRomaniaDcdc(ampulSourceCatalog({ status: "stale" })).products.length, 0);
  assert.equal(syncAmpulRomaniaDcdc(ampulSourceCatalog({ available: false })).products.length, 0);
  const drift = syncAmpulRomaniaDcdc(ampulSourceCatalog({ specs: { currentA: 20 } }));
  assert.equal(drift.source.status, "error");
  assert.equal(drift.products.length, 0);
});

test("Romania runtime rejects bad tracking and incompatible 24V service-battery use", () => {
  const result = syncAmpulRomaniaDcdc(ampulSourceCatalog());
  const bad = structuredClone(roCatalog(result));
  bad.products[0].affiliateUrl = bad.products[0].affiliateUrl.replace("f34c86c8", "other");
  assert.throws(() => validateRomaniaCatalog(bad), /AMPUL_AFFILIATE_INVALID/);

  const catalog = validateRomaniaCatalog(roCatalog(result));
  const recommendations = buildRomaniaRecommendations(catalog, {
    ...setup12,
    systemVoltage: 24,
  });
  assert.equal(recommendations.dc_charger.length, 0);
});
