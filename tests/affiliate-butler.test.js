import test from "node:test";
import assert from "node:assert/strict";

import {
  BUTLER_TECHNIK_AWIN,
  BUTLER_VICTRON_MPPT_250_60_MC4,
  buildButlerAffiliateUrl,
  createButlerVictronCandidate
} from "../src/affiliate-butler.js";

const exactDestination = "https://www.butlertechnik.com/item/Victron/SmartSolar-MPPT-250-60-MC4/BT2";

test("Butler Technik candidate stays fail-closed before Awin approval", () => {
  assert.equal(BUTLER_TECHNIK_AWIN.merchantId, 31291);
  assert.equal(BUTLER_TECHNIK_AWIN.approvalConfirmed, false);
  assert.equal(buildButlerAffiliateUrl(exactDestination), null);

  const candidate = createButlerVictronCandidate({
    destination: exactDestination,
    inStock: true,
    shippableMarkets: ["sk", "pl", "hu"]
  });

  assert.equal(candidate.affiliateUrl, null);
  assert.equal(candidate.recommendationEligible, false);
});

test("approved adapter preserves only the exact Butler product destination", () => {
  const affiliateUrl = buildButlerAffiliateUrl(exactDestination, { approvalConfirmed: true });
  const url = new URL(affiliateUrl);

  assert.equal(url.hostname, "www.awin1.com");
  assert.equal(url.searchParams.get("awinmid"), "31291");
  assert.equal(url.searchParams.get("awinaffid"), "3044971");
  assert.equal(url.searchParams.get("ued"), exactDestination);

  assert.equal(buildButlerAffiliateUrl("https://www.butlertechnik.com/victron-energy", { approvalConfirmed: true }), null);
  assert.equal(buildButlerAffiliateUrl("https://example.com/item/Victron/SmartSolar-MPPT-250-60-MC4/BT2", { approvalConfirmed: true }), null);
});

test("Victron 60A evidence satisfies both remaining 12V controller bands", () => {
  assert.equal(BUTLER_VICTRON_MPPT_250_60_MC4.category, "controller");
  assert.equal(BUTLER_VICTRON_MPPT_250_60_MC4.mppt, true);
  assert.equal(BUTLER_VICTRON_MPPT_250_60_MC4.currentA, 60);
  assert.ok(BUTLER_VICTRON_MPPT_250_60_MC4.chargingVoltagesV.includes(12));
  assert.equal(BUTLER_VICTRON_MPPT_250_60_MC4.pvWattsBySystemVoltage[12], 860);

  const requirements = [
    { minCurrentA: 40, minArrayWatts: 350 },
    { minCurrentA: 60, minArrayWatts: 650 }
  ];

  for (const requirement of requirements) {
    assert.ok(BUTLER_VICTRON_MPPT_250_60_MC4.currentA >= requirement.minCurrentA);
    assert.ok(BUTLER_VICTRON_MPPT_250_60_MC4.pvWattsBySystemVoltage[12] >= requirement.minArrayWatts);
  }
});

test("candidate becomes eligible only for explicitly verified shipping markets", () => {
  const candidate = createButlerVictronCandidate({
    destination: exactDestination,
    inStock: true,
    shippableMarkets: ["sk", "hu", "cz"],
    approvalConfirmed: true
  });

  assert.deepEqual(candidate.verifiedMarkets, ["sk", "hu"]);
  assert.equal(candidate.recommendationEligible, true);

  const outOfStock = createButlerVictronCandidate({
    destination: exactDestination,
    inStock: false,
    shippableMarkets: ["sk", "pl", "hu"],
    approvalConfirmed: true
  });
  assert.equal(outOfStock.recommendationEligible, false);
});
