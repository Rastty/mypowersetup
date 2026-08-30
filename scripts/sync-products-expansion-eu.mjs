import { mkdir, readFile, writeFile } from "node:fs/promises";
import { syncAllpowersEu } from "./lib/sync-allpowers-eu.mjs";

const targets = Object.freeze([
  Object.freeze({ path: "data/products-ro.json", market: "ro-RO", country: "Romania" }),
  Object.freeze({ path: "data/products-si.json", market: "sl-SI", country: "Slovenia" }),
]);

async function readCatalog(path, market) {
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch {
    return { generatedAt: null, market, currency: "EUR", sources: {}, products: [] };
  }
}

const previousCatalogs = await Promise.all(targets.map((target) => readCatalog(target.path, target.market)));
const preservedProducts = [...new Map(
  previousCatalogs
    .flatMap((catalog) => catalog.products || [])
    .filter((product) => product?.merchant === "allpowers_eu")
    .map((product) => [product.productUrl, product])
).values()];

const synced = await syncAllpowersEu({ products: preservedProducts });
const powerStations = synced.products
  .filter((product) => product.category === "power_station" && product.verifiedAt)
  .map((product) => ({ ...product, marketEligible: true }));

if (!powerStations.length) throw new Error("EXPANSION_EU_HAS_NO_VERIFIED_POWER_STATIONS");

await mkdir("data", { recursive: true });
for (const target of targets) {
  const catalog = {
    generatedAt: new Date().toISOString(),
    market: target.market,
    currency: "EUR",
    private: false,
    shippingEligibility: {
      country: target.country,
      merchant: "allpowers_eu",
      eligible: true,
      verifiedAt: "2026-08-30",
      evidenceUrl: "https://iallpowers.eu/",
    },
    sources: {
      allpowers_eu: {
        status: synced.source.status,
        awinMerchantId: 38934,
        affiliateId: 3044971,
        exactProducts: powerStations.length,
      },
    },
    products: powerStations,
  };
  await writeFile(target.path, `${JSON.stringify(catalog, null, 2)}\n`);
  console.log(`${target.market}: ${powerStations.length} verified ALLPOWERS EU power stations (${synced.source.status}).`);
}
