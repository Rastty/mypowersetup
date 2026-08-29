import { RO_MARKET_SEED } from "./market-seed-ro.js";
import { PT_MARKET_SEED } from "./market-seed-pt.js";
import { SI_MARKET_SEED } from "./market-seed-si.js";

export const EXPANSION_MARKETS = Object.freeze({ ro: RO_MARKET_SEED, pt: PT_MARKET_SEED, si: SI_MARKET_SEED });

export const EXPANSION_CONTENT_PLAN = Object.freeze({
  ro: Object.freeze(["calculator","battery-capacity","solar-sizing","agm-vs-lifepo4","mppt-controller","dc-dc-charger","inverter-sizing","12v-vs-24v","power-station-vs-fixed","complete-system"]),
  pt: Object.freeze(["calculator","battery-capacity","solar-sizing","agm-vs-lifepo4","mppt-controller","dc-dc-charger","inverter-sizing","12v-vs-24v","power-station-vs-fixed","complete-system"]),
  si: Object.freeze(["calculator","battery-capacity","solar-sizing","agm-vs-lifepo4","mppt-controller","dc-dc-charger","inverter-sizing","12v-vs-24v","power-station-vs-fixed","complete-system"]),
});

export function assessExpansionMarketPublication(marketKey, evidence = {}) {
  const seed = EXPANSION_MARKETS[marketKey];
  if (!seed) throw new Error(`EXPANSION_MARKET_UNKNOWN:${marketKey}`);

  const checks = Object.freeze({
    privateSeed: seed.private === true && /noindex/.test(seed.robots),
    localizedCalculator: evidence.localizedCalculator === true,
    localIntentResearch: evidence.localIntentResearch === true,
    contentCluster: evidence.contentCluster === true,
    affiliateValidation: evidence.affiliateValidation === true,
    mobile390x844: evidence.mobile390x844 === true,
    analyticsParity: evidence.analyticsParity === true,
    nativeLanguageReview: evidence.nativeLanguageReview === true,
  });
  const blockers = Object.entries(checks).filter(([, value]) => !value).map(([name]) => name);
  return Object.freeze({
    market: marketKey,
    locale: seed.locale,
    route: seed.route,
    publicationReady: blockers.length === 0,
    checks,
    blockers: Object.freeze(blockers),
    nextAction: blockers[0] ?? "publish-progressively",
  });
}

export function requireExpansionMarketPublication(marketKey, evidence = {}) {
  const report = assessExpansionMarketPublication(marketKey, evidence);
  if (!report.publicationReady) throw new Error(`EXPANSION_PUBLICATION_BLOCKED:${marketKey}:${report.blockers.join(",")}`);
  return report;
}
