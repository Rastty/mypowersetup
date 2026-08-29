const DEFAULT_DEFERRED_EXPANSION_GAPS = Object.freeze({
  cz: Object.freeze(["SOURCE_NOT_FRESH:reslshop"]),
  sk: Object.freeze(["PRODUCT_COVERAGE:controller:1/2"]),
  pl: Object.freeze(["PRODUCT_COVERAGE:controller:1/2"]),
  hu: Object.freeze(["PRODUCT_COVERAGE:controller:1/2"]),
});

export function assessExpansionReadiness({
  healthSummary,
  healthMarkets = [],
  preaudit,
  huReview,
  deferredGaps = DEFAULT_DEFERRED_EXPANSION_GAPS,
} = {}) {
  const blockers = [];
  const deferred = [];

  if (healthSummary?.safe !== true) blockers.push("MARKET_HEALTH_NOT_SAFE");
  if (preaudit?.auditReady !== true) blockers.push("PREAUDIT_NOT_READY");
  if (huReview?.languageReviewed !== true) blockers.push("HU_LANGUAGE_REVIEW_REQUIRED");
  if (huReview?.mobileJourneyReviewed !== true) blockers.push("HU_MOBILE_JOURNEY_REVIEW_REQUIRED");

  for (const market of healthMarkets) {
    const allowed = new Set(deferredGaps?.[market?.key] || []);
    for (const attention of market?.attention || []) {
      const key = `${market.key}:${attention}`;
      if (allowed.has(attention)) deferred.push(key);
      else blockers.push(key);
    }
    for (const blocker of market?.blockers || []) blockers.push(`${market.key}:${blocker}`);
  }

  const uniqueBlockers = [...new Set(blockers)];
  return Object.freeze({
    readyForNextLocalization: uniqueBlockers.length === 0,
    blockers: Object.freeze(uniqueBlockers),
    deferredGaps: Object.freeze([...new Set(deferred)]),
  });
}

export { DEFAULT_DEFERRED_EXPANSION_GAPS };
