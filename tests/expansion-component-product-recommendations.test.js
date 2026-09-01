import test from "node:test";
import assert from "node:assert/strict";
import { buildExpansionComponentRecommendations } from "../src/expansion-component-recommendations.js";
import { readFile } from "node:fs/promises";
import { COMMERCIAL_SCENARIOS, buildScenarioSetup } from "../src/commercial-scenarios.js";
import { buildPortugalRecommendations } from "../src/pt-recommendations.js";
import { buildRomaniaRecommendations } from "../src/ro-recommendations.js";
import { buildSloveniaRecommendations } from "../src/si-recommendations.js";

const productUrl = "https://www.ipowerqueen.de/en/products/power-queen-2000w-inverter-12v-dc-to-230v-ac-converter";
const affiliateUrl = new URL("https://www.awin1.com/cread.php");
affiliateUrl.searchParams.set("awinmid", "97025");
affiliateUrl.searchParams.set("awinaffid", "3044971");
affiliateUrl.searchParams.set("ued", productUrl);
const product = Object.freeze({
  id: "powerqueen_eu:inverter",
  merchant: "powerqueen_eu",
  name: "Power Queen 2000W pure sine inverter 12V to 230V",
  description: "Verified 2000 W continuous and 4000 W peak pure sine inverter.",
  categoryPath: "Inverters",
  category: "inverter",
  brand: "Power Queen",
  priceCzk: 199.99,
  priceCurrency: "EUR",
  available: true,
  productUrl,
  affiliateUrl: affiliateUrl.toString(),
  specs: Object.freeze({ voltageV: 12, powerW: 2000, pureSine: true }),
  verifiedAt: "2026-08-29",
});

test("expansion component recommendations surface an existing verified Power Queen inverter", () => {
  const recommendations = buildExpansionComponentRecommendations([product], {
    locale: "ro",
    systemVoltage: 12,
    inverterWatts: 1000,
    solarWatts: 400,
    controllerAmps: 30,
    batteryAh: 200,
    batteryType: "lifepo4",
  });
  assert.equal(recommendations.inverter.length, 1);
  assert.equal(recommendations.inverter[0].id, "powerqueen_eu:inverter");
  assert.equal(recommendations.inverter[0].specs.pureSine, true);

  const wrongVoltage = buildExpansionComponentRecommendations([product], {
    locale: "ro",
    systemVoltage: 24,
    inverterWatts: 1000,
    solarWatts: 400,
    controllerAmps: 30,
    batteryAh: 200,
    batteryType: "lifepo4",
  });
  assert.equal(wrongVoltage.inverter.length, 0);
});

test("current PT, RO and SI catalogs expose verified batteries and MPPT products to the result UI", async () => {
  const setup = buildScenarioSetup(COMMERCIAL_SCENARIOS[0], "pt");
  const fixtures = [
    [new URL("../data/products-pt.json", import.meta.url), buildPortugalRecommendations],
    [new URL("../data/products-ro.json", import.meta.url), buildRomaniaRecommendations],
    [new URL("../data/products-si.json", import.meta.url), buildSloveniaRecommendations],
  ];
  for (const [path, build] of fixtures) {
    const catalog = JSON.parse(await readFile(path, "utf8"));
    const recommendations = build(catalog, setup, 3);
    assert.ok(recommendations.battery.length > 0, `${catalog.market} must expose a battery`);
    assert.ok(recommendations.controller.length > 0, `${catalog.market} must expose an MPPT controller`);
  }
});
