import test from "node:test";
import assert from "node:assert/strict";

import { assessRecommendationCoverage, isRecommendationEligible, requiredRecommendationCategories } from "../src/recommendation-coverage.js";

const setup = {
  locale: "pl",
  inverterWatts: 1000,
  charging: {
    dcDc: { enabled: true, suggestedCurrentAmps: 20 },
    shore: { enabled: true, suggestedCurrentAmps: 15 },
  },
};

test("coverage requires every component used by the calculated setup", () => {
  assert.deepEqual(requiredRecommendationCategories(setup), [
    "battery", "solar_panel", "controller", "inverter", "dc_charger", "shore_charger",
  ]);
  const report = assessRecommendationCoverage({
    solar_panel: [{}], inverter: [{}], dc_charger: [{}], shore_charger: [{}],
  }, setup);
  assert.equal(report.complete, false);
  assert.deepEqual(report.missing, ["battery", "controller"]);
  assert.equal(report.ratio, 4 / 6);
  assert.match(report.message, /akumulator/);
  assert.match(report.message, /regulator MPPT/);
});

test("disabled charging paths and unused inverter are not reported as gaps", () => {
  const compact = {
    ...setup,
    locale: "hu",
    inverterWatts: 0,
    charging: { dcDc: { enabled: false }, shore: { enabled: false } },
  };
  const report = assessRecommendationCoverage({ battery: [{}], solar_panel: [{}], controller: [{}] }, compact);
  assert.equal(report.complete, true);
  assert.deepEqual(report.required, ["battery", "solar_panel", "controller"]);
  assert.match(report.message, /minden szükséges elemét/);
});

test("stale or unavailable rows cannot make result coverage look complete", () => {
  assert.equal(isRecommendationEligible({}), true);
  assert.equal(isRecommendationEligible({ staleSource: true }), false);
  assert.equal(isRecommendationEligible({ available: false }), false);
  assert.equal(isRecommendationEligible({ product: {} }), true);
  assert.equal(isRecommendationEligible({ product: { staleSource: true } }), false);
  assert.equal(isRecommendationEligible({ product: { available: false } }), false);
  assert.equal(isRecommendationEligible({ staleSource: true, product: {} }), false);

  const compact = {
    ...setup,
    locale: "cs",
    inverterWatts: 0,
    charging: { dcDc: { enabled: false }, shore: { enabled: false } },
  };
  const report = assessRecommendationCoverage({
    battery: [{ product: { staleSource: true } }],
    solar_panel: [{ product: {} }],
    controller: [{ product: { available: false } }],
  }, compact);
  assert.equal(report.complete, false);
  assert.deepEqual(report.missing, ["battery", "controller"]);
});


test("rejected charging paths remain outside the product ratio but are disclosed in every market", () => {
  const blocked = {
    ...setup,
    charging: {
      dcDc: { enabled: true, suggestedCurrentAmps: null, needsIndividualDesign: true },
      shore: { enabled: true, suggestedCurrentAmps: 15, needsIndividualDesign: false },
    },
  };
  const recommendations = { battery: [{}], solar_panel: [{}], controller: [{}], inverter: [{}], shore_charger: [{}] };
  for (const language of ["cs", "sk", "pl", "hu"]) {
    const report = assessRecommendationCoverage(recommendations, { ...blocked, locale: language }, language);
    assert.equal(report.complete, true, language);
    assert.equal(report.required.length, 5, language);
    assert.deepEqual(report.manualDesignCharging, ["dc_charger"], language);
    assert.match(report.manualDesignMessage, /DC–DC/, language);
  }
  const bothBlocked = assessRecommendationCoverage(recommendations, {
    ...blocked,
    charging: {
      dcDc: { enabled: true, suggestedCurrentAmps: null, needsIndividualDesign: true },
      shore: { enabled: true, suggestedCurrentAmps: null, needsIndividualDesign: true },
    },
  }, "cs");
  assert.deepEqual(bothBlocked.manualDesignCharging, ["dc_charger", "shore_charger"]);
  assert.match(bothBlocked.manualDesignMessage, /230 V/);
  const inactive = assessRecommendationCoverage(recommendations, {
    ...blocked,
    charging: { dcDc: { enabled: false, needsIndividualDesign: true }, shore: { enabled: true, suggestedCurrentAmps: 15 } },
  }, "cs");
  assert.deepEqual(inactive.manualDesignCharging, []);
  assert.equal(inactive.manualDesignMessage, null);
});
