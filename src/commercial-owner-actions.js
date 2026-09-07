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

export function buildCommercialOwnerActionQueue() {
  const groups = new Map();

  for (const candidate of listCommercialSourcingCandidates()) {
    const standaloneUnlockWeight = candidate.standaloneUnlockWeight || 0;
    const affectedWeight = candidate.affectedWeight || 0;
    if (candidate.nextActionOwner !== "user" || !candidate.nextAction) continue;
    if (standaloneUnlockWeight <= 0 && affectedWeight <= 0) continue;

    const actionKey = `${candidate.merchant}:${candidate.nextAction}`;
    const group = groups.get(actionKey) || {
      actionKey,
      merchant: candidate.merchant,
      nextAction: candidate.nextAction,
      applicationUrl: candidate.applicationUrl || null,
      applicationPacketPath: candidate.applicationPacketPath || null,
      candidateIds: new Set(),
      categories: new Set(),
      markets: new Set(),
      shippingVerifiedMarkets: new Set(),
      blockers: new Set(),
      secondaryBlockers: new Set(),
      statuses: new Set(),
      activationFieldsNeeded: new Set(),
      maxStandaloneUnlockWeight: 0,
      maxAffectedWeight: 0,
      bestStatusRank: 99,
      inStockCandidates: 0,
    };

    if (group.applicationUrl && candidate.applicationUrl && group.applicationUrl !== candidate.applicationUrl) {
      throw new Error(`OWNER_ACTION_URL_DIVERGENCE:${actionKey}`);
    }
    if (group.applicationPacketPath && candidate.applicationPacketPath && group.applicationPacketPath !== candidate.applicationPacketPath) {
      throw new Error(`OWNER_ACTION_PACKET_DIVERGENCE:${actionKey}`);
    }

    group.applicationUrl ||= candidate.applicationUrl || null;
    group.applicationPacketPath ||= candidate.applicationPacketPath || null;
    group.candidateIds.add(candidate.id);
    group.categories.add(candidate.category);
    candidate.markets.forEach((market) => group.markets.add(market));
    (candidate.shippingEligibleMarkets || [])
      .filter((market) => candidate.markets.includes(market))
      .forEach((market) => group.shippingVerifiedMarkets.add(market));
    if (candidate.blocker) group.blockers.add(candidate.blocker);
    if (candidate.secondaryBlocker) group.secondaryBlockers.add(candidate.secondaryBlocker);
    group.statuses.add(candidate.status);
    (candidate.activationFieldsNeeded || []).forEach((field) => group.activationFieldsNeeded.add(field));
    group.maxStandaloneUnlockWeight = Math.max(group.maxStandaloneUnlockWeight, standaloneUnlockWeight);
    group.maxAffectedWeight = Math.max(group.maxAffectedWeight, affectedWeight);
    group.bestStatusRank = Math.min(group.bestStatusRank, STATUS_RANK[candidate.status] ?? 99);
    if (candidate.stockStatus === "in_stock" || /^dispatch_/.test(candidate.stockStatus || "")) group.inStockCandidates += 1;
    groups.set(actionKey, group);
  }

  const actions = [...groups.values()].map((group) => Object.freeze({
    actionKey: group.actionKey,
    merchant: group.merchant,
    nextAction: group.nextAction,
    applicationUrl: group.applicationUrl,
    applicationPacketPath: group.applicationPacketPath,
    candidateIds: Object.freeze([...group.candidateIds].sort()),
    categories: Object.freeze([...group.categories].sort()),
    markets: Object.freeze([...group.markets].sort()),
    shippingVerifiedMarkets: Object.freeze([...group.shippingVerifiedMarkets].sort()),
    blockers: Object.freeze([...group.blockers].sort()),
    secondaryBlockers: Object.freeze([...group.secondaryBlockers].sort()),
    statuses: Object.freeze([...group.statuses].sort()),
    activationFieldsNeeded: Object.freeze([...group.activationFieldsNeeded].sort()),
    maxStandaloneUnlockWeight: group.maxStandaloneUnlockWeight,
    maxAffectedWeight: group.maxAffectedWeight,
    candidateCount: group.candidateIds.size,
    categoryCount: group.categories.size,
    inStockCandidates: group.inStockCandidates,
  }));

  actions.sort((a, b) =>
    b.maxStandaloneUnlockWeight - a.maxStandaloneUnlockWeight
    || b.shippingVerifiedMarkets.length - a.shippingVerifiedMarkets.length
    || bestRank(a.statuses) - bestRank(b.statuses)
    || b.categoryCount - a.categoryCount
    || b.maxAffectedWeight - a.maxAffectedWeight
    || a.actionKey.localeCompare(b.actionKey));

  return Object.freeze(actions);
}

export function bestCommercialOwnerAction() {
  return buildCommercialOwnerActionQueue()[0] || null;
}

function bestRank(statuses) {
  return Math.min(...statuses.map((status) => STATUS_RANK[status] ?? 99));
}
