import { parseShopifyProducts } from "../../src/shopify.js";

const endpoint = "https://www.ipowerqueen.de/en/products.json?limit=250";
const origin = "https://www.ipowerqueen.de/en/";
const verifiedAt = "2026-08-29";
const RETRYABLE_STATUSES = new Set([408, 425, 429, 500, 502, 503, 504]);

const VERIFIED_EXACT_PRODUCTS = Object.freeze([
  Object.freeze({
    productUrl: "https://www.ipowerqueen.de/en/products/power-queen-2000w-inverter-12v-dc-to-230v-ac-converter",
    categoryPath: "Měniče napětí",
    verifiedAt,
    description: "Power Queen 12 V DC to 230 V AC pure sine inverter; 2000 W continuous and 4000 W peak output.",
    specs: Object.freeze({ voltageV: 12, powerW: 2000, pureSine: true }),
  }),
  Object.freeze({
    productUrl: "https://www.ipowerqueen.de/en/products/power-queen-14-6v-20a-lifepo4-battery-charger-2-stage-automatic-intelligent-lifepo4-lithium-battery-charger-suitable-for-12v-12-8v-lithium-battery",
    name: "Power Queen 14.6V 20A LiFePO4 battery charger for 12V LiFePO4 battery",
    categoryPath: "Nabíječky",
    verifiedAt,
    description: "Power Queen AC to DC charger for 12.8 V LiFePO4 batteries; 14.6 V charging output at 20 A and 100-240 V AC input.",
    specs: Object.freeze({ voltageV: 12, currentA: 20, chargingVoltagesV: [12], chargingBatteryTypes: ["lifepo4"], batteryType: "lifepo4" }),
  }),
  Object.freeze({
    productUrl: "https://www.ipowerqueen.de/en/products/power-queen-14-6v-40a-lifepo4-charger-without-handle",
    name: "Power Queen 14.6V 40A LiFePO4 battery charger for 12V LiFePO4 battery",
    categoryPath: "Nabíječky",
    verifiedAt,
    description: "Power Queen AC to DC charger for 12 V LiFePO4 batteries with 14.6 V charging output at 40 A.",
    specs: Object.freeze({ voltageV: 12, currentA: 40, chargingVoltagesV: [12], chargingBatteryTypes: ["lifepo4"], batteryType: "lifepo4" }),
  }),
  Object.freeze({
    productUrl: "https://www.ipowerqueen.de/en/products/power-queen-29-2v-20-amp-lithium-lifepo4-battery-charger",
    name: "Power Queen 29.2V 20A LiFePO4 battery charger for 24V LiFePO4 battery",
    categoryPath: "Nabíječky",
    verifiedAt,
    description: "Power Queen AC to DC charger for 24 V LiFePO4 batteries with 29.2 V charging output at 20 A.",
    specs: Object.freeze({ voltageV: 24, currentA: 20, chargingVoltagesV: [24], chargingBatteryTypes: ["lifepo4"], batteryType: "lifepo4" }),
  }),
]);

export async function fetchPowerQueenPayload(fetchImpl = globalThis.fetch, {
  attempts = 3,
  timeoutMs = 12000,
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
        headers: { "user-agent": "MyPowerSetup/1.0 (+https://mypowersetup.com/)", accept: "application/json", "accept-language": "en-GB,en;q=0.9", "cache-control": "no-cache" },
      });
      if (!response.ok) {
        const error = new Error(`HTTP ${response.status}`);
        error.status = response.status;
        throw error;
      }
      return await response.json();
    } catch (error) {
      lastError = error;
      const retryable = error?.name === "AbortError" || error?.status == null || RETRYABLE_STATUSES.has(error.status);
      if (!retryable || attempt === attempts) break;
      await sleep(250 * attempt);
    } finally {
      clearTimeout(timeout);
    }
  }
  throw new Error(`POWERQUEEN_FETCH_FAILED:${lastError?.message || "unknown error"}`);
}

export async function syncPowerQueenEu(previousCatalog = { products: [] }, { fetchImpl = globalThis.fetch } = {}) {
  const preserved = (previousCatalog.products || []).filter((product) => product.merchant === "powerqueen_eu");
  try {
    const parsed = parseShopifyProducts(await fetchPowerQueenPayload(fetchImpl), "powerqueen_eu", {
      origin,
      verifiedProducts: VERIFIED_EXACT_PRODUCTS,
      productPathPrefix: "/en/products/",
    });
    const eligible = (product) => product.available !== false && !/(?:0%\s*vat|tax[- ]?(?:free|exemption)|【ua】|trolling motor|electric motor)/i.test(product.name);
    const batteries = parsed.filter((product) =>
      product.category === "battery" && eligible(product)
      && [12, 24].includes(product.specs.voltageV)
      && product.specs.capacityAh >= 50
      && product.specs.batteryType === "lifepo4"
      && /\bbms\b/i.test(`${product.name} ${product.description}`)
    );
    const controllers = parsed.filter((product) =>
      product.category === "controller" && eligible(product)
      && /\bmppt\b/i.test(product.name)
      && product.specs.currentA >= 20
    );
    const verifiedUrls = new Set(VERIFIED_EXACT_PRODUCTS.map((product) => product.productUrl));
    const inverters = parsed.filter((product) => product.category === "inverter" && eligible(product) && verifiedUrls.has(product.productUrl));
    const shoreChargers = parsed.filter((product) => product.category === "shore_charger" && eligible(product) && verifiedUrls.has(product.productUrl));
    if (batteries.length < 2) throw new Error("EU katalog neobsahuje alespoň dvě ověřitelné servisní baterie");
    if (controllers.length < 1) throw new Error("EU katalog neobsahuje ověřitelný MPPT regulátor");
    const products = [...batteries, ...controllers, ...inverters, ...shoreChargers];
    return {
      products,
      source: {
        status: "ok",
        parsedProducts: parsed.length,
        relevantProducts: products.length,
        batteries: batteries.length,
        controllers: controllers.length,
        inverters: inverters.length,
        shoreChargers: shoreChargers.length,
      },
    };
  } catch (error) {
    if (!preserved.length) throw error;
    return { products: preserved, source: { status: "stale", error: error.message, preservedProducts: preserved.length } };
  }
}