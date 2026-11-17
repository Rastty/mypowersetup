import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { hasCurrentRecommendationSource } from "../src/products.js";
import {
  isPowerQueenRegionRestrictedOffer,
  validatePowerQueenExpansionProduct,
} from "../src/powerqueen-expansion.js";

const ukraineOnly = Object.freeze({
  id: "powerqueen_eu:15512052695260",
  merchant: "powerqueen_eu",
  name: "Battery Power Queen 24V 125Ah Smart LiFePO4 with Bluetooth",
  brand: "PQ-UA-Tax Free",
  category: "battery",
  productUrl: "https://www.ipowerqueen.de/en/products/power-queen-24v-125ah-smart-lifepo4-battery-shipping-ukraine",
  marketEligible: true,
  available: true,
});

test("a destination-specific Power Queen offer cannot inherit pan-EU eligibility", () => {
  assert.equal(isPowerQueenRegionRestrictedOffer(ukraineOnly), true);
  assert.equal(isPowerQueenRegionRestrictedOffer({ ...ukraineOnly, brand: "Power Queen" }), true,
    "the ordinary-looking name and brand must not conceal the shipping restriction in the URL");
  assert.equal(isPowerQueenRegionRestrictedOffer({ ...ukraineOnly, productUrl: "https://www.ipowerqueen.de/en/products/regular-battery" }), true,
    "the regional tax-free merchant brand must also block the offer");
  assert.equal(isPowerQueenRegionRestrictedOffer({ ...ukraineOnly, brand: "Power Queen", productUrl: "https://www.ipowerqueen.de/en/products/regular-battery" }), false);
  assert.equal(isPowerQueenRegionRestrictedOffer({ ...ukraineOnly, merchant: "other" }), false);
});

test("stale catalog rows fail closed at recommendation and validation gates", () => {
  assert.equal(hasCurrentRecommendationSource(ukraineOnly, { powerqueen_eu: { status: "ok" } }), false);
  assert.equal(hasCurrentRecommendationSource({ ...ukraineOnly, brand: "Power Queen" }), false);
  assert.throws(() => validatePowerQueenExpansionProduct(ukraineOnly), /REGION_RESTRICTED_OFFER/);
});

test("committed six-market catalogs never recommend the Ukraine-specific SKU", async () => {
  for (const market of ["pt", "ro", "si", "sk", "pl", "hu"]) {
    const catalog = JSON.parse(await readFile(new URL(`../data/products-${market}.json`, import.meta.url), "utf8"));
    assert.equal(catalog.products.filter(isPowerQueenRegionRestrictedOffer).length, 0, `${market}: region-restricted offer leaked into market catalog`);
    assert.ok(catalog.products.some((product) => product.merchant === "powerqueen_eu" && product.category === "battery"),
      `${market}: unrestricted European batteries must remain available`);
  }
});
