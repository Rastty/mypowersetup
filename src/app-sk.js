import { APPLIANCES } from "./catalog-sk.js?v=20260821-sk1";
import { calculateSetup } from "./engine.js?v=20260821-sk1";
import { recommendProducts } from "./products.js?v=20260821-sk1";
import { buildResultShareText, copyText } from "./share.js?v=20260822-url1";
import { buildSetupUrl, decodeSetupQuery } from "./setup-url.js?v=20260822-wire1";
import { calculateBatteryCablePlan } from "./wiring.js?v=20260822-wire1";
import { buildSystemDiagram } from "./system-diagram.js?v=20260822-diagram1";

const form = document.querySelector("#setup-form");
const applianceGrid = document.querySelector("#appliance-grid");
const selectedCount = document.querySelector("#selected-count");
const liveConsumption = document.querySelector("#live-consumption");
const applianceError = document.querySelector("#appliance-error");
const calculatorError = document.querySelector("#calculator-error");
let currentStep = 1;
let latestResult = null;
let latestShareUrl = "https://mypowersetup.com/sk/#kalkulator";
let productCatalog = [];
let productCatalogUpdatedAt = null;

renderAppliances();
bindChoiceCards();
bindNavigation();
bindResultSharing();
loadProductCatalog().then(restoreSetupFromUrl);
document.querySelector("#year").textContent = new Date().getFullYear();

async function loadProductCatalog() {
  try {
    const response = await fetch("/data/products-sk.json", { cache: "no-store" });
    if (!response.ok) return;
    const payload = await response.json();
    productCatalog = Array.isArray(payload.products) ? payload.products : [];
    productCatalogUpdatedAt = payload.updatedAt || payload.generatedAt || null;
  } catch {
    productCatalog = [];
  }
}

function renderAppliances() {
  applianceGrid.innerHTML = APPLIANCES.map((appliance) => `
    <article class="appliance-card" data-appliance-card="${appliance.id}">
      <input id="appliance-sk-${appliance.id}" type="checkbox" name="appliance" value="${appliance.id}" />
      <span class="appliance-icon" aria-hidden="true">${appliance.icon}</span>
      <label class="appliance-copy" for="appliance-sk-${appliance.id}">
        <strong>${appliance.name}</strong>
        <small>${appliance.description}</small>
      </label>
      <span class="appliance-controls">
        <label class="mini-field">
          <input type="number" min="0.01" max="24" step="0.05" value="${appliance.hours}" data-hours aria-label="Hodiny denne pre ${appliance.name}" /> h/deň
        </label>
        <label class="mini-field">
          <input type="number" min="1" max="20" step="1" value="${appliance.quantity}" data-quantity aria-label="Počet kusov ${appliance.name}" /> ks
        </label>
      </span>
    </article>
  `).join("");

  applianceGrid.addEventListener("click", handleApplianceCardClick);
  applianceGrid.addEventListener("change", handleApplianceChange);
  applianceGrid.addEventListener("input", updateLiveSummary);
}

function handleApplianceCardClick(event) {
  const card = event.target.closest(".appliance-card");
  if (!card || event.target.closest("input, select, button, a, label")) return;
  const checkbox = card.querySelector('input[type="checkbox"][name="appliance"]');
  checkbox.checked = !checkbox.checked;
  checkbox.dispatchEvent(new Event("change", { bubbles: true }));
}

function bindChoiceCards() {
  document.querySelectorAll(".choice-card input").forEach((input) => {
    input.addEventListener("change", () => {
      document.querySelectorAll(`input[name="${input.name}"]`).forEach((peer) => {
        peer.closest(".choice-card").classList.toggle("is-selected", peer.checked);
      });
    });
  });
}

function bindNavigation() {
  document.querySelectorAll("[data-next]").forEach((button) => {
    button.addEventListener("click", () => showStep(currentStep + 1));
  });
  document.querySelectorAll("[data-back]").forEach((button) => {
    button.addEventListener("click", () => showStep(currentStep - 1));
  });
  document.querySelector("#start-over").addEventListener("click", resetForm);
  form.addEventListener("submit", handleSubmit);
}

function bindResultSharing() {
  document.querySelector("#result-share").addEventListener("click", shareResult);
  document.querySelector("#result-copy").addEventListener("click", () => copyResult("result_copied"));
}

function setShareStatus(message) {
  document.querySelector("#result-share-status").textContent = message;
}

async function copyResult(eventName) {
  if (!latestResult) return;
  const copied = await copyText(buildResultShareText(latestResult, "sk", latestShareUrl));
  setShareStatus(copied
    ? "Súhrn bol skopírovaný do schránky."
    : "Kopírovanie sa nepodarilo. Označte, prosím, výsledok ručne.");
  trackEvent(eventName, { success: copied });
}

async function shareResult() {
  if (!latestResult) return;
  if (typeof navigator.share !== "function") {
    await copyResult("result_share_fallback");
    return;
  }

  try {
    await navigator.share({
      title: "MyPowerSetup — návrh zostavy",
      text: buildResultShareText(latestResult, "sk", latestShareUrl)
    });
    setShareStatus("Výsledok bol pripravený na zdieľanie.");
    trackEvent("result_shared", { method: "native" });
  } catch (error) {
    if (error?.name !== "AbortError") await copyResult("result_share_fallback");
  }
}

function handleApplianceChange(event) {
  const checkbox = event.target.closest('input[type="checkbox"][name="appliance"]');
  if (checkbox) {
    checkbox.closest(".appliance-card").classList.toggle("is-selected", checkbox.checked);
    applianceError.hidden = true;
  }
  updateLiveSummary();
}

function getSelectedAppliances() {
  return APPLIANCES.map((appliance) => {
    const card = document.querySelector(`[data-appliance-card="${appliance.id}"]`);
    return {
      ...appliance,
      selected: card.querySelector('input[type="checkbox"]').checked,
      hours: Number(card.querySelector("[data-hours]").value),
      quantity: Number(card.querySelector("[data-quantity]").value)
    };
  });
}

function updateLiveSummary() {
  const selected = getSelectedAppliances().filter((item) => item.selected);
  const total = selected.reduce((sum, item) => sum + item.watts * item.hours * item.quantity, 0);
  selectedCount.textContent = selected.length;
  liveConsumption.textContent = formatEnergy(total);
}

function handleSubmit(event) {
  event.preventDefault();
  calculatorError.hidden = true;
  const appliances = getSelectedAppliances();
  if (!appliances.some((item) => item.selected)) {
    applianceError.hidden = false;
    applianceError.scrollIntoView({ behavior: "smooth", block: "center" });
    return;
  }

  try {
    const data = new FormData(form);
    latestResult = calculateSetup({
      locale: "sk",
      appliances,
      autonomyDays: data.get("autonomyDays"),
      season: data.get("season"),
      batteryType: data.get("batteryType"),
      systemVoltage: data.get("systemVoltage")
    });
    latestResult.wiring = calculateBatteryCablePlan({
      inverterWatts: latestResult.inverterWatts,
      systemVoltage: latestResult.systemVoltage,
      oneWayLengthMeters: data.get("inverterCableLength")
    });
    latestShareUrl = buildSetupUrl({
      appliances,
      autonomyDays: data.get("autonomyDays"),
      season: data.get("season"),
      batteryType: data.get("batteryType"),
      systemVoltage: data.get("systemVoltage"),
      inverterCableLength: data.get("inverterCableLength")
    }, "sk", window.location.origin);
    history.replaceState({}, "", latestShareUrl.replace(window.location.origin, ""));

    renderResult(latestResult);
    trackEvent("calculation_completed", {
      dailyWh: latestResult.dailyWh,
      batteryAh: latestResult.batteryAh,
      solarWatts: latestResult.solarWatts,
      systemVoltage: latestResult.systemVoltage
    });
    showStep(3);
  } catch (error) {
    console.error("Výpočet zostavy zlyhal", error);
    calculatorError.textContent = "Výpočet sa nepodarilo zobraziť. Obnovte stránku a skúste to znova.";
    calculatorError.hidden = false;
    calculatorError.scrollIntoView({ behavior: "smooth", block: "center" });
  }
}

function renderResult(result) {
  document.querySelector("#result-intro").textContent =
    `Pre odhadovanú spotrebu ${formatEnergy(result.dailyWh)} denne a ${result.autonomyDays} ${dayWord(result.autonomyDays)} autonómie.`;

  document.querySelector("#result-grid").innerHTML = [
    resultCard("Batéria", `${result.batteryAh} Ah`, `${formatEnergy(result.batteryWh)} · ${result.systemVoltage} V · ${result.batteryLabel}`, true),
    resultCard("Solárne panely", `${result.solarWatts} Wp`, `${result.seasonLabel.toLowerCase()} · vrátane rezervy`),
    resultCard("Menič s čistým sínusom", result.inverterWatts ? `${result.inverterWatts} W` : "Nie je potrebný", result.inverterWatts ? "pre vybrané 230V spotrebiče" : "všetky vybrané spotrebiče sú DC"),
    resultCard("MPPT regulátor", `${result.controllerAmps} A`, `pre ${result.systemVoltage}V systém`)
  ].join("");

  document.querySelector("#result-reasons").innerHTML = [
    explanationCard("Batéria", `${formatEnergy(result.dailyWh)} × ${result.autonomyDays} ${dayWord(result.autonomyDays)}`, `Po započítaní ${result.assumptions.batteryMarginPercent}% rezervy a ${result.assumptions.usableDepthPercent}% využiteľnej kapacity vychádza ${formatEnergy(result.batteryWh)}.`),
    explanationCard("Solár", `${formatEnergy(result.dailyWh)} ÷ ${formatNumber(result.calculation.peakSunHours)} slnečných hodín`, `Po systémových stratách a rezerve zaokrúhľujeme nahor na ${result.solarWatts} Wp.`),
    explanationCard("Napätie", `${result.systemVoltage}V systém`, result.calculation.automaticVoltage === result.systemVoltage ? "Automatická voľba podľa veľkosti batérie a výkonu meniča." : `Ručná voľba; automatický návrh by použil ${result.calculation.automaticVoltage} V.`),
    explanationCard("Menič", result.inverterWatts ? `${result.inverterWatts} W` : "Nie je potrebný", result.inverterWatts ? `Porovnávame súbežný AC odber približne ${Math.round(result.calculation.estimatedConcurrentWatts)} W a rozbehovú špičku ${Math.round(result.calculation.largestStartWatts)} W.` : "Medzi vybranými zariadeniami nie je 230V spotrebič."),
    ...(result.wiring ? [explanationCard(
      "Kábel batéria–menič",
      result.wiring.recommendedCrossSectionMm2 ? `najmenej ${result.wiring.recommendedCrossSectionMm2} mm²` : "individuálny návrh",
      `Pre dĺžku ${formatNumber(result.wiring.oneWayLengthMeters)} m a návrhový prúd ${result.wiring.designCurrentAmps} A vychádza minimum iba podľa cieľa úbytku do ${result.wiring.maxVoltageDropPercent} %. Finálny prierez a poistku vždy určite podľa manuálu meniča, zaťažiteľnosti kábla, teploty a spôsobu uloženia.`
    )] : [])
  ].join("");

  const largestWh = Math.max(...result.applianceRows.map((item) => item.dailyWh));
  document.querySelector("#consumption-breakdown").innerHTML = result.applianceRows
    .sort((a, b) => b.dailyWh - a.dailyWh)
    .map((item) => `
      <div class="breakdown-row">
        <div class="breakdown-label"><span>${item.name}</span><strong>${formatEnergy(item.dailyWh)}</strong></div>
        <div class="breakdown-bar"><i style="width:${Math.max(5, (item.dailyWh / largestWh) * 100)}%"></i></div>
      </div>
    `).join("");

  const checks = [
    ...result.warnings.map((text) => ({ text, warning: true })),
    { text: "Porovnajte vstupné príkony s výrobnými štítkami svojich spotrebičov." },
    { text: "Overte rozbehové špičky, kabeláž, istenie, BMS a podmienky montáže." },
    { text: "Poistka chráni kábel: jej DC napätie, vypínacia schopnosť, typ a prúd musia zodpovedať manuálu zariadenia aj skutočnej inštalácii." },
    { text: "Pri paneloch a MPPT samostatne overte Voc a Isc pri najnižšej očakávanej teplote." }
  ];
  document.querySelector("#result-notes").innerHTML = checks
    .map(({ text, warning }) => `<li class="${warning ? "is-warning" : ""}">${escapeHtml(text)}</li>`)
    .join("");

  document.querySelector("#system-diagram").innerHTML = buildSystemDiagram(result, "sk");

  renderProductRecommendations(result);
}

function renderProductRecommendations(result) {
  const heading = document.querySelector("#product-heading");
  const intro = document.querySelector("#product-intro");
  const groups = document.querySelector("#recommendation-groups");
  const recommendations = recommendProducts(productCatalog, result, 3);
  const categoryLabels = {
    battery: "Batérie",
    solar_panel: "Solárne panely",
    inverter: "Meniče",
    controller: "MPPT regulátory"
  };
  const total = Object.values(recommendations).reduce((sum, items) => sum + items.length, 0);
  const freshness = productCatalogUpdatedAt
    ? ` Produktové údaje boli načítané ${new Date(productCatalogUpdatedAt).toLocaleDateString("sk-SK")}.`
    : "";

  if (total === 0) {
    heading.textContent = "Pripravujeme presné produktové odporúčania";
    intro.textContent = "Produkty zverejníme až po overení ich parametrov voči výsledku vašej zostavy. Nebudeme vás posielať na všeobecnú domovskú stránku ani označovať neoverený produkt za kompatibilný.";
    groups.innerHTML = '<button class="button button-disabled" type="button" disabled>Produktové párovanie sa pripravuje</button>';
    return;
  }

  heading.textContent = "Komponenty zodpovedajúce vášmu výpočtu";
  intro.textContent = `Najprv overujeme technickú kompatibilitu. Poradie následne zohľadňuje zhodu parametrov, dostupnosť a úplnosť produktových údajov.${freshness}`;
  groups.innerHTML = Object.entries(recommendations)
    .filter(([, items]) => items.length)
    .map(([category, items]) => `
      <section class="product-group">
        <h5>${categoryLabels[category]}</h5>
        <div class="product-grid">
          ${items.map(({ product, reason, checks, verify }) => productCard(product, reason, checks, verify)).join("")}
        </div>
      </section>
    `).join("");
}

function productCard(product, reason, checks, verify) {
  return `
    <article class="product-card">
      ${product.imageUrl ? `<img src="${escapeHtml(product.imageUrl)}" alt="" loading="lazy" />` : ""}
      <div class="product-card-copy">
        <span>${escapeHtml(product.brand || merchantLabel(product.merchant))} · ${escapeHtml(merchantLabel(product.merchant))}</span>
        <h6>${escapeHtml(product.name)}</h6>
        <p class="product-reason"><strong>Prečo vyhovuje:</strong> ${escapeHtml(reason)}</p>
        <ul class="product-checks">${checks.map((check) => `<li>${escapeHtml(check)}</li>`).join("")}</ul>
        <p class="product-verify"><strong>Pred nákupom:</strong> ${escapeHtml(verify)}</p>
        <div class="product-card-action">
          <strong>${formatPrice(product.priceCzk)}</strong>
          <a href="${escapeHtml(product.affiliateUrl)}" target="_blank" rel="sponsored noopener" data-affiliate-click data-product-id="${escapeHtml(product.id)}" data-merchant="${escapeHtml(product.merchant)}" data-category="${escapeHtml(product.category)}">Zobraziť produkt →</a>
        </div>
      </div>
    </article>
  `;
}

document.addEventListener("click", (event) => {
  const link = event.target.closest("[data-affiliate-click]");
  if (!link) return;
  const detail = {
    event: "affiliate_click",
    productId: link.dataset.productId,
    merchant: link.dataset.merchant,
    category: link.dataset.category
  };
  trackEvent(detail.event, detail);
  document.dispatchEvent(new CustomEvent("mypowersetup:affiliate-click", { detail }));
});

function trackEvent(event, parameters = {}) {
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event, ...parameters });
}

function formatPrice(price) {
  return Number.isFinite(price)
    ? new Intl.NumberFormat("sk-SK", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(price)
    : "Cena v obchode";
}

function merchantLabel(merchant) {
  return merchant === "padabo" ? "Padabo.sk" : merchant;
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function resultCard(label, value, description, accent = false) {
  return `
    <article class="result-card ${accent ? "is-accent" : ""}">
      <span>${label}</span>
      <strong>${value}</strong>
      <small>${description}</small>
    </article>
  `;
}

function explanationCard(label, formula, explanation) {
  return `<article><span>${label}</span><strong>${formula}</strong><p>${explanation}</p></article>`;
}

function formatNumber(value) {
  return Number(value).toLocaleString("sk-SK", { maximumFractionDigits: 1 });
}

function showStep(step) {
  currentStep = Math.max(1, Math.min(3, step));
  document.querySelectorAll(".form-step").forEach((section) => {
    const isVisible = Number(section.dataset.step) === currentStep;
    section.hidden = !isVisible;
    section.classList.toggle("is-visible", isVisible);
  });

  document.querySelectorAll(".step").forEach((button, index) => {
    const buttonStep = index + 1;
    button.disabled = buttonStep > currentStep;
    button.classList.toggle("is-active", buttonStep === currentStep);
    button.classList.toggle("is-complete", buttonStep < currentStep);
  });

  if (currentStep > 1) {
    document.querySelector(`.step[data-step-target="${currentStep}"]`).disabled = false;
  }
  document.querySelector("#kalkulator").scrollIntoView({ behavior: "smooth", block: "start" });
}

function resetForm() {
  form.reset();
  document.querySelectorAll(".choice-card").forEach((card) => {
    const input = card.querySelector("input");
    card.classList.toggle("is-selected", input.checked);
  });
  document.querySelectorAll(".appliance-card").forEach((card) => card.classList.remove("is-selected"));
  latestResult = null;
  latestShareUrl = `${window.location.origin}/sk/#kalkulator`;
  history.replaceState({}, "", "/sk/#kalkulator");
  setShareStatus("");
  updateLiveSummary();
  showStep(1);
}

function restoreSetupFromUrl() {
  const config = decodeSetupQuery(window.location.search, APPLIANCES.map((item) => item.id));
  if (!config) return;

  config.appliances.forEach((saved) => {
    const card = document.querySelector(`[data-appliance-card="${saved.id}"]`);
    if (!card) return;
    card.querySelector('input[type="checkbox"]').checked = true;
    card.querySelector("[data-hours]").value = saved.hours;
    card.querySelector("[data-quantity]").value = saved.quantity;
    card.classList.add("is-selected");
  });
  for (const [name, value] of Object.entries({
    autonomyDays: config.autonomyDays,
    season: config.season,
    batteryType: config.batteryType,
    systemVoltage: config.systemVoltage,
    inverterCableLength: config.inverterCableLength
  })) {
    const input = form.elements.namedItem(name);
    if (input) input.value = value;
  }
  document.querySelectorAll(".choice-card").forEach((card) => {
    card.classList.toggle("is-selected", card.querySelector("input").checked);
  });
  updateLiveSummary();
  form.requestSubmit();
}

function formatEnergy(wh) {
  if (wh >= 1000) {
    return `${(wh / 1000).toLocaleString("sk-SK", { maximumFractionDigits: 2 })} kWh`;
  }
  return `${Math.round(wh).toLocaleString("sk-SK")} Wh`;
}

function dayWord(days) {
  if (days === 1) return "deň";
  if (days >= 2 && days <= 4) return "dni";
  return "dní";
}
