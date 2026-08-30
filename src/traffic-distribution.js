const DAY_MS = 24 * 60 * 60 * 1000;

const PRIORITY_SCORE = Object.freeze({ high: 25, medium: 12, low: 4 });
const STATUS_SCORE = Object.freeze({
  ready_for_manual_reply: 20,
  monitor: 4,
  research_only: -20,
  replied: -100,
  closed: -100,
});

function parseUtcDate(value, label) {
  const normalized = String(value || "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) throw new Error(`TRAFFIC_DISTRIBUTION_DATE_INVALID:${label}`);
  const date = new Date(`${normalized}T00:00:00Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== normalized) {
    throw new Error(`TRAFFIC_DISTRIBUTION_DATE_INVALID:${label}`);
  }
  return date;
}

export function ageInDays(lastKnownActivity, asOf) {
  const start = parseUtcDate(lastKnownActivity, "activity");
  const end = parseUtcDate(asOf, "asOf");
  if (start > end) throw new Error("TRAFFIC_DISTRIBUTION_ACTIVITY_IN_FUTURE");
  return Math.floor((end - start) / DAY_MS);
}

function freshnessScore(days) {
  if (days <= 7) return 45;
  if (days <= 30) return 35;
  if (days <= 90) return 25;
  if (days <= 180) return 15;
  if (days <= 365) return 8;
  return 0;
}

function fitScore(fit) {
  if (fit === "direct_camper_technical_current") return 25;
  if (fit === "direct_camper_technical_recent") return 18;
  if (fit === "direct_camper_technical") return 12;
  if (/direct_(camper|avtodom)_technical_stale/.test(fit || "")) return 4;
  if (/adjacent|not_camper/.test(fit || "")) return -10;
  return 0;
}

export function scoreTrafficOpportunity(item, { asOf }) {
  if (!item || typeof item !== "object") throw new TypeError("TRAFFIC_DISTRIBUTION_ITEM_REQUIRED");
  const ageDays = ageInDays(item.lastKnownActivity, asOf);
  const priority = PRIORITY_SCORE[item.priority] ?? 0;
  const status = STATUS_SCORE[item.status] ?? -50;
  const fit = fitScore(item.fit);
  const freshness = freshnessScore(ageDays);
  const intentDepth = Math.min(Array.isArray(item.problemIntent) ? item.problemIntent.length : 0, 6) * 2;
  const exactRoute = /\/$/.test(item.targetRoute || "") && !/^\/(?:[a-z]{2}\/)?$/.test(item.targetRoute || "") ? 4 : 0;
  const sourceSpecificity = /viewtopic\.php|comments\//.test(item.sourceUrl || "") ? 3 : 0;
  const score = priority + status + fit + freshness + intentDepth + exactRoute + sourceSpecificity;
  const actionable = item.status === "ready_for_manual_reply" && fit >= 25 && ageDays <= 90;
  return Object.freeze({ ...item, ageDays, score, actionable });
}

export function rankTrafficOpportunities(opportunities, { asOf, market = null, includeCompleted = false } = {}) {
  if (!Array.isArray(opportunities)) throw new TypeError("TRAFFIC_DISTRIBUTION_LIST_REQUIRED");
  if (!asOf) throw new Error("TRAFFIC_DISTRIBUTION_AS_OF_REQUIRED");
  return opportunities
    .filter((item) => !market || item.market === market)
    .filter((item) => includeCompleted || !["replied", "closed"].includes(item.status))
    .map((item) => scoreTrafficOpportunity(item, { asOf }))
    .sort((a, b) => b.score - a.score || a.ageDays - b.ageDays || a.id.localeCompare(b.id));
}

export function trafficDistributionSummary(opportunities, options = {}) {
  const ranked = rankTrafficOpportunities(opportunities, options);
  const byMarket = Object.create(null);
  for (const item of ranked) {
    byMarket[item.market] ||= [];
    byMarket[item.market].push(item);
  }
  return Object.freeze({
    asOf: options.asOf,
    market: options.market || "all",
    total: ranked.length,
    actionable: ranked.filter((item) => item.actionable).length,
    top: Object.freeze(ranked.slice(0, 10)),
    byMarket: Object.freeze(byMarket),
  });
}
