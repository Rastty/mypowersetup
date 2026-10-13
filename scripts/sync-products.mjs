import { mkdir, readFile, writeFile } from "node:fs/promises";
import { parseProductFeed } from "../src/feed.js";
import { parseVselektroVerifiedFeed } from "../src/vselektro-feed.js";
import { syncPowerQueenEu } from "./lib/sync-powerqueen-eu.mjs";

const feeds = [
  ["reslshop", process.env.RESLSHOP_FEED_URL, true],
  ["svetkaravanu", process.env.SVETKARAVANU_FEED_URL, true],
  ["solarimport", process.env.SOLAR_IMPORT_FEED_URL, false],
  ["batterycz", process.env.BATTERY_CZ_FEED_URL, false],
  // Approved VSelektro: no public recommendation eligibility until a live
  // merchant feed provides price, availability and current product metadata.
  ["vselektro", process.env.VSELEKTRO_FEED_URL, false]
];

const missing = feeds.filter(([, url, required]) => required && !url).map(([merchant]) => merchant);
if (missing.length) {
  throw new Error(`Chybí URL feedu pro: ${missing.join(", ")}`);
}

let previousCatalog = { generatedAt: null, sources: {}, products: [] };
try {
  const loaded = JSON.parse(await readFile("data/products.json", "utf8"));
  if (Array.isArray(loaded.products)) previousCatalog = loaded;
} catch {
  // A missing first-run catalog is fine. A feed still has to succeed below.
}
const previousProducts = previousCatalog.products || [];

const products = [];
const sources = {};

// Power Queen EU is an approved EU affiliate source already used by SK/PL/HU.
// Reuse the same fail-closed live sync for CZ instead of duplicating product
// metadata or creating a Czech-only parser. The helper preserves stale items
// as unavailable diagnostics if the live source fails.
const powerqueen = await syncPowerQueenEu(previousCatalog);
products.push(...powerqueen.products);
sources.powerqueen_eu = powerqueen.source;

for (const [merchant, url] of feeds) {
  if (!url) {
    const preserved = disablePreservedProducts(previousProducts, merchant);
    if (preserved.length > 0) products.push(...preserved);
    sources[merchant] = preserved.length > 0
      ? { status: "stale", error: "feed URL není nakonfigurována", preservedProducts: preserved.length, recommendationsDisabled: true }
      : { status: "disabled", error: "feed URL není nakonfigurována" };
    continue;
  }
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

    const xml = await response.text();
    const parsed = merchant === "vselektro"
      ? parseVselektroVerifiedFeed(xml)
      : parseProductFeed(xml, merchant);
    if (parsed.length === 0) throw new Error("feed neobsahuje použitelné produkty");
    products.push(...parsed);
    sources[merchant] = { status: "ok", parsedProducts: parsed.length };
    console.log(`${merchant}: načteno ${parsed.length} produktů.`);
  } catch (error) {
    // A feed URL may carry a bearer key. Never put that URL or a raw fetch
    // exception into tracked source diagnostics, CI logs or public JSON.
    const safeMessage = merchant === "vselektro"
      ? "VSelektro feed nedostupný nebo bez aktuálně ověřených kompatibilních produktů"
      : error.message;
    const preserved = disablePreservedProducts(previousProducts, merchant);
    if (preserved.length > 0) {
      products.push(...preserved);
      sources[merchant] = {
        status: "stale",
        error: safeMessage,
        preservedProducts: preserved.length,
        recommendationsDisabled: true
      };
      console.warn(`${merchant}: synchronizace selhala (${safeMessage}), ${preserved.length} posledních produktů zachováno jen jako diagnostická data a vyřazeno z doporučení.`);
    } else {
      sources[merchant] = { status: "error", error: safeMessage };
      console.error(`${merchant}: synchronizace selhala (${safeMessage}).`);
    }
  }
}

const relevant = products.filter((product) => product.category !== "other");
const catalogProducts = relevant.map((product) => ({
  ...product,
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

function disablePreservedProducts(previousProducts, merchant) {
  return previousProducts.filter((product) => product.merchant === merchant)
    .map((product) => ({ ...product, available: false, staleSource: true }));
}
