import test from "node:test";
import assert from "node:assert/strict";

import { validatePtCatalog } from "../src/products-pt.js";
import { validateRomaniaCatalog, buildRomaniaRecommendations } from "../src/ro-recommendations.js";
import { validateSloveniaCatalog } from "../src/si-recommendations.js";
import { buildPortugalRecommendations } from "../src/pt-recommendations.js";
import { COMMERCIAL_SCENARIOS, buildScenarioSetup } from "../src/commercial-scenarios.js";
import { expansionPurchaseRoutePriority } from "../src/expansion-purchase-route-priority.js";

const destination = "https://www.bluettipower.eu/products/elite-300-portable-power-station";
const affiliateUrl = `https://www.dpbolvw.net/click-101869970-99999999?url=${encodeURIComponent(destination)}`;
const source = Object.freeze({
  status: "ok",
  network: "cj",
  approvalConfirmed: true,
  affiliateUrl,
  finalLandingUrl: destination,
  trackingVerifiedAt: "2026-09-07",
  exactProducts: 1,
  shippingEligibleMarkets: ["pt-PT", "ro-RO"],
  verifiedAt: "2026-09-07",
});

function product() {
  return {
    id: "bluetti_eu:300300",
    merchant: "bluetti_eu",
    name: "BLUETTI Elite 300 Portable Power Station",
    description: "3014.4Wh LiFePO4, 2400W pure-sine AC, 1200W solar input and 12V/30A RV DC output.",
    categoryPath: "Portable Power Station",
    category: "power_station",
    brand: "BLUETTI",
    priceCzk: 1499,
    priceCurrency: "EUR",
    available: true,
    marketEligible: true,
    productUrl: destination,
    affiliateUrl,
    imageUrl: "https://cdn.shopify.com/elite300.webp",
    specs: {
      capacityWh: 3014.4,
      powerW: 2400,
      pureSine: true,
      solarInputW: 1200,
      dcOutputVoltageV: 12,
      dcOutputA: 30,
      batteryType: "lifepo4",
    },
    verifiedAt: "2026-09-07",
  };
}

function ptCatalog() {
  return {
    generatedAt: "2026-09-07T18:00:00.000Z",
    market: "pt-PT",
    currency: "EUR",
    private: false,
    sources: { bluetti_eu: source },
    products: [product()],
  };
}

function roCatalog() {
  return {
    generatedAt: "2026-09-07T18:00:00.000Z",
    market: "ro-RO",
    currency: "EUR",
    private: false,
    shippingEligibility: { country: "Romania", eligible: true },
    sources: { bluetti_eu: source },
    products: [product()],
  };
}

test("activated Elite 300 is accepted in PT and RO exact catalogs", () => {
  assert.equal(validatePtCatalog(ptCatalog()).products[0].merchant, "bluetti_eu");
  assert.equal(validateRomaniaCatalog(roCatalog()).products[0].merchant, "bluetti_eu");
});

test("activated Elite 300 makes family-touring portable-ready in PT and RO", () => {
  const scenario = COMMERCIAL_SCENARIOS.find(({ id }) => id === "family-touring");
  assert.ok(scenario);

  for (const [locale, catalog, build] of [
    ["pt", ptCatalog(), buildPortugalRecommendations],
    ["ro", roCatalog(), buildRomaniaRecommendations],
  ]) {
    const setup = buildScenarioSetup(scenario, locale);
    const recommendations = build(catalog, setup, 3);
    assert.equal(recommendations.power_station.length, 1, `${locale}: Elite 300 portable fit missing`);
    assert.equal(recommendations.power_station[0].merchant, "bluetti_eu");

    const priority = expansionPurchaseRoutePriority(recommendations, setup, locale);
    assert.equal(priority.portableReady, true);
    assert.equal(priority.preferPortable, true);
    assert.equal(priority.order[0], "portable");
  }
});

test("Slovenia rejects Elite 300 because current direct shipping evidence excludes SI", () => {
  const catalog = {
    generatedAt: "2026-09-07T18:00:00.000Z",
    market: "sl-SI",
    currency: "EUR",
    private: false,
    shippingEligibility: { country: "Slovenia", eligible: true },
    sources: { bluetti_eu: source },
    products: [product()],
  };
  assert.throws(() => validateSloveniaCatalog(catalog), /SI_PRODUCT_MERCHANT_INVALID/);
});

test("PT and RO reject Elite 300 when the CJ source is not fully verified", () => {
  const blockedSource = { ...source, status: "blocked", finalLandingUrl: null };
  const pt = { ...ptCatalog(), sources: { bluetti_eu: blockedSource } };
  const ro = { ...roCatalog(), sources: { bluetti_eu: blockedSource } };

  assert.throws(() => validatePtCatalog(pt), /PT_BLUETTI_SOURCE_INVALID/);
  assert.throws(() => validateRomaniaCatalog(ro), /RO_BLUETTI_SOURCE_INVALID/);
});
