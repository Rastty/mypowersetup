import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { expansionPowerStationSpecs } from "../src/expansion-product-specs.js";
import { buildPortugalRecommendations } from "../src/pt-recommendations.js";

test("portable recommendation card shows all four verified electrical limits", () => {
  const item = { category: "power_station", capacityWh: 3456, powerW: 4000, solarInputW: 2000, dcOutputA: 10 };
  assert.equal(expansionPowerStationSpecs(item), "3456 Wh · 4000 W · PV 2000 W · 12 V 10 A");
});

test("actual Portugal R4000 result retains source-verified PV and 12 V output specs", () => {
  const catalog = JSON.parse(readFileSync(new URL("../data/products-pt.json", import.meta.url), "utf8"));
  const result = buildPortugalRecommendations(catalog, {
    dailyWh: 860, autonomyDays: 1, solarWatts: 300, inverterWatts: 100,
    applianceRows: [{ ac: true, watts: 65, quantity: 1 }],
  });
  const r4000 = result.power_station.find(item => item.name.includes("R4000"));
  assert.ok(r4000, "the live-compatible R4000 must remain recommended");
  assert.equal(expansionPowerStationSpecs(r4000), "3456 Wh · 4000 W · PV 2000 W · 12 V 10 A");
});

test("partial portable DTO never invents optional PV or 12 V outputs", () => {
  assert.equal(expansionPowerStationSpecs({ category: "power_station", capacityWh: 3456, powerW: 4000 }), "3456 Wh · 4000 W");
  assert.equal(expansionPowerStationSpecs({ category: "power_station", capacityWh: 1000, powerW: NaN, solarInputW: Infinity, dcOutputA: 0 }), "1000 Wh");
  assert.equal(expansionPowerStationSpecs({ category: "power_station", specs: { capacityWh: 512, powerW: 600, solarInputW: 200, dcOutputA: 8 } }), "512 Wh · 600 W · PV 200 W · 12 V 8 A");
  assert.equal(expansionPowerStationSpecs({ category: "battery", capacityWh: 1000 }), "");
  assert.equal(expansionPowerStationSpecs(null), "");
});

test("expansion browser renders portable cards with the guarded spec formatter", () => {
  const browser = readFileSync(new URL("../src/expansion-calculator-browser.js", import.meta.url), "utf8");
  assert.match(browser, /import \{ expansionPowerStationSpecs \} from "\.\/expansion-product-specs\.js\?v=20261117-pv-check1";/);
  assert.match(browser, /if \(item\.category === "power_station"\) return expansionPowerStationSpecs\(item\)/);
});
