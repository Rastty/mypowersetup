import test from "node:test";
import assert from "node:assert/strict";

import {
  BLUETTI_ELITE300_CJ,
  BLUETTI_ELITE_300_EU,
  BLUETTI_ELITE300_SUPPORTED_MARKETS,
  bluettiElite300ActivationReady,
  validateBluettiElite300Product,
} from "../src/affiliate-bluetti-eu.js";
import { syncBluettiElite300Eu } from "../scripts/lib/sync-bluetti-elite300-eu.mjs";

const landing = "https://www.bluettipower.eu/products/elite-300-portable-power-station";
const activation = Object.freeze({
  approvalConfirmed: true,
  approvalSource: "owner_confirmed",
  exactAffiliateUrl: "https://www.example-cj-tracking.invalid/click?opaque=elite300",
  finalLandingUrl: landing,
  verifiedAt: "2026-09-07",
});

const payload = {
  products: [{
    id: 123456,
    title: "BLUETTI Elite 300 Portable Power Station | 2.400W 3.014,4Wh",
    handle: "elite-300-portable-power-station",
    images: [{ src: "https://cdn.shopify.com/bluetti-elite300.webp" }],
    variants: [{ id: 1, price: "1499.00", available: true }],
  }],
};

function response(body = payload, { ok = true, status = 200 } = {}) {
  return { ok, status, async json() { return body; } };
}

test("BLUETTI Elite 300 activation remains fail-closed in repository defaults", () => {
  assert.equal(BLUETTI_ELITE300_CJ.approvalConfirmed, true);
  assert.equal(BLUETTI_ELITE300_CJ.exactAffiliateUrl, null);
  assert.equal(BLUETTI_ELITE300_CJ.finalLandingUrl, null);
  assert.equal(BLUETTI_ELITE300_CJ.verifiedAt, null);
  assert.equal(bluettiElite300ActivationReady(), false);
  assert.deepEqual(BLUETTI_ELITE300_SUPPORTED_MARKETS, ["pt", "ro"]);
});

test("BLUETTI sync is network-silent until exact CJ EU activation evidence exists", async () => {
  let calls = 0;
  const result = await syncBluettiElite300Eu({ products: [] }, {
    fetchImpl: async () => { calls += 1; return response(); },
  });
  assert.equal(calls, 0);
  assert.equal(result.source.status, "blocked");
  assert.equal(result.source.blocker, "exact_cj_eu_deeplink_unverified");
  assert.deepEqual(result.products, []);
});

test("activated BLUETTI sync emits one exact Elite 300 product for PT and RO", async () => {
  assert.equal(bluettiElite300ActivationReady(activation), true);
  const result = await syncBluettiElite300Eu({ products: [] }, {
    activation,
    fetchImpl: async () => response(),
  });

  assert.equal(result.source.status, "ok");
  assert.deepEqual(result.source.shippingEligibleMarkets, ["pt-PT", "ro-RO"]);
  assert.deepEqual(result.source.unsupportedMarkets, ["sl-SI"]);
  assert.equal(result.products.length, 1);

  const product = result.products[0];
  assert.equal(product.productUrl, landing);
  assert.equal(product.affiliateUrl, activation.exactAffiliateUrl);
  assert.equal(product.priceCzk, 1499);
  assert.equal(product.priceCurrency, "EUR");
  assert.equal(product.marketEligible, true);
  assert.equal(product.specs.capacityWh, BLUETTI_ELITE_300_EU.capacityWh);
  assert.equal(product.specs.powerW, 2400);
  assert.equal(product.specs.solarInputW, 1200);
  assert.equal(product.specs.dcOutputA, 30);
  assert.equal(product.specs.pureSine, true);
  assert.equal(product.specs.batteryType, "lifepo4");
  assert.equal(validateBluettiElite300Product(product, activation), product);
});

test("BLUETTI activation rejects direct-store URLs, wrong landing pages and incomplete dates", () => {
  assert.equal(bluettiElite300ActivationReady({ ...activation, exactAffiliateUrl: landing }), false);
  assert.equal(bluettiElite300ActivationReady({ ...activation, finalLandingUrl: "https://www.bluettipower.eu/products/ac240-power-station" }), false);
  assert.equal(bluettiElite300ActivationReady({ ...activation, verifiedAt: null }), false);
});

test("BLUETTI sync fails closed on missing or unavailable exact SKU", async () => {
  const missing = await syncBluettiElite300Eu({ products: [] }, {
    activation,
    fetchImpl: async () => response({ products: [] }),
    attempts: 1,
  });
  assert.equal(missing.source.status, "error");
  assert.deepEqual(missing.products, []);

  const unavailablePayload = structuredClone(payload);
  unavailablePayload.products[0].variants[0].available = false;
  const unavailable = await syncBluettiElite300Eu({ products: [] }, {
    activation,
    fetchImpl: async () => response(unavailablePayload),
  });
  assert.equal(unavailable.source.status, "unavailable");
  assert.deepEqual(unavailable.products, []);
});
