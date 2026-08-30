import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { buildSloveniaRecommendations, parseSloveniaAffiliateUrl, validateSloveniaCatalog } from "../src/si-recommendations.js";

const catalog = JSON.parse(await readFile(new URL("../data/products-si.json", import.meta.url), "utf8"));

test("Slovenia catalog is public and accepts only exact ALLPOWERS EU destinations with market evidence", () => {
  assert.equal(catalog.private, false);
  assert.equal(validateSloveniaCatalog(catalog), catalog);
  const product = catalog.products[0];
  const parsed = parseSloveniaAffiliateUrl(product.affiliateUrl);
  assert.equal(parsed.destination, product.productUrl);
  assert.equal(catalog.shippingEligibility.country, "Slovenia");
});

test("Slovenia affiliate parser fails closed for generic and wrong-account links", () => {
  assert.throws(() => parseSloveniaAffiliateUrl("https://www.awin1.com/cread.php?awinmid=38934&awinaffid=3044971&ued=https%3A%2F%2Fiallpowers.eu%2Fproducts%2F"), /SI_AFFILIATE_PRODUCT_PATH_INVALID/);
  assert.throws(() => parseSloveniaAffiliateUrl("https://www.awin1.com/cread.php?awinmid=38934&awinaffid=1&ued=https%3A%2F%2Fiallpowers.eu%2Fproducts%2Fr2500-plus"), /SI_AFFILIATE_ACCOUNT_INVALID/);
});

test("Slovenia recommendation covers the standard two-day mobile-smoke load only when every verified electrical limit fits", () => {
  const fitting = buildSloveniaRecommendations(catalog, {
    dailyWh: 540,
    autonomyDays: 2,
    solarWatts: 200,
    inverterWatts: 0,
    applianceRows: [
      { ac: false, watts: 45, quantity: 1 },
      { ac: false, watts: 18, quantity: 1 },
    ],
  });
  assert.ok(fitting.power_station.length >= 1);
  assert.equal(fitting.power_station[0].merchant, "allpowers_eu");
  assert.ok(fitting.power_station[0].capacityWh >= 1600);

  const tooMuchDc = buildSloveniaRecommendations(catalog, {
    dailyWh: 540,
    autonomyDays: 2,
    solarWatts: 200,
    inverterWatts: 0,
    applianceRows: [{ ac: false, watts: 140, quantity: 1 }],
  });
  assert.equal(tooMuchDc.power_station.length, 0);
});
