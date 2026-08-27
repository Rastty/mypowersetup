const VERDICT_TEXT = {
  cs: {
    lead: (voltage) => `Pro tento způsob cestování doporučujeme ${voltage}V sestavu:`,
    battery: (result) => `baterii ${result.batteryAh} Ah ${result.batteryLabel}`,
    solar: (result) => `solár ${result.solarWatts} Wp`,
    inverter: (result) => result.inverterWatts
      ? `čistý sinusový měnič ${result.inverterWatts} W`
      : "bez samostatného 230V měniče",
    controller: (result) => `MPPT ${result.controllerAmps} A`,
    conjunction: "a",
  },
  sk: {
    lead: (voltage) => `Pre tento spôsob cestovania odporúčame ${voltage}V zostavu:`,
    battery: (result) => `batériu ${result.batteryAh} Ah ${result.batteryLabel}`,
    solar: (result) => `solár ${result.solarWatts} Wp`,
    inverter: (result) => result.inverterWatts
      ? `čistý sínusový menič ${result.inverterWatts} W`
      : "bez samostatného 230V meniča",
    controller: (result) => `MPPT ${result.controllerAmps} A`,
    conjunction: "a",
  },
  pl: {
    lead: (voltage) => `Dla tego sposobu podróżowania zalecamy instalację ${voltage} V:`,
    battery: (result) => `akumulator ${result.batteryAh} Ah ${result.batteryLabel}`,
    solar: (result) => `panele ${result.solarWatts} Wp`,
    inverter: (result) => result.inverterWatts
      ? `przetwornicę z czystą sinusoidą ${result.inverterWatts} W`
      : "bez osobnej przetwornicy 230 V",
    controller: (result) => `MPPT ${result.controllerAmps} A`,
    conjunction: "i",
  },
};

export function buildPlainLanguageVerdict(result, locale = result?.locale || "cs") {
  if (!result) return "";
  const text = VERDICT_TEXT[locale] || VERDICT_TEXT.cs;
  return `${text.lead(result.systemVoltage)} ${text.battery(result)}, ${text.solar(result)}, ${text.inverter(result)} ${text.conjunction} ${text.controller(result)}.`;
}
