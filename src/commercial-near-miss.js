import { assessMarketScenarioCoverage } from "./commercial-scenarios.js";
import { isCommerciallyEligibleProduct } from "./commercial-coverage.js";
import { refreshCatalogProduct } from "./products.js";

export function diagnoseMarketNearMisses(catalog, locale = "cs") {
  const report = assessMarketScenarioCoverage(catalog, locale);
  const sources = catalog?.sources || {};
  const eligible = (catalog?.products || [])
    .map(refreshCatalogProduct)
    .filter((product) => isCommerciallyEligibleProduct(product, sources));

  const scenarios = report.scenarios
    .filter((scenario) => scenario.missing.length || scenario.chargingMissing.length)
    .map((scenario) => {
      const requirements = [
        ...scenario.missingRequirements.map((requirement) => ({ requirement, primary: true })),
        ...scenario.chargingMissingRequirements.map((requirement) => ({ requirement, primary: false })),
      ];
      return Object.freeze({
        id: scenario.id,
        weight: scenario.weight,
        setup: scenario.setup,
        gaps: Object.freeze(requirements.map(({ requirement, primary }) => diagnoseRequirement(eligible, requirement, { primary }))),
      });
    });

  const selectionMismatches = scenarios.flatMap((scenario) => scenario.gaps
    .filter((gap) => gap.status === "selection_mismatch")
    .map((gap) => `${scenario.id}:${gap.requirement.category}:${gap.bestCandidates[0]?.id || "unknown"}`));

  return Object.freeze({
    market: report.market,
    purchaseReadyRatio: report.purchaseReadyRatio,
    weightedCoverage: report.weightedCoverage,
    scenarios: Object.freeze(scenarios),
    selectionMismatches: Object.freeze(selectionMismatches),
  });
}

export function diagnoseRequirement(products, requirement, { primary = true, limit = 3 } = {}) {
  const categoryProducts = products.filter((product) => product.category === requirement.category);
  const ranked = categoryProducts
    .map((product) => candidateAssessment(product, requirement))
    .sort((a, b) => a.blockers.length - b.blockers.length || a.distance - b.distance || a.name.localeCompare(b.name))
    .slice(0, limit);
  const viable = ranked.find((candidate) => candidate.blockers.length === 0);
  return Object.freeze({
    primary,
    requirement,
    status: viable ? "selection_mismatch" : categoryProducts.length ? "catalog_near_miss" : "catalog_missing_category",
    categoryProductCount: categoryProducts.length,
    bestCandidates: Object.freeze(ranked),
  });
}

function candidateAssessment(product, requirement) {
  const blockers = [];
  const specs = product.specs || {};
  let distance = 0;
  const category = requirement.category;

  if (category === "battery") {
    if (specs.voltageV !== requirement.systemVoltage) blockers.push(`voltage:${specs.voltageV ?? "unknown"}->${requirement.systemVoltage}`);
    if (specs.batteryType !== requirement.batteryType) blockers.push(`batteryType:${specs.batteryType || "unknown"}->${requirement.batteryType}`);
    addRangeBlocker(blockers, "capacityAh", specs.capacityAh, requirement.minCapacityAh, requirement.maxCapacityAh);
    distance += rangeDistance(specs.capacityAh, requirement.minCapacityAh, requirement.maxCapacityAh);
  } else if (category === "solar_panel") {
    const powerW = specs.powerW;
    if (!(powerW > 0)) blockers.push("powerW:unknown");
    else {
      const quantity = Math.max(1, Math.ceil(requirement.minArrayWatts / powerW));
      const fit = (powerW * quantity) / requirement.minArrayWatts;
      if (quantity > requirement.maxPanels) blockers.push(`panelCount:${quantity}>${requirement.maxPanels}`);
      if (fit > 3) blockers.push(`arrayOversize:${fit.toFixed(2)}x>3x`);
      distance += Math.abs(1 - fit);
    }
  } else if (category === "inverter") {
    if (specs.voltageV !== requirement.systemVoltage) blockers.push(`voltage:${specs.voltageV ?? "unknown"}->${requirement.systemVoltage}`);
    if (!hasPureSineEvidence(product)) blockers.push("waveform:pure_sine_missing");
    addRangeBlocker(blockers, "powerW", specs.powerW, requirement.minContinuousPowerW, requirement.maxContinuousPowerW);
    distance += rangeDistance(specs.powerW, requirement.minContinuousPowerW, requirement.maxContinuousPowerW);
  } else if (category === "controller") {
    if (!/\bmppt\b/i.test(product.name || "")) blockers.push("technology:mppt_missing");
    addRangeBlocker(blockers, "currentA", specs.currentA, requirement.minCurrentA, requirement.maxCurrentA);
    distance += rangeDistance(specs.currentA, requirement.minCurrentA, requirement.maxCurrentA);
  } else if (category === "dc_charger" || category === "shore_charger") {
    if (!specs.chargingVoltagesV?.includes(requirement.outputVoltage)) blockers.push(`outputVoltage:${list(specs.chargingVoltagesV)}->${requirement.outputVoltage}`);
    if (!specs.chargingBatteryTypes?.includes(requirement.batteryType)) blockers.push(`batteryType:${list(specs.chargingBatteryTypes)}->${requirement.batteryType}`);
    if (category === "dc_charger" && !specs.chargingInputVoltagesV?.includes(requirement.inputVoltage)) blockers.push(`inputVoltage:${list(specs.chargingInputVoltagesV)}->${requirement.inputVoltage}`);
    addRangeBlocker(blockers, "currentA", specs.currentA, requirement.minCurrentA, requirement.maxCurrentA);
    distance += rangeDistance(specs.currentA, requirement.minCurrentA, requirement.maxCurrentA);
  }

  return Object.freeze({
    id: product.id,
    merchant: product.merchant,
    name: product.name,
    blockers: Object.freeze(blockers),
    distance: Number.isFinite(distance) ? Number(distance.toFixed(4)) : 999,
    specs: relevantSpecs(specs, category),
  });
}

function addRangeBlocker(blockers, label, value, min, max) {
  if (!(Number.isFinite(value) && value > 0)) blockers.push(`${label}:unknown`);
  else if (value < min) blockers.push(`${label}:${value}<${round(min)}`);
  else if (Number.isFinite(max) && value > max) blockers.push(`${label}:${value}>${round(max)}`);
}

function rangeDistance(value, min, max) {
  if (!(Number.isFinite(value) && value > 0)) return 100;
  if (value < min) return (min - value) / min;
  if (Number.isFinite(max) && value > max) return (value - max) / max;
  return Math.abs(1 - value / min);
}

function hasPureSineEvidence(product) {
  if (product.specs?.pureSine === false) return false;
  if (product.specs?.pureSine === true) return true;
  return !/modifikovan[^\s]* (?:sinus|sínus)[^\s]*/i.test(product.name || "")
    && /čist[^\s]* (?:sinus|sínus)[^\s]*|czyst[^\s]* sinus[^\s]*|pure sine|(?:sinusov|sínusov)[^\s]* (?:měnič|menič)|sinepower/i.test(product.name || "");
}

function relevantSpecs(specs, category) {
  if (category === "battery") return Object.freeze({ voltageV: specs.voltageV, capacityAh: specs.capacityAh, batteryType: specs.batteryType });
  if (category === "solar_panel") return Object.freeze({ powerW: specs.powerW });
  if (category === "inverter") return Object.freeze({ voltageV: specs.voltageV, powerW: specs.powerW, pureSine: specs.pureSine });
  if (category === "controller") return Object.freeze({ currentA: specs.currentA, voltageV: specs.voltageV });
  return Object.freeze({ currentA: specs.currentA, chargingVoltagesV: specs.chargingVoltagesV, chargingInputVoltagesV: specs.chargingInputVoltagesV, chargingBatteryTypes: specs.chargingBatteryTypes });
}

function list(value) { return Array.isArray(value) && value.length ? value.join(",") : "unknown"; }
function round(value) { return Number(Number(value).toFixed(2)); }
