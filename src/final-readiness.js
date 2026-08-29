const DEFAULT_ACCEPTED_ATTENTION = Object.freeze({
  cz: Object.freeze(["SOURCE_NOT_FRESH:reslshop"]),
});

export function assessFinalFourMarketReadiness({
  healthSummary,
  healthMarkets = [],
  preaudit,
  huLaunch,
  acceptedAttention = DEFAULT_ACCEPTED_ATTENTION,
} = {}) {
  const blockers = [];
  const acceptedExceptions = [];

  if (healthSummary?.safe !== true) blockers.push("MARKET_HEALTH_NOT_SAFE");
  if (preaudit?.auditReady !== true) blockers.push("PREAUDIT_NOT_READY");

  for (const market of healthMarkets) {
    const allowed = new Set(acceptedAttention?.[market?.key] || []);
    for (const attention of market?.attention || []) {
      if (allowed.has(attention)) acceptedExceptions.push(`${market.key}:${attention}`);
      else blockers.push(`${market.key}:${attention}`);
    }
    for (const blocker of market?.blockers || []) blockers.push(`${market.key}:${blocker}`);
  }

  if (huLaunch?.ready !== true) {
    for (const blocker of huLaunch?.blockers || ["HU_LAUNCH_NOT_READY"]) blockers.push(blocker);
  }

  const uniqueBlockers = [...new Set(blockers)];
  return Object.freeze({
    readyForRomania: uniqueBlockers.length === 0,
    blockers: Object.freeze(uniqueBlockers),
    acceptedExceptions: Object.freeze([...new Set(acceptedExceptions)]),
  });
}

export { DEFAULT_ACCEPTED_ATTENTION };
