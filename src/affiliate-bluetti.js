export const BLUETTI_CJ = Object.freeze({
  approvalConfirmed: true,
  deeplinkVerified: false,
  expectedClickPath: null,
});

export const BLUETTI_ELITE_300 = Object.freeze({
  id: "bluetti-eu-elite-300",
  category: "power_station",
  merchant: "bluetti_eu",
  name: "BLUETTI Elite 300 Portable Power Station",
  exactPath: "/products/elite-300-portable-power-station",
  capacityWh: 3014.4,
  continuousPowerW: 2400,
  peakPowerW: 4800,
  pureSine: true,
  solarInputW: 1200,
  dcOutputVoltageV: 12,
  dcOutputA: 30,
  batteryType: "lifepo4",
  verifiedAt: "2026-09-07",
});

export const BLUETTI_SUPPORTED_MARKETS = Object.freeze(["pt", "ro", "si"]);

const CJ_TRACKING_HOSTS = new Set([
  "www.jdoqocy.com", "jdoqocy.com",
  "www.tkqlhce.com", "tkqlhce.com",
  "www.anrdoezrs.net", "anrdoezrs.net",
  "www.dpbolvw.net", "dpbolvw.net",
  "www.kqzyfj.com", "kqzyfj.com",
]);

export function validateBluettiCjAffiliateUrl(value, {
  expectedClickPath = BLUETTI_CJ.expectedClickPath,
  exactDestination = new URL(BLUETTI_ELITE_300.exactPath, "https://www.bluettipower.eu").toString(),
} = {}) {
  if (typeof expectedClickPath !== "string" || !/^\/click-[A-Za-z0-9_-]+-[A-Za-z0-9_-]+$/.test(expectedClickPath)) return false;

  let url;
  try {
    url = new URL(value);
  } catch {
    return false;
  }

  if (url.protocol !== "https:" || !CJ_TRACKING_HOSTS.has(url.hostname) || url.pathname !== expectedClickPath) return false;
  const destination = url.searchParams.get("url");
  if (!destination) return false;

  let normalized;
  try {
    normalized = new URL(destination);
  } catch {
    return false;
  }
  normalized.hash = "";
  const expected = new URL(exactDestination);
  expected.hash = "";
  return normalized.toString() === expected.toString();
}

export function createBluettiElite300Candidate({
  affiliateUrl = null,
  expectedClickPath = BLUETTI_CJ.expectedClickPath,
  inStock = false,
  shippableMarkets = [],
  approvalConfirmed = BLUETTI_CJ.approvalConfirmed,
} = {}) {
  const destination = new URL(BLUETTI_ELITE_300.exactPath, "https://www.bluettipower.eu").toString();
  const verifiedMarkets = BLUETTI_SUPPORTED_MARKETS.filter((market) => shippableMarkets.includes(market));
  const tracked = approvalConfirmed && validateBluettiCjAffiliateUrl(affiliateUrl, { expectedClickPath, exactDestination: destination });

  return {
    ...BLUETTI_ELITE_300,
    productUrl: destination,
    affiliateUrl: tracked ? affiliateUrl : null,
    availability: inStock ? "in_stock" : "unavailable",
    verifiedMarkets,
    recommendationEligible: Boolean(tracked && inStock && verifiedMarkets.length > 0),
  };
}
