// Czech-facing prices are displayed only when the feed explicitly quotes CZK.
// priceCzk is a legacy field name that may hold EUR/PLN/HUF amounts.
export function czechProductPrice(product, quantity = 1) {
  if (product?.priceCurrency !== "CZK" || product.priceCzk == null || product.priceCzk === "") return null;
  const price = Number(product.priceCzk);
  if (!Number.isFinite(price) || price <= 0 || !Number.isInteger(quantity) || quantity < 1) return null;
  return price * quantity;
}

export function czechPackagePrice(variant) {
  if (variant?.totalCurrency !== "CZK" || !Array.isArray(variant.items) || !variant.items.length) return null;
  const priced = variant.items.map(({ product }) => czechProductPrice(product, product.recommendedQuantity || 1));
  return priced.every((price) => price !== null) ? priced.reduce((sum, price) => sum + price, 0) : null;
}

// Prefer the engine's actual recommended basket; for incomplete baskets, show
// the best verified fit in each available category. Never invent extra offers.
export function featuredCzechProducts(recommendations, packages = [], limit = 3) {
  const selected = [];
  const seen = new Set();
  const seenCategories = new Set();
  const append = (candidate, category) => {
    if (!candidate?.product?.id || seen.has(candidate.product.id) || seenCategories.has(category) || selected.length >= limit) return;
    seen.add(candidate.product.id);
    seenCategories.add(category);
    selected.push({ ...candidate, category, product: candidate.product });
  };
  for (const candidate of packages.find(({ id }) => id === "recommended")?.items || []) {
    append(candidate, candidate.category);
  }
  for (const [category, candidates] of Object.entries(recommendations || {})) {
    append(candidates?.[0], category);
  }
  return selected;
}
