import test from "node:test";
import assert from "node:assert/strict";

import { syncXdatouEu } from "../scripts/lib/sync-xdatou-eu.mjs";

const payload = {
  products: [{
    id: 987654321,
    title: "DATOUBOSS 2000W Pure Sine Wave Inverter, 24V to 230V, 4000W Peak Power, for House, Car, Truck RV Etc",
    handle: "datouboss-2000w-pure-sine-wave-inverter-24v-car-truck",
    vendor: "DATOUBOSS",
    images: [{ src: "https://cdn.shopify.com/example-xdatou.webp" }],
    variants: [{ id: 1, price: "139.00", available: true }],
  }],
};

function response(body = payload, { ok = true, status = 200 } = {}) {
  return {
    ok,
    status,
    async json() { return body; },
  };
}

test("Xdatou sync is network-silent and fail-closed while affiliate activation is pending", async () => {
  let calls = 0;
  const result = await syncXdatouEu({ products: [] }, {
    fetchImpl: async () => {
      calls += 1;
      return response();
    },
  });

  assert.equal(calls, 0);
  assert.deepEqual(result.products, []);
  assert.equal(result.source.status, "blocked");
  assert.equal(result.source.blocker, "goaffpro_activation_pending");
});

test("activated Xdatou sync emits one exact PT RO SI inverter product", async () => {
  const result = await syncXdatouEu({ products: [] }, {
    fetchImpl: async () => response(),
    approvalConfirmed: true,
    referralIdentifier: "ref",
    referralCode: "MPS_1234",
  });

  assert.equal(result.source.status, "ok");
  assert.equal(result.source.exactProducts, 1);
  assert.deepEqual(result.source.shippingEligibleMarkets, ["pt-PT", "ro-RO", "sl-SI"]);
  assert.equal(result.products.length, 1);

  const product = result.products[0];
  assert.equal(product.merchant, "xdatou");
  assert.equal(product.category, "inverter");
  assert.equal(product.priceCzk, 139);
  assert.equal(product.priceCurrency, "EUR");
  assert.equal(product.marketEligible, true);
  assert.equal(product.available, true);
  assert.equal(product.specs.voltageV, 24);
  assert.equal(product.specs.powerW, 2000);
  assert.equal(product.specs.pureSine, true);
  assert.equal(new URL(product.affiliateUrl).searchParams.get("ref"), "MPS_1234");
});

test("activated sync fails closed when exact SKU is missing or unavailable", async () => {
  const missing = await syncXdatouEu({ products: [] }, {
    fetchImpl: async () => response({ products: [] }),
    approvalConfirmed: true,
    referralIdentifier: "ref",
    referralCode: "MPS_1234",
    attempts: 1,
  });
  assert.equal(missing.source.status, "error");
  assert.deepEqual(missing.products, []);

  const unavailablePayload = structuredClone(payload);
  unavailablePayload.products[0].variants[0].available = false;
  const unavailable = await syncXdatouEu({ products: [] }, {
    fetchImpl: async () => response(unavailablePayload),
    approvalConfirmed: true,
    referralIdentifier: "ref",
    referralCode: "MPS_1234",
  });
  assert.equal(unavailable.source.status, "unavailable");
  assert.deepEqual(unavailable.products, []);
});

test("Xdatou sync retries transient HTTP failures but never carries a stale product into recommendations", async () => {
  let calls = 0;
  const previous = {
    products: [{
      id: "xdatou:old",
      merchant: "xdatou",
      available: true,
    }],
  };

  const recovered = await syncXdatouEu(previous, {
    fetchImpl: async () => {
      calls += 1;
      if (calls === 1) return response({}, { ok: false, status: 503 });
      return response();
    },
    approvalConfirmed: true,
    referralIdentifier: "ref",
    referralCode: "MPS_1234",
    sleep: async () => {},
  });
  assert.equal(calls, 2);
  assert.equal(recovered.source.status, "ok");
  assert.equal(recovered.products.length, 1);

  const failed = await syncXdatouEu(previous, {
    fetchImpl: async () => { throw new Error("network down"); },
    approvalConfirmed: true,
    referralIdentifier: "ref",
    referralCode: "MPS_1234",
    attempts: 1,
  });
  assert.equal(failed.source.status, "error");
  assert.equal(failed.source.preservedProducts, 1);
  assert.deepEqual(failed.products, []);
});
