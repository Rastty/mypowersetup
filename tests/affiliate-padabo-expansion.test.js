import test from "node:test";
import assert from "node:assert/strict";
import {
  PADABO_SK_EHUB,
  PADABO_VICTRON_PHOENIX_12_250,
  buildPadaboSkEhubUrl,
  createPadaboPhoenixExpansionCandidate,
  validatePadaboSkEhubUrl,
} from "../src/affiliate-padabo-expansion.js";

const destination = "https://www.padabo.sk/victron-energy-phoenix-ve-priamy-menic-napatia_z24820/";

test("Padabo expansion adapter preserves the approved exact eHub destination", () => {
  const url = buildPadaboSkEhubUrl(destination);
  assert.ok(url);
  assert.equal(validatePadaboSkEhubUrl(url, destination), true);
  const click = new URL(url);
  assert.equal(click.searchParams.get("a_aid"), PADABO_SK_EHUB.affiliateId);
  assert.equal(click.searchParams.get("a_bid"), PADABO_SK_EHUB.campaignId);
  assert.equal(click.searchParams.get("desturl"), destination);
  assert.equal(buildPadaboSkEhubUrl("https://www.padabo.sk/"), null);
});

test("Padabo Phoenix 12/250 stays market-gated despite live stock and approved tracking", () => {
  const blocked = createPadaboPhoenixExpansionCandidate({
    destination,
    available: true,
    verifiedMarkets: [],
  });
  assert.equal(blocked.availability, "in_stock");
  assert.equal(blocked.affiliateUrl !== null, true);
  assert.equal(blocked.recommendationEligible, false);
  assert.deepEqual(blocked.verifiedMarkets, []);

  const ready = createPadaboPhoenixExpansionCandidate({
    destination,
    available: true,
    verifiedMarkets: ["pt"],
  });
  assert.equal(ready.recommendationEligible, true);
  assert.deepEqual(ready.verifiedMarkets, ["pt"]);
  assert.equal(ready.systemVoltageV, 12);
  assert.equal(ready.continuousPowerW, 200);
  assert.equal(ready.pureSine, true);
});

test("Padabo exact product evidence matches the P0 family-touring band", () => {
  assert.equal(PADABO_VICTRON_PHOENIX_12_250.sourceProductId, "24820_26587");
  assert.equal(PADABO_VICTRON_PHOENIX_12_250.systemVoltageV, 12);
  assert.equal(PADABO_VICTRON_PHOENIX_12_250.continuousPowerW, 200);
  assert.ok(PADABO_VICTRON_PHOENIX_12_250.continuousPowerW >= 100);
  assert.ok(PADABO_VICTRON_PHOENIX_12_250.continuousPowerW <= 300);
  assert.equal(PADABO_VICTRON_PHOENIX_12_250.pureSine, true);
});

test("Padabo adapter rejects modified tracking and wrong destinations", () => {
  const good = buildPadaboSkEhubUrl(destination);
  assert.equal(validatePadaboSkEhubUrl(good.replace(PADABO_SK_EHUB.campaignId, "bad"), destination), false);
  assert.equal(validatePadaboSkEhubUrl(good, "https://www.padabo.sk/12-v-sinusovy-menic-napatia-carbest_z25871/"), false);
});
