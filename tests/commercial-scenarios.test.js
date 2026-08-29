import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  COMMERCIAL_SCENARIOS,
  assessCommercialScenario,
  assessMarketScenarioCoverage,
  buildScenarioSetup,
} from "../src/commercial-scenarios.js";

function product(category, suffix, specs = {}) {
  const productUrl = `https://shop.example/products/${suffix}`;
  const identity = {
    battery: { name: `LiFePO4 battery ${specs.voltageV || 12}V ${specs.capacityAh || 100}Ah`, categoryPath: "Batteries" },
    solar_panel: { name: `Portable solar panel ${specs.powerW || 100}W`, categoryPath: "Solar Panel" },
    controller: { name: `MPPT charge controller ${specs.currentA || 30}A`, categoryPath: "battery charge controllers" },
    inverter: { name: `Pure sine inverter ${specs.powerW || 1000}W 230V AC`, categoryPath: "Měniče napětí" },
  }[category] || { name: suffix, categoryPath: "" };
  return {
    id: suffix,
    merchant: "safe",
    category,
    available: true,
    name: identity.name,
    categoryPath: identity.categoryPath,
    description: "",
    productUrl,
    affiliateUrl: `https://affiliate.example/click?desturl=${encodeURIComponent(productUrl)}`,
    priceCzk: 100,
    specs,
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

test("missing exact-fit categories become weighted commercial opportunities", () => {
  const scenario = COMMERCIAL_SCENARIOS[0];
  const setup = buildScenarioSetup(scenario, "cs");
  const catalog = {
    market: "xx-XX",
    sources: { safe: { status: "ok" } },
    products: [
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

test("current public catalogs produce measurable commercial scenario coverage", async () => {
  const configs = [
    { market: "cs-CZ", locale: "cs", files: ["products.json", "products-ampul-cz.json"] },
    { market: "sk-SK", locale: "sk", files: ["products-sk.json"] },
    { market: "pl-PL", locale: "pl", files: ["products-pl.json"] },
    { market: "hu-HU", locale: "hu", files: ["products-hu.json"] },
  ];
  const benchmark = [];
  for (const config of configs) {
    const payloads = await Promise.all(config.files.map(async (file) => JSON.parse(await readFile(new URL(`../data/${file}`, import.meta.url), "utf8"))));
    const catalog = {
      market: config.market,
      sources: Object.assign({}, ...payloads.map((payload) => payload.sources || {})),
      products: payloads.flatMap((payload) => payload.products || []),
    };
    const report = assessMarketScenarioCoverage(catalog, config.locale);
    assert.equal(report.scenarioCount, COMMERCIAL_SCENARIOS.length);
    assert.ok(report.weightedCoverage > 0, `${config.market} should have non-zero weighted coverage`);
    assert.ok(report.purchaseReadyRatio >= 0 && report.purchaseReadyRatio <= 1);
    benchmark.push({
      market: config.market,
      purchaseReadyRatio: report.purchaseReadyRatio,
      weightedCoverage: report.weightedCoverage,
      opportunities: report.opportunities,
      scenarios: report.scenarios.map(({ id, purchaseReady, missing, chargingMissing }) => ({ id, purchaseReady, missing, chargingMissing })),
    });
  }
  console.log(`COMMERCIAL_SCENARIO_BENCHMARK:${JSON.stringify(benchmark)}`);
});
