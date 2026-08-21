import { mkdir, writeFile } from "node:fs/promises";
import { parseProductFeed } from "../src/feed.js";

const feeds = [
  ["reslshop", process.env.RESLSHOP_FEED_URL],
  ["svetkaravanu", process.env.SVETKARAVANU_FEED_URL]
];

const missing = feeds.filter(([, url]) => !url).map(([merchant]) => merchant);
if (missing.length) {
  throw new Error(`Chybí URL feedu pro: ${missing.join(", ")}`);
}

const products = [];
const sources = {};
for (const [merchant, url] of feeds) {
  try {
    const response = await fetch(url, {
      redirect: "follow",
      headers: {
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0 Safari/537.36",
        "accept": "application/xml,text/xml,application/rss+xml,text/plain;q=0.9,*/*;q=0.8",
        "accept-language": "cs-CZ,cs;q=0.9,en;q=0.7",
        "cache-control": "no-cache",
        "referer": new URL(url).origin + "/"
      }
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const parsed = parseProductFeed(await response.text(), merchant);
    if (parsed.length === 0) throw new Error("feed neobsahuje použitelné produkty");
    products.push(...parsed);
    sources[merchant] = { status: "ok", parsedProducts: parsed.length };
    console.log(`${merchant}: načteno ${parsed.length} produktů.`);
  } catch (error) {
    sources[merchant] = { status: "error", error: error.message };
    console.error(`${merchant}: synchronizace selhala (${error.message}).`);
  }
}

const relevant = products.filter((product) => product.category !== "other");
if (products.length === 0) {
  throw new Error("Nepodařilo se načíst žádný produktový feed.");
}
await mkdir("data", { recursive: true });
await writeFile(
  "data/products.json",
  `${JSON.stringify({ generatedAt: new Date().toISOString(), sources, products: relevant }, null, 2)}\n`
);

console.log(`Uloženo ${relevant.length} relevantních produktů z ${products.length} načtených položek.`);
