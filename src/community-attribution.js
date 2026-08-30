const MARKET_PREFIX = Object.freeze({
  cz: "/",
  sk: "/sk/",
  pl: "/pl/",
  hu: "/hu/",
  pt: "/pt/",
  si: "/si/",
  ro: "/ro/",
});
const STORAGE_KEY = "mypowersetup_community_attribution";

function sourceSlug(value) {
  const normalized = String(value || "community")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
  return normalized || "community";
}

function assertMarketRoute(market, route) {
  const prefix = MARKET_PREFIX[market];
  if (!prefix) throw new Error(`COMMUNITY_ATTRIBUTION_MARKET_INVALID:${market}`);
  if (typeof route !== "string" || !route.startsWith("/") || route.startsWith("//")) {
    throw new Error("COMMUNITY_ATTRIBUTION_ROUTE_INVALID");
  }
  if (market === "cz") {
    if (/^\/(?:sk|pl|hu|pt|si|ro)(?:\/|$)/.test(route)) throw new Error("COMMUNITY_ATTRIBUTION_MARKET_ROUTE_MISMATCH");
    return;
  }
  if (!route.startsWith(prefix)) throw new Error("COMMUNITY_ATTRIBUTION_MARKET_ROUTE_MISMATCH");
}

function normalizeAttribution(value) {
  if (!value || typeof value !== "object") return null;
  const source = sourceSlug(value.community_source);
  const campaign = String(value.community_campaign || "");
  const opportunityId = String(value.community_opportunity_id || "");
  if (!/^[a-z0-9_]{1,80}$/.test(campaign)) return null;
  if (!/^[a-z0-9-]{1,120}$/.test(opportunityId)) return null;
  return Object.freeze({
    community_source: source,
    community_campaign: campaign,
    community_opportunity_id: opportunityId,
  });
}

export function buildCommunityTrackedUrl(opportunity, { origin = "https://mypowersetup.com" } = {}) {
  if (!opportunity?.id || !opportunity?.market || !opportunity?.targetRoute) {
    throw new TypeError("COMMUNITY_ATTRIBUTION_OPPORTUNITY_REQUIRED");
  }
  assertMarketRoute(opportunity.market, opportunity.targetRoute);
  const base = new URL(origin);
  if (!/^https:$/.test(base.protocol)) throw new Error("COMMUNITY_ATTRIBUTION_ORIGIN_INVALID");
  const url = new URL(opportunity.targetRoute, base);
  if (url.origin !== base.origin) throw new Error("COMMUNITY_ATTRIBUTION_ORIGIN_MISMATCH");
  url.searchParams.set("utm_source", sourceSlug(opportunity.community));
  url.searchParams.set("utm_medium", "community");
  url.searchParams.set("utm_campaign", `${opportunity.market}_technical_help`);
  url.searchParams.set("utm_content", opportunity.id);
  return url.toString();
}

export function readCommunityAttribution(search) {
  const params = new URLSearchParams(String(search || "").replace(/^\?/, ""));
  if (params.get("utm_medium") !== "community") return null;
  return normalizeAttribution({
    community_source: params.get("utm_source") || "community",
    community_campaign: params.get("utm_campaign"),
    community_opportunity_id: params.get("utm_content"),
  });
}

export function resolveCommunityAttribution({ search, storage = null } = {}) {
  const landing = readCommunityAttribution(search);
  if (landing) {
    try { storage?.setItem?.(STORAGE_KEY, JSON.stringify(landing)); } catch {}
    return landing;
  }
  try {
    const stored = storage?.getItem?.(STORAGE_KEY);
    return stored ? normalizeAttribution(JSON.parse(stored)) : null;
  } catch {
    return null;
  }
}
