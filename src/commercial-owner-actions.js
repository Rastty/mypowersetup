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

  const actions = [...groups.values()]
    .filter((group) => group.maxStandaloneUnlockWeight > 0 || group.maxAffectedWeight > 0)
    .map((group) => Object.freeze({
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


export function buildCurrentCommercialOwnerActionQueue(backlogs = []) {
  const backlogByMarket = new Map((backlogs || []).map((backlog) => [backlog.market, backlog]));
  const baseActions = new Map(buildCommercialOwnerActionQueue().map((action) => [action.actionKey, action]));
  const groups = new Map();

  for (const candidate of listCommercialSourcingCandidates()) {
    if (candidate.nextActionOwner !== "user" || !candidate.nextAction) continue;
    const actionKey = `${candidate.merchant}:${candidate.nextAction}`;
    const base = baseActions.get(actionKey);
    if (!base) continue;

    for (const market of candidate.markets || []) {
      const backlog = backlogByMarket.get(market);
      const opportunity = backlog?.opportunities?.find((item) => item.category === candidate.category);
      if (!opportunity) continue;

      const impactKey = `${market}:${candidate.category}`;
      const group = groups.get(actionKey) || {
        base,
        impacts: new Map(),
        activeCandidateIds: new Set(),
        activeCategories: new Set(),
        activeMarkets: new Set(),
      };
      const impact = group.impacts.get(impactKey) || {
        market,
        category: candidate.category,
        score: 0,
        standaloneUnlockWeight: 0,
        affectedWeight: 0,
      };

      impact.score = Math.max(impact.score, Number(opportunity.score) || 0);
      impact.standaloneUnlockWeight = Math.max(
        impact.standaloneUnlockWeight,
        Math.min(Number(candidate.standaloneUnlockWeight) || 0, Number(opportunity.standaloneUnlockWeight) || 0),
      );
      impact.affectedWeight = Math.max(
        impact.affectedWeight,
        Math.min(Number(candidate.affectedWeight) || 0, Number(opportunity.affectedWeight) || 0),
      );

      group.impacts.set(impactKey, impact);
      group.activeCandidateIds.add(candidate.id);
      group.activeCategories.add(candidate.category);
      group.activeMarkets.add(market);
      groups.set(actionKey, group);
    }
  }

  const actions = [...groups.values()].map((group) => {
    const impacts = [...group.impacts.values()];
    return Object.freeze({
      ...group.base,
      activeCandidateIds: Object.freeze([...group.activeCandidateIds].sort()),
      activeCategories: Object.freeze([...group.activeCategories].sort()),
      activeMarkets: Object.freeze([...group.activeMarkets].sort()),
      currentOpportunityScore: impacts.reduce((sum, item) => sum + item.score, 0),
      currentStandaloneUnlockWeight: impacts.reduce((sum, item) => sum + item.standaloneUnlockWeight, 0),
      currentAffectedWeight: impacts.reduce((sum, item) => sum + item.affectedWeight, 0),
      currentImpacts: Object.freeze(impacts
        .map((item) => Object.freeze({ ...item }))
        .sort((a, b) => a.market.localeCompare(b.market) || a.category.localeCompare(b.category))),
    });
  }).filter((action) =>
    action.currentOpportunityScore > 0
    || action.currentStandaloneUnlockWeight > 0
    || action.currentAffectedWeight > 0
  );

  actions.sort((a, b) =>
    b.currentStandaloneUnlockWeight - a.currentStandaloneUnlockWeight
    || b.currentAffectedWeight - a.currentAffectedWeight
    || b.currentOpportunityScore - a.currentOpportunityScore
    || b.shippingVerifiedMarkets.length - a.shippingVerifiedMarkets.length
    || bestRank(a.statuses) - bestRank(b.statuses)
    || a.actionKey.localeCompare(b.actionKey));

  return Object.freeze(actions);
}

export function bestCurrentCommercialOwnerAction(backlogs = []) {
  return buildCurrentCommercialOwnerActionQueue(backlogs)[0] || null;
}

export function bestCommercialOwnerAction() {
  return buildCommercialOwnerActionQueue()[0] || null;
}

function bestRank(statuses) {
  return Math.min(...statuses.map((status) => STATUS_RANK[status] ?? 99));
}
