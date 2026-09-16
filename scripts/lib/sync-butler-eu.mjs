import {
  BUTLER_EXACT_PRODUCTS,
  BUTLER_MARKET_CODES,
  butlerActivationState,
  createButlerExpansionProduct,
  validateButlerExpansionProduct,
} from "../../src/affiliate-butler.js";

export function syncButlerEu(targetMarket, activation, { now = Date.now() } = {}) {
  const marketCode = BUTLER_MARKET_CODES[targetMarket];
  if (!marketCode) throw new Error("BUTLER_TARGET_MARKET_INVALID");

  const states = BUTLER_EXACT_PRODUCTS.map((definition) =>
    butlerActivationState(activation, definition.id, targetMarket, { now })
  );
  const products = BUTLER_EXACT_PRODUCTS
    .map((definition) => createButlerExpansionProduct(activation, definition.id, targetMarket, { now }))
    .filter(Boolean);

  const verifiedProductMarkets = Object.freeze(Object.fromEntries(BUTLER_EXACT_PRODUCTS.map((definition) => [
    definition.id,
    Object.freeze(products.some(({ id }) => id === definition.id) ? [marketCode] : []),
  ])));

  const source = {
    status: products.length ? "ok" : "blocked",
    blocker: products.length ? null : unresolvedBlocker(states, activation),
    network: "awin",
    merchantId: 31291,
    affiliateId: 3044971,
    approvalConfirmed: activation?.approvalConfirmed === true
      && typeof activation?.approvalSource === "string"
      && activation.approvalSource.trim().length >= 3,
    approvalSource: typeof activation?.approvalSource === "string" ? activation.approvalSource.trim() || null : null,
    trackingVerifiedAt: /^\d{4}-\d{2}-\d{2}$/.test(activation?.trackingVerifiedAt || "") ? activation.trackingVerifiedAt : null,
    targetMarket,
    marketCode,
    exactProducts: products.length,
    verifiedProductMarkets,
    productStates: states.map((state) => ({
      candidateId: state.candidateId,
      stockVerified: state.stockVerified,
      ready: state.ready,
      blocker: state.blocker,
      stockVerifiedAt: state.stockVerifiedAt,
    })),
  };

  if (products.length) {
    for (const product of products) validateButlerExpansionProduct(product, { market: targetMarket, source });
  }

  return Object.freeze({
    products: Object.freeze(products),
    source: Object.freeze(source),
  });
}

function unresolvedBlocker(states, activation) {
  if (activation?.approvalConfirmed !== true) return "awin_program_approval_pending";
  if (typeof activation?.approvalSource !== "string" || activation.approvalSource.trim().length < 3) {
    return "awin_approval_evidence_missing";
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(activation?.trackingVerifiedAt || "")) return "awin_tracking_verification_pending";
  if (!states.some(({ stockVerified }) => stockVerified)) return "exact_product_stock_unverified";
  return states.find(({ blocker }) => blocker)?.blocker || "product_activation_incomplete";
}
