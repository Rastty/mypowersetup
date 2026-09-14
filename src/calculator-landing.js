import { calculateSetup } from "./engine.js";

const INTENTS = Object.freeze({
  "battery-capacity": Object.freeze({
    defaultInput: Object.freeze({
      dailyWh: 900,
      autonomyDays: 2,
      batteryType: "lifepo4",
      systemVoltage: "auto",
      season: "summer",
    }),
    toEngineInput(input, locale) {
      const dailyWh = clampNumber(input.dailyWh, 50, 20000, 900);
      return {
        locale,
        autonomyDays: clampNumber(input.autonomyDays, 1, 7, 2),
        batteryType: input.batteryType === "lead" ? "lead" : "lifepo4",
        systemVoltage: normalizeVoltage(input.systemVoltage),
        season: input.season || "summer",
        appliances: [
          {
            id: "calculator-daily-consumption",
            name: "Denní spotřeba",
            selected: true,
            watts: dailyWh,
            hours: 1,
            quantity: 1,
            ac: false,
            surge: 1,
          },
        ],
      };
    },
    selectResult(result) {
      return {
        dailyWh: result.dailyWh,
        batteryWh: result.batteryWh,
        batteryAh: result.batteryAh,
        systemVoltage: result.systemVoltage,
        batteryType: result.batteryType,
        batteryLabel: result.batteryLabel,
        autonomyDays: result.autonomyDays,
        warnings: result.warnings,
        assumptions: result.assumptions,
      };
    },
  }),
});

export function getCalculatorIntent(intent) {
  const config = INTENTS[intent];
  if (!config) throw new Error(`Unknown calculator intent: ${intent}`);
  return config;
}

export function calculateLanding(intent, input = {}, locale = "cs") {
  const config = getCalculatorIntent(intent);
  const normalizedInput = { ...config.defaultInput, ...input };
  const engineInput = config.toEngineInput(normalizedInput, locale);
  const engineResult = calculateSetup(engineInput);

  return {
    intent,
    input: normalizedInput,
    engineInput,
    result: config.selectResult(engineResult),
    engineResult,
  };
}

function normalizeVoltage(value) {
  if (value === 12 || value === "12") return "12";
  if (value === 24 || value === "24") return "24";
  return "auto";
}

function clampNumber(value, min, max, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}
