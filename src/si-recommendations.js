import { calculatePowerStationProfile } from "./power-station.js";
import { validateOxeDognetDeeplink, validateOxeProductUrl } from "./oxe-affiliate.js";
import { isPowerQueenExpansionProduct, validatePowerQueenExpansionProduct } from "./powerqueen-expansion.js";
import { buildExpansionComponentRecommendations } from "./expansion-component-recommendations.js";

export const SI_CATALOG_URL = "/data/products-si.json";
const AWIN_MERCHANT_ID = "38934";
const AWIN_AFFILIATE_ID = "3044971";
const PRODUCT_HOST = "iallpowers.eu";

export function parseSloveniaAffiliateUrl(value) {
  const url = new URL(value);
  if (!new Set(["www.awin1.com", "awin1.com"]).has(url.hostname)) throw new Error("SI_AFFILIATE_HOST_INVALID");
  if (url.searchParams.get("awinmid") !== AWIN_MERCHANT_ID) throw new Error("SI_AFFILIATE_MERCHANT_INVALID");
  if (url.searchParams.get("awinaffid") !== AWIN_AFFILIATE_ID) throw new Error("SI_AFFILIATE_ACCOUNT_INVALID");
  const destination = new URL(url.searchParams.get("ued") || "");
  if (destination.protocol !== "https:" || destination.hostname !== PRODUCT_HOST) throw new Error("SI_AFFILIATE_DESTINATION_INVALID");
  if (!/^\/products\/[a-z0-9-]+\/?$/i.test(destination.pathname)) throw new Error("SI_AFFILIATE_PRODUCT_PATH_INVALID");
  return Object.freeze({ affiliateUrl: url.toString(), destination: destination.toString() });
}

export function validateSloveniaCatalog(catalog) {
  if (catalog?.market !== "sl-SI" || catalog?.currency !== "EUR" || catalog?.private !== false) throw new Error("SI_CATALOG_SHAPE_INVALID");
  if (catalog?.shippingEligibility?.country !== "Slovenia" || catalog?.shippingEligibility?.eligible !== true) throw new Error("SI_SHIPPING_ELIGIBILITY_MISSING");
  if (!Array.isArray(catalog.products) || !catalog.products.length) throw new Error("SI_CATALOG_EMPTY");
  const powerQueenProducts = catalog.products.filter(isPowerQueenExpansionProduct);
  if (powerQueenProducts.length && catalog.sources?.powerqueen_eu?.status !== "ok") throw new Error("SI_POWERQUEEN_SOURCE_INVALID");
  for (const product of catalog.products) validateSloveniaProduct(product);
  return catalog;
}

export async function loadSloveniaProductCatalog(fetchImpl = globalThis.fetch) {
  const response = await fetchImpl(SI_CATALOG_URL, { cache: "no-store" });
  if (!response.ok) throw new Error(`SI_CATALOG_HTTP_${response.status}`);
  return validateSloveniaCatalog(await response.json());
}

export function buildSloveniaRecommendations(catalog, setup, limit = 3) {
  validateSloveniaCatalog(catalog);
  const solarTargetWatts = Number(setup.solarWatts) || 0;
  const solarPanels = solarTargetWatts > 0 ? catalog.products
    .filter((product) => product.category === "solar_panel" && product.available !== false)
    .map((product) => {
      const quantity = Math.max(1, Math.ceil(solarTargetWatts / product.specs.powerW));
      return { product, quantity, fit: (product.specs.powerW * quantity) / solarTargetWatts };
    })
    .filter(({ quantity, fit }) => quantity <= 4 && fit > 0 && fit <= 3)
    .sort((a, b) => Math.abs(1 - a.fit) - Math.abs(1 - b.fit) || Number(a.product.priceCzk ?? Infinity) - Number(b.product.priceCzk ?? Infinity))
    .slice(0, limit)
    .map(({ product, quantity }) => recommendationView(product, { quantity })) : [];

  const profile = calculatePowerStationProfile(setup);
  const powerStations = profile.profile === "individual" ? [] : catalog.products
    .filter((product) => product.category === "power_station" && product.available !== false)
    .filter((product) => product.specs.capacityWh >= profile.capacityWh)
    .filter((product) => product.specs.powerW >= profile.acOutputWatts)
    .filter((product) => product.specs.solarInputW >= profile.solarInputWatts)
    .filter((product) => product.specs.dcOutputA >= profile.dcOutputAmpsAt12V)
    .sort((a, b) => fitScore(a, profile) - fitScore(b, profile))
    .slice(0, limit)
    .map((product) => recommendationView(product));
  const components = buildExpansionComponentRecommendations(catalog.products, setup, limit);

  return Object.freeze({
    ...components,
    solar_panel: Object.freeze(solarPanels),
    power_station: Object.freeze(powerStations),
  });
}

function validateSloveniaProduct(product) {
  if (product?.marketEligible !== true) throw new Error("SI_PRODUCT_EVIDENCE_INVALID");
  if (isPowerQueenExpansionProduct(product)) {
    validatePowerQueenExpansionProduct(product);
    return;
  }
  if (!product?.verifiedAt) throw new Error("SI_PRODUCT_EVIDENCE_INVALID");

  let productUrl;
  if (product.merchant === "allpowers_eu") {
    const parsedUrl = new URL(product.productUrl);
    if (parsedUrl.protocol !== "https:" || parsedUrl.hostname !== PRODUCT_HOST || !/^\/products\/[a-z0-9-]+\/?$/i.test(parsedUrl.pathname)) throw new Error("SI_PRODUCT_URL_INVALID");
    productUrl = parsedUrl.toString();
    const parsedAffiliate = parseSloveniaAffiliateUrl(product.affiliateUrl);
    if (parsedAffiliate.destination !== productUrl) throw new Error("SI_AFFILIATE_DESTINATION_MISMATCH");
  } else if (product.merchant === "oxe_si") {
    productUrl = validateOxeProductUrl("si", product.productUrl);
    const parsedAffiliate = validateOxeDognetDeeplink("si", product.affiliateUrl);
    if (parsedAffiliate.destination !== productUrl) throw new Error("SI_AFFILIATE_DESTINATION_MISMATCH");
  } else {
    throw new Error("SI_PRODUCT_MERCHANT_INVALID");
  }

  const specs = product.specs || {};
  if (product.category === "solar_panel") {
    if (product.merchant !== "allpowers_eu" || !(specs.powerW >= 60 && specs.powerW <= 1000)) throw new Error("SI_SOLAR_PANEL_SPECS_INVALID");
    return;
  }
  if (product.category !== "power_station" || !(specs.capacityWh > 0 && specs.powerW > 0 && specs.solarInputW > 0 && specs.dcOutputA > 0 && specs.pureSine === true)) {
    throw new Error("SI_POWER_STATION_SPECS_INVALID");
  }
}

function recommendationView(product, { quantity = 1 } = {}) {
  return Object.freeze({
    id: product.id,
    category: product.category,
    name: product.name,
    affiliateUrl: product.affiliateUrl,
    productUrl: product.productUrl,
    capacityWh: product.specs.capacityWh || null,
    powerW: product.specs.powerW || null,
    solarInputW: product.specs.solarInputW || null,
    dcOutputA: product.specs.dcOutputA || null,
    price: Number.isFinite(product.priceCzk) ? product.priceCzk : null,
    currency: product.priceCurrency || "EUR",
    quantity,
    merchant: product.merchant,
  });
}

function fitScore(product, profile) {
  const ratios = [
    product.specs.capacityWh / Math.max(profile.capacityWh, 1),
    ...(profile.acOutputWatts > 0 ? [product.specs.powerW / profile.acOutputWatts] : []),
    ...(profile.solarInputWatts > 0 ? [product.specs.solarInputW / profile.solarInputWatts] : []),
    ...(profile.dcOutputAmpsAt12V > 0 ? [product.specs.dcOutputA / profile.dcOutputAmpsAt12V] : []),
  ];
  return Math.max(...ratios);
}
