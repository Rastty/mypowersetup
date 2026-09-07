import {
  BLUETTI_ELITE300,
  BLUETTI_ELITE300_CJ,
  bluettiElite300Destination,
  validateBluettiElite300CjUrl,
  validateBluettiElite300Product,
} from "../../src/affiliate-bluetti-eu.js";

const endpoint = "https://www.bluettipower.eu/products.json?limit=250";
const RETRYABLE_STATUSES = new Set([408, 425, 429, 500, 502, 503, 504]);

export async function syncBluettiElite300Eu(previousCatalog = { products: [] }, {
  fetchImpl = globalThis.fetch,
  affiliateUrl = BLUETTI_ELITE300_CJ.affiliateUrl,
  finalLandingUrl = BLUETTI_ELITE300_CJ.finalLandingUrl,
  trackingVerifiedAt = BLUETTI_ELITE300_CJ.verifiedAt,
  approvalConfirmed = BLUETTI_ELITE300_CJ.approvalConfirmed,
  attempts = 3,
  timeoutMs = 12_000,
  sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
} = {}) {
  const trackingValid = approvalConfirmed && validateBluettiElite300CjUrl(affiliateUrl, {
    finalLandingUrl,
    verifiedAt: trackingVerifiedAt,
  });
  if (!trackingValid) {
    return {
      products: [],
      source: {
        status: "blocked",
        network: "cj",
        approvalConfirmed: true,
        blocker: "exact_cj_eu_deeplink_unverified",
        exactProducts: 0,
      },
    };
  }

  try {
    const payload = await fetchPayload(fetchImpl, { attempts, timeoutMs, sleep });
    const product = payload.products.find((item) => item?.handle === BLUETTI_ELITE300.handle);
    if (!product?.id || !product?.title) throw new Error("BLUETTI_ELITE300_EXACT_PRODUCT_MISSING");

    const variants = Array.isArray(product.variants) ? product.variants : [];
    const variant = variants.find((item) => item?.available === true) || variants[0];
    if (!variant || !variants.some((item) => item?.available === true)) {
      return {
        products: [],
        source: {
          status: "unavailable",
          network: "cj",
          approvalConfirmed: true,
          exactProducts: 0,
          trackingVerifiedAt,
        },
      };
    }

    const price = Number(String(variant.price ?? "").replace(",", "."));
    if (!(price > 0)) throw new Error("BLUETTI_ELITE300_PRICE_INVALID");

    const normalized = {
      id: `bluetti_eu:${product.id}`,
      merchant: "bluetti_eu",
      name: "BLUETTI Elite 300 Portable Power Station",
      description: "BLUETTI Elite 300; 3014.4Wh LiFePO4, 2400W pure-sine AC, 1200W solar input and 12V/30A RV DC output.",
      categoryPath: "Portable Power Station",
      category: "power_station",
      brand: "BLUETTI",
      priceCzk: price,
      priceCurrency: "EUR",
      available: true,
      productUrl: bluettiElite300Destination(),
      affiliateUrl,
      imageUrl: product.images?.[0]?.src || product.image?.src || null,
      specs: {
        capacityWh: BLUETTI_ELITE300.capacityWh,
        powerW: BLUETTI_ELITE300.continuousPowerW,
        pureSine: true,
        solarInputW: BLUETTI_ELITE300.solarInputW,
        dcOutputVoltageV: BLUETTI_ELITE300.dcOutputVoltageV,
        dcOutputA: BLUETTI_ELITE300.dcOutputA,
        batteryType: BLUETTI_ELITE300.batteryType,
      },
      verifiedAt: BLUETTI_ELITE300.verifiedAt,
      marketEligible: true,
    };

    const source = {
      status: "ok",
      network: "cj",
      approvalConfirmed: true,
      affiliateUrl,
      finalLandingUrl,
      trackingVerifiedAt,
      exactProducts: 1,
      shippingEligibleMarkets: ["pt-PT", "ro-RO"],
      verifiedAt: BLUETTI_ELITE300.verifiedAt,
    };
    validateBluettiElite300Product(normalized, source);

    return { products: [normalized], source };
  } catch (error) {
    return {
      products: [],
      source: {
        status: "error",
        network: "cj",
        approvalConfirmed: true,
        error: error?.message || String(error),
        exactProducts: 0,
        preservedProducts: (previousCatalog.products || []).filter((product) => product?.merchant === "bluetti_eu").length,
      },
    };
  }
}

async function fetchPayload(fetchImpl, { attempts, timeoutMs, sleep }) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetchImpl(endpoint, {
        redirect: "follow",
        signal: controller.signal,
        headers: {
          "user-agent": "MyPowerSetup/1.0 (+https://mypowersetup.com/)",
          accept: "application/json",
          "accept-language": "en-GB,en;q=0.9",
          "cache-control": "no-cache",
        },
      });
      if (!response.ok) {
        const error = new Error(`HTTP ${response.status}`);
        error.status = response.status;
        throw error;
      }
      const payload = await response.json();
      if (!Array.isArray(payload?.products)) throw new Error("BLUETTI_PRODUCTS_PAYLOAD_INVALID");
      return payload;
    } catch (error) {
      lastError = error;
      const retryable = error?.name === "AbortError" || error?.status == null || RETRYABLE_STATUSES.has(error.status);
      if (!retryable || attempt === attempts) break;
      await sleep(250 * attempt);
    } finally {
      clearTimeout(timeout);
    }
  }
  throw new Error(`BLUETTI_FETCH_FAILED:${lastError?.message || "unknown error"}`);
}
