import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { recommendProducts } from "../src/products.js";

const catalog = JSON.parse(
  await readFile(new URL("../data/products.json", import.meta.url), "utf8")
);

const scenarios = [
  {
    name: "běžná 12V LiFePO4 sestava",
    setup: {
      locale: "cs",
      systemVoltage: 12,
      batteryAh: 100,
      batteryType: "lifepo4",
      solarWatts: 200,
      inverterWatts: 800,
      controllerAmps: 20,
      charging: {
        starterVoltage: 12,
        dcDc: { suggestedCurrentAmps: 20 },
        shore: { suggestedCurrentAmps: 15 }
      }
    }
  },
  {
    name: "větší 12V AGM sestava",
    setup: {
      locale: "cs",
      systemVoltage: 12,
      batteryAh: 200,
      batteryType: "lead",
      solarWatts: 400,
      inverterWatts: 1000,
      controllerAmps: 40,
      charging: {
        starterVoltage: 12,
        dcDc: { suggestedCurrentAmps: 20 },
        shore: { suggestedCurrentAmps: 15 }
      }
    }
  }
];

for (const scenario of scenarios) {
  test(`catalog covers ${scenario.name}`, () => {
    const recommendations = recommendProducts(catalog.products, scenario.setup);
    for (const category of ["battery", "solar_panel", "inverter", "controller", "dc_charger", "shore_charger"]) {
      assert.ok(
        recommendations[category].length > 0,
        `${scenario.name} nemá doporučení pro kategorii ${category}`
      );
    }
    assert.ok(
      recommendations.battery.every(({ product }) =>
        product.specs.voltageV === scenario.setup.systemVoltage
        && product.specs.batteryType === scenario.setup.batteryType
      )
    );
    assert.ok(
      recommendations.inverter.every(({ product }) =>
        product.specs.voltageV === scenario.setup.systemVoltage
        && product.specs.pureSine === true
      )
    );
  });
}
