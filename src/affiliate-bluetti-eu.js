export const BLUETTI_EU_AWIN = Object.freeze({
  merchantId: 95479,
  affiliateId: 3044971,
  hostname: "www.bluettipower.eu",
  approvalConfirmed: false,
});

export const BLUETTI_ELITE_300 = Object.freeze({
  id: "bluetti-eu-elite-300",
  category: "power_station",
  name: "BLUETTI Elite 300 Portable Power Station",
  exactPath: "/products/elite-300-portable-power-station",
  capacityWh: 3014.4,
  powerW: 2400,
  peakPowerW: 4800,
  pureSine: true,
  solarInputW: 1200,
  dcOutputVoltageV: 12,
  dcOutputA: 30,
  batteryType: "lifepo4",
  verifiedAt: "2026-09-07",
});

export const BLUETTI_ELITE_300_MARKETS = Object.freeze(["pt", "ro", "si"]);

function exactEliteDestination(destination) {
  let url;
  try {
    url = new URL(destination);
  } catch {
    return null;
  }
  if (url.protocol !== "https:"
    || url.hostname !== BLUETTI_EU_AWIN.hostname
    || url.pathname !== BLUETTI_ELITE_300.exactPath
    || url.username
    || url.password) return null;
  url.search = "";
  url.hash = "";
  return url.toString();
}

export function buildBluettiEuAffiliateUrl(destination, {
  approvalConfirmed = BLUETTI_EU_AWIN.approvalConfirmed,
} = {}) {
  const exact = exactEliteDestination(destination);
  if (!approvalConfirmed || !exact) return null;

  const url = new URL("https://www.awin1.com/cread.php");
  url.searchParams.set("awinmid", String(BLUETTI_EU_AWIN.merchantId));
  url.searchParams.set("awinaffid", String(BLUETTI_EU_AWIN.affiliateId));
  url.searchParams.set("ued", exact);
  return url.toString();
}

export function validateBluettiEuAffiliateUrl(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  if (url.protocol !== "https:" || url.hostname !== "www.awin1.com") return false;
  if (url.searchParams.get("awinmid") !== String(BLUETTI_EU_AWIN.merchantId)) return false;
  if (url.searchParams.get("awinaffid") !== String(BLUETTI_EU_AWIN.affiliateId)) return false;
  const destination = url.searchParams.get("ued");
  return Boolean(exactEliteDestination(destination));
}

export function createBluettiElite300Candidate({
  destination,
  inStock,
  shippableMarkets = [],
  approvalConfirmed = BLUETTI_EU_AWIN.approvalConfirmed,
} = {}) {
  const exact = exactEliteDestination(destination);
  const affiliateUrl = buildBluettiEuAffiliateUrl(destination, { approvalConfirmed });
  const verifiedMarkets = BLUETTI_ELITE_300_MARKETS.filter((market) => shippableMarkets.includes(market));

  return {
    ...BLUETTI_ELITE_300,
    merchant: "bluetti_eu",
    network: "awin",
    destination: exact,
    affiliateUrl,
    availability: inStock === true ? "in_stock" : "unavailable",
    verifiedMarkets,
    recommendationEligible: Boolean(
      affiliateUrl
      && validateBluettiEuAffiliateUrl(affiliateUrl)
      && inStock === true
      && verifiedMarkets.length > 0
    ),
  };
}
