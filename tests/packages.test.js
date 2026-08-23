import test from "node:test";
import assert from "node:assert/strict";
import { buildProductPackages } from "../src/packages.js";

function item(id, priceCzk, score, fit, quantity = 1) {
  return { product: { id, name: id, priceCzk, recommendedQuantity: quantity }, score, fit };
}

test("builds distinct economy, recommended and reserve packages from compatible candidates", () => {
  const packages = buildProductPackages({
    battery: [item("battery-fit", 12000, 96, 1.05), item("battery-cheap", 9000, 82, 1.1), item("battery-reserve", 15000, 88, 1.25)],
    solar_panel: [item("panel-fit", 4000, 94, 1.02, 2), item("panel-cheap", 3000, 80, 1.1, 2), item("panel-reserve", 4500, 86, 1.24, 2)],
    controller: [item("mppt-fit", 3500, 95, 1.05), item("mppt-cheap", 2500, 81, 1.1), item("mppt-reserve", 4200, 87, 1.3)],
  }, { inverterWatts: 0 });
  assert.deepEqual(packages.map(({ id }) => id), ["economy", "recommended", "reserve"]);
  assert.deepEqual(packages[0].items.map(({ product }) => product.id), ["battery-cheap", "panel-cheap", "mppt-cheap"]);
  assert.equal(packages[0].totalPriceCzk, 17500);
  assert.deepEqual(packages[2].items.map(({ product }) => product.id), ["battery-reserve", "panel-reserve", "mppt-reserve"]);
});

test("omits inverter for a DC-only setup and removes duplicate variants", () => {
  const one = item("only", 1000, 90, 1.1);
  const packages = buildProductPackages({ battery: [one], solar_panel: [one], inverter: [one] }, { inverterWatts: 0 });
  assert.equal(packages.length, 1);
  assert.deepEqual(packages[0].items.map(({ category }) => category), ["battery", "solar_panel"]);
});

test("does not claim a package when catalogue coverage is too thin", () => {
  assert.deepEqual(buildProductPackages({ battery: [item("b", 1, 1, 1)] }, { inverterWatts: 0 }), []);
  assert.deepEqual(buildProductPackages(null, {}), []);
});

test("adds compatible DC-DC and shore chargers when charging is enabled", () => {
  const packages = buildProductPackages({
    battery: [item("battery", 10000, 95, 1.05)],
    solar_panel: [item("panel", 3000, 94, 1.04, 2)],
    controller: [item("mppt", 2500, 93, 1.08)],
    dc_charger: [item("dc-dc", 4500, 92, 1.1)],
    shore_charger: [item("shore", 3500, 91, 1.15)],
  }, {
    inverterWatts: 0,
    charging: {
      dcDc: { suggestedCurrentAmps: 30 },
      shore: { suggestedCurrentAmps: 20 },
    },
  });

  assert.deepEqual(packages[0].items.map(({ category }) => category), [
    "battery", "solar_panel", "controller", "dc_charger", "shore_charger",
  ]);
  assert.equal(packages[0].totalPriceCzk, 26500);
});

test("omits charger products when the calculated charging source is disabled", () => {
  const packages = buildProductPackages({
    battery: [item("battery", 10000, 95, 1.05)],
    solar_panel: [item("panel", 3000, 94, 1.04)],
    dc_charger: [item("dc-dc", 4500, 92, 1.1)],
    shore_charger: [item("shore", 3500, 91, 1.15)],
  }, {
    inverterWatts: 0,
    charging: { dcDc: { suggestedCurrentAmps: null }, shore: { suggestedCurrentAmps: null } },
  });

  assert.deepEqual(packages[0].items.map(({ category }) => category), ["battery", "solar_panel"]);
});
