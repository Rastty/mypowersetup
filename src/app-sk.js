import { APPLIANCES } from "./catalog-sk.js?v=20260823-custom1";
import { calculateSetup } from "./engine.js?v=20260821-sk1";
import { recommendProducts } from "./products.js?v=20260828-ampul1";
import { buildResultShareText, copyText } from "./share.js?v=20260822-url1";
import { buildSetupUrl, decodeSetupQuery } from "./setup-url.js?v=20260823-custom1";
import { calculateBatteryCablePlan, calculateDcCablePlan } from "./wiring.js?v=20260824-dcdccable1";
import { buildSystemDiagram } from "./system-diagram.js?v=20260822-diagram1";
import { calculateChargingPlan } from "./charging.js?v=20260822-chargingproducts1";
import { calculateRoofFit } from "./roof.js?v=20260822-roof1";
import { buildInstallationPlan } from "./installation.js?v=20260822-installation1";
import { buildProductPackages } from "./packages.js?v=20260823-packages2";
import { assessRecommendationCoverage } from "./recommendation-coverage.js?v=20260828-1";
import { calculatePowerStationProfile } from "./power-station.js?v=20260825-1";
import { mountUsageProfiles } from "./usage-profiles.js?v=20260827-1";
import { buildPlainLanguageVerdict } from "./verdict.js?v=20260827-1";
import { mountExistingSetupCheck } from "./existing-setup.js?v=20260827-2";

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
let productCatalogSources = {};
let calculatorStarted = false;

renderAppliances();
mountUsageProfiles({
  locale: "sk",
  form,
  applianceGrid,
  appliances: APPLIANCES,
  onChange: updateLiveSummary,
  onSelect: (profile) => {
    trackCalculatorStarted("usage_profile");
    trackEvent("usage_profile_selected", { profile });
  },
});
const existingSetupCheck = mountExistingSetupCheck({
  target: document.querySelector("#existing-setup-check"),
  locale: "sk",
  getResult: () => latestResult,
  hasProductCategory: (category) => Boolean(document.querySelector(`[data-product-category="${category}"]`)),
  onUpgradeOpen: (category) => trackEvent("existing_setup_upgrade_opened", { category }),
  onAssessed: (assessment) => trackEvent("existing_setup_assessed", { bottleneck: assessment.primaryBottleneck || "none" })
});
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
    productCatalogSources = payload.sources && typeof payload.sources === "object" ? payload.sources : {};
  } catch {
    productCatalog = [];
  }
}

function renderAppliances() {
  applianceGrid.innerHTML = APPLIANCES.map((appliance) => `
    <article class="appliance-card ${appliance.custom ? "is-custom" : ""}" data-appliance-card="${appliance.id}">
      <input id="appliance-sk-${appliance.id}" type="checkbox" name="appliance" value="${appliance.id}" />
      <span class="appliance-icon" aria-hidden="true">${appliance.icon}</span>
      <label class="appliance-copy" for="appliance-sk-${appliance.id}">
        <strong>${appliance.name}</strong>
        <small>${appliance.description}</small>
      </label>
      ${applianceControls(appliance)}
    </article>
  `).join("");

  applianceGrid.addEventListener("click", handleApplianceCardClick);
  applianceGrid.addEventListener("change", handleApplianceChange);
  applianceGrid.addEventListener("input", updateLiveSummary);
}

function applianceControls(appliance) {
  const common = `
    <label class="mini-field">
      <input type="number" min="0.01" max="24" step="0.05" value="${appliance.hours}" data-hours aria-label="Hodiny denne pre ${appliance.name}" /> h/deň
    </label>
    <label class="mini-field">
      <input type="number" min="1" max="20" step="1" value="${appliance.quantity}" data-quantity aria-label="Počet kusov ${appliance.name}" /> ks
    </label>`;
  if (!appliance.custom) return `<span class="appliance-controls">${common}</span>`;
  return `<span class="appliance-controls custom-appliance-controls">
    <label class="mini-field custom-name-field"><input type="text" maxlength="60" value="Vlastný spotrebič" data-custom-name aria-label="Názov vlastného spotrebiča" /></label>
    <label class="mini-field"><input type="number" min="1" max="10000" step="1" value="${appliance.watts}" data-watts aria-label="Príkon vlastného spotrebiča" /> W</label>
    ${common}
    <label class="mini-field custom-select-field"><select data-ac aria-label="Napájanie vlastného spotrebiča"><option value="false">12/24 V DC</option><option value="true">230 V AC</option></select></label>
    <label class="mini-field custom-select-field"><select data-surge aria-label="Rozbeh vlastného spotrebiča"><option value="1">Bez známej špičky</option><option value="2">Motor / kompresor · 2×</option></select></label>
  </span>`;
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
    button.addEventListener("click", () => {
      trackCalculatorStarted("next_button");
      showStep(currentStep + 1);
    });
  });
  document.querySelectorAll("[data-back]").forEach((button) => {
    button.addEventListener("click", () => showStep(currentStep - 1));
  });
  document.querySelector("#start-over").addEventListener("click", resetForm);
  form.addEventListener("input", () => trackCalculatorStarted("form_input"), { once: true });
  form.addEventListener("submit", handleSubmit);
  document.querySelector("#result-products-link").addEventListener("click", () => {
    trackEvent("product_recommendations_opened", { source: "result_next" });
  });
}

function bindResultSharing() {
  document.querySelector("#result-share").addEventListener("click", shareResult);
  document.querySelector("#result-copy").addEventListener("click", () => copyResult("result_copied"));
  document.querySelector("#result-print").addEventListener("click", printResult);
}

function printResult() {
  if (!latestResult) return;
  trackEvent("result_print_requested");
  window.print();
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
      name: card.querySelector("[data-custom-name]")?.value.trim() || appliance.name,
      watts: Number(card.querySelector("[data-watts]")?.value ?? appliance.watts),
      hours: Number(card.querySelector("[data-hours]").value),
      quantity: Number(card.querySelector("[data-quantity]").value),
      ac: card.querySelector("[data-ac]")?.value === "true" || (!appliance.custom && appliance.ac),
      surge: Number(card.querySelector("[data-surge]")?.value ?? appliance.surge)
    };
  });
}

function updateLiveSummary() {
  const selected = getSelectedAppliances().filter((item) => item.selected);
  const total = selected.reduce((sum, item) => {
    const value = item.watts * item.hours * item.quantity;
    return sum + (Number.isFinite(value) ? value : 0);
  }, 0);
  selectedCount.textContent = selected.length;
  liveConsumption.textContent = formatEnergy(total);
}

function handleSubmit(event) {
  event.preventDefault();
  trackCalculatorStarted("submit");
  calculatorError.hidden = true;
  const appliances = getSelectedAppliances();
  if (!appliances.some((item) => item.selected)) {
    applianceError.textContent = "Vyberte aspoň jeden spotrebič.";
    applianceError.hidden = false;
    applianceError.scrollIntoView({ behavior: "smooth", block: "center" });
    trackEvent("calculation_failed", { reason: "no_appliance" });
    return;
  }
  const invalidAppliance = appliances.find((item) => item.selected && (
    !item.name || !Number.isFinite(item.watts) || item.watts < 1 || item.watts > 10000
    || !Number.isFinite(item.hours) || item.hours < 0.01 || item.hours > 24
    || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 20
  ));
  if (invalidAppliance) {
    applianceError.textContent = "Pri vybraných spotrebičoch skontrolujte názov, príkon, čas používania a počet kusov.";
    applianceError.hidden = false;
    applianceError.scrollIntoView({ behavior: "smooth", block: "center" });
    trackEvent("calculation_failed", { reason: "invalid_appliance" });
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
    latestResult.charging = calculateChargingPlan({
      dailyWh: latestResult.dailyWh,
      batteryAh: latestResult.batteryAh,
      batteryType: latestResult.batteryType,
      systemVoltage: latestResult.systemVoltage,
      starterVoltage: data.get("starterVoltage"),
      driveHoursPerDay: data.get("driveHoursPerDay"),
      shoreChargeHours: data.get("shoreChargeHours")
    });
    if (latestResult.charging?.dcDc?.enabled) {
      latestResult.charging.dcDc.inputWiring = calculateDcCablePlan({
        currentAmps: latestResult.charging.dcDc.estimatedInputCurrentAmps,
        voltage: latestResult.charging.starterVoltage,
        oneWayLengthMeters: data.get("dcDcInputCableLength")
      });
    }
    latestResult.roof = calculateRoofFit({
      solarWatts: latestResult.solarWatts,
      availableLengthMeters: data.get("roofLength"),
      availableWidthMeters: data.get("roofWidth")
    });
    latestShareUrl = buildSetupUrl({
      appliances,
      autonomyDays: data.get("autonomyDays"),
      season: data.get("season"),
      batteryType: data.get("batteryType"),
      systemVoltage: data.get("systemVoltage"),
      inverterCableLength: data.get("inverterCableLength"),
      driveHoursPerDay: data.get("driveHoursPerDay"),
      starterVoltage: data.get("starterVoltage"),
      dcDcInputCableLength: data.get("dcDcInputCableLength"),
      shoreChargeHours: data.get("shoreChargeHours"),
      roofLength: data.get("roofLength"),
      roofWidth: data.get("roofWidth")
    }, "sk", window.location.origin);
    history.replaceState({}, "", latestShareUrl.replace(window.location.origin, ""));

    renderResult(latestResult);
    trackEvent("calculation_completed", {
      dailyWh: latestResult.dailyWh,
      batteryAh: latestResult.batteryAh,
      solarWatts: latestResult.solarWatts,
      systemVoltage: latestResult.systemVoltage,
      applianceCount: appliances.filter((item) => item.selected).length,
      hasCustomAppliance: appliances.some((item) => item.selected && item.custom),
      batteryType: latestResult.batteryType,
      season: data.get("season"),
      hasDcDc: Boolean(latestResult.charging?.dcDc?.enabled),
      hasShoreCharging: Boolean(latestResult.charging?.shore?.enabled)
    });
    showStep(3);
  } catch (error) {
    console.error("Výpočet zostavy zlyhal", error);
    calculatorError.textContent = error?.message === "ROOF_DIMENSIONS_INCOMPLETE"
      ? "Na kontrolu strechy vyplňte dĺžku aj šírku voľného obdĺžnika, alebo nechajte obe polia prázdne."
      : error?.message === "ROOF_DIMENSIONS_INVALID"
        ? "Rozmery voľnej plochy strechy sú mimo podporovaného rozsahu."
        : "Výpočet sa nepodarilo zobraziť. Obnovte stránku a skúste to znova.";
    calculatorError.hidden = false;
    calculatorError.scrollIntoView({ behavior: "smooth", block: "center" });
    trackEvent("calculation_failed", {
      reason: error?.message === "ROOF_DIMENSIONS_INCOMPLETE"
        ? "roof_incomplete"
        : error?.message === "ROOF_DIMENSIONS_INVALID" ? "roof_invalid" : "unexpected"
    });
  }
}

function trackCalculatorStarted(source) {
  if (calculatorStarted) return;
  calculatorStarted = trackEvent("calculator_started", { source });
}

function renderResult(result) {
  existingSetupCheck.setResult(result);
  document.querySelector("#print-generated-at").textContent =
    `Vytvorené ${new Date().toLocaleDateString("sk-SK")} · mypowersetup.com`;
  document.querySelector("#result-intro").textContent =
    `Pre odhadovanú spotrebu ${formatEnergy(result.dailyWh)} denne a ${result.autonomyDays} ${dayWord(result.autonomyDays)} autonómie.`;
  document.querySelector("#result-verdict").textContent = buildPlainLanguageVerdict(result, "sk");

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
        <div class="breakdown-label"><span>${escapeHtml(item.name)}</span><strong>${formatEnergy(item.dailyWh)}</strong></div>
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
  renderChargingPlan(result.charging, result.systemVoltage);
  renderRoofFit(result.roof);
  renderInstallationPlan(result);
  renderPowerStationComparison(result);

  renderProductRecommendations(result);
}

function renderPowerStationComparison(result) {
  const profile = calculatePowerStationProfile(result);
  const target = document.querySelector("#power-station-profile");
  const verdict = {
    compact: ["Kompaktnú power station má zmysel porovnať", "Výsledok sa zmestí do bežnej prenosnej kategórie. Rozhodujú však konkrétne výstupy, konektory a spôsob dobíjania."],
    large: ["Porovnávajte veľkú alebo rozšíriteľnú power station", "Požiadavky sú vyššie; dôkladne overte hmotnosť, rozšírenie batérie, solárny vstup a trvalý výkon."],
    individual: ["Vstavaná zostava bude zvyčajne vhodnejšia", "Potrebná kapacita alebo výkon presahujú bežnú prenosnú kategóriu. Power station môže vyžadovať rozširujúce batérie či individuálny návrh."]
  }[profile.profile];
  target.innerHTML = [
    powerStationCard("Orientačný záver", verdict[0], verdict[1]),
    powerStationCard("Minimálna menovitá kapacita", `${profile.capacityWh} Wh`, `Počítame s ${profile.assumptions.capacityReservePercent}% rezervou a iba ${profile.assumptions.usableRatioPercent}% využitím menovitej kapacity.`),
    powerStationCard("Trvalý AC výstup", profile.acOutputWatts ? `aspoň ${profile.acOutputWatts} W` : "Nie je potrebný", profile.acOutputWatts ? "Overte aj krátkodobý rozbehový výkon konkrétneho modelu." : "Vybrané spotrebiče nevyžadujú 230 V."),
    powerStationCard("Solárny vstup", `aspoň ${profile.solarInputWatts} W`, "Pre využitie navrhnutého poľa. Overte aj povolené napätie Voc, prúd a konektory."),
    powerStationCard("12V DC výstup", profile.dcContinuousWatts ? `najmenej ${profile.dcOutputAmpsAt12V} A` : "Bez DC požiadavky", profile.dcContinuousWatts ? `Súčet zadaných DC príkonov je ${Math.round(profile.dcContinuousWatts)} W; overte regulovaný výstup a súbeh zásuviek.` : "Vo výbere nie je DC spotrebič.")
  ].join("");
}

function powerStationCard(label, value, description) {
  return `<article class="charging-card"><span>${label}</span><strong>${value}</strong><p>${description}</p></article>`;
}

function renderInstallationPlan(result) {
  const target = document.querySelector("#installation-plan");
  target.innerHTML = buildInstallationPlan(result, "sk").map((circuit, index) => `
    <article class="installation-card">
      <span>${String(index + 1).padStart(2, "0")}</span>
      <div><strong>${escapeHtml(circuit.label)}</strong><p>${escapeHtml(circuit.detail)}</p></div>
    </article>
  `).join("");
}

function renderRoofFit(roof) {
  const target = document.querySelector("#roof-fit");
  if (!roof?.checked) {
    target.innerHTML = '<article class="roof-fit-card is-unchecked"><strong>Kontrola nie je zapnutá</strong><p>V pokročilom nastavení doplňte dĺžku a šírku najväčšieho voľného obdĺžnika na streche.</p></article>';
    return;
  }
  const status = roof.fits ? "Referenčná zostava sa geometricky zmestí" : "Referenčná zostava sa do zadanej plochy nezmestí";
  const detail = `${roof.requiredQuantity}× ${roof.referencePanelWatts} Wp · panel ${formatNumber(roof.referencePanelLengthMeters)} × ${formatNumber(roof.referencePanelWidthMeters)} m · spolu ${roof.installedWatts} Wp`;
  const capacity = `Do obdĺžnika ${formatNumber(roof.availableLengthMeters)} × ${formatNumber(roof.availableWidthMeters)} m vychádza pri jednotnej orientácii najviac ${roof.capacity} ks.`;
  target.innerHTML = `<article class="roof-fit-card ${roof.fits ? "is-fit" : "is-warning"}"><strong>${status}</strong><p>${detail}</p><small>${capacity} Nezapočítavame montážne medzery, držiaky, tienenie ani servisný prístup.</small></article>`;
}

function renderChargingPlan(plan, systemVoltage) {
  const target = document.querySelector("#charging-options");
  if (!plan) {
    target.innerHTML = "";
    return;
  }
  const inputEstimate = plan.dcDc.enabled && plan.dcDc.estimatedInputCurrentAmps
    ? ` Orientačný odber z ${plan.starterVoltage}V štartovacej sústavy pri výkone navrhnutej nabíjačky je až približne ${plan.dcDc.estimatedInputCurrentAmps} A.`
    : "";
  const dcDcVoltageCheck = systemVoltage === 24
    ? " Pre 24V nadstavbovú batériu musí nabíjačka výslovne podporovať prevod zo štartovacej sústavy na 24 V."
    : "";
  const dcDcCable = plan.dcDc.inputWiring
    ? plan.dcDc.inputWiring.recommendedCrossSectionMm2
      ? ` Pre zadanú dĺžku ${formatNumber(plan.dcDc.inputWiring.oneWayLengthMeters)} m vychádza najmenej ${plan.dcDc.inputWiring.recommendedCrossSectionMm2} mm² iba podľa cieľa úbytku do ${plan.dcDc.inputWiring.maxVoltageDropPercent} %.`
      : ` Pre zadanú dĺžku ${formatNumber(plan.dcDc.inputWiring.oneWayLengthMeters)} m je nutný individuálny návrh prívodu; výpočet podľa úbytku prekračuje 120 mm².`
    : "";
  target.innerHTML = [
    chargingCard("DC–DC z alternátora", plan.dcDc, `Vstup ${plan.starterVoltage} V, výstup pre ${systemVoltage}V batériu.${inputEstimate}${dcDcCable} Ide o návrhový odhad pri 90% účinnosti, nie náhradu údajov výrobcu. Prierez môže byť nutné zväčšiť podľa prúdovej zaťažiteľnosti, teploty, uloženia, svoriek a manuálu; poistku tento výpočet neurčuje. Overte voľnú kapacitu alternátora, skutočný maximálny vstupný prúd, kabeláž, istenie a podporu inteligentného alternátora.${dcDcVoltageCheck}`),
    chargingCard("Nabíjačka z 230 V", plan.shore, `Výstup pre ${systemVoltage}V batériu. Nabíjací profil, teplotnú kompenzáciu a maximálny prúd musí povoliť výrobca batérie a BMS.`)
  ].join("");
}

function chargingCard(label, option, check) {
  if (!option.enabled) return `<article class="charging-card is-disabled"><span>${label}</span><strong>Vypnuté</strong><p>Pre tento zdroj ste nastavili 0 hodín.</p></article>`;
  const value = option.suggestedCurrentAmps ? `najmenej ${option.suggestedCurrentAmps} A` : "individuálny návrh";
  const reason = option.suggestedCurrentAmps
    ? `Na doplnenie dennej spotreby za ${formatNumber(option.hours)} h vychádza najmenej ${option.requiredCurrentAmps} A pri započítaní 90% účinnosti.`
    : `Potrebných ${option.requiredCurrentAmps} A prekračuje konzervatívny plánovací limit ${option.planningCeilingAmps} A pre túto batériu.`;
  return `<article class="charging-card ${option.needsIndividualDesign ? "is-warning" : ""}"><span>${label}</span><strong>${value}</strong><p>${reason}</p><small>${check}</small></article>`;
}

function renderProductRecommendations(result) {
  const heading = document.querySelector("#product-heading");
  const intro = document.querySelector("#product-intro");
  const groups = document.querySelector("#recommendation-groups");
  const rankedRecommendations = recommendProducts(productCatalog, result, 24);
  const recommendations = Object.fromEntries(
    Object.entries(rankedRecommendations).map(([category, items]) => [category, items.slice(0, 3)])
  );
  const categoryLabels = {
    battery: "Batérie",
    solar_panel: "Solárne panely",
    inverter: "Meniče",
    controller: "MPPT regulátory",
    dc_charger: "DC–DC nabíjačky z alternátora",
    shore_charger: "Nabíjačky z 230 V"
  };
  const total = Object.values(recommendations).reduce((sum, items) => sum + items.length, 0);
  const categoryCount = Object.values(recommendations).filter((items) => items.length).length;
  const coverage = assessRecommendationCoverage(recommendations, result, "sk");
  trackEvent("product_coverage_calculated", {
    locale: "sk",
    required_categories: coverage.required.length,
    covered_categories: coverage.covered.length,
    missing_categories: coverage.missing.join(","),
  });
  const resultNext = document.querySelector("#result-next");
  resultNext.hidden = false;
  document.querySelector("#result-product-count").textContent = total
    ? `Našli sme ${total} overených zhôd v ${categoryCount} kategóriách. Produktové pokrytie zostavy: ${coverage.covered.length} z ${coverage.required.length} potrebných kategórií.`
    : "Pre túto konfiguráciu zatiaľ nemáme dostatočne overenú produktovú zhodu. Technický výsledok môžete ďalej použiť ako podklad pre výber.";
  document.querySelector("#result-products-link").hidden = total === 0;
  const freshness = productCatalogUpdatedAt
    ? ` Produktové údaje boli načítané ${new Date(productCatalogUpdatedAt).toLocaleDateString("sk-SK")}.`
    : "";

  if (total === 0) {
    document.querySelector("#package-variants").innerHTML = "";
    heading.textContent = "Pripravujeme presné produktové odporúčania";
    intro.textContent = "Produkty zverejníme až po overení ich parametrov voči výsledku vašej zostavy. Nebudeme vás posielať na všeobecnú domovskú stránku ani označovať neoverený produkt za kompatibilný.";
    groups.innerHTML = '<button class="button button-disabled" type="button" disabled>Produktové párovanie sa pripravuje</button>';
    return;
  }

  heading.textContent = "Komponenty zodpovedajúce vášmu výpočtu";
  intro.textContent = `Najprv overujeme technickú kompatibilitu. Poradie následne zohľadňuje zhodu parametrov, dostupnosť a úplnosť produktových údajov.${freshness}`;
  renderProductPackages(buildProductPackages(rankedRecommendations, result));
  const coverageNotice = coverage.complete ? "" : `<p class="recommendation-coverage-note"><strong>Čo katalóg zatiaľ nepokrýva:</strong> ${coverage.message}</p>`;
  groups.innerHTML = coverageNotice + Object.entries(recommendations)
    .filter(([, items]) => items.length)
    .map(([category, items]) => `
      <section class="product-group" id="product-group-${category}" data-product-category="${category}">
        <h5>${categoryLabels[category]}</h5>
        <div class="product-grid">
          ${items.map(({ product, reason, checks, verify }) => productCard(product, reason, checks, verify)).join("")}
        </div>
      </section>
    `).join("");
}

function renderProductPackages(variants) {
  const target = document.querySelector("#package-variants");
  const copy = {
    economy: ["Úsporná", "Najnižšia známa cena medzi kompatibilnými voľbami."],
    recommended: ["Odporúčaná", "Najlepšia zhoda parametrov a úplnosti údajov."],
    reserve: ["S väčšou rezervou", "Mierne vyššia technická rezerva, kde ju katalóg ponúka."],
  };
  if (!variants.length) {
    target.innerHTML = "";
    return;
  }
  const stalePriceNote = Object.values(productCatalogSources).some((source) => source?.status === "stale")
    ? '<p class="catalog-source-note is-stale"><strong>Aktualizácia cien:</strong> Pri jednom obchode používame posledný úspešne načítaný feed. Aktuálnu cenu a dostupnosť vždy potvrďte na stránke produktu.</p>'
    : "";
  target.innerHTML = `<div class="package-intro"><strong>Tri bezpečné cesty k nákupu</strong><p>Všetky varianty spĺňajú rovnakú vypočítanú požiadavku a zahŕňajú dostupné hlavné aj nabíjacie komponenty. Nejde o kompletný inštalačný materiál ani realizačný rozpočet.</p>${stalePriceNote}</div><div class="package-grid">${variants.map((variant) => {
    const [label, description] = copy[variant.id];
    return `<article class="package-card ${variant.id === "recommended" ? "is-recommended" : ""}"><span>${label}</span><p>${description}</p><ul>${variant.items.map(({ category, product }) => packageProductLink(category, product, variant.id)).join("")}</ul><b>${variant.totalPriceCzk === null ? "Cena podľa obchodu" : formatPrice(variant.totalPriceCzk, variant.totalCurrency)}</b><small class="package-price-note">Orientačný súčet produktov; doprava a montáž nie sú zahrnuté.</small></article>`;
  }).join("")}</div>`;
}

function packageProductLink(category, product, packageId) {
  const quantity = product.recommendedQuantity || 1;
  const quantityLabel = quantity > 1 ? `${quantity} ks · ` : "";
  return `<li><small>${packageCategoryLabel(category)}</small><strong>${escapeHtml(product.name)}</strong><span class="package-product-meta">${quantityLabel}${escapeHtml(merchantLabel(product.merchant))}</span><a class="package-product-link" href="${escapeHtml(product.affiliateUrl)}" target="_blank" rel="sponsored noopener" data-affiliate-click data-source="package" data-package-id="${escapeHtml(packageId)}" data-product-id="${escapeHtml(product.id)}" data-merchant="${escapeHtml(product.merchant)}" data-category="${escapeHtml(product.category)}">Zobraziť presný produkt →</a></li>`;
}

function packageCategoryLabel(category) {
  return ({ battery: "Batéria", solar_panel: "Solár", inverter: "Menič", controller: "MPPT", dc_charger: "DC–DC nabíjačka", shore_charger: "Nabíjačka 230 V" })[category] || category;
}

function productCard(product, reason, checks, verify) {
  const sourceIsStale = productCatalogSources[product.merchant]?.status === "stale";
  const sourceNote = sourceIsStale
    ? '<p class="product-source-status is-stale"><strong>Starší produktový feed:</strong> Parametre prešli kontrolou zhody, ale cenu a dostupnosť overte po prekliku.</p>'
    : "";
  return `
    <article class="product-card">
      ${product.imageUrl ? `<img src="${escapeHtml(product.imageUrl)}" alt="" loading="lazy" />` : ""}
      <div class="product-card-copy">
        <span>${escapeHtml(product.brand || merchantLabel(product.merchant))} · ${escapeHtml(merchantLabel(product.merchant))}</span>
        <h6>${escapeHtml(product.name)}</h6>
        <p class="product-reason"><strong>Prečo vyhovuje:</strong> ${escapeHtml(reason)}</p>
        <ul class="product-checks">${checks.map((check) => `<li>${escapeHtml(check)}</li>`).join("")}</ul>
        <p class="product-verify"><strong>Pred nákupom:</strong> ${escapeHtml(verify)}</p>
        ${sourceNote}
        <div class="product-card-action">
          <span class="product-price"><strong>${formatPrice(product.priceCzk, product.priceCurrency)}</strong><small>${sourceIsStale ? "Cena z posledného úspešného feedu" : "Cena z produktového feedu"}</small></span>
          <a href="${escapeHtml(product.affiliateUrl)}" target="_blank" rel="sponsored noopener" data-affiliate-click data-source="product-card" data-product-id="${escapeHtml(product.id)}" data-merchant="${escapeHtml(product.merchant)}" data-category="${escapeHtml(product.category)}">Zobraziť produkt →</a>
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
    category: link.dataset.category,
    source: link.dataset.source || "unknown",
    packageId: link.dataset.packageId || undefined
  };
  trackEvent(detail.event, detail);
  document.dispatchEvent(new CustomEvent("mypowersetup:affiliate-click", { detail }));
});

function trackEvent(event, parameters = {}) {
  return Boolean(window.MyPowerSetupAnalytics?.track(event, parameters));
}

function formatPrice(price, currency = "EUR") {
  return Number.isFinite(price)
    ? new Intl.NumberFormat("sk-SK", { style: "currency", currency: currency || "EUR", maximumFractionDigits: 2 }).format(price)
    : "Cena v obchode";
}

function merchantLabel(merchant) {
  return ({ padabo: "Padabo.sk", ampul_sk: "Ampul.eu", allpowers_eu: "ALLPOWERS EU" })[merchant] || merchant;
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
  calculatorStarted = false;
  document.querySelectorAll(".choice-card").forEach((card) => {
    const input = card.querySelector("input");
    card.classList.toggle("is-selected", input.checked);
  });
  document.querySelectorAll(".appliance-card").forEach((card) => card.classList.remove("is-selected"));
  document.querySelectorAll("[data-usage-profile]").forEach((button) => {
    button.classList.remove("is-selected");
    button.setAttribute("aria-pressed", "false");
  });
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
    if (saved.id === "custom") {
      card.querySelector("[data-custom-name]").value = saved.name;
      card.querySelector("[data-watts]").value = saved.watts;
      card.querySelector("[data-ac]").value = String(saved.ac);
      card.querySelector("[data-surge]").value = String(saved.surge);
    }
    card.classList.add("is-selected");
  });
  for (const [name, value] of Object.entries({
    autonomyDays: config.autonomyDays,
    season: config.season,
    batteryType: config.batteryType,
    systemVoltage: config.systemVoltage,
    inverterCableLength: config.inverterCableLength,
    driveHoursPerDay: config.driveHoursPerDay,
    starterVoltage: config.starterVoltage,
    dcDcInputCableLength: config.dcDcInputCableLength,
    shoreChargeHours: config.shoreChargeHours,
    roofLength: config.roofLength,
    roofWidth: config.roofWidth
  })) {
    const input = form.elements.namedItem(name);
    if (input && value !== undefined && value !== null) input.value = value;
  }
  document.querySelectorAll(".choice-card").forEach((card) => {
    card.classList.toggle("is-selected", card.querySelector("input").checked);
  });
  updateLiveSummary();
  trackCalculatorStarted("shared_url");
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
