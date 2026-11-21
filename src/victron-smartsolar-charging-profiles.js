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

export function addVerifiedSmartSolarChargingProfiles(product, specs) {
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
