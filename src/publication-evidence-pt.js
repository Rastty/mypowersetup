import { assessExpansionMarketPublication } from "./expansion-market-publication.js";

export const PT_VERIFIED_FOUNDATION = Object.freeze({
  localizedCalculator: true,
  localIntentResearch: true,
  contentCluster: true,
  affiliateValidation: true,
  analyticsParity: true,
});

export function assessPortugalPublication({ mobileSmokePassed = false, nativeLanguageReview = false } = {}) {
  return assessExpansionMarketPublication("pt", {
    ...PT_VERIFIED_FOUNDATION,
    mobile390x844: mobileSmokePassed === true,
    nativeLanguageReview: nativeLanguageReview === true,
  });
}

export function requirePortugalPublication(evidence = {}) {
  const report = assessPortugalPublication(evidence);
  if (!report.publicationReady) {
    throw new Error(`PT_PUBLICATION_BLOCKED:${report.blockers.join(",")}`);
  }
  return report;
}
