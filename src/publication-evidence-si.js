import { assessExpansionMarketPublication } from "./expansion-market-publication.js";

export const SI_VERIFIED_FOUNDATION = Object.freeze({
  localizedCalculator: true,
  localIntentResearch: true,
  contentCluster: true,
  affiliateValidation: true,
  mobile390x844: false,
  analyticsParity: true,
  nativeLanguageReview: false,
});

export const SI_AFFILIATE_EVIDENCE = Object.freeze({
  merchant: "allpowers_eu",
  awinMerchantId: 38934,
  affiliateId: 3044971,
  exactProductDestination: true,
  sloveniaShippingEligible: true,
  verifiedAt: "2026-08-29",
  catalog: "/data/products-si.json",
  policy: "fail-closed",
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
