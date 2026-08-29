import test from "node:test";
import assert from "node:assert/strict";
import { HU_REQUIRED_PRODUCT_COVERAGE, assessHungarianLaunchReadiness } from "../src/readiness-hu.js";

function completeProducts() {
  return Object.entries(HU_REQUIRED_PRODUCT_COVERAGE).flatMap(([category, count]) =>
    Array.from({ length: count }, (_, index) => ({ id: `${category}-${index}`, category }))
  );
}

test("Hungarian launch blocks a stale secondary catalog source even with complete product coverage", () => {
  const report = assessHungarianLaunchReadiness({
    catalog: {
      market: "hu-HU",
      currency: "EUR",
      sources: {
        ampul_hu: { status: "ok" },
        allpowers_eu: { status: "ok" },
        powerqueen_eu: { status: "stale" },
      },
      products: completeProducts(),
    },
    languageReviewed: true,
    mobileJourneyReviewed: true,
  });

  assert.equal(report.checks.productCoverage, true);
  assert.equal(report.checks.catalogSource, false);
  assert.equal(report.ready, false);
  assert.deepEqual(report.blockers, ["HU_CATALOG_SOURCE_NOT_READY"]);
});

test("Hungarian launch accepts fresh secondary catalog sources when the other gates pass", () => {
  const report = assessHungarianLaunchReadiness({
    catalog: {
      market: "hu-HU",
      currency: "EUR",
      sources: {
        ampul_hu: { status: "ok" },
        allpowers_eu: { status: "ok" },
        powerqueen_eu: { status: "ok" },
      },
      products: completeProducts(),
    },
    languageReviewed: true,
    mobileJourneyReviewed: true,
  });

  assert.equal(report.checks.catalogSource, true);
  assert.equal(report.ready, true);
  assert.deepEqual(report.blockers, []);
});
