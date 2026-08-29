import test from "node:test";
import assert from "node:assert/strict";
import { assessFinalFourMarketReadiness } from "../src/final-readiness.js";

const healthyBase = {
  healthSummary: { safe: true },
  preaudit: { auditReady: true },
  huLaunch: { ready: true, blockers: [] },
};

test("Reslshop freshness is the only accepted Czech exception", () => {
  const report = assessFinalFourMarketReadiness({
    ...healthyBase,
    healthMarkets: [
      { key: "cz", attention: ["SOURCE_NOT_FRESH:reslshop"], blockers: [] },
      { key: "sk", attention: [], blockers: [] },
      { key: "pl", attention: [], blockers: [] },
      { key: "hu", attention: [], blockers: [] },
    ],
  });
  assert.equal(report.readyForRomania, true);
  assert.deepEqual(report.blockers, []);
  assert.deepEqual(report.acceptedExceptions, ["cz:SOURCE_NOT_FRESH:reslshop"]);
});

test("any other market attention blocks Romania readiness", () => {
  const report = assessFinalFourMarketReadiness({
    ...healthyBase,
    healthMarkets: [
      { key: "cz", attention: ["SOURCE_NOT_FRESH:reslshop"], blockers: [] },
      { key: "sk", attention: ["PRODUCT_COVERAGE:controller:1/2"], blockers: [] },
    ],
  });
  assert.equal(report.readyForRomania, false);
  assert.deepEqual(report.blockers, ["sk:PRODUCT_COVERAGE:controller:1/2"]);
});

test("HU manual review and launch blockers remain mandatory", () => {
  const report = assessFinalFourMarketReadiness({
    healthSummary: { safe: true },
    healthMarkets: [],
    preaudit: { auditReady: true },
    huLaunch: { ready: false, blockers: ["HU_LANGUAGE_REVIEW_REQUIRED", "HU_MOBILE_JOURNEY_REVIEW_REQUIRED"] },
  });
  assert.equal(report.readyForRomania, false);
  assert.deepEqual(report.blockers, ["HU_LANGUAGE_REVIEW_REQUIRED", "HU_MOBILE_JOURNEY_REVIEW_REQUIRED"]);
});

test("unsafe health or incomplete preaudit can never pass final gate", () => {
  const report = assessFinalFourMarketReadiness({
    healthSummary: { safe: false },
    healthMarkets: [],
    preaudit: { auditReady: false },
    huLaunch: { ready: true, blockers: [] },
  });
  assert.equal(report.readyForRomania, false);
  assert.deepEqual(report.blockers, ["MARKET_HEALTH_NOT_SAFE", "PREAUDIT_NOT_READY"]);
});
