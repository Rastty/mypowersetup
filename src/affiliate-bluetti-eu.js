export const BLUETTI_ELITE300_CJ = Object.freeze({
  approvalConfirmed: true,
  approvalSource: "owner_confirmed",
  exactAffiliateUrl: null,
  finalLandingUrl: null,
  verifiedAt: null,
});

export const BLUETTI_ELITE_300_EU = Object.freeze({
  id: "bluetti-eu-elite-300",
  merchant: "bluetti_eu",
  category: "power_station",
  brand: "BLUETTI",
  name: "BLUETTI Elite 300 Portable Power Station",
  exactPath: "/products/elite-300-portable-power-station",
  capacityWh: 3014.4,
  powerW: 2400,
  peakPowerW: 4800,
  pureSine: true,
  solarInputW: 1200,
  dcOutputA: 30,
  batteryType: "lifepo4",
  verifiedAt: "2026-09-07",
});

export const BLUETTI_ELITE300_SUPPORTED_MARKETS = Object.freeze(["pt", "ro"]);

function exactLanding(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (url.protocol !== "https:"
    || url.hostname !== "www.bluettipower.eu"
    || url.pathname !== BLUETTI_ELITE_300_EU.exactPath
    || url.username
    || url.password
    || url.search
    || url.hash) return null;
  return url.toString();
}

function exactAffiliate(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" || url.username || url.password) return null;
  if (url.hostname === "www.bluettipower.eu" || url.hostname === "bluettipower.eu") return null;
  return url.toString();
}

export function bluettiElite300ActivationReady(config = BLUETTI_ELITE300_CJ) {
  return Boolean(
    config?.approvalConfirmed === true
    && exactAffiliate(config.exactAffiliateUrl)
    && exactLanding(config.finalLandingUrl)
    && /^\d{4}-\d{2}-\d{2}$/.test(config.verifiedAt || "")
  );
}

export function isBluettiElite300Product(product) {
  return product?.merchant === BLUETTI_ELITE_300_EU.merchant
    && product?.category === BLUETTI_ELITE_300_EU.category;
}

export function validateBluettiElite300Product(product, config = BLUETTI_ELITE300_CJ) {
  if (!isBluettiElite300Product(product)) throw new Error("BLUETTI_ELITE300_IDENTITY_INVALID");
  if (!bluettiElite300ActivationReady(config)) throw new Error("BLUETTI_ELITE300_TRACKING_NOT_VERIFIED");
  if (product.marketEligible !== true || product.available === false) throw new Error("BLUETTI_ELITE300_MARKET_EVIDENCE_INVALID");
  if (exactLanding(product.productUrl) !== exactLanding(config.finalLandingUrl)) throw new Error("BLUETTI_ELITE300_PRODUCT_URL_INVALID");
  if (exactAffiliate(product.affiliateUrl) !== exactAffiliate(config.exactAffiliateUrl)) throw new Error("BLUETTI_ELITE300_AFFILIATE_URL_INVALID");
  if (product.priceCurrency !== "EUR" || !(Number(product.priceCzk) > 0)) throw new Error("BLUETTI_ELITE300_PRICE_INVALID");
  if (!product.verifiedAt) throw new Error("BLUETTI_ELITE300_VERIFICATION_MISSING");

  const specs = product.specs || {};
  if (specs.capacityWh !== BLUETTI_ELITE_300_EU.capacityWh
    || specs.powerW !== BLUETTI_ELITE_300_EU.powerW
    || specs.pureSine !== true
    || specs.solarInputW !== BLUETTI_ELITE_300_EU.solarInputW
    || specs.dcOutputA !== BLUETTI_ELITE_300_EU.dcOutputA
    || specs.batteryType !== BLUETTI_ELITE_300_EU.batteryType) {
    throw new Error("BLUETTI_ELITE300_SPECS_INVALID");
  }
  return product;
}
