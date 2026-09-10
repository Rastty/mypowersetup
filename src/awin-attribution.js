const AWIN_HOSTS = new Set(["www.awin1.com", "awin1.com"]);
const SAFE_VALUE = /^[a-z0-9_-]{1,64}$/;
const ROLE_VALUES = new Set(["recommended", "budget", "reserve", "alternative"]);
const PRIORITY_VALUES = new Set(["primary", "secondary"]);
const SOURCE_VALUES = new Set(["package", "product-card"]);

export function decorateAwinAffiliateUrl(input, {
  market,
  category,
  recommendationRole,
  routePriority,
  source,
} = {}) {
  let url;
  try {
    url = new URL(input);
  } catch {
    return input;
  }

  if (url.protocol !== "https:" || !AWIN_HOSTS.has(url.hostname)) return input;

  const normalizedMarket = safeToken(market);
  const normalizedCategory = safeToken(category);
  if (normalizedMarket && normalizedCategory && !url.searchParams.has("clickref")) {
    url.searchParams.set("clickref", `mps_${normalizedMarket}_${normalizedCategory}`);
  }

  if (ROLE_VALUES.has(recommendationRole) && !url.searchParams.has("clickref2")) {
    url.searchParams.set("clickref2", `role_${recommendationRole}`);
  }

  if (!url.searchParams.has("clickref3")) {
    if (PRIORITY_VALUES.has(routePriority)) url.searchParams.set("clickref3", `priority_${routePriority}`);
    else if (SOURCE_VALUES.has(source)) url.searchParams.set("clickref3", `source_${source}`);
  }

  return url.toString();
}

function safeToken(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return SAFE_VALUE.test(normalized) ? normalized : null;
}
