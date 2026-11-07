const SOURCE_PRODUCT_IDS = Object.freeze({
  "ampul-eu-inverter-24v-2000w": "ampul_cz:5577-7392",
  "ampul-eu-dcdc-12v-30a": "ampul_cz:6195",
});

export function getAmpulSourceProductId(candidateId) {
  return SOURCE_PRODUCT_IDS[candidateId] || null;
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
  const product = sourceProductId
    ? (sourceCatalog?.products || []).find(({ id }) => id === sourceProductId) || null
    : null;

  let state = "unknown";
  if (!sourceProductId) state = "unmapped";
  else if (!sourceStatusOk) state = "source_unhealthy";
  else if (!sourceFresh) state = "source_stale";
  else if (!product) state = "missing";
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
