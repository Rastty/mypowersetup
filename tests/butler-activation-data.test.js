import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  butlerActivationState,
  validateButlerExpansionProduct,
} from "../src/affiliate-butler.js";
import { syncButlerEu } from "../scripts/lib/sync-butler-eu.mjs";

const NOW = Date.parse("2026-09-18T20:00:00.000Z");
const CONTROLLER = "butler-victron-scc125060321";
const DCDC = "butler-victron-orion-xs-12-12-50";

async function activationFile() {
  return JSON.parse(await readFile(new URL("../data/butler-affiliate-activation.json", import.meta.url), "utf8"));
}

function fullyApprove(activation) {
  activation.approvalConfirmed = true;
  activation.approvalSource = "owner-confirmed Awin programme 31291 approval";
  activation.trackingVerifiedAt = "2026-09-16";
  return activation;
}

test("committed Butler activation stays fail-closed despite fresh public stock evidence", async () => {
  const activation = await activationFile();
  const state = butlerActivationState(activation, CONTROLLER, "pt-PT", { now: NOW });
  assert.equal(state.stockVerified, true);
  assert.equal(state.ready, false);
  assert.equal(state.blocker, "awin_program_approval_pending");

  const result = syncButlerEu("pt-PT", activation, { now: NOW });
  assert.deepEqual(result.products, []);
  assert.equal(result.source.status, "blocked");
  assert.equal(result.source.blocker, "awin_program_approval_pending");
});

test("approval boolean alone cannot activate Butler", async () => {
  const activation = await activationFile();
  activation.approvalConfirmed = true;
  let state = butlerActivationState(activation, DCDC, "ro-RO", { now: NOW });
  assert.equal(state.ready, false);
  assert.equal(state.blocker, "awin_approval_evidence_missing");

  activation.approvalSource = "owner-confirmed Awin approval";
  state = butlerActivationState(activation, DCDC, "ro-RO", { now: NOW });
  assert.equal(state.ready, false);
  assert.equal(state.blocker, "awin_tracking_verification_pending");
});

test("complete approval and tracking evidence activates both exact Butler products", async () => {
  const activation = fullyApprove(await activationFile());
  const result = syncButlerEu("ro-RO", activation, { now: NOW });

  assert.equal(result.source.status, "ok");
  assert.equal(result.source.approvalConfirmed, true);
  assert.equal(result.products.length, 2);
  assert.deepEqual(result.products.map(({ id }) => id).sort(), [CONTROLLER, DCDC].sort());
  assert.ok(result.products.every(({ affiliateUrl }) => {
    const url = new URL(affiliateUrl);
    return url.hostname === "www.awin1.com"
      && url.searchParams.get("awinmid") === "31291"
      && url.searchParams.get("awinaffid") === "3044971";
  }));
  for (const product of result.products) {
    validateButlerExpansionProduct(product, { market: "ro-RO", source: result.source });
  }
});

test("stale stock evidence excludes only the affected exact Butler product", async () => {
  const activation = fullyApprove(await activationFile());
  activation.products[CONTROLLER].stockVerifiedAt = "2026-08-01";
  const result = syncButlerEu("sl-SI", activation, { now: NOW });

  assert.equal(result.source.status, "ok");
  assert.equal(result.products.length, 1);
  assert.equal(result.products[0].id, DCDC);
  assert.deepEqual(result.source.verifiedProductMarkets[CONTROLLER], []);
  assert.deepEqual(result.source.verifiedProductMarkets[DCDC], ["si"]);
});

test("Butler product cannot be copied into a source that did not verify its market", async () => {
  const activation = fullyApprove(await activationFile());
  const result = syncButlerEu("pt-PT", activation, { now: NOW });
  const source = structuredClone(result.source);
  source.verifiedProductMarkets[CONTROLLER] = [];

  const product = result.products.find(({ id }) => id === CONTROLLER);
  assert.throws(
    () => validateButlerExpansionProduct(product, { market: "pt-PT", source }),
    /BUTLER_PRODUCT_MARKET_UNVERIFIED/,
  );
});

test("mutated Butler electrical specs fail runtime validation", async () => {
  const activation = fullyApprove(await activationFile());
  const result = syncButlerEu("pt-PT", activation, { now: NOW });
  const original = result.products.find(({ id }) => id === DCDC);
  const mutated = {
    ...original,
    specs: { ...original.specs, currentA: 30 },
  };

  assert.throws(
    () => validateButlerExpansionProduct(mutated, { market: "pt-PT", source: result.source }),
    /BUTLER_DCDC_SPECS_INVALID/,
  );
});
