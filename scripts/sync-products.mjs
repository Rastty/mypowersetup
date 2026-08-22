import { mkdir, readFile, writeFile } from "node:fs/promises";
import { parseProductFeed } from "../src/feed.js";

const feeds = [
  ["reslshop", process.env.RESLSHOP_FEED_URL],
  ["svetkaravanu", process.env.SVETKARAVANU_FEED_URL]
];

const missing = feeds.filter(([, url]) => !url).map(([merchant]) => merchant);
if (missing.length) {
  throw new Error(`Chybí URL feedu pro: ${missing.join(", ")}`);
}

let previousProducts = [];
try {
  const previousCatalog = JSON.parse(await readFile("data/products.json", "utf8"));
  if (Array.isArray(previousCatalog.products)) previousProducts = previousCatalog.products;
} catch {
  // A missing first-run catalog is fine. A feed still has to succeed below.
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
    const preserved = previousProducts.filter((product) => product.merchant === merchant);
    if (preserved.length > 0) {
      products.push(...preserved);
      sources[merchant] = {
        status: "stale",
        error: error.message,
        preservedProducts: preserved.length
      };
      console.warn(
        `${merchant}: synchronizace selhala (${error.message}), zachováno ${preserved.length} posledních produktů.`
      );
    } else {
      sources[merchant] = { status: "error", error: error.message };
      console.error(`${merchant}: synchronizace selhala (${error.message}).`);
    }
  }
}

const relevant = products.filter((product) => product.category !== "other");
const catalogProducts = relevant.map((product) => ({
  ...product,
  // The extracted specs drive matching. Keeping only a short source excerpt makes
  // the public catalog substantially smaller while preserving useful context.
  description: product.description.slice(0, 500)
}));
if (products.length === 0) {
  throw new Error("Nepodařilo se načíst žádný produktový feed.");
}
await mkdir("data", { recursive: true });
await writeFile(
  "data/products.json",
  `${JSON.stringify({ generatedAt: new Date().toISOString(), sources, products: catalogProducts })}\n`
);

console.log(`Uloženo ${catalogProducts.length} relevantních produktů z ${products.length} načtených položek.`);
