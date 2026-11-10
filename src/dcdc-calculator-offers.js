import { selectGuideOffers } from "./guide-verified-offers.js";

// Exact-SKU facts from the independently reviewed VseElektro feed allowlist.
// The small public projection intentionally excludes unverified mutable
// "specs", so do not infer output current or isolation from product names.
const REVIEWED_DCDC = Object.freeze({
  "vselektro:victron-orion-tr-12-12-18-isolated": Object.freeze({ outputA: 18, isolation: "izolovaná" }),
  "vselektro:victron-orion-tr-12-12-30-isolated": Object.freeze({ outputA: 30, isolation: "izolovaná" }),
  "vselektro:victron-orion-tr-12-12-30-nonisolated": Object.freeze({ outputA: 30, isolation: "neizolovaná" }),
  "vselektro:victron-orion-xs-12-12-50-nonisolated": Object.freeze({ outputA: 50, isolation: "neizolovaná" }),
});
const MAX_FEED_AGE_MS = 72 * 60 * 60 * 1000;

// This is a shortlist to *compare*, never a compatibility verdict. All four
// reviewed models are nominal 12 V input -> 12 V battery output. The form
// captures source voltage while charging, not the source nominal voltage.
// Therefore only the unambiguous 12 V charging window may show purchase
// links. An arbitrary 24 V/ambiguous source never gets a 12-to-12 offer.
export function supportsDcdcBuyerShortlist(result) {
  return result?.batteryVoltage === 12
    && Number.isFinite(result?.sourceVoltage)
    && result.sourceVoltage >= 12.5
    && result.sourceVoltage <= 15.5
    && Number.isFinite(result?.feasibleOutputCurrentA)
    && result.feasibleOutputCurrentA > 0
    && Number.isFinite(result?.batteryMaxChargeCurrentA)
    && result.batteryMaxChargeCurrentA > 0
    && Number.isFinite(result?.recommendedChargerCurrentA)
    && result.recommendedChargerCurrentA > 0
    && Number.isFinite(result?.spareAlternatorCurrentA)
    && result.spareAlternatorCurrentA > 0;
}

export function selectDcdcCalculatorOffers(payload, result, now = Date.now()) {
  if (!supportsDcdcBuyerShortlist(result)) return [];
  // The calculator publishes a one-decimal feasible current for display.
  // Recompute the unrounded alternator ceiling so a 17.96 A actual limit
  // cannot accidentally authorize an 18 A product after rounding to 18.0.
  const unroundedAlternatorOutputA = (
    result.spareAlternatorCurrentA * result.sourceVoltage *
    (result.efficiencyPercent / 100)
  ) / result.batteryVoltage;
  if (!Number.isFinite(unroundedAlternatorOutputA) || unroundedAlternatorOutputA <= 0) return [];
  const ceiling = Math.min(
    result.feasibleOutputCurrentA,
    result.batteryMaxChargeCurrentA,
    result.recommendedChargerCurrentA,
    unroundedAlternatorOutputA,
  );
  return selectGuideOffers(payload, "dc_charger", now)
    .filter(offer => REVIEWED_DCDC[offer.id]?.outputA <= ceiling + 1e-9)
    .sort((left, right) => REVIEWED_DCDC[right.id].outputA - REVIEWED_DCDC[left.id].outputA
      || left.id.localeCompare(right.id));
}

export function dcdcReviewedModel(id) {
  return REVIEWED_DCDC[id] || null;
}

// An offer may be within the allowed electrical current yet too slow for the
// user's requested drive time. Compare exact (unrounded) battery Ah, charge
// fraction and current: the sizing engine's displayed current is rounded.
// This is an ideal constant-current lower bound, not a real-world ETA: BMS,
// temperature and the absorption phase may lengthen actual charging.
export function dcdcOfferDriveTime(result, offer) {
  const outputA = REVIEWED_DCDC[offer?.id]?.outputA;
  const batteryAh = result?.batteryCapacityAh;
  const replenishPercent = result?.replenishPercent;
  const targetDriveHours = result?.targetDriveHours;
  if (![outputA, batteryAh, replenishPercent, targetDriveHours].every(
    value => Number.isFinite(value) && value > 0
  ) || replenishPercent > 100) return null;
  const neededAh = batteryAh * replenishPercent / 100;
  const minimumHours = neededAh / outputA;
  if (!Number.isFinite(minimumHours) || minimumHours <= 0) return null;
  return Object.freeze({
    outputA,
    minimumHours,
    // Never round the minimum down: 3.33 hours should display "at least 3.4".
    displayedMinimumHours: Math.ceil(minimumHours * 10 - 1e-10) / 10,
    targetDriveHours,
    meetsIdealTarget: neededAh <= outputA * targetDriveHours + 1e-9,
  });
}

export function dcdcCalculatorOfferExpiresAt(payload, offer) {
  if (!payload || !offer) return null;
  const expiresAt = Math.min(Date.parse(payload.generatedAt), Date.parse(offer.offerObservedAt)) + MAX_FEED_AGE_MS;
  return Number.isFinite(expiresAt) ? expiresAt : null;
}

export function isDcdcOfferStillEligible(payload, result, offer, now = Date.now()) {
  return selectDcdcCalculatorOffers(payload, result, now).some(item => item === offer);
}
