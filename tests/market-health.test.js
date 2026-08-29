import test from "node:test";
import assert from "node:assert/strict";
import {
  assessMarketHealth,
  extractCanonical,
  extractSitemapUrls,
  hasNoindex,
  summarizeMarketHealth,
} from "../src/market-health.js";

const canonical = "https://mypowersetup.com/sk/";
const healthyCatalog = {
  sources: { merchant: { status: "ok" } },
  products: [
    ...products("battery", 2),
    ...products("solar_panel", 3),
    ...products("controller", 2),
    ...products("inverter", 3),
    ...products("dc_charger", 2),
    ...products("shore_charger", 2),
  ],
};

test("public market is healthy only when SEO, catalog, sources, guides and coverage agree", () => {
  const report = assessMarketHealth({
    key: "sk",
    locale: "sk-SK",
    expectedPublic: true,
    homepageHtml: `<html><head><link rel="canonical" href="${canonical}"></head></html>`,
    canonicalUrl: canonical,
    sitemapUrls: [canonical],
    catalogs: [healthyCatalog],
    guideCount: 9,
  });
  assert.equal(report.status, "healthy");
  assert.equal(report.productCount, 14);
  assert.equal(report.blockers.length, 0);
  assert.equal(report.attention.length, 0);
});

test("private HU market is safe when noindex and sitemap exclusion agree", () => {
  const report = assessMarketHealth({
    key: "hu",
    locale: "hu-HU",
    expectedPublic: false,
    homepageHtml: '<head><meta name="robots" content="noindex,nofollow"><link rel="canonical" href="https://mypowersetup.com/hu/"></head>',
    canonicalUrl: "https://mypowersetup.com/hu/",
    sitemapUrls: ["https://mypowersetup.com/"],
    catalogs: [healthyCatalog],
    guideCount: 9,
  });
  assert.equal(report.status, "healthy");
  assert.equal(report.safetyChecks.publicationStateMatches, true);
});

test("private market leaking into sitemap is a blocker even if catalog is excellent", () => {
  const url = "https://mypowersetup.com/hu/";
  const report = assessMarketHealth({
    key: "hu",
    locale: "hu-HU",
    expectedPublic: false,
    homepageHtml: `<head><meta name="robots" content="noindex"><link rel="canonical" href="${url}"></head>`,
    canonicalUrl: url,
    sitemapUrls: [url],
    catalogs: [healthyCatalog],
    guideCount: 9,
  });
  assert.equal(report.status, "blocked");
  assert.ok(report.blockers.includes("PUBLICATION_STATE_MISMATCH"));
});

test("stale sources and incomplete product coverage create attention without hiding structural safety", () => {
  const report = assessMarketHealth({
    key: "pl",
    locale: "pl-PL",
    expectedPublic: true,
    homepageHtml: '<head><link href="https://mypowersetup.com/pl/" rel="canonical"></head>',
    canonicalUrl: "https://mypowersetup.com/pl/",
    sitemapUrls: ["https://mypowersetup.com/pl/"],
    catalogs: [{ sources: { merchant: { status: "stale" } }, products: products("battery", 2) }],
    guideCount: 7,
  });
  assert.equal(report.status, "attention");
  assert.equal(report.blockers.length, 0);
  assert.ok(report.attention.includes("SOURCE_NOT_FRESH:merchant"));
  assert.ok(report.attention.some((value) => value.startsWith("PRODUCT_COVERAGE:solar_panel")));
  assert.ok(report.attention.includes("GUIDE_DEPTH:7/9"));
});

test("invalid affiliate destinations block a market rather than being silently counted", () => {
  const bad = structuredClone(healthyCatalog);
  bad.products[0].affiliateUrl = "";
  const report = assessMarketHealth({
    key: "cz", locale: "cs-CZ", expectedPublic: true,
    homepageHtml: '<head><link rel="canonical" href="https://mypowersetup.com/"></head>',
    canonicalUrl: "https://mypowersetup.com/", sitemapUrls: ["https://mypowersetup.com/"],
    catalogs: [bad], guideCount: 9,
  });
  assert.equal(report.status, "blocked");
  assert.ok(report.blockers.includes("AFFILIATE_DESTINATION_INVALID"));
  assert.equal(report.invalidAffiliateProducts.length, 1);
});

test("metadata helpers tolerate attribute order and deduplicate sitemap URLs", () => {
  assert.equal(extractCanonical('<link href="https://mypowersetup.com/pl/" rel="canonical">'), "https://mypowersetup.com/pl/");
  assert.equal(hasNoindex('<meta content="noarchive, noindex" name="robots">'), true);
  assert.deepEqual(extractSitemapUrls('<url><loc>https://a.test/</loc></url><loc>https://a.test/</loc>'), ["https://a.test/"]);
});

test("summary separates safety from quality", () => {
  const summary = summarizeMarketHealth([
    { key: "cz", status: "healthy", blockers: [], attention: [] },
    { key: "pl", status: "attention", blockers: [], attention: ["x"] },
  ]);
  assert.equal(summary.safe, true);
  assert.equal(summary.allHealthy, false);
  assert.deepEqual(summary.counts, { healthy: 1, attention: 1, blocked: 0 });
});

function products(category, count) {
  return Array.from({ length: count }, (_, index) => ({
    id: `${category}-${index}`,
    category,
    productUrl: `https://shop.example/${category}/${index}`,
    affiliateUrl: `https://affiliate.example/click/${category}/${index}`,
  }));
}
