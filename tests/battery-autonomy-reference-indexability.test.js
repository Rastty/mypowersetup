import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { calculateBatteryAutonomy } from "../src/engine.js";

const path = "kalkulacky/vydrz-baterie/index.html";
const route = "https://mypowersetup.com/kalkulacky/vydrz-baterie/";
const read = filename => readFile(new URL("../" + filename, import.meta.url), "utf8");

test("six modelled 100/150/200Ah outcomes exactly match the shared calculation engine", async () => {
  const html = await read(path);
  const matches = [...html.matchAll(/<tr data-autonomy-example data-battery-ah="(\d+)" data-battery-type="(lifepo4|lead)" data-daily-wh="600">[\s\S]*?<strong data-autonomy-days="([\d.]+)">[\s\S]*?<td data-autonomy-hours="(\d+)">/g)];
  assert.equal(matches.length, 6);
  const combinations = new Set();
  for (const [, ah, batteryType, days, hours] of matches) {
    const key = ah + ":" + batteryType;
    assert.ok(!combinations.has(key), "duplicate battery example " + key);
    combinations.add(key);
    const computed = calculateBatteryAutonomy({
      batteryCapacityAh: Number(ah), systemVoltage: 12, batteryType, dailyWh: 600,
    });
    assert.equal(Number(days), computed.autonomyDays, key + " days");
    assert.equal(Number(hours), computed.autonomyHours, key + " hours");
    assert.equal(computed.batteryMarginPercent, 15, key + " reserve");
  }
  assert.deepEqual([...combinations].sort(), [
    "100:lead", "100:lifepo4", "150:lead", "150:lifepo4", "200:lead", "200:lifepo4",
  ]);
});

test("comparison retains the interactive calculator and communicates assumptions and limitations", async () => {
  const html = await read(path);
  assert.match(html, /data-calculator-intent="battery-autonomy"/);
  assert.match(html, /name="batteryCapacityAh"/);
  assert.match(html, /name="dailyWh"/);
  assert.match(html, /src="\/src\/calculator-landing-browser\.js\?v=20261109-fridge-community1"/);
  assert.ok(html.indexOf('data-calculator-intent="battery-autonomy"') < html.indexOf('id="priklady-vydrze"'));
  for (const term of ["600 Wh", "80%", "50 %", "15%", "bez dobíjení", "BMS", "24 V"]) {
    assert.ok(html.includes(term), "missing assumption " + term);
  }
  assert.match(html, /href="\/#kalkulator">Neznám svoji spotřebu/);
  assert.match(html, /href="\/pruvodce\/kapacita-baterie-do-karavanu\/"/);
  assert.match(html, /href="\/kalkulacky\/calculator\.css\?v=20261108-mppt-reference1"/);
  assert.doesNotMatch(html, /<meta name="robots" content="[^"]*noindex/i);
  assert.match(html, /<link rel="canonical" href="https:\/\/mypowersetup\.com\/kalkulacky\/vydrz-baterie\/"/);
  const json = html.match(/<script type="application\/ld\+json">([\s\S]+?)<\/script>/)?.[1];
  const graph = JSON.parse(json)["@graph"];
  assert.equal(graph.find(item => item["@type"] === "WebApplication").dateModified, "2026-11-09");
});

test("real substantive update has exact sitemap lastmod in both sitemap files", async () => {
  for (const name of ["sitemap.xml", "sitemap-calculators.xml"]) {
    const xml = await read(name);
    const matches = xml.match(/<loc>https:\/\/mypowersetup\.com\/kalkulacky\/vydrz-baterie\/<\/loc><lastmod>2026-11-09<\/lastmod>/g);
    assert.equal(matches?.length, 1, name);
  }
});

test("reference comparison remains horizontally scrollable on small screens", async () => {
  const [html, css] = await Promise.all([read(path), read("kalkulacky/calculator.css")]);
  assert.match(html, /class="calculator-table-scroll"/);
  assert.match(html, /class="calculator-reference-table"/);
  assert.match(css, /\.calculator-table-scroll\s*\{[^}]*overflow-x: auto/s);
});

// The comparison is outside the interactive calculator root. A visitor clicking
// to the Builder or buying guide should still enter the consented funnel report.
test("comparison continuation links use opt-in consented calculator funnel tracking", async () => {
  const [html, browser] = await Promise.all([read(path), read("src/calculator-landing-browser.js")]);
  assert.match(html, /id="priklady-vydrze"[^>]*data-calculator-continuation-section="battery_autonomy_reference"/);
  assert.match(browser, /document\.querySelectorAll\("\[data-calculator-continuation-section\]"\)/);
  assert.match(browser, /section\.addEventListener\("click", trackContinuation\)/);
  assert.match(browser, /source_section: continuationSection\.dataset\.calculatorContinuationSection/);
  assert.match(browser, /const continuationSection = link\?\.closest\?\.\("\[data-calculator-continuation-section\]"\)/);
  // Event still passes through the existing consent-gated analytics API.
  assert.match(browser, /window\.MyPowerSetupAnalytics\?\.track\(event,/);
  assert.match(browser, /if \(url\.origin !== window\.location\.origin\) \{/);
  assert.match(browser, /classifyCalculatorSpecialistHandoff/);
  assert.match(browser, /if \(!destinationType\) return/);
});

test("autonomy calculator can continue to capacity for two explicitly editable days", async () => {
  const [html, browser, copy, target] = await Promise.all([
    read(path), read("src/calculator-landing-browser.js"),
    read("src/calculator-copy.js"), read("kalkulacky/kapacita-baterie/index.html"),
  ]);
  assert.match(html, /2 dny bez dobíjení/);
  assert.match(html, /požadovaný počet dnů si na další stránce můžete změnit/);
  assert.match(browser, /intent === "battery-autonomy" \? copy\.nextBattery/);
  assert.match(copy, /nextBattery: "Spočítat potřebnou baterii na 2 dny/);
  assert.match(target, /name="autonomyDays"[^>]*value="2"/);
  assert.match(target, /src="\/src\/calculator-landing-browser\.js\?v=20261110-attributed-buyer1"/);
});
