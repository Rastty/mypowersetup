import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { expansionPurchaseRoutePriority } from "../src/expansion-purchase-route-priority.js";
import { COMMERCIAL_SCENARIOS, buildScenarioSetup } from "../src/commercial-scenarios.js";
import { buildPortugalRecommendations } from "../src/pt-recommendations.js";
import { buildRomaniaRecommendations } from "../src/ro-recommendations.js";
import { buildSloveniaRecommendations } from "../src/si-recommendations.js";

const setup = Object.freeze({
  locale: "pt",
  inverterWatts: 100,
});

function item(overrides = {}) {
  return { available: true, ...overrides };
}

test("portable route is primary when it is complete and component coverage is incomplete", () => {
  const result = expansionPurchaseRoutePriority({
    battery: [item()],
    solar_panel: [item()],
    controller: [item()],
    inverter: [],
    power_station: [item()],
  }, setup, "pt");

  assert.equal(result.coverage.complete, false);
  assert.deepEqual(result.coverage.missing, ["inverter"]);
  assert.equal(result.portableReady, true);
  assert.equal(result.preferPortable, true);
  assert.deepEqual(result.order, ["portable", "components"]);
});

test("component route stays primary when all required component categories are covered", () => {
  const result = expansionPurchaseRoutePriority({
    battery: [item()],
    solar_panel: [item()],
    controller: [item()],
    inverter: [item()],
    power_station: [item()],
  }, setup, "pt");

  assert.equal(result.coverage.complete, true);
  assert.equal(result.preferPortable, false);
  assert.deepEqual(result.order, ["components", "portable"]);
});

test("missing component coverage never promotes an unavailable portable product", () => {
  const result = expansionPurchaseRoutePriority({
    battery: [item()],
    solar_panel: [item()],
    controller: [item()],
    inverter: [],
    power_station: [item({ available: false })],
  }, setup, "pt");

  assert.equal(result.portableReady, false);
  assert.equal(result.preferPortable, false);
  assert.deepEqual(result.order, ["components", "portable"]);
});


test("current PT RO SI family journey promotes a verified complete portable fallback", async () => {
  const family = COMMERCIAL_SCENARIOS.find((scenario) => scenario.id === "family-touring");
  const fixtures = [
    ["products-pt.json", "pt", buildPortugalRecommendations],
    ["products-ro.json", "ro", buildRomaniaRecommendations],
    ["products-si.json", "sl", buildSloveniaRecommendations],
  ];

  for (const [file, locale, build] of fixtures) {
    const catalog = JSON.parse(await readFile(new URL(`../data/${file}`, import.meta.url), "utf8"));
    const setup = buildScenarioSetup(family, locale);
    const recommendations = build(catalog, setup, 3);
    const priority = expansionPurchaseRoutePriority(recommendations, setup, locale);

    assert.equal(priority.portableReady, true, `${catalog.market}: verified portable fallback missing`);
    assert.equal(priority.preferPortable, true, `${catalog.market}: incomplete components should promote portable route`);
    assert.equal(priority.order[0], "portable");
    assert.ok(priority.coverage.missing.includes("inverter"), `${catalog.market}: current P0 inverter gap should still be explicit`);
    assert.ok(priority.componentProductCount > 0, `${catalog.market}: partial component route should remain useful`);
  }
});
