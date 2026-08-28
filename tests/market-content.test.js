import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { MARKET_CONTENT, compressorFridgeDailyWh, inverterDcAmps, marketSolarScenarios, requiredBatteryAh, requiredChargingAmps, requiredInverterWatts, requiredSolarWp, shareOfUsableBattery } from "../src/market-content.js";
import { renderHungarianGuide } from "../src/guides-hu.js";
import { calculateBatteryCablePlan } from "../src/wiring.js";

const solarPages = {
  cs: "pruvodce/kolik-w-solarnich-panelu/index.html",
  sk: "sk/sprievodca/kolko-w-solarnych-panelov/index.html",
  pl: "pl/poradnik/ile-wat-paneli-solarnych-do-kampera/index.html",
};

test("market scenarios use the same conservative solar formula as the calculator", () => {
  assert.equal(requiredSolarWp(600, 4.5), 205);
  assert.equal(requiredSolarWp(500, 4.5), 171);
  assert.equal(requiredSolarWp(650, 3), 333);
  assert.equal(requiredSolarWp(850, 3), 435);
});

test("market battery scenarios use the shared reserve and chemistry limits", () => {
  assert.equal(requiredBatteryAh(600, 2, "lifepo4", 12), 144);
  assert.equal(requiredBatteryAh(600, 2, "lead", 12), 230);
  assert.equal(requiredBatteryAh(450, 2, "lifepo4", 12), 108);
  assert.equal(requiredBatteryAh(900, 2, "lifepo4", 12), 216);
});

test("market charging scenarios use the shared 90 percent efficiency", () => {
  assert.equal(requiredChargingAmps(500, 2.5), 19);
  assert.equal(requiredChargingAmps(1000, 10), 10);
  assert.equal(requiredChargingAmps(1200, 10), 12);
  assert.equal(requiredChargingAmps(500, 1.5), 31);
});

test("market inverter scenarios use the shared reserve and DC efficiency", () => {
  assert.equal(requiredInverterWatts(120), 150);
  assert.equal(requiredInverterWatts(1590), 1988);
  assert.equal(inverterDcAmps(1200), 112);
  assert.equal(inverterDcAmps(1590), 148);
});

test("fridge examples connect compressor duty cycle to usable battery energy", () => {
  assert.equal(compressorFridgeDailyWh(12, 5, 0.4), 576);
  assert.equal(shareOfUsableBattery(557), 58);
  assert.equal(shareOfUsableBattery(268), 28);
});

test("every localization has distinct terminology and two quantified local scenarios", () => {
  assert.deepEqual(Object.keys(MARKET_CONTENT), ["cs", "sk", "pl", "hu"]);
  const labels = [];
  for (const [locale, market] of Object.entries(MARKET_CONTENT)) {
    assert.ok(market.primaryTerms.length >= 2, `${locale} terminology`);
    const scenarios = marketSolarScenarios(locale);
    assert.equal(scenarios.length, 2);
    assert.equal(market.batteryScenarios.length, 2);
    assert.ok(market.chargingScenarios.dcDc.label);
    assert.ok(market.chargingScenarios.shore.label);
    assert.equal(market.inverterScenarios.length, 2);
    for (const scenario of scenarios) {
      assert.ok(scenario.requiredWp >= 150);
      labels.push(scenario.label);
    }
  }
  assert.equal(new Set(labels).size, labels.length, "local scenarios must not be translated duplicates");
});

test("inverter guides contain distinct local use cases and a battery-side bottleneck check", async () => {
  const files = {
    cs: "pruvodce/jak-velky-menic-do-karavanu/index.html",
    sk: "sk/sprievodca/aky-velky-menic-do-karavanu/index.html",
    pl: "pl/poradnik/jak-dobrac-przetwornice-do-kampera/index.html",
  };
  for (const [locale, file] of Object.entries(files)) {
    const html = await readFile(file, "utf8");
    for (const scenario of MARKET_CONTENT[locale].inverterScenarios) assert.ok(html.includes(scenario.label));
    assert.match(html, /BMS/);
  }
  const hungarian = renderHungarianGuide("inverter");
  for (const scenario of MARKET_CONTENT.hu.inverterScenarios) assert.ok(hungarian.includes(scenario.label));
  assert.match(hungarian, /BMS/);
});

test("wiring guides keep local high-current examples inside the shared voltage-drop model", async () => {
  const files = {
    cs: "pruvodce/kabely-a-pojistky-12-v/index.html",
    sk: "sk/sprievodca/kable-a-poistky-12-v/index.html",
    pl: "pl/poradnik/przewody-i-bezpieczniki-12-v/index.html",
  };
  for (const [locale, file] of Object.entries(files)) {
    const scenario = MARKET_CONTENT[locale].wiringScenario;
    const plan = calculateBatteryCablePlan({ inverterWatts: scenario.inverterWatts, systemVoltage: scenario.voltage, oneWayLengthMeters: scenario.oneWayMeters });
    const html = await readFile(file, "utf8");
    assert.ok(html.includes(scenario.label));
    assert.ok(html.includes(`${plan.recommendedCrossSectionMm2} mm²`));
    assert.match(html, /[Zz]atížitelnost|zaťažiteľnosť|obciążalność/);
  }
  const scenario = MARKET_CONTENT.hu.wiringScenario;
  const plan = calculateBatteryCablePlan({ inverterWatts: scenario.inverterWatts, systemVoltage: scenario.voltage, oneWayLengthMeters: scenario.oneWayMeters });
  const hungarian = renderHungarianGuide("wiring");
  assert.ok(hungarian.includes(scenario.label));
  assert.ok(hungarian.includes(`${plan.recommendedCrossSectionMm2} mm²`));
  assert.match(hungarian, /terhelhetőség/);
});

test("fridge guides contain distinct local weather decisions and existing-battery impact", async () => {
  const files = {
    cs: "pruvodce/spotreba-kompresorove-lednice/index.html",
    sk: "sk/sprievodca/spotreba-kompresorovej-chladnicky/index.html",
    pl: "pl/poradnik/zuzycie-lodowki-kompresorowej/index.html",
  };
  const labels = [];
  for (const [locale, file] of Object.entries(files)) {
    const html = await readFile(file, "utf8");
    for (const scenario of MARKET_CONTENT[locale].fridgeScenarios) {
      assert.ok(html.includes(scenario.label));
      assert.ok(html.includes(scenario.usableBatteryShare));
      labels.push(scenario.label);
    }
    assert.match(html, /100\s?Ah/);
  }
  const hungarian = renderHungarianGuide("fridge");
  for (const scenario of MARKET_CONTENT.hu.fridgeScenarios) {
    assert.ok(hungarian.includes(scenario.label));
    assert.ok(hungarian.includes(scenario.usableBatteryShare));
    labels.push(scenario.label);
  }
  assert.equal(new Set(labels).size, labels.length);
});

test("charging guides contain distinct local driving and campsite decisions", async () => {
  const files = {
    cs: ["pruvodce/jak-vybrat-dc-dc-nabijecku/index.html", "pruvodce/jak-vybrat-nabijecku-230-v/index.html"],
    sk: ["sk/sprievodca/ako-vybrat-dc-dc-nabijacku/index.html", "sk/sprievodca/ako-vybrat-nabijacku-230-v/index.html"],
    pl: ["pl/poradnik/jak-dobrac-ladowarke-dc-dc/index.html", "pl/poradnik/jak-dobrac-ladowarke-230-v/index.html"],
  };
  for (const [locale, [dcFile, shoreFile]] of Object.entries(files)) {
    const [dcHtml, shoreHtml] = await Promise.all([readFile(dcFile, "utf8"), readFile(shoreFile, "utf8")]);
    assert.ok(dcHtml.includes(MARKET_CONTENT[locale].chargingScenarios.dcDc.label));
    assert.ok(shoreHtml.includes(MARKET_CONTENT[locale].chargingScenarios.shore.label));
  }
  assert.ok(renderHungarianGuide("dcDc").includes(MARKET_CONTENT.hu.chargingScenarios.dcDc.label));
  assert.ok(renderHungarianGuide("shore").includes(MARKET_CONTENT.hu.chargingScenarios.shore.label));
});

test("battery guides contain distinct local scenarios and an existing-setup decision", async () => {
  const files = {
    cs: "pruvodce/kapacita-baterie-do-karavanu/index.html",
    sk: "sk/sprievodca/kapacita-baterie-do-karavanu/index.html",
    pl: "pl/poradnik/pojemnosc-akumulatora-do-kampera/index.html",
  };
  for (const [locale, file] of Object.entries(files)) {
    const html = await readFile(file, "utf8");
    for (const scenario of MARKET_CONTENT[locale].batteryScenarios) assert.ok(html.includes(scenario.label));
    assert.match(html, /100\s?Ah/);
  }
  const hungarian = renderHungarianGuide("battery");
  for (const scenario of MARKET_CONTENT.hu.batteryScenarios) assert.ok(hungarian.includes(scenario.label));
});

test("published solar guides contain their market scenarios and official location check", async () => {
  for (const [locale, file] of Object.entries(solarPages)) {
    const html = await readFile(file, "utf8");
    for (const scenario of MARKET_CONTENT[locale].solarScenarios) assert.ok(html.includes(scenario.label));
    assert.ok(html.includes("joint-research-centre.ec.europa.eu/photovoltaic-geographical-information-system-pvgis"));
  }
});

test("private Hungarian solar guide contains Hungarian scenarios and PVGIS guidance", () => {
  const html = renderHungarianGuide("solar");
  for (const scenario of MARKET_CONTENT.hu.solarScenarios) assert.ok(html.includes(scenario.label));
  assert.ok(html.includes("PVGIS"));
  assert.ok(html.includes("joint-research-centre.ec.europa.eu/photovoltaic-geographical-information-system-pvgis"));
});
