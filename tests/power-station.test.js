import test from "node:test";
import assert from "node:assert/strict";

import { calculatePowerStationProfile } from "../src/power-station.js";

test("builds a compact power-station profile with conservative usable capacity", () => {
  const profile = calculatePowerStationProfile({
    dailyWh: 600,
    autonomyDays: 1,
    solarWatts: 300,
    inverterWatts: 1000,
    applianceRows: [
      { watts: 60, quantity: 1, ac: false },
      { watts: 500, quantity: 1, ac: true }
    ]
  });

  assert.equal(profile.profile, "compact");
  assert.equal(profile.capacityWh, 900);
  assert.equal(profile.acOutputWatts, 1000);
  assert.equal(profile.solarInputWatts, 300);
  assert.equal(profile.dcOutputAmpsAt12V, 5);
  assert.deepEqual(profile.assumptions, {
    capacityReservePercent: 15,
    usableRatioPercent: 80
  });
});

test("requires a large or individual solution for demanding setups", () => {
  const large = calculatePowerStationProfile({
    dailyWh: 1200,
    autonomyDays: 1,
    solarWatts: 800,
    inverterWatts: 2400,
    applianceRows: []
  });
  const individual = calculatePowerStationProfile({
    dailyWh: 2200,
    autonomyDays: 2,
    solarWatts: 1800,
    inverterWatts: 3500,
    applianceRows: []
  });

  assert.equal(large.profile, "large");
  assert.equal(individual.profile, "individual");
});

test("refuses an incomplete calculator result", () => {
  assert.throws(() => calculatePowerStationProfile({ dailyWh: 500 }), /neúplného výsledku/);
});
