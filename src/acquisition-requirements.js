export function acquisitionRequirement(category, setup) {
  if (category === "battery") return Object.freeze({
    category,
    systemVoltage: setup.systemVoltage,
    batteryType: setup.batteryType,
    minCapacityAh: setup.batteryAh,
    maxCapacityAh: setup.batteryAh * 3,
  });
  if (category === "solar_panel") return Object.freeze({
    category,
    minArrayWatts: setup.solarWatts,
    maxPanels: 4,
  });
  if (category === "controller") return Object.freeze({
    category,
    technology: "mppt",
    minCurrentA: setup.controllerAmps,
    maxCurrentA: setup.controllerAmps * 3,
    systemVoltage: setup.systemVoltage,
    minArrayWatts: setup.solarWatts,
  });
  if (category === "inverter") return Object.freeze({
    category,
    systemVoltage: setup.systemVoltage,
    waveform: "pure_sine",
    minContinuousPowerW: setup.inverterWatts,
    maxContinuousPowerW: setup.inverterWatts * 3,
  });
  if (category === "dc_charger") {
    const option = setup.charging?.dcDc;
    if (!option?.suggestedCurrentAmps) return null;
    return Object.freeze({
      category,
      inputVoltage: setup.charging.starterVoltage,
      outputVoltage: setup.systemVoltage,
      batteryType: setup.batteryType,
      minCurrentA: option.suggestedCurrentAmps,
      maxCurrentA: option.suggestedCurrentAmps * 3,
    });
  }
  if (category === "shore_charger") {
    const option = setup.charging?.shore;
    if (!option?.suggestedCurrentAmps) return null;
    return Object.freeze({
      category,
      input: "230V_AC",
      outputVoltage: setup.systemVoltage,
      batteryType: setup.batteryType,
      minCurrentA: option.suggestedCurrentAmps,
      maxCurrentA: option.suggestedCurrentAmps * 3,
    });
  }
  return null;
}

export function requirementKey(requirement) {
  if (!requirement) return "none";
  return Object.entries(requirement)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${Array.isArray(value) ? value.join(",") : value}`)
    .join("|");
}
