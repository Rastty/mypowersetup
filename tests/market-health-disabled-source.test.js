import test from "node:test";
import assert from "node:assert/strict";
import { assessMarketHealth } from "../src/market-health.js";

const canonical = "https://mypowersetup.com/sk/";

const products = [
  ...makeProducts("battery", 2),
  ...makeProducts("solar_panel", 3),
  ...makeProducts("controller", 2),
  ...makeProducts("inverter", 3),
  ...makeProducts("dc_charger", 2),
  ...makeProducts("shore_charger", 2),
];

test("intentionally disabled affiliate sources do not create false freshness attention", () => {
  const report = assessMarketHealth({
    key: "sk",
    locale: "sk-SK",
    expectedPublic: true,
    homepageHtml: `<head><link rel="canonical" href="${canonical}"></head>`,
    canonicalUrl: canonical,
    sitemapUrls: [canonical],
    catalogs: [{
      sources: {
        activeMerchant: { status: "ok" },
        pendingAffiliate: { status: "disabled", error: "approval pending" },
      },
      products,
    }],
    guideCount: 9,
  });

  assert.equal(report.status, "healthy");
  assert.equal(report.sourceCount, 2);
  assert.equal(report.activeSourceCount, 1);
  assert.deepEqual(report.staleSources, []);
  assert.equal(report.qualityChecks.sourcesFresh, true);
  assert.ok(!report.attention.includes("SOURCE_NOT_FRESH:pendingAffiliate"));
});

test("a disabled-only catalog still cannot claim fresh active sources", () => {
  const report = assessMarketHealth({
    key: "sk",
    locale: "sk-SK",
    expectedPublic: true,
    homepageHtml: `<head><link rel="canonical" href="${canonical}"></head>`,
    canonicalUrl: canonical,
    sitemapUrls: [canonical],
    catalogs: [{ sources: { pendingAffiliate: { status: "disabled" } }, products }],
    guideCount: 9,
  });

  assert.equal(report.qualityChecks.sourcesFresh, false);
  assert.equal(report.activeSourceCount, 0);
});

function makeProducts(category, count) {
  return Array.from({ length: count }, (_, index) => ({
    id: `${category}-${index}`,
    category,
    productUrl: `https://shop.example/${category}/${index}`,
    affiliateUrl: `https://affiliate.example/${category}/${index}`,
  }));
}
