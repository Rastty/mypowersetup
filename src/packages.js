import { isRecommendationEligible, requiredRecommendationCategories } from "./recommendation-coverage.js";

// Keep the shopping list in a practical build/order sequence: storage and generation
// first, then regulation/conversion, then optional charging sources.
const PACKAGE_CATEGORIES = ["battery", "solar_panel", "controller", "inverter", "dc_charger", "shore_charger"];
const VALUE_SCORE_GAP = 15;
const MIN_VALUE_SCORE = 70;

function effectivePrice(candidate) {
  const price = Number(candidate?.product?.priceCzk);
  if (!Number.isFinite(price) || price < 0) return null;
  return price * (candidate.product.recommendedQuantity || 1);
}

function cheapest(candidates) {
  return [...candidates]
    .filter((candidate) => effectivePrice(candidate) !== null)
    .sort((a, b) => effectivePrice(a) - effectivePrice(b) || b.score - a.score)[0]
    || candidates[0];
}

// "Economy" should mean best-value compatible choice, not simply the absolute
// cheapest feed row. Keep it within a conservative score band of the strongest
// match so a large price saving cannot silently trade away too much fit/data quality.
function bestValue(candidates) {
  const priced = candidates.filter((candidate) => effectivePrice(candidate) !== null);
  if (!priced.length) return candidates[0];

  const finiteScores = priced.map(({ score }) => Number(score)).filter(Number.isFinite);
  if (!finiteScores.length) return cheapest(priced);

  const topScore = Math.max(...finiteScores);
  const scoreFloor = Math.max(topScore - VALUE_SCORE_GAP, Math.min(MIN_VALUE_SCORE, topScore));
  const safeBand = priced.filter(({ score }) => Number.isFinite(Number(score)) && Number(score) >= scoreFloor);
  return cheapest(safeBand.length ? safeBand : priced);
}

function withReserve(candidates) {
  const preferred = candidates
    .filter((candidate) => Number.isFinite(candidate.fit) && candidate.fit >= 1.08 && candidate.fit <= 1.6)
    .sort((a, b) => Math.abs(a.fit - 1.25) - Math.abs(b.fit - 1.25) || b.score - a.score);
  return preferred[0] || candidates[0];
}

function eligibleCandidates(recommendations, category) {
  return (recommendations[category] || []).filter(isRecommendationEligible);
}

function packageQuality(items) {
  const scores = items.map(({ score }) => Number(score)).filter(Number.isFinite);
  if (!scores.length) return { matchScore: null, minimumItemScore: null };
  const clampScore = (score) => Math.max(0, Math.min(100, score));
  const normalized = scores.map(clampScore);
  return {
    matchScore: Math.round(normalized.reduce((sum, score) => sum + score, 0) / normalized.length),
    minimumItemScore: Math.round(Math.min(...normalized)),
  };
}

function buildVariant(id, categories, recommendations, selector) {
  const items = categories.flatMap((category) => {
    const candidates = eligibleCandidates(recommendations, category);
    const selected = candidates.length ? selector(candidates) : null;
    return selected ? [{ category, ...selected }] : [];
  });
  const priced = items.map(effectivePrice);
  const currencies = new Set(items.map(({ product }) => product.priceCurrency).filter(Boolean));
  return {
    id,
    items,
    ...packageQuality(items),
    purchaseSequence: items.map(({ category }) => category),
    totalPriceCzk: priced.every((price) => price !== null) && currencies.size <= 1
      ? priced.reduce((total, price) => total + price, 0)
      : null,
    totalCurrency: currencies.size === 1 ? [...currencies][0] : null,
  };
}

function signature(variant) {
  return variant.items.map(({ category, product }) => `${category}:${product.id}`).join("|");
}

export function buildProductPackages(recommendations, setup) {
  if (!recommendations || !setup) return [];
  const required = new Set(requiredRecommendationCategories(setup));
  const categories = PACKAGE_CATEGORIES.filter((category) => required.has(category));
  if (categories.length < 2 || categories.some((category) => eligibleCandidates(recommendations, category).length === 0)) return [];

  const candidates = [
    buildVariant("economy", categories, recommendations, bestValue),
    buildVariant("recommended", categories, recommendations, (items) => items[0]),
    buildVariant("reserve", categories, recommendations, withReserve),
  ];
  const recommendedSignature = signature(candidates.find(({ id }) => id === "recommended"));
  const seen = new Set();
  return candidates.filter((variant) => {
    const key = signature(variant);
    if (!key) return false;
    // If an alternative collapses to the same products as the recommended route,
    // keep the recommended label instead of presenting the same basket as "budget".
    if (variant.id !== "recommended" && key === recommendedSignature) return false;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
