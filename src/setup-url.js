const ALLOWED = {
  days: new Set(["1", "2", "3", "5"]),
  season: new Set(["summer", "shoulder", "winter"]),
  battery: new Set(["lifepo4", "lead"]),
  voltage: new Set(["auto", "12", "24"]),
};

function cleanNumber(value) {
  return Number(value).toString();
}

export function encodeSetupQuery(config) {
  const selected = config.appliances.filter((item) => item.selected);
  if (!selected.length) return "";

  const params = new URLSearchParams();
  params.set("loads", selected
    .map((item) => `${item.id}:${cleanNumber(item.hours)}:${cleanNumber(item.quantity)}`)
    .join(","));
  const custom = selected.find((item) => item.id === "custom");
  if (custom) {
    params.set("customName", String(custom.name || "").trim().slice(0, 60));
    params.set("customWatts", cleanNumber(custom.watts));
    params.set("customAc", custom.ac ? "1" : "0");
    params.set("customSurge", cleanNumber(custom.surge || 1));
  }
  params.set("days", String(config.autonomyDays));
  params.set("season", String(config.season));
  params.set("battery", String(config.batteryType));
  params.set("voltage", String(config.systemVoltage));
  params.set("cable", cleanNumber(config.inverterCableLength || 1.5));
  params.set("drive", cleanNumber(config.driveHoursPerDay ?? 2));
  params.set("starter", String(config.starterVoltage ?? 12));
  params.set("dcdcCable", cleanNumber(config.dcDcInputCableLength ?? 4));
  params.set("shore", cleanNumber(config.shoreChargeHours ?? 8));
  const roofLength = optionalSetupNumber(config.roofLength);
  const roofWidth = optionalSetupNumber(config.roofWidth);
  if (roofLength !== null && roofWidth !== null) {
    params.set("roofL", cleanNumber(roofLength));
    params.set("roofW", cleanNumber(roofWidth));
  }
  return params.toString();
}

export function decodeSetupQuery(search, allowedApplianceIds) {
  const params = new URLSearchParams(search);
  const loads = params.get("loads");
  if (!loads) return null;

  const allowedIds = new Set(allowedApplianceIds);
  const appliances = loads.split(",").flatMap((token) => {
    const [id, hoursText, quantityText, ...extra] = token.split(":");
    const hours = Number(hoursText);
    const quantity = Number(quantityText);
    if (extra.length || !allowedIds.has(id)) return [];
    if (!Number.isFinite(hours) || hours < 0.01 || hours > 24) return [];
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 20) return [];
    return [{ id, hours, quantity }];
  });
  if (!appliances.length) return null;

  const customIndex = appliances.findIndex((item) => item.id === "custom");
  if (customIndex >= 0) {
    const name = (params.get("customName") || "").trim();
    const watts = Number(params.get("customWatts"));
    const ac = params.get("customAc");
    const surge = Number(params.get("customSurge"));
    if (!name || name.length > 60 || !Number.isFinite(watts) || watts < 1 || watts > 10000
      || !["0", "1"].includes(ac) || ![1, 2].includes(surge)) return null;
    appliances[customIndex] = {
      ...appliances[customIndex],
      name,
      watts,
      ac: ac === "1",
      surge,
    };
  }

  const days = params.get("days") || "2";
  const season = params.get("season") || "summer";
  const battery = params.get("battery") || "lifepo4";
  const voltage = params.get("voltage") || "auto";
  const cableLength = Number(params.get("cable") || 1.5);
  const driveHoursPerDay = Number(params.get("drive") ?? 2);
  const starterVoltage = Number(params.get("starter") ?? 12);
  const dcDcInputCableLength = Number(params.get("dcdcCable") ?? 4);
  const shoreChargeHours = Number(params.get("shore") ?? 8);
  const roofLengthText = params.get("roofL");
  const roofWidthText = params.get("roofW");
  if ((roofLengthText === null) !== (roofWidthText === null)) return null;
  const roofLength = roofLengthText === null ? null : Number(roofLengthText);
  const roofWidth = roofWidthText === null ? null : Number(roofWidthText);
  if (!ALLOWED.days.has(days) || !ALLOWED.season.has(season)
    || !ALLOWED.battery.has(battery) || !ALLOWED.voltage.has(voltage)) return null;
  if (!Number.isFinite(cableLength) || cableLength < 0.2 || cableLength > 10) return null;
  if (!Number.isFinite(driveHoursPerDay) || driveHoursPerDay < 0 || driveHoursPerDay > 12) return null;
  if (![12, 24].includes(starterVoltage)) return null;
  if (!Number.isFinite(dcDcInputCableLength) || dcDcInputCableLength < 0.2 || dcDcInputCableLength > 15) return null;
  if (!Number.isFinite(shoreChargeHours) || shoreChargeHours < 0 || shoreChargeHours > 24) return null;
  if (roofLength !== null && (!Number.isFinite(roofLength) || roofLength < 0.5 || roofLength > 12)) return null;
  if (roofWidth !== null && (!Number.isFinite(roofWidth) || roofWidth < 0.5 || roofWidth > 4)) return null;

  return {
    appliances,
    autonomyDays: days,
    season,
    batteryType: battery,
    systemVoltage: voltage,
    inverterCableLength: cableLength,
    driveHoursPerDay,
    starterVoltage,
    dcDcInputCableLength,
    shoreChargeHours,
    ...(roofLength === null ? {} : { roofLength, roofWidth }),
  };
}

export function buildSetupUrl(config, language = "cs", origin = "https://mypowersetup.com") {
  const query = encodeSetupQuery(config);
  const path = { sk: "/sk/", pl: "/pl/" }[language] || "/";
  return `${origin.replace(/\/$/, "")}${path}${query ? `?${query}` : ""}#kalkulator`;
}

function optionalSetupNumber(value) {
  if (value === null || value === undefined || String(value).trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}
