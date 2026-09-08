import { readFile, writeFile } from "node:fs/promises";
import { buildCommercialOpportunityBacklog, aggregateCommercialOpportunityBacklogs } from "../src/commercial-opportunity-backlog.js";
import { COMMERCIAL_MARKET_CONFIG } from "../src/commercial-market-config.js";
import { rankCommercialSourcingRoutes } from "../src/commercial-sourcing-priorities.js";

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

function compactSourcingRoute(route) {
  return route ? {
    id: route.id,
    category: route.category,
    merchant: route.merchant,
    productName: route.productName,
    status: route.status,
    blocker: route.blocker,
    secondaryBlocker: route.secondaryBlocker,
    standaloneUnlockWeight: route.standaloneUnlockWeight,
    affectedWeight: route.affectedWeight,
    shippingVerified: route.shippingVerified,
    stockStatus: route.stockStatus,
    nextActionOwner: route.nextActionOwner,
    nextAction: route.nextAction,
    applicationUrl: route.applicationUrl,
    applicationPacketPath: route.applicationPacketPath,
    activationFieldsNeeded: route.activationFieldsNeeded,
    checkoutStatus: route.checkoutStatus,
  } : null;
}

function compactOpportunity(item, market) {
  return {
    category: item.category,
    label: item.label,
    priority: item.priority,
    score: item.score,
    maxPurchaseReadyGain: item.maxPurchaseReadyGain,
    standalonePurchaseReadyGain: item.standalonePurchaseReadyGain,
    affectedWeight: item.affectedWeight,
    unlockWeight: item.unlockWeight,
    standaloneUnlockWeight: item.standaloneUnlockWeight,
    primaryScenarioIds: item.primaryScenarioIds,
    unlockScenarioIds: item.unlockScenarioIds,
    standaloneUnlockScenarioIds: item.standaloneUnlockScenarioIds,
    secondaryScenarioIds: item.secondaryScenarioIds,
    primaryRequirements: item.primaryRequirements.map(compactRequirement),
    secondaryRequirements: item.secondaryRequirements.map(compactRequirement),
    bestSourcingRoute: compactSourcingRoute(rankCommercialSourcingRoutes(market, { category: item.category })[0] || null),
  };
}

const catalogs = [];
for (const config of COMMERCIAL_MARKET_CONFIG) catalogs.push(await readCatalog(config));
const backlogs = catalogs.map((catalog, index) => buildCommercialOpportunityBacklog(catalog, COMMERCIAL_MARKET_CONFIG[index].locale));
const markets = backlogs.map((backlog, index) => ({
  market: backlog.market,
  generatedAt: catalogs[index].generatedAt,
  purchaseReadyRatio: backlog.purchaseReadyRatio,
  componentReadyRatio: backlog.componentReadyRatio,
  portableFitRatio: backlog.portableFitRatio,
  weightedCoverage: backlog.weightedCoverage,
  topOpportunity: backlog.opportunities[0] ? compactOpportunity(backlog.opportunities[0], backlog.market) : null,
  opportunities: backlog.opportunities.map((item) => compactOpportunity(item, backlog.market)),
  topSourcingRoute: compactSourcingRoute(rankCommercialSourcingRoutes(backlog.market)[0] || null),
  sourcingRoutes: rankCommercialSourcingRoutes(backlog.market).map(compactSourcingRoute),
}));
const generatedAt = latestTimestamp(catalogs.map((catalog) => catalog.generatedAt).filter(Boolean));
const allMarkets = COMMERCIAL_MARKET_CONFIG.map(({ market }) => market);

const report = {
  schemaVersion: 6,
  generatedAt,
  focusMarkets: allMarkets,
  focusPortfolio: aggregateCommercialOpportunityBacklogs(backlogs),
  portfolio: aggregateCommercialOpportunityBacklogs(backlogs),
  markets,
};

await writeFile(OUTPUT, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(`Wrote ${OUTPUT.pathname} for ${allMarkets.length} markets`);
