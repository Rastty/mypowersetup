const COPPER_RESISTIVITY_OHM_MM2_PER_M = 0.0175;
const STANDARD_CABLE_SIZES_MM2 = Object.freeze([1.5, 2.5, 4, 6, 10, 16, 25, 35, 50, 70, 95, 120]);

export function calculateDcCable(input = {}) {
  const systemVoltage = normalizeVoltage(input.systemVoltage);
  const loadWatts = clampNumber(input.loadWatts, 10, 10000, 500);
  const oneWayLengthM = clampNumber(input.oneWayLengthM, 0.5, 30, 5);
  const maxDropPercent = clampNumber(input.maxDropPercent, 1, 10, 3);
  const currentAmps = loadWatts / systemVoltage;
  const maxDropVolts = systemVoltage * (maxDropPercent / 100);
  const requiredMm2 = (2 * oneWayLengthM * currentAmps * COPPER_RESISTIVITY_OHM_MM2_PER_M) / maxDropVolts;
  const recommendedMm2 = STANDARD_CABLE_SIZES_MM2.find((size) => size >= requiredMm2) || null;

  const warnings = [];
  if (!recommendedMm2) {
    warnings.push("Požadovaný průřez přesahuje běžnou tabulku do 120 mm². Zkraťte trasu, snižte výkon nebo použijte vyšší systémové napětí a návrh ověřte s elektrikářem.");
  }

  const actualDropVolts = recommendedMm2
    ? (2 * oneWayLengthM * currentAmps * COPPER_RESISTIVITY_OHM_MM2_PER_M) / recommendedMm2
    : null;
  const actualDropPercent = actualDropVolts == null ? null : (actualDropVolts / systemVoltage) * 100;

  return Object.freeze({
    loadWatts,
    systemVoltage,
    oneWayLengthM,
    maxDropPercent,
    currentAmps: round(currentAmps, 1),
    requiredMm2: round(requiredMm2, 2),
    recommendedMm2,
    actualDropVolts: actualDropVolts == null ? null : round(actualDropVolts, 2),
    actualDropPercent: actualDropPercent == null ? null : round(actualDropPercent, 2),
    warnings: Object.freeze(warnings),
    assumptions: Object.freeze({
      conductor: "copper",
      resistivityOhmMm2PerM: COPPER_RESISTIVITY_OHM_MM2_PER_M,
      circuitLengthMultiplier: 2,
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
