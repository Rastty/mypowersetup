import { calculateSetup } from "./engine.js";
import { calculateChargingPlan } from "./charging.js";
import { recommendProducts } from "./products.js";
import { isCommerciallyEligibleProduct } from "./commercial-coverage.js";

export const COMMERCIAL_SCENARIOS = Object.freeze([
  Object.freeze({
    id: "light-weekend",
    weight: 4,
    input: {
      autonomyDays: 1,
      season: "summer",
      batteryType: "lifepo4",
      systemVoltage: "auto",
      driveHoursPerDay: 2,
      shoreChargeHours: 8,
      appliances: [
        { selected: true, id: "fridge", watts: 45, hours: 8, quantity: 1, ac: false, surge: 2.5 },
        { selected: true, id: "lights", watts: 20, hours: 5, quantity: 1, ac: false, surge: 1 },
        { selected: true, id: "phones", watts: 20, hours: 3, quantity: 1, ac: false, surge: 1 },
      ],
    },
  }),
  Object.freeze({
    id: "family-touring",
    weight: 5,
    input: {
      autonomyDays: 2,
      season: "summer",
      batteryType: "lifepo4",
      systemVoltage: "auto",
      driveHoursPerDay: 3,
      shoreChargeHours: 8,
      appliances: [
        { selected: true, id: "fridge", watts: 45, hours: 8, quantity: 1, ac: false, surge: 2.5 },
        { selected: true, id: "lights", watts: 20, hours: 5, quantity: 1, ac: false, surge: 1 },
        { selected: true, id: "phones", watts: 20, hours: 3, quantity: 2, ac: false, surge: 1 },
        { selected: true, id: "pump", watts: 60, hours: 0.5, quantity: 1, ac: false, surge: 2 },
        { selected: true, id: "laptop", watts: 65, hours: 2, quantity: 1, ac: true, surge: 1 },
      ],
    },
  }),
  Object.freeze({
    id: "remote-work",
    weight: 3,
    input: {
      autonomyDays: 2,
      season: "shoulder",
      batteryType: "lifepo4",
      systemVoltage: "auto",
      driveHoursPerDay: 1.5,
      shoreChargeHours: 6,
      appliances: [
        { selected: true, id: "fridge", watts: 45, hours: 8, quantity: 1, ac: false, surge: 2.5 },
        { selected: true, id: "laptop", watts: 65, hours: 6, quantity: 1, ac: true, surge: 1 },
        { selected: true, id: "phones", watts: 20, hours: 3, quantity: 2, ac: false, surge: 1 },
        { selected: true, id: "lights", watts: 20, hours: 4, quantity: 1, ac: false, surge: 1 },
      ],
    },
  }),
  Object.freeze({
    id: "coffee-offgrid",
    weight: 4,
    input: {
      autonomyDays: 2,
      season: "summer",
      batteryType: "lifepo4",
      systemVoltage: "auto",
      driveHoursPerDay: 2,
      shoreChargeHours: 6,
      appliances: [
        { selected: true, id: "fridge", watts: 45, hours: 8, quantity: 1, ac: false, surge: 2.5 },
        { selected: true, id: "coffee", watts: 1000, hours: 0.15, quantity: 1, ac: true, surge: 1.1 },
        { selected: true, id: "lights", watts: 20, hours: 5, quantity: 1, ac: false, surge: 1 },
        { selected: true, id: "phones", watts: 20, hours: 3, quantity: 2, ac: false, surge: 1 },
      ],
    },
  }),
  Object.freeze({
    id: "winter-basic",
    weight: 2,
    input: {
      autonomyDays: 2,
      season: "winter",
      batteryType: "lifepo4",
      systemVoltage: "auto",
      driveHoursPerDay: 2,
      shoreChargeHours: 8,
      appliances: [
        { selected: true, id: "fridge", watts: 45, hours: 6, quantity: 1, ac: false, surge: 2.5 },
        { selected: true, id: "lights", watts: 20, hours: 6, quantity: 1, ac: false, surge: 1 },
        { selected: true, id: "phones", watts: 20, hours: 3, quantity: 2, ac: false, surge: 1 },
      ],
    },
  }),
  Object.freeze({
    id: "high-power-tools",
    weight: 1,
    input: {
      autonomyDays: 2,
      season: "summer",
      batteryType: "lifepo4",
      systemVoltage: "auto",
      driveHoursPerDay: 3,
      shoreChargeHours: 8,
      appliances: [
        { selected: true, id: "fridge", watts: 45, hours: 8, quantity: 1, ac: false, surge: 2.5 },
        { selected: true, id: "tools", watts: 600, hours: 0.5, quantity: 1, ac: true, surge: 2 },
        { selected: true, id: "coffee", watts: 1000, hours: 0.15, quantity: 1, ac: true, surge: 1.1 },
        { selected: true, id: "lights", watts: 20, hours: 4, quantity: 1, ac: false, surge: 1 },
      ],
    },
  }),
]);

function commercialJourneyCategories(setup) {
  return Object.freeze([
    "battery",
    "solar_panel",
    "controller",
    ...(setup.inverterWatts > 0 ? ["inverter"] : []),
  ]);
}

function chargingOpportunityCategories(setup) {
  const categories = [];
  if (setup.charging?.dcDc?.suggestedCurrentAmps) categories.push("dc_charger");
  if (setup.charging?.shore?.suggestedCurrentAmps) categories.push("shore_charger");
  return Object.freeze(categories);
}

export function buildScenarioSetup(scenario, locale = "cs") {
  const setup = calculateSetup({ ...scenario.input, locale });
  const charging = calculateChargingPlan({
    ...setup,
    driveHoursPerDay: scenario.input.driveHoursPerDay,
    shoreChargeHours: scenario.input.shoreChargeHours,
    starterVoltage: 12,
  });
  return Object.freeze({ ...setup, charging });
}

export function assessCommercialScenario(catalog, scenario, locale = "cs") {
  const setup = buildScenarioSetup(scenario, locale);
  const sources = catalog?.sources || {};
  const eligibleProducts = (catalog?.products || []).filter((product) => isCommerciallyEligibleProduct(product, sources));
  const recommendations = recommendProducts(eligibleProducts, setup);
  const required = commercialJourneyCategories(setup);
  const missing = required.filter((category) => !(recommendations[category]?.length > 0));
  const chargingOpportunities = chargingOpportunityCategories(setup);
  const chargingMissing = chargingOpportunities.filter((category) => !(recommendations[category]?.length > 0));

  return Object.freeze({
    id: scenario.id,
    weight: scenario.weight,
    setup: Object.freeze({
      dailyWh: setup.dailyWh,
      batteryAh: setup.batteryAh,
      solarWatts: setup.solarWatts,
      controllerAmps: setup.controllerAmps,
      inverterWatts: setup.inverterWatts,
      systemVoltage: setup.systemVoltage,
    }),
    required,
    missing: Object.freeze(missing),
    purchaseReady: missing.length === 0,
    coverageRatio: required.length ? (required.length - missing.length) / required.length : 1,
    chargingOpportunities,
    chargingMissing: Object.freeze(chargingMissing),
  });
}

export function assessMarketScenarioCoverage(catalog, locale = "cs", scenarios = COMMERCIAL_SCENARIOS) {
  const results = scenarios.map((scenario) => assessCommercialScenario(catalog, scenario, locale));
  const totalWeight = results.reduce((sum, result) => sum + result.weight, 0);
  const readyWeight = results.reduce((sum, result) => sum + (result.purchaseReady ? result.weight : 0), 0);
  const weightedCoverage = results.reduce((sum, result) => sum + result.coverageRatio * result.weight, 0) / totalWeight;
  const opportunityScore = {};
  for (const result of results) {
    for (const category of result.missing) opportunityScore[category] = (opportunityScore[category] || 0) + result.weight;
    for (const category of result.chargingMissing) opportunityScore[category] = (opportunityScore[category] || 0) + result.weight * 0.5;
  }
  const opportunities = Object.entries(opportunityScore)
    .map(([category, score]) => Object.freeze({ category, score }))
    .sort((a, b) => b.score - a.score || a.category.localeCompare(b.category));

  return Object.freeze({
    market: catalog?.market || "unknown",
    scenarioCount: results.length,
    totalWeight,
    readyWeight,
    purchaseReadyRatio: totalWeight ? readyWeight / totalWeight : 1,
    weightedCoverage,
    opportunities: Object.freeze(opportunities),
    scenarios: Object.freeze(results),
  });
}
