import { recommendProducts } from "./products.js";

export const EXPANSION_COMPONENT_CATEGORIES = Object.freeze([
  "battery", "controller", "inverter", "dc_charger", "shore_charger",
]);

export function buildExpansionComponentRecommendations(products, setup, limitPerCategory = 3) {
  const recommendations = recommendProducts(products, {
    ...setup,
    charging: setup?.charging || {
      starterVoltage: null,
      dcDc: { suggestedCurrentAmps: null },
      shore: { suggestedCurrentAmps: null },
    },
  }, limitPerCategory);

  return Object.freeze(Object.fromEntries(EXPANSION_COMPONENT_CATEGORIES.map((category) => [
    category,
    Object.freeze((recommendations[category] || []).map(({ product, reason, verify }) => Object.freeze({
      id: product.id,
      merchant: product.merchant,
      category: product.category,
      name: product.name,
      productUrl: product.productUrl,
      affiliateUrl: product.affiliateUrl,
      price: Number.isFinite(product.priceCzk) ? product.priceCzk : null,
      currency: product.priceCurrency || "EUR",
      imageUrl: product.imageUrl || null,
      specs: Object.freeze({ ...(product.specs || {}) }),
      reason,
      verify,
      verifiedAt: product.verifiedAt || null,
    }))),
  ])));
}
