import test from "node:test";
import assert from "node:assert/strict";
import { assessSloveniaPublication, requireSloveniaPublication } from "../src/publication-evidence-si.js";

test("Slovenia stays blocked on all unverified publication evidence", () => {
  const report = assessSloveniaPublication();
  assert.equal(report.publicationReady, false);
  assert.equal(report.checks.privateSeed, true);
  assert.equal(report.checks.localizedCalculator, true);
  assert.equal(report.checks.analyticsParity, true);
  assert.deepEqual(report.blockers, [
    "localIntentResearch",
    "contentCluster",
    "affiliateValidation",
    "mobile390x844",
    "nativeLanguageReview",
  ]);
});

test("partial Slovenia progress cannot accidentally open publication", () => {
  const report = assessSloveniaPublication({
    localIntentResearch: true,
    contentCluster: true,
    mobile390x844: true,
  });
  assert.equal(report.publicationReady, false);
  assert.deepEqual(report.blockers, ["affiliateValidation", "nativeLanguageReview"]);
});

test("Slovenia publication requires every explicit gate", () => {
  assert.throws(() => requireSloveniaPublication({
    localIntentResearch: true,
    contentCluster: true,
    affiliateValidation: true,
    mobile390x844: true,
    nativeLanguageReview: false,
  }), /SI_PUBLICATION_BLOCKED:nativeLanguageReview/);

  const report = requireSloveniaPublication({
    localIntentResearch: true,
    contentCluster: true,
    affiliateValidation: true,
    mobile390x844: true,
    nativeLanguageReview: true,
  });
  assert.equal(report.publicationReady, true);
});
