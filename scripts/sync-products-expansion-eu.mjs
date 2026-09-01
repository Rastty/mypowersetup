import { mkdir, readFile, writeFile } from "node:fs/promises";
import { syncAllpowersEu } from "./lib/sync-allpowers-eu.mjs";
import { syncPowerQueenEu } from "./lib/sync-powerqueen-eu.mjs";
import { syncOxeMarket } from "./lib/sync-oxe.mjs";
import { isOxeTechnicallyCompletePowerStation } from "../src/oxe-feed.js";

const targets = Object.freeze([
  Object.freeze({ path: "data/products-ro.json", market: "ro-RO", country: "Romania", oxeMarket: "ro", oxeMerchant: "oxe_ro" }),
  Object.freeze({ path: "data/products-si.json", market: "sl-SI", country: "Slovenia", oxeMarket: "si", oxeMerchant: "oxe_si" }),
]);

async function readCatalog(path, market) {
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch {
    return { generatedAt: null, market, currency: "EUR", sources: {}, products: [] };
  }
}

const previousCatalogs = await Promise.all(targets.map((target) => readCatalog(target.path, target.market)));
const preservedAllpowers = [...new Map(
  previousCatalogs
    .flatMap((catalog) => catalog.products || [])
    .filter((product) => product?.merchant === "allpowers_eu")
    .map((product) => [product.productUrl, product])
).values()];
const preservedPowerQueen = [...new Map(
  previousCatalogs
    .flatMap((catalog) => catalog.products || [])
    .filter((product) => product?.merchant === "powerqueen_eu")
    .map((product) => [product.productUrl, product])
).values()];

const syncedAllpowers = await syncAllpowersEu({ products: preservedAllpowers });
let syncedPowerQueen;
try {
  syncedPowerQueen = await syncPowerQueenEu({ products: preservedPowerQueen });
} catch (error) {
  syncedPowerQueen = { products: [], source: { status: "error", error: error.message } };
}

const catalogVerifiedAt = new Date().toISOString().slice(0, 10);
const allpowersProducts = syncedAllpowers.products
  .filter((product) =>
    (product.category === "solar_panel" && product.specs?.powerW >= 60)
    || (product.category === "power_station" && product.verifiedAt)
  )
  .map((product) => ({
    ...product,
    marketEligible: true,
    verifiedAt: product.verifiedAt || catalogVerifiedAt,
  }));
const powerQueenProducts = syncedPowerQueen.source.status === "ok"
  ? syncedPowerQueen.products.map((product) => ({ ...product, marketEligible: true }))
  : [];
const allpowersPowerStations = allpowersProducts.filter((product) => product.category === "power_station");
const allpowersSolarPanels = allpowersProducts.filter((product) => product.category === "solar_panel");

if (!allpowersPowerStations.length) throw new Error("EXPANSION_EU_HAS_NO_VERIFIED_POWER_STATIONS");
if (!allpowersSolarPanels.length) throw new Error("EXPANSION_EU_HAS_NO_VERIFIED_SOLAR_PANELS");

await mkdir("data", { recursive: true });
for (let index = 0; index < targets.length; index += 1) {
  const target = targets[index];
  const previousCatalog = previousCatalogs[index];
  const syncedOxe = await syncOxeMarket(target.oxeMarket, previousCatalog);
  const oxePowerStations = syncedOxe.products
    .filter(isOxeTechnicallyCompletePowerStation)
    .map((product) => ({ ...product, marketEligible: true }));
  const products = [...allpowersProducts, ...powerQueenProducts, ...oxePowerStations];

  const catalog = {
    generatedAt: new Date().toISOString(),
    market: target.market,
    currency: "EUR",
    private: false,
    shippingEligibility: {
      country: target.country,
      merchant: "allpowers_eu",
      merchants: ["allpowers_eu", "powerqueen_eu", target.oxeMerchant],
      eligible: true,
      verifiedAt: "2026-09-01",
      evidenceUrl: "https://iallpowers.eu/",
      powerQueenEvidenceUrl: "https://www.ipowerqueen.de/en/pages/shipping-policy",
      localMerchantEvidence: syncedOxe.source.feedUrl,
    },
    sources: {
      allpowers_eu: {
        status: syncedAllpowers.source.status,
        awinMerchantId: 38934,
        affiliateId: 3044971,
        exactProducts: allpowersProducts.length,
      },
      powerqueen_eu: {
        ...syncedPowerQueen.source,
        awinMerchantId: 97025,
        affiliateId: 3044971,
        shippingEligible: true,
        shippingEvidenceUrl: "https://www.ipowerqueen.de/en/pages/shipping-policy",
        shippingVerifiedAt: "2026-09-01",
        exactProducts: powerQueenProducts.length,
      },
      [target.oxeMerchant]: {
        ...syncedOxe.source,
        exactProducts: oxePowerStations.length,
      },
    },
    products,
  };
  await writeFile(target.path, `${JSON.stringify(catalog, null, 2)}\n`);
  console.log(`${target.market}: ${allpowersPowerStations.length} ALLPOWERS power stations + ${allpowersSolarPanels.length} solar panels + ${powerQueenProducts.length} Power Queen components + ${oxePowerStations.length} verified OXE power stations.`);
}
