import { calculateControllerSizing, calculateSetup } from "./engine.js";
import { calculateDcCable } from "./dc-cable.js";

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
        batteryType: normalizeBatteryType(input.batteryType),
        systemVoltage: normalizeVoltage(input.systemVoltage),
        season: normalizeSeason(input.season),
        appliances: [dailyEnergyAppliance(dailyWh)],
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
  "solar-sizing": Object.freeze({
    defaultInput: Object.freeze({
      dailyWh: 1200,
      season: "summer",
      batteryType: "lifepo4",
      systemVoltage: "auto",
    }),
    toEngineInput(input, locale) {
      const dailyWh = clampNumber(input.dailyWh, 50, 20000, 1200);
      return {
        locale,
        autonomyDays: 1,
        batteryType: normalizeBatteryType(input.batteryType),
        systemVoltage: normalizeVoltage(input.systemVoltage),
        season: normalizeSeason(input.season),
        appliances: [dailyEnergyAppliance(dailyWh)],
      };
    },
    selectResult(result) {
      return {
        dailyWh: result.dailyWh,
        solarWatts: result.solarWatts,
        controllerAmps: result.controllerAmps,
        systemVoltage: result.systemVoltage,
        seasonLabel: result.seasonLabel,
        warnings: result.warnings,
        assumptions: result.assumptions,
        calculation: {
          peakSunHours: result.calculation.peakSunHours,
          solarWattsRaw: result.calculation.solarWattsRaw,
        },
      };
    },
  }),
  "mppt-sizing": Object.freeze({
    defaultInput: Object.freeze({
      panelWatts: 400,
      systemVoltage: 12,
      batteryType: "lifepo4",
    }),
    calculate(input) {
      const panelWatts = clampNumber(input.panelWatts, 50, 5000, 400);
      const systemVoltage = Number(input.systemVoltage) === 24 ? 24 : 12;
      const batteryType = normalizeBatteryType(input.batteryType);
      const result = calculateControllerSizing({ solarWatts: panelWatts, systemVoltage, batteryType });
      return {
        panelWatts: result.solarWatts,
        systemVoltage: result.systemVoltage,
        batteryType: result.batteryType,
        controllerAmps: result.controllerAmps,
        controllerSizingVoltage: result.controllerSizingVoltage,
        controllerMarginPercent: result.controllerMarginPercent,
        warnings: [],
      };
    },
  }),
  "inverter-sizing": Object.freeze({
    defaultInput: Object.freeze({
      largestLoadWatts: 1200,
      otherLoadWatts: 300,
      surgeMultiplier: 1.5,
      systemVoltage: "auto",
    }),
    toEngineInput(input, locale) {
      const largestLoadWatts = clampNumber(input.largestLoadWatts, 10, 5000, 1200);
      const otherLoadWatts = clampNumber(input.otherLoadWatts, 0, 5000, 300);
      const surgeMultiplier = clampNumber(input.surgeMultiplier, 1, 5, 1.5);
      const appliances = [
        {
          id: "calculator-largest-ac-load",
          name: "Největší AC spotřebič",
          selected: true,
          watts: largestLoadWatts,
          hours: 1,
          quantity: 1,
          ac: true,
          surge: surgeMultiplier,
        },
      ];
      if (otherLoadWatts > 0) {
        appliances.push({
          id: "calculator-other-ac-loads",
          name: "Další současné AC spotřebiče",
          selected: true,
          watts: otherLoadWatts,
          hours: 1,
          quantity: 1,
          ac: true,
          surge: 1,
        });
      }
      return {
        locale,
        autonomyDays: 1,
        batteryType: "lifepo4",
        systemVoltage: normalizeVoltage(input.systemVoltage),
        season: "summer",
        appliances,
      };
    },
    selectResult(result) {
      return {
        inverterWatts: result.inverterWatts,
        systemVoltage: result.systemVoltage,
        estimatedConcurrentWatts: Math.round(result.calculation.estimatedConcurrentWatts),
        largestStartWatts: Math.round(result.calculation.largestStartWatts),
        warnings: result.warnings,
      };
    },
  }),
  "voltage-system": Object.freeze({
    defaultInput: Object.freeze({
      dailyWh: 1800,
      maxAcLoadWatts: 800,
      surgeMultiplier: 1,
    }),
    toEngineInput(input, locale) {
      const dailyWh = clampNumber(input.dailyWh, 50, 20000, 1800);
      const maxAcLoadWatts = clampNumber(input.maxAcLoadWatts, 10, 5000, 800);
      const surgeMultiplier = clampNumber(input.surgeMultiplier, 1, 5, 1);
      const hours = clampNumber(dailyWh / maxAcLoadWatts, 0.01, 24, 1);
      return {
        locale,
        autonomyDays: 1,
        batteryType: "lifepo4",
        systemVoltage: "auto",
        season: "summer",
        appliances: [
          {
            id: "calculator-voltage-decision-load",
            name: "Modelová AC zátěž",
            selected: true,
            watts: maxAcLoadWatts,
            hours,
            quantity: 1,
            ac: true,
            surge: surgeMultiplier,
          },
        ],
      };
    },
    selectResult(result) {
      return {
        dailyWh: result.dailyWh,
        batteryWh: result.batteryWh,
        inverterWatts: result.inverterWatts,
        systemVoltage: result.systemVoltage,
        automaticVoltage: result.calculation.automaticVoltage,
        warnings: result.warnings,
      };
    },
  }),
  "cable-voltage-drop": Object.freeze({
    defaultInput: Object.freeze({
      loadWatts: 500,
      oneWayLengthM: 5,
      systemVoltage: 12,
      maxDropPercent: 3,
    }),
    calculate(input) {
      return calculateDcCable(input);
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

  if (config.calculate) {
    return {
      intent,
      input: normalizedInput,
      result: config.calculate(normalizedInput, locale),
      engineInput: null,
      engineResult: null,
    };
  }

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

function dailyEnergyAppliance(dailyWh) {
  return {
    id: "calculator-daily-consumption",
    name: "Denní spotřeba",
    selected: true,
    watts: dailyWh,
    hours: 1,
    quantity: 1,
    ac: false,
    surge: 1,
  };
}

function normalizeVoltage(value) {
  if (value === 12 || value === "12") return "12";
  if (value === 24 || value === "24") return "24";
  return "auto";
}

function normalizeBatteryType(value) {
  return value === "lead" ? "lead" : "lifepo4";
}

function normalizeSeason(value) {
  return ["summer", "shoulder", "winter"].includes(value) ? value : "summer";
}

function clampNumber(value, min, max, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}
