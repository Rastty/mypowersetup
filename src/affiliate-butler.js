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
  verifiedAt: "2026-09-01"
});

export const BUTLER_SUPPORTED_MARKETS = Object.freeze(["sk", "pl", "hu", "pt", "ro", "si"]);

function isExactCandidateDestination(destination) {
  let url;
  try {
    url = new URL(destination);
  } catch {
    return false;
  }

  return url.protocol === "https:"
    && url.hostname === BUTLER_TECHNIK_AWIN.hostname
    && url.pathname === BUTLER_VICTRON_MPPT_250_60_MC4.exactPath;
}

export function buildButlerAffiliateUrl(destination, { approvalConfirmed = BUTLER_TECHNIK_AWIN.approvalConfirmed } = {}) {
  if (!approvalConfirmed || !isExactCandidateDestination(destination)) return null;

  const url = new URL("https://www.awin1.com/cread.php");
  url.searchParams.set("awinmid", String(BUTLER_TECHNIK_AWIN.merchantId));
  url.searchParams.set("awinaffid", String(BUTLER_TECHNIK_AWIN.affiliateId));
  url.searchParams.set("ued", destination);
  return url.toString();
}

export function createButlerVictronCandidate({
  destination,
  inStock,
  shippableMarkets = [],
  approvalConfirmed = BUTLER_TECHNIK_AWIN.approvalConfirmed
} = {}) {
  const affiliateUrl = buildButlerAffiliateUrl(destination, { approvalConfirmed });
  const verifiedMarkets = BUTLER_SUPPORTED_MARKETS.filter((market) => shippableMarkets.includes(market));

  return {
    id: `butler-${BUTLER_VICTRON_MPPT_250_60_MC4.partNumber}`,
    merchant: "butler_technik",
    ...BUTLER_VICTRON_MPPT_250_60_MC4,
    destination: isExactCandidateDestination(destination) ? destination : null,
    affiliateUrl,
    availability: inStock === true ? "in_stock" : "unavailable",
    verifiedMarkets,
    recommendationEligible: Boolean(affiliateUrl && inStock === true && verifiedMarkets.length > 0)
  };
}
