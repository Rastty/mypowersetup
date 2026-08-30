import test from "node:test";
import assert from "node:assert/strict";
import { renderPrivateMarketSeedPage } from "../src/private-market-page.js";
import { RO_MARKET_SEED } from "../src/market-seed-ro.js";
import { PT_MARKET_SEED } from "../src/market-seed-pt.js";
import { SI_MARKET_SEED } from "../src/market-seed-si.js";

for (const seed of [RO_MARKET_SEED, PT_MARKET_SEED, SI_MARKET_SEED]) {
  test(`${seed.key} private preview contains a real three-step calculator and stays noindex`, () => {
    const html = renderPrivateMarketSeedPage(seed);
    assert.match(html, /noindex,nofollow,noarchive/);
    assert.match(html, /data-expansion-calculator/);
    assert.match(html, /data-form-step="1"/);
    assert.match(html, /data-form-step="2"/);
    assert.match(html, /data-form-step="3"/);
    assert.match(html, /data-appliance/);
    assert.match(html, /name="batteryType"/);
    assert.match(html, /name="systemVoltage"/);
    assert.match(html, /expansion-calculator-browser\.js/);
    assert.doesNotMatch(html, /hreflang=/);
  });
}

test("Portugal calculator uses European Portuguese decision copy", () => {
  const html = renderPrivateMarketSeedPage(PT_MARKET_SEED);
  assert.match(html, /Equipamentos/);
  assert.match(html, /Frigorífico de compressor/);
  assert.match(html, /Primavera \/ outono/);
});

test("Romania calculator uses local motorhome and electrical terms", () => {
  const html = renderPrivateMarketSeedPage(RO_MARKET_SEED);
  assert.match(html, /Consumatori/);
  assert.match(html, /Panouri solare|dimensionarea solarului/);
  assert.match(html, /Tensiune sistem/);
});

test("Slovenia calculator uses local avtodom electrical terminology", () => {
  const html = renderPrivateMarketSeedPage(SI_MARKET_SEED);
  assert.match(html, /Porabniki/);
  assert.match(html, /sončne panele|solarnega sistema/);
  assert.match(html, /Napetost sistema/);
});

test("all expansion homepages expose three useful local primary destinations", () => {
  const cases = [
    [PT_MARKET_SEED, ["/pt/guias/", "/pt/metodologia/", "/pt/sobre-o-projeto/"]],
    [RO_MARKET_SEED, ["/ro/ghiduri/", "/ro/metodologie/", "/ro/despre-proiect/"]],
    [SI_MARKET_SEED, ["/si/vodici/", "/si/metodologija/", "/si/o-projektu/"]],
  ];
  for (const [seed, routes] of cases) {
    const html = renderPrivateMarketSeedPage(seed);
    const header = html.match(/<header class="site-header">([\s\S]*?)<\/header>/)?.[1] || "";
    assert.match(header, /<nav class="expansion-nav"/);
    for (const route of routes) assert.ok(header.includes(`href="${route}"`), `${seed.key} missing ${route}`);
  }
});
