const COPY = Object.freeze({
  cs: Object.freeze({
    numberLocale: "cs-CZ",
    failed: "Výpočet se nepodařilo dokončit.",
    batterySummary: ({ n, result }) => `Pro ${n(result.dailyWh)} Wh denní spotřeby a ${result.autonomyDays} dny autonomie vychází minimální doporučená kapacita ${n(result.batteryWh)} Wh, tedy přibližně ${n(result.batteryAh)} Ah při ${result.systemVoltage} V.`,
    batteryReserve: ({ result }) => `Výpočet zahrnuje ${result.assumptions.batteryMarginPercent}% rezervu a počítá s využitelnou hloubkou vybití ${result.assumptions.usableDepthPercent} %.`,
    autonomySummary: ({ n, result }) => `Baterie ${n(result.batteryCapacityAh)} Ah při ${result.systemVoltage} V a denní spotřebě ${n(result.dailyWh)} Wh vychází konzervativně přibližně na ${n(result.autonomyDays)} dne, tedy asi ${n(result.autonomyHours)} hodin bez dobíjení.`,
    autonomyReserve: ({ n, result }) => `Z jmenovitých ${n(result.nominalWh)} Wh počítáme s využitelnou hloubkou vybití ${result.usableDepthPercent} % a stejnou ${result.batteryMarginPercent}% návrhovou rezervou jako hlavní Builder. Pro plánování tak zůstává přibližně ${n(result.planningWh)} Wh.`,
    solarSummary: ({ n, result }) => `Pro spotřebu ${n(result.dailyWh)} Wh/den vychází orientační minimum ${n(result.solarWatts)} Wp panelů a regulátor alespoň ${n(result.controllerAmps)} A pro ${result.systemVoltage}V systém.`,
    solarReserve: ({ n, result }) => `Výpočet používá ${n(result.calculation.peakSunHours)} ekvivalentních hodin slunce denně, ${result.assumptions.solarEfficiencyPercent}% systémovou účinnost a ${result.assumptions.solarMarginPercent}% rezervu.`,
    mpptSummary: ({ n, result }) => `Pro ${n(result.panelWatts)} Wp panelů a ${result.systemVoltage}V bateriový systém vychází doporučená minimální proudová třída MPPT ${n(result.controllerAmps)} A.`,
    mpptReserve: ({ n, result }) => `Proud je dimenzovaný přes nabíjecí napětí ${n(result.controllerSizingVoltage)} V a zahrnuje ${result.controllerMarginPercent}% rezervu. Voc, Isc a maximální FV výkon ověřte v datasheetu konkrétního regulátoru.`,
    inverterSummary: ({ n, result }) => `Doporučený minimální výkon měniče je ${n(result.inverterWatts)} W. Výpočet kontroluje současný provoz i největší zadanou rozběhovou špičku.`,
    voltageSummary: ({ result }) => `Pro tuto modelovou zátěž doporučuje výpočet ${result.systemVoltage}V systém. Rozhodnutí vychází z potřebné kapacity baterie a výkonu měniče, ne jen z jednoho spotřebiče.`,
    cableTooLarge: "nad 120 mm²",
    cableSummary: ({ n, result }) => result.recommendedMm2 == null
      ? `Pro ${n(result.loadWatts)} W na ${result.systemVoltage} V a délku ${n(result.oneWayLengthM)} m vychází požadovaný průřez ${n(result.requiredMm2)} mm², tedy mimo běžnou tabulku.`
      : `Pro ${n(result.loadWatts)} W na ${result.systemVoltage} V a jednosměrnou délku ${n(result.oneWayLengthM)} m doporučujeme nejméně ${n(result.recommendedMm2)} mm² při limitu úbytku ${n(result.maxDropPercent)} %.`,
    cableReserve: ({ n, result }) => `Počítáme měděný vodič a celou cestu tam i zpět. Skutečný úbytek se zvoleným průřezem vychází ${result.actualDropPercent == null ? "mimo tabulku" : `${n(result.actualDropPercent)} %`}.`,
  }),
  sk: Object.freeze({
    numberLocale: "sk-SK",
    failed: "Výpočet sa nepodarilo dokončiť.",
    batterySummary: ({ n, result }) => `Pri dennej spotrebe ${n(result.dailyWh)} Wh a autonómii ${result.autonomyDays} dni vychádza minimálna odporúčaná kapacita ${n(result.batteryWh)} Wh, približne ${n(result.batteryAh)} Ah pri ${result.systemVoltage} V.`,
    batteryReserve: ({ result }) => `Výpočet zahŕňa ${result.assumptions.batteryMarginPercent} % rezervu a počíta s využiteľnou hĺbkou vybitia ${result.assumptions.usableDepthPercent} %.`,
    solarSummary: ({ n, result }) => `Pri spotrebe ${n(result.dailyWh)} Wh/deň vychádza orientačné minimum ${n(result.solarWatts)} Wp panelov a regulátor aspoň ${n(result.controllerAmps)} A pre ${result.systemVoltage} V systém.`,
    solarReserve: ({ n, result }) => `Výpočet používa ${n(result.calculation.peakSunHours)} ekvivalentných hodín slnka denne, ${result.assumptions.solarEfficiencyPercent} % účinnosť systému a ${result.assumptions.solarMarginPercent} % rezervu.`,
    mpptSummary: ({ n, result }) => `Pre ${n(result.panelWatts)} Wp panelov a ${result.systemVoltage} V batériový systém vychádza odporúčaná minimálna prúdová trieda MPPT ${n(result.controllerAmps)} A.`,
    mpptReserve: ({ n, result }) => `Prúd je dimenzovaný cez nabíjacie napätie ${n(result.controllerSizingVoltage)} V a zahŕňa ${result.controllerMarginPercent} % rezervu. Voc, Isc a maximálny FV výkon overte v datasheete regulátora.`,
    inverterSummary: ({ n, result }) => `Odporúčaný minimálny výkon meniča je ${n(result.inverterWatts)} W. Výpočet kontroluje súčasnú prevádzku aj najväčšiu zadanú rozbehovú špičku.`,
    voltageSummary: ({ result }) => `Pre túto modelovú záťaž odporúča výpočet ${result.systemVoltage} V systém. Rozhodnutie vychádza z potrebnej kapacity batérie a výkonu meniča.`,
    cableTooLarge: "nad 120 mm²",
    cableSummary: ({ n, result }) => result.recommendedMm2 == null
      ? `Pre ${n(result.loadWatts)} W pri ${result.systemVoltage} V a dĺžke ${n(result.oneWayLengthM)} m vychádza potrebný prierez ${n(result.requiredMm2)} mm², teda mimo bežnej tabuľky.`
      : `Pre ${n(result.loadWatts)} W pri ${result.systemVoltage} V a jednosmernej dĺžke ${n(result.oneWayLengthM)} m odporúčame najmenej ${n(result.recommendedMm2)} mm² pri limite úbytku ${n(result.maxDropPercent)} %.`,
    cableReserve: ({ n, result }) => `Počítame medený vodič a celú cestu tam aj späť. Skutočný úbytok so zvoleným prierezom je ${result.actualDropPercent == null ? "mimo tabuľky" : `${n(result.actualDropPercent)} %`}.`,
  }),
  pl: Object.freeze({
    numberLocale: "pl-PL",
    failed: "Nie udało się wykonać obliczenia.",
    batterySummary: ({ n, result }) => `Dla zużycia ${n(result.dailyWh)} Wh dziennie i autonomii ${result.autonomyDays} dni minimalna zalecana pojemność wynosi ${n(result.batteryWh)} Wh, czyli około ${n(result.batteryAh)} Ah przy ${result.systemVoltage} V.`,
    batteryReserve: ({ result }) => `Obliczenie uwzględnia ${result.assumptions.batteryMarginPercent} % zapasu i ${result.assumptions.usableDepthPercent} % użytecznej głębokości rozładowania.`,
    solarSummary: ({ n, result }) => `Dla zużycia ${n(result.dailyWh)} Wh/dzień orientacyjne minimum to ${n(result.solarWatts)} Wp paneli i regulator co najmniej ${n(result.controllerAmps)} A dla systemu ${result.systemVoltage} V.`,
    solarReserve: ({ n, result }) => `Obliczenie przyjmuje ${n(result.calculation.peakSunHours)} równoważnych godzin pełnego słońca dziennie, ${result.assumptions.solarEfficiencyPercent} % sprawności systemu i ${result.assumptions.solarMarginPercent} % zapasu.`,
    mpptSummary: ({ n, result }) => `Dla ${n(result.panelWatts)} Wp paneli i systemu akumulatorowego ${result.systemVoltage} V zalecana minimalna klasa prądowa MPPT wynosi ${n(result.controllerAmps)} A.`,
    mpptReserve: ({ n, result }) => `Prąd obliczono przy napięciu ładowania ${n(result.controllerSizingVoltage)} V z ${result.controllerMarginPercent} % zapasu. Voc, Isc i maksymalną moc PV sprawdź w dokumentacji regulatora.`,
    inverterSummary: ({ n, result }) => `Zalecana minimalna moc przetwornicy to ${n(result.inverterWatts)} W. Obliczenie uwzględnia jednoczesną pracę urządzeń i największy zadany skok mocy przy rozruchu.`,
    voltageSummary: ({ result }) => `Dla tego modelowego obciążenia obliczenie zaleca system ${result.systemVoltage} V. Decyzja wynika z wymaganej pojemności akumulatora i mocy przetwornicy.`,
    cableTooLarge: "powyżej 120 mm²",
    cableSummary: ({ n, result }) => result.recommendedMm2 == null
      ? `Dla ${n(result.loadWatts)} W przy ${result.systemVoltage} V i długości ${n(result.oneWayLengthM)} m wymagany przekrój wynosi ${n(result.requiredMm2)} mm², czyli wykracza poza standardową tabelę.`
      : `Dla ${n(result.loadWatts)} W przy ${result.systemVoltage} V i długości w jedną stronę ${n(result.oneWayLengthM)} m zalecamy co najmniej ${n(result.recommendedMm2)} mm² przy limicie spadku ${n(result.maxDropPercent)} %.`,
    cableReserve: ({ n, result }) => `Liczymy przewód miedziany i pełną drogę prądu tam i z powrotem. Rzeczywisty spadek dla wybranego przekroju wynosi ${result.actualDropPercent == null ? "poza tabelą" : `${n(result.actualDropPercent)} %`}.`,
  }),
  hu: Object.freeze({
    numberLocale: "hu-HU",
    failed: "A számítást nem sikerült befejezni.",
    batterySummary: ({ n, result }) => `Napi ${n(result.dailyWh)} Wh fogyasztás és ${result.autonomyDays} nap autonómia mellett a javasolt minimális kapacitás ${n(result.batteryWh)} Wh, vagyis körülbelül ${n(result.batteryAh)} Ah ${result.systemVoltage} V-on.`,
    batteryReserve: ({ result }) => `A számítás ${result.assumptions.batteryMarginPercent} % tartalékkal és ${result.assumptions.usableDepthPercent} % hasznosítható kisütési mélységgel számol.`,
    solarSummary: ({ n, result }) => `Napi ${n(result.dailyWh)} Wh fogyasztáshoz az irányadó minimum ${n(result.solarWatts)} Wp napelem és legalább ${n(result.controllerAmps)} A-es szabályozó ${result.systemVoltage} V-os rendszerhez.`,
    solarReserve: ({ n, result }) => `A számítás napi ${n(result.calculation.peakSunHours)} teljes napsütés-egyenértékű órával, ${result.assumptions.solarEfficiencyPercent} % rendszerhatásfokkal és ${result.assumptions.solarMarginPercent} % tartalékkal számol.`,
    mpptSummary: ({ n, result }) => `${n(result.panelWatts)} Wp napelemhez és ${result.systemVoltage} V-os akkumulátorrendszerhez legalább ${n(result.controllerAmps)} A-es MPPT áramosztály javasolt.`,
    mpptReserve: ({ n, result }) => `A méretezés ${n(result.controllerSizingVoltage)} V töltési feszültséggel és ${result.controllerMarginPercent} % tartalékkal számol. A Voc, Isc és maximális PV-teljesítmény határát ellenőrizd a szabályozó adatlapján.`,
    inverterSummary: ({ n, result }) => `A javasolt minimális inverterteljesítmény ${n(result.inverterWatts)} W. A számítás az egyidejű terhelést és a legnagyobb megadott indítási csúcsot is figyelembe veszi.`,
    voltageSummary: ({ result }) => `Ehhez a modellezett terheléshez a számítás ${result.systemVoltage} V-os rendszert javasol. A döntés az akkumulátor szükséges kapacitásából és az inverter teljesítményéből indul ki.`,
    cableTooLarge: "120 mm² felett",
    cableSummary: ({ n, result }) => result.recommendedMm2 == null
      ? `${n(result.loadWatts)} W, ${result.systemVoltage} V és ${n(result.oneWayLengthM)} m hossz esetén a szükséges keresztmetszet ${n(result.requiredMm2)} mm², ami kívül esik a szokásos táblázaton.`
      : `${n(result.loadWatts)} W, ${result.systemVoltage} V és ${n(result.oneWayLengthM)} m egyirányú hossz esetén legalább ${n(result.recommendedMm2)} mm² keresztmetszetet javaslunk ${n(result.maxDropPercent)} % feszültségesés-határ mellett.`,
    cableReserve: ({ n, result }) => `Rézvezetékkel és a teljes oda-vissza áramúttal számolunk. A tényleges feszültségesés a választott keresztmetszettel ${result.actualDropPercent == null ? "a táblázaton kívül van" : `${n(result.actualDropPercent)} %`}.`,
  }),
});

export function getCalculatorCopy(locale = "cs") {
  return COPY[locale] || COPY.cs;
}

export function getCalculatorMarketBase(locale = "cs") {
  return locale === "cs" ? "/" : `/${Object.hasOwn(COPY, locale) ? locale : "cs"}/`;
}

export function classifyCalculatorContinuation(pathname, hash, locale = "cs") {
  const marketBase = getCalculatorMarketBase(locale);
  if (pathname === marketBase && hash === "#kalkulator") return "builder";

  const guidePrefix = locale === "cs"
    ? "/pruvodce/"
    : locale === "sk"
      ? "/sk/sprievodca/"
      : locale === "pl"
        ? "/pl/poradnik/"
        : locale === "hu"
          ? "/hu/utmutatok/"
          : null;
  return guidePrefix && pathname.startsWith(guidePrefix) ? "guide" : null;
}