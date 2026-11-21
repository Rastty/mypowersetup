// Manufacturer-documented charging chemistry for exact approved merchant SKUs.
// Never infer this from a generic "Orion" brand match, fuzzy description,
// another input/output voltage, or a different unverified dealer product.
// These are battery charger capabilities, not an electrical installation approval.
const VERIFIED = Object.freeze({
  "padabo_sk:101357": { model: /\bOrion\s+XS\s+12\s*\/\s*12\s*[-–]\s*50\s*A\b/i, input: 12, output: 12, current: 50, source: "https://www.victronenergy.com/media/pg/Orion_XS_12-12-50A_DC-DC_battery_charger/en/operation%2C-configuration-and-monitoring.html" },
  "padabo_pl:101357": { model: /\bOrion\s+XS\s+12\s*\/\s*12\s*[-–]\s*50\s*A\b/i, input: 12, output: 12, current: 50, source: "https://www.victronenergy.com/media/pg/Orion_XS_12-12-50A_DC-DC_battery_charger/en/operation%2C-configuration-and-monitoring.html" },
  "padabo_sk:26963_28360": { model: /\bOrion[\s-]*Tr\s+Smart\b.*\b12\s*\/\s*12\s*V\b.*\b30\s*A\b/i, input: 12, output: 12, current: 30, source: "https://www.victronenergy.com/dc-dc-converters/orion-tr-smart-non-isolated" },
});

function equalsKnownSingleVoltage(values, expected) {
  return Array.isArray(values) && values.length === 1 && values[0] === expected;
}

export function addVerifiedVictronChargingProfiles(product, specs) {
  const evidence = VERIFIED[product?.id];
  if (!evidence || product.category !== "dc_charger"
    || !product.merchant || product.id.split(":")[0] !== product.merchant
    || !evidence.model.test(String(product.name || ""))
    || Number(specs.currentA) !== evidence.current
    || !equalsKnownSingleVoltage(specs.chargingInputVoltagesV, evidence.input)
    || !equalsKnownSingleVoltage(specs.chargingVoltagesV, evidence.output)) return specs;

  // The manufacturer documents configurable LiFePO4 and lead-acid charging.
  // This is a model-specific technical specification, not live stock evidence.
  return {
    ...specs,
    chargingBatteryTypes: ["lifepo4", "lead"],
    chargingProfileEvidenceUrl: evidence.source,
  };
}
