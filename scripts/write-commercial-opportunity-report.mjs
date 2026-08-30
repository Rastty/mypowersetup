import { readFile, writeFile } from "node:fs/promises";
import { buildCommercialOpportunityBacklog, aggregateCommercialOpportunityBacklogs } from "../src/commercial-opportunity-backlog.js";

const CONFIG = [
  { market: "cs-CZ", locale: "cs", files: ["data/products.json", "data/products-ampul-cz.json"] },
  { market: "sk-SK", locale: "sk", files: ["data/products-sk.json"] },
  { market: "pl-PL", locale: "pl", files: ["data/products-pl.json"] },
  { market: "hu-HU", locale: "hu", files: ["data/products-hu.json"] },
];

const FOCUS_MARKETS = new Set(["sk-SK", "pl-PL", "hu-HU"]);
const OUTPUT = new URL("../data/commercial-opportunity-report.json", import.meta.url);

async function readCatalog(config) {
  const payloads = await Promise.all(config.files.map(async (path) => JSON.parse(await readFile(new URL(`../${path}`, import.meta.url), "utf8"))));
  return {
    market: config.market,
    generatedAt: latestTimestamp(payloads.map((payload) => payload.generatedAt).filter(Boolean)),
    sources: Object.assign({}, ...payloads.map((payload) => payload.sources || {})),
    products: payloads.flatMap((payload) => payload.products || []),
  };
}

function latestTimestamp(values) {
  if (!values.length) return null;
  return values.map((value) => new Date(value)).filter((value) => Number.isFinite(value.getTime())).sort((a, b) => b - a)[0]?.toISOString() || null;
}

function compactRequirement(profile) {
  return {
    weight: profile.weight,
    scenarioIds: profile.scenarioIds,
    requirement: profile.requirement,
  };
}

function compactOpportunity(item) {
  return {
    category: item.category,
    label: item.label,
    priority: item.priority,
    score: item.score,
    maxPurchaseReadyGain: item.maxPurchaseReadyGain,
    primaryScenarioIds: item.primaryScenarioIds,
    secondaryScenarioIds: item.secondaryScenarioIds,
    primaryRequirements: item.primaryRequirements.map(compactRequirement),
    secondaryRequirements: item.secondaryRequirements.map(compactRequirement),
  };
}

const catalogs = [];
for (const config of CONFIG) catalogs.push(await readCatalog(config));
const markets = catalogs.map((catalog, index) => {
  const backlog = buildCommercialOpportunityBacklog(catalog, CONFIG[index].locale);
  return {
    market: backlog.market,
    generatedAt: catalog.generatedAt,
    purchaseReadyRatio: backlog.purchaseReadyRatio,
    weightedCoverage: backlog.weightedCoverage,
    topOpportunity: backlog.opportunities[0] ? compactOpportunity(backlog.opportunities[0]) : null,
    opportunities: backlog.opportunities.map(compactOpportunity),
  };
});

const allBacklogs = CONFIG.map((config, index) => buildCommercialOpportunityBacklog(catalogs[index], config.locale));
const focusBacklogs = allBacklogs.filter((backlog) => FOCUS_MARKETS.has(backlog.market));
const generatedAt = latestTimestamp(catalogs.map((catalog) => catalog.generatedAt).filter(Boolean));

const report = {
  schemaVersion: 1,
  generatedAt,
  focusMarkets: [...FOCUS_MARKETS],
  focusPortfolio: aggregateCommercialOpportunityBacklogs(focusBacklogs),
  portfolio: aggregateCommercialOpportunityBacklogs(allBacklogs),
  markets,
};

await writeFile(OUTPUT, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(`Wrote ${OUTPUT.pathname}`);
