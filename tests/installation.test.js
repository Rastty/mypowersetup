import test from "node:test";
import assert from "node:assert/strict";
import { buildInstallationPlan } from "../src/installation.js";

test("lists only branches used by the calculated setup", () => {
  const plan = buildInstallationPlan({
    systemVoltage: 12,
    inverterWatts: 1200,
    charging: { dcDc: { enabled: true }, shore: { enabled: false } },
  });
  assert.deepEqual(plan.map(({ id }) => id), [
    "solar-controller",
    "controller-battery",
    "battery-distribution",
    "battery-inverter",
    "starter-dcdc",
    "dcdc-battery",
  ]);
  assert.ok(plan.every(({ detail }) => detail.length > 40));
});

test("adds both AC and DC sides of shore charging", () => {
  const plan = buildInstallationPlan({
    systemVoltage: 24,
    inverterWatts: 0,
    charging: { dcDc: { enabled: false }, shore: { enabled: true } },
  }, "sk");
  assert.ok(plan.some(({ id }) => id === "shore-charger"));
  assert.ok(plan.some(({ id }) => id === "charger-battery"));
  assert.ok(!plan.some(({ id }) => id === "battery-inverter"));
  assert.match(plan.find(({ id }) => id === "shore-charger").detail, /prúdový chránič/);
});

test("Polish installation plan keeps every safety check", () => {
  const plan = buildInstallationPlan({
    systemVoltage: 12,
    inverterWatts: 1200,
    charging: { dcDc: { enabled: true }, shore: { enabled: true } },
  }, "pl");
  assert.match(plan.find(({ id }) => id === "starter-dcdc").label, /Akumulator rozruchowy/);
  assert.match(plan.find(({ id }) => id === "battery-inverter").detail, /bezpiecznik wymagany przez producenta/);
  assert.match(plan.find(({ id }) => id === "shore-charger").detail, /wyłącznika różnicowoprądowego/);
});

test("Hungarian installation plan keeps every safety check", () => {
  const plan = buildInstallationPlan({
    systemVoltage: 12,
    inverterWatts: 1200,
    charging: { dcDc: { enabled: true }, shore: { enabled: true } },
  }, "hu");
  assert.equal(plan.length, 8);
  assert.match(plan.find((item) => item.id === "solar-controller").detail, /Voc és Isc/);
  assert.match(plan.find((item) => item.id === "starter-dcdc").detail, /generátor szabad kapacitását/);
  assert.match(plan.find((item) => item.id === "shore-charger").detail, /áram-védőkapcsolót/);
});

test("refuses an incomplete setup", () => {
  assert.deepEqual(buildInstallationPlan(null), []);
  assert.deepEqual(buildInstallationPlan({ systemVoltage: "unknown" }), []);
});
