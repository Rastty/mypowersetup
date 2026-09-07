import { assessRecommendationCoverage, isRecommendationEligible } from "./recommendation-coverage.js";

export function expansionPurchaseRoutePriority(recommendations, setup, locale = setup?.locale) {
  const coverage = assessRecommendationCoverage(recommendations, setup, locale);
  const portableReady = (recommendations?.power_station || []).some(isRecommendationEligible);
  const componentProductCount = ["battery", "solar_panel", "controller", "inverter", "dc_charger", "shore_charger"]
    .reduce((sum, category) => sum + (recommendations?.[category] || []).filter(isRecommendationEligible).length, 0);
  const preferPortable = portableReady && !coverage.complete;

  return Object.freeze({
    coverage,
    portableReady,
    componentProductCount,
    preferPortable,
    order: Object.freeze(preferPortable ? ["portable", "components"] : ["components", "portable"]),
  });
}
