import { classifyPublicGuideLink } from "./public-conversion-funnel.js";
import { readScenarioAttribution } from "./scenario-attribution.js";

const CALCULATOR_HASH_BY_PATH = Object.freeze({
  "/": "#kalkulator",
  "/sk/": "#kalkulator",
  "/pl/": "#kalkulator",
  "/hu/": "#kalkulator",
  "/pt/": "#calculator-preview",
  "/si/": "#calculator-preview",
  "/ro/": "#calculator-preview",
});

const CALCULATOR_LANDING_PATHS = new Set([
  "/kalkulacky/kapacita-baterie/",
  "/kalkulacky/vydrz-baterie/",
  "/kalkulacky/solarni-panely/",
  "/kalkulacky/mppt-regulator/",
  "/kalkulacky/dc-dc-nabijecka/",
  "/kalkulacky/vykon-menice/",
  "/kalkulacky/prurez-kabelu-12v/",
  "/kalkulacky/jisteni-12v/",
  "/kalkulacky/12v-nebo-24v/",
  "/sk/kalkulacky/kapacita-baterie/",
  "/sk/kalkulacky/solarne-panely/",
  "/pl/kalkulatory/pojemnosc-akumulatora/",
  "/pl/kalkulatory/panele-solarne/",
  "/hu/kalkulatorok/akkumulator-kapacitas/",
  "/hu/kalkulatorok/napelem-teljesitmeny/",
]);

export function classifyGuideCalculatorLink(href, { origin = "https://mypowersetup.com" } = {}) {
  let url;
  try {
    url = new URL(href, origin);
  } catch {
    return null;
  }

  const expectedOrigin = new URL(origin).origin;
  if (url.origin !== expectedOrigin) return null;

  const isLanding = CALCULATOR_LANDING_PATHS.has(url.pathname) && !url.hash;
  const expectedHash = CALCULATOR_HASH_BY_PATH[url.pathname];
  const isEmbeddedCalculator = Boolean(expectedHash && url.hash === expectedHash);
  if (!isLanding && !isEmbeddedCalculator) return null;

  const scenario = readScenarioAttribution(url.search);
  return Object.freeze({ destination_path: url.pathname, ...(scenario || {}) });
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

export function classifyGuideCalculatorPosition({ inTopCta = false, inBottomCta = false } = {}) {
  if (inTopCta) return "early";
  if (inBottomCta) return "late";
  return "inline";
}

function normalizePath(pathname) {
  try { return new URL(pathname, "https://mypowersetup.com").pathname; } catch { return String(pathname || ""); }
}
