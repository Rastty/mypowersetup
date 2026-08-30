import test from "node:test";
import assert from "node:assert/strict";
import { assessExpansionNativeApproval } from "../src/expansion-publication.js";

const COMPLETE = Object.freeze({
  nativeLanguageReview: true,
  publicPublicationApproved: true,
  nativeSpeaker: true,
  reviewer: "Native reviewer",
  reviewedAt: "2026-08-30",
  calculatorReviewed: true,
  guidesReviewed: true,
  trustReviewed: true,
  terminologyReviewed: true,
  blockingIssuesResolved: true,
});

test("native approval assessment exposes exact blockers without throwing", () => {
  const report = assessExpansionNativeApproval("pt", {
    nativeLanguageReview: false,
    publicPublicationApproved: false,
    nativeSpeaker: false,
  });
  assert.equal(report.ready, false);
  assert.ok(report.blockers.includes("nativeLanguageReview"));
  assert.ok(report.blockers.includes("publicPublicationApproved"));
  assert.ok(report.blockers.includes("nativeSpeaker"));
  assert.ok(report.blockers.includes("reviewer"));
  assert.ok(report.blockers.includes("reviewedAt"));
  assert.equal(report.checklist.approved, false);
});

test("native approval assessment is ready only for complete evidence", () => {
  for (const market of ["pt", "si", "ro"]) {
    const report = assessExpansionNativeApproval(market, COMPLETE);
    assert.equal(report.ready, true);
    assert.deepEqual(report.blockers, []);
    assert.equal(report.checklist.approved, true);
  }
});
