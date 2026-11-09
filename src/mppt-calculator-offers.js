import { selectGuideOffers } from "./guide-verified-offers.js";

// A narrow first-filter for three independently reviewed Victron exact SKUs.
// The calculator does not ask for panel string Voc/Isc or installation details:
// no returned product can be asserted fully electrically compatible.
export function selectMpptCalculatorOffers(payload, calculation, now = Date.now()) {
  const watts = Number(calculation?.panelWatts);
  const amps = Number(calculation?.controllerAmps);
  const voltage = Number(calculation?.systemVoltage);
  const chemistry = calculation?.batteryType;
  if (!Number.isSafeInteger(watts) || watts < 50 || watts > 5000 || watts % 10 !== 0 ||
      !Number.isSafeInteger(amps) || amps < 10 || amps > 500 || amps % 10 !== 0 ||
      ![12, 24].includes(voltage) || !["lifepo4", "lead"].includes(chemistry))
    return [];

  return selectGuideOffers(payload, "controller", now)
    .filter(({ specs }) => {
      const current = Number(specs?.currentA);
      const maxPv = Number(specs?.maxPvWattsBySystemVoltage?.[voltage]);
      const voc = Number(specs?.maxPvVocV);
      const isc = Number(specs?.maxPvIscA);
      return Number.isFinite(current) && current >= amps &&
        Number.isFinite(maxPv) && maxPv >= watts &&
        Number.isFinite(voc) && voc > 0 &&
        Number.isFinite(isc) && isc > 0 &&
        Array.isArray(specs?.systemVoltagesV) && specs.systemVoltagesV.includes(voltage);
    })
    // This is a minimum-adequacy shortlist, not merchant-commission ranking.
    .sort((a, b) => a.specs.currentA - b.specs.currentA || a.priceCzk - b.priceCzk)
    .slice(0, 3);
}

export function mpptOfferExpiresAt(payload, offer) {
  const generation = Date.parse(payload?.generatedAt);
  const observation = Date.parse(offer?.offerObservedAt);
  if (!Number.isFinite(generation) || !Number.isFinite(observation)) return null;
  // Same independent 72h evidence limit as the shared approved-SKU gate.
  return Math.min(generation, observation) + 72 * 60 * 60 * 1000;
}

export function isMpptOfferStillEligible(payload, calculation, offer, now = Date.now()) {
  return selectMpptCalculatorOffers(payload, calculation, now).some((candidate) => candidate === offer);
}
