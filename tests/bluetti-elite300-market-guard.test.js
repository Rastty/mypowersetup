import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  BLUETTI_ELITE300_SUPPORTED_MARKETS,
  BLUETTI_ELITE_300_EU,
} from "../src/affiliate-bluetti-eu.js";
import { validatePtCatalog } from "../src/products-pt.js";
import { validateRomaniaCatalog } from "../src/ro-recommendations.js";

const landing = "https://www.bluettipower.eu/products/elite-300-portable-power-station";

function candidate() {
  return {
    id: "bluetti_eu:123456",
    merchant: "bluetti_eu",
    name: BLUETTI_ELITE_300_EU.name,
    description: "Verified Elite 300 planning fixture",
    categoryPath: "Portable Power Station",
    category: "power_station",
    brand: "BLUETTI",
    priceCzk: 1499,
    priceCurrency: "EUR",
    available: true,
    marketEligible: true,
    productUrl: landing,
    affiliateUrl: "https://www.example-cj-tracking.invalid/click?opaque=elite300",
    imageUrl: "https://cdn.shopify.com/bluetti.webp",
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

test("PT and RO reject a staged Elite 300 while committed CJ tracking evidence is incomplete", () => {
  const pt = {
    generatedAt: "2026-09-07T20:00:00.000Z",
    market: "pt-PT",
    currency: "EUR",
    private: false,
    sources: { bluetti_eu: { status: "ok" } },
    products: [candidate()],
  };
  assert.throws(() => validatePtCatalog(pt), /BLUETTI_ELITE300_TRACKING_NOT_VERIFIED/);

  const ro = {
    generatedAt: "2026-09-07T20:00:00.000Z",
    market: "ro-RO",
    currency: "EUR",
    private: false,
    shippingEligibility: { country: "Romania", eligible: true },
    sources: { bluetti_eu: { status: "ok" } },
    products: [candidate()],
  };
  assert.throws(() => validateRomaniaCatalog(ro), /BLUETTI_ELITE300_TRACKING_NOT_VERIFIED/);
});

test("PT and RO reject BLUETTI products from a blocked source before product validation", () => {
  const pt = {
    market: "pt-PT",
    currency: "EUR",
    private: false,
    sources: { bluetti_eu: { status: "blocked" } },
    products: [candidate()],
  };
  assert.throws(() => validatePtCatalog(pt), /PT_BLUETTI_SOURCE_INVALID/);

  const ro = {
    market: "ro-RO",
    currency: "EUR",
    private: false,
    shippingEligibility: { country: "Romania", eligible: true },
    sources: { bluetti_eu: { status: "blocked" } },
    products: [candidate()],
  };
  assert.throws(() => validateRomaniaCatalog(ro), /RO_BLUETTI_SOURCE_INVALID/);
});

test("Elite 300 activation scope excludes Slovenia and the current SI catalog contains no BLUETTI product", async () => {
  assert.deepEqual(BLUETTI_ELITE300_SUPPORTED_MARKETS, ["pt", "ro"]);
  assert.equal(BLUETTI_ELITE300_SUPPORTED_MARKETS.includes("si"), false);

  const si = JSON.parse(await readFile(new URL("../data/products-si.json", import.meta.url), "utf8"));
  assert.equal((si.products || []).some((product) => product.merchant === "bluetti_eu"), false);
  assert.equal(Object.hasOwn(si.sources || {}, "bluetti_eu"), false);
});
