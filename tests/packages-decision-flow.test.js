import test from "node:test";
import assert from "node:assert/strict";
import { buildProductPackages } from "../src/packages.js";

function item(id, priceCzk, score, fit, quantity = 1) {
  return { product: { id, name: id, priceCzk, recommendedQuantity: quantity }, score, fit };
}

const dcOnlySetup = {
  inverterWatts: 0,
  charging: { dcDc: {}, shore: {} },
};

test("economy package stays inside a safe recommendation-score band", () => {
  const packages = buildProductPackages({
    battery: [
      item("battery-best", 10000, 95, 1.05),
      item("battery-too-cheap", 1000, 50, 1.08),
    ],
    solar_panel: [
      item("panel-best", 4000, 94, 1.03, 2),
      item("panel-value", 3000, 90, 1.08, 2),
    ],
    controller: [
      item("mppt-best", 3000, 93, 1.04),
      item("mppt-value", 2200, 89, 1.09),
    ],
  }, dcOnlySetup);

  const economy = packages.find(({ id }) => id === "economy");
  const recommended = packages.find(({ id }) => id === "recommended");

  assert.ok(economy);
  assert.ok(recommended);
  assert.equal(economy.items.find(({ category }) => category === "battery")?.product.id, "battery-best");
  assert.equal(economy.items.find(({ category }) => category === "solar_panel")?.product.id, "panel-value");
  assert.equal(economy.items.find(({ category }) => category === "controller")?.product.id, "mppt-value");
  assert.deepEqual(economy.purchaseSequence, ["battery", "solar_panel", "controller"]);
  assert.equal(economy.matchScore, 91);
  assert.equal(economy.minimumItemScore, 89);
});

test("recommended package is preserved when budget and reserve collapse to the same basket", () => {
  const packages = buildProductPackages({
    battery: [item("battery", 10000, 95, 1.05)],
    solar_panel: [item("panel", 3000, 94, 1.04)],
    controller: [item("mppt", 2500, 93, 1.08)],
  }, dcOnlySetup);

  assert.deepEqual(packages.map(({ id }) => id), ["recommended"]);
  assert.equal(packages[0].matchScore, 94);
  assert.equal(packages[0].minimumItemScore, 93);
});

test("package score metadata is normalized to a user-facing 0-100 scale", () => {
  const packages = buildProductPackages({
    battery: [item("battery", 10000, 140, 1.05)],
    solar_panel: [item("panel", 3000, 110, 1.04)],
    controller: [item("mppt", 2500, 105, 1.08)],
  }, dcOnlySetup);

  assert.equal(packages[0].matchScore, 100);
  assert.equal(packages[0].minimumItemScore, 100);
});
