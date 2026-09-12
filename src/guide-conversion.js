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

function normalizePath(pathname) {
  try {
    return new URL(pathname, "https://mypowersetup.com").pathname;
  } catch {
    return String(pathname || "");
  }
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
