import test from "node:test";
import assert from "node:assert/strict";
import { RO_MARKET_SEED } from "../src/market-seed-ro.js";
import { PT_MARKET_SEED } from "../src/market-seed-pt.js";
import { SI_MARKET_SEED } from "../src/market-seed-si.js";
import { SI_MARKET_RESEARCH } from "../src/market-research-si.js";
import { renderPrivateMarketSeedPage } from "../src/private-market-page.js";

for (const seed of [RO_MARKET_SEED, PT_MARKET_SEED, SI_MARKET_SEED]) {
  test(`${seed.key} expansion seed remains private and market-specific`, () => {
    const html = renderPrivateMarketSeedPage(seed);
    assert.match(html, /noindex,nofollow,noarchive/);
    assert.match(html, new RegExp(`<html lang="${seed.locale.split("-")[0]}">`));
    assert.ok(seed.researchRequiredBeforePublic.length >= 5);
    assert.ok(Number.isInteger(seed.affiliate.awinMerchantId));
    assert.match(seed.affiliate.policy, /fail closed/i);
  });
}

test("Romania uses Romanian locale, RON and approved international affiliate fallback", () => {
  assert.equal(RO_MARKET_SEED.locale, "ro-RO");
  assert.equal(RO_MARKET_SEED.currency, "RON");
  assert.equal(RO_MARKET_SEED.affiliate.awinMerchantId, 38934);
  assert.match(RO_MARKET_SEED.copy.heading, /autoru/);
});

test("Portugal uses European Portuguese and the approved dedicated ALLPOWERS PT program", () => {
  assert.equal(PT_MARKET_SEED.locale, "pt-PT");
  assert.equal(PT_MARKET_SEED.currency, "EUR");
  assert.equal(PT_MARKET_SEED.affiliate.primaryMerchant, "allpowers_pt");
  assert.equal(PT_MARKET_SEED.affiliate.awinMerchantId, 125820);
  assert.equal(PT_MARKET_SEED.affiliate.dedicatedProgram.status, "approved");
  assert.equal(PT_MARKET_SEED.affiliate.fallbackProgram.awinMerchantId, 38934);
  assert.match(PT_MARKET_SEED.copy.heading, /autocaravana/);
});

test("Slovenia uses Slovenian locale, EUR and local avtodom terminology", () => {
  assert.equal(SI_MARKET_SEED.locale, "sl-SI");
  assert.equal(SI_MARKET_SEED.currency, "EUR");
  assert.equal(SI_MARKET_SEED.affiliate.primaryMerchant, "allpowers_international");
  assert.equal(SI_MARKET_SEED.affiliate.awinMerchantId, 38934);
  assert.match(SI_MARKET_SEED.copy.heading, /avtodomu/);
  assert.equal(SI_MARKET_RESEARCH.locale, "sl-SI");
  assert.equal(SI_MARKET_RESEARCH.terminology.vehicle, "avtodom");
  assert.equal(SI_MARKET_RESEARCH.terminology.mppt, "solarni regulator MPPT");
});
