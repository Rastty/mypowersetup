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

export function isXdatouExpansionProduct(product) {
  return product?.merchant === "xdatou";
}

function validDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value || "") && Number.isFinite(Date.parse(`${value}T00:00:00Z`));
}

function validApprovalSource(value) {
  return typeof value === "string" && value.trim().length >= 3 && value.trim().length <= 512;
}

export function xdatouActivationState(activation = {}) {
  const approvalRequested = activation?.approvalConfirmed === true;
  const approvalEvidenceVerified = validApprovalSource(activation?.approvalSource);
  const referralCredentialsVerified = validReferralIdentifier(activation?.referralIdentifier)
    && validReferralCode(activation?.referralCode);
  const trackingVerified = validDate(activation?.trackingVerifiedAt);
  const ready = approvalRequested
    && approvalEvidenceVerified
    && referralCredentialsVerified
    && trackingVerified;

  let blocker = null;
  if (!approvalRequested) blocker = "goaffpro_approval_pending";
  else if (!approvalEvidenceVerified) blocker = "goaffpro_approval_evidence_missing";
  else if (!referralCredentialsVerified) blocker = "goaffpro_referral_credentials_pending";
  else if (!trackingVerified) blocker = "goaffpro_tracking_verification_pending";

  return Object.freeze({
    ready,
    blocker,
    approvalRequested,
    approvalConfirmed: ready,
    approvalSource: approvalEvidenceVerified ? activation.approvalSource.trim() : null,
    referralIdentifier: validReferralIdentifier(activation?.referralIdentifier) ? activation.referralIdentifier : null,
    referralCode: validReferralCode(activation?.referralCode) ? activation.referralCode : null,
    trackingVerifiedAt: trackingVerified ? activation.trackingVerifiedAt : null,
  });
}

export function validateXdatouExpansionProduct(product, {
  approvalConfirmed = XDATOU_GOAFFPRO.approvalConfirmed,
  referralIdentifier = XDATOU_GOAFFPRO.referralIdentifier,
  referralCode = XDATOU_GOAFFPRO.referralCode,
} = {}) {
  if (!isXdatouExpansionProduct(product)) throw new Error("XDATOU_MERCHANT_INVALID");
  if (!approvalConfirmed) throw new Error("XDATOU_AFFILIATE_NOT_APPROVED");
  if (product.marketEligible !== true || product.available === false) throw new Error("XDATOU_MARKET_EVIDENCE_INVALID");
  if (product.category !== "inverter") throw new Error("XDATOU_CATEGORY_INVALID");
  if (product.priceCurrency !== "EUR" || !(Number(product.priceCzk) > 0)) throw new Error("XDATOU_PRICE_INVALID");
  if (!product.verifiedAt) throw new Error("XDATOU_VERIFICATION_MISSING");

  const destination = exactProductDestination(product.productUrl);
  if (!destination) throw new Error("XDATOU_PRODUCT_URL_INVALID");
  if (!validateXdatouAffiliateUrl(product.affiliateUrl, { referralIdentifier, referralCode })) {
    throw new Error("XDATOU_AFFILIATE_INVALID");
  }

  const specs = product.specs || {};
  if (specs.voltageV !== XDATOU_DATOUBOSS_2000W_24V.systemVoltageV
    || specs.powerW !== XDATOU_DATOUBOSS_2000W_24V.continuousPowerW
    || specs.pureSine !== true) {
    throw new Error("XDATOU_INVERTER_SPECS_INVALID");
  }
  return product;
}

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
