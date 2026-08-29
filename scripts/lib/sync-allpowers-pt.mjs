import { parseAllpowersPtProducts } from "../../src/products-pt.js";

const endpoint = "https://allpowers-pt.com/products.json?limit=250";

export async function syncAllpowersPt(previousCatalog = { products: [] }, {
  fetchImpl = globalThis.fetch,
  verifiedProducts = [],
} = {}) {
  const preserved = (previousCatalog.products || []).filter((product) => product.merchant === "allpowers_pt");
  try {
    if (typeof fetchImpl !== "function") throw new Error("PT_FETCH_UNAVAILABLE");
    const response = await fetchImpl(endpoint, {
      redirect: "follow",
      headers: {
        "user-agent": "MyPowerSetup/1.0 (+https://mypowersetup.com/)",
        accept: "application/json",
        "accept-language": "pt-PT,pt;q=0.9,en;q=0.5",
        "cache-control": "no-cache",
      },
    });
    if (!response?.ok) throw new Error(`HTTP ${response?.status || "ERROR"}`);
    const products = parseAllpowersPtProducts(await response.json(), { verifiedProducts });
    if (!products.some((product) => product.category === "solar_panel")) {
      throw new Error("PT_CATALOG_HAS_NO_SAFE_SOLAR_PANELS");
    }
    return {
      products,
      source: {
        status: "ok",
        relevantProducts: products.length,
        solarPanels: products.filter((product) => product.category === "solar_panel").length,
        technicallyVerifiedPowerStations: products.filter((product) => product.category === "power_station").length,
      },
    };
  } catch (error) {
    if (!preserved.length) throw error;
    return {
      products: preserved,
      source: { status: "stale", error: error.message, preservedProducts: preserved.length },
    };
  }
}

export const ALLPOWERS_PT_CATALOG_ENDPOINT = endpoint;
