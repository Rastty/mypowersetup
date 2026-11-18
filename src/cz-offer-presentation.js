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

// Czech callers keep their original API; the verified selection is now
// shared with SK, PL and HU without changing the eligibility engine.
export { selectFeaturedOffers as featuredCzechProducts } from "./featured-core-offers.js";
