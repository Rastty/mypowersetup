import { BATTERIES, SEASONS } from "./catalog.js?v=20260821-1";

const BATTERY_MARGIN = 1.15;
const SOLAR_SYSTEM_EFFICIENCY = 0.75;
const SOLAR_MARGIN = 1.15;
const INVERTER_MARGIN = 1.25;

const ENGINE_TEXT = {
  cs: {
    seasons: { summer: "Léto", shoulder: "Jaro / podzim", winter: "Zima" },
    batteries: { lifepo4: "LiFePO₄", lead: "AGM / olovo" },
    winterWarning: "V zimě počítejte s velkými výkyvy výroby a záložním způsobem dobíjení.",
    surgeWarning: "Motorové spotřebiče mohou mít krátkou rozběhovou špičku; ověřte ji v dokumentaci výrobce.",
    voltageWarning: (voltage) => `Pro tuto velikost sestavy bychom standardně doporučili ${voltage}V systém.`,
    missingSelection: "Vyberte alespoň jeden spotřebič."
  },
  sk: {
    seasons: { summer: "Leto", shoulder: "Jar / jeseň", winter: "Zima" },
    batteries: { lifepo4: "LiFePO₄", lead: "AGM / olovo" },
    winterWarning: "V zime počítajte s veľkými výkyvmi výroby a záložným spôsobom dobíjania.",
    surgeWarning: "Motorové spotrebiče môžu mať krátku rozbehovú špičku; overte ju v dokumentácii výrobcu.",
    voltageWarning: (voltage) => `Pre túto veľkosť zostavy by sme štandardne odporučili ${voltage}V systém.`,
    missingSelection: "Vyberte aspoň jeden spotrebič."
  },
  pl: {
    seasons: { summer: "Lato", shoulder: "Wiosna / jesień", winter: "Zima" },
    batteries: { lifepo4: "LiFePO₄", lead: "AGM / kwasowo-ołowiowy" },
    winterWarning: "Zimą należy liczyć się z dużymi wahaniami produkcji i zapewnić zapasowy sposób ładowania.",
    surgeWarning: "Urządzenia z silnikiem mogą mieć krótkotrwały prąd rozruchowy; sprawdź go w dokumentacji producenta.",
    voltageWarning: (voltage) => `Dla zestawu tej wielkości standardowo zalecamy system ${voltage} V.`,
    missingSelection: "Wybierz co najmniej jedno urządzenie."
  },
  hu: {
    seasons: { summer: "Nyár", shoulder: "Tavasz / ősz", winter: "Tél" },
    batteries: { lifepo4: "LiFePO₄", lead: "AGM / ólom-savas" },
    winterWarning: "Télen nagy termelési ingadozásokkal és tartalék töltési lehetőséggel kell számolni.",
    surgeWarning: "A motoros fogyasztók rövid indítási teljesítménycsúcsot igényelhetnek; ellenőrizd a gyártói dokumentációt.",
    voltageWarning: (voltage) => `Ehhez a méretű rendszerhez alapértelmezetten ${voltage} V-os feszültséget ajánlunk.`,
    missingSelection: "Válassz legalább egy fogyasztót."
  }
};

export function roundUp(value, step) {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.ceil(value / step) * step;
}

export function calculateSetup(input) {
  const locale = Object.hasOwn(ENGINE_TEXT, input.locale) ? input.locale : "cs";
  const text = ENGINE_TEXT[locale];
  const appliances = (input.appliances || []).filter((item) => item.selected);
  if (appliances.length === 0) {
    throw new Error(text.missingSelection);
  }

  const autonomyDays = clampNumber(input.autonomyDays, 1, 7, 2);
  const season = SEASONS[input.season] || SEASONS.summer;
  const battery = BATTERIES[input.batteryType] || BATTERIES.lifepo4;

  const applianceRows = appliances.map((item) => {
    const watts = clampNumber(item.watts, 1, 10000, 1);
    const hours = clampNumber(item.hours, 0.01, 24, 1);
    const quantity = clampNumber(item.quantity, 1, 20, 1);
    return {
      ...item,
      watts,
      hours,
      quantity,
      dailyWh: watts * hours * quantity
    };
  });

  const dailyWhRaw = applianceRows.reduce((total, item) => total + item.dailyWh, 0);
  const dailyWh = roundUp(dailyWhRaw, 10);
  const requiredBatteryWhRaw = (dailyWhRaw * autonomyDays * BATTERY_MARGIN) / battery.usableDepth;
  const requiredBatteryWh = roundUp(requiredBatteryWhRaw, 100);

  const acLoads = applianceRows.filter((item) => item.ac);
  const largestAcLoad = [...acLoads].sort((a, b) => b.watts - a.watts)[0];
  const otherAcWatts = acLoads
    .filter((item) => item !== largestAcLoad)
    .reduce((total, item) => total + item.watts * item.quantity, 0);
  const estimatedConcurrentWatts = largestAcLoad
    ? largestAcLoad.watts * largestAcLoad.quantity + otherAcWatts * 0.5
    : 0;
  const largestStartWatts = acLoads.reduce(
    (max, item) => Math.max(max, item.watts * item.quantity * (item.surge || 1)),
    0
  );
  const inverterWatts = roundUp(
    Math.max(estimatedConcurrentWatts * INVERTER_MARGIN, largestStartWatts),
    100
  );

  const automaticVoltage = requiredBatteryWh > 2400 || inverterWatts > 1200 ? 24 : 12;
  const systemVoltage = input.systemVoltage === "12" || input.systemVoltage === 12
    ? 12
    : input.systemVoltage === "24" || input.systemVoltage === 24
      ? 24
      : automaticVoltage;

  const batteryAh = roundUp(requiredBatteryWh / systemVoltage, 10);
  const solarWattsRaw = (dailyWhRaw * SOLAR_MARGIN) / (season.peakSunHours * SOLAR_SYSTEM_EFFICIENCY);
  const solarWatts = roundUp(solarWattsRaw, 50);
  const controllerAmps = roundUp((solarWatts / systemVoltage) * 1.25, 10);

  const warnings = [];
  if (input.season === "winter") {
    warnings.push(text.winterWarning);
  }
  if (acLoads.some((item) => (item.surge || 1) >= 2)) {
    warnings.push(text.surgeWarning);
  }
  if (input.systemVoltage !== "auto" && Number(input.systemVoltage) !== automaticVoltage) {
    warnings.push(text.voltageWarning(automaticVoltage));
  }

  return {
    locale,
    dailyWh,
    autonomyDays,
    batteryLabel: text.batteries[input.batteryType] || text.batteries.lifepo4,
    batteryType: input.batteryType || "lifepo4",
    batteryWh: requiredBatteryWh,
    batteryAh,
    solarWatts,
    inverterWatts,
    controllerAmps,
    systemVoltage,
    seasonLabel: text.seasons[input.season] || text.seasons.summer,
    applianceRows,
    warnings,
    calculation: {
      dailyWhRaw,
      requiredBatteryWhRaw,
      peakSunHours: season.peakSunHours,
      solarWattsRaw,
      estimatedConcurrentWatts,
      largestStartWatts,
      automaticVoltage
    },
    assumptions: {
      batteryMarginPercent: Math.round((BATTERY_MARGIN - 1) * 100),
      usableDepthPercent: Math.round(battery.usableDepth * 100),
      solarEfficiencyPercent: Math.round(SOLAR_SYSTEM_EFFICIENCY * 100),
      solarMarginPercent: Math.round((SOLAR_MARGIN - 1) * 100)
    }
  };
}

function clampNumber(value, min, max, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}
