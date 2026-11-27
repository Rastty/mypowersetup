import { estimateFridgeConsumption } from "./fridge-estimator.js?v=20261127-fridge-estimate1";
import { buildFridgeEstimateAutonomyUrl } from "./calculator-handoff.js?v=20261127-fridge-estimate1";
const root = document.querySelector("[data-fridge-estimator]");
if (root) {
  const form = root.querySelector("[data-fridge-form]");
  const panel = root.querySelector("[data-fridge-result]");
  const link = root.querySelector("[data-fridge-handoff]");
  const error = root.querySelector("[data-fridge-error]");
  const limit = root.querySelector("[data-fridge-limit]");
  const locale = root.dataset.fridgeLocale;
  const format = new Intl.NumberFormat(locale, { maximumFractionDigits: 2 });
  function clear() {
    panel.hidden = true;
    link.hidden = true;
    link.removeAttribute("href");
    error.hidden = true;
    limit.hidden = true;
  }
  form.addEventListener("input", clear);
  form.addEventListener("change", clear);
  form.addEventListener("submit", event => {
    event.preventDefault();
    clear();
    const result = estimateFridgeConsumption(Object.fromEntries(new FormData(form)));
    if (!result) { error.hidden = false; return; }
    root.querySelector("[data-fridge-wh]").textContent = format.format(result.fridgeWh) + " Wh";
    root.querySelector("[data-total-wh]").textContent = format.format(result.totalWh) + " Wh";
    const href = result.handoffWh === null ? null : buildFridgeEstimateAutonomyUrl(result.handoffWh, locale);
    if (href) { link.href = href; link.hidden = false; }
    else limit.hidden = false;
    panel.hidden = false;
  });
  form.hidden = false;
}
