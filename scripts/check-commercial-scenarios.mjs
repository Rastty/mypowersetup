import { readFile } from "node:fs/promises";
import { assessMarketScenarioCoverage, assessScenarioBaseline } from "../src/commercial-scenarios.js";

const CONFIG = [
  { market: "cs-CZ", locale: "cs", files: ["data/products.json", "data/products-ampul-cz.json"] },
  { market: "sk-SK", locale: "sk", files: ["data/products-sk.json"] },
  { market: "pl-PL", locale: "pl", files: ["data/products-pl.json"] },
  { market: "hu-HU", locale: "hu", files: ["data/products-hu.json"] },
  { market: "pt-PT", locale: "pt", files: ["data/products-pt.json"] },
  { market: "ro-RO", locale: "ro", files: ["data/products-ro.json"] },
  { market: "sl-SI", locale: "sl", files: ["data/products-si.json"] },
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
  const report = assessMarketScenarioCoverage(catalog, config.locale);
  reports.push({ report, baseline: assessScenarioBaseline(report) });
}

const blockers = reports.flatMap(({ report, baseline }) => baseline.blockers.map((blocker) => `${report.market}:${blocker}`));
console.log(JSON.stringify({
  generatedAt: new Date().toISOString(),
  baselineReady: blockers.length === 0,
  blockers,
  markets: reports.map(({ report, baseline }) => ({
    market: report.market,
    scenarioCount: report.scenarioCount,
    purchaseReadyRatio: report.purchaseReadyRatio,
    componentReadyRatio: report.componentReadyRatio,
    portableFitRatio: report.portableFitRatio,
    weightedCoverage: report.weightedCoverage,
    baselineReady: baseline.ready,
    baseline: baseline.baseline,
    opportunities: report.opportunities,
    scenarios: report.scenarios.map((scenario) => ({
      id: scenario.id,
      weight: scenario.weight,
      purchaseReady: scenario.purchaseReady,
      componentReady: scenario.componentReady,
      portableReady: scenario.portableReady,
      purchaseRoute: scenario.purchaseRoute,
      coverageRatio: scenario.coverageRatio,
      missing: scenario.missing,
      missingRequirements: scenario.missingRequirements,
      chargingMissing: scenario.chargingMissing,
      chargingMissingRequirements: scenario.chargingMissingRequirements,
      setup: scenario.setup,
    })),
  })),
}, null, 2));

if (process.argv.includes("--require-baseline") && blockers.length) process.exitCode = 1;
