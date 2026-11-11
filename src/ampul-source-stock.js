import {
  AMPUL_24V_2000W_INVERTER,
  AMPUL_12V_30A_DCDC,
} from "./affiliate-ampul-expansion.js";

// Match the feed row to the *reviewed variant*, not only to an arbitrary ID
// carrying available=true. AMPUL's feed may repeat the 12V parent title for
// 24V and higher-voltage variants, so identity comes from exact URL and specs.
const SOURCE_PRODUCTS = Object.freeze({
  [AMPUL_24V_2000W_INVERTER.id]: Object.freeze({
    id: "ampul_cz:5577-7392",
    exactUrl: "https://ampul.eu" + AMPUL_24V_2000W_INVERTER.exactPath,
    category: "inverter",
    specsMatch: (specs) => specs?.voltageV === 24
      && specs?.powerW === 2000 && specs?.pureSine === true,
  }),
  [AMPUL_12V_30A_DCDC.id]: Object.freeze({
    id: "ampul_cz:6195",
    exactUrl: "https://ampul.eu" + AMPUL_12V_30A_DCDC.exactPath,
    category: "dc_charger",
    specsMatch: (specs) => specs?.voltageV === 12
      && specs?.powerW === 400 && specs?.currentA === 30
      && specs?.chargingVoltagesV?.includes(12)
      && specs?.chargingInputVoltagesV?.includes(12)
      && specs?.chargingInputVoltagesV?.includes(24)
      && specs?.chargingBatteryTypes?.includes("lifepo4"),
  }),
});

export function getAmpulSourceProductId(candidateId) {
  return SOURCE_PRODUCTS[candidateId]?.id || null;
}

function isExactAmpulSourceProduct(product, source) {
  return Boolean(product
    && source
    && product.id === source.id
    && product.merchant === "ampul_cz"
    && product.category === source.category
    && product.productUrl === source.exactUrl
    && source.specsMatch(product.specs));
}

// Product availability is only evidence while its source snapshot is fresh.
// This matches the 72-hour commercial offer freshness window.
const MAX_STOCK_SOURCE_AGE_MS = 72 * 60 * 60 * 1000;

export function resolveAmpulSourceStock(sourceCatalog, candidateId, now = Date.now()) {
  const sourceProductId = getAmpulSourceProductId(candidateId);
  const timestamp = parseCatalogTimestamp(sourceCatalog?.generatedAt);
  const generatedAt = timestamp === null ? null : sourceCatalog.generatedAt;
  const sourceStatusOk = sourceCatalog?.sources?.ampul_cz?.status === "ok";
  const sourceFresh = timestamp !== null && Number.isFinite(now)
    && timestamp <= now && now - timestamp <= MAX_STOCK_SOURCE_AGE_MS;
  const sourceHealthy = sourceStatusOk && sourceFresh;
  const product = sourceProductId && Array.isArray(sourceCatalog?.products)
    ? sourceCatalog.products.find((row) => row?.id === sourceProductId) || null
    : null;
  const exactIdentity = isExactAmpulSourceProduct(product, SOURCE_PRODUCTS[candidateId]);

  let state = "unknown";
  if (!sourceProductId) state = "unmapped";
  else if (!sourceStatusOk) state = "source_unhealthy";
  else if (!sourceFresh) state = "source_stale";
  else if (!product) state = "missing";
  else if (!exactIdentity) state = "identity_mismatch";
  else if (product.available === true) state = "available";
  else if (product.available === false) state = "unavailable";

  return Object.freeze({
    candidateId,
    sourceProductId,
    generatedAt,
    sourceHealthy,
    found: Boolean(product),
    available: product?.available === true ? true : product?.available === false ? false : null,
    state,
    stockVerified: state === "available",
    productUrl: typeof product?.productUrl === "string" ? product.productUrl : null,
    priceCzk: Number.isFinite(product?.priceCzk) ? product.priceCzk : null,
    priceCurrency: typeof product?.priceCurrency === "string" ? product.priceCurrency : null,
  });
}

function parseCatalogTimestamp(value) {
  // The feed writer emits UTC ISO timestamps. Do not accept ambiguous dates,
  // normalized impossible dates, future snapshots or timezone-free strings.
  if (typeof value !== "string"
    || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(value)) return null;
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed) || new Date(parsed).toISOString().slice(0, 19) !== value.slice(0, 19)) return null;
  return parsed;
}
