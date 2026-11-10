import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  DCDC_BUYER_PATH, DCDC_BUYER_VARIANTS, ga4DcdcBuyerDimensionState,
  ga4DcdcBuyerFilter, dcdcBuyerFromGa4RunReport,
} from "../src/ga4-dcdc-buyer-evidence.js";

const PATH = DCDC_BUYER_PATH;
const source = ["customEvent:source", "customEvent:merchant"];
const sku = "customEvent:productId";
const variant = "customEvent:ctaVariant";
const dimensions = (...fields) => ({
  dimensions: ["eventName", "pagePath", "hostName", ...fields].map(apiName => ({ apiName })),
});
const observed = (eventName, eventCount, extras = {}) => ({
  eventName, eventCount: String(eventCount), pagePath: PATH, hostName: "mypowersetup.com", ...extras,
});
const eventAttrs = (productId, ctaVariant) => ({
  "customEvent:source": "dcdc-calculator-compare",
  "customEvent:merchant": "vselektro",
  "customEvent:productId": productId,
  "customEvent:ctaVariant": ctaVariant,
});
function report(rows, fields = []) {
  const names = ["eventName", "pagePath", "hostName", ...fields];
  return {
    rowCount: rows.length,
    dimensionHeaders: names.map(name => ({ name })),
    metricHeaders: [{ name: "eventCount" }],
    rows: rows.map(row => ({
      dimensionValues: names.map(name => ({ value: row[name] ?? "(not set)" })),
      metricValues: [{ value: row.eventCount }],
    })),
  };
}

test("direct DC-DC buyer report filters only the exact local route and approved hosts", () => {
  assert.equal(PATH, "/kalkulacky/dc-dc-nabijecka/");
  assert.deepEqual(DCDC_BUYER_VARIANTS, ["dcdc-ideal-target-only", "dcdc-longer-drive"]);
  const rules = ga4DcdcBuyerFilter().andGroup.expressions;
  assert.equal(rules[0].filter.fieldName, "hostName");
  assert.deepEqual(rules[0].filter.inListFilter.values, ["mypowersetup.com", "www.mypowersetup.com"]);
  assert.deepEqual(rules[1].filter.stringFilter, {
    matchType: "EXACT", value: PATH, caseSensitive: true,
  });
  assert.equal(rules[2].filter.fieldName, "eventName");
  assert.deepEqual(rules[2].filter.inListFilter.values,
    ["page_view", "product_choice_impression", "affiliate_click"]);
  for (const wrong of ["untrusted.example", "shop.mypowersetup.com", "example.com"]) {
    assert.throws(() => ga4DcdcBuyerFilter(wrong), /GA4_DCDC_TARGET_HOST_INVALID/);
  }
  assert.doesNotThrow(() => ga4DcdcBuyerFilter("www.mypowersetup.com"));
});

test("missing source or merchant dimension reports page totals, never verified DC-DC buyer events", () => {
  for (const metadata of [dimensions(), dimensions("customEvent:source"),
    dimensions("customEvent:merchant", variant, sku)]) {
    const state = ga4DcdcBuyerDimensionState(metadata);
    assert.equal(state.ready, true);
    assert.equal(state.offerAttribution, "page_only_all_merchants");
    assert.equal(state.variantAttribution, "not_measured");
    assert.equal(state.skuAttribution, "not_measured");
    assert.deepEqual(state.dimensions, ["eventName", "pagePath", "hostName"]);
    const result = dcdcBuyerFromGa4RunReport(report([
      observed("page_view", 25),
      observed("product_choice_impression", 7),
      observed("affiliate_click", 3),
    ]), state);
    assert.deepEqual(result.totals, { pageViews: 25, productImpressions: 7, affiliateClicks: 3 });
    assert.equal(result.attribution, "page_only_all_merchants");
    assert.deepEqual(result.variantEvents, []);
    assert.deepEqual(result.productEvents, []);
    assert.equal(result.unclassifiedVariantEvents, null);
    assert.equal(result.unclassifiedProductEvents, null);
    assert.equal(result.metricUnit, "consented_event_count");
    assert.equal(result.merchantConversionsMeasured, false);
    assert.equal(result.revenueMeasured, false);
  }
});

test("registered merchant+source dimensions attribute only actual direct calculator offers", () => {
  const state = ga4DcdcBuyerDimensionState(dimensions(...source));
  assert.equal(state.offerAttribution, "merchant_and_source");
  assert.equal(state.variantAttribution, "not_measured");
  assert.equal(state.skuAttribution, "not_measured");
  const rows = [
    observed("page_view", 20),
    observed("product_choice_impression", 8,
      { "customEvent:source": "dcdc-calculator-compare", "customEvent:merchant": "vselektro" }),
    observed("affiliate_click", 3,
      { "customEvent:source": "dcdc-calculator-compare", "customEvent:merchant": "vselektro" }),
    observed("affiliate_click", 12,
      { "customEvent:source": "editorial-comparison", "customEvent:merchant": "vselektro" }),
    observed("affiliate_click", 7,
      { "customEvent:source": "dcdc-calculator-compare", "customEvent:merchant": "unknown" }),
  ];
  const result = dcdcBuyerFromGa4RunReport(report(rows, source), state);
  assert.deepEqual(result.totals, { pageViews: 20, productImpressions: 8, affiliateClicks: 3 });
  assert.deepEqual(result.productEvents, []);
  assert.deepEqual(result.variantEvents, []);
});

test("direct SKU and drive-time variants are grouped only when corresponding GA4 custom dimensions exist", () => {
  const fields = [...source, sku, variant];
  const state = ga4DcdcBuyerDimensionState(dimensions(...fields));
  assert.equal(state.offerAttribution, "merchant_and_source");
  assert.equal(state.skuAttribution, "ga4_product_event");
  assert.equal(state.variantAttribution, "ga4_cta_variant_event");
  const fastSku = "vselektro:victron-orion-tr-12-12-18-isolated";
  const slowerSku = "vselektro:victron-orion-tr-12-12-30-isolated";
  const fast = eventAttrs(fastSku, "dcdc-ideal-target-only");
  const slower = eventAttrs(slowerSku, "dcdc-longer-drive");
  const rows = [
    observed("page_view", 50),
    observed("product_choice_impression", 9, fast),
    observed("affiliate_click", 3, fast),
    observed("product_choice_impression", 5, slower),
    observed("affiliate_click", 2, slower),
    observed("product_choice_impression", 2, eventAttrs("vselektro:unknown", "(not set)")),
    observed("affiliate_click", 1, eventAttrs("fake:not-reviewed", "dcdc-longer-drive")),
    observed("affiliate_click", 20, { ...fast, "customEvent:source": "editorial-comparison" }),
    observed("affiliate_click", 10, { ...slower, "customEvent:merchant": "another" }),
  ];
  const result = dcdcBuyerFromGa4RunReport(report(rows, fields), state);
  assert.deepEqual(result.totals, { pageViews: 50, productImpressions: 16, affiliateClicks: 6 });
  assert.deepEqual(result.variantEvents, [
    { ctaVariant: "dcdc-ideal-target-only", impressionEvents: 9, clickEvents: 3 },
    { ctaVariant: "dcdc-longer-drive", impressionEvents: 5, clickEvents: 3 },
  ]);
  assert.deepEqual(result.unclassifiedVariantEvents, { impressionEvents: 2, clickEvents: 0 });
  assert.deepEqual(result.productEvents, [
    { productId: fastSku, impressionEvents: 9, clickEvents: 3 },
    { productId: slowerSku, impressionEvents: 5, clickEvents: 2 },
  ]);
  assert.deepEqual(result.unclassifiedProductEvents, { impressionEvents: 2, clickEvents: 1 });
  assert.equal(result.merchantConversionsMeasured, false);
  assert.equal(result.revenueMeasured, false);
});

test("partial optional attribution still preserves direct aggregate without fabricating variant or SKU counts", () => {
  const onlyProduct = ga4DcdcBuyerDimensionState(dimensions(...source, sku));
  assert.equal(onlyProduct.skuAttribution, "ga4_product_event");
  assert.equal(onlyProduct.variantAttribution, "not_measured");
  assert.deepEqual(onlyProduct.dimensions, ["eventName", "pagePath", "hostName", ...source, sku]);
  const onlyVariant = ga4DcdcBuyerDimensionState(dimensions(...source, variant));
  assert.equal(onlyVariant.skuAttribution, "not_measured");
  assert.equal(onlyVariant.variantAttribution, "ga4_cta_variant_event");
  assert.deepEqual(onlyVariant.dimensions, ["eventName", "pagePath", "hostName", ...source, variant]);
});

test("valid empty GA4 report is an observed empty period, not inaccessible evidence", () => {
  const state = ga4DcdcBuyerDimensionState(dimensions(...source, sku, variant));
  const result = dcdcBuyerFromGa4RunReport(report([], state.dimensions.slice(3)), state);
  assert.equal(result.status, "ready");
  assert.deepEqual(result.totals, { pageViews: 0, productImpressions: 0, affiliateClicks: 0 });
  assert.deepEqual(result.productEvents, []);
  assert.deepEqual(result.variantEvents, []);
  assert.deepEqual(result.unclassifiedVariantEvents, { impressionEvents: 0, clickEvents: 0 });
});

test("wrong host, source page, unrequested event or truncated report never becomes a verified buyer success", () => {
  const state = ga4DcdcBuyerDimensionState(dimensions());
  assert.throws(() => dcdcBuyerFromGa4RunReport(report([]),
    ga4DcdcBuyerDimensionState({})), /GA4_DCDC_REQUIRED_DIMENSIONS_MISSING/);
  for (const changed of [
    { pagePath: "/pruvodce/jak-vybrat-dc-dc-nabijecku/" },
    { hostName: "fake.example" },
    { eventName: "purchase" },
  ]) {
    const rows = [observed("affiliate_click", 2, changed)];
    assert.throws(() => dcdcBuyerFromGa4RunReport(report(rows), state),
      /GA4_DCDC_UNEXPECTED_HOST_PAGE_OR_EVENT/);
  }
  assert.throws(() => dcdcBuyerFromGa4RunReport({ ...report([]), rowCount: 5 }, state),
    /GA4_REPORT_ROWS_INCOMPLETE/);
  assert.throws(() => dcdcBuyerFromGa4RunReport({
    ...report([]), dimensionHeaders: [{ name: "eventName" }],
  }, state), /GA4_DCDC_REPORT_HEADERS_INCOMPLETE/);
  const exact = ga4DcdcBuyerDimensionState(dimensions(...source));
  assert.throws(() => dcdcBuyerFromGa4RunReport(report([]), exact),
    /GA4_DCDC_REPORT_HEADERS_INCOMPLETE/);
});

test("malformed or negative event counts cannot be reported as clicks", () => {
  const state = ga4DcdcBuyerDimensionState(dimensions());
  for (const invalid of ["", null, undefined, "-1", "1.1", "Infinity",
    "9007199254740993", "-Infinity"]) {
    const sample = report([observed("affiliate_click", 3)]);
    sample.rows[0].metricValues[0].value = invalid;
    assert.throws(() => dcdcBuyerFromGa4RunReport(sample, state),
      /GA4_DCDC_EVENT_COUNT_(?:INVALID|MISSING)/);
  }
  assert.equal(dcdcBuyerFromGa4RunReport(report([observed("affiliate_click", 0)]), state)
    .totals.affiliateClicks, 0);
});

test("existing GA4 exporter wires independent direct buyer evidence without changing browser tracking", async () => {
  const cli = await readFile(new URL("../scripts/report-ga4-calculator-live.mjs", import.meta.url), "utf8");
  assert.match(cli, /ga4DcdcBuyerDimensionState\(metadata\)/);
  assert.match(cli, /ga4DcdcBuyerFilter\(targetHostname\)/);
  assert.match(cli, /dcdcBuyerFromGa4RunReport\(dcdcReport, dcdcBuyerDimensions\)/);
  assert.match(cli, /limit: "10000"/);
  assert.match(cli, /dcdcBuyer,\s*status: customDimensions\.ready/);
  assert.match(cli, /Direct DC-DC GA4 consented events/);
});
