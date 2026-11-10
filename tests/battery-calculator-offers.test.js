import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { calculateLanding } from "../src/calculator-landing.js";
import {
  selectBatteryCalculatorOffers, isBatteryOfferStillEligible, batteryOfferExpiresAt,
} from "../src/battery-calculator-offers.js";

const now = Date.parse("2026-11-09T20:00:00Z");
const specs = [
  ["vselektro:sunstone-slpo12-100n", "/lifepo4-baterie-12v-100ah-sunstone-power-slpo12-100n/", 100, 100],
  ["vselektro:sunstone-slpo12-200n", "/lifepo4-baterie-12v-200ah-slpo12-200n-hc200a-sunstone-power/", 200, 200],
  ["vselektro:sunstone-slpo12-200m-hc200a", "/lifepo4-baterie-12v-200ah-slpo12-200m-hc200a-sunstone-power/", 200, 200],
];
function offer([id, path, capacityAh, bmsContinuousCurrentA], priceCzk = 9999) {
  const productUrl = "https://www.vselektro.eu" + path;
  const affiliate = new URL("https://ehub.cz/system/scripts/click.php?a_aid=f34c86c8&a_bid=f897865f");
  affiliate.searchParams.set("desturl", productUrl);
  return {
    id, merchant: "vselektro", category: "battery", name: id.split(":").at(-1),
    available: true, staleSource: false, verifiedAt: "2026-10-13",
    offerObservedAt: "2026-11-09T19:00:00Z", priceCzk,
    priceCurrency: "CZK", affiliateUrl: affiliate.href, productUrl,
    specs: { voltageV: 12, batteryType: "lifepo4", capacityAh, bmsContinuousCurrentA },
  };
}
const approved = specs.map(row => offer(row));
function feed(products = approved, options = {}) {
  return {
    generatedAt: options.generatedAt || "2026-11-09T19:00:00Z",
    sources: { vselektro: { status: options.status || "ok" } },
    products,
  };
}
const calc = (dailyWh, autonomyDays = 2, voltage = "12", batteryType = "lifepo4") =>
  calculateLanding("battery-capacity", { dailyWh, autonomyDays, systemVoltage: voltage, batteryType }, "cs").result;

test("actual shared battery engine chooses a single adequate exact-SKU battery by Ah and chemistry", () => {
  const small = calc(300);
  assert.equal(small.batteryAh, 80);
  assert.deepEqual(selectBatteryCalculatorOffers(feed(), small, now).map(p => p.id).sort(), approved.map(p=>p.id).sort());
  const medium = calc(600);
  assert.equal(medium.batteryAh, 150);
  assert.deepEqual(selectBatteryCalculatorOffers(feed(), medium, now).map(p => p.id).sort(),
    approved.slice(1).map(p => p.id).sort());
  const over = calc(900);
  assert.equal(over.batteryAh, 220);
  assert.deepEqual(selectBatteryCalculatorOffers(feed(), over, now), [],
    "must not silently recommend two 200Ah batteries or undersized single batteries");
});

test("battery buying never pretends 12V LiFePO4 matches auto-24V, 24V, AGM or other chemistry", () => {
  for (const result of [
    calc(900, 2, "auto"), calc(300, 2, "24"), calc(300, 2, "12", "lead"),
    { ...calc(300), batteryType: "agm" },
    { ...calc(300), systemVoltage: 48 },
    { ...calc(300), batteryAh: null },
    { ...calc(300), batteryAh: 83 },
    { ...calc(300), dailyWh: 0 },
    { ...calc(300), autonomyDays: 9 },
  ]) assert.deepEqual(selectBatteryCalculatorOffers(feed(), result, now), [], JSON.stringify(result));
});

test("incomplete or contradicted technical specifications never become an affiliate recommendation", () => {
  const result = calc(300);
  for (const [field, value] of [
    ["voltageV", 24], ["batteryType", "lead"], ["capacityAh", 50],
    ["capacityAh", undefined], ["bmsContinuousCurrentA", 0],
    ["bmsContinuousCurrentA", undefined],
  ]) {
    const modified = { ...approved[0], specs: { ...approved[0].specs, [field]: value } };
    assert.deepEqual(selectBatteryCalculatorOffers(feed([modified]), result, now), [], field);
  }
});

test("no stale, unavailable, duplicate, changed merchant destination or unapproved item is exposed", () => {
  const result = calc(300);
  for (const payload of [
    feed(approved, {status:"failed"}), feed(approved, {generatedAt:"2026-11-01T19:00:00Z"}),
    feed(approved.map(p=>({...p,offerObservedAt:"2026-11-01T19:00:00Z"}))),
    feed(approved.map(p=>({...p,available:false}))),
    feed(approved.map(p=>({...p,staleSource:true}))),
    feed(approved.map(p=>({...p,priceCzk:0}))),
    feed(approved.map(p=>({...p,affiliateUrl:"https://vselektro.eu/"}))),
  ]) assert.deepEqual(selectBatteryCalculatorOffers(payload, result, now), []);
  const duplicate = feed([...approved, approved[0]]);
  assert.ok(!selectBatteryCalculatorOffers(duplicate, result, now).some(p=>p.id===approved[0].id));
  assert.deepEqual(selectBatteryCalculatorOffers(feed([...approved.map(p=>({...p,id:"unknown"}))]), result, now), []);
  assert.deepEqual(selectBatteryCalculatorOffers(null, result, now), []);
  assert.equal(isBatteryOfferStillEligible(feed(), result, approved[0], now), true);
  assert.equal(isBatteryOfferStillEligible(feed(), result, approved[0], now + 5*24*60*60*1000), false);
  assert.equal(batteryOfferExpiresAt(feed(), approved[0]), Date.parse("2026-11-12T19:00:00Z"));
});

test("Czech battery calculator has an after-submit-only buyer area and no hardcoded merchant clickout", async () => {
  const [page, browser, ui, css, sitemap, calcSitemap, tracker] = await Promise.all([
    readFile("kalkulacky/kapacita-baterie/index.html", "utf8"),
    readFile("src/calculator-landing-browser.js", "utf8"),
    readFile("src/battery-calculator-offers-browser.js", "utf8"),
    readFile("kalkulacky/calculator.css", "utf8"),
    readFile("sitemap.xml", "utf8"), readFile("sitemap-calculators.xml", "utf8"),
    readFile("src/guide-offer-impressions.js", "utf8"),
  ]);
  assert.match(page, /data-battery-buyers[^>]*hidden/);
  assert.match(page, /data-battery-offer-list[^>]*hidden/);
  assert.match(page, /Nejde o automatické potvrzení kompatibility/);
  assert.match(page, /Nesčítáme automaticky více baterií/);
  assert.match(page, /\/src\/calculator-landing-browser\.js\?v=20261110-attributed-buyer1/);
  assert.match(page, /\/kalkulacky\/calculator\.css\?v=20261109-battery-buyer1/);
  assert.match(page, /"dateModified": "2026-11-09"/);
  assert.match(browser, /mountBatteryCalculatorBuyers/);
  assert.match(browser, /if \(batteryBuyers\) void batteryBuyers\.update\(result\)/);
  assert.match(browser, /batteryBuyers\?\.invalidate\(\)/);
  assert.match(ui, /loadCalculatorOffers\(fetchImpl\)/);
  assert.match(ui, /isBatteryOfferStillEligible\(payload, active, offer, now\(\)\)/);
  assert.match(ui, /allowedSources: \["battery-calculator-match"\]/);
  assert.match(tracker, /"product_choice_impression"/);
  assert.match(css, /\.calculator-mppt-offer-list/);
  assert.doesNotMatch(page, /href="https:\/\/ehub\.cz\/system\/scripts\/click\.php/);
  for (const xml of [sitemap,calcSitemap]) {
    assert.ok(xml.includes("<loc>https://mypowersetup.com/kalkulacky/kapacita-baterie/</loc><lastmod>2026-11-09</lastmod>"));
  }
});
