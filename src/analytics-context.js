const MARKET_BY_LANG = Object.freeze({ cs: "cz", sk: "sk", pl: "pl", hu: "hu" });

export function buildAnalyticsContext({ lang, pathname, hasCalculator }) {
  const normalizedLang = String(lang || "cs").toLowerCase().split("-")[0];
  const normalizedPath = normalizePath(pathname);
  return Object.freeze({
    market: MARKET_BY_LANG[normalizedLang] || normalizedLang || "unknown",
    page_path: normalizedPath,
    page_type: classifyAnalyticsPage(normalizedPath, Boolean(hasCalculator)),
  });
}

export function classifyAnalyticsPage(pathname, hasCalculator = false) {
  if (hasCalculator) return "calculator";
  if (/\/(?:pruvodce|sprievodca|poradnik|utmutatok)(?:\/|$)/i.test(pathname)) return "guide";
  if (/\/(?:o-projektu|o-projekte|o-projekcie|a-projektrol|metodika|metodologia|modszer|soukromi|sukromie|prywatnosc|adatvedelem|affiliate|partner)/i.test(pathname)) return "trust";
  return "content";
}

function normalizePath(value) {
  const path = String(value || "/").trim();
  if (!path) return "/";
  return path.startsWith("/") ? path : `/${path}`;
}
