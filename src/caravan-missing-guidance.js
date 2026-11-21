// Buyer education for missing caravan electrical components. No products,
// inferred specs, off-site checkout links or claims of a compatible SKU.
const GUIDANCE = Object.freeze({
  cs: {
    heading: "Jak vybrat chybějící komponentu",
    intro: "Tyto kontrolní body nejsou doporučením konkrétního výrobku. Potřebné hodnoty ověřte podle výsledku výpočtu a štítků dalších zařízení.",
    toggle: "Co ověřit před nákupem",
    notes: {
      battery: [
        "Porovnejte vypočtenou využitelnou kapacitu (Wh/Ah) se skutečnou využitelnou kapacitou baterie při zvoleném napětí.",
        "Ověřte trvalý a krátkodobý proud BMS vzhledem k měniči a ostatním spotřebičům.",
        "U LiFePO4 ověřte ochranu nabíjení při nízké teplotě, způsob upevnění a jištění.",
      ],
      solar_panel: [
        "Zkontrolujte součet výkonů Wp proti výsledku a skutečnému prostoru na střeše včetně přesahů.",
        "Ověřte napětí naprázdno Voc za chladu a proud panelů vzhledem k povoleným mezím MPPT.",
        "Před nákupem zvažte zastínění, průchodky, bezpečné upevnění a kabeláž.",
      ],
      controller: [
        "Zkontrolujte napětí bateriového systému a kompatibilní nabíjecí profil baterie.",
        "Sečtěte Voc panelů za nejnižší očekávané teploty a porovnejte s maximálním PV vstupem MPPT.",
        "Ověřte vstupní proud panelů a výstupní nabíjecí proud regulátoru včetně jištění.",
      ],
      inverter: [
        "Požadujte čistý sinus a správné vstupní DC napětí podle vypočteného systému.",
        "Trvalý výkon musí pokrýt současný odběr 230V spotřebičů; špičkový výkon jejich rozběh.",
        "Ověřte odběr z baterie, limit BMS, průřez kabelů, pojistku a větrání.",
      ],
      dc_charger: [
        "Ověřte napětí startovací i obytné baterie a podporu jejich chemie a nabíjecího profilu.",
        "Proud nabíječky musí odpovídat alternátoru, baterii a délce i průřezu kabeláže.",
        "U moderních alternátorů ověřte řízení aktivace a bezpečné jištění na obou stranách.",
      ],
      shore_charger: [
        "Zkontrolujte vstup 230 V, nabíjecí napětí a profil zvolené baterie.",
        "Zvažte reálně dostupnou dobu nabíjení, vhodný nabíjecí proud a omezení BMS.",
        "Zapojení ze sítě, ochrany a bezpečnost v karavanu řešte s kvalifikovaným odborníkem.",
      ],
    },
  },
  sk: {
    heading: "Ako vybrať chýbajúci komponent",
    intro: "Toto nie je odporúčanie konkrétneho výrobku. Potrebné hodnoty overte vo výsledku výpočtu a na štítkoch zariadení.",
    toggle: "Čo overiť pred nákupom",
    notes: {
      battery: ["Porovnajte vypočítanú využiteľnú kapacitu (Wh/Ah) so skutočnou kapacitou batérie pri správnom napätí.","Overte trvalý a špičkový prúd BMS vzhľadom na menič a spotrebiče.","Pri LiFePO4 overte ochranu nabíjania v chlade, uchytenie a istenie."],
      solar_panel: ["Overte celkové Wp a dostupné rozmery strechy.","Porovnajte Voc panelov pri nízkej teplote a ich prúd s limitmi MPPT.","Zohľadnite zatienenie, upevnenie, priechodky a kabeláž."],
      controller: ["Overte napätie batérie a správny nabíjací profil.","Porovnajte Voc panelov v chlade s maximálnym PV vstupom regulátora.","Overte vstupný a výstupný prúd MPPT vrátane istenia."],
      inverter: ["Vyžadujte čistý sínus a správne vstupné DC napätie.","Trvalý výkon musí pokryť spotrebu; špičkový výkon rozbeh zariadení.","Overte odber z batérie, BMS, káble, poistku a vetranie."],
      dc_charger: ["Overte napätie oboch batérií, chémiu a nabíjací profil.","Nabíjací prúd musí vyhovovať alternátoru a kabeláži.","Skontrolujte riadenie aktivácie a istenie oboch strán."],
      shore_charger: ["Overte 230 V vstup a správny nabíjací profil.","Zohľadnite čas nabíjania, nabíjací prúd a limit BMS.","Sieťové zapojenie a ochrany nech navrhne kvalifikovaný odborník."],
    },
  },
  pl: {
    heading: "Jak dobrać brakujący element",
    intro: "To nie jest rekomendacja konkretnego produktu. Wymagane parametry sprawdź w wyniku obliczeń i na tabliczkach urządzeń.",
    toggle: "Co sprawdzić przed zakupem",
    notes: {
      battery: ["Porównaj obliczoną pojemność użytkową (Wh/Ah) z rzeczywistą pojemnością przy właściwym napięciu.","Sprawdź dopuszczalny prąd ciągły i chwilowy BMS względem przetwornicy.","Dla LiFePO4 sprawdź ochronę ładowania przy niskiej temperaturze, montaż i zabezpieczenia."],
      solar_panel: ["Sprawdź sumę mocy Wp i miejsce na dachu.","Porównaj Voc paneli na mrozie oraz ich prąd z limitami MPPT.","Uwzględnij zacienienie, mocowanie, przepusty i przewody."],
      controller: ["Sprawdź napięcie akumulatora i właściwy profil ładowania.","Porównaj Voc paneli na mrozie z maksymalnym wejściem PV regulatora.","Sprawdź dopuszczalne prądy wejścia i ładowania oraz zabezpieczenia."],
      inverter: ["Wybieraj czysty sinus i zgodne wejściowe napięcie DC.","Moc ciągła musi pokrywać obciążenie, a szczytowa rozruch urządzeń.","Sprawdź pobór prądu z akumulatora, BMS, przewody, bezpiecznik i wentylację."],
      dc_charger: ["Sprawdź napięcie obu akumulatorów, chemię i profil ładowania.","Prąd ładowania musi odpowiadać alternatorowi i okablowaniu.","Sprawdź sterowanie ładowaniem i zabezpieczenia po obu stronach."],
      shore_charger: ["Sprawdź wejście 230 V i profil ładowania akumulatora.","Uwzględnij dostępny czas ładowania, prąd i ograniczenia BMS.","Połączenia sieciowe i zabezpieczenia powierz wykwalifikowanej osobie."],
    },
  },
});

export function missingPartGuidance(locale, category) {
  const copy = GUIDANCE[locale] || GUIDANCE.cs;
  return Object.freeze({
    heading: copy.heading,
    intro: copy.intro,
    toggle: copy.toggle,
    checks: Object.freeze([...(copy.notes[category] || [])]),
  });
}

// Enhance only unavailable rows that the core catalog engine already marked.
// Keep the original product-selection and affiliate click guards intact.
export function mountMissingPartGuidance(root = document) {
  const container = root.querySelector("#caravan-buyer-checklist");
  if (!container) return;
  const locale = root.documentElement?.lang || "cs";
  const addGuidance = () => {
    const section = container.querySelector(".caravan-buying-plan");
    if (!section) return;
    for (const row of section.querySelectorAll("li.is-missing[data-buying-category]")) {
      if (row.querySelector("[data-missing-part-guidance]")) continue;
      const copy = missingPartGuidance(locale, row.dataset.buyingCategory);
      if (!copy.checks.length) continue;
      const details = root.createElement("details");
      details.className = "caravan-missing-guidance";
      details.dataset.missingPartGuidance = "";
      const summary = root.createElement("summary");
      summary.textContent = copy.toggle;
      const intro = root.createElement("p");
      intro.textContent = copy.intro;
      const list = root.createElement("ul");
      for (const item of copy.checks) {
        const li = root.createElement("li");
        li.textContent = item;
        list.append(li);
      }
      details.append(summary, intro, list);
      row.append(details);
    }
  };
  addGuidance();
  new MutationObserver(addGuidance).observe(container, { childList: true });
}
if (typeof document !== "undefined") mountMissingPartGuidance(document);
