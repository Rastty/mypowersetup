import test from "node:test";
import assert from "node:assert/strict";
import { decorateExpansionRecommendations } from "../src/expansion-recommendation-roles.js";

test("expansion recommendations explain the recommended, budget and reserve choices", () => {
  const products = decorateExpansionRecommendations({
    inverter: [
      { id: "fit", category: "inverter", price: 220, currency: "EUR", specs: { powerW: 1200 } },
      { id: "budget", category: "inverter", price: 180, currency: "EUR", specs: { powerW: 1400 } },
      { id: "reserve", category: "inverter", price: 260, currency: "EUR", specs: { powerW: 2000 } },
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
      { id: "fit", category: "power_station", price: 500, currency: "EUR", capacityWh: 1000 },
      { id: "reserve", category: "power_station", price: 700, currency: "EUR", capacityWh: 1500 },
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

test("missing, zero and corrupt prices prevent a misleading lowest-price claim for the whole category", () => {
  const products = decorateExpansionRecommendations({
    inverter: [
      { id: "unknown", category: "inverter", price: null, specs: { powerW: 1000 } },
      { id: "priced-1", category: "inverter", price: 220, currency: "EUR", specs: { powerW: 1000 } },
      { id: "priced-2", category: "inverter", price: 180, currency: "EUR", specs: { powerW: 1000 } },
      { id: "blank", category: "inverter", price: "", specs: { powerW: 1000 } },
      { id: "free", category: "inverter", price: 0, specs: { powerW: 1000 } },
      { id: "invalid", category: "inverter", price: NaN, specs: { powerW: 1000 } },
      { id: "negative", category: "inverter", price: -1, specs: { powerW: 1000 } },
    ],
  });
  assert.deepEqual(products.filter(p => p.recommendationBadges.includes("budget")).map(p => p.id), []);
  assert.deepEqual(products[0].recommendationBadges, ["recommended"]);
});

test("two known prices do not prove cheapest when another shown offer has no price", () => {
  const products = decorateExpansionRecommendations({
    power_station: [
      { id: "main", category: "power_station", price: 499, currency: "EUR", capacityWh: 1000 },
      { id: "unknown", category: "power_station", price: null, currency: "EUR", capacityWh: 2000 },
      { id: "known-cheaper", category: "power_station", price: 399, currency: "EUR", capacityWh: 1500 },
    ],
  });
  assert.ok(products.every(item => !item.recommendationBadges.includes("budget")));
  assert.ok(products[0].recommendationBadges.includes("recommended"));
  assert.ok(products[1].recommendationBadges.includes("reserve"));
});

test("missing currency also prevents lowest-price claim", () => {
  const products = decorateExpansionRecommendations({
    inverter: [
      { id: "ambiguous", category: "inverter", price: 190, specs: { powerW: 1000 } },
      { id: "also-ambiguous", category: "inverter", price: 200, specs: { powerW: 1200 } },
    ],
  });
  assert.ok(products.every(item => !item.recommendationBadges.includes("budget")));
});

test("one disclosed price alone cannot establish a cheapest verified alternative", () => {
  const products = decorateExpansionRecommendations({
    battery: [
      { id: "unknown", category: "battery", price: null, specs: { capacityAh: 100 } },
      { id: "known", category: "battery", price: 85, currency: "EUR", specs: { capacityAh: 100 } },
    ],
  });
  assert.equal(products.some(p => p.recommendationBadges.includes("budget")), false);
});

test("different currencies cannot be compared without a documented exchange rate", () => {
  const products = decorateExpansionRecommendations({
    inverter: [
      { id: "eur", category: "inverter", price: 100, currency: "EUR", specs: { powerW: 1000 } },
      { id: "czk", category: "inverter", price: 90, currency: "CZK", specs: { powerW: 1000 } },
    ],
  });
  assert.equal(products.some(p => p.recommendationBadges.includes("budget")), false);
});

test("all three public expansion calculators load the new budget logic, not stale cached code", async () => {
  const { readFile } = await import("node:fs/promises");
  const version = "20261113-complete-price1";
  const rolesVersion = "20261113-complete-price1";
  const browser = await readFile(new URL("../src/expansion-calculator-browser.js", import.meta.url), "utf8");
  assert.ok(browser.includes('expansion-recommendation-roles.js?v=' + rolesVersion));
  for (const market of ["pt", "ro", "si"]) {
    const html = await readFile(new URL("../" + market + "/index.html", import.meta.url), "utf8");
    assert.ok(html.includes('src="/src/expansion-calculator-browser.js?v=' + version + '"'),
      market + " must load the new calculator import chain");
  }
});
