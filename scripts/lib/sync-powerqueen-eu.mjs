import { parseShopifyProducts } from "../../src/shopify.js";

const endpoint = "https://www.ipowerqueen.de/en/products.json?limit=250";
const origin = "https://www.ipowerqueen.de/en/";
const verifiedAt = "2026-08-29";

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
    categoryPath: "Nabíječky",
    verifiedAt,
    description: "Power Queen AC to DC charger for 12.8 V LiFePO4 batteries; 14.6 V charging output at 20 A and 100-240 V AC input.",
    specs: Object.freeze({ voltageV: 12, currentA: 20, chargingVoltagesV: [12], chargingBatteryTypes: ["lifepo4"], batteryType: "lifepo4" }),
  }),
  Object.freeze({
    productUrl: "https://www.ipowerqueen.de/en/products/power-queen-14-6v-40a-lifepo4-charger-without-handle",
    categoryPath: "Nabíječky",
    verifiedAt,
    description: "Power Queen AC to DC charger for 12 V LiFePO4 batteries with 14.6 V charging output at 40 A.",
    specs: Object.freeze({ voltageV: 12, currentA: 40, chargingVoltagesV: [12], chargingBatteryTypes: ["lifepo4"], batteryType: "lifepo4" }),
  }),
  Object.freeze({
    productUrl: "https://www.ipowerqueen.de/en/products/power-queen-29-2v-20-amp-lithium-lifepo4-battery-charger",
    categoryPath: "Nabíječky",
    verifiedAt,
    description: "Power Queen AC to DC charger for 24 V LiFePO4 batteries with 29.2 V charging output at 20 A.",
    specs: Object.freeze({ voltageV: 24, currentA: 20, chargingVoltagesV: [24], chargingBatteryTypes: ["lifepo4"], batteryType: "lifepo4" }),
  }),
]);

export async function syncPowerQueenEu(previousCatalog = { products: [] }) {
  const preserved = (previousCatalog.products || []).filter((product) => product.merchant === "powerqueen_eu");
  try {
    const response = await fetch(endpoint, {
      redirect: "follow",
      headers: { "user-agent": "MyPowerSetup/1.0 (+https://mypowersetup.com/)", accept: "application/json", "accept-language": "en-GB,en;q=0.9", "cache-control": "no-cache" },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const parsed = parseShopifyProducts(await response.json(), "powerqueen_eu", {
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
