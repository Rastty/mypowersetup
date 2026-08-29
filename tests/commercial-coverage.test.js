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

async function loadCatalog(path) {
  return JSON.parse(await readFile(new URL(`../data/${path}`, import.meta.url), "utf8"));
}

function mergeCatalogs(market, catalogs) {
  return {
    market,
    generatedAt: catalogs.map((catalog) => catalog.generatedAt).filter(Boolean).sort().at(-1) || null,
    sources: Object.assign({}, ...catalogs.map((catalog) => catalog.sources || {})),
    products: catalogs.flatMap((catalog) => Array.isArray(catalog.products) ? catalog.products : []),
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

test("current deployed CZ/SK/PL/HU catalog unions retain exact-product core coverage", async () => {
  const [czBase, czAmpul, sk, pl, hu] = await Promise.all([
    loadCatalog("products.json"),
    loadCatalog("products-ampul-cz.json"),
    loadCatalog("products-sk.json"),
    loadCatalog("products-pl.json"),
    loadCatalog("products-hu.json"),
  ]);
  const catalogs = [mergeCatalogs("cs-CZ", [czBase, czAmpul]), sk, pl, hu];
  const report = assessPublicCommercialPortfolio(catalogs);
  assert.equal(report.ready, true, `Commercial core blockers: ${report.blockers.join(", ")}`);
  for (const market of report.markets) {
    assert.equal(market.coreReady, true, `${market.market}: ${market.coreBlockers.join(", ")}`);
    assert.ok(market.eligibleProducts > 0);
    assert.ok(market.merchants.length > 0);
  }
});
