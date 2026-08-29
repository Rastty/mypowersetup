import test from "node:test";
import assert from "node:assert/strict";
import { RO_MARKET_SEED } from "../src/market-seed-ro.js";
import { PT_MARKET_SEED } from "../src/market-seed-pt.js";
import { RO_MARKET_RESEARCH } from "../src/market-research-ro.js";
import { PT_MARKET_RESEARCH } from "../src/market-research-pt.js";
import { renderPrivateMarketSeedPage } from "../src/private-market-page.js";

for (const seed of [RO_MARKET_SEED, PT_MARKET_SEED]) {
  test(`${seed.key} expansion seed remains private and market-specific`, () => {
    const html = renderPrivateMarketSeedPage(seed);
    assert.match(html, /noindex,nofollow,noarchive/);
    assert.match(html, new RegExp(`<html lang="${seed.locale.split("-")[0]}">`));
    assert.ok(seed.researchRequiredBeforePublic.length >= 5);
    assert.match(seed.affiliate.policy, /fail closed/i);
  });
}

test("Romania uses Romanian locale, RON and approved international source", () => {
  assert.equal(RO_MARKET_SEED.locale, "ro-RO");
  assert.equal(RO_MARKET_SEED.currency, "RON");
  assert.equal(RO_MARKET_SEED.affiliate.awinMerchantId, 38934);
  assert.match(RO_MARKET_SEED.copy.heading, /autoru/);
  assert.equal(RO_MARKET_RESEARCH.locale, "ro-RO");
  assert.equal(RO_MARKET_RESEARCH.terminology.mppt, "controler solar MPPT");
});

test("Portugal uses approved dedicated ALLPOWERS PT and European Portuguese", () => {
  assert.equal(PT_MARKET_SEED.locale, "pt-PT");
  assert.equal(PT_MARKET_SEED.currency, "EUR");
  assert.equal(PT_MARKET_SEED.affiliate.primaryMerchant, "allpowers_pt");
  assert.equal(PT_MARKET_SEED.affiliate.awinMerchantId, 125820);
  assert.equal(PT_MARKET_SEED.affiliate.dedicatedProgram.status, "approved");
  assert.match(PT_MARKET_SEED.copy.heading, /autocaravana/);
  assert.equal(PT_MARKET_RESEARCH.locale, "pt-PT");
  assert.equal(PT_MARKET_RESEARCH.terminology.vehicle, "autocaravana");
});
