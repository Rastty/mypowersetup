import test from "node:test";
import assert from "node:assert/strict";

import { assessExistingSetup } from "../src/existing-setup.js";

const result = {
  locale: "cs",
  dailyWh: 800,
  autonomyDays: 2,
  batteryWh: 2300,
  batteryAh: 200,
  batteryType: "lifepo4",
  solarWatts: 400,
  inverterWatts: 1500,
  controllerAmps: 50,
  systemVoltage: 12,
  calculation: { dailyWhRaw: 800 }
};

test("existing setup check accepts a system that meets every required rating", () => {
  const assessment = assessExistingSetup(result, {
    batteryType: "lifepo4",
    systemVoltage: 12,
    batteryAh: 230,
    solarWatts: 400,
    inverterWatts: 1600,
    controllerAmps: 50
  }, "cs");

  assert.equal(assessment.primaryBottleneck, null);
  assert.ok(assessment.items.every((item) => item.status === "sufficient"));
  assert.match(assessment.summary, /odpovídají návrhu/);
});

test("existing setup check finds the most restrictive known component", () => {
  const assessment = assessExistingSetup(result, {
    batteryType: "lifepo4",
    systemVoltage: 12,
    batteryAh: 200,
    solarWatts: 150,
    inverterWatts: 1200,
    controllerAmps: 40
  }, "cs");

  assert.equal(assessment.primaryBottleneck, "solar");
  assert.match(assessment.summary, /alespoň přibližně na 400 Wp/);
  assert.equal(assessment.items.find((item) => item.id === "solar").status, "insufficient");
  assert.equal(assessment.items.find((item) => item.id === "inverter").status, "close");
});

test("battery requirement respects the chemistry of the existing battery", () => {
  const lifepo4 = assessExistingSetup(result, { batteryType: "lifepo4", systemVoltage: 12, batteryAh: 220 }, "cs");
  const lead = assessExistingSetup(result, { batteryType: "lead", systemVoltage: 12, batteryAh: 220 }, "cs");

  assert.equal(lifepo4.requiredBatteryAh, 200);
  assert.equal(lead.requiredBatteryAh, 310);
  assert.equal(lifepo4.items[0].status, "sufficient");
  assert.equal(lead.items[0].status, "insufficient");
});

test("voltage mismatch takes priority over component upsizing", () => {
  const assessment = assessExistingSetup(result, {
    batteryType: "lifepo4",
    systemVoltage: 24,
    batteryAh: 200,
    solarWatts: 100
  }, "sk");

  assert.equal(assessment.primaryBottleneck, "voltage");
  assert.equal(assessment.items[0].status, "incompatible");
  assert.match(assessment.summary, /24V prvky.*12V zostavou/);
});

test("unknown values stay optional and no unnecessary inverter is flagged", () => {
  const dcOnly = { ...result, inverterWatts: 0 };
  const assessment = assessExistingSetup(dcOnly, { batteryType: "lifepo4", systemVoltage: 12 }, "pl");

  assert.equal(assessment.primaryBottleneck, null);
  assert.equal(assessment.items.find((item) => item.id === "inverter").status, "sufficient");
  assert.equal(assessment.items.find((item) => item.id === "solar").status, "unknown");
  assert.match(assessment.summary, /Uzupełnij brakujące wartości/);
});
