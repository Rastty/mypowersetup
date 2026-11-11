import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { expansionLinePrice } from "../src/expansion-line-price.js";
import { decorateExpansionRecommendations } from "../src/expansion-recommendation-roles.js";

test("a verified solar panel price is one unit, while the buyer sees calculated quantity subtotal", () => {
  const quoted = expansionLinePrice({ category: "solar_panel", price: 119, quantity: 3, currency: "EUR" });
  assert.deepEqual(quoted, {
    unitPrice: 119, quantity: 3, totalPrice: 357, currency: "EUR",
  });
  assert.equal(expansionLinePrice({ category: "inverter", price: 219, quantity: 3, currency: "EUR" }).totalPrice, 219,
    "other products remain single-item offers, never multiplied by a stray field");
  assert.equal(expansionLinePrice({ category: "solar_panel", price: 129.99, quantity: 4 }).totalPrice, 519.96);
  assert.ok(Object.isFrozen(quoted));
});

test("cheapest solar badge compares required quantities, NOT the deceptively cheaper panel", () => {
  const products = decorateExpansionRecommendations({
    solar_panel: [
      { id: "cheap-unit", category: "solar_panel", price: 120, currency: "EUR", quantity: 3, powerW: 100 },
      { id: "cheap-subtotal", category: "solar_panel", price: 170, currency: "EUR", quantity: 2, powerW: 200 },
      { id: "higher", category: "solar_panel", price: 95, currency: "EUR", quantity: 4, powerW: 80 },
    ],
  });
  // €120 x3 = €360, €170 x2 = €340, €95 x4 = €380.
  assert.deepEqual(products.map(p => [p.id, p.recommendationBadges.includes("budget")]), [
    ["cheap-unit", false], ["cheap-subtotal", true], ["higher", false],
  ]);
  assert.equal(products[0].recommendationBadges[0], "recommended",
    "recommendation fit ranking is unchanged by commercial pricing");
});

test("missing, invalid, or unrealistic quantities and prices cannot manufacture a subtotal or budget win", () => {
  for (const price of [null, 0, -1, NaN, Infinity, "90", undefined, Number.MAX_VALUE]) {
    assert.equal(expansionLinePrice({ category: "solar_panel", price, quantity: 3 }), null, String(price));
  }
  for (const quantity of [undefined, null, 0, -1, 1.2, 5, 100, "3", Infinity]) {
    assert.equal(expansionLinePrice({ category: "solar_panel", price: 90, quantity }), null, String(quantity));
  }
  const chosen = decorateExpansionRecommendations({
    solar_panel: [
      { id: "unknown-qty", category: "solar_panel", price: 19, quantity: null },
      { id: "known", category: "solar_panel", price: 80, quantity: 2 },
    ],
  });
  assert.ok(chosen.every(p => !p.recommendationBadges.includes("budget")),
    "a sole calculable total does not establish a price comparison");
});

test("different currencies are never used as an invented cheapest 3-panel offer", () => {
  const panels = decorateExpansionRecommendations({
    solar_panel: [
      { category: "solar_panel", price: 60, currency: "EUR", quantity: 2 },
      { category: "solar_panel", price: 50, currency: "PLN", quantity: 2 },
    ],
  });
  assert.ok(panels.every(p => !p.recommendationBadges.includes("budget")));
});

test("public PT RO SI calculator shows panel subtotal and single-item prices with explicit localized delivery caveat", async () => {
  const source = await readFile(new URL("../src/expansion-calculator-browser.js", import.meta.url), "utf8");
  assert.match(source, /data-price-basis="\$\{solar \? "solar-subtotal" : "single-unit"\}"/);
  assert.match(source, /labels\.solarSubtotal\(linePrice\.quantity, money\(linePrice\.totalPrice\), money\(linePrice\.unitPrice\)\)/);
  assert.match(source, /const linePrice = expansionLinePrice\(item\)/);
  assert.match(source, /linePrice \? .* : "";/);
  assert.ok(source.includes("portes não incluídos"), "Portugal shipping costs must not be included in item subtotal");
  assert.ok(source.includes("livrarea nu este inclusă"), "Romania shipping costs must not be included in item subtotal");
  assert.ok(source.includes("brez dostave"), "Slovenia shipping costs must not be included in item subtotal");
  assert.match(source, /expansion-line-price\.js\?v=20261111-solar-subtotal1/);
  assert.match(source, /expansion-recommendation-roles\.js\?v=20261111-solar-subtotal1/);
});
