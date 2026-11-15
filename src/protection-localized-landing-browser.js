import "./analytics.js";
import {
  buildCalculatorLandingAnalyticsParameters,
  clearCalculatorResultContext,
  rememberCalculatorAttribution,
} from "./calculator-attribution.js";
import { classifyCalculatorContinuation } from "./calculator-copy.js";
import { calculateDcProtectionPlan } from "./dc-protection-planner.js";

// The electrical engine is shared with CZ; localized pages make no product offer.
const COPY = Object.freeze({
  sk: {
    numberLocale: "sk-SK", yes: "Áno", no: "Nie", above: "viac ako 120 mm²",
    feasible: ({ n, r, cable }) => `Pri návrhovom prúde ${n(r.designCurrentA)} A je prvá vhodná bežná poistka ${n(r.recommendedFuseA)} A. Prierez ${cable} vychádza iba z úbytku napätia.`,
    blocked: ({ n, r }) => `Pri návrhovom prúde ${n(r.designCurrentA)} A nie je v podporovanej rade poistka, ktorá súčasne neprekročí overenú prúdovú zaťažiteľnosť vodiča a limit zariadenia.`,
    reserve: "Prierez podľa úbytku napätia nedokazuje tepelnú prúdovú zaťažiteľnosť. Tú musí overiť odborník pre konkrétny kábel, izoláciu, teplotu, zväzok a spôsob uloženia.",
    warnings: ["Poistka musí chrániť vodič a rešpektovať výrobcom povolené maximálne istenie zariadenia. Overte tiež vypínaciu schopnosť, DC napätie a umiestnenie poistky.", "Plánovacia rezerva nie je univerzálna norma. Hodnotu voľte podľa konkrétneho obvodu a požiadaviek výrobcu."],
    blockedWarning: "Zmeňte návrh obvodu. Nezvyšujte hodnotu poistky nad overenú zaťažiteľnosť vodiča ani limit zariadenia.",
    cableWarning: "Výpočet úbytku napätia presiahol tabuľku do 120 mm². Skráťte vedenie alebo zmeňte návrh a konzultujte ho s odborníkom.",
    error: "Výpočet sa nepodarilo dokončiť.",
  },
  pl: {
    numberLocale: "pl-PL", yes: "Tak", no: "Nie", above: "powyżej 120 mm²",
    feasible: ({ n, r, cable }) => `Dla prądu projektowego ${n(r.designCurrentA)} A pierwszym pasującym standardowym bezpiecznikiem jest ${n(r.recommendedFuseA)} A. Przekrój ${cable} wynika jedynie ze spadku napięcia.`,
    blocked: ({ n, r }) => `Dla prądu projektowego ${n(r.designCurrentA)} A nie ma w obsługiwanym szeregu bezpiecznika, który nie przekroczy sprawdzonej obciążalności przewodu ani limitu urządzenia.`,
    reserve: "Przekrój wynikający ze spadku napięcia nie dowodzi obciążalności prądowej. Sprawdź ją dla konkretnego przewodu, izolacji, temperatury, wiązki i sposobu ułożenia.",
    warnings: ["Bezpiecznik musi chronić przewód i spełniać wymagania producenta urządzenia. Sprawdź także zdolność wyłączania, napięcie DC i lokalizację bezpiecznika.", "Margines projektowy nie jest uniwersalną normą. Dostosuj go do konkretnego obwodu i wymagań producenta."],
    blockedWarning: "Zmień projekt obwodu. Nie zwiększaj wartości bezpiecznika ponad zweryfikowaną obciążalność przewodu ani limit urządzenia.",
    cableWarning: "Spadek napięcia wymaga przekroju ponad 120 mm². Skróć przewód lub przeprojektuj obwód z pomocą specjalisty.",
    error: "Nie udało się zakończyć obliczenia.",
  },
  hu: {
    numberLocale: "hu-HU", yes: "Igen", no: "Nem", above: "120 mm² felett",
    feasible: ({ n, r, cable }) => `${n(r.designCurrentA)} A tervezési áramhoz az első megfelelő szabványos biztosíték ${n(r.recommendedFuseA)} A. A ${cable} vezeték-keresztmetszet csak a feszültségesésből következik.`,
    blocked: ({ n, r }) => `${n(r.designCurrentA)} A tervezési áram mellett nincs olyan támogatott biztosítékméret, amely nem lépi túl az igazolt vezeték-áramterhelhetőséget és a készülék korlátját.`,
    reserve: "A feszültségesés alapján számolt keresztmetszet nem igazolja a hőterhelhetőséget. Ezt a vezeték, szigetelés, hőmérséklet, kötegelés és szerelési mód szerint külön ellenőrizni kell.",
    warnings: ["A biztosítéknak a vezetéket kell védenie, és a készülék gyártói korlátját is be kell tartania. Ellenőrizze a DC megszakítóképességet, feszültségbesorolást és elhelyezést.", "A tervezési tartalék nem általános előírás. Igazítsa az adott áramkörhöz és a gyártói utasításokhoz."],
    blockedWarning: "Módosítsa az áramkört. Ne válasszon a vezeték igazolt terhelhetőségénél vagy a készülék korlátjánál nagyobb biztosítékot.",
    cableWarning: "A feszültségeséshez 120 mm²-nél nagyobb vezeték kellene. Rövidítse a vezetéket, vagy szakemberrel tervezze át az áramkört.",
    error: "A számítás nem fejezhető be.",
  },
});

const root = document.querySelector('[data-phase2-calculator][data-calculator-intent="dc-protection"][data-calculator-locale]');
if (root) {
  const locale = root.dataset.calculatorLocale;
  const copy = COPY[locale];
  if (!copy) throw new Error(`UNSUPPORTED_DC_PROTECTION_MARKET:${locale}`);
  const form = root.querySelector("[data-calculator-form]");
  const resultPanel = root.querySelector("[data-calculator-result]");
  const errorPanel = root.querySelector("[data-calculator-error]");
  const staleNotice = root.querySelector("[data-calculator-stale]");
  const sourcePath = window.location.pathname;
  const intent = "dc-protection";
  const n = (value) => new Intl.NumberFormat(copy.numberLocale, { maximumFractionDigits: 1 }).format(value);
  const landingParameters = buildCalculatorLandingAnalyticsParameters({ sourcePath, intent, locale });
  if (!landingParameters) throw new Error(`CALCULATOR_LANDING_ATTRIBUTION_MISMATCH:${sourcePath}:${intent}:${locale}`);

  function track(event, params = {}) {
    return Boolean(window.MyPowerSetupAnalytics?.track(event, { ...landingParameters, ...params }));
  }

  function setText(selector, value) {
    const node = root.querySelector(selector);
    if (node) node.textContent = value;
  }

  function renderWarnings(result) {
    const list = root.querySelector("[data-result-warnings]");
    list.replaceChildren();
    const warnings = [...copy.warnings];
    if (!result.feasible) warnings.push(copy.blockedWarning);
    if (result.voltageDropSizing.recommendedMm2 == null) warnings.push(copy.cableWarning);
    for (const message of warnings) {
      const item = document.createElement("li");
      item.textContent = message;
      list.append(item);
    }
    list.hidden = warnings.length === 0;
  }

  function render({ userInitiated = false } = {}) {
    errorPanel.hidden = true;
    staleNotice.hidden = true;
    try {
      const inputs = Object.fromEntries(new FormData(form).entries());
      // Do not use the canonical engine's example fallback as verified ampacity.
      if (!Number.isFinite(Number(inputs.cableAmpacityA)) || Number(inputs.cableAmpacityA) <= 0) throw new Error("AMPACITY_UNVERIFIED");
      const result = calculateDcProtectionPlan(inputs);
      const cable = result.voltageDropSizing.recommendedMm2 == null ? copy.above : `${n(result.voltageDropSizing.recommendedMm2)} mm²`;
      setText("[data-result-design-current]", `${n(result.designCurrentA)} A`);
      setText("[data-result-fuse]", result.recommendedFuseA == null ? "—" : `${n(result.recommendedFuseA)} A`);
      setText("[data-result-cable-mm2]", cable);
      setText("[data-result-drop-percent]", result.voltageDropSizing.actualDropPercent == null ? "—" : `${n(result.voltageDropSizing.actualDropPercent)} %`);
      setText("[data-result-ceiling]", result.protectionCeilingA == null ? "—" : `${n(result.protectionCeilingA)} A`);
      setText("[data-result-feasible]", result.feasible ? copy.yes : copy.no);
      setText("[data-result-summary]", result.feasible ? copy.feasible({ n, r: result, cable }) : copy.blocked({ n, r: result }));
      setText("[data-result-reserve]", copy.reserve);
      renderWarnings(result);
      resultPanel.hidden = false;
      if (userInitiated) {
        resultPanel.focus({ preventScroll: true });
        track("calculation_completed", { source: "seo_landing" });
        root.dispatchEvent(new CustomEvent("mypowersetup:calculator-result", { bubbles: true, detail: { intent, locale, userInitiated: true } }));
      }
    } catch {
      resultPanel.hidden = true;
      errorPanel.textContent = copy.error;
      errorPanel.hidden = false;
      if (userInitiated) track("calculation_failed", { source: "seo_landing" });
    }
  }

  function invalidateResult() {
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
    let destination;
    try { destination = new URL(link.href, window.location.origin); } catch { return; }
    if (destination.origin !== window.location.origin) return;
    const destinationType = classifyCalculatorContinuation(destination.pathname, destination.hash, locale);
    if (destinationType) track("calculator_landing_continue", { destination_type: destinationType, destination_path: `${destination.pathname}${destination.hash || ""}` });
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
  // A safe recommendation only appears after explicit, valid user input.
  resultPanel.hidden = true;
}
