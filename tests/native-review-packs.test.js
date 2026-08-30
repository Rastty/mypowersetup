import test from "node:test";
import assert from "node:assert/strict";
import { EXPANSION_NATIVE_REVIEW_PACKS, createNativeReviewChecklist } from "../src/native-review-packs.js";
import { assessExpansionReleaseReadiness, requireExpansionReleaseReadiness } from "../src/expansion-release-readiness.js";

test("language review packs cover all expansion markets", () => {
  assert.deepEqual(Object.keys(EXPANSION_NATIVE_REVIEW_PACKS).sort(), ["pt", "ro", "si"]);
  for (const pack of Object.values(EXPANSION_NATIVE_REVIEW_PACKS)) {
    assert.ok(pack.calculatorRoute.startsWith("/"));
    assert.equal(pack.trustRoutes.length, 4);
    assert.ok(pack.reviewItems.length >= 7);
  }
});

test("review checklist fails closed on incomplete or anonymous review", () => {
  const incomplete = createNativeReviewChecklist("pt", { reviewerType: "ai_editorial_review" });
  assert.equal(incomplete.approved, false);
  assert.ok(incomplete.blockers.includes("reviewer"));
  assert.ok(incomplete.blockers.includes("guidesReviewed"));
});

test("review checklist accepts explicit complete AI editorial evidence without claiming native speaker", () => {
  const complete = createNativeReviewChecklist("ro", {
    nativeSpeaker: false,
    reviewerType: "ai_editorial_review",
    reviewer: "AI editorial language review",
    reviewedAt: "2026-08-30",
    calculatorReviewed: true,
    guidesReviewed: true,
    trustReviewed: true,
    terminologyReviewed: true,
    blockingIssuesResolved: true,
  });
  assert.equal(complete.approved, true);
  assert.equal(complete.evidence.nativeSpeaker, false);
  assert.equal(complete.evidence.aiEditorialReview, true);
  assert.deepEqual(complete.blockers, []);
});

test("recorded AI editorial reviews open the shared release gate", () => {
  const report = assessExpansionReleaseReadiness();
  assert.equal(report.ready, true);
  assert.deepEqual(report.blockers, []);
  assert.equal(requireExpansionReleaseReadiness().ready, true);
});

test("explicit override can still fail closed for any market", () => {
  assert.equal(assessExpansionReleaseReadiness({ pt: true, si: true, ro: false }).ready, false);
  assert.equal(requireExpansionReleaseReadiness({ pt: true, si: true, ro: true }).ready, true);
});
