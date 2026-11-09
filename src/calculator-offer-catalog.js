import { guideCatalogFresh, selectGuideOffers } from "./guide-verified-offers.js";

export const LIGHTWEIGHT_CATALOG_PATH = "/data/calculator-offers-cz.json";
export const FULL_CATALOG_PATH = "/data/products.json";
const SNAPSHOT_VERSION = 1;
const MAX_APPROVED_OFFERS = 6;

// Exact-SKU data are reviewed in the existing guide-verified-offers module.
// Project only the *current* eligible batteries and MPPT controllers, not a
// second affiliate allowlist, and never copy merchant feed URL credentials.
export function projectCalculatorOffers(fullCatalog, now = Date.now()) {
  const fresh = guideCatalogFresh(fullCatalog, now);
  const approved = fresh
    ? ["battery", "controller"].flatMap(category => selectGuideOffers(fullCatalog, category, now))
    : [];
  const products = approved.map(product => ({
    id: product.id,
    name: product.name,
    merchant: product.merchant,
    category: product.category,
    available: product.available,
    staleSource: product.staleSource === true,
    priceCzk: product.priceCzk,
    priceCurrency: product.priceCurrency,
    verifiedAt: product.verifiedAt,
    offerObservedAt: product.offerObservedAt,
    productUrl: product.productUrl,
    affiliateUrl: product.affiliateUrl,
    specs: {
      ...(product.category === "battery" ? {
        voltageV: product.specs.voltageV,
        batteryType: product.specs.batteryType,
        capacityAh: product.specs.capacityAh,
        bmsContinuousCurrentA: product.specs.bmsContinuousCurrentA,
      } : {
        currentA: product.specs.currentA,
        maxPvVocV: product.specs.maxPvVocV,
        maxPvIscA: product.specs.maxPvIscA,
        systemVoltagesV: product.specs.systemVoltagesV,
        maxPvWattsBySystemVoltage: product.specs.maxPvWattsBySystemVoltage,
      }),
    },
  }));
  // All freshness checks are repeated by the consuming SKU selector at the
  // actual display and click time. The snapshot never renews stale evidence.
  return {
    schemaVersion: SNAPSHOT_VERSION,
    generatedAt: typeof fullCatalog?.generatedAt === "string" ? fullCatalog.generatedAt : null,
    sources: { vselektro: { status: fresh ? "ok" : "stale" } },
    products,
  };
}

export function acceptCalculatorOffersSnapshot(payload) {
  if (payload?.schemaVersion !== SNAPSHOT_VERSION ||
      !Array.isArray(payload.products) || payload.products.length > MAX_APPROVED_OFFERS ||
      !payload.sources?.vselektro || typeof payload.generatedAt !== "string") return false;
  // A corrupt or contradictory snapshot is not a reason to download an
  // untrusted alternative catalog. Product matching still validates SKU ID,
  // affiliate destination, price, stock, physical specs and 72h source age.
  return payload.products.every(product =>
    ["battery", "controller"].includes(product?.category) &&
    typeof product?.id === "string" &&
    product.id.startsWith("vselektro:") &&
    typeof product.productUrl === "string" &&
    typeof product.affiliateUrl === "string"
  );
}

export async function loadCalculatorOffers(fetchImpl = fetch, timeoutMs = 15_000) {
  const options = () => ({
    cache: "no-store",
    redirect: "error",
    signal: AbortSignal.timeout(timeoutMs),
  });
  try {
    const response = await fetchImpl(LIGHTWEIGHT_CATALOG_PATH, options());
    if (response.ok) {
      const payload = await response.json();
      return acceptCalculatorOffersSnapshot(payload) ? payload : null;
    }
    // Transitional compatibility: until the FIRST daily feed sync publishes
    // the new small artifact, keep existing purchase paths working. All
    // safety checks continue to use the same approved SKU gate.
    if (response.status !== 404 && response.status !== 410) return null;
    const legacy = await fetchImpl(FULL_CATALOG_PATH, options());
    return legacy.ok ? await legacy.json() : null;
  } catch {
    // No trustable feed, no public price, no affiliate clickout.
    return null;
  }
}
