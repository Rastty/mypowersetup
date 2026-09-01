import { parseAllpowersPtDeeplink } from "./affiliate-allpowers-pt.js";
import { calculatePowerStationProfile } from "./power-station.js";
import { validatePtCatalog } from "./products-pt.js";
import { buildExpansionComponentRecommendations } from "./expansion-component-recommendations.js";

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

  const solar = safeCatalog.products
    .filter((product) => product.category === "solar_panel" && product.available !== false && product.specs?.powerW > 0)
    .map((product) => {
      const quantity = Math.max(1, Math.ceil(setup.solarWatts / product.specs.powerW));
      const fit = (product.specs.powerW * quantity) / setup.solarWatts;
      return { product, quantity, fit };
    })
    .filter(({ product, quantity, fit }) => quantity <= 4 && fit > 0 && fit <= 3 && hasExactAffiliateDestination(product))
    .sort((a, b) => Math.abs(1 - a.fit) - Math.abs(1 - b.fit) || Number(a.product.priceCzk ?? Infinity) - Number(b.product.priceCzk ?? Infinity))
    .slice(0, limitPerCategory)
    .map(({ product, quantity }) => recommendationView(product, { quantity }));

  const profile = calculatePowerStationProfile(setup);
  const powerStations = profile.profile === "individual" ? [] : safeCatalog.products
    .filter((product) => product.category === "power_station" && product.available !== false && hasExactAffiliateDestination(product))
    .filter((product) => {
      const specs = product.specs || {};
      if (!(specs.capacityWh >= profile.capacityWh)) return false;
      if (profile.acOutputWatts > 0 && !(specs.powerW >= profile.acOutputWatts)) return false;
      if (profile.solarInputWatts > 0 && !(specs.solarInputW >= profile.solarInputWatts)) return false;
      if (profile.dcOutputAmpsAt12V > 0 && !(specs.dcOutputA >= profile.dcOutputAmpsAt12V)) return false;
      return Boolean(product.verifiedAt);
    })
    .sort((a, b) => Number(a.priceCzk ?? Infinity) - Number(b.priceCzk ?? Infinity))
    .slice(0, limitPerCategory)
    .map((product) => recommendationView(product));
  const components = buildExpansionComponentRecommendations(safeCatalog.products, setup, limitPerCategory);

  return Object.freeze({
    ...components,
    solar_panel: Object.freeze(solar),
    power_station: Object.freeze(powerStations),
  });
}

export function portugalRecommendationCoverage(recommendations) {
  return Object.freeze({
    battery: (recommendations?.battery?.length || 0) > 0,
    solarPanel: (recommendations?.solar_panel?.length || 0) > 0,
    controller: (recommendations?.controller?.length || 0) > 0,
    inverter: (recommendations?.inverter?.length || 0) > 0,
    powerStation: (recommendations?.power_station?.length || 0) > 0,
  });
}

function hasExactAffiliateDestination(product) {
  try {
    const parsed = parseAllpowersPtDeeplink(product?.affiliateUrl || "");
    return Boolean(parsed && parsed.destinationUrl === new URL(product.productUrl).toString());
  } catch {
    return false;
  }
}

function recommendationView(product, { quantity = 1 } = {}) {
  return Object.freeze({
    id: product.id,
    merchant: product.merchant,
    category: product.category,
    name: product.name,
    productUrl: product.productUrl,
    affiliateUrl: product.affiliateUrl,
    price: product.priceCzk,
    currency: product.priceCurrency,
    imageUrl: product.imageUrl || null,
    quantity,
    powerW: product.specs?.powerW || null,
    capacityWh: product.specs?.capacityWh || null,
    verifiedAt: product.verifiedAt || null,
  });
}
