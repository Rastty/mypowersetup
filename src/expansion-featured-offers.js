import { isRecommendationEligible } from "./recommendation-coverage.js";

// Keep the fast purchase path honest: a handful of verified components is not
// a complete system. Only a complete component route or a fully fitting
// portable alternative may be promoted above the electrical result cards.
export function selectExpansionFeaturedOffers(products, routePriority, { sourceGap = false, limit = 4 } = {}) {
  const empty = Object.freeze({ kind: "none", items: Object.freeze([]), alternatives: Object.freeze([]), remainingCount: 0 });
  if (sourceGap || !Array.isArray(products) || !Number.isSafeInteger(limit) || limit < 1) return empty;

  if (routePriority?.preferPortable === true && routePriority.portableReady === true) {
    // Only recommendations already matched against the entire power-station
    // electrical profile may reach this list. Never substitute a raw catalog
    // product or promote a stale/unavailable option to the purchase panel.
    const eligible = products.filter((item) => item.category === "power_station" && isRecommendationEligible(item));
    if (!eligible.length) return empty;
    const [primary, ...alternatives] = eligible.filter((item, index, all) =>
      all.findIndex((candidate) => candidate.id === item.id) === index);
    return Object.freeze({
      kind: "portable",
      items: Object.freeze([primary]),
      alternatives: Object.freeze(alternatives.slice(0, limit - 1)),
      remainingCount: 0,
    });
  }

  if (routePriority?.coverage?.complete !== true) return empty;
  const required = routePriority.coverage.required;
  if (!Array.isArray(required) || required.length === 0) return empty;
  const matched = required.map((category) => products.find((item) => item.category === category && isRecommendationEligible(item)));
  if (matched.some((item) => !item)) return empty;
  return Object.freeze({
    kind: "components",
    items: Object.freeze(matched.slice(0, limit)),
    alternatives: Object.freeze([]),
    remainingCount: Math.max(0, matched.length - limit),
  });
}
