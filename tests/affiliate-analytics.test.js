import test from "node:test";
import assert from "node:assert/strict";
import { buildAffiliateClickParameters, trackAffiliateClick } from "../src/affiliate-analytics.js";

test("affiliate clicks are sent exactly once with stable product dimensions", () => {
  const calls = [];
  const link = {
    dataset: {
      productId: "panel-200w",
      merchant: "padabo_sk",
      category: "solar_panel",
      source: "package",
      packageId: "recommended",
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
    source: "package",
    packageId: "recommended",
  }]]);
});

test("affiliate click dimensions use explicit fallbacks", () => {
  assert.deepEqual(buildAffiliateClickParameters({ dataset: {} }), {
    productId: "unknown",
    merchant: "unknown",
    category: "unknown",
    source: "unknown",
    packageId: undefined,
  });
  assert.equal(trackAffiliateClick(null, null), false);
});
