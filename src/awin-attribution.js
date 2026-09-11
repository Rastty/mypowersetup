const AWIN_HOSTS = new Set(["www.awin1.com", "awin1.com"]);
const EHUB_HOSTS = new Set(["ehub.cz", "www.ehub.cz", "ehub.sk", "www.ehub.sk"]);
const EHUB_PATH = "/system/scripts/click.php";
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
  scenarioCampaign,
} = {}) {
  let url;
  try {
    url = new URL(input);
  } catch {
    return input;
  }

  if (url.protocol !== "https:") return input;

  if (AWIN_HOSTS.has(url.hostname)) {
    decorateAwinUrl(url, { market, category, recommendationRole, routePriority, source, scenarioCampaign });
    return url.toString();
  }

  if (EHUB_HOSTS.has(url.hostname) && url.pathname === EHUB_PATH) {
    decorateEhubUrl(url, { market, category, scenarioCampaign });
    return url.toString();
  }

  return input;
}

function decorateAwinUrl(url, {
  market,
  category,
  recommendationRole,
  routePriority,
  source,
  scenarioCampaign,
}) {
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

  const scenarioRef = buildScenarioRef(scenarioCampaign ?? activeScenarioCampaign(), 50);
  if (scenarioRef && !url.searchParams.has("clickref4")) {
    url.searchParams.set("clickref4", scenarioRef);
  }
}

function decorateEhubUrl(url, { market, category, scenarioCampaign }) {
  if (!url.searchParams.get("a_aid") || !url.searchParams.get("a_bid")) return;

  const normalizedMarket = safeToken(market);
  const normalizedCategory = safeToken(category);
  if (normalizedMarket && normalizedCategory && !url.searchParams.has("data1")) {
    const data1 = `mps_${normalizedMarket}_${normalizedCategory}`;
    if (data1.length <= 64) url.searchParams.set("data1", data1);
  }

  const scenarioRef = buildScenarioRef(scenarioCampaign ?? activeScenarioCampaign(), 64);
  if (scenarioRef && !url.searchParams.has("data2")) {
    url.searchParams.set("data2", scenarioRef);
  }
}

function buildScenarioRef(value, maxLength) {
  const normalized = safeToken(value);
  if (!normalized) return null;
  const ref = `scenario_${normalized}`;
  return ref.length <= maxLength ? ref : null;
}

function activeScenarioCampaign() {
  try {
    return globalThis.window?.MyPowerSetupAnalytics?.context?.()?.scenario_campaign || null;
  } catch {
    return null;
  }
}

function safeToken(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return SAFE_VALUE.test(normalized) ? normalized : null;
}
