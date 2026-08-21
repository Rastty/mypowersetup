import { APPLIANCES } from "./catalog.js";
import { calculateSetup } from "./engine.js";
import { recommendProducts } from "./products.js";

const form = document.querySelector("#setup-form");
const applianceGrid = document.querySelector("#appliance-grid");
const selectedCount = document.querySelector("#selected-count");
const liveConsumption = document.querySelector("#live-consumption");
const applianceError = document.querySelector("#appliance-error");
let currentStep = 1;
let latestResult = null;
let productCatalog = [];

renderAppliances();
bindChoiceCards();
bindNavigation();
loadProductCatalog();
document.querySelector("#year").textContent = new Date().getFullYear();

async function loadProductCatalog() {
  try {
    const response = await fetch("/data/products.json", { cache: "no-store" });
    if (!response.ok) return;
    const payload = await response.json();
    productCatalog = Array.isArray(payload.products) ? payload.products : [];
  } catch {
    productCatalog = [];
  }
}

function renderAppliances() {
  applianceGrid.innerHTML = APPLIANCES.map((appliance) => `
    <label class="appliance-card" data-appliance-card="${appliance.id}">
      <input type="checkbox" name="appliance" value="${appliance.id}" />
      <span class="appliance-icon" aria-hidden="true">${appliance.icon}</span>
      <span class="appliance-copy">
        <strong>${appliance.name}</strong>
        <small>${appliance.description}</small>
      </span>
      <span class="appliance-controls">
        <label class="mini-field">
          <input type="number" min="0.01" max="24" step="0.05" value="${appliance.hours}" data-hours aria-label="Hodiny denně pro ${appliance.name}" /> h/den
        </label>
        <label class="mini-field">
          <input type="number" min="1" max="20" step="1" value="${appliance.quantity}" data-quantity aria-label="Počet kusů ${appliance.name}" /> ks
        </label>
      </span>
    </label>
  `).join("");

  applianceGrid.addEventListener("change", handleApplianceChange);
  applianceGrid.addEventListener("input", updateLiveSummary);
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
  const appliances = getSelectedAppliances();
  if (!appliances.some((item) => item.selected)) {
    applianceError.hidden = false;
    applianceError.scrollIntoView({ behavior: "smooth", block: "center" });
    return;
  }

  const data = new FormData(form);
  latestResult = calculateSetup({
    appliances,
    autonomyDays: data.get("autonomyDays"),
    season: data.get("season"),
    batteryType: data.get("batteryType"),
    systemVoltage: data.get("systemVoltage")
  });

  renderResult(latestResult);
  showStep(3);
}

function renderResult(result) {
  document.querySelector("#result-intro").textContent =
    `Pro odhadovanou spotřebu ${formatEnergy(result.dailyWh)} denně a ${result.autonomyDays} ${dayWord(result.autonomyDays)} autonomie.`;

  document.querySelector("#result-grid").innerHTML = [
    resultCard("Baterie", `${result.batteryAh} Ah`, `${formatEnergy(result.batteryWh)} · ${result.systemVoltage} V · ${result.batteryLabel}`, true),
    resultCard("Solární panely", `${result.solarWatts} Wp`, `${result.seasonLabel.toLowerCase()} · včetně rezervy`),
    resultCard("Čistý sinus měnič", result.inverterWatts ? `${result.inverterWatts} W` : "Není nutný", result.inverterWatts ? "pro vybrané 230V spotřebiče" : "všechny vybrané spotřebiče jsou DC"),
    resultCard("MPPT regulátor", `${result.controllerAmps} A`, `pro ${result.systemVoltage}V systém`)
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

  const standardNotes = [
    `Baterie počítá s ${result.assumptions.usableDepthPercent}% využitelnou kapacitou a ${result.assumptions.batteryMarginPercent}% rezervou.`,
    `Solární odhad zahrnuje ${100 - result.assumptions.solarEfficiencyPercent}% systémových ztrát a ${result.assumptions.solarMarginPercent}% rezervu.`,
    "Před nákupem ověřte skutečný příkon, rozběhové špičky, kabeláž a jištění."
  ];
  document.querySelector("#result-notes").innerHTML = [...result.warnings, ...standardNotes]
    .map((note) => `<li>${note}</li>`)
    .join("");

  renderProductRecommendations(result);
}

function renderProductRecommendations(result) {
  const heading = document.querySelector("#product-heading");
  const intro = document.querySelector("#product-intro");
  const groups = document.querySelector("#recommendation-groups");
  const recommendations = recommendProducts(productCatalog, result, 3);
  const categoryLabels = {
    battery: "Baterie",
    solar_panel: "Solární panely",
    inverter: "Měniče",
    controller: "MPPT regulátory"
  };
  const total = Object.values(recommendations).reduce((sum, items) => sum + items.length, 0);

  if (total === 0) {
    heading.textContent = "Připravujeme přesná produktová doporučení";
    intro.textContent = "Produkty zveřejníme až po ověření jejich parametrů proti výsledku vaší sestavy. Nebudeme vás posílat na obecnou homepage ani označovat neověřený produkt za kompatibilní.";
    groups.innerHTML = '<button class="button button-disabled" type="button" disabled>Produktové párování se připravuje</button>';
    return;
  }

  heading.textContent = "Komponenty odpovídající vašemu výpočtu";
  intro.textContent = "Nejdříve ověřujeme technickou kompatibilitu. Pořadí následně zohledňuje shodu parametrů, dostupnost a úplnost produktových dat.";
  groups.innerHTML = Object.entries(recommendations)
    .filter(([, items]) => items.length)
    .map(([category, items]) => `
      <section class="product-group">
        <h5>${categoryLabels[category]}</h5>
        <div class="product-grid">
          ${items.map(({ product, reason }) => productCard(product, reason)).join("")}
        </div>
      </section>
    `).join("");
}

function productCard(product, reason) {
  return `
    <article class="product-card">
      ${product.imageUrl ? `<img src="${escapeHtml(product.imageUrl)}" alt="" loading="lazy" />` : ""}
      <div class="product-card-copy">
        <span>${escapeHtml(product.brand || merchantLabel(product.merchant))}</span>
        <h6>${escapeHtml(product.name)}</h6>
        <p>${escapeHtml(reason)}</p>
        <div class="product-card-action">
          <strong>${formatPrice(product.priceCzk)}</strong>
          <a href="${escapeHtml(product.affiliateUrl)}" target="_blank" rel="sponsored noopener" data-affiliate-click>Prohlédnout produkt →</a>
        </div>
      </div>
    </article>
  `;
}

function formatPrice(price) {
  return Number.isFinite(price)
    ? new Intl.NumberFormat("cs-CZ", { style: "currency", currency: "CZK", maximumFractionDigits: 0 }).format(price)
    : "Cena v obchodě";
}

function merchantLabel(merchant) {
  return merchant === "reslshop" ? "Reslshop.cz" : "SvětKaravanů.cz";
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
  updateLiveSummary();
  showStep(1);
}

function formatEnergy(wh) {
  if (wh >= 1000) {
    return `${(wh / 1000).toLocaleString("cs-CZ", { maximumFractionDigits: 2 })} kWh`;
  }
  return `${Math.round(wh).toLocaleString("cs-CZ")} Wh`;
}

function dayWord(days) {
  if (days === 1) return "den";
  if (days >= 2 && days <= 4) return "dny";
  return "dnů";
}
