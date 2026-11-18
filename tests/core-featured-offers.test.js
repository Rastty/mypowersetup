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
  assert.deepEqual(chosen.map(({ product }) => product.id), ["inverter-fit", "battery-fit", "solar-fit"]);
  assert.deepEqual(new Set(chosen.map(({ category }) => category)).size, chosen.length);
  assert.deepEqual(selectFeaturedOffers(recommendations, [], 2).map(({ product }) => product.id),
    ["battery-fit", "solar-fit"]);
  assert.deepEqual(selectFeaturedOffers({ battery: [{ product: { name: "unverified" } }] }), []);
  assert.deepEqual(selectFeaturedOffers({}, []), []);
  assert.deepEqual(selectFeaturedOffers({}, null), []);
  assert.deepEqual(featuredCzechProducts(recommendations, packages), chosen);
});

for (const market of ["sk", "pl", "hu"]) {
  test(`${market.toUpperCase()} exposes featured verified offers before baskets and collapsed comparisons`, () => {
    const html = source(`${market}/index.html`);
    const products = html.indexOf('id="product-recommendations"');
    const featured = html.indexOf('id="featured-recommendations"');
    const baskets = html.indexOf('id="package-variants"');
    const comparisons = html.indexOf('id="recommendation-groups"');
    assert.ok(products >= 0 && products < featured && featured < baskets && baskets < comparisons);
    assert.equal(html.match(/id="featured-recommendations"/g)?.length, 1);
    assert.match(html, new RegExp(`app-${market === "hu" ? "hu-browser" : market}\\.js\\?v=20261118-featured-offers1`));

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
  assert.ok(generator.indexOf('id="featured-recommendations"') < generator.indexOf('id="package-variants"'));
  assert.match(generator, /app-hu-browser\.js\?v=20261118-featured-offers1/);
});
