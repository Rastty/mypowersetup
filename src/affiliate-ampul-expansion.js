export const AMPUL_EHUB = Object.freeze({
  clickHostname: "ehub.cz",
  clickPath: "/system/scripts/click.php",
  affiliateId: "f34c86c8",
  campaignId: "ddb5edae",
  merchantHostname: "ampul.eu",
  approvalConfirmed: true,
});

export const AMPUL_24V_2000W_INVERTER = Object.freeze({
  id: "ampul-eu-inverter-24v-2000w",
  category: "inverter",
  name: "AMPUL 24V DC to 230V AC pure-sine inverter (2000W maximum advertised)",
  exactPath: "/cs/stridace-a-ac-dc-menice/5577-7392-menic-napeti-z-dc-na-230v-ac-50hz-2000w",
  // AMPUL changed its category routes without changing the product IDs.
  reviewedLegacyPaths: Object.freeze([
    "/cs/menice-napeti/5577-7392-menic-napeti-z-dc-na-230v-ac-50hz-2000w",
  ]),
  systemVoltageV: 24,
  // The merchant specifies *maximum* 2000 W, not rated continuous power.
  // A max-power label cannot qualify a 1300 W+ sustained AC load.
  maxAdvertisedPowerW: 2000,
  continuousPowerW: null,
  pureSine: true,
  verifiedAt: "2026-09-07",
});

export const AMPUL_12V_30A_DCDC = Object.freeze({
  id: "ampul-eu-dcdc-12v-30a",
  category: "dc_charger",
  // The merchant title says IP68 but its technical table says IP65.
  name: "AMPUL DC/DC LiFePO4 charger 14.6V 30A 400W (IP rating unverified)",
  exactPath: "/cs/nabijecky-akumulatoru/6195-dc-dc-nabijecka-lifepo4-baterii-146v-30a-400w-ip68",
  reviewedLegacyPaths: Object.freeze([
    "/cs/nabijecky/6195-dc-dc-nabijecka-lifepo4-baterii-146v-30a-400w-ip68",
  ]),
  inputVoltagesV: Object.freeze([12, 24]),
  outputVoltageV: 14.6,
  currentA: 30,
  powerW: 400,
  batteryTypes: Object.freeze(["lifepo4"]),
  verifiedAt: "2026-09-07",
});

export const AMPUL_EXPANSION_MARKETS = Object.freeze(["pt", "ro", "si"]);

const PRODUCTS = Object.freeze([
  AMPUL_24V_2000W_INVERTER,
  AMPUL_12V_30A_DCDC,
]);

// Only a dated, explicit continuous-duty rating may drive inverter matching.
// Country checkout and SKU stock are separate gates; a generic "max 2000 W"
// product description is not continuous-power evidence.
export function verifiedAmpulInverterContinuousRating(record, { now = Date.now() } = {}) {
  const watts = record?.continuousPowerW;
  const day = record?.verifiedAt;
  if (!Number.isInteger(watts) || watts <= 0 || watts > AMPUL_24V_2000W_INVERTER.maxAdvertisedPowerW
    || typeof day !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;
  const timestamp = Date.parse(day + "T00:00:00Z");
  if (!Number.isFinite(timestamp) || new Date(timestamp).toISOString().slice(0, 10) !== day
    || timestamp > now) return null;
  try {
    const url = new URL(record.evidenceUrl);
    if (url.protocol !== "https:" || url.username || url.password || url.port) return null;
    return Object.freeze({ continuousPowerW: watts, verifiedAt: day, evidenceUrl: url.toString() });
  } catch { return null; }
}

function exactDestination(destination) {
  let url;
  try {
    url = new URL(destination);
  } catch {
    return null;
  }
  if (url.origin !== "https://" + AMPUL_EHUB.merchantHostname
    || url.username || url.password || url.search || url.hash) return null;
  const product = PRODUCTS.find((item) => item.exactPath === url.pathname
    || item.reviewedLegacyPaths.includes(url.pathname));
  if (!product) return null;
  return { product, destination: url.toString() };
}

export function isAmpulExpansionProduct(product) {
  return product?.merchant === "ampul_eu";
}

// Merchant category paths can change while reviewed SKU IDs remain stable.
// Sync may accept only these two explicitly reviewed URL variants per SKU.
export function isExactAmpulSourceDestination(destination, reviewedProduct) {
  return exactDestination(destination)?.product === reviewedProduct;
}

export function validateAmpulExpansionProduct(product, {
  market,
  verifiedProductMarkets = {},
  inverterContinuousRating = null,
} = {}) {
  if (!isAmpulExpansionProduct(product)) throw new Error("AMPUL_EXPANSION_MERCHANT_INVALID");
  const productMarkets = verifiedProductMarkets?.[product?.id] || [];
  if (!AMPUL_EXPANSION_MARKETS.includes(market) || !productMarkets.includes(market)) throw new Error("AMPUL_EXPANSION_PRODUCT_MARKET_UNVERIFIED");
  if (product.marketEligible !== true || product.available !== true || !product.verifiedAt) throw new Error("AMPUL_EXPANSION_EVIDENCE_INVALID");

  const exact = exactDestination(product.productUrl);
  if (!exact) throw new Error("AMPUL_EXPANSION_PRODUCT_URL_INVALID");
  if (!validateAmpulEhubUrl(product.affiliateUrl, product.productUrl)) throw new Error("AMPUL_EXPANSION_AFFILIATE_INVALID");

  if (product.category === "dc_charger") {
    if (exact.product !== AMPUL_12V_30A_DCDC) throw new Error("AMPUL_EXPANSION_DCDC_SKU_INVALID");
    const specs = product.specs || {};
    if (specs.currentA !== 30
      || !Array.isArray(specs.chargingVoltagesV) || !specs.chargingVoltagesV.includes(12)
      || !Array.isArray(specs.chargingInputVoltagesV) || !specs.chargingInputVoltagesV.includes(12)
      || !Array.isArray(specs.chargingBatteryTypes) || !specs.chargingBatteryTypes.includes("lifepo4")) {
      throw new Error("AMPUL_EXPANSION_DCDC_SPECS_INVALID");
    }
    return product;
  }

  if (product.category === "inverter") {
    if (exact.product !== AMPUL_24V_2000W_INVERTER) throw new Error("AMPUL_EXPANSION_INVERTER_SKU_INVALID");
    const specs = product.specs || {};
    const rating = verifiedAmpulInverterContinuousRating(inverterContinuousRating);
    if (!rating || specs.voltageV !== 24 || specs.powerW !== rating.continuousPowerW
      || specs.continuousPowerW !== rating.continuousPowerW || specs.pureSine !== true) {
      throw new Error("AMPUL_EXPANSION_INVERTER_SPECS_INVALID");
    }
    return product;
  }

  throw new Error("AMPUL_EXPANSION_CATEGORY_INVALID");
}

export function validateAmpulEhubUrl(affiliateUrl, expectedDestination) {
  let click;
  try {
    click = new URL(affiliateUrl);
  } catch {
    return false;
  }

  const exact = exactDestination(expectedDestination);
  if (!exact) return false;
  if (click.protocol !== "https:"
    || click.hostname !== AMPUL_EHUB.clickHostname
    || click.pathname !== AMPUL_EHUB.clickPath
    || click.searchParams.get("a_aid") !== AMPUL_EHUB.affiliateId
    || click.searchParams.get("a_bid") !== AMPUL_EHUB.campaignId
    || click.searchParams.get("desturl") !== exact.destination) return false;

  const keys = [...click.searchParams.keys()].sort();
  return JSON.stringify(keys) === JSON.stringify(["a_aid", "a_bid", "desturl"]);
}

export function buildAmpulEhubUrl(destination) {
  const exact = exactDestination(destination);
  if (!AMPUL_EHUB.approvalConfirmed || !exact) return null;

  const click = new URL("https://ehub.cz/system/scripts/click.php");
  click.searchParams.set("a_aid", AMPUL_EHUB.affiliateId);
  click.searchParams.set("a_bid", AMPUL_EHUB.campaignId);
  click.searchParams.set("desturl", exact.destination);
  return click.toString();
}

export function createAmpulExpansionCandidate(product, {
  destination,
  available,
  verifiedMarkets = [],
  inverterContinuousRating = null,
} = {}) {
  if (!PRODUCTS.includes(product)) throw new Error("AMPUL_PRODUCT_INVALID");
  const exact = exactDestination(destination);
  const affiliateUrl = exact?.product === product ? buildAmpulEhubUrl(destination) : null;
  const markets = AMPUL_EXPANSION_MARKETS.filter((market) => verifiedMarkets.includes(market));
  const continuousRating = product.category === "inverter"
    ? verifiedAmpulInverterContinuousRating(inverterContinuousRating) : null;

  return {
    ...product,
    merchant: "ampul_eu",
    network: "ehub",
    destination: exact?.product === product ? exact.destination : null,
    affiliateUrl,
    continuousPowerW: product.category === "inverter" ? continuousRating?.continuousPowerW ?? null : product.continuousPowerW,
    availability: available === true ? "in_stock" : available === false ? "unavailable" : "unverified",
    verifiedMarkets: Object.freeze(markets),
    recommendationEligible: Boolean(
      affiliateUrl
      && validateAmpulEhubUrl(affiliateUrl, destination)
      && available === true
      && markets.length > 0
      && (product.category !== "inverter" || continuousRating !== null)
    ),
  };
}
