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
    inverterScenarios: [
      { label: "Práce z obytné dodávky na českém stání", simultaneousW: 120, voltage: 12, practicalW: "300 W s čistou sinusovkou" },
      { label: "Kávovar mimo kemp", simultaneousW: 1290, voltage: 12, practicalW: "2 000 W, jen pokud BMS a DC část zvládnou přibližně 150 A" },
    ],
    wiringScenario: { label: "Kávovar mimo kemp: kontrola 2 000W větve", inverterWatts: 2000, voltage: 12, oneWayMeters: 1, practicalMm2: "25 mm² jen podle úbytku; zatížitelnost může vyžadovat více" },
    fridgeScenarios: [
      { label: "Horký den na jihu Česka", ambientC: 32, dailyWh: 557, usableBatteryShare: "58 % použitelné 100Ah LiFePO₄" },
      { label: "Mírný víkend v českých horách", ambientC: 25, dailyWh: 268, usableBatteryShare: "28 % použitelné 100Ah LiFePO₄" },
    ],
    chemistryScenarios: [
      { label: "Několik českých víkendů ročně", dailyWh: 250, autonomyDays: 2, agmAh: 96, lifepo4Ah: 60, decision: "Stávající zdravá 100Ah AGM může stačit, pokud nabíjení odpovídá a vyšší hmotnost nevadí." },
      { label: "Pravidelná práce z obytné dodávky", dailyWh: 800, autonomyDays: 2, agmAh: 307, lifepo4Ah: 192, decision: "LiFePO₄ obvykle dává větší smysl, ale až po kontrole všech nabíjecích zdrojů a BMS." },
    ],
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
    inverterScenarios: [
      { label: "Práca z obytnej dodávky pod Tatrami", simultaneousW: 450, voltage: 12, practicalW: "600–800 W s čistou sínusoidou" },
      { label: "Kávovar na státí bez prípojky", simultaneousW: 1200, voltage: 12, practicalW: "1 500 W, ak batéria a BMS zvládnu približne 139 A" },
    ],
    wiringScenario: { label: "Kávovar na státí: kontrola 1 500 W vetvy", inverterWatts: 1500, voltage: 12, oneWayMeters: 1.5, practicalMm2: "25 mm² iba podľa úbytku; zaťažiteľnosť môže vyžadovať viac" },
    fridgeScenarios: [
      { label: "Horúci deň pri vodnej nádrži", ambientC: 32, dailyWh: 557, usableBatteryShare: "58 % použiteľnej 100Ah LiFePO₄" },
      { label: "Mierny víkend pod Tatrami", ambientC: 25, dailyWh: 268, usableBatteryShare: "28 % použiteľnej 100Ah LiFePO₄" },
    ],
    chemistryScenarios: [
      { label: "Zimné státie pod Tatrami", dailyWh: 400, autonomyDays: 2, agmAh: 154, lifepo4Ah: 96, decision: "LiFePO₄ potrebuje pre nabíjanie v chlade overenú ochranu alebo vyhrievanie; rozhoduje konkrétny datasheet." },
      { label: "Časté víkendy pri vode", dailyWh: 600, autonomyDays: 2, agmAh: 230, lifepo4Ah: 144, decision: "Pri častom cyklovaní a vyššej spotrebe zvyčajne vyhráva LiFePO₄ s kompatibilným dobíjaním." },
    ],
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
    inverterScenarios: [
      { label: "Praca z kampera nad Bałtykiem", simultaneousW: 140, voltage: 12, practicalW: "300 W z czystą sinusoidą" },
      { label: "Płyta grzejna na postoju bez 230 V", simultaneousW: 1590, voltage: 12, practicalW: "2 000 W, jeśli BMS i instalacja DC wytrzymają około 184 A" },
    ],
    wiringScenario: { label: "Płyta grzejna: kontrola gałęzi 2 000 W", inverterWatts: 2000, voltage: 12, oneWayMeters: 1.5, practicalMm2: "35 mm² tylko według spadku; obciążalność może wymagać więcej" },
    fridgeScenarios: [
      { label: "Upalny postój nad Bałtykiem", ambientC: 32, dailyWh: 557, usableBatteryShare: "58% użytecznej energii akumulatora LiFePO₄ 100 Ah" },
      { label: "Łagodny weekend na Mazurach", ambientC: 25, dailyWh: 268, usableBatteryShare: "28% użytecznej energii akumulatora LiFePO₄ 100 Ah" },
    ],
    chemistryScenarios: [
      { label: "Kilka weekendów w przyczepie rocznie", dailyWh: 300, autonomyDays: 2, agmAh: 115, lifepo4Ah: 72, decision: "AGM może pozostać najtańszą zmianą, jeśli obecne ładowanie jest zgodne i masa nie ogranicza zestawu." },
      { label: "Praca z kampera przez dwa dni", dailyWh: 900, autonomyDays: 2, agmAh: 345, lifepo4Ah: 216, decision: "LiFePO₄ zwykle wygrywa użyteczną energią i masą, ale wymaga sprawdzenia ładowarek, BMS oraz instalacji." },
    ],
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
    inverterScenarios: [
      { label: "Mobil munka a Balatonnál", simultaneousW: 140, voltage: 12, practicalW: "300 W-os tiszta szinuszos inverter" },
      { label: "Hajszárító egy hálózat nélküli megállón", simultaneousW: 1200, voltage: 12, practicalW: "1 500 W, ha a BMS és a DC-oldal elvisel körülbelül 139 A-t" },
    ],
    wiringScenario: { label: "Hajszárító: az 1500 W-os ág ellenőrzése", inverterWatts: 1500, voltage: 12, oneWayMeters: 1.5, practicalMm2: "25 mm² csak feszültségesés alapján; a terhelhetőség többet is igényelhet" },
    fridgeScenarios: [
      { label: "Forró nap a Balatonnál", ambientC: 32, dailyWh: 557, usableBatteryShare: "a 100 Ah-s LiFePO₄ használható energiájának 58%-át" },
      { label: "Enyhe tavaszi termáltúra", ambientC: 25, dailyWh: 268, usableBatteryShare: "a 100 Ah-s LiFePO₄ használható energiájának 28%-át" },
    ],
    chemistryScenarios: [
      { label: "Termálkemping rendszeres 230 V-os töltéssel", dailyWh: 500, autonomyDays: 1, agmAh: 96, lifepo4Ah: 60, decision: "Egy meglévő 100 Ah-s AGM megfelelő lehet, ha jó állapotú és a töltési profil helyes." },
      { label: "Két hálózat nélküli nap a Balatonnál", dailyWh: 700, autonomyDays: 2, agmAh: 269, lifepo4Ah: 168, decision: "A LiFePO₄ általában jobb használható energia–tömeg arányt ad, kompatibilis töltéssel és hidegvédelemmel." },
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

export function requiredBatteryAh(dailyWh, autonomyDays, batteryType = "lifepo4", voltage = 12) {
  const usableRatio = batteryType === "lifepo4" ? 0.8 : batteryType === "lead" ? 0.5 : 0;
  if (!(dailyWh > 0) || !(autonomyDays > 0) || !(voltage > 0) || !usableRatio) throw new RangeError("Invalid battery sizing input");
  return Math.ceil((dailyWh * autonomyDays * 1.15) / usableRatio / voltage);
}

export function requiredChargingAmps(energyWh, hours, voltage = 12) {
  if (!(energyWh > 0) || !(hours > 0) || !(voltage > 0)) throw new RangeError("Invalid charging sizing input");
  return Math.ceil(energyWh / hours / voltage / 0.9);
}

export function requiredInverterWatts(simultaneousW, reserve = 1.25) {
  if (!(simultaneousW > 0) || !(reserve >= 1)) throw new RangeError("Invalid inverter sizing input");
  return Math.ceil(simultaneousW * reserve);
}

export function inverterDcAmps(acW, voltage = 12, efficiency = 0.9) {
  if (!(acW > 0) || !(voltage > 0) || !(efficiency > 0 && efficiency <= 1)) throw new RangeError("Invalid inverter current input");
  return Math.ceil(acW / voltage / efficiency);
}

export function compressorFridgeDailyWh(voltage, runningAmps, dutyCycle, hours = 24) {
  if (!(voltage > 0) || !(runningAmps > 0) || !(hours > 0) || !(dutyCycle > 0 && dutyCycle <= 1)) throw new RangeError("Invalid fridge consumption input");
  return Math.round(voltage * runningAmps * hours * dutyCycle);
}

export function shareOfUsableBattery(dailyWh, capacityAh = 100, voltage = 12, usableDepth = 0.8) {
  if (!(dailyWh > 0) || !(capacityAh > 0) || !(voltage > 0) || !(usableDepth > 0 && usableDepth <= 1)) throw new RangeError("Invalid battery share input");
  return Math.round((dailyWh / (capacityAh * voltage * usableDepth)) * 100);
}
