import { assessExpansionMarketPublication } from "./expansion-market-publication.js";

export const RO_VERIFIED_FOUNDATION = Object.freeze({
  localizedCalculator: true,
  localIntentResearch: true,
  contentCluster: true,
  affiliateValidation: true,
  mobile390x844: false,
  analyticsParity: true,
  nativeLanguageReview: false,
});

export const RO_AFFILIATE_EVIDENCE = Object.freeze({
  merchant: "allpowers_eu",
  awinMerchantId: 38934,
  affiliateId: 3044971,
  exactProductDestination: true,
  romaniaShippingEligible: true,
  verifiedAt: "2026-08-29",
  shippingEvidenceUrl: "https://iallpowers.eu/pages/shipping-policy",
  catalog: "/data/products-ro.json",
  policy: "fail-closed",
});

export function assessRomaniaPublication(overrides = {}) {
  return assessExpansionMarketPublication("ro", { ...RO_VERIFIED_FOUNDATION, ...overrides });
}

export function requireRomaniaPublication(evidence = {}) {
  const report = assessRomaniaPublication(evidence);
  if (!report.publicationReady) throw new Error(`RO_PUBLICATION_BLOCKED:${report.blockers.join(",")}`);
  return report;
}
