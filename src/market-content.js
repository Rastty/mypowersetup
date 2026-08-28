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
  },
  sk: {
    locale: "sk-SK",
    primaryTerms: ["karavan", "obytné auto", "obytná dodávka"],
    solarScenarios: [
      { id: "reservoir-weekend", label: "Víkend pri vodnej nádrži bez prípojky", dailyWh: 500, peakSunHours: 4.5, practicalWp: "200 Wp" },
      { id: "spring-tatras", label: "Jarné cesty pod Tatrami", dailyWh: 650, peakSunHours: 3, practicalWp: "350–400 Wp" },
    ],
  },
  pl: {
    locale: "pl-PL",
    primaryTerms: ["kamper", "przyczepa kempingowa", "campervan"],
    solarScenarios: [
      { id: "masuria-weekend", label: "Weekend na Mazurach bez podłączenia 230 V", dailyWh: 500, peakSunHours: 4.5, practicalWp: "200 Wp" },
      { id: "baltic-remote-work", label: "Praca z kampera nad Bałtykiem wiosną", dailyWh: 850, peakSunHours: 3, practicalWp: "450–500 Wp" },
    ],
  },
  hu: {
    locale: "hu-HU",
    primaryTerms: ["lakóautó", "lakókocsi", "campervan"],
    solarScenarios: [
      { id: "balaton-summer", label: "Nyári hétvége a Balatonnál", dailyWh: 500, peakSunHours: 4.5, practicalWp: "200 Wp" },
      { id: "spring-hills", label: "Tavaszi utazás a hegyvidéken", dailyWh: 650, peakSunHours: 3, practicalWp: "350–400 Wp" },
    ],
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
