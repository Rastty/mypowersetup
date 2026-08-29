import { PUBLIC_HREFLANG_GROUPS } from "./public-hreflang-map.js";

export const PUBLIC_MARKET_CALCULATORS = Object.freeze({
  cs: "/#kalkulator",
  sk: "/sk/#kalkulator",
  pl: "/pl/#kalkulator",
  hu: "/hu/#kalkulator",
});

export const COMMERCIAL_GUIDE_TOPICS = Object.freeze([
  "battery", "chemistry", "solar", "mppt", "dcDc", "shore", "inverter", "wiring", "fridge", "system", "voltage", "powerStation",
]);

const ROUTE_INDEX = new Map();
for (const [topic, routes] of Object.entries(PUBLIC_HREFLANG_GROUPS)) {
  for (const [market, route] of Object.entries(routes)) ROUTE_INDEX.set(route, Object.freeze({ topic, market, route }));
}

export function classifyPublicGuideRoute(route) {
  const normalized = normalizeRoute(route);
  const hit = ROUTE_INDEX.get(normalized);
  if (!hit || !["guides", ...COMMERCIAL_GUIDE_TOPICS].includes(hit.topic)) return null;
  return hit;
}

export function classifyPublicGuideLink(href, { origin = "https://mypowersetup.com", sourcePath = "/" } = {}) {
  let url;
  try { url = new URL(href, new URL(sourcePath, origin)); } catch { return null; }
  if (url.origin !== new URL(origin).origin || url.hash) return null;
  return classifyPublicGuideRoute(url.pathname);
}

export function auditPublicGuideHtml(html, { market, topic, route }) {
  const blockers = [];
  if (!COMMERCIAL_GUIDE_TOPICS.includes(topic)) throw new Error(`PUBLIC_CONVERSION_TOPIC_INVALID:${topic}`);
  if (!PUBLIC_MARKET_CALCULATORS[market]) throw new Error(`PUBLIC_CONVERSION_MARKET_INVALID:${market}`);
  if (PUBLIC_HREFLANG_GROUPS[topic]?.[market] !== route) throw new Error(`PUBLIC_CONVERSION_ROUTE_MISMATCH:${market}:${topic}`);
  if (typeof html !== "string" || !html.includes("<html")) return Object.freeze({ ready: false, blockers: Object.freeze(["htmlInvalid"]) });

  if (/noindex/i.test(html)) blockers.push("unexpectedNoindex");
  if (!html.includes(`<link rel="canonical" href="https://mypowersetup.com${route}">`) && !html.includes(`<link rel="canonical" href="https://mypowersetup.com${route}" />`)) blockers.push("canonicalMismatch");
  if (!html.includes('src="/src/analytics.js')) blockers.push("analyticsMissing");

  const calculatorHref = PUBLIC_MARKET_CALCULATORS[market];
  const calculatorLinks = extractHrefs(html).filter((href) => normalizeHref(href) === calculatorHref);
  if (!calculatorLinks.length) blockers.push("calculatorCtaMissing");

  const crossMarketCalculator = extractHrefs(html).some((href) => {
    const normalized = normalizeHref(href);
    return Object.entries(PUBLIC_MARKET_CALCULATORS).some(([candidateMarket, target]) => candidateMarket !== market && normalized === target);
  });
  if (crossMarketCalculator) blockers.push("crossMarketCalculatorCta");

  const internalTopics = new Set(extractHrefs(html).map((href) => classifyPublicGuideLink(href, { sourcePath: route })).filter(Boolean).filter((link) => link.market === market && link.topic !== topic).map((link) => link.topic));
  if (internalTopics.size < 2) blockers.push("weakInternalJourney");

  return Object.freeze({
    ready: blockers.length === 0,
    blockers: Object.freeze(blockers),
    calculatorLinks: calculatorLinks.length,
    internalGuideTopics: Object.freeze([...internalTopics].sort()),
  });
}

function extractHrefs(html) {
  return [...html.matchAll(/<a\b[^>]*\bhref=(?:"([^"]+)"|'([^']+)')[^>]*>/gi)].map((match) => match[1] || match[2]);
}

function normalizeHref(href) {
  try {
    const url = new URL(href, "https://mypowersetup.com/");
    if (url.origin !== "https://mypowersetup.com") return href;
    return `${url.pathname}${url.hash}`;
  } catch { return href; }
}

function normalizeRoute(route) {
  try { return new URL(route, "https://mypowersetup.com").pathname; } catch { return String(route || ""); }
}
