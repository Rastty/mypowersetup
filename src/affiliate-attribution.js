import { decorateAwinAffiliateUrl } from "./awin-attribution.js";

const EHUB_HOSTS = new Set(["ehub.cz", "www.ehub.cz", "ehub.sk", "www.ehub.sk"]);
const EHUB_PATH = "/system/scripts/click.php";
const SAFE_VALUE = /^[a-z0-9_-]{1,64}$/;

export function decorateAffiliateUrl(input, options = {}) {
  const awinDecorated = decorateAwinAffiliateUrl(input, options);
  if (awinDecorated !== input) return awinDecorated;
  return decorateEhubAffiliateUrl(input, options);
}

export function decorateEhubAffiliateUrl(input, {
  market,
  category,
  scenarioCampaign,
} = {}) {
  let url;
  try {
    url = new URL(input);
  } catch {
    return input;
  }

  if (url.protocol !== "https:" || !EHUB_HOSTS.has(url.hostname) || url.pathname !== EHUB_PATH) return input;
  if (!url.searchParams.get("a_aid") || !url.searchParams.get("a_bid")) return input;

  const normalizedMarket = safeToken(market);
  const normalizedCategory = safeToken(category);
  if (normalizedMarket && normalizedCategory && !url.searchParams.has("data1")) {
    const value = `mps_${normalizedMarket}_${normalizedCategory}`;
    if (value.length <= 64) url.searchParams.set("data1", value);
  }

  const scenarioRef = buildScenarioRef(scenarioCampaign ?? activeScenarioCampaign());
  if (scenarioRef && !url.searchParams.has("data2")) {
    url.searchParams.set("data2", scenarioRef);
  }

  return url.toString();
}

function buildScenarioRef(value) {
  const normalized = safeToken(value);
  if (!normalized) return null;
  const ref = `scenario_${normalized}`;
  return ref.length <= 64 ? ref : null;
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
