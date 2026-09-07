import test from "node:test";
import assert from "node:assert/strict";

import {
  BLUETTI_EU_AWIN,
  BLUETTI_ELITE_300,
  BLUETTI_ELITE_300_MARKETS,
  buildBluettiEuAffiliateUrl,
  createBluettiElite300Candidate,
  validateBluettiEuAffiliateUrl,
} from "../src/affiliate-bluetti-eu.js";

const destination = "https://www.bluettipower.eu/products/elite-300-portable-power-station";

test("BLUETTI EU Elite 300 adapter stays fail-closed before Awin approval", () => {
  assert.equal(BLUETTI_EU_AWIN.approvalConfirmed, false);
  assert.equal(buildBluettiEuAffiliateUrl(destination), null);

  const candidate = createBluettiElite300Candidate({
    destination,
    inStock: true,
    shippableMarkets: ["pt", "ro", "si"],
  });
  assert.equal(candidate.affiliateUrl, null);
  assert.equal(candidate.recommendationEligible, false);
});

test("approved BLUETTI EU adapter builds only the exact Elite 300 deeplink", () => {
  const affiliateUrl = buildBluettiEuAffiliateUrl(destination, { approvalConfirmed: true });
  assert.ok(affiliateUrl);
  assert.equal(validateBluettiEuAffiliateUrl(affiliateUrl), true);

  const url = new URL(affiliateUrl);
  assert.equal(url.searchParams.get("awinmid"), "95479");
  assert.equal(url.searchParams.get("awinaffid"), "3044971");
  assert.equal(url.searchParams.get("ued"), destination);

  assert.equal(buildBluettiEuAffiliateUrl("https://www.bluettipower.eu/collections/portable-power-stations", { approvalConfirmed: true }), null);
  assert.equal(buildBluettiEuAffiliateUrl("https://example.com/products/elite-300-portable-power-station", { approvalConfirmed: true }), null);
});

test("Elite 300 exact evidence covers the family portable profile", () => {
  assert.equal(BLUETTI_ELITE_300.capacityWh, 3014.4);
  assert.equal(BLUETTI_ELITE_300.powerW, 2400);
  assert.equal(BLUETTI_ELITE_300.peakPowerW, 4800);
  assert.equal(BLUETTI_ELITE_300.pureSine, true);
  assert.equal(BLUETTI_ELITE_300.solarInputW, 1200);
  assert.equal(BLUETTI_ELITE_300.dcOutputVoltageV, 12);
  assert.equal(BLUETTI_ELITE_300.dcOutputA, 30);
  assert.equal(BLUETTI_ELITE_300.batteryType, "lifepo4");
  assert.deepEqual(BLUETTI_ELITE_300_MARKETS, ["pt", "ro", "si"]);

  const candidate = createBluettiElite300Candidate({
    destination,
    inStock: true,
    shippableMarkets: ["pt", "ro", "si", "de"],
    approvalConfirmed: true,
  });
  assert.deepEqual(candidate.verifiedMarkets, ["pt", "ro", "si"]);
  assert.equal(candidate.recommendationEligible, true);
});
