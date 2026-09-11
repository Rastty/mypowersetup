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
    solarNeed: ({ solarWatts, controllerAmps, systemVoltage }) => `Nákupní minimum: solární pole kolem ${solarWatts} Wp a MPPT alespoň ${controllerAmps} A pro ${systemVoltage}V systém.`,
    controllerNeed: ({ controllerAmps, systemVoltage }) => `Výstup MPPT musí pokrýt alespoň ${controllerAmps} A do ${systemVoltage}V baterie.`,
    batteryNeed: ({ batteryAh, systemVoltage, batteryLabel }) => `Nástavbová baterie: alespoň ${batteryAh} Ah při ${systemVoltage} V${batteryLabel ? ` · ${batteryLabel}` : ""}.`,
    inverterNeed: ({ inverterWatts, wiring }) => `Měnič ${inverterWatts} W: ${wiringSummary(wiring, "cs")}`,
    dcDcInputNeed: ({ charging }) => `DC–DC ${chargingCurrent(charging.dcDc)} A: odhad vstupního proudu ${charging.dcDc.estimatedInputCurrentAmps || "?"} A; ${wiringSummary(charging.dcDc.inputWiring, "cs")}`,
    dcDcOutputNeed: ({ charging, systemVoltage }) => `Výstup DC–DC alespoň ${chargingCurrent(charging.dcDc)} A do ${systemVoltage}V baterie.`,
    shoreNeed: ({ charging, systemVoltage }) => `Síťová nabíječka: alespoň ${chargingCurrent(charging.shore)} A pro ${systemVoltage}V baterii.`,
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
    solarNeed: ({ solarWatts, controllerAmps, systemVoltage }) => `Nákupné minimum: solárne pole okolo ${solarWatts} Wp a MPPT aspoň ${controllerAmps} A pre ${systemVoltage}V systém.`,
    controllerNeed: ({ controllerAmps, systemVoltage }) => `Výstup MPPT musí pokryť aspoň ${controllerAmps} A do ${systemVoltage}V batérie.`,
    batteryNeed: ({ batteryAh, systemVoltage, batteryLabel }) => `Nadstavbová batéria: aspoň ${batteryAh} Ah pri ${systemVoltage} V${batteryLabel ? ` · ${batteryLabel}` : ""}.`,
    inverterNeed: ({ inverterWatts, wiring }) => `Menič ${inverterWatts} W: ${wiringSummary(wiring, "sk")}`,
    dcDcInputNeed: ({ charging }) => `DC–DC ${chargingCurrent(charging.dcDc)} A: odhad vstupného prúdu ${charging.dcDc.estimatedInputCurrentAmps || "?"} A; ${wiringSummary(charging.dcDc.inputWiring, "sk")}`,
    dcDcOutputNeed: ({ charging, systemVoltage }) => `Výstup DC–DC aspoň ${chargingCurrent(charging.dcDc)} A do ${systemVoltage}V batérie.`,
    shoreNeed: ({ charging, systemVoltage }) => `Sieťová nabíjačka: aspoň ${chargingCurrent(charging.shore)} A pre ${systemVoltage}V batériu.`,
  },
  pl: {
    solarToController: "Panele fotowoltaiczne → regulator MPPT",
    controllerToBattery: "Regulator MPPT → akumulator pokładowy",
    batteryToDistribution: "Akumulator pokładowy → rozdzielnia DC",
    batteryToInverter: "Akumulator pokładowy → przetwornica",
    starterToDcDc: "Akumulator rozruchowy → ładowarka DC–DC",
    dcDcToBattery: "Ładowarka DC–DC → akumulator pokładowy",
    shoreToCharger: "Przyłącze 230 V → ładowarka sieciowa",
    chargerToBattery: "Ładowarka sieciowa → akumulator pokładowy",
    solarDetail: "Sprawdź Voc i Isc przy najniższej temperaturze, przekrój przewodów, złącza, odłączanie oraz wymagania dotyczące zabezpieczenia pola PV.",
    dcDetail: "Sprawdź przekrój i obciążalność prądową przewodu, spadek napięcia, bezpiecznik DC oraz jego położenie zgodnie z instrukcją urządzenia.",
    inverterDetail: "Obwód wysokoprądowy: przewód powinien być możliwie krótki; sprawdź zaciski, zaciskanie końcówek, odciążenie mechaniczne i bezpiecznik wymagany przez producenta.",
    dcDcInputDetail: "Sprawdź rzeczywisty prąd wejściowy, wolną wydajność alternatora, przewód, zabezpieczenie przy źródle i sterowanie inteligentnym alternatorem.",
    dcDcOutputDetail: "Sprawdź przewód wyjściowy, zabezpieczenie przy akumulatorze, profil ładowania, BMS i chłodzenie ładowarki.",
    acDetail: "Część 230 V wymaga odpowiedniej ochrony, odłączania, uziemienia i wyłącznika różnicowoprądowego; wykonanie powierz osobie z odpowiednimi kwalifikacjami.",
    shoreDcDetail: "Sprawdź przewód DC, bezpiecznik przy akumulatorze, profil ładowania, maksymalny prąd akumulatora/BMS i odprowadzanie ciepła.",
    solarNeed: ({ solarWatts, controllerAmps, systemVoltage }) => `Minimum zakupowe: pole PV około ${solarWatts} Wp i regulator MPPT co najmniej ${controllerAmps} A dla systemu ${systemVoltage} V.`,
    controllerNeed: ({ controllerAmps, systemVoltage }) => `Wyjście MPPT musi zapewnić co najmniej ${controllerAmps} A do akumulatora ${systemVoltage} V.`,
    batteryNeed: ({ batteryAh, systemVoltage, batteryLabel }) => `Akumulator pokładowy: co najmniej ${batteryAh} Ah przy ${systemVoltage} V${batteryLabel ? ` · ${batteryLabel}` : ""}.`,
    inverterNeed: ({ inverterWatts, wiring }) => `Przetwornica ${inverterWatts} W: ${wiringSummary(wiring, "pl")}`,
    dcDcInputNeed: ({ charging }) => `DC–DC ${chargingCurrent(charging.dcDc)} A: szacowany prąd wejściowy ${charging.dcDc.estimatedInputCurrentAmps || "?"} A; ${wiringSummary(charging.dcDc.inputWiring, "pl")}`,
    dcDcOutputNeed: ({ charging, systemVoltage }) => `Wyjście DC–DC co najmniej ${chargingCurrent(charging.dcDc)} A do akumulatora ${systemVoltage} V.`,
    shoreNeed: ({ charging, systemVoltage }) => `Ładowarka sieciowa: co najmniej ${chargingCurrent(charging.shore)} A dla akumulatora ${systemVoltage} V.`,
  },
  hu: {
    solarToController: "Napelemek → MPPT töltésszabályozó",
    controllerToBattery: "MPPT töltésszabályozó → lakótéri akkumulátor",
    batteryToDistribution: "Lakótéri akkumulátor → DC elosztó",
    batteryToInverter: "Lakótéri akkumulátor → inverter",
    starterToDcDc: "Indítóakkumulátor → DC–DC töltő",
    dcDcToBattery: "DC–DC töltő → lakótéri akkumulátor",
    shoreToCharger: "230 V-os hálózati csatlakozás → hálózati töltő",
    chargerToBattery: "Hálózati töltő → lakótéri akkumulátor",
    solarDetail: "Ellenőrizd a Voc és Isc értékét a legalacsonyabb hőmérsékleten, a kábel keresztmetszetét, a csatlakozókat, a leválasztást és a PV-mező védelmi követelményeit.",
    dcDetail: "Ellenőrizd a kábel keresztmetszetét és áramterhelhetőségét, a feszültségesést, a DC biztosítékot és annak helyét a készülék útmutatója szerint.",
    inverterDetail: "Nagyáramú ág: a kábel legyen a lehető legrövidebb; ellenőrizd a sarukat, a krimpelést, a tehermentesítést és a gyártó által előírt biztosítékot.",
    dcDcInputDetail: "Ellenőrizd a tényleges bemeneti áramot, a generátor szabad kapacitását, a kábelt, a forrásnál elhelyezett védelmet és az intelligens generátor vezérlését.",
    dcDcOutputDetail: "Ellenőrizd a kimeneti kábelt, az akkumulátornál elhelyezett védelmet, a töltési profilt, a BMS-t és a töltő hűtését.",
    acDetail: "A 230 V-os rész megfelelő védelmet, leválasztást, földelést és áram-védőkapcsolót igényel; a kivitelezést bízd megfelelő képesítésű szakemberre.",
    shoreDcDetail: "Ellenőrizd a DC kábelt, az akkumulátornál lévő biztosítékot, a töltési profilt, az akkumulátor/BMS legnagyobb áramát és a hőelvezetést.",
    solarNeed: ({ solarWatts, controllerAmps, systemVoltage }) => `Vásárlási minimum: körülbelül ${solarWatts} Wp napelem és legalább ${controllerAmps} A-es MPPT a ${systemVoltage} V-os rendszerhez.`,
    controllerNeed: ({ controllerAmps, systemVoltage }) => `Az MPPT kimenete legalább ${controllerAmps} A legyen a ${systemVoltage} V-os akkumulátorhoz.`,
    batteryNeed: ({ batteryAh, systemVoltage, batteryLabel }) => `Lakótéri akkumulátor: legalább ${batteryAh} Ah, ${systemVoltage} V${batteryLabel ? ` · ${batteryLabel}` : ""}.`,
    inverterNeed: ({ inverterWatts, wiring }) => `${inverterWatts} W-os inverter: ${wiringSummary(wiring, "hu")}`,
    dcDcInputNeed: ({ charging }) => `${chargingCurrent(charging.dcDc)} A-es DC–DC: becsült bemeneti áram ${charging.dcDc.estimatedInputCurrentAmps || "?"} A; ${wiringSummary(charging.dcDc.inputWiring, "hu")}`,
    dcDcOutputNeed: ({ charging, systemVoltage }) => `A DC–DC kimenete legalább ${chargingCurrent(charging.dcDc)} A legyen a ${systemVoltage} V-os akkumulátorhoz.`,
    shoreNeed: ({ charging, systemVoltage }) => `Hálózati töltő: legalább ${chargingCurrent(charging.shore)} A a ${systemVoltage} V-os akkumulátorhoz.`,
  },
};

const LOCALE_TAG = { cs: "cs-CZ", sk: "sk-SK", pl: "pl-PL", hu: "hu-HU" };

function formatNumber(value, locale) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "?";
  return new Intl.NumberFormat(LOCALE_TAG[locale] || LOCALE_TAG.cs, { maximumFractionDigits: 1 }).format(number);
}

function isPositiveNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0;
}

function chargingCurrent(option) {
  if (isPositiveNumber(option?.suggestedCurrentAmps)) return Number(option.suggestedCurrentAmps);
  if (isPositiveNumber(option?.requiredCurrentAmps)) return Number(option.requiredCurrentAmps);
  return null;
}

function wiringSummary(wiring, locale) {
  if (!wiring) {
    return ({
      cs: "průřez kabelu je nutné určit podle skutečné délky, proudu a manuálu zařízení.",
      sk: "prierez kábla je potrebné určiť podľa skutočnej dĺžky, prúdu a manuálu zariadenia.",
      pl: "przekrój przewodu trzeba dobrać do rzeczywistej długości, prądu i instrukcji urządzenia.",
      hu: "a kábel keresztmetszetét a tényleges hossz, áram és a készülék útmutatója alapján kell meghatározni.",
    })[locale] || "";
  }
  if (!wiring.recommendedCrossSectionMm2) {
    return ({
      cs: `návrhový proud přibližně ${formatNumber(wiring.designCurrentAmps, locale)} A; výpočet podle úbytku pro délku ${formatNumber(wiring.oneWayLengthMeters, locale)} m překračuje 120 mm² a vyžaduje individuální návrh.`,
      sk: `návrhový prúd približne ${formatNumber(wiring.designCurrentAmps, locale)} A; výpočet podľa úbytku pre dĺžku ${formatNumber(wiring.oneWayLengthMeters, locale)} m prekračuje 120 mm² a vyžaduje individuálny návrh.`,
      pl: `prąd projektowy około ${formatNumber(wiring.designCurrentAmps, locale)} A; obliczenie spadku napięcia dla długości ${formatNumber(wiring.oneWayLengthMeters, locale)} m przekracza 120 mm² i wymaga indywidualnego projektu.`,
      hu: `a tervezési áram körülbelül ${formatNumber(wiring.designCurrentAmps, locale)} A; a ${formatNumber(wiring.oneWayLengthMeters, locale)} m-es hossz feszültségesés-számítása 120 mm² fölé kerül, ezért egyedi terv szükséges.`,
    })[locale] || "";
  }
  return ({
    cs: `návrhový proud přibližně ${formatNumber(wiring.designCurrentAmps, locale)} A; pro délku ${formatNumber(wiring.oneWayLengthMeters, locale)} m vychází nejméně ${formatNumber(wiring.recommendedCrossSectionMm2, locale)} mm² pouze podle cíle úbytku do ${formatNumber(wiring.maxVoltageDropPercent, locale)} %.`,
    sk: `návrhový prúd približne ${formatNumber(wiring.designCurrentAmps, locale)} A; pre dĺžku ${formatNumber(wiring.oneWayLengthMeters, locale)} m vychádza najmenej ${formatNumber(wiring.recommendedCrossSectionMm2, locale)} mm² iba podľa cieľa úbytku do ${formatNumber(wiring.maxVoltageDropPercent, locale)} %.`,
    pl: `prąd projektowy około ${formatNumber(wiring.designCurrentAmps, locale)} A; dla długości ${formatNumber(wiring.oneWayLengthMeters, locale)} m wychodzi co najmniej ${formatNumber(wiring.recommendedCrossSectionMm2, locale)} mm² tylko według celu spadku do ${formatNumber(wiring.maxVoltageDropPercent, locale)}%.`,
    hu: `a tervezési áram körülbelül ${formatNumber(wiring.designCurrentAmps, locale)} A; ${formatNumber(wiring.oneWayLengthMeters, locale)} m hossz esetén legalább ${formatNumber(wiring.recommendedCrossSectionMm2, locale)} mm² adódik kizárólag a legfeljebb ${formatNumber(wiring.maxVoltageDropPercent, locale)}%-os feszültségesési cél alapján.`,
  })[locale] || "";
}

function withNeed(need, detail) {
  return need ? `${need} ${detail}` : detail;
}

export function buildInstallationPlan(result, locale = "cs") {
  if (!result || !Number.isFinite(Number(result.systemVoltage))) return [];
  const copy = COPY[locale] || COPY.cs;
  const solarNeed = isPositiveNumber(result.solarWatts) && isPositiveNumber(result.controllerAmps)
    ? copy.solarNeed(result) : "";
  const controllerNeed = isPositiveNumber(result.controllerAmps) ? copy.controllerNeed(result) : "";
  const batteryNeed = isPositiveNumber(result.batteryAh) ? copy.batteryNeed(result) : "";
  const dcDcCurrent = chargingCurrent(result.charging?.dcDc);
  const shoreCurrent = chargingCurrent(result.charging?.shore);
  const circuits = [
    { id: "solar-controller", label: copy.solarToController, detail: withNeed(solarNeed, copy.solarDetail) },
    { id: "controller-battery", label: copy.controllerToBattery, detail: withNeed(controllerNeed, copy.dcDetail) },
    { id: "battery-distribution", label: copy.batteryToDistribution, detail: withNeed(batteryNeed, copy.dcDetail) },
  ];

  if (Number(result.inverterWatts) > 0) {
    circuits.push({ id: "battery-inverter", label: copy.batteryToInverter, detail: withNeed(copy.inverterNeed(result), copy.inverterDetail) });
  }
  if (result.charging?.dcDc?.enabled) {
    circuits.push(
      { id: "starter-dcdc", label: copy.starterToDcDc, detail: withNeed(dcDcCurrent ? copy.dcDcInputNeed(result) : "", copy.dcDcInputDetail) },
      { id: "dcdc-battery", label: copy.dcDcToBattery, detail: withNeed(dcDcCurrent ? copy.dcDcOutputNeed(result) : "", copy.dcDcOutputDetail) },
    );
  }
  if (result.charging?.shore?.enabled) {
    circuits.push(
      { id: "shore-charger", label: copy.shoreToCharger, detail: copy.acDetail },
      { id: "charger-battery", label: copy.chargerToBattery, detail: withNeed(shoreCurrent ? copy.shoreNeed(result) : "", copy.shoreDcDetail) },
    );
  }
  return circuits;
}
