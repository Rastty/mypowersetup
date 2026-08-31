import { getOxeMarket } from "../../src/oxe-affiliate.js";
import { isOxeTechnicallyCompletePowerStation, parseOxeGoogleFeed } from "../../src/oxe-feed.js";

const LIVE_SUPPLEMENTS = Object.freeze({
  si: Object.freeze([
    Object.freeze({
      id: "S2400-live",
      name: "OXE Powerstation Newsmy S2400 - večnamenski polnilni napajalnik 2400W/2047,5Wh",
      productUrl: "https://www.oxepower.si/oxe-powerstation-newsmy-s2400-vecnamenski-polnilni-napajalnik-2400w20475wh/",
      productType: "Generatorji električne energije",
      inStockPattern: /\bNa zalogi\b/i,
      outOfStockPattern: /\bni na zalogi\b/i,
    }),
  ]),
});

export async function syncOxeMarket(market, previousCatalog = { products: [] }, fetchImpl = globalThis.fetch) {
  const config = getOxeMarket(market);
  const preserved = (previousCatalog.products || [])
    .filter((product) => product.merchant === config.merchant)
    .filter((product) => product.category !== "power_station" || isOxeTechnicallyCompletePowerStation(product));
  try {
    const response = await fetchImpl(config.feedUrl, requestOptions(config.feedUrl, market));
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const parsed = parseOxeGoogleFeed(await response.text(), market);
    const feedProducts = parsed.filter((product) => product.category === "power_station" || product.category === "solar_panel");
    if (!feedProducts.length) throw new Error("OXE_FEED_HAS_NO_RELEVANT_PRODUCTS");

    const supplements = await loadLiveSupplements(market, feedProducts, fetchImpl);
    const products = dedupeByProductUrl([...feedProducts, ...supplements]);
    return {
      products,
      source: {
        status: "ok",
        feedUrl: config.feedUrl,
        merchant: config.merchant,
        dognetChannel: config.chid,
        parsedProducts: parsed.length,
        relevantProducts: products.length,
        liveSupplements: supplements.length,
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

async function loadLiveSupplements(market, feedProducts, fetchImpl) {
  const supplements = LIVE_SUPPLEMENTS[market] || [];
  const knownUrls = new Set(feedProducts.map((product) => product.productUrl));
  const loaded = [];
  for (const supplement of supplements) {
    if (knownUrls.has(supplement.productUrl)) continue;
    try {
      const response = await fetchImpl(supplement.productUrl, requestOptions(supplement.productUrl, market));
      if (!response.ok) continue;
      const html = await response.text();
      if (!html.includes("OXE Powerstation Newsmy S2400")) continue;
      if (supplement.outOfStockPattern.test(html) || !supplement.inStockPattern.test(html)) continue;
      const [product] = parseOxeGoogleFeed(buildSupplementXml(supplement), market);
      if (product && isOxeTechnicallyCompletePowerStation(product)) loaded.push(product);
    } catch {
      // A supplement is optional. Feed-backed products remain usable if its live page cannot be verified.
    }
  }
  return loaded;
}

function buildSupplementXml(supplement) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss xmlns:g="http://base.google.com/ns/1.0"><channel><item>
  <g:id>${escapeXml(supplement.id)}</g:id>
  <g:title>${escapeXml(supplement.name)}</g:title>
  <g:link>${escapeXml(supplement.productUrl)}</g:link>
  <g:brand>OXE</g:brand>
  <g:product_type>${escapeXml(supplement.productType)}</g:product_type>
  <g:availability>in_stock</g:availability>
</item></channel></rss>`;
}

function requestOptions(url, market) {
  return {
    redirect: "follow",
    headers: {
      "user-agent": `MyPowerSetup/1.0 (+https://mypowersetup.com/${market}/)`,
      accept: "application/xml,text/xml,text/html,application/rss+xml,text/plain;q=0.9,*/*;q=0.8",
      "accept-language": `${market};q=0.9,en;q=0.6`,
      "cache-control": "no-cache",
      referer: new URL(url).origin + "/",
    },
  };
}

function dedupeByProductUrl(products) {
  return [...new Map(products.map((product) => [product.productUrl, product])).values()];
}

function escapeXml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
