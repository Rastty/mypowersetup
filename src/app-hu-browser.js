import { APPLIANCES } from "./catalog-hu.js";
import { buildHungarianApplicationResult, formatHungarianPrice, hungarianMerchantLabel, loadHungarianProductCatalog } from "./app-hu.js?v=20260901-padabo2";
import { HU_UI_COPY } from "./ui-copy-hu.js";
import { copyText } from "./share.js";
import { mountUsageProfiles } from "./usage-profiles.js";
import { mountExistingSetupCheck } from "./existing-setup.js";
import { trackAffiliateClick } from "./affiliate-analytics.js?v=20260901-route1";

const form = document.querySelector("#setup-form");
const grid = document.querySelector("#appliance-grid");
let currentStep = 1;
let latest = null;
let catalog = { products: [], sources: {}, generatedAt: null };

renderAppliances();
mountUsageProfiles({ locale: "hu", form, applianceGrid: grid, appliances: APPLIANCES, onChange: updateSummary });
const existingSetup = mountExistingSetupCheck({
  target: document.querySelector("#existing-setup-check"), locale: "hu", getResult: () => latest?.result,
  hasProductCategory: (category) => Boolean(document.querySelector(`[data-product-category="${category}"]`)),
});
bindNavigation();
bindActions();
loadHungarianProductCatalog().then((value) => { catalog = value; }).catch(() => {});
document.querySelector("#year").textContent = new Date().getFullYear();

function renderAppliances() {
  grid.innerHTML = APPLIANCES.map((item) => `<article class="appliance-card ${item.custom ? "is-custom" : ""}" data-appliance-card="${item.id}">
    <input id="appliance-hu-${item.id}" type="checkbox" name="appliance" value="${item.id}">
    <span class="appliance-icon" aria-hidden="true">${item.icon}</span><label class="appliance-copy" for="appliance-hu-${item.id}"><strong>${item.name}</strong><small>${item.description}</small></label>
    <span class="appliance-controls">${item.custom ? `<label class="mini-field custom-name-field"><input type="text" maxlength="60" value="Egyéni készülék" data-custom-name aria-label="Az egyéni készülék neve"></label><label class="mini-field"><input type="number" min="1" max="10000" step="1" value="${item.watts}" data-watts aria-label="Teljesítmény" inputmode="numeric"> W</label>` : ""}<label class="mini-field"><input type="number" min="0.01" max="24" step="0.05" value="${item.hours}" data-hours aria-label="Napi üzemidő" inputmode="decimal"> h/nap</label><label class="mini-field"><input type="number" min="1" max="20" step="1" value="${item.quantity}" data-quantity aria-label="Darabszám" inputmode="numeric"> db</label>${item.custom ? `<label class="mini-field"><select data-ac aria-label="Tápellátás"><option value="false">12/24 V DC</option><option value="true">230 V AC</option></select></label><label class="mini-field"><select data-surge aria-label="Indítási csúcs"><option value="1">Nincs ismert csúcs</option><option value="2">Motor / kompresszor · 2×</option></select></label>` : ""}</span>
  </article>`).join("");
  grid.addEventListener("change", (event) => {
    const checkbox = event.target.closest('input[name="appliance"]');
    if (checkbox) checkbox.closest(".appliance-card").classList.toggle("is-selected", checkbox.checked);
    updateSummary();
  });
  grid.addEventListener("input", updateSummary);
  grid.addEventListener("click", (event) => {
    const card = event.target.closest(".appliance-card");
    if (!card || event.target.closest("input,select,label,button,a")) return;
    const checkbox = card.querySelector('input[name="appliance"]');
    checkbox.checked = !checkbox.checked;
    checkbox.dispatchEvent(new Event("change", { bubbles: true }));
  });
}

function selectedAppliances() {
  return APPLIANCES.map((item) => {
    const card = grid.querySelector(`[data-appliance-card="${item.id}"]`);
    return { ...item, selected: card.querySelector('input[name="appliance"]').checked,
      name: card.querySelector("[data-custom-name]")?.value.trim() || item.name,
      watts: Number(card.querySelector("[data-watts]")?.value ?? item.watts), hours: Number(card.querySelector("[data-hours]").value),
      quantity: Number(card.querySelector("[data-quantity]").value), ac: card.querySelector("[data-ac]")?.value === "true" || (!item.custom && item.ac),
      surge: Number(card.querySelector("[data-surge]")?.value ?? item.surge) };
  });
}

function updateSummary() {
  const selected = selectedAppliances().filter((item) => item.selected);
  const wh = selected.reduce((sum, item) => sum + (Number.isFinite(item.watts * item.hours * item.quantity) ? item.watts * item.hours * item.quantity : 0), 0);
  document.querySelector("#selected-count").textContent = selected.length;
  document.querySelector("#live-consumption").textContent = formatEnergy(wh);
}

function bindNavigation() {
  document.querySelectorAll("[data-next]").forEach((button) => button.addEventListener("click", () => showStep(currentStep + 1)));
  document.querySelectorAll("[data-back]").forEach((button) => button.addEventListener("click", () => showStep(currentStep - 1)));
  document.querySelectorAll('.choice-card input[type="radio"]').forEach((input) => input.addEventListener("change", () => document.querySelectorAll(`input[name="${input.name}"]`).forEach((peer) => peer.closest(".choice-card").classList.toggle("is-selected", peer.checked))));
  form.addEventListener("submit", calculate);
  document.querySelector("#start-over").addEventListener("click", () => { form.reset(); latest = null; updateSummary(); showStep(1); });
}

function bindActions() {
  document.querySelector("#result-copy").addEventListener("click", async () => setShareStatus(await copyText(latest?.shareText || "") ? "Az összefoglaló a vágólapra került." : "A másolás nem sikerült."));
  document.querySelector("#result-share").addEventListener("click", async () => {
    if (!latest) return;
    if (navigator.share) await navigator.share({ title: "MyPowerSetup", text: latest.shareText });
    else setShareStatus(await copyText(latest.shareText) ? "Az összefoglaló a vágólapra került." : "A másolás nem sikerült.");
  });
  document.querySelector("#result-print").addEventListener("click", () => latest && window.print());
}

function calculate(event) {
  event.preventDefault();
  const appliances = selectedAppliances();
  const error = document.querySelector("#appliance-error");
  if (!appliances.some((item) => item.selected)) { error.hidden = false; error.scrollIntoView({ behavior: "smooth", block: "center" }); return; }
  error.hidden = true;
  try {
    const data = new FormData(form);
    latest = buildHungarianApplicationResult({ appliances, ...Object.fromEntries(["autonomyDays","season","batteryType","systemVoltage","inverterCableLength","driveHoursPerDay","starterVoltage","dcDcInputCableLength","shoreChargeHours","roofLength","roofWidth"].map((key) => [key, data.get(key)])) }, catalog, window.location.origin);
    history.replaceState({}, "", latest.shareUrl.replace(window.location.origin, ""));
    renderResult(latest); existingSetup.setResult(latest.result); showStep(3); track("calculation_completed", { dailyWh: latest.result.dailyWh, batteryAh: latest.result.batteryAh, solarWatts: latest.result.solarWatts, systemVoltage: latest.result.systemVoltage });
  } catch (failure) {
    const target = document.querySelector("#calculator-error"); target.textContent = failure?.message === "ROOF_DIMENSIONS_INCOMPLETE" ? "A tető ellenőrzéséhez add meg mindkét méretet, vagy hagyd mindkettőt üresen." : "A számítás nem jeleníthető meg. Ellenőrizd a megadott értékeket."; target.hidden = false;
  }
}

function renderResult(output) {
  const result = output.result;
  document.querySelector("#result-intro").textContent = `${formatEnergy(result.dailyWh)} becsült napi fogyasztás és ${result.autonomyDays} nap autonómia alapján.`;
  document.querySelector("#result-verdict").textContent = output.verdict;
  document.querySelector("#result-grid").innerHTML = [[HU_UI_COPY.result.battery,`${result.batteryAh} Ah`,`${formatEnergy(result.batteryWh)} · ${result.systemVoltage} V`],[HU_UI_COPY.result.solar,`${result.solarWatts} Wp`,result.seasonLabel],[HU_UI_COPY.result.inverter,result.inverterWatts ? `${result.inverterWatts} W` : HU_UI_COPY.result.inverterNotNeeded,result.inverterWatts ? "a kiválasztott 230 V-os fogyasztókhoz" : "minden fogyasztó DC"],[HU_UI_COPY.result.controller,`${result.controllerAmps} A`,`${result.systemVoltage} V-os rendszerhez`]].map(([label,value,note]) => `<article class="result-card"><span>${label}</span><strong>${value}</strong><small>${note}</small></article>`).join("");
  document.querySelector("#result-reasons").innerHTML = `<article><span>Fogyasztás</span><strong>${formatEnergy(result.dailyWh)}/nap</strong><p>A megadott teljesítmény, üzemidő és darabszám alapján.</p></article><article><span>Tartalék</span><strong>${result.assumptions.batteryMarginPercent}%</strong><p>A veszteségeket és a használható akkumulátorkapacitást is figyelembe vesszük.</p></article>`;
  document.querySelector("#consumption-breakdown").innerHTML = result.applianceRows.sort((a,b) => b.dailyWh-a.dailyWh).map((item) => `<div class="breakdown-row"><div class="breakdown-label"><span>${escapeHtml(item.name)}</span><strong>${formatEnergy(item.dailyWh)}</strong></div></div>`).join("");
  document.querySelector("#result-notes").innerHTML = [...result.warnings,"Ellenőrizd az adattáblákat, a kábeleket, a védelmeket, a BMS-t és a telepítési feltételeket."].map((note) => `<li>${escapeHtml(note)}</li>`).join("");
  document.querySelector("#system-diagram").innerHTML = output.systemDiagram;
  document.querySelector("#installation-plan").innerHTML = output.installationPlan.map((item,index) => `<article class="installation-card"><span>${String(index+1).padStart(2,"0")}</span><div><strong>${escapeHtml(item.label)}</strong><p>${escapeHtml(item.detail)}</p></div></article>`).join("");
  renderCharging(result); renderRoof(result.roof); renderPowerStation(output.powerStationProfile); renderProducts(output);
}

function renderCharging(result) {
  document.querySelector("#charging-options").innerHTML = [["DC–DC töltés",result.charging.dcDc],["230 V-os töltés",result.charging.shore]].map(([label,item]) => `<article class="charging-card"><span>${label}</span><strong>${item.enabled ? (item.suggestedCurrentAmps ? `legalább ${item.suggestedCurrentAmps} A` : "egyedi tervezés") : "Kikapcsolva"}</strong><p>${item.enabled ? `${item.hours} óra alatt pótolja a napi fogyasztást.` : "Ehhez a forráshoz 0 óra van beállítva."}</p></article>`).join("");
}
function renderRoof(roof) { document.querySelector("#roof-fit").innerHTML = roof?.checked ? `<article class="roof-fit-card ${roof.fits ? "is-fit" : "is-warning"}"><strong>${roof.fits ? "A referencia-elrendezés geometriailag elfér" : "A referencia-elrendezés nem fér el"}</strong><p>${roof.requiredQuantity} × ${roof.referencePanelWatts} Wp</p></article>` : '<article class="roof-fit-card is-unchecked"><strong>Az ellenőrzés nincs bekapcsolva</strong><p>Add meg a tető szabad téglalapjának mindkét méretét.</p></article>'; }
function renderPowerStation(profile) { document.querySelector("#power-station-profile").innerHTML = `<article class="charging-card"><span>Minimális névleges kapacitás</span><strong>${profile.capacityWh} Wh</strong></article><article class="charging-card"><span>Folyamatos AC teljesítmény</span><strong>${profile.acOutputWatts ? `${profile.acOutputWatts} W` : "Nem szükséges"}</strong></article><article class="charging-card"><span>Napelemes bemenet</span><strong>${profile.solarInputWatts} W</strong></article>`; }
function renderProducts(output) {
  const categories = HU_UI_COPY.products.categories;
  const labels = { battery:categories.battery,solar_panel:categories.solarPanel,inverter:categories.inverter,controller:categories.controller,dc_charger:categories.dcCharger,shore_charger:categories.shoreCharger,power_station:categories.powerStation };
  const entries = Object.entries(output.recommendations).filter(([,items]) => items.length);
  const total = entries.reduce((sum,[,items]) => sum + items.length,0);
  const coverage = output.recommendationCoverage;
  track("product_coverage_calculated", { locale:"hu", required_categories:coverage.required.length, covered_categories:coverage.covered.length, missing_categories:coverage.missing.join(",") });
  document.querySelector("#result-next").hidden = false;
  document.querySelector("#result-product-count").textContent = total ? `${total} ellenőrzött műszaki találat ${entries.length} kategóriában. Terméklefedettség: ${coverage.covered.length}/${coverage.required.length} szükséges kategória.` : "Ehhez a konfigurációhoz még nincs elég ellenőrzött termék.";
  document.querySelector("#result-products-link").hidden = !total;
  document.querySelector("#product-heading").textContent = total ? HU_UI_COPY.products.heading : HU_UI_COPY.products.preparing;
  renderHungarianProductPackages(total ? output.packages : []);
  const coverageNotice = coverage.complete ? "" : `<p class="recommendation-coverage-note"><strong>A katalógusból még hiányzik:</strong> ${escapeHtml(coverage.message)}</p>`;
  const productGroups = entries.map(([category,items]) => `<section class="product-group" data-product-category="${category}"><h5>${labels[category]}</h5><div class="product-grid">${items.map(({product,reason,checks,verify}, index) => `<article class="product-card"><div class="product-card-copy"><span>${hungarianMerchantLabel(product.merchant)}</span><h6>${escapeHtml(product.name)}</h6><p><strong>Miért megfelelő:</strong> ${escapeHtml(reason)}</p><ul>${checks.map((value) => `<li>${escapeHtml(value)}</li>`).join("")}</ul><p><strong>Vásárlás előtt:</strong> ${escapeHtml(verify)}</p><div class="product-card-action"><span class="product-price"><strong>${formatHungarianPrice(product.priceCzk,product.priceCurrency)}</strong></span><a href="${escapeHtml(product.affiliateUrl)}" target="_blank" rel="sponsored noopener" data-affiliate-click data-source="product-card" data-recommendation-role="${index === 0 ? "recommended" : "alternative"}" data-product-id="${escapeHtml(product.id)}" data-merchant="${escapeHtml(product.merchant)}" data-category="${escapeHtml(category)}">${HU_UI_COPY.products.exactProduct}</a></div></div></article>`).join("")}</div></section>`).join("");
  document.querySelector("#recommendation-groups").innerHTML = total
    ? `${coverageNotice}<details class="product-comparison-details"><summary><span>Egyedi termékek összehasonlítása</span><small>${total} ellenőrzött találat ${entries.length} kategóriában</small></summary><div class="product-comparison-groups">${productGroups}</div></details>`
    : coverageNotice;
}

function renderHungarianProductPackages(variants) {
  const target = document.querySelector("#package-variants");
  const copy = {
    economy: ["Takarékos", "A legalacsonyabb ismert ár a kompatibilis lehetőségek között."],
    recommended: ["Ajánlott", "A paraméterek és az adatminőség legjobb egyensúlya."],
    reserve: ["Nagyobb tartalékkal", "Nagyobb műszaki tartalék, ahol a katalógus ezt lehetővé teszi."],
  };
  if (!variants?.length) {
    target.innerHTML = "";
    return;
  }
  target.innerHTML = `<div class="package-intro"><strong>Három biztonságos vásárlási út</strong><p>Mindhárom változat ugyanazt a számított igényt teljesíti. A fő alkatrészeket és az elérhető töltést tartalmazza, de nem teljes szerelési anyaglista.</p></div><div class="package-grid">${variants.map((variant) => {
    const [label, description] = copy[variant.id];
    return `<article class="package-card ${variant.id === "recommended" ? "is-recommended" : ""}"><span>${label}</span><p>${description}</p><ul>${variant.items.map(({ category, product }) => hungarianPackageProductLink(category, product, variant.id)).join("")}</ul><b>${variant.totalPriceCzk === null ? "Ár a webáruházban" : formatHungarianPrice(variant.totalPriceCzk, variant.totalCurrency)}</b><small class="package-price-note">Tájékoztató termékösszeg; szállítás és szerelés nélkül.</small></article>`;
  }).join("")}</div>`;
}

function hungarianPackageProductLink(category, product, packageId) {
  const labels = { battery:"Akkumulátor",solar_panel:"Napelem",inverter:"Inverter",controller:"MPPT",dc_charger:"DC–DC töltő",shore_charger:"230 V-os töltő" };
  const quantity = product.recommendedQuantity || 1;
  const quantityLabel = quantity > 1 ? `${quantity} db · ` : "";
  return `<li><small>${labels[category] || category}</small><strong>${escapeHtml(product.name)}</strong><span class="package-product-meta">${quantityLabel}${escapeHtml(hungarianMerchantLabel(product.merchant))}</span><a class="package-product-link" href="${escapeHtml(product.affiliateUrl)}" target="_blank" rel="sponsored noopener" data-affiliate-click data-source="package" data-package-id="${escapeHtml(packageId)}" data-recommendation-role="${escapeHtml(packageId)}" data-product-id="${escapeHtml(product.id)}" data-merchant="${escapeHtml(product.merchant)}" data-category="${escapeHtml(product.category)}">A pontos termék megjelenítése →</a></li>`;
}

function showStep(step) { currentStep=Math.max(1,Math.min(3,step)); document.querySelectorAll(".form-step").forEach((section) => { const visible=Number(section.dataset.step)===currentStep; section.hidden=!visible; section.classList.toggle("is-visible",visible); }); document.querySelectorAll(".step").forEach((button,index) => { button.disabled=index+1>currentStep; button.classList.toggle("is-active",index+1===currentStep); button.classList.toggle("is-complete",index+1<currentStep); }); document.querySelector("#kalkulator").scrollIntoView({ behavior:"smooth",block:"start" }); }
function setShareStatus(value) { document.querySelector("#result-share-status").textContent=value; }
function formatEnergy(wh) { return wh>=1000 ? `${(wh/1000).toLocaleString("hu-HU",{maximumFractionDigits:2})} kWh` : `${Math.round(wh).toLocaleString("hu-HU")} Wh`; }
function escapeHtml(value) { return String(value||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;"); }
function track(event,parameters={}) { return Boolean(window.MyPowerSetupAnalytics?.track(event,parameters)); }
document.addEventListener("click", (event) => {
  const link = event.target.closest("[data-affiliate-click]");
  if (!link) return;
  trackAffiliateClick(link, track);
});
