import test from "node:test";
import assert from "node:assert/strict";
import { productCardPriceDetails, visibleRecommendationsForPackages } from "../src/recommendation-display.js";

const candidate = (id, score) => ({ product: { id }, score });

test("product comparison leads with the default package choice even when outside the original first three", () => {
  const solar = [candidate("folding-expensive", 88), candidate("premium", 85), candidate("midrange", 81), candidate("more", 76), candidate("fixed-value", 74)];
  const battery = [candidate("battery-best", 90), candidate("battery-other", 86)];
  const ranked = { solar_panel: solar, battery, power_station: [candidate("station", 89)] };
  const packages = [{ id: "recommended", items: [
    { category: "solar_panel", product: solar[4].product },
    { category: "battery", product: battery[0].product },
  ] }];

  const visible = visibleRecommendationsForPackages(ranked, packages);
  assert.deepEqual(visible.solar_panel.map(({ product }) => product.id), ["fixed-value", "folding-expensive", "premium"]);
  assert.deepEqual(visible.battery, battery);
  assert.deepEqual(visible.power_station, ranked.power_station);
  assert.deepEqual(ranked.solar_panel, solar, "source ranking must not be modified");
  assert.notEqual(visible.solar_panel, solar, "card slice must not reuse mutable ranking array");
});

test("no default package or missing selected product keeps original technical order", () => {
  const ranked = { solar_panel: [candidate("a", 95), candidate("b", 85), candidate("c", 75), candidate("d", 70)], inverter: [] };
  assert.deepEqual(visibleRecommendationsForPackages(ranked, []), { solar_panel: ranked.solar_panel.slice(0, 3), inverter: [] });
  assert.deepEqual(visibleRecommendationsForPackages(ranked, [{ id: "economy", items: [] }]), { solar_panel: ranked.solar_panel.slice(0, 3), inverter: [] });
  assert.deepEqual(visibleRecommendationsForPackages(ranked, [{ id: "recommended", items: [{ category: "solar_panel", product: { id: "not-in-ranking" } }] }]), { solar_panel: ranked.solar_panel.slice(0, 3), inverter: [] });
});

test("selected product is not duplicated; display limit affects cards only", () => {
  const ranked = { controller: [candidate("first", 90), candidate("chosen", 80), candidate("third", 70)] };
  const packages = [{ id: "recommended", items: [{ category: "controller", product: { id: "chosen" } }] }];
  const result = visibleRecommendationsForPackages(ranked, packages, 2);
  assert.deepEqual(result.controller.map(({ product }) => product.id), ["chosen", "first"]);
  assert.equal(ranked.controller.length, 3);
});

test("product-card totals reflect required quantity without treating missing prices as free", () => {
  assert.deepEqual(productCardPriceDetails({ priceCzk: 1947, recommendedQuantity: 2 }), { quantity: 2, unitPrice: 1947, totalPrice: 3894 });
  assert.deepEqual(productCardPriceDetails({ priceCzk: null, recommendedQuantity: 2 }), { quantity: 2, unitPrice: null, totalPrice: null });
  assert.deepEqual(productCardPriceDetails({ priceCzk: "", recommendedQuantity: 2 }), { quantity: 2, unitPrice: null, totalPrice: null });
  assert.deepEqual(productCardPriceDetails({ priceCzk: 0, recommendedQuantity: 2 }), { quantity: 2, unitPrice: null, totalPrice: null });
  assert.deepEqual(productCardPriceDetails({ priceCzk: 250, recommendedQuantity: 0 }), { quantity: 1, unitPrice: 250, totalPrice: 250 });
});
