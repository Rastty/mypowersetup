import { parseShopifyProducts } from "../../src/shopify.js";

const endpoint = "https://www.ipowerqueen.de/en/products.json?limit=250";
const origin = "https://www.ipowerqueen.de/en/";

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
      allowedProductTypes: ["Batteries"],
      productPathPrefix: "/en/products/",
    });
    const products = parsed.filter((product) =>
      product.category === "battery"
      && [12, 24].includes(product.specs.voltageV)
      && product.specs.capacityAh >= 50
      && product.specs.batteryType === "lifepo4"
      && /\bbms\b/i.test(`${product.name} ${product.description}`)
      && !/(?:0%\s*vat|tax[- ]?(?:free|exemption)|【ua】|trolling motor|electric motor)/i.test(product.name)
    );
    if (products.length < 2) throw new Error("EU katalog neobsahuje alespoň dvě ověřitelné servisní baterie");
    return { products, source: { status: "ok", parsedProducts: parsed.length, relevantProducts: products.length } };
  } catch (error) {
    if (!preserved.length) throw error;
    return { products: preserved, source: { status: "stale", error: error.message, preservedProducts: preserved.length } };
  }
}
