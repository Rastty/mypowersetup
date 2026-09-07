import { mkdir, readFile, writeFile } from "node:fs/promises";
import { syncAllpowersPt } from "./lib/sync-allpowers-pt.mjs";
import { syncPowerQueenEu } from "./lib/sync-powerqueen-eu.mjs";
import { syncXdatouEu } from "./lib/sync-xdatou-eu.mjs";
import { syncBluettiElite300Eu } from "./lib/sync-bluetti-elite300-eu.mjs";
import { syncAmpulExpansion } from "./lib/sync-ampul-expansion.mjs";

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

const xdatou = await syncXdatouEu(previousCatalog);
const bluettiElite300 = await syncBluettiElite300Eu(previousCatalog);
const ampulSource = JSON.parse(await readFile("data/products-ampul-cz.json", "utf8"));
const ampulVerification = JSON.parse(await readFile("data/ampul-expansion-market-verification.json", "utf8"));
const ampul = syncAmpulExpansion(ampulSource, "pt-PT", ampulVerification);

// Expansion markets intentionally fail closed on stale component feeds. The
// merchant is retried on the next sync rather than carrying old availability
// into a purchase-ready calculator result.
const powerQueenProducts = powerQueen.source.status === "ok"
  ? powerQueen.products.map((product) => ({ ...product, marketEligible: true }))
  : [];
const xdatouProducts = xdatou.source.status === "ok"
  ? xdatou.products.map((product) => ({ ...product, marketEligible: true }))
  : [];
const bluettiProducts = bluettiElite300.source.status === "ok"
  ? bluettiElite300.products.map((product) => ({ ...product, marketEligible: true }))
  : [];
const ampulProducts = ampul.source.status === "ok" ? ampul.products : [];

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
    xdatou: {
      ...xdatou.source,
      shippingEvidenceUrl: "https://eu.xdatou.com/pages/shipping-policy",
      shippingVerifiedAt: "2026-09-07",
    },
    ampul_eu: {
      ...ampul.source,
      affiliateApprovalConfirmed: true,
    },
    bluetti_eu: {
      ...bluettiElite300.source,
      shippingEvidenceUrl: "https://www.bluettipower.eu/pages/shipping-country",
      shippingVerifiedAt: "2026-09-07",
    },
  },
  products: [...allpowers.products, ...powerQueenProducts, ...xdatouProducts, ...ampulProducts, ...bluettiProducts],
};

await mkdir("data", { recursive: true });
await writeFile(outputPath, `${JSON.stringify(nextCatalog, null, 2)}\n`);
console.log(`PT: ${allpowers.products.length} ALLPOWERS + ${powerQueenProducts.length} Power Queen + ${xdatouProducts.length} Xdatou + ${ampulProducts.length} AMPUL + ${bluettiProducts.length} BLUETTI Elite 300 produtos seguros guardados.`);
