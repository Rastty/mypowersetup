import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const DCDC_ID = "ampul-eu-dcdc-12v-30a";
const INVERTER_ID = "ampul-eu-inverter-24v-2000w";

test("committed AMPUL verification remains exact product x market and fail-closed", async () => {
  const verification = JSON.parse(await readFile("data/ampul-expansion-market-verification.json", "utf8"));
  assert.equal(verification.schemaVersion, 2);
  assert.deepEqual(Object.keys(verification.products).sort(), [DCDC_ID, INVERTER_ID].sort());

  for (const productId of [DCDC_ID, INVERTER_ID]) {
    const markets = verification.products[productId].markets;
    assert.deepEqual(Object.keys(markets).sort(), ["pt", "ro", "si"]);
    for (const [market, evidence] of Object.entries(markets)) {
      assert.equal(evidence.verified, false, `${productId}/${market} unexpectedly activated`);
      assert.equal(evidence.evidenceUrl, null);
      assert.equal(evidence.verifiedAt, null);
    }
  }

  assert.match(verification.policy, /exact product/i);
  assert.match(verification.policy, /another AMPUL product/i);
});
