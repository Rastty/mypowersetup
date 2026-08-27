import { mkdir, readFile, writeFile } from "node:fs/promises";
import { parseShopifyProducts } from "../src/shopify.js";

const endpoint = "https://allpowers.com.pl/products.json?limit=250";
const outputPath = "data/products-pl.json";

let previousCatalog = { generatedAt: null, sources: {}, products: [] };
try {
  previousCatalog = JSON.parse(await readFile(outputPath, "utf8"));
} catch {
  // A missing first-run catalog is handled by the live download below.
}

const verifiedCatalog = JSON.parse(await readFile("data/products-pl-verified.json", "utf8"));

let nextCatalog;
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
  const products = parsed.filter((product) =>
    product.category === "power_station" || (product.category === "solar_panel" && product.specs.powerW >= 60)
  );
  if (products.length === 0) throw new Error("katalog neobsahuje použitelné produkty");

  nextCatalog = {
    generatedAt: new Date().toISOString(),
    market: "pl-PL",
    currency: "PLN",
    sources: {
      allpowers_pl: {
        status: "ok",
        parsedProducts: parsed.length,
        relevantProducts: products.length,
        technicallyVerifiedPowerStations: products.filter((product) =>
          product.category === "power_station" && product.specs.solarInputW && product.specs.dcOutputA
        ).length
      }
    },
    products
  };
  console.log(`ALLPOWERS PL: uloženo ${products.length} relevantních produktů z ${parsed.length} položek.`);
} catch (error) {
  if (!Array.isArray(previousCatalog.products) || previousCatalog.products.length === 0) throw error;
  nextCatalog = {
    ...previousCatalog,
    sources: {
      ...previousCatalog.sources,
      allpowers_pl: {
        status: "stale",
        error: error.message,
        preservedProducts: previousCatalog.products.filter((product) => product.merchant === "allpowers_pl").length
      }
    }
  };
  console.warn(`ALLPOWERS PL: synchronizace selhala (${error.message}), zachován poslední katalog.`);
}

await mkdir("data", { recursive: true });
await writeFile(outputPath, `${JSON.stringify(nextCatalog, null, 2)}\n`);
