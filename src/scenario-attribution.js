const STORAGE_KEY = "mypowersetup_scenario_attribution";

function normalizeScenarioAttribution(value) {
  if (!value || typeof value !== "object") return null;
  const source = String(value.scenario_source || "");
  const campaign = String(value.scenario_campaign || "");
  if (source !== "scenario_page") return null;
  if (!/^[a-z0-9_]{1,80}$/.test(campaign)) return null;
  return Object.freeze({
    scenario_source: source,
    scenario_campaign: campaign,
  });
}

export function readScenarioAttribution(search) {
  const params = new URLSearchParams(String(search || "").replace(/^\?/, ""));
  if (params.get("utm_source") !== "scenario_page") return null;
  if (params.get("utm_medium") !== "internal") return null;
  return normalizeScenarioAttribution({
    scenario_source: params.get("utm_source"),
    scenario_campaign: params.get("utm_campaign"),
  });
}

export function resolveScenarioAttribution({ search, initialSearch, storage = null } = {}) {
  const landing = readScenarioAttribution(search) || readScenarioAttribution(initialSearch);
  if (landing) {
    try { storage?.setItem?.(STORAGE_KEY, JSON.stringify(landing)); } catch {}
    return landing;
  }

  try {
    const stored = storage?.getItem?.(STORAGE_KEY);
    return stored ? normalizeScenarioAttribution(JSON.parse(stored)) : null;
  } catch {
    return null;
  }
}
