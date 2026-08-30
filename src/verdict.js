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
  hu: {
    lead: (voltage) => `Ehhez az utazási módhoz ${voltage} V-os rendszert ajánlunk:`,
    battery: (result) => `${result.batteryAh} Ah-s ${result.batteryLabel} akkumulátort`,
    solar: (result) => `${result.solarWatts} Wp napelemet`,
    inverter: (result) => result.inverterWatts
      ? `${result.inverterWatts} W-os tiszta szinuszos invertert`
      : "külön 230 V-os inverter nélkül",
    controller: (result) => `${result.controllerAmps} A-es MPPT szabályozót`,
    conjunction: "és",
  },
  ro: {
    lead: (voltage) => `Pentru acest mod de călătorie recomandăm un sistem de ${voltage} V:`,
    battery: (result) => `o baterie de ${result.batteryAh} Ah ${result.batteryLabel}`,
    solar: (result) => `panouri solare de ${result.solarWatts} Wp`,
    inverter: (result) => result.inverterWatts
      ? `un invertor cu undă sinusoidală pură de ${result.inverterWatts} W`
      : "fără invertor separat de 230 V",
    controller: (result) => `un regulator MPPT de ${result.controllerAmps} A`,
    conjunction: "și",
  },
  pt: {
    lead: (voltage) => `Para este perfil de viagem recomendamos um sistema de ${voltage} V:`,
    battery: (result) => `uma bateria de ${result.batteryAh} Ah ${result.batteryLabel}`,
    solar: (result) => `painéis solares de ${result.solarWatts} Wp`,
    inverter: (result) => result.inverterWatts
      ? `um inversor de onda sinusoidal pura de ${result.inverterWatts} W`
      : "sem inversor dedicado de 230 V",
    controller: (result) => `um controlador MPPT de ${result.controllerAmps} A`,
    conjunction: "e",
  },
  si: {
    lead: (voltage) => `Za ta način potovanja priporočamo ${voltage} V sistem:`,
    battery: (result) => `baterijo ${result.batteryAh} Ah ${result.batteryLabel}`,
    solar: (result) => `sončne panele ${result.solarWatts} Wp`,
    inverter: (result) => result.inverterWatts
      ? `inverter s čistim sinusnim izhodom ${result.inverterWatts} W`
      : "brez ločenega 230 V inverterja",
    controller: (result) => `MPPT regulator ${result.controllerAmps} A`,
    conjunction: "in",
  },
};

export function buildPlainLanguageVerdict(result, locale = result?.locale || "cs") {
  if (!result) return "";
  const text = VERDICT_TEXT[locale] || VERDICT_TEXT.cs;
  return `${text.lead(result.systemVoltage)} ${text.battery(result)}, ${text.solar(result)}, ${text.inverter(result)} ${text.conjunction} ${text.controller(result)}.`;
}
