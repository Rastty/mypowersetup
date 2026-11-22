// Manufacturer-documented charging chemistry for exact approved merchant SKUs.
// Never infer this from a generic "Orion" brand match, fuzzy description,
// another input/output voltage, or a different unverified dealer product.
// These are battery charger capabilities, not an electrical installation approval.
const VERIFIED = Object.freeze({
  "padabo_sk:101357": { model: /\bOrion\s+XS\s+12\s*\/\s*12\s*[-–]\s*50\s*A\b/i, input: 12, output: 12, current: 50, source: "https://www.victronenergy.com/media/pg/Orion_XS_12-12-50A_DC-DC_battery_charger/en/operation%2C-configuration-and-monitoring.html" },
  "padabo_pl:101357": { model: /\bOrion\s+XS\s+12\s*\/\s*12\s*[-–]\s*50\s*A\b/i, input: 12, output: 12, current: 50, source: "https://www.victronenergy.com/media/pg/Orion_XS_12-12-50A_DC-DC_battery_charger/en/operation%2C-configuration-and-monitoring.html" },
  "padabo_sk:26963_28360": { model: /\bOrion[\s-]*Tr\s+Smart\b.*\b12\s*\/\s*12\s*V\b.*\b30\s*A\b/i, input: 12, output: 12, current: 30, source: "https://www.victronenergy.com/dc-dc-converters/orion-tr-smart-non-isolated" },
  "padabo_pl:26963_28360": { model: /\bOrion[\s-]*Tr\s+Smart\b.*\b12\s*\/\s*12\s*V\b.*\b30\s*A\b/i, input: 12, output: 12, current: 30, source: "https://www.victronenergy.com/dc-dc-converters/orion-tr-smart-non-isolated" },
});


// The official 12/12-30A Smart non-isolated chemistry claim is valid only for
// these two approved, exactly identified local listings. A feed title, a
// lookalike variant, a swapped currency or an altered tracking URL cannot
// inherit the manufacturer's LiFePO4 capability.
const ORION_TR_LOCAL_OFFERS = Object.freeze({
  "padabo_sk:26963_28360": {
    merchant:"padabo_sk", currency:"EUR", bid:"7aed5c13",
    name:"Nabíjačka Victron Energy Orion-Tr Smart DC-DC neizolovaná variant 12/12 V, 30 A",
    url:"https://www.padabo.sk/nabijacka-victron-energy-orion-tr-smart-dc-dc-neizolovana_z26963/",
  },
  "padabo_pl:26963_28360": {
    merchant:"padabo_pl", currency:"PLN", bid:"95d61abf",
    name:"Ładowarka Victron Energy Orion-Tr Smart DC-DC nieizolowana wersja 12/12 V, 30 A",
    url:"https://www.padabo.pl/ladowarka-victron-energy-orion-tr-smart-dc-dc-nieizolowana_z26963/",
  },
});
function reviewedOrionTrLocalOffer(product) {
  if (!Object.hasOwn(ORION_TR_LOCAL_OFFERS,product?.id) || product.available !== true) return false;
  const known=ORION_TR_LOCAL_OFFERS[product.id];
  if (product.merchant !== known.merchant || product.priceCurrency !== known.currency
    || product.name !== known.name || product.productUrl !== known.url) return false;
  try {
    const url=new URL(product.affiliateUrl);
    if (url.origin !== "https://ehub.cz" || url.pathname !== "/system/scripts/click.php"
      || url.username || url.password || url.hash || url.searchParams.size !== 3
      || ["a_aid","a_bid","desturl"].some(k=>url.searchParams.getAll(k).length !== 1)
      || url.searchParams.get("a_aid") !== "f34c86c8"
      || url.searchParams.get("a_bid") !== known.bid
      || url.searchParams.get("desturl") !== known.url) return false;
  } catch { return false; }
  return true;
}

function equalsKnownSingleVoltage(values, expected) {
  return Array.isArray(values) && values.length === 1 && values[0] === expected;
}

export function addVerifiedVictronChargingProfiles(product, specs) {
  const evidence = VERIFIED[product?.id];
  if (!evidence || (Object.hasOwn(ORION_TR_LOCAL_OFFERS, product?.id) && !reviewedOrionTrLocalOffer(product))
    || product.category !== "dc_charger"
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
