const STANDARD_CURRENTS = [5, 10, 15, 20, 25, 30, 40, 50, 60];
const CHARGING_EFFICIENCY = 0.9;
const PLANNING_C_RATE = { lifepo4: 0.2, lead: 0.1 };

function clampHours(value, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(24, Math.max(0, parsed));
}

function nextStandardCurrent(requiredCurrent) {
  return STANDARD_CURRENTS.find((current) => current >= requiredCurrent) || null;
}

function buildOption({ dailyWh, batteryAh, batteryType, systemVoltage, hours }) {
  if (hours <= 0) return { enabled: false, hours };

  const requiredCurrentAmps = dailyWh / hours / systemVoltage / CHARGING_EFFICIENCY;
  const planningCeilingAmps = batteryAh * (PLANNING_C_RATE[batteryType] || PLANNING_C_RATE.lifepo4);
  const suggestedCurrentAmps = nextStandardCurrent(requiredCurrentAmps);
  const needsIndividualDesign = !suggestedCurrentAmps || suggestedCurrentAmps > planningCeilingAmps;

  return {
    enabled: true,
    hours,
    requiredCurrentAmps: Math.ceil(requiredCurrentAmps),
    suggestedCurrentAmps: needsIndividualDesign ? null : suggestedCurrentAmps,
    planningCeilingAmps: Math.floor(planningCeilingAmps),
    needsIndividualDesign,
  };
}

function addDcDcInputEstimate(option, starterVoltage, systemVoltage) {
  if (!option.enabled) return option;
  const outputCurrentAmps = option.suggestedCurrentAmps || option.requiredCurrentAmps;
  return {
    ...option,
    estimatedInputCurrentAmps: Math.ceil(
      outputCurrentAmps * systemVoltage / starterVoltage / CHARGING_EFFICIENCY,
    ),
    inputEstimateOutputCurrentAmps: outputCurrentAmps,
  };
}

export function calculateChargingPlan(input) {
  const dailyWh = Number(input.dailyWh);
  const batteryAh = Number(input.batteryAh);
  const systemVoltage = Number(input.systemVoltage);
  const batteryType = input.batteryType === "lead" ? "lead" : "lifepo4";
  const starterVoltage = Number(input.starterVoltage) === 24 ? 24 : 12;
  if (![dailyWh, batteryAh, systemVoltage].every((value) => Number.isFinite(value) && value > 0)) {
    return null;
  }

  const dcDc = buildOption({
    dailyWh,
    batteryAh,
    batteryType,
    systemVoltage,
    hours: clampHours(input.driveHoursPerDay, 2),
  });

  return {
    efficiencyPercent: Math.round(CHARGING_EFFICIENCY * 100),
    batteryType,
    starterVoltage,
    dcDc: addDcDcInputEstimate(dcDc, starterVoltage, systemVoltage),
    shore: buildOption({
      dailyWh,
      batteryAh,
      batteryType,
      systemVoltage,
      hours: clampHours(input.shoreChargeHours, 8),
    }),
  };
}
