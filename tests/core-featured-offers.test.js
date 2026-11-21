import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { selectFeaturedOffers } from "../src/featured-core-offers.js";
import { featuredCzechProducts } from "../src/cz-offer-presentation.js";

function source(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

test("featured choices use only vetted recommendations and prefer the recommended basket", () => {
  const match = (id) => ({ product: { id, name: id } });
  const recommendations = {
    battery: [match("battery-fit"), match("battery-alt")],
    solar_panel: [match("solar-fit")],
    inverter: [match("inverter-fit")],
    controller: [match("controller-fit")],
  };
  const packages = [{ id: "recommended", items: [
    { ...match("inverter-fit"), category: "inverter" },
    { ...match("battery-fit"), category: "battery" },
  ] }];
  const chosen = selectFeaturedOffers(recommendations, packages);
  assert.deepEqual(chosen.map(({ product }) => product.id), ["inverter-fit", "battery-fit", "solar-fit", "controller-fit"]);
  assert.deepEqual(new Set(chosen.map(({ category }) => category)).size, chosen.length);
  assert.deepEqual(selectFeaturedOffers(recommendations, [], 2).map(({ product }) => product.id),
    ["battery-fit", "solar-fit"]);
  assert.deepEqual(selectFeaturedOffers({ battery: [{ product: { name: "unverified" } }] }), []);
  assert.deepEqual(selectFeaturedOffers({}, []), []);
  assert.deepEqual(selectFeaturedOffers({}, null), []);
  assert.deepEqual(featuredCzechProducts(recommendations, packages), chosen);
});

test("featured shopping choices skip stale and unavailable offers, including recommended basket rows", () => {
  const product = (id, overrides = {}) => ({ product: { id, ...overrides } });
  const recommendations = {
    battery: [product("old-battery", { staleSource: true }), product("ready-battery")],
    solar_panel: [product("sold-out-panel", { available: false }), product("ready-panel")],
    controller: [product("ready-battery"), product("ready-mppt")],
    inverter: [product("ready-inverter")],
  };
  const packages = [{ id: "recommended", items: [
    { category: "battery", ...product("old-battery", { staleSource: true }) },
    { category: "solar_panel", ...product("sold-out-panel", { available: false }) },
  ] }];
  assert.deepEqual(selectFeaturedOffers(recommendations, packages).map(({ product }) => product.id), [
    "ready-battery", "ready-panel", "ready-mppt", "ready-inverter",
  ]);
});

test("default featured shelf shows all four essential verified categories while retaining a compact cap", () => {
  const offer = (id) => ({ product: { id } });
  const recommendations = Object.fromEntries(
    ["battery", "solar_panel", "controller", "inverter", "dc_charger", "shore_charger"]
      .map((category) => [category, [offer(category)]]),
  );
  assert.deepEqual(selectFeaturedOffers(recommendations).map(({ category }) => category), [
    "battery", "solar_panel", "controller", "inverter",
  ]);
  assert.equal(selectFeaturedOffers(recommendations, [], 2).length, 2);
});

for (const market of ["sk", "pl", "hu"]) {
  test(`${market.toUpperCase()} exposes purchase-ready offers immediately after verdict, before technical cards`, () => {
    const html = source(`${market}/index.html`);
    const verdict = html.indexOf('id="result-verdict"');
    const resultGrid = html.indexOf('id="result-grid"');
    const products = html.indexOf('id="product-recommendations"');
    const featured = html.indexOf('id="featured-recommendations"');
    const baskets = html.indexOf('id="package-variants"');
    const comparisons = html.indexOf('id="recommendation-groups"');
    assert.ok(verdict >= 0 && verdict < featured && featured < resultGrid && resultGrid < products && products < baskets && baskets < comparisons);
    assert.equal(html.match(/id="featured-recommendations"/g)?.length, 1);
    assert.match(html, /styles\.css\?v=20261119-voltage-dc-load1/);
    assert.match(html, new RegExp(`app-${market === "hu" ? "hu-browser" : market}\\.js\\?v=${market === "hu" ? "20261119-voltage-guide1" : "20261121-aligned1"}`));

    const app = source(`src/app-${market === "hu" ? "hu-browser" : market}.js`);
    assert.match(app, /selectFeaturedOffers\(/);
    assert.match(app, /featured\.length[\s\S]*?featured-picks/);
    assert.match(app, /data-affiliate-click data-source="result-featured"/);
    assert.match(app, /attributedAwinUrl\(product, category, "recommended", "result-featured"\)/);
    assert.match(app, /trackVisibleProductChoices\(\)/);
  });
}

test("Hungarian generated page retains the same featured offers placement", () => {
  const generator = source("src/page-hu.js");
  assert.ok(generator.indexOf('id="result-verdict"') < generator.indexOf('id="featured-recommendations"'));
  assert.ok(generator.indexOf('id="featured-recommendations"') < generator.indexOf('id="result-grid"'));
  assert.ok(generator.indexOf('id="result-grid"') < generator.indexOf('id="package-variants"'));
  assert.match(generator, /app-hu-browser\.js\?v=20261119-voltage-guide1/);
});
