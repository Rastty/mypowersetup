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
  return {
    id: suffix,
    merchant: "safe",
    category,
    available: true,
    name: suffix,
    categoryPath: category === "controller" ? "battery charge controllers" : "",
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
  }
});
