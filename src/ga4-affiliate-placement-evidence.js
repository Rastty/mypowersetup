import { assertCompleteGa4Report, flattenGa4RunReport, normalizeWebHostname } from "./ga4-live-baseline.js";

// These six live calculator routes can emit the network-supported static
// placement labels. Do not infer the labels from an arbitrary GA4 pagePath.
export const CALCULATOR_NETWORK_PLACEMENTS = Object.freeze({
  "/kalkulacky/kapacita-baterie/": "battery_calculator",
  "/kalkulacky/mppt-regulator/": "mppt_calculator",
  "/kalkulacky/vykon-menice/": "inverter_calculator",
  "/kalkulacky/dc-dc-nabijecka/": "dcdc_calculator",
  "/kalkulacky/solarni-panely/": "solar_calculator",
  "/sk/kalkulacky/solarne-panely/": "solar_calculator",
});
const HOSTS = Object.freeze(["mypowersetup.com", "www.mypowersetup.com"]);
const EVENTS = Object.freeze(["product_choice_impression", "affiliate_click"]);
const DIMENSIONS = Object.freeze(["eventName", "pagePath", "hostName", "customEvent:affiliatePlacement"]);

export function ga4AffiliatePlacementDimensionState(metadata = {}) {
  const found = new Set((metadata?.dimensions || []).map(x => x?.apiName).filter(Boolean));
  const missing = DIMENSIONS.filter(name => !found.has(name));
  return Object.freeze({ ready: missing.length === 0, missing, dimensions: [...DIMENSIONS] });
}

export function ga4AffiliatePlacementFilter(targetHostname = "mypowersetup.com") {
  if (!HOSTS.includes(normalizeWebHostname(targetHostname)))
    throw new Error("GA4_PLACEMENT_TARGET_HOST_INVALID");
  return { andGroup: { expressions: [
    { filter: { fieldName: "hostName", inListFilter: { values: [...HOSTS], caseSensitive: false } } },
    { filter: { fieldName: "pagePath", inListFilter: {
      values: Object.keys(CALCULATOR_NETWORK_PLACEMENTS), caseSensitive: true,
    } } },
    { filter: { fieldName: "eventName", inListFilter: { values: [...EVENTS], caseSensitive: true } } },
  ] } };
}

function count(value) {
  if (value === undefined || value === null || String(value).trim() === "")
    throw new Error("GA4_PLACEMENT_EVENT_COUNT_MISSING");
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < 0)
    throw new Error("GA4_PLACEMENT_EVENT_COUNT_INVALID");
  return number;
}

/**
 * Constrained GA4 event evidence, never a merchant click receipt or sale.
 * Missing/unknown/mismatched static labels remain explicitly unclassified;
 * they must not be silently turned into labelled affiliate performance.
 */
export function affiliatePlacementsFromGa4RunReport(report = {}, state) {
  if (!state?.ready) throw new Error("GA4_PLACEMENT_DIMENSION_NOT_REGISTERED");
  const complete = assertCompleteGa4Report(report);
  const headers = new Set((complete.dimensionHeaders || []).map(x => x?.name));
  const metrics = new Set((complete.metricHeaders || []).map(x => x?.name));
  if (state.dimensions.some(name => !headers.has(name)) || !metrics.has("eventCount"))
    throw new Error("GA4_PLACEMENT_REPORT_HEADERS_INCOMPLETE");

  const counts = new Map();
  const unclassified = { impressionEvents: 0, clickEvents: 0 };
  for (const row of flattenGa4RunReport(complete)) {
    const expected = CALCULATOR_NETWORK_PLACEMENTS[row.pagePath];
    if (!Object.hasOwn(CALCULATOR_NETWORK_PLACEMENTS, row.pagePath) ||
        !HOSTS.includes(row.hostName) || !EVENTS.includes(row.eventName))
      throw new Error("GA4_PLACEMENT_UNEXPECTED_HOST_PAGE_OR_EVENT");
    const amount = count(row.eventCount);
    const isClick = row.eventName === "affiliate_click";
    const field = isClick ? "clickEvents" : "impressionEvents";
    if (row["customEvent:affiliatePlacement"] !== expected) {
      unclassified[field] += amount;
      continue;
    }
    const current = counts.get(row.pagePath) || {
      path: row.pagePath, placement: expected, impressionEvents: 0, clickEvents: 0,
    };
    current[field] += amount;
    counts.set(row.pagePath, current);
  }

  return Object.freeze({
    status: "ready",
    metricUnit: "consented_event_count",
    attribution: "ga4_static_network_placement_label_only",
    routes: Object.keys(CALCULATOR_NETWORK_PLACEMENTS).map(path => {
      const row = counts.get(path) || {
        path, placement: CALCULATOR_NETWORK_PLACEMENTS[path], impressionEvents: 0, clickEvents: 0,
      };
      return { ...row, clickPerImpression: row.impressionEvents > 0
        ? row.clickEvents / row.impressionEvents : null };
    }),
    unclassified,
    // A missing GA4 event or network row is never evidence of zero sales.
    affiliateNetworkClicksVerified: false,
    merchantConversionsMeasured: false,
    revenueMeasured: false,
  });
}
