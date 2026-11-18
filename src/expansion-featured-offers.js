import { isRecommendationEligible } from "./recommendation-coverage.js";

// Keep the fast purchase path honest: a handful of verified components is not
// a complete system. Only a complete component route or a fully fitting
// portable alternative may be promoted above the electrical result cards.
export function selectExpansionFeaturedOffers(products, routePriority, { sourceGap = false, limit = 3 } = {}) {
  const empty = Object.freeze({ kind: "none", items: Object.freeze([]), remainingCount: 0 });
  if (sourceGap || !Array.isArray(products) || !Number.isSafeInteger(limit) || limit < 1) return empty;

  if (routePriority?.preferPortable === true && routePriority.portableReady === true) {
    const portable = products.find((item) => item.category === "power_station" && isRecommendationEligible(item));
    if (!portable) return empty;
    return Object.freeze({ kind: "portable", items: Object.freeze([portable]), remainingCount: 0 });
  }

  if (routePriority?.coverage?.complete !== true) return empty;
  const required = routePriority.coverage.required;
  if (!Array.isArray(required) || required.length === 0) return empty;
  const matched = required.map((category) => products.find((item) => item.category === category && isRecommendationEligible(item)));
  if (matched.some((item) => !item)) return empty;
  return Object.freeze({
    kind: "components",
    items: Object.freeze(matched.slice(0, limit)),
    remainingCount: Math.max(0, matched.length - limit),
  });
}
