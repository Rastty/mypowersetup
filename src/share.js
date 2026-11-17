import { buildInstallationPlan } from "./installation.js";
import { expansionComponentPlan } from "./expansion-component-plan.js";

const COPY = {
  cs: {
    title: "MyPowerSetup — orientační návrh",
    daily: "Denní spotřeba",
    battery: "Baterie",
    solar: "Solární panely",
    inverter: "Měnič",
    noInverter: "není nutný",
    controller: "MPPT regulátor",
    installationChecklist: "Nákupní a instalační checklist",
    warning: "Orientační výsledek — před realizací ověřte parametry, jištění a kabeláž.",
    locale: "cs-CZ",
    url: "https://mypowersetup.com/",
  },
  sk: {
    title: "MyPowerSetup — orientačný návrh",
    daily: "Denná spotreba",
    battery: "Batéria",
    solar: "Solárne panely",
    inverter: "Menič",
    noInverter: "nie je potrebný",
    controller: "MPPT regulátor",
    installationChecklist: "Nákupný a inštalačný checklist",
    warning: "Orientačný výsledok — pred realizáciou overte parametre, istenie a kabeláž.",
    locale: "sk-SK",
    url: "https://mypowersetup.com/sk/",
  },
  pl: {
    title: "MyPowerSetup — orientacyjny projekt",
    daily: "Dzienne zużycie energii",
    battery: "Akumulator",
    solar: "Panele fotowoltaiczne",
    inverter: "Przetwornica",
    noInverter: "nie jest potrzebna",
    controller: "Regulator MPPT",
    installationChecklist: "Lista zakupowa i montażowa",
    warning: "Wynik orientacyjny — przed montażem sprawdź parametry, zabezpieczenia i przewody.",
    locale: "pl-PL",
    url: "https://mypowersetup.com/pl/",
  },
  hu: {
    title: "MyPowerSetup — tájékoztató rendszerjavaslat",
    daily: "Napi energiafogyasztás",
    battery: "Akkumulátor",
    solar: "Napelemek",
    inverter: "Inverter",
    noInverter: "nem szükséges",
    controller: "MPPT szabályozó",
    installationChecklist: "Beszerzési és telepítési ellenőrzőlista",
    warning: "Tájékoztató eredmény — kivitelezés előtt ellenőrizd a paramétereket, a biztosítékokat és a kábelezést.",
    locale: "hu-HU",
    url: "https://mypowersetup.com/hu/",
  },
  ro: {
    title: "MyPowerSetup — dimensionare orientativă",
    daily: "Consum zilnic",
    battery: "Baterie",
    solar: "Panouri solare",
    inverter: "Invertor",
    noInverter: "nu este necesar",
    controller: "Regulator MPPT",
    installationChecklist: "Cerințe de verificat înainte de cumpărare",
    warning: "Rezultat orientativ — verifică parametrii, protecțiile și cablarea înainte de instalare.",
    locale: "ro-RO",
    url: "https://mypowersetup.com/ro/",
  },
  pt: {
    title: "MyPowerSetup — dimensionamento indicativo",
    daily: "Consumo diário",
    battery: "Bateria",
    solar: "Painéis solares",
    inverter: "Inversor",
    noInverter: "não é necessário",
    controller: "Controlador MPPT",
    installationChecklist: "Requisitos a verificar antes de comprar",
    warning: "Resultado indicativo — confirma parâmetros, proteções e cablagem antes da instalação.",
    locale: "pt-PT",
    url: "https://mypowersetup.com/pt/",
  },
  si: {
    title: "MyPowerSetup — informativni izračun",
    daily: "Dnevna poraba",
    battery: "Baterija",
    solar: "Sončni paneli",
    inverter: "Inverter",
    noInverter: "ni potreben",
    controller: "MPPT regulator",
    installationChecklist: "Zahteve za preverjanje pred nakupom",
    warning: "Informativni rezultat — pred izvedbo preveri parametre, zaščito in ožičenje.",
    locale: "sl-SI",
    url: "https://mypowersetup.com/si/",
  },
};

const INSTALLATION_CHECKLIST_LANGUAGES = new Set(["cs", "sk", "pl", "hu"]);
const EXPANSION_CHECKLIST_LANGUAGES = new Set(["pt", "ro", "si"]);

function expansionShoppingLines(result, language, copy) {
  if (!EXPANSION_CHECKLIST_LANGUAGES.has(language)) return [];
  // Older / partial result objects may still be shared without a purchase
  // checklist. The calculator itself only calls this with a complete result.
  if (!["batteryAh", "batteryWh", "solarWatts", "controllerAmps", "systemVoltage"]
    .every((key) => Number.isFinite(result?.[key]) && result[key] > 0)
    || !Number.isFinite(result?.inverterWatts) || result.inverterWatts < 0
    || !result.batteryLabel) return [];
  const plan = expansionComponentPlan(language, result);
  return [
    "",
    copy.installationChecklist,
    ...plan.items.map(({ required, label, spec }) => `${required ? "□" : "—"} ${label}: ${spec}`),
    plan.notice,
  ];
}

export function buildResultShareText(result, language = "cs", resultUrl) {
  const copy = COPY[language] || COPY.cs;
  const daily = result.dailyWh >= 1000
    ? `${(result.dailyWh / 1000).toLocaleString(copy.locale, { maximumFractionDigits: 2 })} kWh`
    : `${Math.round(result.dailyWh).toLocaleString(copy.locale)} Wh`;
  const inverter = result.inverterWatts ? `${result.inverterWatts} W` : copy.noInverter;
  const installationPlan = INSTALLATION_CHECKLIST_LANGUAGES.has(language)
    ? buildInstallationPlan(result, language)
    : [];
  const installationLines = installationPlan.length
    ? ["", copy.installationChecklist, ...installationPlan.map(({ label, detail }) => `□ ${label}: ${detail}`)]
    : [];
  const expansionLines = expansionShoppingLines(result, language, copy);

  return [
    copy.title,
    `${copy.daily}: ${daily}`,
    `${copy.battery}: ${result.batteryAh} Ah (${result.systemVoltage} V, ${result.batteryLabel})`,
    `${copy.solar}: ${result.solarWatts} Wp`,
    `${copy.inverter}: ${inverter}`,
    `${copy.controller}: ${result.controllerAmps} A`,
    ...installationLines,
    ...expansionLines,
    "",
    copy.warning,
    resultUrl || copy.url,
  ].join("\n");
}

export async function copyText(text, environment = globalThis) {
  try {
    if (environment.navigator?.clipboard?.writeText) {
      await environment.navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fall through to the legacy copy path used on HTTP and older browsers.
  }

  const document = environment.document;
  if (!document?.body || typeof document.execCommand !== "function") return false;
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.append(textarea);
  textarea.select();
  const copied = document.execCommand("copy");
  textarea.remove();
  return copied;
}
