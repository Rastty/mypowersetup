import { calculatePowerStationProfile } from "./power-station.js";

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
  for (const product of catalog.products) {
    if (product.merchant !== "allpowers_eu" || product.marketEligible !== true || !product.verifiedAt) throw new Error("SI_PRODUCT_EVIDENCE_INVALID");
    const productUrl = new URL(product.productUrl);
    if (productUrl.protocol !== "https:" || productUrl.hostname !== PRODUCT_HOST || !/^\/products\/[a-z0-9-]+\/?$/i.test(productUrl.pathname)) throw new Error("SI_PRODUCT_URL_INVALID");
    const parsed = parseSloveniaAffiliateUrl(product.affiliateUrl);
    if (parsed.destination !== productUrl.toString()) throw new Error("SI_AFFILIATE_DESTINATION_MISMATCH");
    if (product.category === "power_station") {
      const specs = product.specs || {};
      if (!(specs.capacityWh > 0 && specs.powerW > 0 && specs.solarInputW > 0 && specs.dcOutputA > 0 && specs.pureSine === true)) throw new Error("SI_POWER_STATION_SPECS_INVALID");
    } else {
      throw new Error("SI_PRODUCT_CATEGORY_UNVERIFIED");
    }
  }
  return catalog;
}

export async function loadSloveniaProductCatalog(fetchImpl = globalThis.fetch) {
  const response = await fetchImpl(SI_CATALOG_URL, { cache: "no-store" });
  if (!response.ok) throw new Error(`SI_CATALOG_HTTP_${response.status}`);
  return validateSloveniaCatalog(await response.json());
}

export function buildSloveniaRecommendations(catalog, setup, limit = 3) {
  validateSloveniaCatalog(catalog);
  const profile = calculatePowerStationProfile(setup);
  if (profile.profile === "individual") return Object.freeze({ power_station: Object.freeze([]) });
  const matches = catalog.products
    .filter((product) => product.category === "power_station" && product.available !== false)
    .filter((product) => product.specs.capacityWh >= profile.capacityWh)
    .filter((product) => product.specs.powerW >= profile.acOutputWatts)
    .filter((product) => product.specs.solarInputW >= profile.solarInputWatts)
    .filter((product) => product.specs.dcOutputA >= profile.dcOutputAmpsAt12V)
    .slice(0, limit)
    .map((product) => Object.freeze({
      category: product.category,
      name: product.name,
      affiliateUrl: product.affiliateUrl,
      productUrl: product.productUrl,
      capacityWh: product.specs.capacityWh,
      powerW: product.specs.powerW,
      solarInputW: product.specs.solarInputW,
      dcOutputA: product.specs.dcOutputA,
      currency: "EUR",
      merchant: product.merchant,
    }));
  return Object.freeze({ power_station: Object.freeze(matches) });
}
