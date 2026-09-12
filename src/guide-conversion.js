const CORE_BATTERY_GUIDES = new Set([
  "/pruvodce/kapacita-baterie-do-karavanu/",
  "/sk/sprievodca/kapacita-baterie-do-karavanu/",
  "/pl/poradnik/pojemnosc-akumulatora-do-kampera/",
  "/hu/utmutatok/lakoauto-akkumulator-kapacitas/",
]);

function normalizePath(pathname) {
  try {
    return new URL(pathname, "https://mypowersetup.com").pathname;
  } catch {
    return String(pathname || "");
  }
}

export function isCoreBatteryGuide(pathname) {
  return CORE_BATTERY_GUIDES.has(normalizePath(pathname));
}

export function enhanceGuideConversion({
  root = globalThis.document,
  pathname = globalThis.location?.pathname,
} = {}) {
  if (!root || !isCoreBatteryGuide(pathname)) return false;

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
