export const XDATOU_GOAFFPRO = Object.freeze({
  hostname: "eu.xdatou.com",
  approvalConfirmed: false,
  referralIdentifier: null,
  referralCode: null,
});

export const XDATOU_DATOUBOSS_2000W_24V = Object.freeze({
  id: "xdatou-datouboss-2000w-24v",
  category: "inverter",
  brand: "DATOUBOSS",
  name: "DATOUBOSS 2000W Pure Sine Wave Inverter 24V to 230V",
  systemVoltageV: 24,
  continuousPowerW: 2000,
  peakPowerW: 4000,
  outputVoltageV: 230,
  pureSine: true,
  exactPath: "/collections/xdatou-portable-inverter/products/datouboss-2000w-pure-sine-wave-inverter-24v-car-truck",
  verifiedAt: "2026-09-07",
});

export const XDATOU_SUPPORTED_MARKETS = Object.freeze(["pt", "ro", "si"]);

function exactProductDestination(destination) {
  let url;
  try {
    url = new URL(destination);
  } catch {
    return null;
  }

  if (url.protocol !== "https:"
    || url.hostname !== XDATOU_GOAFFPRO.hostname
    || url.pathname !== XDATOU_DATOUBOSS_2000W_24V.exactPath
    || url.username
    || url.password) return null;

  url.search = "";
  url.hash = "";
  return url.toString();
}

function validReferralIdentifier(value) {
  return typeof value === "string" && /^[A-Za-z][A-Za-z0-9_-]{0,31}$/.test(value);
}

function validReferralCode(value) {
  return typeof value === "string" && /^[A-Za-z0-9._~-]{3,128}$/.test(value);
}

export function buildXdatouAffiliateUrl(destination, {
  approvalConfirmed = XDATOU_GOAFFPRO.approvalConfirmed,
  referralIdentifier = XDATOU_GOAFFPRO.referralIdentifier,
  referralCode = XDATOU_GOAFFPRO.referralCode,
} = {}) {
  const exactDestination = exactProductDestination(destination);
  if (!approvalConfirmed
    || !exactDestination
    || !validReferralIdentifier(referralIdentifier)
    || !validReferralCode(referralCode)) return null;

  const url = new URL(exactDestination);
  url.searchParams.set(referralIdentifier, referralCode);
  return url.toString();
}

export function validateXdatouAffiliateUrl(value, {
  referralIdentifier,
  referralCode,
} = {}) {
  if (!validReferralIdentifier(referralIdentifier) || !validReferralCode(referralCode)) return false;

  let url;
  try {
    url = new URL(value);
  } catch {
    return false;
  }

  if (url.protocol !== "https:"
    || url.hostname !== XDATOU_GOAFFPRO.hostname
    || url.pathname !== XDATOU_DATOUBOSS_2000W_24V.exactPath
    || url.hash
    || url.username
    || url.password) return false;

  if (url.searchParams.get(referralIdentifier) !== referralCode) return false;
  const keys = [...url.searchParams.keys()];
  return keys.length === 1 && keys[0] === referralIdentifier;
}

export function createXdatouInverterCandidate({
  destination,
  inStock,
  shippableMarkets = [],
  approvalConfirmed = XDATOU_GOAFFPRO.approvalConfirmed,
  referralIdentifier = XDATOU_GOAFFPRO.referralIdentifier,
  referralCode = XDATOU_GOAFFPRO.referralCode,
} = {}) {
  const exactDestination = exactProductDestination(destination);
  const affiliateUrl = buildXdatouAffiliateUrl(destination, {
    approvalConfirmed,
    referralIdentifier,
    referralCode,
  });
  const verifiedMarkets = XDATOU_SUPPORTED_MARKETS.filter((market) => shippableMarkets.includes(market));

  return {
    ...XDATOU_DATOUBOSS_2000W_24V,
    merchant: "xdatou",
    network: "goaffpro",
    destination: exactDestination,
    affiliateUrl,
    availability: inStock === true ? "in_stock" : "unavailable",
    verifiedMarkets,
    recommendationEligible: Boolean(
      affiliateUrl
      && validateXdatouAffiliateUrl(affiliateUrl, { referralIdentifier, referralCode })
      && inStock === true
      && verifiedMarkets.length > 0
    ),
  };
}
