import { classifyPublicGuideLink } from "./public-conversion-funnel.js";

const CALCULATOR_HASH_BY_PATH = Object.freeze({
  "/": "#kalkulator",
  "/sk/": "#kalkulator",
  "/pl/": "#kalkulator",
  "/hu/": "#kalkulator",
  "/pt/": "#calculator-preview",
  "/si/": "#calculator-preview",
  "/ro/": "#calculator-preview",
});

export function classifyGuideCalculatorLink(href, { origin = "https://mypowersetup.com" } = {}) {
  let url;
  try {
    url = new URL(href, origin);
  } catch {
    return null;
  }

  const expectedOrigin = new URL(origin).origin;
  if (url.origin !== expectedOrigin) return null;
  const expectedHash = CALCULATOR_HASH_BY_PATH[url.pathname];
  if (!expectedHash || url.hash !== expectedHash) return null;

  return Object.freeze({ destination_path: url.pathname });
}

export function classifyGuideInternalLink(href, { origin = "https://mypowersetup.com", sourcePath = "/" } = {}) {
  const destination = classifyPublicGuideLink(href, { origin, sourcePath });
  if (!destination || destination.route === normalizePath(sourcePath)) return null;
  return Object.freeze({ destination_path: destination.route, destination_topic: destination.topic, destination_market: destination.market });
}

export function classifyGuideClickZone({ inPrimaryCta = false, inRelated = false, inHeader = false } = {}) {
  if (inPrimaryCta) return "primary_cta";
  if (inRelated) return "related";
  if (inHeader) return "header";
  return "inline";
}

function normalizePath(pathname) {
  try { return new URL(pathname, "https://mypowersetup.com").pathname; } catch { return String(pathname || ""); }
}
