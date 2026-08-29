import test from "node:test";
import assert from "node:assert/strict";
import { HU_FINAL_REVIEW } from "../src/review-evidence-hu.js";
import { renderHungarianPrivatePage } from "../src/page-hu.js";
import { HU_UI_COPY } from "../src/ui-copy-hu.js";

test("Hungarian final review is versioned and complete", () => {
  assert.equal(HU_FINAL_REVIEW.reviewedAt, "2026-08-29");
  assert.equal(HU_FINAL_REVIEW.languageReviewed, true);
  assert.equal(HU_FINAL_REVIEW.mobileJourneyReviewed, true);
  assert.ok(HU_FINAL_REVIEW.evidence.language.length >= 3);
  assert.ok(HU_FINAL_REVIEW.evidence.mobile.length >= 3);
});

test("Hungarian homepage uses central audited power-station wording", () => {
  const html = renderHungarianPrivatePage();
  assert.ok(html.includes(HU_UI_COPY.result.powerStationComparison));
  assert.ok(!html.includes("hordozható erőmű"));
});
