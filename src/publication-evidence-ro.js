import { assessExpansionMarketPublication } from "./expansion-market-publication.js";

export const RO_VERIFIED_FOUNDATION = Object.freeze({
  localizedCalculator: true,
  localIntentResearch: true,
  contentCluster: false,
  affiliateValidation: false,
  mobile390x844: false,
  analyticsParity: true,
  nativeLanguageReview: false,
});

export function assessRomaniaPublication(overrides = {}) {
  return assessExpansionMarketPublication("ro", { ...RO_VERIFIED_FOUNDATION, ...overrides });
}

export function requireRomaniaPublication(evidence = {}) {
  const report = assessRomaniaPublication(evidence);
  if (!report.publicationReady) throw new Error(`RO_PUBLICATION_BLOCKED:${report.blockers.join(",")}`);
  return report;
}
