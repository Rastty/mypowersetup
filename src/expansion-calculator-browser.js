import { calculateSetup } from "./engine.js";

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
  pt: { required: "Seleciona pelo menos um equipamento.", daily: "Consumo diário", battery: "Bateria", solar: "Painéis solares", inverter: "Inversor", mppt: "Controlador MPPT", voltage: "Sistema", again: "Alterar dados" },
  si: { required: "Izberi vsaj en porabnik.", daily: "Dnevna poraba", battery: "Baterija", solar: "Solarni paneli", inverter: "Inverter", mppt: "Regulator MPPT", voltage: "Sistem", again: "Spremeni podatke" },
}[locale];

let currentStep = 1;
showStep(1);

root.addEventListener("click", (event) => {
  const next = event.target.closest("[data-next]");
  const back = event.target.closest("[data-back]");
  const edit = event.target.closest("[data-edit]");
  if (next) showStep(Math.min(3, currentStep + 1));
  if (back) showStep(Math.max(1, currentStep - 1));
  if (edit) showStep(2);
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const selected = [...form.querySelectorAll("[data-appliance]:checked")];
  if (!selected.length) {
    error.textContent = labels.required;
    error.hidden = false;
    return;
  }
  error.hidden = true;
  const data = new FormData(form);
  const appliances = selected.map((input) => ({
    selected: true,
    name: input.dataset.name,
    watts: Number(input.dataset.watts),
    hours: Number(input.dataset.hours),
    quantity: 1,
    ac: input.dataset.ac === "true",
    surge: Number(input.dataset.surge || 1),
  }));
  const calculation = calculateSetup({
    locale,
    appliances,
    autonomyDays: Number(data.get("autonomyDays")),
    season: data.get("season"),
    batteryType: data.get("batteryType"),
    systemVoltage: data.get("systemVoltage"),
  });
  renderResult(calculation);
  showStep(3);
});

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
    button.disabled = target > step;
  }
}

function renderResult(value) {
  const warnings = value.warnings.length ? `<ul>${value.warnings.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>` : "";
  result.innerHTML = `
    <div class="result-grid">
      <article class="result-card"><span>${labels.daily}</span><strong>${value.dailyWh} Wh</strong></article>
      <article class="result-card"><span>${labels.battery}</span><strong>${value.batteryAh} Ah / ${value.batteryWh} Wh</strong><small>${escapeHtml(value.batteryLabel)}</small></article>
      <article class="result-card"><span>${labels.solar}</span><strong>${value.solarWatts} Wp</strong></article>
      <article class="result-card"><span>${labels.inverter}</span><strong>${value.inverterWatts} W</strong></article>
      <article class="result-card"><span>${labels.mppt}</span><strong>${value.controllerAmps} A</strong></article>
      <article class="result-card"><span>${labels.voltage}</span><strong>${value.systemVoltage} V</strong></article>
    </div>${warnings}
    <button class="button button-secondary" type="button" data-edit>${labels.again}</button>`;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>\"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[char]);
}
