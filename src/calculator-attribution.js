const STORAGE_KEY = "mypowersetup_calculator_attribution";
const MAX_AGE_MS = 30 * 60 * 1000;

const LANDINGS = Object.freeze({
  "/kalkulacky/kapacita-baterie/": Object.freeze({ intent: "battery-capacity", locale: "cs" }),
  "/kalkulacky/solarni-panely/": Object.freeze({ intent: "solar-sizing", locale: "cs" }),
  "/kalkulacky/mppt-regulator/": Object.freeze({ intent: "mppt-sizing", locale: "cs" }),
  "/kalkulacky/dc-dc-nabijecka/": Object.freeze({ intent: "dcdc-sizing", locale: "cs" }),
  "/kalkulacky/vykon-menice/": Object.freeze({ intent: "inverter-sizing", locale: "cs" }),
  "/kalkulacky/prurez-kabelu-12v/": Object.freeze({ intent: "cable-voltage-drop", locale: "cs" }),
  "/kalkulacky/jisteni-12v/": Object.freeze({ intent: "dc-protection", locale: "cs" }),
  "/kalkulacky/12v-nebo-24v/": Object.freeze({ intent: "voltage-system", locale: "cs" }),
  "/sk/kalkulacky/kapacita-baterie/": Object.freeze({ intent: "battery-capacity", locale: "sk" }),
  "/sk/kalkulacky/solarne-panely/": Object.freeze({ intent: "solar-sizing", locale: "sk" }),
  "/pl/kalkulatory/pojemnosc-akumulatora/": Object.freeze({ intent: "battery-capacity", locale: "pl" }),
  "/pl/kalkulatory/panele-solarne/": Object.freeze({ intent: "solar-sizing", locale: "pl" }),
  "/hu/kalkulatorok/akkumulator-kapacitas/": Object.freeze({ intent: "battery-capacity", locale: "hu" }),
  "/hu/kalkulatorok/napelem-teljesitmeny/": Object.freeze({ intent: "solar-sizing", locale: "hu" }),
});

function normalizeLocale(locale) {
  const value = String(locale || "").toLowerCase().split("-")[0];
  return value === "cz" ? "cs" : value;
}

function normalizePath(pathname) {
  const value = String(pathname || "").trim();
  if (!value.startsWith("/")) return null;
  return value.endsWith("/") ? value : `${value}/`;
}

function validateLanding({ sourcePath, intent, locale }) {
  const path = normalizePath(sourcePath);
  const normalizedLocale = normalizeLocale(locale);
  const landing = path ? LANDINGS[path] : null;
  if (!landing || landing.intent !== intent || landing.locale !== normalizedLocale) return null;
  return Object.freeze({
    calculator_landing_path: path,
    calculator_landing_intent: intent,
    calculator_landing_locale: normalizedLocale,
    calculator_source_context: "seo_landing",
  });
}

export function rememberCalculatorAttribution({ sourcePath, intent, locale, storage = null, now = Date.now() } = {}) {
  const attribution = validateLanding({ sourcePath, intent, locale });
  if (!attribution) return null;
  try {
    storage?.setItem?.(STORAGE_KEY, JSON.stringify({ sourcePath: attribution.calculator_landing_path, intent, locale: attribution.calculator_landing_locale, recordedAt: now }));
  } catch {}
  return attribution;
}

export function resolveCalculatorAttribution({ storage = null, market, now = Date.now() } = {}) {
  let raw;
  try { raw = storage?.getItem?.(STORAGE_KEY); } catch { return null; }
  if (!raw) return null;

  let parsed;
  try { parsed = JSON.parse(raw); } catch {
    try { storage?.removeItem?.(STORAGE_KEY); } catch {}
    return null;
  }

  const recordedAt = Number(parsed.recordedAt);
  const attribution = validateLanding(parsed);
  if (!attribution || !Number.isFinite(recordedAt) || recordedAt > now || now - recordedAt > MAX_AGE_MS) {
    try { storage?.removeItem?.(STORAGE_KEY); } catch {}
    return null;
  }

  const normalizedMarket = normalizeLocale(market);
  if (normalizedMarket && normalizedMarket !== attribution.calculator_landing_locale) return null;
  return attribution;
}

export function clearCalculatorAttribution(storage = null) {
  try { storage?.removeItem?.(STORAGE_KEY); return true; } catch { return false; }
}

export const CALCULATOR_ATTRIBUTION_MAX_AGE_MS = MAX_AGE_MS;