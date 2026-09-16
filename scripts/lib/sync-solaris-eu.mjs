import {
  SOLARIS_INVERTERS,
  SOLARIS_SUPPORTED_MARKETS,
  createSolarisInverterCandidate,
  solarisActivationState,
  validateSolarisExpansionProduct,
} from "../../src/affiliate-solaris.js";

export function syncSolarisEu(targetMarket, activation, {
  now = Date.now(),
} = {}) {
  const marketCode = SOLARIS_SUPPORTED_MARKETS[targetMarket];
  if (!marketCode) throw new Error("SOLARIS_TARGET_MARKET_INVALID");

  const states = SOLARIS_INVERTERS.map((product) =>
    solarisActivationState(activation, product.id, targetMarket, { now })
  );
  const products = SOLARIS_INVERTERS
    .map((definition) => createSolarisInverterCandidate(activation, definition.id, targetMarket, { now }))
    .filter(Boolean);

  const verifiedProductMarkets = Object.freeze(Object.fromEntries(SOLARIS_INVERTERS.map((definition) => {
    const marketRecords = activation?.products?.[definition.id]?.markets || {};
    const verified = Object.entries(marketRecords)
      .filter(([code, record]) =>
        ["pt", "ro", "si"].includes(code)
        && record?.verified === true
        && validEvidenceUrl(record?.evidenceUrl)
        && validDate(record?.verifiedAt)
      )
      .map(([code]) => code)
      .sort();
    return [definition.id, Object.freeze(verified)];
  })));

  const source = {
    status: products.length ? "ok" : "blocked",
    blocker: products.length ? null : unresolvedBlocker(states, activation),
    network: "ambassador",
    approvalConfirmed: activation?.approvalConfirmed === true,
    approvalSource: activation?.approvalSource || null,
    targetMarket,
    marketCode,
    exactProducts: products.length,
    verifiedProductMarkets,
    productStates: states.map((state) => ({
      candidateId: state.candidateId,
      trackingVerified: state.trackingVerified,
      stockVerified: state.stockVerified,
      marketVerified: state.marketVerified,
      ready: state.ready,
      stockStatus: state.stockStatus,
      stockVerifiedAt: state.stockVerifiedAt,
      marketVerifiedAt: state.marketVerifiedAt,
    })),
  };

  if (products.length) {
    for (const product of products) {
      validateSolarisExpansionProduct(product, { market: targetMarket, source });
    }
  }

  return Object.freeze({
    products: Object.freeze(products),
    source: Object.freeze(source),
  });
}

function unresolvedBlocker(states, activation) {
  if (activation?.approvalConfirmed !== true) return "ambassador_approval_pending";
  if (!states.some(({ trackingVerified }) => trackingVerified)) return "exact_affiliate_tracking_unverified";
  if (!states.some(({ trackingVerified, stockVerified }) => trackingVerified && stockVerified)) return "exact_product_stock_unverified";
  if (!states.some(({ trackingVerified, stockVerified, marketVerified }) => trackingVerified && stockVerified && marketVerified)) {
    return "product_market_shipping_checkout_unverified";
  }
  return "product_activation_incomplete";
}

function validDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value || "") && Number.isFinite(Date.parse(`${value}T00:00:00Z`));
}

function validEvidenceUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password;
  } catch {
    return false;
  }
}
