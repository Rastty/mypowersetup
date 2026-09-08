import test from "node:test";
import assert from "node:assert/strict";

import { readFile } from "node:fs/promises";
import {
  bestCommercialOwnerAction,
  bestCurrentCommercialOwnerAction,
  buildCommercialOwnerActionQueue,
  buildCurrentCommercialOwnerActionQueue,
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
  assert.equal(action.maxStandaloneUnlockWeight, 5);
  assert.equal(action.maxAffectedWeight, 5);
  assert.equal(action.candidateCount, 3);
  assert.equal(action.categoryCount, 2);
  assert.equal(action.inStockCandidates, 3);
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
  assert.equal(action.maxStandaloneUnlockWeight, 0);
  assert.equal(action.maxAffectedWeight, 5);
  assert.equal(action.inStockCandidates, 2);
});

test("Xdatou stays a separate approval action with explicit activation fields", () => {
  const action = buildCommercialOwnerActionQueue().find(({ merchant }) => merchant === "xdatou");
  assert.ok(action);
  assert.equal(action.nextAction, "submit_goaffpro_application");
  assert.equal(action.applicationUrl, "https://eu.xdatou.com/pages/affiliate-program");
  assert.equal(action.applicationPacketPath, "docs/affiliate/xdatou-goaffpro-application.md");
  assert.deepEqual(action.activationFieldsNeeded, ["approvalConfirmed", "referralCode", "referralIdentifier"]);
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

  const butler = actions.find(({ merchant }) => merchant === "butler_technik");
  assert.equal(butler.currentStandaloneUnlockWeight, 0);
  assert.equal(butler.currentAffectedWeight, 6);
  assert.equal(butler.currentOpportunityScore, 18);
});

test("committed owner-action artifact is dynamic schema v2 and points at the current top action", async () => {
  const payload = JSON.parse(await readFile(new URL("../data/owner-action-queue.json", import.meta.url), "utf8"));
  assert.equal(payload.schemaVersion, 2);
  assert.equal(payload.actionCount, 3);
  assert.equal(payload.topAction.merchant, "solaris_store");
  assert.deepEqual(payload.actions.map(({ merchant }) => merchant), ["solaris_store", "xdatou", "butler_technik"]);
  assert.ok(payload.actions.every((action) => action.currentOpportunityScore > 0));
});
