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

test("custom AC appliance contributes its name, energy and declared start surge", () => {
  const result = calculateSetup({
    appliances: [{
      id: "custom",
      selected: true,
      name: "Kompresor",
      watts: 500,
      hours: 2,
      quantity: 1,
      ac: true,
      surge: 2,
    }],
    autonomyDays: 1,
    season: "summer",
    batteryType: "lifepo4",
    systemVoltage: "auto",
  });
  assert.equal(result.dailyWh, 1000);
  assert.equal(result.inverterWatts, 1000);
  assert.equal(result.applianceRows[0].name, "Kompresor");
  assert.ok(result.warnings.some((warning) => /rozběhovou špičku/.test(warning)));
});

test("returns Slovak result labels and warnings without changing the calculation", () => {
  const result = calculateSetup({
    locale: "sk",
    appliances: [
      { selected: true, name: "Vodné čerpadlo", watts: 60, hours: 1, quantity: 1, ac: true, surge: 2 }
    ],
    autonomyDays: 1,
    season: "winter",
    batteryType: "lifepo4",
    systemVoltage: "24"
  });

  assert.equal(result.seasonLabel, "Zima");
  assert.equal(result.locale, "sk");
  assert.equal(result.batteryLabel, "LiFePO₄");
  assert.ok(result.warnings.some((warning) => /V zime počítajte/.test(warning)));
  assert.ok(result.warnings.some((warning) => /Motorové spotrebiče/.test(warning)));
  assert.ok(result.warnings.some((warning) => /odporučili 12V systém/.test(warning)));
});

test("returns Polish result labels and warnings without changing the calculation", () => {
  const result = calculateSetup({
    locale: "pl",
    appliances: [
      { selected: true, name: "Pompa wody", watts: 60, hours: 1, quantity: 1, ac: true, surge: 2 }
    ],
    autonomyDays: 1,
    season: "winter",
    batteryType: "lead",
    systemVoltage: "24"
  });

  assert.equal(result.seasonLabel, "Zima");
  assert.equal(result.locale, "pl");
  assert.equal(result.batteryLabel, "AGM / kwasowo-ołowiowy");
  assert.ok(result.warnings.some((warning) => /Zimą należy liczyć/.test(warning)));
  assert.ok(result.warnings.some((warning) => /Urządzenia z silnikiem/.test(warning)));
  assert.ok(result.warnings.some((warning) => /zalecamy system 12 V/.test(warning)));
});

test("missing appliance error follows the requested locale", () => {
  assert.throws(() => calculateSetup({ locale: "sk", appliances: [] }), /Vyberte aspoň jeden spotrebič/);
  assert.throws(() => calculateSetup({ locale: "pl", appliances: [] }), /Wybierz co najmniej jedno urządzenie/);
});
