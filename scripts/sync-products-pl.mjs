import { mkdir, readFile, writeFile } from "node:fs/promises";
import { parseProductFeed } from "../src/feed.js";
import { parseShopifyProducts } from "../src/shopify.js";
import { syncPowerQueenEu } from "./lib/sync-powerqueen-eu.mjs";
import { syncPadaboMarket } from "./lib/sync-padabo.mjs";
import { syncOxeMarket } from "./lib/sync-oxe.mjs";

const endpoint = "https://allpowers.com.pl/products.json?limit=250";
const outputPath = "data/products-pl.json";

let previousCatalog = { generatedAt: null, sources: {}, products: [] };
try {
  previousCatalog = JSON.parse(await readFile(outputPath, "utf8"));
} catch {
  // A missing first-run catalog is handled by the live downloads below.
}

const verifiedCatalog = JSON.parse(await readFile("data/products-pl-verified.json", "utf8"));
const products = [];
const sources = {};
const padabo = await syncPadaboMarket("pl", previousCatalog, { feedUrl: process.env.PADABO_PL_FEED_URL });
products.push(...padabo.products);
sources.padabo_pl = padabo.source;
const powerqueen = await syncPowerQueenEu(previousCatalog);
products.push(...powerqueen.products);
sources.powerqueen_eu = powerqueen.source;
const oxe = await syncOxeMarket("pl", previousCatalog);
products.push(...oxe.products);
sources.oxe_pl = oxe.source;

try {
  const response = await fetch(endpoint, {
    redirect: "follow",
    headers: {
      "user-agent": "MyPowerSetup/1.0 (+https://mypowersetup.com/pl/)",
      "accept": "application/json",
      "accept-language": "pl-PL,pl;q=0.9,en;q=0.6",
      "cache-control": "no-cache"
    }
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);

  const parsed = parseShopifyProducts(await response.json(), "allpowers_pl", {
    origin: "https://allpowers.com.pl",
    verifiedProducts: verifiedCatalog.products,
    allowedProductTypes: ["Portable Power Station", "Solar Panel"]
  });
  const relevant = parsed.filter((product) =>
    product.category === "power_station" || (product.category === "solar_panel" && product.specs.powerW >= 60)
  );
  if (relevant.length === 0) throw new Error("katalog neobsahuje použitelné produkty");
  products.push(...relevant);
  sources.allpowers_pl = {
    status: "ok",
    parsedProducts: parsed.length,
    relevantProducts: relevant.length,
    technicallyVerifiedPowerStations: relevant.filter((product) =>
      product.category === "power_station" && product.specs.solarInputW && product.specs.dcOutputA
    ).length
  };
  console.log(`ALLPOWERS PL: uloženo ${relevant.length} relevantních produktů z ${parsed.length} položek.`);
} catch (error) {
  const preserved = previousCatalog.products.filter((product) => product.merchant === "allpowers_pl");
  if (preserved.length === 0) throw error;
  products.push(...preserved);
  sources.allpowers_pl = { status: "stale", error: error.message, preservedProducts: preserved.length };
  console.warn(`ALLPOWERS PL: synchronizace selhala (${error.message}), zachován poslední katalog.`);
}

const ampulFeedUrl = process.env.AMPUL_PL_FEED_URL;
const preservedAmpul = previousCatalog.products.filter((product) => product.merchant === "ampul_pl");
if (!ampulFeedUrl) {
  products.push(...preservedAmpul);
  sources.ampul_pl = preservedAmpul.length
    ? { status: "stale", error: "feed URL není nakonfigurována", preservedProducts: preservedAmpul.length }
    : { status: "disabled", error: "feed URL není nakonfigurována" };
} else {
  try {
    const response = await fetch(ampulFeedUrl, {
      redirect: "follow",
      headers: {
        "user-agent": "MyPowerSetup/1.0 (+https://mypowersetup.com/pl/)",
        "accept": "application/xml,text/xml,application/rss+xml,text/plain;q=0.9,*/*;q=0.8",
        "accept-language": "pl-PL,pl;q=0.9,en;q=0.6",
        "cache-control": "no-cache",
        "referer": new URL(ampulFeedUrl).origin + "/"
      }
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const parsed = parseProductFeed(await response.text(), "ampul_pl");
    const relevant = parsed.filter((product) => product.category !== "other");
    products.push(...relevant);
    sources.ampul_pl = { status: "ok", parsedProducts: parsed.length, relevantProducts: relevant.length };
    console.log(`Ampul PL: uloženo ${relevant.length} relevantních produktů z ${parsed.length} položek.`);
  } catch (error) {
    products.push(...preservedAmpul);
    sources.ampul_pl = preservedAmpul.length
      ? { status: "stale", error: error.message, preservedProducts: preservedAmpul.length }
      : { status: "error", error: error.message };
  }
}

await mkdir("data", { recursive: true });
await writeFile(outputPath, `${JSON.stringify({
  generatedAt: new Date().toISOString(),
  market: "pl-PL",
  currency: "mixed",
  sources,
  products: products.map((product) => ({ ...product, description: product.description.slice(0, 500) }))
}, null, 2)}\n`);
