import test from "node:test";
import assert from "node:assert/strict";

import {
  BUTLER_SUPPORTED_MARKETS,
  BUTLER_TECHNIK_AWIN,
  BUTLER_VICTRON_MPPT_250_60_MC4,
  BUTLER_VICTRON_ORION_XS_12_12_50,
  buildButlerAffiliateUrl,
  createButlerVictronCandidate,
  createButlerOrionXsCandidate
} from "../src/affiliate-butler.js";

const exactDestination = "https://www.butlertechnik.com/item/Victron/SmartSolar-MPPT-250-60-MC4/BT2";
const orionDestination = "https://www.butlertechnik.com/item/Victron/Smart-Buckboost-50A-700W-non-iso-DC-DC-charger/BPV";

test("Butler Technik candidate stays fail-closed before Awin approval", () => {
  assert.equal(BUTLER_TECHNIK_AWIN.merchantId, 31291);
  assert.equal(BUTLER_TECHNIK_AWIN.approvalConfirmed, false);
  assert.equal(buildButlerAffiliateUrl(exactDestination), null);

  const candidate = createButlerVictronCandidate({
    destination: exactDestination,
    inStock: true,
    shippableMarkets: ["sk", "pl", "hu", "pt", "ro", "si"]
  });

  assert.equal(candidate.affiliateUrl, null);
  assert.equal(candidate.recommendationEligible, false);
});

test("approved adapter preserves only staged exact Butler product destinations", () => {
  for (const destination of [exactDestination, orionDestination]) {
    const affiliateUrl = buildButlerAffiliateUrl(destination, { approvalConfirmed: true });
    const url = new URL(affiliateUrl);

    assert.equal(url.hostname, "www.awin1.com");
    assert.equal(url.searchParams.get("awinmid"), "31291");
    assert.equal(url.searchParams.get("awinaffid"), "3044971");
    assert.equal(url.searchParams.get("ued"), destination);
  }

  assert.equal(buildButlerAffiliateUrl("https://www.butlertechnik.com/victron-energy", { approvalConfirmed: true }), null);
  assert.equal(buildButlerAffiliateUrl("https://example.com/item/Victron/SmartSolar-MPPT-250-60-MC4/BT2", { approvalConfirmed: true }), null);
});

test("Victron 60A evidence satisfies every PT RO SI controller band", () => {
  assert.equal(BUTLER_VICTRON_MPPT_250_60_MC4.category, "controller");
  assert.equal(BUTLER_VICTRON_MPPT_250_60_MC4.mppt, true);
  assert.equal(BUTLER_VICTRON_MPPT_250_60_MC4.currentA, 60);
  assert.ok(BUTLER_VICTRON_MPPT_250_60_MC4.chargingVoltagesV.includes(12));
  assert.ok(BUTLER_VICTRON_MPPT_250_60_MC4.chargingVoltagesV.includes(24));
  assert.equal(BUTLER_VICTRON_MPPT_250_60_MC4.pvWattsBySystemVoltage[12], 860);
  assert.equal(BUTLER_VICTRON_MPPT_250_60_MC4.pvWattsBySystemVoltage[24], 1720);

  const requirements = [
    { systemVoltage: 12, minCurrentA: 30, maxCurrentA: 90, minArrayWatts: 200 },
    { systemVoltage: 12, minCurrentA: 40, maxCurrentA: 120, minArrayWatts: 300 },
    { systemVoltage: 12, minCurrentA: 60, maxCurrentA: 180, minArrayWatts: 550 },
    { systemVoltage: 24, minCurrentA: 20, maxCurrentA: 60, minArrayWatts: 250 },
    { systemVoltage: 24, minCurrentA: 30, maxCurrentA: 90, minArrayWatts: 500 },
    { systemVoltage: 24, minCurrentA: 20, maxCurrentA: 60, minArrayWatts: 350 }
  ];

  for (const requirement of requirements) {
    assert.ok(BUTLER_VICTRON_MPPT_250_60_MC4.currentA >= requirement.minCurrentA);
    assert.ok(BUTLER_VICTRON_MPPT_250_60_MC4.currentA <= requirement.maxCurrentA);
    assert.ok(BUTLER_VICTRON_MPPT_250_60_MC4.pvWattsBySystemVoltage[requirement.systemVoltage] >= requirement.minArrayWatts);
  }
});

test("candidate becomes eligible only for explicitly verified supported shipping markets", () => {
  assert.deepEqual(BUTLER_SUPPORTED_MARKETS, ["sk", "pl", "hu", "pt", "ro", "si"]);

  const candidate = createButlerVictronCandidate({
    destination: exactDestination,
    inStock: true,
    shippableMarkets: ["sk", "hu", "pt", "ro", "si", "cz"],
    approvalConfirmed: true
  });

  assert.deepEqual(candidate.verifiedMarkets, ["sk", "hu", "pt", "ro", "si"]);
  assert.equal(candidate.recommendationEligible, true);

  const outOfStock = createButlerVictronCandidate({
    destination: exactDestination,
    inStock: false,
    shippableMarkets: ["sk", "pl", "hu", "pt", "ro", "si"],
    approvalConfirmed: true
  });
  assert.equal(outOfStock.recommendationEligible, false);
});


test("Orion XS activation pack stays fail-closed and preserves 12V 50A evidence", () => {
  assert.equal(BUTLER_VICTRON_ORION_XS_12_12_50.category, "dc_charger");
  assert.equal(BUTLER_VICTRON_ORION_XS_12_12_50.currentA, 50);
  assert.equal(BUTLER_VICTRON_ORION_XS_12_12_50.powerW, 700);
  assert.deepEqual(BUTLER_VICTRON_ORION_XS_12_12_50.inputVoltagesV, [12]);
  assert.deepEqual(BUTLER_VICTRON_ORION_XS_12_12_50.chargingVoltagesV, [12]);
  assert.ok(BUTLER_VICTRON_ORION_XS_12_12_50.batteryTypes.includes("lifepo4"));
  assert.equal(BUTLER_VICTRON_ORION_XS_12_12_50.smartAlternatorCompatible, true);

  const pending = createButlerOrionXsCandidate({
    destination: orionDestination,
    inStock: true,
    shippableMarkets: ["sk", "pl", "hu", "pt", "ro", "si"]
  });
  assert.equal(pending.affiliateUrl, null);
  assert.equal(pending.recommendationEligible, false);

  const approved = createButlerOrionXsCandidate({
    destination: orionDestination,
    inStock: true,
    shippableMarkets: ["pt", "ro", "si"],
    approvalConfirmed: true
  });
  assert.deepEqual(approved.verifiedMarkets, ["pt", "ro", "si"]);
  assert.equal(approved.recommendationEligible, true);
  assert.equal(new URL(approved.affiliateUrl).searchParams.get("ued"), orionDestination);

  const wrongDestination = createButlerOrionXsCandidate({
    destination: exactDestination,
    inStock: true,
    shippableMarkets: ["pt"],
    approvalConfirmed: true
  });
  assert.equal(wrongDestination.destination, null);
  assert.equal(wrongDestination.recommendationEligible, false);
});
