import { recommendProducts } from "./products.js";

const SCENARIO = Object.freeze({
  locale: "cs",
  batteryType: "lifepo4",
  systemVoltage: 12,
  batteryAh: 200,
  solarWatts: 400,
  controllerAmps: 30,
  inverterWatts: 1000,
  charging: Object.freeze({
    starterVoltage: 12,
    dcDc: Object.freeze({ suggestedCurrentAmps: 30 }),
    shore: Object.freeze({ suggestedCurrentAmps: 20 })
  })
});

function usable(product) {
  if (!product || product.available !== true) return false;
  if (/_((sk)|(pl)|(hu)|(pt)|(ro)|(si))$/i.test(String(product.merchant || ""))) return false;
  if (!Number.isFinite(Number(product.priceCzk)) || Number(product.priceCzk) <= 0) return false;
  if (!product.productUrl || !product.affiliateUrl) return false;
  if (product.merchant === "ampul_cz") {
    try {
      const url = new URL(product.productUrl);
      if (url.hostname !== "ampul.eu" || !url.pathname.startsWith("/cs/")) return false;
    } catch {
      return false;
    }
  }
  return true;
}

export function buildCzDcDcCoverage(payloads = []) {
  const sources = Array.isArray(payloads) ? payloads.filter(Boolean) : [];
  const products = sources.flatMap((payload) => Array.isArray(payload.products) ? payload.products : []).filter(usable);
  const matches = (recommendProducts(products, SCENARIO, 24)?.dc_charger || []).map(({ product, score }) => ({
    id: product.id,
    merchant: product.merchant,
    name: product.name,
    currentA: product.specs?.currentA ?? null,
    priceCzk: product.priceCzk,
    priceCurrency: product.priceCurrency || "CZK",
    productUrl: product.productUrl,
    verifiedAt: product.verifiedAt || null,
    score
  }));
  const generatedAt = sources.map((payload) => payload.updatedAt || payload.generatedAt).filter(Boolean).sort().at(-1) || null;
  return {
    schemaVersion: 1,
    generatedAt,
    market: "cs-CZ",
    status: matches.length ? "ready" : "blocked",
    requirement: { category: "dc_charger", houseVoltageV: 12, starterVoltageV: 12, batteryType: "lifepo4", minimumCurrentA: 30 },
    matchCount: matches.length,
    matches,
    blocker: matches.length ? null : "No live local CZ catalog product satisfies the 12V LiFePO4 30A DC-DC recommendation contract."
  };
}

export const CZ_DCDC_COVERAGE_SCENARIO = SCENARIO;
