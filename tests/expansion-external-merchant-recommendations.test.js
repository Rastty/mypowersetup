import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { buildScenarioSetup, COMMERCIAL_SCENARIOS } from "../src/commercial-scenarios.js";
import { buildPortugalRecommendations } from "../src/pt-recommendations.js";
import { buildRomaniaRecommendations } from "../src/ro-recommendations.js";

const landing = "https://www.bluettipower.eu/products/elite-300-portable-power-station";
const affiliate = "https://www.example-cj-tracking.invalid/click?url=" + encodeURIComponent(landing);
const activation = Object.freeze({
  approvalConfirmed: true,
  approvalSource: "owner_confirmed",
  exactAffiliateUrl: affiliate,
  finalLandingUrl: landing,
  verifiedAt: "2026-09-07",
});

function elite() {
  return {
    id: "bluetti_eu:elite300",
    merchant: "bluetti_eu",
    name: "BLUETTI Elite 300 Portable Power Station",
    description: "Elite 300 verified activation fixture",
    categoryPath: "Portable Power Station",
    category: "power_station",
    brand: "BLUETTI",
    priceCzk: 1499,
    priceCurrency: "EUR",
    available: true,
    marketEligible: true,
    productUrl: landing,
    affiliateUrl: affiliate,
    imageUrl: "https://cdn.shopify.com/elite300.webp",
    specs: {
      capacityWh: 3014.4,
      powerW: 2400,
      pureSine: true,
      solarInputW: 1200,
      dcOutputA: 30,
      batteryType: "lifepo4",
    },
    verifiedAt: "2026-09-07",
  };
}

test("verified Elite 300 reaches the PT recommendation view after activation", () => {
  const family = COMMERCIAL_SCENARIOS.find(({ id }) => id === "family-touring");
  const setup = buildScenarioSetup(family, "pt");
  const catalog = {
    generatedAt: "2026-09-07T20:00:00.000Z",
    market: "pt-PT",
    currency: "EUR",
    private: false,
    sources: { bluetti_eu: { status: "ok" } },
    products: [elite()],
  };

  const recommendations = buildPortugalRecommendations(catalog, setup, 3, { bluettiActivation: activation });
  assert.equal(recommendations.power_station.length, 1);
  assert.equal(recommendations.power_station[0].merchant, "bluetti_eu");
  assert.equal(recommendations.power_station[0].name, "BLUETTI Elite 300 Portable Power Station");
  assert.equal(recommendations.power_station[0].affiliateUrl, affiliate);
});

test("verified Elite 300 reaches the RO recommendation view after activation", () => {
  const family = COMMERCIAL_SCENARIOS.find(({ id }) => id === "family-touring");
  const setup = buildScenarioSetup(family, "ro");
  const catalog = {
    generatedAt: "2026-09-07T20:00:00.000Z",
    market: "ro-RO",
    currency: "EUR",
    private: false,
    shippingEligibility: { country: "Romania", eligible: true },
    sources: { bluetti_eu: { status: "ok" } },
    products: [elite()],
  };

  const recommendations = buildRomaniaRecommendations(catalog, setup, 3, { bluettiActivation: activation });
  assert.equal(recommendations.power_station.length, 1);
  assert.equal(recommendations.power_station[0].merchant, "bluetti_eu");
  assert.equal(recommendations.power_station[0].name, "BLUETTI Elite 300 Portable Power Station");
  assert.equal(recommendations.power_station[0].affiliateUrl, affiliate);
});

test("expansion product CTAs name every staged external merchant", async () => {
  const source = await readFile(new URL("../src/expansion-calculator-browser.js", import.meta.url), "utf8");
  for (const [merchant, label] of [
    ["ampul_eu", "AMPUL"],
    ["xdatou", "Xdatou"],
    ["bluetti_eu", "BLUETTI"],
  ]) {
    assert.ok(source.includes(`${merchant}: "${label}"`), `${merchant} CTA label missing`);
  }
});
