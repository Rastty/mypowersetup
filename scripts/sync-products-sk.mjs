import { mkdir, readFile, writeFile } from "node:fs/promises";
import { parseProductFeed } from "../src/feed.js";
import { configureMerchantAffiliate } from "../src/products.js";
import { syncAllpowersEu } from "./lib/sync-allpowers-eu.mjs";
import { syncPowerQueenEu } from "./lib/sync-powerqueen-eu.mjs";
import { syncOxeMarket } from "./lib/sync-oxe.mjs";

const outputPath = "data/products-sk.json";
let previousCatalog = { generatedAt: null, market: "sk-SK", currency: "EUR", sources: {}, products: [] };
try {
  previousCatalog = JSON.parse(await readFile(outputPath, "utf8"));
} catch {
  // A missing first-run catalog is handled by the configured feeds below.
}

const feeds = [
  ["padabo", process.env.PADABO_FEED_URL, process.env.PADABO_AFFILIATE_BASE_URL],
  ["ampul_sk", process.env.AMPUL_SK_FEED_URL, null]
];

const products = [];
const sources = {};
const allpowers = await syncAllpowersEu(previousCatalog);
products.push(...allpowers.products);
sources.allpowers_eu = allpowers.source;
const powerqueen = await syncPowerQueenEu(previousCatalog);
products.push(...powerqueen.products);
sources.powerqueen_eu = powerqueen.source;
const oxe = await syncOxeMarket("sk", previousCatalog);
products.push(...oxe.products);
sources.oxe_sk = oxe.source;
for (const [merchant, feedUrl, affiliateBaseUrl] of feeds) {
  const preserved = previousCatalog.products.filter((product) => product.merchant === merchant);
  if (!feedUrl || (merchant === "padabo" && !affiliateBaseUrl)) {
    products.push(...preserved);
    sources[merchant] = preserved.length
      ? { status: "stale", error: "feed nebo affiliate odkaz není nakonfigurován", preservedProducts: preserved.length }
      : { status: "disabled", error: "feed nebo affiliate odkaz není nakonfigurován" };
    continue;
  }

  try {
    if (affiliateBaseUrl) configureMerchantAffiliate(merchant, affiliateBaseUrl);
    const response = await fetch(feedUrl, {
      redirect: "follow",
      headers: {
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0 Safari/537.36",
        "accept": "application/xml,text/xml,application/rss+xml,text/plain;q=0.9,*/*;q=0.8",
        "accept-language": "sk-SK,sk;q=0.9,cs;q=0.7,en;q=0.5",
        "cache-control": "no-cache",
        "referer": new URL(feedUrl).origin + "/"
      }
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const parsed = parseProductFeed(await response.text(), merchant);
    const relevant = parsed.filter((product) => product.category !== "other");
    products.push(...relevant);
    sources[merchant] = { status: "ok", parsedProducts: parsed.length, relevantProducts: relevant.length };
    console.log(`${merchant}: uloženo ${relevant.length} relevantních produktů z ${parsed.length} položek.`);
  } catch (error) {
    products.push(...preserved);
    sources[merchant] = preserved.length
      ? { status: "stale", error: error.message, preservedProducts: preserved.length }
      : { status: "error", error: error.message };
  }
}

await mkdir("data", { recursive: true });
await writeFile(outputPath, `${JSON.stringify({
  generatedAt: new Date().toISOString(),
  market: "sk-SK",
  currency: "EUR",
  sources,
  products: products.map((product) => ({ ...product, description: product.description.slice(0, 500) }))
}, null, 2)}\n`);

console.log(`SK: katalog obsahuje ${products.length} relevantních produktů.`);
