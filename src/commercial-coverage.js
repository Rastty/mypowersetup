const CORE_CATEGORIES = Object.freeze(["battery", "solar_panel", "controller"]);
const COMMERCIAL_CATEGORIES = Object.freeze([
  "battery", "solar_panel", "controller", "inverter", "dc_charger", "shore_charger", "power_station",
]);
const DESTINATION_PARAMS = Object.freeze(["desturl", "ued", "url"]);

function normalizedUrl(value) {
  try {
    const url = new URL(String(value || ""));
    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}

export function affiliatePointsToExactProduct(product) {
  const productUrl = normalizedUrl(product?.productUrl);
  const affiliateUrl = normalizedUrl(product?.affiliateUrl);
  if (!productUrl || !affiliateUrl) return false;

  const affiliate = new URL(affiliateUrl);
  for (const key of DESTINATION_PARAMS) {
    const destination = affiliate.searchParams.get(key);
    if (destination && normalizedUrl(destination) === productUrl) return true;
  }

  // A merchant may expose an already-attributed direct product URL rather than
  // a redirect wrapper. Accept it only when it is literally the same product URL.
  return affiliateUrl === productUrl;
}

export function isCommerciallyEligibleProduct(product, sources = {}) {
  if (!product || product.available === false || product.staleSource === true) return false;
  const source = sources?.[product.merchant];
  if (source && source.status !== "ok") return false;
  if (!COMMERCIAL_CATEGORIES.includes(product.category)) return false;
  return affiliatePointsToExactProduct(product);
}

export function assessCatalogCommercialCoverage(catalog) {
  const products = Array.isArray(catalog?.products) ? catalog.products : [];
  const sources = catalog?.sources || {};
  const eligible = products.filter((product) => isCommerciallyEligibleProduct(product, sources));
  const counts = Object.fromEntries(COMMERCIAL_CATEGORIES.map((category) => [
    category,
    eligible.filter((product) => product.category === category).length,
  ]));
  const merchants = [...new Set(eligible.map((product) => product.merchant).filter(Boolean))].sort();
  const coreBlockers = CORE_CATEGORIES.filter((category) => counts[category] === 0);
  const breadthGaps = COMMERCIAL_CATEGORIES.filter((category) => counts[category] === 0);

  return Object.freeze({
    market: catalog?.market || "unknown",
    generatedAt: catalog?.generatedAt || null,
    eligibleProducts: eligible.length,
    totalProducts: products.length,
    merchants: Object.freeze(merchants),
    counts: Object.freeze(counts),
    coreReady: coreBlockers.length === 0,
    coreBlockers: Object.freeze(coreBlockers),
    breadthGaps: Object.freeze(breadthGaps),
    coreCoverageRatio: (CORE_CATEGORIES.length - coreBlockers.length) / CORE_CATEGORIES.length,
  });
}

export function assessPublicCommercialPortfolio(catalogs) {
  const reports = catalogs.map(assessCatalogCommercialCoverage);
  const blockers = reports.flatMap((report) => report.coreBlockers.map((category) => `${report.market}:${category}`));
  return Object.freeze({
    ready: blockers.length === 0,
    blockers: Object.freeze(blockers),
    markets: Object.freeze(reports),
  });
}
