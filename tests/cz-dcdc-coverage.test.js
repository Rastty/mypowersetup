import test from "node:test";
import assert from "node:assert/strict";
import { parseProductFeed } from "../src/feed.js";
import { buildCzDcDcCoverage } from "../src/cz-dcdc-coverage.js";

const xml = (locale, category, price) => `<?xml version="1.0" encoding="UTF-8"?>
<rss xmlns:g="http://base.google.com/ns/1.0"><channel><item>
  <g:id>6195</g:id>
  <g:title>DC/DC LiFePO4 battery charger 14.6V, 30A, 400W, IP68</g:title>
  <g:description>Input voltage: 10-36 V DC. Rated input voltage: 12V/24V DC. Output voltage: 14.6 V DC. Output current: 30 A. Suitable for LiFePO4 batteries in vehicles and caravans.</g:description>
  <g:link>https://ampul.eu/${locale}/${category}/6195-dc-dc-lifepo4-146v-30a-400w-ip68</g:link>
  <g:price>${price}</g:price>
  <g:availability>in_stock</g:availability>
  <g:product_type>${locale === "cs" ? "Nabíječky" : "Nabíjačky"}</g:product_type>
</item></channel></rss>`;

test("coverage stays blocked when no live local CZ product matches", () => {
  const report = buildCzDcDcCoverage([{ generatedAt: "2026-09-16T08:00:00.000Z", products: [] }]);
  assert.equal(report.market, "cs-CZ");
  assert.equal(report.status, "blocked");
  assert.equal(report.matchCount, 0);
  assert.ok(report.blocker);
});

test("coverage becomes ready only from a live CZ 12V LiFePO4 30A DC-DC product", () => {
  const [product] = parseProductFeed(xml("cs", "nabijecky", "6800 CZK"), "ampul_cz");
  const report = buildCzDcDcCoverage([{ generatedAt: "2026-09-16T08:00:00.000Z", products: [product] }]);
  assert.equal(report.status, "ready");
  assert.equal(report.matchCount, 1);
  assert.equal(report.matches[0].id, "ampul_cz:6195");
  assert.equal(report.matches[0].currentA, 30);
  assert.equal(report.matches[0].priceCurrency, "CZK");
  assert.match(report.matches[0].productUrl, /^https:\/\/ampul\.eu\/cs\/nabijecky\//);
});

test("coverage never activates from the equivalent SK catalog product", () => {
  const [product] = parseProductFeed(xml("sk", "nabijacky", "129 EUR"), "ampul_sk");
  const report = buildCzDcDcCoverage([{ generatedAt: "2026-09-16T08:00:00.000Z", products: [product] }]);
  assert.equal(report.status, "blocked");
  assert.equal(report.matchCount, 0);
});

test("coverage requires current availability instead of assuming stock", () => {
  const [product] = parseProductFeed(xml("cs", "nabijecky", "6800 CZK"), "ampul_cz");
  product.available = null;
  const report = buildCzDcDcCoverage([{ generatedAt: "2026-09-16T08:00:00.000Z", products: [product] }]);
  assert.equal(report.status, "blocked");
  assert.equal(report.matchCount, 0);
});
