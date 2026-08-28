import { APPLIANCES } from "./catalog-pl.js?v=20260823-custom1";
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
let latestShareUrl = "https://mypowersetup.com/pl/#kalkulator";
let productCatalog = [];
let productCatalogUpdatedAt = null;
let productCatalogSources = {};
let calculatorStarted = false;

renderAppliances();
mountUsageProfiles({
  locale: "pl",
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
  locale: "pl",
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
    const response = await fetch("/data/products-pl.json", { cache: "no-store" });
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
      <input id="appliance-pl-${appliance.id}" type="checkbox" name="appliance" value="${appliance.id}" />
      <span class="appliance-icon" aria-hidden="true">${appliance.icon}</span>
      <label class="appliance-copy" for="appliance-pl-${appliance.id}">
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
      <input type="number" min="0.01" max="24" step="0.05" value="${appliance.hours}" data-hours aria-label="Godziny dziennie: ${appliance.name}" /> h/dzień
    </label>
    <label class="mini-field">
      <input type="number" min="1" max="20" step="1" value="${appliance.quantity}" data-quantity aria-label="Liczba sztuk: ${appliance.name}" /> szt.
    </label>`;
  if (!appliance.custom) return `<span class="appliance-controls">${common}</span>`;
  return `<span class="appliance-controls custom-appliance-controls">
    <label class="mini-field custom-name-field"><input type="text" maxlength="60" value="Własne urządzenie" data-custom-name aria-label="Nazwa własnego urządzenia" /></label>
    <label class="mini-field"><input type="number" min="1" max="10000" step="1" value="${appliance.watts}" data-watts aria-label="Moc własnego urządzenia" /> W</label>
    ${common}
    <label class="mini-field custom-select-field"><select data-ac aria-label="Zasilanie własnego urządzenia"><option value="false">12/24 V DC</option><option value="true">230 V AC</option></select></label>
    <label class="mini-field custom-select-field"><select data-surge aria-label="Prąd rozruchowy własnego urządzenia"><option value="1">Brak znanego skoku</option><option value="2">Silnik / sprężarka · 2×</option></select></label>
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
  const copied = await copyText(buildResultShareText(latestResult, "pl", latestShareUrl));
  setShareStatus(copied
    ? "Podsumowanie skopiowano do schowka."
    : "Nie udało się skopiować. Zaznacz wynik ręcznie.");
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
      title: "MyPowerSetup — dobór zestawu",
      text: buildResultShareText(latestResult, "pl", latestShareUrl)
    });
    setShareStatus("Wynik jest gotowy do udostępnienia.");
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
    applianceError.textContent = "Wybierz co najmniej jedno urządzenie.";
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
    applianceError.textContent = "Sprawdź nazwę, moc, czas pracy i liczbę sztuk wybranych urządzeń.";
    applianceError.hidden = false;
    applianceError.scrollIntoView({ behavior: "smooth", block: "center" });
    trackEvent("calculation_failed", { reason: "invalid_appliance" });
    return;
  }

  try {
    const data = new FormData(form);
    latestResult = calculateSetup({
      locale: "pl",
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
    }, "pl", window.location.origin);
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
    console.error("Obliczenie zestawu nie powiodło się", error);
    calculatorError.textContent = error?.message === "ROOF_DIMENSIONS_INCOMPLETE"
      ? "Aby sprawdzić dach, podaj długość i szerokość wolnego prostokąta albo pozostaw oba pola puste."
      : error?.message === "ROOF_DIMENSIONS_INVALID"
        ? "Wymiary wolnej powierzchni dachu są poza obsługiwanym zakresem."
        : "Nie udało się wyświetlić wyniku. Odśwież stronę i spróbuj ponownie.";
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
    `Utworzono ${new Date().toLocaleDateString("pl-PL")} · mypowersetup.com`;
  document.querySelector("#result-intro").textContent =
    `Dla szacowanego zużycia ${formatEnergy(result.dailyWh)} dziennie i ${result.autonomyDays} ${dayWord(result.autonomyDays)} autonomii.`;
  document.querySelector("#result-verdict").textContent = buildPlainLanguageVerdict(result, "pl");

  document.querySelector("#result-grid").innerHTML = [
    resultCard("Akumulator", `${result.batteryAh} Ah`, `${formatEnergy(result.batteryWh)} · ${result.systemVoltage} V · ${result.batteryLabel}`, true),
    resultCard("Panele fotowoltaiczne", `${result.solarWatts} Wp`, `${result.seasonLabel.toLowerCase()} · z zapasem`),
    resultCard("Przetwornica z czystym sinusem", result.inverterWatts ? `${result.inverterWatts} W` : "Niepotrzebna", result.inverterWatts ? "dla wybranych urządzeń 230 V" : "wszystkie wybrane urządzenia są zasilane DC"),
    resultCard("Regulator MPPT", `${result.controllerAmps} A`, `dla systemu ${result.systemVoltage} V`)
  ].join("");

  document.querySelector("#result-reasons").innerHTML = [
    explanationCard("Akumulator", `${formatEnergy(result.dailyWh)} × ${result.autonomyDays} ${dayWord(result.autonomyDays)}`, `Po dodaniu ${result.assumptions.batteryMarginPercent}% zapasu i uwzględnieniu ${result.assumptions.usableDepthPercent}% użytecznej pojemności potrzeba ${formatEnergy(result.batteryWh)}.`),
    explanationCard("Fotowoltaika", `${formatEnergy(result.dailyWh)} ÷ ${formatNumber(result.calculation.peakSunHours)} godzin słonecznych`, `Po uwzględnieniu strat i zapasu zaokrąglamy w górę do ${result.solarWatts} Wp.`),
    explanationCard("Napięcie", `system ${result.systemVoltage} V`, result.calculation.automaticVoltage === result.systemVoltage ? "Automatyczny dobór według pojemności akumulatora i mocy przetwornicy." : `Wybór ręczny; automat zaproponowałby ${result.calculation.automaticVoltage} V.`),
    explanationCard("Przetwornica", result.inverterWatts ? `${result.inverterWatts} W` : "Niepotrzebna", result.inverterWatts ? `Porównujemy jednoczesne obciążenie AC około ${Math.round(result.calculation.estimatedConcurrentWatts)} W i skok rozruchowy ${Math.round(result.calculation.largestStartWatts)} W.` : "Wśród wybranych urządzeń nie ma odbiornika 230 V."),
    ...(result.wiring ? [explanationCard(
      "Przewód akumulator–przetwornica",
      result.wiring.recommendedCrossSectionMm2 ? `co najmniej ${result.wiring.recommendedCrossSectionMm2} mm²` : "projekt indywidualny",
      `Dla długości ${formatNumber(result.wiring.oneWayLengthMeters)} m i prądu projektowego ${result.wiring.designCurrentAmps} A minimum wynika wyłącznie z celu spadku do ${result.wiring.maxVoltageDropPercent}%. Ostateczny przekrój i bezpiecznik dobierz według instrukcji przetwornicy, obciążalności przewodu, temperatury i sposobu ułożenia.`
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
    { text: "Porównaj wpisane moce z tabliczkami znamionowymi urządzeń." },
    { text: "Sprawdź prądy rozruchowe, przewody, zabezpieczenia, BMS i warunki montażu." },
    { text: "Bezpiecznik chroni przewód: napięcie DC, zdolność wyłączania, typ i prąd muszą odpowiadać instrukcji urządzenia i rzeczywistej instalacji." },
    { text: "Dla paneli i MPPT osobno sprawdź Voc i Isc przy najniższej oczekiwanej temperaturze." }
  ];
  document.querySelector("#result-notes").innerHTML = checks
    .map(({ text, warning }) => `<li class="${warning ? "is-warning" : ""}">${escapeHtml(text)}</li>`)
    .join("");

  document.querySelector("#system-diagram").innerHTML = buildSystemDiagram(result, "pl");
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
    compact: ["Warto porównać kompaktową stację zasilania", "Wynik mieści się w typowej kategorii przenośnej. Sprawdź jednak konkretne wyjścia, złącza i sposób ładowania."],
    large: ["Porównaj dużą lub rozszerzalną stację zasilania", "Wymagania są wyższe; dokładnie sprawdź masę, możliwość rozbudowy akumulatora, wejście PV i moc ciągłą."],
    individual: ["Instalacja stała będzie zwykle lepsza", "Wymagana pojemność lub moc przekracza typową kategorię przenośną. Stacja może wymagać dodatkowych akumulatorów albo indywidualnego rozwiązania."]
  }[profile.profile];
  target.innerHTML = [
    powerStationCard("Orientacyjny wniosek", verdict[0], verdict[1]),
    powerStationCard("Minimalna pojemność znamionowa", `${profile.capacityWh} Wh`, `Uwzględniamy ${profile.assumptions.capacityReservePercent}% zapasu i tylko ${profile.assumptions.usableRatioPercent}% użytecznej pojemności znamionowej.`),
    powerStationCard("Ciągła moc wyjściowa AC", profile.acOutputWatts ? `co najmniej ${profile.acOutputWatts} W` : "Niepotrzebna", profile.acOutputWatts ? "Sprawdź również krótkotrwałą moc rozruchową konkretnego modelu." : "Wybrane urządzenia nie wymagają 230 V."),
    powerStationCard("Wejście fotowoltaiczne", `co najmniej ${profile.solarInputWatts} W`, "Aby wykorzystać dobrane panele. Sprawdź także dopuszczalne Voc, prąd i złącza."),
    powerStationCard("Wyjście 12 V DC", profile.dcContinuousWatts ? `co najmniej ${profile.dcOutputAmpsAt12V} A` : "Brak wymagań DC", profile.dcContinuousWatts ? `Suma podanych mocy DC wynosi ${Math.round(profile.dcContinuousWatts)} W; sprawdź stabilizowane wyjście i jednoczesną pracę gniazd.` : "Nie wybrano urządzenia DC.")
  ].join("");
}

function powerStationCard(label, value, description) {
  return `<article class="charging-card"><span>${label}</span><strong>${value}</strong><p>${description}</p></article>`;
}

function renderInstallationPlan(result) {
  const target = document.querySelector("#installation-plan");
  target.innerHTML = buildInstallationPlan(result, "pl").map((circuit, index) => `
    <article class="installation-card">
      <span>${String(index + 1).padStart(2, "0")}</span>
      <div><strong>${escapeHtml(circuit.label)}</strong><p>${escapeHtml(circuit.detail)}</p></div>
    </article>
  `).join("");
}

function renderRoofFit(roof) {
  const target = document.querySelector("#roof-fit");
  if (!roof?.checked) {
    target.innerHTML = '<article class="roof-fit-card is-unchecked"><strong>Kontrola jest wyłączona</strong><p>W ustawieniach zaawansowanych podaj długość i szerokość największego wolnego prostokąta na dachu.</p></article>';
    return;
  }
  const status = roof.fits ? "Zestaw referencyjny mieści się geometrycznie" : "Zestaw referencyjny nie mieści się na podanej powierzchni";
  const detail = `${roof.requiredQuantity}× ${roof.referencePanelWatts} Wp · panel ${formatNumber(roof.referencePanelLengthMeters)} × ${formatNumber(roof.referencePanelWidthMeters)} m · łącznie ${roof.installedWatts} Wp`;
  const capacity = `W prostokącie ${formatNumber(roof.availableLengthMeters)} × ${formatNumber(roof.availableWidthMeters)} m mieści się najwyżej ${roof.capacity} szt. w jednej orientacji.`;
  target.innerHTML = `<article class="roof-fit-card ${roof.fits ? "is-fit" : "is-warning"}"><strong>${status}</strong><p>${detail}</p><small>${capacity} Nie uwzględniamy odstępów montażowych, uchwytów, zacienienia ani dostępu serwisowego.</small></article>`;
}

function renderChargingPlan(plan, systemVoltage) {
  const target = document.querySelector("#charging-options");
  if (!plan) {
    target.innerHTML = "";
    return;
  }
  const inputEstimate = plan.dcDc.enabled && plan.dcDc.estimatedInputCurrentAmps
    ? ` Orientacyjny pobór z instalacji rozruchowej ${plan.starterVoltage} V przy dobranej ładowarce wynosi do około ${plan.dcDc.estimatedInputCurrentAmps} A.`
    : "";
  const dcDcVoltageCheck = systemVoltage === 24
    ? " Dla akumulatora pokładowego 24 V ładowarka musi wyraźnie obsługiwać podnoszenie napięcia instalacji rozruchowej do 24 V."
    : "";
  const dcDcCable = plan.dcDc.inputWiring
    ? plan.dcDc.inputWiring.recommendedCrossSectionMm2
      ? ` Dla długości ${formatNumber(plan.dcDc.inputWiring.oneWayLengthMeters)} m wychodzi co najmniej ${plan.dcDc.inputWiring.recommendedCrossSectionMm2} mm² wyłącznie według celu spadku do ${plan.dcDc.inputWiring.maxVoltageDropPercent}%.`
      : ` Dla długości ${formatNumber(plan.dcDc.inputWiring.oneWayLengthMeters)} m potrzebny jest indywidualny projekt przewodu; obliczony przekrój przekracza 120 mm².`
    : "";
  target.innerHTML = [
    chargingCard("DC–DC z alternatora", plan.dcDc, `Wejście ${plan.starterVoltage} V, wyjście do akumulatora ${systemVoltage} V.${inputEstimate}${dcDcCable} To szacunek przy sprawności 90%, a nie zamiennik danych producenta. Przekrój może wymagać zwiększenia ze względu na obciążalność, temperaturę, ułożenie, zaciski i instrukcję; ten kalkulator nie dobiera bezpiecznika. Sprawdź zapas alternatora, rzeczywisty maksymalny prąd wejściowy, przewody, zabezpieczenia i obsługę inteligentnego alternatora.${dcDcVoltageCheck}`),
    chargingCard("Ładowarka z 230 V", plan.shore, `Wyjście do akumulatora ${systemVoltage} V. Profil ładowania, kompensację temperatury i maksymalny prąd musi dopuszczać producent akumulatora i BMS.`)
  ].join("");
}

function chargingCard(label, option, check) {
  if (!option.enabled) return `<article class="charging-card is-disabled"><span>${label}</span><strong>Wyłączone</strong><p>Dla tego źródła ustawiono 0 godzin.</p></article>`;
  const value = option.suggestedCurrentAmps ? `co najmniej ${option.suggestedCurrentAmps} A` : "projekt indywidualny";
  const reason = option.suggestedCurrentAmps
    ? `Aby uzupełnić dzienne zużycie w ${formatNumber(option.hours)} h, potrzeba co najmniej ${option.requiredCurrentAmps} A przy sprawności 90%.`
    : `Wymagane ${option.requiredCurrentAmps} A przekracza konserwatywny limit projektowy ${option.planningCeilingAmps} A dla tego akumulatora.`;
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
    battery: "Akumulatory",
    solar_panel: "Panele fotowoltaiczne",
    inverter: "Przetwornice",
    controller: "Regulatory MPPT",
    dc_charger: "Ładowarki DC–DC z alternatora",
    shore_charger: "Ładowarki z 230 V",
    power_station: "Przenośne stacje zasilania"
  };
  const total = Object.values(recommendations).reduce((sum, items) => sum + items.length, 0);
  const categoryCount = Object.values(recommendations).filter((items) => items.length).length;
  const resultNext = document.querySelector("#result-next");
  resultNext.hidden = false;
  document.querySelector("#result-product-count").textContent = total
    ? `Znaleźliśmy ${total} zweryfikowanych dopasowań w ${categoryCount} kategoriach. Wyjaśnienie techniczne i dane instalacyjne są poniżej.`
    : "Dla tej konfiguracji nie mamy jeszcze dostatecznie zweryfikowanego dopasowania produktów. Wynik techniczny możesz wykorzystać jako podstawę wyboru.";
  document.querySelector("#result-products-link").hidden = total === 0;
  const freshness = productCatalogUpdatedAt
    ? ` Dane produktowe pobrano ${new Date(productCatalogUpdatedAt).toLocaleDateString("pl-PL")}.`
    : "";

  if (total === 0) {
    document.querySelector("#package-variants").innerHTML = "";
    heading.textContent = "Przygotowujemy dokładne rekomendacje produktów";
    intro.textContent = "Produkty opublikujemy dopiero po sprawdzeniu ich parametrów względem wyniku. Nie przekierujemy Cię na ogólną stronę sklepu ani nie oznaczymy niesprawdzonego produktu jako zgodnego.";
    groups.innerHTML = '<button class="button button-disabled" type="button" disabled>Dopasowanie produktów jest przygotowywane</button>';
    return;
  }

  heading.textContent = "Komponenty zgodne z obliczeniem";
  intro.textContent = `Najpierw sprawdzamy zgodność techniczną. Kolejność uwzględnia następnie dopasowanie parametrów, dostępność i kompletność danych.${freshness}`;
  renderProductPackages(buildProductPackages(rankedRecommendations, result));
  groups.innerHTML = Object.entries(recommendations)
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
    economy: ["Oszczędny", "Najniższa znana cena wśród zgodnych opcji."],
    recommended: ["Polecany", "Najlepsze dopasowanie parametrów i kompletności danych."],
    reserve: ["Z większym zapasem", "Nieco większy zapas techniczny, jeśli katalog go oferuje."],
  };
  if (!variants.length) {
    target.innerHTML = "";
    return;
  }
  const stalePriceNote = Object.values(productCatalogSources).some((source) => source?.status === "stale")
    ? '<p class="catalog-source-note is-stale"><strong>Aktualizacja cen:</strong> Dla jednego sklepu używamy ostatniego poprawnie pobranego katalogu. Aktualną cenę i dostępność sprawdź na stronie produktu.</p>'
    : "";
  target.innerHTML = `<div class="package-intro"><strong>Trzy bezpieczne drogi zakupu</strong><p>Każdy wariant spełnia ten sam wynik obliczeń i obejmuje dostępne główne komponenty oraz ładowanie. To nie jest kompletny materiał instalacyjny ani kosztorys wykonania.</p>${stalePriceNote}</div><div class="package-grid">${variants.map((variant) => {
    const [label, description] = copy[variant.id];
    return `<article class="package-card ${variant.id === "recommended" ? "is-recommended" : ""}"><span>${label}</span><p>${description}</p><ul>${variant.items.map(({ category, product }) => packageProductLink(category, product, variant.id)).join("")}</ul><b>${variant.totalPriceCzk === null ? "Cena w sklepie" : formatPrice(variant.totalPriceCzk, variant.totalCurrency)}</b><small class="package-price-note">Orientacyjna suma produktów; bez dostawy i montażu.</small></article>`;
  }).join("")}</div>`;
}

function packageProductLink(category, product, packageId) {
  const quantity = product.recommendedQuantity || 1;
  const quantityLabel = quantity > 1 ? `${quantity} szt. · ` : "";
  return `<li><small>${packageCategoryLabel(category)}</small><strong>${escapeHtml(product.name)}</strong><span class="package-product-meta">${quantityLabel}${escapeHtml(merchantLabel(product.merchant))}</span><a class="package-product-link" href="${escapeHtml(product.affiliateUrl)}" target="_blank" rel="sponsored noopener" data-affiliate-click data-source="package" data-package-id="${escapeHtml(packageId)}" data-product-id="${escapeHtml(product.id)}" data-merchant="${escapeHtml(product.merchant)}" data-category="${escapeHtml(product.category)}">Pokaż dokładny produkt →</a></li>`;
}

function packageCategoryLabel(category) {
  return ({ battery: "Akumulator", solar_panel: "Panel PV", inverter: "Przetwornica", controller: "MPPT", dc_charger: "Ładowarka DC–DC", shore_charger: "Ładowarka 230 V" })[category] || category;
}

function productCard(product, reason, checks, verify) {
  const sourceIsStale = productCatalogSources[product.merchant]?.status === "stale";
  const sourceNote = sourceIsStale
    ? '<p class="product-source-status is-stale"><strong>Starszy katalog produktowy:</strong> Parametry przeszły kontrolę zgodności, ale cenę i dostępność sprawdź po przejściu do sklepu.</p>'
    : "";
  return `
    <article class="product-card">
      ${product.imageUrl ? `<img src="${escapeHtml(product.imageUrl)}" alt="" loading="lazy" />` : ""}
      <div class="product-card-copy">
        <span>${escapeHtml(product.brand || merchantLabel(product.merchant))} · ${escapeHtml(merchantLabel(product.merchant))}</span>
        <h6>${escapeHtml(product.name)}</h6>
        <p class="product-reason"><strong>Dlaczego pasuje:</strong> ${escapeHtml(reason)}</p>
        <ul class="product-checks">${checks.map((check) => `<li>${escapeHtml(check)}</li>`).join("")}</ul>
        <p class="product-verify"><strong>Przed zakupem:</strong> ${escapeHtml(verify)}</p>
        ${sourceNote}
        <div class="product-card-action">
          <span class="product-price"><strong>${formatPrice(product.priceCzk, product.priceCurrency)}</strong><small>${sourceIsStale ? "Cena z ostatniego poprawnego importu" : "Cena z katalogu produktowego"}</small></span>
          <a href="${escapeHtml(product.affiliateUrl)}" target="_blank" rel="sponsored noopener" data-affiliate-click data-source="product-card" data-product-id="${escapeHtml(product.id)}" data-merchant="${escapeHtml(product.merchant)}" data-category="${escapeHtml(product.category)}">Pokaż produkt →</a>
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

function formatPrice(price, currency = "PLN") {
  return Number.isFinite(price)
    ? new Intl.NumberFormat("pl-PL", { style: "currency", currency: currency || "PLN", maximumFractionDigits: currency === "PLN" ? 0 : 2 }).format(price)
    : "Cena w sklepie";
}

function merchantLabel(merchant) {
  if (merchant === "padabo") return "Padabo.sk";
  if (merchant === "allpowers_pl") return "ALLPOWERS PL";
  if (merchant === "ampul_pl") return "Ampul.eu";
  return merchant;
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
  return Number(value).toLocaleString("pl-PL", { maximumFractionDigits: 1 });
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
  latestShareUrl = `${window.location.origin}/pl/#kalkulator`;
  history.replaceState({}, "", "/pl/#kalkulator");
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
    return `${(wh / 1000).toLocaleString("pl-PL", { maximumFractionDigits: 2 })} kWh`;
  }
  return `${Math.round(wh).toLocaleString("pl-PL")} Wh`;
}

function dayWord(days) {
  if (days === 1) return "dzień";
  return "dni";
}
