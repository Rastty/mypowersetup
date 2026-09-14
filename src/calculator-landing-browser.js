import "./analytics.js";
import { rememberCalculatorAttribution } from "./calculator-attribution.js";
import { calculateLanding } from "./calculator-landing.js";

const root = document.querySelector("[data-calculator-landing]");

if (root) {
  const form = root.querySelector("[data-calculator-form]");
  const resultPanel = root.querySelector("[data-calculator-result]");
  const errorPanel = root.querySelector("[data-calculator-error]");
  const intent = root.dataset.calculatorIntent || "battery-capacity";
  const locale = root.dataset.calculatorLocale || "cs";
  const landingPath = window.location.pathname;
  const landingParameters = Object.freeze({
    landing_path: landingPath,
    landing_intent: intent,
    landing_locale: locale,
    source_context: "seo_landing",
  });

  const formatNumber = new Intl.NumberFormat(locale === "cs" ? "cs-CZ" : locale, {
    maximumFractionDigits: 1,
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
    const destinationType = url.pathname === "/" && url.hash === "#kalkulator"
      ? "builder"
      : url.pathname.startsWith("/pruvodce/")
        ? "guide"
        : null;
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
    warnings.forEach((warning) => {
      const item = document.createElement("li");
      item.textContent = warning;
      list.append(item);
    });
    list.hidden = warnings.length === 0;
  }

  function renderBattery(result) {
    setText("[data-result-battery-wh]", `${formatNumber.format(result.batteryWh)} Wh`);
    setText("[data-result-battery-ah]", `${formatNumber.format(result.batteryAh)} Ah`);
    setText("[data-result-voltage]", `${result.systemVoltage} V`);
    setText("[data-result-battery-type]", result.batteryLabel);
    setText(
      "[data-result-summary]",
      `Pro ${formatNumber.format(result.dailyWh)} Wh denní spotřeby a ${result.autonomyDays} dny autonomie vychází minimální doporučená kapacita ${formatNumber.format(result.batteryWh)} Wh, tedy přibližně ${formatNumber.format(result.batteryAh)} Ah při ${result.systemVoltage} V.`
    );
    setText(
      "[data-result-reserve]",
      `Výpočet zahrnuje ${result.assumptions.batteryMarginPercent}% rezervu a počítá s využitelnou hloubkou vybití ${result.assumptions.usableDepthPercent} %.`
    );
  }

  function renderSolar(result) {
    setText("[data-result-solar-watts]", `${formatNumber.format(result.solarWatts)} Wp`);
    setText("[data-result-controller-amps]", `${formatNumber.format(result.controllerAmps)} A`);
    setText("[data-result-voltage]", `${result.systemVoltage} V`);
    setText("[data-result-season]", result.seasonLabel);
    setText(
      "[data-result-summary]",
      `Pro spotřebu ${formatNumber.format(result.dailyWh)} Wh/den vychází orientační minimum ${formatNumber.format(result.solarWatts)} Wp panelů a regulátor alespoň ${formatNumber.format(result.controllerAmps)} A pro ${result.systemVoltage}V systém.`
    );
    setText(
      "[data-result-reserve]",
      `Výpočet používá ${formatNumber.format(result.calculation.peakSunHours)} ekvivalentních hodin slunce denně, ${result.assumptions.solarEfficiencyPercent}% systémovou účinnost a ${result.assumptions.solarMarginPercent}% rezervu.`
    );
  }

  function renderInverter(result) {
    setText("[data-result-inverter-watts]", `${formatNumber.format(result.inverterWatts)} W`);
    setText("[data-result-surge-watts]", `${formatNumber.format(result.largestStartWatts)} W`);
    setText("[data-result-concurrent-watts]", `${formatNumber.format(result.estimatedConcurrentWatts)} W`);
    setText("[data-result-voltage]", `${result.systemVoltage} V`);
    setText(
      "[data-result-summary]",
      `Doporučený minimální výkon měniče je ${formatNumber.format(result.inverterWatts)} W. Výpočet kontroluje současný provoz i největší zadanou rozběhovou špičku.`
    );
  }

  function renderVoltageSystem(result) {
    setText("[data-result-voltage-decision]", `${result.systemVoltage} V`);
    setText("[data-result-battery-wh]", `${formatNumber.format(result.batteryWh)} Wh`);
    setText("[data-result-inverter-watts]", `${formatNumber.format(result.inverterWatts)} W`);
    setText("[data-result-daily-wh]", `${formatNumber.format(result.dailyWh)} Wh`);
    setText(
      "[data-result-summary]",
      `Pro tuto modelovou zátěž canonical engine doporučuje ${result.systemVoltage}V systém. Rozhodnutí vychází z potřebné kapacity baterie a výkonu měniče, ne jen z jednoho spotřebiče.`
    );
  }

  function renderCable(result) {
    const cable = result.recommendedMm2 == null ? "nad 120 mm²" : `${formatNumber.format(result.recommendedMm2)} mm²`;
    setText("[data-result-cable-mm2]", cable);
    setText("[data-result-current-amps]", `${formatNumber.format(result.currentAmps)} A`);
    setText("[data-result-drop-percent]", result.actualDropPercent == null ? "—" : `${formatNumber.format(result.actualDropPercent)} %`);
    setText("[data-result-drop-volts]", result.actualDropVolts == null ? "—" : `${formatNumber.format(result.actualDropVolts)} V`);
    setText(
      "[data-result-summary]",
      result.recommendedMm2 == null
        ? `Pro ${formatNumber.format(result.loadWatts)} W na ${result.systemVoltage} V a délku ${formatNumber.format(result.oneWayLengthM)} m vychází požadovaný průřez ${formatNumber.format(result.requiredMm2)} mm², tedy mimo běžnou tabulku.`
        : `Pro ${formatNumber.format(result.loadWatts)} W na ${result.systemVoltage} V a jednosměrnou délku ${formatNumber.format(result.oneWayLengthM)} m doporučujeme nejméně ${formatNumber.format(result.recommendedMm2)} mm² při limitu úbytku ${formatNumber.format(result.maxDropPercent)} %.`
    );
    setText(
      "[data-result-reserve]",
      `Počítáme měděný vodič a celou cestu tam i zpět. Skutečný úbytek se zvoleným průřezem vychází ${result.actualDropPercent == null ? "mimo tabulku" : `${formatNumber.format(result.actualDropPercent)} %`}.`
    );
  }

  const renderers = {
    "battery-capacity": renderBattery,
    "solar-sizing": renderSolar,
    "inverter-sizing": renderInverter,
    "voltage-system": renderVoltageSystem,
    "cable-voltage-drop": renderCable,
  };

  function render({ userInitiated = false } = {}) {
    errorPanel.hidden = true;

    try {
      const data = Object.fromEntries(new FormData(form).entries());
      const calculation = calculateLanding(intent, data, locale);
      const { result } = calculation;
      const renderer = renderers[intent];
      if (!renderer) throw new Error(`Unsupported calculator renderer: ${intent}`);

      renderer(result);
      renderWarnings(result.warnings);
      resultPanel.hidden = false;
      resultPanel.focus({ preventScroll: true });
      if (userInitiated) {
        track("calculation_completed", { source: "seo_landing" });
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
