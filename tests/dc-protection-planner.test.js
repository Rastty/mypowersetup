import test from "node:test";
import assert from "node:assert/strict";

import { calculateDcProtectionPlan } from "../src/dc-protection-planner.js";

test("selects the next standard fuse only within cable and equipment ceilings", () => {
  const result = calculateDcProtectionPlan({
    continuousCurrentA: 30,
    systemVoltage: 12,
    oneWayLengthM: 5,
    maxDropPercent: 3,
    planningMarginPercent: 125,
    cableAmpacityA: 60,
    equipmentMaxFuseA: 50,
  });

  assert.equal(result.designCurrentA, 37.5);
  assert.equal(result.protectionCeilingA, 50);
  assert.equal(result.recommendedFuseA, 40);
  assert.equal(result.feasible, true);
  assert.equal(result.voltageDropSizing.recommendedMm2, 16);
  assert.ok(result.voltageDropSizing.actualDropPercent <= 3);
});

test("refuses a fuse when design current exceeds verified cable ampacity", () => {
  const result = calculateDcProtectionPlan({
    continuousCurrentA: 60,
    planningMarginPercent: 125,
    cableAmpacityA: 70,
    equipmentMaxFuseA: 100,
  });

  assert.equal(result.designCurrentA, 75);
  assert.equal(result.protectionCeilingA, 70);
  assert.equal(result.recommendedFuseA, null);
  assert.equal(result.feasible, false);
  assert.ok(result.warnings.some((warning) => warning.includes("není možné zvolit pojistku")));
});

test("equipment max-fuse can be the protection ceiling", () => {
  const result = calculateDcProtectionPlan({
    continuousCurrentA: 40,
    planningMarginPercent: 125,
    cableAmpacityA: 100,
    equipmentMaxFuseA: 40,
  });

  assert.equal(result.designCurrentA, 50);
  assert.equal(result.protectionCeilingA, 40);
  assert.equal(result.recommendedFuseA, null);
  assert.equal(result.feasible, false);
});

test("keeps voltage-drop sizing separate from thermal ampacity verification", () => {
  const result = calculateDcProtectionPlan({
    continuousCurrentA: 20,
    systemVoltage: 24,
    oneWayLengthM: 8,
    maxDropPercent: 2,
    cableAmpacityA: 50,
  });

  assert.ok(result.voltageDropSizing.requiredMm2 > 0);
  assert.equal(result.assumptions.cableAmpacityIsUserVerified, true);
  assert.equal(result.assumptions.voltageDropSizingDoesNotProveAmpacity, true);
  assert.ok(result.warnings.some((warning) => warning.includes("neprokazuje tepelnou proudovou zatížitelnost")));
});
