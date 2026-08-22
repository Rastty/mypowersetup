import test from "node:test";
import assert from "node:assert/strict";
import { calculateBatteryCablePlan } from "../src/wiring.js";

test("sizes a short 12V inverter run by a 2.5 percent voltage-drop target", () => {
  const plan = calculateBatteryCablePlan({ inverterWatts: 1200, systemVoltage: 12, oneWayLengthMeters: 1.5 });
  assert.equal(plan.designCurrentAmps, 112);
  assert.equal(plan.recommendedCrossSectionMm2, 25);
  assert.ok(plan.estimatedDropPercent <= 2.5);
  assert.equal(plan.basis, "voltage-drop-only");
});

test("24V requires a smaller section for the same power and route", () => {
  const at12V = calculateBatteryCablePlan({ inverterWatts: 2000, systemVoltage: 12, oneWayLengthMeters: 2 });
  const at24V = calculateBatteryCablePlan({ inverterWatts: 2000, systemVoltage: 24, oneWayLengthMeters: 2 });
  assert.ok(at24V.recommendedCrossSectionMm2 < at12V.recommendedCrossSectionMm2);
});

test("does not pretend to size a circuit outside supported bounds", () => {
  assert.equal(calculateBatteryCablePlan({ inverterWatts: 0, systemVoltage: 12, oneWayLengthMeters: 1 }), null);
  assert.equal(calculateBatteryCablePlan({ inverterWatts: 1000, systemVoltage: 48, oneWayLengthMeters: 1 }), null);
  assert.equal(calculateBatteryCablePlan({ inverterWatts: 1000, systemVoltage: 12, oneWayLengthMeters: 11 }), null);
});

test("flags a route needing more than the largest standard section", () => {
  const plan = calculateBatteryCablePlan({ inverterWatts: 3000, systemVoltage: 12, oneWayLengthMeters: 10 });
  assert.equal(plan.recommendedCrossSectionMm2, null);
  assert.ok(plan.requiredCrossSectionMm2 > 120);
});
