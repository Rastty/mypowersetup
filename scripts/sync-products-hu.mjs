import { mkdir, readFile, writeFile } from "node:fs/promises";
import { parseProductFeed } from "../src/feed.js";
import { syncAllpowersEu } from "./lib/sync-allpowers-eu.mjs";

const feedUrl = process.env.AMPUL_HU_FEED_URL;
const outputPath = "data/products-hu.json";
let previousCatalog = { generatedAt: null, market: "hu-HU", currency: "EUR", sources: {}, products: [] };

try {
  previousCatalog = JSON.parse(await readFile(outputPath, "utf8"));
} catch {
  // A missing first-run catalog is handled by the configured feed below.
}

const allpowers = await syncAllpowersEu(previousCatalog);
let ampulProducts = previousCatalog.products.filter((product) => product.merchant === "ampul_hu");
let ampulSource = previousCatalog.sources?.ampul_hu || { status: "disabled", error: "feed URL není nakonfigurována" };
try {
  if (!feedUrl) throw new Error("feed URL není nakonfigurována");
  const response = await fetch(feedUrl, {
    redirect: "follow",
    headers: {
      "user-agent": "MyPowerSetup/1.0 (+https://mypowersetup.com/)",
      "accept": "application/xml,text/xml,application/rss+xml,text/plain;q=0.9,*/*;q=0.8",
      "accept-language": "hu-HU,hu;q=0.9,en;q=0.6",
      "cache-control": "no-cache",
      "referer": new URL(feedUrl).origin + "/"
    }
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const parsed = parseProductFeed(await response.text(), "ampul_hu");
  ampulProducts = parsed
    .filter((product) => product.category !== "other")
    .map((product) => ({ ...product, description: product.description.slice(0, 500) }));
  ampulSource = { status: "ok", parsedProducts: parsed.length, relevantProducts: ampulProducts.length };
  console.log(`Ampul HU: ${ampulProducts.length} releváns termék mentve ${parsed.length} tételből.`);
} catch (error) {
  ampulSource = ampulProducts.length
    ? { status: "stale", error: error.message, preservedProducts: ampulProducts.length }
    : { status: "error", error: error.message };
}

const nextCatalog = {
  generatedAt: new Date().toISOString(),
  market: "hu-HU",
  currency: "EUR",
  sources: { ampul_hu: ampulSource, allpowers_eu: allpowers.source },
  products: [...ampulProducts, ...allpowers.products],
};

await mkdir("data", { recursive: true });
await writeFile(outputPath, `${JSON.stringify(nextCatalog, null, 2)}\n`);
