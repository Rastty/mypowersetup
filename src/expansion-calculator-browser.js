import { calculateSetup } from "./engine.js";
import { buildPortugalRecommendations, loadPortugalProductCatalog, portugalRecommendationCoverage } from "./pt-recommendations.js";

const root = document.querySelector("[data-expansion-calculator]");
if (!root) throw new Error("EXPANSION_CALCULATOR_ROOT_MISSING");

const locale = root.dataset.market;
const form = root.querySelector("form");
const steps = [...root.querySelectorAll("[data-form-step]")];
const stepButtons = [...root.querySelectorAll("[data-step-target]")];
const error = root.querySelector("[data-calculator-error]");
const result = root.querySelector("[data-result]");

const labels = {
  ro: { required: "Selectează cel puțin un consumator.", daily: "Consum zilnic", battery: "Baterie", solar: "Panouri solare", inverter: "Invertor", mppt: "Controler MPPT", voltage: "Sistem", again: "Modifică datele" },
  pt: { required: "Seleciona pelo menos um equipamento.", daily: "Consumo diário", battery: "Bateria", solar: "Painéis solares", inverter: "Inversor", mppt: "Controlador MPPT", voltage: "Sistema", again: "Alterar dados", products: "Produtos compatíveis verificados", productsIntro: "Mostramos apenas produtos cujo destino exato e requisitos técnicos conseguimos validar.", solarFit: (quantity, powerW) => `${quantity} × ${powerW} W cobre a potência solar calculada`, powerStationFit: "Os limites elétricos verificados cobrem o perfil calculado", viewProduct: "Ver produto", affiliate: "Ligação de afiliado; a recomendação técnica não depende da comissão." },
  si: { required: "Izberi vsaj en porabnik.", daily: "Dnevna poraba", battery: "Baterija", solar: "Solarni paneli", inverter: "Inverter", mppt: "Regulator MPPT", voltage: "Sistem", again: "Spremeni podatke" },
}[locale];

let currentStep = 1;
showStep(1);

root.addEventListener("click", (event) => {
  const next = event.target.closest("[data-next]");
  const back = event.target.closest("[data-back]");
  const edit = event.target.closest("[data-edit]");
  const affiliate = event.target.closest("[data-affiliate-product]");
  if (next) {
    track("calculator_started", { source: "next_button" });
    showStep(Math.min(3, currentStep + 1));
  }
  if (back) showStep(Math.max(1, currentStep - 1));
  if (edit) showStep(2);
  if (affiliate) track("affiliate_product_click", { market: locale, category: affiliate.dataset.category || "unknown", merchant: "allpowers_pt" });
});

form.addEventListener("input", () => track("calculator_started", { source: "form_input" }));
form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const selected = [...form.querySelectorAll("[data-appliance]:checked")];
  if (!selected.length) {
    error.textContent = labels.required;
    error.hidden = false;
    return;
  }
  error.hidden = true;
  const data = new FormData(form);
  const appliances = selected.map((input) => ({ selected: true, name: input.dataset.name, watts: Number(input.dataset.watts), hours: Number(input.dataset.hours), quantity: 1, ac: input.dataset.ac === "true", surge: Number(input.dataset.surge || 1) }));
  const calculation = calculateSetup({ locale, appliances, autonomyDays: Number(data.get("autonomyDays")), season: data.get("season"), batteryType: data.get("batteryType"), systemVoltage: data.get("systemVoltage") });
  renderResult(calculation);
  track("calculation_completed", { daily_wh: calculation.dailyWh, battery_wh: calculation.batteryWh, solar_watts: calculation.solarWatts, system_voltage: calculation.systemVoltage, selected_appliances: selected.length });
  showStep(3);
  if (locale === "pt") await renderPortugalProducts(calculation);
});

function showStep(step) {
  currentStep = step;
  for (const section of steps) { const active = Number(section.dataset.formStep) === step; section.hidden = !active; section.classList.toggle("is-visible", active); }
  for (const button of stepButtons) { const target = Number(button.dataset.stepTarget); button.classList.toggle("is-active", target === step); button.disabled = target > step; }
}

function renderResult(value) {
  const warnings = value.warnings.length ? `<ul>${value.warnings.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>` : "";
  result.innerHTML = `<div class="result-grid"><article class="result-card"><span>${labels.daily}</span><strong>${value.dailyWh} Wh</strong></article><article class="result-card"><span>${labels.battery}</span><strong>${value.batteryAh} Ah / ${value.batteryWh} Wh</strong><small>${escapeHtml(value.batteryLabel)}</small></article><article class="result-card"><span>${labels.solar}</span><strong>${value.solarWatts} Wp</strong></article><article class="result-card"><span>${labels.inverter}</span><strong>${value.inverterWatts} W</strong></article><article class="result-card"><span>${labels.mppt}</span><strong>${value.controllerAmps} A</strong></article><article class="result-card"><span>${labels.voltage}</span><strong>${value.systemVoltage} V</strong></article></div>${warnings}<div data-product-recommendations></div><button class="button button-secondary" type="button" data-edit>${labels.again}</button>`;
}

async function renderPortugalProducts(calculation) {
  const target = result.querySelector("[data-product-recommendations]");
  if (!target) return;
  try {
    const catalog = await loadPortugalProductCatalog();
    const recommendations = buildPortugalRecommendations(catalog, calculation, 3);
    const coverage = portugalRecommendationCoverage(recommendations);
    const products = [...recommendations.solar_panel, ...recommendations.power_station];
    track("product_recommendations_rendered", { market: "pt", solar_panel_covered: coverage.solarPanel, power_station_covered: coverage.powerStation, product_count: products.length });
    if (!products.length) return;
    target.innerHTML = `<section class="result-products" aria-labelledby="pt-products-title"><h4 id="pt-products-title">${labels.products}</h4><p>${labels.productsIntro}</p><div class="result-grid">${products.map(renderPortugalProduct).join("")}</div><p><small>${labels.affiliate}</small></p></section>`;
  } catch {
    track("product_recommendations_rendered", { market: "pt", solar_panel_covered: false, power_station_covered: false, product_count: 0 });
    target.replaceChildren();
  }
}

function renderPortugalProduct(item) {
  const fit = item.category === "solar_panel"
    ? labels.solarFit(item.quantity, item.powerW)
    : labels.powerStationFit;
  const price = Number.isFinite(item.price) ? `<small>${new Intl.NumberFormat("pt-PT", { style: "currency", currency: item.currency || "EUR" }).format(item.price)}</small>` : "";
  return `<article class="result-card"><span>${item.category === "solar_panel" ? labels.solar : "Power station"}</span><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(fit)}</small>${price}<a class="button button-primary" data-affiliate-product data-category="${escapeHtml(item.category)}" href="${escapeHtml(item.affiliateUrl)}" rel="sponsored nofollow noopener" target="_blank">${labels.viewProduct}</a></article>`;
}

function track(event, parameters) { return window.MyPowerSetupAnalytics?.track?.(event, parameters) ?? false; }
function escapeHtml(value) { return String(value).replace(/[&<>\"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[char]); }
