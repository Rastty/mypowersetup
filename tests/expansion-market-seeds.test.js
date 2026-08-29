import test from "node:test";
import assert from "node:assert/strict";
import { RO_MARKET_SEED } from "../src/market-seed-ro.js";
import { PT_MARKET_SEED } from "../src/market-seed-pt.js";
import { renderPrivateMarketSeedPage } from "../src/private-market-page.js";

for (const seed of [RO_MARKET_SEED, PT_MARKET_SEED]) {
  test(`${seed.key} expansion seed remains private and market-specific`, () => {
    const html = renderPrivateMarketSeedPage(seed);
    assert.match(html, /noindex,nofollow,noarchive/);
    assert.match(html, new RegExp(`<html lang="${seed.locale.split("-")[0]}">`));
    assert.ok(seed.researchRequiredBeforePublic.length >= 5);
    assert.equal(seed.affiliate.awinMerchantId, 38934);
    assert.match(seed.affiliate.policy, /fail closed/i);
  });
}

test("Romania uses Romanian locale and RON", () => {
  assert.equal(RO_MARKET_SEED.locale, "ro-RO");
  assert.equal(RO_MARKET_SEED.currency, "RON");
  assert.match(RO_MARKET_SEED.copy.heading, /autoru/);
});

test("Portugal uses European Portuguese locale and does not assume dedicated PT approval", () => {
  assert.equal(PT_MARKET_SEED.locale, "pt-PT");
  assert.equal(PT_MARKET_SEED.currency, "EUR");
  assert.equal(PT_MARKET_SEED.affiliate.dedicatedProgram.status, "available-not-assumed-approved");
  assert.match(PT_MARKET_SEED.copy.heading, /autocaravana/);
});
