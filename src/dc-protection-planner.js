import { calculateDcCable } from "./dc-cable.js";

const STANDARD_FUSE_RATINGS_A = Object.freeze([5, 7.5, 10, 15, 20, 25, 30, 40, 50, 60, 70, 80, 100, 125, 150, 175, 200, 225, 250, 300, 350, 400]);

export function calculateDcProtectionPlan(input = {}) {
  const continuousCurrentA = clampNumber(input.continuousCurrentA, 1, 400, 30);
  const systemVoltage = normalizeVoltage(input.systemVoltage);
  const oneWayLengthM = clampNumber(input.oneWayLengthM, 0.5, 30, 5);
  const maxDropPercent = clampNumber(input.maxDropPercent, 1, 10, 3);
  const planningMarginPercent = clampNumber(input.planningMarginPercent, 100, 160, 125);
  const cableAmpacityA = clampNumber(input.cableAmpacityA, 1, 500, 60);
  const equipmentMaxFuseA = normalizeOptionalPositiveNumber(input.equipmentMaxFuseA, 1, 500);

  const designCurrentA = continuousCurrentA * (planningMarginPercent / 100);
  const protectionCeilingA = Math.min(cableAmpacityA, equipmentMaxFuseA ?? Number.POSITIVE_INFINITY);
  const recommendedFuseA = STANDARD_FUSE_RATINGS_A.find(
    (rating) => rating >= designCurrentA && rating <= protectionCeilingA,
  ) || null;

  const cable = calculateDcCable({
    systemVoltage,
    loadWatts: continuousCurrentA * systemVoltage,
    oneWayLengthM,
    maxDropPercent,
  });

  const warnings = [
    "Výpočet průřezu podle úbytku napětí neprokazuje tepelnou proudovou zatížitelnost. Tu ověřte pro konkrétní kabel, izolaci, teplotu, svazek a způsob uložení.",
    "Plánovací rezerva není univerzální normativní pravidlo. Hodnotu upravte podle výrobce zařízení, jištění a pravidel konkrétní instalace.",
    "Pojistka má chránit vodič a musí respektovat také maximální jištění zařízení. Umístění pojistky a zkratovou odolnost ověřte podle konkrétního obvodu.",
  ];

  if (designCurrentA > protectionCeilingA) {
    warnings.push("Při zadané rezervě není možné zvolit pojistku, která současně pokryje návrhový proud a nepřekročí proudovou zatížitelnost kabelu nebo limit zařízení.");
  } else if (recommendedFuseA == null) {
    warnings.push("V podporované řadě pojistek není vhodná hodnota. Návrh vodiče, jištění nebo rezervy je nutné změnit a znovu ověřit.");
  }

  return Object.freeze({
    continuousCurrentA,
    systemVoltage,
    oneWayLengthM,
    maxDropPercent,
    planningMarginPercent,
    designCurrentA: round(designCurrentA, 1),
    cableAmpacityA,
    equipmentMaxFuseA,
    protectionCeilingA: Number.isFinite(protectionCeilingA) ? round(protectionCeilingA, 1) : null,
    recommendedFuseA,
    feasible: recommendedFuseA != null,
    voltageDropSizing: Object.freeze({
      requiredMm2: cable.requiredMm2,
      recommendedMm2: cable.recommendedMm2,
      actualDropVolts: cable.actualDropVolts,
      actualDropPercent: cable.actualDropPercent,
    }),
    warnings: Object.freeze(warnings),
    assumptions: Object.freeze({
      fuseRatingsA: STANDARD_FUSE_RATINGS_A,
      cableAmpacityIsUserVerified: true,
      voltageDropSizingDoesNotProveAmpacity: true,
    }),
  });
}

function normalizeVoltage(value) {
  return value === 24 || value === "24" ? 24 : 12;
}

function normalizeOptionalPositiveNumber(value, min, max) {
  if (value === "" || value == null) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return Math.min(max, Math.max(min, parsed));
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
