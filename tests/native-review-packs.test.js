import test from "node:test";
import assert from "node:assert/strict";
import { EXPANSION_NATIVE_REVIEW_PACKS, createNativeReviewChecklist } from "../src/native-review-packs.js";
import { assessExpansionReleaseReadiness, requireExpansionReleaseReadiness } from "../src/expansion-release-readiness.js";

test("native review packs cover all blocked expansion markets", () => {
  assert.deepEqual(Object.keys(EXPANSION_NATIVE_REVIEW_PACKS).sort(), ["pt", "ro", "si"]);
  for (const pack of Object.values(EXPANSION_NATIVE_REVIEW_PACKS)) {
    assert.ok(pack.calculatorRoute.startsWith("/"));
    assert.equal(pack.trustRoutes.length, 4);
    assert.ok(pack.reviewItems.length >= 7);
  }
});

test("review checklist fails closed on incomplete or anonymous review", () => {
  const incomplete = createNativeReviewChecklist("pt", { nativeSpeaker: true });
  assert.equal(incomplete.approved, false);
  assert.ok(incomplete.blockers.includes("reviewer"));
  assert.ok(incomplete.blockers.includes("guidesReviewed"));
});

test("review checklist approves only explicit complete evidence", () => {
  const complete = createNativeReviewChecklist("ro", {
    nativeSpeaker: true,
    reviewer: "Native reviewer",
    reviewedAt: "2026-08-29",
    calculatorReviewed: true,
    guidesReviewed: true,
    trustReviewed: true,
    terminologyReviewed: true,
    blockingIssuesResolved: true,
  });
  assert.equal(complete.approved, true);
  assert.deepEqual(complete.blockers, []);
});

test("expansion release stays blocked by recorded native review evidence", () => {
  const report = assessExpansionReleaseReadiness();
  assert.equal(report.ready, false);
  assert.deepEqual(report.blockers.sort(), ["pt:nativeLanguageReview", "ro:nativeLanguageReview", "si:nativeLanguageReview"]);
  assert.throws(() => requireExpansionReleaseReadiness(), /EXPANSION_RELEASE_BLOCKED/);
});

test("all three explicit native approvals are required to open the shared release gate", () => {
  assert.equal(assessExpansionReleaseReadiness({ pt: true, si: true, ro: false }).ready, false);
  assert.equal(requireExpansionReleaseReadiness({ pt: true, si: true, ro: true }).ready, true);
});
