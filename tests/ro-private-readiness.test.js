import test from "node:test";
import assert from "node:assert/strict";
import { RO_PRIVATE_CONTENT, renderRomaniaPrivateContentPage } from "../src/private-content-ro.js";
import { validateRomaniaCatalog, buildRomaniaRecommendations, parseRomaniaAffiliateUrl } from "../src/ro-recommendations.js";
import { readFile } from "node:fs/promises";

const catalog = JSON.parse(await readFile(new URL("../data/products-ro.json", import.meta.url), "utf8"));
const analyticsSource = await readFile(new URL("../src/analytics.js", import.meta.url), "utf8");

test("Romania has four trust pages and ten private guides", () => {
  assert.equal(RO_PRIVATE_CONTENT.trust.length, 4);
  assert.equal(RO_PRIVATE_CONTENT.guides.length, 10);
  for (const route of ["/ro/ghiduri/", "/ro/metodologie/", "/ro/confidentialitate/", "/ro/afiliere/"]) {
    const html = renderRomaniaPrivateContentPage(route);
    assert.match(html, /<html lang="ro">/);
    assert.match(html, /noindex,nofollow,noarchive/);
    assert.doesNotMatch(html, /rel="canonical"|hreflang/i);
  }
});

test("Romanian guide pages point back to calculator", () => {
  const html = renderRomaniaPrivateContentPage("/ro/ghiduri/capacitate-baterie-autorulota/");
  assert.match(html, /\/ro\/#calculator-preview/);
  assert.match(html, /Alte ghiduri/);
});

test("Romanian analytics consent points to the dedicated privacy page", () => {
  assert.match(analyticsSource, /ro:\s*\{[^\n]*detailsUrl:\s*"\/ro\/confidentialitate\/"/);
  assert.doesNotMatch(analyticsSource, /ro:\s*\{[^\n]*detailsUrl:\s*"\/ro\/"/);
});

test("Romania affiliate catalog is exact-product and fail closed", () => {
  assert.equal(validateRomaniaCatalog(catalog), catalog);
  const parsed = parseRomaniaAffiliateUrl(catalog.products[0].affiliateUrl);
  assert.equal(parsed.destination, catalog.products[0].productUrl);
  assert.throws(() => parseRomaniaAffiliateUrl("https://www.awin1.com/cread.php?awinmid=38934&awinaffid=3044971&ued=https%3A%2F%2Fiallpowers.eu%2Fcollections%2Fall"), /PRODUCT_PATH/);
});

test("Romania recommendation requires every verified electrical limit", () => {
  const setup = { dailyWh: 500, autonomyDays: 1, solarWatts: 400, inverterWatts: 1200, applianceRows: [{ ac:false, watts:45, quantity:1 }] };
  const recommendations = buildRomaniaRecommendations(catalog, setup, 3);
  assert.equal(recommendations.power_station.length, 1);
  const unsafe = structuredClone(catalog);
  unsafe.products[0].specs.solarInputW = 200;
  assert.equal(buildRomaniaRecommendations(unsafe, setup, 3).power_station.length, 0);
});