import { calculatePowerStationProfile } from "./power-station.js";
import { validateOxeDognetDeeplink, validateOxeProductUrl } from "./oxe-affiliate.js";

export const RO_CATALOG_URL = "/data/products-ro.json";
const AWIN_MERCHANT_ID = "38934";
const AWIN_AFFILIATE_ID = "3044971";
const PRODUCT_HOST = "iallpowers.eu";

export function parseRomaniaAffiliateUrl(value) {
  const url = new URL(value);
  if (!new Set(["www.awin1.com", "awin1.com"]).has(url.hostname)) throw new Error("RO_AFFILIATE_HOST_INVALID");
  if (url.searchParams.get("awinmid") !== AWIN_MERCHANT_ID) throw new Error("RO_AFFILIATE_MERCHANT_INVALID");
  if (url.searchParams.get("awinaffid") !== AWIN_AFFILIATE_ID) throw new Error("RO_AFFILIATE_ACCOUNT_INVALID");
  const destination = new URL(url.searchParams.get("ued") || "");
  if (destination.protocol !== "https:" || destination.hostname !== PRODUCT_HOST) throw new Error("RO_AFFILIATE_DESTINATION_INVALID");
  if (!/^\/products\/[a-z0-9-]+\/?$/i.test(destination.pathname)) throw new Error("RO_AFFILIATE_PRODUCT_PATH_INVALID");
  return Object.freeze({ affiliateUrl: url.toString(), destination: destination.toString() });
}

export function validateRomaniaCatalog(catalog) {
  if (catalog?.market !== "ro-RO" || catalog?.currency !== "EUR" || catalog?.private !== false) throw new Error("RO_CATALOG_SHAPE_INVALID");
  if (catalog?.shippingEligibility?.country !== "Romania" || catalog?.shippingEligibility?.eligible !== true) throw new Error("RO_SHIPPING_ELIGIBILITY_MISSING");
  if (!Array.isArray(catalog.products) || !catalog.products.length) throw new Error("RO_CATALOG_EMPTY");
  for (const product of catalog.products) validateRomaniaProduct(product);
  return catalog;
}

export async function loadRomaniaProductCatalog(fetchImpl = globalThis.fetch) {
  const response = await fetchImpl(RO_CATALOG_URL, { cache: "no-store" });
  if (!response.ok) throw new Error(`RO_CATALOG_HTTP_${response.status}`);
  return validateRomaniaCatalog(await response.json());
}

export function buildRomaniaRecommendations(catalog, setup, limit = 3) {
  validateRomaniaCatalog(catalog);
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

  return Object.freeze({
    solar_panel: Object.freeze(solarPanels),
    power_station: Object.freeze(powerStations),
  });
}

function validateRomaniaProduct(product) {
  if (product?.marketEligible !== true || !product?.verifiedAt) throw new Error("RO_PRODUCT_EVIDENCE_INVALID");
  let productUrl;
  if (product.merchant === "allpowers_eu") {
    const parsedUrl = new URL(product.productUrl);
    if (parsedUrl.protocol !== "https:" || parsedUrl.hostname !== PRODUCT_HOST || !/^\/products\/[a-z0-9-]+\/?$/i.test(parsedUrl.pathname)) throw new Error("RO_PRODUCT_URL_INVALID");
    productUrl = parsedUrl.toString();
    const parsedAffiliate = parseRomaniaAffiliateUrl(product.affiliateUrl);
    if (parsedAffiliate.destination !== productUrl) throw new Error("RO_AFFILIATE_DESTINATION_MISMATCH");
  } else if (product.merchant === "oxe_ro") {
    productUrl = validateOxeProductUrl("ro", product.productUrl);
    const parsedAffiliate = validateOxeDognetDeeplink("ro", product.affiliateUrl);
    if (parsedAffiliate.destination !== productUrl) throw new Error("RO_AFFILIATE_DESTINATION_MISMATCH");
  } else {
    throw new Error("RO_PRODUCT_MERCHANT_INVALID");
  }

  const specs = product.specs || {};
  if (product.category === "solar_panel") {
    if (product.merchant !== "allpowers_eu" || !(specs.powerW >= 60 && specs.powerW <= 1000)) throw new Error("RO_SOLAR_PANEL_SPECS_INVALID");
    return;
  }
  if (product.category !== "power_station" || !(specs.capacityWh > 0 && specs.powerW > 0 && specs.solarInputW > 0 && specs.dcOutputA > 0 && specs.pureSine === true)) {
    throw new Error("RO_POWER_STATION_SPECS_INVALID");
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
