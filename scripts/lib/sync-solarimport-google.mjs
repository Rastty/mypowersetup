import { parseProductFeed } from "../../src/feed.js";
import { projectInverterCalculatorOffers, projectSolarCalculatorOffers } from "../../src/calculator-offer-catalog.js";

// A public, credential-free export from the SAME approved merchant. The
// authenticated Heureka export can return HTTP 200 with only battery rows.
// Never derive this URL from a keyed source or follow redirects.
export const SOLARIMPORT_GOOGLE_FEED_URL = "https://www.solar-import.cz/google/export/products.xml";
const MAX_FEED_BYTES = 8_000_000;
const MIN_REVIEWED_INVERTERS = 8;
const MIN_REVIEWED_PANELS = 1;

export function solarImportReviewedCounts(products, now = Date.now()) {
  const catalog = {
    generatedAt: new Date(now).toISOString(),
    sources: { solarimport: { status: "ok" } },
    products,
  };
  return {
    inverters: projectInverterCalculatorOffers(catalog, now).products.length,
    panels: projectSolarCalculatorOffers(catalog, now).products.length,
  };
}

export function solarImportNeedsFallback(products, now = Date.now()) {
  const { inverters, panels } = solarImportReviewedCounts(products, now);
  return inverters < MIN_REVIEWED_INVERTERS || panels < MIN_REVIEWED_PANELS;
}

export async function loadSolarImportGoogleFallback({
  fetchImpl = fetch,
  parseImpl = parseProductFeed,
  now = Date.now(),
} = {}) {
  const response = await fetchImpl(SOLARIMPORT_GOOGLE_FEED_URL, {
    redirect: "error",
    credentials: "omit",
    signal: AbortSignal.timeout(20_000),
    headers: {
      accept: "application/xml,text/xml,application/rss+xml",
      "user-agent": "MyPowerSetup merchant product catalog/1.0",
    },
  });
  if (!response.ok || (response.url && response.url !== SOLARIMPORT_GOOGLE_FEED_URL)) {
    throw new Error("SOLARIMPORT_GOOGLE_FEED_UNAVAILABLE");
  }
  if (!/\b(xml|rss)\b/i.test(response.headers.get("content-type") || "")) {
    throw new Error("SOLARIMPORT_GOOGLE_FEED_NOT_XML");
  }
  const contentLength = Number(response.headers.get("content-length"));
  if (contentLength > MAX_FEED_BYTES) throw new Error("SOLARIMPORT_GOOGLE_FEED_TOO_LARGE");
  const xml = await response.text();
  if (Buffer.byteLength(xml) > MAX_FEED_BYTES) throw new Error("SOLARIMPORT_GOOGLE_FEED_TOO_LARGE");
  const parsed = parseImpl(xml, "solarimport");
  const { inverters, panels } = solarImportReviewedCounts(parsed, now);
  // A second partial export must not magically renew stale buyer evidence.
  // Re-evaluate these exact independent SKU selections on every sync.
  if (inverters < MIN_REVIEWED_INVERTERS || panels < MIN_REVIEWED_PANELS) {
    throw new Error("SOLARIMPORT_GOOGLE_FEED_MISSING_REVIEWED_PATHS");
  }
  return { products: parsed, reviewedInverters: inverters, reviewedPanels: panels };
}
