const STORAGE_KEY = "mypowersetup_calculator_attribution";
const MAX_AGE_MS = 30 * 60 * 1000;

const LANDINGS = Object.freeze({
  "/kalkulacky/kapacita-baterie/": "battery-capacity",
  "/kalkulacky/solarni-panely/": "solar-sizing",
  "/kalkulacky/vykon-menice/": "inverter-sizing",
  "/kalkulacky/prurez-kabelu-12v/": "cable-voltage-drop",
  "/kalkulacky/12v-nebo-24v/": "voltage-system",
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
  if (!path || LANDINGS[path] !== intent) return null;
  if (normalizedLocale !== "cs") return null;
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
