const CJ_HOSTS = Object.freeze(new Set([
  "www.anrdoezrs.net",
  "www.dpbolvw.net",
  "www.jdoqocy.com",
  "www.kqzyfj.com",
  "www.tkqlhce.com",
]));

export const BLUETTI_ELITE300 = Object.freeze({
  id: "bluetti-eu-elite-300",
  merchant: "bluetti_eu",
  brand: "BLUETTI",
  category: "power_station",
  hostname: "www.bluettipower.eu",
  exactPath: "/products/elite-300-portable-power-station",
  handle: "elite-300-portable-power-station",
  capacityWh: 3014.4,
  continuousPowerW: 2400,
  peakPowerW: 4800,
  solarInputW: 1200,
  dcOutputVoltageV: 12,
  dcOutputA: 30,
  batteryType: "lifepo4",
  pureSine: true,
  verifiedAt: "2026-09-07",
});

export const BLUETTI_ELITE300_CJ = Object.freeze({
  network: "cj",
  approvalConfirmed: true,
  approvalSource: "owner_confirmed",
  affiliateUrl: null,
  finalLandingUrl: null,
  verifiedAt: null,
});

export const BLUETTI_ELITE300_MARKETS = Object.freeze(["pt", "ro"]);

export function bluettiElite300Destination() {
  return `https://${BLUETTI_ELITE300.hostname}${BLUETTI_ELITE300.exactPath}`;
}

export function isBluettiElite300Product(product) {
  return product?.merchant === BLUETTI_ELITE300.merchant;
}

export function validateBluettiElite300CjUrl(value, {
  finalLandingUrl,
  verifiedAt,
} = {}) {
  if (!value || !finalLandingUrl || !/^\d{4}-\d{2}-\d{2}$/.test(verifiedAt || "")) return false;

  let affiliate;
  let landing;
  try {
    affiliate = new URL(value);
    landing = new URL(finalLandingUrl);
  } catch {
    return false;
  }

  const destination = bluettiElite300Destination();
  if (affiliate.protocol !== "https:" || !CJ_HOSTS.has(affiliate.hostname)) return false;
  if (!/^\/click-\d+-\d+\/?$/.test(affiliate.pathname)) return false;
  if (affiliate.username || affiliate.password || affiliate.hash) return false;
  if (affiliate.searchParams.get("url") !== destination) return false;
  if (landing.toString() !== destination) return false;
  return true;
}

export function createBluettiElite300Candidate({
  affiliateUrl = BLUETTI_ELITE300_CJ.affiliateUrl,
  finalLandingUrl = BLUETTI_ELITE300_CJ.finalLandingUrl,
  verifiedAt = BLUETTI_ELITE300_CJ.verifiedAt,
  approvalConfirmed = BLUETTI_ELITE300_CJ.approvalConfirmed,
  inStock = false,
  shippableMarkets = [],
} = {}) {
  const trackingValid = approvalConfirmed && validateBluettiElite300CjUrl(affiliateUrl, {
    finalLandingUrl,
    verifiedAt,
  });
  const verifiedMarkets = BLUETTI_ELITE300_MARKETS.filter((market) => shippableMarkets.includes(market));

  return Object.freeze({
    ...BLUETTI_ELITE300,
    network: "cj",
    productUrl: trackingValid ? bluettiElite300Destination() : null,
    affiliateUrl: trackingValid ? affiliateUrl : null,
    finalLandingUrl: trackingValid ? finalLandingUrl : null,
    trackingVerifiedAt: trackingValid ? verifiedAt : null,
    availability: inStock === true ? "in_stock" : "unavailable",
    verifiedMarkets: Object.freeze(verifiedMarkets),
    recommendationEligible: Boolean(trackingValid && inStock === true && verifiedMarkets.length > 0),
  });
}

export function validateBluettiElite300Product(product, source = {}) {
  if (!isBluettiElite300Product(product)) throw new Error("BLUETTI_ELITE300_MERCHANT_INVALID");
  if (source?.status !== "ok" || source?.approvalConfirmed !== true || source?.network !== "cj") {
    throw new Error("BLUETTI_ELITE300_SOURCE_INVALID");
  }
  if (!validateBluettiElite300CjUrl(product.affiliateUrl, {
    finalLandingUrl: source.finalLandingUrl,
    verifiedAt: source.trackingVerifiedAt,
  })) {
    throw new Error("BLUETTI_ELITE300_AFFILIATE_INVALID");
  }
  if (product.productUrl !== bluettiElite300Destination()) throw new Error("BLUETTI_ELITE300_PRODUCT_URL_INVALID");
  if (product.marketEligible !== true || product.available === false) throw new Error("BLUETTI_ELITE300_MARKET_INVALID");
  if (product.category !== "power_station") throw new Error("BLUETTI_ELITE300_CATEGORY_INVALID");
  if (product.priceCurrency !== "EUR" || !(Number(product.priceCzk) > 0)) throw new Error("BLUETTI_ELITE300_PRICE_INVALID");
  if (!product.verifiedAt) throw new Error("BLUETTI_ELITE300_VERIFICATION_MISSING");

  const specs = product.specs || {};
  if (specs.capacityWh !== BLUETTI_ELITE300.capacityWh
    || specs.powerW !== BLUETTI_ELITE300.continuousPowerW
    || specs.solarInputW !== BLUETTI_ELITE300.solarInputW
    || specs.dcOutputVoltageV !== BLUETTI_ELITE300.dcOutputVoltageV
    || specs.dcOutputA !== BLUETTI_ELITE300.dcOutputA
    || specs.batteryType !== BLUETTI_ELITE300.batteryType
    || specs.pureSine !== true) {
    throw new Error("BLUETTI_ELITE300_SPECS_INVALID");
  }
  return product;
}
