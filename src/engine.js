import { BATTERIES, SEASONS } from "./catalog.js";

const BATTERY_MARGIN = 1.15;
const SOLAR_SYSTEM_EFFICIENCY = 0.75;
const SOLAR_MARGIN = 1.15;
const INVERTER_MARGIN = 1.25;

export function roundUp(value, step) {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.ceil(value / step) * step;
}

export function calculateSetup(input) {
  const appliances = (input.appliances || []).filter((item) => item.selected);
  if (appliances.length === 0) {
    throw new Error("Vyberte alespoň jeden spotřebič.");
  }

  const autonomyDays = clampNumber(input.autonomyDays, 1, 7, 2);
  const season = SEASONS[input.season] || SEASONS.summer;
  const battery = BATTERIES[input.batteryType] || BATTERIES.lifepo4;

  const applianceRows = appliances.map((item) => {
    const watts = clampNumber(item.watts, 1, 10000, 1);
    const hours = clampNumber(item.hours, 0.01, 24, 1);
    const quantity = clampNumber(item.quantity, 1, 20, 1);
    return {
      ...item,
      watts,
      hours,
      quantity,
      dailyWh: watts * hours * quantity
    };
  });

  const dailyWhRaw = applianceRows.reduce((total, item) => total + item.dailyWh, 0);
  const dailyWh = roundUp(dailyWhRaw, 10);
  const requiredBatteryWhRaw = (dailyWhRaw * autonomyDays * BATTERY_MARGIN) / battery.usableDepth;
  const requiredBatteryWh = roundUp(requiredBatteryWhRaw, 100);

  const acLoads = applianceRows.filter((item) => item.ac);
  const largestAcLoad = [...acLoads].sort((a, b) => b.watts - a.watts)[0];
  const otherAcWatts = acLoads
    .filter((item) => item !== largestAcLoad)
    .reduce((total, item) => total + item.watts * item.quantity, 0);
  const estimatedConcurrentWatts = largestAcLoad
    ? largestAcLoad.watts * largestAcLoad.quantity + otherAcWatts * 0.5
    : 0;
  const largestStartWatts = acLoads.reduce(
    (max, item) => Math.max(max, item.watts * item.quantity * (item.surge || 1)),
    0
  );
  const inverterWatts = roundUp(
    Math.max(estimatedConcurrentWatts * INVERTER_MARGIN, largestStartWatts),
    100
  );

  const automaticVoltage = requiredBatteryWh > 2400 || inverterWatts > 1200 ? 24 : 12;
  const systemVoltage = input.systemVoltage === "12" || input.systemVoltage === 12
    ? 12
    : input.systemVoltage === "24" || input.systemVoltage === 24
      ? 24
      : automaticVoltage;

  const batteryAh = roundUp(requiredBatteryWh / systemVoltage, 10);
  const solarWattsRaw = (dailyWhRaw * SOLAR_MARGIN) / (season.peakSunHours * SOLAR_SYSTEM_EFFICIENCY);
  const solarWatts = roundUp(solarWattsRaw, 50);
  const controllerAmps = roundUp((solarWatts / systemVoltage) * 1.25, 10);

  const warnings = [];
  if (input.season === "winter") {
    warnings.push("V zimě počítejte s velkými výkyvy výroby a záložním způsobem dobíjení.");
  }
  if (acLoads.some((item) => (item.surge || 1) >= 2)) {
    warnings.push("Motorové spotřebiče mohou mít krátkou rozběhovou špičku; ověřte ji v dokumentaci výrobce.");
  }
  if (input.systemVoltage !== "auto" && Number(input.systemVoltage) !== automaticVoltage) {
    warnings.push(`Pro tuto velikost sestavy bychom standardně doporučili ${automaticVoltage}V systém.`);
  }

  return {
    dailyWh,
    autonomyDays,
    batteryLabel: battery.label,
    batteryType: input.batteryType || "lifepo4",
    batteryWh: requiredBatteryWh,
    batteryAh,
    solarWatts,
    inverterWatts,
    controllerAmps,
    systemVoltage,
    seasonLabel: season.label,
    applianceRows,
    warnings,
    assumptions: {
      batteryMarginPercent: Math.round((BATTERY_MARGIN - 1) * 100),
      usableDepthPercent: Math.round(battery.usableDepth * 100),
      solarEfficiencyPercent: Math.round(SOLAR_SYSTEM_EFFICIENCY * 100),
      solarMarginPercent: Math.round((SOLAR_MARGIN - 1) * 100)
    }
  };
}

function clampNumber(value, min, max, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}
