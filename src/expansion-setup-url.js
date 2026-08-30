const MARKET_PATHS = Object.freeze({ pt: "/pt/", ro: "/ro/", si: "/si/" });
const ALLOWED_DAYS = new Set(["1", "2", "3", "5"]);
const ALLOWED_SEASONS = new Set(["summer", "shoulder", "winter"]);
const ALLOWED_BATTERIES = new Set(["lifepo4", "lead"]);
const ALLOWED_VOLTAGES = new Set(["auto", "12", "24"]);

export function encodeExpansionSetupQuery(config) {
  const selected = (config?.appliances || [])
    .filter((item) => item?.selected)
    .map((item) => ({ ...item, id: String(item.id || "").trim() }))
    .filter((item) => item.id);
  const selectedIds = [...new Set(selected.map((item) => item.id))];
  if (!selectedIds.length) return "";

  const params = new URLSearchParams();
  params.set("loads", selectedIds.join(","));
  params.set("days", String(config.autonomyDays));
  params.set("season", String(config.season));
  params.set("battery", String(config.batteryType));
  params.set("voltage", String(config.systemVoltage));

  const usage = selected
    .filter((item) => item.id !== "custom" && validUsage(item.hours, item.quantity))
    .map((item) => `${item.id}:${numberText(item.hours)}:${Number(item.quantity)}`);
  if (usage.length) params.set("usage", usage.join(";"));

  const custom = selected.find((item) => item.id === "custom");
  if (custom && validCustom(custom)) {
    params.set("custom_name", String(custom.name).trim());
    params.set("custom_watts", numberText(custom.watts));
    params.set("custom_hours", numberText(custom.hours));
    params.set("custom_qty", String(Number(custom.quantity)));
    params.set("custom_ac", custom.ac ? "1" : "0");
    params.set("custom_surge", numberText(custom.surge));
  }
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

  const applianceState = {};
  const usage = params.get("usage");
  if (usage) {
    const seen = new Set();
    for (const record of usage.split(";").filter(Boolean)) {
      const parts = record.split(":");
      if (parts.length !== 3) return null;
      const [id, hoursText, quantityText] = parts;
      const hours = Number(hoursText);
      const quantity = Number(quantityText);
      if (!applianceIds.includes(id) || id === "custom" || seen.has(id) || !validUsage(hours, quantity)) return null;
      seen.add(id);
      applianceState[id] = Object.freeze({ hours, quantity });
    }
  }

  const customParams = ["custom_name", "custom_watts", "custom_hours", "custom_qty", "custom_ac", "custom_surge"];
  const hasAnyCustomParam = customParams.some((key) => params.has(key));
  if (applianceIds.includes("custom")) {
    if (!customParams.every((key) => params.has(key))) return null;
    const custom = {
      name: params.get("custom_name"),
      watts: Number(params.get("custom_watts")),
      hours: Number(params.get("custom_hours")),
      quantity: Number(params.get("custom_qty")),
      ac: params.get("custom_ac") === "1",
      surge: Number(params.get("custom_surge")),
    };
    if (!validCustom(custom) || !["0", "1"].includes(params.get("custom_ac"))) return null;
    applianceState.custom = Object.freeze(custom);
  } else if (hasAnyCustomParam) {
    return null;
  }

  return Object.freeze({
    applianceIds: Object.freeze(applianceIds),
    applianceState: Object.freeze(applianceState),
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

function validUsage(hours, quantity) {
  const parsedHours = Number(hours);
  const parsedQuantity = Number(quantity);
  return Number.isFinite(parsedHours) && parsedHours >= 0.01 && parsedHours <= 24
    && Number.isInteger(parsedQuantity) && parsedQuantity >= 1 && parsedQuantity <= 20;
}

function validCustom(item) {
  const name = String(item?.name || "").trim();
  const watts = Number(item?.watts);
  const surge = Number(item?.surge);
  return name.length >= 1 && name.length <= 60
    && Number.isFinite(watts) && watts >= 1 && watts <= 10000
    && validUsage(item?.hours, item?.quantity)
    && typeof item?.ac === "boolean"
    && Number.isFinite(surge) && surge >= 1 && surge <= 5;
}

function numberText(value) {
  return String(Number(value));
}
