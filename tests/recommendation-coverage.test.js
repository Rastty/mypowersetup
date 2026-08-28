import test from "node:test";
import assert from "node:assert/strict";

import { assessRecommendationCoverage, requiredRecommendationCategories } from "../src/recommendation-coverage.js";

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
