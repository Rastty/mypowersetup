import { readFile } from "node:fs/promises";
import { parseShopifyProducts } from "../../src/shopify.js";
import { disableStaleProducts } from "./stale-products.mjs";

const endpoint = "https://iallpowers.eu/products.json?limit=250";
const origin = "https://iallpowers.eu";

export async function syncAllpowersEu(previousCatalog = { products: [] }) {
  const preserved = (previousCatalog.products || []).filter((product) => product.merchant === "allpowers_eu");
  try {
    const verifiedCatalog = JSON.parse(await readFile(new URL("../../data/products-eu-verified.json", import.meta.url), "utf8"));
    const response = await fetch(endpoint, {
      redirect: "follow",
      headers: { "user-agent": "MyPowerSetup/1.0 (+https://mypowersetup.com/)", accept: "application/json", "accept-language": "en-GB,en;q=0.9", "cache-control": "no-cache" },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const parsed = parseShopifyProducts(await response.json(), "allpowers_eu", {
      origin,
      verifiedProducts: verifiedCatalog.products,
      allowedProductTypes: ["Portable Power Station", "Solar Panel"],
    });
    const products = parsed.filter((product) =>
      (product.category === "solar_panel" && product.specs.powerW >= 60)
      || (product.category === "power_station" && product.verifiedAt && product.specs.capacityWh
        && product.specs.powerW && product.specs.solarInputW && product.specs.dcOutputA)
    );
    if (!products.some((product) => product.category === "solar_panel")) throw new Error("EU katalog neobsahuje ověřitelné solární panely");
    return {
      products,
      source: { status: "ok", parsedProducts: parsed.length, relevantProducts: products.length, technicallyVerifiedPowerStations: products.filter((product) => product.category === "power_station").length },
    };
  } catch (error) {
    if (!preserved.length) throw error;
    return { products: disableStaleProducts(preserved), source: { status: "stale", error: error.message, preservedProducts: preserved.length } };
  }
}
