// Narrow, explicit micro-calculator handoffs. A valid linked calculation should
// never require re-entering the same Wh, DC voltage, or battery chemistry.
// No synthetic appliance loads or hidden inverter assumptions are invented.
const ROUTES = Object.freeze({
  cs: Object.freeze({ "battery-autonomy": "/kalkulacky/vydrz-baterie/", "battery-capacity": "/kalkulacky/kapacita-baterie/", "solar-sizing": "/kalkulacky/solarni-panely/", "mppt-sizing": "/kalkulacky/mppt-regulator/" }),
  sk: Object.freeze({ "battery-capacity": "/sk/kalkulacky/kapacita-baterie/", "solar-sizing": "/sk/kalkulacky/solarne-panely/" }),
  pl: Object.freeze({ "battery-capacity": "/pl/kalkulatory/pojemnosc-akumulatora/", "solar-sizing": "/pl/kalkulatory/panele-solarne/" }),
  hu: Object.freeze({ "battery-capacity": "/hu/kalkulatorok/akkumulator-kapacitas/", "solar-sizing": "/hu/kalkulatorok/napelem-teljesitmeny/" }),
});
const NEXT_INTENT = Object.freeze({ "battery-autonomy": "battery-capacity", "battery-capacity": "solar-sizing", "solar-sizing": "mppt-sizing" });
const INPUT_KEYS = Object.freeze({ "battery-capacity": "dailyWh", "solar-sizing": "dailyWh", "mppt-sizing": "panelWatts" });

function validSizingNumber(value, min, max) {
  const n = Number(value);
  // The published receiving forms use step=10; never round or clamp a
  // transferred electrical requirement because that could undersize it.
  return Number.isSafeInteger(n) && n >= min && n <= max && n % 10 === 0 ? n : null;
}

function validatedValues(destinationIntent, raw) {
  const key = INPUT_KEYS[destinationIntent];
  if (!key) return null;
  const watts = validSizingNumber(raw?.[key], 50, destinationIntent === "mppt-sizing" ? 5000 : 20000);
  const voltage = String(raw?.systemVoltage || "");
  const batteryType = String(raw?.batteryType || "");
  if (watts === null || !["12", "24"].includes(voltage) || !["lifepo4", "lead"].includes(batteryType)) return null;
  return Object.freeze({ [key]: String(watts), systemVoltage: voltage, batteryType });
}

export function calculatorHandoffTarget(intent, locale) {
  const normalizedLocale = String(locale || "").toLowerCase();
  const nextIntent = NEXT_INTENT[intent];
  const routes = ROUTES[normalizedLocale];
  // A target route alone must never imply that the source calculator exists.
  const target = routes?.[intent] && nextIntent ? routes[nextIntent] : null;
  return target ? Object.freeze({ path: target, intent: nextIntent }) : null;
}

export function buildCalculatorHandoffUrl({ intent, locale, result, inputs } = {}) {
  const destination = calculatorHandoffTarget(intent, locale);
  if (!destination) return null;
  // Reuse observed Wh, voltage and chemistry. Never infer desired days of autonomy:
  // the receiving form keeps its own explicit editable default of two days.
  const raw = destination.intent === "solar-sizing" || destination.intent === "battery-capacity"
    ? { dailyWh: result?.dailyWh, systemVoltage: result?.systemVoltage, batteryType: inputs?.batteryType }
    : { panelWatts: result?.solarWatts, systemVoltage: result?.systemVoltage, batteryType: inputs?.batteryType };
  const values = validatedValues(destination.intent, raw);
  if (!values) return null;
  const params = new URLSearchParams({ mps_from: intent, ...values });
  return `${destination.path}?${params.toString()}`;
}

export function applyCalculatorHandoffPrefill({ form, intent, locale, pathname, search } = {}) {
  const languageRoutes = ROUTES[String(locale || "").toLowerCase()];
  if (!languageRoutes || languageRoutes[intent] !== pathname) return null;
  let params;
  try { params = new URLSearchParams(String(search || "").replace(/^\?/, "")); } catch { return null; }
  const sourceIntent = params.get("mps_from");
  if (!sourceIntent || params.getAll("mps_from").length !== 1) return null;
  const expected = calculatorHandoffTarget(sourceIntent, locale);
  if (!expected || expected.intent !== intent || expected.path !== pathname) return null;
  const key = INPUT_KEYS[intent];
  const keys = [key, "systemVoltage", "batteryType"];
  if (keys.some((name) => params.getAll(name).length !== 1)) return null;
  const raw = Object.fromEntries(keys.map((name) => [name, params.get(name)]));
  const values = validatedValues(intent, raw);
  if (!values) return null;
  const fields = keys.map((name) => form?.elements?.namedItem?.(name));
  if (fields.some((field) => !field || typeof field.value !== "string")) return null;
  // All form fields are known on these routes; commit only after the entire
  // transferred state and the destination route pass validation.
  keys.forEach((name, index) => { fields[index].value = values[name]; });
  return Object.freeze({ from: sourceIntent, values });
}
