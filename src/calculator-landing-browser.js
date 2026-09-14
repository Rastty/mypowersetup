import { calculateLanding } from "./calculator-landing.js";

const root = document.querySelector("[data-calculator-landing]");

if (root) {
  const form = root.querySelector("[data-calculator-form]");
  const resultPanel = root.querySelector("[data-calculator-result]");
  const errorPanel = root.querySelector("[data-calculator-error]");
  const intent = root.dataset.calculatorIntent || "battery-capacity";
  const locale = root.dataset.calculatorLocale || "cs";

  const formatNumber = new Intl.NumberFormat(locale === "cs" ? "cs-CZ" : locale, {
    maximumFractionDigits: 0,
  });

  function render() {
    errorPanel.hidden = true;

    try {
      const data = Object.fromEntries(new FormData(form).entries());
      const calculation = calculateLanding(intent, data, locale);
      const { result } = calculation;

      root.querySelector("[data-result-battery-wh]").textContent = `${formatNumber.format(result.batteryWh)} Wh`;
      root.querySelector("[data-result-battery-ah]").textContent = `${formatNumber.format(result.batteryAh)} Ah`;
      root.querySelector("[data-result-voltage]").textContent = `${result.systemVoltage} V`;
      root.querySelector("[data-result-battery-type]").textContent = result.batteryLabel;
      root.querySelector("[data-result-summary]").textContent =
        `Pro ${formatNumber.format(result.dailyWh)} Wh denní spotřeby a ${result.autonomyDays} dny autonomie vychází minimální doporučená kapacita ${formatNumber.format(result.batteryWh)} Wh, tedy přibližně ${formatNumber.format(result.batteryAh)} Ah při ${result.systemVoltage} V.`;

      const reserve = root.querySelector("[data-result-reserve]");
      reserve.textContent = `Výpočet zahrnuje ${result.assumptions.batteryMarginPercent}% rezervu a počítá s využitelnou hloubkou vybití ${result.assumptions.usableDepthPercent} %.`;

      const warnings = root.querySelector("[data-result-warnings]");
      warnings.replaceChildren();
      result.warnings.forEach((warning) => {
        const item = document.createElement("li");
        item.textContent = warning;
        warnings.append(item);
      });
      warnings.hidden = result.warnings.length === 0;

      resultPanel.hidden = false;
      resultPanel.focus({ preventScroll: true });
    } catch (error) {
      resultPanel.hidden = true;
      errorPanel.textContent = error instanceof Error ? error.message : "Výpočet se nepodařilo dokončit.";
      errorPanel.hidden = false;
    }
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    render();
  });

  render();
}
