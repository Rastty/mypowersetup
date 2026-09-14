import test from "node:test";
import assert from "node:assert/strict";

import { calculateDcDcCharger } from "../src/dc-dc-charger.js";

test("sizes a standard DC-DC charger from replenishment target and drive time", () => {
  const result = calculateDcDcCharger({
    batteryCapacityAh: 200,
    replenishPercent: 50,
    targetDriveHours: 3,
    batteryVoltage: 12,
    sourceVoltage: 14.2,
    spareAlternatorCurrentA: 50,
    batteryMaxChargeCurrentA: 100,
    efficiencyPercent: 90,
  });

  assert.equal(result.energyToReplaceWh, 1200);
  assert.equal(result.requiredOutputCurrentA, 33.3);
  assert.equal(result.alternatorLimitedOutputCurrentA, 53.3);
  assert.equal(result.recommendedChargerCurrentA, 40);
  assert.equal(result.estimatedRechargeHours, 2.5);
  assert.equal(result.targetMet, true);
  assert.deepEqual(result.limitingFactors, []);
});

test("does not recommend a charger above spare alternator capability", () => {
  const result = calculateDcDcCharger({
    batteryCapacityAh: 200,
    replenishPercent: 50,
    targetDriveHours: 3,
    batteryVoltage: 12,
    sourceVoltage: 14.2,
    spareAlternatorCurrentA: 20,
    batteryMaxChargeCurrentA: 100,
    efficiencyPercent: 90,
  });

  assert.equal(result.feasibleOutputCurrentA, 21.3);
  assert.equal(result.recommendedChargerCurrentA, 20);
  assert.equal(result.targetMet, false);
  assert.ok(result.limitingFactors.includes("alternator-spare-current"));
  assert.ok(result.sourceCurrentAtRecommendationA <= 20);
});

test("respects battery maximum charge current independently of alternator capacity", () => {
  const result = calculateDcDcCharger({
    batteryCapacityAh: 300,
    replenishPercent: 60,
    targetDriveHours: 2,
    batteryVoltage: 12,
    sourceVoltage: 14.4,
    spareAlternatorCurrentA: 150,
    batteryMaxChargeCurrentA: 25,
    efficiencyPercent: 92,
  });

  assert.equal(result.feasibleOutputCurrentA, 25);
  assert.equal(result.recommendedChargerCurrentA, 20);
  assert.equal(result.targetMet, false);
  assert.ok(result.limitingFactors.includes("battery-charge-current"));
});

test("documents that alternator input means spare continuous current, not nameplate current", () => {
  const result = calculateDcDcCharger();

  assert.equal(result.assumptions.alternatorInputMeaning, "spare-continuous-current-after-vehicle-loads");
  assert.ok(result.warnings.some((warning) => warning.includes("jmenovitý proud alternátoru")));
});
