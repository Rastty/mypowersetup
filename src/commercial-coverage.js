const CORE_CATEGORIES = Object.freeze(["battery", "solar_panel", "controller"]);
const COMMERCIAL_CATEGORIES = Object.freeze([
  "battery", "solar_panel", "controller", "inverter", "dc_charger", "shore_charger", "power_station",
]);
const DESTINATION_PARAMS = Object.freeze(["desturl", "ued", "url"]);

// Reviewed publisher/campaign identity for the merchants actually used by the
// public market catalogs. Exact-SKU destination equality alone does not prove
// an affiliate click can earn a commission: a lost publisher ID silently
// turns an apparently purchase-ready offer into an untracked outbound link.
// This is a site-specific contract; merchant activation remains an owner gate.
const APPROVED_AFFILIATE_IDS = Object.freeze({
  reslshop: ["ehub", "c38e2d15", "https://www.reslshop.cz"],
  svetkaravanu: ["ehub", "38137ac4", "https://www.svetkaravanu.cz"],
  solarimport: ["ehub", "35cb7fb0", "https://www.solar-import.cz"],
  batterycz: ["ehub", "7095cb16", "https://www.battery.cz"],
  vselektro: ["ehub", "f897865f", "https://www.vselektro.eu"],
  padabo_sk: ["ehub", "7aed5c13", "https://www.padabo.sk"],
  padabo_pl: ["ehub", "95d61abf", "https://www.padabo.pl"],
  padabo_hu: ["ehub", "0f2a2252", "https://www.padabo.hu"],
  ampul_cz: ["ehub", "ddb5edae", "https://ampul.eu"],
  ampul_sk: ["ehub", "ddb5edae", "https://ampul.eu"],
  ampul_pl: ["ehub", "ddb5edae", "https://ampul.eu"],
  ampul_hu: ["ehub", "ddb5edae", "https://ampul.eu"],
  allpowers_eu: ["awin", "38934", "https://iallpowers.eu"],
  allpowers_pl: ["awin", "121776", "https://allpowers.com.pl"],
  allpowers_pt: ["awin", "125820", "https://allpowers-pt.com"],
  powerqueen_eu: ["awin", "97025", "https://www.ipowerqueen.de"],
  oxe_sk: ["dognet", "2mRVFbhJ", "https://www.oxepower.sk"],
  oxe_pl: ["dognet", "2mRVFbhJ", "https://www.oxepower.pl"],
  oxe_hu: ["dognet", "v9mcMMKw", "https://www.oxe.hu"],
  oxe_ro: ["dognet", "2mRVFbhJ", "https://www.oxe.ro"],
  oxe_si: ["dognet", "2mRVFbhJ", "https://www.oxepower.si"],
});

export function hasApprovedAffiliateIdentity(product) {
  const contract = Object.hasOwn(APPROVED_AFFILIATE_IDS, product?.merchant)
    ? APPROVED_AFFILIATE_IDS[product.merchant] : null;
  if (!contract) return false;
  try {
    const [network, program, approvedOrigin] = contract;
    const outbound = new URL(product.affiliateUrl);
    const destination = new URL(product.productUrl);
    if (outbound.protocol !== "https:" || outbound.username || outbound.password || outbound.hash
      || destination.origin !== approvedOrigin || destination.username || destination.password
      || destination.hash || !destination.pathname || destination.pathname === "/") return false;

    let ids, destKey, allowed;
    if (network === "ehub") {
      if (outbound.origin !== "https://ehub.cz" || outbound.pathname !== "/system/scripts/click.php") return false;
      ids = { a_aid: "f34c86c8", a_bid: program };
      destKey = "desturl";
      allowed = new Set([...Object.keys(ids), destKey, "data1", "data2"]);
    } else if (network === "awin") {
      if (!["https://www.awin1.com", "https://awin1.com"].includes(outbound.origin)
        || outbound.pathname !== "/cread.php") return false;
      ids = { awinaffid: "3044971", awinmid: program };
      destKey = "ued";
      allowed = new Set([...Object.keys(ids), destKey, "clickref", "clickref2", "clickref3", "clickref4"]);
    } else if (network === "dognet") {
      if (outbound.origin !== "https://go.dognet.com" || outbound.pathname !== "/") return false;
      ids = { chid: program };
      destKey = "url";
      allowed = new Set([...Object.keys(ids), destKey]);
    } else return false;

    if (Object.entries(ids).some(([key, value]) => {
      const values = outbound.searchParams.getAll(key);
      return values.length !== 1 || values[0] !== value;
    })) return false;
    if (outbound.searchParams.getAll(destKey).length !== 1
      || [...outbound.searchParams.keys()].some(key => !allowed.has(key)
        || outbound.searchParams.getAll(key).length !== 1)) return false;
    return normalizedUrl(outbound.searchParams.get(destKey)) === normalizedUrl(product.productUrl);
  } catch {
    return false;
  }
}

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

  // Real approved merchants must have their exact monetizing publisher IDs.
  // Keep the generic destination-only fallback for synthetic/unconfigured
  // planning scenarios; CI separately forbids unapproved public merchants.
  if (Object.hasOwn(APPROVED_AFFILIATE_IDS, product?.merchant))
    return hasApprovedAffiliateIdentity(product);

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
