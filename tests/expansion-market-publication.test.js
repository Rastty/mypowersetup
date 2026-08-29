import test from "node:test";
import assert from "node:assert/strict";
import {
  EXPANSION_CONTENT_PLAN,
  assessExpansionMarketPublication,
  requireExpansionMarketPublication,
} from "../src/expansion-market-publication.js";

test("RO PT and SI stay blocked until every publication gate passes", () => {
  for (const market of ["ro", "pt", "si"]) {
    const report = assessExpansionMarketPublication(market);
    assert.equal(report.checks.privateSeed, true);
    assert.equal(report.publicationReady, false);
    assert.equal(report.nextAction, "localizedCalculator");
    assert.ok(report.blockers.includes("nativeLanguageReview"));
  }
});

test("each expansion market starts with a compact high-intent cluster", () => {
  for (const market of ["ro", "pt", "si"]) {
    const plan = EXPANSION_CONTENT_PLAN[market];
    assert.equal(plan.length, 10);
    assert.equal(plan[0], "calculator");
    assert.ok(plan.includes("battery-capacity"));
    assert.ok(plan.includes("solar-sizing"));
    assert.ok(plan.includes("power-station-vs-fixed"));
    assert.ok(plan.includes("complete-system"));
  }
});

test("publication opens only after calculator SEO affiliate mobile analytics and language evidence", () => {
  const evidence = {
    localizedCalculator: true,
    localIntentResearch: true,
    contentCluster: true,
    affiliateValidation: true,
    mobile390x844: true,
    analyticsParity: true,
    nativeLanguageReview: true,
  };
  for (const market of ["ro", "pt", "si"]) {
    const report = requireExpansionMarketPublication(market, evidence);
    assert.equal(report.publicationReady, true);
    assert.equal(report.nextAction, "publish-progressively");
    assert.deepEqual(report.blockers, []);
  }
});

test("unknown expansion markets fail closed", () => {
  assert.throws(() => assessExpansionMarketPublication("xx"), /EXPANSION_MARKET_UNKNOWN/);
});
