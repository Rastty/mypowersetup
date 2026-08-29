import { APPLIANCES } from "./catalog-hu.js";
import { calculateSetup } from "./engine.js";
import { recommendProducts } from "./products.js";
import { buildResultShareText } from "./share.js";
import { buildSetupUrl } from "./setup-url.js";
import { calculateBatteryCablePlan, calculateDcCablePlan } from "./wiring.js";
import { buildSystemDiagram } from "./system-diagram.js";
import { calculateChargingPlan } from "./charging.js";
import { calculateRoofFit } from "./roof.js";
import { buildInstallationPlan } from "./installation.js";
import { buildProductPackages } from "./packages.js";
import { assessRecommendationCoverage } from "./recommendation-coverage.js";
import { calculatePowerStationProfile } from "./power-station.js";
import { buildPlainLanguageVerdict } from "./verdict.js";
import { HU_UI_COPY } from "./ui-copy-hu.js";
import { HU_TRUST_COPY } from "./trust-copy-hu.js";

export function isHungarianPublishedRuntime(runtime = globalThis) {
  return runtime?.__MPS_HU_PUBLICATION__ === true;
}

const publishedRuntime = isHungarianPublishedRuntime();
const HU_ALLOWED_MERCHANTS = Object.freeze(["ampul_hu", "allpowers_eu", "powerqueen_eu", "arukereso_hu"]);

export const HU_MARKET = Object.freeze({
  locale: "hu",
  languageTag: "hu-HU",
  currency: "EUR",
  route: "/hu/",
  catalogUrl: "/data/products-hu.json",
  published: publishedRuntime,
  indexable: publishedRuntime,
  merchantLabels: Object.freeze({
    ampul_hu: "Ampul.eu",
    allpowers_eu: "ALLPOWERS EU",
    powerqueen_eu: "Power Queen EU",
    arukereso_hu: "Árukereső.hu",
  }),
  copy: HU_UI_COPY,
  trust: HU_TRUST_COPY,
});

export async function loadHungarianProductCatalog(fetchImpl = globalThis.fetch) {
  if (typeof fetchImpl !== "function") throw new TypeError("FETCH_UNAVAILABLE");
  const response = await fetchImpl(HU_MARKET.catalogUrl, { cache: "no-store" });
  if (!response?.ok) throw new Error(`HU_CATALOG_HTTP_${response?.status || "ERROR"}`);
  const payload = await response.json();
  if (payload?.market !== HU_MARKET.languageTag || payload?.currency !== HU_MARKET.currency
    || !Array.isArray(payload?.products) || typeof payload?.sources !== "object") {
    throw new Error("HU_CATALOG_INVALID");
  }
  const products = payload.products.filter((product) => HU_ALLOWED_MERCHANTS.includes(product?.merchant));
  return Object.freeze({
    generatedAt: payload.generatedAt || null,
    sources: Object.freeze({ ...payload.sources }),
    products: Object.freeze(products),
  });
}

export function buildHungarianApplicationResult(config, catalog = { products: [], sources: {}, generatedAt: null }, origin = "https://mypowersetup.com") {
  const appliances = normalizeAppliances(config?.appliances);
  const result = calculateSetup({
    locale: HU_MARKET.locale,
    appliances,
    autonomyDays: config?.autonomyDays ?? 2,
    season: config?.season ?? "summer",
    batteryType: config?.batteryType ?? "lifepo4",
    systemVoltage: config?.systemVoltage ?? "auto",
  });

  result.wiring = calculateBatteryCablePlan({
    inverterWatts: result.inverterWatts,
    systemVoltage: result.systemVoltage,
    oneWayLengthMeters: config?.inverterCableLength ?? 1.5,
  });
  result.charging = calculateChargingPlan({
    dailyWh: result.dailyWh,
    batteryAh: result.batteryAh,
    batteryType: result.batteryType,
    systemVoltage: result.systemVoltage,
    starterVoltage: config?.starterVoltage ?? 12,
    driveHoursPerDay: config?.driveHoursPerDay ?? 2,
    shoreChargeHours: config?.shoreChargeHours ?? 8,
  });
  if (result.charging?.dcDc?.enabled) {
    result.charging.dcDc.inputWiring = calculateDcCablePlan({
      currentAmps: result.charging.dcDc.estimatedInputCurrentAmps,
      voltage: result.charging.starterVoltage,
      oneWayLengthMeters: config?.dcDcInputCableLength ?? 4,
    });
  }
  result.roof = calculateRoofFit({
    solarWatts: result.solarWatts,
    availableLengthMeters: config?.roofLength ?? null,
    availableWidthMeters: config?.roofWidth ?? null,
  });

  const shareUrl = buildSetupUrl({
    appliances,
    autonomyDays: config?.autonomyDays ?? 2,
    season: config?.season ?? "summer",
    batteryType: config?.batteryType ?? "lifepo4",
    systemVoltage: config?.systemVoltage ?? "auto",
    inverterCableLength: config?.inverterCableLength ?? 1.5,
    driveHoursPerDay: config?.driveHoursPerDay ?? 2,
    starterVoltage: config?.starterVoltage ?? 12,
    dcDcInputCableLength: config?.dcDcInputCableLength ?? 4,
    shoreChargeHours: config?.shoreChargeHours ?? 8,
    roofLength: config?.roofLength ?? null,
    roofWidth: config?.roofWidth ?? null,
  }, HU_MARKET.locale, origin);

  const rankedRecommendations = recommendProducts(catalog.products || [], result, 24);
  const recommendations = Object.freeze(Object.fromEntries(
    Object.entries(rankedRecommendations).map(([category, items]) => [category, Object.freeze(items.slice(0, 3))])
  ));
  const recommendationCoverage = assessRecommendationCoverage(recommendations, result, HU_MARKET.locale);

  return Object.freeze({
    result,
    verdict: buildPlainLanguageVerdict(result, HU_MARKET.locale),
    systemDiagram: buildSystemDiagram(result, HU_MARKET.locale),
    installationPlan: Object.freeze(buildInstallationPlan(result, HU_MARKET.locale)),
    powerStationProfile: Object.freeze(calculatePowerStationProfile(result)),
    recommendations,
    recommendationCoverage,
    packages: Object.freeze(buildProductPackages(rankedRecommendations, result)),
    shareUrl,
    shareText: buildResultShareText(result, HU_MARKET.locale, shareUrl),
    catalogGeneratedAt: catalog.generatedAt || null,
    catalogSources: Object.freeze({ ...(catalog.sources || {}) }),
  });
}

export function formatHungarianPrice(price, currency = HU_MARKET.currency) {
  return Number.isFinite(price)
    ? new Intl.NumberFormat(HU_MARKET.languageTag, { style: "currency", currency: currency || HU_MARKET.currency, maximumFractionDigits: 2 }).format(price)
    : "Ár a webáruházban";
}

export function hungarianMerchantLabel(merchant) {
  return HU_MARKET.merchantLabels[merchant] || merchant;
}

function normalizeAppliances(input) {
  if (!Array.isArray(input)) throw new TypeError("HU_APPLIANCES_REQUIRED");
  const selectedById = new Map(input.map((item) => [item.id, item]));
  return APPLIANCES.map((definition) => {
    const supplied = selectedById.get(definition.id);
    if (!supplied) return { ...definition, selected: false };
    return {
      ...definition,
      ...supplied,
      name: definition.custom ? String(supplied.name || definition.name).trim() : definition.name,
      selected: supplied.selected !== false,
    };
  });
}
