const STANDARD_CHARGER_CURRENTS_A = Object.freeze([10, 20, 30, 40, 50, 60, 80, 100, 120]);

export function calculateDcDcCharger(input = {}) {
  const batteryCapacityAh = clampNumber(input.batteryCapacityAh, 20, 1000, 200);
  const replenishPercent = clampNumber(input.replenishPercent, 5, 100, 50);
  const targetDriveHours = clampNumber(input.targetDriveHours, 0.5, 24, 3);
  const batteryVoltage = normalizeVoltage(input.batteryVoltage);
  const sourceVoltage = clampNumber(input.sourceVoltage, 12, 30, batteryVoltage === 24 ? 28.4 : 14.2);
  const spareAlternatorCurrentA = clampNumber(input.spareAlternatorCurrentA, 1, 400, 50);
  const batteryMaxChargeCurrentA = clampNumber(input.batteryMaxChargeCurrentA, 1, 400, Math.min(100, batteryCapacityAh));
  const efficiencyPercent = clampNumber(input.efficiencyPercent, 70, 100, 90);
  const efficiency = efficiencyPercent / 100;

  const energyToReplaceWh = batteryCapacityAh * batteryVoltage * (replenishPercent / 100);
  const requiredOutputCurrentA = energyToReplaceWh / (batteryVoltage * targetDriveHours);
  const alternatorLimitedOutputCurrentA = (spareAlternatorCurrentA * sourceVoltage * efficiency) / batteryVoltage;
  const feasibleOutputCurrentA = Math.min(alternatorLimitedOutputCurrentA, batteryMaxChargeCurrentA);

  const standardAtOrAboveTarget = STANDARD_CHARGER_CURRENTS_A.find(
    (current) => current >= requiredOutputCurrentA && current <= feasibleOutputCurrentA,
  );
  const largestFeasibleStandard = [...STANDARD_CHARGER_CURRENTS_A]
    .reverse()
    .find((current) => current <= feasibleOutputCurrentA);
  const recommendedChargerCurrentA = standardAtOrAboveTarget || largestFeasibleStandard || null;

  const estimatedRechargeHours = recommendedChargerCurrentA
    ? energyToReplaceWh / (batteryVoltage * recommendedChargerCurrentA)
    : null;
  const targetMet = Boolean(recommendedChargerCurrentA && estimatedRechargeHours <= targetDriveHours);
  const sourceCurrentAtRecommendationA = recommendedChargerCurrentA
    ? (recommendedChargerCurrentA * batteryVoltage) / (sourceVoltage * efficiency)
    : null;

  const limitingFactors = [];
  if (alternatorLimitedOutputCurrentA < requiredOutputCurrentA) limitingFactors.push("alternator-spare-current");
  if (batteryMaxChargeCurrentA < requiredOutputCurrentA) limitingFactors.push("battery-charge-current");
  if (!standardAtOrAboveTarget && largestFeasibleStandard && feasibleOutputCurrentA >= requiredOutputCurrentA) {
    limitingFactors.push("standard-charger-step");
  }
  if (!largestFeasibleStandard) limitingFactors.push("no-standard-charger-within-limits");

  const warnings = [
    "Volný proud alternátoru je vstup návrhu, ne jmenovitý proud alternátoru. Ověřte dlouhodobě dostupný proud podle vozidla, teploty a výrobce.",
    "Ověřte maximální nabíjecí proud baterie/BMS, průřezy, jištění, délku kabeláže a instalační limity konkrétní DC-DC nabíječky.",
  ];
  if (!targetMet) {
    warnings.push("Zadaný podíl baterie nelze s vybranými limity doplnit během cílové doby jízdy. Prodlužte dobu, snižte cíl nebo ověřte, zda lze bezpečně zvýšit dostupný nabíjecí proud.");
  }

  return Object.freeze({
    batteryCapacityAh,
    replenishPercent,
    targetDriveHours,
    batteryVoltage,
    sourceVoltage,
    spareAlternatorCurrentA,
    batteryMaxChargeCurrentA,
    efficiencyPercent,
    energyToReplaceWh: round(energyToReplaceWh, 0),
    requiredOutputCurrentA: round(requiredOutputCurrentA, 1),
    alternatorLimitedOutputCurrentA: round(alternatorLimitedOutputCurrentA, 1),
    feasibleOutputCurrentA: round(feasibleOutputCurrentA, 1),
    recommendedChargerCurrentA,
    estimatedRechargeHours: estimatedRechargeHours == null ? null : round(estimatedRechargeHours, 1),
    sourceCurrentAtRecommendationA: sourceCurrentAtRecommendationA == null ? null : round(sourceCurrentAtRecommendationA, 1),
    targetMet,
    limitingFactors: Object.freeze(limitingFactors),
    warnings: Object.freeze(warnings),
    assumptions: Object.freeze({
      standardChargerCurrentsA: STANDARD_CHARGER_CURRENTS_A,
      efficiencyIsUserInput: true,
      alternatorInputMeaning: "spare-continuous-current-after-vehicle-loads",
    }),
  });
}

function normalizeVoltage(value) {
  return value === 24 || value === "24" ? 24 : 12;
}

function clampNumber(value, min, max, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function round(value, digits) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}
