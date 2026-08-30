import test from "node:test";
import assert from "node:assert/strict";
import { assessExpansionNativeApproval } from "../src/expansion-publication.js";

const COMPLETE = Object.freeze({
  languageEditorialReview: true,
  publicPublicationApproved: true,
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

test("language approval assessment exposes exact blockers without throwing", () => {
  const report = assessExpansionNativeApproval("pt", {
    languageEditorialReview: false,
    publicPublicationApproved: false,
    nativeSpeaker: false,
  });
  assert.equal(report.ready, false);
  assert.ok(report.blockers.includes("languageEditorialReview"));
  assert.ok(report.blockers.includes("publicPublicationApproved"));
  assert.ok(report.blockers.includes("reviewerQualification"));
  assert.ok(report.blockers.includes("reviewer"));
  assert.ok(report.blockers.includes("reviewedAt"));
  assert.equal(report.checklist.approved, false);
});

test("language approval assessment is ready for complete AI editorial evidence", () => {
  for (const market of ["pt", "si", "ro"]) {
    const report = assessExpansionNativeApproval(market, COMPLETE);
    assert.equal(report.ready, true);
    assert.deepEqual(report.blockers, []);
    assert.equal(report.checklist.approved, true);
    assert.equal(report.checklist.evidence.nativeSpeaker, false);
    assert.equal(report.checklist.evidence.aiEditorialReview, true);
  }
});
