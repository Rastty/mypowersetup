const STANDARD_CROSS_SECTIONS_MM2 = [1.5, 2.5, 4, 6, 10, 16, 25, 35, 50, 70, 95, 120];
const COPPER_RESISTIVITY_OHM_MM2_PER_M = 0.0175;

export function calculateBatteryCablePlan({
  inverterWatts,
  systemVoltage,
  oneWayLengthMeters,
  inverterEfficiency = 0.9,
  maxVoltageDropPercent = 2.5,
}) {
  if (!inverterWatts) return null;
  const watts = Number(inverterWatts);
  const voltage = Number(systemVoltage);
  const length = Number(oneWayLengthMeters);
  if (!Number.isFinite(watts) || watts <= 0 || ![12, 24].includes(voltage)) return null;
  if (!Number.isFinite(length) || length < 0.2 || length > 10) return null;

  const designCurrentAmps = watts / (voltage * inverterEfficiency);
  const maxDropVolts = voltage * (maxVoltageDropPercent / 100);
  const requiredCrossSectionMm2 = (2 * length * designCurrentAmps
    * COPPER_RESISTIVITY_OHM_MM2_PER_M) / maxDropVolts;
  const recommendedCrossSectionMm2 = STANDARD_CROSS_SECTIONS_MM2
    .find((size) => size >= requiredCrossSectionMm2) || null;
  const estimatedDropPercent = recommendedCrossSectionMm2
    ? ((2 * length * designCurrentAmps * COPPER_RESISTIVITY_OHM_MM2_PER_M
      / recommendedCrossSectionMm2) / voltage) * 100
    : null;

  return {
    oneWayLengthMeters: length,
    designCurrentAmps: Math.ceil(designCurrentAmps),
    requiredCrossSectionMm2: Math.round(requiredCrossSectionMm2 * 10) / 10,
    recommendedCrossSectionMm2,
    estimatedDropPercent: estimatedDropPercent === null
      ? null
      : Math.round(estimatedDropPercent * 10) / 10,
    maxVoltageDropPercent,
    basis: "voltage-drop-only",
  };
}
