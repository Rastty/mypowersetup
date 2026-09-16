import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  bestCurrentCommercialSystemVerification,
  buildCurrentCommercialSystemVerificationQueue,
} from "../src/commercial-system-verification-actions.js";

async function liveInputs() {
  const [report, ampulMarketVerification] = await Promise.all([
    readFile(new URL("../data/commercial-opportunity-report.json", import.meta.url), "utf8").then(JSON.parse),
    readFile(new URL("../data/ampul-expansion-market-verification.json", import.meta.url), "utf8").then(JSON.parse),
  ]);
  return { report, ampulMarketVerification };
}

function verifiedRecord(suffix) {
  return {
    verified: true,
    evidenceUrl: `https://evidence.example/${suffix}`,
    verifiedAt: "2026-09-16",
  };
}

test("system verification queue surfaces AMPUL P0 inverter verification ahead of secondary DC-DC work", async () => {
  const { report, ampulMarketVerification } = await liveInputs();
  const options = { ampulMarketVerification };
  const actions = buildCurrentCommercialSystemVerificationQueue(report.markets, options);

  assert.deepEqual(actions.map(({ nextAction }) => nextAction), [
    "verify_pt_ro_si_checkout_and_24v_variant_stock",
    "verify_pt_ro_si_checkout",
  ]);

  const best = bestCurrentCommercialSystemVerification(report.markets, options);
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

test("authoritative AMPUL market state exposes all current PT RO SI checkouts as unresolved", async () => {
  const { report, ampulMarketVerification } = await liveInputs();
  const best = bestCurrentCommercialSystemVerification(report.markets, { ampulMarketVerification });

  assert.equal(best.marketVerification.length, 1);
  const marketState = best.marketVerification[0];
  assert.equal(marketState.candidateId, "ampul-eu-inverter-24v-2000w");
  assert.deepEqual(marketState.verifiedMarkets, []);
  assert.deepEqual(marketState.unverifiedMarkets, ["pt-PT", "ro-RO", "sl-SI"]);
  assert.deepEqual(marketState.markets.map(({ market, marketCode, verified, state }) => ({ market, marketCode, verified, state })), [
    { market: "pt-PT", marketCode: "pt", verified: false, state: "unverified" },
    { market: "ro-RO", marketCode: "ro", verified: false, state: "unverified" },
    { market: "sl-SI", marketCode: "si", verified: false, state: "unverified" },
  ]);
  assert.equal(best.publishEligible, false);
});

test("one country can become verified without authorizing the whole AMPUL action", async () => {
  const { report, ampulMarketVerification } = await liveInputs();
  const synthetic = structuredClone(ampulMarketVerification);
  synthetic.products["ampul-eu-inverter-24v-2000w"].markets.pt = verifiedRecord("inverter-pt");

  const best = bestCurrentCommercialSystemVerification(report.markets, { ampulMarketVerification: synthetic });
  const marketState = best.marketVerification[0];
  assert.deepEqual(marketState.verifiedMarkets, ["pt-PT"]);
  assert.deepEqual(marketState.unverifiedMarkets, ["ro-RO", "sl-SI"]);
  assert.equal(marketState.markets[0].evidenceUrl, "https://evidence.example/inverter-pt");
  assert.equal(marketState.markets[0].verifiedAt, "2026-09-16");
  assert.equal(best.publishEligible, false);
  assert.deepEqual(best.secondaryBlockers, ["variant_stock_unverified"]);
});

test("verified=true without complete evidence remains fail-closed", async () => {
  const { report, ampulMarketVerification } = await liveInputs();
  const synthetic = structuredClone(ampulMarketVerification);
  synthetic.products["ampul-eu-inverter-24v-2000w"].markets.ro = {
    verified: true,
    evidenceUrl: null,
    verifiedAt: "2026-09-16",
  };

  const best = bestCurrentCommercialSystemVerification(report.markets, { ampulMarketVerification: synthetic });
  const ro = best.marketVerification[0].markets.find(({ market }) => market === "ro-RO");
  assert.equal(ro.verified, false);
  assert.equal(ro.state, "invalid_evidence");
  assert.equal(ro.evidenceUrl, null);
  assert.equal(best.publishEligible, false);
});

test("partial public evidence reduces ambiguity without clearing market or exact-variant blockers", async () => {
  const { report, ampulMarketVerification } = await liveInputs();
  const best = bestCurrentCommercialSystemVerification(report.markets, { ampulMarketVerification });

  assert.equal(best.verificationEvidence.length, 1);
  const evidence = best.verificationEvidence[0];
  assert.equal(evidence.candidateId, "ampul-eu-inverter-24v-2000w");
  assert.equal(evidence.checkedAt, "2026-09-16");
  assert.equal(evidence.evidenceType, "public_catalog_partial");
  assert.equal(evidence.catalogSpecs.powerW, 2000);
  assert.equal(evidence.catalogSpecs.pureSine, true);
  assert.ok(evidence.catalogSpecs.listedInputVoltagesV.includes(24));
  assert.equal(evidence.publicStockScope, "product_family");
  assert.equal(evidence.publicStockStatus, "in_stock_at_supplier");
  assert.deepEqual(evidence.genericShippingEvidence.targetMarketsVerified, []);
  assert.ok(evidence.verifiedChecks.includes("24v_variant_listed"));
  assert.ok(evidence.unresolvedChecks.includes("exact_24v_variant_stock"));
  assert.ok(evidence.unresolvedChecks.includes("pt-PT_checkout"));
  assert.ok(evidence.unresolvedChecks.includes("ro-RO_checkout"));
  assert.ok(evidence.unresolvedChecks.includes("sl-SI_checkout"));
  assert.equal(best.publishEligible, false);
  assert.deepEqual(best.blockers, ["market_shipping_checkout_unverified"]);
  assert.deepEqual(best.secondaryBlockers, ["variant_stock_unverified"]);
});

test("system verification work is fail-closed and never mixes user-owned approval tasks into the queue", async () => {
  const { report, ampulMarketVerification } = await liveInputs();
  const actions = buildCurrentCommercialSystemVerificationQueue(report.markets, { ampulMarketVerification });

  assert.ok(actions.length > 0);
  assert.ok(actions.every((action) => action.owner === "system"));
  assert.ok(actions.every((action) => action.publishEligible === false));
  assert.ok(actions.every((action) => action.verificationPolicy === "fail_closed_until_market_and_stock_evidence"));
  assert.equal(actions.some(({ merchant }) => merchant === "solaris_store"), false);
  assert.equal(actions.some(({ merchant }) => merchant === "xdatou"), false);
  assert.equal(actions.some(({ merchant }) => merchant === "butler_technik"), false);
});

test("system queue follows current opportunities and drops resolved categories", async () => {
  const { ampulMarketVerification } = await liveInputs();
  const actions = buildCurrentCommercialSystemVerificationQueue([
    { market: "pt-PT", opportunities: [{ category: "dc_charger", priority: "P1", score: 4, affectedWeight: 0, standaloneUnlockWeight: 0 }] },
    { market: "ro-RO", opportunities: [] },
    { market: "sl-SI", opportunities: [] },
  ], { ampulMarketVerification });

  assert.equal(actions.length, 1);
  assert.equal(actions[0].nextAction, "verify_pt_ro_si_checkout");
  assert.deepEqual(actions[0].activeMarkets, ["pt-PT"]);
  assert.equal(actions[0].bestPriority, "P1");
  assert.equal(actions[0].currentOpportunityScore, 4);
  assert.deepEqual(actions[0].verificationEvidence, []);
  assert.deepEqual(actions[0].marketVerification[0].unverifiedMarkets, ["pt-PT", "ro-RO", "sl-SI"]);
});
