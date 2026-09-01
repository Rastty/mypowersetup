import test from "node:test";
import assert from "node:assert/strict";
import { decorateExpansionRecommendations } from "../src/expansion-recommendation-roles.js";

test("expansion recommendations explain the recommended, budget and reserve choices", () => {
  const products = decorateExpansionRecommendations({
    inverter: [
      { id: "fit", category: "inverter", price: 220, specs: { powerW: 1200 } },
      { id: "budget", category: "inverter", price: 180, specs: { powerW: 1400 } },
      { id: "reserve", category: "inverter", price: 260, specs: { powerW: 2000 } },
    ],
  });

  assert.deepEqual(products.map(({ id, recommendationBadges }) => [id, recommendationBadges]), [
    ["fit", ["recommended"]],
    ["budget", ["budget"]],
    ["reserve", ["reserve"]],
  ]);
});

test("a recommended product can also be the lowest-price option", () => {
  const products = decorateExpansionRecommendations({
    power_station: [
      { id: "fit", category: "power_station", price: 500, capacityWh: 1000 },
      { id: "reserve", category: "power_station", price: 700, capacityWh: 1500 },
    ],
  });

  assert.deepEqual(products[0].recommendationBadges, ["recommended", "budget"]);
  assert.deepEqual(products[1].recommendationBadges, ["reserve"]);
});

test("unranked compatible choices are explicitly described as alternatives", () => {
  const products = decorateExpansionRecommendations({
    solar_panel: [
      { id: "fit", category: "solar_panel", quantity: 2, powerW: 200 },
      { id: "same", category: "solar_panel", quantity: 2, powerW: 200 },
    ],
  });

  assert.deepEqual(products[1].recommendationBadges, ["alternative"]);
});
