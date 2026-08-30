import test from "node:test";
import assert from "node:assert/strict";
import { refreshCatalogProduct, recommendProducts } from "../src/products.js";

const ampul24 = {
  id: "ampul_sk:5577-7392",
  merchant: "ampul_sk",
  name: "Menič napätia z DC na 230V AC, 50Hz, 2000W - 24 V DC",
  description: "Invertor",
  categoryPath: "Meniče napätia",
  category: "inverter",
  available: null,
  specs: { voltageV: 24, powerW: 2000, pureSine: true }
};

test("refresh preserves verified Ampul inverter variant voltage and pure sine evidence", () => {
  const refreshed = refreshCatalogProduct(ampul24);
  assert.equal(refreshed.specs.voltageV, 24);
  assert.equal(refreshed.specs.pureSine, true);
  assert.equal(refreshed.category, "inverter");
});

test("24 V Ampul 2000 W inverter remains eligible for a 1700 W setup after refresh", () => {
  const recommendations = recommendProducts([ampul24], {
    locale: "sk", systemVoltage: 24, inverterWatts: 1700,
    solarWatts: 0, controllerAmps: 0, batteryAh: 0, batteryType: "lifepo4",
    charging: { dcDc: { suggestedCurrentAmps: null }, shore: { suggestedCurrentAmps: null } }
  });
  assert.equal(recommendations.inverter.length, 1);
  assert.equal(recommendations.inverter[0].product.id, ampul24.id);
});
