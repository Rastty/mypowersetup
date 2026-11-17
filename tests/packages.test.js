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
  assert.deepEqual(packages.map(({ id }) => id), ["recommended", "economy", "reserve"]);
  assert.deepEqual(packages[0].items.map(({ product }) => product.id), ["battery-fit", "panel-fit", "mppt-fit"]);
  assert.equal(packages[0].requiredCategoryCount, 3);
  assert.equal(packages[0].items.length, packages[0].requiredCategoryCount);
  assert.deepEqual(packages[1].items.map(({ product }) => product.id), ["battery-cheap", "panel-cheap", "mppt-cheap"]);
  assert.equal(packages[1].totalPriceCzk, 17500);
  assert.deepEqual(packages[2].items.map(({ product }) => product.id), ["battery-reserve", "panel-reserve", "mppt-reserve"]);
});

test("recommended solar basket avoids a 4x-priced exact-fit folding panel when a sound fixed array exists", () => {
  const expensiveFolding = item("folding-200w", 16229, 88, 1, 1);
  expensiveFolding.product.priceCurrency = "CZK";
  const fixedArray = item("fixed-130w", 1947, 74, 1.3, 2);
  fixedArray.product.priceCurrency = "CZK";
  const packages = buildProductPackages({
    battery: [item("battery", 12000, 95, 1.05)],
    solar_panel: [expensiveFolding, fixedArray],
    controller: [item("mppt", 2404, 95, 1.1)],
  }, { inverterWatts: 0 });

  assert.equal(packages[0].id, "recommended");
  assert.equal(packages[0].items.find(({ category }) => category === "solar_panel").product.id, "fixed-130w");
  assert.equal(packages[0].items.find(({ category }) => category === "solar_panel").product.recommendedQuantity, 2);
  assert.equal(packages.filter(({ id }) => id === "economy").length, 0, "do not repeat the same basket under a second label");
});

test("recommended solar guard preserves technical fit, price evidence and local currency", () => {
  const strong = item("single-200w", 12000, 93, 1);
  strong.product.priceCurrency = "CZK";
  const base = {
    battery: [item("battery", 12000, 95, 1.05)],
    controller: [item("mppt", 2404, 95, 1.1)],
  };
  const selected = (other) => buildProductPackages({
    ...base, solar_panel: [strong, other],
  }, { inverterWatts: 0 })[0].items.find(({ category }) => category === "solar_panel").product.id;

  const betterPrice = item("two-fixed", 1500, 80, 1.3, 2);
  betterPrice.product.priceCurrency = "CZK";
  assert.equal(selected(betterPrice), "two-fixed");

  const wrongCurrency = { ...betterPrice, product: { ...betterPrice.product, priceCurrency: "EUR" } };
  assert.equal(selected(wrongCurrency), "single-200w");
  const unknownPrice = { ...betterPrice, product: { ...betterPrice.product, priceCzk: null } };
  assert.equal(selected(unknownPrice), "single-200w");
  assert.equal(selected({ ...betterPrice, score: 65 }), "single-200w");
  assert.equal(selected({ ...betterPrice, fit: 1.9 }), "single-200w");
  const modestSaving = { ...betterPrice, product: { ...betterPrice.product, priceCzk: 3500 } };
  assert.equal(selected(modestSaving), "single-200w");
});

test("economy never compares nominal prices across currencies within one category", () => {
  const highFit = item("battery-eur-high-fit", 400, 96, 1.05);
  highFit.product.priceCurrency = "EUR";
  const euroSaving = item("battery-eur-value", 380, 90, 1.12);
  euroSaving.product.priceCurrency = "EUR";
  const misleadingCzk = item("battery-czk-numeric-cheap", 200, 93, 1.12);
  misleadingCzk.product.priceCurrency = "CZK";
  const panel = item("panel", 120, 94, 1.08);
  panel.product.priceCurrency = "EUR";
  const mppt = item("mppt", 60, 94, 1.1);
  mppt.product.priceCurrency = "EUR";

  const variants = buildProductPackages({
    battery: [highFit, misleadingCzk, euroSaving],
    solar_panel: [panel],
    controller: [mppt],
  }, { inverterWatts: 0 });
  assert.equal(variants.find(({ id }) => id === "recommended").items[0].product.id, "battery-eur-high-fit");
  assert.equal(variants.find(({ id }) => id === "economy").items[0].product.id, "battery-eur-value");
  assert.equal(variants.find(({ id }) => id === "economy").totalCurrency, "EUR");
  assert.equal(variants.find(({ id }) => id === "economy").totalPriceCzk, 560);
});

test("omits inverter for a DC-only setup and removes duplicate variants", () => {
  const one = item("only", 1000, 90, 1.1);
  const packages = buildProductPackages({ battery: [one], solar_panel: [one], controller: [one], inverter: [one] }, { inverterWatts: 0 });
  assert.equal(packages.length, 1);
  assert.deepEqual(packages[0].items.map(({ category }) => category), ["battery", "solar_panel", "controller"]);
});

test("does not claim a package when catalogue coverage is too thin", () => {
  assert.deepEqual(buildProductPackages({ battery: [item("b", 1, 1, 1)] }, { inverterWatts: 0 }), []);
  assert.deepEqual(buildProductPackages(null, {}), []);
});

test("does not present a partial catalogue as a complete package", () => {
  const recommendations = {
    battery: [item("battery", 10000, 10, 1)],
    solar_panel: [item("solar", 5000, 9, 1)],
    inverter: [item("inverter", 7000, 8, 1)],
  };
  const setup = { inverterWatts: 800, charging: { dcDc: {}, shore: {} } };
  assert.deepEqual(buildProductPackages(recommendations, setup), []);
});

test("does not count stale or unavailable candidates as package coverage", () => {
  const staleController = item("stale-controller", 2500, 99, 1.05);
  staleController.product.staleSource = true;
  const unavailableController = item("unavailable-controller", 2400, 98, 1.04);
  unavailableController.product.available = false;
  const base = {
    battery: [item("battery", 10000, 95, 1.05)],
    solar_panel: [item("panel", 3000, 94, 1.04)],
  };

  assert.deepEqual(buildProductPackages({ ...base, controller: [staleController] }, { inverterWatts: 0 }), []);
  assert.deepEqual(buildProductPackages({ ...base, controller: [unavailableController] }, { inverterWatts: 0 }), []);
});

test("never selects a stale candidate when an eligible alternative exists", () => {
  const staleCheapBattery = item("stale-cheap-battery", 1000, 99, 1.1);
  staleCheapBattery.product.staleSource = true;
  const freshBattery = item("fresh-battery", 10000, 90, 1.1);

  const packages = buildProductPackages({
    battery: [staleCheapBattery, freshBattery],
    solar_panel: [item("panel", 3000, 94, 1.04)],
    controller: [item("mppt", 2500, 93, 1.08)],
  }, { inverterWatts: 0 });

  assert.ok(packages.length > 0);
  for (const variant of packages) {
    assert.equal(variant.items.find(({ category }) => category === "battery")?.product.id, "fresh-battery");
  }
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
    controller: [item("mppt", 2500, 93, 1.08)],
    dc_charger: [item("dc-dc", 4500, 92, 1.1)],
    shore_charger: [item("shore", 3500, 91, 1.15)],
  }, {
    inverterWatts: 0,
    charging: { dcDc: { suggestedCurrentAmps: null }, shore: { suggestedCurrentAmps: null } },
  });

  assert.deepEqual(packages[0].items.map(({ category }) => category), ["battery", "solar_panel", "controller"]);
});

test("missing or zero feed prices are not treated as free purchases or valid package totals", () => {
  for (const missing of [null, undefined, "", 0]) {
    const battery = item("battery-priced", 10000, 95, 1.1);
    const mppt = item("mppt-without-price", missing, 93, 1.1);
    const panel = item("panel-priced", 2000, 91, 1.1);
    const [variant] = buildProductPackages({
      battery:[battery], solar_panel:[panel], controller:[mppt],
    }, {inverterWatts:0});
    assert.equal(variant.totalPriceCzk, null, "must not print a fake full-system price for "+String(missing));
  }
  const cheapUnknown = item("unknown-price", null, 80, 1.1);
  const known = item("known-price", 3000, 90, 1.08);
  const recommended = buildProductPackages({
    battery:[known,cheapUnknown],
    solar_panel:[item("panel",2000,92,1.1)],
    controller:[item("mppt",1200,93,1.1)]
  }, {inverterWatts:0});
  assert.equal(recommended[0].items[0].product.id, "known-price");
  assert.ok(recommended.every(v=>v.totalPriceCzk===null || v.totalPriceCzk >= 6200));
});

test("does not add prices expressed in different currencies", () => {
  const battery = item("battery", 1000, 95, 1.05);
  battery.product.priceCurrency = "PLN";
  const panel = item("panel", 250, 94, 1.04);
  panel.product.priceCurrency = "EUR";
  const controller = item("controller", 300, 93, 1.08);
  controller.product.priceCurrency = "PLN";
  const [variant] = buildProductPackages({ battery: [battery], solar_panel: [panel], controller: [controller] }, { inverterWatts: 0 });

  assert.equal(variant.totalPriceCzk, null);
  assert.equal(variant.totalCurrency, null);
  assert.deepEqual(variant.priceSubtotals, [
    { currency: "PLN", amount: 1300 },
    { currency: "EUR", amount: 250 },
  ]);
  assert.equal(variant.unpricedItemCount, 0);
});

test("currency-grouped subtotals use complete multi-unit line prices", () => {
  const battery = item("battery-eur", 409.99, 95, 1.05);
  battery.product.priceCurrency = "EUR";
  const panels = item("two-panels-czk", 1947, 94, 1.04, 2);
  panels.product.priceCurrency = "CZK";
  const controller = item("controller-czk", 2404, 93, 1.08);
  controller.product.priceCurrency = "CZK";
  const [variant] = buildProductPackages({ battery: [battery], solar_panel: [panels], controller: [controller] }, { inverterWatts: 0 });
  assert.equal(variant.totalPriceCzk, null);
  assert.deepEqual(variant.priceSubtotals, [
    { currency: "EUR", amount: 409.99 },
    { currency: "CZK", amount: 6298 },
  ]);
  assert.equal(variant.unpricedItemCount, 0);
});

test("partial package reports known subtotals without disguising unknown or missing currency", () => {
  const battery = item("battery", 400, 95, 1.05);
  battery.product.priceCurrency = "EUR";
  const panels = item("panels", 2000, 94, 1.04, 2);
  panels.product.priceCurrency = "CZK";
  const controller = item("controller", null, 93, 1.08);
  controller.product.priceCurrency = "CZK";
  const [variant] = buildProductPackages({ battery: [battery], solar_panel: [panels], controller: [controller] }, { inverterWatts: 0 });
  assert.equal(variant.totalPriceCzk, null);
  assert.deepEqual(variant.priceSubtotals, [
    { currency: "EUR", amount: 400 },
    { currency: "CZK", amount: 4000 },
  ]);
  assert.equal(variant.unpricedItemCount, 1);

  const unknownCurrency = item("unknown-currency-panel", 2500, 94, 1.04);
  const [mixed] = buildProductPackages({ battery: [battery], solar_panel: [unknownCurrency], controller: [controller] }, { inverterWatts: 0 });
  assert.equal(mixed.totalPriceCzk, null, "a missing currency must not be added to the EUR price");
  assert.deepEqual(mixed.priceSubtotals, [{ currency: "EUR", amount: 400 }]);
  assert.equal(mixed.unpricedItemCount, 2);
});
