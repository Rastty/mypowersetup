import { isRecommendationEligible } from "./recommendation-coverage.js";

// Prefer the engine's recommended basket; when a complete basket does not
// exist, expose the best already-verified match from each available category.
// Show the four core components (battery, solar, MPPT and AC inverter when
// required) without forcing buyers to open the detailed comparison first.
// Presentation only: never introduce an unavailable or stale product.
export function selectFeaturedOffers(recommendations, packages = [], limit = 4) {
  const selected = [];
  const seenProducts = new Set();
  const seenCategories = new Set();
  const append = (candidate, category) => {
    if (!category || !candidate?.product?.id || !isRecommendationEligible(candidate)
      || seenProducts.has(candidate.product.id)
      || seenCategories.has(category) || selected.length >= limit) return;
    seenProducts.add(candidate.product.id);
    seenCategories.add(category);
    selected.push({ ...candidate, category, product: candidate.product });
  };
  const recommendedPackage = Array.isArray(packages)
    ? packages.find(({ id }) => id === "recommended") : null;
  for (const candidate of recommendedPackage?.items || []) {
    append(candidate, candidate.category);
  }
  for (const [category, candidates] of Object.entries(recommendations || {})) {
    // The first-ranked match may have gone stale, or may already be featured
    // for another category. Keep searching vetted matches in that category.
    for (const candidate of Array.isArray(candidates) ? candidates : []) {
      append(candidate, category);
      if (seenCategories.has(category) || selected.length >= limit) break;
    }
  }
  return selected;
}
