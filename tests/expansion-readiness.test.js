import test from "node:test";
import assert from "node:assert/strict";
import { assessExpansionReadiness } from "../src/expansion-readiness.js";

const base = {
  healthSummary: { safe: true },
  preaudit: { auditReady: true },
  huReview: { languageReviewed: true, mobileJourneyReviewed: true },
};

test("documented external product gaps do not block starting another localization", () => {
  const report = assessExpansionReadiness({
    ...base,
    healthMarkets: [
      { key: "cz", attention: ["SOURCE_NOT_FRESH:reslshop"], blockers: [] },
      { key: "sk", attention: ["PRODUCT_COVERAGE:controller:1/2"], blockers: [] },
      { key: "pl", attention: ["PRODUCT_COVERAGE:controller:1/2"], blockers: [] },
      { key: "hu", attention: ["PRODUCT_COVERAGE:controller:1/2"], blockers: [] },
    ],
  });
  assert.equal(report.readyForNextLocalization, true);
  assert.equal(report.blockers.length, 0);
  assert.equal(report.deferredGaps.length, 4);
});

test("new quality attention remains a blocker", () => {
  const report = assessExpansionReadiness({
    ...base,
    healthMarkets: [{ key: "pl", attention: ["PRODUCT_COVERAGE:battery:1/2"], blockers: [] }],
  });
  assert.equal(report.readyForNextLocalization, false);
  assert.deepEqual(report.blockers, ["pl:PRODUCT_COVERAGE:battery:1/2"]);
});

test("structural safety, preaudit and HU review are mandatory", () => {
  const report = assessExpansionReadiness({
    healthSummary: { safe: false },
    healthMarkets: [],
    preaudit: { auditReady: false },
    huReview: { languageReviewed: false, mobileJourneyReviewed: false },
  });
  assert.equal(report.readyForNextLocalization, false);
  assert.deepEqual(report.blockers, [
    "MARKET_HEALTH_NOT_SAFE",
    "PREAUDIT_NOT_READY",
    "HU_LANGUAGE_REVIEW_REQUIRED",
    "HU_MOBILE_JOURNEY_REVIEW_REQUIRED",
  ]);
});
