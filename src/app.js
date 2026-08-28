import { APPLIANCES } from "./catalog.js?v=20260823-custom1";
import { calculateSetup } from "./engine.js?v=20260821-1";
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
let latestShareUrl = "https://mypowersetup.com/#kalkulator";
let productCatalog = [];
let productCatalogUpdatedAt = null;
let productCatalogSources = {};
let calculatorStarted = false;

renderAppliances();
mountUsageProfiles({
  locale: "cs",
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
  locale: "cs",
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
    const responses = await Promise.all([
      fetch("/data/products.json", { cache: "no-store" }),
      fetch("/data/products-ampul-cz.json", { cache: "no-store" })
    ]);
    const payloads = await Promise.all(responses.filter((response) => response.ok).map((response) => response.json()));
    productCatalog = payloads.flatMap((payload) => Array.isArray(payload.products) ? payload.products : []);
    productCatalogUpdatedAt = payloads.map((payload) => payload.updatedAt || payload.generatedAt).filter(Boolean).sort().at(-1) || null;
    productCatalogSources = Object.assign({}, ...payloads.map((payload) =>
      payload.sources && typeof payload.sources === "object" ? payload.sources : {}
    ));
  } catch {
    productCatalog = [];
  }
}

function renderAppliances() {
  applianceGrid.innerHTML = APPLIANCES.map((appliance) => `
    <article class="appliance-card ${appliance.custom ? "is-custom" : ""}" data-appliance-card="${appliance.id}">
      <input id="appliance-${appliance.id}" type="checkbox" name="appliance" value="${appliance.id}" />
      <span class="appliance-icon" aria-hidden="true">${appliance.icon}</span>
      <label class="appliance-copy" for="appliance-${appliance.id}">
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
      <input type="number" min="0.01" max="24" step="0.05" value="${appliance.hours}" data-hours aria-label="Hodiny denně pro ${appliance.name}" /> h/den
    </label>
    <label class="mini-field">
      <input type="number" min="1" max="20" step="1" value="${appliance.quantity}" data-quantity aria-label="Počet kusů ${appliance.name}" /> ks
    </label>`;
  if (!appliance.custom) return `<span class="appliance-controls">${common}</span>`;
  return `<span class="appliance-controls custom-appliance-controls">
    <label class="mini-field custom-name-field"><input type="text" maxlength="60" value="Vlastní spotřebič" data-custom-name aria-label="Název vlastního spotřebiče" /></label>
    <label class="mini-field"><input type="number" min="1" max="10000" step="1" value="${appliance.watts}" data-watts aria-label="Příkon vlastního spotřebiče" /> W</label>
    ${common}
    <label class="mini-field custom-select-field"><select data-ac aria-label="Napájení vlastního spotřebiče"><option value="false">12/24 V DC</option><option value="true">230 V AC</option></select></label>
    <label class="mini-field custom-select-field"><select data-surge aria-label="Rozběh vlastního spotřebiče"><option value="1">Bez známé špičky</option><option value="2">Motor / kompresor · 2×</option></select></label>
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
  const copied = await copyText(buildResultShareText(latestResult, "cs", latestShareUrl));
  setShareStatus(copied
    ? "Souhrn byl zkopírován do schránky."
    : "Kopírování se nepodařilo. Označte prosím výsledek ručně.");
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
      title: "MyPowerSetup — návrh sestavy",
      text: buildResultShareText(latestResult, "cs", latestShareUrl)
    });
    setShareStatus("Výsledek byl připraven ke sdílení.");
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
    applianceError.textContent = "Vyberte alespoň jeden spotřebič.";
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
    applianceError.textContent = "U vybraných spotřebičů zkontrolujte název, příkon, dobu používání a počet kusů.";
    applianceError.hidden = false;
    applianceError.scrollIntoView({ behavior: "smooth", block: "center" });
    trackEvent("calculation_failed", { reason: "invalid_appliance" });
    return;
  }

  try {
    const data = new FormData(form);
    latestResult = calculateSetup({
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
    }, "cs", window.location.origin);
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
    console.error("Výpočet sestavy selhal", error);
    calculatorError.textContent = error?.message === "ROOF_DIMENSIONS_INCOMPLETE"
      ? "Pro kontrolu střechy vyplňte délku i šířku volného obdélníku, nebo nechte obě pole prázdná."
      : error?.message === "ROOF_DIMENSIONS_INVALID"
        ? "Rozměry volné plochy střechy jsou mimo podporovaný rozsah."
        : "Výpočet se nepodařilo zobrazit. Obnovte prosím stránku a zkuste to znovu.";
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
    `Vytvořeno ${new Date().toLocaleDateString("cs-CZ")} · mypowersetup.com`;
  document.querySelector("#result-intro").textContent =
    `Pro odhadovanou spotřebu ${formatEnergy(result.dailyWh)} denně a ${result.autonomyDays} ${dayWord(result.autonomyDays)} autonomie.`;
  document.querySelector("#result-verdict").textContent = buildPlainLanguageVerdict(result, "cs");

  document.querySelector("#result-grid").innerHTML = [
    resultCard("Baterie", `${result.batteryAh} Ah`, `${formatEnergy(result.batteryWh)} · ${result.systemVoltage} V · ${result.batteryLabel}`, true),
    resultCard("Solární panely", `${result.solarWatts} Wp`, `${result.seasonLabel.toLowerCase()} · včetně rezervy`),
    resultCard("Čistý sinus měnič", result.inverterWatts ? `${result.inverterWatts} W` : "Není nutný", result.inverterWatts ? "pro vybrané 230V spotřebiče" : "všechny vybrané spotřebiče jsou DC"),
    resultCard("MPPT regulátor", `${result.controllerAmps} A`, `pro ${result.systemVoltage}V systém`)
  ].join("");

  document.querySelector("#result-reasons").innerHTML = [
    explanationCard("Baterie", `${formatEnergy(result.dailyWh)} × ${result.autonomyDays} ${dayWord(result.autonomyDays)}`, `Po započtení ${result.assumptions.batteryMarginPercent}% rezervy a ${result.assumptions.usableDepthPercent}% využitelné kapacity vychází ${formatEnergy(result.batteryWh)}.`),
    explanationCard("Solár", `${formatEnergy(result.dailyWh)} ÷ ${formatNumber(result.calculation.peakSunHours)} slunečních hodin`, `Po systémových ztrátách a rezervě zaokrouhlujeme nahoru na ${result.solarWatts} Wp.`),
    explanationCard("Napětí", `${result.systemVoltage}V systém`, result.calculation.automaticVoltage === result.systemVoltage ? "Automatická volba podle velikosti baterie a výkonu měniče." : `Ruční volba; automatický návrh by použil ${result.calculation.automaticVoltage} V.`),
    explanationCard("Měnič", result.inverterWatts ? `${result.inverterWatts} W` : "Není potřeba", result.inverterWatts ? `Porovnáváme souběžný AC odběr přibližně ${Math.round(result.calculation.estimatedConcurrentWatts)} W a rozběhovou špičku ${Math.round(result.calculation.largestStartWatts)} W.` : "Mezi vybranými zařízeními není 230V spotřebič."),
    ...(result.wiring ? [explanationCard(
      "Kabel baterie–měnič",
      result.wiring.recommendedCrossSectionMm2 ? `nejméně ${result.wiring.recommendedCrossSectionMm2} mm²` : "individuální návrh",
      `Pro délku ${formatNumber(result.wiring.oneWayLengthMeters)} m a návrhový proud ${result.wiring.designCurrentAmps} A vychází minimum pouze podle cíle úbytku do ${result.wiring.maxVoltageDropPercent} %. Finální průřez a pojistku vždy určete podle manuálu měniče, zatížitelnosti kabelu, teploty a způsobu uložení.`
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
    { text: "Porovnejte vstupní příkony s výrobními štítky svých spotřebičů." },
    { text: "Ověřte rozběhové špičky, kabeláž, jištění, BMS a podmínky montáže." },
    { text: "Pojistka chrání kabel: její DC napětí, vypínací schopnost, typ a proud musí odpovídat manuálu zařízení i skutečné instalaci." },
    { text: "U panelů a MPPT samostatně ověřte Voc a Isc při nejnižší očekávané teplotě." }
  ];
  document.querySelector("#result-notes").innerHTML = checks
    .map(({ text, warning }) => `<li class="${warning ? "is-warning" : ""}">${escapeHtml(text)}</li>`)
    .join("");

  document.querySelector("#system-diagram").innerHTML = buildSystemDiagram(result, "cs");
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
    compact: ["Kompaktní power station dává smysl k porovnání", "Výsledek se vejde do běžné přenosné kategorie. Rozhodují ale konkrétní výstupy, konektory a způsob dobíjení."],
    large: ["Porovnávejte velkou nebo rozšiřitelnou power station", "Požadavky jsou vyšší; pečlivě ověřte hmotnost, rozšíření baterie, solární vstup a trvalý výkon."],
    individual: ["Vestavná sestava bude obvykle vhodnější", "Potřebná kapacita nebo výkon přesahují běžnou přenosnou kategorii. Power station může vyžadovat rozšiřující baterie či individuální návrh."]
  }[profile.profile];
  target.innerHTML = [
    powerStationCard("Orientační závěr", verdict[0], verdict[1]),
    powerStationCard("Minimální jmenovitá kapacita", `${profile.capacityWh} Wh`, `Počítáme s ${profile.assumptions.capacityReservePercent}% rezervou a pouze ${profile.assumptions.usableRatioPercent}% využitím jmenovité kapacity.`),
    powerStationCard("Trvalý AC výstup", profile.acOutputWatts ? `alespoň ${profile.acOutputWatts} W` : "Není nutný", profile.acOutputWatts ? "Ověřte také krátkodobý rozběhový výkon konkrétního modelu." : "Vybrané spotřebiče nevyžadují 230 V."),
    powerStationCard("Solární vstup", `alespoň ${profile.solarInputWatts} W`, "Pro využití navrženého pole. Ověřte také povolené napětí Voc, proud a konektory."),
    powerStationCard("12V DC výstup", profile.dcContinuousWatts ? `nejméně ${profile.dcOutputAmpsAt12V} A` : "Bez DC požadavku", profile.dcContinuousWatts ? `Součet zadaných DC příkonů je ${Math.round(profile.dcContinuousWatts)} W; ověřte regulovaný výstup a souběh zásuvek.` : "Ve výběru není DC spotřebič.")
  ].join("");
}

function powerStationCard(label, value, description) {
  return `<article class="charging-card"><span>${label}</span><strong>${value}</strong><p>${description}</p></article>`;
}

function renderInstallationPlan(result) {
  const target = document.querySelector("#installation-plan");
  target.innerHTML = buildInstallationPlan(result, "cs").map((circuit, index) => `
    <article class="installation-card">
      <span>${String(index + 1).padStart(2, "0")}</span>
      <div><strong>${escapeHtml(circuit.label)}</strong><p>${escapeHtml(circuit.detail)}</p></div>
    </article>
  `).join("");
}

function renderRoofFit(roof) {
  const target = document.querySelector("#roof-fit");
  if (!roof?.checked) {
    target.innerHTML = '<article class="roof-fit-card is-unchecked"><strong>Kontrola není zapnutá</strong><p>V pokročilém nastavení doplňte délku a šířku největšího volného obdélníku na střeše.</p></article>';
    return;
  }
  const status = roof.fits ? "Referenční sestava se geometricky vejde" : "Referenční sestava se do zadané plochy nevejde";
  const detail = `${roof.requiredQuantity}× ${roof.referencePanelWatts} Wp · panel ${formatNumber(roof.referencePanelLengthMeters)} × ${formatNumber(roof.referencePanelWidthMeters)} m · celkem ${roof.installedWatts} Wp`;
  const capacity = `Do obdélníku ${formatNumber(roof.availableLengthMeters)} × ${formatNumber(roof.availableWidthMeters)} m vychází při jednotné orientaci nejvýše ${roof.capacity} ks.`;
  target.innerHTML = `<article class="roof-fit-card ${roof.fits ? "is-fit" : "is-warning"}"><strong>${status}</strong><p>${detail}</p><small>${capacity} Nezapočítáváme montážní mezery, držáky, stínění ani servisní přístup.</small></article>`;
}

function renderChargingPlan(plan, systemVoltage) {
  const target = document.querySelector("#charging-options");
  if (!plan) {
    target.innerHTML = "";
    return;
  }
  const inputEstimate = plan.dcDc.enabled && plan.dcDc.estimatedInputCurrentAmps
    ? ` Orientační odběr ze ${plan.starterVoltage}V startovací soustavy při výkonu navržené nabíječky je až přibližně ${plan.dcDc.estimatedInputCurrentAmps} A.`
    : "";
  const dcDcVoltageCheck = systemVoltage === 24
    ? " Pro 24V nástavbovou baterii musí nabíječka výslovně podporovat převod ze startovací soustavy na 24 V."
    : "";
  const dcDcCable = plan.dcDc.inputWiring
    ? plan.dcDc.inputWiring.recommendedCrossSectionMm2
      ? ` Pro zadanou délku ${formatNumber(plan.dcDc.inputWiring.oneWayLengthMeters)} m vychází nejméně ${plan.dcDc.inputWiring.recommendedCrossSectionMm2} mm² pouze podle cíle úbytku do ${plan.dcDc.inputWiring.maxVoltageDropPercent} %.`
      : ` Pro zadanou délku ${formatNumber(plan.dcDc.inputWiring.oneWayLengthMeters)} m je nutný individuální návrh přívodu; výpočet podle úbytku překračuje 120 mm².`
    : "";
  target.innerHTML = [
    chargingCard("DC–DC z alternátoru", plan.dcDc, `Vstup ${plan.starterVoltage} V, výstup pro ${systemVoltage}V baterii.${inputEstimate}${dcDcCable} Jde o návrhový odhad při 90% účinnosti, nikoli náhradu údajů výrobce. Průřez může být nutné zvětšit podle proudové zatížitelnosti, teploty, uložení, svorek a manuálu; pojistku tento výpočet neurčuje. Ověřte volnou kapacitu alternátoru, skutečný maximální vstupní proud, kabeláž, jištění a podporu chytrého alternátoru.${dcDcVoltageCheck}`),
    chargingCard("Nabíječka z 230 V", plan.shore, `Výstup pro ${systemVoltage}V baterii. Nabíjecí profil, teplotní kompenzace a maximální proud musí povolit výrobce baterie a BMS.`)
  ].join("");
}

function chargingCard(label, option, check) {
  if (!option.enabled) return `<article class="charging-card is-disabled"><span>${label}</span><strong>Vypnuto</strong><p>Pro tento zdroj jste nastavili 0 hodin.</p></article>`;
  const value = option.suggestedCurrentAmps ? `alespoň ${option.suggestedCurrentAmps} A` : "individuální návrh";
  const reason = option.suggestedCurrentAmps
    ? `Pro doplnění denní spotřeby za ${formatNumber(option.hours)} h vychází nejméně ${option.requiredCurrentAmps} A při započtení 90% účinnosti.`
    : `Potřebných ${option.requiredCurrentAmps} A překračuje konzervativní plánovací limit ${option.planningCeilingAmps} A pro tuto baterii.`;
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
    battery: "Baterie",
    solar_panel: "Solární panely",
    inverter: "Měniče",
    controller: "MPPT regulátory",
    dc_charger: "DC–DC nabíječky z alternátoru",
    shore_charger: "Nabíječky z 230 V"
  };
  const total = Object.values(recommendations).reduce((sum, items) => sum + items.length, 0);
  const categoryCount = Object.values(recommendations).filter((items) => items.length).length;
  const coverage = assessRecommendationCoverage(recommendations, result, "cs");
  trackEvent("product_coverage_calculated", {
    locale: "cs",
    required_categories: coverage.required.length,
    covered_categories: coverage.covered.length,
    missing_categories: coverage.missing.join(","),
  });
  const resultNext = document.querySelector("#result-next");
  resultNext.hidden = false;
  document.querySelector("#result-product-count").textContent = total
    ? `Našli jsme ${total} ověřených shod v ${categoryCount} kategoriích. Produktové pokrytí sestavy: ${coverage.covered.length} z ${coverage.required.length} potřebných kategorií.`
    : "Pro tuto konfiguraci zatím nemáme dostatečně ověřenou produktovou shodu. Technický výsledek můžete dál použít jako podklad pro výběr.";
  document.querySelector("#result-products-link").hidden = total === 0;
  const freshness = productCatalogUpdatedAt
    ? ` Produktová data byla načtena ${new Date(productCatalogUpdatedAt).toLocaleDateString("cs-CZ")}.`
    : "";

  if (total === 0) {
    document.querySelector("#package-variants").innerHTML = "";
    heading.textContent = "Připravujeme přesná produktová doporučení";
    intro.textContent = "Produkty zveřejníme až po ověření jejich parametrů proti výsledku vaší sestavy. Nebudeme vás posílat na obecnou homepage ani označovat neověřený produkt za kompatibilní.";
    groups.innerHTML = '<button class="button button-disabled" type="button" disabled>Produktové párování se připravuje</button>';
    return;
  }

  heading.textContent = "Komponenty odpovídající vašemu výpočtu";
  intro.textContent = `Nejdříve ověřujeme technickou kompatibilitu. Pořadí následně zohledňuje shodu parametrů, dostupnost a úplnost produktových dat.${freshness}`;
  renderProductPackages(buildProductPackages(rankedRecommendations, result));
  const coverageNotice = coverage.complete ? "" : `<p class="recommendation-coverage-note"><strong>Co katalog zatím nepokrývá:</strong> ${coverage.message}</p>`;
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
    economy: ["Úsporná", "Nejnižší známá cena mezi kompatibilními volbami."],
    recommended: ["Doporučená", "Nejlepší shoda parametrů a úplnosti dat."],
    reserve: ["S větší rezervou", "Mírně vyšší technická rezerva, kde ji katalog nabízí."],
  };
  if (!variants.length) {
    target.innerHTML = "";
    return;
  }
  const stalePriceNote = Object.values(productCatalogSources).some((source) => source?.status === "stale")
    ? '<p class="catalog-source-note is-stale"><strong>Aktualizace cen:</strong> U jednoho obchodu používáme poslední úspěšně načtený feed. Aktuální cenu a dostupnost vždy potvrďte na stránce produktu.</p>'
    : "";
  target.innerHTML = `<div class="package-intro"><strong>Tři bezpečné cesty k nákupu</strong><p>Všechny varianty splňují stejný vypočtený požadavek a zahrnují dostupné hlavní i nabíjecí komponenty. Nejde o kompletní instalační materiál ani realizační rozpočet.</p>${stalePriceNote}</div><div class="package-grid">${variants.map((variant) => {
    const [label, description] = copy[variant.id];
    return `<article class="package-card ${variant.id === "recommended" ? "is-recommended" : ""}"><span>${label}</span><p>${description}</p><ul>${variant.items.map(({ category, product }) => packageProductLink(category, product, variant.id)).join("")}</ul><b>${variant.totalPriceCzk === null ? "Cena podle obchodu" : formatPrice(variant.totalPriceCzk, variant.totalCurrency)}</b><small class="package-price-note">Orientační součet produktů; doprava a montáž nejsou zahrnuté.</small></article>`;
  }).join("")}</div>`;
}

function packageProductLink(category, product, packageId) {
  const quantity = product.recommendedQuantity || 1;
  const quantityLabel = quantity > 1 ? `${quantity} ks · ` : "";
  return `<li><small>${packageCategoryLabel(category)}</small><strong>${escapeHtml(product.name)}</strong><span class="package-product-meta">${quantityLabel}${escapeHtml(merchantLabel(product.merchant))}</span><a class="package-product-link" href="${escapeHtml(product.affiliateUrl)}" target="_blank" rel="sponsored noopener" data-affiliate-click data-source="package" data-package-id="${escapeHtml(packageId)}" data-product-id="${escapeHtml(product.id)}" data-merchant="${escapeHtml(product.merchant)}" data-category="${escapeHtml(product.category)}">Zobrazit přesný produkt →</a></li>`;
}

function packageCategoryLabel(category) {
  return ({ battery: "Baterie", solar_panel: "Solár", inverter: "Měnič", controller: "MPPT", dc_charger: "DC–DC nabíječka", shore_charger: "Nabíječka 230 V" })[category] || category;
}

function productCard(product, reason, checks, verify) {
  const sourceIsStale = productCatalogSources[product.merchant]?.status === "stale";
  const sourceNote = sourceIsStale
    ? '<p class="product-source-status is-stale"><strong>Starší produktový feed:</strong> Parametry prošly kontrolou shody, ale cenu a dostupnost ověřte po prokliku.</p>'
    : "";
  return `
    <article class="product-card">
      ${product.imageUrl ? `<img src="${escapeHtml(product.imageUrl)}" alt="" loading="lazy" />` : ""}
      <div class="product-card-copy">
        <span>${escapeHtml(product.brand || merchantLabel(product.merchant))} · ${escapeHtml(merchantLabel(product.merchant))}</span>
        <h6>${escapeHtml(product.name)}</h6>
        <p class="product-reason"><strong>Proč sedí:</strong> ${escapeHtml(reason)}</p>
        <ul class="product-checks">${checks.map((check) => `<li>${escapeHtml(check)}</li>`).join("")}</ul>
        <p class="product-verify"><strong>Před nákupem:</strong> ${escapeHtml(verify)}</p>
        ${sourceNote}
        <div class="product-card-action">
          <span class="product-price"><strong>${formatPrice(product.priceCzk, product.priceCurrency)}</strong><small>${sourceIsStale ? "Cena z posledního úspěšného feedu" : "Cena z produktového feedu"}</small></span>
          <a href="${escapeHtml(product.affiliateUrl)}" target="_blank" rel="sponsored noopener" data-affiliate-click data-source="product-card" data-product-id="${escapeHtml(product.id)}" data-merchant="${escapeHtml(product.merchant)}" data-category="${escapeHtml(product.category)}">Prohlédnout produkt →</a>
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

function formatPrice(price, currency = "CZK") {
  return Number.isFinite(price)
    ? new Intl.NumberFormat("cs-CZ", { style: "currency", currency: currency || "CZK", maximumFractionDigits: currency === "CZK" ? 0 : 2 }).format(price)
    : "Cena v obchodě";
}

function merchantLabel(merchant) {
  return ({
    reslshop: "Reslshop.cz",
    svetkaravanu: "SvětKaravanů.cz",
    solarimport: "Solar-import.cz",
    batterycz: "Battery.cz",
    ampul_cz: "Ampul.eu"
  })[merchant] || merchant;
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
  return Number(value).toLocaleString("cs-CZ", { maximumFractionDigits: 1 });
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
  latestShareUrl = `${window.location.origin}/#kalkulator`;
  history.replaceState({}, "", "/#kalkulator");
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
    return `${(wh / 1000).toLocaleString("cs-CZ", { maximumFractionDigits: 2 })} kWh`;
  }
  return `${Math.round(wh).toLocaleString("cs-CZ")} Wh`;
}

function dayWord(days) {
  if (days === 1) return "den";
  if (days >= 2 && days <= 4) return "dny";
  return "dnů";
}
