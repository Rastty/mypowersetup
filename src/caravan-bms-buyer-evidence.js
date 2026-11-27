// Caravan purchase-specific evidence ranking and buyer disclosure.
// Reuse the stable shared estimator without changing PT/RO/SI public safety
// module URLs. Source provenance and battery Ah must never stand in for a
// reviewed BMS continuous-discharge rating.
import { minimumBatteryDischargeAmps, advertisedBatteryBmsAmps, batteryBmsLoadWithinAdvertisedLimit } from "./battery-discharge-safety.js?v=20261117-bms-load1";
import { verifiedBatteryContinuousDischargeAmps } from "./caravan-bms-manufacturer-proof.js?v=20261122-pq200a1-24vhigh1-pq100a1";

// Manufacturer facts must be reviewed for the exact already-approved product
// identity. A merchant feed's verifiedAt or numeric specs field is not proof.
// Unreviewed values remain available only as conservative incompatibility gates.
export function documentedBatteryContinuousBmsAmps(product) {
  return verifiedBatteryContinuousDischargeAmps(product);
}

// An explicitly labeled continuous discharge limit below the estimated
// inverter draw is a known incompatibility, even if the feed row is not yet
// sufficiently independently reviewed to promote it as positive evidence.
export function batteryContinuousLimitNotBelowRequirement(product, setup) {
  const minimum = minimumBatteryDischargeAmps(setup);
  if (minimum === null) return true;
  const specified = product?.category === "battery" ? product.specs?.bmsContinuousCurrentA : null;
  return !(typeof specified === "number" && Number.isFinite(specified)
    && specified > 0 && specified < minimum);
}

// When the user actually needs AC inverter power, put batteries with an
// explicit, adequate discharge rating before otherwise similar unknown-BMS
// products. '100 A BMS' in a title is weaker evidence than a reviewed
// continuous-discharge specification and NEVER proves continuous capability.
export function batteryDischargeEvidenceTier(product, setup) {
  const minimum = minimumBatteryDischargeAmps(setup);
  if (minimum === null || !batteryBmsLoadWithinAdvertisedLimit(product, setup) || !batteryContinuousLimitNotBelowRequirement(product, setup)) return 0;
  const documented = documentedBatteryContinuousBmsAmps(product);
  if (documented !== null && documented >= minimum) return 2;
  const advertised = advertisedBatteryBmsAmps(product);
  return advertised !== null && advertised >= minimum ? 1 : 0;
}

const BUYER_COPY = Object.freeze({
  cs: {
    documented: (a, required) => `Výrobce doporučuje pro trvalý provoz ${a} A (potřeba ≥ ${required} A). Vyšší krátkodobé maximum není pro dlouhý odběr.`,
    maxContinuous: (a, required) => `Výrobce uvádí maximální trvalý vybíjecí proud ${a} A (potřeba ≥ ${required} A), nikoli proud podle kapacity v Ah. Při rozběhové špičce měniče může BMS baterii odpojit.`,
    advertised: (a, required) => `Název uvádí BMS ${a} A, ale trvalý výboj není doložen. Ověřte nejméně ${required} A.`,
    unknown: (required) => `Trvalý vybíjecí proud BMS není doložen. Ověřte nejméně ${required} A v datasheetu.`,
  },
  sk: {
    documented: (a, required) => `Výrobca odporúča na trvalú prevádzku ${a} A (potreba ≥ ${required} A). Vyššie krátkodobé maximum neplatí pre dlhý odber.`,
    maxContinuous: (a, required) => `Výrobca uvádza maximálny trvalý vybíjací prúd ${a} A (potreba ≥ ${required} A), nie prúd podľa kapacity Ah. Pri rozbehovom prúde meniča môže BMS batériu odpojiť.`,
    advertised: (a, required) => `Názov uvádza BMS ${a} A, no trvalé vybíjanie nie je doložené. Overte aspoň ${required} A.`,
    unknown: (required) => `Trvalý vybíjací prúd BMS nie je doložený. Overte aspoň ${required} A v dokumentácii.`,
  },
  pl: {
    documented: (a, required) => `Producent zaleca do pracy ciągłej ${a} A (wymagane ≥ ${required} A). Wyższy krótkotrwały limit nie dotyczy długiego obciążenia.`,
    maxContinuous: (a, required) => `Producent podaje maksymalny ciągły prąd rozładowania ${a} A (wymagane ≥ ${required} A), a nie prąd wynikający z pojemności Ah. Prąd rozruchowy przetwornicy może spowodować odłączenie przez BMS.`,
    advertised: (a, required) => `Nazwa podaje BMS ${a} A, lecz prąd ciągły nie jest potwierdzony. Sprawdź co najmniej ${required} A.`,
    unknown: (required) => `Brak potwierdzonego prądu ciągłego BMS. Sprawdź co najmniej ${required} A w karcie producenta.`,
  },
});

export function batteryDischargeBuyerCheck(product, setup, locale = setup?.locale || "cs") {
  const minimum = minimumBatteryDischargeAmps(setup);
  if (minimum === null) return null;
  const t = BUYER_COPY[locale] || BUYER_COPY.cs;
  const continuous = documentedBatteryContinuousBmsAmps(product);
  if (continuous !== null) return product?.specs?.bmsEvidenceKind === "manufacturer_max_continuous"
    ? t.maxContinuous(continuous, minimum) : t.documented(continuous, minimum);
  const named = advertisedBatteryBmsAmps(product);
  return named !== null ? t.advertised(named, minimum) : t.unknown(minimum);
}

