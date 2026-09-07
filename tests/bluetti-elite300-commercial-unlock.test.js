import test from "node:test";
import assert from "node:assert/strict";

import { COMMERCIAL_SCENARIOS, assessCommercialScenario } from "../src/commercial-scenarios.js";

const landing = "https://www.bluettipower.eu/products/elite-300-portable-power-station";

function elite300Product() {
  const tracking = new URL("https://www.example-cj-tracking.invalid/click");
  tracking.searchParams.set("url", landing);
  return {
    id: "bluetti_eu:elite300",
    merchant: "bluetti_eu",
    name: "BLUETTI Elite 300 Portable Power Station",
    category: "power_station",
    available: true,
    marketEligible: true,
    productUrl: landing,
    affiliateUrl: tracking.toString(),
    priceCzk: 1499,
    priceCurrency: "EUR",
    verifiedAt: "2026-09-07",
    specs: {
      capacityWh: 3014.4,
      powerW: 2400,
      pureSine: true,
      solarInputW: 1200,
      dcOutputA: 30,
      batteryType: "lifepo4",
    },
  };
}

test("an activated exact Elite 300 unlocks the PT and RO family-touring purchase route", () => {
  const family = COMMERCIAL_SCENARIOS.find(({ id }) => id === "family-touring");
  for (const [market, locale] of [["pt-PT", "pt"], ["ro-RO", "ro"]]) {
    const catalog = {
      market,
      sources: { bluetti_eu: { status: "ok" } },
      products: [elite300Product()],
    };
    const result = assessCommercialScenario(catalog, family, locale);
    assert.equal(result.componentReady, false);
    assert.equal(result.portableReady, true);
    assert.equal(result.purchaseReady, true);
    assert.equal(result.purchaseRoute, "portable");
  }
});

test("the same Elite 300 must not be counted when its source is not active", () => {
  const family = COMMERCIAL_SCENARIOS.find(({ id }) => id === "family-touring");
  const result = assessCommercialScenario({
    market: "pt-PT",
    sources: { bluetti_eu: { status: "blocked" } },
    products: [elite300Product()],
  }, family, "pt");

  assert.equal(result.portableReady, false);
  assert.equal(result.purchaseReady, false);
  assert.equal(result.purchaseRoute, "none");
});
