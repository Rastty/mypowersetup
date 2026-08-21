import test from "node:test";
import assert from "node:assert/strict";

import { calculateSetup, roundUp } from "../src/engine.js";

test("roundUp rounds to the requested product step", () => {
  assert.equal(roundUp(501, 50), 550);
  assert.equal(roundUp(500, 50), 500);
  assert.equal(roundUp(0, 50), 0);
});

test("calculator requires at least one selected appliance", () => {
  assert.throws(
    () => calculateSetup({ appliances: [] }),
    /alespoň jeden spotřebič/
  );
});

test("sizes a small summer LiFePO4 setup deterministically", () => {
  const result = calculateSetup({
    appliances: [
      { selected: true, name: "Lednice", watts: 45, hours: 8, quantity: 1, ac: false },
      { selected: true, name: "Notebook", watts: 65, hours: 4, quantity: 1, ac: true, surge: 1 }
    ],
    autonomyDays: 2,
    season: "summer",
    batteryType: "lifepo4",
    systemVoltage: "auto"
  });

  assert.equal(result.dailyWh, 620);
  assert.equal(result.batteryWh, 1800);
  assert.equal(result.batteryAh, 150);
  assert.equal(result.solarWatts, 250);
  assert.equal(result.inverterWatts, 100);
  assert.equal(result.controllerAmps, 30);
  assert.equal(result.systemVoltage, 12);
  assert.equal(result.calculation.peakSunHours, 4.5);
  assert.equal(result.calculation.automaticVoltage, 12);
  assert.ok(result.calculation.requiredBatteryWhRaw > 1700);
});

test("automatically switches a high-power setup to 24 V", () => {
  const result = calculateSetup({
    appliances: [
      { selected: true, name: "Kávovar", watts: 1800, hours: 0.25, quantity: 1, ac: true, surge: 1.2 },
      { selected: true, name: "Lednice", watts: 50, hours: 10, quantity: 1, ac: false }
    ],
    autonomyDays: 3,
    season: "shoulder",
    batteryType: "lifepo4",
    systemVoltage: "auto"
  });

  assert.equal(result.systemVoltage, 24);
  assert.ok(result.inverterWatts >= 2200);
  assert.ok(result.batteryWh >= 4100);
});
