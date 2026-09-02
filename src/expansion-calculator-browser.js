import { calculateSetup } from "./engine.js";
import { buildPlainLanguageVerdict } from "./verdict.js";
import { buildExpansionSetupUrl, decodeExpansionSetupQuery } from "./expansion-setup-url.js";
import { buildResultShareText, copyText } from "./share.js";
import { expansionResultGuides } from "./expansion-result-guides.js";
import { expansionComponentPlan } from "./expansion-component-plan.js";
import { mountUsageProfiles } from "./usage-profiles.js";
import { assessRecommendationCoverage } from "./recommendation-coverage.js";
import { bindAffiliateImpressionTracking, trackAffiliateClick, trackVisibleAffiliateImpressions } from "./affiliate-analytics.js?v=20260902-visible-impressions1";
import { decorateExpansionRecommendations } from "./expansion-recommendation-roles.js";

const root = document.querySelector("[data-expansion-calculator]");
if (!root) throw new Error("EXPANSION_CALCULATOR_ROOT_MISSING");

const locale = root.dataset.market;
const form = root.querySelector("form");
const steps = [...root.querySelectorAll("[data-form-step]")];
const stepButtons = [...root.querySelectorAll("[data-step-target]")];
const error = root.querySelector("[data-calculator-error]");
const result = root.querySelector("[data-result]");
bindAffiliateImpressionTracking(root, track);

const labels = {
  ro: {
    required: "Selectează cel puțin un consumator.", invalid: "Verifică numele, puterea, orele pe zi și cantitatea consumatorilor selectați.",
    daily: "Consum zilnic", battery: "Baterie", solar: "Panouri solare", inverter: "Invertor", mppt: "Controler MPPT", dcCharger: "Încărcător DC–DC", shoreCharger: "Încărcător de la 230 V", voltage: "Sistem", again: "Modifică datele", share: "Copiază rezultatul", copied: "Rezultat copiat", copyFailed: "Nu s-a putut copia", products: "Produse compatibile verificate", productsIntro: "Afișăm doar produse cu destinația exactă, limitele electrice critice și livrarea în România verificate.", solarFit: (quantity, powerW) => `${quantity} × ${powerW} W acoperă puterea solară calculată`, componentFit: "Parametrii verificați acoperă minimul calculat", powerStationFit: "Limitele electrice verificate acoperă profilul calculat", powerStation: "Stație portabilă de energie", pureSine: "sinus pur", viewProduct: "Vezi produsul", affiliate: "Link afiliat; recomandarea tehnică nu depinde de comision.",
    recommendationBadges: { recommended: "Recomandarea noastră", budget: "Cel mai mic preț", reserve: "Rezervă mai mare", alternative: "Alternativă compatibilă" },
    noProducts: "Niciun produs verificat nu acoperă încă toate limitele calculate. Folosește ghidurile de mai sus pentru o instalație pe componente; nu micșora cerințele doar pentru a forța o recomandare.", noPortableFit: "Produsele de mai jos acoperă părți din instalația pe componente, dar nicio stație portabilă verificată nu acoperă întregul profil.",
    hours: "h/zi", quantity: "buc.", custom: "Alt consumator", customHint: "Adaugă un consumator care nu este în listă.", customName: "Nume", watts: "W", dc: "12/24 V DC", ac: "230 V AC", noSurge: "Fără vârf cunoscut", motorSurge: "Motor / compresor · 2×", selected: "Selectate", estimated: "Consum estimat",
  },
  pt: {
    required: "Seleciona pelo menos um equipamento.", invalid: "Confirma o nome, a potência, as horas por dia e a quantidade dos equipamentos selecionados.",
    daily: "Consumo diário", battery: "Bateria", solar: "Painéis solares", inverter: "Inversor", mppt: "Controlador MPPT", dcCharger: "Carregador DC–DC", shoreCharger: "Carregador de 230 V", voltage: "Sistema", again: "Alterar dados", share: "Copiar resultado", copied: "Resultado copiado", copyFailed: "Não foi possível copiar", products: "Produtos compatíveis verificados", productsIntro: "Mostramos apenas produtos cujo destino exato e requisitos técnicos conseguimos validar.", solarFit: (quantity, powerW) => `${quantity} × ${powerW} W cobre a potência solar calculada`, componentFit: "Os parâmetros verificados cobrem o mínimo calculado", powerStationFit: "Os limites elétricos verificados cobrem o perfil calculado", powerStation: "Estação de energia portátil", pureSine: "onda sinusoidal pura", viewProduct: "Ver produto", affiliate: "Ligação de afiliado; a recomendação técnica não depende da comissão.",
    recommendationBadges: { recommended: "A nossa recomendação", budget: "Preço mais baixo", reserve: "Maior margem", alternative: "Alternativa compatível" },
    noProducts: "Nenhum produto verificado cobre ainda todos os limites calculados. Usa os guias acima para uma instalação por componentes; não reduzas os requisitos apenas para forçar uma recomendação.", noPortableFit: "Os produtos abaixo cobrem partes da instalação por componentes, mas nenhuma estação de energia portátil verificada cobre todo o perfil.",
    hours: "h/dia", quantity: "unid.", custom: "Outro equipamento", customHint: "Adiciona um equipamento que não esteja na lista.", customName: "Nome", watts: "W", dc: "12/24 V DC", ac: "230 V AC", noSurge: "Sem pico conhecido", motorSurge: "Motor / compressor · 2×", selected: "Selecionados", estimated: "Consumo estimado",
  },
  si: {
    required: "Izberi vsaj en porabnik.", invalid: "Preveri ime, moč, ure na dan in količino izbranih porabnikov.",
    daily: "Dnevna poraba", battery: "Baterija", solar: "Solarni paneli", inverter: "Inverter", mppt: "Regulator MPPT", dcCharger: "DC–DC polnilnik", shoreCharger: "230 V polnilnik", voltage: "Sistem", again: "Spremeni podatke", share: "Kopiraj rezultat", copied: "Rezultat kopiran", copyFailed: "Kopiranje ni uspelo", products: "Preverjeni združljivi izdelki", productsIntro: "Prikažemo samo izdelke, pri katerih smo preverili točen cilj povezave, ključne električne omejitve in dostavo v Slovenijo.", solarFit: (quantity, powerW) => `${quantity} × ${powerW} W pokrije izračunano solarno moč`, componentFit: "Preverjeni parametri pokrivajo izračunani minimum", powerStationFit: "Preverjene električne omejitve pokrivajo izračunani profil", powerStation: "Prenosna elektrarna", pureSine: "čisti sinus", viewProduct: "Poglej izdelek", affiliate: "Partnerska povezava; tehnično priporočilo ni odvisno od provizije.",
    recommendationBadges: { recommended: "Naše priporočilo", budget: "Najnižja cena", reserve: "Več rezerve", alternative: "Združljiva alternativa" },
    noProducts: "Noben preverjen izdelek še ne pokriva vseh izračunanih omejitev. Uporabi zgornje vodnike za sistem iz posameznih komponent; zahtev ne zmanjšuj samo zato, da bi dobil priporočilo.", noPortableFit: "Spodnji izdelki pokrijejo dele sistema iz posameznih komponent, vendar nobena preverjena prenosna elektrarna ne pokrije celotnega profila.",
    hours: "h/dan", quantity: "kos", custom: "Drug porabnik", customHint: "Dodaj porabnik, ki ga ni na seznamu.", customName: "Ime", watts: "W", dc: "12/24 V DC", ac: "230 V AC", noSurge: "Brez znane konice", motorSurge: "Motor / kompresor · 2×", selected: "Izbrano", estimated: "Ocenjena poraba",
  },
}[locale];

if (!labels) throw new Error(`EXPANSION_CALCULATOR_LOCALE_UNSUPPORTED:${locale || "missing"}`);

enhanceApplianceUi();
const applianceGrid = form.querySelector(".appliance-grid");
const profileAppliances = [...form.querySelectorAll("[data-appliance]")].map((input) => ({
  id: input.dataset.applianceId,
  hours: Number(input.dataset.hours),
  quantity: 1,
}));
mountUsageProfiles({
  locale,
  form,
  applianceGrid,
  appliances: profileAppliances,
  onChange: updateApplianceUi,
  onSelect: (profile) => track("usage_profile_selected", { market: locale, profile }),
});

let currentStep = 1;
let latestResult = null;
let latestShareUrl = "";
showStep(1);
updateApplianceUi();

root.addEventListener("click", async (event) => {
  const next = event.target.closest("[data-next]");
  const back = event.target.closest("[data-back]");
  const edit = event.target.closest("[data-edit]");
  const share = event.target.closest("[data-share-result]");
  const affiliate = event.target.closest("[data-affiliate-product]");
  const stepTarget = event.target.closest("[data-step-target]");
  const applianceCard = event.target.closest("[data-appliance-card]");

  if (applianceCard && !event.target.closest("input, select, button, a, label")) {
    const checkbox = applianceCard.querySelector("[data-appliance]");
    if (checkbox) {
      checkbox.checked = !checkbox.checked;
      checkbox.dispatchEvent(new Event("change", { bubbles: true }));
    }
  }
  if (stepTarget && !stepTarget.disabled) showStep(Number(stepTarget.dataset.stepTarget));
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
    trackAffiliateClick(affiliate, track);
  }
});

form.addEventListener("change", updateApplianceUi);
form.addEventListener("input", () => {
  track("calculator_started", { source: "form_input" });
  updateApplianceUi();
});
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
  for (const section of steps) {
    const active = Number(section.dataset.formStep) === step;
    section.hidden = !active;
    section.classList.toggle("is-visible", active);
  }
  for (const button of stepButtons) {
    const target = Number(button.dataset.stepTarget);
    button.classList.toggle("is-active", target === step);
    button.classList.toggle("is-complete", target < step);
    button.disabled = target > step;
  }
}

async function calculateAndRender({ source }) {
  const selected = [...form.querySelectorAll("[data-appliance]:checked")];
  if (!selected.length) {
    error.textContent = labels.required;
    error.hidden = false;
    return false;
  }

  const appliances = selected.map(readAppliance);
  if (appliances.some((item) => !validAppliance(item))) {
    error.textContent = labels.invalid;
    error.hidden = false;
    return false;
  }

  error.hidden = true;
  const data = new FormData(form);
  const calculation = calculateSetup({
    locale,
    appliances,
    autonomyDays: Number(data.get("autonomyDays")),
    season: data.get("season"),
    batteryType: data.get("batteryType"),
    systemVoltage: data.get("systemVoltage"),
  });
  const shareConfig = {
    appliances: [...form.querySelectorAll("[data-appliance]")].map(readAppliance),
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
    hasCustomAppliance: appliances.some((item) => item.id === "custom"),
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

function enhanceApplianceUi() {
  const grid = form.querySelector(".appliance-grid");
  if (!grid || grid.dataset.enhanced === "true") return;
  grid.dataset.enhanced = "true";

  for (const choice of [...grid.querySelectorAll(".choice-card")]) {
    const input = choice.querySelector("[data-appliance]");
    if (!input) continue;
    const id = input.dataset.applianceId;
    const article = document.createElement("article");
    article.className = `appliance-card${input.checked ? " is-selected" : ""}`;
    article.dataset.applianceCard = id;
    input.id = `expansion-${locale}-${id}`;

    const copy = document.createElement("label");
    copy.className = "appliance-copy";
    copy.htmlFor = input.id;
    copy.innerHTML = `<strong>${escapeHtml(input.dataset.name)}</strong><small>${escapeHtml(input.dataset.watts)} W</small>`;

    const controls = document.createElement("span");
    controls.className = "appliance-controls";
    controls.innerHTML = `<label class="mini-field"><input type="number" min="0.01" max="24" step="0.05" inputmode="decimal" value="${escapeHtml(input.dataset.hours)}" data-hours aria-label="${escapeHtml(`${input.dataset.name} · ${labels.hours}`)}"> ${escapeHtml(labels.hours)}</label><label class="mini-field"><input type="number" min="1" max="20" step="1" inputmode="numeric" value="1" data-quantity aria-label="${escapeHtml(`${input.dataset.name} · ${labels.quantity}`)}"> ${escapeHtml(labels.quantity)}</label>`;

    input.remove();
    article.append(input, copy, controls);
    choice.replaceWith(article);
  }

  grid.insertAdjacentHTML("beforeend", `<article class="appliance-card is-custom" data-appliance-card="custom"><input id="expansion-${locale}-custom" type="checkbox" name="appliance" value="custom" data-appliance data-appliance-id="custom" data-name="${escapeHtml(labels.custom)}" data-watts="50" data-hours="1" data-ac="false" data-surge="1"><label class="appliance-copy" for="expansion-${locale}-custom"><strong>${escapeHtml(labels.custom)}</strong><small>${escapeHtml(labels.customHint)}</small></label><span class="appliance-controls custom-appliance-controls"><label class="mini-field custom-name-field"><input type="text" maxlength="60" value="${escapeHtml(labels.custom)}" data-custom-name aria-label="${escapeHtml(labels.customName)}"></label><label class="mini-field"><input type="number" min="1" max="10000" step="1" inputmode="numeric" value="50" data-watts aria-label="${escapeHtml(labels.watts)}"> ${escapeHtml(labels.watts)}</label><label class="mini-field"><input type="number" min="0.01" max="24" step="0.05" inputmode="decimal" value="1" data-hours aria-label="${escapeHtml(labels.hours)}"> ${escapeHtml(labels.hours)}</label><label class="mini-field"><input type="number" min="1" max="20" step="1" inputmode="numeric" value="1" data-quantity aria-label="${escapeHtml(labels.quantity)}"> ${escapeHtml(labels.quantity)}</label><label class="mini-field custom-select-field"><select data-ac aria-label="AC/DC"><option value="false">${escapeHtml(labels.dc)}</option><option value="true">${escapeHtml(labels.ac)}</option></select></label><label class="mini-field custom-select-field"><select data-surge aria-label="Surge"><option value="1">${escapeHtml(labels.noSurge)}</option><option value="2">${escapeHtml(labels.motorSurge)}</option></select></label></span></article>`);

  const advanced = form.querySelector(".advanced-grid");
  if (advanced && !form.querySelector("[data-appliance-summary]")) {
    advanced.insertAdjacentHTML("beforebegin", `<div class="appliance-summary" data-appliance-summary><span>${escapeHtml(labels.selected)}: <strong data-selected-count>0</strong></span><span>${escapeHtml(labels.estimated)}: <strong data-live-consumption>0 Wh</strong></span></div>`);
  }
}

function readAppliance(input) {
  const card = input.closest("[data-appliance-card]") || input.closest(".choice-card");
  const id = input.dataset.applianceId;
  const custom = id === "custom";
  return {
    id,
    selected: input.checked,
    name: custom ? card?.querySelector("[data-custom-name]")?.value.trim() : input.dataset.name,
    watts: Number(custom ? card?.querySelector("[data-watts]:not([data-appliance])")?.value : input.dataset.watts),
    hours: Number(card?.querySelector("[data-hours]:not([data-appliance])")?.value ?? input.dataset.hours),
    quantity: Number(card?.querySelector("[data-quantity]:not([data-appliance])")?.value ?? 1),
    ac: custom ? card?.querySelector("[data-ac]:not([data-appliance])")?.value === "true" : input.dataset.ac === "true",
    surge: Number(custom ? card?.querySelector("[data-surge]:not([data-appliance])")?.value : (input.dataset.surge || 1)),
  };
}

function validAppliance(item) {
  return Boolean(item.name) && item.name.length <= 60
    && Number.isFinite(item.watts) && item.watts >= 1 && item.watts <= 10000
    && Number.isFinite(item.hours) && item.hours >= 0.01 && item.hours <= 24
    && Number.isInteger(item.quantity) && item.quantity >= 1 && item.quantity <= 20
    && Number.isFinite(item.surge) && item.surge >= 1 && item.surge <= 5;
}

function updateApplianceUi() {
  const appliances = [...form.querySelectorAll("[data-appliance]")].map(readAppliance);
  for (const item of appliances) {
    form.querySelector(`[data-appliance-card="${cssEscape(item.id)}"]`)?.classList.toggle("is-selected", item.selected);
  }
  const selected = appliances.filter((item) => item.selected);
  const consumption = selected.reduce((sum, item) => {
    if (!validAppliance(item)) return sum;
    return sum + item.watts * item.hours * item.quantity;
  }, 0);
  const count = form.querySelector("[data-selected-count]");
  const total = form.querySelector("[data-live-consumption]");
  if (count) count.textContent = String(selected.length);
  if (total) total.textContent = `${Math.round(consumption)} Wh`;
}

function applyInitialSetup(setup) {
  const selectedIds = new Set(setup.applianceIds);
  for (const input of form.querySelectorAll("[data-appliance]")) {
    input.checked = selectedIds.has(input.dataset.applianceId);
    const state = setup.applianceState?.[input.dataset.applianceId];
    if (!state) continue;
    const card = input.closest("[data-appliance-card]");
    if (card?.querySelector("[data-hours]:not([data-appliance])")) card.querySelector("[data-hours]:not([data-appliance])").value = state.hours;
    if (card?.querySelector("[data-quantity]:not([data-appliance])")) card.querySelector("[data-quantity]:not([data-appliance])").value = state.quantity;
    if (input.dataset.applianceId === "custom") {
      card.querySelector("[data-custom-name]").value = state.name;
      card.querySelector("[data-watts]:not([data-appliance])").value = state.watts;
      card.querySelector("[data-ac]:not([data-appliance])").value = String(state.ac);
      card.querySelector("[data-surge]:not([data-appliance])").value = state.surge;
    }
  }
  setChecked("autonomyDays", setup.autonomyDays);
  setChecked("season", setup.season);
  form.elements.batteryType.value = setup.batteryType;
  form.elements.systemVoltage.value = setup.systemVoltage;
  updateApplianceUi();
}

function setChecked(name, value) {
  const input = form.querySelector(`[name="${name}"][value="${value}"]`);
  if (input) input.checked = true;
}

function renderResult(value) {
  const warnings = value.warnings.length ? `<ul>${value.warnings.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>` : "";
  const verdict = buildPlainLanguageVerdict(value, locale);
  result.innerHTML = `<p class="result-summary">${escapeHtml(verdict)}</p><div class="result-grid"><article class="result-card"><span>${labels.daily}</span><strong>${value.dailyWh} Wh</strong></article><article class="result-card"><span>${labels.battery}</span><strong>${value.batteryAh} Ah / ${value.batteryWh} Wh</strong><small>${escapeHtml(value.batteryLabel)}</small></article><article class="result-card"><span>${labels.solar}</span><strong>${value.solarWatts} Wp</strong></article><article class="result-card"><span>${labels.inverter}</span><strong>${value.inverterWatts} W</strong></article><article class="result-card"><span>${labels.mppt}</span><strong>${value.controllerAmps} A</strong></article><article class="result-card"><span>${labels.voltage}</span><strong>${value.systemVoltage} V</strong></article></div>${warnings}${renderResultGuides()}${renderComponentPlan(value)}<div data-product-recommendations></div><div class="step-actions"><button class="button button-primary" type="button" data-share-result>${labels.share}</button><button class="button button-secondary" type="button" data-edit>${labels.again}</button></div>`;
}

async function renderPortugalProducts(calculation) {
  const target = result.querySelector("[data-product-recommendations]"); if (!target) return;
  try {
    const { buildPortugalRecommendations, loadPortugalProductCatalog, portugalRecommendationCoverage } = await import("./pt-recommendations.js");
    const catalog = await loadPortugalProductCatalog();
    const recommendations = buildPortugalRecommendations(catalog, calculation, 3);
    const coverage = portugalRecommendationCoverage(recommendations);
    const products = orderedExpansionProducts(recommendations);
    trackProductCoverage(recommendations, calculation);
    track("product_recommendations_rendered", { market: "pt", solar_panel_covered: coverage.solarPanel, power_station_covered: coverage.powerStation, product_count: products.length });
    if (!products.length) { target.innerHTML = renderNoVerifiedProducts(); trackRenderedProductChoices(target); return; }
    const portableGap = coverage.powerStation ? "" : `<p class="result-products-empty">${escapeHtml(labels.noPortableFit)}</p>`;
    target.innerHTML = renderProductSection("pt-products-title", products, portableGap);
    trackRenderedProductChoices(target);
  } catch {
    trackProductCoverage({}, calculation);
    track("product_recommendations_rendered", { market: "pt", solar_panel_covered: false, power_station_covered: false, product_count: 0 });
    target.innerHTML = renderNoVerifiedProducts();
    trackRenderedProductChoices(target);
  }
}

async function renderSloveniaProducts(calculation) {
  const target = result.querySelector("[data-product-recommendations]"); if (!target) return;
  try {
    const { buildSloveniaRecommendations, loadSloveniaProductCatalog } = await import("./si-recommendations.js");
    const catalog = await loadSloveniaProductCatalog();
    const recommendations = buildSloveniaRecommendations(catalog, calculation, 3);
    const products = orderedExpansionProducts(recommendations);
    trackProductCoverage(recommendations, calculation);
    track("product_recommendations_rendered", { market: "si", solar_panel_covered: recommendations.solar_panel.length > 0, power_station_covered: recommendations.power_station.length > 0, product_count: products.length });
    if (!products.length) { target.innerHTML = renderNoVerifiedProducts(); trackRenderedProductChoices(target); return; }
    const portableGap = recommendations.power_station.length ? "" : `<p class="result-products-empty">${escapeHtml(labels.noPortableFit)}</p>`;
    target.innerHTML = renderProductSection("si-products-title", products, portableGap);
    trackRenderedProductChoices(target);
  } catch {
    trackProductCoverage({}, calculation);
    track("product_recommendations_rendered", { market: "si", solar_panel_covered: false, power_station_covered: false, product_count: 0 });
    target.innerHTML = renderNoVerifiedProducts();
    trackRenderedProductChoices(target);
  }
}

async function renderRomaniaProducts(calculation) {
  const target = result.querySelector("[data-product-recommendations]"); if (!target) return;
  try {
    const { buildRomaniaRecommendations, loadRomaniaProductCatalog } = await import("./ro-recommendations.js");
    const catalog = await loadRomaniaProductCatalog();
    const recommendations = buildRomaniaRecommendations(catalog, calculation, 3);
    const products = orderedExpansionProducts(recommendations);
    trackProductCoverage(recommendations, calculation);
    track("product_recommendations_rendered", { market: "ro", solar_panel_covered: recommendations.solar_panel.length > 0, power_station_covered: recommendations.power_station.length > 0, product_count: products.length });
    if (!products.length) { target.innerHTML = renderNoVerifiedProducts(); trackRenderedProductChoices(target); return; }
    const portableGap = recommendations.power_station.length ? "" : `<p class="result-products-empty">${escapeHtml(labels.noPortableFit)}</p>`;
    target.innerHTML = renderProductSection("ro-products-title", products, portableGap);
    trackRenderedProductChoices(target);
  } catch {
    trackProductCoverage({}, calculation);
    track("product_recommendations_rendered", { market: "ro", solar_panel_covered: false, power_station_covered: false, product_count: 0 });
    target.innerHTML = renderNoVerifiedProducts();
    trackRenderedProductChoices(target);
  }
}

function trackProductCoverage(recommendations, calculation) {
  const coverage = assessRecommendationCoverage(recommendations, calculation, locale);
  track("product_coverage_calculated", {
    market: locale,
    required_categories: coverage.required.length,
    covered_categories: coverage.covered.length,
    missing_categories: coverage.missing.join(","),
  });
}

function renderNoVerifiedProducts() { return `<p class="result-products-empty" data-recommendation-empty>${escapeHtml(labels.noProducts)}</p>`; }
function trackRenderedProductChoices(target) { return trackVisibleAffiliateImpressions(target, track); }
function renderResultGuides() { const config = expansionResultGuides(locale); return `<aside class="related result-guides" data-result-guides><h4>${escapeHtml(config.title)}</h4><p>${escapeHtml(config.intro)}</p><ul>${config.links.map((item) => `<li><a data-result-guide data-topic="${escapeHtml(item.topic)}" href="${escapeHtml(item.href)}">${escapeHtml(item.label)}</a></li>`).join("")}</ul></aside>`; }
function renderComponentPlan(value) { const plan = expansionComponentPlan(locale, value); return `<section class="result-products component-plan" data-component-plan><h4>${escapeHtml(plan.title)}</h4><p>${escapeHtml(plan.intro)}</p><div class="result-grid">${plan.items.map((item) => `<article class="result-card" data-component-item="${escapeHtml(item.topic)}" data-required="${item.required}"><span>${escapeHtml(item.label)}</span><strong>${escapeHtml(item.spec)}</strong><a data-component-guide data-topic="${escapeHtml(item.topic)}" href="${escapeHtml(item.href)}">${escapeHtml(item.guideLabel)}</a></article>`).join("")}</div><p><small>${escapeHtml(plan.notice)}</small></p></section>`; }
function renderProductSection(id, products, gap = "") { return `<section class="result-products" aria-labelledby="${id}"><h4 id="${id}">${labels.products}</h4><p>${labels.productsIntro}</p>${gap}<div class="result-grid">${products.map(renderExpansionProduct).join("")}</div><p><small>${labels.affiliate}</small></p></section>`; }
function orderedExpansionProducts(recommendations) { const ordered = Object.fromEntries(["battery", "solar_panel", "controller", "inverter", "dc_charger", "shore_charger", "power_station"].map((category) => [category, recommendations?.[category] || []])); return decorateExpansionRecommendations(ordered); }
function renderExpansionProduct(item) { const solar = item.category === "solar_panel"; const portable = item.category === "power_station"; const fit = solar ? labels.solarFit(item.quantity, item.powerW) : portable ? labels.powerStationFit : labels.componentFit; const localeTag = { pt: "pt-PT", ro: "ro-RO", si: "sl-SI" }[locale]; const price = Number.isFinite(item.price) ? `<small class="expansion-product-price">${new Intl.NumberFormat(localeTag, { style: "currency", currency: item.currency || "EUR" }).format(item.price)}</small>` : ""; const category = ({ battery: labels.battery, solar_panel: labels.solar, controller: labels.mppt, inverter: labels.inverter, dc_charger: labels.dcCharger, shore_charger: labels.shoreCharger, power_station: labels.powerStation })[item.category] || item.category; const specs = expansionProductSpecs(item); const roles = item.recommendationBadges || ["alternative"]; const badges = roles.map((role) => `<span class="recommendation-role recommendation-role-${escapeHtml(role)}">${escapeHtml(labels.recommendationBadges[role])}</span>`).join(""); return `<article class="result-card expansion-product-card"><div class="recommendation-roles">${badges}</div><span>${escapeHtml(category)}</span><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(fit)}</small>${specs ? `<small>${escapeHtml(specs)}</small>` : ""}${price}<a class="button button-primary" data-affiliate-product data-source="product-card" data-recommendation-role="${escapeHtml(roles[0])}" data-product-id="${escapeHtml(item.id)}" data-category="${escapeHtml(item.category)}" data-merchant="${escapeHtml(item.merchant || (locale === "pt" ? "allpowers_pt" : "allpowers_eu"))}" href="${escapeHtml(item.affiliateUrl)}" rel="sponsored nofollow noopener" target="_blank">${labels.viewProduct}</a></article>`; }
function expansionProductSpecs(item) { const specs = item.specs || {}; if (item.category === "power_station") return `${item.capacityWh} Wh · ${item.powerW} W · PV ${item.solarInputW} W · 12 V ${item.dcOutputA} A`; if (item.category === "battery") return `${specs.voltageV} V · ${specs.capacityAh} Ah${specs.batteryType ? ` · ${specs.batteryType.toUpperCase()}` : ""}`; if (item.category === "controller") return `MPPT · ${specs.currentA} A`; if (item.category === "inverter") return `${specs.voltageV} V · ${specs.powerW} W · ${labels.pureSine}`; if (item.category === "dc_charger" || item.category === "shore_charger") return `${specs.currentA} A · ${(specs.chargingVoltagesV || []).join("/")} V`; return ""; }
function track(event, parameters) { return window.MyPowerSetupAnalytics?.track?.(event, parameters) ?? false; }
function cssEscape(value) { return globalThis.CSS?.escape ? CSS.escape(String(value)) : String(value).replace(/[^a-zA-Z0-9_-]/g, "\\$&"); }
function escapeHtml(value) { return String(value).replace(/[&<>\"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[char]); }
