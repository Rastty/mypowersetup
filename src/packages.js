const PACKAGE_CATEGORIES = ["battery", "solar_panel", "inverter", "controller", "dc_charger", "shore_charger"];

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

function withReserve(candidates) {
  const preferred = candidates
    .filter((candidate) => Number.isFinite(candidate.fit) && candidate.fit >= 1.08 && candidate.fit <= 1.6)
    .sort((a, b) => Math.abs(a.fit - 1.25) - Math.abs(b.fit - 1.25) || b.score - a.score);
  return preferred[0] || candidates[0];
}

function buildVariant(id, categories, recommendations, selector) {
  const items = categories.flatMap((category) => {
    const candidates = recommendations[category] || [];
    const selected = candidates.length ? selector(candidates) : null;
    return selected ? [{ category, ...selected }] : [];
  });
  const priced = items.map(effectivePrice);
  return {
    id,
    items,
    totalPriceCzk: priced.every((price) => price !== null)
      ? priced.reduce((total, price) => total + price, 0)
      : null,
  };
}

function signature(variant) {
  return variant.items.map(({ category, product }) => `${category}:${product.id}`).join("|");
}

export function buildProductPackages(recommendations, setup) {
  if (!recommendations || !setup) return [];
  const categories = PACKAGE_CATEGORIES.filter((category) => {
    if (category === "inverter" && !Number(setup.inverterWatts)) return false;
    if (category === "dc_charger" && !setup.charging?.dcDc?.suggestedCurrentAmps) return false;
    if (category === "shore_charger" && !setup.charging?.shore?.suggestedCurrentAmps) return false;
    return (recommendations[category] || []).length > 0;
  });
  if (categories.length < 2) return [];

  const candidates = [
    buildVariant("economy", categories, recommendations, cheapest),
    buildVariant("recommended", categories, recommendations, (items) => items[0]),
    buildVariant("reserve", categories, recommendations, withReserve),
  ];
  const seen = new Set();
  return candidates.filter((variant) => {
    const key = signature(variant);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
