import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { calculateLanding } from "../src/calculator-landing.js";
import { classifyCalculatorContinuation } from "../src/calculator-copy.js";

const read = (path) => readFile(new URL("../" + path, import.meta.url), "utf8");
const pagePath = "kalkulacky/vykon-menice/index.html";
const canonical = "https://mypowersetup.com/kalkulacky/vykon-menice/";

test("five published inverter scenarios are exact results of the production calculator engine", async () => {
  const html = await read(pagePath);
  const rows = [...html.matchAll(/<tr data-inverter-example data-largest-watts="(\d+)" data-other-watts="(\d+)" data-surge-multiplier="([\d.]+)">[\s\S]*?<strong data-inverter-min-watts="(\d+)">(\d+) W<\/strong><\/td><td data-inverter-voltage="(\d+)">(\d+) V<\/td><\/tr>/g)];
  assert.equal(rows.length, 5, "do not publish unverified static scenarios");
  const scenarios = new Set();
  for (const [, largestWatts, otherWatts, multiplier, declaredWatts, renderedWatts, declaredVoltage, renderedVoltage] of rows) {
    const key = [largestWatts, otherWatts, multiplier].join(":");
    assert.ok(!scenarios.has(key), "duplicate scenario " + key);
    scenarios.add(key);
    const inputs = {
      largestLoadWatts: Number(largestWatts),
      otherLoadWatts: Number(otherWatts),
      surgeMultiplier: Number(multiplier),
      systemVoltage: "auto",
    };
    const { result } = calculateLanding("inverter-sizing", inputs, "cs");
    assert.equal(result.inverterWatts, Number(declaredWatts), key + " engine watts");
    assert.equal(result.inverterWatts, Number(renderedWatts), key + " visible watts");
    assert.equal(result.systemVoltage, Number(declaredVoltage), key + " engine voltage");
    assert.equal(result.systemVoltage, Number(renderedVoltage), key + " visible voltage");
    assert.ok(result.inverterWatts >= result.estimatedConcurrentWatts * 1.25,
      "model must cover simultaneous loads plus reserve");
    assert.ok(result.inverterWatts >= result.largestStartWatts,
      "model must cover the stated start-up peak");
  }
  assert.deepEqual([...scenarios].sort(), [
    "1000:0:1", "100:30:1", "1200:100:1", "120:0:3", "1500:0:2",
  ].sort());
});

test("reference scenarios answer comparison intent without pretending to certify a purchase", async () => {
  const [html, css, browser] = await Promise.all([
    read(pagePath), read("kalkulacky/calculator.css"),
    read("src/calculator-landing-browser.js"),
  ]);
  assert.match(html, /data-calculator-intent="inverter-sizing"/);
  assert.match(html, /id="priklady-menicu"[^>]*data-calculator-continuation-section="inverter_reference"/);
  assert.match(html, /Měnič 300, 1000, 1500 nebo 2000 W/);
  for (const phrase of ["50 % další zátěže", "25% rezerva", "proudový limit baterie/BMS"]) {
    assert.ok(html.includes(phrase), "missing safety or model context: " + phrase);
  }
  assert.match(html, /proudový limit baterie\/BMS/i);
  assert.match(html, /není[\s\S]*?univerzální údaj/);
  assert.match(html, /href="\/#kalkulator"/);
  assert.match(html, /href="\/pruvodce\/jak-velky-menic-do-karavanu\/"/);
  assert.match(html, /src="\/src\/calculator-landing-browser\.js\?v=20261113-inverter-buyers1"/);
  assert.match(html, /data-inverter-buyers/);
  assert.match(html, /není potvrzení úplné kompatibility/);
  assert.match(html, /class="calculator-table-scroll"/);
  assert.match(html, /class="calculator-reference-table"/);
  assert.match(css, /\.calculator-table-scroll\s*\{[^}]*overflow-x: auto/s);
  assert.match(browser, /document\.querySelectorAll\("\[data-calculator-continuation-section\]"\)/);
  assert.match(browser, /window\.MyPowerSetupAnalytics\?\.track\(event,/);
  assert.equal(classifyCalculatorContinuation("/", "#kalkulator", "cs"), "builder");
  assert.equal(classifyCalculatorContinuation("/pruvodce/jak-velky-menic-do-karavanu/", "", "cs"), "guide");
});

test("SEO updates use one canonical URL and exact matching sitemap lastmod", async () => {
  const html = await read(pagePath);
  assert.match(html, /<link rel="canonical" href="https:\/\/mypowersetup\.com\/kalkulacky\/vykon-menice\/">/);
  assert.doesNotMatch(html, /<meta name="robots" content="[^"]*noindex/i);
  const json = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)?.[1]);
  assert.equal(json["@graph"].find(x => x["@type"] === "WebApplication").dateModified, "2026-11-09");
  for (const name of ["sitemap.xml", "sitemap-calculators.xml"]) {
    const xml = await read(name);
    const rows = xml.match(/<loc>https:\/\/mypowersetup\.com\/kalkulacky\/vykon-menice\/<\/loc><lastmod>2026-11-09<\/lastmod>/g);
    assert.equal(rows?.length, 1, name + " must expose exactly one up-to-date URL");
  }
  assert.ok(html.includes(canonical));
});
