import {
  XDATOU_DATOUBOSS_2000W_24V,
  XDATOU_GOAFFPRO,
  buildXdatouAffiliateUrl,
  validateXdatouExpansionProduct,
} from "../../src/affiliate-xdatou.js";

const endpoint = "https://eu.xdatou.com/products.json?limit=250";
const exactDestination = new URL(XDATOU_DATOUBOSS_2000W_24V.exactPath, "https://eu.xdatou.com").toString();
const handle = XDATOU_DATOUBOSS_2000W_24V.exactPath.split("/").at(-1);
const RETRYABLE_STATUSES = new Set([408, 425, 429, 500, 502, 503, 504]);

export async function syncXdatouEu(previousCatalog = { products: [] }, {
  fetchImpl = globalThis.fetch,
  approvalConfirmed = XDATOU_GOAFFPRO.approvalConfirmed,
  referralIdentifier = XDATOU_GOAFFPRO.referralIdentifier,
  referralCode = XDATOU_GOAFFPRO.referralCode,
  attempts = 3,
  timeoutMs = 12_000,
  sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
} = {}) {
  if (!approvalConfirmed || !referralIdentifier || !referralCode) {
    return {
      products: [],
      source: {
        status: "blocked",
        blocker: "goaffpro_activation_pending",
        exactProducts: 0,
      },
    };
  }

  try {
    const payload = await fetchXdatouPayload(fetchImpl, { attempts, timeoutMs, sleep });
    const product = payload?.products?.find((item) => item?.handle === handle);
    if (!product?.id || !product?.title) throw new Error("XDATOU_EXACT_PRODUCT_MISSING");

    const variants = Array.isArray(product.variants) ? product.variants : [];
    const variant = variants.find((item) => item?.available === true) || variants[0];
    const available = variants.some((item) => item?.available === true);
    if (!variant || !available) {
      return {
        products: [],
        source: {
          status: "unavailable",
          exactProducts: 0,
          verifiedAt: XDATOU_DATOUBOSS_2000W_24V.verifiedAt,
        },
      };
    }

    const price = Number(String(variant.price ?? "").replace(",", "."));
    if (!(price > 0)) throw new Error("XDATOU_PRICE_INVALID");

    const affiliateUrl = buildXdatouAffiliateUrl(exactDestination, {
      approvalConfirmed,
      referralIdentifier,
      referralCode,
    });
    if (!affiliateUrl) throw new Error("XDATOU_AFFILIATE_BUILD_FAILED");

    const normalized = {
      id: `xdatou:${product.id}`,
      merchant: "xdatou",
      name: XDATOU_DATOUBOSS_2000W_24V.name,
      description: "DATOUBOSS 24 V DC to 230 V AC pure sine inverter; 2000 W continuous and 4000 W peak output.",
      categoryPath: "Inverter",
      category: "inverter",
      brand: XDATOU_DATOUBOSS_2000W_24V.brand,
      priceCzk: price,
      priceCurrency: "EUR",
      available: true,
      productUrl: exactDestination,
      affiliateUrl,
      imageUrl: product.images?.[0]?.src || product.image?.src || null,
      specs: {
        voltageV: XDATOU_DATOUBOSS_2000W_24V.systemVoltageV,
        powerW: XDATOU_DATOUBOSS_2000W_24V.continuousPowerW,
        pureSine: true,
      },
      verifiedAt: XDATOU_DATOUBOSS_2000W_24V.verifiedAt,
      marketEligible: true,
    };

    validateXdatouExpansionProduct(normalized, {
      approvalConfirmed,
      referralIdentifier,
      referralCode,
    });

    return {
      products: [normalized],
      source: {
        status: "ok",
        network: "goaffpro",
        exactProducts: 1,
        shippingEligibleMarkets: ["pt-PT", "ro-RO", "sl-SI"],
        verifiedAt: XDATOU_DATOUBOSS_2000W_24V.verifiedAt,
      },
    };
  } catch (error) {
    return {
      products: [],
      source: {
        status: "error",
        error: error?.message || String(error),
        exactProducts: 0,
        preservedProducts: (previousCatalog.products || []).filter((product) => product?.merchant === "xdatou").length,
      },
    };
  }
}

export async function fetchXdatouPayload(fetchImpl = globalThis.fetch, {
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
      if (!Array.isArray(payload?.products)) throw new Error("XDATOU_PRODUCTS_PAYLOAD_INVALID");
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
  throw new Error(`XDATOU_FETCH_FAILED:${lastError?.message || "unknown error"}`);
}
