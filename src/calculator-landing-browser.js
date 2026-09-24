import "./analytics.js";
import { buildCalculatorLandingAnalyticsParameters, rememberCalculatorAttribution } from "./calculator-attribution.js";
import { calculateLanding } from "./calculator-landing.js";
import { classifyCalculatorContinuation, getCalculatorCopy } from "./calculator-copy.js";

const root = document.querySelector("[data-calculator-landing]");

if (root) {
  const form = root.querySelector("[data-calculator-form]");
  const resultPanel = root.querySelector("[data-calculator-result]");
  const errorPanel = root.querySelector("[data-calculator-error]");
  const intent = root.dataset.calculatorIntent || "battery-capacity";
  const locale = root.dataset.calculatorLocale || "cs";
  const copy = getCalculatorCopy(locale);
  const landingPath = window.location.pathname;
  const landingParameters = buildCalculatorLandingAnalyticsParameters({ sourcePath: landingPath, intent, locale });
  if (!landingParameters) throw new Error(`CALCULATOR_LANDING_ATTRIBUTION_MISMATCH:${landingPath}:${intent}:${locale}`);

  const formatNumber = new Intl.NumberFormat(copy.numberLocale, {
    maximumFractionDigits: 1,
  });
  const n = (value) => formatNumber.format(value);

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
    warnings.forEach((warning) => {
      const item = document.createElement("li");
      item.textContent = warning;
      list.append(item);
    });
    list.hidden = warnings.length === 0;
  }

  function renderBattery(result) {
    setText("[data-result-battery-wh]", `${n(result.batteryWh)} Wh`);
    setText("[data-result-battery-ah]", `${n(result.batteryAh)} Ah`);
    setText("[data-result-voltage]", `${result.systemVoltage} V`);
    setText("[data-result-battery-type]", result.batteryLabel);
    setText("[data-result-summary]", copy.batterySummary({ n, result }));
    setText("[data-result-reserve]", copy.batteryReserve({ n, result }));
  }

  function renderBatteryAutonomy(result) {
    setText("[data-result-autonomy-days]", `${n(result.autonomyDays)} dne`);
    setText("[data-result-autonomy-hours]", `${n(result.autonomyHours)} h`);
    setText("[data-result-usable-wh]", `${n(result.usableWh)} Wh`);
    setText("[data-result-planning-wh]", `${n(result.planningWh)} Wh`);
    setText("[data-result-summary]", copy.autonomySummary({ n, result }));
    setText("[data-result-reserve]", copy.autonomyReserve({ n, result }));
  }

  function renderSolar(result) {
    setText("[data-result-solar-watts]", `${n(result.solarWatts)} Wp`);
    setText("[data-result-controller-amps]", `${n(result.controllerAmps)} A`);
    setText("[data-result-voltage]", `${result.systemVoltage} V`);
    setText("[data-result-season]", result.seasonLabel);
    setText("[data-result-summary]", copy.solarSummary({ n, result }));
    setText("[data-result-reserve]", copy.solarReserve({ n, result }));
  }

  function renderMppt(result) {
    setText("[data-result-panel-watts]", `${n(result.panelWatts)} Wp`);
    setText("[data-result-controller-amps]", `${n(result.controllerAmps)} A`);
    setText("[data-result-voltage]", `${result.systemVoltage} V`);
    setText("[data-result-charge-voltage]", `${n(result.controllerSizingVoltage)} V`);
    setText("[data-result-summary]", copy.mpptSummary({ n, result }));
    setText("[data-result-reserve]", copy.mpptReserve({ n, result }));
  }

  function renderInverter(result) {
    setText("[data-result-inverter-watts]", `${n(result.inverterWatts)} W`);
    setText("[data-result-surge-watts]", `${n(result.largestStartWatts)} W`);
    setText("[data-result-concurrent-watts]", `${n(result.estimatedConcurrentWatts)} W`);
    setText("[data-result-voltage]", `${result.systemVoltage} V`);
    setText("[data-result-summary]", copy.inverterSummary({ n, result }));
  }

  function renderVoltageSystem(result) {
    setText("[data-result-voltage-decision]", `${result.systemVoltage} V`);
    setText("[data-result-battery-wh]", `${n(result.batteryWh)} Wh`);
    setText("[data-result-inverter-watts]", `${n(result.inverterWatts)} W`);
    setText("[data-result-daily-wh]", `${n(result.dailyWh)} Wh`);
    setText("[data-result-summary]", copy.voltageSummary({ n, result }));
  }

  function renderCable(result) {
    const cable = result.recommendedMm2 == null ? copy.cableTooLarge : `${n(result.recommendedMm2)} mm²`;
    setText("[data-result-cable-mm2]", cable);
    setText("[data-result-current-amps]", `${n(result.currentAmps)} A`);
    setText("[data-result-drop-percent]", result.actualDropPercent == null ? "—" : `${n(result.actualDropPercent)} %`);
    setText("[data-result-drop-volts]", result.actualDropVolts == null ? "—" : `${n(result.actualDropVolts)} V`);
    setText("[data-result-summary]", copy.cableSummary({ n, result }));
    setText("[data-result-reserve]", copy.cableReserve({ n, result }));
  }

  const renderers = {
    "battery-capacity": renderBattery,
    "battery-autonomy": renderBatteryAutonomy,
    "solar-sizing": renderSolar,
    "mppt-sizing": renderMppt,
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
      errorPanel.textContent = error instanceof Error ? error.message : copy.failed;
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
