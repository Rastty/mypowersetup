import test from "node:test";
import assert from "node:assert/strict";

import { syncBluettiElite300Eu } from "../scripts/lib/sync-bluetti-elite300-eu.mjs";

const destination = "https://www.bluettipower.eu/products/elite-300-portable-power-station";
const cj = `https://www.dpbolvw.net/click-101869970-99999999?url=${encodeURIComponent(destination)}`;

const payload = {
  products: [{
    id: 300300,
    title: "BLUETTI Elite 300 Portable Power Station | 2400W 3014.4Wh",
    handle: "elite-300-portable-power-station",
    vendor: "BLUETTI",
    images: [{ src: "https://cdn.shopify.com/elite300.webp" }],
    variants: [{ id: 1, price: "1499.00", available: true }],
  }],
};

function response(body = payload, { ok = true, status = 200 } = {}) {
  return {
    ok,
    status,
    async json() { return body; },
  };
}

test("Elite 300 sync is network-silent until exact CJ EU deeplink is verified", async () => {
  let calls = 0;
  const result = await syncBluettiElite300Eu({ products: [] }, {
    fetchImpl: async () => {
      calls += 1;
      return response();
    },
  });

  assert.equal(calls, 0);
  assert.deepEqual(result.products, []);
  assert.equal(result.source.status, "blocked");
  assert.equal(result.source.blocker, "exact_cj_eu_deeplink_unverified");
});

test("activated Elite 300 sync emits one exact PT/RO power station", async () => {
  const result = await syncBluettiElite300Eu({ products: [] }, {
    fetchImpl: async () => response(),
    affiliateUrl: cj,
    finalLandingUrl: destination,
    trackingVerifiedAt: "2026-09-07",
  });

  assert.equal(result.source.status, "ok");
  assert.equal(result.source.network, "cj");
  assert.equal(result.source.exactProducts, 1);
  assert.deepEqual(result.source.shippingEligibleMarkets, ["pt-PT", "ro-RO"]);

  const product = result.products[0];
  assert.equal(product.merchant, "bluetti_eu");
  assert.equal(product.category, "power_station");
  assert.equal(product.priceCzk, 1499);
  assert.equal(product.priceCurrency, "EUR");
  assert.equal(product.marketEligible, true);
  assert.equal(product.productUrl, destination);
  assert.equal(product.affiliateUrl, cj);
  assert.equal(product.specs.capacityWh, 3014.4);
  assert.equal(product.specs.powerW, 2400);
  assert.equal(product.specs.solarInputW, 1200);
  assert.equal(product.specs.dcOutputVoltageV, 12);
  assert.equal(product.specs.dcOutputA, 30);
  assert.equal(product.specs.pureSine, true);
});

test("activated Elite 300 sync fails closed on missing or unavailable exact SKU", async () => {
  const missing = await syncBluettiElite300Eu({ products: [] }, {
    fetchImpl: async () => response({ products: [] }),
    affiliateUrl: cj,
    finalLandingUrl: destination,
    trackingVerifiedAt: "2026-09-07",
    attempts: 1,
  });
  assert.equal(missing.source.status, "error");
  assert.deepEqual(missing.products, []);

  const unavailablePayload = structuredClone(payload);
  unavailablePayload.products[0].variants[0].available = false;
  const unavailable = await syncBluettiElite300Eu({ products: [] }, {
    fetchImpl: async () => response(unavailablePayload),
    affiliateUrl: cj,
    finalLandingUrl: destination,
    trackingVerifiedAt: "2026-09-07",
  });
  assert.equal(unavailable.source.status, "unavailable");
  assert.deepEqual(unavailable.products, []);
});

test("Elite 300 sync never carries stale BLUETTI product on fetch failure", async () => {
  const result = await syncBluettiElite300Eu({
    products: [{ id: "bluetti_eu:old", merchant: "bluetti_eu", available: true }],
  }, {
    fetchImpl: async () => { throw new Error("network down"); },
    affiliateUrl: cj,
    finalLandingUrl: destination,
    trackingVerifiedAt: "2026-09-07",
    attempts: 1,
  });

  assert.equal(result.source.status, "error");
  assert.equal(result.source.preservedProducts, 1);
  assert.deepEqual(result.products, []);
});
