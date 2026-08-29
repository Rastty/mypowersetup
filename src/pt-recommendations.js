import { parseAllpowersPtDeeplink } from "./affiliate-allpowers-pt.js";
import { recommendProducts } from "./products.js";
import { validatePtCatalog } from "./products-pt.js";

export const PT_CATALOG_URL = "/data/products-pt.json";

export async function loadPortugalProductCatalog(fetchImpl = globalThis.fetch) {
  if (typeof fetchImpl !== "function") throw new TypeError("PT_CATALOG_FETCH_UNAVAILABLE");
  const response = await fetchImpl(PT_CATALOG_URL, { cache: "no-store" });
  if (!response?.ok) throw new Error(`PT_CATALOG_HTTP_${response?.status || "ERROR"}`);
  return validatePtCatalog(await response.json());
}

export function buildPortugalRecommendations(catalog, setup, limitPerCategory = 3) {
  const safeCatalog = validatePtCatalog({
    market: "pt-PT",
    currency: "EUR",
    generatedAt: catalog?.generatedAt || null,
    sources: catalog?.sources || {},
    products: catalog?.products || [],
  });
  const ranked = recommendProducts(safeCatalog.products, { ...setup, locale: "pt" }, limitPerCategory);
  const allowedCategories = ["solar_panel", "power_station"];

  return Object.freeze(Object.fromEntries(allowedCategories.map((category) => {
    const safe = (ranked[category] || []).filter(({ product }) => {
      const parsed = parseAllpowersPtDeeplink(product?.affiliateUrl || "");
      return Boolean(parsed && parsed.destinationUrl === new URL(product.productUrl).toString());
    }).map((entry) => Object.freeze({
      category,
      name: entry.product.name,
      productUrl: entry.product.productUrl,
      affiliateUrl: entry.product.affiliateUrl,
      price: entry.product.priceCzk,
      currency: entry.product.priceCurrency,
      imageUrl: entry.product.imageUrl || null,
      quantity: entry.product.recommendedQuantity || 1,
      powerW: entry.product.specs?.powerW || null,
      capacityWh: entry.product.specs?.capacityWh || null,
      verifiedAt: entry.product.verifiedAt || null,
    }));
    return [category, Object.freeze(safe)];
  })));
}

export function portugalRecommendationCoverage(recommendations) {
  return Object.freeze({
    solarPanel: (recommendations?.solar_panel?.length || 0) > 0,
    powerStation: (recommendations?.power_station?.length || 0) > 0,
  });
}
