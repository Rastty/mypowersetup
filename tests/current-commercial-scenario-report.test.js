import test from "node:test";
import { readFile } from "node:fs/promises";
import { assessMarketScenarioCoverage } from "../src/commercial-scenarios.js";

const CONFIGS = [
  { market: "cs-CZ", locale: "cs", files: ["products.json", "products-ampul-cz.json"] },
  { market: "sk-SK", locale: "sk", files: ["products-sk.json"] },
  { market: "pl-PL", locale: "pl", files: ["products-pl.json"] },
  { market: "hu-HU", locale: "hu", files: ["products-hu.json"] },
];

test("print current commercial scenario report for sourcing decisions", async () => {
  for (const config of CONFIGS) {
    const payloads = await Promise.all(config.files.map(async (file) => JSON.parse(await readFile(new URL(`../data/${file}`, import.meta.url), "utf8"))));
    const catalog = {
      market: config.market,
      sources: Object.assign({}, ...payloads.map((payload) => payload.sources || {})),
      products: payloads.flatMap((payload) => payload.products || []),
    };
    const report = assessMarketScenarioCoverage(catalog, config.locale);
    console.log(`CURRENT_SCENARIO_REPORT ${JSON.stringify({ market: config.market, purchaseReadyRatio: report.purchaseReadyRatio, weightedCoverage: report.weightedCoverage, opportunities: report.opportunities })}`);
  }
});
