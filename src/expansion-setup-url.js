const MARKET_PATHS = Object.freeze({ pt: "/pt/", ro: "/ro/", si: "/si/" });
const ALLOWED_DAYS = new Set(["1", "2", "3", "5"]);
const ALLOWED_SEASONS = new Set(["summer", "shoulder", "winter"]);
const ALLOWED_BATTERIES = new Set(["lifepo4", "lead"]);
const ALLOWED_VOLTAGES = new Set(["auto", "12", "24"]);

export function encodeExpansionSetupQuery(config) {
  const selectedIds = [...new Set((config?.appliances || [])
    .filter((item) => item.selected)
    .map((item) => String(item.id || "").trim())
    .filter(Boolean))];
  if (!selectedIds.length) return "";

  const params = new URLSearchParams();
  params.set("loads", selectedIds.join(","));
  params.set("days", String(config.autonomyDays));
  params.set("season", String(config.season));
  params.set("battery", String(config.batteryType));
  params.set("voltage", String(config.systemVoltage));
  return params.toString();
}

export function decodeExpansionSetupQuery(search, allowedApplianceIds) {
  const params = new URLSearchParams(search);
  const loads = params.get("loads");
  if (!loads) return null;

  const allowed = new Set(allowedApplianceIds);
  const applianceIds = [...new Set(loads.split(",").map((item) => item.trim()).filter(Boolean))];
  if (!applianceIds.length || applianceIds.some((id) => !allowed.has(id))) return null;

  const autonomyDays = params.get("days") || "2";
  const season = params.get("season") || "summer";
  const batteryType = params.get("battery") || "lifepo4";
  const systemVoltage = params.get("voltage") || "auto";
  if (!ALLOWED_DAYS.has(autonomyDays)
    || !ALLOWED_SEASONS.has(season)
    || !ALLOWED_BATTERIES.has(batteryType)
    || !ALLOWED_VOLTAGES.has(systemVoltage)) return null;

  return Object.freeze({
    applianceIds: Object.freeze(applianceIds),
    autonomyDays,
    season,
    batteryType,
    systemVoltage,
  });
}

export function buildExpansionSetupUrl(config, market, origin = "https://mypowersetup.com") {
  const path = MARKET_PATHS[market];
  if (!path) throw new Error(`EXPANSION_SETUP_MARKET_UNSUPPORTED:${market || "missing"}`);
  const query = encodeExpansionSetupQuery(config);
  const base = `${origin.replace(/\/$/, "")}${path}`;
  return `${base}${query ? `?${query}` : ""}#calculator-preview`;
}
