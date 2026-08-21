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
for (const [merchant, url] of feeds) {
  const response = await fetch(url, { headers: { "user-agent": "MyPowerSetup/0.1 product sync" } });
  if (!response.ok) throw new Error(`${merchant}: feed vrátil HTTP ${response.status}`);
  products.push(...parseProductFeed(await response.text(), merchant));
}

const relevant = products.filter((product) => product.category !== "other");
await mkdir("data", { recursive: true });
await writeFile(
  "data/products.json",
  `${JSON.stringify({ generatedAt: new Date().toISOString(), products: relevant }, null, 2)}\n`
);

console.log(`Uloženo ${relevant.length} relevantních produktů z ${products.length} položek.`);
