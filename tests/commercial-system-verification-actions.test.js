import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  bestCurrentCommercialSystemVerification,
  buildCurrentCommercialSystemVerificationQueue,
} from "../src/commercial-system-verification-actions.js";

test("system verification queue surfaces AMPUL P0 inverter verification ahead of secondary DC-DC work", async () => {
  const report = JSON.parse(await readFile(new URL("../data/commercial-opportunity-report.json", import.meta.url), "utf8"));
  const actions = buildCurrentCommercialSystemVerificationQueue(report.markets);

  assert.deepEqual(actions.map(({ nextAction }) => nextAction), [
    "verify_pt_ro_si_checkout_and_24v_variant_stock",
    "verify_pt_ro_si_checkout",
  ]);

  const best = bestCurrentCommercialSystemVerification(report.markets);
  assert.equal(best.merchant, "ampul_eu");
  assert.equal(best.bestPriority, "P0");
  assert.deepEqual(best.candidateIds, ["ampul-eu-inverter-24v-2000w"]);
  assert.deepEqual(best.activeMarkets, ["pt-PT", "ro-RO", "sl-SI"]);
  assert.deepEqual(best.blockers, ["market_shipping_checkout_unverified"]);
  assert.deepEqual(best.secondaryBlockers, ["variant_stock_unverified"]);
  assert.equal(best.affiliateApprovalConfirmed, true);
  assert.equal(best.trackingVerified, true);
  assert.equal(best.currentOpportunityScore, 39);
  assert.equal(best.currentStandaloneUnlockWeight, 0);
  assert.equal(best.currentAffectedWeight, 15);
});

test("system verification work is fail-closed and never mixes user-owned approval tasks into the queue", async () => {
  const report = JSON.parse(await readFile(new URL("../data/commercial-opportunity-report.json", import.meta.url), "utf8"));
  const actions = buildCurrentCommercialSystemVerificationQueue(report.markets);

  assert.ok(actions.length > 0);
  assert.ok(actions.every((action) => action.owner === "system"));
  assert.ok(actions.every((action) => action.publishEligible === false));
  assert.ok(actions.every((action) => action.verificationPolicy === "fail_closed_until_market_and_stock_evidence"));
  assert.equal(actions.some(({ merchant }) => merchant === "solaris_store"), false);
  assert.equal(actions.some(({ merchant }) => merchant === "xdatou"), false);
  assert.equal(actions.some(({ merchant }) => merchant === "butler_technik"), false);
});

test("system queue follows current opportunities and drops resolved categories", () => {
  const actions = buildCurrentCommercialSystemVerificationQueue([
    { market: "pt-PT", opportunities: [{ category: "dc_charger", priority: "P1", score: 4, affectedWeight: 0, standaloneUnlockWeight: 0 }] },
    { market: "ro-RO", opportunities: [] },
    { market: "sl-SI", opportunities: [] },
  ]);

  assert.equal(actions.length, 1);
  assert.equal(actions[0].nextAction, "verify_pt_ro_si_checkout");
  assert.deepEqual(actions[0].activeMarkets, ["pt-PT"]);
  assert.equal(actions[0].bestPriority, "P1");
  assert.equal(actions[0].currentOpportunityScore, 4);
});
