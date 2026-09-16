export const SOLARIS_STORE = Object.freeze({
  hostname: "www.solaris-store.com",
  alternateHostname: "solaris-store.com",
  network: "ambassador",
});

export const SOLARIS_PHOENIX_12_250 = Object.freeze({
  id: "solaris-victron-phoenix-12-250",
  merchant: "solaris_store",
  category: "inverter",
  brand: "Victron Energy",
  name: "Victron Phoenix 12/250 VE.Direct IEC",
  productRef: "PIN121251100",
  exactPath: "/2333-phoenix-inverter-12-250-230v-vedirect-iec-victron-pin121251100.html",
  systemVoltageV: 12,
  continuousPowerW: 200,
  apparentPowerVa: 250,
  pureSine: true,
});

export const SOLARIS_PHOENIX_24_250 = Object.freeze({
  id: "solaris-victron-phoenix-24-250",
  merchant: "solaris_store",
  category: "inverter",
  brand: "Victron Energy",
  name: "Victron Phoenix 24/250 VE.Direct Schuko",
  productRef: "PIN241251200",
  exactPath: "/8005-onduleur-victron-phoenix-24-250va-vedirect-schucko.html",
  systemVoltageV: 24,
  continuousPowerW: 200,
  apparentPowerVa: 250,
  pureSine: true,
});

export const SOLARIS_INVERTERS = Object.freeze([
  SOLARIS_PHOENIX_12_250,
  SOLARIS_PHOENIX_24_250,
]);

export const SOLARIS_SUPPORTED_MARKETS = Object.freeze({
  "pt-PT": "pt",
  "ro-RO": "ro",
  "sl-SI": "si",
});

const STOCK_STATES = new Set(["in_stock", "dispatch_1_2_days", "dispatch_5_7_days"]);
const MAX_STOCK_EVIDENCE_AGE_MS = 14 * 24 * 60 * 60 * 1000;

function productDefinition(candidateId) {
  return SOLARIS_INVERTERS.find(({ id }) => id === candidateId) || null;
}

function exactLanding(value, product) {
  let url;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (!product
    || url.protocol !== "https:"
    || !new Set([SOLARIS_STORE.hostname, SOLARIS_STORE.alternateHostname]).has(url.hostname)
    || url.pathname !== product.exactPath
    || url.username
    || url.password
    || url.search
    || url.hash) return null;
  url.hostname = SOLARIS_STORE.hostname;
  return url.toString();
}

function verifiedAffiliate(value, product) {
  let url;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" || url.username || url.password || url.hash) return null;

  const merchantHost = new Set([SOLARIS_STORE.hostname, SOLARIS_STORE.alternateHostname]).has(url.hostname);
  if (merchantHost) {
    if (url.pathname !== product?.exactPath || !url.search) return null;
  }
  return url.toString();
}

function validEvidenceUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password ? url.toString() : null;
  } catch {
    return null;
  }
}

function validDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value || "") && Number.isFinite(Date.parse(`${value}T00:00:00Z`));
}

function freshStockEvidence(value, now = Date.now()) {
  if (!validDate(value)) return false;
  const timestamp = Date.parse(`${value}T23:59:59Z`);
  return timestamp <= now + 24 * 60 * 60 * 1000 && now - timestamp <= MAX_STOCK_EVIDENCE_AGE_MS;
}

function marketRecord(activation, productId, market) {
  const marketCode = SOLARIS_SUPPORTED_MARKETS[market];
  return marketCode ? activation?.products?.[productId]?.markets?.[marketCode] || null : null;
}

export function solarisActivationState(activation, candidateId, market, { now = Date.now() } = {}) {
  const product = productDefinition(candidateId);
  const config = activation?.products?.[candidateId] || null;
  const marketCode = SOLARIS_SUPPORTED_MARKETS[market] || null;
  const marketEvidence = marketRecord(activation, candidateId, market);
  const landing = exactLanding(config?.finalLandingUrl, product);
  const affiliate = verifiedAffiliate(config?.exactAffiliateUrl, product);
  const trackingVerified = activation?.approvalConfirmed === true
    && Boolean(affiliate)
    && Boolean(landing)
    && validDate(config?.trackingVerifiedAt);
  const stockVerified = Boolean(
    STOCK_STATES.has(config?.stockStatus)
    && Number(config?.priceEur) > 0
    && validEvidenceUrl(config?.stockEvidenceUrl)
    && freshStockEvidence(config?.stockVerifiedAt, now)
  );
  const marketVerified = Boolean(
    marketCode
    && marketEvidence?.verified === true
    && validEvidenceUrl(marketEvidence?.evidenceUrl)
    && validDate(marketEvidence?.verifiedAt)
  );

  return Object.freeze({
    candidateId,
    market,
    marketCode,
    approvalConfirmed: activation?.approvalConfirmed === true,
    trackingVerified,
    stockVerified,
    marketVerified,
    ready: Boolean(product && trackingVerified && stockVerified && marketVerified),
    finalLandingUrl: landing,
    exactAffiliateUrl: affiliate,
    trackingVerifiedAt: validDate(config?.trackingVerifiedAt) ? config.trackingVerifiedAt : null,
    stockStatus: typeof config?.stockStatus === "string" ? config.stockStatus : null,
    stockVerifiedAt: validDate(config?.stockVerifiedAt) ? config.stockVerifiedAt : null,
    stockEvidenceUrl: validEvidenceUrl(config?.stockEvidenceUrl),
    marketVerifiedAt: validDate(marketEvidence?.verifiedAt) ? marketEvidence.verifiedAt : null,
    marketEvidenceUrl: validEvidenceUrl(marketEvidence?.evidenceUrl),
    priceEur: Number(config?.priceEur) > 0 ? Number(config.priceEur) : null,
  });
}

export function isSolarisExpansionProduct(product) {
  return product?.merchant === "solaris_store" && product?.category === "inverter";
}

export function createSolarisInverterCandidate(activation, candidateId, market, { now = Date.now() } = {}) {
  const definition = productDefinition(candidateId);
  const state = solarisActivationState(activation, candidateId, market, { now });
  if (!definition || !state.ready) return null;

  return Object.freeze({
    id: definition.id,
    merchant: definition.merchant,
    network: SOLARIS_STORE.network,
    name: definition.name,
    description: `${definition.name}: ${definition.systemVoltageV} V DC to 230 V AC pure-sine inverter, ${definition.continuousPowerW} W continuous / ${definition.apparentPowerVa} VA.`,
    categoryPath: "Inverter",
    category: definition.category,
    brand: definition.brand,
    priceCzk: state.priceEur,
    priceCurrency: "EUR",
    available: true,
    marketEligible: true,
    productUrl: state.finalLandingUrl,
    affiliateUrl: state.exactAffiliateUrl,
    imageUrl: null,
    specs: Object.freeze({
      voltageV: definition.systemVoltageV,
      powerW: definition.continuousPowerW,
      apparentPowerVa: definition.apparentPowerVa,
      pureSine: true,
    }),
    verifiedAt: state.trackingVerifiedAt,
    evidence: Object.freeze({
      trackingVerifiedAt: state.trackingVerifiedAt,
      stockVerifiedAt: state.stockVerifiedAt,
      stockEvidenceUrl: state.stockEvidenceUrl,
      marketVerifiedAt: state.marketVerifiedAt,
      marketEvidenceUrl: state.marketEvidenceUrl,
    }),
  });
}

export function validateSolarisExpansionProduct(product, {
  market,
  source = {},
} = {}) {
  if (!isSolarisExpansionProduct(product)) throw new Error("SOLARIS_PRODUCT_IDENTITY_INVALID");
  const definition = productDefinition(product.id);
  const marketCode = SOLARIS_SUPPORTED_MARKETS[market] || market;
  if (!definition || !marketCode) throw new Error("SOLARIS_PRODUCT_DEFINITION_INVALID");
  if (source?.status !== "ok" || source?.approvalConfirmed !== true) throw new Error("SOLARIS_SOURCE_NOT_ACTIVATED");
  if (!Array.isArray(source?.verifiedProductMarkets?.[definition.id])
    || !source.verifiedProductMarkets[definition.id].includes(marketCode)) {
    throw new Error("SOLARIS_PRODUCT_MARKET_UNVERIFIED");
  }
  if (product.marketEligible !== true || product.available !== true) throw new Error("SOLARIS_PRODUCT_EVIDENCE_INVALID");
  if (!exactLanding(product.productUrl, definition)) throw new Error("SOLARIS_PRODUCT_URL_INVALID");
  if (!verifiedAffiliate(product.affiliateUrl, definition)) throw new Error("SOLARIS_AFFILIATE_URL_INVALID");
  if (!(Number(product.priceCzk) > 0) || product.priceCurrency !== "EUR") throw new Error("SOLARIS_PRICE_INVALID");

  const specs = product.specs || {};
  if (specs.voltageV !== definition.systemVoltageV
    || specs.powerW !== definition.continuousPowerW
    || specs.apparentPowerVa !== definition.apparentPowerVa
    || specs.pureSine !== true) throw new Error("SOLARIS_INVERTER_SPECS_INVALID");

  const evidence = product.evidence || {};
  if (!validDate(product.verifiedAt)
    || !validDate(evidence.trackingVerifiedAt)
    || !validDate(evidence.stockVerifiedAt)
    || !validDate(evidence.marketVerifiedAt)
    || !validEvidenceUrl(evidence.stockEvidenceUrl)
    || !validEvidenceUrl(evidence.marketEvidenceUrl)) throw new Error("SOLARIS_EVIDENCE_INVALID");
  return product;
}
