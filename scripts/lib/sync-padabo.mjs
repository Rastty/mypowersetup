import { parseProductFeed } from "../../src/feed.js";

const CONFIG = Object.freeze({
  sk: Object.freeze({ merchant: "padabo_sk", language: "sk-SK,sk;q=0.9,cs;q=0.7,en;q=0.5" }),
  pl: Object.freeze({ merchant: "padabo_pl", language: "pl-PL,pl;q=0.9,en;q=0.6" }),
  hu: Object.freeze({ merchant: "padabo_hu", language: "hu-HU,hu;q=0.9,en;q=0.6" }),
});

export async function syncPadaboMarket(market, previousCatalog = { products: [] }, {
  feedUrl,
  fetchImpl = globalThis.fetch,
} = {}) {
  const config = CONFIG[market];
  if (!config) throw new Error(`PADABO_MARKET_UNSUPPORTED:${market}`);
  const preserved = (previousCatalog.products || []).filter((product) => product.merchant === config.merchant);
  if (!feedUrl) {
    return {
      products: preserved,
      source: preserved.length
        ? { status: "stale", error: "feed URL není nakonfigurována", preservedProducts: preserved.length }
        : { status: "disabled", error: "feed URL není nakonfigurována" },
    };
  }

  try {
    const url = new URL(feedUrl);
    if (url.protocol !== "https:") throw new Error("feed URL musí používat HTTPS");
    const response = await fetchImpl(url, {
      redirect: "follow",
      headers: {
        "user-agent": "MyPowerSetup/1.0 (+https://mypowersetup.com/)",
        accept: "application/xml,text/xml,application/rss+xml,text/plain;q=0.9,*/*;q=0.8",
        "accept-language": config.language,
        "cache-control": "no-cache",
        referer: `${url.origin}/`,
      },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const parsed = parseProductFeed(await response.text(), config.merchant);
    const products = parsed
      .filter((product) => product.category !== "other")
      .map((product) => ({ ...product, description: product.description.slice(0, 500) }));
    if (!products.length) throw new Error("feed neobsahuje použitelné produkty");
    return { products, source: { status: "ok", parsedProducts: parsed.length, relevantProducts: products.length } };
  } catch (error) {
    return {
      products: preserved,
      source: preserved.length
        ? { status: "stale", error: error.message, preservedProducts: preserved.length }
        : { status: "error", error: error.message },
    };
  }
}
