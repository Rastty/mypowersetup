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


test("10A Power Queen shore charger covers a 12V LiFePO4 shore-charging recommendation", () => {
  const chargerUrl = "https://www.ipowerqueen.de/en/products/power-queen-14-6v-10a-lifepo4-battery-charger";
  const tracked = new URL("https://www.awin1.com/cread.php");
  tracked.searchParams.set("awinmid", "97025");
  tracked.searchParams.set("awinaffid", "3044971");
  tracked.searchParams.set("ued", chargerUrl);

  const charger = {
    id: "powerqueen_eu:10a-charger",
    merchant: "powerqueen_eu",
    name: "Power Queen 14.6V 10A LiFePO4 charger for 12V LiFePO4 battery",
    description: "100-240 V AC input; 14.6 V / 10 A output for 12.8 V LiFePO4 batteries.",
    categoryPath: "Nabíječky",
    category: "shore_charger",
    brand: "Power Queen",
    priceCzk: 71.99,
    priceCurrency: "EUR",
    available: true,
    marketEligible: true,
    productUrl: chargerUrl,
    affiliateUrl: tracked.toString(),
    specs: {
      voltageV: 12,
      currentA: 10,
      chargingVoltagesV: [12],
      chargingBatteryTypes: ["lifepo4"],
      batteryType: "lifepo4",
    },
    verifiedAt: "2026-09-07",
  };

  const recommendations = buildExpansionComponentRecommendations([charger], {
    locale: "pt",
    systemVoltage: 12,
    inverterWatts: 0,
    solarWatts: 200,
    controllerAmps: 20,
    batteryAh: 100,
    batteryType: "lifepo4",
    charging: {
      starterVoltage: 12,
      dcDc: { suggestedCurrentAmps: null },
      shore: { suggestedCurrentAmps: 10 },
    },
  });

  assert.equal(recommendations.shore_charger.length, 1);
  assert.equal(recommendations.shore_charger[0].id, "powerqueen_eu:10a-charger");
  assert.equal(recommendations.shore_charger[0].specs.currentA, 10);

  const tooSmall = buildExpansionComponentRecommendations([charger], {
    locale: "pt",
    systemVoltage: 12,
    inverterWatts: 0,
    solarWatts: 200,
    controllerAmps: 20,
    batteryAh: 100,
    batteryType: "lifepo4",
    charging: {
      starterVoltage: 12,
      dcDc: { suggestedCurrentAmps: null },
      shore: { suggestedCurrentAmps: 15 },
    },
  });
  assert.equal(tooSmall.shore_charger.length, 0);
});
