import test from "node:test";
import assert from "node:assert/strict";
import { assessRomaniaPublication, requireRomaniaPublication } from "../src/publication-evidence-ro.js";

test("Romania records researched foundation but remains private", () => {
  const report = assessRomaniaPublication();
  assert.equal(report.publicationReady, false);
  assert.equal(report.checks.privateSeed, true);
  assert.equal(report.checks.localizedCalculator, true);
  assert.equal(report.checks.localIntentResearch, true);
  assert.equal(report.checks.analyticsParity, true);
  assert.deepEqual(report.blockers, ["contentCluster", "affiliateValidation", "mobile390x844", "nativeLanguageReview"]);
});

test("Romania cannot publish without every remaining explicit gate", () => {
  assert.throws(() => requireRomaniaPublication({ contentCluster: true, affiliateValidation: true, mobile390x844: true }), /nativeLanguageReview/);
  const report = requireRomaniaPublication({ contentCluster: true, affiliateValidation: true, mobile390x844: true, nativeLanguageReview: true });
  assert.equal(report.publicationReady, true);
});
