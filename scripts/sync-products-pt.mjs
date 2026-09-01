import { mkdir, readFile, writeFile } from "node:fs/promises";
import { syncAllpowersPt } from "./lib/sync-allpowers-pt.mjs";
import { syncPowerQueenEu } from "./lib/sync-powerqueen-eu.mjs";

const outputPath = "data/products-pt.json";
const verifiedPath = "data/products-pt-verified.json";
let previousCatalog = { generatedAt: null, market: "pt-PT", currency: "EUR", sources: {}, products: [] };
let verifiedProducts = [];

try {
  previousCatalog = JSON.parse(await readFile(outputPath, "utf8"));
} catch {
  // First run starts empty and remains fail-closed if a source is unavailable.
}

try {
  const verifiedCatalog = JSON.parse(await readFile(verifiedPath, "utf8"));
  verifiedProducts = Array.isArray(verifiedCatalog?.products) ? verifiedCatalog.products : [];
} catch {
  // Without explicit electrical evidence, ALLPOWERS power stations remain excluded.
}

let allpowers;
try {
  allpowers = await syncAllpowersPt(previousCatalog, { verifiedProducts });
} catch (error) {
  allpowers = {
    products: previousCatalog.products.filter((product) => product?.merchant === "allpowers_pt"),
    source: { status: "error", error: error.message },
  };
}

let powerQueen;
try {
  powerQueen = await syncPowerQueenEu(previousCatalog);
} catch (error) {
  powerQueen = { products: [], source: { status: "error", error: error.message } };
}

// Expansion markets intentionally fail closed on stale component feeds. The
// merchant is retried on the next sync rather than carrying old availability
// into a purchase-ready calculator result.
const powerQueenProducts = powerQueen.source.status === "ok"
  ? powerQueen.products.map((product) => ({ ...product, marketEligible: true }))
  : [];

const nextCatalog = {
  generatedAt: new Date().toISOString(),
  market: "pt-PT",
  currency: "EUR",
  private: false,
  sources: {
    allpowers_pt: allpowers.source,
    powerqueen_eu: {
      ...powerQueen.source,
      awinMerchantId: 97025,
      affiliateId: 3044971,
      shippingEligible: true,
      shippingEvidenceUrl: "https://www.ipowerqueen.de/en/pages/shipping-policy",
      shippingVerifiedAt: "2026-09-01",
    },
  },
  products: [...allpowers.products, ...powerQueenProducts],
};

await mkdir("data", { recursive: true });
await writeFile(outputPath, `${JSON.stringify(nextCatalog, null, 2)}\n`);
console.log(`PT: ${allpowers.products.length} ALLPOWERS + ${powerQueenProducts.length} Power Queen produtos seguros guardados.`);
