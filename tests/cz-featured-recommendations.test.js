import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { czechProductPrice, czechPackagePrice, featuredCzechProducts } from "../src/cz-offer-presentation.js";
import { decorateAwinAffiliateUrl } from "../src/awin-attribution.js";

test("Czech price gate never exposes EUR, PLN, HUF or unlabelled feed numbers", () => {
  for (const currency of ["EUR", "PLN", "HUF", null, undefined]) {
    assert.equal(czechProductPrice({ priceCzk: 1059.99, priceCurrency: currency }), null);
  }
  assert.equal(czechProductPrice({ priceCzk: 1059.99, priceCurrency: "CZK" }), 1059.99);
  assert.equal(czechProductPrice({ priceCzk: 1059.99, priceCurrency: "CZK" }, 2), 2119.98);
  for (const raw of [null, undefined, "", 0, -20, "abc", Infinity]) {
    assert.equal(czechProductPrice({ priceCzk: raw, priceCurrency: "CZK" }), null);
  }
});

test("Czech basket price is all-or-nothing in exact CZK", () => {
  const product = (priceCzk, priceCurrency = "CZK") => ({ priceCzk, priceCurrency });
  const variant = { totalCurrency: "CZK", items: [
    { product: product(1000) },
    { product: { ...product(500), recommendedQuantity: 2 } },
  ] };
  assert.equal(czechPackagePrice(variant), 2000);
  assert.equal(czechPackagePrice({ ...variant, items: [...variant.items, { product: product(200, "EUR") }] }), null);
  assert.equal(czechPackagePrice({ ...variant, totalCurrency: "EUR" }), null);
  assert.equal(czechPackagePrice({ ...variant, items: [...variant.items, { product: product(null) }] }), null);
  assert.equal(czechPackagePrice({ ...variant, items: [] }), null);
});

test("featured products use recommended package selection and distinct eligible category fallback", () => {
  const offer = (id, category) => ({ product: { id }, category, reason: id + " fit" });
  const ranked = {
    battery: [offer("battery-best", "battery"), offer("battery-other", "battery")],
    solar_panel: [offer("solar-best", "solar_panel")],
    inverter: [offer("inverter-best", "inverter")],
  };
  const packages = [{ id: "recommended", items: [offer("battery-other", "battery"), offer("solar-best", "solar_panel")] }];
  assert.deepEqual(featuredCzechProducts(ranked, packages).map((item) => item.product.id), [
    "battery-other", "solar-best", "inverter-best",
  ]);
  assert.deepEqual(featuredCzechProducts({ battery: [ranked.battery[0]] }, []).map((item) => item.product.id), ["battery-best"]);
  assert.deepEqual(featuredCzechProducts({}, []), []);
});

test("Czech result places immediately visible offers before secondary analysis and sharing", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  const app = await readFile(new URL("../src/app.js", import.meta.url), "utf8");
  const style = await readFile(new URL("../styles.css", import.meta.url), "utf8");
  const freshness = await readFile(new URL("../src/builder-result-freshness.js", import.meta.url), "utf8");
  const resultStep = html.slice(html.indexOf('class="form-step result-step"'), html.indexOf('class="decision-panel"'));
  assert.ok(resultStep.indexOf('id="result-verdict"') < resultStep.indexOf('id="featured-recommendations"'));
  assert.ok(resultStep.indexOf('id="featured-recommendations"') < resultStep.indexOf('id="result-grid"'));
  assert.ok(resultStep.indexOf('id="result-grid"') < resultStep.indexOf('id="product-recommendations"'));
  assert.ok(resultStep.indexOf('id="product-recommendations"') < resultStep.indexOf('id="existing-setup-check"'));
  assert.ok(resultStep.indexOf('id="featured-recommendations"') < resultStep.indexOf('id="package-variants"'));
  assert.ok(resultStep.indexOf('id="product-recommendations"') < resultStep.indexOf('id="result-share"'));
  assert.match(app, /featuredCzechProducts\(recommendations, packages\)/);
  assert.match(app, /data-affiliate-click data-source="result-featured"/);
  assert.match(style, /\.featured-picks-grid \{ display: grid/);
  assert.match(style, /\.next-step-card, #featured-recommendations,/);
  assert.match(html, /styles\.css\?v=20261121-caravan-entry1/);
  assert.match(html, /app\.js\?v=20261121-caravan-entry1/);
  assert.match(freshness, /"#featured-recommendations"/);
});

test("featured AWIN purchases retain attribution and source distinction", () => {
  const url = decorateAwinAffiliateUrl("https://www.awin1.com/cread.php?awinmid=123&awinaffid=456", {
    market: "cz", category: "battery", recommendationRole: "recommended", source: "result-featured",
  });
  assert.equal(new URL(url).searchParams.get("clickref2"), "role_recommended");
  assert.equal(new URL(url).searchParams.get("clickref3"), "source_result-featured");
});
