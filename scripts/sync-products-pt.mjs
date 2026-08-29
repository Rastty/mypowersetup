import { mkdir, readFile, writeFile } from "node:fs/promises";
import { syncAllpowersPt } from "./lib/sync-allpowers-pt.mjs";

const outputPath = "data/products-pt.json";
let previousCatalog = { generatedAt: null, market: "pt-PT", currency: "EUR", sources: {}, products: [] };

try {
  previousCatalog = JSON.parse(await readFile(outputPath, "utf8"));
} catch {
  // First run starts empty and remains fail-closed if the source is unavailable.
}

let allpowers;
try {
  allpowers = await syncAllpowersPt(previousCatalog);
} catch (error) {
  allpowers = {
    products: previousCatalog.products.filter((product) => product?.merchant === "allpowers_pt"),
    source: { status: "error", error: error.message },
  };
}

const nextCatalog = {
  generatedAt: new Date().toISOString(),
  market: "pt-PT",
  currency: "EUR",
  private: true,
  sources: { allpowers_pt: allpowers.source },
  products: allpowers.products,
};

await mkdir("data", { recursive: true });
await writeFile(outputPath, `${JSON.stringify(nextCatalog, null, 2)}\n`);
console.log(`ALLPOWERS PT: ${allpowers.products.length} produtos seguros guardados (${allpowers.source.status}).`);
