import { guideCatalogFresh, selectGuideOffers } from "./guide-verified-offers.js";
import { reviewedInverterOffers } from "./inverter-calculator-offers.js";
export {
  LIGHTWEIGHT_CATALOG_PATH, FULL_CATALOG_PATH,
  acceptCalculatorOffersSnapshot, loadCalculatorOffers,
} from "./verified-offer-catalog-fetch.js";

const SNAPSHOT_VERSION = 1;

export function projectCalculatorOffers(fullCatalog, now = Date.now()) {
  const fresh = guideCatalogFresh(fullCatalog, now);
  const approved = fresh
    ? ["battery", "controller"].flatMap(category => selectGuideOffers(fullCatalog, category, now))
    : [];
  // Incomplete upstream specs must not crash the daily catalog sync or
  // accidentally become a calculator recommendation.
  const products = approved.filter(product => product?.specs && typeof product.specs === "object")
    .map(product => ({
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


// Reuse the same independently reviewed VSelektro exact-SKU selector for
// editorial DC–DC pages. Unlike calculator offers, they only need name,
// price, merchant destination and current observation; don't ship a full
// 1.6 MB product feed to display four product links.
export function projectDcdcGuideOffers(fullCatalog, now = Date.now()) {
  const fresh = guideCatalogFresh(fullCatalog, now);
  const products = fresh ? selectGuideOffers(fullCatalog, "dc_charger", now)
    .map(product => ({
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
    })) : [];
  return {
    schemaVersion: SNAPSHOT_VERSION,
    projection: "dc_charger",
    generatedAt: typeof fullCatalog?.generatedAt === "string" ? fullCatalog.generatedAt : null,
    sources: { vselektro: { status: fresh ? "ok" : "stale" } },
    products,
  };
}

// Narrow 12/24V inverter projection. The approved exact models are checked
// against independent model/watt/voltage/path rules both here and on click.
// Price and availability are facts from this successful feed generation only.
export function projectInverterCalculatorOffers(fullCatalog, now = Date.now()) {
  const fresh = fullCatalog?.sources?.solarimport?.status === "ok";
  const products = fresh ? reviewedInverterOffers(fullCatalog, now).map(p => ({
    id: p.id, name: p.name, merchant: p.merchant, category: p.category,
    available: p.available, staleSource: p.staleSource === true,
    priceCzk: p.priceCzk, priceCurrency: p.priceCurrency,
    productUrl: p.productUrl, affiliateUrl: p.affiliateUrl,
    specs: { powerW: p.specs.powerW, voltageV: p.specs.voltageV, pureSine: p.specs.pureSine },
  })) : [];
  return {
    schemaVersion: SNAPSHOT_VERSION,
    projection: "inverter",
    generatedAt: typeof fullCatalog?.generatedAt === "string" ? fullCatalog.generatedAt : null,
    sources: { solarimport: { status: fresh ? "ok" : "stale" } },
    products,
  };
}
