import test from "node:test";
import assert from "node:assert/strict";
import { assessRomaniaPublication, requireRomaniaPublication, RO_AFFILIATE_EVIDENCE, RO_MOBILE_EVIDENCE } from "../src/publication-evidence-ro.js";

test("Romania stays blocked only on native-language review", () => {
  const report = assessRomaniaPublication();
  assert.equal(report.publicationReady, false);
  for (const key of ["privateSeed","localizedCalculator","localIntentResearch","contentCluster","affiliateValidation","mobile390x844","analyticsParity"]) assert.equal(report.checks[key], true, key);
  assert.deepEqual(report.blockers, ["nativeLanguageReview"]);
  assert.equal(RO_AFFILIATE_EVIDENCE.awinMerchantId, 38934);
  assert.equal(RO_AFFILIATE_EVIDENCE.exactProductDestination, true);
  assert.equal(RO_AFFILIATE_EVIDENCE.romaniaShippingEligible, true);
  assert.equal(RO_MOBILE_EVIDENCE.chromeCdpSmoke, true);
  assert.equal(RO_MOBILE_EVIDENCE.githubActionsRun, 33263516067);
});

test("Romania publication still requires explicit native-language review", () => {
  assert.throws(() => requireRomaniaPublication(), /nativeLanguageReview/);
  const report = requireRomaniaPublication({ nativeLanguageReview: true });
  assert.equal(report.publicationReady, true);
});
