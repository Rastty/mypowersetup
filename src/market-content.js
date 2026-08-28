const SOLAR_RESERVE = 1.15;
const SOLAR_SYSTEM_EFFICIENCY = 0.75;

export const MARKET_CONTENT = Object.freeze({
  cs: {
    locale: "cs-CZ",
    primaryTerms: ["karavan", "obytné auto", "obytná dodávka"],
    solarScenarios: [
      { id: "weekend-off-grid", label: "Víkend na českém stání bez přípojky", dailyWh: 500, peakSunHours: 4.5, practicalWp: "200 Wp" },
      { id: "spring-mountains", label: "Jarní cesta po Česku a do hor", dailyWh: 650, peakSunHours: 3, practicalWp: "350–400 Wp" },
    ],
    batteryScenarios: [
      { id: "weekend-off-grid", label: "Víkend bez přípojky na českém stání", dailyWh: 450, autonomyDays: 2, practicalLifepo4Ah: "120–150 Ah" },
      { id: "existing-100ah", label: "Kontrola stávající 100Ah LiFePO₄", dailyWh: 600, autonomyDays: 2, practicalLifepo4Ah: "nejméně 150 Ah nebo průběžné dobíjení" },
    ],
    chargingScenarios: {
      dcDc: { label: "Přejezd mezi českými stáními", energyWh: 500, hours: 2.5, practicalA: "20 A" },
      shore: { label: "Jedna noc v českém kempu", energyWh: 1000, hours: 10, practicalA: "10 A" },
    },
  },
  sk: {
    locale: "sk-SK",
    primaryTerms: ["karavan", "obytné auto", "obytná dodávka"],
    solarScenarios: [
      { id: "reservoir-weekend", label: "Víkend pri vodnej nádrži bez prípojky", dailyWh: 500, peakSunHours: 4.5, practicalWp: "200 Wp" },
      { id: "spring-tatras", label: "Jarné cesty pod Tatrami", dailyWh: 650, peakSunHours: 3, practicalWp: "350–400 Wp" },
    ],
    batteryScenarios: [
      { id: "reservoir-weekend", label: "Dve noci pri vode bez prípojky", dailyWh: 450, autonomyDays: 2, practicalLifepo4Ah: "120–150 Ah" },
      { id: "cold-charging", label: "Jarné a zimné cesty v horách", dailyWh: 500, autonomyDays: 2, practicalLifepo4Ah: "aspoň 120 Ah s ochranou nabíjania v chlade" },
    ],
    chargingScenarios: {
      dcDc: { label: "Presun z nížiny pod Tatry", energyWh: 600, hours: 3, practicalA: "20 A" },
      shore: { label: "Víkend v termálnom kempe", energyWh: 1000, hours: 8, practicalA: "15 A" },
    },
  },
  pl: {
    locale: "pl-PL",
    primaryTerms: ["kamper", "przyczepa kempingowa", "campervan"],
    solarScenarios: [
      { id: "masuria-weekend", label: "Weekend na Mazurach bez podłączenia 230 V", dailyWh: 500, peakSunHours: 4.5, practicalWp: "200 Wp" },
      { id: "baltic-remote-work", label: "Praca z kampera nad Bałtykiem wiosną", dailyWh: 850, peakSunHours: 3, practicalWp: "450–500 Wp" },
    ],
    batteryScenarios: [
      { id: "trailer-weekend", label: "Weekend w przyczepie bez 230 V", dailyWh: 350, autonomyDays: 2, practicalLifepo4Ah: "około 100 Ah" },
      { id: "remote-work", label: "Dwa dni pracy z kampera", dailyWh: 900, autonomyDays: 2, practicalLifepo4Ah: "co najmniej 230 Ah lub codzienne ładowanie" },
    ],
    chargingScenarios: {
      dcDc: { label: "Długi przejazd między Mazurami a Bałtykiem", energyWh: 800, hours: 4, practicalA: "20 A" },
      shore: { label: "Noc na polskim kempingu", energyWh: 1200, hours: 10, practicalA: "15 A" },
    },
  },
  hu: {
    locale: "hu-HU",
    primaryTerms: ["lakóautó", "lakókocsi", "campervan"],
    solarScenarios: [
      { id: "balaton-summer", label: "Nyári hétvége a Balatonnál", dailyWh: 500, peakSunHours: 4.5, practicalWp: "200 Wp" },
      { id: "spring-hills", label: "Tavaszi utazás a hegyvidéken", dailyWh: 650, peakSunHours: 3, practicalWp: "350–400 Wp" },
    ],
    batteryScenarios: [
      { id: "balaton-heat", label: "Két forró nap a Balatonnál", dailyWh: 700, autonomyDays: 2, practicalLifepo4Ah: "legalább 170–200 Ah" },
      { id: "thermal-campsite", label: "Termálkemping rendszeres 230 V-os csatlakozással", dailyWh: 500, autonomyDays: 1, practicalLifepo4Ah: "60–100 Ah, megfelelő töltővel" },
    ],
    chargingScenarios: {
      dcDc: { label: "Rövid áthelyezés a Balaton körül", energyWh: 500, hours: 1.5, practicalA: "31 A, de az akkumulátor korlátja dönt" },
      shore: { label: "Éjszaka egy termálkempingben", energyWh: 1000, hours: 10, practicalA: "10 A" },
    },
  },
});

export function requiredSolarWp(dailyWh, peakSunHours) {
  if (!(dailyWh > 0) || !(peakSunHours > 0)) throw new RangeError("dailyWh and peakSunHours must be positive");
  return Math.ceil((dailyWh * SOLAR_RESERVE) / peakSunHours / SOLAR_SYSTEM_EFFICIENCY);
}

export function marketSolarScenarios(locale) {
  const market = MARKET_CONTENT[locale];
  if (!market) throw new RangeError(`Unsupported market: ${locale}`);
  return market.solarScenarios.map((scenario) => ({
    ...scenario,
    requiredWp: requiredSolarWp(scenario.dailyWh, scenario.peakSunHours),
  }));
}

export function requiredBatteryAh(dailyWh, autonomyDays, batteryType = "lifepo4", voltage = 12) {
  const usableRatio = batteryType === "lifepo4" ? 0.8 : batteryType === "lead" ? 0.5 : 0;
  if (!(dailyWh > 0) || !(autonomyDays > 0) || !(voltage > 0) || !usableRatio) throw new RangeError("Invalid battery sizing input");
  return Math.ceil((dailyWh * autonomyDays * 1.15) / usableRatio / voltage);
}

export function requiredChargingAmps(energyWh, hours, voltage = 12) {
  if (!(energyWh > 0) || !(hours > 0) || !(voltage > 0)) throw new RangeError("Invalid charging sizing input");
  return Math.ceil(energyWh / hours / voltage / 0.9);
}
