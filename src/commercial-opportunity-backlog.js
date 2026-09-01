import { assessMarketScenarioCoverage } from "./commercial-scenarios.js";
import { requirementKey } from "./acquisition-requirements.js";

const CATEGORY_LABELS = Object.freeze({
  battery: "battery",
  solar_panel: "solar panel",
  controller: "MPPT controller",
  inverter: "inverter",
  dc_charger: "DC-DC charger",
  shore_charger: "230 V shore charger",
});

function requirementProfiles(report, category, field) {
  const profiles = new Map();
  for (const scenario of report.scenarios) {
    const requirements = scenario[field] || [];
    for (const requirement of requirements.filter((item) => item.category === category)) {
      const key = requirementKey(requirement);
      const current = profiles.get(key) || { requirement, weight: 0, scenarioIds: [] };
      current.weight += scenario.weight;
      current.scenarioIds.push(scenario.id);
      profiles.set(key, current);
    }
  }
  return Object.freeze([...profiles.values()]
    .map((profile) => Object.freeze({ ...profile, scenarioIds: Object.freeze(profile.scenarioIds) }))
    .sort((a, b) => b.weight - a.weight || requirementKey(a.requirement).localeCompare(requirementKey(b.requirement))));
}

export function buildCommercialOpportunityBacklog(catalog, locale = "cs") {
  const report = assessMarketScenarioCoverage(catalog, locale);
  const scenariosById = new Map(report.scenarios.map((scenario) => [scenario.id, scenario]));
  const opportunities = report.opportunities.map(({ category, score }) => {
    const primaryScenarioIds = report.scenarios.filter((scenario) => scenario.missing.includes(category)).map((scenario) => scenario.id);
    const unlockScenarioIds = report.scenarios.filter((scenario) => !scenario.purchaseReady && scenario.missing.includes(category)).map((scenario) => scenario.id);
    const secondaryScenarioIds = report.scenarios.filter((scenario) => scenario.chargingMissing.includes(category)).map((scenario) => scenario.id);
    const affectedWeight = primaryScenarioIds.reduce((sum, id) => sum + scenariosById.get(id).weight, 0);
    const unlockWeight = unlockScenarioIds.reduce((sum, id) => sum + scenariosById.get(id).weight, 0);
    const secondaryWeight = secondaryScenarioIds.reduce((sum, id) => sum + scenariosById.get(id).weight, 0);
    const maxPurchaseReadyGain = report.totalWeight ? unlockWeight / report.totalWeight : 0;
    const priority = score >= 8 ? "P0" : score >= 4 ? "P1" : "P2";
    return Object.freeze({
      category,
      label: CATEGORY_LABELS[category] || category,
      priority,
      score,
      affectedWeight,
      unlockWeight,
      secondaryWeight,
      maxPurchaseReadyGain,
      primaryScenarioIds: Object.freeze(primaryScenarioIds),
      unlockScenarioIds: Object.freeze(unlockScenarioIds),
      secondaryScenarioIds: Object.freeze(secondaryScenarioIds),
      primaryRequirements: requirementProfiles(report, category, "missingRequirements"),
      secondaryRequirements: requirementProfiles(report, category, "chargingMissingRequirements"),
    });
  });
  return Object.freeze({
    market: report.market,
    purchaseReadyRatio: report.purchaseReadyRatio,
    componentReadyRatio: report.componentReadyRatio,
    portableFitRatio: report.portableFitRatio,
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
      current.markets.push(Object.freeze({
        market: backlog.market,
        priority: item.priority,
        score: item.score,
        maxPurchaseReadyGain: item.maxPurchaseReadyGain,
        primaryRequirements: item.primaryRequirements,
        secondaryRequirements: item.secondaryRequirements,
      }));
      current.maxPurchaseReadyGain += item.maxPurchaseReadyGain;
      categories.set(item.category, current);
    }
  }
  return Object.freeze([...categories.values()]
    .map((item) => Object.freeze({ ...item, markets: Object.freeze(item.markets) }))
    .sort((a, b) => b.score - a.score || b.maxPurchaseReadyGain - a.maxPurchaseReadyGain || a.category.localeCompare(b.category)));
}
