export const BUTLER_TECHNIK_AWIN = Object.freeze({
  merchantId: 31291,
  affiliateId: 3044971,
  hostname: "www.butlertechnik.com",
  approvalConfirmed: false
});

export const BUTLER_VICTRON_MPPT_250_60_MC4 = Object.freeze({
  partNumber: "SCC125060321",
  category: "controller",
  mppt: true,
  currentA: 60,
  chargingVoltagesV: [12, 24, 48],
  pvWattsBySystemVoltage: Object.freeze({ 12: 860, 24: 1720 }),
  exactPath: "/item/Victron/SmartSolar-MPPT-250-60-MC4/BT2",
  verifiedAt: "2026-09-07"
});

export const BUTLER_VICTRON_ORION_XS_12_12_50 = Object.freeze({
  slug: "orion-xs-12-12-50",
  category: "dc_charger",
  currentA: 50,
  powerW: 700,
  inputVoltagesV: Object.freeze([12]),
  chargingVoltagesV: Object.freeze([12]),
  batteryTypes: Object.freeze(["lifepo4", "lead_acid"]),
  smartAlternatorCompatible: true,
  efficiencyPercent: 98.5,
  exactPath: "/item/Victron/Smart-Buckboost-50A-700W-non-iso-DC-DC-charger/BPV",
  verifiedAt: "2026-09-07"
});

export const BUTLER_SUPPORTED_MARKETS = Object.freeze(["sk", "pl", "hu", "pt", "ro", "si"]);

const BUTLER_EXACT_PRODUCTS = Object.freeze([
  BUTLER_VICTRON_MPPT_250_60_MC4,
  BUTLER_VICTRON_ORION_XS_12_12_50
]);

function exactCandidateProduct(destination) {
  let url;
  try {
    url = new URL(destination);
  } catch {
    return null;
  }

  if (url.protocol !== "https:" || url.hostname !== BUTLER_TECHNIK_AWIN.hostname) return null;
  return BUTLER_EXACT_PRODUCTS.find((product) => product.exactPath === url.pathname) || null;
}

export function buildButlerAffiliateUrl(destination, { approvalConfirmed = BUTLER_TECHNIK_AWIN.approvalConfirmed } = {}) {
  if (!approvalConfirmed || !exactCandidateProduct(destination)) return null;

  const url = new URL("https://www.awin1.com/cread.php");
  url.searchParams.set("awinmid", String(BUTLER_TECHNIK_AWIN.merchantId));
  url.searchParams.set("awinaffid", String(BUTLER_TECHNIK_AWIN.affiliateId));
  url.searchParams.set("ued", destination);
  return url.toString();
}

function createCandidate(product, {
  destination,
  inStock,
  shippableMarkets = [],
  approvalConfirmed = BUTLER_TECHNIK_AWIN.approvalConfirmed
} = {}) {
  const exactProduct = exactCandidateProduct(destination);
  const destinationMatches = exactProduct === product;
  const affiliateUrl = destinationMatches ? buildButlerAffiliateUrl(destination, { approvalConfirmed }) : null;
  const verifiedMarkets = BUTLER_SUPPORTED_MARKETS.filter((market) => shippableMarkets.includes(market));

  return {
    id: `butler-${product.partNumber || product.slug}`,
    merchant: "butler_technik",
    ...product,
    destination: destinationMatches ? destination : null,
    affiliateUrl,
    availability: inStock === true ? "in_stock" : "unavailable",
    verifiedMarkets,
    recommendationEligible: Boolean(affiliateUrl && inStock === true && verifiedMarkets.length > 0)
  };
}

export function createButlerVictronCandidate(options = {}) {
  return createCandidate(BUTLER_VICTRON_MPPT_250_60_MC4, options);
}

export function createButlerOrionXsCandidate(options = {}) {
  return createCandidate(BUTLER_VICTRON_ORION_XS_12_12_50, options);
}
