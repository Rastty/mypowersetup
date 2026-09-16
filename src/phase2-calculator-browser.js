import "./analytics.js";
import { rememberCalculatorAttribution, rememberCalculatorResultContext } from "./calculator-attribution.js";
import { classifyCalculatorContinuation } from "./calculator-copy.js";
import { calculateDcDcCharger } from "./dc-dc-charger.js";
import { calculateDcProtectionPlan } from "./dc-protection-planner.js";

const root = document.querySelector("[data-phase2-calculator]");

if (root) {
  const form = root.querySelector("[data-calculator-form]");
  const resultPanel = root.querySelector("[data-calculator-result]");
  const errorPanel = root.querySelector("[data-calculator-error]");
  const intent = root.dataset.calculatorIntent;
  const locale = "cs";
  const landingPath = window.location.pathname;
  const formatNumber = new Intl.NumberFormat("cs-CZ", { maximumFractionDigits: 1 });
  const n = (value) => formatNumber.format(value);
  const landingParameters = Object.freeze({
    landing_path: landingPath,
    landing_intent: intent,
    landing_locale: locale,
    source_context: "seo_landing",
  });

  function track(event, parameters = {}) {
    return Boolean(window.MyPowerSetupAnalytics?.track(event, { ...landingParameters, ...parameters }));
  }

  function trackLandingView() {
    if (!track("calculator_landing_view")) return false;
    rememberCalculatorAttribution({
      sourcePath: landingPath,
      intent,
      locale,
      storage: window.sessionStorage,
    });
    return true;
  }

  function trackContinuation(event) {
    const link = event.target.closest?.("a[href]");
    if (!link || !root.contains(link)) return;
    let url;
    try { url = new URL(link.href, window.location.origin); } catch { return; }
    if (url.origin !== window.location.origin) return;
    const destinationType = classifyCalculatorContinuation(url.pathname, url.hash, locale);
    if (!destinationType) return;
    track("calculator_landing_continue", {
      destination_type: destinationType,
      destination_path: `${url.pathname}${url.hash || ""}`,
    });
  }

  function setText(selector, value) {
    const element = root.querySelector(selector);
    if (element) element.textContent = value;
  }

  function renderWarnings(warnings = []) {
    const list = root.querySelector("[data-result-warnings]");
    if (!list) return;
    list.replaceChildren();
    for (const warning of warnings) {
      const item = document.createElement("li");
      item.textContent = warning;
      list.append(item);
    }
    list.hidden = warnings.length === 0;
  }

  function renderDcDc(result) {
    setText("[data-result-charger-amps]", result.recommendedChargerCurrentA == null ? "—" : `${n(result.recommendedChargerCurrentA)} A`);
    setText("[data-result-required-amps]", `${n(result.requiredOutputCurrentA)} A`);
    setText("[data-result-feasible-amps]", `${n(result.feasibleOutputCurrentA)} A`);
    setText("[data-result-recharge-hours]", result.estimatedRechargeHours == null ? "—" : `${n(result.estimatedRechargeHours)} h`);
    setText("[data-result-source-amps]", result.sourceCurrentAtRecommendationA == null ? "—" : `${n(result.sourceCurrentAtRecommendationA)} A`);
    setText("[data-result-energy-wh]", `${n(result.energyToReplaceWh)} Wh`);
    setText("[data-result-target]", result.targetMet ? "Ano" : "Ne");
    const limitLabels = {
      "alternator-spare-current": "volný proud alternátoru",
      "battery-charge-current": "maximální nabíjecí proud baterie/BMS",
      "standard-charger-step": "běžné proudové stupně nabíječek",
      "no-standard-charger-within-limits": "zadané proudové limity",
    };
    const limits = result.limitingFactors.map((factor) => limitLabels[factor] || factor);
    setText("[data-result-summary]", result.recommendedChargerCurrentA == null
      ? "Při zadaných limitech nelze bezpečně doporučit běžnou proudovou třídu DC-DC nabíječky."
      : `Výpočet doporučuje nejvýše ${n(result.recommendedChargerCurrentA)} A. Pro doplnění ${n(result.replenishPercent)} % baterie je potřeba ${n(result.requiredOutputCurrentA)} A; bezpečně dostupný výstup podle zadaných limitů je ${n(result.feasibleOutputCurrentA)} A.`);
    setText("[data-result-reserve]", limits.length
      ? `Cíl omezuje: ${limits.join(", ")}. Zadaný proud alternátoru musí být skutečně volný trvalý proud po odečtení potřeb vozidla.`
      : "Cílovou dobu lze s doporučenou třídou splnit. Přesto ověřte datasheet baterie/BMS, výrobce vozidla, kabeláž a jištění.");
  }

  function renderProtection(result) {
    const cable = result.voltageDropSizing.recommendedMm2 == null ? "nad 120 mm²" : `${n(result.voltageDropSizing.recommendedMm2)} mm²`;
    setText("[data-result-design-current]", `${n(result.designCurrentA)} A`);
    setText("[data-result-fuse]", result.recommendedFuseA == null ? "—" : `${n(result.recommendedFuseA)} A`);
    setText("[data-result-cable-mm2]", cable);
    setText("[data-result-drop-percent]", result.voltageDropSizing.actualDropPercent == null ? "—" : `${n(result.voltageDropSizing.actualDropPercent)} %`);
    setText("[data-result-ceiling]", result.protectionCeilingA == null ? "—" : `${n(result.protectionCeilingA)} A`);
    setText("[data-result-feasible]", result.feasible ? "Ano" : "Ne");
    setText("[data-result-summary]", result.feasible
      ? `Při návrhovém proudu ${n(result.designCurrentA)} A vychází první vhodná běžná pojistka ${n(result.recommendedFuseA)} A a průřez podle úbytku napětí ${cable}.`
      : `Při návrhovém proudu ${n(result.designCurrentA)} A nelze v podporované řadě vybrat pojistku, která současně respektuje zadanou zatížitelnost kabelu a limit zařízení.`);
    setText("[data-result-reserve]", "Průřez podle úbytku napětí není důkaz tepelné zatížitelnosti. Ampacitu vodiče ověřte samostatně pro izolaci, teplotu, svazek a způsob uložení.");
  }

  function calculate(data) {
    if (intent === "dcdc-sizing") return calculateDcDcCharger(data);
    if (intent === "dc-protection") return calculateDcProtectionPlan(data);
    throw new Error(`Unsupported calculator intent: ${intent}`);
  }

  function render({ userInitiated = false } = {}) {
    errorPanel.hidden = true;
    try {
      const data = Object.fromEntries(new FormData(form).entries());
      const result = calculate(data);
      if (intent === "dcdc-sizing") renderDcDc(result);
      else renderProtection(result);
      renderWarnings(result.warnings);
      resultPanel.hidden = false;
      resultPanel.focus({ preventScroll: true });
      if (userInitiated) {
        const completionTracked = track("calculation_completed", { source: "seo_landing" });
        if (completionTracked && intent === "dcdc-sizing") {
          rememberCalculatorResultContext({
            sourcePath: landingPath,
            intent,
            locale,
            result,
            storage: window.sessionStorage,
          });
        }
        root.dispatchEvent(new CustomEvent("mypowersetup:calculator-result", {
          bubbles: true,
          detail: { intent, locale, userInitiated: true },
        }));
      }
    } catch (error) {
      resultPanel.hidden = true;
      errorPanel.textContent = error instanceof Error ? error.message : "Výpočet se nepodařilo dokončit.";
      errorPanel.hidden = false;
      if (userInitiated) track("calculation_failed", { source: "seo_landing" });
    }
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    track("calculator_started", { source: "seo_landing_submit" });
    render({ userInitiated: true });
  });
  root.addEventListener("click", trackContinuation);
  document.addEventListener("mypowersetup:analytics-granted", trackLandingView);

  trackLandingView();
  render();
}
