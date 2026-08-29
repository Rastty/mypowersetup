import { readFile } from "node:fs/promises";
import { assessPublicCommercialPortfolio } from "../src/commercial-coverage.js";

const FILES = [
  "data/products.json",
  "data/products-sk.json",
  "data/products-pl.json",
  "data/products-hu.json",
];

const catalogs = await Promise.all(FILES.map(async (path) => JSON.parse(await readFile(new URL(`../${path}`, import.meta.url), "utf8"))));
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
