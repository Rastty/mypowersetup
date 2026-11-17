import test from "node:test";
import assert from "node:assert/strict";
import { calculateChargingPlan } from "../src/charging.js";
import { chargingDecisionExplanation } from "../src/charging-decision-copy.js";

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
  assert.equal(plan.dcDc.candidateCurrentAmps, 30);
  assert.equal(plan.dcDc.estimatedInputCurrentAmps, 17);
  assert.equal(plan.dcDc.inputEstimateOutputCurrentAmps, 30);
  assert.equal(plan.starterVoltage, 24);
  assert.equal(plan.shore.requiredCurrentAmps, 8);
  assert.equal(plan.shore.suggestedCurrentAmps, 10);
  assert.equal(plan.efficiencyPercent, 90);
});

test("exposes the higher alternator-side current for a 12-to-24 V charger", () => {
  const plan = calculateChargingPlan({
    dailyWh: 1000,
    batteryAh: 200,
    batteryType: "lifepo4",
    systemVoltage: 24,
    starterVoltage: 12,
    driveHoursPerDay: 2,
    shoreChargeHours: 0,
  });
  assert.equal(plan.dcDc.suggestedCurrentAmps, 25);
  assert.equal(plan.dcDc.estimatedInputCurrentAmps, 56);
  assert.equal(plan.dcDc.inputEstimateOutputCurrentAmps, 25);
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
  assert.equal(plan.dcDc.candidateCurrentAmps, 60);
  assert.equal(plan.dcDc.needsIndividualDesign, true);
  assert.equal(plan.dcDc.estimatedInputCurrentAmps, 63);
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

test("explains that the standard 30 A charger, not the required 26 A, exceeds a 28 A ceiling", () => {
  const plan = calculateChargingPlan({
    dailyWh: 550,
    batteryAh: 140,
    batteryType: "lifepo4",
    systemVoltage: 12,
    driveHoursPerDay: 2,
    shoreChargeHours: 8,
  });
  assert.equal(plan.dcDc.requiredCurrentAmps, 26);
  assert.equal(plan.dcDc.planningCeilingAmps, 28);
  assert.equal(plan.dcDc.candidateCurrentAmps, 30);
  assert.equal(plan.dcDc.suggestedCurrentAmps, null);
  assert.equal(plan.dcDc.needsIndividualDesign, true);
  for (const locale of ["cs", "sk", "pl", "hu"]) {
    const explanation = chargingDecisionExplanation(plan.dcDc, locale);
    assert.match(explanation, /26 A/);
    assert.match(explanation, /30 A/);
    assert.match(explanation, /28 A/);
    assert.doesNotMatch(explanation, /26 A (?:překračuje|prekračuje|przekracza|meghaladja)/);
  }
});

test("explains separately when the required current exceeds the largest standard charger", () => {
  const plan = calculateChargingPlan({
    dailyWh: 1800,
    batteryAh: 500,
    systemVoltage: 12,
    batteryType: "lifepo4",
    driveHoursPerDay: 2,
  });
  assert.equal(plan.dcDc.requiredCurrentAmps, 84);
  assert.equal(plan.dcDc.planningCeilingAmps, 100);
  assert.equal(plan.dcDc.candidateCurrentAmps, null);
  assert.equal(plan.dcDc.suggestedCurrentAmps, null);
  assert.match(chargingDecisionExplanation(plan.dcDc, "cs"), /není dostatečně výkonná standardní nabíječka/);
  for (const locale of ["sk", "pl", "hu"]) {
    assert.match(chargingDecisionExplanation(plan.dcDc, locale), /84 A/);
  }
});

test("keeps standard safe-charger explanations stable in every market", () => {
  const plan = calculateChargingPlan({
    dailyWh: 550,
    batteryAh: 200,
    systemVoltage: 12,
    batteryType: "lifepo4",
    driveHoursPerDay: 2,
  });
  assert.equal(plan.dcDc.suggestedCurrentAmps, 30);
  for (const locale of ["cs", "sk", "pl", "hu"]) {
    const explanation = chargingDecisionExplanation(plan.dcDc, locale);
    assert.match(explanation, /26 A/);
    assert.doesNotMatch(explanation, /28 A|40 A|individual|individuáln|egyedi/);
  }
});
