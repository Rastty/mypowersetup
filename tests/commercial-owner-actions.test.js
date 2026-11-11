import test from "node:test";
import assert from "node:assert/strict";

import { readFile } from "node:fs/promises";
import {
  bestCommercialOwnerAction,
  bestCurrentCommercialOwnerAction,
  buildCommercialOwnerActionQueue,
  buildCurrentCommercialOwnerActionQueue,
  isFreshCommercialStockEvidence, OWNER_STOCK_EVIDENCE_DAYS,
} from "../src/commercial-owner-actions.js";

test("owner action queue deduplicates shared merchant actions and ranks the most actionable unlock first", () => {
  const actions = buildCommercialOwnerActionQueue();
  assert.equal(actions.length, 4);
  assert.deepEqual(actions.map(({ merchant }) => merchant), [
    "bluetti_eu",
    "solaris_store",
    "butler_technik",
    "xdatou",
  ]);

  const best = bestCommercialOwnerAction();
  assert.equal(best.merchant, "bluetti_eu");
  assert.equal(best.nextAction, "provide_exact_cj_elite300_deeplink");
  assert.equal(best.maxStandaloneUnlockWeight, 5);
  assert.deepEqual(best.shippingVerifiedMarkets, ["pt-PT", "ro-RO"]);
  assert.deepEqual(best.categories, ["power_station"]);
  assert.equal(best.candidateCount, 1);
  assert.equal(best.applicationPacketPath, "docs/affiliate/bluetti-elite300-eu-activation.md");
});

test("one Solaris ambassador action aggregates three exact products across inverter and controller gaps", () => {
  const action = buildCommercialOwnerActionQueue().find(({ merchant }) => merchant === "solaris_store");
  assert.ok(action);
  assert.equal(action.nextAction, "submit_ambassador_application");
  assert.equal(action.applicationUrl, "https://www.solaris-store.com/contact?id=partenariat-ambassadeur");
  assert.equal(action.applicationPacketPath, "docs/affiliate/solaris-ambassador-application.md");
  assert.deepEqual(action.candidateIds, [
    "solaris-victron-phoenix-12-250",
    "solaris-victron-phoenix-24-250",
    "solaris-victron-smartsolar-150-60-tr",
  ]);
  assert.deepEqual(action.categories, ["controller", "inverter"]);
  assert.deepEqual(action.markets, ["pt-PT", "ro-RO", "sl-SI"]);
  assert.deepEqual(action.shippingVerifiedMarkets, []);
  assert.deepEqual(action.activationFieldsNeeded, [
    "approvalConfirmed",
    "approvalSource",
    "products.*.exactAffiliateUrl",
    "products.*.trackingVerifiedAt",
  ]);
  assert.equal(action.maxStandaloneUnlockWeight, 5);
  assert.equal(action.maxAffectedWeight, 5);
  assert.equal(action.candidateCount, 3);
  assert.equal(action.categoryCount, 2);
  assert.equal(action.inStockCandidates, 0, "Sep price/dispatch snapshots cannot establish November stock");
  assert.equal(action.listedAvailableCandidates, 3);
  assert.equal(action.staleStockEvidenceCandidates, 3);
  assert.equal(action.stockEvidenceMaxAgeDays, 14);
});

test("Butler Awin action groups controller and DC-DC under one programme join", () => {
  const action = buildCommercialOwnerActionQueue().find(({ merchant }) => merchant === "butler_technik");
  assert.ok(action);
  assert.equal(action.nextAction, "join_awin_program_31291");
  assert.equal(action.applicationUrl, "https://ui.awin.com/merchant-profile/31291");
  assert.equal(action.applicationPacketPath, "docs/affiliate/butler-awin-application.md");
  assert.deepEqual(action.candidateIds, [
    "butler-victron-orion-xs-12-12-50",
    "butler-victron-scc125060321",
  ]);
  assert.deepEqual(action.categories, ["controller", "dc_charger"]);
  assert.deepEqual(action.shippingVerifiedMarkets, ["hu-HU", "pl-PL", "pt-PT", "ro-RO", "sk-SK", "sl-SI"]);
  assert.deepEqual(action.activationFieldsNeeded, ["approvalConfirmed", "approvalSource", "trackingVerifiedAt"]);
  assert.equal(action.maxStandaloneUnlockWeight, 0);
  assert.equal(action.maxAffectedWeight, 5);
  assert.equal(action.inStockCandidates, 0);
  assert.equal(action.listedAvailableCandidates, 2);
  assert.equal(action.staleStockEvidenceCandidates, 2);
});

test("Xdatou stays a separate approval action with explicit activation fields", () => {
  const action = buildCommercialOwnerActionQueue().find(({ merchant }) => merchant === "xdatou");
  assert.ok(action);
  assert.equal(action.nextAction, "submit_goaffpro_application");
  assert.equal(action.applicationUrl, "https://eu.xdatou.com/pages/affiliate-program");
  assert.equal(action.applicationPacketPath, "docs/affiliate/xdatou-goaffpro-application.md");
  assert.deepEqual(action.activationFieldsNeeded, [
    "approvalConfirmed",
    "approvalSource",
    "referralCode",
    "referralIdentifier",
    "trackingVerifiedAt",
  ]);
  assert.deepEqual(action.shippingVerifiedMarkets, ["pt-PT", "ro-RO", "sl-SI"]);
  assert.equal(action.maxStandaloneUnlockWeight, 0);
  assert.equal(action.maxAffectedWeight, 5);
});

test("system-owned and zero-impact work never appears in the owner queue", () => {
  const actions = buildCommercialOwnerActionQueue();
  assert.equal(actions.some(({ merchant }) => merchant === "ampul_eu"), false);
  assert.equal(actions.some(({ candidateIds }) => candidateIds.includes("butler-victron-orion-xs-12-12-50") && candidateIds.length === 1), false);
  assert.ok(actions.every((action) => action.maxStandaloneUnlockWeight > 0 || action.maxAffectedWeight > 0));
  assert.equal(new Set(actions.map(({ actionKey }) => actionKey)).size, actions.length);
});

test("current owner queue follows live commercial gaps instead of stale candidate weights", async () => {
  const report = JSON.parse(await readFile(new URL("../data/commercial-opportunity-report.json", import.meta.url), "utf8"));
  const actions = buildCurrentCommercialOwnerActionQueue(report.markets);

  assert.deepEqual(actions.map(({ merchant }) => merchant), [
    "solaris_store",
    "xdatou",
    "butler_technik",
  ]);
  assert.equal(actions.some(({ merchant }) => merchant === "bluetti_eu"), false);

  const best = bestCurrentCommercialOwnerAction(report.markets);
  assert.equal(best.merchant, "solaris_store");
  assert.equal(best.nextAction, "submit_ambassador_application");
  assert.equal(best.currentStandaloneUnlockWeight, 15);
  assert.equal(best.currentAffectedWeight, 21);
  assert.equal(best.currentOpportunityScore, 45);
  assert.deepEqual(best.activeMarkets, ["pt-PT", "ro-RO", "sl-SI"]);
  assert.deepEqual(best.activeCategories, ["controller", "inverter"]);

  const xdatou = actions.find(({ merchant }) => merchant === "xdatou");
  assert.equal(xdatou.currentStandaloneUnlockWeight, 0);
  assert.equal(xdatou.currentAffectedWeight, 15);
  assert.equal(xdatou.currentOpportunityScore, 39);
  assert.deepEqual(xdatou.activationFieldsNeeded, [
    "approvalConfirmed",
    "approvalSource",
    "referralCode",
    "referralIdentifier",
    "trackingVerifiedAt",
  ]);

  const butler = actions.find(({ merchant }) => merchant === "butler_technik");
  assert.equal(butler.currentStandaloneUnlockWeight, 0);
  // The live report can gain a new country/category opportunity (e.g. HU
  // controller on 2026-10-28). Verify actual report-derived impacts rather
  // than freezing an older 3-market weight of 6 in the test suite.
  const eligibleMarkets = new Set(["hu-HU", "pt-PT", "ro-RO", "sl-SI"]);
  const expectedController = report.markets
    .filter(({ market }) => eligibleMarkets.has(market))
    .map(({ opportunities }) => opportunities.find(({ category }) => category === "controller"))
    .filter(Boolean);
  assert.equal(butler.currentAffectedWeight,
    expectedController.reduce((sum, opportunity) => sum + Math.min(5, opportunity.affectedWeight || 0), 0));
  const expectedDcScore = report.markets
    .filter(({ market }) => ["pt-PT", "ro-RO", "sl-SI"].includes(market))
    .reduce((sum, { opportunities }) => sum + (opportunities.find(({ category }) => category === "dc_charger")?.score || 0), 0);
  assert.equal(butler.currentOpportunityScore,
    expectedController.reduce((sum, opportunity) => sum + opportunity.score, 0) + expectedDcScore);
  assert.deepEqual(butler.activationFieldsNeeded, ["approvalConfirmed", "approvalSource", "trackingVerifiedAt"]);
});

test("committed owner-action artifact is dynamic schema v2 and points at the current top action", async () => {
  const payload = JSON.parse(await readFile(new URL("../data/owner-action-queue.json", import.meta.url), "utf8"));
  assert.equal(payload.schemaVersion, 2);
  assert.equal(payload.actionCount, 3);
  assert.equal(payload.topAction.merchant, "solaris_store");
  assert.deepEqual(payload.actions.map(({ merchant }) => merchant), ["solaris_store", "xdatou", "butler_technik"]);
  assert.ok(payload.actions.every((action) => action.currentOpportunityScore > 0));
});

test("commercial stock proof is a real UTC date, not an old or malformed availability claim", () => {
  assert.equal(OWNER_STOCK_EVIDENCE_DAYS, 14);
  const candidate = { stockStatus: "in_stock", stockVerifiedAt: "2026-09-22" };
  assert.equal(isFreshCommercialStockEvidence(candidate, "2026-09-22T12:00:00Z"), true);
  assert.equal(isFreshCommercialStockEvidence(candidate, "2026-10-06T00:00:00Z"), true);
  assert.equal(isFreshCommercialStockEvidence(candidate, "2026-10-06T00:00:01Z"), false);
  assert.equal(isFreshCommercialStockEvidence(candidate, "2026-11-11T08:00:41Z"), false);
  assert.equal(isFreshCommercialStockEvidence(candidate, "2026-09-21T23:59:00Z"), false, "future observations invalid");
  assert.equal(isFreshCommercialStockEvidence({ ...candidate, stockStatus: "backorder" }, "2026-09-23T00:00:00Z"), false);
  assert.equal(isFreshCommercialStockEvidence({ ...candidate, stockStatus: "dispatch_1_2_days" }, "2026-09-23T00:00:00Z"), true);
  for (const date of ["2026-02-30", "2026-09-31", "2026-9-22", "not-a-day", null, "9999-12-31"]) {
    assert.equal(isFreshCommercialStockEvidence({ ...candidate, stockVerifiedAt: date }, "2026-11-11T08:00:41Z"), false, String(date));
  }
  assert.throws(() => buildCommercialOwnerActionQueue({ asOf: "bad-date" }), /OWNER_STOCK_AS_OF_INVALID/);
});

test("owner stock queue distinguishes historical claims from genuinely recent supply observations", () => {
  // The sourcing queue is seeded from Sep 7 per-candidate observations.
  // A separate Solaris activation artifact was refreshed Sep 22, but it is
  // NOT the input to this owner queue and must not be silently substituted.
  const fresh = buildCommercialOwnerActionQueue({ asOf: "2026-09-10T10:00:00Z" });
  const solaris = fresh.find(item => item.merchant === "solaris_store");
  assert.equal(solaris.inStockCandidates, 3, "Sep 7 candidate observations were still fresh Sep 10");
  assert.equal(solaris.listedAvailableCandidates, 3);
  assert.equal(solaris.staleStockEvidenceCandidates, 0);
  const november = buildCommercialOwnerActionQueue({ asOf: "2026-11-11T08:00:41.741Z" });
  assert.deepEqual(november.map(item => item.inStockCandidates), [0, 0, 0, 0]);
  assert.deepEqual(november.map(item => item.listedAvailableCandidates), [1, 3, 2, 1]);
  assert.ok(november.every(item => item.staleStockEvidenceCandidates === item.listedAvailableCandidates));
  assert.ok(november.every(item => item.stockEvidenceAsOf === "2026-11-11T08:00:41.741Z"));
});

test("committed owner queue stock evidence is anchored to the same opportunity snapshot", async () => {
  const report = JSON.parse(await readFile(new URL("../data/commercial-opportunity-report.json", import.meta.url), "utf8"));
  const artifact = JSON.parse(await readFile(new URL("../data/owner-action-queue.json", import.meta.url), "utf8"));
  const expected = buildCurrentCommercialOwnerActionQueue(report.markets, { asOf: report.generatedAt });
  assert.deepEqual(artifact.actions, expected);
  assert.equal(artifact.topAction.stockEvidenceAsOf, report.generatedAt);
  assert.equal(artifact.topAction.listedAvailableCandidates, 3);
  assert.equal(artifact.topAction.inStockCandidates, 0);
});
