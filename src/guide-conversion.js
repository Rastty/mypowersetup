import { rememberGuideAttribution } from "./guide-attribution.js";

const CORE_MONEY_GUIDES = new Set([
  "/pruvodce/kapacita-baterie-do-karavanu/",
  "/pruvodce/kolik-w-solarnich-panelu/",
  "/pruvodce/jak-vybrat-mppt-regulator/",
  "/pruvodce/jak-vybrat-dc-dc-nabijecku/",
  "/pruvodce/jak-vybrat-nabijecku-230-v/",
  "/pruvodce/jak-velky-menic-do-karavanu/",
  "/sk/sprievodca/kapacita-baterie-do-karavanu/",
  "/sk/sprievodca/kolko-w-solarnych-panelov/",
  "/sk/sprievodca/ako-vybrat-mppt-regulator/",
  "/sk/sprievodca/ako-vybrat-dc-dc-nabijacku/",
  "/sk/sprievodca/ako-vybrat-nabijacku-230-v/",
  "/sk/sprievodca/aky-velky-menic-do-karavanu/",
  "/pl/poradnik/pojemnosc-akumulatora-do-kampera/",
  "/pl/poradnik/ile-wat-paneli-solarnych-do-kampera/",
  "/pl/poradnik/jak-dobrac-regulator-mppt/",
  "/pl/poradnik/jak-dobrac-ladowarke-dc-dc/",
  "/pl/poradnik/jak-dobrac-ladowarke-230-v/",
  "/pl/poradnik/jak-dobrac-przetwornice-do-kampera/",
  "/hu/utmutatok/lakoauto-akkumulator-kapacitas/",
  "/hu/utmutatok/hany-watt-napelem-lakoautohoz/",
  "/hu/utmutatok/mppt-szabalyozo-kivalasztasa/",
  "/hu/utmutatok/dc-dc-tolto-kivalasztasa/",
  "/hu/utmutatok/230-v-os-tolto-kivalasztasa/",
  "/hu/utmutatok/lakoauto-inverter-kivalasztasa/",
]);

const CONSENT_KEY = "mypowersetup_analytics_consent";

function normalizePath(pathname) {
  try {
    return new URL(pathname, "https://mypowersetup.com").pathname;
  } catch {
    return String(pathname || "");
  }
}

function guidePosition(link) {
  if (link.closest?.("[data-guide-top-cta]")) return "early";
  const cta = link.closest?.(".cta");
  if (cta?.querySelector?.("[data-guide-conversion-cta]")) return "late";
  return "inline";
}

function hasAnalyticsConsent(storage) {
  try { return storage?.getItem?.(CONSENT_KEY) === "granted"; } catch { return false; }
}

function bindGuideAttribution(article, pathname, root) {
  if (article.dataset?.guideAttributionBound === "true") return;
  if (article.dataset) article.dataset.guideAttributionBound = "true";
  article.addEventListener?.("click", (event) => {
    const link = event.target?.closest?.('a[href*="#kalkulator"]');
    if (!link || !article.contains?.(link)) return;
    const localStorage = root?.defaultView?.localStorage || globalThis.localStorage;
    const sessionStorage = root?.defaultView?.sessionStorage || globalThis.sessionStorage;
    if (!hasAnalyticsConsent(localStorage)) return;
    rememberGuideAttribution({
      sourcePath: pathname,
      sourcePosition: guidePosition(link),
      storage: sessionStorage,
    });
  });
}

export function coreMoneyGuideRoutes() {
  return [...CORE_MONEY_GUIDES];
}

export function isCoreMoneyGuide(pathname) {
  return CORE_MONEY_GUIDES.has(normalizePath(pathname));
}

export function enhanceGuideConversion({
  root = globalThis.document,
  pathname = globalThis.location?.pathname,
} = {}) {
  if (!root || !isCoreMoneyGuide(pathname)) return false;

  const article = root.querySelector?.("main article.article") || root.querySelector?.("article.article");
  if (!article) return false;

  const answer = article.querySelector?.(".answer");
  const lateCta = article.querySelector?.(".cta");
  const lateLink = lateCta?.querySelector?.('a[href*="#kalkulator"]');
  if (!answer || !lateCta || !lateLink || typeof lateCta.cloneNode !== "function") return false;

  lateLink.setAttribute?.("data-guide-conversion-cta", "");
  bindGuideAttribution(article, pathname, root);
  if (article.querySelector?.("[data-guide-top-cta]")) return false;

  const earlyCta = lateCta.cloneNode(true);
  earlyCta.setAttribute?.("data-guide-top-cta", "");
  earlyCta.querySelector?.("[data-guide-conversion-cta]")?.removeAttribute?.("data-guide-conversion-cta");

  if (typeof answer.insertAdjacentElement === "function") {
    answer.insertAdjacentElement("afterend", earlyCta);
  } else if (answer.parentNode?.insertBefore) {
    answer.parentNode.insertBefore(earlyCta, answer.nextSibling || null);
  } else {
    return false;
  }

  return true;
}
