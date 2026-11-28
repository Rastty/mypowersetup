import { BATTERIES, SEASONS } from "./catalog.js?v=20260821-1";

const BATTERY_MARGIN = 1.15;
const SOLAR_SYSTEM_EFFICIENCY = 0.75;
const SOLAR_MARGIN = 1.15;
const INVERTER_MARGIN = 1.25;
const CONTROLLER_MARGIN = 1.25;
const CHARGE_VOLTAGE_12V = Object.freeze({
  lifepo4: 14.6,
  lead: 14.4,
});

const ENGINE_TEXT = {
  cs: {
    seasons: { summer: "Léto", shoulder: "Jaro / podzim", winter: "Zima" },
    batteries: { lifepo4: "LiFePO₄", lead: "AGM / olovo" },
    winterWarning: "V zimě počítejte s velkými výkyvy výroby a záložním způsobem dobíjení.",
    surgeWarning: "Motorové spotřebiče mohou mít krátkou rozběhovou špičku; ověřte ji v dokumentaci výrobce.",
    dcLoadVoltageWarning: "Pozor na 24V rozvod: ověřte napětí každého DC spotřebiče. Pro zařízení určená jen pro 12 V je nutný vhodně dimenzovaný regulovaný měnič 24→12 V a samostatně navržené jištění; tento měnič není v nákupním seznamu. Nezaměňujte jej s DC–DC nabíječkou baterie.",
    voltageWarning: (voltage) => `Pro tuto velikost sestavy bychom standardně doporučili ${voltage}V systém.`,
    missingSelection: "Vyberte alespoň jeden spotřebič."
  },
  sk: {
    seasons: { summer: "Leto", shoulder: "Jar / jeseň", winter: "Zima" },
    batteries: { lifepo4: "LiFePO₄", lead: "AGM / olovo" },
    winterWarning: "V zime počítajte s veľkými výkyvmi výroby a záložným spôsobom dobíjania.",
    surgeWarning: "Motorové spotrebiče môžu mať krátku rozbehovú špičku; overte ju v dokumentácii výrobcu.",
    dcLoadVoltageWarning: "Pozor na 24V rozvod: overte napätie každého DC spotrebiča. Pre zariadenia určené iba na 12 V potrebujete vhodne dimenzovaný regulovaný menič 24→12 V a samostatne navrhnuté istenie; tento menič nie je v nákupnom zozname. Nezamieňajte ho s DC–DC nabíjačkou batérie.",
    voltageWarning: (voltage) => `Pre túto veľkosť zostavy by sme štandardne odporučili ${voltage}V systém.`,
    missingSelection: "Vyberte aspoň jeden spotrebič."
  },
  pl: {
    seasons: { summer: "Lato", shoulder: "Wiosna / jesień", winter: "Zima" },
    batteries: { lifepo4: "LiFePO₄", lead: "AGM / kwasowo-ołowiowy" },
    winterWarning: "Zimą należy liczyć się z dużymi wahaniami produkcji i zapewnić zapasowy sposób ładowania.",
    surgeWarning: "Urządzenia z silnikiem mogą mieć krótkotrwały prąd rozruchowy; sprawdź go w dokumentacji producenta.",
    dcLoadVoltageWarning: "Uwaga na instalację 24 V: sprawdź napięcie znamionowe każdego odbiornika DC. Urządzenia działające tylko na 12 V wymagają odpowiednio dobranej, stabilizowanej przetwornicy 24→12 V i osobno zaprojektowanych zabezpieczeń; przetwornica nie jest ujęta na liście zakupowej. Nie myl jej z ładowarką akumulatora DC–DC.",
    voltageWarning: (voltage) => `Dla zestawu tej wielkości standardowo zalecamy system ${voltage} V.`,
    missingSelection: "Wybierz co najmniej jedno urządzenie."
  },
  hu: {
    seasons: { summer: "Nyár", shoulder: "Tavasz / ősz", winter: "Tél" },
    batteries: { lifepo4: "LiFePO₄", lead: "AGM / ólom-savas" },
    winterWarning: "Télen nagy termelési ingadozásokkal és tartalék töltési lehetőséggel kell számolni.",
    surgeWarning: "A motoros fogyasztók rövid indítási teljesítménycsúcsot igényelhetnek; ellenőrizd a gyártói dokumentációt.",
    dcLoadVoltageWarning: "Figyelem a 24 V-os rendszerre: ellenőrizd minden egyenáramú fogyasztó névleges feszültségét. A csak 12 V-os készülékekhez megfelelően méretezett, szabályozott 24→12 V-os DC–DC feszültségátalakító és külön tervezett védelem kell; ez nincs a bevásárlólistán. Nem azonos az akkumulátor DC–DC töltőjével.",
    voltageWarning: (voltage) => `Ehhez a méretű rendszerhez alapértelmezetten ${voltage} V-os feszültséget ajánlunk.`,
    missingSelection: "Válassz legalább egy fogyasztót."
  },
  ro: {
    seasons: { summer: "Vară", shoulder: "Primăvară / toamnă", winter: "Iarnă" },
    batteries: { lifepo4: "LiFePO₄", lead: "AGM / plumb-acid" },
    winterWarning: "Iarna, producția solară poate varia mult; planifică și o sursă de încărcare de rezervă.",
    surgeWarning: "Consumatorii cu motor pot avea un vârf scurt de putere la pornire; verifică documentația producătorului.",
    dcLoadVoltageWarning: "Atenție la sistemul de 24 V: verifică tensiunea nominală a fiecărui consumator DC. Dispozitivele numai pentru 12 V necesită un convertor stabilizat 24→12 V dimensionat corect și protecții proiectate separat; convertorul nu este inclus în lista de cumpărături. Nu îl confunda cu încărcătorul DC–DC al bateriei.",
    voltageWarning: (voltage) => `Pentru un sistem de această dimensiune recomandăm în mod normal ${voltage} V.`,
    missingSelection: "Selectează cel puțin un consumator."
  },
  pt: {
    seasons: { summer: "Verão", shoulder: "Primavera / outono", winter: "Inverno" },
    batteries: { lifepo4: "LiFePO₄", lead: "AGM / chumbo-ácido" },
    winterWarning: "No inverno, a produção solar pode variar bastante; prevê também uma forma alternativa de carregamento.",
    surgeWarning: "Os equipamentos com motor podem ter um pico curto de potência no arranque; confirma-o na documentação do fabricante.",
    dcLoadVoltageWarning: "Atenção ao sistema de 24 V: confirma a tensão nominal de cada equipamento DC. Os aparelhos apenas de 12 V precisam de um conversor regulado 24→12 V bem dimensionado e proteção elétrica projetada à parte; esse conversor não consta da lista de compras. Não o confundas com o carregador DC–DC da bateria.",
    voltageWarning: (voltage) => `Para um sistema desta dimensão recomendamos normalmente ${voltage} V.`,
    missingSelection: "Seleciona pelo menos um equipamento."
  },
  si: {
    seasons: { summer: "Poletje", shoulder: "Pomlad / jesen", winter: "Zima" },
    batteries: { lifepo4: "LiFePO₄", lead: "AGM / svinčeno-kislinski" },
    winterWarning: "Pozimi lahko sončna proizvodnja močno niha, zato predvidi tudi rezervni način polnjenja.",
    surgeWarning: "Porabniki z motorjem imajo lahko kratek zagonski sunek moči; preveri podatke proizvajalca.",
    dcLoadVoltageWarning: "Pozor pri 24 V sistemu: preveri nazivno napetost vsakega enosmernega porabnika. Naprave samo za 12 V potrebujejo ustrezno dimenzioniran, reguliran pretvornik 24→12 V in posebej načrtovano zaščito; pretvornik ni v nakupovalnem seznamu. Ne zamenjuj ga z DC–DC polnilnikom baterije.",
    voltageWarning: (voltage) => `Za sistem te velikosti običajno priporočamo ${voltage} V.`,
    missingSelection: "Izberi vsaj en porabnik."
  }
};

export function roundUp(value, step) {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.ceil(value / step) * step;
}

export function calculateControllerSizing({ solarWatts, systemVoltage, batteryType = "lifepo4" } = {}) {
  const normalizedSolarWatts = clampNumber(solarWatts, 1, 10000, 400);
  const normalizedVoltage = Number(systemVoltage) === 24 ? 24 : 12;
  const normalizedBatteryType = batteryType === "lead" ? "lead" : "lifepo4";
  const controllerSizingVoltage = CHARGE_VOLTAGE_12V[normalizedBatteryType] * (normalizedVoltage / 12);
  const controllerAmpsRaw = (normalizedSolarWatts / controllerSizingVoltage) * CONTROLLER_MARGIN;
  return Object.freeze({
    solarWatts: normalizedSolarWatts,
    systemVoltage: normalizedVoltage,
    batteryType: normalizedBatteryType,
    controllerSizingVoltage,
    controllerAmpsRaw,
    controllerAmps: roundUp(controllerAmpsRaw, 10),
    controllerMarginPercent: Math.round((CONTROLLER_MARGIN - 1) * 100),
  });
}

export function calculateBatteryAutonomy({
  batteryCapacityAh = 100,
  systemVoltage = 12,
  batteryType = "lifepo4",
  dailyWh = 600,
  locale = "cs",
} = {}) {
  const normalizedAh = clampNumber(batteryCapacityAh, 10, 2000, 100);
  const normalizedVoltage = Number(systemVoltage) === 24 ? 24 : 12;
  const normalizedBatteryType = batteryType === "lead" ? "lead" : "lifepo4";
  const normalizedDailyWh = clampNumber(dailyWh, 50, 20000, 600);
  const battery = BATTERIES[normalizedBatteryType] || BATTERIES.lifepo4;
  const text = ENGINE_TEXT[locale] || ENGINE_TEXT.cs;

  const nominalWh = normalizedAh * normalizedVoltage;
  const usableWh = nominalWh * battery.usableDepth;
  const planningWh = usableWh / BATTERY_MARGIN;
  const autonomyDaysRaw = planningWh / normalizedDailyWh;

  return Object.freeze({
    batteryCapacityAh: normalizedAh,
    systemVoltage: normalizedVoltage,
    batteryType: normalizedBatteryType,
    batteryLabel: text.batteries[normalizedBatteryType],
    dailyWh: normalizedDailyWh,
    nominalWh: Math.round(nominalWh),
    usableWh: Math.round(usableWh),
    planningWh: Math.round(planningWh),
    autonomyDaysRaw,
    autonomyDays: Math.round(autonomyDaysRaw * 10) / 10,
    autonomyHours: Math.round(autonomyDaysRaw * 24),
    batteryMarginPercent: Math.round((BATTERY_MARGIN - 1) * 100),
    usableDepthPercent: Math.round(battery.usableDepth * 100),
  });
}

// Energy at the battery and peak loads are independent inputs. Use the
// Builder's design margins, not synthetic appliance runtime.
export function calculateVoltageComparison({dailyWh,autonomyDays,batteryType,maxAcLoadWatts,dcPeakWatts,surgeMultiplier} = {}) {
  const number = (v, min, max, step = 1) => {
    if (v == null || String(v).trim() === "") throw new RangeError("Invalid voltage comparison input");
    const n = Number(v);
    if (!Number.isFinite(n) || n < min || n > max || Math.abs(n / step - Math.round(n / step)) > 1e-8) throw new RangeError("Invalid voltage comparison input");
    return n;
  };
  const wh = number(dailyWh,50,20000,10), days = number(autonomyDays,1,7);
  const ac = number(maxAcLoadWatts,0,5000,10), dc = number(dcPeakWatts,0,5000,10);
  const surge = number(surgeMultiplier,1,5,0.5);
  if (!["lifepo4","lead"].includes(batteryType)) throw new RangeError("Invalid battery chemistry");
  const battery = BATTERIES[batteryType];
  const batteryWh = roundUp(wh * days * BATTERY_MARGIN / battery.usableDepth,100);
  const inverterWatts = roundUp(Math.max(ac * INVERTER_MARGIN,ac * surge),100);
  const systemVoltage = automaticVoltageFor(batteryWh,inverterWatts);
  const compare = [12,24].map(voltage => Object.freeze({
    voltage, batteryAh:roundUp(batteryWh / voltage,10),
    currentA:ac+dc>0?Math.ceil((ac / 0.9 + dc) / voltage):null,
  }));
  return Object.freeze({dailyWh:wh,autonomyDays:days,batteryType,batteryWh,inverterWatts,systemVoltage,automaticVoltage:systemVoltage,comparison:Object.freeze(compare),maxAcLoadWatts:ac,dcPeakWatts:dc,surgeMultiplier:surge,batteryTrigger:batteryWh>2400,inverterTrigger:inverterWatts>1200,warnings:[],assumptions:{batteryMarginPercent:15,usableDepthPercent:Math.round(battery.usableDepth*100)}});
}
function automaticVoltageFor(requiredBatteryWh,inverterWatts) {
  return requiredBatteryWh > 2400 || inverterWatts > 1200 ? 24 : 12;
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

  const automaticVoltage = automaticVoltageFor(requiredBatteryWh,inverterWatts);
  const systemVoltage = input.systemVoltage === "12" || input.systemVoltage === 12
    ? 12
    : input.systemVoltage === "24" || input.systemVoltage === 24
      ? 24
      : automaticVoltage;

  const batteryAh = roundUp(requiredBatteryWh / systemVoltage, 10);
  const solarWattsRaw = (dailyWhRaw * SOLAR_MARGIN) / (season.peakSunHours * SOLAR_SYSTEM_EFFICIENCY);
  const solarWatts = roundUp(solarWattsRaw, 50);
  const controller = calculateControllerSizing({ solarWatts, systemVoltage, batteryType: input.batteryType });
  const controllerAmps = controller.controllerAmps;

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
  // A DC load is only known to be 12/24 V in the input model. When the
  // selected bus is 24 V, never imply that every connected load supports it.
  // A 24->12 V regulated converter is a load supply, not a battery charger;
  // no unverified converter SKU is added to the purchase-ready basket.
  const dcLoadVoltageWarning = systemVoltage === 24 && applianceRows.some((item) => !item.ac)
    ? text.dcLoadVoltageWarning : null;
  if (dcLoadVoltageWarning) warnings.push(dcLoadVoltageWarning);

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
    dcLoadVoltageWarning,
    calculation: {
      dailyWhRaw,
      requiredBatteryWhRaw,
      peakSunHours: season.peakSunHours,
      solarWattsRaw,
      controllerSizingVoltage: controller.controllerSizingVoltage,
      estimatedConcurrentWatts,
      largestStartWatts,
      automaticVoltage
    },
    assumptions: {
      batteryMarginPercent: Math.round((BATTERY_MARGIN - 1) * 100),
      usableDepthPercent: Math.round(battery.usableDepth * 100),
      solarEfficiencyPercent: Math.round(SOLAR_SYSTEM_EFFICIENCY * 100),
      solarMarginPercent: Math.round((SOLAR_MARGIN - 1) * 100),
      controllerMarginPercent: controller.controllerMarginPercent
    }
  };
}

function clampNumber(value, min, max, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}
