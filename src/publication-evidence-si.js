import { assessExpansionMarketPublication } from "./expansion-market-publication.js";

export const SI_VERIFIED_FOUNDATION = Object.freeze({
  localizedCalculator: true,
  localIntentResearch: false,
  contentCluster: false,
  affiliateValidation: false,
  mobile390x844: false,
  analyticsParity: true,
  nativeLanguageReview: false,
});

export function assessSloveniaPublication(overrides = {}) {
  return assessExpansionMarketPublication("si", {
    ...SI_VERIFIED_FOUNDATION,
    ...overrides,
  });
}

export function requireSloveniaPublication(evidence = {}) {
  const report = assessSloveniaPublication(evidence);
  if (!report.publicationReady) {
    throw new Error(`SI_PUBLICATION_BLOCKED:${report.blockers.join(",")}`);
  }
  return report;
}
