import test from "node:test";
import assert from "node:assert/strict";
import { diagnoseRequirement } from "../src/commercial-near-miss.js";

function product(overrides = {}) {
  return {
    id: "p1",
    merchant: "test",
    name: "Pure sine inverter",
    category: "inverter",
    specs: { voltageV: 12, powerW: 2000, pureSine: true },
    ...overrides,
  };
}

test("near-miss diagnostics identifies oversized inverter rather than calling it viable", () => {
  const report = diagnoseRequirement([product()], {
    category: "inverter",
    systemVoltage: 12,
    waveform: "pure_sine",
    minContinuousPowerW: 300,
    maxContinuousPowerW: 900,
  });
  assert.equal(report.status, "catalog_near_miss");
  assert.deepEqual(report.bestCandidates[0].blockers, ["powerW:2000>900"]);
});

test("near-miss diagnostics flags a viable missing product as selection mismatch", () => {
  const report = diagnoseRequirement([product({ specs: { voltageV: 12, powerW: 300, pureSine: true } })], {
    category: "inverter",
    systemVoltage: 12,
    waveform: "pure_sine",
    minContinuousPowerW: 200,
    maxContinuousPowerW: 600,
  });
  assert.equal(report.status, "selection_mismatch");
  assert.equal(report.bestCandidates[0].blockers.length, 0);
});

test("near-miss diagnostics distinguishes missing category", () => {
  const report = diagnoseRequirement([], {
    category: "controller",
    technology: "mppt",
    minCurrentA: 40,
    maxCurrentA: 120,
    systemVoltage: 12,
    minArrayWatts: 500,
  });
  assert.equal(report.status, "catalog_missing_category");
  assert.equal(report.categoryProductCount, 0);
});
