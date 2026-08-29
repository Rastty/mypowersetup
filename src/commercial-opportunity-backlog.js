import { assessMarketScenarioCoverage } from "./commercial-scenarios.js";

const CATEGORY_LABELS = Object.freeze({
  battery: "battery",
  solar_panel: "solar panel",
  controller: "MPPT controller",
  inverter: "inverter",
  dc_charger: "DC-DC charger",
  shore_charger: "230 V shore charger",
});

export function buildCommercialOpportunityBacklog(catalog, locale = "cs") {
  const report = assessMarketScenarioCoverage(catalog, locale);
  const scenariosById = new Map(report.scenarios.map((scenario) => [scenario.id, scenario]));
  const opportunities = report.opportunities.map(({ category, score }) => {
    const primaryScenarioIds = report.scenarios
      .filter((scenario) => scenario.missing.includes(category))
      .map((scenario) => scenario.id);
    const secondaryScenarioIds = report.scenarios
      .filter((scenario) => scenario.chargingMissing.includes(category))
      .map((scenario) => scenario.id);
    const affectedWeight = primaryScenarioIds.reduce((sum, id) => sum + scenariosById.get(id).weight, 0);
    const secondaryWeight = secondaryScenarioIds.reduce((sum, id) => sum + scenariosById.get(id).weight, 0);
    const maxPurchaseReadyGain = report.totalWeight ? affectedWeight / report.totalWeight : 0;
    const priority = score >= 8 ? "P0" : score >= 4 ? "P1" : "P2";
    return Object.freeze({
      category,
      label: CATEGORY_LABELS[category] || category,
      priority,
      score,
      affectedWeight,
      secondaryWeight,
      maxPurchaseReadyGain,
      primaryScenarioIds: Object.freeze(primaryScenarioIds),
      secondaryScenarioIds: Object.freeze(secondaryScenarioIds),
    });
  });
  return Object.freeze({
    market: report.market,
    purchaseReadyRatio: report.purchaseReadyRatio,
    weightedCoverage: report.weightedCoverage,
    opportunities: Object.freeze(opportunities),
  });
}

export function aggregateCommercialOpportunityBacklogs(backlogs) {
  const categories = new Map();
  for (const backlog of backlogs) {
    for (const item of backlog.opportunities) {
      const current = categories.get(item.category) || { category: item.category, label: item.label, score: 0, markets: [], maxPurchaseReadyGain: 0 };
      current.score += item.score;
      current.markets.push(Object.freeze({ market: backlog.market, priority: item.priority, score: item.score, maxPurchaseReadyGain: item.maxPurchaseReadyGain }));
      current.maxPurchaseReadyGain += item.maxPurchaseReadyGain;
      categories.set(item.category, current);
    }
  }
  return Object.freeze([...categories.values()]
    .map((item) => Object.freeze({ ...item, markets: Object.freeze(item.markets) }))
    .sort((a, b) => b.score - a.score || b.maxPurchaseReadyGain - a.maxPurchaseReadyGain || a.category.localeCompare(b.category)));
}
