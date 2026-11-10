import { assertCompleteGa4Report, flattenGa4RunReport, normalizeWebHostname } from "./ga4-live-baseline.js";
import { dcdcReviewedModel } from "./dcdc-calculator-offers.js";

// Only the existing CZ DC-DC calculator. The direct product list is NOT
// equivalent to editorial-guide offers or the broader calculator funnel.
export const DCDC_BUYER_PATH = "/kalkulacky/dc-dc-nabijecka/";
export const DCDC_BUYER_VARIANTS = Object.freeze([
  "dcdc-ideal-target-only",
  "dcdc-longer-drive",
]);
const EVENTS = Object.freeze(["page_view", "product_choice_impression", "affiliate_click"]);
const REQUIRED_DIMENSIONS = Object.freeze(["eventName", "pagePath", "hostName"]);
const SOURCE_DIMENSION = "customEvent:source";
const MERCHANT_DIMENSION = "customEvent:merchant";
const PRODUCT_DIMENSION = "customEvent:productId";
const CTA_DIMENSION = "customEvent:ctaVariant";
const VARIANTS = new Set(DCDC_BUYER_VARIANTS);
const KNOWN_HOSTS = new Set(["mypowersetup.com", "www.mypowersetup.com"]);

export function ga4DcdcBuyerDimensionState(metadata = {}) {
  const dimensions = new Set((metadata?.dimensions || []).map(item => item?.apiName).filter(Boolean));
  const missing = REQUIRED_DIMENSIONS.filter(name => !dimensions.has(name));
  const exactSource = dimensions.has(SOURCE_DIMENSION) && dimensions.has(MERCHANT_DIMENSION);
  const sku = exactSource && dimensions.has(PRODUCT_DIMENSION);
  const variant = exactSource && dimensions.has(CTA_DIMENSION);
  return Object.freeze({
    ready: missing.length === 0,
    missing,
    // Without both registered dimensions, we can observe ONLY all-merchant
    // page totals. In particular, never call them direct buyer conversions.
    offerAttribution: exactSource ? "merchant_and_source" : "page_only_all_merchants",
    skuAttribution: sku ? "ga4_product_event" : "not_measured",
    variantAttribution: variant ? "ga4_cta_variant_event" : "not_measured",
    dimensions: [
      ...REQUIRED_DIMENSIONS,
      ...(exactSource ? [SOURCE_DIMENSION, MERCHANT_DIMENSION] : []),
      ...(sku ? [PRODUCT_DIMENSION] : []),
      ...(variant ? [CTA_DIMENSION] : []),
    ],
  });
}

export function ga4DcdcBuyerFilter(targetHostname = "mypowersetup.com") {
  const host = normalizeWebHostname(targetHostname);
  if (!KNOWN_HOSTS.has(host)) throw new Error("GA4_DCDC_TARGET_HOST_INVALID");
  return {
    andGroup: {
      expressions: [
        { filter: { fieldName: "hostName", inListFilter: {
          values: [...KNOWN_HOSTS], caseSensitive: false,
        } } },
        { filter: { fieldName: "pagePath", stringFilter: {
          matchType: "EXACT", value: DCDC_BUYER_PATH, caseSensitive: true,
        } } },
        { filter: { fieldName: "eventName", inListFilter: {
          values: [...EVENTS], caseSensitive: true,
        } } },
      ],
    },
  };
}

function eventCount(value) {
  if (value === null || value === undefined || String(value).trim() === "")
    throw new Error("GA4_DCDC_EVENT_COUNT_MISSING");
  const count = Number(value);
  if (!Number.isSafeInteger(count) || count < 0)
    throw new Error("GA4_DCDC_EVENT_COUNT_INVALID");
  return count;
}

function addCount(store, label, eventName, count) {
  const row = store.get(label) || { impressionEvents: 0, clickEvents: 0 };
  if (eventName === "affiliate_click") row.clickEvents += count;
  else row.impressionEvents += count;
  store.set(label, row);
}

function orderedEvents(store, key) {
  return [...store].map(([label, counters]) => ({ [key]: label, ...counters }))
    .sort((a,b) => b.clickEvents-a.clickEvents || b.impressionEvents-a.impressionEvents ||
      a[key].localeCompare(b[key]));
}

/**
 * These are consented GA4 *event counts*, NOT unique shoppers, completed
 * purchases, paid commissions or verified merchant conversions.
 */
export function dcdcBuyerFromGa4RunReport(report, state) {
  if (!state?.ready) throw new Error("GA4_DCDC_REQUIRED_DIMENSIONS_MISSING");
  const complete = assertCompleteGa4Report(report);
  const dimensionHeaders = new Set((complete.dimensionHeaders || []).map(x => x?.name));
  const metricHeaders = new Set((complete.metricHeaders || []).map(x => x?.name));
  if (state.dimensions.some(name => !dimensionHeaders.has(name)) || !metricHeaders.has("eventCount"))
    throw new Error("GA4_DCDC_REPORT_HEADERS_INCOMPLETE");

  const totals = { pageViews: 0, productImpressions: 0, affiliateClicks: 0 };
  const skuEvents = new Map();
  const variantEvents = new Map();
  const unclassifiedVariantEvents = { impressionEvents: 0, clickEvents: 0 };
  const unclassifiedProductEvents = { impressionEvents: 0, clickEvents: 0 };
  const exactSource = state.offerAttribution === "merchant_and_source";

  for (const row of flattenGa4RunReport(complete)) {
    if (row.pagePath !== DCDC_BUYER_PATH || !KNOWN_HOSTS.has(row.hostName) ||
        !EVENTS.includes(row.eventName))
      throw new Error("GA4_DCDC_UNEXPECTED_HOST_PAGE_OR_EVENT");
    const count = eventCount(row.eventCount);

    if (row.eventName === "page_view") {
      totals.pageViews += count;
      continue;
    }
    if (exactSource && (row[SOURCE_DIMENSION] !== "dcdc-calculator-compare"
      || row[MERCHANT_DIMENSION] !== "vselektro")) continue;

    if (row.eventName === "affiliate_click") totals.affiliateClicks += count;
    else totals.productImpressions += count;

    if (state.variantAttribution === "ga4_cta_variant_event") {
      const variant = row[CTA_DIMENSION];
      if (VARIANTS.has(variant)) addCount(variantEvents, variant, row.eventName, count);
      else if (row.eventName === "affiliate_click") unclassifiedVariantEvents.clickEvents += count;
      else unclassifiedVariantEvents.impressionEvents += count;
    }
    if (state.skuAttribution === "ga4_product_event") {
      const id = row[PRODUCT_DIMENSION];
      if (dcdcReviewedModel(id)) addCount(skuEvents, id, row.eventName, count);
      else if (row.eventName === "affiliate_click") unclassifiedProductEvents.clickEvents += count;
      else unclassifiedProductEvents.impressionEvents += count;
    }
  }

  return Object.freeze({
    status: "ready",
    path: DCDC_BUYER_PATH,
    metricUnit: "consented_event_count",
    attribution: state.offerAttribution,
    variantAttribution: state.variantAttribution,
    skuAttribution: state.skuAttribution,
    totals: Object.freeze(totals),
    variantEvents: orderedEvents(variantEvents, "ctaVariant"),
    productEvents: orderedEvents(skuEvents, "productId"),
    // When dimension is not registered, missing is not an observed zero.
    unclassifiedVariantEvents: state.variantAttribution === "ga4_cta_variant_event"
      ? unclassifiedVariantEvents : null,
    unclassifiedProductEvents: state.skuAttribution === "ga4_product_event"
      ? unclassifiedProductEvents : null,
    merchantConversionsMeasured: false,
    revenueMeasured: false,
  });
}
