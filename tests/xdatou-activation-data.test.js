import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { xdatouActivationState } from "../src/affiliate-xdatou.js";
import { syncXdatouEu } from "../scripts/lib/sync-xdatou-eu.mjs";

const payload = {
  products: [{
    id: 987654321,
    title: "DATOUBOSS 2000W Pure Sine Wave Inverter, 24V to 230V",
    handle: "datouboss-2000w-pure-sine-wave-inverter-24v-car-truck",
    images: [{ src: "https://cdn.shopify.com/example-xdatou.webp" }],
    variants: [{ id: 1, price: "139.00", available: true }],
  }],
};

async function activationFile() {
  return JSON.parse(await readFile(new URL("../data/xdatou-affiliate-activation.json", import.meta.url), "utf8"));
}

function response(body = payload) {
  return { ok: true, status: 200, async json() { return body; } };
}

test("committed XDATOU activation data is fail-closed and network-silent", async () => {
  const activation = await activationFile();
  const state = xdatouActivationState(activation);
  assert.equal(state.ready, false);
  assert.equal(state.blocker, "goaffpro_approval_pending");

  let calls = 0;
  const result = await syncXdatouEu({ products: [] }, {
    activation,
    fetchImpl: async () => {
      calls += 1;
      return response();
    },
  });

  assert.equal(calls, 0);
  assert.deepEqual(result.products, []);
  assert.equal(result.source.status, "blocked");
  assert.equal(result.source.blocker, "goaffpro_approval_pending");
});

test("approval boolean alone cannot activate XDATOU", async () => {
  const activation = await activationFile();
  activation.approvalConfirmed = true;

  let state = xdatouActivationState(activation);
  assert.equal(state.ready, false);
  assert.equal(state.blocker, "goaffpro_approval_evidence_missing");

  activation.approvalSource = "owner-confirmed GoAffPro approval";
  state = xdatouActivationState(activation);
  assert.equal(state.ready, false);
  assert.equal(state.blocker, "goaffpro_referral_credentials_pending");

  activation.referralIdentifier = "ref";
  activation.referralCode = "MPS_1234";
  state = xdatouActivationState(activation);
  assert.equal(state.ready, false);
  assert.equal(state.blocker, "goaffpro_tracking_verification_pending");
});

test("complete dated activation data unlocks the exact staged product without code changes", async () => {
  const activation = await activationFile();
  Object.assign(activation, {
    approvalConfirmed: true,
    approvalSource: "owner-confirmed GoAffPro approval",
    referralIdentifier: "ref",
    referralCode: "MPS_1234",
    trackingVerifiedAt: "2026-09-16",
  });

  const state = xdatouActivationState(activation);
  assert.equal(state.ready, true);
  assert.equal(state.blocker, null);

  const result = await syncXdatouEu({ products: [] }, {
    activation,
    fetchImpl: async () => response(),
  });

  assert.equal(result.source.status, "ok");
  assert.equal(result.source.approvalConfirmed, true);
  assert.equal(result.source.approvalSource, activation.approvalSource);
  assert.equal(result.source.trackingVerifiedAt, "2026-09-16");
  assert.equal(result.products.length, 1);
  assert.equal(new URL(result.products[0].affiliateUrl).searchParams.get("ref"), "MPS_1234");
});
