import { mkdir, writeFile } from "node:fs/promises";
import { parseProductFeed } from "../src/feed.js";
import { configureMerchantAffiliate } from "../src/products.js";

const feedUrl = process.env.PADABO_FEED_URL;
const affiliateBaseUrl = process.env.PADABO_AFFILIATE_BASE_URL;

if (!feedUrl || !affiliateBaseUrl) {
  throw new Error("Chybí PADABO_FEED_URL nebo PADABO_AFFILIATE_BASE_URL.");
}

configureMerchantAffiliate("padabo", affiliateBaseUrl);

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

if (!response.ok) throw new Error(`Padabo feed vrátil HTTP ${response.status}.`);

const parsed = parseProductFeed(await response.text(), "padabo");
if (parsed.length === 0) throw new Error("Padabo feed neobsahuje použitelné produkty.");

const products = parsed.filter((product) => product.category !== "other");
await mkdir("data", { recursive: true });
await writeFile(
  "data/products-sk.json",
  `${JSON.stringify({
    generatedAt: new Date().toISOString(),
    market: "sk-SK",
    currency: "EUR",
    sources: { padabo: { status: "ok", parsedProducts: parsed.length } },
    products
  }, null, 2)}\n`
);

console.log(`Uloženo ${products.length} relevantních produktů z ${parsed.length} položek Padabo.`);
