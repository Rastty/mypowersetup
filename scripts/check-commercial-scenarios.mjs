import { readFile } from "node:fs/promises";
import { assessMarketScenarioCoverage } from "../src/commercial-scenarios.js";

const CONFIG = [
  { market: "cs-CZ", locale: "cs", files: ["data/products.json", "data/products-ampul-cz.json"] },
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
for (const config of CONFIG) {
  const catalog = await readCatalog(config);
  reports.push(assessMarketScenarioCoverage(catalog, config.locale));
}

console.log(JSON.stringify({
  generatedAt: new Date().toISOString(),
  markets: reports.map((report) => ({
    market: report.market,
    scenarioCount: report.scenarioCount,
    purchaseReadyRatio: report.purchaseReadyRatio,
    weightedCoverage: report.weightedCoverage,
    opportunities: report.opportunities,
    scenarios: report.scenarios.map((scenario) => ({
      id: scenario.id,
      weight: scenario.weight,
      purchaseReady: scenario.purchaseReady,
      coverageRatio: scenario.coverageRatio,
      missing: scenario.missing,
      chargingMissing: scenario.chargingMissing,
      setup: scenario.setup,
    })),
  })),
}, null, 2));
