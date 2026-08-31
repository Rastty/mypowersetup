import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { buildRomaniaRecommendations, validateRomaniaCatalog } from "../src/ro-recommendations.js";
import { buildSloveniaRecommendations, validateSloveniaCatalog } from "../src/si-recommendations.js";

const fixtures = Object.freeze([
  Object.freeze({
    market: "ro",
    path: new URL("../data/products-ro.json", import.meta.url),
    build: buildRomaniaRecommendations,
    validate: validateRomaniaCatalog,
  }),
  Object.freeze({
    market: "si",
    path: new URL("../data/products-si.json", import.meta.url),
    build: buildSloveniaRecommendations,
    validate: validateSloveniaCatalog,
  }),
]);

function affiliateUrl(productUrl) {
  const url = new URL("https://www.awin1.com/cread.php");
  url.searchParams.set("awinmid", "38934");
  url.searchParams.set("awinaffid", "3044971");
  url.searchParams.set("ued", productUrl);
  return url.toString();
}

function solarPanel() {
  const productUrl = "https://iallpowers.eu/products/allpowers-sp035-foldable-solar-panel-200w";
  return {
    id: "allpowers_eu:solar-sp035",
    merchant: "allpowers_eu",
    name: "ALLPOWERS SP035 Foldable Solar Panel 200W",
    category: "solar_panel",
    priceCzk: 199,
    priceCurrency: "EUR",
    available: true,
    productUrl,
    affiliateUrl: affiliateUrl(productUrl),
    specs: { powerW: 200 },
    verifiedAt: "2026-08-31",
    marketEligible: true,
  };
}

const setup = Object.freeze({
  dailyWh: 800,
  autonomyDays: 2,
  solarWatts: 350,
  inverterWatts: 1200,
  applianceRows: Object.freeze([{ ac: true, watts: 1200, quantity: 1 }]),
});

for (const fixture of fixtures) {
  test(`${fixture.market.toUpperCase()} recommends exact verified EU solar panels even when no portable station fits`, async () => {
    const committed = JSON.parse(await readFile(fixture.path, "utf8"));
    const catalog = { ...committed, products: [...committed.products, solarPanel()] };
    assert.equal(fixture.validate(catalog), catalog);

    const recommendations = fixture.build(catalog, setup, 3);
    assert.equal(recommendations.power_station.length, 0);
    assert.equal(recommendations.solar_panel.length, 1);
    assert.equal(recommendations.solar_panel[0].category, "solar_panel");
    assert.equal(recommendations.solar_panel[0].quantity, 2);
    assert.equal(recommendations.solar_panel[0].powerW, 200);
    assert.equal(new URL(recommendations.solar_panel[0].affiliateUrl).searchParams.get("ued"), recommendations.solar_panel[0].productUrl);
  });

  test(`${fixture.market.toUpperCase()} rejects an unverified or electrically incomplete solar panel`, async () => {
    const committed = JSON.parse(await readFile(fixture.path, "utf8"));
    const unverified = solarPanel();
    unverified.verifiedAt = null;
    assert.throws(() => fixture.validate({ ...committed, products: [...committed.products, unverified] }), /PRODUCT_EVIDENCE_INVALID/);

    const incomplete = solarPanel();
    incomplete.specs.powerW = 20;
    assert.throws(() => fixture.validate({ ...committed, products: [...committed.products, incomplete] }), /SOLAR_PANEL_SPECS_INVALID/);
  });
}
