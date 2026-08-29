import { readFile } from "node:fs/promises";
import { assessPublicCommercialPortfolio } from "../src/commercial-coverage.js";

async function load(path) {
  return JSON.parse(await readFile(new URL(`../${path}`, import.meta.url), "utf8"));
}

function mergeCatalogs(market, catalogs) {
  return {
    market,
    generatedAt: catalogs.map((catalog) => catalog.generatedAt).filter(Boolean).sort().at(-1) || null,
    sources: Object.assign({}, ...catalogs.map((catalog) => catalog.sources || {})),
    products: catalogs.flatMap((catalog) => Array.isArray(catalog.products) ? catalog.products : []),
  };
}

const [czBase, czAmpul, sk, pl, hu] = await Promise.all([
  load("data/products.json"),
  load("data/products-ampul-cz.json"),
  load("data/products-sk.json"),
  load("data/products-pl.json"),
  load("data/products-hu.json"),
]);

// Mirror the deployed Czech calculator: it loads the primary Czech catalog and
// the Ampul Czech catalog together. Other public calculators each load one catalog.
const catalogs = [mergeCatalogs("cs-CZ", [czBase, czAmpul]), sk, pl, hu];
const report = assessPublicCommercialPortfolio(catalogs);

console.log(JSON.stringify({
  generatedAt: new Date().toISOString(),
  ready: report.ready,
  blockers: report.blockers,
  markets: report.markets.map((market) => ({
    market: market.market,
    coreReady: market.coreReady,
    coreCoverageRatio: market.coreCoverageRatio,
    eligibleProducts: market.eligibleProducts,
    merchants: market.merchants,
    counts: market.counts,
    breadthGaps: market.breadthGaps,
  })),
}, null, 2));

if (process.argv.includes("--require-core") && !report.ready) {
  process.exitCode = 1;
}
