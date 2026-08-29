const CORE_CATEGORIES = Object.freeze(["battery", "solar_panel", "controller"]);

const COPY = Object.freeze({
  cs: {
    labels: { battery: "baterie", solar_panel: "solární panely", controller: "MPPT regulátor", inverter: "měnič", dc_charger: "DC–DC nabíječka", shore_charger: "nabíječka z 230 V" },
    complete: "Ověřené produkty pokrývají všechny části vypočtené sestavy.",
    missing: (labels) => `K úplné sestavě zatím chybí ověřená produktová shoda pro: ${labels.join(", ")}. Rozměry a minimální parametry z výpočtu zůstávají platné; konkrétní výrobek proto vyberte podle nich.`,
  },
  sk: {
    labels: { battery: "batéria", solar_panel: "solárne panely", controller: "MPPT regulátor", inverter: "menič", dc_charger: "DC–DC nabíjačka", shore_charger: "nabíjačka z 230 V" },
    complete: "Overené produkty pokrývajú všetky časti vypočítanej zostavy.",
    missing: (labels) => `K úplnej zostave zatiaľ chýba overená produktová zhoda pre: ${labels.join(", ")}. Rozmery a minimálne parametre z výpočtu zostávajú platné; konkrétny výrobok preto vyberte podľa nich.`,
  },
  pl: {
    labels: { battery: "akumulator", solar_panel: "panele fotowoltaiczne", controller: "regulator MPPT", inverter: "przetwornica", dc_charger: "ładowarka DC–DC", shore_charger: "ładowarka 230 V" },
    complete: "Zweryfikowane produkty obejmują wszystkie elementy obliczonego zestawu.",
    missing: (labels) => `Do kompletnego zestawu brakuje jeszcze zweryfikowanego dopasowania dla: ${labels.join(", ")}. Wymiary i minimalne parametry z obliczeń pozostają właściwą podstawą wyboru konkretnego produktu.`,
  },
  hu: {
    labels: { battery: "akkumulátor", solar_panel: "napelemek", controller: "MPPT szabályozó", inverter: "inverter", dc_charger: "DC–DC töltő", shore_charger: "230 V-os töltő" },
    complete: "Az ellenőrzött termékek a kiszámított rendszer minden szükséges elemét lefedik.",
    missing: (labels) => `A teljes rendszerhez még nincs ellenőrzött terméktalálat ezekben a kategóriákban: ${labels.join(", ")}. A számított méretek és minimumkövetelmények továbbra is használhatók a konkrét termék kiválasztásához.`,
  },
});

export function requiredRecommendationCategories(setup) {
  const required = [...CORE_CATEGORIES];
  if (Number(setup?.inverterWatts) > 0) required.push("inverter");
  if (setup?.charging?.dcDc?.enabled !== false && Number(setup?.charging?.dcDc?.suggestedCurrentAmps) > 0) required.push("dc_charger");
  if (setup?.charging?.shore?.enabled !== false && Number(setup?.charging?.shore?.suggestedCurrentAmps) > 0) required.push("shore_charger");
  return Object.freeze(required);
}

export function isRecommendationEligible(recommendation) {
  return Boolean(recommendation) && recommendation.available !== false && recommendation.staleSource !== true;
}

export function assessRecommendationCoverage(recommendations, setup, locale = setup?.locale) {
  const language = Object.hasOwn(COPY, locale) ? locale : "cs";
  const copy = COPY[language];
  const required = requiredRecommendationCategories(setup);
  const eligibleCount = (category) => (recommendations?.[category] || []).filter(isRecommendationEligible).length;
  const missing = required.filter((category) => eligibleCount(category) === 0);
  const covered = required.filter((category) => !missing.includes(category));
  return Object.freeze({
    complete: missing.length === 0,
    required,
    covered: Object.freeze(covered),
    missing: Object.freeze(missing),
    ratio: required.length ? covered.length / required.length : 1,
    message: missing.length
      ? copy.missing(missing.map((category) => copy.labels[category]))
      : copy.complete,
  });
}
