import test from "node:test";
import assert from "node:assert/strict";
import { calculateChargingPlan } from "../src/charging.js";

test("sizes bounded DC-DC and shore charging from daily energy", () => {
  const plan = calculateChargingPlan({
    dailyWh: 620,
    batteryAh: 150,
    batteryType: "lifepo4",
    systemVoltage: 12,
    starterVoltage: 24,
    driveHoursPerDay: 2,
    shoreChargeHours: 8,
  });
  assert.equal(plan.dcDc.requiredCurrentAmps, 29);
  assert.equal(plan.dcDc.suggestedCurrentAmps, 30);
  assert.equal(plan.starterVoltage, 24);
  assert.equal(plan.shore.requiredCurrentAmps, 8);
  assert.equal(plan.shore.suggestedCurrentAmps, 10);
  assert.equal(plan.efficiencyPercent, 90);
});

test("refuses a standard charger beyond the conservative battery planning ceiling", () => {
  const plan = calculateChargingPlan({
    dailyWh: 1200,
    batteryAh: 100,
    batteryType: "lead",
    systemVoltage: 12,
    driveHoursPerDay: 2,
    shoreChargeHours: 8,
  });
  assert.equal(plan.dcDc.suggestedCurrentAmps, null);
  assert.equal(plan.dcDc.needsIndividualDesign, true);
  assert.equal(plan.shore.suggestedCurrentAmps, null);
  assert.equal(plan.shore.planningCeilingAmps, 10);
});

test("allows either charging source to be disabled", () => {
  const plan = calculateChargingPlan({
    dailyWh: 500,
    batteryAh: 100,
    batteryType: "lifepo4",
    systemVoltage: 12,
    driveHoursPerDay: 0,
    shoreChargeHours: 0,
  });
  assert.equal(plan.dcDc.enabled, false);
  assert.equal(plan.shore.enabled, false);
});

test("rejects an incomplete electrical result", () => {
  assert.equal(calculateChargingPlan({ dailyWh: 500 }), null);
});
