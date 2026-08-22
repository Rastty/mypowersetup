const COPY = {
  cs: {
    solarToController: "Solární panely → MPPT regulátor",
    controllerToBattery: "MPPT regulátor → nástavbová baterie",
    batteryToDistribution: "Nástavbová baterie → DC rozvod",
    batteryToInverter: "Nástavbová baterie → měnič",
    starterToDcDc: "Startovací baterie → DC–DC nabíječka",
    dcDcToBattery: "DC–DC nabíječka → nástavbová baterie",
    shoreToCharger: "230 V přípojka → síťová nabíječka",
    chargerToBattery: "Síťová nabíječka → nástavbová baterie",
    solarDetail: "Ověřit Voc a Isc při nejnižší teplotě, průřez, konektory, odpojení a požadavky na jištění FV pole.",
    dcDetail: "Ověřit průřez a proudovou zatížitelnost kabelu, úbytek napětí, DC pojistku a její umístění podle manuálu zařízení.",
    inverterDetail: "Vysokoproudá větev: kabel vést co nejkratší, ověřit svorky, krimpování, odlehčení tahu a pojistku předepsanou výrobcem.",
    dcDcInputDetail: "Ověřit skutečný vstupní proud, volnou kapacitu alternátoru, kabel, jištění u zdroje a řízení chytrého alternátoru.",
    dcDcOutputDetail: "Ověřit výstupní kabel, jištění u baterie, nabíjecí profil, BMS a chlazení nabíječky.",
    acDetail: "230V část musí mít odpovídající ochranu, odpojování, uzemnění a proudový chránič podle instalace; realizaci svěřit kvalifikované osobě.",
    shoreDcDetail: "Ověřit DC kabel, pojistku u baterie, nabíjecí profil, maximální proud baterie/BMS a odvod tepla.",
  },
  sk: {
    solarToController: "Solárne panely → MPPT regulátor",
    controllerToBattery: "MPPT regulátor → nadstavbová batéria",
    batteryToDistribution: "Nadstavbová batéria → DC rozvod",
    batteryToInverter: "Nadstavbová batéria → menič",
    starterToDcDc: "Štartovacia batéria → DC–DC nabíjačka",
    dcDcToBattery: "DC–DC nabíjačka → nadstavbová batéria",
    shoreToCharger: "230 V prípojka → sieťová nabíjačka",
    chargerToBattery: "Sieťová nabíjačka → nadstavbová batéria",
    solarDetail: "Overiť Voc a Isc pri najnižšej teplote, prierez, konektory, odpájanie a požiadavky na istenie FV poľa.",
    dcDetail: "Overiť prierez a prúdovú zaťažiteľnosť kábla, úbytok napätia, DC poistku a jej umiestnenie podľa manuálu zariadenia.",
    inverterDetail: "Vysokoprúdová vetva: kábel viesť čo najkratší, overiť svorky, krimpovanie, odľahčenie ťahu a poistku predpísanú výrobcom.",
    dcDcInputDetail: "Overiť skutočný vstupný prúd, voľnú kapacitu alternátora, kábel, istenie pri zdroji a riadenie inteligentného alternátora.",
    dcDcOutputDetail: "Overiť výstupný kábel, istenie pri batérii, nabíjací profil, BMS a chladenie nabíjačky.",
    acDetail: "230V časť musí mať zodpovedajúcu ochranu, odpájanie, uzemnenie a prúdový chránič podľa inštalácie; realizáciu zverte kvalifikovanej osobe.",
    shoreDcDetail: "Overiť DC kábel, poistku pri batérii, nabíjací profil, maximálny prúd batérie/BMS a odvod tepla.",
  },
};

export function buildInstallationPlan(result, locale = "cs") {
  if (!result || !Number.isFinite(Number(result.systemVoltage))) return [];
  const copy = COPY[locale] || COPY.cs;
  const circuits = [
    { id: "solar-controller", label: copy.solarToController, detail: copy.solarDetail },
    { id: "controller-battery", label: copy.controllerToBattery, detail: copy.dcDetail },
    { id: "battery-distribution", label: copy.batteryToDistribution, detail: copy.dcDetail },
  ];

  if (Number(result.inverterWatts) > 0) {
    circuits.push({ id: "battery-inverter", label: copy.batteryToInverter, detail: copy.inverterDetail });
  }
  if (result.charging?.dcDc?.enabled) {
    circuits.push(
      { id: "starter-dcdc", label: copy.starterToDcDc, detail: copy.dcDcInputDetail },
      { id: "dcdc-battery", label: copy.dcDcToBattery, detail: copy.dcDcOutputDetail },
    );
  }
  if (result.charging?.shore?.enabled) {
    circuits.push(
      { id: "shore-charger", label: copy.shoreToCharger, detail: copy.acDetail },
      { id: "charger-battery", label: copy.chargerToBattery, detail: copy.shoreDcDetail },
    );
  }
  return circuits;
}
