import { getOxeMarket } from "../../src/oxe-affiliate.js";
import { isOxeTechnicallyCompletePowerStation, parseOxeGoogleFeed } from "../../src/oxe-feed.js";

export async function syncOxeMarket(market, previousCatalog = { products: [] }) {
  const config = getOxeMarket(market);
  const preserved = (previousCatalog.products || []).filter((product) => product.merchant === config.merchant);
  try {
    const response = await fetch(config.feedUrl, {
      redirect: "follow",
      headers: {
        "user-agent": `MyPowerSetup/1.0 (+https://mypowersetup.com/${market}/)`,
        accept: "application/xml,text/xml,application/rss+xml,text/plain;q=0.9,*/*;q=0.8",
        "accept-language": `${market};q=0.9,en;q=0.6`,
        "cache-control": "no-cache",
        referer: new URL(config.feedUrl).origin + "/",
      },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const parsed = parseOxeGoogleFeed(await response.text(), market);
    const products = parsed.filter((product) => product.category === "power_station" || product.category === "solar_panel");
    if (!products.length) throw new Error("OXE_FEED_HAS_NO_RELEVANT_PRODUCTS");
    return {
      products,
      source: {
        status: "ok",
        feedUrl: config.feedUrl,
        merchant: config.merchant,
        dognetChannel: config.chid,
        parsedProducts: parsed.length,
        relevantProducts: products.length,
        powerStations: products.filter((product) => product.category === "power_station").length,
        technicallyVerifiedPowerStations: products.filter(isOxeTechnicallyCompletePowerStation).length,
        solarPanels: products.filter((product) => product.category === "solar_panel").length,
      },
    };
  } catch (error) {
    if (!preserved.length) {
      return { products: [], source: { status: "error", feedUrl: config.feedUrl, merchant: config.merchant, error: error.message } };
    }
    return {
      products: preserved,
      source: {
        status: "stale",
        feedUrl: config.feedUrl,
        merchant: config.merchant,
        error: error.message,
        preservedProducts: preserved.length,
      },
    };
  }
}
