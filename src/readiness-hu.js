export const HU_REQUIRED_PRODUCT_COVERAGE = Object.freeze({
  battery: 2,
  solar_panel: 3,
  controller: 2,
  inverter: 3,
  dc_charger: 2,
  shore_charger: 2,
});

export function assessHungarianLaunchReadiness({
  catalog,
  languageReviewed = false,
  mobileJourneyReviewed = false,
} = {}) {
  const products = Array.isArray(catalog?.products) ? catalog.products : [];
  const categoryCounts = Object.fromEntries(Object.keys(HU_REQUIRED_PRODUCT_COVERAGE).map((category) => [category, 0]));
  for (const product of products) {
    if (Object.hasOwn(categoryCounts, product?.category)) categoryCounts[product.category] += 1;
  }

  const checks = {
    catalogSource: catalog?.market === "hu-HU"
      && catalog?.currency === "EUR"
      && catalog?.sources?.ampul_hu?.status === "ok",
    productCoverage: Object.entries(HU_REQUIRED_PRODUCT_COVERAGE)
      .every(([category, minimum]) => categoryCounts[category] >= minimum),
    languageReviewed: languageReviewed === true,
    mobileJourneyReviewed: mobileJourneyReviewed === true,
  };
  const missingCategories = Object.entries(HU_REQUIRED_PRODUCT_COVERAGE)
    .filter(([category, minimum]) => categoryCounts[category] < minimum)
    .map(([category, minimum]) => Object.freeze({ category, count: categoryCounts[category], minimum }));
  const blockers = [
    ...(!checks.catalogSource ? ["HU_CATALOG_SOURCE_NOT_READY"] : []),
    ...missingCategories.map(({ category }) => `HU_PRODUCT_COVERAGE_${category.toUpperCase()}`),
    ...(!checks.languageReviewed ? ["HU_LANGUAGE_REVIEW_REQUIRED"] : []),
    ...(!checks.mobileJourneyReviewed ? ["HU_MOBILE_JOURNEY_REVIEW_REQUIRED"] : []),
  ];

  return Object.freeze({
    ready: Object.values(checks).every(Boolean),
    checks: Object.freeze(checks),
    categoryCounts: Object.freeze(categoryCounts),
    missingCategories: Object.freeze(missingCategories),
    blockers: Object.freeze(blockers),
  });
}

export function requireHungarianLaunchReady(input) {
  const report = assessHungarianLaunchReadiness(input);
  if (!report.ready) throw new Error(`HU_LAUNCH_BLOCKED:${report.blockers.join(",")}`);
  return report;
}
