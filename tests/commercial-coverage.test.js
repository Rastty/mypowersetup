import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  affiliatePointsToExactProduct,
  assessCatalogCommercialCoverage,
  assessPublicCommercialPortfolio,
  isCommerciallyEligibleProduct,
} from "../src/commercial-coverage.js";

function row(category, suffix, overrides = {}) {
  const productUrl = `https://shop.example/products/${suffix}`;
  return {
    id: suffix,
    merchant: "safe",
    category,
    available: true,
    productUrl,
    affiliateUrl: `https://affiliate.example/click?desturl=${encodeURIComponent(productUrl)}`,
    ...overrides,
  };
}

test("commercial eligibility fails closed on stale, unavailable and generic destinations", () => {
  const safe = row("battery", "battery-100");
  assert.equal(affiliatePointsToExactProduct(safe), true);
  assert.equal(isCommerciallyEligibleProduct(safe, { safe: { status: "ok" } }), true);
  assert.equal(isCommerciallyEligibleProduct({ ...safe, staleSource: true }, { safe: { status: "ok" } }), false);
  assert.equal(isCommerciallyEligibleProduct({ ...safe, available: false }, { safe: { status: "ok" } }), false);
  assert.equal(isCommerciallyEligibleProduct({ ...safe, affiliateUrl: "https://affiliate.example/click?desturl=https%3A%2F%2Fshop.example%2F" }, { safe: { status: "ok" } }), false);
  assert.equal(isCommerciallyEligibleProduct(safe, { safe: { status: "stale" } }), false);
});

test("core readiness requires battery, solar and controller exact-product supply", () => {
  const catalog = {
    market: "xx-XX",
    sources: { safe: { status: "ok" } },
    products: [row("battery", "battery"), row("solar_panel", "solar")],
  };
  const report = assessCatalogCommercialCoverage(catalog);
  assert.equal(report.coreReady, false);
  assert.deepEqual(report.coreBlockers, ["controller"]);
  assert.equal(report.coreCoverageRatio, 2 / 3);
});

test("current CZ/SK/PL/HU catalogs retain exact-product core commercial coverage", async () => {
  const paths = ["products.json", "products-sk.json", "products-pl.json", "products-hu.json"];
  const catalogs = await Promise.all(paths.map(async (path) => JSON.parse(await readFile(new URL(`../data/${path}`, import.meta.url), "utf8"))));
  const report = assessPublicCommercialPortfolio(catalogs);
  assert.equal(report.ready, true, `Commercial core blockers: ${report.blockers.join(", ")}`);
  for (const market of report.markets) {
    assert.equal(market.coreReady, true, `${market.market}: ${market.coreBlockers.join(", ")}`);
    assert.ok(market.eligibleProducts > 0);
    assert.ok(market.merchants.length > 0);
  }
});
