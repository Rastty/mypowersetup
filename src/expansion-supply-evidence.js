// A completed, validated market catalog is evidence of a missing offer match.
// Network/catalog failures are NOT proof that any product category is absent.
// One bounded outcome event per deliberate calculation, using built-in GA4
// eventName so no optional custom dimensions or personal electrical inputs
// are required to compare PT/RO/SI buyer-intent cohorts.
export const EXPANSION_SUPPLY_EVENTS = Object.freeze({
  complete: "expansion_supply_complete",
  inverterMissing: "expansion_supply_inverter_missing",
  otherMissing: "expansion_supply_other_missing",
  unavailable: "expansion_supply_unavailable",
});

// A shared result URL renders automatically on page load. It may be opened by
// someone who has not chosen to calculate anything (or by a crawler). Keep
// that useful preview, but never count it as a deliberate buyer calculation.
export function isDeliberateExpansionCalculation(source) {
  return source === "form_submit";
}

export function classifyExpansionSupplyOutcome(priority) {
  const coverage = priority?.coverage;
  if (typeof coverage?.complete !== "boolean" || !Array.isArray(coverage.missing))
    throw new Error("EXPANSION_SUPPLY_COVERAGE_NOT_VERIFIED");
  if (coverage.complete) return "complete";
  return coverage.missing.includes("inverter") ? "inverterMissing" : "otherMissing";
}

export function expansionSupplyEventName(outcome) {
  if (!Object.hasOwn(EXPANSION_SUPPLY_EVENTS, outcome)) throw new Error("EXPANSION_SUPPLY_OUTCOME_UNKNOWN");
  return EXPANSION_SUPPLY_EVENTS[outcome];
}
