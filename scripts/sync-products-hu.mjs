import { mkdir, readFile, writeFile } from "node:fs/promises";
import { parseProductFeed } from "../src/feed.js";

const feedUrl = process.env.AMPUL_HU_FEED_URL;
const outputPath = "data/products-hu.json";
let previousCatalog = { generatedAt: null, market: "hu-HU", currency: "EUR", sources: {}, products: [] };

try {
  previousCatalog = JSON.parse(await readFile(outputPath, "utf8"));
} catch {
  // A missing first-run catalog is handled by the configured feed below.
}

if (!feedUrl) {
  console.log("HU: az Ampul feed nincs beállítva, a katalógus változatlan marad.");
  process.exit(0);
}

let nextCatalog;
try {
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
  const products = parsed
    .filter((product) => product.category !== "other")
    .map((product) => ({ ...product, description: product.description.slice(0, 500) }));
  nextCatalog = {
    generatedAt: new Date().toISOString(),
    market: "hu-HU",
    currency: "EUR",
    sources: { ampul_hu: { status: "ok", parsedProducts: parsed.length, relevantProducts: products.length } },
    products
  };
  console.log(`Ampul HU: ${products.length} releváns termék mentve ${parsed.length} tételből.`);
} catch (error) {
  if (!previousCatalog.products.length) throw error;
  nextCatalog = {
    ...previousCatalog,
    sources: { ampul_hu: { status: "stale", error: error.message, preservedProducts: previousCatalog.products.length } }
  };
}

await mkdir("data", { recursive: true });
await writeFile(outputPath, `${JSON.stringify(nextCatalog, null, 2)}\n`);