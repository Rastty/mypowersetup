import { verifiedAmpulCandidateMarkets } from "../../src/ampul-market-verification.js";
import {
  AMPUL_12V_30A_DCDC,
  AMPUL_24V_2000W_INVERTER,
  buildAmpulEhubUrl,
  isExactAmpulSourceDestination,
  validateAmpulExpansionProduct,
} from "../../src/affiliate-ampul-expansion.js";

const MARKET_CODES = Object.freeze({ "pt-PT": "pt", "ro-RO": "ro", "sl-SI": "si" });
const EXPANSION_MARKETS = Object.freeze(Object.keys(MARKET_CODES));
const SOURCE_MERCHANT = "ampul_cz";
const TARGET_MERCHANT = "ampul_eu";
const MAX_SOURCE_AGE_MS = 48 * 60 * 60 * 1000;

export function verifiedAmpulProductMarkets(verification, productId) {
  // Product publication must use the SAME exact product x country proof gate
  // as the system verification queue: HTTPS, real calendar day, not future.
  // The previous local check accepted impossible dates and non-HTTPS strings.
  if (verification?.schemaVersion !== 2) return Object.freeze([]);
  return Object.freeze(verifiedAmpulCandidateMarkets(verification, productId, EXPANSION_MARKETS)
    .map((locale) => MARKET_CODES[locale]));
}

export function verifiedAmpulMarkets(verification) {
  return Object.freeze([...new Set([
    ...verifiedAmpulProductMarkets(verification, AMPUL_12V_30A_DCDC.id),
    ...verifiedAmpulProductMarkets(verification, AMPUL_24V_2000W_INVERTER.id),
  ])].sort());
}

export function verifiedAmpulProductMarketsMap(verification) {
  return Object.freeze({
    [AMPUL_12V_30A_DCDC.id]: verifiedAmpulProductMarkets(verification, AMPUL_12V_30A_DCDC.id),
    [AMPUL_24V_2000W_INVERTER.id]: verifiedAmpulProductMarkets(verification, AMPUL_24V_2000W_INVERTER.id),
  });
}

export function syncAmpulExpansion(sourceCatalog, targetMarket, verification, {
  now = Date.now(),
} = {}) {
  const market = MARKET_CODES[targetMarket];
  if (!market) throw new Error("AMPUL_EXPANSION_TARGET_MARKET_INVALID");

  const verifiedProductMarkets = verifiedAmpulProductMarketsMap(verification);
  const markets = verifiedAmpulMarkets(verification);
  const marketHasAnyVerifiedProduct = Object.values(verifiedProductMarkets).some((productMarkets) => productMarkets.includes(market));
  if (!marketHasAnyVerifiedProduct) {
    return {
      products: [],
      source: {
        status: "blocked",
        blocker: "product_market_shipping_checkout_unverified",
        verifiedMarkets: markets,
        verifiedProductMarkets,
        exactProducts: 0,
      },
    };
  }

  const generatedAt = Date.parse(sourceCatalog?.generatedAt || "");
  const sourceOk = sourceCatalog?.sources?.ampul_cz?.status === "ok";
  if (!sourceOk || !Number.isFinite(generatedAt) || now - generatedAt > MAX_SOURCE_AGE_MS || generatedAt > now + 5 * 60 * 1000) {
    return {
      products: [],
      source: {
        status: "blocked",
        blocker: "ampul_source_catalog_not_fresh",
        verifiedMarkets: markets,
        verifiedProductMarkets,
        exactProducts: 0,
      },
    };
  }

  const sourceProducts = Array.isArray(sourceCatalog?.products) ? sourceCatalog.products : [];
  const normalized = [];

  const dcDc = sourceProducts.find((product) =>
    product?.merchant === SOURCE_MERCHANT
    && String(product.id || "").endsWith(":6195")
    && isExactAmpulSourceDestination(product.productUrl, AMPUL_12V_30A_DCDC)
  );
  if (dcDc?.available === true && verifiedProductMarkets[AMPUL_12V_30A_DCDC.id].includes(market)) {
    normalized.push(normalizeDcDc(dcDc, market, verifiedProductMarkets));
  }

  const inverter = sourceProducts.find((product) =>
    product?.merchant === SOURCE_MERCHANT
    && String(product.id || "").endsWith(":5577-7392")
    && isExactAmpulSourceDestination(product.productUrl, AMPUL_24V_2000W_INVERTER)
  );
  if (inverter?.available === true && verifiedProductMarkets[AMPUL_24V_2000W_INVERTER.id].includes(market)) {
    normalized.push(normalizeInverter(inverter, market, verifiedProductMarkets));
  }

  return {
    products: normalized,
    source: {
      status: "ok",
      network: "ehub",
      campaignId: "ddb5edae",
      verifiedMarkets: markets,
      verifiedProductMarkets,
      exactProducts: normalized.length,
      sourceGeneratedAt: sourceCatalog.generatedAt,
    },
  };
}

function baseProduct(source, product, market) {
  const productUrl = new URL(product.exactPath, "https://ampul.eu").toString();
  const affiliateUrl = buildAmpulEhubUrl(productUrl);
  if (!affiliateUrl) throw new Error("AMPUL_EXPANSION_AFFILIATE_BUILD_FAILED");
  return {
    id: product.id,
    merchant: TARGET_MERCHANT,
    name: product.name,
    description: String(source.description || "").slice(0, 500),
    category: product.category,
    categoryPath: source.categoryPath || "",
    brand: source.brand || "AMPUL",
    priceCzk: Number.isFinite(source.priceCzk) ? source.priceCzk : null,
    priceCurrency: source.priceCurrency || "CZK",
    available: true,
    marketEligible: true,
    productUrl,
    affiliateUrl,
    imageUrl: source.imageUrl || null,
    verifiedAt: product.verifiedAt,
    sourceProductId: source.id,
    market,
  };
}

function normalizeDcDc(source, market, verifiedProductMarkets) {
  const normalized = {
    ...baseProduct(source, AMPUL_12V_30A_DCDC, market),
    specs: {
      voltageV: 12,
      powerW: 400,
      currentA: 30,
      chargingVoltagesV: [12],
      chargingInputVoltagesV: [12, 24],
      chargingBatteryTypes: ["lifepo4"],
      batteryType: "lifepo4",
    },
  };
  return validateAmpulExpansionProduct(normalized, { market, verifiedProductMarkets });
}

function normalizeInverter(source, market, verifiedProductMarkets) {
  const normalized = {
    ...baseProduct(source, AMPUL_24V_2000W_INVERTER, market),
    specs: {
      voltageV: 24,
      powerW: 2000,
      pureSine: true,
    },
  };
  return validateAmpulExpansionProduct(normalized, { market, verifiedProductMarkets });
}
