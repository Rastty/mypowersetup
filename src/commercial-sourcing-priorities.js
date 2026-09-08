import { listCommercialSourcingCandidates } from "./commercial-sourcing-candidates.js";

const STATUS_RANK = Object.freeze({
  ready_for_ingest: 0,
  pending_affiliate_approval: 1,
  blocked_affiliate_verification: 2,
  blocked_market_verification: 3,
  blocked_market_stock_verification: 4,
  blocked_crossborder_shipping: 5,
  blocked_stock: 6,
  blocked_market_stock: 7,
});

export function rankCommercialSourcingRoutes(market, { category } = {}) {
  const includeZeroImpact = Boolean(category);
  const candidates = listCommercialSourcingCandidates({ market, category })
    .filter((candidate) => includeZeroImpact
      || (candidate.standaloneUnlockWeight || 0) > 0
      || (candidate.affectedWeight || 0) > 0)
    .map((candidate) => Object.freeze({
      id: candidate.id,
      category: candidate.category,
      merchant: candidate.merchant,
      productName: candidate.productName,
      status: candidate.status,
      blocker: candidate.blocker || null,
      secondaryBlocker: candidate.secondaryBlocker || null,
      standaloneUnlockWeight: candidate.standaloneUnlockWeight || 0,
      affectedWeight: candidate.affectedWeight || 0,
      shippingVerified: Array.isArray(candidate.shippingEligibleMarkets)
        && candidate.shippingEligibleMarkets.includes(market),
      stockStatus: candidate.stockStatus || null,
      nextActionOwner: candidate.nextActionOwner || null,
      nextAction: candidate.nextAction || null,
      applicationUrl: candidate.applicationUrl || null,
      applicationPacketPath: candidate.applicationPacketPath || null,
      activationFieldsNeeded: candidate.activationFieldsNeeded || null,
      checkoutStatus: candidate.checkoutStatus || null,
    }))
    .sort((a, b) => {
      const standaloneDelta = b.standaloneUnlockWeight - a.standaloneUnlockWeight;
      if (standaloneDelta) return standaloneDelta;

      const affectedDelta = b.affectedWeight - a.affectedWeight;
      if (affectedDelta) return affectedDelta;

      if (includeZeroImpact && a.affectedWeight === 0 && b.affectedWeight === 0) {
        const ownerDelta = actionOwnerRank(a.nextActionOwner) - actionOwnerRank(b.nextActionOwner);
        if (ownerDelta) return ownerDelta;
      }

      return Number(b.shippingVerified) - Number(a.shippingVerified)
        || (STATUS_RANK[a.status] ?? 99) - (STATUS_RANK[b.status] ?? 99)
        || Number(b.stockStatus === "in_stock") - Number(a.stockStatus === "in_stock")
        || a.id.localeCompare(b.id);
    });

  return Object.freeze(candidates);
}

export function bestCommercialSourcingRoute(market, options = {}) {
  return rankCommercialSourcingRoutes(market, options)[0] || null;
}

function actionOwnerRank(owner) {
  if (owner === "system") return 0;
  if (owner === "user") return 1;
  return 2;
}
