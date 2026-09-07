import {
  AMPUL_12V_30A_DCDC,
  buildAmpulEhubUrl,
  createAmpulExpansionCandidate,
} from "../../src/affiliate-ampul-expansion.js";

const RO_DESTINATION = "https://ampul.eu/ro/incarcatoare/6195-incarcator-de-baterii-lifepo4-dc-dc-146v-30a-400w-ip68";

export const AMPUL_ROMANIA_DCDC_EVIDENCE = Object.freeze({
  productUrl: RO_DESTINATION,
  productEvidenceVerifiedAt: "2026-09-07",
  termsUrl: "https://ampul.eu/ro/content/3-termeni-i-condiii",
  storefrontUrl: "https://ampul.eu/ro/",
  shippingEvidenceUrl: "https://ampul.eu/en/",
  shippingEvidence: "AMPUL states that it ships to 32 European countries; Romania has a localized storefront and localized consumer terms.",
  verifiedMarkets: Object.freeze(["ro"]),
});

export function syncAmpulRomaniaDcdc(sourceCatalog = {}) {
  const source = sourceCatalog?.sources?.ampul_cz;
  const sourceProducts = Array.isArray(sourceCatalog?.products) ? sourceCatalog.products : [];
  const product6195 = sourceProducts.find((product) =>
    product?.merchant === "ampul_cz"
    && String(product.id || "").endsWith(":6195")
  );

  if (source?.status !== "ok") {
    return {
      products: [],
      source: {
        status: "blocked",
        blocker: "ampul_feed_not_fresh",
        exactProducts: 0,
        verifiedMarkets: [...AMPUL_ROMANIA_DCDC_EVIDENCE.verifiedMarkets],
      },
    };
  }

  if (!product6195 || product6195.available !== true) {
    return {
      products: [],
      source: {
        status: "unavailable",
        exactProducts: 0,
        verifiedMarkets: [...AMPUL_ROMANIA_DCDC_EVIDENCE.verifiedMarkets],
      },
    };
  }

  const specs = product6195.specs || {};
  const technicalMatch = product6195.category === "dc_charger"
    && specs.currentA === 30
    && specs.chargingVoltagesV?.includes(12)
    && specs.chargingInputVoltagesV?.includes(12)
    && specs.chargingBatteryTypes?.includes("lifepo4");

  if (!technicalMatch) {
    return {
      products: [],
      source: {
        status: "error",
        error: "AMPUL_6195_TECHNICAL_EVIDENCE_DRIFT",
        exactProducts: 0,
        verifiedMarkets: [...AMPUL_ROMANIA_DCDC_EVIDENCE.verifiedMarkets],
      },
    };
  }

  const candidate = createAmpulExpansionCandidate(AMPUL_12V_30A_DCDC, {
    destination: RO_DESTINATION,
    available: true,
    verifiedMarkets: ["ro"],
  });
  if (!candidate.recommendationEligible || !candidate.affiliateUrl) {
    return {
      products: [],
      source: {
        status: "error",
        error: "AMPUL_RO_AFFILIATE_BUILD_FAILED",
        exactProducts: 0,
        verifiedMarkets: ["ro"],
      },
    };
  }

  const normalized = {
    id: "ampul_eu:6195:ro",
    merchant: "ampul_eu",
    name: "AMPUL DC/DC LiFePO4 charger 14.6V 30A 400W IP68",
    description: "DC/DC charger for 12 V LiFePO4 service batteries; 10-36 V DC input, 14.6 V output, 30 A constant charge current and IP68 enclosure.",
    categoryPath: "Încărcătoare",
    category: "dc_charger",
    brand: "AMPUL",
    priceCzk: null,
    priceCurrency: "EUR",
    available: true,
    productUrl: candidate.destination,
    affiliateUrl: candidate.affiliateUrl,
    imageUrl: product6195.imageUrl || null,
    specs: {
      voltageV: 12,
      capacityAh: null,
      capacityWh: null,
      powerW: 400,
      currentA: 30,
      chargingVoltagesV: [12],
      chargingInputVoltagesV: [12, 24],
      chargingBatteryTypes: ["lifepo4"],
      batteryType: "lifepo4",
      pureSine: null,
      solarInputW: null,
      dcOutputA: null,
    },
    verifiedAt: "2026-09-07",
    marketEligible: true,
  };

  return {
    products: [normalized],
    source: {
      status: "ok",
      network: "ehub",
      exactProducts: 1,
      sourceCatalogGeneratedAt: sourceCatalog.generatedAt || null,
      sourceMerchant: "ampul_cz",
      verifiedMarkets: ["ro"],
      ...AMPUL_ROMANIA_DCDC_EVIDENCE,
    },
  };
}
