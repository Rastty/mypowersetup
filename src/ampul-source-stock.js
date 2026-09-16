const SOURCE_PRODUCT_IDS = Object.freeze({
  "ampul-eu-inverter-24v-2000w": "ampul_cz:5577-7392",
  "ampul-eu-dcdc-12v-30a": "ampul_cz:6195",
});

export function getAmpulSourceProductId(candidateId) {
  return SOURCE_PRODUCT_IDS[candidateId] || null;
}

export function resolveAmpulSourceStock(sourceCatalog, candidateId) {
  const sourceProductId = getAmpulSourceProductId(candidateId);
  const generatedAt = validIsoTimestamp(sourceCatalog?.generatedAt) ? sourceCatalog.generatedAt : null;
  const sourceHealthy = sourceCatalog?.sources?.ampul_cz?.status === "ok";
  const product = sourceProductId
    ? (sourceCatalog?.products || []).find(({ id }) => id === sourceProductId) || null
    : null;

  let state = "unknown";
  if (!sourceProductId) state = "unmapped";
  else if (!sourceHealthy) state = "source_unhealthy";
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

function validIsoTimestamp(value) {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}
