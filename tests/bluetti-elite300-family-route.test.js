import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { COMMERCIAL_SCENARIOS, buildScenarioSetup } from "../src/commercial-scenarios.js";
import { calculatePowerStationProfile } from "../src/power-station.js";

const onboarding = JSON.parse(await readFile(new URL("../data/affiliate-onboarding-candidates.json", import.meta.url), "utf8"));
const elite = onboarding.candidates.find(({ id }) => id === "bluetti-eu-elite-300");

test("BLUETTI Elite 300 technically closes the family-touring portable route for PT and RO", () => {
  assert.ok(elite);
  const scenario = COMMERCIAL_SCENARIOS.find(({ id }) => id === "family-touring");
  const setup = buildScenarioSetup(scenario, "pt");
  const profile = calculatePowerStationProfile(setup);

  assert.equal(profile.profile, "large");
  assert.ok(elite.specs.capacityWh >= profile.capacityWh, `${elite.specs.capacityWh}Wh < ${profile.capacityWh}Wh`);
  assert.ok(elite.specs.continuousPowerW >= profile.acOutputWatts, `${elite.specs.continuousPowerW}W < ${profile.acOutputWatts}W AC`);
  assert.ok(elite.specs.solarInputW >= profile.solarInputWatts, `${elite.specs.solarInputW}W < ${profile.solarInputWatts}W solar`);
  assert.equal(elite.specs.dcOutputVoltageV, 12);
  assert.ok(elite.specs.dcOutputA >= profile.dcOutputAmpsAt12V, `${elite.specs.dcOutputA}A < ${profile.dcOutputAmpsAt12V}A DC`);

  assert.deepEqual(elite.targetScenarioIds, ["family-touring"]);
  assert.deepEqual(elite.shippingEligibleMarkets, ["pt-PT", "ro-RO"]);
  assert.deepEqual(elite.unsupportedMarkets, ["sl-SI"]);
  assert.equal(elite.stockStatus, "in_stock");
  assert.equal(elite.status, "blocked_affiliate_verification");
  assert.equal(elite.productUrl, null);
  assert.equal(elite.affiliateUrl, null);
});

test("Elite 300 remains planning evidence only until an exact EU affiliate deeplink is verified", () => {
  assert.equal(elite.nextActionOwner, "user");
  assert.equal(elite.nextAction, "verify_eu_affiliate_deeplink");
  assert.match(elite.applicationUrl, /bluettipower\.eu\/pages\/affiliate-program/);
  assert.match(elite.retailEvidenceUrl, /bluettipower\.eu\/products\/elite-300-portable-power-station/);
  assert.match(elite.shippingEvidenceUrl, /bluettipower\.eu\/pages\/shipping-country/);
  assert.equal(elite.commissionPercent, 10);
});
