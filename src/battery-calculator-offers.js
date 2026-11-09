import { selectGuideOffers } from "./guide-verified-offers.js";

// Exact-SKU, fresh-feed battery shortlist for the existing CZ capacity calculator.
// No parallel strings, series wiring, BMS loads or unverified battery chemistry
// are inferred. A 12V single battery must independently cover required Ah.
export function selectBatteryCalculatorOffers(payload, result, now = Date.now()) {
  const volts = Number(result?.systemVoltage);
  const ah = Number(result?.batteryAh);
  const batteryWh = Number(result?.batteryWh);
  if (volts !== 12 || result?.batteryType !== "lifepo4" ||
      !Number.isSafeInteger(ah) || ah < 10 || ah > 2000 || ah % 10 !== 0 ||
      !Number.isFinite(batteryWh) || batteryWh <= 0 ||
      !Number.isSafeInteger(Number(result?.dailyWh)) ||
      Number(result?.dailyWh) < 50 || Number(result?.dailyWh) > 20000 ||
      !Number.isInteger(Number(result?.autonomyDays)) ||
      Number(result?.autonomyDays) < 1 || Number(result?.autonomyDays) > 7)
    return [];

  return selectGuideOffers(payload, "battery", now)
    .filter(({ specs }) =>
      Number(specs?.voltageV) === 12 &&
      specs?.batteryType === "lifepo4" &&
      Number.isFinite(Number(specs?.capacityAh)) &&
      Number(specs.capacityAh) >= ah &&
      Number.isFinite(Number(specs?.bmsContinuousCurrentA)) &&
      Number(specs.bmsContinuousCurrentA) > 0
    )
    .sort((a, b) => a.specs.capacityAh - b.specs.capacityAh ||
      a.priceCzk - b.priceCzk || a.id.localeCompare(b.id))
    .slice(0, 3);
}

export function batteryOfferExpiresAt(payload, offer) {
  const generated = Date.parse(payload?.generatedAt);
  const observed = Date.parse(offer?.offerObservedAt);
  if (!Number.isFinite(generated) || !Number.isFinite(observed)) return null;
  return Math.min(generated, observed) + 72 * 60 * 60 * 1000;
}

export function isBatteryOfferStillEligible(payload, result, offer, now = Date.now()) {
  return selectBatteryCalculatorOffers(payload, result, now).some(candidate => candidate === offer);
}
