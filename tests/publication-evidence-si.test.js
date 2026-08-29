import test from "node:test";
import assert from "node:assert/strict";
import { assessSloveniaPublication, requireSloveniaPublication, SI_AFFILIATE_EVIDENCE, SI_MOBILE_EVIDENCE } from "../src/publication-evidence-si.js";

test("Slovenia stays blocked only on native-language review", () => {
  const report = assessSloveniaPublication();
  assert.equal(report.publicationReady, false);
  assert.equal(report.checks.privateSeed, true);
  assert.equal(report.checks.localizedCalculator, true);
  assert.equal(report.checks.localIntentResearch, true);
  assert.equal(report.checks.contentCluster, true);
  assert.equal(report.checks.affiliateValidation, true);
  assert.equal(report.checks.mobile390x844, true);
  assert.equal(report.checks.analyticsParity, true);
  assert.deepEqual(report.blockers, ["nativeLanguageReview"]);
  assert.equal(SI_AFFILIATE_EVIDENCE.awinMerchantId, 38934);
  assert.equal(SI_AFFILIATE_EVIDENCE.exactProductDestination, true);
  assert.equal(SI_AFFILIATE_EVIDENCE.sloveniaShippingEligible, true);
  assert.equal(SI_MOBILE_EVIDENCE.viewport, "390x844");
  assert.equal(SI_MOBILE_EVIDENCE.workflowRun, 372);
  assert.equal(SI_MOBILE_EVIDENCE.noHorizontalOverflow, true);
});

test("Slovenia publication still cannot open without native review", () => {
  assert.throws(() => requireSloveniaPublication({ nativeLanguageReview: false }), /SI_PUBLICATION_BLOCKED:nativeLanguageReview/);
});

test("Slovenia publication opens only with explicit native-language review", () => {
  const report = requireSloveniaPublication({ nativeLanguageReview: true });
  assert.equal(report.publicationReady, true);
});
