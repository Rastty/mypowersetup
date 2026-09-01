import test from "node:test";
import assert from "node:assert/strict";
import { buildAffiliateClickParameters, buildAffiliateImpressionParameters, trackAffiliateClick, trackAffiliateImpressions } from "../src/affiliate-analytics.js";

test("affiliate clicks are sent exactly once with stable product dimensions", () => {
  const calls = [];
  const link = {
    dataset: {
      productId: "panel-200w",
      merchant: "padabo_sk",
      category: "solar_panel",
      source: "package",
      packageId: "recommended",
      recommendationRole: "recommended",
    },
  };

  const result = trackAffiliateClick(link, (...args) => {
    calls.push(args);
    return true;
  });

  assert.equal(result, true);
  assert.deepEqual(calls, [["affiliate_click", {
    productId: "panel-200w",
    merchant: "padabo_sk",
    category: "solar_panel",
    purchaseRoute: "components",
    source: "package",
    packageId: "recommended",
    recommendationRole: "recommended",
  }]]);
});

test("affiliate click dimensions use explicit fallbacks", () => {
  assert.deepEqual(buildAffiliateClickParameters({ dataset: {} }), {
    productId: "unknown",
    merchant: "unknown",
    category: "unknown",
    purchaseRoute: "unknown",
    source: "unknown",
    packageId: undefined,
    recommendationRole: undefined,
  });
  assert.equal(trackAffiliateClick(null, null), false);
});

test("affiliate clicks distinguish portable and component purchase routes", () => {
  assert.equal(buildAffiliateClickParameters({ dataset: { category: "power_station" } }).purchaseRoute, "portable");
  assert.equal(buildAffiliateClickParameters({ dataset: { category: "battery" } }).purchaseRoute, "components");
});

test("choice impressions provide exclusive CTR denominators by role and purchase route", () => {
  const links = [
    { dataset: { category: "battery", recommendationRole: "recommended" } },
    { dataset: { category: "solar_panel", recommendationRole: "budget" } },
    { dataset: { category: "inverter", recommendationRole: "reserve" } },
    { dataset: { category: "controller", recommendationRole: "alternative" } },
    { dataset: { category: "power_station", recommendationRole: "recommended" } },
  ];
  assert.deepEqual(buildAffiliateImpressionParameters(links), {
    productCount: 5,
    componentCount: 4,
    portableCount: 1,
    recommendedCount: 2,
    budgetCount: 1,
    reserveCount: 1,
    alternativeCount: 1,
    unknownRoleCount: 0,
  });

  const calls = [];
  assert.equal(trackAffiliateImpressions(links, (...args) => { calls.push(args); return true; }), true);
  assert.deepEqual(calls, [["product_choices_rendered", buildAffiliateImpressionParameters(links)]]);
});
