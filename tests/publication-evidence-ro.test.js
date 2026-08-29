import test from "node:test";
import assert from "node:assert/strict";
import { assessRomaniaPublication, requireRomaniaPublication, RO_AFFILIATE_EVIDENCE } from "../src/publication-evidence-ro.js";

test("Romania stays blocked only on mobile and native-language evidence", () => {
  const report = assessRomaniaPublication();
  assert.equal(report.publicationReady, false);
  assert.equal(report.checks.privateSeed, true);
  assert.equal(report.checks.localizedCalculator, true);
  assert.equal(report.checks.localIntentResearch, true);
  assert.equal(report.checks.contentCluster, true);
  assert.equal(report.checks.affiliateValidation, true);
  assert.equal(report.checks.analyticsParity, true);
  assert.deepEqual(report.blockers, ["mobile390x844", "nativeLanguageReview"]);
  assert.equal(RO_AFFILIATE_EVIDENCE.awinMerchantId, 38934);
  assert.equal(RO_AFFILIATE_EVIDENCE.exactProductDestination, true);
  assert.equal(RO_AFFILIATE_EVIDENCE.romaniaShippingEligible, true);
});

test("mobile evidence alone cannot publish Romania without native review", () => {
  assert.throws(() => requireRomaniaPublication({ mobile390x844: true }), /nativeLanguageReview/);
  const report = requireRomaniaPublication({ mobile390x844: true, nativeLanguageReview: true });
  assert.equal(report.publicationReady, true);
});
