import { calculateSetup } from "./engine.js";
import { buildPlainLanguageVerdict } from "./verdict.js";
import { buildExpansionSetupUrl, decodeExpansionSetupQuery } from "./expansion-setup-url.js";
import { buildResultShareText, copyText } from "./share.js";

const root = document.querySelector("[data-expansion-calculator]");
if (!root) throw new Error("EXPANSION_CALCULATOR_ROOT_MISSING");

const locale = root.dataset.market;
const form = root.querySelector("form");
const steps = [...root.querySelectorAll("[data-form-step]")];
const stepButtons = [...root.querySelectorAll("[data-step-target]")];
const error = root.querySelector("[data-calculator-error]");
const result = root.querySelector("[data-result]");

const labels = {
  ro: { required: "Selectează cel puțin un consumator.", daily: "Consum zilnic", battery: "Baterie", solar: "Panouri solare", inverter: "Invertor", mppt: "Controler MPPT", voltage: "Sistem", again: "Modifică datele", share: "Copiază rezultatul", copied: "Rezultat copiat", copyFailed: "Nu s-a putut copia", products: "Produse compatibile verificate", productsIntro: "Afișăm doar produse cu destinația exactă, limitele electrice critice și livrarea în România verificate.", powerStationFit: "Limitele electrice verificate acoperă profilul calculat", powerStation: "Stație portabilă de energie", viewProduct: "Vezi produsul", affiliate: "Link afiliat; recomandarea tehnică nu depinde de comision." },
  pt: { required: "Seleciona pelo menos um equipamento.", daily: "Consumo diário", battery: "Bateria", solar: "Painéis solares", inverter: "Inversor", mppt: "Controlador MPPT", voltage: "Sistema", again: "Alterar dados", share: "Copiar resultado", copied: "Resultado copiado", copyFailed: "Não foi possível copiar", products: "Produtos compatíveis verificados", productsIntro: "Mostramos apenas produtos cujo destino exato e requisitos técnicos conseguimos validar.", solarFit: (quantity, powerW) => `${quantity} × ${powerW} W cobre a potência solar calculada`, powerStationFit: "Os limites elétricos verificados cobrem o perfil calculado", powerStation: "Estação de energia portátil", viewProduct: "Ver produto", affiliate: "Ligação de afiliado; a recomendação técnica não depende da comissão." },
  si: { required: "Izberi vsaj en porabnik.", daily: "Dnevna poraba", battery: "Baterija", solar: "Solarni paneli", inverter: "Inverter", mppt: "Regulator MPPT", voltage: "Sistem", again: "Spremeni podatke", share: "Kopiraj rezultat", copied: "Rezultat kopiran", copyFailed: "Kopiranje ni uspelo", products: "Preverjeni združljivi izdelki", productsIntro: "Prikažemo samo izdelke, pri katerih smo preverili točen cilj povezave, ključne električne omejitve in dostavo v Slovenijo.", powerStationFit: "Preverjene električne omejitve pokrivajo izračunani profil", powerStation: "Prenosna elektrarna", viewProduct: "Poglej izdelek", affiliate: "Partnerska povezava; tehnično priporočilo ni odvisno od provizije." },
}[locale];

if (!labels) throw new Error(`EXPANSION_CALCULATOR_LOCALE_UNSUPPORTED:${locale || "missing"}`);

let currentStep = 1;
let latestResult = null;
let latestShareUrl = "";
showStep(1);

root.addEventListener("click", async (event) => {
  const next = event.target.closest("[data-next]");
  const back = event.target.closest("[data-back]");
  const edit = event.target.closest("[data-edit]");
  const share = event.target.closest("[data-share-result]");
  const affiliate = event.target.closest("[data-affiliate-product]");
  if (next) { track("calculator_started", { source: "next_button" }); showStep(Math.min(3, currentStep + 1)); }
  if (back) showStep(Math.max(1, currentStep - 1));
  if (edit) showStep(2);
  if (share && latestResult && latestShareUrl) {
    const original = share.textContent;
    const copied = await copyText(buildResultShareText(latestResult, locale, latestShareUrl));
    share.textContent = copied ? labels.copied : labels.copyFailed;
    if (copied) track("calculator_result_shared", { market: locale, method: "copy", source: "result" });
    setTimeout(() => { if (share.isConnected) share.textContent = original; }, 1800);
  }
  if (affiliate) {
    const detail = {
      event: "affiliate_click",
      productId: affiliate.dataset.productId || "unknown",
      merchant: affiliate.dataset.merchant || "unknown",
      category: affiliate.dataset.category || "unknown",
      source: "product-card",
    };
    track(detail.event, detail);
    document.dispatchEvent(new CustomEvent("mypowersetup:affiliate-click", { detail }));
  }
});

form.addEventListener("input", () => track("calculator_started", { source: "form_input" }));
form.addEventListener("submit", async (event) => {
  event.preventDefault();
  await calculateAndRender({ source: "form_submit" });
});

const initialSetup = decodeExpansionSetupQuery(
  window.location.search,
  [...form.querySelectorAll("[data-appliance]")].map((input) => input.dataset.applianceId),
);
if (initialSetup) {
  applyInitialSetup(initialSetup);
  track("calculator_prefilled", { market: locale, source: "shared_url", applianceCount: initialSetup.applianceIds.length });
  void calculateAndRender({ source: "shared_url" });
}

function showStep(step) {
  currentStep = step;
  for (const section of steps) { const active = Number(section.dataset.formStep) === step; section.hidden = !active; section.classList.toggle("is-visible", active); }
  for (const button of stepButtons) { const target = Number(button.dataset.stepTarget); button.classList.toggle("is-active", target === step); button.disabled = target > step; }
}

async function calculateAndRender({ source }) {
  const selected = [...form.querySelectorAll("[data-appliance]:checked")];
  if (!selected.length) { error.textContent = labels.required; error.hidden = false; return false; }
  error.hidden = true;
  const data = new FormData(form);
  const appliances = selected.map((input) => ({ selected: true, name: input.dataset.name, watts: Number(input.dataset.watts), hours: Number(input.dataset.hours), quantity: 1, ac: input.dataset.ac === "true", surge: Number(input.dataset.surge || 1) }));
  const calculation = calculateSetup({ locale, appliances, autonomyDays: Number(data.get("autonomyDays")), season: data.get("season"), batteryType: data.get("batteryType"), systemVoltage: data.get("systemVoltage") });
  const shareConfig = {
    appliances: [...form.querySelectorAll("[data-appliance]")].map((input) => ({ id: input.dataset.applianceId, selected: input.checked })),
    autonomyDays: data.get("autonomyDays"),
    season: data.get("season"),
    batteryType: data.get("batteryType"),
    systemVoltage: data.get("systemVoltage"),
  };
  latestResult = calculation;
  latestShareUrl = buildExpansionSetupUrl(shareConfig, locale, window.location.origin);
  renderResult(calculation);
  track("calculation_completed", {
    dailyWh: calculation.dailyWh,
    batteryAh: calculation.batteryAh,
    solarWatts: calculation.solarWatts,
    systemVoltage: calculation.systemVoltage,
    applianceCount: selected.length,
    batteryType: calculation.batteryType,
    season: data.get("season"),
    source,
  });
  showStep(3);

  // Recommendations are deliberately loaded only after the core calculation is
  // complete. A broken catalog, affiliate parser or recommendation module must
  // never prevent the calculator itself from starting or showing a result.
  if (locale === "pt") await renderPortugalProducts(calculation);
  if (locale === "si") await renderSloveniaProducts(calculation);
  if (locale === "ro") await renderRomaniaProducts(calculation);
  return true;
}

function applyInitialSetup(setup) {
  const selectedIds = new Set(setup.applianceIds);
  for (const input of form.querySelectorAll("[data-appliance]")) input.checked = selectedIds.has(input.dataset.applianceId);
  setChecked("autonomyDays", setup.autonomyDays);
  setChecked("season", setup.season);
  form.elements.batteryType.value = setup.batteryType;
  form.elements.systemVoltage.value = setup.systemVoltage;
}

function setChecked(name, value) {
  const input = form.querySelector(`[name="${name}"][value="${value}"]`);
  if (input) input.checked = true;
}

function renderResult(value) {
  const warnings = value.warnings.length ? `<ul>${value.warnings.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>` : "";
  const verdict = buildPlainLanguageVerdict(value, locale);
  result.innerHTML = `<p class="result-summary">${escapeHtml(verdict)}</p><div class="result-grid"><article class="result-card"><span>${labels.daily}</span><strong>${value.dailyWh} Wh</strong></article><article class="result-card"><span>${labels.battery}</span><strong>${value.batteryAh} Ah / ${value.batteryWh} Wh</strong><small>${escapeHtml(value.batteryLabel)}</small></article><article class="result-card"><span>${labels.solar}</span><strong>${value.solarWatts} Wp</strong></article><article class="result-card"><span>${labels.inverter}</span><strong>${value.inverterWatts} W</strong></article><article class="result-card"><span>${labels.mppt}</span><strong>${value.controllerAmps} A</strong></article><article class="result-card"><span>${labels.voltage}</span><strong>${value.systemVoltage} V</strong></article></div>${warnings}<div data-product-recommendations></div><div class="step-actions"><button class="button button-primary" type="button" data-share-result>${labels.share}</button><button class="button button-secondary" type="button" data-edit>${labels.again}</button></div>`;
}

async function renderPortugalProducts(calculation) {
  const target = result.querySelector("[data-product-recommendations]"); if (!target) return;
  try {
    const { buildPortugalRecommendations, loadPortugalProductCatalog, portugalRecommendationCoverage } = await import("./pt-recommendations.js");
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

async function renderSloveniaProducts(calculation) {
  const target = result.querySelector("[data-product-recommendations]"); if (!target) return;
  try {
    const { buildSloveniaRecommendations, loadSloveniaProductCatalog } = await import("./si-recommendations.js");
    const catalog = await loadSloveniaProductCatalog();
    const products = buildSloveniaRecommendations(catalog, calculation, 3).power_station;
    track("product_recommendations_rendered", { market: "si", power_station_covered: products.length > 0, product_count: products.length });
    if (!products.length) return;
    target.innerHTML = renderPowerStationSection("si-products-title", products);
  } catch {
    track("product_recommendations_rendered", { market: "si", power_station_covered: false, product_count: 0 });
    target.replaceChildren();
  }
}

async function renderRomaniaProducts(calculation) {
  const target = result.querySelector("[data-product-recommendations]"); if (!target) return;
  try {
    const { buildRomaniaRecommendations, loadRomaniaProductCatalog } = await import("./ro-recommendations.js");
    const catalog = await loadRomaniaProductCatalog();
    const products = buildRomaniaRecommendations(catalog, calculation, 3).power_station;
    track("product_recommendations_rendered", { market: "ro", power_station_covered: products.length > 0, product_count: products.length });
    if (!products.length) return;
    target.innerHTML = renderPowerStationSection("ro-products-title", products);
  } catch {
    track("product_recommendations_rendered", { market: "ro", power_station_covered: false, product_count: 0 });
    target.replaceChildren();
  }
}

function renderPowerStationSection(id, products) { return `<section class="result-products" aria-labelledby="${id}"><h4 id="${id}">${labels.products}</h4><p>${labels.productsIntro}</p><div class="result-grid">${products.map(renderPowerStationProduct).join("")}</div><p><small>${labels.affiliate}</small></p></section>`; }
function renderPowerStationProduct(item) { return `<article class="result-card"><span>${labels.powerStation}</span><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(labels.powerStationFit)}</small><small>${item.capacityWh} Wh · ${item.powerW} W · PV ${item.solarInputW} W · 12 V ${item.dcOutputA} A</small><a class="button button-primary" data-affiliate-product data-product-id="${escapeHtml(item.id)}" data-category="power_station" data-merchant="${escapeHtml(item.merchant || "allpowers_eu")}" href="${escapeHtml(item.affiliateUrl)}" rel="sponsored nofollow noopener" target="_blank">${labels.viewProduct}</a></article>`; }
function renderPortugalProduct(item) { const fit = item.category === "solar_panel" ? labels.solarFit(item.quantity, item.powerW) : labels.powerStationFit; const price = Number.isFinite(item.price) ? `<small>${new Intl.NumberFormat("pt-PT", { style: "currency", currency: item.currency || "EUR" }).format(item.price)}</small>` : ""; return `<article class="result-card"><span>${item.category === "solar_panel" ? labels.solar : labels.powerStation}</span><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(fit)}</small>${price}<a class="button button-primary" data-affiliate-product data-product-id="${escapeHtml(item.id)}" data-category="${escapeHtml(item.category)}" data-merchant="${escapeHtml(item.merchant || "allpowers_pt")}" href="${escapeHtml(item.affiliateUrl)}" rel="sponsored nofollow noopener" target="_blank">${labels.viewProduct}</a></article>`; }
function track(event, parameters) { return window.MyPowerSetupAnalytics?.track?.(event, parameters) ?? false; }
function escapeHtml(value) { return String(value).replace(/[&<>\"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[char]); }
