// Shared read-only catalog fetch contract for CZ buyer-intent pages.
// No UI dependency: loading this module never initializes a second guide listener.
export const LIGHTWEIGHT_CATALOG_PATH = "/data/calculator-offers-cz.json";
export const DCDC_GUIDE_CATALOG_PATH = "/data/dcdc-guide-offers-cz.json";
export const FULL_CATALOG_PATH = "/data/products.json";
const SNAPSHOT_VERSION = 1;
const MAX_APPROVED_OFFERS = 6;

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

// A distinct, reviewed DC–DC view keeps calculator SKU shape and its
// existing six-SKU client contract untouched.
export function acceptDcdcGuideSnapshot(payload) {
  return payload?.schemaVersion === SNAPSHOT_VERSION
    && payload.projection === "dc_charger"
    && typeof payload.generatedAt === "string"
    && typeof payload.sources?.vselektro?.status === "string"
    && Array.isArray(payload.products)
    && payload.products.length <= 4
    && payload.products.every(product =>
      product?.category === "dc_charger"
      && product.merchant === "vselektro"
      && typeof product.id === "string"
      && product.id.startsWith("vselektro:victron-orion-")
      && typeof product.name === "string"
      && typeof product.productUrl === "string"
      && typeof product.affiliateUrl === "string");
}

async function loadReviewedView(path, accept, fetchImpl, timeoutMs) {
  const options = () => ({
    cache: "no-store",
    redirect: "error",
    signal: AbortSignal.timeout(timeoutMs),
  });
  try {
    const response = await fetchImpl(path, options());
    if (response.ok) {
      const payload = await response.json();
      return accept(payload) ? payload : null;
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

export function loadCalculatorOffers(fetchImpl = fetch, timeoutMs = 15_000) {
  return loadReviewedView(LIGHTWEIGHT_CATALOG_PATH, acceptCalculatorOffersSnapshot, fetchImpl, timeoutMs);
}

export function loadDcdcGuideOffers(fetchImpl = fetch, timeoutMs = 15_000) {
  return loadReviewedView(DCDC_GUIDE_CATALOG_PATH, acceptDcdcGuideSnapshot, fetchImpl, timeoutMs);
}

// DC–DC gets a separate tiny reviewed view once the next existing feed sync
// has generated it. A not-yet-published 404/410 uses the old full catalog,
// rather than removing already verified purchases before first refresh.
// Unknown/mixed categories keep the full catalog. All gates are rechecked.
export async function loadGuideCatalog(roots, fetchImpl = fetch, timeoutMs = 15_000) {
  const categories = Array.from(roots || [], root => root?.dataset?.guideCategory);
  if (categories.length && categories.every(category => category === "battery" || category === "controller"))
    return loadCalculatorOffers(fetchImpl, timeoutMs);
  if (categories.length && categories.every(category => category === "dc_charger"))
    return loadDcdcGuideOffers(fetchImpl, timeoutMs);
  try {
    const response = await fetchImpl(FULL_CATALOG_PATH, {
      cache: "no-store", redirect: "error", signal: AbortSignal.timeout(timeoutMs),
    });
    return response.ok ? await response.json() : null;
  } catch {
    // A missing or failed catalog never authorizes unverified purchase links.
    return null;
  }
}
