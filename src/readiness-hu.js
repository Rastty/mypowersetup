export const HU_REQUIRED_PRODUCT_COVERAGE = Object.freeze({
  battery: 2,
  solar_panel: 3,
  controller: 2,
  inverter: 3,
  dc_charger: 2,
  shore_charger: 2,
});

function assessHungarianSharedReadiness({ catalog, languageReviewed = false, mobileJourneyReviewed = false } = {}) {
  const products = Array.isArray(catalog?.products) ? catalog.products : [];
  const categoryCounts = Object.fromEntries(Object.keys(HU_REQUIRED_PRODUCT_COVERAGE).map((category) => [category, 0]));
  for (const product of products) {
    if (Object.hasOwn(categoryCounts, product?.category)) categoryCounts[product.category] += 1;
  }

  const catalogSources = Object.values(catalog?.sources || {});
  const allCatalogSourcesFresh = catalogSources.length > 0
    && catalogSources.every((source) => source?.status === "ok");

  const catalogSource = catalog?.market === "hu-HU"
    && catalog?.currency === "EUR"
    && catalog?.sources?.ampul_hu?.status === "ok"
    && allCatalogSourcesFresh;
  const missingCategories = Object.entries(HU_REQUIRED_PRODUCT_COVERAGE)
    .filter(([category, minimum]) => categoryCounts[category] < minimum)
    .map(([category, minimum]) => Object.freeze({ category, count: categoryCounts[category], minimum }));

  return {
    categoryCounts,
    missingCategories,
    checks: {
      catalogSource,
      productCoverage: missingCategories.length === 0,
      languageReviewed: languageReviewed === true,
      mobileJourneyReviewed: mobileJourneyReviewed === true,
    },
  };
}

export function assessHungarianPublicationReadiness(input = {}) {
  const shared = assessHungarianSharedReadiness(input);
  const checks = {
    catalogSource: shared.checks.catalogSource,
    languageReviewed: shared.checks.languageReviewed,
    mobileJourneyReviewed: shared.checks.mobileJourneyReviewed,
  };
  const blockers = [
    ...(!checks.catalogSource ? ["HU_CATALOG_SOURCE_NOT_READY"] : []),
    ...(!checks.languageReviewed ? ["HU_LANGUAGE_REVIEW_REQUIRED"] : []),
    ...(!checks.mobileJourneyReviewed ? ["HU_MOBILE_JOURNEY_REVIEW_REQUIRED"] : []),
  ];

  return Object.freeze({
    ready: Object.values(checks).every(Boolean),
    checks: Object.freeze(checks),
    categoryCounts: Object.freeze(shared.categoryCounts),
    missingCategories: Object.freeze(shared.missingCategories),
    blockers: Object.freeze(blockers),
  });
}

export function assessHungarianLaunchReadiness(input = {}) {
  const shared = assessHungarianSharedReadiness(input);
  const checks = shared.checks;
  const blockers = [
    ...(!checks.catalogSource ? ["HU_CATALOG_SOURCE_NOT_READY"] : []),
    ...shared.missingCategories.map(({ category }) => `HU_PRODUCT_COVERAGE_${category.toUpperCase()}`),
    ...(!checks.languageReviewed ? ["HU_LANGUAGE_REVIEW_REQUIRED"] : []),
    ...(!checks.mobileJourneyReviewed ? ["HU_MOBILE_JOURNEY_REVIEW_REQUIRED"] : []),
  ];

  return Object.freeze({
    ready: Object.values(checks).every(Boolean),
    checks: Object.freeze(checks),
    categoryCounts: Object.freeze(shared.categoryCounts),
    missingCategories: Object.freeze(shared.missingCategories),
    blockers: Object.freeze(blockers),
  });
}

export function requireHungarianPublicationReady(input) {
  const report = assessHungarianPublicationReadiness(input);
  if (!report.ready) throw new Error(`HU_PUBLICATION_BLOCKED:${report.blockers.join(",")}`);
  return report;
}

export function requireHungarianLaunchReady(input) {
  const report = assessHungarianLaunchReadiness(input);
  if (!report.ready) throw new Error(`HU_LAUNCH_BLOCKED:${report.blockers.join(",")}`);
  return report;
}
