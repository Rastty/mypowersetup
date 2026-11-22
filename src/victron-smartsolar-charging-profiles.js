// Manufacturer-backed LiFePO4 charge-preset evidence for EXACT approved Czech
// VSelektro MPPT product IDs and reviewed dealer titles. This is controller
// capability, not proof of the battery/BMS settings or installation safety.
const MANUAL_30_50 = "https://www.victronenergy.com/media/pg/Manual_SmartSolar_MPPT_100-30__100-50/en/configuration-and-settings.html";
const MANUAL_20 = "https://www.victronenergy.com/media/pg/Manual_SmartSolar_MPPT_75-10_up_to_100-20/en/configuration-and-settings.html";

const VERIFIED = Object.freeze({
  "vselektro:victron-smartsolar-100-30": {
    name: "Solární regulátor Victron Energy MPPT, SmartSolar - 100V/30A",
    current: 30, systemVoltages: [12,24], manual: MANUAL_30_50,
  },
  "vselektro:victron-smartsolar-100-50": {
    name: "Solární regulátor Victron Energy MPPT, SmartSolar - 100V/50A",
    current: 50, systemVoltages: [12,24], manual: MANUAL_30_50,
  },
  "vselektro:victron-smartsolar-100-20": {
    name: "Solární regulátor Victron Energy MPPT, SmartSolar - 100V/20A",
    current: 20, systemVoltages: [12,24,48], manual: MANUAL_20,
  },
});


// The approved CZ/SK/PL merchant feeds carry exact 100/30 and 100/50 product
// landing pages, unlike its shared 75/10–100/20 variant landing. Preserve the
// strict SKU/merchant/URL and eHub attribution boundary before adding specs.
const APPROVED_DEALER = Object.freeze({
  // Exact approved SvětKaravanů CZK affiliate listings already present in
  // the live seller feed. Unlike the shared 75/10–100/20 variant page,
  // 100/30 and 100/50 have distinct item-specific landing pages.
  "svetkaravanu:24828": {
    merchant: "svetkaravanu", currency: "CZK", bid: "38137ac4", current: 30,
    name: "MPPT solární regulátor Victron SmartSolar 100/30",
    url: "https://www.svetkaravanu.cz/mppt-solarni-regulator-victron-smartsolar-100-30_z24828/",
  },
  "svetkaravanu:101985": {
    merchant: "svetkaravanu", currency: "CZK", bid: "38137ac4", current: 50,
    name: "MPPT solární regulátor Victron Energy SmartSolar 100/50",
    url: "https://www.svetkaravanu.cz/mppt-solarni-regulator-victron-energy-smartsolar-100-50_z101985/",
  },
  "padabo_sk:24828": {
    merchant: "padabo_sk", currency: "EUR", bid: "7aed5c13", current: 30,
    name: "Solárny regulátor MPPT Victron Energy SmartSolar 100/30",
    url: "https://www.padabo.sk/solarny-regulator-mppt-victron-energy-smartsolar-100-30_z24828/",
  },
  "padabo_sk:101985": {
    merchant: "padabo_sk", currency: "EUR", bid: "7aed5c13", current: 50,
    name: "Solárny regulátor MPPT Victron Energy SmartSolar 100/50",
    url: "https://www.padabo.sk/solarny-regulator-mppt-victron-energy-smartsolar-100-50_z101985/",
  },
  "padabo_pl:24828": {
    merchant: "padabo_pl", currency: "PLN", bid: "95d61abf", current: 30,
    name: "MPPT regulator solarny Victron SmartSolar 100/30",
    url: "https://www.padabo.pl/mppt-regulator-solarny-victron-smartsolar-100-30_z24828/",
  },
  "padabo_pl:101985": {
    merchant: "padabo_pl", currency: "PLN", bid: "95d61abf", current: 50,
    name: "Kontroler słoneczny MPPT Victron Energy SmartSolar 100/50",
    url: "https://www.padabo.pl/kontroler-sloneczny-mppt-victron-energy-smartsolar-100-50_z101985/",
  },
});

function validApprovedSmartSolar(product, specs, record) {
  if (!record || product?.merchant !== record.merchant || product?.category !== "controller"
    || product.name !== record.name || product.priceCurrency !== record.currency
    || product.productUrl !== record.url || Number(specs?.currentA) !== record.current
    // Never attach manufacturer proof to an out-of-stock or stale CZ SKU.
    // SK/PL legacy profiles retain their original validation contract.
    || (record.merchant === "svetkaravanu" && (product.available !== true
      || product.staleSource === true || !Number.isFinite(product.priceCzk)
      || product.priceCzk <= 0))) return false;
  const power = record.current === 30 ? { 12: 440, 24: 880 } : { 12: 700, 24: 1400 };
  const isc = record.current === 30 ? 35 : 60;
  if (specs.maxPvVocV != null && specs.maxPvVocV !== 100
    || specs.maxPvIscA != null && specs.maxPvIscA !== isc
    || Array.isArray(specs.systemVoltagesV) && specs.systemVoltagesV.length
      && (specs.systemVoltagesV.length !== 2
        || ![12,24].every(voltage => specs.systemVoltagesV.includes(voltage)))
    || specs.maxPvWattsBySystemVoltage != null
      && Object.keys(specs.maxPvWattsBySystemVoltage).some(voltage =>
        !Object.hasOwn(power, voltage) || Number(specs.maxPvWattsBySystemVoltage[voltage]) !== power[voltage])) return false;
  try {
    const url = new URL(product.affiliateUrl);
    return url.origin === "https://ehub.cz" && url.pathname === "/system/scripts/click.php"
      && !url.username && !url.password && !url.hash
      && [...url.searchParams.keys()].every(key => ["a_aid", "a_bid", "desturl"].includes(key))
      && ["a_aid", "a_bid", "desturl"].every(key => url.searchParams.getAll(key).length === 1)
      && url.searchParams.get("a_aid") === "f34c86c8"
      && url.searchParams.get("a_bid") === record.bid
      && url.searchParams.get("desturl") === record.url;
  } catch { return false; }
}

export function addVerifiedSmartSolarChargingProfiles(product, specs) {
  const dealer = APPROVED_DEALER[product?.id];
  if (validApprovedSmartSolar(product, specs, dealer)) {
    const watts = dealer.current === 30 ? { 12: 440, 24: 880 } : { 12: 700, 24: 1400 };
    return {
      ...specs,
      maxPvVocV: 100,
      maxPvIscA: dealer.current === 30 ? 35 : 60,
      systemVoltagesV: [12, 24],
      maxPvWattsBySystemVoltage: watts,
      chargingBatteryTypes: ["lifepo4", "lead"],
      chargingProfileEvidenceUrl: MANUAL_30_50,
    };
  }

  const record = VERIFIED[product?.id];
  if (!record || product.merchant !== "vselektro" || product.category !== "controller"
    || !product.verifiedAt || product.name !== record.name
    || Number(specs?.currentA) !== record.current
    || Number(specs?.maxPvVocV) !== 100
    || !Array.isArray(specs?.systemVoltagesV)
    || specs.systemVoltagesV.length !== record.systemVoltages.length
    || record.systemVoltages.some((voltage) => !specs.systemVoltagesV.includes(voltage))) return specs;

  // Supports a selectable LiFePO4 preset as documented by Victron Energy;
  // charging remains subject to battery maker, BMS and temperature limits.
  return {
    ...specs,
    chargingBatteryTypes: ["lifepo4", "lead"],
    chargingProfileEvidenceUrl: record.manual,
  };
}
