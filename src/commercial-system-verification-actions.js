import { listCommercialSourcingCandidates } from "./commercial-sourcing-candidates.js";

const PRIORITY_RANK = Object.freeze({ P0: 0, P1: 1, P2: 2, P3: 3 });

export function buildCurrentCommercialSystemVerificationQueue(backlogs = []) {
  const backlogByMarket = new Map((backlogs || []).map((backlog) => [backlog.market, backlog]));
  const groups = new Map();

  for (const candidate of listCommercialSourcingCandidates()) {
    if (candidate.nextActionOwner !== "system" || !candidate.nextAction || candidate.nextAction === "none") continue;

    const actionKey = `${candidate.merchant}:${candidate.nextAction}`;
    const group = groups.get(actionKey) || {
      actionKey,
      owner: "system",
      merchant: candidate.merchant,
      nextAction: candidate.nextAction,
      candidateIds: new Set(),
      productNames: new Set(),
      categories: new Set(),
      markets: new Set(),
      blockers: new Set(),
      secondaryBlockers: new Set(),
      statuses: new Set(),
      affiliateNetworks: new Set(),
      affiliateApprovalConfirmed: true,
      trackingVerified: true,
      impacts: new Map(),
      activeCandidateIds: new Set(),
      activeCategories: new Set(),
      activeMarkets: new Set(),
    };

    group.candidateIds.add(candidate.id);
    group.productNames.add(candidate.productName);
    group.categories.add(candidate.category);
    (candidate.markets || []).forEach((market) => group.markets.add(market));
    if (candidate.blocker) group.blockers.add(candidate.blocker);
    if (candidate.secondaryBlocker) group.secondaryBlockers.add(candidate.secondaryBlocker);
    group.statuses.add(candidate.status);
    if (candidate.affiliateNetwork) group.affiliateNetworks.add(candidate.affiliateNetwork);
    group.affiliateApprovalConfirmed &&= candidate.affiliateApprovalConfirmed === true;
    group.trackingVerified &&= Boolean(candidate.trackingVerifiedAt);

    for (const market of candidate.markets || []) {
      const backlog = backlogByMarket.get(market);
      const opportunity = backlog?.opportunities?.find((item) => item.category === candidate.category);
      if (!opportunity || Number(opportunity.score) <= 0) continue;

      const impactKey = `${market}:${candidate.category}`;
      const impact = group.impacts.get(impactKey) || {
        market,
        category: candidate.category,
        priority: opportunity.priority || null,
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
    }

    groups.set(actionKey, group);
  }

  const actions = [...groups.values()]
    .filter((group) => group.impacts.size > 0)
    .map((group) => {
      const impacts = [...group.impacts.values()]
        .map((item) => Object.freeze({ ...item }))
        .sort((a, b) => a.market.localeCompare(b.market) || a.category.localeCompare(b.category));
      const priorities = impacts.map(({ priority }) => priority).filter(Boolean);
      const bestPriority = priorities.sort((a, b) => priorityRank(a) - priorityRank(b))[0] || null;

      return Object.freeze({
        actionKey: group.actionKey,
        owner: group.owner,
        merchant: group.merchant,
        nextAction: group.nextAction,
        candidateIds: Object.freeze([...group.candidateIds].sort()),
        productNames: Object.freeze([...group.productNames].sort()),
        categories: Object.freeze([...group.categories].sort()),
        markets: Object.freeze([...group.markets].sort()),
        blockers: Object.freeze([...group.blockers].sort()),
        secondaryBlockers: Object.freeze([...group.secondaryBlockers].sort()),
        statuses: Object.freeze([...group.statuses].sort()),
        affiliateNetworks: Object.freeze([...group.affiliateNetworks].sort()),
        affiliateApprovalConfirmed: group.affiliateApprovalConfirmed,
        trackingVerified: group.trackingVerified,
        publishEligible: false,
        verificationPolicy: "fail_closed_until_market_and_stock_evidence",
        bestPriority,
        activeCandidateIds: Object.freeze([...group.activeCandidateIds].sort()),
        activeCategories: Object.freeze([...group.activeCategories].sort()),
        activeMarkets: Object.freeze([...group.activeMarkets].sort()),
        currentOpportunityScore: impacts.reduce((sum, item) => sum + item.score, 0),
        currentStandaloneUnlockWeight: impacts.reduce((sum, item) => sum + item.standaloneUnlockWeight, 0),
        currentAffectedWeight: impacts.reduce((sum, item) => sum + item.affectedWeight, 0),
        currentImpacts: Object.freeze(impacts),
      });
    });

  actions.sort((a, b) =>
    priorityRank(a.bestPriority) - priorityRank(b.bestPriority)
    || b.currentStandaloneUnlockWeight - a.currentStandaloneUnlockWeight
    || b.currentAffectedWeight - a.currentAffectedWeight
    || b.currentOpportunityScore - a.currentOpportunityScore
    || a.actionKey.localeCompare(b.actionKey));

  return Object.freeze(actions);
}

export function bestCurrentCommercialSystemVerification(backlogs = []) {
  return buildCurrentCommercialSystemVerificationQueue(backlogs)[0] || null;
}

function priorityRank(priority) {
  return PRIORITY_RANK[priority] ?? 99;
}
