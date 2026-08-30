import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  COMMERCIAL_SCENARIOS,
  PUBLIC_SCENARIO_BASELINES,
  assessCommercialScenario,
  assessMarketScenarioCoverage,
  assessScenarioBaseline,
  buildScenarioSetup,
} from "../src/commercial-scenarios.js";
import { acquisitionRequirement } from "../src/acquisition-requirements.js";

function product(category, suffix, specs = {}) {
  const productUrl = `https://shop.example/products/${suffix}`;
  const identity = {
    battery: { name: `LiFePO4 battery ${specs.voltageV || 12}V ${specs.capacityAh || 100}Ah`, categoryPath: "Batteries" },
    solar_panel: { name: `Portable solar panel ${specs.powerW || 100}W`, categoryPath: "Solar Panel" },
    controller: { name: `MPPT charge controller ${specs.currentA || 30}A`, categoryPath: "battery charge controllers" },
    inverter: { name: `Pure sine inverter ${specs.powerW || 1000}W 230V AC`, categoryPath: "Měniče napětí" },
  }[category] || { name: suffix, categoryPath: "" };
  return {
    id: suffix, merchant: "safe", category, available: true, name: identity.name, categoryPath: identity.categoryPath,
    description: "", productUrl, affiliateUrl: `https://affiliate.example/click?desturl=${encodeURIComponent(productUrl)}`, priceCzk: 100, specs,
  };
}

test("scenario suite covers light, AC, seasonal and high-power demand", () => {
  assert.equal(COMMERCIAL_SCENARIOS.length, 6);
  const ids = COMMERCIAL_SCENARIOS.map((scenario) => scenario.id);
  assert.deepEqual(ids, ["light-weekend", "family-touring", "remote-work", "coffee-offgrid", "winter-basic", "high-power-tools"]);
  const setups = COMMERCIAL_SCENARIOS.map((scenario) => buildScenarioSetup(scenario, "cs"));
  assert.ok(setups.some((setup) => setup.inverterWatts === 0));
  assert.ok(setups.some((setup) => setup.inverterWatts > 0));
  assert.ok(setups.some((setup) => setup.systemVoltage === 24));
});

test("acquisition requirements mirror the real recommender fit window", () => {
  const family = buildScenarioSetup(COMMERCIAL_SCENARIOS.find((item) => item.id === "family-touring"), "sk");
  const highPower = buildScenarioSetup(COMMERCIAL_SCENARIOS.find((item) => item.id === "high-power-tools"), "sk");
  const winter = buildScenarioSetup(COMMERCIAL_SCENARIOS.find((item) => item.id === "winter-basic"), "sk");
  assert.deepEqual(acquisitionRequirement("inverter", family), {
    category: "inverter", systemVoltage: 12, waveform: "pure_sine", minContinuousPowerW: 100, maxContinuousPowerW: 300,
  });
  assert.deepEqual(acquisitionRequirement("inverter", highPower), {
    category: "inverter", systemVoltage: 24, waveform: "pure_sine", minContinuousPowerW: 1700, maxContinuousPowerW: 5100,
  });
  assert.deepEqual(acquisitionRequirement("battery", winter), {
    category: "battery", systemVoltage: 12, batteryType: "lifepo4", minCapacityAh: 210, maxCapacityAh: 630,
  });
});

test("missing exact-fit categories include machine-readable acquisition specs", () => {
  const scenario = COMMERCIAL_SCENARIOS[1];
  const result = assessCommercialScenario({ market: "xx-XX", sources: {}, products: [] }, scenario, "sk");
  const inverter = result.missingRequirements.find((item) => item.category === "inverter");
  assert.deepEqual(inverter, { category: "inverter", systemVoltage: 12, waveform: "pure_sine", minContinuousPowerW: 100, maxContinuousPowerW: 300 });
  const dcDc = result.chargingMissingRequirements.find((item) => item.category === "dc_charger");
  assert.equal(dcDc.inputVoltage, 12);
  assert.equal(dcDc.outputVoltage, 12);
  assert.equal(dcDc.batteryType, "lifepo4");
  assert.ok(dcDc.minCurrentA > 0);
  assert.equal(dcDc.maxCurrentA, dcDc.minCurrentA * 3);
});

test("missing exact-fit categories become weighted commercial opportunities", () => {
  const scenario = COMMERCIAL_SCENARIOS[0];
  const setup = buildScenarioSetup(scenario, "cs");
  const catalog = {
    market: "xx-XX", sources: { safe: { status: "ok" } }, products: [
      product("battery", "battery", { voltageV: setup.systemVoltage, capacityAh: setup.batteryAh, batteryType: "lifepo4" }),
      product("solar_panel", "solar", { powerW: setup.solarWatts }),
    ],
  };
  const result = assessCommercialScenario(catalog, scenario, "cs");
  assert.equal(result.purchaseReady, false);
  assert.deepEqual(result.missing, ["controller"]);
  const report = assessMarketScenarioCoverage(catalog, "cs", [scenario]);
  assert.equal(report.purchaseReadyRatio, 0);
  assert.equal(report.opportunities[0].category, "controller");
  assert.equal(report.opportunities[0].score, scenario.weight);
});

test("baseline assessment fails closed on missing baseline and measurable regression", () => {
  const missing = assessScenarioBaseline({ market: "xx-XX", purchaseReadyRatio: 1, weightedCoverage: 1 });
  assert.equal(missing.ready, false);
  assert.match(missing.blockers[0], /SCENARIO_BASELINE_MISSING/);
  const regression = assessScenarioBaseline({ market: "cs-CZ", purchaseReadyRatio: 0.5, weightedCoverage: 0.7 }, { minPurchaseReadyRatio: 0.78, minWeightedCoverage: 0.94 });
  assert.equal(regression.ready, false);
  assert.deepEqual(regression.blockers.map((item) => item.split(":")[0]), ["PURCHASE_READY_REGRESSION", "WEIGHTED_COVERAGE_REGRESSION"]);
});

test("current public catalogs meet their commercial scenario no-regression floors", async () => {
  const configs = [
    { market: "cs-CZ", locale: "cs", files: ["products.json", "products-ampul-cz.json"] },
    { market: "sk-SK", locale: "sk", files: ["products-sk.json"] },
    { market: "pl-PL", locale: "pl", files: ["products-pl.json"] },
    { market: "hu-HU", locale: "hu", files: ["products-hu.json"] },
  ];
  for (const config of configs) {
    const payloads = await Promise.all(config.files.map(async (file) => JSON.parse(await readFile(new URL(`../data/${file}`, import.meta.url), "utf8"))));
    const catalog = { market: config.market, sources: Object.assign({}, ...payloads.map((payload) => payload.sources || {})), products: payloads.flatMap((payload) => payload.products || []) };
    const report = assessMarketScenarioCoverage(catalog, config.locale);
    assert.equal(report.scenarioCount, COMMERCIAL_SCENARIOS.length);
    assert.ok(report.weightedCoverage > 0, `${config.market} should have non-zero weighted coverage`);
    assert.ok(report.purchaseReadyRatio >= 0 && report.purchaseReadyRatio <= 1);
    assert.ok(PUBLIC_SCENARIO_BASELINES[config.market]);
    const baseline = assessScenarioBaseline(report);
    assert.equal(baseline.ready, true, `${config.market}: ${baseline.blockers.join(", ")}`);
  }
});
