import "./analytics.js";
import {
  buildCalculatorLandingAnalyticsParameters,
  clearCalculatorResultContext,
  rememberCalculatorAttribution,
  rememberCalculatorResultContext,
} from "./calculator-attribution.js";
import { classifyCalculatorContinuation } from "./calculator-copy.js";
import { calculateDcDcCharger } from "./dc-dc-charger.js";
import { mountMarketDcdcBuyers } from "./market-dcdc-calculator-offers-browser.js?v=20261128-market-dcdc1";

// One shared electrical engine for all markets. Only the explanation is localized.
// SK/PL use independently reviewed local offers; HU has no buyer block.
const COPY = Object.freeze({
  sk: {
    numberLocale: "sk-SK", yes: "Áno", no: "Nie",
    unavailable: "Pri zadaných limitoch nie je možné bezpečne odporučiť bežnú prúdovú triedu DC/DC nabíjačky.",
    summary: ({ n, r }) => `Výpočet odporúča najviac ${n(r.recommendedChargerCurrentA)} A. Na doplnenie ${n(r.replenishPercent)} % batérie je potrebných ${n(r.requiredOutputCurrentA)} A, ale podľa zadaných limitov je dostupných ${n(r.feasibleOutputCurrentA)} A.`,
    limiting: "Cieľ obmedzuje", completed: "Cieľová doba sa dá s odporúčanou triedou splniť. Napriek tomu overte manuál batérie/BMS, výrobcu vozidla, káble a istenie.",
    spare: "Zadaný prúd alternátora musí byť skutočne voľný trvalý prúd po odpočítaní spotreby vozidla.",
    labels: { "alternator-spare-current": "voľný prúd alternátora", "battery-charge-current": "nabíjací limit batérie/BMS", "standard-charger-step": "bežné prúdové triedy nabíjačiek", "no-standard-charger-within-limits": "zadané prúdové limity" },
    warnings: ["Voľný prúd alternátora nie je jeho menovitý prúd. Overte rezervu pri prevádzkovej teplote a otáčkach podľa výrobcu vozidla.", "Overte nabíjací limit batérie/BMS, typ DC/DC nabíjačky, obe napätia, profil nabíjania, káble a istenie."],
    warningTarget: "V cieľovom čase jazdy nie je možné doplniť požadovanú energiu. Predĺžte jazdu, znížte cieľ alebo odborne overte dostupný nabíjací prúd.",
    error: "Výpočet sa nepodarilo dokončiť.",
  },
  pl: {
    numberLocale: "pl-PL", yes: "Tak", no: "Nie",
    unavailable: "Przy podanych ograniczeniach nie można bezpiecznie wskazać standardowego prądu ładowarki DC/DC.",
    summary: ({ n, r }) => `Obliczony zalecany prąd ładowarki to maksymalnie ${n(r.recommendedChargerCurrentA)} A. Aby uzupełnić ${n(r.replenishPercent)}% akumulatora, potrzeba ${n(r.requiredOutputCurrentA)} A, a dostępny prąd wyjściowy to ${n(r.feasibleOutputCurrentA)} A.`,
    limiting: "Cel ogranicza", completed: "Zalecana klasa ładowarki pozwala osiągnąć cel w zadanym czasie. Sprawdź jednak dane akumulatora/BMS, pojazdu, przewodów i zabezpieczeń.",
    spare: "Podany prąd alternatora musi być rzeczywistym prądem dostępnym stale po odjęciu potrzeb pojazdu.",
    labels: { "alternator-spare-current": "dostępny prąd alternatora", "battery-charge-current": "limit ładowania akumulatora/BMS", "standard-charger-step": "standardowe klasy ładowarek", "no-standard-charger-within-limits": "podane ograniczenia prądowe" },
    warnings: ["Dostępny prąd alternatora to nie jego prąd znamionowy. Sprawdź rezerwę przy rzeczywistej temperaturze i obrotach zgodnie z zaleceniami producenta pojazdu.", "Sprawdź limit ładowania akumulatora/BMS, napięcia wejścia i wyjścia ładowarki, profil ładowania, przewody i bezpieczniki."],
    warningTarget: "Nie uda się uzupełnić planowanej energii w wyznaczonym czasie jazdy. Wydłuż jazdę, zmniejsz cel lub zleć weryfikację dostępnego prądu.",
    error: "Nie udało się dokończyć obliczenia.",
  },
  hu: {
    numberLocale: "hu-HU", yes: "Igen", no: "Nem",
    unavailable: "A megadott korlátok mellett nem ajánlható biztonságosan szokásos áramú DC/DC töltő.",
    summary: ({ n, r }) => `A számítás legfeljebb ${n(r.recommendedChargerCurrentA)} A-es töltőt javasol. Az akkumulátor ${n(r.replenishPercent)}%-ának pótlásához ${n(r.requiredOutputCurrentA)} A kellene, a megadott korlátok alapján ${n(r.feasibleOutputCurrentA)} A áll rendelkezésre.`,
    limiting: "A célt korlátozza", completed: "A javasolt töltőárammal a célidő elérhető. Ellenőrizze az akkumulátor/BMS, a jármű, a vezetékek és a biztosítékok előírásait is.",
    spare: "A megadott generátoráramnak a jármű saját igényei feletti, tartósan rendelkezésre álló áramnak kell lennie.",
    labels: { "alternator-spare-current": "generátor szabad árama", "battery-charge-current": "akkumulátor/BMS töltési korlátja", "standard-charger-step": "a töltők szokásos áramfokozatai", "no-standard-charger-within-limits": "a megadott áramkorlátok" },
    warnings: ["A generátor névleges árama nem egyezik a tartósan felhasználható árammal. A jármű gyártói útmutatója szerint ellenőrizze a tartalékot üzemi hőmérsékleten.", "Ellenőrizze az akkumulátor/BMS töltési korlátját, a DC/DC töltő bemeneti és kimeneti feszültségét, töltési profilját, vezetékeit és biztosítékait."],
    warningTarget: "A kívánt energiamennyiség nem tölthető vissza a célzott vezetési idő alatt. Hosszabbítsa meg az utat, csökkentse a célt, vagy szakemberrel ellenőriztesse a rendelkezésre álló áramot.",
    error: "A számítás nem fejezhető be.",
  },
});

const root = document.querySelector('[data-phase2-calculator][data-calculator-intent="dcdc-sizing"][data-calculator-locale]');

if (root) {
  const locale = root.dataset.calculatorLocale;
  const copy = COPY[locale];
  if (!copy) throw new Error(`UNSUPPORTED_DC_DC_MARKET:${locale}`);
  const form = root.querySelector("[data-calculator-form]");
  const resultPanel = root.querySelector("[data-calculator-result]");
  const errorPanel = root.querySelector("[data-calculator-error]");
  const staleNotice = root.querySelector("[data-calculator-stale]");
  const intent = "dcdc-sizing";
  const buyers = mountMarketDcdcBuyers(root);
  const sourcePath = window.location.pathname;
  const n = (value) => new Intl.NumberFormat(copy.numberLocale, { maximumFractionDigits: 1 }).format(value);
  const landingParameters = buildCalculatorLandingAnalyticsParameters({ sourcePath, intent, locale });
  if (!landingParameters) throw new Error(`CALCULATOR_LANDING_ATTRIBUTION_MISMATCH:${sourcePath}:${intent}:${locale}`);

  function track(event, parameters = {}) {
    return Boolean(window.MyPowerSetupAnalytics?.track(event, { ...landingParameters, ...parameters }));
  }

  function setText(selector, value) {
    const element = root.querySelector(selector);
    if (element) element.textContent = value;
  }

  function renderWarnings(result) {
    const list = root.querySelector("[data-result-warnings]");
    list.replaceChildren();
    const warnings = [...copy.warnings, ...(!result.targetMet ? [copy.warningTarget] : [])];
    for (const warning of warnings) {
      const li = document.createElement("li");
      li.textContent = warning;
      list.append(li);
    }
    list.hidden = warnings.length === 0;
  }

  function render({ userInitiated = false } = {}) {
    errorPanel.hidden = true;
    staleNotice.hidden = true;
    try {
      const result = calculateDcDcCharger(Object.fromEntries(new FormData(form).entries()));
      setText("[data-result-charger-amps]", result.recommendedChargerCurrentA == null ? "—" : `${n(result.recommendedChargerCurrentA)} A`);
      setText("[data-result-required-amps]", `${n(result.requiredOutputCurrentA)} A`);
      setText("[data-result-feasible-amps]", `${n(result.feasibleOutputCurrentA)} A`);
      setText("[data-result-recharge-hours]", result.estimatedRechargeHours == null ? "—" : `${n(result.estimatedRechargeHours)} h`);
      setText("[data-result-source-amps]", result.sourceCurrentAtRecommendationA == null ? "—" : `${n(result.sourceCurrentAtRecommendationA)} A`);
      setText("[data-result-energy-wh]", `${n(result.energyToReplaceWh)} Wh`);
      setText("[data-result-target]", result.targetMet ? copy.yes : copy.no);
      setText("[data-result-summary]", result.recommendedChargerCurrentA == null ? copy.unavailable : copy.summary({ n, r: result }));
      const limits = result.limitingFactors.map((factor) => copy.labels[factor] || factor);
      setText("[data-result-reserve]", limits.length ? `${copy.limiting}: ${limits.join(", ")}. ${copy.spare}` : copy.completed);
      renderWarnings(result);
      resultPanel.hidden = false;
      if (userInitiated) {
        void buyers?.update(result);
        // Do not move focus during the SEO preview; only after explicit input.
        resultPanel.focus({ preventScroll: true });
        const completed = track("calculation_completed", { source: "seo_landing" });
        if (completed) rememberCalculatorResultContext({ sourcePath, intent, locale, result, storage: window.sessionStorage });
        root.dispatchEvent(new CustomEvent("mypowersetup:calculator-result", { bubbles: true, detail: { intent, locale, userInitiated: true } }));
      }
    } catch (error) {
      buyers?.invalidate();
      resultPanel.hidden = true;
      errorPanel.textContent = copy.error;
      errorPanel.hidden = false;
      if (userInitiated) track("calculation_failed", { source: "seo_landing" });
    }
  }

  function invalidateResult() {
    buyers?.invalidate();
    resultPanel.hidden = true;
    errorPanel.hidden = true;
    staleNotice.hidden = false;
    clearCalculatorResultContext({ sourcePath, intent, locale, storage: window.sessionStorage });
  }

  function trackLandingView() {
    if (track("calculator_landing_view")) rememberCalculatorAttribution({ sourcePath, intent, locale, storage: window.sessionStorage });
  }

  root.addEventListener("click", (event) => {
    const link = event.target.closest?.("a[href]");
    if (!link || !root.contains(link)) return;
    let url;
    try { url = new URL(link.href, window.location.origin); } catch { return; }
    if (url.origin !== window.location.origin) return;
    const destinationType = classifyCalculatorContinuation(url.pathname, url.hash, locale);
    if (destinationType) track("calculator_landing_continue", { destination_type: destinationType, destination_path: `${url.pathname}${url.hash || ""}` });
  });
  form.addEventListener("input", invalidateResult);
  form.addEventListener("change", invalidateResult);
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    track("calculator_started", { source: "seo_landing_submit" });
    render({ userInitiated: true });
  });
  document.addEventListener("mypowersetup:analytics-granted", trackLandingView);
  clearCalculatorResultContext({ sourcePath, intent, locale, storage: window.sessionStorage });
  trackLandingView();
  render();
}
