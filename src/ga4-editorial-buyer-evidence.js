import { assertCompleteGa4Report, flattenGa4RunReport, normalizeWebHostname } from "./ga4-live-baseline.js";

// Only the six existing reviewed CZ commercial guides. Do not mix these
// on-page outbound events with calculator-origin attribution.
export const EDITORIAL_BUYER_PATHS = Object.freeze([
  "/pruvodce/kapacita-baterie-do-karavanu/",
  "/pruvodce/lifepo4-100ah-nebo-200ah-karavan/",
  "/pruvodce/jak-vybrat-mppt-regulator/",
  "/pruvodce/victron-mppt-100-20-vs-100-30-vs-100-50/",
  "/pruvodce/jak-vybrat-dc-dc-nabijecku/",
  "/pruvodce/dc-dc-nabijecka-18a-vs-30a-vs-50a-karavan/",
]);
const EVENTS = Object.freeze(["page_view", "product_choice_impression", "affiliate_click"]);
const REQUIRED_DIMENSIONS = Object.freeze(["eventName", "pagePath", "hostName"]);
const SOURCE_DIMENSION = "customEvent:source";
const MERCHANT_DIMENSION = "customEvent:merchant";
const PRODUCT_DIMENSION = "customEvent:productId";
const PATHS = new Set(EDITORIAL_BUYER_PATHS);

const unknown = "not_measured";

export function ga4EditorialBuyerDimensionState(metadata = {}) {
  const dimensions = new Set((metadata?.dimensions || []).map(item => item?.apiName).filter(Boolean));
  const missing = REQUIRED_DIMENSIONS.filter(value => !dimensions.has(value));
  const exactSource = dimensions.has(SOURCE_DIMENSION) && dimensions.has(MERCHANT_DIMENSION);
  return Object.freeze({
    ready: missing.length === 0,
    missing,
    // Without BOTH registered event dimensions the GA4 Data API can prove
    // only aggregate clicks on the page, not that they were reviewed SKUs.
    offerAttribution: exactSource ? "merchant_and_source" : "page_only_all_merchants",
    skuAttribution: exactSource && dimensions.has(PRODUCT_DIMENSION) ? "ga4_product_event" : unknown,
    dimensions: [...REQUIRED_DIMENSIONS,
      ...(exactSource ? [SOURCE_DIMENSION, MERCHANT_DIMENSION] : []),
      ...(exactSource && dimensions.has(PRODUCT_DIMENSION) ? [PRODUCT_DIMENSION] : [])],
  });
}

export function ga4EditorialBuyerFilter(targetHostname = "mypowersetup.com") {
  const host = normalizeWebHostname(targetHostname);
  if (host !== "mypowersetup.com" && host !== "www.mypowersetup.com")
    throw new Error("GA4_EDITORIAL_TARGET_HOST_INVALID");
  return {
    andGroup: {
      expressions: [
        { filter: { fieldName: "hostName", inListFilter: {
          values: ["mypowersetup.com", "www.mypowersetup.com"], caseSensitive: false,
        } } },
        { filter: { fieldName: "pagePath", inListFilter: {
          values: [...EDITORIAL_BUYER_PATHS], caseSensitive: true,
        } } },
        { filter: { fieldName: "eventName", inListFilter: {
          values: [...EVENTS], caseSensitive: true,
        } } },
      ],
    },
  };
}

function requireCount(value, field) {
  if (value === null || value === undefined || !String(value).trim())
    throw new Error("GA4_EDITORIAL_" + field + "_MISSING");
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < 0)
    throw new Error("GA4_EDITORIAL_" + field + "_INVALID");
  return number;
}

export function editorialBuyerFromGa4RunReport(report, state) {
  if (!state?.ready) throw new Error("GA4_EDITORIAL_REQUIRED_DIMENSIONS_MISSING");
  const complete = assertCompleteGa4Report(report);
  const actualDimensions = new Set((complete.dimensionHeaders || []).map(x => x?.name));
  const actualMetrics = new Set((complete.metricHeaders || []).map(x => x?.name));
  if (state.dimensions.some(name => !actualDimensions.has(name)) || !actualMetrics.has("eventCount"))
    throw new Error("GA4_EDITORIAL_REPORT_HEADERS_INCOMPLETE");
  const rows = new Map(EDITORIAL_BUYER_PATHS.map(path => [path, {
    path, pageViews: 0, productImpressions: 0, affiliateClicks: 0,
  }]));
  const skuActions = new Map();
  for (const row of flattenGa4RunReport(complete)) {
    if (!PATHS.has(row.pagePath) || !["mypowersetup.com", "www.mypowersetup.com"].includes(row.hostName) ||
        !EVENTS.includes(row.eventName))
      throw new Error("GA4_EDITORIAL_UNEXPECTED_HOST_PAGE_OR_EVENT");
    const count = requireCount(row.eventCount, "EVENT_COUNT");
    const target = rows.get(row.pagePath);
    if (row.eventName === "page_view") {
      target.pageViews += count;
      continue;
    }
    if (state.offerAttribution === "merchant_and_source" &&
        (row[SOURCE_DIMENSION] !== "editorial-comparison" || row[MERCHANT_DIMENSION] !== "vselektro"))
      continue;
    if (row.eventName === "product_choice_impression") target.productImpressions += count;
    else target.affiliateClicks += count;

    // A GA4 product dimension is an observed client-side event label,
    // NEVER a paid merchant transaction or confirmed product sale.
    if (state.skuAttribution === "ga4_product_event") {
      const productId = row[PRODUCT_DIMENSION];
      if (!/^vselektro:[a-z0-9-]{4,}$/.test(productId || "")) continue;
      const key = row.pagePath + "\t" + productId;
      const current = skuActions.get(key) || { path: row.pagePath, productId, impressionEvents: 0, clickEvents: 0 };
      if (row.eventName === "product_choice_impression") current.impressionEvents += count;
      else current.clickEvents += count;
      skuActions.set(key, current);
    }
  }
  return Object.freeze({
    status: "ready",
    attribution: state.offerAttribution,
    skuAttribution: state.skuAttribution,
    // These are consented GA4 event COUNTS, not unique users, CTR or sales.
    metricUnit: "consented_event_count",
    rows: [...rows.values()].map(row => Object.freeze(row)),
    productEvents: [...skuActions.values()].sort((a,b) =>
      b.clickEvents-a.clickEvents || b.impressionEvents-a.impressionEvents ||
      a.path.localeCompare(b.path) || a.productId.localeCompare(b.productId)),
    merchantConversionsMeasured: false,
    revenueMeasured: false,
  });
}
