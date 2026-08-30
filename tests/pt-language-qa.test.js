import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { renderPrivateMarketSeedPage } from "../src/private-market-page.js";
import { PT_MARKET_SEED } from "../src/market-seed-pt.js";
import { PT_REVIEW_EVIDENCE } from "../src/review-evidence-pt.js";
import { createNativeReviewChecklist } from "../src/native-review-packs.js";

const html = renderPrivateMarketSeedPage(PT_MARKET_SEED);

test("Portugal calculator uses European Portuguese terminology", () => {
  assert.match(html, /AGM \/ chumbo-ácido/);
  assert.match(html, /Automático/);
  assert.match(html, /h\/dia/);
  assert.doesNotMatch(html, /AGM \/ lead/);
  assert.doesNotMatch(html, /h\/day/);
  assert.doesNotMatch(html, />Auto</);
});

test("Portugal product UI does not leak English power-station label", async () => {
  const source = await readFile(new URL("../src/expansion-calculator-browser.js", import.meta.url), "utf8");
  assert.match(source, /Estação de energia portátil/);
  assert.doesNotMatch(source, /: "Power station"/);
});

test("automated QA alone cannot stand in for explicit editorial language review", () => {
  const automationOnly = createNativeReviewChecklist("pt", {
    automatedLanguageQa: true,
    terminologyReviewedByAutomation: true,
    reviewer: "automation",
    reviewedAt: "2026-08-30",
  });
  assert.equal(automationOnly.approved, false);
  assert.ok(automationOnly.blockers.includes("reviewerQualification"));
  assert.ok(automationOnly.blockers.includes("calculatorReviewed"));
});

test("Portugal records explicit AI editorial review without claiming native-speaker review", () => {
  assert.equal(PT_REVIEW_EVIDENCE.automatedLanguageQa, true);
  assert.equal(PT_REVIEW_EVIDENCE.terminologyReviewedByAutomation, true);
  assert.equal(PT_REVIEW_EVIDENCE.languageEditorialReview, true);
  assert.equal(PT_REVIEW_EVIDENCE.reviewerType, "ai_editorial_review");
  assert.equal(PT_REVIEW_EVIDENCE.nativeLanguageReview, false);
  assert.equal(PT_REVIEW_EVIDENCE.nativeSpeaker, false);
  assert.equal(PT_REVIEW_EVIDENCE.terminologyReviewed, true);
  assert.equal(PT_REVIEW_EVIDENCE.publicPublicationApproved, true);
});