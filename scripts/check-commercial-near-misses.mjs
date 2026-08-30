import { readFile } from "node:fs/promises";
import { diagnoseMarketNearMisses } from "../src/commercial-near-miss.js";

const CONFIG = [
  { market: "sk-SK", locale: "sk", files: ["data/products-sk.json"] },
  { market: "pl-PL", locale: "pl", files: ["data/products-pl.json"] },
  { market: "hu-HU", locale: "hu", files: ["data/products-hu.json"] },
];

async function readCatalog(config) {
  const payloads = await Promise.all(config.files.map(async (path) => JSON.parse(await readFile(new URL(`../${path}`, import.meta.url), "utf8"))));
  return {
    market: config.market,
    generatedAt: payloads.map((payload) => payload.generatedAt || payload.updatedAt).filter(Boolean).sort().at(-1) || null,
    sources: Object.assign({}, ...payloads.map((payload) => payload.sources || {})),
    products: payloads.flatMap((payload) => Array.isArray(payload.products) ? payload.products : []),
  };
}

const reports = [];
for (const config of CONFIG) reports.push(diagnoseMarketNearMisses(await readCatalog(config), config.locale));

const selectionMismatches = reports.flatMap((report) => report.selectionMismatches.map((item) => `${report.market}:${item}`));
console.log(JSON.stringify({
  ready: selectionMismatches.length === 0,
  selectionMismatches,
  markets: reports,
}, null, 2));

if (selectionMismatches.length) process.exitCode = 1;
