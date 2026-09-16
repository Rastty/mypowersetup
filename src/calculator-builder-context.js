import { resolveCalculatorAttribution } from "./calculator-attribution.js";

function finiteCurrent(value) {
  const current = Number(value);
  return Number.isFinite(current) && current > 0 && current <= 400 ? current : null;
}

export function parseBuilderDcDcCurrent(text) {
  const value = String(text || "").trim();
  const match = value.match(/alespoň\s+(\d+(?:[.,]\d+)?)\s*A/i);
  if (match) return finiteCurrent(match[1].replace(",", "."));
  return null;
}

export function buildDcDcBuilderContext(attribution, builderText = "") {
  if (attribution?.calculator_landing_intent !== "dcdc-sizing" || attribution?.calculator_landing_locale !== "cs") return null;
  const landingCurrentA = finiteCurrent(attribution.calculator_recommended_current_a);
  if (!landingCurrentA) return null;

  const text = String(builderText || "").trim();
  const builderCurrentA = parseBuilderDcDcCurrent(text);
  const individualDesign = /individuální návrh/i.test(text);

  if (builderCurrentA !== null) {
    const same = Math.abs(builderCurrentA - landingCurrentA) < 0.01;
    const builderHigher = builderCurrentA > landingCurrentA;
    return Object.freeze({
      landingCurrentA,
      builderCurrentA,
      status: same ? "match" : builderHigher ? "builder-higher" : "builder-lower",
      headline: `Detailní kalkulačka: ${landingCurrentA} A · Builder: ${builderCurrentA} A`,
      message: same
        ? "Oba výpočty ukazují stejnou proudovou třídu. Před nákupem stále ověřte BMS, volnou kapacitu alternátoru, kabeláž a jištění."
        : builderHigher
          ? `Builder vychází výš, protože počítá z celé spotřeby a času jízdy. Nepřekračujte však ${landingCurrentA} A z detailní kalkulačky bez nového ověření volného proudu alternátoru a limitu baterie/BMS.`
          : `Builder pro tuto sestavu potřebuje menší proud. Hodnota ${landingCurrentA} A z detailní kalkulačky zůstává horním kontextem; finální proud musí respektovat baterii/BMS, alternátor a výrobce vozidla.`,
    });
  }

  if (individualDesign) {
    return Object.freeze({
      landingCurrentA,
      builderCurrentA: null,
      status: "individual",
      headline: `Detailní kalkulačka: ${landingCurrentA} A · Builder: individuální návrh`,
      message: "Builder našel kombinaci, která vyžaduje individuální návrh. Nepoužívejte samotný výsledek detailní kalkulačky jako náhradu kontroly celé sestavy.",
    });
  }

  return Object.freeze({
    landingCurrentA,
    builderCurrentA: null,
    status: "pending",
    headline: `Navazujete z DC–DC kalkulačky: ${landingCurrentA} A`,
    message: "Builder po dokončení celé sestavy dopočítá vlastní nabíjecí proud. Původní limit zůstane viditelný pro kontrolu alternátoru a baterie/BMS.",
  });
}

function createContextCard(documentRoot) {
  const card = documentRoot.createElement("article");
  card.className = "charging-card is-context";
  card.dataset.calculatorContinuation = "dcdc";
  card.setAttribute("aria-live", "polite");

  const label = documentRoot.createElement("span");
  label.textContent = "Navázání z DC–DC kalkulačky";
  const headline = documentRoot.createElement("strong");
  headline.dataset.calculatorContinuationHeadline = "";
  const message = documentRoot.createElement("p");
  message.dataset.calculatorContinuationMessage = "";
  card.append(label, headline, message);
  return card;
}

export function mountDcDcBuilderContext({ documentRoot = globalThis.document, windowRoot = globalThis.window } = {}) {
  if (!documentRoot || !windowRoot?.sessionStorage) return false;
  const market = documentRoot.documentElement?.lang || null;
  const attribution = resolveCalculatorAttribution({ storage: windowRoot.sessionStorage, market });
  if (attribution?.calculator_landing_intent !== "dcdc-sizing" || attribution?.calculator_landing_locale !== "cs") return false;
  const target = documentRoot.querySelector?.("#charging-options");
  if (!target) return false;

  let rendering = false;
  const render = () => {
    if (rendering) return;
    rendering = true;
    try {
      const builderStrong = target.querySelector?.(".charging-card:not([data-calculator-continuation]) strong");
      const context = buildDcDcBuilderContext(attribution, builderStrong?.textContent || "");
      if (!context) return;
      const signature = `${context.status}|${context.landingCurrentA}|${context.builderCurrentA ?? ""}`;
      let card = target.querySelector?.("[data-calculator-continuation]");
      if (!card) {
        card = createContextCard(documentRoot);
        target.prepend(card);
      }
      if (card.dataset.signature === signature) return;
      card.dataset.signature = signature;
      card.classList.toggle("is-warning", context.status === "builder-higher" || context.status === "individual");
      card.querySelector("[data-calculator-continuation-headline]").textContent = context.headline;
      card.querySelector("[data-calculator-continuation-message]").textContent = context.message;
    } finally {
      rendering = false;
    }
  };

  render();
  if (typeof MutationObserver === "function") {
    const observer = new MutationObserver(render);
    observer.observe(target, { childList: true, subtree: true, characterData: true });
  }
  return true;
}

if (typeof document !== "undefined" && typeof window !== "undefined") {
  queueMicrotask(() => mountDcDcBuilderContext());
}
