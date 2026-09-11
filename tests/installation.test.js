import test from "node:test";
import assert from "node:assert/strict";
import { buildInstallationPlan } from "../src/installation.js";

const COMPLETE_SETUP = {
  systemVoltage: 12,
  solarWatts: 400,
  controllerAmps: 40,
  batteryAh: 200,
  batteryLabel: "LiFePO₄",
  inverterWatts: 1200,
  wiring: {
    designCurrentAmps: 112,
    oneWayLengthMeters: 1.5,
    recommendedCrossSectionMm2: 25,
    maxVoltageDropPercent: 2.5,
  },
  charging: {
    dcDc: {
      enabled: true,
      suggestedCurrentAmps: 30,
      requiredCurrentAmps: 28,
      estimatedInputCurrentAmps: 35,
      inputWiring: {
        designCurrentAmps: 35,
        oneWayLengthMeters: 4,
        recommendedCrossSectionMm2: 16,
        maxVoltageDropPercent: 3,
      },
    },
    shore: {
      enabled: true,
      suggestedCurrentAmps: 20,
      requiredCurrentAmps: 18,
    },
  },
};

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
  assert.ok(plan.every(({ detail }) => !detail.includes("undefined")));
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
  assert.ok(plan.every(({ detail }) => !detail.includes("undefined")));
});

test("turns the calculated setup into concrete purchase and wiring checks in every core locale", () => {
  const localeChecks = {
    cs: { solar: /400 Wp.*40 A/, battery: /200 Ah/, inverter: /1200 W.*112 A.*25 mm²/, dcDc: /30 A.*35 A.*16 mm²/, shore: /20 A/, safety: /pojistku předepsanou výrobcem/ },
    sk: { solar: /400 Wp.*40 A/, battery: /200 Ah/, inverter: /1200 W.*112 A.*25 mm²/, dcDc: /30 A.*35 A.*16 mm²/, shore: /20 A/, safety: /poistku predpísanú výrobcom/ },
    pl: { solar: /400 Wp.*40 A/, battery: /200 Ah/, inverter: /1200 W.*112 A.*25 mm²/, dcDc: /30 A.*35 A.*16 mm²/, shore: /20 A/, safety: /bezpiecznik wymagany przez producenta/ },
    hu: { solar: /400 Wp.*40 A/, battery: /200 Ah/, inverter: /1200 W.*112 A.*25 mm²/, dcDc: /30 A.*35 A.*16 mm²/, shore: /20 A/, safety: /gyártó által előírt biztosítékot/ },
  };

  for (const [locale, expected] of Object.entries(localeChecks)) {
    const plan = buildInstallationPlan(COMPLETE_SETUP, locale);
    assert.equal(plan.length, 8, locale);
    assert.match(plan.find(({ id }) => id === "solar-controller").detail, expected.solar, locale);
    assert.match(plan.find(({ id }) => id === "battery-distribution").detail, expected.battery, locale);
    assert.match(plan.find(({ id }) => id === "battery-inverter").detail, expected.inverter, locale);
    assert.match(plan.find(({ id }) => id === "battery-inverter").detail, expected.safety, locale);
    assert.match(plan.find(({ id }) => id === "starter-dcdc").detail, expected.dcDc, locale);
    assert.match(plan.find(({ id }) => id === "charger-battery").detail, expected.shore, locale);
    assert.ok(plan.every(({ detail }) => !detail.includes("undefined")), locale);
  }
});

test("keeps cable sizing explicitly limited to voltage-drop guidance", () => {
  const plan = buildInstallationPlan(COMPLETE_SETUP, "cs");
  const inverter = plan.find(({ id }) => id === "battery-inverter").detail;
  const dcDc = plan.find(({ id }) => id === "starter-dcdc").detail;
  assert.match(inverter, /pouze podle cíle úbytku/);
  assert.match(inverter, /pojistku předepsanou výrobcem/);
  assert.match(dcDc, /pouze podle cíle úbytku/);
  assert.match(dcDc, /jištění u zdroje/);
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
