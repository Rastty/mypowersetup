import { assertCompleteGa4Report, flattenGa4RunReport, normalizeWebHostname } from "./ga4-live-baseline.js";
import { EXPANSION_SUPPLY_EVENTS } from "./expansion-supply-evidence.js";

// Only the three public expansion calculators. Exact built-in GA4 dimensions
// allow an observed buyer-intent supply gap to be distinguished from a failed
// merchant feed even before optional event-scoped custom dimensions exist.
export const EXPANSION_SUPPLY_PAGES = Object.freeze({
  pt: "/pt/",
  ro: "/ro/",
  si: "/si/",
});
const HOSTS = Object.freeze(["mypowersetup.com", "www.mypowersetup.com"]);
const REQUIRED = Object.freeze(["eventName", "pagePath", "hostName"]);
const EVENT_NAMES = Object.freeze(Object.values(EXPANSION_SUPPLY_EVENTS));

export function ga4ExpansionSupplyDimensionState(metadata = {}) {
  const available = new Set((metadata?.dimensions || []).map(item => item?.apiName).filter(Boolean));
  const missing = REQUIRED.filter(name => !available.has(name));
  return Object.freeze({ ready: missing.length === 0, missing, dimensions: [...REQUIRED] });
}

export function ga4ExpansionSupplyFilter(hostname = "mypowersetup.com") {
  if (!HOSTS.includes(normalizeWebHostname(hostname))) throw new Error("GA4_EXPANSION_SUPPLY_HOST_INVALID");
  return {
    andGroup: {
      expressions: [
        { filter: { fieldName: "hostName", inListFilter: { values: [...HOSTS], caseSensitive: false } } },
        { filter: { fieldName: "pagePath", inListFilter: { values: Object.values(EXPANSION_SUPPLY_PAGES), caseSensitive: true } } },
        { filter: { fieldName: "eventName", inListFilter: { values: [...EVENT_NAMES], caseSensitive: true } } },
      ],
    },
  };
}

function eventCount(value) {
  if (value === null || value === undefined || String(value).trim() === "")
    throw new Error("GA4_EXPANSION_SUPPLY_COUNT_MISSING");
  const count = Number(value);
  if (!Number.isSafeInteger(count) || count < 0) throw new Error("GA4_EXPANSION_SUPPLY_COUNT_INVALID");
  return count;
}

export function expansionSupplyFromGa4RunReport(report, dimensionState) {
  if (!dimensionState?.ready) throw new Error("GA4_EXPANSION_SUPPLY_DIMENSIONS_MISSING");
  const complete = assertCompleteGa4Report(report);
  const headers = new Set((complete.dimensionHeaders || []).map(item => item?.name));
  const metrics = new Set((complete.metricHeaders || []).map(item => item?.name));
  if (REQUIRED.some(name => !headers.has(name)) || !metrics.has("eventCount"))
    throw new Error("GA4_EXPANSION_SUPPLY_HEADERS_INCOMPLETE");

  const rows = Object.entries(EXPANSION_SUPPLY_PAGES).map(([market, path]) => ({
    market, path, complete: 0, inverterMissing: 0, otherMissing: 0, unavailable: 0,
  }));
  const byPath = new Map(rows.map(row => [row.path, row]));
  const eventKey = new Map(Object.entries(EXPANSION_SUPPLY_EVENTS).map(([key, event]) => [event, key]));
  for (const row of flattenGa4RunReport(complete)) {
    if (!HOSTS.includes(row.hostName) || !byPath.has(row.pagePath) || !eventKey.has(row.eventName))
      throw new Error("GA4_EXPANSION_SUPPLY_UNEXPECTED_HOST_PAGE_OR_EVENT");
    const target = byPath.get(row.pagePath);
    target[eventKey.get(row.eventName)] += eventCount(row.eventCount);
    if (!Number.isSafeInteger(target[eventKey.get(row.eventName)]))
      throw new Error("GA4_EXPANSION_SUPPLY_COUNT_OVERFLOW");
  }
  return Object.freeze({
    status: "ready",
    attribution: "exact_host_page_event",
    metricUnit: "consented_calculation_event_count",
    historicalIntentCaveat: "Before the deliberate-submit release, shared-link auto-renders could emit the same events. Do not compare pre/post-release counts as equivalent buyer intent without separating the periods.",
    rows: rows.map(row => Object.freeze({
      ...row,
      verifiedCatalogCalculations: row.complete + row.inverterMissing + row.otherMissing,
      observedCalculations: row.complete + row.inverterMissing + row.otherMissing + row.unavailable,
    })),
    merchantConversionsMeasured: false,
    revenueMeasured: false,
    // Calculations are events, not unique shoppers, checkout or commissions.
  });
}
