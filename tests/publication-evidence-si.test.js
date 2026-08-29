import test from "node:test";
import assert from "node:assert/strict";
import { assessSloveniaPublication, requireSloveniaPublication, SI_AFFILIATE_EVIDENCE } from "../src/publication-evidence-si.js";

test("Slovenia stays blocked only on mobile and native-language evidence", () => {
  const report = assessSloveniaPublication();
  assert.equal(report.publicationReady, false);
  assert.equal(report.checks.privateSeed, true);
  assert.equal(report.checks.localizedCalculator, true);
  assert.equal(report.checks.localIntentResearch, true);
  assert.equal(report.checks.contentCluster, true);
  assert.equal(report.checks.affiliateValidation, true);
  assert.equal(report.checks.analyticsParity, true);
  assert.deepEqual(report.blockers, ["mobile390x844", "nativeLanguageReview"]);
  assert.equal(SI_AFFILIATE_EVIDENCE.awinMerchantId, 38934);
  assert.equal(SI_AFFILIATE_EVIDENCE.exactProductDestination, true);
  assert.equal(SI_AFFILIATE_EVIDENCE.sloveniaShippingEligible, true);
});

test("mobile evidence alone still cannot publish Slovenia", () => {
  const report = assessSloveniaPublication({ mobile390x844: true });
  assert.equal(report.publicationReady, false);
  assert.deepEqual(report.blockers, ["nativeLanguageReview"]);
});

test("Slovenia publication requires explicit native-language review", () => {
  assert.throws(() => requireSloveniaPublication({
    mobile390x844: true,
    nativeLanguageReview: false,
  }), /SI_PUBLICATION_BLOCKED:nativeLanguageReview/);

  const report = requireSloveniaPublication({
    mobile390x844: true,
    nativeLanguageReview: true,
  });
  assert.equal(report.publicationReady, true);
});
