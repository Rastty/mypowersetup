import {
  BLUETTI_ELITE300_CJ,
  BLUETTI_ELITE_300_EU,
  bluettiElite300ActivationReady,
  validateBluettiElite300Product,
} from "../../src/affiliate-bluetti-eu.js";

const endpoint = "https://www.bluettipower.eu/products.json?limit=250";
const handle = BLUETTI_ELITE_300_EU.exactPath.split("/").at(-1);
const RETRYABLE_STATUSES = new Set([408, 425, 429, 500, 502, 503, 504]);

export async function syncBluettiElite300Eu(previousCatalog = { products: [] }, {
  fetchImpl = globalThis.fetch,
  activation = BLUETTI_ELITE300_CJ,
  attempts = 3,
  timeoutMs = 12_000,
  sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
} = {}) {
  if (!bluettiElite300ActivationReady(activation)) {
    return {
      products: [],
      source: {
        status: "blocked",
        blocker: "exact_cj_eu_deeplink_unverified",
        exactProducts: 0,
        approvalConfirmed: activation?.approvalConfirmed === true,
      },
    };
  }

  try {
    const payload = await fetchBluettiPayload(fetchImpl, { attempts, timeoutMs, sleep });
    const product = payload.products.find((item) => item?.handle === handle);
    if (!product?.id || !product?.title) throw new Error("BLUETTI_ELITE300_EXACT_PRODUCT_MISSING");

    const variants = Array.isArray(product.variants) ? product.variants : [];
    const variant = variants.find((item) => item?.available === true) || variants[0];
    const available = variants.some((item) => item?.available === true);
    if (!variant || !available) {
      return {
        products: [],
        source: {
          status: "unavailable",
          exactProducts: 0,
          verifiedAt: BLUETTI_ELITE_300_EU.verifiedAt,
        },
      };
    }

    const price = Number(String(variant.price ?? "").replace(",", "."));
    if (!(price > 0)) throw new Error("BLUETTI_ELITE300_PRICE_INVALID");

    const normalized = {
      id: `bluetti_eu:${product.id}`,
      merchant: BLUETTI_ELITE_300_EU.merchant,
      name: BLUETTI_ELITE_300_EU.name,
      description: "BLUETTI Elite 300: 3014.4 Wh LiFePO4 portable power station with 2400 W pure-sine AC, 1200 W solar input and 12 V / 30 A RV DC output.",
      categoryPath: "Portable Power Station",
      category: BLUETTI_ELITE_300_EU.category,
      brand: BLUETTI_ELITE_300_EU.brand,
      priceCzk: price,
      priceCurrency: "EUR",
      available: true,
      productUrl: activation.finalLandingUrl,
      affiliateUrl: activation.exactAffiliateUrl,
      imageUrl: product.images?.[0]?.src || product.image?.src || null,
      specs: {
        capacityWh: BLUETTI_ELITE_300_EU.capacityWh,
        powerW: BLUETTI_ELITE_300_EU.powerW,
        pureSine: true,
        solarInputW: BLUETTI_ELITE_300_EU.solarInputW,
        dcOutputA: BLUETTI_ELITE_300_EU.dcOutputA,
        batteryType: BLUETTI_ELITE_300_EU.batteryType,
      },
      verifiedAt: activation.verifiedAt,
      marketEligible: true,
    };

    validateBluettiElite300Product(normalized, activation);

    return {
      products: [normalized],
      source: {
        status: "ok",
        network: "cj",
        exactProducts: 1,
        approvalConfirmed: true,
        approvalSource: activation.approvalSource || "owner_confirmed",
        shippingEligibleMarkets: ["pt-PT", "ro-RO"],
        unsupportedMarkets: ["sl-SI"],
        verifiedAt: activation.verifiedAt,
      },
    };
  } catch (error) {
    return {
      products: [],
      source: {
        status: "error",
        error: error?.message || String(error),
        exactProducts: 0,
        preservedProducts: (previousCatalog.products || []).filter((product) => product?.merchant === "bluetti_eu").length,
      },
    };
  }
}

export async function fetchBluettiPayload(fetchImpl = globalThis.fetch, {
  attempts = 3,
  timeoutMs = 12_000,
  sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
} = {}) {
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
  throw new Error(`BLUETTI_ELITE300_FETCH_FAILED:${lastError?.message || "unknown error"}`);
}
