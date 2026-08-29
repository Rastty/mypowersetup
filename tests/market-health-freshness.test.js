import test from "node:test";
import assert from "node:assert/strict";
import { assessMarketHealth } from "../src/market-health.js";

const canonicalUrl = "https://mypowersetup.com/";
const homepageHtml = `<head><link rel="canonical" href="${canonicalUrl}"></head>`;

function product(category, id, merchant, overrides = {}) {
  return {
    id,
    merchant,
    category,
    available: true,
    productUrl: `https://shop.example/${id}`,
    affiliateUrl: `https://affiliate.example/${id}`,
    ...overrides,
  };
}

test("stale merchant products do not count toward recommendation coverage", () => {
  const freshProducts = [
    product("battery", "b1", "fresh"), product("battery", "b2", "fresh"),
    product("solar_panel", "s1", "fresh"), product("solar_panel", "s2", "fresh"), product("solar_panel", "s3", "fresh"),
    product("controller", "c1", "fresh"),
    product("inverter", "i1", "fresh"), product("inverter", "i2", "fresh"), product("inverter", "i3", "fresh"),
    product("dc_charger", "d1", "fresh"), product("dc_charger", "d2", "fresh"),
    product("shore_charger", "h1", "fresh"), product("shore_charger", "h2", "fresh"),
  ];
  const catalog = {
    sources: { fresh: { status: "ok" }, stale: { status: "stale" } },
    products: [...freshProducts, product("controller", "c-stale", "stale")],
  };
  const report = assessMarketHealth({ key: "cz", locale: "cs-CZ", expectedPublic: true, homepageHtml, canonicalUrl, sitemapUrls: [canonicalUrl], catalogs: [catalog], guideCount: 12 });
  assert.equal(report.productCount, 14);
  assert.equal(report.recommendationEligibleProductCount, 13);
  assert.equal(report.categoryCounts.controller, 1);
  assert.ok(report.attention.includes("SOURCE_NOT_FRESH:stale"));
  assert.ok(report.attention.includes("PRODUCT_COVERAGE:controller:1/2"));
});

test("explicitly unavailable preserved products do not create affiliate blockers", () => {
  const catalog = {
    sources: { stale: { status: "stale", recommendationsDisabled: true }, fresh: { status: "ok" } },
    products: [
      product("battery", "old", "stale", { available: false, staleSource: true, productUrl: "", affiliateUrl: "" }),
      product("battery", "fresh", "fresh"),
    ],
  };
  const report = assessMarketHealth({
    key: "cz", locale: "cs-CZ", expectedPublic: true, homepageHtml, canonicalUrl, sitemapUrls: [canonicalUrl], catalogs: [catalog], guideCount: 12,
    productMinimums: { battery: 1 },
  });
  assert.equal(report.safetyChecks.affiliateDestinationsValid, true);
  assert.equal(report.recommendationEligibleProductCount, 1);
  assert.equal(report.blockers.length, 0);
});
