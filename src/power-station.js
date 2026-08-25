const CAPACITY_RESERVE = 1.15;
const CONSERVATIVE_USABLE_RATIO = 0.8;

export function calculatePowerStationProfile(setup) {
  if (!setup || !Number.isFinite(setup.dailyWh) || setup.dailyWh <= 0
    || !Number.isFinite(setup.autonomyDays) || setup.autonomyDays <= 0
    || !Number.isFinite(setup.solarWatts) || setup.solarWatts < 0
    || !Number.isFinite(setup.inverterWatts) || setup.inverterWatts < 0
    || !Array.isArray(setup.applianceRows)) {
    throw new Error("Nelze určit požadavky na power station z neúplného výsledku.");
  }

  const capacityWh = roundUp(
    (setup.dailyWh * setup.autonomyDays * CAPACITY_RESERVE) / CONSERVATIVE_USABLE_RATIO,
    100
  );
  const dcContinuousWatts = setup.applianceRows
    .filter((appliance) => !appliance.ac)
    .reduce((total, appliance) => total + appliance.watts * appliance.quantity, 0);
  const dcOutputAmpsAt12V = Math.ceil(dcContinuousWatts / 12);

  const profile = capacityWh <= 1500 && setup.inverterWatts <= 1800 && setup.solarWatts <= 600
    ? "compact"
    : capacityWh <= 3000 && setup.inverterWatts <= 3000 && setup.solarWatts <= 1500
      ? "large"
      : "individual";

  return {
    profile,
    capacityWh,
    acOutputWatts: setup.inverterWatts,
    solarInputWatts: setup.solarWatts,
    dcContinuousWatts,
    dcOutputAmpsAt12V,
    assumptions: {
      capacityReservePercent: Math.round((CAPACITY_RESERVE - 1) * 100),
      usableRatioPercent: Math.round(CONSERVATIVE_USABLE_RATIO * 100)
    }
  };
}

function roundUp(value, step) {
  return Math.ceil(value / step) * step;
}
