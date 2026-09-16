export const BUTLER_TECHNIK_AWIN = Object.freeze({
  merchantId: 31291,
  affiliateId: 3044971,
  hostname: "www.butlertechnik.com",
  approvalConfirmed: false
});

export const BUTLER_VICTRON_MPPT_250_60_MC4 = Object.freeze({
  id: "butler-victron-scc125060321",
  partNumber: "SCC125060321",
  category: "controller",
  name: "Victron SmartSolar MPPT 250/60-MC4",
  mppt: true,
  currentA: 60,
  chargingVoltagesV: Object.freeze([12, 24, 48]),
  pvWattsBySystemVoltage: Object.freeze({ 12: 860, 24: 1720 }),
  exactPath: "/item/Victron/SmartSolar-MPPT-250-60-MC4/BT2",
  verifiedAt: "2026-09-16"
});

export const BUTLER_VICTRON_ORION_XS_12_12_50 = Object.freeze({
  id: "butler-victron-orion-xs-12-12-50",
  partNumber: "ORI121217040",
  slug: "orion-xs-12-12-50",
  category: "dc_charger",
  name: "Victron Orion XS Smart Buckboost 50A 12V",
  currentA: 50,
  powerW: 700,
  inputVoltagesV: Object.freeze([12]),
  chargingVoltagesV: Object.freeze([12]),
  batteryTypes: Object.freeze(["lifepo4", "lead_acid"]),
  smartAlternatorCompatible: true,
  efficiencyPercent: 98.5,
  exactPath: "/item/Victron/Smart-Buckboost-50A-700W-non-iso-DC-DC-charger/BPV",
  verifiedAt: "2026-09-16"
});

export const BUTLER_SUPPORTED_MARKETS = Object.freeze(["sk", "pl", "hu", "pt", "ro", "si"]);
export const BUTLER_MARKET_CODES = Object.freeze({
  "sk-SK": "sk",
  "pl-PL": "pl",
  "hu-HU": "hu",
  "pt-PT": "pt",
  "ro-RO": "ro",
  "sl-SI": "si",
});

export const BUTLER_EXACT_PRODUCTS = Object.freeze([
  BUTLER_VICTRON_MPPT_250_60_MC4,
  BUTLER_VICTRON_ORION_XS_12_12_50
]);

const STOCK_STATES = new Set(["in_stock"]);
const MAX_STOCK_EVIDENCE_AGE_MS = 14 * 24 * 60 * 60 * 1000;

function validDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value || "") && Number.isFinite(Date.parse(`${value}T00:00:00Z`));
}

function validEvidenceUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password ? url.toString() : null;
  } catch {
    return null;
  }
}

function freshStockEvidence(value, now = Date.now()) {
  if (!validDate(value)) return false;
  const timestamp = Date.parse(`${value}T23:59:59Z`);
  return timestamp <= now + 24 * 60 * 60 * 1000 && now - timestamp <= MAX_STOCK_EVIDENCE_AGE_MS;
}

function productDefinition(candidateId) {
  return BUTLER_EXACT_PRODUCTS.find(({ id }) => id === candidateId) || null;
}

function exactCandidateProduct(destination) {
  let url;
  try {
    url = new URL(destination);
  } catch {
    return null;
  }

  if (url.protocol !== "https:"
    || url.hostname !== BUTLER_TECHNIK_AWIN.hostname
    || url.username
    || url.password
    || url.search
    || url.hash) return null;
  return BUTLER_EXACT_PRODUCTS.find((product) => product.exactPath === url.pathname) || null;
}

export function isButlerExpansionProduct(product) {
  return product?.merchant === "butler_technik";
}

export function buildButlerAffiliateUrl(destination, { approvalConfirmed = BUTLER_TECHNIK_AWIN.approvalConfirmed } = {}) {
  if (!approvalConfirmed || !exactCandidateProduct(destination)) return null;

  const url = new URL("https://www.awin1.com/cread.php");
  url.searchParams.set("awinmid", String(BUTLER_TECHNIK_AWIN.merchantId));
  url.searchParams.set("awinaffid", String(BUTLER_TECHNIK_AWIN.affiliateId));
  url.searchParams.set("ued", destination);
  return url.toString();
}

export function validateButlerAffiliateUrl(value, expectedDestination) {
  let url;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  if (url.protocol !== "https:" || !new Set(["www.awin1.com", "awin1.com"]).has(url.hostname)) return false;
  if (url.searchParams.get("awinmid") !== String(BUTLER_TECHNIK_AWIN.merchantId)) return false;
  if (url.searchParams.get("awinaffid") !== String(BUTLER_TECHNIK_AWIN.affiliateId)) return false;
  const destination = url.searchParams.get("ued");
  return Boolean(destination && destination === expectedDestination && exactCandidateProduct(destination));
}

export function butlerActivationState(activation, candidateId, market, { now = Date.now() } = {}) {
  const product = productDefinition(candidateId);
  const config = activation?.products?.[candidateId] || null;
  const marketCode = BUTLER_MARKET_CODES[market] || market || null;
  const landingProduct = exactCandidateProduct(config?.finalLandingUrl);
  const approvalConfirmed = activation?.approvalConfirmed === true;
  const approvalSourceVerified = typeof activation?.approvalSource === "string" && activation.approvalSource.trim().length >= 3;
  const trackingVerified = validDate(activation?.trackingVerifiedAt);
  const stockVerified = Boolean(
    product
    && landingProduct === product
    && STOCK_STATES.has(config?.stockStatus)
    && Number(config?.priceGbp) > 0
    && validEvidenceUrl(config?.stockEvidenceUrl)
    && freshStockEvidence(config?.stockVerifiedAt, now)
  );
  const marketVerified = Boolean(marketCode && BUTLER_SUPPORTED_MARKETS.includes(marketCode));
  const ready = Boolean(product && approvalConfirmed && approvalSourceVerified && trackingVerified && stockVerified && marketVerified);

  let blocker = null;
  if (!approvalConfirmed) blocker = "awin_program_approval_pending";
  else if (!approvalSourceVerified) blocker = "awin_approval_evidence_missing";
  else if (!trackingVerified) blocker = "awin_tracking_verification_pending";
  else if (!stockVerified) blocker = "exact_product_stock_unverified";
  else if (!marketVerified) blocker = "market_shipping_unverified";

  return Object.freeze({
    candidateId,
    market,
    marketCode,
    ready,
    blocker,
    approvalConfirmed,
    approvalSource: approvalSourceVerified ? activation.approvalSource.trim() : null,
    trackingVerifiedAt: trackingVerified ? activation.trackingVerifiedAt : null,
    stockVerified,
    stockVerifiedAt: validDate(config?.stockVerifiedAt) ? config.stockVerifiedAt : null,
    stockEvidenceUrl: validEvidenceUrl(config?.stockEvidenceUrl),
    finalLandingUrl: landingProduct === product ? new URL(config.finalLandingUrl).toString() : null,
    priceGbp: Number(config?.priceGbp) > 0 ? Number(config.priceGbp) : null,
    priceBasis: config?.priceBasis === "ex_vat" || config?.priceBasis === "inc_vat" ? config.priceBasis : null,
  });
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
    id: product.id,
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

export function createButlerExpansionProduct(activation, candidateId, market, { now = Date.now() } = {}) {
  const definition = productDefinition(candidateId);
  const state = butlerActivationState(activation, candidateId, market, { now });
  if (!definition || !state.ready) return null;

  const affiliateUrl = buildButlerAffiliateUrl(state.finalLandingUrl, { approvalConfirmed: true });
  const common = {
    id: definition.id,
    merchant: "butler_technik",
    network: "awin",
    name: definition.name,
    description: definition.category === "controller"
      ? "Victron SmartSolar MPPT 250/60-MC4, 60 A controller for 12/24/48 V systems."
      : "Victron Orion XS 12/12 50A, 700 W smart-alternator compatible DC-DC charger.",
    categoryPath: definition.category === "controller" ? "Solar Charge Controller" : "DC-DC Charger",
    category: definition.category,
    brand: "Victron Energy",
    priceCzk: state.priceGbp,
    priceCurrency: "GBP",
    available: true,
    marketEligible: true,
    productUrl: state.finalLandingUrl,
    affiliateUrl,
    imageUrl: null,
    verifiedAt: state.trackingVerifiedAt,
    evidence: Object.freeze({
      trackingVerifiedAt: state.trackingVerifiedAt,
      stockVerifiedAt: state.stockVerifiedAt,
      stockEvidenceUrl: state.stockEvidenceUrl,
      priceBasis: state.priceBasis,
    }),
  };

  if (definition.category === "controller") {
    return Object.freeze({
      ...common,
      specs: Object.freeze({
        mppt: true,
        currentA: definition.currentA,
        systemVoltagesV: Object.freeze([...definition.chargingVoltagesV]),
        maxPvWattsBySystemVoltage: Object.freeze({ ...definition.pvWattsBySystemVoltage }),
      }),
    });
  }

  return Object.freeze({
    ...common,
    specs: Object.freeze({
      currentA: definition.currentA,
      powerW: definition.powerW,
      inputVoltagesV: Object.freeze([...definition.inputVoltagesV]),
      chargingVoltagesV: Object.freeze([...definition.chargingVoltagesV]),
      batteryTypes: Object.freeze([...definition.batteryTypes]),
      smartAlternatorCompatible: definition.smartAlternatorCompatible,
    }),
  });
}

export function validateButlerExpansionProduct(product, { market, source = {} } = {}) {
  if (!isButlerExpansionProduct(product)) throw new Error("BUTLER_MERCHANT_INVALID");
  const definition = productDefinition(product.id);
  const marketCode = BUTLER_MARKET_CODES[market] || market;
  if (!definition || !marketCode) throw new Error("BUTLER_PRODUCT_DEFINITION_INVALID");
  if (source?.status !== "ok" || source?.approvalConfirmed !== true) throw new Error("BUTLER_SOURCE_NOT_ACTIVATED");
  if (!Array.isArray(source?.verifiedProductMarkets?.[definition.id])
    || !source.verifiedProductMarkets[definition.id].includes(marketCode)) {
    throw new Error("BUTLER_PRODUCT_MARKET_UNVERIFIED");
  }
  if (product.marketEligible !== true || product.available !== true) throw new Error("BUTLER_PRODUCT_EVIDENCE_INVALID");
  if (exactCandidateProduct(product.productUrl) !== definition) throw new Error("BUTLER_PRODUCT_URL_INVALID");
  if (!validateButlerAffiliateUrl(product.affiliateUrl, product.productUrl)) throw new Error("BUTLER_AFFILIATE_INVALID");
  if (!(Number(product.priceCzk) > 0) || product.priceCurrency !== "GBP") throw new Error("BUTLER_PRICE_INVALID");
  if (!validDate(product.verifiedAt)
    || !validDate(product.evidence?.trackingVerifiedAt)
    || !validDate(product.evidence?.stockVerifiedAt)
    || !validEvidenceUrl(product.evidence?.stockEvidenceUrl)) throw new Error("BUTLER_EVIDENCE_INVALID");

  const specs = product.specs || {};
  if (definition.category === "controller") {
    if (specs.mppt !== true
      || specs.currentA !== definition.currentA
      || JSON.stringify(specs.systemVoltagesV) !== JSON.stringify(definition.chargingVoltagesV)
      || specs.maxPvWattsBySystemVoltage?.[12] !== 860
      || specs.maxPvWattsBySystemVoltage?.[24] !== 1720) throw new Error("BUTLER_CONTROLLER_SPECS_INVALID");
  } else if (specs.currentA !== definition.currentA
    || specs.powerW !== definition.powerW
    || specs.smartAlternatorCompatible !== true
    || !Array.isArray(specs.inputVoltagesV)
    || !specs.inputVoltagesV.includes(12)
    || !Array.isArray(specs.batteryTypes)
    || !specs.batteryTypes.includes("lifepo4")) {
    throw new Error("BUTLER_DCDC_SPECS_INVALID");
  }
  return product;
}
