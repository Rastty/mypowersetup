import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  bestCurrentCommercialSystemVerification,
  buildCurrentCommercialSystemVerificationQueue,
} from "../src/commercial-system-verification-actions.js";

async function liveInputs() {
  const [report, ampulMarketVerification, ampulSourceCatalog] = await Promise.all([
    readFile(new URL("../data/commercial-opportunity-report.json", import.meta.url), "utf8").then(JSON.parse),
    readFile(new URL("../data/ampul-expansion-market-verification.json", import.meta.url), "utf8").then(JSON.parse),
    readFile(new URL("../data/products-ampul-cz.json", import.meta.url), "utf8").then(JSON.parse),
  ]);
  return { report, ampulMarketVerification, ampulSourceCatalog };
}

function verifiedRecord(suffix) {
  return {
    verified: true,
    evidenceUrl: `https://evidence.example/${suffix}`,
    verifiedAt: "2026-09-16",
  };
}

test("system verification queue surfaces AMPUL P0 inverter verification ahead of secondary DC-DC work", async () => {
  const { report, ampulMarketVerification, ampulSourceCatalog } = await liveInputs();
  const options = { ampulMarketVerification, ampulSourceCatalog };
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

test("exact AMPUL feed stock distinguishes unknown inverter stock from available DC-DC stock", async () => {
  const { report, ampulMarketVerification, ampulSourceCatalog } = await liveInputs();
  const actions = buildCurrentCommercialSystemVerificationQueue(report.markets, {
    ampulMarketVerification,
    ampulSourceCatalog,
  });

  const inverter = actions.find(({ candidateIds }) => candidateIds.includes("ampul-eu-inverter-24v-2000w"));
  assert.equal(inverter.sourceStock.length, 1);
  assert.deepEqual(inverter.sourceStock[0], {
    candidateId: "ampul-eu-inverter-24v-2000w",
    sourceProductId: "ampul_cz:5577-7392",
    generatedAt: ampulSourceCatalog.generatedAt,
    sourceHealthy: true,
    found: true,
    available: null,
    state: "unknown",
    stockVerified: false,
    productUrl: "https://ampul.eu/cs/menice-napeti/5577-7392-menic-napeti-z-dc-na-230v-ac-50hz-2000w",
    priceCzk: 8398,
    priceCurrency: "CZK",
  });
  assert.equal(inverter.publishEligible, false);
  assert.deepEqual(inverter.secondaryBlockers, ["variant_stock_unverified"]);

  const dcdc = actions.find(({ candidateIds }) => candidateIds.includes("ampul-eu-dcdc-12v-30a"));
  assert.equal(dcdc.sourceStock.length, 1);
  assert.equal(dcdc.sourceStock[0].sourceProductId, "ampul_cz:6195");
  assert.equal(dcdc.sourceStock[0].available, true);
  assert.equal(dcdc.sourceStock[0].state, "available");
  assert.equal(dcdc.sourceStock[0].stockVerified, true);
  assert.equal(dcdc.publishEligible, false);
});

test("stock states are fail-closed for false, null, missing and unhealthy source data", async () => {
  const { report, ampulMarketVerification, ampulSourceCatalog } = await liveInputs();
  const cases = [
    [false, "unavailable"],
    [null, "unknown"],
  ];

  for (const [available, expectedState] of cases) {
    const catalog = structuredClone(ampulSourceCatalog);
    catalog.products.find(({ id }) => id === "ampul_cz:5577-7392").available = available;
    const best = bestCurrentCommercialSystemVerification(report.markets, {
      ampulMarketVerification,
      ampulSourceCatalog: catalog,
    });
    assert.equal(best.sourceStock[0].state, expectedState);
    assert.equal(best.sourceStock[0].stockVerified, false);
    assert.equal(best.publishEligible, false);
  }

  const missing = structuredClone(ampulSourceCatalog);
  missing.products = missing.products.filter(({ id }) => id !== "ampul_cz:5577-7392");
  let best = bestCurrentCommercialSystemVerification(report.markets, {
    ampulMarketVerification,
    ampulSourceCatalog: missing,
  });
  assert.equal(best.sourceStock[0].state, "missing");
  assert.equal(best.sourceStock[0].stockVerified, false);

  const unhealthy = structuredClone(ampulSourceCatalog);
  unhealthy.sources.ampul_cz.status = "stale";
  best = bestCurrentCommercialSystemVerification(report.markets, {
    ampulMarketVerification,
    ampulSourceCatalog: unhealthy,
  });
  assert.equal(best.sourceStock[0].state, "source_unhealthy");
  assert.equal(best.sourceStock[0].stockVerified, false);
});

test("available exact stock does not bypass unresolved PT RO SI checkout", async () => {
  const { report, ampulMarketVerification, ampulSourceCatalog } = await liveInputs();
  const catalog = structuredClone(ampulSourceCatalog);
  catalog.products.find(({ id }) => id === "ampul_cz:5577-7392").available = true;

  const best = bestCurrentCommercialSystemVerification(report.markets, {
    ampulMarketVerification,
    ampulSourceCatalog: catalog,
  });
  assert.equal(best.sourceStock[0].state, "available");
  assert.equal(best.sourceStock[0].stockVerified, true);
  assert.deepEqual(best.marketVerification[0].verifiedMarkets, []);
  assert.deepEqual(best.marketVerification[0].unverifiedMarkets, ["pt-PT", "ro-RO", "sl-SI"]);
  assert.equal(best.publishEligible, false);
  assert.deepEqual(best.blockers, ["market_shipping_checkout_unverified"]);
});

test("authoritative AMPUL market state exposes all current PT RO SI checkouts as unresolved", async () => {
  const { report, ampulMarketVerification, ampulSourceCatalog } = await liveInputs();
  const best = bestCurrentCommercialSystemVerification(report.markets, { ampulMarketVerification, ampulSourceCatalog });

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
  const { report, ampulMarketVerification, ampulSourceCatalog } = await liveInputs();
  const synthetic = structuredClone(ampulMarketVerification);
  synthetic.products["ampul-eu-inverter-24v-2000w"].markets.pt = verifiedRecord("inverter-pt");

  const best = bestCurrentCommercialSystemVerification(report.markets, {
    ampulMarketVerification: synthetic,
    ampulSourceCatalog,
  });
  const marketState = best.marketVerification[0];
  assert.deepEqual(marketState.verifiedMarkets, ["pt-PT"]);
  assert.deepEqual(marketState.unverifiedMarkets, ["ro-RO", "sl-SI"]);
  assert.equal(marketState.markets[0].evidenceUrl, "https://evidence.example/inverter-pt");
  assert.equal(marketState.markets[0].verifiedAt, "2026-09-16");
  assert.equal(best.publishEligible, false);
  assert.deepEqual(best.secondaryBlockers, ["variant_stock_unverified"]);
});

test("verified=true without complete evidence remains fail-closed", async () => {
  const { report, ampulMarketVerification, ampulSourceCatalog } = await liveInputs();
  const synthetic = structuredClone(ampulMarketVerification);
  synthetic.products["ampul-eu-inverter-24v-2000w"].markets.ro = {
    verified: true,
    evidenceUrl: null,
    verifiedAt: "2026-09-16",
  };

  const best = bestCurrentCommercialSystemVerification(report.markets, {
    ampulMarketVerification: synthetic,
    ampulSourceCatalog,
  });
  const ro = best.marketVerification[0].markets.find(({ market }) => market === "ro-RO");
  assert.equal(ro.verified, false);
  assert.equal(ro.state, "invalid_evidence");
  assert.equal(ro.evidenceUrl, null);
  assert.equal(best.publishEligible, false);
});

test("partial public evidence reduces ambiguity without clearing market or exact-variant blockers", async () => {
  const { report, ampulMarketVerification, ampulSourceCatalog } = await liveInputs();
  const best = bestCurrentCommercialSystemVerification(report.markets, { ampulMarketVerification, ampulSourceCatalog });

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

test("exact AMPUL DC-DC public stock evidence does not clear destination checkout blockers", async () => {
  const { report, ampulMarketVerification, ampulSourceCatalog } = await liveInputs();
  const actions = buildCurrentCommercialSystemVerificationQueue(report.markets, { ampulMarketVerification, ampulSourceCatalog });
  const dcdc = actions.find(({ candidateIds }) => candidateIds.includes("ampul-eu-dcdc-12v-30a"));

  assert.ok(dcdc);
  assert.equal(dcdc.verificationEvidence.length, 1);
  const evidence = dcdc.verificationEvidence[0];
  assert.equal(evidence.candidateId, "ampul-eu-dcdc-12v-30a");
  assert.equal(evidence.checkedAt, "2026-09-16");
  assert.equal(evidence.evidenceType, "public_catalog_partial");
  assert.equal(evidence.publicStockScope, "exact_product");
  assert.equal(evidence.publicStockStatus, "in_stock_at_supplier");
  assert.equal(evidence.catalogSpecs.chargingCurrentA, 30);
  assert.equal(evidence.catalogSpecs.powerW, 400);
  assert.equal(evidence.catalogSpecs.ipRating, "IP68");
  assert.ok(evidence.verifiedChecks.includes("exact_product_stock_at_supplier"));
  assert.deepEqual(evidence.genericShippingEvidence.targetMarketsVerified, []);
  assert.deepEqual(evidence.unresolvedChecks, ["pt-PT_checkout", "ro-RO_checkout", "sl-SI_checkout"]);
  assert.deepEqual(dcdc.marketVerification[0].verifiedMarkets, []);
  assert.deepEqual(dcdc.marketVerification[0].unverifiedMarkets, ["pt-PT", "ro-RO", "sl-SI"]);
  assert.equal(dcdc.publishEligible, false);
});

test("system verification work is fail-closed and never mixes user-owned approval tasks into the queue", async () => {
  const { report, ampulMarketVerification, ampulSourceCatalog } = await liveInputs();
  const actions = buildCurrentCommercialSystemVerificationQueue(report.markets, { ampulMarketVerification, ampulSourceCatalog });

  assert.ok(actions.length > 0);
  assert.ok(actions.every((action) => action.owner === "system"));
  assert.ok(actions.every((action) => action.publishEligible === false));
  assert.ok(actions.every((action) => action.verificationPolicy === "fail_closed_until_market_and_stock_evidence"));
  assert.equal(actions.some(({ merchant }) => merchant === "solaris_store"), false);
  assert.equal(actions.some(({ merchant }) => merchant === "xdatou"), false);
  assert.equal(actions.some(({ merchant }) => merchant === "butler_technik"), false);
});

test("system queue follows current opportunities and drops resolved categories", async () => {
  const { ampulMarketVerification, ampulSourceCatalog } = await liveInputs();
  const actions = buildCurrentCommercialSystemVerificationQueue([
    { market: "pt-PT", opportunities: [{ category: "dc_charger", priority: "P1", score: 4, affectedWeight: 0, standaloneUnlockWeight: 0 }] },
    { market: "ro-RO", opportunities: [] },
    { market: "sl-SI", opportunities: [] },
  ], { ampulMarketVerification, ampulSourceCatalog });

  assert.equal(actions.length, 1);
  assert.equal(actions[0].nextAction, "verify_pt_ro_si_checkout");
  assert.deepEqual(actions[0].activeMarkets, ["pt-PT"]);
  assert.equal(actions[0].bestPriority, "P1");
  assert.equal(actions[0].currentOpportunityScore, 4);
  assert.equal(actions[0].verificationEvidence.length, 1);
  assert.equal(actions[0].verificationEvidence[0].candidateId, "ampul-eu-dcdc-12v-30a");
  assert.deepEqual(actions[0].verificationEvidence[0].unresolvedChecks, ["pt-PT_checkout", "ro-RO_checkout", "sl-SI_checkout"]);
  assert.deepEqual(actions[0].marketVerification[0].unverifiedMarkets, ["pt-PT", "ro-RO", "sl-SI"]);
  assert.equal(actions[0].sourceStock[0].state, "available");
  assert.equal(actions[0].publishEligible, false);
});
