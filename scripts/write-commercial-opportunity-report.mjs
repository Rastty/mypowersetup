import { readFile, writeFile } from "node:fs/promises";
import { buildCommercialOpportunityBacklog, aggregateCommercialOpportunityBacklogs } from "../src/commercial-opportunity-backlog.js";
import { COMMERCIAL_MARKET_CONFIG } from "../src/commercial-market-config.js";

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
for (const config of COMMERCIAL_MARKET_CONFIG) catalogs.push(await readCatalog(config));
const backlogs = catalogs.map((catalog, index) => buildCommercialOpportunityBacklog(catalog, COMMERCIAL_MARKET_CONFIG[index].locale));
const markets = backlogs.map((backlog, index) => ({
  market: backlog.market,
  generatedAt: catalogs[index].generatedAt,
  purchaseReadyRatio: backlog.purchaseReadyRatio,
  weightedCoverage: backlog.weightedCoverage,
  topOpportunity: backlog.opportunities[0] ? compactOpportunity(backlog.opportunities[0]) : null,
  opportunities: backlog.opportunities.map(compactOpportunity),
}));
const generatedAt = latestTimestamp(catalogs.map((catalog) => catalog.generatedAt).filter(Boolean));
const allMarkets = COMMERCIAL_MARKET_CONFIG.map(({ market }) => market);

const report = {
  schemaVersion: 2,
  generatedAt,
  focusMarkets: allMarkets,
  focusPortfolio: aggregateCommercialOpportunityBacklogs(backlogs),
  portfolio: aggregateCommercialOpportunityBacklogs(backlogs),
  markets,
};

await writeFile(OUTPUT, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(`Wrote ${OUTPUT.pathname} for ${allMarkets.length} markets`);
