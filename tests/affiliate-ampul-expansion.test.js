import test from "node:test";
import assert from "node:assert/strict";

import {
  AMPUL_EHUB,
  AMPUL_24V_2000W_INVERTER,
  AMPUL_12V_30A_DCDC,
  buildAmpulEhubUrl,
  createAmpulExpansionCandidate,
  validateAmpulEhubUrl,
} from "../src/affiliate-ampul-expansion.js";

const inverterDestination = "https://ampul.eu/cs/menice-napeti/5577-7392-menic-napeti-z-dc-na-230v-ac-50hz-2000w";
const dcdcDestination = "https://ampul.eu/cs/nabijecky/6195-dc-dc-nabijecka-lifepo4-baterii-146v-30a-400w-ip68";

test("Ampul eHub deeplink builder preserves exact verified destinations", () => {
  for (const destination of [inverterDestination, dcdcDestination]) {
    const url = buildAmpulEhubUrl(destination);
    assert.ok(url);
    assert.equal(validateAmpulEhubUrl(url, destination), true);

    const click = new URL(url);
    assert.equal(click.hostname, AMPUL_EHUB.clickHostname);
    assert.equal(click.searchParams.get("a_aid"), AMPUL_EHUB.affiliateId);
    assert.equal(click.searchParams.get("a_bid"), AMPUL_EHUB.campaignId);
    assert.equal(click.searchParams.get("desturl"), destination);
  }

  assert.equal(buildAmpulEhubUrl("https://ampul.eu/cs/"), null);
  assert.equal(buildAmpulEhubUrl("https://example.com" + AMPUL_24V_2000W_INVERTER.exactPath), null);
});

test("Ampul 24V 2000W inverter remains blocked until both stock and market are verified", () => {
  const candidate = createAmpulExpansionCandidate(AMPUL_24V_2000W_INVERTER, {
    destination: inverterDestination,
    available: undefined,
    verifiedMarkets: [],
  });
  assert.equal(candidate.affiliateUrl !== null, true);
  assert.equal(candidate.availability, "unverified");
  assert.deepEqual(candidate.verifiedMarkets, []);
  assert.equal(candidate.recommendationEligible, false);

  const marketOnly = createAmpulExpansionCandidate(AMPUL_24V_2000W_INVERTER, {
    destination: inverterDestination,
    available: undefined,
    verifiedMarkets: ["ro", "si"],
  });
  assert.equal(marketOnly.recommendationEligible, false);

  const ready = createAmpulExpansionCandidate(AMPUL_24V_2000W_INVERTER, {
    destination: inverterDestination,
    available: true,
    verifiedMarkets: ["ro", "si"],
  });
  assert.equal(ready.recommendationEligible, true);
  assert.deepEqual(ready.verifiedMarkets, ["ro", "si"]);
  assert.equal(ready.systemVoltageV, 24);
  assert.equal(ready.continuousPowerW, 2000);
  assert.equal(ready.pureSine, true);
});

test("Ampul 30A DC-DC exact product is technically ready but market-gated", () => {
  const candidate = createAmpulExpansionCandidate(AMPUL_12V_30A_DCDC, {
    destination: dcdcDestination,
    available: true,
    verifiedMarkets: [],
  });
  assert.equal(candidate.recommendationEligible, false);
  assert.equal(candidate.currentA, 30);
  assert.equal(candidate.outputVoltageV, 14.6);
  assert.deepEqual(candidate.inputVoltagesV, [12, 24]);
  assert.deepEqual(candidate.batteryTypes, ["lifepo4"]);

  const ready = createAmpulExpansionCandidate(AMPUL_12V_30A_DCDC, {
    destination: dcdcDestination,
    available: true,
    verifiedMarkets: ["ro"],
  });
  assert.equal(ready.recommendationEligible, true);
  assert.deepEqual(ready.verifiedMarkets, ["ro"]);
});

test("Ampul validator rejects modified eHub tracking and cross-product destinations", () => {
  const good = buildAmpulEhubUrl(inverterDestination);
  const wrongAid = good.replace(AMPUL_EHUB.affiliateId, "other");
  assert.equal(validateAmpulEhubUrl(wrongAid, inverterDestination), false);

  const extra = new URL(good);
  extra.searchParams.set("foo", "bar");
  assert.equal(validateAmpulEhubUrl(extra.toString(), inverterDestination), false);

  assert.equal(validateAmpulEhubUrl(good, dcdcDestination), false);
});
