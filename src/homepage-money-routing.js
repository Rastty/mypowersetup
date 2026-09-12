const HOME_MONEY_LINKS = Object.freeze({
  cs: Object.freeze([
    card("/pruvodce/kapacita-baterie-do-karavanu/", "Baterie", "Kolik Ah baterii potřebujete?", "Kapacita podle spotřeby, autonomie a chemie baterie."),
    card("/pruvodce/kolik-w-solarnich-panelu/", "Solár", "Kolik wattů solárních panelů?", "Výkon panelů podle spotřeby, sezóny a rezervy."),
    card("/pruvodce/jak-vybrat-mppt-regulator/", "MPPT", "Jak vybrat MPPT regulátor?", "Proud, napětí panelů a kompatibilita s baterií."),
    card("/pruvodce/jak-vybrat-dc-dc-nabijecku/", "DC–DC", "Jak vybrat DC–DC nabíječku?", "Dobíjení za jízdy podle alternátoru, baterie a kabeláže."),
    card("/pruvodce/jak-vybrat-nabijecku-230-v/", "230 V", "Jak vybrat nabíječku z 230 V?", "Nabíjecí proud, profil baterie a reálná doba dobíjení."),
    card("/pruvodce/jak-velky-menic-do-karavanu/", "Měnič", "Jak velký měnič potřebujete?", "Trvalý výkon, rozběhová špička a proud z baterie."),
  ]),
  sk: Object.freeze([
    card("/sk/sprievodca/kapacita-baterie-do-karavanu/", "Batéria", "Koľko Ah batérie potrebujete?", "Kapacita podľa spotreby, autonómie a typu batérie."),
    card("/sk/sprievodca/kolko-w-solarnych-panelov/", "Solár", "Koľko wattov solárnych panelov?", "Výkon panelov podľa spotreby, sezóny a rezervy."),
    card("/sk/sprievodca/ako-vybrat-mppt-regulator/", "MPPT", "Ako vybrať MPPT regulátor?", "Prúd, napätie panelov a kompatibilita s batériou."),
    card("/sk/sprievodca/ako-vybrat-dc-dc-nabijacku/", "DC–DC", "Ako vybrať DC–DC nabíjačku?", "Dobíjanie počas jazdy podľa alternátora, batérie a kabeláže."),
    card("/sk/sprievodca/ako-vybrat-nabijacku-230-v/", "230 V", "Ako vybrať nabíjačku z 230 V?", "Nabíjací prúd, profil batérie a reálny čas nabíjania."),
    card("/sk/sprievodca/aky-velky-menic-do-karavanu/", "Menič", "Aký veľký menič potrebujete?", "Trvalý výkon, rozbehová špička a prúd z batérie."),
  ]),
  pl: Object.freeze([
    card("/pl/poradnik/pojemnosc-akumulatora-do-kampera/", "Akumulator", "Ile Ah akumulatora potrzebujesz?", "Pojemność z zużycia energii, autonomii i typu akumulatora."),
    card("/pl/poradnik/ile-wat-paneli-solarnych-do-kampera/", "Fotowoltaika", "Ile watów paneli potrzebujesz?", "Moc paneli z uwzględnieniem zużycia, sezonu i zapasu."),
    card("/pl/poradnik/jak-dobrac-regulator-mppt/", "MPPT", "Jak dobrać regulator MPPT?", "Prąd, napięcie paneli i zgodność z akumulatorem."),
    card("/pl/poradnik/jak-dobrac-ladowarke-dc-dc/", "DC–DC", "Jak dobrać ładowarkę DC–DC?", "Ładowanie w trasie według alternatora, akumulatora i przewodów."),
    card("/pl/poradnik/jak-dobrac-ladowarke-230-v/", "230 V", "Jak dobrać ładowarkę 230 V?", "Prąd ładowania, profil akumulatora i realny czas ładowania."),
    card("/pl/poradnik/jak-dobrac-przetwornice-do-kampera/", "Przetwornica", "Jak dobrać przetwornicę?", "Moc ciągła, rozruch i prąd pobierany z akumulatora."),
  ]),
  hu: Object.freeze([
    card("/hu/utmutatok/lakoauto-akkumulator-kapacitas/", "Akkumulátor", "Hány Ah akkumulátor kell?", "Kapacitás a fogyasztás, autonómia és akkumulátortípus alapján."),
    card("/hu/utmutatok/hany-watt-napelem-lakoautohoz/", "Napelem", "Hány watt napelem kell?", "Napelemteljesítmény fogyasztás, évszak és tartalék alapján."),
    card("/hu/utmutatok/mppt-szabalyozo-kivalasztasa/", "MPPT", "Hogyan válassz MPPT szabályozót?", "Áram, panel-feszültség és akkumulátor-kompatibilitás."),
    card("/hu/utmutatok/dc-dc-tolto-kivalasztasa/", "DC–DC", "Mekkora DC–DC töltő kell?", "Menet közbeni töltés az alternátor, akkumulátor és kábelezés alapján."),
    card("/hu/utmutatok/230-v-os-tolto-kivalasztasa/", "230 V", "Mekkora 230 V-os töltő kell?", "Töltőáram, akkumulátorprofil és valós töltési idő."),
    card("/hu/utmutatok/lakoauto-inverter-kivalasztasa/", "Inverter", "Mekkora inverter kell?", "Folyamatos teljesítmény, indítási csúcs és akkumulátoráram."),
  ]),
});

const HOME_PATH_BY_LANG = Object.freeze({ cs: "/", sk: "/sk/", pl: "/pl/", hu: "/hu/" });
const EMPTY_LINKS = Object.freeze([]);

function card(href, label, title, description) {
  return Object.freeze({ href, label, title, description });
}

function normalizeLang(lang) {
  return String(lang || "").toLowerCase().split("-")[0];
}

function normalizePath(pathname) {
  try {
    return new URL(pathname || "/", "https://mypowersetup.com").pathname;
  } catch {
    return String(pathname || "/");
  }
}

export function coreMoneyLinks(lang) {
  return HOME_MONEY_LINKS[normalizeLang(lang)] || EMPTY_LINKS;
}

export function homepageMoneyLinks({ lang, pathname } = {}) {
  const locale = normalizeLang(lang);
  const links = coreMoneyLinks(locale);
  if (!links.length || normalizePath(pathname) !== HOME_PATH_BY_LANG[locale]) return EMPTY_LINKS;
  return links;
}

export function enhanceHomepageMoneyRouting({
  root = globalThis.document,
  lang = root?.documentElement?.lang,
  pathname = globalThis.location?.pathname,
} = {}) {
  if (!root) return 0;
  const links = homepageMoneyLinks({ lang, pathname });
  if (!links.length) return 0;

  const grid = root.querySelector?.(".guide-preview-grid");
  if (!grid || typeof root.createElement !== "function") return 0;

  const existing = new Set(
    [...(grid.querySelectorAll?.("a[href]") || [])]
      .map((link) => normalizePath(link.getAttribute?.("href")))
  );

  let added = 0;
  for (const item of links) {
    if (existing.has(normalizePath(item.href))) continue;
    const link = root.createElement("a");
    link.href = item.href;
    link.dataset.moneyGuide = "";
    link.innerHTML = `<span>${item.label}</span><h3>${item.title}</h3><p>${item.description}</p>`;
    grid.append(link);
    existing.add(normalizePath(item.href));
    added += 1;
  }
  return added;
}
