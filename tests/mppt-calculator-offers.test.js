import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { calculateLanding } from "../src/calculator-landing.js";
import {
  selectMpptCalculatorOffers, isMpptOfferStillEligible, mpptOfferExpiresAt,
} from "../src/mppt-calculator-offers.js";

const now = Date.parse("2026-11-09T20:00:00Z");
const approved = [
  { id: "vselektro:victron-smartsolar-100-20", path: "/solarni-regulator-victron-energy-mppt-smartsolar-100v-20a/", amps: 20, watts12: 290, watts24: 580, voltages: [12, 24, 48], isc: 20 },
  { id: "vselektro:victron-smartsolar-100-30", path: "/solarni-regulator-victron-energy-smartsolar-30a/", amps: 30, watts12: 440, watts24: 880, voltages: [12, 24], isc: 35 },
  { id: "vselektro:victron-smartsolar-100-50", path: "/solarni-regulator-victron-energy-mppt-smartsolar-100v-50a/", amps: 50, watts12: 700, watts24: 1400, voltages: [12, 24], isc: 60 },
];
function product(info) {
  const productUrl = "https://www.vselektro.eu" + info.path;
  const affiliate = new URL("https://ehub.cz/system/scripts/click.php?a_aid=f34c86c8&a_bid=f897865f");
  affiliate.searchParams.set("desturl", productUrl);
  return {
    id: info.id, name: info.id.split(":").at(-1),
    merchant: "vselektro", category: "controller",
    available: true, staleSource: false, priceCzk: 2890 + info.amps * 20,
    priceCurrency: "CZK", productUrl, affiliateUrl: affiliate.href,
    verifiedAt: "2026-10-13", offerObservedAt: "2026-11-09T19:00:00Z",
    specs: {
      currentA: info.amps, maxPvVocV: 100, maxPvIscA: info.isc,
      systemVoltagesV: info.voltages,
      maxPvWattsBySystemVoltage: { 12: info.watts12, 24: info.watts24 },
    },
  };
}
const products = approved.map(product);
const feed = (rows = products, opts = {}) => ({
  generatedAt: opts.generatedAt || "2026-11-09T19:00:00Z",
  sources: { vselektro: { status: opts.status || "ok" } },
  products: rows,
});
const calc = (watts, voltage, batteryType = "lifepo4") =>
  calculateLanding("mppt-sizing", {
    panelWatts: watts, systemVoltage: String(voltage), batteryType,
  }, "cs").result;

test("the real shared calculation narrows Victron buyers by charge current and the published voltage-specific PV ceiling", () => {
  const scenarios = [
    [200, 12, ["100-20", "100-30", "100-50"]],
    [240, 12, ["100-30", "100-50"]],
    [400, 12, ["100-50"]],
    [600, 24, ["100-30", "100-50"]],
    [900, 24, ["100-50"]],
    [800, 12, []],
  ];
  for (const [watts, voltage, expected] of scenarios) {
    const result = calc(watts, voltage);
    const matches = selectMpptCalculatorOffers(feed(), result, now);
    assert.deepEqual(matches.map(p => p.id.split(":").at(-1)), expected.map(x => "victron-smartsolar-" + x),
      watts + "Wp / " + voltage + "V / " + result.controllerAmps + "A");
    for (const item of matches) {
      assert.ok(item.specs.currentA >= result.controllerAmps);
      assert.ok(item.specs.maxPvWattsBySystemVoltage[voltage] >= watts);
      assert.ok(item.specs.systemVoltagesV.includes(voltage));
      assert.ok(item.specs.maxPvVocV > 0 && item.specs.maxPvIscA > 0);
    }
  }
});

test("same-current but PV limit exceeded never looks purchase-ready", () => {
  const result = { panelWatts: 500, systemVoltage: 12, controllerAmps: 20, batteryType: "lifepo4" };
  assert.deepEqual(selectMpptCalculatorOffers(feed(), result, now).map(x => x.id),
    ["vselektro:victron-smartsolar-100-50"]);
  const twenty = products[0];
  assert.equal(isMpptOfferStillEligible(feed(), result, twenty, now), false);
});

test("wrong or missing technical fields and fabricated battery state fail closed", () => {
  const good = calc(200, 12);
  for (const bad of [
    { panelWatts: 0, controllerAmps: 20, systemVoltage: 12, batteryType: "lifepo4" },
    { panelWatts: 200.1, controllerAmps: 20, systemVoltage: 12, batteryType: "lifepo4" },
    { ...good, controllerAmps: 19 },
    { ...good, systemVoltage: 48 },
    { ...good, batteryType: "unknown" },
    { ...good, batteryType: undefined },
  ]) assert.deepEqual(selectMpptCalculatorOffers(feed(), bad, now), [], JSON.stringify(bad));
  for (const key of ["currentA", "maxPvVocV", "maxPvIscA", "systemVoltagesV", "maxPvWattsBySystemVoltage"]) {
    const affected = { ...products[0], specs: { ...products[0].specs, [key]: undefined } };
    assert.ok(!selectMpptCalculatorOffers(feed([affected]), good, now).includes(affected), key);
  }
});

test("expired price, stale observation, duplicate SKU, incomplete product ID and unavailable stock fail closed", () => {
  const result = calc(200, 12);
  for (const changed of [
    feed(products, {status:"stale"}),
    feed(products, {generatedAt: "2026-11-01T19:00:00Z"}),
    feed(products.map(x => ({...x, offerObservedAt: "2026-11-01T19:00:00Z"}))),
    feed(products.map(x => ({...x, available:false}))),
    feed(products.map(x => ({...x, priceCzk:0}))),
    feed(products.map(x => ({...x, affiliateUrl: "https://vselektro.eu/" }))),
    feed([...products, products[0]]),
  ]) {
    const matched = selectMpptCalculatorOffers(changed, result, now);
    assert.ok(matched.length < 3);
    assert.ok(!matched.includes(products[0]) || changed.products.length !== 4,
      "current matching proof requires unique complete feed");
  }
  assert.deepEqual(selectMpptCalculatorOffers(null, result, now), []);
  assert.equal(isMpptOfferStillEligible(feed(), result, products[0],
    Date.parse("2026-11-13T12:00:00Z")), false);
  const expires = mpptOfferExpiresAt(feed(), products[0]);
  assert.equal(expires, Date.parse("2026-11-12T19:00:00Z"));
});

test("published MPPT page has an accessible, after-submit-only, truthful buyer slot and no hardcoded affiliate product", async () => {
  const page = await readFile("kalkulacky/mppt-regulator/index.html", "utf8");
  const browser = await readFile("src/calculator-landing-browser.js", "utf8");
  const ui = await readFile("src/mppt-calculator-offers-browser.js", "utf8");
  const impression = await readFile("src/guide-offer-impressions.js", "utf8");
  const stylesheet = await readFile("kalkulacky/calculator.css", "utf8");
  const sitemap = await readFile("sitemap.xml", "utf8");
  const calcSitemap = await readFile("sitemap-calculators.xml", "utf8");
  assert.match(page, /data-mppt-buyers[^>]*hidden/);
  assert.match(page, /data-mppt-offer-list/);
  assert.match(page, /Voc panelů za mrazu/);
  assert.match(page, /Isc/);
  assert.match(page, /není potvrzení úplné kompatibility/);
  assert.match(page, /\/src\/calculator-landing-browser\.js\?v=20261109-mppt-buyer1/);
  assert.match(page, /\/kalkulacky\/calculator\.css\?v=20261109-mppt-buyer1/);
  assert.match(browser, /if \(mpptBuyers\) void mpptBuyers\.update\(result\)/);
  assert.match(browser, /mpptBuyers\?\.invalidate\(\)/);
  assert.match(ui, /selectMpptCalculatorOffers/);
  assert.match(ui, /isMpptOfferStillEligible\(payload, activeResult, offer, now\(\)\)/);
  assert.match(ui, /AbortSignal\.timeout\(15000\)/);
  assert.match(ui, /cache: "no-store", redirect: "error"/);
  assert.match(ui, /track\?\.\("affiliate_click"/);
  assert.match(impression, /"product_choice_impression"/);
  assert.match(ui, /allowedSources: \["mppt-calculator-match"\]/);
  assert.match(stylesheet, /\.calculator-mppt-offer-list/);
  assert.doesNotMatch(page, /href="https:\/\/ehub\.cz\/system\/scripts\/click\.php/);
  for (const xml of [sitemap, calcSitemap]) {
    assert.ok(xml.includes("<loc>https://mypowersetup.com/kalkulacky/mppt-regulator/</loc><lastmod>2026-11-09</lastmod>"));
  }
});
